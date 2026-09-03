import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
    Search, Filter, FileText, CheckCircle, AlertTriangle, XCircle, ChevronRight, 
    ArrowLeft, ExternalLink, File, Plus, Upload, Paperclip, Loader2, DollarSign, 
    User, RotateCw, RefreshCw, ShieldAlert, Shield, Briefcase, ChevronDown, Check,
    Edit, Save, X, ArrowUpDown, ArrowUp, ArrowDown, Clock, Trash2, Printer, Edit3, ShieldCheck, CheckCircle2 
} from 'lucide-react';
import { DR_LOCATIONS, getSectors } from '../constants/locations';
import { 
    getNextRenewalDate, calculatePolicyStatus, processPolicyRenewalAndStatus, 
    getPolicyPaymentStats, formatDateToDDMMYYYY, formatMoney,
    isOpenClaim, getPolicyClaims, policyMatchesAgentCode 
} from '../utils/policyHelpers';
import InsurerLogo from './InsurerLogo';
import InsurerSelect from './InsurerSelect';
import { useUser } from '../context/UserContext';
import { updatePolicyHasura, insertMovimientoHasura, insertPolicyHasura, insertClientHasura, formatPolicyNumberLaColonial, deletePolicyHasura, updateCobroHasura, deleteCobroHasura } from '../services/hasuraService';
import { getFolderMappings } from '../services/googleDrive';
import DocumentManager from './DocumentManager';
import DocumentViewerModal from './DocumentViewerModal';
import ReceiptModal from './ReceiptModal';
import { generateReceiptPdfDataUri } from '../services/receiptPdfService';
import { getAllPolicyDocuments, saveDocumentForEntity, fileToDataUri, formatFileSize } from '../services/documentsService';

