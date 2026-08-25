import React, { useState, useMemo } from 'react';
import {
    Search, Plus, Calendar, AlertTriangle, Clock, CheckCircle,
    XCircle, FileText, Paperclip, X, ChevronRight, Shield,
    Building2, Filter, ArrowUpRight, CheckCircle2, RotateCcw,
    FileCheck, FileEdit, Trash2, ShieldAlert, Briefcase, DollarSign,
    Layers, ArrowRightLeft, Send, Sparkles, Eye, User, Printer,
    Download, Copy, Check, ExternalLink, Mail, ArrowUpDown, ArrowUp, ArrowDown
} from 'lucide-react';
import { formatDateToDDMMYYYY, formatMoney } from '../utils/policyHelpers';
import InsurerLogo from './InsurerLogo';
import { useUser } from '../context/UserContext';
import {
    insertSolicitudHasura,
    updateSolicitudHasura,
    deleteSolicitudHasura,
    insertMovimientoHasura,
    updatePolicyHasura
} from '../services/hasuraService';
import {
    buildRequestLetterData,
    generateRequestLetterPdf,
    printRequestLetter,
    formatExtendedSpanishDate
} from '../services/requestLetterPdfService';

// ─── Status & Type Configurations ───────────────────────────────────────────

const STATUS_CONFIG = {
    Pendiente: { bg: '#fef3c7', text: '#92400e', border: '#fcd34d', label: 'Pendiente', icon: Clock },
    'En Trámite': { bg: '#e0f2fe', text: '#0369a1', border: '#7dd3fc', label: 'En Trámite con Aseguradora', icon: Send },
    Aprobada: { bg: '#dcfce7', text: '#166534', border: '#86efac', label: 'Aprobada / Aplicada', icon: CheckCircle },
    Rechazada: { bg: '#fee2e2', text: '#991b1b', border: '#fca5a5', label: 'Rechazada / Cancelada', icon: XCircle },
};

const TYPE_CONFIG = {
    'Emisión': {
        icon: Sparkles,
        color: '#2563eb',
        bg: '#eff6ff',
        border: '#bfdbfe',
        badgeText: 'Emisión Nueva',
        subtypes: [
            'Nueva Póliza',
            'Cotización / Propuesta',
            'Flota / Colectivo',
            'Renovación con Cambio de Compañía',
            'Otro'
        ]
    },
    'Cambio en Póliza': {
        icon: FileEdit,
        color: '#7c3aed',
        bg: '#f5f3ff',
        border: '#ddd6fe',
        badgeText: 'Cambio / Endoso',
        subtypes: [
            'Cambio de Vehículo / Unidad',
            'Aumento de Suma Asegurada',
            'Disminución de Suma Asegurada',
            'Inclusión de Cobertura / Deducible',
            'Inclusión / Exclusión de Dependientes',
            'Cambio de Beneficiario',
            'Cambio de Dirección / Ubicación',
            'Cambio de Forma de Pago',
            'Corrección de Datos',
            'Otro'
        ]
    },
    'Cancelación': {
        icon: Trash2,
        color: '#dc2626',
        bg: '#fef2f2',
        border: '#fca5a5',
        badgeText: 'Cancelación',
        subtypes: [
            'Venta del Bien Asegurado',
            'Solicitud Voluntaria del Cliente',
            'Sustitución por Otra Aseguradora',
            'Falta de Capacidad de Pago',
            'Siniestro Pérdida Total',
            'Duplicidad de Póliza',
            'No Renovación',
            'Otro'
        ]
    }
};

const PRIORITY_CONFIG = {
    Alta: { bg: '#fee2e2', text: '#dc2626', border: '#fca5a5', label: 'Alta' },
    Media: { bg: '#fef9c3', text: '#854d0e', border: '#fde047', label: 'Media' },
    Baja: { bg: '#f1f5f9', text: '#475569', border: '#cbd5e1', label: 'Baja' },
};

// ─── Component ───────────────────────────────────────────────────────────────

