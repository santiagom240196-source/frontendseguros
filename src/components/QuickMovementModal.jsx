import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  RefreshCw, Plus, Search, X, Check, FileText, Calendar, 
  DollarSign, Shield, Paperclip, Upload, ArrowRight, 
  CheckCircle2, AlertCircle, AlertTriangle, User, Building, 
  ChevronRight, Sparkles, Tag, PlusCircle, MinusCircle, 
  Slash, Layers, FileCheck, Info
} from 'lucide-react';
import { useUser } from '../context/UserContext';
import { insertMovimientoHasura, updatePolicyHasura, insertSolicitudHasura } from '../services/hasuraService';
import { saveDocumentForEntity, fileToDataUri } from '../services/documentsService';
import { formatDateToDDMMYYYY, formatMoney } from '../utils/policyHelpers';

const MOVEMENT_TYPES = [
  { 
    id: 'Endoso', 
    label: 'Endoso / Modificación', 
    icon: RefreshCw, 
    color: '#2563eb', 
    bg: '#eff6ff', 
    borderColor: '#93c5fd',
    description: 'Cambio de datos, vehículo, coberturas o beneficiarios.' 
  },
  { 
    id: 'Renovación', 
    label: 'Renovación de Póliza', 
    icon: RefreshCw, 
    color: '#16a34a', 
    bg: '#f0fdf4', 
    borderColor: '#86efac',
    description: 'Extensión de vigencia y actualización de prima/condiciones.' 
  },
  { 
    id: 'Inclusión', 
    label: 'Inclusión', 
    icon: PlusCircle, 
    color: '#059669', 
    bg: '#ecfdf5', 
    borderColor: '#6ee7b7',
    description: 'Agregar nuevo asegurado, dependiente, vehículo o bien.' 
  },
  { 
    id: 'Exclusión', 
    label: 'Exclusión', 
    icon: MinusCircle, 
    color: '#ea580c', 
    bg: '#fff7ed', 
    borderColor: '#fdba74',
    description: 'Retirar asegurado, dependiente, vehículo o cobertura.' 
  },
  { 
    id: 'Cancelación', 
    label: 'Cancelación / Anulación', 
    icon: Slash, 
    color: '#dc2626', 
    bg: '#fef2f2', 
    borderColor: '#fca5a5',
    description: 'Baja formal de la póliza por venta, traspaso o renuncia.' 
  },
  { 
    id: 'Cambio de Plan', 
    label: 'Cambio de Plan / Cobertura', 
    icon: Layers, 
    color: '#7c3aed', 
    bg: '#f5f3ff', 
    borderColor: '#c4b5fd',
    description: 'Modificación de categoría de plan, deducible o sumas.' 
  },
  { 
    id: 'Ajuste de Prima', 
    label: 'Ajuste de Prima', 
    icon: DollarSign, 
    color: '#d97706', 
    bg: '#fffbeb', 
    borderColor: '#fde68a',
    description: 'Modificación tarifaria, descuento o recargo de prima.' 
  },
  { 
    id: 'Otro', 
    label: 'Otro Movimiento', 
    icon: FileText, 
    color: '#475569', 
    bg: '#f8fafc', 
    borderColor: '#cbd5e1',
    description: 'Cualquier otra gestión o requerimiento especial.' 
  }
];

const QUICK_TEMPLATES = {
  'Endoso': [
    'Cambio de dirección y teléfono del titular.',
    'Actualización de datos del conductor habitual.',
    'Cambio de beneficiario preferente / cesión de derechos.',
    'Corrección en los datos del bien asegurado.',
    'Emisión de endoso modificatorio por solicitud de la aseguradora.'
  ],
  'Inclusión': [
    'Inclusión de nuevo dependiente a la póliza de salud.',
    'Inclusión de accesorio / aditamento al vehículo asegurado.',
    'Inclusión de nuevo conductor autorizado.'
  ],
  'Exclusión': [
    'Exclusión de dependiente por mayoría de edad / solicitud del titular.',
    'Exclusión de vehículo vendido de la póliza flotilla.',
    'Retiro de cobertura opcional.'
  ],
  'Renovación': [
    'Renovación anual procesada con las mismas condiciones.',
    'Renovación con ajuste de suma asegurada por depreciación.',
    'Renovación negociada con mejora en tarifa de prima.'
  ],
  'Cancelación': [
    'Cancelación por venta / traspaso del vehículo asegurado.',
    'Cancelación por cambio de compañía aseguradora.',
    'Cancelación a solicitud expresa del asegurado.',
    'Cancelación por falta de pago / mora prolongada.'
  ],
  'Cambio de Plan': [
    'Cambio de plan a cobertura Full con deducible menor.',
    'Upgrade de categoría de red médica y habitación.',
    'Ampliación de límite de responsabilidad civil.'
  ],
  'Ajuste de Prima': [
    'Aplicación de descuento por bajo índice de siniestralidad.',
    'Ajuste de prima por endoso de modificación de cobertura.',
    'Recargo tarifario aplicado por la aseguradora.'
  ],
  'Otro': [
    'Emisión de carta de constancia de seguro para fines bancarios.',
    'Trámite de duplicado de marbete / carnet de afiliado.',
    'Revisión general de condiciones y coberturas.'
  ]
};