const PolicyList = ({ 
    policies, 
    setPolicies, 
    clients = [], 
    setClients, 
    payments = [], 
    setPayments,
    claims = [], 
    agentCodes = [], 
    companies = [], 
    initialSelectedId, 
    onClearSelection, 
    shouldOpenCreateModal, 
    onDetailedActionHandled, 
    onNavigateToClaim 
}) => {
    const { currentUser, isDemo } = useUser();
    const canEditPayments = Boolean(currentUser?.isPrimary || currentUser?.username?.toLowerCase() === 'santiagom2401' || currentUser?.id === 'santiagom2401' || currentUser?.role?.includes('Administrador'));

    const [searchTerm, setSearchTerm] = useState('');
    const [statusTab, setStatusTab] = useState('ALL'); // 'ALL', 'ACTIVE', 'EXPIRING', 'PENDING', 'CANCELLED'
    const [selectedCodeId, setSelectedCodeId] = useState('ALL'); // 'ALL', or specific broker code id
    const [isCodeDropdownOpen, setIsCodeDropdownOpen] = useState(false);
    const codeDropdownRef = useRef(null);
    const [selectedPolicy, setSelectedPolicy] = useState(null);
    const [showMovementModal, setShowMovementModal] = useState(false);
    const [showCreatePolicyModal, setShowCreatePolicyModal] = useState(false);
    const [viewingMovementDoc, setViewingMovementDoc] = useState(null);

    // Payments Receipt & Document Viewing State
    const [selectedReceiptPayment, setSelectedReceiptPayment] = useState(null);
    const [showReceiptModal, setShowReceiptModal] = useState(false);
    const [selectedViewingDocs, setSelectedViewingDocs] = useState(null);
    const [showDocViewer, setShowDocViewer] = useState(false);

    // Edit Payment Modal State (Santiago / Admin Only)
    const [editingPayment, setEditingPayment] = useState(null);
    const [showEditPaymentModal, setShowEditPaymentModal] = useState(false);
    const [editPaymentForm, setEditPaymentForm] = useState({
        amount: '',
        date: new Date().toISOString().split('T')[0],
        type: 'Cuota Mensual',
        customType: '',
        paymentMethod: 'Efectivo',
        reference: '',
        status: 'Paid',
        notes: ''
    });
    const [editPaymentAttachedDocs, setEditPaymentAttachedDocs] = useState([]);
    const [isSavingPaymentEdit, setIsSavingPaymentEdit] = useState(false);

    // Edit Policy State
    const [showEditPolicyModal, setShowEditPolicyModal] = useState(false);
    const [editPolicyForm, setEditPolicyForm] = useState({
        id: '',
        client: '',
        clienteId: null,
        insurer: 'La Colonial de Seguros',
        type: 'Vehículo',
        cartera: 'Santiago Morales y Asociados, S.R.L.',
        agentCode: '8055',
        insuredAmount: '',
        amount: '',
        currency: 'DOP',
        renewalFrequency: 'Anual',
        startDate: '',
        lastRenewalDate: '',
        endDate: '',
        details: '',
        status: 'Active',
        commissionRate: 15.0
    });
    const [isSavingPolicy, setIsSavingPolicy] = useState(false);

    // Click outside listener for broker code dropdown
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (codeDropdownRef.current && !codeDropdownRef.current.contains(event.target)) {
                setIsCodeDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Auto-select policy when navigated from global search or other modules
    useEffect(() => {
        if (initialSelectedId && Array.isArray(policies) && policies.length > 0) {
            const found = policies.find(p => 
                String(p.id).toLowerCase() === String(initialSelectedId).toLowerCase() || 
                String(p.rawId) === String(initialSelectedId) ||
                p.id === initialSelectedId
            );
            if (found) {
                setSelectedPolicy(found);
            }
        }
    }, [initialSelectedId, policies]);

    const selectedCodeItem = useMemo(() => {
        if (selectedCodeId === 'ALL') return null;
        return (agentCodes || []).find(c => String(c.id || `${c.code}_${c.insurer}`) === String(selectedCodeId));
    }, [selectedCodeId, agentCodes]);

    const groupedCodesByCompany = useMemo(() => {
        const groups = {};
        (agentCodes || []).forEach(codeItem => {
            const insurerName = codeItem.insurer || 'Otras Aseguradoras';
            if (!groups[insurerName]) {
                groups[insurerName] = {
                    insurer: insurerName,
                    codes: []
                };
            }
            const count = policies.filter(p => policyMatchesAgentCode(p, codeItem)).length;
            const key = String(codeItem.id || `${codeItem.code}_${codeItem.insurer}_${codeItem.agent}`);
            groups[insurerName].codes.push({
                key,
                item: codeItem,
                count
            });
        });
        return Object.values(groups);
    }, [agentCodes, policies]);

    // New Client Creation State inside Policy Modal
    const [isCreatingClient, setIsCreatingClient] = useState(false);
    const [newClientData, setNewClientData] = useState({
        name: '',
        personType: '',
        documentId: '',
        insurerCode: '',
        email: '',
        phone: '',
        city: '',
        sector: ''
    });
    const [isCreating, setIsCreating] = useState(false);

    // Searchable Client Dropdown State
    const [clientSearch, setClientSearch] = useState('');
    const [showClientDropdown, setShowClientDropdown] = useState(false);
    const clientDropdownRef = useRef(null);

    // Map policies to their computed status and renewal process
    const policyStatusMap = useMemo(() => {
        const map = {};
        policies.forEach(p => {
            map[p.id] = processPolicyRenewalAndStatus(p, payments);
        });
        return map;
    }, [policies, payments]);

    const activeCount = useMemo(() => policies.filter(p => policyStatusMap[p.id]?.status === 'Active').length, [policies, policyStatusMap]);
    const expiringCount = useMemo(() => policies.filter(p => policyStatusMap[p.id]?.status === 'Expiring').length, [policies, policyStatusMap]);
    const pendingCount = useMemo(() => policies.filter(p => policyStatusMap[p.id]?.status === 'Pending').length, [policies, policyStatusMap]);
    const cancelledCount = useMemo(() => policies.filter(p => policyStatusMap[p.id]?.status === 'Cancelled').length, [policies, policyStatusMap]);
    const allActiveCount = useMemo(() => policies.filter(p => policyStatusMap[p.id]?.status !== 'Cancelled').length, [policies, policyStatusMap]);

    // Handle initial open of Create Modal (from Dashboard Action)
    useEffect(() => {
        if (shouldOpenCreateModal) {
            setShowCreatePolicyModal(true);
            // Signal back that we've handled the action so it doesn't re-trigger
            if (onDetailedActionHandled) {
                onDetailedActionHandled();
            }
        }
    }, [shouldOpenCreateModal, onDetailedActionHandled]);

    // Handle initial selection from navigation (e.g. Dashboard)
    useEffect(() => {
        if (initialSelectedId) {
            const policyToSelect = policies.find(p => p.id === initialSelectedId);
            if (policyToSelect) {
                setSelectedPolicy(policyToSelect);
            }
            // Clear the selection trigger so it doesn't re-trigger or stick
            if (onClearSelection) {
                onClearSelection();
            }
        }
    }, [initialSelectedId, policies, onClearSelection]);

    // Delete Policy Confirmation State
    const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
    const [policyToDelete, setPolicyToDelete] = useState(null);
    const [isDeletingPolicy, setIsDeletingPolicy] = useState(false);

    const confirmDeletePolicy = (policy, e) => {
        if (e) e.stopPropagation();
        setPolicyToDelete(policy);
        setShowDeleteConfirmModal(true);
    };

    const executeDeletePolicy = async () => {
        if (!policyToDelete) return;
        setIsDeletingPolicy(true);
        try {
            const targetPolicy = policyToDelete;
            const targetId = targetPolicy.rawId || targetPolicy.dbId || targetPolicy.id;
            const targetPolicyNum = targetPolicy.id || targetPolicy.numeroPoliza || targetPolicy.numero_poliza;

            if (!isDemo) {
                await deletePolicyHasura(targetPolicy, isDemo);
            }

            // Update local state
            setPolicies(prev => prev.filter(p => {
                const pNum = p.id || p.numeroPoliza;
                const pId = p.rawId || p.dbId || p.id;
                return pNum !== targetPolicyNum && pId !== targetId;
            }));

            // If selectedPolicy is open and matches the deleted policy, return to list view
            if (selectedPolicy) {
                const selNum = selectedPolicy.id || selectedPolicy.numeroPoliza;
                const selId = selectedPolicy.rawId || selectedPolicy.dbId || selectedPolicy.id;
                if (selNum === targetPolicyNum || selId === targetId) {
                    setSelectedPolicy(null);
                    if (onClearSelection) onClearSelection();
                }
            }

            setShowDeleteConfirmModal(false);
            setShowEditPolicyModal(false);
            setPolicyToDelete(null);
        } catch (error) {
            console.error('Error al eliminar la póliza:', error);
            alert(`Error al eliminar la póliza: ${error.message || 'Error en el servidor'}`);
        } finally {
            setIsDeletingPolicy(false);
        }
    };

    const renderDeleteConfirmModal = () => {
        if (!showDeleteConfirmModal || !policyToDelete) return null;
        return (
            <div style={{
                position: 'fixed',
                top: 0, left: 0, right: 0, bottom: 0,
                backgroundColor: 'rgba(15, 23, 42, 0.65)',
                backdropFilter: 'blur(4px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 2000,
                padding: '1rem'
            }}>
                <div className="card" style={{
                    width: '100%',
                    maxWidth: '520px',
                    backgroundColor: '#ffffff',
                    borderRadius: 'var(--radius-lg)',
                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.08)',
                    padding: '1.75rem',
                    border: '1px solid #fee2e2'
                }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', marginBottom: '1.25rem' }}>
                        <div style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: '50%',
                            backgroundColor: '#fee2e2',
                            color: '#dc2626',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                        }}>
                            <Trash2 size={24} />
                        </div>
                        <div>
                            <h3 style={{ margin: '0 0 0.35rem 0', fontSize: '1.25rem', color: '#991b1b', fontWeight: '800' }}>
                                ¿Eliminar Póliza Definitivamente?
                            </h3>
                            <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: 1.45 }}>
                                Esta acción borrará la póliza de la base de datos junto con su historial de movimientos y cobros asociados.
                            </p>
                        </div>
                    </div>

                    {/* Policy Info Card */}
                    <div style={{
                        backgroundColor: '#f8fafc',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-md)',
                        padding: '1rem',
                        marginBottom: '1.5rem'
                    }}>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.2rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '700' }}>
                            Póliza a eliminar:
                        </div>
                        <div style={{ fontSize: '1.15rem', fontWeight: '800', color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                            {policyToDelete.id}
                        </div>
                        <div style={{ fontSize: '0.9rem', color: 'var(--text-main)', fontWeight: '600' }}>
                            👤 Cliente: <span style={{ fontWeight: '700' }}>{policyToDelete.client || 'N/A'}</span>
                        </div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                            🏢 Aseguradora: <strong>{policyToDelete.insurer}</strong> · Ramo: <strong>{policyToDelete.type}</strong>
                        </div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                            💵 Prima: <strong>{formatMoney(policyToDelete.amount, policyToDelete.currency)}</strong> ({policyToDelete.renewalFrequency || 'Anual'})
                        </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                        <button
                            type="button"
                            className="btn"
                            onClick={() => {
                                setShowDeleteConfirmModal(false);
                                setPolicyToDelete(null);
                            }}
                            disabled={isDeletingPolicy}
                            style={{
                                backgroundColor: '#f1f5f9',
                                color: 'var(--text-main)',
                                fontWeight: '700',
                                padding: '0.65rem 1.25rem'
                            }}
                        >
                            Cancelar
                        </button>
                        <button
                            type="button"
                            className="btn"
                            onClick={executeDeletePolicy}
                            disabled={isDeletingPolicy}
                            style={{
                                backgroundColor: '#dc2626',
                                color: '#ffffff',
                                fontWeight: '700',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                padding: '0.65rem 1.25rem',
                                borderRadius: 'var(--radius-md)',
                                border: 'none',
                                cursor: isDeletingPolicy ? 'wait' : 'pointer'
                            }}
                        >
                            {isDeletingPolicy ? (
                                <>
                                    <Loader2 size={16} className="animate-spin" />
                                    <span>Eliminando...</span>
                                </>
                            ) : (
                                <>
                                    <Trash2 size={16} />
                                    <span>Sí, Eliminar Póliza</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    // Reset dropdown search state when modal is closed
    useEffect(() => {
        if (!showCreatePolicyModal) {
            setClientSearch('');
            setShowClientDropdown(false);
        }
    }, [showCreatePolicyModal]);

    // Close dropdown on click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (clientDropdownRef.current && !clientDropdownRef.current.contains(event.target)) {
                setShowClientDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const filteredDropdownClients = clients.filter(client =>
        client.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
        (client.insurerCode && client.insurerCode.toLowerCase().includes(clientSearch.toLowerCase())) ||
        (client.city && client.city.toLowerCase().includes(clientSearch.toLowerCase()))
    );

    const filteredPolicies = useMemo(() => {
        return policies.filter(policy => {
            const statusInfo = policyStatusMap[policy.id] || { status: 'Active' };

            // Filter by Tab:
            // Por defecto en 'ALL', se muestran TODAS LAS ACTIVAS (excluyendo canceladas de la lista principal)
            if (statusTab === 'ALL' && statusInfo.status === 'Cancelled') return false;
            if (statusTab === 'ACTIVE' && statusInfo.status !== 'Active') return false;
            if (statusTab === 'EXPIRING' && statusInfo.status !== 'Expiring') return false;
            if (statusTab === 'PENDING' && statusInfo.status !== 'Pending') return false;
            if (statusTab === 'CANCELLED' && statusInfo.status !== 'Cancelled') return false;

            // Filter by Broker Code & Insurer
            if (selectedCodeId !== 'ALL' && selectedCodeItem) {
                if (!policyMatchesAgentCode(policy, selectedCodeItem)) return false;
            }

            // Filter by Search term
            if (!searchTerm.trim()) return true;
            const term = searchTerm.toLowerCase().trim();
            return (
                (policy.id || '').toLowerCase().includes(term) ||
                (policy.client || '').toLowerCase().includes(term) ||
                (policy.insurer || '').toLowerCase().includes(term) ||
                (policy.type || '').toLowerCase().includes(term) ||
                (policy.cartera || '').toLowerCase().includes(term) ||
                (policy.agentCode || '').toLowerCase().includes(term) ||
                (policy.details || '').toLowerCase().includes(term) ||
                (policy.amount || '').toLowerCase().includes(term)
            );
        });
    }, [policies, policyStatusMap, statusTab, selectedCodeId, selectedCodeItem, searchTerm]);

    // Sorting state
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

    const handleSort = (key) => {
        setSortConfig(prev => {
            if (prev.key === key) {
                return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
            }
            return { key, direction: 'asc' };
        });
    };

    const renderSortIcon = (columnKey) => {
        if (sortConfig.key !== columnKey) {
            return <ArrowUpDown size={13} style={{ opacity: 0.35, marginLeft: '5px', verticalAlign: 'middle' }} />;
        }
        return sortConfig.direction === 'asc'
            ? <ArrowUp size={14} style={{ color: '#2563eb', marginLeft: '5px', verticalAlign: 'middle', fontWeight: 'bold' }} />
            : <ArrowDown size={14} style={{ color: '#2563eb', marginLeft: '5px', verticalAlign: 'middle', fontWeight: 'bold' }} />;
    };

    const sortedPolicies = useMemo(() => {
        if (!sortConfig.key) return filteredPolicies;
        return [...filteredPolicies].sort((a, b) => {
            if (sortConfig.key === 'createdAt') {
                const getPolicyCreationTime = (p) => {
                    if (p.createdAt) {
                        const t = new Date(p.createdAt).getTime();
                        if (!isNaN(t)) return t;
                    }
                    if (p.rawPolicy?.created_at) {
                        const t = new Date(p.rawPolicy.created_at).getTime();
                        if (!isNaN(t)) return t;
                    }
                    const rawNum = typeof p.rawId === 'number' ? p.rawId : parseInt(p.rawId, 10);
                    return isNaN(rawNum) ? 0 : rawNum;
                };
                const timeA = getPolicyCreationTime(a);
                const timeB = getPolicyCreationTime(b);
                return sortConfig.direction === 'asc' ? timeA - timeB : timeB - timeA;
            }

            let valA = a[sortConfig.key];
            let valB = b[sortConfig.key];

            if (sortConfig.key === 'status') {
                valA = (policyStatusMap[a.id] || {}).status || 'Active';
                valB = (policyStatusMap[b.id] || {}).status || 'Active';
            } else if (sortConfig.key === 'amount' || sortConfig.key === 'insuredAmount') {
                valA = typeof a[sortConfig.key] === 'number' ? a[sortConfig.key] : parseFloat(String(a[sortConfig.key] || '0').replace(/[^0-9.-]+/g, '')) || 0;
                valB = typeof b[sortConfig.key] === 'number' ? b[sortConfig.key] : parseFloat(String(b[sortConfig.key] || '0').replace(/[^0-9.-]+/g, '')) || 0;
            } else if (sortConfig.key === 'endDate' || sortConfig.key === 'startDate' || sortConfig.key === 'lastRenewalDate') {
                valA = new Date(valA || '1970-01-01').getTime();
                valB = new Date(valB || '1970-01-01').getTime();
            }

            if (typeof valA === 'number' && typeof valB === 'number') {
                return sortConfig.direction === 'asc' ? valA - valB : valB - valA;
            }

            const strA = String(valA || '').toLowerCase();
            const strB = String(valB || '').toLowerCase();
            return sortConfig.direction === 'asc' ? strA.localeCompare(strB, 'es') : strB.localeCompare(strA, 'es');
        });
    }, [filteredPolicies, sortConfig, policyStatusMap]);

    const policyExtraDocs = useMemo(() => {
        if (!selectedPolicy) return [];
        return getAllPolicyDocuments(selectedPolicy, payments);
    }, [selectedPolicy, payments]);

    // Form state for new movement
    const [newMovement, setNewMovement] = useState({
        type: 'Endoso',
        date: new Date().toISOString().split('T')[0],
        description: '',
        files: [],
        // Renewal-specific fields
        renewalNewStart: '',
        renewalNewEnd: '',
        renewalNewAmount: '',
        renewalNewCurrency: 'DOP',
        renewalNewPolicyNumber: '',
        renewalNote: ''
    });

    // Movement list filter state
    const [movFilterType, setMovFilterType] = useState('Todos');
    const [movFilterFrom, setMovFilterFrom] = useState('');
    const [movFilterTo, setMovFilterTo] = useState('');
    // Track which movement is being edited (null = create new)
    const [editingMovementId, setEditingMovementId] = useState(null);

    // ─── Payment Actions & Edit Handlers for Policy Details ───
    const handleOpenEditPayment = (payment) => {
        if (!canEditPayments) {
            alert('Solo el usuario administrador principal (Santiago Morales) tiene autorización para modificar pagos.');
            return;
        }
        setEditingPayment(payment);
        setEditPaymentForm({
            amount: payment.amountNum ? String(payment.amountNum) : String(payment.amount || '').replace(/[^0-9.]/g, ''),
            date: payment.date || new Date().toISOString().split('T')[0],
            type: ['Cuota Mensual', 'Renovación', 'Anual', 'Semestral', 'Inicial', 'Otro'].includes(payment.type) ? payment.type : 'Otro',
            customType: !['Cuota Mensual', 'Renovación', 'Anual', 'Semestral', 'Inicial'].includes(payment.type) ? (payment.type || '') : '',
            paymentMethod: payment.paymentMethod || 'Efectivo',
            reference: payment.reference || '',
            status: payment.status || 'Paid',
            notes: payment.notes || ''
        });
        setEditPaymentAttachedDocs(payment.attachedDocs || (payment.comprobante && payment.comprobante.startsWith('data:') ? [{
            id: `doc_${payment.id}`,
            name: `Comprobante_${payment.id}`,
            type: payment.comprobante.startsWith('data:application/pdf') ? 'application/pdf' : 'image/jpeg',
            dataUri: payment.comprobante,
            date: payment.date
        }] : []));
        setShowEditPaymentModal(true);
    };

    const handleEditPaymentFileChange = async (e) => {
        if (e.target.files && e.target.files.length > 0) {
            const filesArray = Array.from(e.target.files);
            try {
                const newDocs = await Promise.all(
                    filesArray.map(async (file) => {
                        const dataUri = await fileToDataUri(file);
                        return {
                            id: `doc_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                            name: file.name,
                            size: formatFileSize(file.size),
                            type: file.type,
                            dataUri,
                            date: editPaymentForm.date
                        };
                    })
                );
                setEditPaymentAttachedDocs(prev => [...prev, ...newDocs]);
            } catch (err) {
                console.error('Error reading files:', err);
                alert('No se pudo cargar uno o más archivos seleccionados.');
            }
            e.target.value = '';
        }
    };

    const handleRemoveEditPaymentDoc = (docId) => {
        setEditPaymentAttachedDocs(prev => prev.filter(d => d.id !== docId));
    };

    const handleSaveEditedPayment = async (e) => {
        e.preventDefault();
        if (!editingPayment) return;

        setIsSavingPaymentEdit(true);
        try {
            const cleanAmount = parseFloat(String(editPaymentForm.amount || '0').replace(/[^0-9.]/g, '')) || 0;
            if (cleanAmount <= 0) {
                alert('Por favor ingresa un monto válido.');
                setIsSavingPaymentEdit(false);
                return;
            }

            const matchedPolicy = selectedPolicy || policies.find(p => p.id === editingPayment.policyId || editingPayment.policy?.includes(p.id));
            const policyStats = matchedPolicy ? getPolicyPaymentStats(matchedPolicy, payments) : null;
            const totalOwedBefore = policyStats ? policyStats.totalOwed : (matchedPolicy?.amount || 0);
            const remainingBalance = Math.max(0, totalOwedBefore - cleanAmount);
            const finalType = editPaymentForm.type === 'Otro' ? (editPaymentForm.customType || 'Otro') : editPaymentForm.type;

            const updatedPayment = {
                ...editingPayment,
                amount: formatMoney(cleanAmount, editingPayment.currency || matchedPolicy?.currency || 'DOP'),
                amountNum: cleanAmount,
                date: editPaymentForm.date,
                type: finalType,
                paymentMethod: editPaymentForm.paymentMethod,
                reference: (editPaymentForm.reference || '').trim(),
                status: editPaymentForm.status,
                notes: (editPaymentForm.notes || '').trim(),
                remainingBalance: remainingBalance,
                attachedDocs: editPaymentAttachedDocs,
                comprobante: editPaymentAttachedDocs.length > 0 ? editPaymentAttachedDocs[0].dataUri : editingPayment.comprobante
            };

            // Regenerar Recibo Oficial en PDF
            try {
                const newPdfDataUri = await generateReceiptPdfDataUri(
                    updatedPayment,
                    matchedPolicy || {},
                    {}
                );
                if (newPdfDataUri) {
                    updatedPayment.receiptUrl = newPdfDataUri;
                }
            } catch (pdfErr) {
                console.warn('Error regenerating receipt PDF on edit:', pdfErr);
            }

            // Actualizar estado de pagos
            if (setPayments) {
                setPayments(prev => prev.map(p => p.id === editingPayment.id ? updatedPayment : p));
            }

            // Actualizar en Hasura si no es demo
            if (!isDemo) {
                try {
                    await updateCobroHasura(editingPayment.id || editingPayment.rawId, {
                        amount: cleanAmount,
                        date: editPaymentForm.date,
                        type: finalType,
                        paymentMethod: editPaymentForm.paymentMethod,
                        status: editPaymentForm.status,
                        notes: (editPaymentForm.notes || '').trim(),
                        receiptUrl: updatedPayment.receiptUrl,
                        comprobante: updatedPayment.comprobante
                    }, isDemo);
                } catch (dbErr) {
                    console.warn('Error updating payment in Hasura:', dbErr);
                }
            }

            setShowEditPaymentModal(false);
            setEditingPayment(null);
        } catch (err) {
            console.error('Error saving edited payment:', err);
            alert(`Error al guardar cambios: ${err.message}`);
        } finally {
            setIsSavingPaymentEdit(false);
        }
    };

    const handleDeletePayment = async (payment) => {
        if (!canEditPayments) {
            alert('Solo el usuario administrador principal (Santiago Morales) tiene autorización para eliminar pagos.');
            return;
        }
        const confirmDelete = window.confirm(`¿Estás seguro de que deseas eliminar el registro de pago ${payment.id} por ${formatMoney(payment.amountNum || payment.amount)}?\n\nEsta acción revertirá el cobro de esta póliza.`);
        if (!confirmDelete) return;

        if (setPayments) {
            setPayments(prev => prev.filter(p => p.id !== payment.id));
        }

        if (!isDemo) {
            try {
                await deleteCobroHasura(payment.id || payment.rawId, isDemo);
            } catch (dbErr) {
                console.warn('Error deleting payment in Hasura:', dbErr);
            }
        }
    };

    // Form state for new policy
    const [newPolicy, setNewPolicy] = useState({
        id: '',
        client: '',
        type: 'Auto',
        insurer: '',
        cartera: 'Santiago Morales y Asociados, S.R.L.',
        agentCode: '',
        startDate: new Date().toISOString().split('T')[0],
        renewalFrequency: 'Anual',
        insuredAmount: '',
        amount: '',
        commissionRate: 15.0,
        currency: 'DOP',
        details: ''
    });

    // Helper to auto-lookup agent code
    const getAutoAgentCode = (carteraName, insurerName) => {
        if (!carteraName || !insurerName) return '';
        const match = agentCodes.find(ac => 
            (ac.agent || '').toLowerCase().trim() === carteraName.toLowerCase().trim() &&
            (insurerName.toLowerCase().includes((ac.insurer || '').toLowerCase().trim()) || (ac.insurer || '').toLowerCase().includes(insurerName.toLowerCase().trim()))
        );
        return match ? match.code : '';
    };

    const handleReactivatePolicy = async (policyToReactivate) => {
        const todayStr = new Date().toISOString().split('T')[0];
        const nextEndDate = getNextRenewalDate(todayStr, policyToReactivate.renewalFrequency || 'Anual');

        const updatedPolicy = {
            ...policyToReactivate,
            status: 'Active',
            lastRenewalDate: todayStr,
            endDate: nextEndDate,
            renewal: nextEndDate,
            movements: [
                ...(policyToReactivate.movements || []),
                {
                    id: (policyToReactivate.movements?.length || 0) + 1,
                    date: todayStr,
                    type: 'Reactivación',
                    description: `Póliza reactivada y reabierta como Vigente. Nueva vigencia hasta ${formatDateToDDMMYYYY(nextEndDate)}.`,
                    evidence: 'N/A'
                }
            ]
        };

        const updatedList = policies.map(p => p.id === policyToReactivate.id ? updatedPolicy : p);
        setPolicies(updatedList);
        if (selectedPolicy && selectedPolicy.id === policyToReactivate.id) {
            setSelectedPolicy(updatedPolicy);
        }

        if (!isDemo) {
            try {
                await updatePolicyHasura(policyToReactivate.rawId || policyToReactivate.id, {
                    ...updatedPolicy,
                    status: 'Active',
                    startDate: policyToReactivate.startDate,
                    renewalFrequency: policyToReactivate.renewalFrequency,
                    amount: policyToReactivate.amount
                }, isDemo);

                await insertMovimientoHasura({
                    polizaId: policyToReactivate.rawId || policyToReactivate.id,
                    date: todayStr,
                    type: 'Reactivación',
                    description: `Póliza reactivada y reabierta como Vigente. Nueva vigencia hasta ${formatDateToDDMMYYYY(nextEndDate)}.`,
                    evidence: 'N/A'
                }, isDemo);
            } catch (err) {
                console.warn('Error reactivating policy in Hasura:', err);
            }
        }

        alert(`Póliza ${policyToReactivate.id} reactivada exitosamente como Vigente hasta el ${formatDateToDDMMYYYY(nextEndDate)}.`);
    };

    const handleCreatePolicy = async (e) => {
        e.preventDefault();
        setIsCreating(true);

        try {
            const policyId = newPolicy.id.trim();
            if (!policyId) {
                alert("Por favor, introduzca el número de póliza.");
                setIsCreating(false);
                return;
            }
            if (policies.some(p => p.id.toLowerCase() === policyId.toLowerCase())) {
                alert(`Error: Ya existe una póliza registrada con el número "${policyId}".`);
                setIsCreating(false);
                return;
            }

            let clientName = newPolicy.client;
            let folderLink = '#';
            let createdClientId = null;

            // If creating a new client, add them first
            if (isCreatingClient) {
                clientName = newClientData.name;
                try {
                    console.log("Creating folder for inline client:", newClientData.name);
                    const folderData = await createClientFolder(newClientData.name);
                    console.log("Folder created inline:", folderData);
                    folderLink = folderData.webViewLink;
                } catch (err) {
                    console.error("Error creating folder for inline client:", err);
                }

                const newClientObj = {
                    id: clients.length + 1,
                    name: newClientData.name,
                    personType: newClientData.personType,
                    documentId: newClientData.documentId,
                    insurerCode: newClientData.insurerCode || newPolicy.agentCode || '',
                    cartera: newPolicy.cartera || 'Santiago Morales y Asociados, S.R.L.',
                    email: newClientData.email,
                    phone: newClientData.phone,
                    address: '',
                    city: newClientData.city,
                    sector: newClientData.sector,
                    policy: newPolicy.type,
                    status: 'Active',
                    folderLink: folderLink
                };

                if (!isDemo) {
                    try {
                        const resC = await insertClientHasura(newClientObj, isDemo);
                        if (resC?.data?.insert_clientes_one?.id) {
                            newClientObj.id = resC.data.insert_clientes_one.id;
                            createdClientId = newClientObj.id;
                        }
                    } catch (cErr) {
                        console.warn('Error inserting client in Hasura:', cErr);
                    }
                }

                if (setClients) {
                    setClients([newClientObj, ...clients]);
                }
            } else {
                const existingClient = clients.find(c => c.name === clientName);
                if (existingClient) createdClientId = existingClient.id;
            }

            const formattedInsuredAmount = formatMoney(newPolicy.insuredAmount, newPolicy.currency);
            const formattedAmount = formatMoney(newPolicy.amount, newPolicy.currency);

            const policyCommissionRate = parseFloat(newPolicy.commissionRate) || 15.0;
            const policyToAdd = {
                id: policyId,
                clienteId: createdClientId,
                client: clientName,
                type: newPolicy.type,
                insurer: newPolicy.insurer,
                cartera: newPolicy.cartera || 'Santiago Morales y Asociados, S.R.L.',
                agentCode: newPolicy.agentCode || getAutoAgentCode(newPolicy.cartera, newPolicy.insurer) || '',
                commissionRate: policyCommissionRate,
                porcentajeComision: policyCommissionRate,
                startDate: newPolicy.startDate,
                lastRenewalDate: newPolicy.startDate,
                endDate: getNextRenewalDate(newPolicy.startDate, newPolicy.renewalFrequency),
                renewal: getNextRenewalDate(newPolicy.startDate, newPolicy.renewalFrequency),
                renewalFrequency: newPolicy.renewalFrequency,
                currency: newPolicy.currency,
                insuredAmount: formattedInsuredAmount,
                amount: formattedAmount,
                details: newPolicy.details,
                movements: [{
                    id: 1,
                    date: new Date().toISOString().split('T')[0],
                    type: 'Emisión',
                    description: 'Creación de nueva póliza',
                    evidence: 'N/A'
                }]
            };

            if (!isDemo) {
                try {
                    await insertPolicyHasura(policyToAdd, isDemo);
                } catch (pErr) {
                    console.warn('Error inserting policy in Hasura:', pErr);
                }
            }

            setPolicies([...policies, policyToAdd]);
            setShowCreatePolicyModal(false);
            setNewPolicy({ 
                id: '', 
                client: '', 
                type: 'Auto', 
                insurer: '', 
                cartera: 'Santiago Morales y Asociados, S.R.L.',
                agentCode: '',
                commissionRate: 15.0,
                startDate: new Date().toISOString().split('T')[0], 
                renewalFrequency: 'Anual', 
                insuredAmount: '', 
                amount: '', 
                currency: 'DOP', 
                details: '' 
            });

            // Reset client creation state
            setIsCreatingClient(false);
            setNewClientData({ name: '', personType: '', documentId: '', insurerCode: '', email: '', phone: '', city: '', sector: '' });

            alert(`Póliza ${policyId} creada exitosamente para la cartera de ${policyToAdd.cartera}.`);
        } catch (error) {
            console.error("Error creating policy:", error);
            alert("Error al procesar la solicitud.");
        } finally {
            setIsCreating(false);
        }
    };



    const getStatusColor = (status, policy = null) => {
        let isPaid = true;
        if (policy) {
            const stats = getPolicyPaymentStats(policy, payments);
            isPaid = stats.totalOwed <= 0;
        }

        switch (status) {
            case 'Active': return { bg: '#dcfce7', text: '#166534', label: 'Disponible', icon: CheckCircle };
            case 'Expiring': 
            case 'Pending': 
                if (isPaid) {
                    return { bg: '#e0f2fe', text: '#0369a1', label: 'Próximo a renovar', icon: Clock };
                } else {
                    return { bg: '#ffedd5', text: '#9a3412', label: 'A punto de vencer', icon: AlertTriangle };
                }
            case 'Cancelled': return { bg: '#fee2e2', text: '#991b1b', label: 'Vencido', icon: XCircle };
            default: return { bg: '#fee2e2', text: '#991b1b', label: 'Vencido', icon: XCircle };
        }
    };

    const getDriveLink = (policy) => {
        if (!policy) return 'https://drive.google.com';
        const mappings = getFolderMappings();
        if (mappings?.policies?.[policy.id]?.webViewLink) {
            return mappings.policies[policy.id].webViewLink;
        }
        if (policy.clienteId && mappings?.clients?.[policy.clienteId]?.webViewLink) {
            return mappings.clients[policy.clienteId].webViewLink;
        }
        if (policy.client && mappings?.clients?.[policy.client]?.webViewLink) {
            return mappings.clients[policy.client].webViewLink;
        }
        // Constructs a search query for Google Drive based on client and policy ID
        const query = `${policy.client || ''} ${policy.id || ''}`.trim();
        return `https://drive.google.com/drive/search?q=${encodeURIComponent(query)}`;
    };

    const handleAddMovement = async (e) => {
        e.preventDefault();

        // Convert all selected files to dataUri
        const attachedFiles = [];
        for (const f of (newMovement.files || [])) {
            try {
                const uri = await fileToDataUri(f);
                attachedFiles.push({ name: f.name, dataUri: uri, type: f.type });
            } catch (err) {
                console.warn('Error reading movement file:', err);
            }
        }

        // Primary evidence label (first file or 'Sin adjunto')
        const evidenceLabel = attachedFiles.length > 0
            ? attachedFiles.map(f => f.name).join(', ')
            : 'Sin adjunto';

        // Build movement object
        const movement = {
            id: editingMovementId || `mov_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
            date: newMovement.date,
            type: newMovement.type,
            description: newMovement.description,
            evidence: attachedFiles.length > 0
                ? attachedFiles.map(f => f.name).join(', ')
                : (editingMovementId
                    ? (newMovement._existingFiles?.map(f => f.name).join(', ') || 'Sin adjunto')
                    : 'Sin adjunto'),
            // Merge existing files with newly added ones when editing
            files: editingMovementId && newMovement._existingFiles?.length > 0 && attachedFiles.length === 0
                ? newMovement._existingFiles
                : attachedFiles.length > 0
                    ? [...(editingMovementId ? (newMovement._existingFiles || []) : []), ...attachedFiles]
                    : (editingMovementId ? (newMovement._existingFiles || []) : []),
            dataUri: attachedFiles[0]?.dataUri || newMovement._existingFiles?.[0]?.dataUri || null,
            // Renewal-specific metadata
            ...(newMovement.type === 'Renovación' ? {
                renewalNewStart: newMovement.renewalNewStart,
                renewalNewEnd: newMovement.renewalNewEnd,
                renewalNewAmount: newMovement.renewalNewAmount,
                renewalNewCurrency: newMovement.renewalNewCurrency,
                renewalNewPolicyNumber: newMovement.renewalNewPolicyNumber,
                renewalNote: newMovement.renewalNote
            } : {})
        };

        // Save each file to the document repository
        for (const f of attachedFiles) {
            saveDocumentForEntity('policy', selectedPolicy.id, {
                name: f.name,
                category: `Movimiento: ${newMovement.type}`,
                date: newMovement.date,
                dataUri: f.dataUri,
                notes: newMovement.description,
                movementType: newMovement.type,
                uploadedBy: 'Gestión de Movimientos'
            });
        }

        // If Renewal or Cancellation, update policy fields and status
        let policyUpdates = {};
        if (newMovement.type === 'Renovación') {
            if (newMovement.renewalNewEnd) policyUpdates.endDate = newMovement.renewalNewEnd;
            if (newMovement.renewalNewStart) policyUpdates.startDate = newMovement.renewalNewStart;
            if (newMovement.renewalNewPolicyNumber) policyUpdates.id = newMovement.renewalNewPolicyNumber;
            if (newMovement.renewalNewAmount) policyUpdates.amount = parseFloat(newMovement.renewalNewAmount);
            if (newMovement.renewalNewCurrency) policyUpdates.currency = newMovement.renewalNewCurrency;
            policyUpdates.status = 'Active';
        } else if (newMovement.type === 'Cancelación' || newMovement.type === 'Cancelación de Póliza' || newMovement.type?.toLowerCase().includes('cancel')) {
            policyUpdates.status = 'Cancelled';
        }

        const updatedMovements = editingMovementId
            ? (selectedPolicy.movements || []).map(m => m.id === editingMovementId ? movement : m)
            : [...(selectedPolicy.movements || []), movement];

        const updatedPolicy = {
            ...selectedPolicy,
            ...policyUpdates,
            movements: updatedMovements
        };

        setSelectedPolicy(updatedPolicy);
        setPolicies(policies.map(p => p.id === selectedPolicy.id ? updatedPolicy : p));

        if (!isDemo) {
            try {
                await insertMovimientoHasura({
                    polizaId: selectedPolicy.rawId || selectedPolicy.id,
                    date: newMovement.date,
                    type: newMovement.type,
                    description: newMovement.description,
                    evidence: evidenceLabel
                }, isDemo);

                if (Object.keys(policyUpdates).length > 0) {
                    await updatePolicyHasura(selectedPolicy.rawId || selectedPolicy.id, {
                        ...selectedPolicy,
                        ...policyUpdates
                    }, isDemo);
                }
            } catch (err) {
                console.warn('Error inserting movement/updating policy in Hasura:', err);
            }
        }

        const movType = newMovement.type;
        const wasEditing = !!editingMovementId;
        setShowMovementModal(false);
        setEditingMovementId(null);
        setNewMovement({
            type: 'Endoso',
            date: new Date().toISOString().split('T')[0],
            description: '',
            files: [],
            renewalNewStart: '',
            renewalNewEnd: '',
            renewalNewAmount: '',
            renewalNewCurrency: 'DOP',
            renewalNewPolicyNumber: '',
            renewalNote: ''
        });

        alert(wasEditing ? `Movimiento de "${movType}" actualizado.` : `Movimiento de "${movType}" registrado correctamente.`);
    };

    // Open movement modal for EDITING an existing movement
    const handleOpenEditMovement = (mov) => {
        setEditingMovementId(mov.id);
        setNewMovement({
            type: mov.type,
            date: mov.date,
            description: mov.description,
            files: [],  // existing files stay as-is; user can add new ones
            renewalNewStart: mov.renewalNewStart || '',
            renewalNewEnd: mov.renewalNewEnd || '',
            renewalNewAmount: mov.renewalNewAmount || '',
            renewalNewCurrency: mov.renewalNewCurrency || 'DOP',
            renewalNewPolicyNumber: mov.renewalNewPolicyNumber || '',
            renewalNote: mov.renewalNote || '',
            // keep existing files reference so we preserve them
            _existingFiles: mov.files || (mov.dataUri ? [{ name: mov.evidence, dataUri: mov.dataUri, type: '' }] : [])
        });
        setShowMovementModal(true);
    };

    // Delete a movement
    const handleDeleteMovement = (movId) => {
        if (!window.confirm('¿Eliminar este movimiento? Esta acción no se puede deshacer.')) return;
        const updatedPolicy = {
            ...selectedPolicy,
            movements: (selectedPolicy.movements || []).filter(m => m.id !== movId)
        };
        setSelectedPolicy(updatedPolicy);
        setPolicies(policies.map(p => p.id === selectedPolicy.id ? updatedPolicy : p));
    };

    const cleanNumericForInput = (val) => {
        if (val === null || val === undefined || val === '') return '';
        if (typeof val === 'number') return isNaN(val) ? '' : String(val);
        let s = String(val).trim().replace(/,/g, '').replace(/[^0-9.-]/g, '');
        const num = parseFloat(s);
        return isNaN(num) ? '' : String(num);
    };

    const openEditPolicyModal = (policy) => {
        if (!policy) return;

        // Extraer valores numéricos limpios para que aparezcan precargados en los inputs numéricos
        const currentInsuredAmount = cleanNumericForInput(
            policy.rawPolicy?.monto ?? policy.monto ?? policy.insuredAmount
        );
        const currentAmount = cleanNumericForInput(
            policy.rawPolicy?.prima_anual ?? policy.prima_anual ?? policy.amount ?? policy.rawPolicy?.monto ?? policy.monto
        );

        setEditPolicyForm({
            id: policy.id || '',
            rawId: policy.rawId || policy.dbId || policy.id,
            client: policy.client || '',
            clienteId: policy.clienteId || null,
            insurer: policy.insurer || 'La Colonial de Seguros',
            type: policy.type || 'Vehículo',
            cartera: policy.cartera || 'Santiago Morales y Asociados, S.R.L.',
            agentCode: policy.agentCode || (policy.cartera?.includes('Raquel') ? '897' : '8055'),
            insuredAmount: currentInsuredAmount,
            amount: currentAmount,
            currency: policy.currency || 'DOP',
            renewalFrequency: policy.renewalFrequency || 'Anual',
            startDate: policy.startDate || '',
            lastRenewalDate: policy.lastRenewalDate || policy.startDate || '',
            endDate: policy.endDate || policy.renewal || '',
            details: policy.details || '',
            status: policy.status || 'Active',
            commissionRate: (policy.commissionRate !== undefined && policy.commissionRate !== null) 
                ? policy.commissionRate 
                : (policy.porcentajeComision !== undefined && policy.porcentajeComision !== null ? policy.porcentajeComision : 15.0)
        });
        setShowEditPolicyModal(true);
    };

    const handleSaveEditedPolicy = async (e) => {
        e.preventDefault();
        setIsSavingPolicy(true);
        try {
            const cleanAmount = parseFloat(String(editPolicyForm.amount || '0').replace(/[^0-9.-]+/g, '')) || 0;
            const cleanInsured = parseFloat(String(editPolicyForm.insuredAmount || '0').replace(/[^0-9.-]+/g, '')) || 0;
            const cleanCommissionRate = parseFloat(String(editPolicyForm.commissionRate || '15').replace(/[^0-9.-]+/g, '')) || 0;

            const updatedPolicyObj = {
                ...selectedPolicy,
                ...editPolicyForm,
                commissionRate: cleanCommissionRate,
                porcentajeComision: cleanCommissionRate,
                amount: formatMoney(cleanAmount, editPolicyForm.currency || 'DOP'),
                insuredAmount: formatMoney(cleanInsured, editPolicyForm.currency || 'DOP'),
                monto: cleanInsured,
                prima_anual: cleanAmount,
                renewal: editPolicyForm.endDate,
            };

            const targetDbId = selectedPolicy.rawId || selectedPolicy.dbId || selectedPolicy.id;

            if (!isDemo && targetDbId) {
                try {
                    await updatePolicyHasura(targetDbId, {
                        ...editPolicyForm,
                        amount: cleanAmount,
                        insuredAmount: cleanInsured,
                        commissionRate: cleanCommissionRate
                    }, isDemo);
                } catch (err) {
                    console.warn('Error saving edited policy to Hasura:', err);
                }
            }

            // Update in policies state
            setPolicies(prev => prev.map(p => (p.id === selectedPolicy.id || (targetDbId && (p.rawId === targetDbId || p.id === targetDbId))) ? updatedPolicyObj : p));
            setSelectedPolicy(updatedPolicyObj);
            setShowEditPolicyModal(false);
            alert(`Póliza ${editPolicyForm.id} actualizada correctamente.`);
        } catch (error) {
            console.error('Error updating policy:', error);
            alert('Error al guardar los cambios de la póliza.');
        } finally {
            setIsSavingPolicy(false);
        }
    };

    const renderEditPolicyModalContent = () => {
        if (!showEditPolicyModal) return null;
        return (
            <div style={{
                position: 'fixed',
                top: 0, left: 0, right: 0, bottom: 0,
                backgroundColor: 'rgba(0,0,0,0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000,
                padding: '1rem'
            }}>
                <div className="card" style={{
                    width: '100%',
                    maxWidth: '780px',
                    backgroundColor: 'white',
                    position: 'relative',
                    maxHeight: '90vh',
                    overflowY: 'auto',
                    borderRadius: 'var(--radius-lg)',
                    padding: '1.75rem'
                }}>
                    <button
                        onClick={() => setShowEditPolicyModal(false)}
                        style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                        title="Cerrar"
                    >
                        <X size={24} />
                    </button>

                    <div style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                            <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Edit size={20} />
                            </div>
                            <div>
                                <h3 style={{ margin: 0, color: 'var(--primary)', fontSize: '1.4rem' }}>
                                    Editar Póliza: {editPolicyForm.id}
                                </h3>
                                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                    Modifica datos generales, aseguradora, vigencias, prima y cartera asignada.
                                </span>
                            </div>
                        </div>
                    </div>

                    <form onSubmit={handleSaveEditedPolicy} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        {/* Bloque 1: Identificación y Cliente */}
                        <div style={{ backgroundColor: '#f8fafc', padding: '1rem 1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                            <h4 style={{ margin: '0 0 0.85rem 0', fontSize: '0.92rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                <FileText size={15} /> 1. Datos de la Póliza y Cliente
                            </h4>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                                <div>
                                    <label style={{ fontSize: '0.82rem', fontWeight: '700', color: 'var(--text-main)', display: 'block', marginBottom: '0.35rem' }}>
                                        Número de Póliza *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={editPolicyForm.id}
                                        onChange={e => setEditPolicyForm({ ...editPolicyForm, id: e.target.value })}
                                        onBlur={e => setEditPolicyForm({ ...editPolicyForm, id: formatPolicyNumberLaColonial(e.target.value, editPolicyForm.insurer) })}
                                        placeholder="Ej: 1-2-500-0319503"
                                        style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontWeight: '600' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.82rem', fontWeight: '700', color: 'var(--text-main)', display: 'block', marginBottom: '0.35rem' }}>
                                        Cliente Titular
                                    </label>
                                    <select
                                        value={editPolicyForm.clienteId || ''}
                                        onChange={e => {
                                            const selectedId = e.target.value ? parseInt(e.target.value, 10) : null;
                                            const matchClient = clients.find(c => c.id === selectedId);
                                            setEditPolicyForm({
                                                ...editPolicyForm,
                                                clienteId: selectedId,
                                                client: matchClient ? matchClient.name : editPolicyForm.client
                                            });
                                        }}
                                        style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontWeight: '600' }}
                                    >
                                        <option value="">{editPolicyForm.client || '— Seleccionar Cliente —'}</option>
                                        {clients.map(c => (
                                            <option key={c.id} value={c.id}>
                                                {c.name} {c.documentId ? `(${c.documentId})` : ''}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Bloque 2: Aseguradora, Ramo y Cartera */}
                        <div style={{ backgroundColor: '#f8fafc', padding: '1rem 1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                            <h4 style={{ margin: '0 0 0.85rem 0', fontSize: '0.92rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                <Briefcase size={15} /> 2. Aseguradora y Asignación de Cartera
                            </h4>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                                <div>
                                    <label style={{ fontSize: '0.82rem', fontWeight: '700', color: 'var(--text-main)', display: 'block', marginBottom: '0.35rem' }}>
                                        Compañía Aseguradora *
                                    </label>
                                    <select
                                        value={editPolicyForm.insurer}
                                        onChange={e => {
                                            const newInsurer = e.target.value;
                                            const matchCode = (agentCodes || []).find(ac =>
                                                (ac.insurer || ac.compania || '').toLowerCase().includes(newInsurer.toLowerCase()) ||
                                                newInsurer.toLowerCase().includes((ac.insurer || ac.compania || '').toLowerCase())
                                            );
                                            setEditPolicyForm({
                                                ...editPolicyForm,
                                                insurer: newInsurer,
                                                agentCode: matchCode ? (matchCode.code || matchCode.codigo) : editPolicyForm.agentCode
                                            });
                                        }}
                                        style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontWeight: '600' }}
                                    >
                                        <option value="La Colonial de Seguros">La Colonial de Seguros</option>
                                        <option value="Humano Seguros">Humano Seguros</option>
                                        <option value="Seguros Universal">Seguros Universal</option>
                                        <option value="Mapfre BHD Seguros">Mapfre BHD Seguros</option>
                                        <option value="Seguros Reservas">Seguros Reservas</option>
                                        <option value="Seguros Sura">Seguros Sura</option>
                                        <option value="General de Seguros">General de Seguros</option>
                                        <option value="Dominicana de Seguros">Dominicana de Seguros</option>
                                        <option value="Patria Compañía de Seguros">Patria Compañía de Seguros</option>
                                        <option value="Seguros Pepín">Seguros Pepín</option>
                                        <option value="La Monumental de Seguros">La Monumental de Seguros</option>
                                        <option value="CoopSeguros">CoopSeguros</option>
                                    </select>
                                </div>

                                <div>
                                    <label style={{ fontSize: '0.82rem', fontWeight: '700', color: 'var(--text-main)', display: 'block', marginBottom: '0.35rem' }}>
                                        Ramo / Tipo de Seguro *
                                    </label>
                                    <select
                                        value={editPolicyForm.type}
                                        onChange={e => setEditPolicyForm({ ...editPolicyForm, type: e.target.value })}
                                        style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontWeight: '600' }}
                                    >
                                        <option value="Vehículo">Vehículos de Motor / Auto</option>
                                        <option value="Salud">Seguro Médico / Salud</option>
                                        <option value="Incendio y Líneas Aliadas">Incendio y Líneas Aliadas</option>
                                        <option value="Vida">Seguro de Vida</option>
                                        <option value="Responsabilidad Civil">Responsabilidad Civil</option>
                                        <option value="Transporte de Carga">Transporte de Carga</option>
                                        <option value="Fidelidad / Fianzas">Fidelidad / Fianzas</option>
                                        <option value="Otros">Otros Ramos Generales</option>
                                    </select>
                                </div>

                                <div>
                                    <label style={{ fontSize: '0.82rem', fontWeight: '700', color: 'var(--text-main)', display: 'block', marginBottom: '0.35rem' }}>
                                        Cartera de Agente
                                    </label>
                                    <select
                                        value={editPolicyForm.cartera}
                                        onChange={e => {
                                            const newCartera = e.target.value;
                                            const isRaquel = newCartera.includes('Raquel');
                                            setEditPolicyForm({
                                                ...editPolicyForm,
                                                cartera: newCartera,
                                                agentCode: isRaquel ? '897' : '8055'
                                            });
                                        }}
                                        style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontWeight: '600' }}
                                    >
                                        <option value="Santiago Morales y Asociados, S.R.L.">💼 Santiago Morales y Asociados, S.R.L.</option>
                                        <option value="Raquel Rodríguez">💼 Raquel Rodríguez</option>
                                    </select>
                                </div>

                                <div>
                                    <label style={{ fontSize: '0.82rem', fontWeight: '700', color: 'var(--text-main)', display: 'block', marginBottom: '0.35rem' }}>
                                        Código de Corredor en Aseguradora
                                    </label>
                                    <input
                                        type="text"
                                        value={editPolicyForm.agentCode}
                                        onChange={e => setEditPolicyForm({ ...editPolicyForm, agentCode: e.target.value })}
                                        placeholder="Ej: 8055, 897, 76713..."
                                        style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontWeight: '600' }}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Bloque 3: Fechas de Vigencia */}
                        <div style={{ backgroundColor: '#f8fafc', padding: '1rem 1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                            <h4 style={{ margin: '0 0 0.85rem 0', fontSize: '0.92rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                <RotateCw size={15} /> 3. Fechas de Vigencia y Renovación
                            </h4>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                                <div>
                                    <label style={{ fontSize: '0.82rem', fontWeight: '700', color: 'var(--text-main)', display: 'block', marginBottom: '0.35rem' }}>
                                        1. Fecha Inicio Original
                                    </label>
                                    <input
                                        type="date"
                                        value={editPolicyForm.startDate}
                                        onChange={e => setEditPolicyForm({ ...editPolicyForm, startDate: e.target.value })}
                                        style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.82rem', fontWeight: '700', color: 'var(--text-main)', display: 'block', marginBottom: '0.35rem' }}>
                                        2. Última Renovación (Inicio Vigencia)
                                    </label>
                                    <input
                                        type="date"
                                        value={editPolicyForm.lastRenewalDate}
                                        onChange={e => setEditPolicyForm({ ...editPolicyForm, lastRenewalDate: e.target.value })}
                                        style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.82rem', fontWeight: '700', color: 'var(--text-main)', display: 'block', marginBottom: '0.35rem' }}>
                                        3. Próxima Renovación (Fin Vigencia) *
                                    </label>
                                    <input
                                        type="date"
                                        required
                                        value={editPolicyForm.endDate}
                                        onChange={e => setEditPolicyForm({ ...editPolicyForm, endDate: e.target.value })}
                                        style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontWeight: '600' }}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Bloque 4: Valores Económicos y Frecuencia */}
                        <div style={{ backgroundColor: '#f8fafc', padding: '1rem 1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                            <h4 style={{ margin: '0 0 0.85rem 0', fontSize: '0.92rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                <DollarSign size={15} /> 4. Valores Económicos y Pago
                            </h4>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                                <div>
                                    <label style={{ fontSize: '0.82rem', fontWeight: '700', color: 'var(--text-main)', display: 'block', marginBottom: '0.35rem' }}>
                                        Monto Asegurado (Suma Asegurada)
                                    </label>
                                    <input
                                        type="number"
                                        step="any"
                                        value={editPolicyForm.insuredAmount}
                                        onChange={e => setEditPolicyForm({ ...editPolicyForm, insuredAmount: e.target.value })}
                                        placeholder="0.00"
                                        style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.82rem', fontWeight: '700', color: 'var(--text-main)', display: 'block', marginBottom: '0.35rem' }}>
                                        Prima Anual *
                                    </label>
                                    <input
                                        type="number"
                                        step="any"
                                        required
                                        value={editPolicyForm.amount}
                                        onChange={e => setEditPolicyForm({ ...editPolicyForm, amount: e.target.value })}
                                        placeholder="0.00"
                                        style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontWeight: '700' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.82rem', fontWeight: '700', color: '#0369a1', display: 'block', marginBottom: '0.35rem' }}>
                                        % Comisión Individual *
                                    </label>
                                    <div style={{ position: 'relative' }}>
                                        <input
                                            type="number"
                                            step="0.1"
                                            min="0"
                                            max="100"
                                            required
                                            value={editPolicyForm.commissionRate}
                                            onChange={e => setEditPolicyForm({ ...editPolicyForm, commissionRate: e.target.value })}
                                            placeholder="15.0"
                                            style={{ width: '100%', padding: '0.6rem 1.8rem 0.6rem 0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid #93c5fd', fontWeight: '700', color: '#0369a1' }}
                                        />
                                        <span style={{ position: 'absolute', right: '0.65rem', top: '50%', transform: 'translateY(-50%)', fontWeight: '700', color: '#64748b' }}>%</span>
                                    </div>
                                    <span style={{ fontSize: '0.72rem', color: '#166534', fontWeight: '700', display: 'block', marginTop: '0.2rem' }}>
                                        Est.: {formatMoney((parseFloat(editPolicyForm.amount) || 0) * ((parseFloat(editPolicyForm.commissionRate) || 0) / 100), editPolicyForm.currency || 'DOP')}
                                    </span>
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.82rem', fontWeight: '700', color: 'var(--text-main)', display: 'block', marginBottom: '0.35rem' }}>
                                        Frecuencia de Pago
                                    </label>
                                    <select
                                        value={editPolicyForm.renewalFrequency}
                                        onChange={e => setEditPolicyForm({ ...editPolicyForm, renewalFrequency: e.target.value })}
                                        style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}
                                    >
                                        <option value="Anual">Anual</option>
                                        <option value="Semestral">Semestral</option>
                                        <option value="Trimestral">Trimestral</option>
                                        <option value="Mensual">Mensual</option>
                                        <option value="Contado">Contado</option>
                                    </select>
                                </div>
                            </div>

                            <div style={{ marginTop: '1rem' }}>
                                <label style={{ fontSize: '0.82rem', fontWeight: '700', color: 'var(--text-main)', display: 'block', marginBottom: '0.35rem' }}>
                                    Detalles / Cobertura de la Póliza
                                </label>
                                <textarea
                                    rows={2}
                                    value={editPolicyForm.details}
                                    onChange={e => setEditPolicyForm({ ...editPolicyForm, details: e.target.value })}
                                    placeholder="Descripción de cobertura, vehículo (marca, modelo, placa, chasis), etc."
                                    style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}
                                />
                            </div>
                        </div>

                        {/* Botones de Acción */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginTop: '0.5rem', borderTop: '1px solid var(--border)', paddingTop: '1.25rem' }}>
                            <button
                                type="button"
                                className="btn"
                                onClick={() => {
                                    const currentPolicy = policies.find(p => p.id === editPolicyForm.id || (editPolicyForm.rawId && p.rawId === editPolicyForm.rawId)) || editPolicyForm;
                                    confirmDeletePolicy(currentPolicy);
                                }}
                                disabled={isSavingPolicy}
                                style={{
                                    backgroundColor: '#fee2e2',
                                    color: '#dc2626',
                                    border: '1px solid #fecaca',
                                    padding: '0.6rem 1.1rem',
                                    fontWeight: '700',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.4rem',
                                    cursor: 'pointer'
                                }}
                                title="Eliminar definitivamente esta póliza"
                            >
                                <Trash2 size={16} /> Eliminar Póliza
                            </button>
                            <div style={{ display: 'flex', gap: '0.75rem' }}>
                                <button
                                    type="button"
                                    className="btn"
                                    onClick={() => setShowEditPolicyModal(false)}
                                    disabled={isSavingPolicy}
                                    style={{ border: '1px solid var(--border)', padding: '0.6rem 1.25rem' }}
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    disabled={isSavingPolicy}
                                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.5rem', fontWeight: '700' }}
                                >
                                    {isSavingPolicy ? (
                                        <>
                                            <Loader2 className="animate-spin" size={18} /> Guardando Cambios...
                                        </>
                                    ) : (
                                        <>
                                            <Save size={18} /> Guardar Cambios
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        );
    };

    if (selectedPolicy) {
        const computedStatus = calculatePolicyStatus(selectedPolicy, payments);
        const statusConfirm = getStatusColor(computedStatus, selectedPolicy);
        const StatusIcon = statusConfirm.icon;

        const paymentStats = getPolicyPaymentStats(selectedPolicy, payments);
        const policyPayments = payments.filter(p => 
            (p.policyId === selectedPolicy.id || p.polizaId === selectedPolicy.rawId || p.polizaId === selectedPolicy.id) && 
            (p.status === 'Paid' || p.status === 'Pagado')
        );
        const policyClaims = getPolicyClaims(selectedPolicy, claims);
        const policyOpenClaims = policyClaims.filter(isOpenClaim);

        return (
            <div>
                <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1rem' }}>
                    <div>
                        <button
                            className="btn"
                            style={{ marginBottom: '0.75rem', padding: '0.4rem 0.65rem', display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)' }}
                            onClick={() => {
                                setSelectedPolicy(null);
                                if (onClearSelection) onClearSelection();
                            }}
                        >
                            <ArrowLeft size={18} /> Volver al listado
                        </button>
                        <h2 style={{ fontSize: '2rem', color: 'var(--primary)', margin: 0 }}>Detalle de Póliza</h2>
                        <p style={{ color: 'var(--text-muted)', margin: '0.25rem 0 0 0' }}>Información completa, coberturas y edición.</p>
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                        <button
                            type="button"
                            className="btn"
                            onClick={() => confirmDeletePolicy(selectedPolicy)}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.45rem',
                                padding: '0.6rem 1.15rem',
                                fontWeight: '700',
                                fontSize: '0.92rem',
                                backgroundColor: '#fee2e2',
                                color: '#dc2626',
                                border: '1px solid #fecaca',
                                cursor: 'pointer'
                            }}
                            title="Eliminar esta póliza de la base de datos"
                        >
                            <Trash2 size={16} /> Eliminar Póliza
                        </button>
                        <button
                            className="btn btn-primary"
                            onClick={() => openEditPolicyModal(selectedPolicy)}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.25rem', fontWeight: '700', fontSize: '0.92rem' }}
                        >
                            <Edit size={16} /> Editar Póliza
                        </button>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
                    <div className="card">
                        {/* Alerta si la póliza tiene SINIESTRO ABIERTO */}
                        {policyOpenClaims.length > 0 && (
                            <div style={{
                                backgroundColor: '#fef2f2',
                                border: '1.5px solid #fca5a5',
                                borderRadius: 'var(--radius-md)',
                                padding: '1.25rem',
                                marginBottom: '1.5rem',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                gap: '1rem',
                                flexWrap: 'wrap',
                                boxShadow: '0 2px 8px rgba(220, 38, 38, 0.08)'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <div style={{
                                        width: '38px',
                                        height: '38px',
                                        borderRadius: '50%',
                                        backgroundColor: '#fee2e2',
                                        color: '#dc2626',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        flexShrink: 0
                                    }}>
                                        <ShieldAlert size={22} />
                                    </div>
                                    <div>
                                        <strong style={{ color: '#991b1b', fontSize: '1.05rem', display: 'block' }}>
                                            🚨 Atención: Siniestro Abierto en Curso ({policyOpenClaims.length})
                                        </strong>
                                        <span style={{ fontSize: '0.85rem', color: '#7f1d1d' }}>
                                            {policyOpenClaims.map(c => `${c.id}: ${c.type} (${c.status}) · Reclamado: ${c.amount || 'N/D'}`).join(' | ')}
                                        </span>
                                    </div>
                                </div>
                                {onNavigateToClaim && (
                                    <button
                                        className="btn"
                                        onClick={() => onNavigateToClaim(policyOpenClaims[0].id)}
                                        style={{
                                            backgroundColor: '#dc2626',
                                            color: 'white',
                                            fontWeight: '700',
                                            fontSize: '0.85rem',
                                            padding: '0.5rem 1rem',
                                            boxShadow: '0 2px 4px rgba(220, 38, 38, 0.3)'
                                        }}
                                    >
                                        Ver en Siniestros
                                    </button>
                                )}
                            </div>
                        )}

                        {/* Alerta si la póliza está CANCELADA */}
                        {computedStatus === 'Cancelled' && (
                            <div style={{
                                backgroundColor: '#fee2e2',
                                border: '1.5px solid #f87171',
                                borderRadius: 'var(--radius-md)',
                                padding: '1.25rem',
                                marginBottom: '1.5rem',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                flexWrap: 'wrap',
                                gap: '1rem'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <XCircle size={28} color="#991b1b" />
                                    <div>
                                        <strong style={{ color: '#991b1b', fontSize: '1.05rem', display: 'block' }}>Póliza Cancelada por Falta de Pago</strong>
                                        <span style={{ fontSize: '0.85rem', color: '#7f1d1d' }}>
                                            La vigencia de esta póliza finalizó sin registrar pagos. Puedes reabrirla y reactivarla como vigente cuando lo necesites.
                                        </span>
                                    </div>
                                </div>
                                <button
                                    className="btn"
                                    onClick={() => handleReactivatePolicy(selectedPolicy)}
                                    style={{
                                        backgroundColor: '#166534',
                                        color: 'white',
                                        fontWeight: '700',
                                        padding: '0.65rem 1.25rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.5rem',
                                        borderRadius: 'var(--radius-sm)',
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                    }}
                                >
                                    <RotateCw size={16} /> Reabrir Póliza como Vigente
                                </button>
                            </div>
                        )}

                        {/* Alerta si la póliza tiene PAGO PENDIENTE */}
                        {computedStatus === 'Pending' && (
                            <div style={{
                                backgroundColor: '#fef9c3',
                                border: '1.5px solid #facc15',
                                borderRadius: 'var(--radius-md)',
                                padding: '1.25rem',
                                marginBottom: '1.5rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.75rem'
                            }}>
                                <AlertTriangle size={28} color="#854d0e" />
                                <div>
                                    <strong style={{ color: '#854d0e', fontSize: '1.05rem', display: 'block' }}>
                                        Alerta de Renovación: Póliza Vencida con Balance Pendiente ({formatMoney(paymentStats.totalOwed, selectedPolicy.currency)})
                                    </strong>
                                    <span style={{ fontSize: '0.85rem', color: '#713f12' }}>
                                        La fecha final de vigencia venció y cuenta con un saldo pendiente por liquidar. Al registrar el pago completo, el sistema renovará automáticamente su vigencia.
                                    </span>
                                </div>
                            </div>
                        )}

                        {computedStatus === 'Cancelled' && (
                            <div style={{
                                backgroundColor: '#fef2f2',
                                border: '1.5px solid #f87171',
                                borderRadius: 'var(--radius-md)',
                                padding: '1.1rem 1.35rem',
                                marginBottom: '1.5rem',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                flexWrap: 'wrap',
                                gap: '1rem',
                                boxShadow: '0 4px 12px rgba(220, 38, 38, 0.08)',
                                animation: 'fadeIn 0.2s ease'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                                    <div style={{
                                        width: '44px',
                                        height: '44px',
                                        borderRadius: '50%',
                                        backgroundColor: '#fee2e2',
                                        color: '#dc2626',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        flexShrink: 0
                                    }}>
                                        <XCircle size={26} />
                                    </div>
                                    <div>
                                        <h4 style={{ margin: 0, color: '#991b1b', fontSize: '1.1rem', fontWeight: '800' }}>
                                            Esta Póliza se Encuentra Cancelada
                                        </h4>
                                        <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.86rem', color: '#7f1d1d' }}>
                                            La póliza está inactiva fuera de la cartera activa. Si el cliente regularizó su pago o renovó su plan, puedes <strong>reabrirla</strong> o editar sus datos.
                                        </p>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                                    <button
                                        type="button"
                                        className="btn"
                                        onClick={() => handleReactivatePolicy(selectedPolicy)}
                                        style={{
                                            backgroundColor: '#166534',
                                            color: 'white',
                                            fontWeight: '700',
                                            fontSize: '0.88rem',
                                            padding: '0.6rem 1.15rem',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '0.4rem',
                                            boxShadow: '0 2px 6px rgba(22, 101, 52, 0.25)',
                                            border: 'none',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        <RotateCw size={16} /> Reabrir Póliza
                                    </button>
                                    <button
                                        type="button"
                                        className="btn"
                                        onClick={() => openEditPolicyModal(selectedPolicy)}
                                        style={{
                                            backgroundColor: '#ffffff',
                                            border: '1.5px solid var(--border)',
                                            color: 'var(--text-main)',
                                            fontWeight: '700',
                                            fontSize: '0.88rem',
                                            padding: '0.6rem 1rem',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '0.4rem'
                                        }}
                                    >
                                        <Edit size={16} /> Editar Datos
                                    </button>
                                </div>
                            </div>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
                            <div>
                                <h3 style={{ fontSize: '1.5rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                                    <span>{selectedPolicy.type} -</span>
                                    <InsurerLogo name={selectedPolicy.insurer} size={28} showName={true} textStyle={{ color: 'var(--primary)', fontWeight: '700', fontSize: '1.5rem' }} />
                                </h3>
                                <p style={{ fontSize: '1.1rem', marginTop: '0.25rem' }}>{selectedPolicy.client}</p>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <button
                                    className="btn"
                                    onClick={() => openEditPolicyModal(selectedPolicy)}
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '0.4rem',
                                        padding: '0.45rem 0.9rem',
                                        fontSize: '0.85rem',
                                        fontWeight: '700',
                                        border: '1px solid var(--border)',
                                        backgroundColor: '#ffffff'
                                    }}
                                    title="Editar póliza"
                                >
                                    <Edit size={15} /> Editar
                                </button>
                                <span style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.4rem',
                                    padding: '0.45rem 1rem',
                                    borderRadius: '999px',
                                    fontSize: '0.95rem',
                                    fontWeight: '700',
                                    backgroundColor: statusConfirm.bg,
                                    color: statusConfirm.text
                                }}>
                                    <StatusIcon size={18} />
                                    <span>{statusConfirm.label}</span>
                                </span>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                            <div>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.2rem' }}>Número de Póliza</p>
                                <p style={{ fontWeight: '700', fontSize: '1.1rem', margin: 0, color: 'var(--primary)' }}>{selectedPolicy.id}</p>
                            </div>
                            <div style={{ backgroundColor: '#eff6ff', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', border: '1px solid #bfdbfe' }}>
                                <p style={{ color: '#1e40af', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', marginBottom: '0.2rem', marginTop: 0, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                    <Briefcase size={14} /> Cartera de Agente
                                </p>
                                <p style={{ fontWeight: '700', fontSize: '1.05rem', color: '#1e3a8a', margin: 0 }}>
                                    {selectedPolicy.cartera || 'Santiago Morales y Asociados, S.R.L.'}
                                </p>
                                <span style={{ fontSize: '0.78rem', color: '#3b82f6', fontWeight: '600' }}>
                                    Código en {selectedPolicy.insurer || 'Aseguradora'}: <strong style={{ color: '#1e3a8a' }}>{selectedPolicy.agentCode || 'N/A'}</strong>
                                </span>
                            </div>
                            <div>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.2rem' }}>Monto Asegurado</p>
                                <p style={{ fontWeight: '600', fontSize: '1.1rem', margin: 0 }}>{formatMoney(selectedPolicy.insuredAmount, selectedPolicy.currency)}</p>
                            </div>
                            <div>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.2rem' }}>Prima (Monto)</p>
                                <p style={{ fontWeight: '700', fontSize: '1.1rem', color: 'var(--primary)', margin: 0 }}>{formatMoney(selectedPolicy.amount, selectedPolicy.currency)}</p>
                            </div>
                            <div style={{ backgroundColor: '#f0f9ff', padding: '0.65rem 0.85rem', borderRadius: 'var(--radius-sm)', border: '1px solid #bae6fd' }}>
                                <p style={{ color: '#0369a1', fontSize: '0.78rem', fontWeight: '700', textTransform: 'uppercase', marginBottom: '0.2rem', marginTop: 0 }}>Comisión de Póliza</p>
                                <p style={{ fontWeight: '800', fontSize: '1.15rem', color: '#0369a1', margin: 0 }}>
                                    {selectedPolicy.commissionRate !== undefined && selectedPolicy.commissionRate !== null ? selectedPolicy.commissionRate : 15}%
                                </p>
                                <span style={{ fontSize: '0.74rem', color: '#166534', fontWeight: '700' }}>
                                    Est.: {formatMoney((parseFloat(String(selectedPolicy.amount || '0').replace(/[^0-9.-]+/g, '')) || 0) * (((selectedPolicy.commissionRate !== undefined && selectedPolicy.commissionRate !== null ? selectedPolicy.commissionRate : 15)) / 100), selectedPolicy.currency)}
                                </span>
                            </div>
                            <div>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.2rem' }}>Frecuencia de Pago</p>
                                <p style={{ fontWeight: '600', fontSize: '1rem', margin: 0 }}>{selectedPolicy.renewalFrequency || 'Anual'}</p>
                            </div>
                            <div>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.2rem' }}>Detalles de Cobertura</p>
                                <p style={{ fontWeight: '600', fontSize: '0.95rem', margin: 0 }}>{selectedPolicy.details}</p>
                            </div>
                            <div style={{ backgroundColor: '#f8fafc', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid #e2e8f0' }}>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', marginBottom: '0.2rem', marginTop: 0 }}>1. Fecha Inicio Original</p>
                                <p style={{ fontWeight: '700', fontSize: '1rem', color: 'var(--text-main)', margin: 0 }}>{formatDateToDDMMYYYY(selectedPolicy.startDate) || 'N/A'}</p>
                                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Contratación inicial</span>
                            </div>
                            <div style={{ backgroundColor: '#f8fafc', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid #e2e8f0' }}>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', marginBottom: '0.2rem', marginTop: 0 }}>2. Última Renovación</p>
                                <p style={{ fontWeight: '700', fontSize: '1rem', color: '#0369a1', margin: 0 }}>{formatDateToDDMMYYYY(selectedPolicy.lastRenewalDate || selectedPolicy.startDate) || 'N/A'}</p>
                                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Inicio de vigencia actual</span>
                            </div>
                            <div style={{ gridColumn: 'span 2', backgroundColor: computedStatus === 'Active' ? '#f0fdf4' : computedStatus === 'Expiring' ? '#fffbeb' : '#fef2f2', padding: '0.85rem', borderRadius: 'var(--radius-sm)', border: `1px solid ${statusConfirm.bg}` }}>
                                <p style={{ color: statusConfirm.text, fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', marginBottom: '0.2rem', marginTop: 0 }}>3. Próxima Renovación (Fecha Final)</p>
                                <p style={{ fontWeight: '700', fontSize: '1.15rem', color: statusConfirm.text, margin: 0 }}>{formatDateToDDMMYYYY(selectedPolicy.endDate || selectedPolicy.renewal || 'N/A')}</p>
                                <span style={{ fontSize: '0.75rem', color: statusConfirm.text }}>Fin de vigencia actual (Renueva)</span>
                            </div>
                        </div>

                        {/* Financial and Payment Stats */}
                        <div style={{
                            marginTop: '2rem',
                            paddingTop: '1.5rem',
                            borderTop: '1px solid var(--border)',
                            display: 'grid',
                            gridTemplateColumns: 'repeat(3, 1fr)',
                            gap: '1rem'
                        }}>
                            <div style={{ padding: '1rem', backgroundColor: '#f0fdf4', borderRadius: 'var(--radius-sm)', border: '1px solid #bbf7d0' }}>
                                <p style={{ color: '#166534', fontSize: '0.8rem', fontWeight: '600', textTransform: 'uppercase', marginBottom: '0.25rem', marginTop: 0 }}>Total Pagado</p>
                                <p style={{ fontWeight: '700', fontSize: '1.2rem', color: '#14532d', margin: 0 }}>
                                    {formatMoney(paymentStats.totalPaid, selectedPolicy.currency)}
                                </p>
                            </div>
                            <div style={{ padding: '1rem', backgroundColor: '#fef2f2', borderRadius: 'var(--radius-sm)', border: '1px solid #fecaca' }}>
                                <p style={{ color: '#991b1b', fontSize: '0.8rem', fontWeight: '600', textTransform: 'uppercase', marginBottom: '0.25rem', marginTop: 0 }}>Total Pendiente (Debe)</p>
                                <p style={{ fontWeight: '700', fontSize: '1.2rem', color: '#7f1d1d', margin: 0 }}>
                                    {formatMoney(paymentStats.totalOwed, selectedPolicy.currency)}
                                </p>
                            </div>
                            <div style={{ padding: '1rem', backgroundColor: '#fdf8f6', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                                <p style={{ color: 'var(--accent)', fontSize: '0.8rem', fontWeight: '600', textTransform: 'uppercase', marginBottom: '0.25rem', marginTop: 0 }}>Próxima Cuota</p>
                                <p style={{ fontWeight: '700', fontSize: '1.2rem', color: 'var(--primary)', margin: 0 }}>
                                    {formatMoney(paymentStats.nextInstallment, selectedPolicy.currency)}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="card" style={{ backgroundColor: '#f8fafc', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                        <div>
                            <h3 style={{ marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.2rem', color: 'var(--primary)' }}>
                                <Briefcase size={20} /> Acciones y Carpeta Digital
                            </h3>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
                                Gestiona la carpeta en la nube y la información oficial de esta póliza.
                            </p>

                            <a
                                href={getDriveLink(selectedPolicy)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn btn-primary"
                                style={{ width: '100%', justifyContent: 'center', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.65rem 1rem' }}
                            >
                                <ExternalLink size={18} /> Abrir Carpeta en Google Drive
                            </a>

                            <button
                                type="button"
                                onClick={() => openEditPolicyModal(selectedPolicy)}
                                className="btn"
                                style={{
                                    width: '100%',
                                    justifyContent: 'center',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    padding: '0.65rem 1rem',
                                    backgroundColor: '#ffffff',
                                    border: '1.5px solid var(--border)',
                                    fontWeight: '700',
                                    fontSize: '0.88rem',
                                    color: 'var(--text-main)'
                                }}
                            >
                                <Edit size={16} color="var(--primary)" /> Editar Información de Póliza
                            </button>
                        </div>

                        <div style={{ marginTop: '1.5rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
                            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', padding: '0.75rem', backgroundColor: 'white', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                                <File size={22} color="var(--primary)" />
                                <div style={{ flex: 1, overflow: 'hidden' }}>
                                    <p style={{ fontSize: '0.88rem', fontWeight: '700', margin: 0, color: 'var(--primary)' }}>Expediente Digital</p>
                                    <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>Archivos, recibos y soportes</p>
                                </div>
                                <span style={{
                                    fontSize: '0.75rem',
                                    fontWeight: '700',
                                    backgroundColor: '#dbeafe',
                                    color: '#1e40af',
                                    padding: '0.15rem 0.5rem',
                                    borderRadius: '999px'
                                }}>
                                    {policyExtraDocs.length} doc(s)
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Expediente y Documentación de la Póliza */}
                <div style={{ marginTop: '2rem' }}>
                    <div className="card" style={{ padding: '1.5rem' }}>
                        <div style={{ marginBottom: '1.25rem' }}>
                            <h3 style={{ fontSize: '1.4rem', color: 'var(--primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <FileText size={22} color="#2563eb" /> Expediente y Documentación de la Póliza
                            </h3>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', margin: '0.25rem 0 0 0' }}>
                                Adjunta y visualiza documentos obligatorios según el tipo de póliza ({selectedPolicy.type}), tales como matrícula, inspección, licencia y recibos de pago.
                            </p>
                        </div>

                        <DocumentManager
                            entityType="policy"
                            entityId={selectedPolicy.id}
                            entityTitle={selectedPolicy.id}
                            policyType={selectedPolicy.type}
                            extraDocuments={policyExtraDocs}
                        />
                    </div>
                </div>

                {/* Movements History */}
                <div style={{ marginTop: '2rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                        <div>
                            <h3 style={{ fontSize: '1.5rem', color: 'var(--primary)', margin: 0 }}>Historial de Movimientos</h3>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0.2rem 0 0 0' }}>
                                Endosos, renovaciones, inclusiones, exclusiones y pagos con sus documentos adjuntos.
                            </p>
                        </div>
                        <button className="btn btn-primary" onClick={() => setShowMovementModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <Plus size={18} /> Registrar Movimiento
                        </button>
                    </div>

                    {/* Filter Bar */}
                    <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: 'var(--radius-md)', padding: '0.85rem 1rem', border: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: '0 0 auto' }}>
                            <Filter size={15} color="var(--text-muted)" />
                            <span style={{ fontSize: '0.82rem', fontWeight: '700', color: 'var(--text-muted)' }}>FILTRAR:</span>
                        </div>
                        <select
                            value={movFilterType}
                            onChange={e => setMovFilterType(e.target.value)}
                            style={{ fontSize: '0.85rem', padding: '0.35rem 0.65rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', backgroundColor: 'white', fontWeight: '600' }}
                        >
                            {['Todos','Endoso','Renovación','Cancelación','Reclamación','Pago','Inclusión','Exclusión','Otro'].map(t => (
                                <option key={t} value={t}>{t}</option>
                            ))}
                        </select>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: '600' }}>Desde:</span>
                            <input
                                type="date"
                                value={movFilterFrom}
                                onChange={e => setMovFilterFrom(e.target.value)}
                                style={{ fontSize: '0.85rem', padding: '0.3rem 0.55rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}
                            />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: '600' }}>Hasta:</span>
                            <input
                                type="date"
                                value={movFilterTo}
                                onChange={e => setMovFilterTo(e.target.value)}
                                style={{ fontSize: '0.85rem', padding: '0.3rem 0.55rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}
                            />
                        </div>
                        {(movFilterType !== 'Todos' || movFilterFrom || movFilterTo) && (
                            <button
                                onClick={() => { setMovFilterType('Todos'); setMovFilterFrom(''); setMovFilterTo(''); }}
                                style={{ fontSize: '0.8rem', padding: '0.3rem 0.65rem', borderRadius: 'var(--radius-sm)', border: '1px solid #fca5a5', backgroundColor: '#fff1f2', color: '#dc2626', fontWeight: '700', cursor: 'pointer' }}
                            >
                                ✕ Limpiar
                            </button>
                        )}
                        <span style={{ marginLeft: 'auto', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            {(() => {
                                const movs = selectedPolicy.movements || [];
                                const filtered = movs.filter(m => {
                                    if (movFilterType !== 'Todos' && m.type !== movFilterType) return false;
                                    if (movFilterFrom && m.date < movFilterFrom) return false;
                                    if (movFilterTo && m.date > movFilterTo) return false;
                                    return true;
                                });
                                return `${filtered.length} de ${movs.length} movimiento${movs.length !== 1 ? 's' : ''}`;
                            })()}
                        </span>
                    </div>

                    <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid var(--border)' }}>
                                    <th style={{ padding: '0.9rem 1rem', textAlign: 'left', fontWeight: '700', color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase' }}>Fecha</th>
                                    <th style={{ padding: '0.9rem 1rem', textAlign: 'left', fontWeight: '700', color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase' }}>Tipo</th>
                                    <th style={{ padding: '0.9rem 1rem', textAlign: 'left', fontWeight: '700', color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase' }}>Descripción / Detalle</th>
                                    <th style={{ padding: '0.9rem 1rem', textAlign: 'left', fontWeight: '700', color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase' }}>Archivos Adjuntos</th>
                                    <th style={{ padding: '0.9rem 1rem', textAlign: 'center', fontWeight: '700', color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase' }}>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(() => {
                                    const movs = (selectedPolicy.movements || []).filter(m => {
                                        if (movFilterType !== 'Todos' && m.type !== movFilterType) return false;
                                        if (movFilterFrom && m.date < movFilterFrom) return false;
                                        if (movFilterTo && m.date > movFilterTo) return false;
                                        return true;
                                    }).slice().sort((a, b) => (b.date || '').localeCompare(a.date || ''));

                                    if (movs.length === 0) return (
                                        <tr>
                                            <td colSpan="4" style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                                                {selectedPolicy.movements?.length > 0 ? 'No hay movimientos que coincidan con el filtro aplicado.' : 'No hay movimientos registrados en esta póliza.'}
                                            </td>
                                        </tr>
                                    );

                                    return movs.map((mov) => {
                                        const isRenewal = mov.type === 'Renovación';
                                        const badgeStyle = {
                                            padding: '0.22rem 0.7rem',
                                            borderRadius: '999px',
                                            fontSize: '0.78rem',
                                            fontWeight: '700',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '0.3rem',
                                            ...(isRenewal
                                                ? { backgroundColor: '#dcfce7', color: '#166534' }
                                                : mov.type === 'Cancelación'
                                                ? { backgroundColor: '#fee2e2', color: '#991b1b' }
                                                : mov.type === 'Endoso'
                                                ? { backgroundColor: '#eff6ff', color: '#1d4ed8' }
                                                : { backgroundColor: '#fdf8f6', color: 'var(--primary)' })
                                        };

                                        const filesList = mov.files && mov.files.length > 0
                                            ? mov.files
                                            : (mov.dataUri ? [{ name: mov.evidence, dataUri: mov.dataUri, type: mov.evidence?.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg' }] : []);

                                        return (
                                            <tr key={mov.id} style={{ borderBottom: '1px solid var(--border)', backgroundColor: isRenewal ? '#f0fdf4' : 'white' }}>
                                                <td style={{ padding: '1rem', fontWeight: '600', whiteSpace: 'nowrap', verticalAlign: 'top' }}>
                                                    {formatDateToDDMMYYYY(mov.date)}
                                                </td>
                                                <td style={{ padding: '1rem', verticalAlign: 'top' }}>
                                                    <span style={badgeStyle}>
                                                        {isRenewal && <RefreshCw size={12} />}
                                                        {mov.type}
                                                    </span>
                                                    {isRenewal && mov.renewalNewEnd && (
                                                        <div style={{ fontSize: '0.76rem', color: '#166534', marginTop: '0.3rem', fontWeight: '600' }}>
                                                            Nueva vigencia: {formatDateToDDMMYYYY(mov.renewalNewEnd)}
                                                        </div>
                                                    )}
                                                    {isRenewal && mov.renewalNewAmount && (
                                                        <div style={{ fontSize: '0.76rem', color: '#166534', fontWeight: '700' }}>
                                                            Prima: {mov.renewalNewCurrency} {parseFloat(mov.renewalNewAmount).toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                                                        </div>
                                                    )}
                                                </td>
                                                <td style={{ padding: '1rem', verticalAlign: 'top', maxWidth: '320px' }}>
                                                    <div style={{ fontSize: '0.9rem', color: 'var(--text-main)' }}>{mov.description}</div>
                                                    {isRenewal && mov.renewalNewPolicyNumber && (
                                                        <div style={{ fontSize: '0.77rem', color: '#166534', marginTop: '0.2rem' }}>
                                                            Nuevo # Póliza: <strong>{mov.renewalNewPolicyNumber}</strong>
                                                        </div>
                                                    )}
                                                    {isRenewal && mov.renewalNote && (
                                                        <div style={{ fontSize: '0.77rem', color: 'var(--text-muted)', marginTop: '0.15rem', fontStyle: 'italic' }}>
                                                            {mov.renewalNote}
                                                        </div>
                                                    )}
                                                </td>
                                                <td style={{ padding: '1rem', verticalAlign: 'top' }}>
                                                    {filesList.length > 0 ? (
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                                                            {filesList.map((f, idx) => (
                                                                <button
                                                                    key={idx}
                                                                    type="button"
                                                                    className="btn"
                                                                    onClick={() => setViewingMovementDoc({
                                                                        name: f.name || mov.evidence,
                                                                        category: `Movimiento: ${mov.type}`,
                                                                        date: mov.date,
                                                                        notes: mov.description,
                                                                        dataUri: f.dataUri,
                                                                        fileUrl: f.dataUri || '#',
                                                                        type: f.type || (f.name?.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg'),
                                                                        movementType: mov.type
                                                                    })}
                                                                    style={{
                                                                        padding: '0.25rem 0.6rem',
                                                                        fontSize: '0.78rem',
                                                                        color: '#1d4ed8',
                                                                        backgroundColor: '#eff6ff',
                                                                        border: '1px solid #bfdbfe',
                                                                        borderRadius: 'var(--radius-sm)',
                                                                        fontWeight: '600',
                                                                        display: 'inline-flex',
                                                                        alignItems: 'center',
                                                                        gap: '0.3rem',
                                                                        cursor: 'pointer',
                                                                        textAlign: 'left',
                                                                        maxWidth: '220px',
                                                                        overflow: 'hidden',
                                                                        textOverflow: 'ellipsis',
                                                                        whiteSpace: 'nowrap'
                                                                    }}
                                                                    title={f.name || mov.evidence}
                                                                >
                                                                    <Paperclip size={12} color="#2563eb" />
                                                                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.name || mov.evidence}</span>
                                                                </button>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem', fontStyle: 'italic' }}>Sin adjunto</span>
                                                    )}
                                                </td>
                                                {/* Edit / Delete actions */}
                                                <td style={{ padding: '0.75rem', textAlign: 'center', verticalAlign: 'top' }}>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', alignItems: 'center' }}>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleOpenEditMovement(mov)}
                                                            title="Editar movimiento"
                                                            style={{ background: 'none', border: '1px solid #cbd5e1', borderRadius: 'var(--radius-sm)', padding: '0.3rem 0.5rem', cursor: 'pointer', color: '#475569', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', fontWeight: '700' }}
                                                        >
                                                            <Edit size={13} /> Editar
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleDeleteMovement(mov.id)}
                                                            title="Eliminar movimiento"
                                                            style={{ background: 'none', border: '1px solid #fca5a5', borderRadius: 'var(--radius-sm)', padding: '0.3rem 0.5rem', cursor: 'pointer', color: '#dc2626', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', fontWeight: '700' }}
                                                        >
                                                            <X size={13} /> Eliminar
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    });
                                })()}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Related Payments */}
                <div style={{ marginTop: '2rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                        <h3 style={{ fontSize: '1.5rem', color: 'var(--primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <DollarSign size={22} /> Cobros y Pagos Realizados ({policyPayments.length})
                        </h3>
                    </div>
                    {policyPayments.length > 0 ? (
                        <div className="card" style={{ padding: '0', overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid var(--border)' }}>
                                        <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', color: 'var(--text-muted)' }}>ID Recibo / Pago</th>
                                        <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', color: 'var(--text-muted)' }}>Fecha de Pago</th>
                                        <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', color: 'var(--text-muted)' }}>Concepto / Método</th>
                                        <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', color: 'var(--text-muted)' }}>Estado</th>
                                        <th style={{ padding: '1rem', textAlign: 'right', fontWeight: '600', color: 'var(--text-muted)' }}>Monto Pagado</th>
                                        <th style={{ padding: '1rem', textAlign: 'right', fontWeight: '600', color: 'var(--text-muted)' }}>Acciones / Documentos</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {policyPayments.map((p) => {
                                        const docsCount = p.attachedDocs?.length || (p.comprobante ? 1 : 0);
                                        return (
                                            <tr key={p.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                                <td style={{ padding: '1rem', fontWeight: 'bold' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                        <span style={{ color: 'var(--primary)' }}>{p.id}</span>
                                                        {p.reference && (
                                                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 'normal' }}>
                                                                ({p.reference})
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td style={{ padding: '1rem', whiteSpace: 'nowrap' }}>{formatDateToDDMMYYYY(p.date)}</td>
                                                <td style={{ padding: '1rem' }}>
                                                    <div style={{ fontWeight: '600', color: 'var(--text-main)' }}>{p.type}</div>
                                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                                        {p.paymentMethod || 'Efectivo'} {p.notes ? `• ${p.notes}` : ''}
                                                    </div>
                                                </td>
                                                <td style={{ padding: '1rem' }}>
                                                    <span style={{
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '0.25rem',
                                                        padding: '0.25rem 0.75rem',
                                                        borderRadius: '999px',
                                                        fontSize: '0.82rem',
                                                        fontWeight: '700',
                                                        backgroundColor: p.status === 'Cancelled' ? '#fee2e2' : p.status === 'Pending' ? '#fef3c7' : '#dcfce7',
                                                        color: p.status === 'Cancelled' ? '#991b1b' : p.status === 'Pending' ? '#92400e' : '#166534'
                                                    }}>
                                                        {p.status === 'Cancelled' ? 'Anulado' : p.status === 'Pending' ? 'Pendiente' : 'Pagado'}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '1rem', textAlign: 'right', fontWeight: '700', fontSize: '1rem', color: '#166534' }}>
                                                    {formatMoney(p.amountNum || p.amount, selectedPolicy.currency)}
                                                </td>
                                                <td style={{ padding: '1rem', textAlign: 'right' }}>
                                                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                                                        {/* Botón Ver / Imprimir Recibo Oficial PDF */}
                                                        <button 
                                                            className="btn" 
                                                            type="button"
                                                            onClick={() => {
                                                                setSelectedReceiptPayment(p);
                                                                setShowReceiptModal(true);
                                                            }}
                                                            style={{ 
                                                                padding: '0.38rem 0.65rem', 
                                                                color: 'var(--primary)', 
                                                                backgroundColor: '#f8fafc',
                                                                border: '1px solid #cbd5e1',
                                                                borderRadius: 'var(--radius-sm)',
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                gap: '0.35rem',
                                                                fontSize: '0.78rem',
                                                                fontWeight: '700',
                                                                cursor: 'pointer',
                                                                boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                                                            }}
                                                            title="Ver e Imprimir Recibo Oficial de Pago (PDF)"
                                                        >
                                                            <Printer size={13} color="#d97706" /> Recibo PDF
                                                        </button>

                                                        {/* Botón Ver Documentos Adjuntos (Comprobantes / Transferencias / Cheques) */}
                                                        {(p.attachedDocs?.length > 0 || (p.comprobante && p.comprobante.startsWith('data:image'))) && (
                                                            <button
                                                                className="btn"
                                                                type="button"
                                                                onClick={() => {
                                                                    const docsList = (p.attachedDocs && p.attachedDocs.length > 0) ? p.attachedDocs : [{
                                                                        id: `doc_${p.id}`,
                                                                        name: `Comprobante_${p.id}`,
                                                                        type: p.comprobante?.startsWith('data:image') ? 'image/jpeg' : 'application/pdf',
                                                                        dataUri: p.comprobante,
                                                                        date: p.date
                                                                    }];
                                                                    setSelectedViewingDocs(docsList);
                                                                    setShowDocViewer(true);
                                                                }}
                                                                style={{
                                                                    padding: '0.38rem 0.65rem',
                                                                    color: '#0369a1',
                                                                    backgroundColor: '#f0f9ff',
                                                                    border: '1px solid #bae6fd',
                                                                    borderRadius: 'var(--radius-sm)',
                                                                    display: 'inline-flex',
                                                                    alignItems: 'center',
                                                                    gap: '0.3rem',
                                                                    fontSize: '0.78rem',
                                                                    fontWeight: '700',
                                                                    cursor: 'pointer'
                                                                }}
                                                                title="Ver Documento(s) / Comprobante(s) Adjunto(s)"
                                                            >
                                                                <Paperclip size={13} color="#0284c7" /> Doc ({docsCount})
                                                            </button>
                                                        )}

                                                        {/* Botón Editar Pago (SOLO PARA SANTIAGO / ADMIN) */}
                                                        {canEditPayments && (
                                                            <button
                                                                className="btn"
                                                                type="button"
                                                                onClick={() => handleOpenEditPayment(p)}
                                                                style={{
                                                                    padding: '0.38rem 0.65rem',
                                                                    color: '#475569',
                                                                    backgroundColor: '#ffffff',
                                                                    border: '1px solid #cbd5e1',
                                                                    borderRadius: 'var(--radius-sm)',
                                                                    display: 'inline-flex',
                                                                    alignItems: 'center',
                                                                    gap: '0.3rem',
                                                                    fontSize: '0.78rem',
                                                                    fontWeight: '700',
                                                                    cursor: 'pointer'
                                                                }}
                                                                title="Editar este pago y sus documentos adjuntos (Solo Administrador)"
                                                            >
                                                                <Edit size={13} color="#475569" /> Editar
                                                            </button>
                                                        )}

                                                        {/* Botón Eliminar Pago (SOLO PARA SANTIAGO / ADMIN) */}
                                                        {canEditPayments && (
                                                            <button
                                                                className="btn"
                                                                type="button"
                                                                onClick={() => handleDeletePayment(p)}
                                                                style={{
                                                                    padding: '0.38rem 0.55rem',
                                                                    color: '#dc2626',
                                                                    backgroundColor: '#fef2f2',
                                                                    border: '1px solid #fecaca',
                                                                    borderRadius: 'var(--radius-sm)',
                                                                    display: 'inline-flex',
                                                                    alignItems: 'center',
                                                                    gap: '0.2rem',
                                                                    fontSize: '0.78rem',
                                                                    fontWeight: '700',
                                                                    cursor: 'pointer'
                                                                }}
                                                                title="Eliminar este registro de pago (Solo Administrador)"
                                                            >
                                                                <Trash2 size={13} color="#dc2626" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                            No hay pagos realizados registrados para esta póliza.
                        </div>
                    )}
                </div>

                {/* Siniestros y Reclamaciones Relacionados */}
                <div style={{ marginTop: '2rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <h3 style={{ fontSize: '1.5rem', color: 'var(--primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Shield size={22} color="#dc2626" /> Siniestros y Reclamaciones Registradas ({policyClaims.length})
                        </h3>
                        {onNavigateToClaim && (
                            <button
                                className="btn"
                                onClick={() => onNavigateToClaim()}
                                style={{
                                    border: '1px solid var(--border)',
                                    backgroundColor: 'white',
                                    padding: '0.4rem 0.8rem',
                                    fontSize: '0.85rem',
                                    fontWeight: '600',
                                    color: 'var(--primary)'
                                }}
                            >
                                Ver todos en Siniestros
                            </button>
                        )}
                    </div>

                    {policyClaims.length > 0 ? (
                        <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid var(--border)' }}>
                                        <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', color: 'var(--text-muted)' }}>ID Siniestro</th>
                                        <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', color: 'var(--text-muted)' }}>Tipo de Incidente</th>
                                        <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', color: 'var(--text-muted)' }}>Fecha</th>
                                        <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', color: 'var(--text-muted)' }}>Estado</th>
                                        <th style={{ padding: '1rem', textAlign: 'right', fontWeight: '600', color: 'var(--text-muted)' }}>Monto Reclamado</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {policyClaims.map((c) => {
                                        const isOpen = isOpenClaim(c);
                                        return (
                                            <tr key={c.id} style={{ borderBottom: '1px solid var(--border)', backgroundColor: isOpen ? '#fffafa' : 'white' }}>
                                                <td style={{ padding: '1rem', fontWeight: 'bold' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                        {isOpen && <ShieldAlert size={16} color="#dc2626" />}
                                                        <span>{c.id}</span>
                                                    </div>
                                                </td>
                                                <td style={{ padding: '1rem' }}>
                                                    <div style={{ fontWeight: '600' }}>{c.type}</div>
                                                    {c.description && <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{c.description}</div>}
                                                </td>
                                                <td style={{ padding: '1rem' }}>{formatDateToDDMMYYYY(c.date || c.reportDate)}</td>
                                                <td style={{ padding: '1rem' }}>
                                                    <span style={{
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '0.25rem',
                                                        padding: '0.25rem 0.75rem',
                                                        borderRadius: '999px',
                                                        fontSize: '0.85rem',
                                                        fontWeight: '600',
                                                        backgroundColor: isOpen ? '#fee2e2' : '#dcfce7',
                                                        color: isOpen ? '#991b1b' : '#166534'
                                                    }}>
                                                        {c.status || (isOpen ? 'Abierto' : 'Cerrado')}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '1rem', textAlign: 'right', fontWeight: '700' }}>{c.amount || 'N/A'}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                            No hay siniestros registrados para esta póliza.
                        </div>
                    )}
                </div>

                {/* New Movement Modal */}
                {showMovementModal && (
                    <div style={{
                        position: 'fixed',
                        inset: 0,
                        backgroundColor: 'rgba(0,0,0,0.55)',
                        backdropFilter: 'blur(2px)',
                        display: 'flex',
                        alignItems: 'flex-start',
                        justifyContent: 'center',
                        zIndex: 1000,
                        padding: '1.5rem 1rem',
                        overflowY: 'auto'
                    }}>
                        <div className="card" style={{ width: '100%', maxWidth: '620px', backgroundColor: 'white', margin: 'auto', padding: '2rem' }}>
                            {/* Modal Header */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
                                <div>
                                    <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        {newMovement.type === 'Renovación' ? <RefreshCw size={20} color="#16a34a" /> : <Plus size={20} />}
                                        {editingMovementId ? 'Editar Movimiento' : 'Registrar Movimiento'}
                                    </h3>
                                    <p style={{ margin: '0.2rem 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                                        Póliza: <strong>{selectedPolicy?.id}</strong> · {selectedPolicy?.client}
                                    </p>
                                </div>
                                <button onClick={() => { setShowMovementModal(false); setEditingMovementId(null); }} style={{ background: 'none', border: 'none', padding: '0.5rem', cursor: 'pointer' }}>
                                    <XCircle size={24} />
                                </button>
                            </div>

                            <form onSubmit={handleAddMovement}>
                                {/* Type + Date row */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                                    <div>
                                        <label style={{ fontWeight: '700', fontSize: '0.85rem' }}>Tipo de Movimiento</label>
                                        <select
                                            style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', marginTop: '0.35rem' }}
                                            value={newMovement.type}
                                            onChange={e => {
                                                const newType = e.target.value;
                                                const updates = { ...newMovement, type: newType };
                                                if (newType === 'Renovación') {
                                                    // Use policy expiration date as the movement date
                                                    const policyEndDate = selectedPolicy?.endDate || selectedPolicy?.renewal || '';
                                                    if (policyEndDate) {
                                                        updates.date = policyEndDate;
                                                        // Pre-fill new start as the same expiration date
                                                        updates.renewalNewStart = policyEndDate;
                                                        // Calculate suggested new end based on renewal frequency
                                                        if (policyEndDate) {
                                                            const d = new Date(policyEndDate);
                                                            const freq = selectedPolicy?.renewalFrequency || 'Anual';
                                                            if (freq === 'Semestral') d.setMonth(d.getMonth() + 6);
                                                            else if (freq === 'Trimestral') d.setMonth(d.getMonth() + 3);
                                                            else if (freq === 'Mensual') d.setMonth(d.getMonth() + 1);
                                                            else d.setFullYear(d.getFullYear() + 1); // Anual por defecto
                                                            updates.renewalNewEnd = d.toISOString().split('T')[0];
                                                        }
                                                    }
                                                }
                                                setNewMovement(updates);
                                            }}
                                        >
                                            <option value="Endoso">Endoso</option>
                                            <option value="Renovación">🔄 Renovación</option>
                                            <option value="Cancelación">Cancelación</option>
                                            <option value="Reclamación">Reclamación / Siniestro</option>
                                            <option value="Pago">Pago de Prima</option>
                                            <option value="Inclusión">Inclusión</option>
                                            <option value="Exclusión">Exclusión</option>
                                            <option value="Otro">Otro</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label style={{ fontWeight: '700', fontSize: '0.85rem' }}>Fecha del Movimiento</label>
                                        <input
                                            type="date"
                                            required
                                            value={newMovement.date}
                                            onChange={e => setNewMovement({ ...newMovement, date: e.target.value })}
                                            style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', marginTop: '0.35rem', boxSizing: 'border-box' }}
                                        />
                                    </div>
                                </div>

                                {/* Cancellation Alert */}
                                {newMovement.type === 'Cancelación' && (
                                    <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 'var(--radius-md)', padding: '0.85rem 1.15rem', marginBottom: '1rem', display: 'flex', alignItems: 'flex-start', gap: '0.65rem' }}>
                                        <AlertTriangle size={18} color="#dc2626" style={{ flexShrink: 0, marginTop: '2px' }} />
                                        <div style={{ fontSize: '0.85rem', color: '#991b1b', lineHeight: '1.4' }}>
                                            <strong>Cancelación de Póliza:</strong> Al guardar este movimiento se cerrará la vigencia y la póliza quedará formalmente marcada como <strong>Cancelada / Vencida</strong> en el sistema.
                                        </div>
                                    </div>
                                )}

                                {/* Renewal-specific fields */}
                                {newMovement.type === 'Renovación' && (
                                    <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #86efac', borderRadius: 'var(--radius-md)', padding: '1.25rem', marginBottom: '1rem' }}>
                                        <h4 style={{ margin: '0 0 1rem 0', color: '#166534', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.95rem' }}>
                                            <RefreshCw size={16} /> Datos de la Renovación
                                        </h4>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                                            <div>
                                                <label style={{ fontSize: '0.82rem', fontWeight: '700', color: '#166534' }}>Nueva Vigencia Desde</label>
                                                <input
                                                    type="date"
                                                    value={newMovement.renewalNewStart}
                                                    onChange={e => setNewMovement({ ...newMovement, renewalNewStart: e.target.value })}
                                                    style={{ width: '100%', padding: '0.45rem 0.65rem', borderRadius: 'var(--radius-sm)', border: '1px solid #86efac', marginTop: '0.25rem', boxSizing: 'border-box' }}
                                                />
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '0.82rem', fontWeight: '700', color: '#166534' }}>Nueva Vigencia Hasta</label>
                                                <input
                                                    type="date"
                                                    value={newMovement.renewalNewEnd}
                                                    onChange={e => setNewMovement({ ...newMovement, renewalNewEnd: e.target.value })}
                                                    style={{ width: '100%', padding: '0.45rem 0.65rem', borderRadius: 'var(--radius-sm)', border: '1px solid #86efac', marginTop: '0.25rem', boxSizing: 'border-box' }}
                                                />
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '0.82rem', fontWeight: '700', color: '#166534' }}>Nueva Prima</label>
                                                <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.25rem' }}>
                                                    <select
                                                        value={newMovement.renewalNewCurrency}
                                                        onChange={e => setNewMovement({ ...newMovement, renewalNewCurrency: e.target.value })}
                                                        style={{ padding: '0.45rem 0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid #86efac', fontSize: '0.85rem', fontWeight: '700' }}
                                                    >
                                                        <option>DOP</option>
                                                        <option>USD</option>
                                                    </select>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        step="any"
                                                        placeholder="0.00"
                                                        value={newMovement.renewalNewAmount}
                                                        onChange={e => setNewMovement({ ...newMovement, renewalNewAmount: e.target.value })}
                                                        style={{ flex: 1, padding: '0.45rem 0.65rem', borderRadius: 'var(--radius-sm)', border: '1px solid #86efac', fontSize: '0.9rem' }}
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '0.82rem', fontWeight: '700', color: '#166534' }}>Nuevo # Póliza (si cambia)</label>
                                                <input
                                                    type="text"
                                                    placeholder="Ej. POL-2025-001234"
                                                    value={newMovement.renewalNewPolicyNumber}
                                                    onChange={e => setNewMovement({ ...newMovement, renewalNewPolicyNumber: e.target.value })}
                                                    style={{ width: '100%', padding: '0.45rem 0.65rem', borderRadius: 'var(--radius-sm)', border: '1px solid #86efac', marginTop: '0.25rem', boxSizing: 'border-box' }}
                                                />
                                            </div>
                                        </div>
                                        <div style={{ marginTop: '0.85rem' }}>
                                            <label style={{ fontSize: '0.82rem', fontWeight: '700', color: '#166534' }}>Notas de la Renovación</label>
                                            <input
                                                type="text"
                                                placeholder="Ej. Renovación procesada con cambio de suma asegurada..."
                                                value={newMovement.renewalNote}
                                                onChange={e => setNewMovement({ ...newMovement, renewalNote: e.target.value })}
                                                style={{ width: '100%', padding: '0.45rem 0.65rem', borderRadius: 'var(--radius-sm)', border: '1px solid #86efac', marginTop: '0.25rem', boxSizing: 'border-box' }}
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* Description */}
                                <div style={{ marginBottom: '1rem' }}>
                                    <label style={{ fontWeight: '700', fontSize: '0.85rem' }}>Descripción / Detalle</label>
                                    <textarea
                                        required
                                        rows="3"
                                        placeholder="Describa el detalle del movimiento..."
                                        value={newMovement.description}
                                        onChange={e => setNewMovement({ ...newMovement, description: e.target.value })}
                                        style={{ width: '100%', marginTop: '0.35rem', padding: '0.55rem 0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', resize: 'vertical', boxSizing: 'border-box' }}
                                    />
                                </div>

                                {/* Multi-file upload */}
                                {/* If editing, show currently attached files */}
                                {editingMovementId && newMovement._existingFiles?.length > 0 && (
                                    <div style={{ marginBottom: '0.75rem', padding: '0.75rem', backgroundColor: '#f0fdf4', borderRadius: 'var(--radius-sm)', border: '1px solid #86efac' }}>
                                        <div style={{ fontSize: '0.8rem', fontWeight: '700', color: '#166534', marginBottom: '0.4rem' }}>
                                            Archivos actuales (se conservarán salvo que cargues nuevos):
                                        </div>
                                        {newMovement._existingFiles.map((f, idx) => (
                                            <div key={idx} style={{ fontSize: '0.8rem', color: '#166534', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                                <Paperclip size={12} /> {f.name}
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <div style={{ marginBottom: '1.5rem' }}>
                                    <label style={{ fontWeight: '700', fontSize: '0.85rem', display: 'block', marginBottom: '0.35rem' }}>
                                        {editingMovementId ? 'Agregar / Reemplazar Documentos' : 'Documentos Adjuntos'} {newMovement.type === 'Renovación' ? '(Carta de renovación, factura, cotización...)' : '(PDF, imágenes)'}
                                    </label>
                                    <label style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '0.5rem',
                                        padding: '0.85rem',
                                        border: '2px dashed var(--border)',
                                        borderRadius: 'var(--radius-md)',
                                        backgroundColor: '#f8fafc',
                                        cursor: 'pointer',
                                        fontWeight: '600',
                                        fontSize: '0.9rem',
                                        color: 'var(--primary)',
                                        transition: 'background 0.15s'
                                    }}>
                                        <Upload size={18} />
                                        {newMovement.files?.length > 0 ? `${newMovement.files.length} archivo(s) seleccionado(s)` : 'Seleccionar archivos (múltiples permitidos)'}
                                        <input
                                            type="file"
                                            multiple
                                            accept=".pdf,.jpg,.jpeg,.png,.webp,.gif,.bmp,.tiff,.doc,.docx,.xls,.xlsx"
                                            style={{ display: 'none' }}
                                            onChange={e => setNewMovement({ ...newMovement, files: Array.from(e.target.files) })}
                                        />
                                    </label>
                                    {newMovement.files?.length > 0 && (
                                        <div style={{ marginTop: '0.6rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                            {newMovement.files.map((f, idx) => (
                                                <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#eff6ff', borderRadius: 'var(--radius-sm)', padding: '0.3rem 0.65rem', fontSize: '0.82rem' }}>
                                                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#1d4ed8', fontWeight: '600' }}>
                                                        <Paperclip size={13} /> {f.name}
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() => setNewMovement({ ...newMovement, files: newMovement.files.filter((_, i) => i !== idx) })}
                                                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', padding: '0 0.2rem', fontSize: '0.9rem', lineHeight: 1 }}
                                                        title="Quitar archivo"
                                                    >✕</button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
                                    <button type="button" className="btn" onClick={() => { setShowMovementModal(false); setEditingMovementId(null); }} style={{ backgroundColor: '#f1f5f9', fontWeight: '700' }}>
                                        Cancelar
                                    </button>
                                    <button type="submit" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: '700' }}>
                                        {newMovement.type === 'Renovación' ? <RefreshCw size={16} /> : editingMovementId ? <Save size={16} /> : <Plus size={16} />}
                                        {editingMovementId ? 'Guardar Cambios' : newMovement.type === 'Renovación' ? 'Registrar Renovación' : 'Guardar Movimiento'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Modal de Edición Completa de Póliza */}
                {renderEditPolicyModalContent()}

                {/* Modal de Confirmación de Eliminación */}
                {renderDeleteConfirmModal()}

                {/* Visor de Evidencia de Movimiento */}
                {viewingMovementDoc && (
                    <DocumentViewerModal
                        isOpen={!!viewingMovementDoc}
                        onClose={() => setViewingMovementDoc(null)}
                        document={viewingMovementDoc}
                    />
                )}
            </div>
        );
    }

    return (
        <div>
            <div style={{ marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '2rem', color: 'var(--primary)' }}>Cartera de Pólizas</h2>
                <p style={{ color: 'var(--text-muted)' }}>Visualiza, renueva y gestiona las pólizas de todos los clientes y carteras de agentes.</p>
            </div>

            {/* Pestañas de Estado de Pólizas */}
            <div style={{
                display: 'flex',
                gap: '0.6rem',
                marginBottom: '1.25rem',
                overflowX: 'auto',
                paddingBottom: '0.4rem',
                maxWidth: '100%'
            }}>
                <button
                    onClick={() => setStatusTab('ALL')}
                    style={{
                        padding: '0.55rem 1.1rem',
                        borderRadius: '999px',
                        border: '1px solid var(--border)',
                        cursor: 'pointer',
                        fontWeight: '700',
                        fontSize: '0.88rem',
                        backgroundColor: statusTab === 'ALL' ? 'var(--primary)' : 'white',
                        color: statusTab === 'ALL' ? 'white' : 'var(--text-main)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        whiteSpace: 'nowrap',
                        transition: 'all 0.15s'
                    }}
                >
                    Todas las Activas ({allActiveCount})
                </button>
                <button
                    onClick={() => setStatusTab('ACTIVE')}
                    style={{
                        padding: '0.55rem 1.1rem',
                        borderRadius: '999px',
                        border: statusTab === 'ACTIVE' ? '1px solid #166534' : '1px solid #bbf7d0',
                        cursor: 'pointer',
                        fontWeight: '700',
                        fontSize: '0.88rem',
                        backgroundColor: statusTab === 'ACTIVE' ? '#166534' : '#f0fdf4',
                        color: statusTab === 'ACTIVE' ? 'white' : '#166534',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        whiteSpace: 'nowrap',
                        transition: 'all 0.15s'
                    }}
                >
                    <CheckCircle size={15} /> Disponibles ({activeCount})
                </button>
                <button
                    onClick={() => setStatusTab('EXPIRING')}
                    style={{
                        padding: '0.55rem 1.1rem',
                        borderRadius: '999px',
                        border: statusTab === 'EXPIRING' ? '1px solid #9a3412' : '1px solid #fed7aa',
                        cursor: 'pointer',
                        fontWeight: '700',
                        fontSize: '0.88rem',
                        backgroundColor: statusTab === 'EXPIRING' ? '#9a3412' : '#fff7ed',
                        color: statusTab === 'EXPIRING' ? 'white' : '#9a3412',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        whiteSpace: 'nowrap',
                        transition: 'all 0.15s'
                    }}
                >
                    <Clock size={15} /> Próximo a renovar ({expiringCount})
                </button>
                <button
                    onClick={() => setStatusTab('PENDING')}
                    style={{
                        padding: '0.55rem 1.1rem',
                        borderRadius: '999px',
                        border: statusTab === 'PENDING' ? '1px solid #854d0e' : '1px solid #fef08a',
                        cursor: 'pointer',
                        fontWeight: '700',
                        fontSize: '0.88rem',
                        backgroundColor: statusTab === 'PENDING' ? '#854d0e' : '#fefce8',
                        color: statusTab === 'PENDING' ? 'white' : '#854d0e',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        whiteSpace: 'nowrap',
                        transition: 'all 0.15s'
                    }}
                >
                    <AlertTriangle size={15} /> Con Pago Pendiente ({pendingCount})
                </button>
                <button
                    onClick={() => setStatusTab('CANCELLED')}
                    style={{
                        padding: '0.55rem 1.1rem',
                        borderRadius: '999px',
                        border: statusTab === 'CANCELLED' ? '1.5px solid #991b1b' : '1.5px solid #fca5a5',
                        cursor: 'pointer',
                        fontWeight: '800',
                        fontSize: '0.88rem',
                        backgroundColor: statusTab === 'CANCELLED' ? '#991b1b' : '#fef2f2',
                        color: statusTab === 'CANCELLED' ? 'white' : '#991b1b',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        whiteSpace: 'nowrap',
                        boxShadow: statusTab === 'CANCELLED' ? '0 2px 8px rgba(153, 27, 27, 0.25)' : 'none',
                        transition: 'all 0.15s'
                    }}
                >
                    <XCircle size={15} /> Vencidas ({cancelledCount})
                </button>
            </div>

            {/* Banner Informativo Exclusivo del Tab de Canceladas */}
            {statusTab === 'CANCELLED' && (
                <div style={{
                    backgroundColor: '#fef2f2',
                    border: '1.5px solid #fca5a5',
                    borderRadius: 'var(--radius-md)',
                    padding: '1.1rem 1.35rem',
                    marginBottom: '1.25rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '1rem',
                    animation: 'fadeIn 0.2s ease',
                    boxShadow: '0 4px 12px rgba(220, 38, 38, 0.06)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                        <div style={{
                            width: '42px',
                            height: '42px',
                            borderRadius: '50%',
                            backgroundColor: '#fee2e2',
                            color: '#dc2626',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                        }}>
                            <XCircle size={24} />
                        </div>
                        <div>
                            <h4 style={{ margin: 0, color: '#991b1b', fontSize: '1.05rem', fontWeight: '800' }}>
                                Tablero de Pólizas Canceladas ({cancelledCount})
                            </h4>
                            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.86rem', color: '#7f1d1d' }}>
                                Estas pólizas están archivadas fuera de la cartera activa. Puedes consultar su expediente, editar sus registros o <strong>reabrirlas</strong> directamente.
                            </p>
                        </div>
                    </div>
                    <div style={{ fontSize: '0.82rem', color: '#166534', fontWeight: '700', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', padding: '0.4rem 0.85rem', borderRadius: 'var(--radius-sm)' }}>
                        ✓ Si se registra un pago o se importa desde la base de datos, la póliza se reabre automáticamente.
                    </div>
                </div>
            )}

            <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
                <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flex: 1, minWidth: '300px' }}>
                        <div style={{ position: 'relative', flex: 1, maxWidth: '380px' }}>
                            <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={20} />
                            <input
                                type="text"
                                placeholder="Buscar por póliza, cliente, código o aseguradora..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                style={{ paddingLeft: '40px', paddingRight: searchTerm ? '36px' : '12px', width: '100%' }}
                            />
                            {searchTerm && (
                                <button
                                    onClick={() => setSearchTerm('')}
                                    style={{
                                        position: 'absolute',
                                        right: '10px',
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        background: 'none',
                                        border: 'none',
                                        cursor: 'pointer',
                                        color: 'var(--text-muted)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        padding: '2px'
                                    }}
                                    title="Limpiar búsqueda"
                                >
                                    <XCircle size={16} />
                                </button>
                            )}
                        </div>

                        {/* Selector Estético por Código de Corredor & Aseguradora */}
                        <div ref={codeDropdownRef} style={{ position: 'relative' }}>
                            <button
                                type="button"
                                onClick={() => setIsCodeDropdownOpen(prev => !prev)}
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.6rem',
                                    padding: '0.5rem 0.95rem',
                                    borderRadius: 'var(--radius-md)',
                                    border: selectedCodeId !== 'ALL' ? '1.5px solid #2563eb' : '1.5px solid var(--border)',
                                    fontSize: '0.88rem',
                                    fontWeight: '600',
                                    backgroundColor: selectedCodeId !== 'ALL' ? '#eff6ff' : '#ffffff',
                                    color: selectedCodeId !== 'ALL' ? '#1d4ed8' : 'var(--text-main)',
                                    cursor: 'pointer',
                                    boxShadow: selectedCodeId !== 'ALL' ? '0 2px 6px rgba(37, 99, 235, 0.15)' : '0 1px 3px rgba(0,0,0,0.04)',
                                    transition: 'all 0.2s',
                                    minHeight: '42px'
                                }}
                            >
                                {selectedCodeItem ? (
                                    <>
                                        <InsurerLogo name={selectedCodeItem.insurer} size={22} />
                                        <span style={{ fontWeight: '700' }}>{selectedCodeItem.insurer}</span>
                                        <span style={{
                                            backgroundColor: '#dbeafe',
                                            color: '#1e40af',
                                            padding: '0.1rem 0.45rem',
                                            borderRadius: '4px',
                                            fontSize: '0.76rem',
                                            fontWeight: '800'
                                        }}>
                                            Cód. {selectedCodeItem.code}
                                        </span>
                                        <span style={{ fontSize: '0.8rem', color: '#60a5fa', fontWeight: '700' }}>
                                            ({policies.filter(p => policyMatchesAgentCode(p, selectedCodeItem)).length})
                                        </span>
                                    </>
                                ) : (
                                    <>
                                        <Briefcase size={18} color="var(--primary)" />
                                        <span>Todas las Carteras y Códigos ({policies.length})</span>
                                    </>
                                )}
                                <ChevronDown size={16} style={{ transform: isCodeDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', marginLeft: '0.2rem' }} />
                            </button>

                            {/* Menú Desplegable con Códigos, Nombres y Logos */}
                            {isCodeDropdownOpen && (
                                <div style={{
                                    position: 'absolute',
                                    top: 'calc(100% + 6px)',
                                    left: 0,
                                    zIndex: 1000,
                                    width: '390px',
                                    backgroundColor: '#ffffff',
                                    borderRadius: 'var(--radius-lg)',
                                    border: '1px solid var(--border)',
                                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                                    overflow: 'hidden'
                                }}>
                                    <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)', backgroundColor: '#f8fafc' }}>
                                        <span style={{ fontSize: '0.78rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                            Seleccionar Cartera / Código de Agencia
                                        </span>
                                    </div>

                                    <div style={{ maxHeight: '340px', overflowY: 'auto', padding: '0.4rem' }}>
                                        {/* Opción: Todas las Carteras */}
                                        <div
                                            onClick={() => {
                                                setSelectedCodeId('ALL');
                                                setIsCodeDropdownOpen(false);
                                            }}
                                            style={{
                                                padding: '0.75rem 0.9rem',
                                                borderRadius: 'var(--radius-md)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                cursor: 'pointer',
                                                backgroundColor: selectedCodeId === 'ALL' ? '#eff6ff' : 'transparent',
                                                border: selectedCodeId === 'ALL' ? '1px solid #bfdbfe' : '1px solid transparent',
                                                marginBottom: '0.35rem',
                                                transition: 'all 0.15s'
                                            }}
                                            onMouseEnter={e => selectedCodeId !== 'ALL' && (e.currentTarget.style.backgroundColor = '#f1f5f9')}
                                            onMouseLeave={e => selectedCodeId !== 'ALL' && (e.currentTarget.style.backgroundColor = 'transparent')}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                <div style={{
                                                    width: '32px',
                                                    height: '32px',
                                                    borderRadius: '50%',
                                                    backgroundColor: '#e2e8f0',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    color: 'var(--primary)'
                                                }}>
                                                    <Briefcase size={17} />
                                                </div>
                                                <div>
                                                    <div style={{ fontSize: '0.92rem', fontWeight: '700', color: 'var(--text-main)' }}>
                                                        Todas las Carteras y Códigos
                                                    </div>
                                                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                                        Visualizar todas las pólizas del sistema
                                                    </div>
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <span style={{ fontSize: '0.8rem', fontWeight: '700', backgroundColor: '#f1f5f9', color: 'var(--text-muted)', padding: '0.15rem 0.5rem', borderRadius: '999px' }}>
                                                    {policies.length}
                                                </span>
                                                {selectedCodeId === 'ALL' && <Check size={16} color="#2563eb" />}
                                            </div>
                                        </div>

                                        <div style={{ borderTop: '1px solid var(--border)', margin: '0.4rem 0' }} />

                                        {/* Grupos Organizados por Aseguradora */}
                                        {groupedCodesByCompany.map((group) => {
                                            const totalInGroup = group.codes.reduce((sum, c) => sum + c.count, 0);

                                            return (
                                                <div key={group.insurer} style={{ marginBottom: '0.75rem' }}>
                                                    {/* Encabezado de la Compañía con Logo */}
                                                    <div style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'space-between',
                                                        padding: '0.45rem 0.75rem',
                                                        backgroundColor: '#f8fafc',
                                                        borderRadius: 'var(--radius-sm)',
                                                        marginBottom: '0.35rem',
                                                        border: '1px solid #f1f5f9'
                                                    }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                                                            <InsurerLogo name={group.insurer} size={24} />
                                                            <span style={{ fontSize: '0.88rem', fontWeight: '800', color: '#1e293b' }}>
                                                                {group.insurer}
                                                            </span>
                                                        </div>
                                                        <span style={{
                                                            fontSize: '0.75rem',
                                                            fontWeight: '700',
                                                            color: '#64748b',
                                                            backgroundColor: '#e2e8f0',
                                                            padding: '0.1rem 0.45rem',
                                                            borderRadius: '999px'
                                                        }}>
                                                            {totalInGroup} pólizas
                                                        </span>
                                                    </div>

                                                    {/* Códigos de Corredor dentro de esta Compañía */}
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', paddingLeft: '0.5rem' }}>
                                                        {group.codes.map(({ key, item, count }) => {
                                                            const isSelected = selectedCodeId === String(item.id || key);

                                                            return (
                                                                <div
                                                                    key={key}
                                                                    onClick={() => {
                                                                        setSelectedCodeId(String(item.id || key));
                                                                        setIsCodeDropdownOpen(false);
                                                                    }}
                                                                    style={{
                                                                        padding: '0.55rem 0.75rem',
                                                                        borderRadius: 'var(--radius-md)',
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        justifyContent: 'space-between',
                                                                        cursor: 'pointer',
                                                                        backgroundColor: isSelected ? '#eff6ff' : 'transparent',
                                                                        border: isSelected ? '1px solid #bfdbfe' : '1px solid #f1f5f9',
                                                                        transition: 'all 0.15s'
                                                                    }}
                                                                    onMouseEnter={e => !isSelected && (e.currentTarget.style.backgroundColor = '#f8fafc')}
                                                                    onMouseLeave={e => !isSelected && (e.currentTarget.style.backgroundColor = 'transparent')}
                                                                >
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                                                        <span style={{
                                                                            backgroundColor: isSelected ? '#dbeafe' : '#f1f5f9',
                                                                            color: isSelected ? '#1e40af' : '#0f172a',
                                                                            padding: '0.15rem 0.5rem',
                                                                            borderRadius: '4px',
                                                                            fontSize: '0.78rem',
                                                                            fontWeight: '800'
                                                                        }}>
                                                                            Cód. {item.code}
                                                                        </span>
                                                                        <div>
                                                                            <div style={{ fontSize: '0.86rem', fontWeight: '700', color: 'var(--text-main)' }}>
                                                                                {item.agent}
                                                                            </div>
                                                                            {item.notes && (
                                                                                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                                                                                    {item.notes}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </div>

                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                                        <span style={{
                                                                            fontSize: '0.78rem',
                                                                            fontWeight: '700',
                                                                            backgroundColor: isSelected ? '#bfdbfe' : '#f1f5f9',
                                                                            color: isSelected ? '#1e3a8a' : 'var(--text-muted)',
                                                                            padding: '0.12rem 0.45rem',
                                                                            borderRadius: '999px'
                                                                        }}>
                                                                            {count}
                                                                        </span>
                                                                        {isSelected && <Check size={15} color="#2563eb" />}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                        {/* Selector de Ordenamiento */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <select
                                value={`${sortConfig.key || ''}_${sortConfig.direction || ''}`}
                                onChange={e => {
                                    const val = e.target.value;
                                    if (!val) {
                                        setSortConfig({ key: null, direction: 'asc' });
                                    } else {
                                        const [key, direction] = val.split('_');
                                        setSortConfig({ key, direction });
                                    }
                                }}
                                style={{
                                    padding: '0.5rem 0.85rem',
                                    borderRadius: 'var(--radius-md)',
                                    border: sortConfig.key === 'createdAt' ? '1.5px solid #2563eb' : '1.5px solid var(--border)',
                                    fontSize: '0.85rem',
                                    fontWeight: '600',
                                    backgroundColor: sortConfig.key === 'createdAt' ? '#eff6ff' : '#ffffff',
                                    color: sortConfig.key === 'createdAt' ? '#1d4ed8' : 'var(--text-main)',
                                    cursor: 'pointer',
                                    minHeight: '42px',
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                                }}
                                title="Ordenar listado de pólizas"
                            >
                                <option value="">↕️ Ordenar Pólizas...</option>
                                <option value="createdAt_desc">🕒 Creada en sistema (Más recientes)</option>
                                <option value="createdAt_asc">🕒 Creada en sistema (Más antiguas)</option>
                                <option value="endDate_asc">📅 Próxima Renovación (Más próximas)</option>
                                <option value="endDate_desc">📅 Próxima Renovación (Más lejanas)</option>
                                <option value="startDate_desc">📅 Inicio Cobertura (Más reciente)</option>
                                <option value="startDate_asc">📅 Inicio Cobertura (Más antigua)</option>
                                <option value="amount_desc">💲 Prima Anual (Mayor a menor)</option>
                                <option value="amount_asc">💲 Prima Anual (Menor a mayor)</option>
                                <option value="client_asc">👤 Cliente (A → Z)</option>
                                <option value="client_desc">👤 Cliente (Z → A)</option>
                                <option value="id_asc">🔢 Número de Póliza (Ascendente)</option>
                                <option value="id_desc">🔢 Número de Póliza (Descendente)</option>
                            </select>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                        <button className="btn btn-primary" onClick={() => setShowCreatePolicyModal(true)}>
                            <Plus size={18} /> Nueva Póliza
                        </button>
                    </div>
                </div>

                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid var(--border)' }}>
                                <th
                                    onClick={() => handleSort('id')}
                                    style={{ padding: '1rem', textAlign: 'left', color: sortConfig.key === 'id' ? '#2563eb' : 'var(--text-muted)', cursor: 'pointer', userSelect: 'none' }}
                                    title="Hacer clic para ordenar por Número de Póliza"
                                >
                                    <div style={{ display: 'flex', alignItems: 'center' }}>
                                        <span>Póliza #</span>
                                        {renderSortIcon('id')}
                                    </div>
                                </th>
                                <th
                                    onClick={() => handleSort('client')}
                                    style={{ padding: '1rem', textAlign: 'left', color: sortConfig.key === 'client' ? '#2563eb' : 'var(--text-muted)', cursor: 'pointer', userSelect: 'none' }}
                                    title="Hacer clic para ordenar por Cliente"
                                >
                                    <div style={{ display: 'flex', alignItems: 'center' }}>
                                        <span>Cliente</span>
                                        {renderSortIcon('client')}
                                    </div>
                                </th>
                                <th
                                    onClick={() => handleSort('insurer')}
                                    style={{ padding: '1rem', textAlign: 'left', color: sortConfig.key === 'insurer' ? '#2563eb' : 'var(--text-muted)', cursor: 'pointer', userSelect: 'none' }}
                                    title="Hacer clic para ordenar por Aseguradora / Ramo"
                                >
                                    <div style={{ display: 'flex', alignItems: 'center' }}>
                                        <span>Ramo / Aseguradora</span>
                                        {renderSortIcon('insurer')}
                                    </div>
                                </th>
                                <th
                                    onClick={() => handleSort('endDate')}
                                    style={{ padding: '1rem', textAlign: 'left', color: sortConfig.key === 'endDate' || sortConfig.key === 'createdAt' ? '#2563eb' : 'var(--text-muted)', cursor: 'pointer', userSelect: 'none' }}
                                    title="Hacer clic para ordenar por Fecha de Renovación"
                                >
                                    <div style={{ display: 'flex', alignItems: 'center' }}>
                                        <span>Fechas / Vigencia</span>
                                        {renderSortIcon('endDate')}
                                    </div>
                                </th>
                                <th
                                    onClick={() => handleSort('status')}
                                    style={{ padding: '1rem', textAlign: 'left', color: sortConfig.key === 'status' ? '#2563eb' : 'var(--text-muted)', cursor: 'pointer', userSelect: 'none' }}
                                    title="Hacer clic para ordenar por Estado"
                                >
                                    <div style={{ display: 'flex', alignItems: 'center' }}>
                                        <span>Estado</span>
                                        {renderSortIcon('status')}
                                    </div>
                                </th>
                                <th
                                    onClick={() => handleSort('amount')}
                                    style={{ padding: '1rem', textAlign: 'right', color: sortConfig.key === 'amount' ? '#2563eb' : 'var(--text-muted)', cursor: 'pointer', userSelect: 'none' }}
                                    title="Hacer clic para ordenar por Prima Anual"
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                                        <span>Prima</span>
                                        {renderSortIcon('amount')}
                                    </div>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedPolicies.length === 0 ? (
                                <tr>
                                    <td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                        {statusTab === 'CANCELLED' 
                                            ? 'No hay pólizas canceladas actualmente.' 
                                            : statusTab === 'PENDING'
                                            ? 'No hay pólizas con pago pendiente.'
                                            : `No se encontraron pólizas que coincidan con "${searchTerm}".`}
                                    </td>
                                </tr>
                            ) : (
                                sortedPolicies.map((policy) => {
                                const computedStatus = calculatePolicyStatus(policy, payments);
                                const statusConfirm = getStatusColor(computedStatus, policy);
                                const StatusIcon = statusConfirm.icon;
                                const itemClaims = getPolicyClaims(policy, claims);
                                const itemOpenClaims = itemClaims.filter(isOpenClaim);

                                return (
                                    <tr
                                        key={policy.id}
                                        style={{ 
                                            borderBottom: '1px solid var(--border)', 
                                            cursor: 'pointer', 
                                            transition: 'background-color 0.1s',
                                            backgroundColor: itemOpenClaims.length > 0 ? '#fffafa' : 'transparent'
                                        }}
                                        onClick={() => setSelectedPolicy(policy)}
                                        className="hover-row"
                                    >
                                        <td style={{ padding: '1rem' }}>
                                            <div style={{ fontWeight: 'bold', color: 'var(--text-main)' }}>{policy.id}</div>
                                            {itemOpenClaims.length > 0 && (
                                                <div style={{ marginTop: '0.3rem' }}>
                                                    <span 
                                                        style={{
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: '0.25rem',
                                                            padding: '0.15rem 0.5rem',
                                                            borderRadius: '999px',
                                                            backgroundColor: '#fee2e2',
                                                            color: '#dc2626',
                                                            border: '1px solid #fca5a5',
                                                            fontSize: '0.72rem',
                                                            fontWeight: '800',
                                                            boxShadow: '0 1px 2px rgba(220, 38, 38, 0.1)'
                                                        }}
                                                        title={`Esta póliza tiene ${itemOpenClaims.length} siniestro(s) en trámite: ${itemOpenClaims.map(c => `${c.id} (${c.type})`).join(', ')}`}
                                                    >
                                                        <ShieldAlert size={12} /> Siniestro Abierto ({itemOpenClaims.length})
                                                    </span>
                                                </div>
                                            )}
                                        </td>
                                        <td style={{ padding: '1rem' }}>
                                            <div style={{ fontWeight: '600', color: 'var(--primary)', fontSize: '0.98rem' }}>{policy.client}</div>
                                            <div style={{ marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
                                                <span style={{
                                                    fontSize: '0.72rem',
                                                    padding: '0.12rem 0.5rem',
                                                    borderRadius: '999px',
                                                    fontWeight: '700',
                                                    backgroundColor: (policy.cartera || '').toLowerCase().includes('raquel') ? '#fdf4ff' : '#eff6ff',
                                                    color: (policy.cartera || '').toLowerCase().includes('raquel') ? '#86198f' : '#1e40af',
                                                    border: (policy.cartera || '').toLowerCase().includes('raquel') ? '1px solid #f0abfc' : '1px solid #bfdbfe',
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '0.25rem'
                                                }}>
                                                    <Briefcase size={11} />
                                                    {(policy.cartera || '').toLowerCase().includes('raquel') ? 'Raquel Rodríguez' : 'Santiago Morales & Asoc.'}
                                                    {policy.agentCode ? ` · ${policy.agentCode}` : ''}
                                                </span>
                                            </div>
                                        </td>
                                        <td style={{ padding: '1rem' }}>
                                            <div style={{ fontWeight: '500' }}>{policy.type}</div>
                                            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.2rem' }}>
                                                <InsurerLogo name={policy.insurer} size={18} />
                                                <span>{policy.insurer}</span>
                                            </div>
                                        </td>
                                        <td style={{ padding: '1rem' }}>
                                            <div style={{ fontWeight: '600', color: 'var(--text-main)' }}>
                                                Vence: {formatDateToDDMMYYYY(policy.endDate || policy.renewal || 'N/A')}
                                            </div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                Inicio: {formatDateToDDMMYYYY(policy.startDate)}
                                            </div>
                                            {policy.createdAt && (
                                                <div style={{ fontSize: '0.72rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.15rem' }}>
                                                    <Clock size={11} /> Creada: {formatDateToDDMMYYYY(policy.createdAt)}
                                                </div>
                                            )}
                                        </td>
                                        <td style={{ padding: '1rem' }}>
                                            <span style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '0.25rem',
                                                padding: '0.25rem 0.75rem',
                                                borderRadius: '999px',
                                                fontSize: '0.85rem',
                                                fontWeight: '600',
                                                backgroundColor: statusConfirm.bg,
                                                color: statusConfirm.text
                                            }}>
                                                <StatusIcon size={14} />
                                                {statusConfirm.label}
                                            </span>
                                        </td>
                                        <td style={{ padding: '1rem', textAlign: 'right' }}>
                                            <div style={{ fontWeight: '700', color: 'var(--text-main)' }}>{formatMoney(policy.amount, policy.currency)}</div>
                                            <span style={{ fontSize: '0.72rem', color: '#0369a1', fontWeight: '700', display: 'inline-block', backgroundColor: '#f0f9ff', border: '1px solid #bae6fd', padding: '0.1rem 0.45rem', borderRadius: '4px', marginTop: '0.2rem' }}>
                                                Com: {policy.commissionRate !== undefined && policy.commissionRate !== null ? policy.commissionRate : 15}%
                                            </span>
                                        </td>
                                    </tr>
                                );
                            }))}
                        </tbody>
                    </table>
                    <style>{`
            .hover-row:hover {
                background-color: #f1f5f9 !important;
            }
          `}</style>
                </div>
            </div>
            {/* Create Policy Modal */}
            {showCreatePolicyModal && (
                <div style={{
                    position: 'fixed',
                    top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000
                }}>
                    <div className="card" style={{ width: '100%', maxWidth: '700px', backgroundColor: 'white', maxHeight: '90vh', overflowY: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', position: 'sticky', top: 0, background: 'white', zIndex: 10, paddingBottom: '10px' }}>
                            <h3 style={{ margin: 0, fontWeight: '700', color: 'var(--primary)' }}>Emitir Nueva Póliza</h3>
                            <button onClick={() => setShowCreatePolicyModal(false)} style={{ background: 'none', border: 'none', padding: '0.5rem', cursor: 'pointer', display: 'flex', alignItems: 'center', color: 'var(--text-muted)' }}>
                                <XCircle size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleCreatePolicy}>
                            {/* SECCIÓN 1: DATOS DE LA PÓLIZA */}
                            <div style={{
                                border: '1px solid var(--border)',
                                borderRadius: 'var(--radius-md)',
                                padding: '1.25rem',
                                backgroundColor: '#f8fafc',
                                marginBottom: '1.5rem'
                            }}>
                                <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.95rem', color: 'var(--primary)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <FileText size={18} /> 1. Datos del Contrato de Póliza
                                </h4>
                                
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                                    <div>
                                        <label style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.4rem' }}>Número de Póliza *</label>
                                        <input
                                            required
                                            type="text"
                                            placeholder="Ej. 1-2-500-0319503 o POL-100293"
                                            value={newPolicy.id}
                                            onChange={e => setNewPolicy({ ...newPolicy, id: e.target.value })}
                                            onBlur={e => setNewPolicy({ ...newPolicy, id: formatPolicyNumberLaColonial(e.target.value, newPolicy.insurer) })}
                                            style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.4rem' }}>Tipo de Seguro *</label>
                                        <select
                                            style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}
                                            value={newPolicy.type}
                                            onChange={e => setNewPolicy({ ...newPolicy, type: e.target.value })}
                                        >
                                            <option value="Auto">Auto</option>
                                            <option value="Vida">Vida</option>
                                            <option value="Salud">Salud</option>
                                            <option value="Propiedad">Propiedad</option>
                                            <option value="Incendio">Incendio</option>
                                        </select>
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                                    <div>
                                        <label style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.4rem' }}>Aseguradora *</label>
                                        <InsurerSelect
                                            companies={companies}
                                            value={newPolicy.insurer}
                                            onChange={e => {
                                                const insurerVal = e.target.value;
                                                const autoCode = getAutoAgentCode(newPolicy.cartera, insurerVal);
                                                setNewPolicy({ 
                                                    ...newPolicy, 
                                                    insurer: insurerVal,
                                                    agentCode: autoCode || newPolicy.agentCode
                                                });
                                            }}
                                            placeholder="Seleccionar Aseguradora..."
                                        />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.4rem' }}>Cartera de Agente *</label>
                                        <select
                                            style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontWeight: '600' }}
                                            value={newPolicy.cartera}
                                            onChange={e => {
                                                const carteraVal = e.target.value;
                                                const autoCode = getAutoAgentCode(carteraVal, newPolicy.insurer);
                                                setNewPolicy({ 
                                                    ...newPolicy, 
                                                    cartera: carteraVal,
                                                    agentCode: autoCode || newPolicy.agentCode
                                                });
                                            }}
                                        >
                                            <option value="Santiago Morales y Asociados, S.R.L.">💼 Santiago Morales y Asociados, S.R.L.</option>
                                            <option value="Raquel Rodríguez">💼 Raquel Rodríguez</option>
                                        </select>
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                                    <div>
                                        <label style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.4rem' }}>Código en Compañía (Agente)</label>
                                        <input
                                            type="text"
                                            placeholder="Ej. 76713, 8055, 897"
                                            value={newPolicy.agentCode}
                                            onChange={e => setNewPolicy({ ...newPolicy, agentCode: e.target.value })}
                                            style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.4rem' }}>Fecha de Inicio *</label>
                                        <input
                                            required
                                            type="date"
                                            value={newPolicy.startDate}
                                            onChange={e => setNewPolicy({ ...newPolicy, startDate: e.target.value })}
                                            style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}
                                        />
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                                    <div>
                                        <label style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.4rem' }}>Frecuencia de Renovación *</label>
                                        <select
                                            style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}
                                            value={newPolicy.renewalFrequency}
                                            onChange={e => setNewPolicy({ ...newPolicy, renewalFrequency: e.target.value })}
                                        >
                                            <option value="Mensual">Mensual</option>
                                            <option value="Trimestral">Trimestral</option>
                                            <option value="Semestral">Semestral</option>
                                            <option value="Anual">Anual</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.4rem' }}>Moneda *</label>
                                        <select
                                            style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}
                                            value={newPolicy.currency}
                                            onChange={e => setNewPolicy({ ...newPolicy, currency: e.target.value })}
                                        >
                                            <option value="DOP">RD$ (Pesos Dominicanos)</option>
                                            <option value="USD">USD (Dólares)</option>
                                        </select>
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                                    <div>
                                        <label style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.4rem' }}>Moneda</label>
                                        <div style={{ padding: '0.5rem', backgroundColor: '#e2e8f0', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', textAlign: 'center', fontWeight: '700', color: 'var(--text-main)', fontSize: '0.95rem' }}>
                                            {newPolicy.currency === 'USD' ? 'USD $' : 'RD$ DOP'}
                                        </div>
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.4rem' }}>Monto Asegurado *</label>
                                        <input
                                            required
                                            type="text"
                                            placeholder={newPolicy.currency === 'USD' ? 'Ej. 50,000.00' : 'Ej. 1,500,000.00'}
                                            value={newPolicy.insuredAmount}
                                            onChange={e => setNewPolicy({ ...newPolicy, insuredAmount: e.target.value })}
                                            style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.4rem' }}>Prima *</label>
                                        <input
                                            required
                                            type="text"
                                            placeholder={newPolicy.currency === 'USD' ? 'Ej. 1,200.00' : 'Ej. 25,000.00'}
                                            value={newPolicy.amount}
                                            onChange={e => setNewPolicy({ ...newPolicy, amount: e.target.value })}
                                            style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontWeight: '700' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#0369a1', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.4rem' }}>% Comisión *</label>
                                        <div style={{ position: 'relative' }}>
                                            <input
                                                required
                                                type="number"
                                                step="0.1"
                                                min="0"
                                                max="100"
                                                placeholder="15.0"
                                                value={newPolicy.commissionRate}
                                                onChange={e => setNewPolicy({ ...newPolicy, commissionRate: e.target.value })}
                                                style={{ width: '100%', padding: '0.5rem 1.6rem 0.5rem 0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid #93c5fd', fontWeight: '700', color: '#0369a1' }}
                                            />
                                            <span style={{ position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)', fontWeight: '700', color: '#64748b', fontSize: '0.85rem' }}>%</span>
                                        </div>
                                    </div>
                                </div>
                                <div style={{ marginBottom: '0.75rem', fontSize: '0.78rem', color: '#166534', fontWeight: '700', textAlign: 'right' }}>
                                    Comisión Estimada: {formatMoney((parseFloat(String(newPolicy.amount || '0').replace(/[^0-9.]/g, '')) || 0) * ((parseFloat(newPolicy.commissionRate) || 0) / 100), newPolicy.currency || 'DOP')}
                                </div>

                                <div style={{ marginBottom: '0.5rem' }}>
                                    <label style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.4rem' }}>Detalles de Cobertura *</label>
                                    <textarea
                                        required
                                        rows="2"
                                        placeholder="Descripción breve de la cobertura (Full, Deducibles, Límites, etc.)..."
                                        value={newPolicy.details}
                                        onChange={e => setNewPolicy({ ...newPolicy, details: e.target.value })}
                                        style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', resize: 'vertical' }}
                                    />
                                </div>
                            </div>

                            {/* SECCIÓN 2: DATOS DEL CLIENTE */}
                            <div style={{
                                border: '1px solid var(--border)',
                                borderRadius: 'var(--radius-md)',
                                padding: '1.25rem',
                                backgroundColor: 'white',
                                marginBottom: '1.5rem'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
                                    <h4 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--primary)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <User size={18} /> 2. Asociar Cliente
                                    </h4>
                                    <button
                                        type="button"
                                        onClick={() => setIsCreatingClient(!isCreatingClient)}
                                        className="btn"
                                        style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem', height: 'auto', textDecoration: 'underline', color: 'var(--primary)', border: '1px solid var(--border)', backgroundColor: '#f8fafc' }}
                                    >
                                        {isCreatingClient ? 'Buscar Existente' : 'Crear Nuevo Cliente'}
                                    </button>
                                </div>

                                {isCreatingClient ? (
                                    <div style={{ display: 'grid', gap: '0.75rem', padding: '0.5rem 0', borderRadius: 'var(--radius-sm)' }}>
                                        <div>
                                            <label style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.4rem' }}>Nombre Completo / Razón Social *</label>
                                            <input
                                                required={isCreatingClient}
                                                type="text"
                                                placeholder="Ej. Juan Pérez"
                                                value={newClientData.name}
                                                onChange={e => setNewClientData({ ...newClientData, name: e.target.value })}
                                                style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}
                                            />
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                            <div>
                                                <label style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.4rem' }}>Tipo de Persona *</label>
                                                <select
                                                    required={isCreatingClient}
                                                    style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}
                                                    value={newClientData.personType}
                                                    onChange={e => setNewClientData({ ...newClientData, personType: e.target.value, documentId: '' })}
                                                >
                                                    <option value="">Seleccionar...</option>
                                                    <option value="Física">Física</option>
                                                    <option value="Jurídica">Jurídica</option>
                                                </select>
                                            </div>
                                            <div>
                                                {newClientData.personType ? (
                                                    <>
                                                        <label style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.4rem' }}>
                                                            {newClientData.personType === 'Jurídica' ? 'RNC *' : 'Cédula *'}
                                                        </label>
                                                        <input
                                                            required={isCreatingClient}
                                                            type="text"
                                                            placeholder={newClientData.personType === 'Jurídica' ? 'Ej. 1-31-45678-9' : 'Ej. 001-1234567-8'}
                                                            value={newClientData.documentId}
                                                            onChange={e => setNewClientData({ ...newClientData, documentId: e.target.value })}
                                                            style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}
                                                        />
                                                    </>
                                                ) : (
                                                    <div style={{ display: 'flex', alignItems: 'center', height: '100%', paddingTop: '1.25rem', color: 'var(--text-muted)', fontSize: '0.8rem', fontStyle: 'italic' }}>
                                                        Selecciona tipo de persona...
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                            <div>
                                                <label style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.4rem' }}>Teléfono *</label>
                                                <input
                                                    required={isCreatingClient}
                                                    type="tel"
                                                    placeholder="809-555-5555"
                                                    value={newClientData.phone}
                                                    onChange={e => setNewClientData({ ...newClientData, phone: e.target.value })}
                                                    style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}
                                                />
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.4rem' }}>Email (Opcional)</label>
                                                <input
                                                    type="email"
                                                    placeholder="ejemplo@correo.com"
                                                    value={newClientData.email}
                                                    onChange={e => setNewClientData({ ...newClientData, email: e.target.value })}
                                                    style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}
                                                />
                                            </div>
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                            <div>
                                                <label style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.4rem' }}>Ciudad *</label>
                                                <select
                                                    required={isCreatingClient}
                                                    style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}
                                                    value={newClientData.city}
                                                    onChange={e => setNewClientData({ ...newClientData, city: e.target.value, sector: '' })}
                                                >
                                                    <option value="">Seleccionar...</option>
                                                    {Object.keys(DR_LOCATIONS).sort().map(city => (
                                                        <option key={city} value={city}>{city}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.4rem' }}>Sector *</label>
                                                <select
                                                    required={isCreatingClient}
                                                    style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}
                                                    value={newClientData.sector}
                                                    onChange={e => setNewClientData({ ...newClientData, sector: e.target.value })}
                                                    disabled={!newClientData.city}
                                                >
                                                    <option value="">Seleccionar...</option>
                                                    {newClientData.city && getSectors(newClientData.city).map(sector => (
                                                        <option key={sector} value={sector}>{sector}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.4rem' }}>Cód. Aseguradora (Opcional)</label>
                                            <input
                                                type="text"
                                                placeholder="Ej. C-10293"
                                                value={newClientData.insurerCode}
                                                onChange={e => setNewClientData({ ...newClientData, insurerCode: e.target.value })}
                                                style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <div ref={clientDropdownRef} style={{ position: 'relative', width: '100%', padding: '0.5rem 0' }}>
                                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                            <input
                                                type="text"
                                                required={!isCreatingClient}
                                                placeholder="Buscar y seleccionar cliente..."
                                                value={clientSearch}
                                                onChange={e => {
                                                    setClientSearch(e.target.value);
                                                    setNewPolicy({ ...newPolicy, client: '' }); // Reset selected client if typing
                                                    setShowClientDropdown(true);
                                                }}
                                                onFocus={() => setShowClientDropdown(true)}
                                                style={{ width: '100%', paddingRight: '40px', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}
                                            />
                                            {newPolicy.client ? (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setClientSearch('');
                                                        setNewPolicy({ ...newPolicy, client: '' });
                                                    }}
                                                    style={{
                                                        position: 'absolute',
                                                        right: '10px',
                                                        background: 'none',
                                                        border: 'none',
                                                        cursor: 'pointer',
                                                        color: 'var(--text-muted)',
                                                        padding: '0.25rem',
                                                        display: 'flex',
                                                        alignItems: 'center'
                                                    }}
                                                >
                                                    <XCircle size={16} />
                                                </button>
                                            ) : (
                                                <div style={{ position: 'absolute', right: '12px', color: 'var(--text-muted)', pointerEvents: 'none', display: 'flex', alignItems: 'center' }}>
                                                    <Search size={16} />
                                                </div>
                                            )}
                                        </div>

                                        {showClientDropdown && (
                                            <div style={{
                                                position: 'absolute',
                                                top: '100%',
                                                left: 0,
                                                right: 0,
                                                backgroundColor: 'white',
                                                border: '1px solid var(--border)',
                                                borderRadius: 'var(--radius-sm)',
                                                marginTop: '4px',
                                                maxHeight: '180px',
                                                overflowY: 'auto',
                                                zIndex: 1001,
                                                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)'
                                            }}>
                                                {filteredDropdownClients.length > 0 ? (
                                                    filteredDropdownClients.map(client => (
                                                        <div
                                                            key={client.id}
                                                            onClick={() => {
                                                                setNewPolicy({ ...newPolicy, client: client.name });
                                                                setClientSearch(client.name);
                                                                setShowClientDropdown(false);
                                                            }}
                                                            style={{
                                                                padding: '0.6rem 1rem',
                                                                cursor: 'pointer',
                                                                transition: 'background-color 0.15s',
                                                                borderBottom: '1px solid #f1f5f9',
                                                                display: 'flex',
                                                                justifyContent: 'space-between',
                                                                alignItems: 'center'
                                                            }}
                                                            className="dropdown-item-hover"
                                                        >
                                                            <div>
                                                                <div style={{ fontWeight: '500', color: 'var(--text-main)', fontSize: '0.9rem' }}>{client.name}</div>
                                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                                    {client.personType} {client.insurerCode ? `• ${client.insurerCode}` : ''}
                                                                </div>
                                                            </div>
                                                            {client.city && (
                                                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                                                                    {client.city}
                                                                </span>
                                                            )}
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                                        No se encontraron clientes.
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
                                <button type="button" className="btn" onClick={() => setShowCreatePolicyModal(false)} style={{ backgroundColor: '#f1f5f9' }} disabled={isCreating}>
                                    Cancelar
                                </button>
                                <button type="submit" className="btn btn-primary" disabled={isCreating}>
                                    {isCreating ? (
                                        <>
                                            <Loader2 className="animate-spin" size={18} style={{ marginRight: '8px' }} />
                                            {isCreatingClient ? 'Creando cliente y póliza...' : 'Creando póliza...'}
                                        </>
                                    ) : (
                                        'Crear Póliza'
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal de Edición Completa de Póliza */}
            {renderEditPolicyModalContent()}

            {/* Modal de Confirmación de Eliminación de Póliza */}
            {renderDeleteConfirmModal()}

            {/* Modal de Vista e Impresión del Recibo Oficial de Pago */}
            <ReceiptModal
                isOpen={showReceiptModal}
                onClose={() => {
                    setShowReceiptModal(false);
                    setSelectedReceiptPayment(null);
                }}
                payment={selectedReceiptPayment}
                policy={selectedPolicy || (selectedReceiptPayment ? policies.find(p => p.id === selectedReceiptPayment.policyId || selectedReceiptPayment.policy?.includes(p.id)) : null)}
                client={clients.find(c => c.name === selectedPolicy?.client || c.id === selectedPolicy?.clienteId)}
            />

            {/* Modal Visor de Documentos y Comprobantes de Pagos */}
            <DocumentViewerModal
                isOpen={showDocViewer}
                onClose={() => {
                    setShowDocViewer(false);
                    setSelectedViewingDocs(null);
                }}
                documents={selectedViewingDocs}
                entityInfo={selectedPolicy ? {
                    entityName: selectedPolicy.client,
                    reference: `Póliza ${selectedPolicy.id} - ${selectedPolicy.insurer}`,
                    entityType: 'policy'
                } : null}
            />

            {/* Modal de Edición de Pagos (Solo para Santiago / Administrador) */}
            {showEditPaymentModal && editingPayment && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(15, 23, 42, 0.75)',
                    backdropFilter: 'blur(4px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1200,
                    padding: '1.25rem'
                }}>
                    <div style={{
                        backgroundColor: '#ffffff',
                        width: '100%',
                        maxWidth: '650px',
                        maxHeight: '90vh',
                        borderRadius: 'var(--radius-lg)',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden'
                    }}>
                        {/* Header */}
                        <div style={{
                            padding: '1.2rem 1.5rem',
                            borderBottom: '1px solid var(--border)',
                            backgroundColor: '#f8fafc',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                                <div style={{
                                    width: '38px',
                                    height: '38px',
                                    borderRadius: 'var(--radius-md)',
                                    backgroundColor: '#eff6ff',
                                    color: '#2563eb',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    <Edit size={20} />
                                </div>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--primary)', fontWeight: '700' }}>
                                        Editar Pago ({editingPayment.id})
                                    </h3>
                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                        Póliza {selectedPolicy?.id || editingPayment.policyId} • {selectedPolicy?.client || editingPayment.client}
                                    </span>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    setShowEditPaymentModal(false);
                                    setEditingPayment(null);
                                }}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.4rem', color: 'var(--text-muted)' }}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Formulario */}
                        <form onSubmit={handleSaveEditedPayment} style={{ padding: '1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <label style={{ fontSize: '0.82rem', fontWeight: '700', color: 'var(--text-main)', display: 'block', marginBottom: '0.35rem' }}>
                                        Monto Pagado (RD$) *
                                    </label>
                                    <input
                                        type="number"
                                        step="any"
                                        required
                                        value={editPaymentForm.amount}
                                        onChange={e => setEditPaymentForm({ ...editPaymentForm, amount: e.target.value })}
                                        style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontWeight: '700', fontSize: '0.95rem' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.82rem', fontWeight: '700', color: 'var(--text-main)', display: 'block', marginBottom: '0.35rem' }}>
                                        Fecha de Pago *
                                    </label>
                                    <input
                                        type="date"
                                        required
                                        value={editPaymentForm.date}
                                        onChange={e => setEditPaymentForm({ ...editPaymentForm, date: e.target.value })}
                                        style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: '0.9rem' }}
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <label style={{ fontSize: '0.82rem', fontWeight: '700', color: 'var(--text-main)', display: 'block', marginBottom: '0.35rem' }}>
                                        Método de Pago *
                                    </label>
                                    <select
                                        value={editPaymentForm.paymentMethod}
                                        onChange={e => setEditPaymentForm({ ...editPaymentForm, paymentMethod: e.target.value })}
                                        style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: '0.9rem' }}
                                    >
                                        <option value="Efectivo">Efectivo</option>
                                        <option value="Transferencia Bancaria">Transferencia Bancaria</option>
                                        <option value="Tarjeta de Crédito">Tarjeta de Crédito</option>
                                        <option value="Cheque">Cheque</option>
                                        <option value="Cobro Automático / Domiciliación">Cobro Automático / Domiciliación</option>
                                    </select>
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.82rem', fontWeight: '700', color: 'var(--text-main)', display: 'block', marginBottom: '0.35rem' }}>
                                        Concepto / Tipo de Cobro *
                                    </label>
                                    <select
                                        value={editPaymentForm.type}
                                        onChange={e => setEditPaymentForm({ ...editPaymentForm, type: e.target.value })}
                                        style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: '0.9rem' }}
                                    >
                                        <option value="Cuota Mensual">Cuota Mensual</option>
                                        <option value="Renovación">Renovación</option>
                                        <option value="Anual">Anual</option>
                                        <option value="Semestral">Semestral</option>
                                        <option value="Inicial">Inicial</option>
                                        <option value="Otro">Otro...</option>
                                    </select>
                                </div>
                            </div>

                            {editPaymentForm.type === 'Otro' && (
                                <div>
                                    <label style={{ fontSize: '0.82rem', fontWeight: '700', color: 'var(--text-main)', display: 'block', marginBottom: '0.35rem' }}>
                                        Especificar Concepto Personalizado *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="Ej. Ajuste de prima, Endoso, etc."
                                        value={editPaymentForm.customType}
                                        onChange={e => setEditPaymentForm({ ...editPaymentForm, customType: e.target.value })}
                                        style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: '0.9rem' }}
                                    />
                                </div>
                            )}

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <label style={{ fontSize: '0.82rem', fontWeight: '700', color: 'var(--text-main)', display: 'block', marginBottom: '0.35rem' }}>
                                        Estado del Cobro
                                    </label>
                                    <select
                                        value={editPaymentForm.status}
                                        onChange={e => setEditPaymentForm({ ...editPaymentForm, status: e.target.value })}
                                        style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: '0.9rem' }}
                                    >
                                        <option value="Paid">Pagado / Aplicado</option>
                                        <option value="Pending">Pendiente</option>
                                        <option value="Cancelled">Anulado</option>
                                    </select>
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.82rem', fontWeight: '700', color: 'var(--text-main)', display: 'block', marginBottom: '0.35rem' }}>
                                        No. Referencia / Cheque / Aprobación
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Ej. TRANS-9821, CH-102"
                                        value={editPaymentForm.reference}
                                        onChange={e => setEditPaymentForm({ ...editPaymentForm, reference: e.target.value })}
                                        style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: '0.9rem' }}
                                    />
                                </div>
                            </div>

                            <div>
                                <label style={{ fontSize: '0.82rem', fontWeight: '700', color: 'var(--text-main)', display: 'block', marginBottom: '0.35rem' }}>
                                    Notas / Observaciones
                                </label>
                                <textarea
                                    rows={2}
                                    placeholder="Detalles sobre la transacción..."
                                    value={editPaymentForm.notes}
                                    onChange={e => setEditPaymentForm({ ...editPaymentForm, notes: e.target.value })}
                                    style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: '0.9rem', resize: 'vertical' }}
                                />
                            </div>

                            {/* Sección Documentos Adjuntos Opcionales */}
                            <div style={{ backgroundColor: '#f8fafc', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
                                    <label style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-main)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                        <Paperclip size={15} color="#2563eb" /> Documentos y Comprobantes Adjuntos ({editPaymentAttachedDocs.length})
                                    </label>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Múltiples archivos permitidos</span>
                                </div>

                                {editPaymentAttachedDocs.length > 0 && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '0.75rem' }}>
                                        {editPaymentAttachedDocs.map(doc => (
                                            <div
                                                key={doc.id}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                    padding: '0.45rem 0.75rem',
                                                    backgroundColor: '#ffffff',
                                                    border: '1px solid #cbd5e1',
                                                    borderRadius: 'var(--radius-sm)',
                                                    fontSize: '0.82rem'
                                                }}
                                            >
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', overflow: 'hidden' }}>
                                                    <Paperclip size={13} color="#0284c7" />
                                                    <span style={{ fontWeight: '600', color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '300px' }}>
                                                        {doc.name}
                                                    </span>
                                                    {doc.size && <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>({doc.size})</span>}
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    {doc.dataUri && (
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setSelectedViewingDocs([doc]);
                                                                setShowDocViewer(true);
                                                            }}
                                                            style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', fontWeight: '700', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
                                                        >
                                                            <Eye size={13} /> Ver
                                                        </button>
                                                    )}
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveEditPaymentDoc(doc.id)}
                                                        style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontWeight: '700', fontSize: '0.78rem' }}
                                                    >
                                                        ✕ Quitar
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <input
                                        type="file"
                                        multiple
                                        accept="image/*,.pdf"
                                        onChange={handleEditPaymentFileChange}
                                        style={{ width: '100%', padding: '0.45rem 0.65rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', backgroundColor: '#ffffff', fontSize: '0.82rem' }}
                                    />
                                </div>
                            </div>

                            {/* Botones de acción */}
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
                                <button
                                    type="button"
                                    className="btn"
                                    onClick={() => {
                                        setShowEditPaymentModal(false);
                                        setEditingPayment(null);
                                    }}
                                    disabled={isSavingPaymentEdit}
                                    style={{ border: '1px solid var(--border)', padding: '0.6rem 1.25rem' }}
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    disabled={isSavingPaymentEdit}
                                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.5rem', fontWeight: '700' }}
                                >
                                    {isSavingPaymentEdit ? (
                                        <>
                                            <Loader2 className="animate-spin" size={18} /> Guardando Cambios...
                                        </>
                                    ) : (
                                        <>
                                            <Save size={18} /> Guardar Cambios
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PolicyList;
