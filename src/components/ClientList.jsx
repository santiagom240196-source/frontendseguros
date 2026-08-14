import React, { useState, useEffect } from 'react';
import { Search, Filter, MoreHorizontal, Eye, Edit, Trash2, Plus, X, Folder, ExternalLink, Loader2 } from 'lucide-react';
import { initGoogleDrive, createClientFolder } from '../services/googleDrive';
import { DR_LOCATIONS, getSectors } from '../constants/locations';
import { getNextRenewalDate, calculatePolicyStatus, formatDateToDDMMYYYY, formatMoney } from '../utils/policyHelpers';

const ClientList = ({ clients = [], setClients, policies = [], payments = [] }) => {

    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [driveReady, setDriveReady] = useState(false);
    const [selectedClient, setSelectedClient] = useState(null);
    const [showViewModal, setShowViewModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);

    // Form State
    const [clientForm, setClientForm] = useState({
        name: '',
        personType: '',
        documentId: '',
        insurerCode: '',
        email: '',
        phone: '',
        address: '',
        city: '',
        sector: ''
    });

    useEffect(() => {
        initGoogleDrive().then((success) => {
            if (success) {
                console.log('Google Drive API initialized');
                setDriveReady(true);
            } else {
                console.warn('Google Drive integration failed to load.');
            }
        });
    }, []);

    const handleCreateClient = async (e) => {
        e.preventDefault();
        setIsCreating(true);

        try {
            if (isEditing && selectedClient) {
                // Update existing client
                const updatedClients = clients.map(c =>
                    c.id === selectedClient.id ? { ...c, ...clientForm } : c
                );
                setClients(updatedClients);
                alert(`Cliente ${clientForm.name} actualizado con éxito.`);
            } else {
                // Create new client
                console.log("Creating folder for:", clientForm.name);
                const folderData = await createClientFolder(clientForm.name);
                console.log("Folder created:", folderData);

                const clientToAdd = {
                    id: clients.length + 1,
                    ...clientForm,
                    status: 'Active',
                    folderLink: folderData.webViewLink
                };

                setClients([clientToAdd, ...clients]);
                alert(`Cliente ${clientForm.name} creado con éxito. Carpeta de Drive: ${folderData.name}`);
            }

            setShowModal(false);
            setClientForm({ name: '', personType: '', documentId: '', insurerCode: '', email: '', phone: '', address: '', city: '', sector: '' });
            setIsEditing(false);
            setSelectedClient(null);

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
            name: client.name,
            personType: client.personType || '',
            documentId: client.documentId || '',
            insurerCode: client.insurerCode || '',
            email: client.email || '',
            phone: client.phone || '',
            address: client.address || '',
            city: client.city || '',
            sector: client.sector || ''
        });
        setIsEditing(true);
        setShowModal(true);
    };

    const handleViewClient = (client) => {
        setSelectedClient(client);
        setShowViewModal(true);
    };

    const openCreateModal = () => {
        setClientForm({ name: '', personType: '', documentId: '', insurerCode: '', email: '', phone: '', address: '', city: '', sector: '' });
        setIsEditing(false);
        setSelectedClient(null);
        setShowModal(true);
    };

    const filteredClients = clients.filter(client =>
        client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Helper to get client policies
    const getClientPolicies = (clientName) => {
        return policies.filter(p => p.client === clientName);
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h2 style={{ fontSize: '2rem', color: 'var(--primary)' }}>Gestión de Clientes</h2>
                    <p style={{ color: 'var(--text-muted)' }}>Administra la base de datos de clientes y sus pólizas.</p>
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
                <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <div style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
                        <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={20} />
                        <input
                            type="text"
                            placeholder="Buscar por nombre o email..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ paddingLeft: '40px' }}
                        />
                    </div>
                    <button className="btn" style={{ border: '1px solid var(--border)', backgroundColor: 'white' }}>
                        <Filter size={18} /> Filtros
                    </button>
                </div>

                {/* Table */}
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid var(--border)' }}>
                                <th style={{ padding: '1rem', textAlign: 'left', color: 'var(--text-muted)', fontWeight: '600' }}>Nombre</th>
                                <th style={{ padding: '1rem', textAlign: 'left', color: 'var(--text-muted)', fontWeight: '600' }}>Contacto</th>
                                <th style={{ padding: '1rem', textAlign: 'left', color: 'var(--text-muted)', fontWeight: '600' }}>Pólizas Asociadas</th>
                                <th style={{ padding: '1rem', textAlign: 'left', color: 'var(--text-muted)', fontWeight: '600' }}>Estado</th>
                                <th style={{ padding: '1rem', textAlign: 'left', color: 'var(--text-muted)', fontWeight: '600' }}>Drive</th>
                                <th style={{ padding: '1rem', textAlign: 'right', color: 'var(--text-muted)', fontWeight: '600' }}>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredClients.map((client) => {
                                const clientPolicies = getClientPolicies(client.name);
                                return (
                                    <tr key={client.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                        <td style={{ padding: '1rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <div style={{ fontWeight: '600', color: 'var(--text-main)' }}>{client.name}</div>
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
                                            </div>
                                        </td>
                                        <td style={{ padding: '1rem' }}>
                                            <div style={{ fontSize: '0.9rem' }}>{client.email}</div>
                                            <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>{client.phone}</div>
                                            {client.city && <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>{(client.address) ? `${client.address}, ` : ''}{client.sector ? `${client.sector}, ` : ''}{client.city}</div>}
                                        </td>
                                        <td style={{ padding: '1rem' }}>
                                            {clientPolicies.length > 0 ? (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                                    {clientPolicies.map(p => (
                                                        <span key={p.id} style={{ fontSize: '0.85rem', backgroundColor: '#eff6ff', color: '#1d4ed8', padding: '0.2rem 0.5rem', borderRadius: '4px', display: 'inline-block' }}>
                                                            {p.type} - {p.insurer}
                                                            {<span style={{ fontSize: '0.75rem', color: '#64748b', marginLeft: '4px' }}>({p.id})</span>}
                                                        </span>
                                                    ))}
                                                </div>
                                            ) : (
                                                <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Sin pólizas registradas</span>
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
                                            {client.folderLink && client.folderLink !== '#' && (
                                                <a href={client.folderLink} target="_blank" rel="noopener noreferrer" className="btn" style={{ padding: '0.4rem', color: '#3b82f6' }} title="Abrir Carpeta">
                                                    <Folder size={18} />
                                                </a>
                                            )}
                                        </td>
                                        <td style={{ padding: '1rem', textAlign: 'right' }}>
                                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                                                <button className="btn" onClick={() => handleViewClient(client)} style={{ padding: '0.5rem', color: 'var(--primary)' }} title="Ver detalles">
                                                    <Eye size={18} />
                                                </button>
                                                <button className="btn" onClick={() => handleEditClient(client)} style={{ padding: '0.5rem', color: 'var(--text-muted)' }} title="Editar">
                                                    <Edit size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
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
                                <label>Código de Cliente en Aseguradora (Opcional)</label>
                                <input
                                    type="text"
                                    value={clientForm.insurerCode}
                                    onChange={e => setClientForm({ ...clientForm, insurerCode: e.target.value })}
                                    placeholder="Ej. C-10293"
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
                                        required
                                        style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}
                                        value={clientForm.city}
                                        onChange={e => setClientForm({ ...clientForm, city: e.target.value, sector: '' })}
                                    >
                                        <option value="">Seleccionar...</option>
                                        {Object.keys(DR_LOCATIONS).sort().map(city => (
                                            <option key={city} value={city}>{city}</option>
                                        ))}
                                    </select>
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label>Sector</label>
                                    <select
                                        required
                                        style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}
                                        value={clientForm.sector}
                                        onChange={e => setClientForm({ ...clientForm, sector: e.target.value })}
                                        disabled={!clientForm.city}
                                    >
                                        <option value="">Seleccionar...</option>
                                        {clientForm.city && getSectors(clientForm.city).map(sector => (
                                            <option key={sector} value={sector}>{sector}</option>
                                        ))}
                                    </select>
                                </div>
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

            {/* View Client Details Modal */}
            {showViewModal && selectedClient && (
                <div style={{
                    position: 'fixed',
                    top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000
                }}>
                    <div className="card" style={{ width: '100%', maxWidth: '500px', backgroundColor: 'white', position: 'relative', maxHeight: '90vh', overflowY: 'auto' }}>
                        <button
                            onClick={() => setShowViewModal(false)}
                            style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                        >
                            <X size={24} />
                        </button>

                        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                            <div style={{
                                width: '80px', height: '80px', borderRadius: '50%', backgroundColor: '#e0f2fe', color: '#0369a1',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem auto',
                                fontSize: '2rem', fontWeight: 'bold'
                            }}>
                                {selectedClient.name.charAt(0)}
                            </div>
                            <h2 style={{ margin: 0, color: 'var(--primary)' }}>{selectedClient.name}</h2>
                            <p style={{ color: 'var(--text-muted)' }}>{selectedClient.email}</p>
                        </div>

                        <div style={{ display: 'grid', gap: '1rem' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div style={{ padding: '1rem', backgroundColor: '#f8fafc', borderRadius: 'var(--radius-sm)' }}>
                                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tipo de Persona</label>
                                    <div style={{ fontWeight: '600', color: selectedClient.personType === 'Jurídica' ? '#6b21a8' : '#0369a1' }}>
                                        {selectedClient.personType || 'Física'}
                                    </div>
                                </div>
                                <div style={{ padding: '1rem', backgroundColor: '#f8fafc', borderRadius: 'var(--radius-sm)' }}>
                                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        {selectedClient.personType === 'Jurídica' ? 'RNC' : 'Cédula'}
                                    </label>
                                    <div style={{ fontWeight: '600' }}>{selectedClient.documentId || 'N/A'}</div>
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div style={{ padding: '1rem', backgroundColor: '#f8fafc', borderRadius: 'var(--radius-sm)' }}>
                                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Teléfono</label>
                                    <div style={{ fontWeight: '500' }}>{selectedClient.phone}</div>
                                </div>
                                <div style={{ padding: '1rem', backgroundColor: '#f8fafc', borderRadius: 'var(--radius-sm)' }}>
                                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Código de Aseguradora</label>
                                    <div style={{ fontWeight: '600', color: 'var(--primary)' }}>{selectedClient.insurerCode || 'N/A'}</div>
                                </div>
                            </div>
                            <div style={{ padding: '1rem', backgroundColor: '#f8fafc', borderRadius: 'var(--radius-sm)' }}>
                                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Dirección</label>
                                <div style={{ fontWeight: '500' }}>
                                    {selectedClient.address ? `${selectedClient.address}, ` : ''}{selectedClient.sector ? `${selectedClient.sector}, ` : ''}{selectedClient.city}
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
                                <div style={{ padding: '1rem', backgroundColor: '#f8fafc', borderRadius: 'var(--radius-sm)' }}>
                                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pólizas Asociadas</label>
                                    <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                        {getClientPolicies(selectedClient.name).length > 0 ? (
                                            getClientPolicies(selectedClient.name).map(p => {
                                                const computedStatus = calculatePolicyStatus(p, payments);
                                                const nextRenewal = getNextRenewalDate(p.startDate, p.renewalFrequency) || p.renewal || 'N/A';
                                                return (
                                                    <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'white', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border)' }}>
                                                        <div>
                                                            <div style={{ fontWeight: '600', fontSize: '0.9rem' }}>{p.type} - {p.insurer}</div>
                                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{formatMoney(p.amount, p.currency)} • Renueva: {formatDateToDDMMYYYY(nextRenewal)}</div>
                                                        </div>
                                                        <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', borderRadius: '999px', backgroundColor: computedStatus === 'Active' ? '#dcfce7' : computedStatus === 'Pending' ? '#fef9c3' : '#fee2e2', color: computedStatus === 'Active' ? '#166534' : computedStatus === 'Pending' ? '#854d0e' : '#991b1b' }}>
                                                            {computedStatus === 'Active' ? 'Vigente' : computedStatus === 'Pending' ? 'Pendiente' : computedStatus === 'Expiring' ? 'Por Vencer' : 'Cancelada'}
                                                        </span>
                                                    </div>
                                                );
                                            })
                                        ) : (
                                            <div style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>No tiene pólizas registradas.</div>
                                        )}
                                    </div>
                                </div>
                                <div style={{ padding: '1rem', backgroundColor: '#f8fafc', borderRadius: 'var(--radius-sm)' }}>
                                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Estado del Cliente</label>
                                    <div style={{
                                        fontWeight: '600',
                                        color: selectedClient.status === 'Active' ? '#166534' : selectedClient.status === 'Pending' ? '#854d0e' : '#991b1b'
                                    }}>
                                        {selectedClient.status === 'Active' ? 'Activo' : selectedClient.status === 'Pending' ? 'Pendiente' : 'Expirado'}
                                    </div>
                                </div>
                            </div>

                            {selectedClient.folderLink && selectedClient.folderLink !== '#' && (
                                <a
                                    href={selectedClient.folderLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="btn btn-primary"
                                    style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', marginTop: '1rem' }}
                                >
                                    <Folder size={20} /> Ver Carpeta en Drive
                                </a>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ClientList;
