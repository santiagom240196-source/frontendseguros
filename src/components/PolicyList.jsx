import React, { useState, useEffect, useRef } from 'react';
import { Search, Filter, FileText, CheckCircle, AlertTriangle, XCircle, ChevronRight, ArrowLeft, ExternalLink, File, Plus, Upload, Paperclip, Loader2, DollarSign, User } from 'lucide-react';
import { DR_LOCATIONS, getSectors } from '../constants/locations';
import { createClientFolder } from '../services/googleDrive';
import { getNextRenewalDate, calculatePolicyStatus, getPolicyPaymentStats, formatDateToDDMMYYYY, formatMoney } from '../utils/policyHelpers';
import InsurerLogo from './InsurerLogo';
import InsurerSelect from './InsurerSelect';

const PolicyList = ({ policies, setPolicies, clients = [], setClients, payments = [], companies = [], initialSelectedId, onClearSelection, shouldOpenCreateModal, onDetailedActionHandled }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedPolicy, setSelectedPolicy] = useState(null);
    const [showMovementModal, setShowMovementModal] = useState(false);
    const [showCreatePolicyModal, setShowCreatePolicyModal] = useState(false);

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

    // Form state for new movement
    const [newMovement, setNewMovement] = useState({
        type: 'Endoso',
        date: new Date().toISOString().split('T')[0],
        description: '',
        file: null
    });

    // Form state for new policy
    const [newPolicy, setNewPolicy] = useState({
        id: '',
        client: '',
        type: 'Auto',
        insurer: '',
        startDate: new Date().toISOString().split('T')[0],
        renewalFrequency: 'Anual',
        insuredAmount: '',
        amount: '',
        currency: 'DOP',
        details: ''
    });



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
                    insurerCode: newClientData.insurerCode,
                    email: newClientData.email,
                    phone: newClientData.phone,
                    address: '',
                    city: newClientData.city,
                    sector: newClientData.sector,
                    policy: newPolicy.type, // Set initial policy type
                    status: 'Active',
                    folderLink: folderLink
                };
                // Update clients list
                if (setClients) {
                    setClients([newClientObj, ...clients]);
                }
            }

            const formattedInsuredAmount = formatMoney(newPolicy.insuredAmount, newPolicy.currency);
            const formattedAmount = formatMoney(newPolicy.amount, newPolicy.currency);

            const policyToAdd = {
                id: policyId,
                client: clientName,
                type: newPolicy.type,
                insurer: newPolicy.insurer,
                startDate: newPolicy.startDate,
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
            setPolicies([...policies, policyToAdd]);
            setShowCreatePolicyModal(false);
            setNewPolicy({ id: '', client: '', type: 'Auto', insurer: '', startDate: new Date().toISOString().split('T')[0], renewalFrequency: 'Anual', insuredAmount: '', amount: '', currency: 'DOP', details: '' });

            // Reset client creation state
            setIsCreatingClient(false);
            setNewClientData({ name: '', personType: '', documentId: '', insurerCode: '', email: '', phone: '', city: '', sector: '' });

            alert(`Póliza ${policyId} creada exitosamente${isCreatingClient ? ` para el nuevo cliente ${clientName}` : ''}.`);
        } catch (error) {
            console.error("Error creating policy:", error);
            alert("Error al procesar la solicitud.");
        } finally {
            setIsCreating(false);
        }
    };



    const getStatusColor = (status) => {
        switch (status) {
            case 'Active': return { bg: '#dcfce7', text: '#166534', icon: CheckCircle };
            case 'Pending': return { bg: '#fef9c3', text: '#854d0e', icon: AlertTriangle };
            case 'Expiring': return { bg: '#ffedd5', text: '#9a3412', icon: AlertTriangle };
            default: return { bg: '#fee2e2', text: '#991b1b', icon: XCircle };
        }
    };

    const getDriveLink = (policy) => {
        // Constructs a search query for Google Drive based on client and policy ID
        const query = `${policy.client} ${policy.id}`;
        return `https://drive.google.com/drive/search?q=${encodeURIComponent(query)}`;
    };

    const handleAddMovement = (e) => {
        e.preventDefault();

        // Mocking file upload - just getting the name
        const fileName = newMovement.file ? newMovement.file.name : 'Sin adjunto';

        const movement = {
            id: selectedPolicy.movements.length + 1,
            date: newMovement.date,
            type: newMovement.type,
            description: newMovement.description,
            evidence: fileName
        };

        const updatedPolicy = {
            ...selectedPolicy,
            movements: [...selectedPolicy.movements, movement]
        };

        setSelectedPolicy(updatedPolicy);

        setPolicies(policies.map(p => p.id === updatedPolicy.id ? updatedPolicy : p));

        setShowMovementModal(false);
        setNewMovement({
            type: 'Endoso',
            date: new Date().toISOString().split('T')[0],
            description: '',
            file: null
        });

        alert('Movimiento registrado correctamente.');
    };

    if (selectedPolicy) {
        const computedStatus = calculatePolicyStatus(selectedPolicy, payments);
        const statusConfirm = getStatusColor(computedStatus);
        const StatusIcon = statusConfirm.icon;

        const paymentStats = getPolicyPaymentStats(selectedPolicy, payments);
        const policyPayments = payments.filter(p => p.policyId === selectedPolicy.id);

        return (
            <div>
                <div style={{ marginBottom: '2rem' }}>
                    <button
                        className="btn"
                        style={{ marginBottom: '1rem', padding: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)' }}
                        onClick={() => setSelectedPolicy(null)}
                    >
                        <ArrowLeft size={20} /> Volver al listado
                    </button>
                    <h2 style={{ fontSize: '2rem', color: 'var(--primary)' }}>Detalle de Póliza</h2>
                    <p style={{ color: 'var(--text-muted)' }}>Información completa y documentos adjuntos.</p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
                    <div className="card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
                            <div>
                                <h3 style={{ fontSize: '1.5rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                                    <span>{selectedPolicy.type} -</span>
                                    <InsurerLogo name={selectedPolicy.insurer} size={28} showName={true} textStyle={{ color: 'var(--primary)', fontWeight: '700', fontSize: '1.5rem' }} />
                                </h3>
                                <p style={{ fontSize: '1.1rem', marginTop: '0.25rem' }}>{selectedPolicy.client}</p>
                            </div>
                            <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.25rem',
                                padding: '0.5rem 1rem',
                                borderRadius: '999px',
                                fontSize: '1rem',
                                fontWeight: '600',
                                backgroundColor: statusConfirm.bg,
                                color: statusConfirm.text
                            }}>
                                <StatusIcon size={18} />
                                {computedStatus === 'Active' ? 'Vigente' : computedStatus === 'Pending' ? 'Pendiente' : computedStatus === 'Expiring' ? 'Por Vencer' : 'Cancelada'}
                            </span>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                            <div>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Número de Póliza</p>
                                <p style={{ fontWeight: '600', fontSize: '1.1rem' }}>{selectedPolicy.id}</p>
                            </div>
                            <div>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Monto Asegurado</p>
                                <p style={{ fontWeight: '600', fontSize: '1.1rem' }}>{formatMoney(selectedPolicy.insuredAmount, selectedPolicy.currency)}</p>
                            </div>
                            <div>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Prima (Monto)</p>
                                <p style={{ fontWeight: '600', fontSize: '1.1rem' }}>{formatMoney(selectedPolicy.amount, selectedPolicy.currency)}</p>
                            </div>
                            <div>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Fecha de Inicio</p>
                                <p style={{ fontWeight: '600', fontSize: '1.1rem' }}>{formatDateToDDMMYYYY(selectedPolicy.startDate) || 'N/A'}</p>
                            </div>
                            <div>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Frecuencia de Renovación</p>
                                <p style={{ fontWeight: '600', fontSize: '1.1rem' }}>{selectedPolicy.renewalFrequency || 'Anual'}</p>
                            </div>
                            <div>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Próxima Renovación</p>
                                <p style={{ fontWeight: '600', fontSize: '1.1rem' }}>{formatDateToDDMMYYYY(getNextRenewalDate(selectedPolicy.startDate, selectedPolicy.renewalFrequency) || selectedPolicy.renewal || 'N/A')}</p>
                            </div>
                            <div>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Detalles de Cobertura</p>
                                <p style={{ fontWeight: '600', fontSize: '1rem' }}>{selectedPolicy.details}</p>
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

                    <div className="card" style={{ backgroundColor: '#f8fafc' }}>
                        <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <FileText size={20} /> Documentos
                        </h3>
                        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                            Accede a los archivos digitales almacenados en la nube.
                        </p>

                        <a
                            href={getDriveLink(selectedPolicy)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-primary"
                            style={{ width: '100%', justifyContent: 'center' }}
                        >
                            <ExternalLink size={20} /> Buscar en Google Drive
                        </a>

                        <div style={{ marginTop: '1.5rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
                            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', padding: '0.75rem', backgroundColor: 'white', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                                <File size={24} color="var(--primary)" />
                                <div style={{ flex: 1 }}>
                                    <p style={{ fontSize: '0.9rem', fontWeight: '600' }}>Póliza Digital.pdf</p>
                                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>PDF • 2.4 MB</p>
                                </div>
                                <a href={getDriveLink(selectedPolicy)} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)' }}>
                                    <ExternalLink size={16} />
                                </a>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Movements History */}
                <div style={{ marginTop: '2rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <h3 style={{ fontSize: '1.5rem', color: 'var(--primary)' }}>Historial de Movimientos</h3>
                        <button className="btn btn-primary" onClick={() => setShowMovementModal(true)}>
                            <Plus size={18} /> Registrar Movimiento
                        </button>
                    </div>

                    <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid var(--border)' }}>
                                    <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', color: 'var(--text-muted)' }}>Fecha</th>
                                    <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', color: 'var(--text-muted)' }}>Tipo</th>
                                    <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', color: 'var(--text-muted)' }}>Descripción</th>
                                    <th style={{ padding: '1rem', textAlign: 'right', fontWeight: '600', color: 'var(--text-muted)' }}>Evidencia</th>
                                </tr>
                            </thead>
                            <tbody>
                                {selectedPolicy.movements && selectedPolicy.movements.length > 0 ? (
                                    selectedPolicy.movements.map((mov) => (
                                        <tr key={mov.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                            <td style={{ padding: '1rem' }}>{formatDateToDDMMYYYY(mov.date)}</td>
                                            <td style={{ padding: '1rem' }}>
                                                <span style={{
                                                    padding: '0.25rem 0.75rem',
                                                    borderRadius: '999px',
                                                    backgroundColor: '#fdf8f6',
                                                    color: 'var(--primary)',
                                                    fontSize: '0.85rem',
                                                    fontWeight: '600'
                                                }}>
                                                    {mov.type}
                                                </span>
                                            </td>
                                            <td style={{ padding: '1rem' }}>{mov.description}</td>
                                            <td style={{ padding: '1rem', textAlign: 'right' }}>
                                                {mov.evidence && (
                                                    <a href="#" className="btn" style={{ padding: '0.25rem 0.5rem', fontSize: '0.85rem', color: 'var(--primary)' }} onClick={(e) => e.preventDefault()}>
                                                        <Paperclip size={14} style={{ marginRight: '4px' }} /> {mov.evidence}
                                                    </a>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="4" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                            No hay movimientos registrados en esta póliza.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Related Payments */}
                <div style={{ marginTop: '2rem' }}>
                    <h3 style={{ fontSize: '1.5rem', color: 'var(--primary)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <DollarSign size={22} /> Cobros y Pagos Realizados
                    </h3>
                    {policyPayments.length > 0 ? (
                        <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid var(--border)' }}>
                                        <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', color: 'var(--text-muted)' }}>ID Pago</th>
                                        <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', color: 'var(--text-muted)' }}>Fecha</th>
                                        <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', color: 'var(--text-muted)' }}>Concepto</th>
                                        <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', color: 'var(--text-muted)' }}>Estado</th>
                                        <th style={{ padding: '1rem', textAlign: 'right', fontWeight: '600', color: 'var(--text-muted)' }}>Monto</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {policyPayments.map((p) => (
                                        <tr key={p.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                            <td style={{ padding: '1rem', fontWeight: 'bold' }}>{p.id}</td>
                                            <td style={{ padding: '1rem' }}>{formatDateToDDMMYYYY(p.date)}</td>
                                            <td style={{ padding: '1rem' }}>{p.type}</td>
                                            <td style={{ padding: '1rem' }}>
                                                <span style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '0.25rem',
                                                    padding: '0.25rem 0.75rem',
                                                    borderRadius: '999px',
                                                    fontSize: '0.85rem',
                                                    fontWeight: '600',
                                                    backgroundColor: p.status === 'Paid' ? '#dcfce7' : p.status === 'Pending' ? '#fef9c3' : '#fee2e2',
                                                    color: p.status === 'Paid' ? '#166534' : p.status === 'Pending' ? '#854d0e' : '#991b1b'
                                                }}>
                                                    {p.status === 'Paid' ? 'Pagado' : p.status === 'Pending' ? 'Pendiente' : 'Vencido'}
                                                </span>
                                            </td>
                                            <td style={{ padding: '1rem', textAlign: 'right', fontWeight: '700' }}>{formatMoney(p.amount, selectedPolicy.currency)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                            No hay cobros registrados para esta póliza.
                        </div>
                    )}
                </div>

                {/* New Movement Modal */}
                {showMovementModal && (
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
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                <h3 style={{ margin: 0 }}>Registrar Movimiento</h3>
                                <button onClick={() => setShowMovementModal(false)} style={{ background: 'none', border: 'none', padding: '0.5rem', cursor: 'pointer' }}>
                                    <XCircle size={24} />
                                </button>
                            </div>

                            <form onSubmit={handleAddMovement}>
                                <div style={{ marginBottom: '1rem' }}>
                                    <label>Tipo de Movimiento</label>
                                    <select
                                        style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}
                                        value={newMovement.type}
                                        onChange={e => setNewMovement({ ...newMovement, type: e.target.value })}
                                    >
                                        <option value="Endoso">Endoso</option>
                                        <option value="Renovación">Renovación</option>
                                        <option value="Cancelación">Cancelación</option>
                                        <option value="Reclamación">Reclamación / Siniestro</option>
                                        <option value="Pago">Pago de Prima</option>
                                        <option value="Inclusión">Inclusión</option>
                                        <option value="Exclusión">Exclusión</option>
                                        <option value="Otro">Otro</option>
                                    </select>
                                </div>
                                <div style={{ marginBottom: '1rem' }}>
                                    <label>Fecha</label>
                                    <input
                                        type="date"
                                        required
                                        value={newMovement.date}
                                        onChange={e => setNewMovement({ ...newMovement, date: e.target.value })}
                                    />
                                </div>
                                <div style={{ marginBottom: '1rem' }}>
                                    <label>Descripción</label>
                                    <textarea
                                        required
                                        rows="3"
                                        placeholder="Detalles del movimiento..."
                                        value={newMovement.description}
                                        onChange={e => setNewMovement({ ...newMovement, description: e.target.value })}
                                    />
                                </div>
                                <div style={{ marginBottom: '1.5rem' }}>
                                    <label>Adjuntar Prueba (PDF/Imagen)</label>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <label className="btn" style={{ border: '1px solid var(--border)', backgroundColor: '#f8fafc', flex: 1, cursor: 'pointer', justifyContent: 'center' }}>
                                            <Upload size={18} /> {newMovement.file ? newMovement.file.name : 'Seleccionar archivo'}
                                            <input
                                                type="file"
                                                style={{ display: 'none' }}
                                                onChange={e => setNewMovement({ ...newMovement, file: e.target.files[0] })}
                                            />
                                        </label>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                                    <button type="button" className="btn" onClick={() => setShowMovementModal(false)} style={{ backgroundColor: '#f1f5f9' }}>
                                        Cancelar
                                    </button>
                                    <button type="submit" className="btn btn-primary">
                                        Guardar Movimiento
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div>
            <div style={{ marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '2rem', color: 'var(--primary)' }}>Cartera de Pólizas</h2>
                <p style={{ color: 'var(--text-muted)' }}>Visualiza y gestiona las pólizas de todos los clientes.</p>
            </div>

            <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
                <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <div style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
                        <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={20} />
                        <input
                            type="text"
                            placeholder="Buscar póliza, cliente o aseguradora..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ paddingLeft: '40px' }}
                        />
                    </div>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <button className="btn" style={{ border: '1px solid var(--border)', backgroundColor: 'white' }}>
                            <Filter size={18} /> Filtros
                        </button>
                        <button className="btn btn-primary" onClick={() => setShowCreatePolicyModal(true)}>
                            <Plus size={18} /> Nueva Póliza
                        </button>
                    </div>
                </div>

                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid var(--border)' }}>
                                <th style={{ padding: '1rem', textAlign: 'left', color: 'var(--text-muted)' }}>Póliza #</th>
                                <th style={{ padding: '1rem', textAlign: 'left', color: 'var(--text-muted)' }}>Cliente</th>
                                <th style={{ padding: '1rem', textAlign: 'left', color: 'var(--text-muted)' }}>Ramo / Aseguradora</th>
                                <th style={{ padding: '1rem', textAlign: 'left', color: 'var(--text-muted)' }}>Renovación</th>
                                <th style={{ padding: '1rem', textAlign: 'left', color: 'var(--text-muted)' }}>Estado</th>
                                <th style={{ padding: '1rem', textAlign: 'right', color: 'var(--text-muted)' }}>Prima</th>
                                <th style={{ padding: '1rem', textAlign: 'right', color: 'var(--text-muted)' }}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {policies.map((policy) => {
                                const computedStatus = calculatePolicyStatus(policy, payments);
                                const statusConfirm = getStatusColor(computedStatus);
                                const StatusIcon = statusConfirm.icon;
                                return (
                                    <tr
                                        key={policy.id}
                                        style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer', transition: 'background-color 0.1s' }}
                                        onClick={() => setSelectedPolicy(policy)}
                                        className="hover-row"
                                    >
                                        <td style={{ padding: '1rem', fontWeight: 'bold' }}>{policy.id}</td>
                                        <td style={{ padding: '1rem', fontWeight: '600', color: 'var(--primary)' }}>{policy.client}</td>
                                        <td style={{ padding: '1rem' }}>
                                            <div style={{ fontWeight: '500' }}>{policy.type}</div>
                                            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.2rem' }}>
                                                <InsurerLogo name={policy.insurer} size={18} />
                                                <span>{policy.insurer}</span>
                                            </div>
                                        </td>
                                        <td style={{ padding: '1rem' }}>{formatDateToDDMMYYYY(getNextRenewalDate(policy.startDate, policy.renewalFrequency) || policy.renewal || 'N/A')}</td>
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
                                                {computedStatus === 'Active' ? 'Vigente' : computedStatus === 'Pending' ? 'Pendiente' : computedStatus === 'Expiring' ? 'Por Vencer' : 'Cancelada'}
                                            </span>
                                        </td>
                                        <td style={{ padding: '1rem', textAlign: 'right', fontWeight: '600' }}>{formatMoney(policy.amount, policy.currency)}</td>
                                        <td style={{ padding: '1rem', textAlign: 'right' }}>
                                            <button className="btn" style={{ padding: '0.5rem', color: 'var(--text-muted)' }}>
                                                <ChevronRight size={20} />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
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
                                            placeholder="Ej. POL-100293"
                                            value={newPolicy.id}
                                            onChange={e => setNewPolicy({ ...newPolicy, id: e.target.value })}
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
                                            onChange={e => setNewPolicy({ ...newPolicy, insurer: e.target.value })}
                                            placeholder="Seleccionar Aseguradora..."
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

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                                    <div style={{ gridColumn: 'span 1' }}>
                                        <label style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.4rem' }}>Moneda Selecc.</label>
                                        <div style={{ padding: '0.5rem', backgroundColor: '#e2e8f0', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', textAlign: 'center', fontWeight: '700', color: 'var(--text-main)', fontSize: '0.95rem' }}>
                                            {newPolicy.currency === 'USD' ? 'USD $' : 'RD$ DOP'}
                                        </div>
                                    </div>
                                    <div style={{ gridColumn: 'span 1' }}>
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
                                    <div style={{ gridColumn: 'span 1' }}>
                                        <label style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.4rem' }}>Prima (Monto) *</label>
                                        <input
                                            required
                                            type="text"
                                            placeholder={newPolicy.currency === 'USD' ? 'Ej. 1,200.00' : 'Ej. 25,000.00'}
                                            value={newPolicy.amount}
                                            onChange={e => setNewPolicy({ ...newPolicy, amount: e.target.value })}
                                            style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}
                                        />
                                    </div>
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
        </div>
    );
};

export default PolicyList;
