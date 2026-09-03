import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  AlertTriangle, ShieldAlert, Plus, Search, X, Check, FileText, 
  Calendar, DollarSign, Shield, Paperclip, Upload, ArrowRight, 
  CheckCircle2, Phone, User, Building, Layers, RefreshCw, Clock
} from 'lucide-react';
import { useUser } from '../context/UserContext';
import { insertSiniestroHasura } from '../services/hasuraService';
import { formatDateToDDMMYYYY, formatMoney, isOpenClaim } from '../utils/policyHelpers';

const TYPE_OPTIONS = [
  'Auto – Colisión',
  'Auto – Robo',
  'Auto – Responsabilidad Civil',
  'Salud – Hospitalización',
  'Salud – Emergencia',
  'Salud – Cirugía',
  'Propiedad – Incendio',
  'Propiedad – Robo',
  'Propiedad – Inundación',
  'Vida',
  'Incendio Comercial',
  'Responsabilidad Civil',
  'Otro Siniestro'
];

const QuickClaimModal = ({
  isOpen,
  onClose,
  policies = [],
  claims = [],
  setClaims,
  onNavigate
}) => {
  const { isDemo } = useUser();
  const searchInputRef = useRef(null);

  const [activeTab, setActiveTab] = useState('new'); // 'new' | 'list'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPolicy, setSelectedPolicy] = useState(null);

  const [claimType, setClaimType] = useState(TYPE_OPTIONS[0]);
  const [occurrenceDate, setOccurrenceDate] = useState(new Date().toISOString().split('T')[0]);
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);
  const [amount, setAmount] = useState('');
  const [adjuster, setAdjuster] = useState('');
  const [phone, setPhone] = useState('');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [attachedFiles, setAttachedFiles] = useState([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successResult, setSuccessResult] = useState(null);

  const openClaimsList = useMemo(() => {
    return (claims || []).filter(isOpenClaim);
  }, [claims]);

  useEffect(() => {
    if (isOpen) {
      resetForm();
      setTimeout(() => {
        if (searchInputRef.current) searchInputRef.current.focus();
      }, 100);
    }
  }, [isOpen]);

  const resetForm = () => {
    setActiveTab('new');
    setSearchQuery('');
    setSelectedPolicy(null);
    setClaimType(TYPE_OPTIONS[0]);
    const today = new Date().toISOString().split('T')[0];
    setOccurrenceDate(today);
    setReportDate(today);
    setAmount('');
    setAdjuster('');
    setPhone('');
    setDescription('');
    setNotes('');
    setAttachedFiles([]);
    setIsSubmitting(false);
    setSuccessResult(null);
  };

  const filteredPolicies = useMemo(() => {
    if (!policies || policies.length === 0) return [];
    const q = searchQuery.trim().toLowerCase();
    if (!q) return policies.slice(0, 6);
    return policies.filter(p => 
      (p.id || '').toLowerCase().includes(q) ||
      (p.client || '').toLowerCase().includes(q) ||
      (p.insurer || '').toLowerCase().includes(q) ||
      (p.type || '').toLowerCase().includes(q)
    ).slice(0, 8);
  }, [policies, searchQuery]);

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

    if (!selectedPolicy) {
      alert('Por favor selecciona la póliza afectada por el siniestro.');
      return;
    }

    if (!description.trim()) {
      alert('Por favor describe brevemente cómo ocurrió el siniestro.');
      return;
    }

    setIsSubmitting(true);

    try {
      const claimId = `SIN-${String((claims || []).length + 1).padStart(4, '0')}`;
      const cleanAmount = parseFloat(String(amount).replace(/[^0-9.]/g, '')) || 0;

      const newClaim = {
        id: claimId,
        numero_siniestro: claimId,
        polizaId: selectedPolicy.rawId || selectedPolicy.id,
        policy: selectedPolicy.id,
        policyDesc: `${selectedPolicy.type} · ${selectedPolicy.insurer}`,
        clienteId: selectedPolicy.clienteId || null,
        client: selectedPolicy.client,
        type: claimType,
        date: occurrenceDate,
        reportDate,
        amount: formatMoney(cleanAmount),
        amountNum: cleanAmount,
        amountApproved: 'RD$ 0',
        amountApprovedNum: 0,
        adjuster: adjuster.trim(),
        phone: phone.trim(),
        description: description.trim(),
        notes: notes.trim(),
        status: 'Abierto',
        attachments: attachedFiles.map(f => f.name)
      };

      // Update state
      if (setClaims) {
        setClaims(prev => [newClaim, ...(prev || [])]);
      }

      // Persist in Hasura PostgreSQL
      if (!isDemo) {
        try {
          await insertSiniestroHasura(newClaim, isDemo);
        } catch (dbErr) {
          console.warn('Error insertando siniestro en Hasura:', dbErr);
        }
      }

      setSuccessResult({
        claim: newClaim,
        policy: selectedPolicy
      });

    } catch (err) {
      console.error('Error reportando siniestro:', err);
      alert(`Ocurrió un error al reportar el siniestro: ${err.message}`);
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
          background: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)',
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
              <AlertTriangle size={24} />
            </div>
            <div>
              <h3 style={{ margin: 0, color: '#ffffff', fontSize: '1.3rem', fontWeight: '800', letterSpacing: '-0.02em' }}>
                Gestión Rápida de Siniestros
              </h3>
              <p style={{ margin: '0.15rem 0 0 0', fontSize: '0.86rem', color: '#fee2e2', opacity: 0.9 }}>
                Reporte inmediato de reclamos y seguimiento de casos en curso
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

        {/* Tab Switcher */}
        {!successResult && (
          <div style={{
            display: 'flex',
            borderBottom: '1px solid var(--border)',
            backgroundColor: '#faf8f5',
            padding: '0 clamp(0.75rem, 2.5vw, 1.75rem)',
            overflowX: 'auto',
            maxWidth: '100%'
          }}>
            <button
              type="button"
              onClick={() => setActiveTab('new')}
              style={{
                padding: '0.85rem 1.25rem',
                border: 'none',
                borderBottom: activeTab === 'new' ? '3px solid #dc2626' : '3px solid transparent',
                backgroundColor: 'transparent',
                color: activeTab === 'new' ? '#dc2626' : 'var(--text-muted)',
                fontWeight: activeTab === 'new' ? '800' : '600',
                fontSize: '0.92rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem'
              }}
            >
              <Plus size={16} /> Reportar Nuevo Siniestro
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('list')}
              style={{
                padding: '0.85rem 1.25rem',
                border: 'none',
                borderBottom: activeTab === 'list' ? '3px solid #dc2626' : '3px solid transparent',
                backgroundColor: 'transparent',
                color: activeTab === 'list' ? '#dc2626' : 'var(--text-muted)',
                fontWeight: activeTab === 'list' ? '800' : '600',
                fontSize: '0.92rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem'
              }}
            >
              <Clock size={16} /> Casos Abiertos ({openClaimsList.length})
            </button>
          </div>
        )}

        {/* Body */}
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
                  ¡Siniestro Registrado Exitosamente!
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', margin: 0, maxWidth: '540px' }}>
                  El caso <strong>{successResult.claim.id}</strong> para la póliza <strong>{successResult.policy.id}</strong> ({successResult.policy.client}) ha sido abierto para trámite y seguimiento.
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
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}># Siniestro:</span>
                  <strong style={{ color: '#dc2626', fontSize: '0.95rem' }}>{successResult.claim.id}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>Tipo de Reclamo:</span>
                  <span style={{ fontWeight: '700', fontSize: '0.92rem' }}>{successResult.claim.type}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>Monto Reclamado:</span>
                  <span style={{ fontWeight: '700', color: 'var(--primary)', fontSize: '0.92rem' }}>{successResult.claim.amount} DOP</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>Fecha de Ocurrencia:</span>
                  <span style={{ fontWeight: '600', fontSize: '0.92rem' }}>{formatDateToDDMMYYYY(successResult.claim.date)}</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center', marginTop: '1rem' }}>
                <button
                  type="button"
                  className="btn"
                  onClick={() => {
                    onClose();
                    if (onNavigate) onNavigate('claims');
                  }}
                  style={{
                    backgroundColor: '#dc2626',
                    color: '#ffffff',
                    fontWeight: '700',
                    padding: '0.75rem 1.4rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem'
                  }}
                >
                  Gestionar en Módulo de Siniestros <ArrowRight size={18} />
                </button>

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
                  <Plus size={18} /> Reportar Otro Siniestro
                </button>

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
          ) : activeTab === 'list' ? (
            /* LISTA DE CASOS ABIERTOS */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong style={{ color: '#991b1b', fontSize: '1rem' }}>
                  Hay {openClaimsList.length} siniestro(s) abierto(s) que requieren seguimiento:
                </strong>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    if (onNavigate) onNavigate('claims');
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#dc2626',
                    fontWeight: '700',
                    fontSize: '0.86rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem'
                  }}
                >
                  Ver todos en Siniestros <ArrowRight size={14} />
                </button>
              </div>

              {openClaimsList.length > 0 ? (
                openClaimsList.map(c => (
                  <div
                    key={c.id}
                    style={{
                      backgroundColor: '#ffffff',
                      border: '1.5px solid #fecaca',
                      borderRadius: 'var(--radius-md)',
                      padding: '1rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      boxShadow: 'var(--shadow-sm)'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <strong style={{ color: '#dc2626', fontSize: '0.98rem' }}>{c.id}</strong>
                        <span style={{ backgroundColor: '#fee2e2', color: '#991b1b', padding: '0.15rem 0.5rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: '800' }}>
                          {c.status || 'Abierto'}
                        </span>
                        <span style={{ fontWeight: '700', fontSize: '0.92rem' }}>{c.type}</span>
                      </div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                        {c.client} · Póliza: <strong>{c.policy}</strong>
                      </div>
                      {c.adjuster && (
                        <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.15rem' }}>
                          Ajustador: {c.adjuster} {c.phone ? `(${c.phone})` : ''}
                        </div>
                      )}
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <strong style={{ fontSize: '1rem', color: 'var(--primary)', display: 'block' }}>
                        {c.amount} DOP
                      </strong>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {formatDateToDDMMYYYY(c.date)}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No hay siniestros abiertos pendientes en este momento.
                </div>
              )}
            </div>
          ) : (
            /* FORMULARIO DE NUEVO SINIESTRO */
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.35rem' }}>
              
              {/* SELECCIÓN DE PÓLIZA */}
              <div style={{
                backgroundColor: '#ffffff',
                border: '1.5px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                padding: '1.25rem',
                boxShadow: 'var(--shadow-sm)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
                  <label style={{ fontWeight: '800', fontSize: '0.98rem', color: '#dc2626', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                    <span style={{
                      backgroundColor: '#dc2626',
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
                    Póliza del Siniestro
                  </label>

                  {selectedPolicy && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedPolicy(null);
                        setSearchQuery('');
                      }}
                      style={{ background: 'none', border: 'none', color: 'var(--accent-hover)', fontSize: '0.84rem', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                    >
                      <RefreshCw size={14} /> Cambiar Póliza
                    </button>
                  )}
                </div>

                {!selectedPolicy ? (
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
                        ref={searchInputRef}
                        type="text"
                        placeholder="Buscar póliza por número, asegurado o ramo..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        style={{ flex: 1, border: 'none', outline: 'none', backgroundColor: 'transparent', fontSize: '0.92rem' }}
                      />
                    </div>

                    <div style={{
                      marginTop: '0.5rem',
                      maxHeight: '180px',
                      overflowY: 'auto',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: '#ffffff'
                    }}>
                      {filteredPolicies.map(p => (
                        <div
                          key={p.id}
                          onClick={() => {
                            setSelectedPolicy(p);
                            setSearchQuery('');
                          }}
                          style={{
                            padding: '0.65rem 0.85rem',
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
                            <strong style={{ fontSize: '0.92rem', color: 'var(--text-main)' }}>{p.id}</strong>
                            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginLeft: '0.5rem' }}>
                              {p.client} · {p.insurer} ({p.type})
                            </span>
                          </div>
                          <span style={{ fontSize: '0.78rem', color: '#dc2626', fontWeight: '700' }}>Seleccionar</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div style={{
                    backgroundColor: '#fef2f2',
                    border: '1.5px solid #fca5a5',
                    borderRadius: 'var(--radius-md)',
                    padding: '1rem',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                    gap: '0.75rem'
                  }}>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: '#991b1b', fontWeight: '700', textTransform: 'uppercase' }}>Póliza &amp; Cliente</span>
                      <strong style={{ fontSize: '1rem', color: '#7f1d1d', display: 'block' }}>{selectedPolicy.id}</strong>
                      <span style={{ fontSize: '0.85rem', color: '#991b1b' }}>{selectedPolicy.client}</span>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: '#991b1b', fontWeight: '700', textTransform: 'uppercase' }}>Aseguradora</span>
                      <strong style={{ fontSize: '0.92rem', color: '#7f1d1d', display: 'block' }}>{selectedPolicy.insurer}</strong>
                      <span style={{ fontSize: '0.82rem', color: '#991b1b' }}>Ramo: {selectedPolicy.type}</span>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: '#991b1b', fontWeight: '700', textTransform: 'uppercase' }}>Vigencia</span>
                      <span style={{ fontSize: '0.85rem', color: '#7f1d1d', display: 'block', fontWeight: '600' }}>
                        Hasta {formatDateToDDMMYYYY(selectedPolicy.endDate || selectedPolicy.renewal)}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* DETALLES DEL SINIESTRO */}
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
                <label style={{ fontWeight: '800', fontSize: '0.98rem', color: '#dc2626', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  <span style={{
                    backgroundColor: '#dc2626',
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
                  Detalles del Siniestro / Reclamo
                </label>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.85rem' }}>
                  <div>
                    <label style={{ fontWeight: '700', fontSize: '0.84rem' }}>Tipo de Siniestro *</label>
                    <select
                      value={claimType}
                      onChange={e => setClaimType(e.target.value)}
                      style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: 'var(--radius-sm)', border: '1.5px solid var(--border)', marginTop: '0.25rem', fontWeight: '600' }}
                    >
                      {TYPE_OPTIONS.map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ fontWeight: '700', fontSize: '0.84rem' }}>Monto Reclamado Estimado (DOP) *</label>
                    <input
                      type="number"
                      step="any"
                      required
                      placeholder="0.00"
                      value={amount}
                      onChange={e => setAmount(e.target.value)}
                      style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: 'var(--radius-sm)', border: '1.5px solid var(--border)', marginTop: '0.25rem', fontWeight: '700' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.85rem' }}>
                  <div>
                    <label style={{ fontWeight: '700', fontSize: '0.84rem' }}>Fecha de Ocurrencia *</label>
                    <input
                      type="date"
                      required
                      value={occurrenceDate}
                      onChange={e => setOccurrenceDate(e.target.value)}
                      style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: 'var(--radius-sm)', border: '1.5px solid var(--border)', marginTop: '0.25rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontWeight: '700', fontSize: '0.84rem' }}>Fecha de Reporte *</label>
                    <input
                      type="date"
                      required
                      value={reportDate}
                      onChange={e => setReportDate(e.target.value)}
                      style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: 'var(--radius-sm)', border: '1.5px solid var(--border)', marginTop: '0.25rem' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.85rem' }}>
                  <div>
                    <label style={{ fontWeight: '700', fontSize: '0.84rem' }}>Ajustador / Perito (Opcional)</label>
                    <input
                      type="text"
                      placeholder="Ej. Ing. Manuel Torres"
                      value={adjuster}
                      onChange={e => setAdjuster(e.target.value)}
                      style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: 'var(--radius-sm)', border: '1.5px solid var(--border)', marginTop: '0.25rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontWeight: '700', fontSize: '0.84rem' }}>Teléfono Ajustador / Taller</label>
                    <input
                      type="text"
                      placeholder="809-000-0000"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: 'var(--radius-sm)', border: '1.5px solid var(--border)', marginTop: '0.25rem' }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ fontWeight: '700', fontSize: '0.84rem' }}>Descripción de los Hechos *</label>
                  <textarea
                    required
                    rows="3"
                    placeholder="Explica qué sucedió, lugar del hecho, involucrados o daños preliminares..."
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: 'var(--radius-sm)', border: '1.5px solid var(--border)', marginTop: '0.25rem', boxSizing: 'border-box' }}
                  />
                </div>

                {/* Adjuntos */}
                <div>
                  <label style={{ fontWeight: '700', fontSize: '0.84rem', display: 'block', marginBottom: '0.25rem' }}>
                    Fotos de Daños / Acta Policial / Presupuesto de Taller
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
                    color: '#dc2626',
                    fontWeight: '600'
                  }}>
                    <Upload size={16} />
                    <span>Seleccionar archivos para adjuntar</span>
                    <input type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx" style={{ display: 'none' }} onChange={handleFileUpload} />
                  </label>

                  {attachedFiles.length > 0 && (
                    <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                      {attachedFiles.map((file, idx) => (
                        <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fee2e2', borderRadius: 'var(--radius-sm)', padding: '0.3rem 0.65rem', fontSize: '0.8rem' }}>
                          <span style={{ color: '#991b1b', fontWeight: '600' }}>📎 {file.name}</span>
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
                <button type="submit" className="btn btn-primary" disabled={isSubmitting || !selectedPolicy} style={{ backgroundColor: '#dc2626', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  {isSubmitting ? <RefreshCw size={16} className="animate-spin" /> : <Check size={16} />}
                  {isSubmitting ? 'Reportando Siniestro...' : 'Reportar Siniestro'}
                </button>
              </div>
            </form>
          )}

        </div>
      </div>
    </div>
  );
};

export default QuickClaimModal;
