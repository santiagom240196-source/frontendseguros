import React, { useState, useEffect, useMemo } from 'react';
import { 
    Search, Filter, MoreHorizontal, Eye, Edit, Trash2, Plus, X, Folder, 
    ExternalLink, Loader2, Shield, Calendar, DollarSign, ChevronRight, FileText,
    ShieldAlert, AlertTriangle, Briefcase, ArrowUpDown, ArrowUp, ArrowDown,
    Zap, CreditCard, Check
} from 'lucide-react';
import { DR_LOCATIONS, getSectors } from '../constants/locations';
import { getNextRenewalDate, calculatePolicyStatus, formatDateToDDMMYYYY, formatMoney, isOpenClaim, getClientClaims } from '../utils/policyHelpers';
import InsurerLogo from './InsurerLogo';
import { useUser } from '../context/UserContext';
import { insertClientHasura, updateClientHasura } from '../services/hasuraService';
import { getFolderMappings } from '../services/googleDrive';
import DocumentManager from './DocumentManager';
import { getAllClientDocuments } from '../services/documentsService';

const ALPHABET = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'Ñ', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', '#'];

const ClientList = ({ 
    clients = [], 
    setClients, 
    policies = [], 
    payments = [], 
    claims = [], 
    agentCodes = [], 
    onNavigateToPolicy, 
    onNavigateToClaim 
}) => {
    const { isDemo } = useUser();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCartera, setSelectedCartera] = useState('ALL');
    const [selectedLetter, setSelectedLetter] = useState('ALL');
    const [showModal, setShowModal] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [selectedClient, setSelectedClient] = useState(null);
    const [showViewModal, setShowViewModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);

    // Form State
    const [clientForm, setClientForm] = useState({
        name: '',
        personType: '',
        documentId: '',
        insurerCode: '',
        cartera: 'Santiago Morales y Asociados, S.R.L.',
        email: '',
        phone: '',
        address: '',
        city: '',
        sector: '',
        cobroAutomatico: false,
        metodoCobroAutomatico: 'Tarjeta de Crédito',
        diaCobroAutomatico: 15
    });

    const handleCreateClient = async (e) => {
        e.preventDefault();
        setIsCreating(true);

        try {
            if (isEditing && selectedClient) {
                // Update existing client
                const updatedClientObj = { ...selectedClient, ...clientForm };
                const updatedClients = clients.map(c =>
                    c.id === selectedClient.id ? updatedClientObj : c
                );
                setClients(updatedClients);
                setSelectedClient(updatedClientObj);

                if (!isDemo) {
                    try {
                        await updateClientHasura(selectedClient.id, clientForm, isDemo);
                    } catch (err) {
                        console.warn('Error updating client in Hasura:', err);
                    }
                }

                alert(`Cliente ${clientForm.name} actualizado con éxito.`);
            } else {
                // Create new client
                const clientToAdd = {
                    id: clients.length + 1,
                    ...clientForm,
                    status: 'Active',
                    folderLink: '#'
                };

                if (!isDemo) {
                    try {
                        const resC = await insertClientHasura(clientToAdd, isDemo);
                        if (resC?.data?.insert_clientes_one?.id) {
                            clientToAdd.id = resC.data.insert_clientes_one.id;
                        }
                    } catch (err) {
                        console.warn('Error inserting client in Hasura:', err);
                    }
                }

                setClients([clientToAdd, ...clients]);
                alert(`Cliente ${clientForm.name} creado con éxito para la cartera de ${clientForm.cartera}.`);
                setSelectedClient(null);
            }

            setShowModal(false);
            setClientForm({ name: '', personType: '', documentId: '', insurerCode: '', cartera: 'Santiago Morales y Asociados, S.R.L.', email: '', phone: '', address: '', city: '', sector: '', cobroAutomatico: false, metodoCobroAutomatico: 'Tarjeta de Crédito', diaCobroAutomatico: 15 });
            setIsEditing(false);

        } catch (error) {
            console.error("Error creating/updating client:", error);
            alert("Error al procesar la solicitud.");
        } finally {
            setIsCreating(false);
        }
    };

    const handleEditClient = (client) => {
        setSelectedClient(client);
        setClientForm({
            name: client.name || '',
            personType: client.personType || 'Física',
            documentId: client.documentId || '',
            insurerCode: client.insurerCode || client.agentCode || '',
            cartera: client.cartera || 'Santiago Morales y Asociados, S.R.L.',
            email: client.email || '',
            phone: client.phone || '',
            address: client.address || '',
            city: client.city || '',
            sector: client.sector || '',
            cobroAutomatico: !!client.cobroAutomatico,
            metodoCobroAutomatico: client.metodoCobroAutomatico || 'Tarjeta de Crédito',
            diaCobroAutomatico: client.diaCobroAutomatico || 15
        });
        setIsEditing(true);
        setShowViewModal(false);
        setShowModal(true);
    };

    const handleViewClient = (client) => {
        setSelectedClient(client);
        setShowViewModal(true);
    };

    const openCreateModal = () => {
        setClientForm({ name: '', personType: '', documentId: '', insurerCode: '', cartera: 'Santiago Morales y Asociados, S.R.L.', email: '', phone: '', address: '', city: '', sector: '', cobroAutomatico: false, metodoCobroAutomatico: 'Tarjeta de Crédito', diaCobroAutomatico: 15 });
        setIsEditing(false);
        setSelectedClient(null);
        setShowModal(true);
    };

    // Letter counts for the alphabet index bar
    const letterCounts = useMemo(() => {
        const counts = {};
        ALPHABET.forEach(l => { counts[l] = 0; });
        const filteredByCartera = clients.filter(c => {
            if (selectedCartera !== 'ALL') {
                const clCartera = c.cartera || 'Santiago Morales y Asociados, S.R.L.';
                return clCartera === selectedCartera;
            }
            return true;
        });
        filteredByCartera.forEach(c => {
            const rawName = (c.name || '').trim();
            if (!rawName) return;
            const firstChar = rawName.charAt(0).toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            if (firstChar >= 'A' && firstChar <= 'Z') {
                counts[firstChar] = (counts[firstChar] || 0) + 1;
            } else if (firstChar === 'Ñ') {
                counts['Ñ'] = (counts['Ñ'] || 0) + 1;
            } else {
                counts['#'] = (counts['#'] || 0) + 1;
            }
        });
        return counts;
    }, [clients, selectedCartera]);

    // Robust live search filter across all relevant client fields + alphabet letter
    const filteredClients = useMemo(() => {
        return clients.filter(client => {
            // Filter by Cartera
            if (selectedCartera !== 'ALL') {
                const clCartera = client.cartera || 'Santiago Morales y Asociados, S.R.L.';
                if (clCartera !== selectedCartera) return false;
            }

            // Filter by Alphabet Letter
            if (selectedLetter !== 'ALL') {
                const rawName = (client.name || '').trim();
                const firstChar = rawName.charAt(0).toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                if (selectedLetter === '#') {
                    if ((firstChar >= 'A' && firstChar <= 'Z') || firstChar === 'Ñ') {
                        return false;
                    }
                } else if (firstChar !== selectedLetter) {
                    return false;
                }
            }

            if (!searchTerm.trim()) return true;
            const term = searchTerm.toLowerCase().trim();
            return (
                (client.name || '').toLowerCase().includes(term) ||
                (client.email || '').toLowerCase().includes(term) ||
                (client.documentId || '').toLowerCase().includes(term) ||
                (client.phone || '').toLowerCase().includes(term) ||
                (client.insurerCode || '').toLowerCase().includes(term) ||
                (client.cartera || '').toLowerCase().includes(term) ||
                (client.agentCode || '').toLowerCase().includes(term) ||
                (client.city || '').toLowerCase().includes(term) ||
                (client.sector || '').toLowerCase().includes(term) ||
                (client.policy || '').toLowerCase().includes(term)
            );
        });
    }, [clients, selectedCartera, selectedLetter, searchTerm]);

    // Match client policies by clienteId (Hasura PK/FK) AND by normalized client name
    const getClientPolicies = (client) => {
        if (!client) return [];
        const clientNameNorm = (client.name || '').trim().toLowerCase();
        return policies.filter(p => {
            if (p.clienteId !== undefined && p.clienteId !== null && String(p.clienteId) === String(client.id)) {
                return true;
            }
            if (p.client && p.client.trim().toLowerCase() === clientNameNorm) {
                return true;
            }
            return false;
        });
    };

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

    const sortedClients = useMemo(() => {
        if (!sortConfig.key) return filteredClients;
        return [...filteredClients].sort((a, b) => {
            let valA = a[sortConfig.key];
            let valB = b[sortConfig.key];

            if (sortConfig.key === 'policiesCount') {
                valA = getClientPolicies(a).length;
                valB = getClientPolicies(b).length;
            }

            if (typeof valA === 'number' && typeof valB === 'number') {
                return sortConfig.direction === 'asc' ? valA - valB : valB - valA;
            }

            const strA = String(valA || '').toLowerCase();
            const strB = String(valB || '').toLowerCase();
            return sortConfig.direction === 'asc' ? strA.localeCompare(strB, 'es') : strB.localeCompare(strA, 'es');
        });
    }, [filteredClients, sortConfig, policies]);

    const clientExtraDocs = useMemo(() => {
        if (!selectedClient) return [];
        return getAllClientDocuments(selectedClient, payments);
    }, [selectedClient, payments]);

    const renderViewClientModalContent = () => {
        if (!showViewModal || !selectedClient) return null;

        const clientPolicies = getClientPolicies(selectedClient) || [];
        const clientClaims = getClientClaims(selectedClient, claims, policies) || [];
        const clientOpenClaims = clientClaims.filter(isOpenClaim);
        const clientName = selectedClient.name || 'Cliente';
        const clientInitial = (clientName.trim().charAt(0) || 'C').toUpperCase();

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
                <div className="card" style={{ width: '100%', maxWidth: '720px', backgroundColor: 'white', position: 'relative', maxHeight: '90vh', overflowY: 'auto', borderRadius: 'var(--radius-lg)' }}>
                    <div style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <button
                            className="btn btn-primary"
                            onClick={() => handleEditClient(selectedClient)}
                            style={{
                                padding: '0.4rem 0.85rem',
                                fontSize: '0.84rem',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.35rem',
                                borderRadius: 'var(--radius-sm)'
                            }}
                            title="Editar datos del cliente"
                        >
                            <Edit size={15} /> Editar Cliente
                        </button>
                        <button
                            onClick={() => setShowViewModal(false)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', padding: '4px' }}
                            title="Cerrar"
                        >
                            <X size={22} />
                        </button>
                    </div>

                    {/* Alerta de Siniestro Abierto para el Cliente */}
                    {clientOpenClaims.length > 0 && (
                        <div style={{
                            backgroundColor: '#fef2f2',
                            border: '1.5px solid #fca5a5',
                            borderRadius: 'var(--radius-md)',
                            padding: '1rem 1.25rem',
                            marginBottom: '1.25rem',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            gap: '1rem',
                            flexWrap: 'wrap',
                            boxShadow: '0 2px 6px rgba(220, 38, 38, 0.08)'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <div style={{
                                    width: '36px',
                                    height: '36px',
                                    borderRadius: '50%',
                                    backgroundColor: '#fee2e2',
                                    color: '#dc2626',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0
                                }}>
                                    <ShieldAlert size={20} />
                                </div>
                                <div>
                                    <strong style={{ color: '#991b1b', fontSize: '0.98rem', display: 'block' }}>
                                        🚨 Este cliente tiene {clientOpenClaims.length} siniestro(s) en trámite
                                    </strong>
                                    <span style={{ fontSize: '0.82rem', color: '#7f1d1d' }}>
                                        {clientOpenClaims.map(c => `${c.id} (${c.type || 'General'})`).join(' · ')}
                                    </span>
                                </div>
                            </div>
                            {onNavigateToClaim && (
                                <button
                                    className="btn"
                                    onClick={() => {
                                        setShowViewModal(false);
                                        onNavigateToClaim();
                                    }}
                                    style={{
                                        backgroundColor: '#dc2626',
                                        color: 'white',
                                        fontWeight: '700',
                                        fontSize: '0.82rem',
                                        padding: '0.45rem 0.9rem',
                                        boxShadow: '0 2px 4px rgba(220, 38, 38, 0.3)'
                                    }}
                                >
                                    Ver en Siniestros
                                </button>
                            )}
                        </div>
                    )}

                    {/* Client Header Card */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '1.25rem' }}>
                        <div style={{
                            width: '64px', height: '64px', borderRadius: '50%', backgroundColor: '#e0f2fe', color: '#0369a1',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                            fontSize: '1.8rem', fontWeight: 'bold'
                        }}>
                            {clientInitial}
                        </div>
                        <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                                <h2 style={{ margin: 0, color: 'var(--primary)', fontSize: '1.5rem' }}>{clientName}</h2>
                                <span style={{
                                    fontSize: '0.75rem',
                                    padding: '0.15rem 0.5rem',
                                    borderRadius: '999px',
                                    backgroundColor: selectedClient.personType === 'Jurídica' ? '#f3e8ff' : '#e0f2fe',
                                    color: selectedClient.personType === 'Jurídica' ? '#6b21a8' : '#0369a1',
                                    fontWeight: '600'
                                }}>
                                    {selectedClient.personType || 'Física'}
                                </span>
                                <span style={{
                                    fontSize: '0.75rem',
                                    padding: '0.15rem 0.5rem',
                                    borderRadius: '999px',
                                    fontWeight: '600',
                                    backgroundColor: selectedClient.status === 'Active' ? '#dcfce7' : selectedClient.status === 'Pending' ? '#fef9c3' : '#fee2e2',
                                    color: selectedClient.status === 'Active' ? '#166534' : selectedClient.status === 'Pending' ? '#854d0e' : '#991b1b'
                                }}>
                                    {selectedClient.status === 'Active' ? 'Activo' : selectedClient.status === 'Pending' ? 'Pendiente' : 'Expirado'}
                                </span>
                            </div>
                            <p style={{ margin: '0.25rem 0 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                {selectedClient.documentId ? `${selectedClient.personType === 'Jurídica' ? 'RNC' : 'Cédula'}: ${selectedClient.documentId}` : ''}
                                {selectedClient.email ? ` · ${selectedClient.email}` : ''}
                                {selectedClient.phone ? ` · Tel: ${selectedClient.phone}` : ''}
                            </p>
                        </div>
                    </div>

                    {/* Contact Details Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
                        <div style={{ padding: '0.75rem', backgroundColor: '#eff6ff', borderRadius: 'var(--radius-sm)', border: '1px solid #bfdbfe' }}>
                            <label style={{ fontSize: '0.72rem', color: '#1e40af', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '0.3rem', fontWeight: '700' }}>
                                <Briefcase size={12} /> Cartera de Agente
                            </label>
                            <div style={{ fontWeight: '700', color: '#1e3a8a', marginTop: '0.2rem', fontSize: '0.9rem' }}>
                                {selectedClient.cartera || 'Santiago Morales y Asociados, S.R.L.'}
                            </div>
                        </div>
                        <div style={{ padding: '0.75rem', backgroundColor: '#f8fafc', borderRadius: 'var(--radius-sm)', border: '1px solid #f1f5f9' }}>
                            <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block' }}>Código en Aseguradora</label>
                            <div style={{ fontWeight: '700', color: 'var(--primary)', marginTop: '0.2rem' }}>{selectedClient.insurerCode || selectedClient.agentCode || 'N/A'}</div>
                        </div>
                        <div style={{ padding: '0.75rem', backgroundColor: '#f8fafc', borderRadius: 'var(--radius-sm)', border: '1px solid #f1f5f9' }}>
                            <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block' }}>Ubicación</label>
                            <div style={{ fontWeight: '600', color: 'var(--text-main)', marginTop: '0.2rem', fontSize: '0.88rem' }}>
                                {selectedClient.city || 'Santo Domingo'}{selectedClient.sector ? `, ${selectedClient.sector}` : ''}
                            </div>
                        </div>
                        <div style={{ padding: '0.75rem', backgroundColor: selectedClient.cobroAutomatico ? '#f0fdf4' : '#f8fafc', borderRadius: 'var(--radius-sm)', border: selectedClient.cobroAutomatico ? '1px solid #86efac' : '1px solid #f1f5f9' }}>
                            <label style={{ fontSize: '0.72rem', color: selectedClient.cobroAutomatico ? '#15803d' : 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '0.3rem', fontWeight: '700' }}>
                                {selectedClient.cobroAutomatico ? <Zap size={12} color="#16a34a" /> : <DollarSign size={12} color="#64748b" />}
                                Modalidad de Cobro
                            </label>
                            <div style={{ fontWeight: '700', color: selectedClient.cobroAutomatico ? '#166534' : 'var(--text-main)', marginTop: '0.2rem', fontSize: '0.86rem' }}>
                                {selectedClient.cobroAutomatico 
                                    ? `⚡ Débito Auto (${selectedClient.metodoCobroAutomatico || 'Tarjeta'}, Día ${selectedClient.diaCobroAutomatico || 15})`
                                    : '✋ Cobro Manual (Por Defecto)'}
                            </div>
                        </div>
                        <div style={{ padding: '0.75rem', backgroundColor: '#f8fafc', borderRadius: 'var(--radius-sm)', border: '1px solid #f1f5f9' }}>
                            <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block' }}>Total Pólizas</label>
                            <div style={{ fontWeight: '700', color: '#2563eb', marginTop: '0.2rem' }}>{clientPolicies.length} registrada(s)</div>
                        </div>
                    </div>

                    {/* Policies List Section */}
                    <div style={{ marginBottom: '1.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                            <h3 style={{ fontSize: '1.15rem', color: 'var(--primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Shield size={20} /> Pólizas del Cliente ({clientPolicies.length})
                            </h3>
                        </div>

                        {clientPolicies.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                {clientPolicies.map(p => {
                                    const computedStatus = calculatePolicyStatus(p, payments);
                                    const nextRenewal = p.endDate || p.renewal || getNextRenewalDate(p.lastRenewalDate || p.startDate, p.renewalFrequency) || 'N/A';
                                    return (
                                        <div 
                                            key={p.id}
                                            style={{
                                                backgroundColor: 'white',
                                                border: '1.5px solid var(--border)',
                                                borderRadius: 'var(--radius-md)',
                                                padding: '1rem',
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                gap: '1rem',
                                                boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                                                transition: 'all 0.15s'
                                            }}
                                        >
                                            <div style={{ flex: 1 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem', flexWrap: 'wrap' }}>
                                                    <InsurerLogo name={p.insurer} size={20} />
                                                    <span style={{ fontWeight: '700', fontSize: '1rem', color: 'var(--primary)' }}>{p.id}</span>
                                                    <span style={{
                                                        fontSize: '0.75rem',
                                                        padding: '0.15rem 0.5rem',
                                                        borderRadius: '999px',
                                                        fontWeight: '600',
                                                        backgroundColor: computedStatus === 'Active' ? '#dcfce7' : computedStatus === 'Pending' ? '#fef9c3' : computedStatus === 'Expiring' ? '#fffbeb' : '#fee2e2',
                                                        color: computedStatus === 'Active' ? '#166534' : computedStatus === 'Pending' ? '#854d0e' : computedStatus === 'Expiring' ? '#9a3412' : '#991b1b'
                                                    }}>
                                                        {computedStatus === 'Active' ? 'Vigente' : computedStatus === 'Pending' ? 'Pendiente' : computedStatus === 'Expiring' ? 'Por Vencer' : 'Vencida'}
                                                    </span>
                                                </div>

                                                <div style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--text-main)', marginBottom: '0.25rem' }}>
                                                    {p.type} · <span style={{ color: 'var(--text-muted)', fontWeight: '400' }}>{p.insurer}</span>
                                                </div>

                                                <div style={{ display: 'flex', gap: '1.25rem', fontSize: '0.82rem', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                                                    <div>Inicio Original: <strong style={{ color: 'var(--text-main)' }}>{formatDateToDDMMYYYY(p.startDate)}</strong></div>
                                                    <div>Última Renovación: <strong style={{ color: 'var(--text-main)' }}>{formatDateToDDMMYYYY(p.lastRenewalDate || p.startDate)}</strong></div>
                                                    <div>Próxima Renovación: <strong style={{ color: 'var(--text-main)' }}>{formatDateToDDMMYYYY(nextRenewal)}</strong></div>
                                                    <div>Prima: <strong style={{ color: 'var(--text-main)' }}>{formatMoney(p.amount, p.currency)}</strong> ({p.renewalFrequency || 'Anual'})</div>
                                                </div>
                                            </div>

                                            <button
                                                onClick={() => {
                                                    setShowViewModal(false);
                                                    if (onNavigateToPolicy) onNavigateToPolicy(p.id);
                                                }}
                                                className="btn"
                                                style={{
                                                    padding: '0.5rem 0.85rem',
                                                    backgroundColor: '#eff6ff',
                                                    color: '#1d4ed8',
                                                    border: '1px solid #bfdbfe',
                                                    fontSize: '0.85rem',
                                                    fontWeight: '600',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '0.35rem',
                                                    whiteSpace: 'nowrap'
                                                }}
                                                title="Ver detalles completos de la póliza"
                                            >
                                                Ver Póliza <ChevronRight size={16} />
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div style={{ padding: '2rem', textAlign: 'center', backgroundColor: '#f8fafc', borderRadius: 'var(--radius-md)', border: '1px dashed var(--border)', color: 'var(--text-muted)' }}>
                                Este cliente no tiene pólizas registradas actualmente.
                            </div>
                        )}
                    </div>

                    {/* Siniestros del Cliente */}
                    <div style={{ marginBottom: '1.5rem', borderTop: '1px solid var(--border)', paddingTop: '1.25rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                            <h3 style={{ fontSize: '1.15rem', color: 'var(--primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Shield size={20} color="#dc2626" /> Siniestros y Reclamaciones ({clientClaims.length})
                            </h3>
                            {onNavigateToClaim && (
                                <button
                                    onClick={() => {
                                        setShowViewModal(false);
                                        onNavigateToClaim();
                                    }}
                                    className="btn"
                                    style={{
                                        padding: '0.3rem 0.7rem',
                                        backgroundColor: 'white',
                                        border: '1px solid var(--border)',
                                        fontSize: '0.8rem',
                                        fontWeight: '600',
                                        color: 'var(--primary)'
                                    }}
                                >
                                    Ver todos
                                </button>
                            )}
                        </div>
                        {clientClaims.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {clientClaims.map(c => {
                                    const isOpen = isOpenClaim(c);
                                    return (
                                        <div key={c.id} style={{
                                            padding: '0.75rem 1rem',
                                            backgroundColor: isOpen ? '#fffafa' : '#f8fafc',
                                            border: isOpen ? '1px solid #fca5a5' : '1px solid #e2e8f0',
                                            borderRadius: 'var(--radius-sm)',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            gap: '1rem'
                                        }}>
                                            <div>
                                                <div style={{ fontWeight: '700', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    {isOpen && <ShieldAlert size={14} color="#dc2626" />}
                                                    <span>{c.id} · {c.type}</span>
                                                    <span style={{
                                                        fontSize: '0.72rem',
                                                        padding: '0.1rem 0.45rem',
                                                        borderRadius: '999px',
                                                        fontWeight: '700',
                                                        backgroundColor: isOpen ? '#fee2e2' : '#dcfce7',
                                                        color: isOpen ? '#991b1b' : '#166534'
                                                    }}>
                                                        {c.status || (isOpen ? 'Abierto' : 'Cerrado')}
                                                    </span>
                                                </div>
                                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                                                    Póliza: {c.policy || 'General'} · Fecha: {formatDateToDDMMYYYY(c.date || c.reportDate)}
                                                </div>
                                            </div>
                                            <div style={{ textAlign: 'right', fontWeight: '700', color: 'var(--text-main)', fontSize: '0.95rem' }}>
                                                {c.amount || 'N/A'}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', fontStyle: 'italic', margin: 0 }}>
                                Este cliente no tiene siniestros registrados.
                            </p>
                        )}
                    </div>

                    {/* Expediente y Documentos del Cliente */}
                    <div style={{ marginBottom: '1.5rem', borderTop: '1px solid var(--border)', paddingTop: '1.25rem' }}>
                        <div style={{ marginBottom: '1rem' }}>
                            <h3 style={{ fontSize: '1.15rem', color: 'var(--primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <FileText size={20} color="#2563eb" /> Expediente y Documentos del Cliente
                            </h3>
                            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                                Cédula, licencia de conducir, contratos, pasaporte y recibos oficiales emitidos a este cliente.
                            </span>
                        </div>
                        <DocumentManager
                            entityType="client"
                            entityId={selectedClient.id}
                            entityTitle={selectedClient.name}
                            extraDocuments={clientExtraDocs}
                        />
                    </div>

                    {/* Footer Actions */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
                        {selectedClient.folderLink && selectedClient.folderLink !== '#' ? (
                            <a
                                href={selectedClient.folderLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn"
                                style={{ border: '1px solid var(--border)', backgroundColor: 'white', display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#2563eb' }}
                            >
                                <Folder size={18} /> Carpeta en Drive
                            </a>
                        ) : <div />}

                        <button
                            onClick={() => setShowViewModal(false)}
                            className="btn btn-primary"
                            style={{ padding: '0.5rem 1.25rem' }}
                        >
                            Cerrar
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h2 style={{ fontSize: '2rem', color: 'var(--primary)' }}>Gestión de Clientes</h2>
                    <p style={{ color: 'var(--text-muted)' }}>Administra la base de datos de clientes y sus pólizas asociadas.</p>
                </div>
                <button
                    className="btn btn-primary"
                    onClick={openCreateModal}
                    title="Crear nuevo cliente"
                >
                    <Plus size={20} /> Nuevo Cliente
                </button>
            </div>

            <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
                {/* Toolbar */}
                <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flex: 1, minWidth: '300px' }}>
                        <div style={{ position: 'relative', flex: 1, maxWidth: '380px' }}>
                            <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={20} />
                            <input
                                type="text"
                                placeholder="Buscar cliente, cédula/RNC, código, teléfono..."
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
                                    <X size={16} />
                                </button>
                            )}
                        </div>

                        {/* Filtro por Cartera */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <select
                                value={selectedCartera}
                                onChange={(e) => {
                                    setSelectedCartera(e.target.value);
                                    setSelectedLetter('ALL');
                                }}
                                style={{
                                    padding: '0.5rem 0.85rem',
                                    borderRadius: 'var(--radius-md)',
                                    border: selectedCartera !== 'ALL' ? '1.5px solid #2563eb' : '1px solid var(--border)',
                                    fontSize: '0.88rem',
                                    fontWeight: '600',
                                    backgroundColor: selectedCartera !== 'ALL' ? '#eff6ff' : 'white',
                                    color: selectedCartera !== 'ALL' ? '#1d4ed8' : 'var(--text-main)',
                                    cursor: 'pointer',
                                    boxShadow: selectedCartera !== 'ALL' ? '0 1px 3px rgba(37, 99, 235, 0.2)' : 'none'
                                }}
                            >
                                <option value="ALL">💼 Todas las Carteras ({clients.length})</option>
                                <option value="Santiago Morales y Asociados, S.R.L.">💼 Santiago Morales y Asoc.</option>
                                <option value="Raquel Rodríguez">💼 Raquel Rodríguez</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Barra de Abecedario (Directorio Alfabético Rápido) */}
                <div style={{
                    padding: '0.65rem 1.25rem',
                    backgroundColor: '#f8fafc',
                    borderBottom: '1px solid var(--border)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    flexWrap: 'wrap',
                    userSelect: 'none'
                }}>
                    <span style={{
                        fontSize: '0.75rem',
                        fontWeight: '700',
                        color: 'var(--text-muted)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                        marginRight: '0.35rem'
                    }}>
                        Abecedario:
                    </span>

                    {/* Botón Todos */}
                    <button
                        onClick={() => setSelectedLetter('ALL')}
                        style={{
                            padding: '0.2rem 0.6rem',
                            borderRadius: '999px',
                            fontSize: '0.76rem',
                            fontWeight: '700',
                            border: selectedLetter === 'ALL' ? '1.5px solid #2563eb' : '1px solid #cbd5e1',
                            backgroundColor: selectedLetter === 'ALL' ? '#2563eb' : 'white',
                            color: selectedLetter === 'ALL' ? 'white' : 'var(--text-main)',
                            cursor: 'pointer',
                            boxShadow: selectedLetter === 'ALL' ? '0 2px 5px rgba(37, 99, 235, 0.25)' : 'none',
                            transition: 'all 0.15s ease'
                        }}
                    >
                        Todos ({clients.filter(c => selectedCartera === 'ALL' || (c.cartera || 'Santiago Morales y Asociados, S.R.L.') === selectedCartera).length})
                    </button>

                    {/* Letras A-Z */}
                    <div style={{ display: 'flex', gap: '0.2rem', alignItems: 'center', flexWrap: 'wrap' }}>
                        {ALPHABET.map(letter => {
                            const count = letterCounts[letter] || 0;
                            const isSelected = selectedLetter === letter;
                            const hasClients = count > 0;

                            return (
                                <button
                                    key={letter}
                                    onClick={() => {
                                        if (hasClients) {
                                            setSelectedLetter(isSelected ? 'ALL' : letter);
                                        }
                                    }}
                                    disabled={!hasClients}
                                    title={hasClients ? `Letra ${letter}: ${count} cliente(s)` : `Sin clientes con la letra ${letter}`}
                                    style={{
                                        minWidth: '25px',
                                        height: '25px',
                                        padding: '0 0.3rem',
                                        borderRadius: '5px',
                                        fontSize: '0.78rem',
                                        fontWeight: isSelected ? '800' : hasClients ? '600' : '400',
                                        border: isSelected ? '1.5px solid #2563eb' : '1px solid transparent',
                                        backgroundColor: isSelected ? '#2563eb' : hasClients ? 'white' : 'transparent',
                                        color: isSelected ? 'white' : hasClients ? '#0f172a' : '#cbd5e1',
                                        cursor: hasClients ? 'pointer' : 'default',
                                        boxShadow: isSelected ? '0 2px 6px rgba(37, 99, 235, 0.3)' : hasClients ? '0 1px 2px rgba(0,0,0,0.04)' : 'none',
                                        transition: 'all 0.15s ease',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}
                                >
                                    {letter}
                                </button>
                            );
                        })}
                    </div>

                    {/* Tag de filtro activo */}
                    {selectedLetter !== 'ALL' && (
                        <div style={{
                            marginLeft: 'auto',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            fontSize: '0.78rem',
                            color: '#1d4ed8',
                            backgroundColor: '#eff6ff',
                            padding: '0.2rem 0.6rem',
                            borderRadius: '999px',
                            border: '1px solid #bfdbfe'
                        }}>
                            <span>Letra <strong>"{selectedLetter}"</strong>: {filteredClients.length} cliente(s)</span>
                            <button
                                onClick={() => setSelectedLetter('ALL')}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: '#1d4ed8',
                                    cursor: 'pointer',
                                    padding: '0 2px',
                                    display: 'flex',
                                    alignItems: 'center'
                                }}
                                title="Quitar filtro de letra"
                            >
                                <X size={13} />
                            </button>
                        </div>
                    )}
                </div>

                {/* Table */}
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid var(--border)' }}>
                                <th
                                    onClick={() => handleSort('name')}
                                    style={{ padding: '1rem', textAlign: 'left', color: sortConfig.key === 'name' ? '#2563eb' : 'var(--text-muted)', fontWeight: '600', cursor: 'pointer', userSelect: 'none' }}
                                    title="Hacer clic para ordenar por Nombre / Cartera"
                                >
                                    <div style={{ display: 'flex', alignItems: 'center' }}>
                                        <span>Nombre / Cartera</span>
                                        {renderSortIcon('name')}
                                    </div>
                                </th>
                                <th
                                    onClick={() => handleSort('email')}
                                    style={{ padding: '1rem', textAlign: 'left', color: sortConfig.key === 'email' ? '#2563eb' : 'var(--text-muted)', fontWeight: '600', cursor: 'pointer', userSelect: 'none' }}
                                    title="Hacer clic para ordenar por Contacto"
                                >
                                    <div style={{ display: 'flex', alignItems: 'center' }}>
                                        <span>Contacto</span>
                                        {renderSortIcon('email')}
                                    </div>
                                </th>
                                <th
                                    onClick={() => handleSort('policiesCount')}
                                    style={{ padding: '1rem', textAlign: 'left', color: sortConfig.key === 'policiesCount' ? '#2563eb' : 'var(--text-muted)', fontWeight: '600', cursor: 'pointer', userSelect: 'none' }}
                                    title="Hacer clic para ordenar por Cantidad de Pólizas"
                                >
                                    <div style={{ display: 'flex', alignItems: 'center' }}>
                                        <span>Pólizas Asociadas</span>
                                        {renderSortIcon('policiesCount')}
                                    </div>
                                </th>
                                <th
                                    onClick={() => handleSort('status')}
                                    style={{ padding: '1rem', textAlign: 'left', color: sortConfig.key === 'status' ? '#2563eb' : 'var(--text-muted)', fontWeight: '600', cursor: 'pointer', userSelect: 'none' }}
                                    title="Hacer clic para ordenar por Estado"
                                >
                                    <div style={{ display: 'flex', alignItems: 'center' }}>
                                        <span>Estado</span>
                                        {renderSortIcon('status')}
                                    </div>
                                </th>
                                <th style={{ padding: '1rem', textAlign: 'left', color: 'var(--text-muted)', fontWeight: '600' }}>Drive</th>
                                <th style={{ padding: '1rem', textAlign: 'right', color: 'var(--text-muted)', fontWeight: '600' }}>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedClients.length === 0 ? (
                                <tr>
                                    <td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                        No se encontraron clientes que coincidan con "<strong>{searchTerm}</strong>".
                                    </td>
                                </tr>
                            ) : (
                                sortedClients.map((client) => {
                                    const clientPolicies = getClientPolicies(client);
                                    const clientClaims = getClientClaims(client, claims, policies);
                                    const clientOpenClaims = clientClaims.filter(isOpenClaim);

                                    return (
                                        <tr key={client.id} style={{ 
                                            borderBottom: '1px solid var(--border)',
                                            backgroundColor: clientOpenClaims.length > 0 ? '#fffdfd' : 'transparent'
                                        }}>
                                            <td style={{ padding: '1rem' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                                    <div style={{ fontWeight: '600', color: 'var(--text-main)', fontSize: '0.98rem' }}>{client.name}</div>
                                                    {client.personType && (
                                                        <span style={{
                                                            fontSize: '0.7rem',
                                                            padding: '0.1rem 0.4rem',
                                                            borderRadius: '4px',
                                                            backgroundColor: client.personType === 'Jurídica' ? '#f3e8ff' : '#e0f2fe',
                                                            color: client.personType === 'Jurídica' ? '#6b21a8' : '#0369a1',
                                                            fontWeight: '600'
                                                        }}>
                                                            {client.personType}
                                                        </span>
                                                    )}
                                                    {clientOpenClaims.length > 0 && (
                                                        <span style={{
                                                            fontSize: '0.72rem',
                                                            padding: '0.12rem 0.5rem',
                                                            borderRadius: '999px',
                                                            backgroundColor: '#fee2e2',
                                                            color: '#dc2626',
                                                            border: '1px solid #fca5a5',
                                                            fontWeight: '800',
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: '0.25rem',
                                                            boxShadow: '0 1px 2px rgba(220, 38, 38, 0.1)'
                                                        }}
                                                        title={`Este cliente tiene ${clientOpenClaims.length} siniestro(s) en trámite: ${clientOpenClaims.map(c => `${c.id} (${c.type})`).join(', ')}`}>
                                                            <ShieldAlert size={12} /> Siniestro Abierto ({clientOpenClaims.length})
                                                        </span>
                                                    )}
                                                </div>
                                                <div style={{ marginTop: '0.3rem', display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
                                                    <span style={{
                                                        fontSize: '0.72rem',
                                                        padding: '0.12rem 0.5rem',
                                                        borderRadius: '999px',
                                                        fontWeight: '700',
                                                        backgroundColor: (client.cartera || '').toLowerCase().includes('raquel') ? '#fdf4ff' : '#eff6ff',
                                                        color: (client.cartera || '').toLowerCase().includes('raquel') ? '#86198f' : '#1e40af',
                                                        border: (client.cartera || '').toLowerCase().includes('raquel') ? '1px solid #f0abfc' : '1px solid #bfdbfe',
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '0.25rem'
                                                    }}>
                                                        <Briefcase size={11} />
                                                        {(client.cartera || '').toLowerCase().includes('raquel') ? 'Raquel Rodríguez' : 'Santiago Morales & Asoc.'}
                                                        {client.insurerCode ? ` · Cód: ${client.insurerCode}` : ''}
                                                    </span>

                                                    {client.cobroAutomatico ? (
                                                        <span style={{
                                                            fontSize: '0.72rem',
                                                            padding: '0.12rem 0.5rem',
                                                            borderRadius: '999px',
                                                            fontWeight: '700',
                                                            backgroundColor: '#ecfdf5',
                                                            color: '#047857',
                                                            border: '1px solid #a7f3d0',
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: '0.25rem'
                                                        }} title={`Cobro Automático Activo: ${client.metodoCobroAutomatico || 'Tarjeta de Crédito'} (Día ${client.diaCobroAutomatico || 15} de cada mes)`}>
                                                            <Zap size={11} /> Débito Auto (Día {client.diaCobroAutomatico || 15})
                                                        </span>
                                                    ) : (
                                                        <span style={{
                                                            fontSize: '0.72rem',
                                                            padding: '0.12rem 0.5rem',
                                                            borderRadius: '999px',
                                                            fontWeight: '600',
                                                            backgroundColor: '#f8fafc',
                                                            color: '#64748b',
                                                            border: '1px solid #e2e8f0',
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: '0.25rem'
                                                        }} title="Cobro Manual: Los pagos deben registrarse de forma manual">
                                                            ✋ Cobro Manual
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td style={{ padding: '1rem' }}>
                                                <div style={{ fontSize: '0.9rem' }}>{client.email}</div>
                                                <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>{client.phone}</div>
                                                {client.city && <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>{(client.address) ? `${client.address}, ` : ''}{client.sector ? `${client.sector}, ` : ''}{client.city}</div>}
                                            </td>
                                            <td style={{ padding: '1rem' }}>
                                                {clientPolicies.length > 0 ? (
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', maxWidth: '340px' }}>
                                                        {clientPolicies.slice(0, 3).map(p => {
                                                            const computedStatus = calculatePolicyStatus(p, payments);
                                                            return (
                                                                <button
                                                                    key={p.id}
                                                                    onClick={() => onNavigateToPolicy && onNavigateToPolicy(p.id)}
                                                                    style={{
                                                                        textAlign: 'left',
                                                                        background: '#f8fafc',
                                                                        border: '1px solid #e2e8f0',
                                                                        borderRadius: '6px',
                                                                        padding: '0.35rem 0.6rem',
                                                                        cursor: 'pointer',
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        justifyContent: 'space-between',
                                                                        gap: '0.5rem',
                                                                        transition: 'all 0.15s'
                                                                    }}
                                                                    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#eff6ff'}
                                                                    onMouseLeave={e => e.currentTarget.style.backgroundColor = '#f8fafc'}
                                                                    title={`Ver detalles de la póliza ${p.id}`}
                                                                >
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.82rem', overflow: 'hidden' }}>
                                                                        <InsurerLogo name={p.insurer} size={16} />
                                                                        <span style={{ fontWeight: '700', color: 'var(--primary)', whiteSpace: 'nowrap' }}>{p.id}</span>
                                                                        <span style={{ color: 'var(--text-muted)' }}>·</span>
                                                                        <span style={{ fontWeight: '500', color: 'var(--text-main)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{p.type}</span>
                                                                    </div>
                                                                    <span style={{
                                                                        fontSize: '0.7rem',
                                                                        padding: '0.1rem 0.4rem',
                                                                        borderRadius: '999px',
                                                                        fontWeight: '600',
                                                                        whiteSpace: 'nowrap',
                                                                        backgroundColor: computedStatus === 'Active' ? '#dcfce7' : computedStatus === 'Pending' ? '#fef9c3' : '#fee2e2',
                                                                        color: computedStatus === 'Active' ? '#166534' : computedStatus === 'Pending' ? '#854d0e' : '#991b1b'
                                                                    }}>
                                                                        {computedStatus === 'Active' ? 'Vigente' : computedStatus === 'Pending' ? 'Pendiente' : 'Vencida'}
                                                                    </span>
                                                                </button>
                                                            );
                                                        })}
                                                        {clientPolicies.length > 3 && (
                                                            <button
                                                                onClick={() => handleViewClient(client)}
                                                                style={{
                                                                    background: 'none',
                                                                    border: 'none',
                                                                    color: '#2563eb',
                                                                    fontSize: '0.78rem',
                                                                    fontWeight: '600',
                                                                    textAlign: 'left',
                                                                    cursor: 'pointer',
                                                                    padding: '0.1rem 0.4rem'
                                                                }}
                                                            >
                                                                + Ver {clientPolicies.length - 3} póliza(s) más...
                                                            </button>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.85rem' }}>Sin pólizas registradas</span>
                                                )}
                                            </td>
                                            <td style={{ padding: '1rem' }}>
                                                <span style={{
                                                    padding: '0.25rem 0.75rem',
                                                    borderRadius: '999px',
                                                    fontSize: '0.85rem',
                                                    fontWeight: '600',
                                                    backgroundColor: client.status === 'Active' ? '#dcfce7' : client.status === 'Pending' ? '#fef9c3' : '#fee2e2',
                                                    color: client.status === 'Active' ? '#166534' : client.status === 'Pending' ? '#854d0e' : '#991b1b'
                                                }}>
                                                    {client.status === 'Active' ? 'Activo' : client.status === 'Pending' ? 'Pendiente' : 'Expirado'}
                                                </span>
                                            </td>
                                            <td style={{ padding: '1rem' }}>
                                                {(() => {
                                                    const mappings = getFolderMappings();
                                                    const clientDriveLink = mappings?.clients?.[client.id]?.webViewLink || mappings?.clients?.[client.name]?.webViewLink || (client.folderLink && client.folderLink !== '#' ? client.folderLink : null);
                                                    return clientDriveLink ? (
                                                        <a href={clientDriveLink} target="_blank" rel="noopener noreferrer" className="btn" style={{ padding: '0.4rem', color: '#2563eb', display: 'inline-flex', alignItems: 'center' }} title={`Abrir carpeta de ${client.name} en Google Drive`}>
                                                            <Folder size={18} />
                                                        </a>
                                                    ) : (
                                                        <span style={{ color: '#cbd5e1' }} title="Sin carpeta sincronizada en Drive">-</span>
                                                    );
                                                })()}
                                            </td>
                                            <td style={{ padding: '1rem', textAlign: 'right' }}>
                                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                                                    <button className="btn" onClick={() => handleViewClient(client)} style={{ padding: '0.5rem', color: 'var(--primary)' }} title="Ver detalles y pólizas">
                                                        <Eye size={18} />
                                                    </button>
                                                    <button className="btn" onClick={() => handleEditClient(client)} style={{ padding: '0.5rem', color: 'var(--text-muted)' }} title="Editar">
                                                        <Edit size={18} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                }))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Create/Edit Client Modal */}
            {showModal && (
                <div style={{
                    position: 'fixed',
                    top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000
                }}>
                    <div className="card" style={{ width: '100%', maxWidth: '500px', backgroundColor: 'white', maxHeight: '90vh', overflowY: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', position: 'sticky', top: 0, background: 'white', zIndex: 10, paddingBottom: '10px' }}>
                            <h3 style={{ margin: 0 }}>{isEditing ? 'Editar Cliente' : 'Nuevo Cliente'}</h3>
                            <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', padding: '0.5rem', cursor: 'pointer' }}>
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleCreateClient}>
                            <div style={{ marginBottom: '1rem' }}>
                                <label>Nombre Completo / Razón Social</label>
                                <input
                                    required
                                    type="text"
                                    value={clientForm.name}
                                    onChange={e => setClientForm({ ...clientForm, name: e.target.value })}
                                    placeholder="Ej. Juan Pérez o Empresa SRL"
                                />
                            </div>
                            <div style={{ marginBottom: '1rem' }}>
                                <label>Tipo de Persona</label>
                                <select
                                    required
                                    style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}
                                    value={clientForm.personType}
                                    onChange={e => setClientForm({ ...clientForm, personType: e.target.value, documentId: '' })}
                                >
                                    <option value="">Seleccionar...</option>
                                    <option value="Física">Física</option>
                                    <option value="Jurídica">Jurídica</option>
                                </select>
                            </div>
                            {clientForm.personType && (
                                <div style={{ marginBottom: '1rem' }}>
                                    <label>{clientForm.personType === 'Jurídica' ? 'RNC' : 'Cédula'}</label>
                                    <input
                                        required
                                        type="text"
                                        value={clientForm.documentId}
                                        onChange={e => setClientForm({ ...clientForm, documentId: e.target.value })}
                                        placeholder={clientForm.personType === 'Jurídica' ? 'Ej. 1-31-45678-9' : 'Ej. 001-1234567-8'}
                                    />
                                </div>
                            )}
                            <div style={{ marginBottom: '1rem' }}>
                                <label>Email (Opcional)</label>
                                <input
                                    type="email"
                                    value={clientForm.email}
                                    onChange={e => setClientForm({ ...clientForm, email: e.target.value })}
                                    placeholder="ejemplo@correo.com"
                                />
                            </div>
                            <div style={{ marginBottom: '1rem' }}>
                                <label>Cartera de Agente</label>
                                <select
                                    style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontWeight: '600' }}
                                    value={clientForm.cartera}
                                    onChange={e => setClientForm({ ...clientForm, cartera: e.target.value })}
                                >
                                    <option value="Santiago Morales y Asociados, S.R.L.">💼 Santiago Morales y Asociados, S.R.L.</option>
                                    <option value="Raquel Rodríguez">💼 Raquel Rodríguez</option>
                                </select>
                            </div>
                            <div style={{ marginBottom: '1rem' }}>
                                <label>Código en Aseguradora / Agente (Opcional)</label>
                                <input
                                    type="text"
                                    value={clientForm.insurerCode}
                                    onChange={e => setClientForm({ ...clientForm, insurerCode: e.target.value })}
                                    placeholder="Ej. 76713, 8055, 897"
                                />
                            </div>
                            <div style={{ marginBottom: '1rem' }}>
                                <label>Teléfono</label>
                                <input
                                    required
                                    type="tel"
                                    value={clientForm.phone}
                                    onChange={e => setClientForm({ ...clientForm, phone: e.target.value })}
                                    placeholder="809-555-5555"
                                />
                            </div>
                            <div style={{ marginBottom: '1rem' }}>
                                <label>Dirección</label>
                                <input
                                    type="text"
                                    value={clientForm.address}
                                    onChange={e => setClientForm({ ...clientForm, address: e.target.value })}
                                    placeholder="Calle, No., Ref."
                                />
                            </div>
                            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                                <div style={{ flex: 1 }}>
                                    <label>Ciudad</label>
                                    <select
                                        style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}
                                        value={clientForm.city}
                                        onChange={e => setClientForm({ ...clientForm, city: e.target.value, sector: '' })}
                                    >
                                        <option value="">(Opcional) Seleccionar...</option>
                                        {Object.keys(DR_LOCATIONS).sort().map(city => (
                                            <option key={city} value={city}>{city}</option>
                                        ))}
                                    </select>
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label>Sector</label>
                                    <select
                                        style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}
                                        value={clientForm.sector}
                                        onChange={e => setClientForm({ ...clientForm, sector: e.target.value })}
                                        disabled={!clientForm.city}
                                    >
                                        <option value="">(Opcional) Seleccionar...</option>
                                        {clientForm.city && getSectors(clientForm.city).map(sector => (
                                            <option key={sector} value={sector}>{sector}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Modalidad de Cobros / Pagos */}
                            <div style={{
                                padding: '1rem',
                                backgroundColor: clientForm.cobroAutomatico ? '#f0fdf4' : '#f8fafc',
                                border: clientForm.cobroAutomatico ? '1.5px solid #86efac' : '1px solid var(--border)',
                                borderRadius: 'var(--radius-md)',
                                marginBottom: '1.25rem',
                                transition: 'all 0.2s'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
                                    <label style={{ margin: 0, fontWeight: '700', fontSize: '0.92rem', color: clientForm.cobroAutomatico ? '#166534' : 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                        {clientForm.cobroAutomatico ? <Zap size={17} color="#16a34a" /> : <DollarSign size={17} color="#64748b" />}
                                        Modalidad de Cobro
                                    </label>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '700', color: clientForm.cobroAutomatico ? '#15803d' : 'var(--text-muted)' }}>
                                        <input
                                            type="checkbox"
                                            checked={clientForm.cobroAutomatico}
                                            onChange={e => setClientForm({ ...clientForm, cobroAutomatico: e.target.checked })}
                                            style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                                        />
                                        <span>Activar Cobro Automático</span>
                                    </label>
                                </div>

                                <p style={{ fontSize: '0.8rem', color: clientForm.cobroAutomatico ? '#166534' : 'var(--text-muted)', margin: '0 0 0.75rem 0', lineHeight: '1.4' }}>
                                    {clientForm.cobroAutomatico 
                                        ? '⚡ Autorizado: El sistema podrá generar y registrar cobros automáticamente para las pólizas de este cliente.'
                                        : '✋ Predeterminado: Cobro Manual. Los pagos de este cliente sólo se generarán cuando un gestor los registre manualmente.'}
                                </p>

                                {clientForm.cobroAutomatico && (
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.5rem', paddingTop: '0.75rem', borderTop: '1px solid #bbf7d0' }}>
                                        <div>
                                            <label style={{ fontSize: '0.8rem', fontWeight: '600', color: '#166534' }}>Método de Débito</label>
                                            <select
                                                value={clientForm.metodoCobroAutomatico}
                                                onChange={e => setClientForm({ ...clientForm, metodoCobroAutomatico: e.target.value })}
                                                style={{ width: '100%', padding: '0.45rem', borderRadius: 'var(--radius-sm)', border: '1px solid #86efac', fontSize: '0.85rem', backgroundColor: 'white' }}
                                            >
                                                <option value="Tarjeta de Crédito">Tarjeta de Crédito</option>
                                                <option value="Débito a Cuenta Bancaria">Débito a Cuenta Bancaria</option>
                                                <option value="Débito Nómina / Empresa">Débito Nómina / Empresa</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '0.8rem', fontWeight: '600', color: '#166534' }}>Día de Cobro (1-30)</label>
                                            <select
                                                value={clientForm.diaCobroAutomatico}
                                                onChange={e => setClientForm({ ...clientForm, diaCobroAutomatico: parseInt(e.target.value, 10) })}
                                                style={{ width: '100%', padding: '0.45rem', borderRadius: 'var(--radius-sm)', border: '1px solid #86efac', fontSize: '0.85rem', backgroundColor: 'white' }}
                                            >
                                                {[1, 5, 10, 15, 20, 25, 28, 30].map(d => (
                                                    <option key={d} value={d}>Día {d} de cada mes</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                                <button type="button" className="btn" onClick={() => setShowModal(false)} style={{ backgroundColor: '#f1f5f9' }}>
                                    Cancelar
                                </button>
                                <button type="submit" className="btn btn-primary" disabled={isCreating}>
                                    {isCreating ? (
                                        <>
                                            <Loader2 className="animate-spin" size={18} /> {isEditing ? 'Guardando...' : 'Creando carpeta...'}
                                        </>
                                    ) : (
                                        isEditing ? 'Actualizar Cliente' : 'Guardar Cliente'
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* View Client Details & Policies Modal */}
            {renderViewClientModalContent()}
        </div>
    );
};

export default ClientList;
