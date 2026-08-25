import React, { useState } from 'react';
import { 
  X, Download, Printer, ZoomIn, ZoomOut, RotateCw, FileText, 
  Eye, CheckCircle, Shield, Calendar, HardDrive, ExternalLink 
} from 'lucide-react';
import { formatFileSize } from '../services/documentsService';

const DocumentViewerModal = ({ isOpen, onClose, document: doc, entityInfo = null }) => {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  if (!isOpen || !doc) return null;

  const isPdf = (doc.type === 'application/pdf') || 
                (doc.name && doc.name.toLowerCase().endsWith('.pdf')) ||
                (doc.dataUri && doc.dataUri.startsWith('data:application/pdf'));

  const isImage = (doc.type && doc.type.startsWith('image/')) ||
                  (doc.name && doc.name.match(/\.(png|jpe?g|webp|gif|svg)$/i)) ||
                  (doc.dataUri && doc.dataUri.startsWith('data:image/'));

  const handleDownload = () => {
    if (!doc.dataUri && !doc.fileUrl) {
      alert('No hay archivo disponible para descargar.');
      return;
    }
    const link = document.createElement('a');
    link.href = doc.dataUri || doc.fileUrl;
    link.download = doc.name || 'documento';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    if (isPdf && (doc.dataUri || doc.fileUrl)) {
      const printWindow = window.open(doc.dataUri || doc.fileUrl);
      if (printWindow) {
        printWindow.focus();
        printWindow.print();
      }
    } else {
      window.print();
    }
  };

  return (
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
      zIndex: 1100,
      padding: '1.25rem'
    }}>
      <div style={{
        backgroundColor: '#ffffff',
        width: '100%',
        maxWidth: '960px',
        height: '92vh',
        borderRadius: 'var(--radius-lg)',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* Header con Título, Metadata y Acciones */}
        <div style={{
          padding: '1rem 1.5rem',
          borderBottom: '1px solid var(--border)',
          backgroundColor: '#f8fafc',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '1rem',
          flexWrap: 'wrap'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', minWidth: '260px' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: isPdf ? '#fee2e2' : isImage ? '#dbeafe' : '#f1f5f9',
              color: isPdf ? '#dc2626' : isImage ? '#2563eb' : '#475569',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <FileText size={22} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--primary)', fontWeight: '700', wordBreak: 'break-all' }}>
                {doc.name}
              </h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.2rem', flexWrap: 'wrap' }}>
                <span style={{
                  fontSize: '0.75rem',
                  padding: '0.1rem 0.5rem',
                  borderRadius: '999px',
                  backgroundColor: '#e0f2fe',
                  color: '#0369a1',
                  fontWeight: '700'
                }}>
                  {doc.category || 'General'}
                </span>
                {doc.isSystemGenerated && (
                  <span style={{
                    fontSize: '0.72rem',
                    padding: '0.1rem 0.45rem',
                    borderRadius: '999px',
                    backgroundColor: '#dcfce7',
                    color: '#166534',
                    fontWeight: '700',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem'
                  }}>
                    <CheckCircle size={11} /> Generado por Sistema
                  </span>
                )}
                {doc.date && (
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Calendar size={12} /> {doc.date}
                  </span>
                )}
                {doc.size && (
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    • {doc.size}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Botones de Control y Acciones */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {isImage && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginRight: '0.5rem', backgroundColor: '#ffffff', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '0.15rem 0.35rem' }}>
                <button
                  type="button"
                  onClick={() => setZoom(prev => Math.max(0.4, prev - 0.2))}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.3rem', color: 'var(--text-muted)', display: 'flex' }}
                  title="Reducir zoom"
                >
                  <ZoomOut size={16} />
                </button>
                <span style={{ fontSize: '0.78rem', fontWeight: '700', minWidth: '40px', textAlign: 'center', color: 'var(--text-main)' }}>
                  {Math.round(zoom * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => setZoom(prev => Math.min(3, prev + 0.2))}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.3rem', color: 'var(--text-muted)', display: 'flex' }}
                  title="Aumentar zoom"
                >
                  <ZoomIn size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => setRotation(prev => (prev + 90) % 360)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.3rem', color: 'var(--text-muted)', display: 'flex', marginLeft: '0.2rem' }}
                  title="Rotar imagen 90°"
                >
                  <RotateCw size={16} />
                </button>
              </div>
            )}

            <button
              className="btn"
              onClick={handlePrint}
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid var(--border)',
                padding: '0.45rem 0.8rem',
                fontSize: '0.82rem',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem'
              }}
              title="Imprimir documento"
            >
              <Printer size={15} /> Imprimir
            </button>

            <button
              className="btn btn-primary"
              onClick={handleDownload}
              style={{
                padding: '0.45rem 0.95rem',
                fontSize: '0.82rem',
                fontWeight: '700',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem'
              }}
              title="Descargar archivo a mi computadora"
            >
              <Download size={15} /> Descargar
            </button>

            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '0.4rem',
                color: 'var(--text-muted)',
                display: 'flex',
                alignItems: 'center',
                marginLeft: '0.5rem'
              }}
              title="Cerrar visor"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Visor Central */}
        <div style={{
          flex: 1,
          backgroundColor: '#0f172a',
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: isPdf ? '0' : '1rem'
        }}>
          {isPdf ? (
            (doc.dataUri || doc.fileUrl) ? (
              <iframe
                src={`${doc.dataUri || doc.fileUrl}#toolbar=1&navpanes=0`}
                title={doc.name}
                style={{
                  width: '100%',
                  height: '100%',
                  border: 'none',
                  backgroundColor: '#ffffff'
                }}
              />
            ) : (
              <div style={{ color: '#cbd5e1', textAlign: 'center', padding: '2rem' }}>
                <FileText size={48} style={{ opacity: 0.5, marginBottom: '1rem' }} />
                <p>El documento PDF no tiene contenido precargado.</p>
              </div>
            )
          ) : isImage ? (
            <div style={{
              width: '100%',
              height: '100%',
              overflow: 'auto',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <img
                src={doc.dataUri || doc.fileUrl}
                alt={doc.name}
                style={{
                  maxWidth: '100%',
                  maxHeight: '100%',
                  transform: `scale(${zoom}) rotate(${rotation}deg)`,
                  transition: 'transform 0.15s ease',
                  objectFit: 'contain',
                  borderRadius: 'var(--radius-sm)',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.5)'
                }}
              />
            </div>
          ) : (
            <div style={{
              textAlign: 'center',
              backgroundColor: '#ffffff',
              padding: '2.5rem',
              borderRadius: 'var(--radius-md)',
              maxWidth: '450px',
              boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
            }}>
              <FileText size={56} color="var(--primary)" style={{ marginBottom: '1rem' }} />
              <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--primary)' }}>Vista previa no disponible en pantalla</h4>
              <p style={{ margin: '0 0 1.5rem 0', fontSize: '0.88rem', color: 'var(--text-muted)' }}>
                Este tipo de archivo ({doc.name}) se puede descargar directamente a su dispositivo para abrirlo con su programa predeterminado.
              </p>
              <button
                className="btn btn-primary"
                onClick={handleDownload}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.6rem 1.25rem' }}
              >
                <Download size={16} /> Descargar {doc.name}
              </button>
            </div>
          )}
        </div>

        {/* Footer con Referencias y Notas */}
        {doc.notes && (
          <div style={{
            padding: '0.75rem 1.5rem',
            borderTop: '1px solid var(--border)',
            backgroundColor: '#f8fafc',
            fontSize: '0.85rem',
            color: 'var(--text-main)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <span style={{ fontWeight: '700', color: 'var(--primary)' }}>Descripción / Nota:</span>
            <span>{doc.notes}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentViewerModal;