const QuickMovementModal = ({
  isOpen,
  onClose,
  policies = [],
  setPolicies,
  requests = [],
  setRequests,
  onNavigateToPolicy,
  preselectedPolicyId = null
}) => {
  const { isDemo } = useUser();
  const searchInputRef = useRef(null);

  // Form State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPolicy, setSelectedPolicy] = useState(null);
  const [movementType, setMovementType] = useState('Endoso');
  const [movementDate, setMovementDate] = useState(new Date().toISOString().split('T')[0]);
  const [effectiveDate, setEffectiveDate] = useState('');
  const [description, setDescription] = useState('');
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successResult, setSuccessResult] = useState(null);

  // Advanced / Specific options
  const [createFollowUpRequest, setCreateFollowUpRequest] = useState(false);
  const [requestPriority, setRequestPriority] = useState('Media');
  
  // Specific: Renewal
  const [renewalNewStart, setRenewalNewStart] = useState('');
  const [renewalNewEnd, setRenewalNewEnd] = useState('');
  const [renewalNewAmount, setRenewalNewAmount] = useState('');
  const [renewalNewCurrency, setRenewalNewCurrency] = useState('DOP');
  const [renewalNewPolicyNumber, setRenewalNewPolicyNumber] = useState('');
  const [renewalNote, setRenewalNote] = useState('');

  // Specific: Cancellation
  const [cancellationReason, setCancellationReason] = useState('Venta / Traspaso del vehículo');
  const [cancelPolicyInSystem, setCancelPolicyInSystem] = useState(true);
  const [estimatedRefund, setEstimatedRefund] = useState('');

  // Specific: Inclusion / Exclusion
  const [affectedItem, setAffectedItem] = useState('');

  // Initialize or reset when modal opens
  useEffect(() => {
    if (isOpen) {
      setSuccessResult(null);
      setIsSubmitting(false);
      
      if (preselectedPolicyId) {
        const found = policies.find(p => String(p.id).toLowerCase() === String(preselectedPolicyId).toLowerCase());
        if (found) {
          handleSelectPolicy(found);
        } else {
          resetForm();
        }
      } else {
        resetForm();
        setTimeout(() => {
          if (searchInputRef.current) searchInputRef.current.focus();
        }, 150);
      }
    }
  }, [isOpen, preselectedPolicyId, policies]);

  const resetForm = () => {
    setSearchQuery('');
    setSelectedPolicy(null);
    setMovementType('Endoso');
    setMovementDate(new Date().toISOString().split('T')[0]);
    setEffectiveDate('');
    setDescription('');
    setAttachedFiles([]);
    setCreateFollowUpRequest(false);
    setRequestPriority('Media');
    setRenewalNewStart('');
    setRenewalNewEnd('');
    setRenewalNewAmount('');
    setRenewalNewCurrency('DOP');
    setRenewalNewPolicyNumber('');
    setRenewalNote('');
    setCancellationReason('Venta / Traspaso del bien');
    setCancelPolicyInSystem(true);
    setEstimatedRefund('');
    setAffectedItem('');
    setSuccessResult(null);
  };

  // Filter policies based on search query
  const filteredPolicies = useMemo(() => {
    if (!policies || policies.length === 0) return [];
    const q = searchQuery.trim().toLowerCase();
    if (!q) {
      // Show first 6 active policies if search is empty
      return policies.slice(0, 6);
    }
    return policies.filter(p => {
      const idMatch = (p.id || '').toLowerCase().includes(q);
      const clientMatch = (p.client || '').toLowerCase().includes(q);
      const insurerMatch = (p.insurer || '').toLowerCase().includes(q);
      const typeMatch = (p.type || '').toLowerCase().includes(q);
      return idMatch || clientMatch || insurerMatch || typeMatch;
    }).slice(0, 10);
  }, [policies, searchQuery]);

  const handleSelectPolicy = (policy) => {
    setSelectedPolicy(policy);
    setSearchQuery('');

    // Pre-fill renewal fields if current type is Renovación
    const policyEndDate = policy.endDate || policy.renewal || '';
    if (policyEndDate) {
      setRenewalNewStart(policyEndDate);
      const d = new Date(policyEndDate);
      const freq = policy.renewalFrequency || 'Anual';
      if (freq === 'Semestral') d.setMonth(d.getMonth() + 6);
      else if (freq === 'Trimestral') d.setMonth(d.getMonth() + 3);
      else if (freq === 'Mensual') d.setMonth(d.getMonth() + 1);
      else d.setFullYear(d.getFullYear() + 1);
      setRenewalNewEnd(d.toISOString().split('T')[0]);
    }

    if (policy.amount) {
      setRenewalNewAmount(policy.amount);
    }
    if (policy.currency) {
      setRenewalNewCurrency(policy.currency);
    }
  };

  const handleTypeChange = (typeId) => {
    setMovementType(typeId);

    if (typeId === 'Renovación' && selectedPolicy) {
      const policyEndDate = selectedPolicy.endDate || selectedPolicy.renewal || '';
      if (policyEndDate) {
        setMovementDate(policyEndDate);
        setRenewalNewStart(policyEndDate);
        const d = new Date(policyEndDate);
        const freq = selectedPolicy.renewalFrequency || 'Anual';
        if (freq === 'Semestral') d.setMonth(d.getMonth() + 6);
        else if (freq === 'Trimestral') d.setMonth(d.getMonth() + 3);
        else if (freq === 'Mensual') d.setMonth(d.getMonth() + 1);
        else d.setFullYear(d.getFullYear() + 1);
        setRenewalNewEnd(d.toISOString().split('T')[0]);
      }
      if (selectedPolicy.amount) setRenewalNewAmount(selectedPolicy.amount);
      if (selectedPolicy.currency) setRenewalNewCurrency(selectedPolicy.currency);
    }
  };

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setAttachedFiles(prev => [...prev, ...files]);
    }
  };

  const handleRemoveFile = (index) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleApplyTemplate = (text) => {
    if (!description) {
      setDescription(text);
    } else {
      setDescription(prev => `${prev}\n• ${text}`);
    }
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();

    if (!selectedPolicy) {
      alert('Por favor selecciona la póliza a la que deseas aplicar el movimiento.');
      return;
    }

    if (!description.trim() && movementType !== 'Renovación') {
      alert('Por favor ingresa una breve descripción o detalle del movimiento.');
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Process attachments to Data URIs
      const processedFiles = [];
      for (const f of attachedFiles) {
        try {
          const uri = await fileToDataUri(f);
          processedFiles.push({ name: f.name, dataUri: uri, type: f.type, size: f.size });
        } catch (err) {
          console.warn('Error reading attachment:', err);
        }
      }

      const evidenceLabel = processedFiles.length > 0
        ? processedFiles.map(f => f.name).join(', ')
        : 'Sin adjunto';

      // 2. Build full description
      let fullDescription = description.trim();
      if (movementType === 'Cancelación') {
        fullDescription = `[MOTIVO: ${cancellationReason}] ${fullDescription}`.trim();
        if (estimatedRefund) {
          fullDescription += ` (Devolución estimada: ${formatMoney(parseFloat(estimatedRefund))} DOP)`;
        }
      } else if ((movementType === 'Inclusión' || movementType === 'Exclusión') && affectedItem) {
        fullDescription = `[DETALLE: ${affectedItem}] ${fullDescription}`.trim();
      } else if (movementType === 'Renovación' && renewalNote) {
        fullDescription = fullDescription ? `${fullDescription} - ${renewalNote}` : renewalNote;
      }

      // 3. Build movement object
      const movementId = `mov_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
      const movement = {
        id: movementId,
        date: movementDate,
        effectiveDate: effectiveDate || movementDate,
        type: movementType,
        description: fullDescription || `${movementType} registrado`,
        evidence: evidenceLabel,
        files: processedFiles,
        dataUri: processedFiles[0]?.dataUri || null,
        ...(movementType === 'Renovación' ? {
          renewalNewStart,
          renewalNewEnd,
          renewalNewAmount,
          renewalNewCurrency,
          renewalNewPolicyNumber,
          renewalNote
        } : {})
      };

      // 4. Save files to central document manager
      for (const f of processedFiles) {
        saveDocumentForEntity('policy', selectedPolicy.id, {
          name: f.name,
          category: `Movimiento: ${movementType}`,
          date: movementDate,
          dataUri: f.dataUri,
          notes: fullDescription,
          movementType: movementType,
          uploadedBy: 'Acción Rápida Dashboard'
        });
      }

      // 5. Compute policy updates (Renewal / Cancellation)
      let policyUpdates = {};
      if (movementType === 'Renovación') {
        if (renewalNewEnd) policyUpdates.endDate = renewalNewEnd;
        if (renewalNewStart) policyUpdates.startDate = renewalNewStart;
        if (renewalNewAmount) policyUpdates.amount = parseFloat(renewalNewAmount);
        if (renewalNewCurrency) policyUpdates.currency = renewalNewCurrency;
        if (renewalNewPolicyNumber && renewalNewPolicyNumber.trim()) {
          policyUpdates.id = renewalNewPolicyNumber.trim();
        }
        policyUpdates.status = 'Active';
      } else if (movementType === 'Cancelación' && (!createFollowUpRequest || cancelPolicyInSystem)) {
        policyUpdates.status = 'Cancelled';
      }

      // 6. Update local policy in state
      const updatedMovements = [...(selectedPolicy.movements || []), movement];
      const updatedPolicy = {
        ...selectedPolicy,
        ...policyUpdates,
        movements: updatedMovements
      };

      if (setPolicies) {
        setPolicies(policies.map(p => p.id === selectedPolicy.id ? updatedPolicy : p));
      }

      // 7. Persist movement in Hasura GraphQL Database
      if (!isDemo) {
        try {
          await insertMovimientoHasura({
            polizaId: selectedPolicy.rawId || selectedPolicy.id,
            date: movementDate,
            type: movementType,
            description: fullDescription || `${movementType} registrado`,
            evidence: evidenceLabel
          }, isDemo);

          // If Renewal or Cancellation changed policy core fields, update policy in Hasura
          if (Object.keys(policyUpdates).length > 0 && selectedPolicy.rawId) {
            await updatePolicyHasura(selectedPolicy.rawId, {
              ...selectedPolicy,
              ...policyUpdates
            }, isDemo);
          }
        } catch (dbErr) {
          console.warn('⚠️ Error guardando movimiento en Hasura:', dbErr);
        }
      }

      // 8. Optional: Create follow-up request / trámite
      let createdRequest = null;
      if (createFollowUpRequest) {
        const requestId = `REQ-${Date.now().toString().slice(-6)}`;
        const newRequest = {
          id: requestId,
          type: movementType === 'Renovación' ? 'Renovación' : movementType === 'Cancelación' ? 'Cancelación' : 'Modificación / Endoso',
          subtype: movementType,
          clienteId: selectedPolicy.clienteId || null,
          polizaId: selectedPolicy.rawId || null,
          client: selectedPolicy.client || '',
          policy: selectedPolicy.id,
          insurer: selectedPolicy.insurer || '',
          cartera: selectedPolicy.cartera || 'Santiago Morales y Asociados, S.R.L.',
          ramo: selectedPolicy.type || '',
          requestDate: movementDate,
          effectiveDate: effectiveDate || movementDate,
          status: 'En Trámite',
          priority: requestPriority,
          description: fullDescription,
          reason: movementType === 'Cancelación' ? cancellationReason : '',
          attachments: processedFiles.map(f => f.name),
          estimatedAmountNum: renewalNewAmount ? parseFloat(renewalNewAmount) : null,
          estimatedRefundNum: estimatedRefund ? parseFloat(estimatedRefund) : null
        };

        if (setRequests) {
          setRequests(prev => [newRequest, ...(prev || [])]);
        }

        if (!isDemo) {
          try {
            await insertSolicitudHasura(newRequest, isDemo);
          } catch (reqErr) {
            console.warn('⚠️ Error registrando solicitud en Hasura:', reqErr);
          }
        }
        createdRequest = newRequest;
      }

      // 9. Show success state
      setSuccessResult({
        policy: updatedPolicy,
        movement,
        request: createdRequest
      });

    } catch (error) {
      console.error('Error al registrar movimiento:', error);
      alert(`Ocurrió un error al procesar el movimiento: ${error.message}`);
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
              <RefreshCw size={22} className="animate-spin-slow" />
            </div>
            <div>
              <h3 style={{ margin: 0, color: '#ffffff', fontSize: '1.3rem', fontWeight: '800', letterSpacing: '-0.02em' }}>
                Registrar Movimiento / Cambio en Póliza
              </h3>
              <p style={{ margin: '0.15rem 0 0 0', fontSize: '0.86rem', color: '#f3e8df', opacity: 0.9 }}>
                Gestión rápida de endosos, renovaciones, inclusiones y modificaciones de póliza
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

        {/* Modal Body / Scrollable Area */}
        <div style={{
          padding: '1.5rem 1.75rem',
          overflowY: 'auto',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: '1.5rem',
          backgroundColor: '#fcfaf7'
        }}>

          {/* SUCCESS SCREEN */}
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
                  ¡Movimiento Registrado Exitosamente!
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', margin: 0, maxWidth: '540px' }}>
                  El movimiento de <strong>{successResult.movement.type}</strong> ha sido vinculado a la póliza <strong>{successResult.policy.id}</strong> ({successResult.policy.client}).
                </p>
              </div>

              {/* Summary Card */}
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
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>Póliza &amp; Cliente:</span>
                  <span style={{ fontWeight: '700', fontSize: '0.92rem' }}>{successResult.policy.id} · {successResult.policy.client}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>Tipo de Movimiento:</span>
                  <span style={{ fontWeight: '700', color: 'var(--primary)', fontSize: '0.92rem' }}>{successResult.movement.type}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>Fecha de Registro:</span>
                  <span style={{ fontWeight: '600', fontSize: '0.92rem' }}>{formatDateToDDMMYYYY(successResult.movement.date)}</span>
                </div>
                {successResult.request && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', backgroundColor: '#f5f3ff', padding: '0.4rem 0.65rem', borderRadius: 'var(--radius-sm)' }}>
                    <span style={{ color: '#7c3aed', fontSize: '0.85rem', fontWeight: '600' }}>Solicitud de Trámite:</span>
                    <span style={{ fontWeight: '700', color: '#7c3aed', fontSize: '0.88rem' }}>{successResult.request.id} (En Trámite)</span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center', marginTop: '1rem' }}>
                <button
                  type="button"
                  className="btn"
                  onClick={() => {
                    resetForm();
                  }}
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1.5px solid var(--border)',
                    color: 'var(--text-main)',
                    fontWeight: '700',
                    padding: '0.75rem 1.4rem'
                  }}
                >
                  <Plus size={18} /> Registrar Otro Movimiento
                </button>

                {onNavigateToPolicy && (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => {
                      onClose();
                      onNavigateToPolicy(successResult.policy.id);
                    }}
                    style={{
                      padding: '0.75rem 1.5rem',
                      fontWeight: '700',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}
                  >
                    Ver Póliza en Detalle <ArrowRight size={18} />
                  </button>
                )}

                <button
                  type="button"
                  className="btn"
                  onClick={onClose}
                  style={{
                    backgroundColor: '#f1f5f9',
                    color: '#475569',
                    fontWeight: '700',
                    padding: '0.75rem 1.4rem'
                  }}
                >
                  Cerrar
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.35rem' }}>
              
              {/* PASO 1: SELECCIÓN DE PÓLIZA */}
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
                    Seleccionar Póliza Afectada
                  </label>

                  {selectedPolicy && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedPolicy(null);
                        setSearchQuery('');
                        setTimeout(() => searchInputRef.current?.focus(), 50);
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
                        gap: '0.25rem',
                        padding: '0.2rem 0.5rem',
                        borderRadius: 'var(--radius-sm)'
                      }}
                    >
                      <RefreshCw size={14} /> Cambiar Póliza
                    </button>
                  )}
                </div>

                {!selectedPolicy ? (
                  <div style={{ position: 'relative' }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      backgroundColor: '#f8fafc',
                      border: '1.5px solid var(--border)',
                      borderRadius: 'var(--radius-md)',
                      padding: '0.55rem 0.85rem',
                      gap: '0.65rem',
                      transition: 'border 0.2s',
                      boxFocus: 'none'
                    }}>
                      <Search size={20} color="var(--text-muted)" />
                      <input
                        ref={searchInputRef}
                        type="text"
                        placeholder="Buscar por # de Póliza, Cliente, Aseguradora o Ramo..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        style={{
                          flex: 1,
                          border: 'none',
                          outline: 'none',
                          backgroundColor: 'transparent',
                          fontSize: '0.98rem',
                          color: 'var(--text-main)'
                        }}
                      />
                      {searchQuery && (
                        <button
                          type="button"
                          onClick={() => setSearchQuery('')}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>

                    {/* Results list */}
                    <div style={{
                      marginTop: '0.65rem',
                      maxHeight: '220px',
                      overflowY: 'auto',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: '#ffffff'
                    }}>
                      {filteredPolicies.length > 0 ? (
                        filteredPolicies.map(p => (
                          <div
                            key={p.id}
                            onClick={() => handleSelectPolicy(p)}
                            style={{
                              padding: '0.75rem 1rem',
                              borderBottom: '1px solid #f1f5f9',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              cursor: 'pointer',
                              transition: 'background 0.15s'
                            }}
                            onMouseOver={e => e.currentTarget.style.backgroundColor = '#f8fafc'}
                            onMouseOut={e => e.currentTarget.style.backgroundColor = '#ffffff'}
                          >
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span style={{ fontWeight: '800', color: 'var(--primary)', fontSize: '0.95rem' }}>{p.id}</span>
                                <span style={{
                                  padding: '0.15rem 0.5rem',
                                  borderRadius: '999px',
                                  backgroundColor: p.status === 'Cancelada' ? '#fee2e2' : '#e0f2fe',
                                  color: p.status === 'Cancelada' ? '#dc2626' : '#0369a1',
                                  fontSize: '0.72rem',
                                  fontWeight: '800'
                                }}>
                                  {p.status || 'Vigente'}
                                </span>
                                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '600' }}>
                                  · {p.insurer}
                                </span>
                              </div>
                              <div style={{ fontSize: '0.88rem', color: 'var(--text-main)', marginTop: '0.15rem', fontWeight: '500' }}>
                                {p.client} <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>({p.type})</span>
                              </div>
                            </div>
                            <button
                              type="button"
                              style={{
                                backgroundColor: 'var(--primary)',
                                color: 'white',
                                border: 'none',
                                padding: '0.35rem 0.8rem',
                                borderRadius: 'var(--radius-sm)',
                                fontSize: '0.82rem',
                                fontWeight: '700',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.3rem'
                              }}
                            >
                              Seleccionar <ChevronRight size={14} />
                            </button>
                          </div>
                        ))
                      ) : (
                        <div style={{ padding: '1.25rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                          No se encontraron pólizas que coincidan con la búsqueda.
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  /* Highlighted Selected Policy Card */
                  <div style={{
                    backgroundColor: '#faf8f5',
                    border: '1.5px solid var(--accent)',
                    borderRadius: 'var(--radius-md)',
                    padding: '1rem 1.25rem',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                    gap: '0.85rem'
                  }}>
                    <div>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: '700', display: 'block', textTransform: 'uppercase' }}>Póliza</span>
                      <strong style={{ fontSize: '1.1rem', color: 'var(--primary)' }}>{selectedPolicy.id}</strong>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: '700', display: 'block', textTransform: 'uppercase' }}>Cliente Asegurado</span>
                      <strong style={{ fontSize: '0.98rem', color: 'var(--text-main)' }}>{selectedPolicy.client}</strong>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: '700', display: 'block', textTransform: 'uppercase' }}>Aseguradora &amp; Ramo</span>
                      <span style={{ fontSize: '0.92rem', fontWeight: '600' }}>{selectedPolicy.insurer} ({selectedPolicy.type})</span>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: '700', display: 'block', textTransform: 'uppercase' }}>Vigencia &amp; Prima</span>
                      <span style={{ fontSize: '0.88rem', fontWeight: '600', color: 'var(--text-muted)' }}>
                        Hasta {formatDateToDDMMYYYY(selectedPolicy.endDate || selectedPolicy.renewal)} · {formatMoney(selectedPolicy.amount)} {selectedPolicy.currency || 'DOP'}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* PASO 2: TIPO DE MOVIMIENTO */}
              <div style={{
                backgroundColor: '#ffffff',
                border: '1.5px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                padding: '1.25rem',
                boxShadow: 'var(--shadow-sm)'
              }}>
                <label style={{ fontWeight: '800', fontSize: '0.98rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.85rem' }}>
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
                  Tipo de Movimiento o Trámite
                </label>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
                  gap: '0.65rem'
                }}>
                  {MOVEMENT_TYPES.map(type => {
                    const isSelected = movementType === type.id;
                    const Icon = type.icon;
                    return (
                      <button
                        key={type.id}
                        type="button"
                        onClick={() => handleTypeChange(type.id)}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'flex-start',
                          padding: '0.75rem 0.85rem',
                          borderRadius: 'var(--radius-md)',
                          border: `2px solid ${isSelected ? type.color : 'var(--border)'}`,
                          backgroundColor: isSelected ? type.bg : '#ffffff',
                          cursor: 'pointer',
                          textAlign: 'left',
                          transition: 'all 0.18s cubic-bezier(0.4, 0, 0.2, 1)',
                          boxShadow: isSelected ? `0 4px 12px ${type.color}25` : 'none',
                          transform: isSelected ? 'translateY(-2px)' : 'none'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: '0.35rem' }}>
                          <div style={{
                            padding: '6px',
                            borderRadius: '8px',
                            backgroundColor: isSelected ? type.color : '#f1f5f9',
                            color: isSelected ? '#ffffff' : type.color,
                            display: 'flex'
                          }}>
                            <Icon size={18} strokeWidth={2.4} />
                          </div>
                          {isSelected && (
                            <span style={{
                              width: '18px',
                              height: '18px',
                              borderRadius: '50%',
                              backgroundColor: type.color,
                              color: 'white',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '0.7rem'
                            }}>
                              <Check size={12} strokeWidth={3} />
                            </span>
                          )}
                        </div>
                        <span style={{ fontWeight: '800', fontSize: '0.88rem', color: isSelected ? type.color : 'var(--text-main)', display: 'block' }}>
                          {type.label}
                        </span>
                        <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '0.2rem', lineHeight: '1.25' }}>
                          {type.description}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* PASO 3: DETALLES Y CAMPOS ADAPTATIVOS */}
              <div style={{
                backgroundColor: '#ffffff',
                border: '1.5px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                padding: '1.25rem',
                boxShadow: 'var(--shadow-sm)',
                display: 'flex',
                flexDirection: 'column',
                gap: '1.1rem'
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
                  }}>3</span>
                  Detalles del Movimiento
                </label>

                {/* Date Row */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                  <div>
                    <label style={{ fontWeight: '700', fontSize: '0.85rem', display: 'block', marginBottom: '0.35rem' }}>
                      Fecha del Registro *
                    </label>
                    <input
                      type="date"
                      required
                      value={movementDate}
                      onChange={e => setMovementDate(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.6rem 0.8rem',
                        borderRadius: 'var(--radius-sm)',
                        border: '1.5px solid var(--border)',
                        fontSize: '0.92rem',
                        backgroundColor: '#ffffff'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ fontWeight: '700', fontSize: '0.85rem', display: 'block', marginBottom: '0.35rem' }}>
                      Fecha Efectiva / Aplicación (Opcional)
                    </label>
                    <input
                      type="date"
                      value={effectiveDate}
                      onChange={e => setEffectiveDate(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.6rem 0.8rem',
                        borderRadius: 'var(--radius-sm)',
                        border: '1.5px solid var(--border)',
                        fontSize: '0.92rem',
                        backgroundColor: '#ffffff'
                      }}
                    />
                  </div>
                </div>

                {/* CONDITIONAL: RENOVACION */}
                {movementType === 'Renovación' && (
                  <div style={{
                    backgroundColor: '#f0fdf4',
                    border: '1.5px solid #86efac',
                    borderRadius: 'var(--radius-md)',
                    padding: '1.25rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#166534', fontWeight: '800', fontSize: '0.95rem' }}>
                      <RefreshCw size={18} /> Datos de la Nueva Vigencia y Prima
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.85rem' }}>
                      <div>
                        <label style={{ fontSize: '0.82rem', fontWeight: '700', color: '#166534', display: 'block', marginBottom: '0.25rem' }}>
                          Nueva Vigencia Desde
                        </label>
                        <input
                          type="date"
                          value={renewalNewStart}
                          onChange={e => setRenewalNewStart(e.target.value)}
                          style={{ width: '100%', padding: '0.5rem 0.7rem', borderRadius: 'var(--radius-sm)', border: '1px solid #86efac' }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '0.82rem', fontWeight: '700', color: '#166534', display: 'block', marginBottom: '0.25rem' }}>
                          Nueva Vigencia Hasta
                        </label>
                        <input
                          type="date"
                          value={renewalNewEnd}
                          onChange={e => setRenewalNewEnd(e.target.value)}
                          style={{ width: '100%', padding: '0.5rem 0.7rem', borderRadius: 'var(--radius-sm)', border: '1px solid #86efac' }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '0.82rem', fontWeight: '700', color: '#166534', display: 'block', marginBottom: '0.25rem' }}>
                          Nueva Prima
                        </label>
                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                          <select
                            value={renewalNewCurrency}
                            onChange={e => setRenewalNewCurrency(e.target.value)}
                            style={{ padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid #86efac', fontWeight: '700' }}
                          >
                            <option value="DOP">DOP</option>
                            <option value="USD">USD</option>
                          </select>
                          <input
                            type="number"
                            step="any"
                            placeholder="0.00"
                            value={renewalNewAmount}
                            onChange={e => setRenewalNewAmount(e.target.value)}
                            style={{ flex: 1, padding: '0.5rem 0.7rem', borderRadius: 'var(--radius-sm)', border: '1px solid #86efac' }}
                          />
                        </div>
                      </div>
                      <div>
                        <label style={{ fontSize: '0.82rem', fontWeight: '700', color: '#166534', display: 'block', marginBottom: '0.25rem' }}>
                          Nuevo # Póliza (si cambia)
                        </label>
                        <input
                          type="text"
                          placeholder="Ej. POL-2026-999"
                          value={renewalNewPolicyNumber}
                          onChange={e => setRenewalNewPolicyNumber(e.target.value)}
                          style={{ width: '100%', padding: '0.5rem 0.7rem', borderRadius: 'var(--radius-sm)', border: '1px solid #86efac' }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* CONDITIONAL: CANCELACION */}
                {movementType === 'Cancelación' && (
                  <div style={{
                    backgroundColor: '#fef2f2',
                    border: '1.5px solid #fca5a5',
                    borderRadius: 'var(--radius-md)',
                    padding: '1.25rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#991b1b', fontWeight: '800', fontSize: '0.95rem' }}>
                      <Slash size={18} /> Datos de la Cancelación / Anulación
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.85rem' }}>
                      <div>
                        <label style={{ fontSize: '0.82rem', fontWeight: '700', color: '#991b1b', display: 'block', marginBottom: '0.25rem' }}>
                          Motivo Principal de Cancelación
                        </label>
                        <select
                          value={cancellationReason}
                          onChange={e => setCancellationReason(e.target.value)}
                          style={{ width: '100%', padding: '0.5rem 0.7rem', borderRadius: 'var(--radius-sm)', border: '1px solid #fca5a5', fontWeight: '600' }}
                        >
                          <option>Venta / Traspaso del vehículo</option>
                          <option>Cambio de compañía aseguradora</option>
                          <option>Solicitud expresa del cliente</option>
                          <option>Falta de pago / Incumplimiento</option>
                          <option>Pérdida total del bien</option>
                          <option>Disolución de empresa / Cese comercial</option>
                          <option>Otro motivo</option>
                        </select>
                      </div>

                      <div>
                        <label style={{ fontSize: '0.82rem', fontWeight: '700', color: '#991b1b', display: 'block', marginBottom: '0.25rem' }}>
                          Devolución Estimada de Prima (DOP)
                        </label>
                        <input
                          type="number"
                          step="any"
                          placeholder="0.00 (opcional)"
                          value={estimatedRefund}
                          onChange={e => setEstimatedRefund(e.target.value)}
                          style={{ width: '100%', padding: '0.5rem 0.7rem', borderRadius: 'var(--radius-sm)', border: '1px solid #fca5a5' }}
                        />
                      </div>
                    </div>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.88rem', color: '#7f1d1d', fontWeight: '600' }}>
                      <input
                        type="checkbox"
                        checked={cancelPolicyInSystem}
                        onChange={e => setCancelPolicyInSystem(e.target.checked)}
                        style={{ width: '16px', height: '16px', accentColor: '#dc2626' }}
                      />
                      Actualizar inmediatamente el estado de la póliza a "Cancelada" en el sistema
                    </label>
                  </div>
                )}

                {/* CONDITIONAL: INCLUSION / EXCLUSION */}
                {(movementType === 'Inclusión' || movementType === 'Exclusión') && (
                  <div>
                    <label style={{ fontWeight: '700', fontSize: '0.85rem', display: 'block', marginBottom: '0.35rem' }}>
                      {movementType === 'Inclusión' ? 'Nombre o Detalle del Ítem / Persona a Incluir' : 'Nombre o Detalle del Ítem / Persona a Excluir'}
                    </label>
                    <input
                      type="text"
                      placeholder={movementType === 'Inclusión' ? 'Ej. Juan Pérez (Hijo - 05/12/2015) o Vehículo Honda CR-V 2024 Placa A999999' : 'Ej. María Gómez (Ex-empleada) o Accesorio equipo de sonido'}
                      value={affectedItem}
                      onChange={e => setAffectedItem(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.6rem 0.8rem',
                        borderRadius: 'var(--radius-sm)',
                        border: '1.5px solid var(--border)',
                        fontSize: '0.92rem'
                      }}
                    />
                  </div>
                )}

                {/* Description Textarea + Quick Templates */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                    <label style={{ fontWeight: '700', fontSize: '0.85rem' }}>
                      Descripción / Detalle del Movimiento *
                    </label>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      Sé claro y conciso para el historial
                    </span>
                  </div>

                  <textarea
                    required
                    rows="3"
                    placeholder="Escribe el detalle del endoso, cambio o trámite solicitado..."
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      borderRadius: 'var(--radius-sm)',
                      border: '1.5px solid var(--border)',
                      fontSize: '0.92rem',
                      fontFamily: 'inherit',
                      resize: 'vertical',
                      boxSizing: 'border-box'
                    }}
                  />

                  {/* Quick templates chips */}
                  {QUICK_TEMPLATES[movementType] && (
                    <div style={{ marginTop: '0.5rem' }}>
                      <span style={{ fontSize: '0.76rem', fontWeight: '700', color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>
                        💡 Sugerencias rápidas (haz clic para insertar):
                      </span>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                        {QUICK_TEMPLATES[movementType].map((tpl, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => handleApplyTemplate(tpl)}
                            style={{
                              backgroundColor: '#f1f5f9',
                              border: '1px solid #e2e8f0',
                              borderRadius: 'var(--radius-full)',
                              padding: '0.2rem 0.6rem',
                              fontSize: '0.75rem',
                              color: '#334155',
                              cursor: 'pointer',
                              fontWeight: '500',
                              transition: 'all 0.15s'
                            }}
                            onMouseOver={e => e.currentTarget.style.backgroundColor = '#e2e8f0'}
                            onMouseOut={e => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                          >
                            + {tpl}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Attachments Section */}
                <div>
                  <label style={{ fontWeight: '700', fontSize: '0.85rem', display: 'block', marginBottom: '0.35rem' }}>
                    Documentos y Evidencias Adjuntas (PDF, Imágenes, Cartas)
                  </label>
                  
                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.6rem',
                    padding: '0.85rem',
                    border: '2px dashed var(--border)',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: '#f8fafc',
                    cursor: 'pointer',
                    fontWeight: '600',
                    fontSize: '0.88rem',
                    color: 'var(--primary)',
                    transition: 'all 0.15s'
                  }}
                  onMouseOver={e => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                  onMouseOut={e => e.currentTarget.style.backgroundColor = '#f8fafc'}
                  >
                    <Upload size={18} />
                    <span>Seleccionar archivos para adjuntar</span>
                    <input
                      type="file"
                      multiple
                      accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx"
                      style={{ display: 'none' }}
                      onChange={handleFileUpload}
                    />
                  </label>

                  {attachedFiles.length > 0 && (
                    <div style={{ marginTop: '0.6rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                      {attachedFiles.map((file, idx) => (
                        <div
                          key={idx}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            backgroundColor: '#eff6ff',
                            border: '1px solid #bfdbfe',
                            borderRadius: 'var(--radius-sm)',
                            padding: '0.35rem 0.75rem',
                            fontSize: '0.82rem'
                          }}
                        >
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#1d4ed8', fontWeight: '600' }}>
                            <Paperclip size={14} /> {file.name}
                            <span style={{ fontSize: '0.74rem', color: '#64748b' }}>({(file.size / 1024).toFixed(1)} KB)</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveFile(idx)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#dc2626',
                              cursor: 'pointer',
                              padding: '0 0.3rem',
                              fontWeight: '800'
                            }}
                            title="Quitar archivo"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Follow-up request checkbox */}
                <div style={{
                  backgroundColor: '#faf5ff',
                  border: '1px solid #e9d5ff',
                  borderRadius: 'var(--radius-md)',
                  padding: '0.85rem 1.1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '0.75rem'
                }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={createFollowUpRequest}
                      onChange={e => setCreateFollowUpRequest(e.target.checked)}
                      style={{ width: '17px', height: '17px', accentColor: '#7c3aed' }}
                    />
                    <div>
                      <strong style={{ color: '#6b21a8', fontSize: '0.88rem', display: 'block' }}>
                        Crear también Solicitud / Trámite de seguimiento con la aseguradora
                      </strong>
                      <span style={{ color: '#7e22ce', fontSize: '0.76rem' }}>
                        Aparecerá en el módulo de Solicitudes para dar seguimiento a la carta de endoso
                      </span>
                    </div>
                  </label>

                  {createFollowUpRequest && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#6b21a8' }}>Prioridad:</span>
                      <select
                        value={requestPriority}
                        onChange={e => setRequestPriority(e.target.value)}
                        style={{ padding: '0.35rem 0.6rem', borderRadius: 'var(--radius-sm)', border: '1px solid #c084fc', fontSize: '0.82rem', fontWeight: '700' }}
                      >
                        <option value="Baja">Baja</option>
                        <option value="Media">Media</option>
                        <option value="Alta">Alta</option>
                        <option value="Urgente">Urgente</option>
                      </select>
                    </div>
                  )}
                </div>

              </div>

              {/* FOOTER ACTIONS */}
              <div style={{
                display: 'flex',
                justifyContent: 'flex-end',
                alignItems: 'center',
                gap: '0.85rem',
                borderTop: '1px solid var(--border)',
                paddingTop: '1.25rem'
              }}>
                <button
                  type="button"
                  className="btn"
                  onClick={onClose}
                  disabled={isSubmitting}
                  style={{
                    backgroundColor: '#f1f5f9',
                    color: '#475569',
                    fontWeight: '700',
                    padding: '0.75rem 1.4rem'
                  }}
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSubmitting || !selectedPolicy}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    fontWeight: '800',
                    padding: '0.75rem 1.6rem',
                    opacity: (!selectedPolicy || isSubmitting) ? 0.6 : 1,
                    cursor: (!selectedPolicy || isSubmitting) ? 'not-allowed' : 'pointer'
                  }}
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw size={18} className="animate-spin" /> Guardando Movimiento...
                    </>
                  ) : (
                    <>
                      <Check size={18} strokeWidth={2.5} /> Guardar Movimiento
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

        </div>
      </div>
    </div>
  );
};

export default QuickMovementModal;
