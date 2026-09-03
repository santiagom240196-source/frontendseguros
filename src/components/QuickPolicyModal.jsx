import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  PlusCircle, Plus, Search, X, Check, FileText, Calendar, 
  DollarSign, Shield, Paperclip, Upload, ArrowRight, 
  CheckCircle2, User, Building, Layers, Sparkles, AlertCircle, RefreshCw
} from 'lucide-react';
import { useUser } from '../context/UserContext';
import { insertPolicyHasura, insertClientHasura } from '../services/hasuraService';
import { saveDocumentForEntity, fileToDataUri } from '../services/documentsService';
import { formatDateToDDMMYYYY, formatMoney } from '../utils/policyHelpers';
import InsurerSelect from './InsurerSelect';

const POLICY_TYPES = [
  'Vehículo',
  'Salud',
  'Vida',
  'Incendio y Líneas Aliadas',
  'Responsabilidad Civil',
  'Fianzas',
  'Transporte y Carga',
  'Accidentes Personales',
  'Propiedad',
  'Otro Ramo'
];

const FREQUENCIES = [
  { id: 'Anual', label: 'Anual (1 pago / año)', months: 12 },
  { id: 'Semestral', label: 'Semestral (2 cuotas / año)', months: 6 },
  { id: 'Trimestral', label: 'Trimestral (4 cuotas / año)', months: 3 },
  { id: 'Mensual', label: 'Mensual (12 cuotas / año)', months: 1 }
];

