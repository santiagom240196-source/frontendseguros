import React, { useState } from 'react';
import { Database, X, CheckCircle2, AlertTriangle, RefreshCw, Server, Key, Shield, ExternalLink, RotateCcw } from 'lucide-react';
import { useBackend } from '../context/BackendContext';

const HasuraSettingsModal = ({ isOpen, onClose }) => {
  const { config, status, latency, errorMessage, checkConnection, updateConfig, restoreDefaults, triggerSync } = useBackend();
  const [endpoint, setEndpoint] = useState(config.endpoint);
  const [adminSecret, setAdminSecret] = useState(config.adminSecret);
  const [role, setRole] = useState(config.role);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  if (!isOpen) return null;

  const handleTest = async () => {
    setIsTesting(true);
    setTestResult(null);
    updateConfig({ endpoint, adminSecret, role });
    const res = await checkConnection();
    setIsTesting(false);
    setTestResult(res);
  };

  const handleSave = () => {
    updateConfig({ endpoint, adminSecret, role });
    if (triggerSync) triggerSync();
    onClose();
  };

  const handleReset = () => {
    restoreDefaults();
    setEndpoint('/v1/graphql');
    setAdminSecret('hasura_dev_admin_secret_key_123456');
    setRole('admin');
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.45)',
      backdropFilter: 'blur(3px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2000,
      padding: '1rem'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: 'var(--radius-lg)',
        width: '100%',
        maxWidth: '560px',
        boxShadow: 'var(--shadow-xl)',
        border: '1px solid var(--border)',
        overflow: 'hidden',
        animation: 'fadeIn 0.2s ease-out'
      }}>
        {/* Header */}
        <div style={{
          padding: '1.25rem 1.5rem',
          backgroundColor: 'var(--primary)',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              backgroundColor: 'rgba(255, 255, 255, 0.15)',
              padding: '6px',
              borderRadius: 'var(--radius-sm)',
              display: 'flex'
            }}>
              <Database size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, color: 'white', fontSize: '1.2rem' }}>Conexión con Backend Hasura</h3>
              <p style={{ margin: 0, fontSize: '0.8rem', opacity: 0.8 }}>GraphQL Engine &amp; PostgreSQL</p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'white',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: 'var(--radius-sm)',
              display: 'flex',
              opacity: 0.8
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Status Box */}
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', backgroundColor: '#faf8f5' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.75rem 1rem',
            backgroundColor: status === 'connected' ? '#f0fdf4' : status === 'checking' ? '#eff6ff' : '#fef2f2',
            border: `1px solid ${status === 'connected' ? '#bbf7d0' : status === 'checking' ? '#bfdbfe' : '#fecaca'}`,
            borderRadius: 'var(--radius-md)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              {status === 'connected' ? (
                <CheckCircle2 size={20} color="#16a34a" />
              ) : status === 'checking' ? (
                <RefreshCw size={20} color="#2563eb" style={{ animation: 'spin 1.5s linear infinite' }} />
              ) : (
                <AlertTriangle size={20} color="#dc2626" />
              )}
              <div>
                <span style={{
                  fontWeight: '700',
                  fontSize: '0.9rem',
                  color: status === 'connected' ? '#15803d' : status === 'checking' ? '#1d4ed8' : '#b91c1c'
                }}>
                  {status === 'connected' ? 'Conectado a Hasura' : status === 'checking' ? 'Verificando conexión...' : 'Desconectado de Hasura'}
                </span>
                {status === 'connected' && latency !== null && (
                  <span style={{ fontSize: '0.78rem', color: '#16a34a', marginLeft: '0.5rem' }}>
                    ({latency} ms)
                  </span>
                )}
                {status === 'disconnected' && errorMessage && (
                  <p style={{ margin: '0.2rem 0 0', fontSize: '0.75rem', color: '#dc2626' }}>
                    {errorMessage}
                  </p>
                )}
              </div>
            </div>

            <button
              onClick={handleTest}
              disabled={isTesting}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.35rem 0.75rem',
                fontSize: '0.8rem',
                fontWeight: '600',
                backgroundColor: 'white',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                cursor: isTesting ? 'wait' : 'pointer'
              }}
            >
              <RefreshCw size={13} style={{ animation: isTesting ? 'spin 1s linear infinite' : 'none' }} />
              Probar
            </button>
          </div>
        </div>

        {/* Configuration Form */}
        <div style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.88rem', marginBottom: '0.35rem' }}>
              <Server size={15} color="var(--primary)" />
              <strong>Endpoint GraphQL de Hasura:</strong>
            </label>
            <input
              type="text"
              value={endpoint}
              onChange={e => setEndpoint(e.target.value)}
              placeholder="http://localhost:8080/v1/graphql"
              style={{ fontSize: '0.9rem', padding: '0.65rem 0.75rem' }}
            />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>
              Puerto por defecto en Docker: <code>http://localhost:8080/v1/graphql</code>
            </span>
          </div>

          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.88rem', marginBottom: '0.35rem' }}>
              <Key size={15} color="var(--primary)" />
              <strong>Admin Secret (x-hasura-admin-secret):</strong>
            </label>
            <input
              type="password"
              value={adminSecret}
              onChange={e => setAdminSecret(e.target.value)}
              placeholder="myadminsecretkey"
              style={{ fontSize: '0.9rem', padding: '0.65rem 0.75rem' }}
            />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>
              Debe coincidir con la variable <code>HASURA_GRAPHQL_ADMIN_SECRET</code> en tu backend.
            </span>
          </div>

          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.88rem', marginBottom: '0.35rem' }}>
              <Shield size={15} color="var(--primary)" />
              <strong>Rol Hasura por defecto:</strong>
            </label>
            <input
              type="text"
              value={role}
              onChange={e => setRole(e.target.value)}
              placeholder="admin"
              style={{ fontSize: '0.9rem', padding: '0.65rem 0.75rem' }}
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div style={{
          padding: '1rem 1.5rem',
          borderTop: '1px solid var(--border)',
          backgroundColor: '#faf8f5',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <button
            type="button"
            onClick={handleReset}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              fontSize: '0.85rem',
              cursor: 'pointer'
            }}
          >
            <RotateCcw size={14} />
            Restablecer Valores
          </button>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '0.6rem 1.2rem',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'white',
                border: '1px solid var(--border)',
                fontWeight: '600',
                fontSize: '0.9rem',
                cursor: 'pointer'
              }}
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={handleSave}
              className="btn btn-primary"
              style={{ padding: '0.6rem 1.2rem', fontSize: '0.9rem' }}
            >
              Guardar y Conectar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HasuraSettingsModal;
