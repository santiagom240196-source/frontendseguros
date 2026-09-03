import React, { createContext, useContext, useState, useEffect } from 'react';
import { USERS, DEFAULT_USER } from '../constants/users';
import { Lock, Eye, EyeOff, X, ShieldAlert, CheckCircle2, User, KeyRound } from 'lucide-react';

const UserContext = createContext();

const STORAGE_KEY_USERS = 'app_users_list_v2';
const STORAGE_KEY_ACTIVE = 'app_active_user_id_v2';
const STORAGE_KEY_REMEMBER = 'app_remember_session_v2';
const STORAGE_KEY_AUTH = 'app_is_authenticated_v2';
const SESSION_KEY_AUTH = 'app_session_authenticated_v2';

export const UserProvider = ({ children, onResetData }) => {
  // Load users list (merged with default USERS to ensure primary users always exist)
  const [users, setUsers] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_USERS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const hasPrimary = parsed.some(u => u.username?.toLowerCase() === 'santiagom2401' || u.id === 'santiagom2401');
          const hasAdmin = parsed.some(u => u.username?.toLowerCase() === 'admin' || u.id === 'admin');
          if (hasPrimary && hasAdmin) {
            return parsed;
          }
        }
      }
    } catch (e) {}
    return USERS;
  });

  // Active user
  const [currentUser, setCurrentUser] = useState(() => {
    const savedId = localStorage.getItem(STORAGE_KEY_ACTIVE);
    const found = users.find(u => u.id === savedId || u.username === savedId);
    return found || DEFAULT_USER;
  });

  // Authentication State with "Remember Always" support
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    try {
      const isRemembered = localStorage.getItem(STORAGE_KEY_REMEMBER) === 'true';
      const isAuthStored = localStorage.getItem(STORAGE_KEY_AUTH) === 'true';
      if (isRemembered && isAuthStored) {
        return true;
      }
      const sessionAuth = sessionStorage.getItem(SESSION_KEY_AUTH) === 'true';
      if (sessionAuth) {
        return true;
      }
    } catch (e) {}
    return false;
  });

  // Password Verification Modal State for switching users
  const [isSwitchModalOpen, setIsSwitchModalOpen] = useState(false);
  const [pendingSwitchUser, setPendingSwitchUser] = useState(null);
  const [switchPasswordInput, setSwitchPasswordInput] = useState('');
  const [showSwitchPassword, setShowSwitchPassword] = useState(false);
  const [switchModalError, setSwitchModalError] = useState(null);

  // Sync users to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));
    } catch (e) {}
  }, [users]);

  // Login with Username & Password + Remember Me
  const login = (username, password, rememberMe = true) => {
    const cleanUser = String(username || '').trim().toLowerCase();
    const cleanPass = String(password || '').trim();

    const matched = users.find(u => 
      (u.username && u.username.toLowerCase() === cleanUser) ||
      (u.email && u.email.toLowerCase() === cleanUser) ||
      (u.id && u.id.toLowerCase() === cleanUser)
    );

    if (!matched) {
      return { success: false, message: `No se encontró ningún usuario con el identificador "${username}".` };
    }

    if (matched.password && matched.password !== cleanPass) {
      return { success: false, message: 'La contraseña ingresada es incorrecta. Por favor intente nuevamente.' };
    }

    // Success: activate user and persist session
    setCurrentUser(matched);
    setIsAuthenticated(true);
    localStorage.setItem(STORAGE_KEY_ACTIVE, matched.id);

    try {
      if (rememberMe) {
        localStorage.setItem(STORAGE_KEY_REMEMBER, 'true');
        localStorage.setItem(STORAGE_KEY_AUTH, 'true');
        sessionStorage.removeItem(SESSION_KEY_AUTH);
      } else {
        localStorage.removeItem(STORAGE_KEY_REMEMBER);
        localStorage.removeItem(STORAGE_KEY_AUTH);
        sessionStorage.setItem(SESSION_KEY_AUTH, 'true');
      }
    } catch (e) {}

    if (onResetData) {
      onResetData(matched.isDemo);
    }
    return { success: true, user: matched };
  };

  // Logout / Lock Session (returns to login page)
  const logout = () => {
    setIsAuthenticated(false);
    try {
      localStorage.removeItem(STORAGE_KEY_REMEMBER);
      localStorage.removeItem(STORAGE_KEY_AUTH);
      sessionStorage.removeItem(SESSION_KEY_AUTH);
    } catch (e) {}
  };

  // Request Switch User (opens password prompt modal)
  const requestUserSwitch = (userId) => {
    const target = users.find(u => u.id === userId || u.username === userId);
    if (!target) return;
    if (target.id === currentUser?.id) return; // Already active

    setPendingSwitchUser(target);
    setSwitchPasswordInput('');
    setShowSwitchPassword(false);
    setSwitchModalError(null);
    setIsSwitchModalOpen(true);
  };

  // Direct switch without prompt (e.g. after internal validation)
  const switchUser = (userId) => {
    requestUserSwitch(userId);
  };

  // Confirm Switch with Password inside modal
  const confirmUserSwitch = (enteredPassword) => {
    if (!pendingSwitchUser) return { success: false, message: 'No hay usuario seleccionado.' };

    const expectedPass = String(pendingSwitchUser.password || '').trim();
    const inputPass = String(enteredPassword || '').trim();

    if (expectedPass && inputPass !== expectedPass) {
      const err = 'La contraseña ingresada es incorrecta. Inténtelo nuevamente.';
      setSwitchModalError(err);
      return { success: false, message: err };
    }

    // Success: activate user
    setCurrentUser(pendingSwitchUser);
    localStorage.setItem(STORAGE_KEY_ACTIVE, pendingSwitchUser.id);
    if (onResetData) {
      onResetData(pendingSwitchUser.isDemo);
    }

    setIsSwitchModalOpen(false);
    setPendingSwitchUser(null);
    setSwitchPasswordInput('');
    setSwitchModalError(null);

    return { success: true, user: pendingSwitchUser };
  };

  const cancelUserSwitch = () => {
    setIsSwitchModalOpen(false);
    setPendingSwitchUser(null);
    setSwitchPasswordInput('');
    setSwitchModalError(null);
  };

  // Alias for backward compatibility
  const loginWithCredentials = (username, password) => {
    return login(username, password, true);
  };

  // Update existing user
  const updateUser = (userId, updates) => {
    setUsers(prev => {
      const updatedList = prev.map(u => u.id === userId ? { ...u, ...updates } : u);
      return updatedList;
    });

    if (currentUser?.id === userId) {
      setCurrentUser(prev => ({ ...prev, ...updates }));
    }
  };

  // Add new user
  const addUser = (newUser) => {
    const id = newUser.id || `user_${Date.now()}`;
    const userToAdd = {
      ...newUser,
      id,
      avatar: newUser.avatar || (newUser.name ? newUser.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'U')
    };

    setUsers(prev => [...prev, userToAdd]);
    return userToAdd;
  };

  // Delete user (cannot delete primary user)
  const deleteUser = (userId) => {
    const target = users.find(u => u.id === userId);
    if (target?.isPrimary) {
      return { success: false, message: 'No se puede eliminar la cuenta principal del administrador.' };
    }
    setUsers(prev => prev.filter(u => u.id !== userId));
    if (currentUser?.id === userId) {
      setCurrentUser(DEFAULT_USER);
      localStorage.setItem(STORAGE_KEY_ACTIVE, DEFAULT_USER.id);
    }
    return { success: true };
  };

  const isDemo = Boolean(currentUser?.isDemo);

  const handleModalSubmit = (e) => {
    e.preventDefault();
    confirmUserSwitch(switchPasswordInput);
  };

  return (
    <UserContext.Provider value={{
      currentUser,
      users,
      isAuthenticated,
      login,
      logout,
      switchUser,
      requestUserSwitch,
      confirmUserSwitch,
      cancelUserSwitch,
      loginWithCredentials,
      updateUser,
      addUser,
      deleteUser,
      isDemo,
      resetDemoData: () => onResetData && onResetData(true)
    }}>
      {children}

      {/* Global Password Verification Modal for User Switch */}
      {isSwitchModalOpen && pendingSwitchUser && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '1rem',
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <div className="card" style={{
            width: '100%',
            maxWidth: '460px',
            backgroundColor: '#ffffff',
            borderRadius: 'var(--radius-md)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            border: '1px solid rgba(226, 232, 240, 0.8)',
            padding: '1.75rem',
            position: 'relative'
          }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  backgroundColor: '#eff6ff',
                  color: 'var(--primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid #bfdbfe'
                }}>
                  <Lock size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--primary)', fontWeight: '800' }}>
                    Confirmar Contraseña
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Autenticación requerida para cambiar de usuario
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={cancelUserSwitch}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Target User Info Badge */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.85rem',
              padding: '0.85rem 1rem',
              backgroundColor: pendingSwitchUser.isDemo ? '#fffbeb' : '#f0fdf4',
              border: pendingSwitchUser.isDemo ? '1.5px solid #fde68a' : '1.5px solid #bbf7d0',
              borderRadius: 'var(--radius-sm)',
              marginBottom: '1.25rem'
            }}>
              <div style={{
                width: '42px',
                height: '42px',
                borderRadius: '50%',
                backgroundColor: pendingSwitchUser.isDemo ? '#d97706' : 'var(--primary)',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: '800',
                fontSize: '1rem',
                flexShrink: 0
              }}>
                {pendingSwitchUser.avatar || 'U'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                  <span style={{ fontWeight: '800', color: 'var(--text-main)', fontSize: '0.96rem' }}>
                    {pendingSwitchUser.name}
                  </span>
                  <span style={{
                    fontSize: '0.7rem',
                    fontWeight: '800',
                    padding: '0.12rem 0.45rem',
                    borderRadius: '999px',
                    backgroundColor: pendingSwitchUser.isDemo ? '#fef3c7' : '#dcfce7',
                    color: pendingSwitchUser.isDemo ? '#b45309' : '#15803d',
                    border: pendingSwitchUser.isDemo ? '1px solid #fcd34d' : '1px solid #86efac'
                  }}>
                    {pendingSwitchUser.isDemo ? '🧪 Sandbox' : '👑 Producción'}
                  </span>
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                  Usuario: <strong style={{ fontFamily: 'monospace', color: 'var(--text-main)' }}>{pendingSwitchUser.username || pendingSwitchUser.id}</strong> · {pendingSwitchUser.role}
                </div>
              </div>
            </div>

            {/* Password Form */}
            <form onSubmit={handleModalSubmit}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{
                  display: 'block',
                  fontSize: '0.8rem',
                  fontWeight: '700',
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  marginBottom: '0.4rem',
                  letterSpacing: '0.04em'
                }}>
                  Contraseña de {pendingSwitchUser.name.split(' ')[0]} *
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showSwitchPassword ? 'text' : 'password'}
                    required
                    autoFocus
                    placeholder="Introduce la contraseña"
                    value={switchPasswordInput}
                    onChange={e => {
                      setSwitchPasswordInput(e.target.value);
                      if (switchModalError) setSwitchModalError(null);
                    }}
                    style={{
                      width: '100%',
                      padding: '0.65rem 2.5rem 0.65rem 0.75rem',
                      borderRadius: 'var(--radius-sm)',
                      border: switchModalError ? '1.5px solid #ef4444' : '1.5px solid var(--border)',
                      fontSize: '0.95rem',
                      fontFamily: showSwitchPassword ? 'inherit' : 'monospace',
                      letterSpacing: showSwitchPassword ? 'normal' : '0.12em',
                      backgroundColor: '#ffffff'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowSwitchPassword(!showSwitchPassword)}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      padding: '4px'
                    }}
                    title={showSwitchPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                  >
                    {showSwitchPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Error Message */}
              {switchModalError && (
                <div style={{
                  padding: '0.65rem 0.85rem',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  color: '#991b1b',
                  fontSize: '0.84rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  marginBottom: '1rem'
                }}>
                  <ShieldAlert size={16} color="#dc2626" />
                  <span>{switchModalError}</span>
                </div>
              )}

              {/* Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.25rem' }}>
                <button
                  type="button"
                  className="btn"
                  onClick={cancelUserSwitch}
                  style={{
                    backgroundColor: '#f1f5f9',
                    border: '1px solid #cbd5e1',
                    color: 'var(--text-main)',
                    fontWeight: '600',
                    padding: '0.55rem 1rem'
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    fontWeight: '700',
                    padding: '0.55rem 1.25rem'
                  }}
                >
                  <KeyRound size={16} /> Confirmar e Iniciar Sesión
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};

export default UserContext;