const RequestsManagement = ({
    requests = [],
    setRequests,
    policies = [],
    setPolicies,
    clients = [],
    companies = [],
    agentCodes = []
}) => {
    const { isDemo } = useUser();
    const today = new Date().toISOString().split('T')[0];
    const firstOfMonth = new Date();
    firstOfMonth.setDate(1);
    const defaultFrom = firstOfMonth.toISOString().split('T')[0];

    // Filter states
    const [searchTerm, setSearchTerm] = useState('');
    const [typeFilter, setTypeFilter] = useState('ALL'); // 'ALL', 'Emisión', 'Cambio en Póliza', 'Cancelación'
    const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL', 'Pendiente', 'En Trámite', 'Aprobada', 'Rechazada'
    const [carteraFilter, setCarteraFilter] = useState('ALL');
    const [dateFrom, setDateFrom] = useState(defaultFrom);
    const [dateTo, setDateTo] = useState(today);

    // Modals
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [showLetterModal, setShowLetterModal] = useState(false);
    const [letterData, setLetterData] = useState(null);
    const [letterTargetRequest, setLetterTargetRequest] = useState(null);
    const [copiedFeedback, setCopiedFeedback] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Form state for new request
    const [formType, setFormType] = useState('Emisión'); // 'Emisión', 'Cambio en Póliza', 'Cancelación'
    const [formData, setFormData] = useState({
        client: '',
        clienteId: null,
        policy: '',
        polizaId: null,
        policyDesc: '',
        insurer: companies[0]?.name || 'La Colonial de Seguros',
        cartera: 'Santiago Morales y Asociados, S.R.L.',
        ramo: 'Auto',
        subtype: 'Nueva Póliza',
        requestDate: today,
        effectiveDate: today,
        priority: 'Media',
        status: 'Pendiente',
        estimatedAmount: '',
        estimatedRefund: '',
        description: '',
        reason: '',
        insurerNotes: '',
        attachments: [],
    });

    // Autocomplete helpers
    const [policySearch, setPolicySearch] = useState('');
    const [showPolicyResults, setShowPolicyResults] = useState(false);
    const [clientSearch, setClientSearch] = useState('');
    const [showClientResults, setShowClientResults] = useState(false);

    // Detail modal actions state
    const [statusUpdate, setStatusUpdate] = useState('');
    const [endorsementNumberInput, setEndorsementNumberInput] = useState('');
    const [newPolicyIdInput, setNewPolicyIdInput] = useState('');
    const [insurerNotesInput, setInsurerNotesInput] = useState('');
    const [applyPolicyChange, setApplyPolicyChange] = useState(true);

    // Quick period presets
    const setQuickRange = (type) => {
        const d = new Date();
        if (type === 'month') {
            const f = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
            setDateFrom(f);
            setDateTo(today);
        } else if (type === 'prev') {
            const f = new Date(d.getFullYear(), d.getMonth() - 1, 1).toISOString().split('T')[0];
            const t = new Date(d.getFullYear(), d.getMonth(), 0).toISOString().split('T')[0];
            setDateFrom(f);
            setDateTo(t);
        } else if (type === 'year') {
            setDateFrom(`${d.getFullYear()}-01-01`);
            setDateTo(today);
        } else if (type === 'all') {
            setDateFrom('');
            setDateTo('');
        }
    };

    // Filter policies for autocomplete
    const filteredPoliciesForSearch = policies.filter(p =>
        (p.client?.toLowerCase() || '').includes(policySearch.toLowerCase()) ||
        (p.id?.toLowerCase() || '').includes(policySearch.toLowerCase()) ||
        (p.type?.toLowerCase() || '').includes(policySearch.toLowerCase()) ||
        (p.insurer?.toLowerCase() || '').includes(policySearch.toLowerCase())
    );

    // Filter clients for autocomplete
    const filteredClientsForSearch = clients.filter(c =>
        (c.name?.toLowerCase() || '').includes(clientSearch.toLowerCase()) ||
        (c.documentId?.toLowerCase() || '').includes(clientSearch.toLowerCase())
    );

    const handleSelectPolicy = (p) => {
        if (!p) {
            setFormData(prev => ({
                ...prev,
                polizaId: null,
                policy: '',
                policyDesc: '',
            }));
            setPolicySearch('');
            return;
        }

        const matchedClient = clients.find(c => String(c.id) === String(p.clienteId) || c.name === p.client);

        setFormData(prev => ({
            ...prev,
            polizaId: p.rawId || p.id,
            policy: p.id,
            policyDesc: `${p.type} · ${p.insurer}`,
            client: p.client || matchedClient?.name || '',
            clienteId: p.clienteId || matchedClient?.id || null,
            insurer: p.insurer || 'La Colonial de Seguros',
            cartera: p.cartera || 'Santiago Morales y Asociados, S.R.L.',
            ramo: p.type || 'General',
        }));
        setPolicySearch(`${p.client} — ${p.id} (${p.type} · ${p.insurer})`);
        setShowPolicyResults(false);
    };

    const handleSelectClient = (c) => {
        if (!c) {
            setFormData(prev => ({ ...prev, clienteId: null, client: '' }));
            setClientSearch('');
            return;
        }
        setFormData(prev => ({
            ...prev,
            clienteId: c.id,
            client: c.name,
            cartera: c.cartera || 'Santiago Morales y Asociados, S.R.L.'
        }));
        setClientSearch(`${c.name} (${c.personType || 'Física'} · ${c.documentId || ''})`);
        setShowClientResults(false);
    };

    const openCreateModalWithType = (type) => {
        setFormType(type);
        const defaultSubtype = TYPE_CONFIG[type]?.subtypes[0] || '';
        setFormData({
            client: '',
            clienteId: null,
            policy: '',
            polizaId: null,
            policyDesc: '',
            insurer: companies[0]?.name || 'La Colonial de Seguros',
            cartera: 'Santiago Morales y Asociados, S.R.L.',
            ramo: 'Auto',
            subtype: defaultSubtype,
            requestDate: today,
            effectiveDate: today,
            priority: 'Media',
            status: 'Pendiente',
            estimatedAmount: '',
            estimatedRefund: '',
            description: '',
            reason: '',
            insurerNotes: '',
            attachments: [],
        });
        setPolicySearch('');
        setClientSearch('');
        setShowCreateModal(true);
    };

    const handleFiles = (e) => {
        const names = Array.from(e.target.files).map(f => f.name);
        setFormData(prev => ({ ...prev, attachments: [...prev.attachments, ...names] }));
    };

    const handleCreateSubmit = async (e) => {
        e.preventDefault();
        setIsSaving(true);

        try {
            const nextNum = (requests.length + 1);
            const generatedId = `SOL-${new Date().getFullYear()}-${String(nextNum).padStart(4, '0')}`;
            const cleanAmount = parseFloat(String(formData.estimatedAmount).replace(/[^0-9.]/g, '')) || 0;
            const cleanRefund = parseFloat(String(formData.estimatedRefund).replace(/[^0-9.]/g, '')) || 0;

            const newRequestItem = {
                id: generatedId,
                type: formType,
                subtype: formData.subtype,
                clienteId: formData.clienteId,
                client: formData.client || (formType === 'Emisión' ? clientSearch : 'General'),
                polizaId: formData.polizaId,
                policy: formData.policy,
                policyDesc: formData.policyDesc,
                insurer: formData.insurer,
                cartera: formData.cartera,
                ramo: formData.ramo,
                requestDate: formData.requestDate || today,
                effectiveDate: formData.effectiveDate || today,
                status: 'Pendiente',
                priority: formData.priority || 'Media',
                estimatedAmount: cleanAmount ? formatMoney(cleanAmount) : '',
                estimatedAmountNum: cleanAmount,
                estimatedRefund: cleanRefund ? formatMoney(cleanRefund) : '',
                estimatedRefundNum: cleanRefund,
                description: formData.description,
                reason: formData.reason,
                insurerNotes: formData.insurerNotes,
                endorsementNumber: '',
                newPolicyId: '',
                attachments: formData.attachments || [],
                createdAt: new Date().toISOString()
            };

            if (!isDemo) {
                try {
                    const res = await insertSolicitudHasura(newRequestItem, isDemo);
                    if (res?.data?.insert_solicitudes_one?.id) {
                        newRequestItem.rawId = res.data.insert_solicitudes_one.id;
                    }
                } catch (err) {
                    console.warn('Error inserting solicitud in Hasura:', err);
                }
            }

            if (setRequests) {
                setRequests([newRequestItem, ...requests]);
            }

            setShowCreateModal(false);
            alert(`Solicitud ${generatedId} (${formType}) registrada con éxito.`);
        } catch (err) {
            console.error('Error creating solicitud:', err);
            alert('Error al registrar la solicitud: ' + (err.message || ''));
        } finally {
            setIsSaving(false);
        }
    };

    const handleOpenDetail = (req) => {
        setSelectedRequest(req);
        setStatusUpdate(req.status || 'Pendiente');
        setEndorsementNumberInput(req.endorsementNumber || '');
        setNewPolicyIdInput(req.newPolicyId || '');
        setInsurerNotesInput(req.insurerNotes || '');
        setApplyPolicyChange(true);
    };

    // ─── Open Carta Modal ───────────────────────────────────────────────────

    const handleOpenLetterModal = (req) => {
        const matchedClient = clients.find(c => String(c.id) === String(req.clienteId) || c.name === req.client) || {};
        const matchedPolicy = policies.find(p => String(p.id) === String(req.policy) || (p.rawId && String(p.rawId) === String(req.polizaId))) || {};
        const data = buildRequestLetterData(req, matchedClient, matchedPolicy, agentCodes);

        setLetterTargetRequest(req);
        setLetterData(data);
        setCopiedFeedback(false);
        setShowLetterModal(true);
    };

    const handlePrintLetter = () => {
        if (!letterTargetRequest) return;
        const matchedClient = clients.find(c => String(c.id) === String(letterTargetRequest.clienteId) || c.name === letterTargetRequest.client) || {};
        const matchedPolicy = policies.find(p => String(p.id) === String(letterTargetRequest.policy) || (p.rawId && String(p.rawId) === String(letterTargetRequest.polizaId))) || {};
        printRequestLetter(letterTargetRequest, matchedClient, matchedPolicy, agentCodes);
    };

    const handleDownloadPdf = async () => {
        if (!letterTargetRequest) return;
        const matchedClient = clients.find(c => String(c.id) === String(letterTargetRequest.clienteId) || c.name === letterTargetRequest.client) || {};
        const matchedPolicy = policies.find(p => String(p.id) === String(letterTargetRequest.policy) || (p.rawId && String(p.rawId) === String(letterTargetRequest.polizaId))) || {};
        await generateRequestLetterPdf(letterTargetRequest, matchedClient, matchedPolicy, agentCodes);
    };

    const handleCopyText = () => {
        if (!letterData) return;
        const fullText = `
${letterData.brokerName}
${letterData.brokerTitle}
${letterData.brokerRnc}
${letterData.brokerContact}

Santo Domingo, D.N., ${letterData.spanishDate}

Señores:
${letterData.insurer}
Atención: ${letterData.department}
Ciudad.

ASUNTO: ${letterData.subject}

${letterData.greeting}

${letterData.introParagraph}

DETALLES DE LA SOLICITUD:
${letterData.bodyParagraphs.join('\n\n')}

${letterData.closingParagraph}

${letterData.attachments.length > 0 ? `Documentos Anexos: ${letterData.attachments.join(', ')}` : ''}

Atentamente,

${letterData.brokerName}
Código de Asegurador: ${letterData.agentCode}
        `.trim();

        navigator.clipboard.writeText(fullText).then(() => {
            setCopiedFeedback(true);
            setTimeout(() => setCopiedFeedback(false), 2500);
        });
    };

    const handleUpdateStatusSubmit = async (e) => {
        e.preventDefault();
        if (!selectedRequest) return;

        setIsSaving(true);
        try {
            const updated = {
                ...selectedRequest,
                status: statusUpdate,
                endorsementNumber: endorsementNumberInput.trim(),
                newPolicyId: newPolicyIdInput.trim(),
                insurerNotes: insurerNotesInput.trim(),
            };

            if (!isDemo && selectedRequest.rawId) {
                await updateSolicitudHasura(selectedRequest.rawId, {
                    status: statusUpdate,
                    endorsementNumber: endorsementNumberInput.trim(),
                    newPolicyId: newPolicyIdInput.trim(),
                    insurerNotes: insurerNotesInput.trim(),
                }, isDemo);
            }

            // If Approved, apply side effects to policies / movements
            if (statusUpdate === 'Aprobada' && applyPolicyChange) {
                if (selectedRequest.type === 'Cancelación' && selectedRequest.polizaId && setPolicies) {
                    // Update policy status to Cancelled
                    setPolicies(prev => prev.map(p => {
                        if (String(p.id) === String(selectedRequest.policy) || (p.rawId && String(p.rawId) === String(selectedRequest.polizaId))) {
                            return { ...p, status: 'Cancelled' };
                        }
                        return p;
                    }));

                    if (!isDemo) {
                        try {
                            await updatePolicyHasura(selectedRequest.polizaId, { status: 'Cancelled' }, isDemo);
                            await insertMovimientoHasura({
                                polizaId: selectedRequest.polizaId,
                                date: today,
                                type: 'Cancelación de Póliza',
                                description: `Cancelación formal aprobada bajo solicitud ${selectedRequest.id}. Motivo: ${selectedRequest.reason || selectedRequest.subtype || 'A solicitud'}.`,
                                evidence: 'Solicitud Aprobada'
                            }, isDemo);
                        } catch (err) {
                            console.warn('Error auto-updating policy cancellation:', err);
                        }
                    }
                } else if (selectedRequest.type === 'Cambio en Póliza' && selectedRequest.polizaId) {
                    // Add movement to policy history
                    if (!isDemo) {
                        try {
                            await insertMovimientoHasura({
                                polizaId: selectedRequest.polizaId,
                                date: today,
                                type: `Endoso: ${selectedRequest.subtype || 'Modificación'}`,
                                description: `Endoso No. ${endorsementNumberInput || 'S/N'}. ${selectedRequest.description || 'Cambio en condiciones de póliza aplicado.'}`,
                                evidence: selectedRequest.id
                            }, isDemo);
                        } catch (err) {
                            console.warn('Error registering movement for endorsement:', err);
                        }
                    }
                }
            }

            if (setRequests) {
                setRequests(prev => prev.map(r => r.id === selectedRequest.id ? updated : r));
            }

            setSelectedRequest(null);
            alert(`Solicitud ${selectedRequest.id} actualizada a estado "${statusUpdate}".`);
        } catch (err) {
            console.error('Error updating solicitud:', err);
            alert('Error al actualizar la solicitud: ' + (err.message || ''));
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteRequest = async (req) => {
        if (!window.confirm(`¿Estás seguro de eliminar la solicitud ${req.id} de ${req.client}?`)) return;

        try {
            if (!isDemo && req.rawId) {
                await deleteSolicitudHasura(req.rawId, isDemo);
            }
            if (setRequests) {
                setRequests(prev => prev.filter(r => r.id !== req.id));
            }
            setSelectedRequest(null);
            alert(`Solicitud ${req.id} eliminada.`);
        } catch (err) {
            console.error('Error deleting solicitud:', err);
            alert('Error al eliminar solicitud: ' + (err.message || ''));
        }
    };

    // ─── Filtered Requests & Stats ──────────────────────────────────────────

    const dateFilteredRequests = useMemo(() => {
        return requests.filter(r => {
            if (dateFrom && r.requestDate < dateFrom) return false;
            if (dateTo && r.requestDate > dateTo) return false;
            return true;
        });
    }, [requests, dateFrom, dateTo]);

    const stats = useMemo(() => {
        const total = dateFilteredRequests.length;
        const emisiones = dateFilteredRequests.filter(r => r.type === 'Emisión').length;
        const cambios = dateFilteredRequests.filter(r => r.type === 'Cambio en Póliza').length;
        const cancelaciones = dateFilteredRequests.filter(r => r.type === 'Cancelación').length;
        const pendientes = dateFilteredRequests.filter(r => r.status === 'Pendiente').length;
        const enTramite = dateFilteredRequests.filter(r => r.status === 'En Trámite').length;
        const aprobadas = dateFilteredRequests.filter(r => r.status === 'Aprobada').length;

        return { total, emisiones, cambios, cancelaciones, pendientes, enTramite, aprobadas };
    }, [dateFilteredRequests]);

    const filteredRequests = useMemo(() => {
        return dateFilteredRequests.filter(r => {
            if (typeFilter !== 'ALL' && r.type !== typeFilter) return false;
            if (statusFilter !== 'ALL' && r.status !== statusFilter) return false;
            if (carteraFilter !== 'ALL' && r.cartera !== carteraFilter) return false;

            if (!searchTerm.trim()) return true;
            const term = searchTerm.toLowerCase();
            return (
                (r.id || '').toLowerCase().includes(term) ||
                (r.client || '').toLowerCase().includes(term) ||
                (r.policy || '').toLowerCase().includes(term) ||
                (r.type || '').toLowerCase().includes(term) ||
                (r.subtype || '').toLowerCase().includes(term) ||
                (r.insurer || '').toLowerCase().includes(term) ||
                (r.description || '').toLowerCase().includes(term) ||
                (r.reason || '').toLowerCase().includes(term) ||
                (r.endorsementNumber || '').toLowerCase().includes(term)
            );
        });
    }, [dateFilteredRequests, typeFilter, statusFilter, carteraFilter, searchTerm]);

    // Sorting state
    const [sortConfig, setSortConfig] = useState({ key: 'requestDate', direction: 'desc' });

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

    const sortedRequests = useMemo(() => {
        if (!sortConfig.key) return filteredRequests;
        return [...filteredRequests].sort((a, b) => {
            let valA = a[sortConfig.key];
            let valB = b[sortConfig.key];

            if (sortConfig.key === 'requestDate' || sortConfig.key === 'effectiveDate') {
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
    }, [filteredRequests, sortConfig]);

    return (
        <div>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h2 style={{ fontSize: '2rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.75rem', margin: 0 }}>
                        <FileCheck size={28} /> Solicitudes y Trámites
                    </h2>
                    <p style={{ color: 'var(--text-muted)', margin: '0.35rem 0 0 0' }}>
                        Control, generación de cartas formales y seguimiento operativo ante aseguradoras.
                    </p>
                </div>

                <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                    <button
                        className="btn"
                        onClick={() => openCreateModalWithType('Emisión')}
                        style={{ backgroundColor: '#eff6ff', color: '#1d4ed8', border: '1.5px solid #bfdbfe', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                    >
                        <Sparkles size={16} /> + Nueva Emisión
                    </button>
                    <button
                        className="btn"
                        onClick={() => openCreateModalWithType('Cambio en Póliza')}
                        style={{ backgroundColor: '#f5f3ff', color: '#6d28d9', border: '1.5px solid #ddd6fe', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                    >
                        <FileEdit size={16} /> + Cambio en Póliza
                    </button>
                    <button
                        className="btn"
                        onClick={() => openCreateModalWithType('Cancelación')}
                        style={{ backgroundColor: '#fef2f2', color: '#dc2626', border: '1.5px solid #fca5a5', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                    >
                        <Trash2 size={16} /> + Cancelación
                    </button>
                </div>
            </div>

            {/* KPI Cards */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '1rem',
                marginBottom: '1.75rem'
            }}>
                <div className="card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', borderLeft: '4px solid var(--primary)' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '10px', backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
                        <Layers size={24} />
                    </div>
                    <div>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>Total Solicitudes</span>
                        <div style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--text-main)', lineHeight: '1.1' }}>{stats.total}</div>
                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{stats.pendientes} pendientes de respuesta</span>
                    </div>
                </div>

                <div className="card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', borderLeft: '4px solid #2563eb' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '10px', backgroundColor: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb' }}>
                        <Sparkles size={24} />
                    </div>
                    <div>
                        <span style={{ fontSize: '0.8rem', color: '#1e40af', fontWeight: '600', textTransform: 'uppercase' }}>Emisiones</span>
                        <div style={{ fontSize: '1.75rem', fontWeight: '800', color: '#1e3a8a', lineHeight: '1.1' }}>{stats.emisiones}</div>
                        <span style={{ fontSize: '0.75rem', color: '#3b82f6' }}>Pólizas nuevas en proceso</span>
                    </div>
                </div>

                <div className="card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', borderLeft: '4px solid #7c3aed' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '10px', backgroundColor: '#f5f3ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7c3aed' }}>
                        <FileEdit size={24} />
                    </div>
                    <div>
                        <span style={{ fontSize: '0.8rem', color: '#5b21b6', fontWeight: '600', textTransform: 'uppercase' }}>Cambios / Endosos</span>
                        <div style={{ fontSize: '1.75rem', fontWeight: '800', color: '#4c1d95', lineHeight: '1.1' }}>{stats.cambios}</div>
                        <span style={{ fontSize: '0.75rem', color: '#8b5cf6' }}>Modificaciones de póliza</span>
                    </div>
                </div>

                <div className="card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', borderLeft: '4px solid #dc2626' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '10px', backgroundColor: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#dc2626' }}>
                        <Trash2 size={24} />
                    </div>
                    <div>
                        <span style={{ fontSize: '0.8rem', color: '#991b1b', fontWeight: '600', textTransform: 'uppercase' }}>Cancelaciones</span>
                        <div style={{ fontSize: '1.75rem', fontWeight: '800', color: '#7f1d1d', lineHeight: '1.1' }}>{stats.cancelaciones}</div>
                        <span style={{ fontSize: '0.75rem', color: '#ef4444' }}>Anulaciones en trámite</span>
                    </div>
                </div>
            </div>

            {/* Main Table Container */}
            <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
                {/* Toolbar */}
                <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {/* Row 1: Search & Type Tabs */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                        <div style={{ position: 'relative', flex: 1, minWidth: '280px', maxWidth: '420px' }}>
                            <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={18} />
                            <input
                                type="text"
                                placeholder="Buscar por ID, cliente, póliza, endoso..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                style={{ paddingLeft: '38px', paddingRight: searchTerm ? '32px' : '12px', width: '100%' }}
                            />
                            {searchTerm && (
                                <button
                                    onClick={() => setSearchTerm('')}
                                    style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                                >
                                    <X size={16} />
                                </button>
                            )}
                        </div>

                        {/* Request Type Selector Tabs */}
                        <div style={{ display: 'flex', gap: '0.4rem', backgroundColor: '#f1f5f9', padding: '4px', borderRadius: 'var(--radius-md)', flexWrap: 'wrap' }}>
                            <button
                                onClick={() => setTypeFilter('ALL')}
                                style={{
                                    padding: '0.4rem 0.85rem',
                                    borderRadius: 'var(--radius-sm)',
                                    border: 'none',
                                    fontSize: '0.84rem',
                                    fontWeight: '700',
                                    cursor: 'pointer',
                                    backgroundColor: typeFilter === 'ALL' ? 'white' : 'transparent',
                                    color: typeFilter === 'ALL' ? 'var(--primary)' : 'var(--text-muted)',
                                    boxShadow: typeFilter === 'ALL' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                                }}
                            >
                                Todas ({requests.length})
                            </button>
                            <button
                                onClick={() => setTypeFilter('Emisión')}
                                style={{
                                    padding: '0.4rem 0.85rem',
                                    borderRadius: 'var(--radius-sm)',
                                    border: 'none',
                                    fontSize: '0.84rem',
                                    fontWeight: '700',
                                    cursor: 'pointer',
                                    backgroundColor: typeFilter === 'Emisión' ? '#2563eb' : 'transparent',
                                    color: typeFilter === 'Emisión' ? 'white' : '#1e40af',
                                    boxShadow: typeFilter === 'Emisión' ? '0 1px 3px rgba(37,99,235,0.3)' : 'none'
                                }}
                            >
                                ✨ Emisión ({requests.filter(r => r.type === 'Emisión').length})
                            </button>
                            <button
                                onClick={() => setTypeFilter('Cambio en Póliza')}
                                style={{
                                    padding: '0.4rem 0.85rem',
                                    borderRadius: 'var(--radius-sm)',
                                    border: 'none',
                                    fontSize: '0.84rem',
                                    fontWeight: '700',
                                    cursor: 'pointer',
                                    backgroundColor: typeFilter === 'Cambio en Póliza' ? '#7c3aed' : 'transparent',
                                    color: typeFilter === 'Cambio en Póliza' ? 'white' : '#5b21b6',
                                    boxShadow: typeFilter === 'Cambio en Póliza' ? '0 1px 3px rgba(124,58,237,0.3)' : 'none'
                                }}
                            >
                                📝 Cambios ({requests.filter(r => r.type === 'Cambio en Póliza').length})
                            </button>
                            <button
                                onClick={() => setTypeFilter('Cancelación')}
                                style={{
                                    padding: '0.4rem 0.85rem',
                                    borderRadius: 'var(--radius-sm)',
                                    border: 'none',
                                    fontSize: '0.84rem',
                                    fontWeight: '700',
                                    cursor: 'pointer',
                                    backgroundColor: typeFilter === 'Cancelación' ? '#dc2626' : 'transparent',
                                    color: typeFilter === 'Cancelación' ? 'white' : '#991b1b',
                                    boxShadow: typeFilter === 'Cancelación' ? '0 1px 3px rgba(220,38,38,0.3)' : 'none'
                                }}
                            >
                                🚫 Cancelación ({requests.filter(r => r.type === 'Cancelación').length})
                            </button>
                        </div>
                    </div>

                    {/* Row 2: Secondary Filters (Status, Cartera, Dates) */}
                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                            {/* Status Filter */}
                            <select
                                value={statusFilter}
                                onChange={e => setStatusFilter(e.target.value)}
                                style={{ padding: '0.45rem 0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontWeight: '600', fontSize: '0.85rem' }}
                            >
                                <option value="ALL">Todos los Estados</option>
                                <option value="Pendiente">⏳ Pendiente</option>
                                <option value="En Trámite">📤 En Trámite</option>
                                <option value="Aprobada">✅ Aprobada / Aplicada</option>
                                <option value="Rechazada">❌ Rechazada</option>
                            </select>

                            {/* Cartera Filter */}
                            <select
                                value={carteraFilter}
                                onChange={e => setCarteraFilter(e.target.value)}
                                style={{ padding: '0.45rem 0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontWeight: '600', fontSize: '0.85rem' }}
                            >
                                <option value="ALL">💼 Todas las Carteras</option>
                                <option value="Santiago Morales y Asociados, S.R.L.">Santiago Morales & Asoc.</option>
                                <option value="Raquel Rodríguez">Raquel Rodríguez</option>
                            </select>
                        </div>

                        {/* Date Range & Quick presets */}
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: '600' }}>
                                <Calendar size={15} />
                                <span>Desde:</span>
                                <input
                                    type="date"
                                    value={dateFrom}
                                    onChange={e => setDateFrom(e.target.value)}
                                    style={{ padding: '0.35rem 0.5rem', fontSize: '0.82rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}
                                />
                                <span>Hasta:</span>
                                <input
                                    type="date"
                                    value={dateTo}
                                    onChange={e => setDateTo(e.target.value)}
                                    style={{ padding: '0.35rem 0.5rem', fontSize: '0.82rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}
                                />
                            </div>

                            <div style={{ display: 'flex', gap: '0.25rem' }}>
                                <button onClick={() => setQuickRange('month')} className="btn" style={{ padding: '0.3rem 0.55rem', fontSize: '0.75rem', border: '1px solid var(--border)' }}>Este Mes</button>
                                <button onClick={() => setQuickRange('year')} className="btn" style={{ padding: '0.3rem 0.55rem', fontSize: '0.75rem', border: '1px solid var(--border)' }}>Este Año</button>
                                <button onClick={() => setQuickRange('all')} className="btn" style={{ padding: '0.3rem 0.55rem', fontSize: '0.75rem', border: '1px solid var(--border)' }}>Todo</button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Table */}
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid var(--border)' }}>
                                <th
                                    onClick={() => handleSort('id')}
                                    style={{ padding: '1rem', textAlign: 'left', color: sortConfig.key === 'id' ? '#2563eb' : 'var(--text-muted)', fontWeight: '700', fontSize: '0.82rem', textTransform: 'uppercase', cursor: 'pointer', userSelect: 'none' }}
                                    title="Hacer clic para ordenar por Solicitud / Tipo"
                                >
                                    <div style={{ display: 'flex', alignItems: 'center' }}>
                                        <span>Solicitud / Tipo</span>
                                        {renderSortIcon('id')}
                                    </div>
                                </th>
                                <th
                                    onClick={() => handleSort('client')}
                                    style={{ padding: '1rem', textAlign: 'left', color: sortConfig.key === 'client' ? '#2563eb' : 'var(--text-muted)', fontWeight: '700', fontSize: '0.82rem', textTransform: 'uppercase', cursor: 'pointer', userSelect: 'none' }}
                                    title="Hacer clic para ordenar por Cliente / Cartera"
                                >
                                    <div style={{ display: 'flex', alignItems: 'center' }}>
                                        <span>Cliente / Cartera</span>
                                        {renderSortIcon('client')}
                                    </div>
                                </th>
                                <th
                                    onClick={() => handleSort('policy')}
                                    style={{ padding: '1rem', textAlign: 'left', color: sortConfig.key === 'policy' ? '#2563eb' : 'var(--text-muted)', fontWeight: '700', fontSize: '0.82rem', textTransform: 'uppercase', cursor: 'pointer', userSelect: 'none' }}
                                    title="Hacer clic para ordenar por Póliza / Aseguradora"
                                >
                                    <div style={{ display: 'flex', alignItems: 'center' }}>
                                        <span>Póliza / Aseguradora</span>
                                        {renderSortIcon('policy')}
                                    </div>
                                </th>
                                <th
                                    onClick={() => handleSort('requestDate')}
                                    style={{ padding: '1rem', textAlign: 'left', color: sortConfig.key === 'requestDate' ? '#2563eb' : 'var(--text-muted)', fontWeight: '700', fontSize: '0.82rem', textTransform: 'uppercase', cursor: 'pointer', userSelect: 'none' }}
                                    title="Hacer clic para ordenar por Fecha"
                                >
                                    <div style={{ display: 'flex', alignItems: 'center' }}>
                                        <span>Fecha</span>
                                        {renderSortIcon('requestDate')}
                                    </div>
                                </th>
                                <th
                                    onClick={() => handleSort('status')}
                                    style={{ padding: '1rem', textAlign: 'left', color: sortConfig.key === 'status' ? '#2563eb' : 'var(--text-muted)', fontWeight: '700', fontSize: '0.82rem', textTransform: 'uppercase', cursor: 'pointer', userSelect: 'none' }}
                                    title="Hacer clic para ordenar por Estado"
                                >
                                    <div style={{ display: 'flex', alignItems: 'center' }}>
                                        <span>Estado</span>
                                        {renderSortIcon('status')}
                                    </div>
                                </th>
                                <th style={{ padding: '1rem', textAlign: 'right', color: 'var(--text-muted)', fontWeight: '700', fontSize: '0.82rem', textTransform: 'uppercase' }}>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedRequests.length === 0 ? (
                                <tr>
                                    <td colSpan={6} style={{ padding: '3.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                                            <FileCheck size={40} color="#cbd5e1" />
                                            <span style={{ fontSize: '1rem', fontWeight: '600' }}>No se encontraron solicitudes con los filtros aplicados.</span>
                                            <span style={{ fontSize: '0.85rem' }}>Puedes registrar una nueva solicitud utilizando los botones superiores.</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                sortedRequests.map(req => {
                                    const typeMeta = TYPE_CONFIG[req.type] || TYPE_CONFIG['Emisión'];
                                    const statusMeta = STATUS_CONFIG[req.status] || STATUS_CONFIG['Pendiente'];
                                    const StatusIcon = statusMeta.icon;
                                    const isRaquel = (req.cartera || '').toLowerCase().includes('raquel');

                                    return (
                                        <tr key={req.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.15s' }}>
                                            {/* Col 1: ID & Type Badge */}
                                            <td style={{ padding: '1rem' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                                    <span style={{
                                                        fontFamily: 'monospace',
                                                        fontWeight: '800',
                                                        color: 'var(--primary)',
                                                        fontSize: '0.92rem'
                                                    }}>
                                                        {req.id}
                                                    </span>
                                                    <span style={{
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '0.25rem',
                                                        padding: '0.15rem 0.55rem',
                                                        borderRadius: '999px',
                                                        fontSize: '0.75rem',
                                                        fontWeight: '700',
                                                        backgroundColor: typeMeta.bg,
                                                        color: typeMeta.color,
                                                        border: `1px solid ${typeMeta.border}`
                                                    }}>
                                                        <typeMeta.icon size={12} /> {req.type}
                                                    </span>
                                                </div>
                                                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.25rem', fontWeight: '500' }}>
                                                    {req.subtype || req.ramo || 'General'}
                                                </div>
                                            </td>

                                            {/* Col 2: Client & Cartera */}
                                            <td style={{ padding: '1rem' }}>
                                                <div style={{ fontWeight: '700', color: 'var(--text-main)', fontSize: '0.92rem' }}>
                                                    {req.client}
                                                </div>
                                                <div style={{ marginTop: '0.25rem' }}>
                                                    <span style={{
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '0.25rem',
                                                        padding: '0.1rem 0.45rem',
                                                        borderRadius: '999px',
                                                        fontSize: '0.72rem',
                                                        fontWeight: '700',
                                                        backgroundColor: isRaquel ? '#fdf4ff' : '#eff6ff',
                                                        color: isRaquel ? '#86198f' : '#1e40af',
                                                        border: isRaquel ? '1px solid #f0abfc' : '1px solid #bfdbfe'
                                                    }}>
                                                        <Briefcase size={10} />
                                                        {isRaquel ? 'Raquel Rodríguez' : 'Santiago Morales & Asoc.'}
                                                    </span>
                                                </div>
                                            </td>

                                            {/* Col 3: Policy & Insurer */}
                                            <td style={{ padding: '1rem' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                                                    <InsurerLogo name={req.insurer} size={18} />
                                                    <span style={{ fontWeight: '600', fontSize: '0.88rem', color: 'var(--text-main)' }}>
                                                        {req.insurer}
                                                    </span>
                                                </div>
                                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                                                    {req.policy ? (
                                                        <span>Póliza: <strong style={{ color: 'var(--primary)' }}>{req.policy}</strong></span>
                                                    ) : (
                                                        <span style={{ fontStyle: 'italic' }}>Propuesta Nueva ({req.ramo || 'General'})</span>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Col 4: Request Date */}
                                            <td style={{ padding: '1rem' }}>
                                                <div style={{ fontSize: '0.86rem', fontWeight: '600', color: 'var(--text-main)' }}>
                                                    {formatDateToDDMMYYYY(req.requestDate)}
                                                </div>
                                                {req.effectiveDate && req.effectiveDate !== req.requestDate && (
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                                                        Efectiva: {formatDateToDDMMYYYY(req.effectiveDate)}
                                                    </div>
                                                )}
                                            </td>

                                            {/* Col 5: Status */}
                                            <td style={{ padding: '1rem' }}>
                                                <span style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '0.35rem',
                                                    padding: '0.25rem 0.65rem',
                                                    borderRadius: '999px',
                                                    fontSize: '0.8rem',
                                                    fontWeight: '700',
                                                    backgroundColor: statusMeta.bg,
                                                    color: statusMeta.text,
                                                    border: `1px solid ${statusMeta.border}`
                                                }}>
                                                    <StatusIcon size={13} />
                                                    {req.status}
                                                </span>
                                                {req.endorsementNumber && (
                                                    <div style={{ fontSize: '0.72rem', color: '#166534', fontWeight: '600', marginTop: '0.25rem' }}>
                                                        Endoso: {req.endorsementNumber}
                                                    </div>
                                                )}
                                                {req.newPolicyId && (
                                                    <div style={{ fontSize: '0.72rem', color: '#1e40af', fontWeight: '600', marginTop: '0.25rem' }}>
                                                        Póliza: {req.newPolicyId}
                                                    </div>
                                                )}
                                            </td>

                                            {/* Col 6: Actions */}
                                            <td style={{ padding: '1rem', textAlign: 'right' }}>
                                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.4rem' }}>
                                                    <button
                                                        className="btn"
                                                        onClick={() => handleOpenLetterModal(req)}
                                                        style={{
                                                            padding: '0.4rem 0.65rem',
                                                            fontSize: '0.82rem',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '0.3rem',
                                                            backgroundColor: '#fffbeb',
                                                            color: '#92400e',
                                                            border: '1px solid #fcd34d',
                                                            fontWeight: '700'
                                                        }}
                                                        title="Ver y generar carta formal de solicitud"
                                                    >
                                                        <FileText size={14} color="#d97706" /> Carta
                                                    </button>
                                                    <button
                                                        className="btn"
                                                        onClick={() => handleOpenDetail(req)}
                                                        style={{ padding: '0.4rem 0.65rem', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.3rem', border: '1px solid var(--border)' }}
                                                        title="Ver detalles y gestionar estado"
                                                    >
                                                        <Eye size={14} /> Gestionar
                                                    </button>
                                                    <button
                                                        className="btn"
                                                        onClick={() => handleDeleteRequest(req)}
                                                        style={{ padding: '0.4rem 0.55rem', color: '#dc2626', backgroundColor: '#fee2e2', border: '1px solid #fca5a5' }}
                                                        title="Eliminar solicitud"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ─── MODAL: FORMATO DE CARTA DE SOLICITUD ─────────────────────────── */}
            {showLetterModal && letterData && (
                <div style={{
                    position: 'fixed',
                    top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.65)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1100,
                    padding: '1rem'
                }}>
                    <div className="card" style={{
                        width: '100%',
                        maxWidth: '820px',
                        backgroundColor: 'white',
                        maxHeight: '94vh',
                        display: 'flex',
                        flexDirection: 'column',
                        padding: '0',
                        overflow: 'hidden',
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)'
                    }}>
                        {/* Letter Modal Toolbar / Actions Header */}
                        <div style={{
                            padding: '1rem 1.5rem',
                            backgroundColor: 'var(--primary)',
                            color: 'white',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            gap: '0.75rem'
                        }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'white' }}>
                                    <FileText size={20} color="#fcd34d" /> Formato de Carta de Solicitud ({letterData.requestType})
                                </h3>
                                <span style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>
                                    {letterData.requestId} · {letterData.clientName}
                                </span>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                <button
                                    onClick={handleCopyText}
                                    className="btn"
                                    style={{
                                        backgroundColor: copiedFeedback ? '#166534' : 'rgba(255,255,255,0.15)',
                                        color: 'white',
                                        border: '1px solid rgba(255,255,255,0.3)',
                                        fontSize: '0.82rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.35rem',
                                        padding: '0.45rem 0.75rem'
                                    }}
                                >
                                    {copiedFeedback ? <Check size={14} /> : <Copy size={14} />}
                                    {copiedFeedback ? '¡Copiado!' : 'Copiar Texto'}
                                </button>

                                <button
                                    onClick={handleDownloadPdf}
                                    className="btn"
                                    style={{
                                        backgroundColor: '#d97706',
                                        color: 'white',
                                        border: 'none',
                                        fontSize: '0.82rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.35rem',
                                        padding: '0.45rem 0.75rem',
                                        fontWeight: '700'
                                    }}
                                >
                                    <Download size={14} /> Descargar PDF
                                </button>

                                <button
                                    onClick={handlePrintLetter}
                                    className="btn"
                                    style={{
                                        backgroundColor: 'white',
                                        color: 'var(--primary)',
                                        border: 'none',
                                        fontSize: '0.82rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.35rem',
                                        padding: '0.45rem 0.75rem',
                                        fontWeight: '700'
                                    }}
                                >
                                    <Printer size={14} /> Imprimir
                                </button>

                                <button
                                    onClick={() => setShowLetterModal(false)}
                                    style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', marginLeft: '0.5rem' }}
                                >
                                    <X size={22} />
                                </button>
                            </div>
                        </div>

                        {/* Letter Paper Preview Scrollable Area */}
                        <div style={{
                            padding: '2rem',
                            overflowY: 'auto',
                            backgroundColor: '#f1f5f9',
                            display: 'flex',
                            justifyContent: 'center'
                        }}>
                            {/* A4 Sheet Simulation */}
                            <div style={{
                                width: '100%',
                                maxWidth: '720px',
                                backgroundColor: 'white',
                                padding: '2.5rem',
                                borderRadius: '4px',
                                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)',
                                border: '1px solid #e2e8f0',
                                color: '#1e293b',
                                fontFamily: 'Segoe UI, Arial, sans-serif',
                                fontSize: '0.95rem',
                                lineHeight: '1.6'
                            }}>
                                {/* Top Color Bars */}
                                <div style={{ height: '6px', backgroundColor: 'var(--primary)', margin: '-2.5rem -2.5rem 0 -2.5rem' }} />
                                <div style={{ height: '3px', backgroundColor: '#d97706', margin: '0 -2.5rem 1.75rem -2.5rem' }} />

                                {/* Letterhead */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1.5px solid #e2e8f0', paddingBottom: '1.25rem', marginBottom: '1.5rem' }}>
                                    <div>
                                        <h1 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--primary)', fontWeight: '800' }}>
                                            {letterData.brokerName}
                                        </h1>
                                        <div style={{ fontSize: '0.78rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginTop: '2px' }}>
                                            {letterData.brokerTitle}
                                        </div>
                                        <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '4px', lineHeight: '1.4' }}>
                                            {letterData.brokerRnc} · Reg. Superintendencia de Seguros<br />
                                            {letterData.brokerContact}
                                        </div>
                                    </div>

                                    {/* Control Box */}
                                    <div style={{ border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', borderRadius: '6px', padding: '8px 14px', textAlign: 'center', minWidth: '150px' }}>
                                        <div style={{ fontSize: '0.7rem', fontWeight: '800', color: 'var(--primary)', textTransform: 'uppercase' }}>
                                            Solicitud de Trámite
                                        </div>
                                        <div style={{ fontSize: '1.05rem', fontWeight: '800', color: '#d97706', fontFamily: 'monospace', margin: '2px 0' }}>
                                            {letterData.requestId}
                                        </div>
                                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                            Cód. Agente: <strong>{letterData.agentCode}</strong>
                                        </div>
                                    </div>
                                </div>

                                {/* Place & Date */}
                                <div style={{ marginBottom: '1.25rem', color: '#334155' }}>
                                    Santo Domingo, D.N., <strong>{letterData.spanishDate}</strong>
                                </div>

                                {/* Addressee */}
                                <div style={{ marginBottom: '1.25rem', lineHeight: '1.5' }}>
                                    <strong>Señores:</strong><br />
                                    <strong style={{ fontSize: '1.05rem', color: 'var(--primary)' }}>{letterData.insurer.toUpperCase()}</strong><br />
                                    <span>Atención: <strong>{letterData.department}</strong></span><br />
                                    <span>Ciudad.</span>
                                </div>

                                {/* Subject Box */}
                                <div style={{
                                    backgroundColor: '#fef3c7',
                                    border: '1px solid #fcd34d',
                                    borderRadius: '6px',
                                    padding: '0.75rem 1rem',
                                    fontWeight: '800',
                                    fontSize: '0.88rem',
                                    color: '#78350f',
                                    marginBottom: '1.5rem'
                                }}>
                                    ASUNTO: {letterData.subject}
                                </div>

                                {/* Salutation & Intro */}
                                <p style={{ margin: '0 0 1rem 0', textAlign: 'justify' }}>{letterData.greeting}</p>
                                <p style={{ margin: '0 0 1.25rem 0', textAlign: 'justify' }}>{letterData.introParagraph}</p>

                                {/* Details Box */}
                                <div style={{
                                    border: '1px solid #cbd5e1',
                                    backgroundColor: '#f8fafc',
                                    borderRadius: '6px',
                                    padding: '1rem 1.25rem',
                                    margin: '1.25rem 0'
                                }}>
                                    <div style={{ fontSize: '0.8rem', fontWeight: '800', color: 'var(--primary)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                                        Detalles de la Operación
                                    </div>
                                    <ul style={{ margin: 0, paddingLeft: '1.25rem' }}>
                                        {letterData.bodyParagraphs.map((para, i) => (
                                            <li key={i} style={{ marginBottom: '0.4rem', fontSize: '0.9rem', whiteSpace: 'pre-line' }}>
                                                {para}
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                {/* Closing */}
                                <p style={{ margin: '1.25rem 0', textAlign: 'justify' }}>{letterData.closingParagraph}</p>

                                {/* Attachments */}
                                {letterData.attachments.length > 0 && (
                                    <div style={{ marginTop: '1rem', fontSize: '0.82rem', color: '#475569' }}>
                                        <strong>Documentos Anexos:</strong> {letterData.attachments.join(' · ')}
                                    </div>
                                )}

                                {/* Signatures */}
                                <div style={{ marginTop: '3.5rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                                    <div style={{ borderTop: '1.5px solid #1e293b', paddingTop: '0.5rem' }}>
                                        <div style={{ fontWeight: '800', color: 'var(--primary)', fontSize: '0.92rem' }}>
                                            {letterData.brokerName}
                                        </div>
                                        <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{letterData.brokerTitle}</div>
                                        <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                                            Código Aseguradora: <strong>{letterData.agentCode}</strong>
                                        </div>
                                    </div>

                                    <div style={{ borderTop: '1.5px solid #1e293b', paddingTop: '0.5rem' }}>
                                        <div style={{ fontWeight: '800', color: '#1e293b', fontSize: '0.92rem' }}>
                                            {letterData.clientName}
                                        </div>
                                        <div style={{ fontSize: '0.78rem', color: '#64748b' }}>Firma / Sello del Solicitante</div>
                                        <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                                            Cédula / RNC: <strong>{letterData.clientDoc}</strong>
                                        </div>
                                    </div>
                                </div>

                                {/* Footer Bar */}
                                <div style={{ marginTop: '2.5rem', borderTop: '1px solid #e2e8f0', paddingTop: '0.5rem', textAlign: 'center', fontSize: '0.72rem', color: '#94a3b8' }}>
                                    Santiago Morales & Asoc. · Sistema de Gestión y Trámites de Seguros
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── MODAL: NUEVA SOLICITUD ────────────────────────────────────────── */}
            {showCreateModal && (
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
                    <div className="card" style={{ width: '100%', maxWidth: '640px', backgroundColor: 'white', maxHeight: '92vh', overflowY: 'auto' }}>
                        {/* Modal Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
                            <div>
                                <h3 style={{ margin: 0, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.25rem' }}>
                                    <FileCheck size={22} /> Registrar Solicitud de Trámite
                                </h3>
                                <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                                    Selecciona el tipo de operación y completa la información requerida por la aseguradora.
                                </p>
                            </div>
                            <button onClick={() => setShowCreateModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                                <X size={22} />
                            </button>
                        </div>

                        {/* Type Tabs */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', marginBottom: '1.5rem' }}>
                            <button
                                type="button"
                                onClick={() => {
                                    setFormType('Emisión');
                                    setFormData(prev => ({ ...prev, subtype: TYPE_CONFIG['Emisión'].subtypes[0] }));
                                }}
                                style={{
                                    padding: '0.65rem',
                                    borderRadius: 'var(--radius-md)',
                                    border: formType === 'Emisión' ? '2px solid #2563eb' : '1px solid var(--border)',
                                    backgroundColor: formType === 'Emisión' ? '#eff6ff' : 'white',
                                    color: formType === 'Emisión' ? '#1d4ed8' : 'var(--text-main)',
                                    fontWeight: '700',
                                    fontSize: '0.88rem',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: '0.3rem',
                                    transition: 'all 0.15s'
                                }}
                            >
                                <Sparkles size={18} color="#2563eb" />
                                <span>1. Emisión</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => {
                                    setFormType('Cambio en Póliza');
                                    setFormData(prev => ({ ...prev, subtype: TYPE_CONFIG['Cambio en Póliza'].subtypes[0] }));
                                }}
                                style={{
                                    padding: '0.65rem',
                                    borderRadius: 'var(--radius-md)',
                                    border: formType === 'Cambio en Póliza' ? '2px solid #7c3aed' : '1px solid var(--border)',
                                    backgroundColor: formType === 'Cambio en Póliza' ? '#f5f3ff' : 'white',
                                    color: formType === 'Cambio en Póliza' ? '#6d28d9' : 'var(--text-main)',
                                    fontWeight: '700',
                                    fontSize: '0.88rem',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: '0.3rem',
                                    transition: 'all 0.15s'
                                }}
                            >
                                <FileEdit size={18} color="#7c3aed" />
                                <span>2. Cambio / Endoso</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => {
                                    setFormType('Cancelación');
                                    setFormData(prev => ({ ...prev, subtype: TYPE_CONFIG['Cancelación'].subtypes[0] }));
                                }}
                                style={{
                                    padding: '0.65rem',
                                    borderRadius: 'var(--radius-md)',
                                    border: formType === 'Cancelación' ? '2px solid #dc2626' : '1px solid var(--border)',
                                    backgroundColor: formType === 'Cancelación' ? '#fef2f2' : 'white',
                                    color: formType === 'Cancelación' ? '#b91c1c' : 'var(--text-main)',
                                    fontWeight: '700',
                                    fontSize: '0.88rem',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: '0.3rem',
                                    transition: 'all 0.15s'
                                }}
                            >
                                <Trash2 size={18} color="#dc2626" />
                                <span>3. Cancelación</span>
                            </button>
                        </div>

                        <form onSubmit={handleCreateSubmit}>
                            {/* POLICY / CLIENT SELECTOR DEPENDING ON TYPE */}
                            {formType === 'Emisión' ? (
                                <div style={{ marginBottom: '1.25rem' }}>
                                    <label style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '0.4rem' }}>
                                        Cliente / Prospecto *
                                    </label>
                                    <div style={{ position: 'relative' }}>
                                        <input
                                            type="text"
                                            required
                                            placeholder="Buscar cliente existente o escribir nombre de prospecto..."
                                            value={clientSearch || formData.client}
                                            onChange={e => {
                                                setClientSearch(e.target.value);
                                                setFormData(prev => ({ ...prev, client: e.target.value, clienteId: null }));
                                                setShowClientResults(true);
                                            }}
                                            onFocus={() => setShowClientResults(true)}
                                            style={{ width: '100%', padding: '0.6rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontWeight: '600' }}
                                        />
                                        {showClientResults && clientSearch.trim() && (
                                            <div style={{
                                                position: 'absolute', top: '100%', left: 0, right: 0,
                                                backgroundColor: 'white', border: '1px solid var(--border)',
                                                borderRadius: 'var(--radius-sm)', boxShadow: 'var(--shadow-md)',
                                                maxHeight: '180px', overflowY: 'auto', zIndex: 20
                                            }}>
                                                {filteredClientsForSearch.length === 0 ? (
                                                    <div style={{ padding: '0.75rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                                        No hay cliente existente con ese nombre. Se registrará como nuevo prospecto: <strong>"{clientSearch}"</strong>
                                                    </div>
                                                ) : (
                                                    filteredClientsForSearch.map(c => (
                                                        <div
                                                            key={c.id}
                                                            onClick={() => handleSelectClient(c)}
                                                            style={{ padding: '0.6rem 0.8rem', cursor: 'pointer', borderBottom: '1px solid #f1f5f9', fontSize: '0.88rem' }}
                                                            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#eff6ff'}
                                                            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'white'}
                                                        >
                                                            <strong>{c.name}</strong> <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>({c.personType || 'Física'} · {c.documentId})</span>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div style={{ marginBottom: '1.25rem' }}>
                                    <label style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '0.4rem' }}>
                                        Póliza a {formType === 'Cancelación' ? 'Cancelar' : 'Modificar'} *
                                    </label>
                                    <div style={{ position: 'relative' }}>
                                        <input
                                            type="text"
                                            required
                                            placeholder="Buscar por cliente, número de póliza, ramo..."
                                            value={policySearch}
                                            onChange={e => {
                                                setPolicySearch(e.target.value);
                                                setShowPolicyResults(true);
                                            }}
                                            onFocus={() => setShowPolicyResults(true)}
                                            style={{ width: '100%', padding: '0.6rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontWeight: '600' }}
                                        />
                                        {showPolicyResults && (
                                            <div style={{
                                                position: 'absolute', top: '100%', left: 0, right: 0,
                                                backgroundColor: 'white', border: '1px solid var(--border)',
                                                borderRadius: 'var(--radius-sm)', boxShadow: 'var(--shadow-md)',
                                                maxHeight: '200px', overflowY: 'auto', zIndex: 20
                                            }}>
                                                {filteredPoliciesForSearch.length === 0 ? (
                                                    <div style={{ padding: '0.75rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                                        No se encontraron pólizas.
                                                    </div>
                                                ) : (
                                                    filteredPoliciesForSearch.slice(0, 8).map(p => (
                                                        <div
                                                            key={p.id}
                                                            onClick={() => handleSelectPolicy(p)}
                                                            style={{ padding: '0.6rem 0.8rem', cursor: 'pointer', borderBottom: '1px solid #f1f5f9', fontSize: '0.88rem' }}
                                                            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#eff6ff'}
                                                            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'white'}
                                                        >
                                                            <div style={{ fontWeight: '700', color: 'var(--primary)' }}>{p.id} · {p.client}</div>
                                                            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{p.type} · {p.insurer} (Vigencia: {formatDateToDDMMYYYY(p.endDate || p.renewal)})</div>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Row: Subtipo & Aseguradora */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                                <div>
                                    <label style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '0.4rem' }}>
                                        Subtipo de Solicitud *
                                    </label>
                                    <select
                                        style={{ width: '100%', padding: '0.6rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontWeight: '600' }}
                                        value={formData.subtype}
                                        onChange={e => setFormData({ ...formData, subtype: e.target.value })}
                                    >
                                        {TYPE_CONFIG[formType]?.subtypes.map(sub => (
                                            <option key={sub} value={sub}>{sub}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '0.4rem' }}>
                                        Compañía Aseguradora *
                                    </label>
                                    <select
                                        style={{ width: '100%', padding: '0.6rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontWeight: '600' }}
                                        value={formData.insurer}
                                        onChange={e => setFormData({ ...formData, insurer: e.target.value })}
                                    >
                                        {companies.map(c => (
                                            <option key={c.name} value={c.name}>{c.name}</option>
                                        ))}
                                        {['La Colonial de Seguros', 'Humano Seguros', 'Seguros Universal', 'Mapfre BHD Seguros', 'Seguros Reservas', 'Seguros Sura', 'General de Seguros', 'Dominicana de Seguros', 'Patria Compañía de Seguros', 'Seguros Pepín', 'La Monumental de Seguros', 'Angloamericana de Seguros', 'CoopSeguros', 'Seguros Crecer', 'K&M Seguros']
                                            .filter(name => !companies.some(c => c.name.toLowerCase() === name.toLowerCase()))
                                            .map(name => (
                                                <option key={name} value={name}>{name}</option>
                                            ))}
                                    </select>
                                </div>
                            </div>

                            {/* Row: Cartera & Ramo */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                                <div>
                                    <label style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '0.4rem' }}>
                                        Cartera de Agente *
                                    </label>
                                    <select
                                        style={{ width: '100%', padding: '0.6rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontWeight: '600' }}
                                        value={formData.cartera}
                                        onChange={e => setFormData({ ...formData, cartera: e.target.value })}
                                    >
                                        <option value="Santiago Morales y Asociados, S.R.L.">💼 Santiago Morales y Asociados, S.R.L.</option>
                                        <option value="Raquel Rodríguez">💼 Raquel Rodríguez</option>
                                    </select>
                                </div>

                                <div>
                                    <label style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '0.4rem' }}>
                                        Ramo / Tipo de Seguro
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Ej. Auto, Salud, Vida, Incendio, Transporte..."
                                        value={formData.ramo}
                                        onChange={e => setFormData({ ...formData, ramo: e.target.value })}
                                        style={{ width: '100%', padding: '0.6rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}
                                    />
                                </div>
                            </div>

                            {/* Row: Fechas */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                                <div>
                                    <label style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '0.4rem' }}>
                                        Fecha Solicitud *
                                    </label>
                                    <input
                                        type="date"
                                        required
                                        value={formData.requestDate}
                                        onChange={e => setFormData({ ...formData, requestDate: e.target.value })}
                                        style={{ width: '100%', padding: '0.55rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}
                                    />
                                </div>

                                <div>
                                    <label style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '0.4rem' }}>
                                        Fecha Efectiva Deseada
                                    </label>
                                    <input
                                        type="date"
                                        value={formData.effectiveDate}
                                        onChange={e => setFormData({ ...formData, effectiveDate: e.target.value })}
                                        style={{ width: '100%', padding: '0.55rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}
                                    />
                                </div>

                                <div>
                                    <label style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '0.4rem' }}>
                                        Prioridad
                                    </label>
                                    <select
                                        style={{ width: '100%', padding: '0.55rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontWeight: '600' }}
                                        value={formData.priority}
                                        onChange={e => setFormData({ ...formData, priority: e.target.value })}
                                    >
                                        <option value="Alta">🔴 Alta</option>
                                        <option value="Media">🟡 Media</option>
                                        <option value="Baja">🔵 Baja</option>
                                    </select>
                                </div>
                            </div>

                            {/* Contextual Fields depending on type */}
                            {formType === 'Emisión' && (
                                <div style={{ marginBottom: '1rem' }}>
                                    <label style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '0.4rem' }}>
                                        Prima Anual Estimada (RD$)
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Ej. RD$ 35,000.00"
                                        value={formData.estimatedAmount}
                                        onChange={e => setFormData({ ...formData, estimatedAmount: e.target.value })}
                                        style={{ width: '100%', padding: '0.6rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontWeight: '700' }}
                                    />
                                </div>
                            )}

                            {formType === 'Cancelación' && (
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                                    <div>
                                        <label style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '0.4rem' }}>
                                            Motivo Principal de Cancelación *
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="Ej. Venta del vehículo, cambio de aseguradora..."
                                            value={formData.reason}
                                            onChange={e => setFormData({ ...formData, reason: e.target.value })}
                                            style={{ width: '100%', padding: '0.6rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '0.4rem' }}>
                                            Devolución de Prima Estimada (RD$)
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="Ej. RD$ 12,500.00 (opcional)"
                                            value={formData.estimatedRefund}
                                            onChange={e => setFormData({ ...formData, estimatedRefund: e.target.value })}
                                            style={{ width: '100%', padding: '0.6rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Description / Instructions */}
                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '0.4rem' }}>
                                    Descripción Detallada e Instrucciones *
                                </label>
                                <textarea
                                    required
                                    rows={3}
                                    placeholder={
                                        formType === 'Emisión' ? 'Especificaciones del bien o persona a asegurar, coberturas solicitadas, deducibles deseados...' :
                                        formType === 'Cambio en Póliza' ? 'Detalle exacto de la modificación (ej. sustitución de chasis, nuevo beneficiario, cambio de dirección)...' :
                                        'Instrucciones de cancelación para la compañía, aplicación de crédito o devolución...'
                                    }
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    style={{ width: '100%', padding: '0.6rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', resize: 'vertical' }}
                                />
                            </div>

                            {/* Attachments */}
                            <div style={{ marginBottom: '1.5rem' }}>
                                <label style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '0.4rem' }}>
                                    Documentos Adjuntos (Matrícula, Carta de Solicitud, Cédula, Inspección)
                                </label>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <label className="btn" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', border: '1px dashed var(--border)', backgroundColor: '#f8fafc' }}>
                                        <Paperclip size={16} /> Adjuntar Archivos
                                        <input type="file" multiple onChange={handleFiles} style={{ display: 'none' }} />
                                    </label>
                                    <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                                        {formData.attachments.length > 0 ? `${formData.attachments.length} archivo(s) seleccionado(s)` : 'Ningún archivo adjunto'}
                                    </span>
                                </div>
                                {formData.attachments.length > 0 && (
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.5rem' }}>
                                        {formData.attachments.map((f, i) => (
                                            <span key={i} style={{ padding: '0.2rem 0.6rem', backgroundColor: '#e2e8f0', borderRadius: '4px', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                                                <FileText size={12} /> {f}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Buttons */}
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                                <button
                                    type="button"
                                    className="btn"
                                    onClick={() => setShowCreateModal(false)}
                                    style={{ border: '1px solid var(--border)', backgroundColor: '#f8fafc' }}
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    disabled={isSaving}
                                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '700' }}
                                >
                                    <CheckCircle2 size={16} /> {isSaving ? 'Guardando...' : 'Crear Solicitud'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ─── MODAL: GESTIÓN DE DETALLES Y ESTADO ───────────────────────────── */}
            {selectedRequest && (
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
                    <div className="card" style={{ width: '100%', maxWidth: '680px', backgroundColor: 'white', maxHeight: '92vh', overflowY: 'auto' }}>
                        {/* Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                <span style={{ fontFamily: 'monospace', fontWeight: '800', fontSize: '1.2rem', color: 'var(--primary)' }}>
                                    {selectedRequest.id}
                                </span>
                                <span style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.3rem',
                                    padding: '0.2rem 0.65rem',
                                    borderRadius: '999px',
                                    fontSize: '0.8rem',
                                    fontWeight: '700',
                                    backgroundColor: (TYPE_CONFIG[selectedRequest.type] || TYPE_CONFIG['Emisión']).bg,
                                    color: (TYPE_CONFIG[selectedRequest.type] || TYPE_CONFIG['Emisión']).color,
                                    border: `1px solid ${(TYPE_CONFIG[selectedRequest.type] || TYPE_CONFIG['Emisión']).border}`
                                }}>
                                    {selectedRequest.type}
                                </span>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <button
                                    className="btn"
                                    onClick={() => {
                                        const req = selectedRequest;
                                        setSelectedRequest(null);
                                        handleOpenLetterModal(req);
                                    }}
                                    style={{
                                        backgroundColor: '#fffbeb',
                                        color: '#92400e',
                                        border: '1px solid #fcd34d',
                                        fontWeight: '700',
                                        fontSize: '0.8rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.35rem',
                                        padding: '0.35rem 0.7rem'
                                    }}
                                >
                                    <FileText size={14} color="#d97706" /> Ver Carta Formal
                                </button>
                                <button onClick={() => setSelectedRequest(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                                    <X size={22} />
                                </button>
                            </div>
                        </div>

                        {/* Request Summary Info */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', marginBottom: '1.25rem' }}>
                            <div style={{ padding: '0.75rem', backgroundColor: '#f8fafc', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700', display: 'block' }}>Cliente</span>
                                <strong style={{ color: 'var(--text-main)', fontSize: '0.92rem' }}>{selectedRequest.client}</strong>
                            </div>
                            <div style={{ padding: '0.75rem', backgroundColor: '#f8fafc', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700', display: 'block' }}>Aseguradora</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.15rem' }}>
                                    <InsurerLogo name={selectedRequest.insurer} size={16} />
                                    <strong style={{ color: 'var(--text-main)', fontSize: '0.88rem' }}>{selectedRequest.insurer}</strong>
                                </div>
                            </div>
                            <div style={{ padding: '0.75rem', backgroundColor: '#f8fafc', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700', display: 'block' }}>Póliza Asociada</span>
                                <strong style={{ color: 'var(--primary)', fontSize: '0.92rem' }}>{selectedRequest.policy || 'Propuesta Nueva'}</strong>
                            </div>
                            <div style={{ padding: '0.75rem', backgroundColor: '#f8fafc', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700', display: 'block' }}>Fecha Solicitud</span>
                                <strong style={{ color: 'var(--text-main)', fontSize: '0.92rem' }}>{formatDateToDDMMYYYY(selectedRequest.requestDate)}</strong>
                            </div>
                        </div>

                        {/* Description Box */}
                        <div style={{ padding: '1rem', backgroundColor: '#faf8f5', borderRadius: 'var(--radius-sm)', border: '1px solid #ebdccb', marginBottom: '1.25rem' }}>
                            <div style={{ fontSize: '0.78rem', fontWeight: '700', color: 'var(--primary)', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                                Detalle de la Operación / {selectedRequest.subtype || selectedRequest.type}:
                            </div>
                            <p style={{ margin: 0, fontSize: '0.92rem', color: 'var(--text-main)', lineHeight: '1.5' }}>
                                {selectedRequest.description || 'Sin descripción detallada.'}
                            </p>
                            {selectedRequest.reason && (
                                <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: '#dc2626', fontWeight: '600' }}>
                                    Motivo: {selectedRequest.reason}
                                </div>
                            )}
                        </div>

                        {/* Attachments */}
                        {selectedRequest.attachments && selectedRequest.attachments.length > 0 && (
                            <div style={{ marginBottom: '1.25rem' }}>
                                <label style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '0.35rem' }}>
                                    Documentos Adjuntos:
                                </label>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                                    {selectedRequest.attachments.map((f, i) => (
                                        <span key={i} style={{ padding: '0.25rem 0.65rem', backgroundColor: '#f1f5f9', borderRadius: '6px', fontSize: '0.8rem', border: '1px solid var(--border)', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                                            <Paperclip size={13} /> {f}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Form: Update Status & Resolution */}
                        <form onSubmit={handleUpdateStatusSubmit} style={{ borderTop: '1px solid var(--border)', paddingTop: '1.25rem' }}>
                            <h4 style={{ margin: '0 0 1rem 0', color: 'var(--primary)', fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                <Send size={18} /> Actualizar Estado y Respuesta de la Aseguradora
                            </h4>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                                <div>
                                    <label style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '0.4rem' }}>
                                        Estado del Trámite *
                                    </label>
                                    <select
                                        style={{ width: '100%', padding: '0.6rem', borderRadius: 'var(--radius-sm)', border: '1.5px solid var(--primary)', fontWeight: '700', fontSize: '0.92rem' }}
                                        value={statusUpdate}
                                        onChange={e => setStatusUpdate(e.target.value)}
                                    >
                                        <option value="Pendiente">⏳ Pendiente de Envío / Documentos</option>
                                        <option value="En Trámite">📤 En Trámite con la Aseguradora</option>
                                        <option value="Aprobada">✅ Aprobada / Aplicada por Compañía</option>
                                        <option value="Rechazada">❌ Rechazada / Cancelada</option>
                                    </select>
                                </div>

                                {selectedRequest.type === 'Cambio en Póliza' ? (
                                    <div>
                                        <label style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '0.4rem' }}>
                                            No. de Endoso Asignado
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="Ej. END-2026-8912"
                                            value={endorsementNumberInput}
                                            onChange={e => setEndorsementNumberInput(e.target.value)}
                                            style={{ width: '100%', padding: '0.6rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontWeight: '700' }}
                                        />
                                    </div>
                                ) : selectedRequest.type === 'Emisión' ? (
                                    <div>
                                        <label style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '0.4rem' }}>
                                            No. de Póliza Emitida
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="Ej. 1-2-500-0455123"
                                            value={newPolicyIdInput}
                                            onChange={e => setNewPolicyIdInput(e.target.value)}
                                            style={{ width: '100%', padding: '0.6rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontWeight: '700' }}
                                        />
                                    </div>
                                ) : null}
                            </div>

                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '0.4rem' }}>
                                    Notas y Respuesta de la Aseguradora
                                </label>
                                <textarea
                                    rows={2}
                                    placeholder="Comentarios del suscrito/oficial de cuentas, requisitos adicionales, número de caso..."
                                    value={insurerNotesInput}
                                    onChange={e => setInsurerNotesInput(e.target.value)}
                                    style={{ width: '100%', padding: '0.6rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}
                                />
                            </div>

                            {statusUpdate === 'Aprobada' && selectedRequest.type === 'Cancelación' && (
                                <div style={{ padding: '0.75rem 1rem', backgroundColor: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 'var(--radius-sm)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                    <input
                                        type="checkbox"
                                        id="applyCancellation"
                                        checked={applyPolicyChange}
                                        onChange={e => setApplyPolicyChange(e.target.checked)}
                                        style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                                    />
                                    <label htmlFor="applyCancellation" style={{ cursor: 'pointer', fontSize: '0.86rem', color: '#991b1b', fontWeight: '600' }}>
                                        Actualizar automáticamente el estado de la póliza <strong>{selectedRequest.policy}</strong> a <strong>"Cancelada"</strong> en la base de datos.
                                    </label>
                                </div>
                            )}

                            {statusUpdate === 'Aprobada' && selectedRequest.type === 'Cambio en Póliza' && (
                                <div style={{ padding: '0.75rem 1rem', backgroundColor: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: 'var(--radius-sm)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                    <input
                                        type="checkbox"
                                        id="applyEndorsement"
                                        checked={applyPolicyChange}
                                        onChange={e => setApplyPolicyChange(e.target.checked)}
                                        style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                                    />
                                    <label htmlFor="applyEndorsement" style={{ cursor: 'pointer', fontSize: '0.86rem', color: '#5b21b6', fontWeight: '600' }}>
                                        Registrar movimiento de endoso en el historial de la póliza <strong>{selectedRequest.policy}</strong>.
                                    </label>
                                </div>
                            )}

                            {/* Actions */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <button
                                    type="button"
                                    className="btn"
                                    onClick={() => handleDeleteRequest(selectedRequest)}
                                    style={{ color: '#dc2626', border: '1px solid #fca5a5', backgroundColor: '#fee2e2', fontSize: '0.85rem' }}
                                >
                                    <Trash2 size={14} /> Eliminar
                                </button>

                                <div style={{ display: 'flex', gap: '0.6rem' }}>
                                    <button
                                        type="button"
                                        className="btn"
                                        onClick={() => setSelectedRequest(null)}
                                        style={{ border: '1px solid var(--border)', backgroundColor: '#f8fafc' }}
                                    >
                                        Cerrar
                                    </button>
                                    <button
                                        type="submit"
                                        className="btn btn-primary"
                                        disabled={isSaving}
                                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '700' }}
                                    >
                                        <CheckCircle2 size={16} /> {isSaving ? 'Guardando...' : 'Guardar Estado'}
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RequestsManagement;