const QuickPolicyModal = ({
  isOpen,
  onClose,
  policies = [],
  setPolicies,
  clients = [],
  setClients,
  companies = [],
  agentCodes = [],
  onNavigateToPolicy
}) => {
  const { isDemo } = useUser();
  const policyInputRef = useRef(null);

  // Client Selection State
  const [clientSearch, setClientSearch] = useState('');
  const [selectedClient, setSelectedClient] = useState(null);
  const [isCreatingNewClient, setIsCreatingNewClient] = useState(false);
  const [newClientData, setNewClientData] = useState({
    name: '',
    documentId: '',
    phone: '',
    email: '',
    personType: 'Física'
  });

  // Policy Form State
  const [policyId, setPolicyId] = useState('');
  const [insurer, setInsurer] = useState('La Colonial de Seguros');
  const [policyType, setPolicyType] = useState('Vehículo');
  const [cartera, setCartera] = useState('Santiago Morales y Asociados, S.R.L.');
  const [agentCode, setAgentCode] = useState('8055');
  const [amount, setAmount] = useState('');
  const [insuredAmount, setInsuredAmount] = useState('');
  const [commissionRate, setCommissionRate] = useState('15.0');
  const [currency, setCurrency] = useState('DOP');
  const [renewalFrequency, setRenewalFrequency] = useState('Anual');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    return d.toISOString().split('T')[0];
  });
  const [details, setDetails] = useState('');
  const [attachedFiles, setAttachedFiles] = useState([]);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successResult, setSuccessResult] = useState(null);

  // Auto-calculate end date when start date or frequency changes
  useEffect(() => {
    if (startDate) {
      const d = new Date(startDate);
      const freqObj = FREQUENCIES.find(f => f.id === renewalFrequency) || FREQUENCIES[0];
      d.setMonth(d.getMonth() + freqObj.months);
      setEndDate(d.toISOString().split('T')[0]);
    }
  }, [startDate, renewalFrequency]);

  // Adjust agent code when cartera or insurer changes
  useEffect(() => {
    if (cartera.includes('Raquel')) {
      setAgentCode('897');
    } else {
      const matched = (agentCodes || []).find(c => c.insurer === insurer && c.agent.includes('Santiago'));
      setAgentCode(matched ? matched.code : '8055');
    }
  }, [cartera, insurer, agentCodes]);

  useEffect(() => {
    if (isOpen) {
      resetForm();
      setTimeout(() => {
        if (policyInputRef.current) policyInputRef.current.focus();
      }, 100);
    }
  }, [isOpen]);

  const resetForm = () => {
    setPolicyId('');
    setClientSearch('');
    setSelectedClient(null);
    setIsCreatingNewClient(false);
    setNewClientData({ name: '', documentId: '', phone: '', email: '', personType: 'Física' });
    setInsurer('La Colonial de Seguros');
    setPolicyType('Vehículo');
    setCartera('Santiago Morales y Asociados, S.R.L.');
    setAgentCode('8055');
    setAmount('');
    setInsuredAmount('');
    setCommissionRate('15.0');
    setCurrency('DOP');
    setRenewalFrequency('Anual');
    const today = new Date().toISOString().split('T')[0];
    setStartDate(today);
    const d = new Date(today);
    d.setFullYear(d.getFullYear() + 1);
    setEndDate(d.toISOString().split('T')[0]);
    setDetails('');
    setAttachedFiles([]);
    setIsSubmitting(false);
    setSuccessResult(null);
  };

  const filteredClients = useMemo(() => {
    if (!clientSearch.trim()) return (clients || []).slice(0, 6);
    const q = clientSearch.toLowerCase();
    return (clients || []).filter(c => 
      (c.name || '').toLowerCase().includes(q) ||
      (c.documentId || '').toLowerCase().includes(q) ||
      (c.phone || '').toLowerCase().includes(q)
    ).slice(0, 8);
  }, [clients, clientSearch]);

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setAttachedFiles(prev => [...prev, ...files]);
    }
  };

  const handleRemoveFile = (index) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();

    if (!policyId.trim()) {
      alert('Por favor ingresa el número de la póliza.');
      return;
    }

    // Determine client
    let finalClientName = '';
    let finalClientId = null;

    if (isCreatingNewClient) {
      if (!newClientData.name.trim()) {
        alert('Por favor ingresa el nombre del nuevo cliente.');
        return;
      }
      finalClientName = newClientData.name.trim();
      const newClientObj = {
        id: `CLI-${Date.now().toString().slice(-4)}`,
        name: finalClientName,
        documentId: newClientData.documentId.trim() || 'N/A',
        phone: newClientData.phone.trim() || '',
        email: newClientData.email.trim() || '',
        personType: newClientData.personType,
        cartera,
        agentCode,
        policiesCount: 1,
        totalPremium: parseFloat(amount) || 0
      };

      if (!isDemo) {
        try {
          const res = await insertClientHasura(newClientObj, isDemo);
          if (res?.data?.insert_clientes_one?.id) {
            newClientObj.id = res.data.insert_clientes_one.id;
            newClientObj.rawId = res.data.insert_clientes_one.id;
          }
        } catch (cErr) {
          console.warn('Error insertando cliente en Hasura:', cErr);
        }
      }

      if (setClients) {
        setClients(prev => [newClientObj, ...prev]);
      }
      finalClientId = newClientObj.id;
    } else {
      if (!selectedClient) {
        alert('Por favor selecciona un cliente existente o activa "Crear Nuevo Cliente".');
        return;
      }
      finalClientName = selectedClient.name;
      finalClientId = selectedClient.id;
    }

    setIsSubmitting(true);

    try {
      const cleanAmount = parseFloat(String(amount).replace(/[^0-9.]/g, '')) || 0;
      const cleanInsured = parseFloat(String(insuredAmount).replace(/[^0-9.]/g, '')) || 0;

      // Process attachments to Data URIs
      const processedFiles = [];
      for (const f of attachedFiles) {
        try {
          const uri = await fileToDataUri(f);
          processedFiles.push({ name: f.name, dataUri: uri, type: f.type, size: f.size });
        } catch (err) {
          console.warn('Error reading attachment:', err);
        }
      }

      const newPolicy = {
        id: policyId.trim(),
        clienteId: finalClientId,
        client: finalClientName,
        insurer,
        type: policyType,
        cartera,
        agentCode,
        amount: cleanAmount,
        insuredAmount: cleanInsured,
        commissionRate: parseFloat(commissionRate) || 15.0,
        porcentajeComision: parseFloat(commissionRate) || 15.0,
        currency,
        renewalFrequency,
        startDate,
        lastRenewalDate: startDate,
        endDate,
        renewal: endDate,
        details: details.trim(),
        status: 'Active',
        movements: [
          {
            id: `mov_init_${Date.now()}`,
            date: startDate,
            type: 'Emisión Inicial',
            description: `Póliza emitida con vigencia hasta el ${formatDateToDDMMYYYY(endDate)}.`,
            evidence: processedFiles.length > 0 ? processedFiles.map(f => f.name).join(', ') : 'Emisión inicial'
          }
        ]
      };

      // Save files to central documents repository
      for (const f of processedFiles) {
        saveDocumentForEntity('policy', newPolicy.id, {
          name: f.name,
          category: 'Emisión de Póliza',
          date: startDate,
          dataUri: f.dataUri,
          notes: 'Documento adjunto en creación rápida de póliza',
          uploadedBy: 'Acción Rápida Dashboard'
        });
      }

      // Update state
      if (setPolicies) {
        setPolicies(prev => [newPolicy, ...prev]);
      }

      // Persist in Hasura PostgreSQL
      if (!isDemo) {
        try {
          await insertPolicyHasura(newPolicy, isDemo);
        } catch (pErr) {
          console.warn('Error insertando póliza en Hasura:', pErr);
        }
      }

      setSuccessResult(newPolicy);

    } catch (err) {
      console.error('Error creando póliza:', err);
      alert(`Ocurrió un error al crear la póliza: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.65)',
      backdropFilter: 'blur(5px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2100,
      padding: '1rem',
      animation: 'fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
    }}>
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: 'var(--radius-lg)',
        width: '100%',
        maxWidth: '840px',
        maxHeight: '92vh',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        border: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        position: 'relative'
      }}>
        
        {/* Header */}
        <div style={{
          padding: '1.25rem 1.75rem',
          background: 'linear-gradient(135deg, var(--primary) 0%, #3c2a21 100%)',
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              backgroundColor: 'rgba(255, 255, 255, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)'
            }}>
              <PlusCircle size={24} />
            </div>
            <div>
              <h3 style={{ margin: 0, color: '#ffffff', fontSize: '1.3rem', fontWeight: '800', letterSpacing: '-0.02em' }}>
                Nueva Póliza en Cartera
              </h3>
              <p style={{ margin: '0.15rem 0 0 0', fontSize: '0.86rem', color: '#f3e8df', opacity: 0.9 }}>
                Registro ágil de nueva póliza y asignación de cliente
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.12)',
              border: 'none',
              color: '#ffffff',
              cursor: 'pointer',
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease'
            }}
            onMouseOver={e => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.25)'}
            onMouseOut={e => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.12)'}
            title="Cerrar modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{
          padding: '1.5rem 1.75rem',
          overflowY: 'auto',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: '1.35rem',
          backgroundColor: '#fcfaf7'
        }}>

          {successResult ? (
            <div style={{
              textAlign: 'center',
              padding: '2rem 1rem',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '1.25rem',
              animation: 'fadeIn 0.3s ease'
            }}>
              <div style={{
                width: '72px',
                height: '72px',
                borderRadius: '50%',
                backgroundColor: '#dcfce7',
                color: '#16a34a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 8px 24px rgba(22, 163, 74, 0.2)'
              }}>
                <CheckCircle2 size={44} />
              </div>

              <div>
                <h3 style={{ fontSize: '1.6rem', color: '#166534', margin: '0 0 0.4rem 0', fontWeight: '800' }}>
                  ¡Póliza Registrada Exitosamente!
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', margin: 0, maxWidth: '540px' }}>
                  La póliza <strong>{successResult.id}</strong> para el cliente <strong>{successResult.client}</strong> ha sido añadida a la cartera.
                </p>
              </div>

              <div style={{
                backgroundColor: '#ffffff',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                padding: '1.25rem',
                width: '100%',
                maxWidth: '560px',
                textAlign: 'left',
                boxShadow: 'var(--shadow-sm)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.65rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>Póliza &amp; Aseguradora:</span>
                  <span style={{ fontWeight: '700', fontSize: '0.92rem' }}>{successResult.id} · {successResult.insurer}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>Ramo &amp; Prima Anual:</span>
                  <span style={{ fontWeight: '700', color: 'var(--primary)', fontSize: '0.92rem' }}>{successResult.type} · {formatMoney(successResult.amount)} {successResult.currency}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>Vigencia:</span>
                  <span style={{ fontWeight: '600', fontSize: '0.92rem' }}>{formatDateToDDMMYYYY(successResult.startDate)} al {formatDateToDDMMYYYY(successResult.endDate)}</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center', marginTop: '1rem' }}>
                <button
                  type="button"
                  className="btn"
                  onClick={resetForm}
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1.5px solid var(--border)',
                    color: 'var(--text-main)',
                    fontWeight: '700',
                    padding: '0.75rem 1.4rem'
                  }}
                >
                  <Plus size={18} /> Registrar Otra Póliza
                </button>

                {onNavigateToPolicy && (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => {
                      onClose();
                      onNavigateToPolicy(successResult.id);
                    }}
                    style={{ padding: '0.75rem 1.5rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                  >
                    Ver Póliza en Detalle <ArrowRight size={18} />
                  </button>
                )}

                <button
                  type="button"
                  className="btn"
                  onClick={onClose}
                  style={{ backgroundColor: '#f1f5f9', color: '#475569', fontWeight: '700', padding: '0.75rem 1.4rem' }}
                >
                  Cerrar
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.35rem' }}>
              
              {/* SECCIÓN 1: CLIENTE */}
              <div style={{
                backgroundColor: '#ffffff',
                border: '1.5px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                padding: '1.25rem',
                boxShadow: 'var(--shadow-sm)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
                  <label style={{ fontWeight: '800', fontSize: '0.98rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                    <span style={{
                      backgroundColor: 'var(--primary)',
                      color: '#ffffff',
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.8rem',
                      fontWeight: '800'
                    }}>1</span>
                    Cliente Titular
                  </label>

                  <button
                    type="button"
                    onClick={() => {
                      setIsCreatingNewClient(!isCreatingNewClient);
                      setSelectedClient(null);
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--accent-hover)',
                      fontSize: '0.84rem',
                      fontWeight: '700',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem'
                    }}
                  >
                    {isCreatingNewClient ? '← Seleccionar Cliente Existente' : '+ Crear Nuevo Cliente Rápido'}
                  </button>
                </div>

                {!isCreatingNewClient ? (
                  !selectedClient ? (
                    <div>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        backgroundColor: '#f8fafc',
                        border: '1.5px solid var(--border)',
                        borderRadius: 'var(--radius-md)',
                        padding: '0.55rem 0.85rem',
                        gap: '0.65rem'
                      }}>
                        <Search size={18} color="var(--text-muted)" />
                        <input
                          type="text"
                          placeholder="Buscar cliente por nombre, cédula o teléfono..."
                          value={clientSearch}
                          onChange={e => setClientSearch(e.target.value)}
                          style={{ flex: 1, border: 'none', outline: 'none', backgroundColor: 'transparent', fontSize: '0.92rem' }}
                        />
                      </div>

                      <div style={{
                        marginTop: '0.5rem',
                        maxHeight: '160px',
                        overflowY: 'auto',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: '#ffffff'
                      }}>
                        {filteredClients.map(c => (
                          <div
                            key={c.id}
                            onClick={() => {
                              setSelectedClient(c);
                              setClientSearch('');
                            }}
                            style={{
                              padding: '0.6rem 0.85rem',
                              borderBottom: '1px solid #f1f5f9',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              cursor: 'pointer'
                            }}
                            onMouseOver={e => e.currentTarget.style.backgroundColor = '#f8fafc'}
                            onMouseOut={e => e.currentTarget.style.backgroundColor = '#ffffff'}
                          >
                            <div>
                              <strong style={{ fontSize: '0.9rem', color: 'var(--text-main)' }}>{c.name}</strong>
                              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginLeft: '0.5rem' }}>
                                {c.documentId ? `RNC/Cédula: ${c.documentId}` : ''} {c.phone ? `· ${c.phone}` : ''}
                              </span>
                            </div>
                            <span style={{ fontSize: '0.78rem', color: 'var(--primary)', fontWeight: '700' }}>Seleccionar</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div style={{
                      backgroundColor: '#f0fdf4',
                      border: '1.5px solid #86efac',
                      borderRadius: 'var(--radius-sm)',
                      padding: '0.75rem 1rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <div>
                        <strong style={{ color: '#166534', fontSize: '0.95rem' }}>{selectedClient.name}</strong>
                        <span style={{ fontSize: '0.82rem', color: '#15803d', display: 'block' }}>
                          Documento: {selectedClient.documentId || 'N/A'} · Teléfono: {selectedClient.phone || 'N/A'}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedClient(null)}
                        style={{ background: 'none', border: 'none', color: '#dc2626', fontSize: '0.82rem', fontWeight: '700', cursor: 'pointer' }}
                      >
                        Cambiar
                      </button>
                    </div>
                  )
                ) : (
                  /* Formulario de Nuevo Cliente Rápido */
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
                    <div>
                      <label style={{ fontSize: '0.82rem', fontWeight: '700' }}>Nombre Completo / Razón Social *</label>
                      <input
                        type="text"
                        required
                        placeholder="Ej. Juan Pérez o Empresa SRL"
                        value={newClientData.name}
                        onChange={e => setNewClientData({ ...newClientData, name: e.target.value })}
                        style={{ width: '100%', padding: '0.5rem 0.7rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', marginTop: '0.25rem' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.82rem', fontWeight: '700' }}>Cédula / RNC</label>
                      <input
                        type="text"
                        placeholder="001-0000000-0"
                        value={newClientData.documentId}
                        onChange={e => setNewClientData({ ...newClientData, documentId: e.target.value })}
                        style={{ width: '100%', padding: '0.5rem 0.7rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', marginTop: '0.25rem' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.82rem', fontWeight: '700' }}>Teléfono</label>
                      <input
                        type="text"
                        placeholder="809-000-0000"
                        value={newClientData.phone}
                        onChange={e => setNewClientData({ ...newClientData, phone: e.target.value })}
                        style={{ width: '100%', padding: '0.5rem 0.7rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', marginTop: '0.25rem' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.82rem', fontWeight: '700' }}>Correo Electrónico</label>
                      <input
                        type="email"
                        placeholder="cliente@email.com"
                        value={newClientData.email}
                        onChange={e => setNewClientData({ ...newClientData, email: e.target.value })}
                        style={{ width: '100%', padding: '0.5rem 0.7rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', marginTop: '0.25rem' }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* SECCIÓN 2: DATOS DE LA PÓLIZA */}
              <div style={{
                backgroundColor: '#ffffff',
                border: '1.5px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                padding: '1.25rem',
                boxShadow: 'var(--shadow-sm)',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem'
              }}>
                <label style={{ fontWeight: '800', fontSize: '0.98rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  <span style={{
                    backgroundColor: 'var(--primary)',
                    color: '#ffffff',
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.8rem',
                    fontWeight: '800'
                  }}>2</span>
                  Datos de la Póliza
                </label>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.85rem' }}>
                  <div style={{ minWidth: 0 }}>
                    <label style={{ fontWeight: '700', fontSize: '0.84rem' }}># de Póliza *</label>
                    <input
                      ref={policyInputRef}
                      type="text"
                      required
                      placeholder="Ej. POL-2026-001"
                      value={policyId}
                      onChange={e => setPolicyId(e.target.value)}
                      style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: 'var(--radius-sm)', border: '1.5px solid var(--border)', marginTop: '0.25rem', fontWeight: '700', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div style={{ minWidth: 0 }}>
                    <label style={{ fontWeight: '700', fontSize: '0.84rem' }}>Compañía Aseguradora</label>
                    <select
                      value={insurer}
                      onChange={e => setInsurer(e.target.value)}
                      style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: 'var(--radius-sm)', border: '1.5px solid var(--border)', marginTop: '0.25rem', fontWeight: '600', boxSizing: 'border-box' }}
                    >
                      {(companies && companies.length > 0 ? companies : [
                        { name: 'La Colonial de Seguros' },
                        { name: 'Seguros Universal' },
                        { name: 'Humano Seguros' },
                        { name: 'Mapfre BHD Seguros' },
                        { name: 'Seguros Reservas' },
                        { name: 'Seguros Sura' },
                        { name: 'General de Seguros' },
                        { name: 'Dominicana de Seguros' }
                      ]).map((c, i) => (
                        <option key={i} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div style={{ minWidth: 0 }}>
                    <label style={{ fontWeight: '700', fontSize: '0.84rem' }}>Ramo / Tipo de Seguro</label>
                    <select
                      value={policyType}
                      onChange={e => setPolicyType(e.target.value)}
                      style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: 'var(--radius-sm)', border: '1.5px solid var(--border)', marginTop: '0.25rem', fontWeight: '600', boxSizing: 'border-box' }}
                    >
                      {POLICY_TYPES.map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>

                  <div style={{ minWidth: 0 }}>
                    <label style={{ fontWeight: '700', fontSize: '0.84rem' }}>Cartera / Agente</label>
                    <select
                      value={cartera}
                      onChange={e => setCartera(e.target.value)}
                      style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: 'var(--radius-sm)', border: '1.5px solid var(--border)', marginTop: '0.25rem', fontWeight: '600', boxSizing: 'border-box' }}
                    >
                      <option value="Santiago Morales y Asociados, S.R.L.">Santiago Morales y Asociados (Cód. 8055)</option>
                      <option value="Raquel Rodríguez">Raquel Rodríguez (Cód. 897)</option>
                    </select>
                  </div>
                </div>

                {/* Montos y Periodicidad */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.85rem' }}>
                  <div style={{ minWidth: 0 }}>
                    <label style={{ fontWeight: '700', fontSize: '0.84rem' }}>Prima Total *</label>
                    <div style={{ display: 'flex', gap: '0.45rem', marginTop: '0.25rem', alignItems: 'center' }}>
                      <select
                        value={currency}
                        onChange={e => setCurrency(e.target.value)}
                        style={{
                          width: '90px',
                          minWidth: '90px',
                          flexShrink: 0,
                          padding: '0.55rem 0.5rem',
                          borderRadius: 'var(--radius-sm)',
                          border: '1.5px solid var(--border)',
                          fontWeight: '700',
                          backgroundColor: '#f8fafc',
                          cursor: 'pointer',
                          boxSizing: 'border-box'
                        }}
                      >
                        <option value="DOP">DOP</option>
                        <option value="USD">USD</option>
                      </select>
                      <input
                        type="number"
                        step="any"
                        required
                        placeholder="0.00"
                        value={amount}
                        onChange={e => setAmount(e.target.value)}
                        style={{
                          flex: 1,
                          minWidth: 0,
                          width: '100%',
                          padding: '0.55rem 0.75rem',
                          borderRadius: 'var(--radius-sm)',
                          border: '1.5px solid var(--border)',
                          fontWeight: '700',
                          fontSize: '0.95rem',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ minWidth: 0 }}>
                    <label style={{ fontWeight: '700', fontSize: '0.84rem' }}>Suma Asegurada (Opcional)</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="0.00"
                      value={insuredAmount}
                      onChange={e => setInsuredAmount(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.55rem 0.75rem',
                        borderRadius: 'var(--radius-sm)',
                        border: '1.5px solid var(--border)',
                        marginTop: '0.25rem',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  <div style={{ minWidth: 0 }}>
                    <label style={{ fontWeight: '700', fontSize: '0.84rem', color: '#0369a1' }}>% Comisión Individual *</label>
                    <div style={{ position: 'relative', marginTop: '0.25rem' }}>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="100"
                        required
                        placeholder="15.0"
                        value={commissionRate}
                        onChange={e => setCommissionRate(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '0.55rem 1.6rem 0.55rem 0.75rem',
                          borderRadius: 'var(--radius-sm)',
                          border: '1.5px solid #93c5fd',
                          fontWeight: '700',
                          color: '#0369a1',
                          boxSizing: 'border-box'
                        }}
                      />
                      <span style={{ position: 'absolute', right: '0.6rem', top: '50%', transform: 'translateY(-50%)', fontWeight: '700', color: '#64748b' }}>%</span>
                    </div>
                  </div>

                  <div style={{ minWidth: 0 }}>
                    <label style={{ fontWeight: '700', fontSize: '0.84rem' }}>Periodicidad de Pago</label>
                    <select
                      value={renewalFrequency}
                      onChange={e => setRenewalFrequency(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.55rem 0.75rem',
                        borderRadius: 'var(--radius-sm)',
                        border: '1.5px solid var(--border)',
                        marginTop: '0.25rem',
                        fontWeight: '600',
                        boxSizing: 'border-box'
                      }}
                    >
                      {FREQUENCIES.map(f => (
                        <option key={f.id} value={f.id}>{f.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Vigencias */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.85rem' }}>
                  <div style={{ minWidth: 0 }}>
                    <label style={{ fontWeight: '700', fontSize: '0.84rem' }}>Fecha Inicio Vigencia *</label>
                    <input
                      type="date"
                      required
                      value={startDate}
                      onChange={e => setStartDate(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.55rem 0.75rem',
                        borderRadius: 'var(--radius-sm)',
                        border: '1.5px solid var(--border)',
                        marginTop: '0.25rem',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <label style={{ fontWeight: '700', fontSize: '0.84rem' }}>Fecha Vencimiento Vigencia *</label>
                    <input
                      type="date"
                      required
                      value={endDate}
                      onChange={e => setEndDate(e.target.value)}
                      style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: 'var(--radius-sm)', border: '1.5px solid var(--border)', marginTop: '0.25rem' }}
                    />
                  </div>
                </div>

                {/* Notas / Detalle */}
                <div>
                  <label style={{ fontWeight: '700', fontSize: '0.84rem' }}>Descripción / Bien Asegurado</label>
                  <textarea
                    rows="2"
                    placeholder="Ej. Honda CR-V 2024, Chasis #..., Placa #... o Coberturas especiales..."
                    value={details}
                    onChange={e => setDetails(e.target.value)}
                    style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: 'var(--radius-sm)', border: '1.5px solid var(--border)', marginTop: '0.25rem', boxSizing: 'border-box' }}
                  />
                </div>

                {/* Adjuntos */}
                <div>
                  <label style={{ fontWeight: '700', fontSize: '0.84rem', display: 'block', marginBottom: '0.25rem' }}>
                    Documentos Iniciales (Carátula, Matrícula, Cédula)
                  </label>
                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    padding: '0.75rem',
                    border: '2px dashed var(--border)',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: '#f8fafc',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    color: 'var(--primary)',
                    fontWeight: '600'
                  }}>
                    <Upload size={16} />
                    <span>Seleccionar archivos para adjuntar</span>
                    <input type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx" style={{ display: 'none' }} onChange={handleFileUpload} />
                  </label>

                  {attachedFiles.length > 0 && (
                    <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                      {attachedFiles.map((file, idx) => (
                        <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#eff6ff', borderRadius: 'var(--radius-sm)', padding: '0.3rem 0.65rem', fontSize: '0.8rem' }}>
                          <span style={{ color: '#1d4ed8', fontWeight: '600' }}>📎 {file.name}</span>
                          <button type="button" onClick={() => handleRemoveFile(idx)} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontWeight: '800' }}>✕</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
                <button type="button" className="btn" onClick={onClose} disabled={isSubmitting} style={{ backgroundColor: '#f1f5f9', fontWeight: '700' }}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting} style={{ fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  {isSubmitting ? <RefreshCw size={16} className="animate-spin" /> : <Check size={16} />}
                  {isSubmitting ? 'Guardando Póliza...' : 'Guardar Nueva Póliza'}
                </button>
              </div>
            </form>
          )}

        </div>
      </div>
    </div>
  );
};

export default QuickPolicyModal;
