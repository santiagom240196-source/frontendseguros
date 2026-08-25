import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  FileText, Upload, Plus, Trash2, Eye, Download, CheckCircle, 
  AlertCircle, Shield, Camera, CreditCard, User, Building, 
  MapPin, DollarSign, Activity, FileCheck, Users, Globe, X, 
  Loader2, Filter, Search, Clock 
} from 'lucide-react';
import { 
  getDocumentsForEntity, saveDocumentForEntity, deleteDocumentForEntity, 
  getRecommendedDocumentTypes, CLIENT_RECOMMENDED_DOCS, fileToDataUri, 
  formatFileSize 
} from '../services/documentsService';
import DocumentViewerModal from './DocumentViewerModal';

const DocumentManager = ({ 
  entityType = 'policy', // 'policy' | 'client' | 'movement'
  entityId, 
  entityTitle = '', 
  policyType = 'General', 
  extraDocuments = [], 
  onDocumentChange 
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedDocForViewing, setSelectedDocForViewing] = useState(null);
  const [activeCategoryFilter, setActiveCategoryFilter] = useState('ALL');
  const [searchDocTerm, setSearchDocTerm] = useState('');

  // Form State para nuevo documento
  const [uploadForm, setUploadForm] = useState({
    file: null,
    fileName: '',
    category: '',
    date: new Date().toISOString().split('T')[0],
    notes: '',
    movementType: ''
  });

  const fileInputRef = useRef(null);

  // Lista de documentos recomendados según la entidad
  const recommendedTypes = useMemo(() => {
    if (entityType === 'client') {
      return CLIENT_RECOMMENDED_DOCS;
    }
    return getRecommendedDocumentTypes(policyType);
  }, [entityType, policyType]);

  // Estado local de documentos almacenados en LocalStorage para esta entidad
  const [storedDocs, setStoredDocs] = useState(() => (entityId ? getDocumentsForEntity(entityType, entityId) : []));

  useEffect(() => {
    if (entityId) {
      setStoredDocs(getDocumentsForEntity(entityType, entityId));
    }
  }, [entityType, entityId]);

  // Combinar documentos almacenados con extraDocuments (recibos del sistema) sin duplicados
  const documents = useMemo(() => {
    const combinedMap = new Map();
    (storedDocs || []).forEach(d => combinedMap.set(d.id, d));
    (extraDocuments || []).forEach(d => combinedMap.set(d.id, d));

    return Array.from(combinedMap.values()).sort((a, b) => 
      new Date(b.date || '1970-01-01') - new Date(a.date || '1970-01-01')
    );
  }, [storedDocs, extraDocuments]);

  const refreshDocuments = () => {
    if (entityId) {
      setStoredDocs(getDocumentsForEntity(entityType, entityId));
    }
  };

  // Abrir modal de carga con una categoría predefinida (atajo rápido)
  const handleQuickUpload = (categoryName) => {
    setUploadForm({
      file: null,
      fileName: '',
      category: categoryName,
      date: new Date().toISOString().split('T')[0],
      notes: '',
      movementType: ''
    });
    setShowUploadModal(true);
  };

  // Manejar selección de archivo
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Sugerir nombre si no tiene uno
    const defaultName = file.name;
    setUploadForm(prev => ({
      ...prev,
      file,
      fileName: prev.fileName || defaultName,
      category: prev.category || (recommendedTypes[0]?.name || 'General')
    }));
  };

  // Guardar documento
  const handleSaveDocument = async (e) => {
    e.preventDefault();
    if (!uploadForm.file && !uploadForm.fileName) {
      alert('Por favor seleccione un archivo para adjuntar.');
      return;
    }

    setIsUploading(true);
    try {
      let dataUri = null;
      let sizeStr = '150 KB';
      let sizeBytes = 153600;
      let mimeType = 'application/pdf';

      if (uploadForm.file) {
        dataUri = await fileToDataUri(uploadForm.file);
        sizeBytes = uploadForm.file.size;
        sizeStr = formatFileSize(uploadForm.file.size);
        mimeType = uploadForm.file.type || (uploadForm.file.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg');
      }

      const docToSave = {
        name: uploadForm.fileName || (uploadForm.file ? uploadForm.file.name : 'Documento Adjunto'),
        category: uploadForm.category || 'General',
        date: uploadForm.date || new Date().toISOString().split('T')[0],
        size: sizeStr,
        sizeBytes,
        type: mimeType,
        dataUri,
        fileUrl: dataUri || '#',
        notes: uploadForm.notes || '',
        movementType: uploadForm.movementType || null,
        uploadedBy: 'Santiago Morales & Asoc.'
      };

      const saved = saveDocumentForEntity(entityType, entityId, docToSave);
      if (saved) {
        refreshDocuments();
        if (onDocumentChange) onDocumentChange(saved);
        setShowUploadModal(false);
        setUploadForm({
          file: null,
          fileName: '',
          category: '',
          date: new Date().toISOString().split('T')[0],
          notes: '',
          movementType: ''
        });
        alert(`Documento "${docToSave.name}" adjuntado exitosamente.`);
      }
    } catch (err) {
      console.error('Error adjuntando documento:', err);
      alert('Error al procesar el archivo.');
    } finally {
      setIsUploading(false);
    }
  };

  // Eliminar documento
  const handleDeleteDocument = (doc) => {
    if (doc.isSystemGenerated) {
      alert('Los recibos oficiales generados por el sistema no se pueden eliminar desde aquí.');
      return;
    }
    if (window.confirm(`¿Estás seguro de que deseas eliminar el documento "${doc.name}"?`)) {
      deleteDocumentForEntity(entityType, entityId, doc.id);
      refreshDocuments();
      if (onDocumentChange) onDocumentChange(null);
    }
  };

  // Filtro de documentos
  const filteredDocuments = useMemo(() => {
    return documents.filter(doc => {
      // Filtro por categoría
      if (activeCategoryFilter !== 'ALL') {
        if (activeCategoryFilter === 'SYSTEM' && !doc.isSystemGenerated) return false;
        if (activeCategoryFilter === 'MANUAL' && doc.isSystemGenerated) return false;
        if (activeCategoryFilter !== 'SYSTEM' && activeCategoryFilter !== 'MANUAL' && doc.category !== activeCategoryFilter) return false;
      }
      // Filtro por texto
      if (!searchDocTerm.trim()) return true;
      const term = searchDocTerm.toLowerCase().trim();
      return (
        (doc.name || '').toLowerCase().includes(term) ||
        (doc.category || '').toLowerCase().includes(term) ||
        (doc.notes || '').toLowerCase().includes(term) ||
        (doc.date || '').toLowerCase().includes(term)
      );
    });
  }, [documents, activeCategoryFilter, searchDocTerm]);

  // Documentos cargados por categoría para verificar cuáles faltan
  const uploadedCategoriesSet = useMemo(() => {
    return new Set(documents.map(d => (d.category || '').toLowerCase().trim()));
  }, [documents]);

  return (
    <div style={{ width: '100%' }}>
      {/* Barra de Acciones y Atajos de Carga Rápida */}
      <div style={{
        backgroundColor: '#f8fafc',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        padding: '1.25rem',
        marginBottom: '1.5rem'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h4 style={{ margin: 0, color: 'var(--primary)', fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FileText size={20} /> Documentos Requeridos y Recomendados
            </h4>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              {entityType === 'client' 
                ? 'Documentación de identidad y legal del cliente.'
                : `Documentación técnica y legal para pólizas de ramo ${policyType}.`}
            </span>
          </div>

          <button
            className="btn btn-primary"
            onClick={() => handleQuickUpload(recommendedTypes[0]?.name || 'General')}
            style={{
              padding: '0.5rem 1rem',
              fontSize: '0.88rem',
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              boxShadow: '0 2px 4px rgba(37, 99, 235, 0.2)'
            }}
          >
            <Plus size={16} /> Adjuntar Documento
          </button>
        </div>

        {/* Píldoras de Atajo Rápido para Documentos Clave */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {recommendedTypes.map((rec) => {
            const isUploaded = uploadedCategoriesSet.has(rec.name.toLowerCase().trim());
            return (
              <button
                key={rec.id}
                type="button"
                onClick={() => handleQuickUpload(rec.name)}
                style={{
                  padding: '0.4rem 0.85rem',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.82rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  border: isUploaded ? '1.5px solid #86efac' : '1px dashed #cbd5e1',
                  backgroundColor: isUploaded ? '#f0fdf4' : '#ffffff',
                  color: isUploaded ? '#166534' : 'var(--text-main)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  transition: 'all 0.15s'
                }}
                title={isUploaded ? `Documento cargado: ${rec.name}` : `Hacer clic para subir ${rec.name}`}
              >
                {isUploaded ? <CheckCircle size={14} color="#16a34a" /> : <Plus size={13} color="#64748b" />}
                <span>{rec.name}</span>
                {rec.required && !isUploaded && (
                  <span style={{ fontSize: '0.7rem', color: '#dc2626', fontWeight: '800' }}>*</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Barra de Búsqueda y Filtros de Documentos */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1rem',
        gap: '0.75rem',
        flexWrap: 'wrap'
      }}>
        {/* Buscador */}
        <div style={{ position: 'relative', minWidth: '220px', flex: 1 }}>
          <input
            type="text"
            placeholder="Buscar en documentos adjuntos..."
            value={searchDocTerm}
            onChange={(e) => setSearchDocTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '0.45rem 0.75rem',
              paddingLeft: '2.2rem',
              fontSize: '0.85rem',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border)'
            }}
          />
          <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          {searchDocTerm && (
            <button
              onClick={() => setSearchDocTerm('')}
              style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Filtros de Pestaña */}
        <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
          {[
            { id: 'ALL', label: `Todos (${documents.length})` },
            { id: 'MANUAL', label: 'Adjuntados' },
            { id: 'SYSTEM', label: 'Recibos del Sistema' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveCategoryFilter(tab.id)}
              style={{
                padding: '0.35rem 0.7rem',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.8rem',
                fontWeight: '600',
                border: '1px solid var(--border)',
                backgroundColor: activeCategoryFilter === tab.id ? 'var(--primary)' : '#ffffff',
                color: activeCategoryFilter === tab.id ? '#ffffff' : 'var(--text-main)',
                cursor: 'pointer'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Lista / Tabla de Documentos Adjuntos */}
      {filteredDocuments.length === 0 ? (
        <div style={{
          padding: '2.5rem 1.5rem',
          textAlign: 'center',
          backgroundColor: '#fafaf9',
          borderRadius: 'var(--radius-md)',
          border: '1.5px dashed #cbd5e1'
        }}>
          <FileText size={44} style={{ color: '#94a3b8', marginBottom: '0.75rem' }} />
          <h4 style={{ margin: '0 0 0.35rem 0', color: 'var(--text-main)', fontSize: '1.05rem' }}>
            No hay documentos registrados
          </h4>
          <p style={{ margin: '0 0 1.25rem 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            {entityType === 'client' 
              ? 'Sube la cédula, licencia o contratos del cliente para tener su expediente digital completo.'
              : `Adjunta la matrícula, inspección u otros soportes para esta póliza de ${policyType}.`}
          </p>
          <button
            className="btn btn-primary"
            onClick={() => handleQuickUpload(recommendedTypes[0]?.name || 'General')}
            style={{ padding: '0.45rem 1rem', fontSize: '0.85rem', fontWeight: '700' }}
          >
            <Upload size={15} style={{ marginRight: '0.4rem' }} /> Subir Primer Documento
          </button>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '1rem'
        }}>
          {filteredDocuments.map((doc) => {
            const isPdf = doc.type === 'application/pdf' || (doc.name && doc.name.toLowerCase().endsWith('.pdf'));
            const isImg = (doc.type && doc.type.startsWith('image/')) || (doc.name && doc.name.match(/\.(png|jpe?g|webp)$/i));

            return (
              <div
                key={doc.id}
                style={{
                  backgroundColor: '#ffffff',
                  border: doc.isSystemGenerated ? '1.5px solid #bbf7d0' : '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '0.75rem',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  transition: 'all 0.2s',
                  position: 'relative'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <div style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: doc.isSystemGenerated ? '#dcfce7' : isPdf ? '#fee2e2' : isImg ? '#dbeafe' : '#f1f5f9',
                        color: doc.isSystemGenerated ? '#166534' : isPdf ? '#dc2626' : isImg ? '#2563eb' : '#475569',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        <FileText size={18} />
                      </div>
                      <div style={{ overflow: 'hidden' }}>
                        <strong style={{
                          display: 'block',
                          fontSize: '0.9rem',
                          color: 'var(--primary)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          maxWidth: '190px'
                        }} title={doc.name}>
                          {doc.name}
                        </strong>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {doc.size || 'Archivo'} · {doc.date}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.35rem' }}>
                    <span style={{
                      fontSize: '0.72rem',
                      padding: '0.12rem 0.5rem',
                      borderRadius: '999px',
                      fontWeight: '700',
                      backgroundColor: doc.isSystemGenerated ? '#dcfce7' : '#eff6ff',
                      color: doc.isSystemGenerated ? '#166534' : '#1e40af',
                      border: doc.isSystemGenerated ? '1px solid #86efac' : '1px solid #bfdbfe'
                    }}>
                      {doc.category || 'General'}
                    </span>

                    {doc.movementType && (
                      <span style={{
                        fontSize: '0.72rem',
                        padding: '0.12rem 0.5rem',
                        borderRadius: '999px',
                        fontWeight: '700',
                        backgroundColor: '#fdf4ff',
                        color: '#86198f',
                        border: '1px solid #f0abfc'
                      }}>
                        Mov: {doc.movementType}
                      </span>
                    )}
                  </div>

                  {doc.notes && (
                    <p style={{
                      fontSize: '0.78rem',
                      color: 'var(--text-muted)',
                      margin: '0.5rem 0 0 0',
                      lineHeight: '1.3',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden'
                    }}>
                      {doc.notes}
                    </p>
                  )}
                </div>

                {/* Botones de Acción */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderTop: '1px solid #f1f5f9',
                  paddingTop: '0.65rem',
                  marginTop: '0.5rem'
                }}>
                  <button
                    type="button"
                    onClick={() => setSelectedDocForViewing(doc)}
                    style={{
                      padding: '0.35rem 0.7rem',
                      fontSize: '0.8rem',
                      fontWeight: '700',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border)',
                      backgroundColor: '#f8fafc',
                      color: 'var(--primary)',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.3rem'
                    }}
                    title="Ver documento en pantalla completa"
                  >
                    <Eye size={14} color="#2563eb" /> Ver
                  </button>

                  <div style={{ display: 'flex', gap: '0.35rem' }}>
                    <button
                      type="button"
                      onClick={() => {
                        const link = document.createElement('a');
                        link.href = doc.dataUri || doc.fileUrl || '#';
                        link.download = doc.name;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                      }}
                      style={{
                        padding: '0.35rem 0.6rem',
                        fontSize: '0.8rem',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border)',
                        backgroundColor: '#ffffff',
                        color: 'var(--text-main)',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center'
                      }}
                      title="Descargar archivo"
                    >
                      <Download size={14} />
                    </button>

                    {!doc.isSystemGenerated && (
                      <button
                        type="button"
                        onClick={() => handleDeleteDocument(doc)}
                        style={{
                          padding: '0.35rem 0.6rem',
                          fontSize: '0.8rem',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid #fecaca',
                          backgroundColor: '#fff1f2',
                          color: '#dc2626',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center'
                        }}
                        title="Eliminar documento adjunto"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Carga de Documento */}
      {showUploadModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(2px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1050,
          padding: '1rem'
        }}>
          <div className="card" style={{
            width: '100%',
            maxWidth: '520px',
            backgroundColor: '#ffffff',
            borderRadius: 'var(--radius-lg)',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
              <h3 style={{ margin: 0, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.25rem' }}>
                <Upload size={20} color="#2563eb" /> Adjuntar Documento
              </h3>
              <button
                onClick={() => setShowUploadModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <X size={22} />
              </button>
            </div>

            <form onSubmit={handleSaveDocument} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Zona de Selección de Archivo (Drag & Drop) */}
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-main)', marginBottom: '0.4rem', display: 'block' }}>
                  Seleccionar Archivo (PDF, Imagen o Documento) *
                </label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    border: '2px dashed #93c5fd',
                    backgroundColor: '#eff6ff',
                    borderRadius: 'var(--radius-md)',
                    padding: '1.5rem 1rem',
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                  onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = '#2563eb'; }}
                  onDragLeave={(e) => { e.currentTarget.style.borderColor = '#93c5fd'; }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.currentTarget.style.borderColor = '#93c5fd';
                    const file = e.dataTransfer.files?.[0];
                    if (file) {
                      setUploadForm(prev => ({
                        ...prev,
                        file,
                        fileName: prev.fileName || file.name
                      }));
                    }
                  }}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    style={{ display: 'none' }}
                    onChange={handleFileSelect}
                    accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx"
                  />
                  {uploadForm.file ? (
                    <div>
                      <CheckCircle size={32} color="#16a34a" style={{ margin: '0 auto 0.5rem auto' }} />
                      <strong style={{ display: 'block', fontSize: '0.92rem', color: '#166534' }}>
                        {uploadForm.file.name}
                      </strong>
                      <span style={{ fontSize: '0.78rem', color: '#15803d' }}>
                        {formatFileSize(uploadForm.file.size)} • Listo para subir
                      </span>
                    </div>
                  ) : (
                    <div>
                      <Upload size={32} color="#2563eb" style={{ margin: '0 auto 0.5rem auto', opacity: 0.8 }} />
                      <strong style={{ display: 'block', fontSize: '0.92rem', color: '#1e40af' }}>
                        Haz clic aquí o arrastra tu archivo
                      </strong>
                      <span style={{ fontSize: '0.78rem', color: '#60a5fa' }}>
                        Formatos admitidos: PDF, PNG, JPG, WEBP, DOC
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Categoría / Tipo de Documento */}
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-main)', marginBottom: '0.35rem', display: 'block' }}>
                  Categoría del Documento *
                </label>
                <select
                  required
                  value={uploadForm.category}
                  onChange={(e) => setUploadForm({ ...uploadForm, category: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.55rem',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border)',
                    fontSize: '0.88rem',
                    fontWeight: '600'
                  }}
                >
                  <option value="">Seleccionar tipo...</option>
                  {recommendedTypes.map(rec => (
                    <option key={rec.id} value={rec.name}>{rec.name}</option>
                  ))}
                  <option value="Cotización Previa">Cotización Previa</option>
                  <option value="Inspección de Siniestro">Inspección de Siniestro</option>
                  <option value="Endoso / Modificación">Endoso / Modificación</option>
                  <option value="Recibo de Pago">Recibo de Pago</option>
                  <option value="Otros">Otros Documentos</option>
                </select>
              </div>

              {/* Nombre Personalizado del Archivo */}
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-main)', marginBottom: '0.35rem', display: 'block' }}>
                  Nombre del Documento
                </label>
                <input
                  type="text"
                  placeholder="Ej. Matricula Honda CR-V 2022.pdf"
                  value={uploadForm.fileName}
                  onChange={(e) => setUploadForm({ ...uploadForm, fileName: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.55rem',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border)',
                    fontSize: '0.88rem'
                  }}
                />
              </div>

              {/* Fecha del Documento */}
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-main)', marginBottom: '0.35rem', display: 'block' }}>
                  Fecha de Emisión / Vigencia
                </label>
                <input
                  type="date"
                  value={uploadForm.date}
                  onChange={(e) => setUploadForm({ ...uploadForm, date: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.55rem',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border)',
                    fontSize: '0.88rem'
                  }}
                />
              </div>

              {/* Notas y Descripción */}
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-main)', marginBottom: '0.35rem', display: 'block' }}>
                  Descripción / Observaciones (Opcional)
                </label>
                <textarea
                  rows="2"
                  placeholder="Detalles sobre el documento o notas para el expediente..."
                  value={uploadForm.notes}
                  onChange={(e) => setUploadForm({ ...uploadForm, notes: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.55rem',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border)',
                    fontSize: '0.85rem'
                  }}
                />
              </div>

              {/* Botones de Acción */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
                <button
                  type="button"
                  className="btn"
                  onClick={() => setShowUploadModal(false)}
                  style={{ backgroundColor: '#f1f5f9' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isUploading}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="animate-spin" size={16} /> Subiendo...
                    </>
                  ) : (
                    <>
                      <Upload size={16} /> Guardar en Expediente
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Visor Interactivo de Documentos */}
      {selectedDocForViewing && (
        <DocumentViewerModal
          isOpen={!!selectedDocForViewing}
          onClose={() => setSelectedDocForViewing(null)}
          document={selectedDocForViewing}
        />
      )}
    </div>
  );
};

export default DocumentManager;
