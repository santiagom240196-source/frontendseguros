import React, { useState, useEffect } from 'react';
import { Printer, Download, X, FileText, CheckCircle2, Share2, Loader2, Sparkles } from 'lucide-react';
import { 
  generateReceiptPdfBlobUrl, 
  generateReceiptPdfBlob,
  downloadReceiptPdf, 
  printReceiptDirectly 
} from '../services/receiptPdfService';
import { formatMoney } from '../utils/policyHelpers';

const ReceiptModal = ({ isOpen, onClose, payment, policy = {}, client = {} }) => {
  const [pdfUrl, setPdfUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    if (isOpen && payment) {
      setIsLoading(true);

      const storedPdf = payment.receiptUrl || payment.comprobante;
      if (storedPdf && typeof storedPdf === 'string' && storedPdf.startsWith('data:application/pdf')) {
        try {
          const byteCharacters = atob(storedPdf.split(',')[1]);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          const blob = new Blob([byteArray], { type: 'application/pdf' });
          const url = URL.createObjectURL(blob);
          if (active) {
            setPdfUrl(url);
            setIsLoading(false);
          }
          return;
        } catch (e) {
          console.warn('Error convirtiendo comprobante guardado:', e);
        }
      }

      generateReceiptPdfBlobUrl(payment, policy, client)
        .then((url) => {
          if (active) {
            setPdfUrl(url);
            setIsLoading(false);
          }
        })
        .catch((err) => {
          console.error('Error generando PDF del recibo:', err);
          if (active) setIsLoading(false);
        });
    } else {
      setPdfUrl(null);
    }

    return () => {
      active = false;
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [isOpen, payment, policy, client]);

  if (!isOpen || !payment) return null;

  const handlePrint = () => {
    printReceiptDirectly(payment, policy, client);
  };

  const handleDownload = () => {
    downloadReceiptPdf(payment, policy, client);
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.65)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2500,
      padding: '1rem'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: 'var(--radius-lg)',
        width: '100%',
        maxWidth: '850px',
        height: '92vh',
        boxShadow: 'var(--shadow-xl)',
        border: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        animation: 'fadeIn 0.2s ease-out'
      }}>
        {/* Modal Top Bar */}
        <div style={{
          padding: '1rem 1.5rem',
          backgroundColor: 'var(--primary)',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
          borderBottom: '2px solid #d97706'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              backgroundColor: 'rgba(255, 255, 255, 0.15)',
              padding: '8px',
              borderRadius: 'var(--radius-sm)',
              display: 'flex',
              color: '#fde68a'
            }}>
              <FileText size={22} />
            </div>
            <div>
              <h3 style={{ margin: 0, color: 'white', fontSize: '1.2rem', fontWeight: '700' }}>
                Recibo de Pago Oficial ({payment.id || payment.receiptId})
              </h3>
              <p style={{ margin: '0.15rem 0 0', fontSize: '0.8rem', color: 'rgba(255,255,255,0.8)' }}>
                {payment.client} · {formatMoney(payment.amountNum || payment.amount)}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <button
              className="btn"
              onClick={handlePrint}
              style={{
                backgroundColor: 'white',
                color: 'var(--primary)',
                fontWeight: '700',
                fontSize: '0.88rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.55rem 1rem',
                border: 'none',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}
            >
              <Printer size={16} /> Imprimir Recibo
            </button>

            <button
              className="btn"
              onClick={handleDownload}
              style={{
                backgroundColor: '#d97706',
                color: 'white',
                fontWeight: '700',
                fontSize: '0.88rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.55rem 1rem',
                border: 'none',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}
            >
              <Download size={16} /> Descargar PDF
            </button>

            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                color: 'white',
                cursor: 'pointer',
                padding: '6px',
                borderRadius: 'var(--radius-sm)',
                display: 'flex',
                opacity: 0.8,
                marginLeft: '0.5rem'
              }}
              title="Cerrar"
            >
              <X size={22} />
            </button>
          </div>
        </div>

        {/* Modal Body / PDF Viewer */}
        <div style={{ flex: 1, backgroundColor: '#525659', position: 'relative', overflow: 'hidden' }}>
          {isLoading ? (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              gap: '1rem',
              color: 'white'
            }}>
              <Loader2 size={36} className="animate-spin" color="#fcd34d" />
              <div style={{ fontSize: '1.05rem', fontWeight: '600' }}>Generando formato PDF del recibo...</div>
            </div>
          ) : pdfUrl ? (
            <iframe
              src={pdfUrl}
              title="Visor de Recibo PDF"
              style={{
                width: '100%',
                height: '100%',
                border: 'none'
              }}
            />
          ) : (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'white' }}>
              Error cargando el visor del recibo. Puedes descargarlo directamente con el botón superior.
            </div>
          )}
        </div>

        {/* Footer Info Bar */}
        <div style={{
          padding: '0.75rem 1.5rem',
          backgroundColor: '#f8fafc',
          borderTop: '1px solid var(--border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '0.82rem',
          color: 'var(--text-muted)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CheckCircle2 size={16} color="#166534" />
            <span>Recibo emitido conforme · Santiago Morales &amp; Asoc.</span>
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <span>Formato: <strong>PDF Imprimible (A4)</strong></span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReceiptModal;
