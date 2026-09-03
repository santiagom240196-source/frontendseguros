import React, { useState } from 'react';
import { useUser } from '../context/UserContext';
import { 
  Shield, Lock, User, Eye, EyeOff, LogIn, CheckCircle2, 
  AlertCircle, Sparkles, Check, ArrowRight, KeyRound, ShieldCheck,
  Building2, Globe, Server, Award, CheckCircle
} from 'lucide-react';

const LoginPage = ({ initialUsername = '' }) => {
  const { users, login, currentUser } = useUser();
  const [username, setUsername] = useState(initialUsername || 'Santiagom2401');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Selected preset user
  const selectedUserObj = users.find(u => 
    u.username?.toLowerCase() === username.toLowerCase() || 
    u.id?.toLowerCase() === username.toLowerCase() ||
    u.email?.toLowerCase() === username.toLowerCase()
  );

  const handleSelectPreset = (user) => {
    setUsername(user.username || user.id);
    setPassword('');
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    setTimeout(() => {
      const res = login(username, password, rememberMe);
      if (!res.success) {
        setError(res.message);
        setIsLoading(false);
      }
    }, 350);
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(circle at 50% 15%, #3c2217 0%, #25130b 45%, #110805 100%)',
      padding: '2.5rem 1.5rem',
      position: 'relative',
      overflow: 'hidden',
      fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    }}>
      {/* Ambient Luxury Lighting (Gold, Bronze & Champagne) */}
      <div style={{
        position: 'absolute',
        top: '-15%',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '750px',
        height: '450px',
        background: 'radial-gradient(circle, rgba(181, 140, 92, 0.28) 0%, rgba(92, 53, 35, 0.15) 50%, transparent 75%)',
        filter: 'blur(40px)',
        pointerEvents: 'none'
      }} />

      <div style={{
        position: 'absolute',
        bottom: '-10%',
        right: '10%',
        width: '500px',
        height: '400px',
        background: 'radial-gradient(circle, rgba(181, 140, 92, 0.15) 0%, transparent 70%)',
        filter: 'blur(50px)',
        pointerEvents: 'none'
      }} />

      <div style={{
        position: 'absolute',
        bottom: '-10%',
        left: '10%',
        width: '450px',
        height: '350px',
        background: 'radial-gradient(circle, rgba(92, 53, 35, 0.3) 0%, transparent 70%)',
        filter: 'blur(50px)',
        pointerEvents: 'none'
      }} />

      {/* Geometric Watermark Pattern Overlay */}
      <div style={{
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundImage: `radial-gradient(rgba(181, 140, 92, 0.08) 1px, transparent 1px)`,
        backgroundSize: '32px 32px',
        pointerEvents: 'none',
        opacity: 0.8
      }} />

      {/* Main Login Card Container */}
      <div style={{
        width: '100%',
        maxWidth: '520px',
        position: 'relative',
        zIndex: 10
      }}>
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          {/* Logo Frame with Bronze/Gold Halo */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '104px',
            height: '104px',
            borderRadius: '50%',
            backgroundColor: '#ffffff',
            padding: '4px',
            overflow: 'hidden',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6), 0 0 0 3px rgba(181, 140, 92, 0.55), 0 0 30px rgba(181, 140, 92, 0.35)',
            marginBottom: '1.25rem',
            position: 'relative'
          }}>
            <img 
              src="/logo.png" 
              alt="Santiago Morales & Asociados" 
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                transform: 'scale(1.15)'
              }}
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
          </div>

          {/* Tagline / Shield Badge */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.45rem',
            backgroundColor: 'rgba(181, 140, 92, 0.15)',
            border: '1px solid rgba(181, 140, 92, 0.35)',
            padding: '0.3rem 0.85rem',
            borderRadius: '999px',
            marginBottom: '0.75rem',
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
          }}>
            <ShieldCheck size={14} color="#dfb887" />
            <span style={{ fontSize: '0.76rem', fontWeight: '800', color: '#f3e5d0', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Portal Privado de Gestión
            </span>
          </div>

          <h1 style={{
            margin: '0 0 0.4rem 0',
            fontSize: '1.85rem',
            fontWeight: '800',
            color: '#ffffff',
            letterSpacing: '-0.02em',
            textShadow: '0 2px 12px rgba(0,0,0,0.6)'
          }}>
            Santiago Morales &amp; Asociados
          </h1>
          <p style={{
            margin: 0,
            fontSize: '0.94rem',
            color: '#dfcfc5',
            fontWeight: '500',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem'
          }}>
            <span>Corredores de Seguros, S.R.L.</span>
            <span style={{ color: '#b58c5c' }}>•</span>
            <span>República Dominicana 🇩🇴</span>
          </p>
        </div>

        {/* Glassmorphism Luxury Card */}
        <div style={{
          backgroundColor: 'rgba(36, 20, 14, 0.82)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: '1px solid rgba(181, 140, 92, 0.28)',
          borderRadius: '1.5rem',
          padding: '2.5rem 2.25rem',
          boxShadow: '0 30px 60px -15px rgba(0, 0, 0, 0.75), 0 0 0 1px rgba(255, 255, 255, 0.06), inset 0 1px 1px rgba(255, 255, 255, 0.1)',
          color: '#fdfbf9'
        }}>
          {/* Quick Profile Selector */}
          <div style={{ marginBottom: '1.75rem' }}>
            <div style={{
              fontSize: '0.76rem',
              fontWeight: '800',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: '#cbb3a3',
              marginBottom: '0.75rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <span>Selecciona una Cuenta</span>
              <span style={{ fontSize: '0.72rem', color: '#b58c5c', fontWeight: '700' }}>Acceso Rápido</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              {users.map((user) => {
                const isSelected = selectedUserObj?.id === user.id || selectedUserObj?.username === user.username;
                const isUserDemo = Boolean(user.isDemo);
                return (
                  <div
                    key={user.id}
                    onClick={() => handleSelectPreset(user)}
                    style={{
                      padding: '0.75rem 0.85rem',
                      borderRadius: '0.85rem',
                      backgroundColor: isSelected 
                        ? 'rgba(181, 140, 92, 0.22)' 
                        : 'rgba(20, 11, 7, 0.55)',
                      border: isSelected 
                        ? '1.5px solid #b58c5c' 
                        : '1px solid rgba(181, 140, 92, 0.18)',
                      cursor: 'pointer',
                      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.7rem',
                      boxShadow: isSelected ? '0 6px 16px rgba(181, 140, 92, 0.25)' : 'none'
                    }}
                  >
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      backgroundColor: isUserDemo ? '#d97706' : '#5c3523',
                      color: 'white',
                      border: isSelected ? '1.5px solid #dfb887' : '1px solid rgba(255, 255, 255, 0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: '800',
                      fontSize: '0.85rem',
                      flexShrink: 0,
                      boxShadow: '0 2px 6px rgba(0,0,0,0.3)'
                    }}>
                      {user.avatar || 'U'}
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{
                        fontSize: '0.84rem',
                        fontWeight: '700',
                        color: isSelected ? '#ffffff' : '#e6d8ce',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        {user.name.split(' ')[0]} {user.name.split(' ')[1] || ''}
                      </div>
                      <div style={{
                        fontSize: '0.68rem',
                        color: isUserDemo ? '#fcd34d' : '#86efac',
                        fontWeight: '700',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        marginTop: '0.1rem'
                      }}>
                        {isUserDemo ? '🧪 Sandbox' : '👑 Principal'}
                      </div>
                    </div>
                    {isSelected && (
                      <Check size={16} color="#dfb887" style={{ flexShrink: 0 }} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit}>
            {/* Username Input */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{
                display: 'block',
                fontSize: '0.82rem',
                fontWeight: '700',
                color: '#dfcfc5',
                marginBottom: '0.45rem'
              }}>
                Usuario o Correo Electrónico
              </label>
              <div style={{ position: 'relative' }}>
                <div style={{
                  position: 'absolute',
                  left: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#b58c5c',
                  display: 'flex',
                  alignItems: 'center'
                }}>
                  <User size={18} />
                </div>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="Ej. Santiagom2401 o admin"
                  style={{
                    width: '100%',
                    padding: '0.8rem 0.9rem 0.8rem 2.65rem',
                    backgroundColor: 'rgba(18, 9, 6, 0.75)',
                    border: '1.5px solid rgba(181, 140, 92, 0.25)',
                    borderRadius: '0.75rem',
                    color: '#ffffff',
                    fontSize: '0.94rem',
                    outline: 'none',
                    transition: 'all 0.2s',
                    boxSizing: 'border-box'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#b58c5c';
                    e.target.style.boxShadow = '0 0 0 3px rgba(181, 140, 92, 0.25)';
                    e.target.style.backgroundColor = 'rgba(28, 14, 9, 0.9)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'rgba(181, 140, 92, 0.25)';
                    e.target.style.boxShadow = 'none';
                    e.target.style.backgroundColor = 'rgba(18, 9, 6, 0.75)';
                  }}
                />
              </div>
            </div>

            {/* Password Input */}
            <div style={{ marginBottom: '1.35rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.45rem' }}>
                <label style={{
                  fontSize: '0.82rem',
                  fontWeight: '700',
                  color: '#dfcfc5'
                }}>
                  Contraseña de Acceso
                </label>
              </div>
              <div style={{ position: 'relative' }}>
                <div style={{
                  position: 'absolute',
                  left: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#b58c5c',
                  display: 'flex',
                  alignItems: 'center'
                }}>
                  <Lock size={18} />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="Introduce tu contraseña"
                  style={{
                    width: '100%',
                    padding: '0.8rem 2.75rem 0.8rem 2.65rem',
                    backgroundColor: 'rgba(18, 9, 6, 0.75)',
                    border: error ? '1.5px solid #ef4444' : '1.5px solid rgba(181, 140, 92, 0.25)',
                    borderRadius: '0.75rem',
                    color: '#ffffff',
                    fontSize: '0.94rem',
                    fontFamily: showPassword ? 'inherit' : 'monospace',
                    letterSpacing: showPassword ? 'normal' : '0.12em',
                    outline: 'none',
                    transition: 'all 0.2s',
                    boxSizing: 'border-box'
                  }}
                  onFocus={(e) => {
                    if (!error) {
                      e.target.style.borderColor = '#b58c5c';
                      e.target.style.boxShadow = '0 0 0 3px rgba(181, 140, 92, 0.25)';
                      e.target.style.backgroundColor = 'rgba(28, 14, 9, 0.9)';
                    }
                  }}
                  onBlur={(e) => {
                    if (!error) {
                      e.target.style.borderColor = 'rgba(181, 140, 92, 0.25)';
                      e.target.style.boxShadow = 'none';
                      e.target.style.backgroundColor = 'rgba(18, 9, 6, 0.75)';
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: '#cbb3a3',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '4px'
                  }}
                  title={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Remember Me Checkbox */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '1.75rem',
              backgroundColor: 'rgba(18, 9, 6, 0.55)',
              padding: '0.75rem 0.95rem',
              borderRadius: '0.65rem',
              border: '1px solid rgba(181, 140, 92, 0.15)'
            }}>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.65rem',
                cursor: 'pointer',
                userSelect: 'none',
                fontSize: '0.85rem',
                color: '#f0e6df',
                fontWeight: '600'
              }}>
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  style={{
                    width: '17px',
                    height: '17px',
                    accentColor: '#b58c5c',
                    cursor: 'pointer',
                    borderRadius: '4px'
                  }}
                />
                <span>Recordar sesión en este equipo</span>
              </label>

              <span style={{
                fontSize: '0.74rem',
                color: rememberMe ? '#dfb887' : '#9c887c',
                fontWeight: '700'
              }}>
                {rememberMe ? 'Siempre activo' : 'Solo sesión'}
              </span>
            </div>

            {/* Error Banner */}
            {error && (
              <div style={{
                padding: '0.85rem 1rem',
                backgroundColor: 'rgba(220, 38, 38, 0.2)',
                border: '1px solid rgba(239, 68, 68, 0.5)',
                borderRadius: '0.75rem',
                color: '#fca5a5',
                fontSize: '0.86rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
                marginBottom: '1.35rem'
              }}>
                <AlertCircle size={18} color="#ef4444" style={{ flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '0.95rem 1rem',
                borderRadius: '0.85rem',
                background: 'linear-gradient(135deg, #b58c5c 0%, #8c6338 50%, #5c3523 100%)',
                color: '#ffffff',
                fontSize: '1.05rem',
                fontWeight: '800',
                letterSpacing: '0.02em',
                border: '1px solid rgba(255, 255, 255, 0.25)',
                cursor: isLoading ? 'wait' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.6rem',
                boxShadow: '0 12px 28px -5px rgba(181, 140, 92, 0.45), 0 4px 10px rgba(0, 0, 0, 0.3)',
                transition: 'all 0.25s ease',
                opacity: isLoading ? 0.75 : 1
              }}
              onMouseEnter={(e) => !isLoading && (e.currentTarget.style.transform = 'translateY(-2px)', e.currentTarget.style.boxShadow = '0 16px 32px -4px rgba(181, 140, 92, 0.6)')}
              onMouseLeave={(e) => !isLoading && (e.currentTarget.style.transform = 'none', e.currentTarget.style.boxShadow = '0 12px 28px -5px rgba(181, 140, 92, 0.45)')}
            >
              {isLoading ? (
                <span>Validando credenciales...</span>
              ) : (
                <>
                  <LogIn size={20} />
                  <span>Acceder al Sistema</span>
                </>
              )}
            </button>
          </form>

          {/* Quick Helper Credentials Note */}
          <div style={{
            marginTop: '1.75rem',
            paddingTop: '1.25rem',
            borderTop: '1px solid rgba(181, 140, 92, 0.2)',
            fontSize: '0.78rem',
            color: '#bda799',
            textAlign: 'center',
            lineHeight: 1.6
          }}>
            <div style={{ fontWeight: '700', color: '#dfb887' }}>🧪 Acceso de Prueba / Demostración:</div>
            <div style={{ marginTop: '0.25rem' }}>
              Usuario: <code style={{ color: '#fcd34d', backgroundColor: 'rgba(181, 140, 92, 0.15)', padding: '0.15rem 0.45rem', borderRadius: '4px', border: '1px solid rgba(181, 140, 92, 0.25)' }}>admin</code> &nbsp;|&nbsp; Clave: <code style={{ color: '#fcd34d', backgroundColor: 'rgba(181, 140, 92, 0.15)', padding: '0.15rem 0.45rem', borderRadius: '4px', border: '1px solid rgba(181, 140, 92, 0.25)' }}>admin</code>
            </div>
          </div>
        </div>

        {/* Security & Copyright Footer */}
        <div style={{
          textAlign: 'center',
          marginTop: '1.75rem',
          fontSize: '0.8rem',
          color: '#a38f82'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', marginBottom: '0.4rem', flexWrap: 'wrap' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
              <ShieldCheck size={14} color="#b58c5c" /> Cifrado Seguro SSL
            </span>
            <span>•</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
              <Server size={14} color="#b58c5c" /> PostgreSQL Hasura
            </span>
          </div>
          <div>
            Santiago Morales y Asociados, S.R.L. © {new Date().getFullYear()} · Todos los derechos reservados
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
