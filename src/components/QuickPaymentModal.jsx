import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  DollarSign, Plus, Search, X, Check, FileText, Calendar, 
  CreditCard, Paperclip, Upload, ArrowRight, CheckCircle2, 
  Printer, User, Building, Layers, RefreshCw, AlertCircle, Sparkles
} from 'lucide-react';
import { useUser } from '../context/UserContext';
import { insertCobroHasura, updatePolicyHasura, insertMovimientoHasura } from '../services/hasuraService';
import { getPolicyPaymentStats, formatDateToDDMMYYYY, formatMoney, getNextRenewalDate } from '../utils/policyHelpers';
import ReceiptModal from './ReceiptModal';
import { fileToDataUri, formatFileSize } from '../services/documentsService';

const PAYMENT_TYPES = [
  'Cuota Mensual',
  'Fraccionamiento / Cuota',
  'Renovación',
  'Pago Total Anual',
  'Inicial / Emisión',
  'Endoso / Modificación',
  'Ajuste Tarifario',
  'Otro Pago'
];

const PAYMENT_METHODS = [
  'Efectivo',
  'Transferencia Bancaria',
  'Tarjeta de Crédito / Débito',
  'Cheque',
  'Cobro Automático Recurrente',
  'Depósito Bancario'
];

const QuickPaymentModal = ({
  isOpen,
  onClose,
  policies = [],
  setPolicies,
  payments = [],
  setPayments,
  clients = [],
  onNavigateToPolicy
}) => {
  const { isDemo } = useUser();
  const searchInputRef = useRef(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPolicy, setSelectedPolicy] = useState(null);

  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('DOP');
  const [paymentType, setPaymentType] = useState('Cuota Mensual');
  const [paymentMethod, setPaymentMethod] = useState('Transferencia Bancaria');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [attachedFiles, setAttachedFiles] = useState([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successResult, setSuccessResult] = useState(null);
  const [viewingReceiptPayment, setViewingReceiptPayment] = useState(null);

  useEffect(() => {
    if (isOpen) {
      resetForm();
      setTimeout(() => {
        if (searchInputRef.current) searchInputRef.current.focus();
      }, 100);
    }
  }, [isOpen]);

  const resetForm = () => {
    setSearchQuery('');
    setSelectedPolicy(null);
    setAmount('');
    setCurrency('DOP');
    setPaymentType('Cuota Mensual');
    setPaymentMethod('Transferencia Bancaria');
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setDueDate('');
    setReference('');
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

  const handleSelectPolicy = (policy) => {
    setSelectedPolicy(policy);
    setSearchQuery('');

    const stats = getPolicyPaymentStats(policy, payments);
    if (stats && stats.totalOwed > 0) {
      setAmount(stats.totalOwed.toString());
    } else if (policy.amount) {
      setAmount((policy.amount / (policy.renewalFrequency === 'Mensual' ? 12 : policy.renewalFrequency === 'Trimestral' ? 4 : policy.renewalFrequency === 'Semestral' ? 2 : 1)).toFixed(2));
    }
    if (policy.currency) setCurrency(policy.currency);
  };

  const handleFilesChange = async (e) => {
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
              date: paymentDate
            };
          })
        );
        setAttachedFiles(prev => [...prev, ...newDocs]);
      } catch (err) {
        console.error('Error cargando archivos:', err);
        alert('Error al procesar uno o más archivos.');
      }
      e.target.value = '';
    }
  };

  const handleRemoveFile = (docId) => {
    setAttachedFiles(prev => prev.filter(d => d.id !== docId));
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();

    if (!selectedPolicy) {
      alert('Por favor selecciona la póliza a la cual registrarle el pago.');
      return;
    }

    const cleanAmount = parseFloat(String(amount).replace(/[^0-9.]/g, '')) || 0;
    if (cleanAmount <= 0) {
      alert('Por favor ingresa un monto de pago válido.');
      return;
    }

    setIsSubmitting(true);

    try {
      const receiptId = `REC-${Date.now().toString().slice(-6)}`;
      const currentStats = getPolicyPaymentStats(selectedPolicy, payments);
      const totalOwedBefore = currentStats ? currentStats.totalOwed : (selectedPolicy.amount || 0);
      const remainingBalance = Math.max(0, totalOwedBefore - cleanAmount);

      const primaryComprobante = attachedFiles.length > 0 ? attachedFiles[0].dataUri : null;

      const newPayment = {
        id: receiptId,
        numero_recibo: receiptId,
        polizaId: selectedPolicy.rawId || selectedPolicy.id,
        policyId: selectedPolicy.id,
        clienteId: selectedPolicy.clienteId || null,
        client: selectedPolicy.client,
        policy: `${selectedPolicy.type} - ${selectedPolicy.insurer} (${selectedPolicy.id})`,
        amount: formatMoney(cleanAmount, currency),
        amountNum: cleanAmount,
        currency,
        remainingBalance: remainingBalance,
        totalPremium: selectedPolicy.amount || 0,
        date: paymentDate,
        dueDate: dueDate || paymentDate,
        type: paymentType,
        paymentMethod,
        reference: reference.trim(),
        receiptUrl: primaryComprobante,
        comprobante: primaryComprobante,
        attachedDocs: attachedFiles,
        notes: notes.trim() ? `${notes.trim()} (Ref: ${reference || 'S/R'})` : (reference ? `Ref: ${reference}` : ''),
        status: 'Paid'
      };

      // Update state
      if (setPayments) {
        setPayments(prev => [newPayment, ...(prev || [])]);
      }

      // REGLA DE NEGOCIO: Si la póliza seleccionada estaba cancelada, reabrirla automáticamente
      const isPolicyCancelled = selectedPolicy.status === 'Cancelada' || selectedPolicy.status === 'Cancelled';
      let policyToSave = selectedPolicy;

      if (isPolicyCancelled) {
        const todayStr = new Date().toISOString().split('T')[0];
        const nextEndDate = getNextRenewalDate(todayStr, selectedPolicy.renewalFrequency || 'Anual');
        policyToSave = {
          ...selectedPolicy,
          status: 'Active',
          lastRenewalDate: todayStr,
          endDate: nextEndDate,
          renewal: nextEndDate,
          movements: [
            ...(selectedPolicy.movements || []),
            {
              id: (selectedPolicy.movements?.length || 0) + 1,
              date: todayStr,
              type: 'Reapertura Automática por Pago',
              description: `Póliza reactivada y reabierta automáticamente tras registrarse cobro ${receiptId} (${formatMoney(cleanAmount)} ${currency}). Vigencia extendida hasta ${formatDateToDDMMYYYY(nextEndDate)}.`,
              evidence: receiptFile ? receiptFile.name : 'Recibo ' + receiptId
            }
          ]
        };

        if (setPolicies) {
          setPolicies(prev => prev.map(p => p.id === selectedPolicy.id ? policyToSave : p));
        }
      }

      // Persist in Hasura PostgreSQL
      if (!isDemo) {
        try {
          await insertCobroHasura(newPayment, isDemo);

          if (isPolicyCancelled) {
            const todayStr = new Date().toISOString().split('T')[0];
            const nextEndDate = getNextRenewalDate(todayStr, selectedPolicy.renewalFrequency || 'Anual');

            await updatePolicyHasura(selectedPolicy.rawId || selectedPolicy.id, {
              status: 'Active',
              vigencia_fin: nextEndDate,
              vigencia_inicio: todayStr
            }, isDemo);

            await insertMovimientoHasura({
              polizaId: selectedPolicy.rawId || selectedPolicy.id,
              date: todayStr,
              type: 'Reapertura Automática por Pago',
              description: `Póliza reactivada y reabierta automáticamente tras registrarse cobro ${receiptId} (${formatMoney(cleanAmount)} ${currency}).`,
              evidence: receiptFile ? receiptFile.name : 'Recibo ' + receiptId
            }, isDemo);
          }
        } catch (dbErr) {
          console.warn('Error registrando cobro/reapertura en Hasura:', dbErr);
        }
      }

      setSuccessResult({
        payment: newPayment,
        policy: policyToSave
      });

    } catch (err) {
      console.error('Error registrando pago:', err);
      alert(`Ocurrió un error al registrar el pago: ${err.message}`);
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
        maxWidth: '820px',
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
          background: 'linear-gradient(135deg, #15803d 0%, #166534 100%)',
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
              <DollarSign size={24} />
            </div>
            <div>
              <h3 style={{ margin: 0, color: '#ffffff', fontSize: '1.3rem', fontWeight: '800', letterSpacing: '-0.02em' }}>
                Registrar Pago de Prima
              </h3>
              <p style={{ margin: '0.15rem 0 0 0', fontSize: '0.86rem', color: '#dcfce7', opacity: 0.9 }}>
                Registro ágil de pagos, cuotas y emisión de recibos oficiales
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
                  ¡Pago Registrado Exitosamente!
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', margin: 0, maxWidth: '540px' }}>
                  Recibo <strong>{successResult.payment.id}</strong> por valor de <strong>{successResult.payment.amount} {successResult.payment.currency}</strong> para la póliza <strong>{successResult.policy.id}</strong>.
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
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>Cliente:</span>
                  <span style={{ fontWeight: '700', fontSize: '0.92rem' }}>{successResult.policy.client}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>Póliza &amp; Concepto:</span>
                  <span style={{ fontWeight: '600', fontSize: '0.92rem' }}>{successResult.policy.id} · {successResult.payment.type}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>Método de Pago:</span>
                  <span style={{ fontWeight: '700', color: '#15803d', fontSize: '0.92rem' }}>{successResult.payment.paymentMethod}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>Fecha:</span>
                  <span style={{ fontWeight: '600', fontSize: '0.92rem' }}>{formatDateToDDMMYYYY(successResult.payment.date)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>Balance Restante:</span>
                  <span style={{ fontWeight: '800', fontSize: '0.95rem', color: (successResult.payment.remainingBalance || 0) > 0 ? '#b45309' : '#15803d' }}>
                    {(successResult.payment.remainingBalance || 0) > 0 ? formatMoney(successResult.payment.remainingBalance, successResult.payment.currency) : 'RD$ 0.00 (Póliza Saldada)'}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center', marginTop: '1rem' }}>
                <button
                  type="button"
                  className="btn"
                  onClick={() => setViewingReceiptPayment(successResult.payment)}
                  style={{
                    backgroundColor: '#15803d',
                    color: '#ffffff',
                    fontWeight: '700',
                    padding: '0.75rem 1.4rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem'
                  }}
                >
                  <Printer size={18} /> Imprimir / Ver Recibo
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
                  <Plus size={18} /> Registrar Otro Pago
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
          ) : (
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
                  <label style={{ fontWeight: '800', fontSize: '0.98rem', color: '#166534', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                    <span style={{
                      backgroundColor: '#166534',
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
                    Seleccionar Póliza a Registrar Pago
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
                        placeholder="Buscar póliza por número, asegurado o compañía..."
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
                      {filteredPolicies.map(p => {
                        const stats = getPolicyPaymentStats(p, payments);
                        return (
                          <div
                            key={p.id}
                            onClick={() => handleSelectPolicy(p)}
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
                                {p.client} ({p.insurer})
                              </span>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <span style={{ fontSize: '0.82rem', fontWeight: '700', color: stats.totalOwed > 0 ? '#dc2626' : '#16a34a' }}>
                                {stats.totalOwed > 0 ? `Pendiente: ${formatMoney(stats.totalOwed)}` : 'Al día'}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div style={{
                    backgroundColor: '#f0fdf4',
                    border: '1.5px solid #86efac',
                    borderRadius: 'var(--radius-md)',
                    padding: '1rem',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                    gap: '0.75rem'
                  }}>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: '#166534', fontWeight: '700', textTransform: 'uppercase' }}>Póliza &amp; Cliente</span>
                      <strong style={{ fontSize: '1rem', color: '#14532d', display: 'block' }}>{selectedPolicy.id}</strong>
                      <span style={{ fontSize: '0.85rem', color: '#15803d' }}>{selectedPolicy.client}</span>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: '#166534', fontWeight: '700', textTransform: 'uppercase' }}>Aseguradora</span>
                      <strong style={{ fontSize: '0.92rem', color: '#14532d', display: 'block' }}>{selectedPolicy.insurer}</strong>
                      <span style={{ fontSize: '0.82rem', color: '#15803d' }}>Ramo: {selectedPolicy.type}</span>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: '#166534', fontWeight: '700', textTransform: 'uppercase' }}>Estado de Pago</span>
                      {(() => {
                        const stats = getPolicyPaymentStats(selectedPolicy, payments);
                        return (
                          <div>
                            <strong style={{ fontSize: '0.92rem', color: stats.totalOwed > 0 ? '#dc2626' : '#15803d', display: 'block' }}>
                              {stats.totalOwed > 0 ? `Debe: ${formatMoney(stats.totalOwed)} DOP` : 'Al Día'}
                            </strong>
                            <span style={{ fontSize: '0.78rem', color: '#166534' }}>Prima: {formatMoney(selectedPolicy.amount)} {selectedPolicy.currency || 'DOP'}</span>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                )}
              </div>

              {/* DATOS DEL PAGO */}
              <div style={{
                backgroundColor: '#ffffff',
                border: '1.5px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                padding: '1.25rem',
                boxShadow: 'var(--shadow-sm)',
                display: 'flex',
                flexDirection: 'column',
                gap: '1.15rem'
              }}>
                <label style={{ fontWeight: '800', fontSize: '0.98rem', color: '#166534', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  <span style={{
                    backgroundColor: '#166534',
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
                  Detalles del Pago
                </label>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                  <div>
                    <label style={{ fontWeight: '700', fontSize: '0.84rem', display: 'block', marginBottom: '0.35rem' }}>Monto Pagado *</label>
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <select
                        value={currency}
                        onChange={e => setCurrency(e.target.value)}
                        style={{
                          width: '90px',
                          flexShrink: 0,
                          padding: '0.6rem 0.5rem',
                          borderRadius: 'var(--radius-sm)',
                          border: '1.5px solid var(--border)',
                          fontWeight: '700',
                          backgroundColor: '#ffffff'
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
                          padding: '0.6rem 0.75rem',
                          borderRadius: 'var(--radius-sm)',
                          border: '1.5px solid var(--border)',
                          fontWeight: '700',
                          boxSizing: 'border-box',
                          backgroundColor: '#ffffff'
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ fontWeight: '700', fontSize: '0.84rem', display: 'block', marginBottom: '0.35rem' }}>Concepto / Tipo de Pago</label>
                    <select
                      value={paymentType}
                      onChange={e => setPaymentType(e.target.value)}
                      style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: 'var(--radius-sm)', border: '1.5px solid var(--border)', fontWeight: '600', backgroundColor: '#ffffff', boxSizing: 'border-box' }}
                    >
                      {PAYMENT_TYPES.map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ fontWeight: '700', fontSize: '0.84rem', display: 'block', marginBottom: '0.35rem' }}>Método de Pago</label>
                    <select
                      value={paymentMethod}
                      onChange={e => setPaymentMethod(e.target.value)}
                      style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: 'var(--radius-sm)', border: '1.5px solid var(--border)', fontWeight: '600', backgroundColor: '#ffffff', boxSizing: 'border-box' }}
                    >
                      {PAYMENT_METHODS.map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                  <div>
                    <label style={{ fontWeight: '700', fontSize: '0.84rem', display: 'block', marginBottom: '0.35rem' }}>Fecha de Pago *</label>
                    <input
                      type="date"
                      required
                      value={paymentDate}
                      onChange={e => setPaymentDate(e.target.value)}
                      style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: 'var(--radius-sm)', border: '1.5px solid var(--border)', boxSizing: 'border-box', backgroundColor: '#ffffff' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontWeight: '700', fontSize: '0.84rem', display: 'block', marginBottom: '0.35rem' }}># Referencia / Voucher / Cheque</label>
                    <input
                      type="text"
                      placeholder="Ej. TRANSF-992384 o Chq #1234"
                      value={reference}
                      onChange={e => setReference(e.target.value)}
                      style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: 'var(--radius-sm)', border: '1.5px solid var(--border)', boxSizing: 'border-box', backgroundColor: '#ffffff' }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ fontWeight: '700', fontSize: '0.84rem', display: 'block', marginBottom: '0.35rem' }}>Notas Adicionales</label>
                  <input
                    type="text"
                    placeholder="Ej. Pago de cuota 2 de 4 correspondiente al mes en curso..."
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: 'var(--radius-sm)', border: '1.5px solid var(--border)', boxSizing: 'border-box', backgroundColor: '#ffffff' }}
                  />
                </div>

                {/* Adjuntar Documento o Comprobante (Opcional) */}
                <div>
                  <label style={{ fontWeight: '700', fontSize: '0.84rem', display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.35rem', color: '#1e293b' }}>
                    <Paperclip size={15} color="#0284c7" /> Adjuntar Comprobantes o Documentos de Pago (Opcional - Múltiples)
                  </label>
                  <input
                    type="file"
                    multiple
                    accept="image/*,.pdf"
                    onChange={handleFilesChange}
                    style={{
                      width: '100%',
                      padding: '0.55rem 0.75rem',
                      borderRadius: 'var(--radius-sm)',
                      border: '1.5px dashed var(--border)',
                      boxSizing: 'border-box',
                      backgroundColor: '#f8fafc',
                      fontSize: '0.84rem'
                    }}
                  />
                  {attachedFiles.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginTop: '0.45rem' }}>
                      {attachedFiles.map((file) => (
                        <div key={file.id} style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '0.45rem 0.75rem',
                          backgroundColor: '#f0fdf4',
                          border: '1px solid #bbf7d0',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '0.82rem'
                        }}>
                          <span style={{ color: '#166534', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.35rem', minWidth: 0 }}>
                            <CheckCircle2 size={15} color="#16a34a" style={{ flexShrink: 0 }} />
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {file.name}
                            </span>
                            <span style={{ fontSize: '0.75rem', color: '#15803d', flexShrink: 0 }}>({file.size})</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveFile(file.id)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#dc2626',
                              cursor: 'pointer',
                              fontWeight: '700',
                              fontSize: '0.78rem',
                              padding: '2px 6px',
                              flexShrink: 0
                            }}
                          >
                            ✕ Quitar
                          </button>
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
                <button type="submit" className="btn btn-primary" disabled={isSubmitting || !selectedPolicy} style={{ backgroundColor: '#15803d', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  {isSubmitting ? <RefreshCw size={16} className="animate-spin" /> : <Check size={16} />}
                  {isSubmitting ? 'Registrando Pago...' : 'Registrar Pago'}
                </button>
              </div>
            </form>
          )}

        </div>

        {/* Modal Visor de Recibo Oficial si se solicita */}
        {viewingReceiptPayment && (
          <ReceiptModal
            isOpen={!!viewingReceiptPayment}
            onClose={() => setViewingReceiptPayment(null)}
            payment={viewingReceiptPayment}
            policy={selectedPolicy}
          />
        )}

      </div>
    </div>
  );
};

export default QuickPaymentModal;
