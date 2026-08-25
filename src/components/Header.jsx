import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Bell, Search, Menu, RefreshCw, UserCheck, ChevronDown, Check, ShieldAlert, Database, Wifi, WifiOff, X } from 'lucide-react';
import { useUser } from '../context/UserContext';
import { useBackend } from '../context/BackendContext';
import HasuraSettingsModal from './HasuraSettingsModal';

const Header = ({ onToggleSidebar, showMenuButton, clients = [], policies = [], onNavigate, onNavigateToPolicy }) => {
    const { currentUser, users, switchUser, isDemo, resetDemoData } = useUser();
    const { status: backendStatus, latency, checkConnection } = useBackend();
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [showHasuraModal, setShowHasuraModal] = useState(false);
    const menuRef = useRef(null);

    // Global Search State
    const [globalSearch, setGlobalSearch] = useState('');
    const [showSearchResults, setShowSearchResults] = useState(false);
    const searchRef = useRef(null);

    // Calculate matching clients and policies in real-time as user types
    const matchingClients = useMemo(() => {
        if (!globalSearch.trim()) return [];
        const term = globalSearch.toLowerCase().trim();
        return clients.filter(c => 
            (c.name || '').toLowerCase().includes(term) ||
            (c.documentId || '').toLowerCase().includes(term) ||
            (c.email || '').toLowerCase().includes(term) ||
            (c.phone || '').toLowerCase().includes(term) ||
            (c.insurerCode || '').toLowerCase().includes(term)
        );
    }, [clients, globalSearch]);

    const matchingPolicies = useMemo(() => {
        if (!globalSearch.trim()) return [];
        const term = globalSearch.toLowerCase().trim();
        return policies.filter(p => 
            (p.id || '').toLowerCase().includes(term) ||
            (p.client || '').toLowerCase().includes(term) ||
            (p.insurer || '').toLowerCase().includes(term) ||
            (p.type || '').toLowerCase().includes(term)
        );
    }, [policies, globalSearch]);

    // Close menu or search dropdown when clicking outside or pressing Escape
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setShowUserMenu(false);
            }
            if (searchRef.current && !searchRef.current.contains(event.target)) {
                setShowSearchResults(false);
            }
        };

        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                setShowSearchResults(false);
                setShowUserMenu(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, []);

    return (
        <header style={{
            backgroundColor: 'white',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            flexDirection: 'column',
            position: 'sticky',
            top: 0,
            zIndex: 100
        }}>
            {/* Sandbox / Demo Warning Banner */}
            {isDemo && (
                <div style={{
                    backgroundColor: '#fffbeb',
                    borderBottom: '1px solid #fef3c7',
                    padding: '0.6rem 2rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '1rem',
                    flexWrap: 'wrap'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#92400e' }}>
                        <div style={{
                            backgroundColor: '#fde68a',
                            borderRadius: '50%',
                            width: '28px',
                            height: '28px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                        }}>
                            <ShieldAlert size={16} color="#b45309" />
                        </div>
                        <div>
                            <span style={{ fontWeight: '700', fontSize: '0.95rem' }}>
                                Modo de Prueba (Sandbox Activo):
                            </span>
                            <span style={{ fontSize: '0.9rem', marginLeft: '0.5rem', opacity: 0.9 }}>
                                Estás navegando con datos reales. Puedes crear, editar y probar libremente, pero <strong>ningún cambio se guardará</strong>.
                            </span>
                        </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <button
                            onClick={resetDemoData}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.4rem',
                                padding: '0.35rem 0.75rem',
                                fontSize: '0.85rem',
                                fontWeight: '600',
                                color: '#92400e',
                                backgroundColor: '#fef3c7',
                                border: '1px solid #fcd34d',
                                borderRadius: 'var(--radius-sm)',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#fde68a'}
                            onMouseLeave={e => e.currentTarget.style.backgroundColor = '#fef3c7'}
                            title="Restablece las modificaciones hechas en esta sesión de prueba"
                        >
                            <RefreshCw size={14} />
                            Restablecer Datos
                        </button>

                        <button
                            onClick={() => switchUser('santiago')}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.4rem',
                                padding: '0.35rem 0.75rem',
                                fontSize: '0.85rem',
                                fontWeight: '600',
                                color: '#ffffff',
                                backgroundColor: 'var(--primary)',
                                border: 'none',
                                borderRadius: 'var(--radius-sm)',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                            onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--primary-hover)'}
                            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'var(--primary)'}
                        >
                            <UserCheck size={14} />
                            Volver a Administrador
                        </button>
                    </div>
                </div>
            )}

            {/* Main Header Bar */}
            <div style={{
                height: '75px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 2rem'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    {showMenuButton && (
                        <button
                            onClick={onToggleSidebar}
                            style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                color: 'var(--primary)',
                                padding: '8px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderRadius: 'var(--radius-sm)',
                                backgroundColor: '#fdf8f6',
                                transition: 'background-color 0.2s'
                            }}
                            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#ebdcd4'}
                            onMouseLeave={e => e.currentTarget.style.backgroundColor = '#fdf8f6'}
                            title="Mostrar barra lateral"
                        >
                            <Menu size={22} />
                        </button>
                    )}
                    <div>
                        <h1 style={{ fontSize: '1.6rem', color: 'var(--primary)', margin: 0 }}>Panel Principal</h1>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div ref={searchRef} style={{ position: 'relative' }}>
                        <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={18} />
                        <input
                            type="text"
                            placeholder="Buscar cliente o póliza..."
                            value={globalSearch}
                            onChange={(e) => {
                                setGlobalSearch(e.target.value);
                                setShowSearchResults(true);
                            }}
                            onFocus={() => {
                                if (globalSearch.trim()) setShowSearchResults(true);
                            }}
                            style={{
                                paddingLeft: '40px',
                                paddingRight: globalSearch ? '36px' : '12px',
                                width: '280px',
                                height: '42px',
                                fontSize: '0.95rem'
                            }}
                        />
                        {globalSearch && (
                            <button
                                onClick={() => {
                                    setGlobalSearch('');
                                    setShowSearchResults(false);
                                }}
                                style={{
                                    position: 'absolute',
                                    right: '10px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    color: 'var(--text-muted)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    padding: '2px'
                                }}
                                title="Limpiar búsqueda"
                            >
                                <X size={16} />
                            </button>
                        )}

                        {/* Live Global Search Results Popover */}
                        {showSearchResults && globalSearch.trim().length > 0 && (
                            <div style={{
                                position: 'absolute',
                                top: 'calc(100% + 8px)',
                                left: 0,
                                width: '380px',
                                maxHeight: '420px',
                                overflowY: 'auto',
                                backgroundColor: 'white',
                                borderRadius: 'var(--radius-md)',
                                boxShadow: '0 12px 30px rgba(0,0,0,0.18)',
                                border: '1px solid var(--border)',
                                zIndex: 1100,
                                animation: 'fadeIn 0.15s ease-out',
                                padding: '0.5rem 0'
                            }}>
                                <div style={{
                                    padding: '0.5rem 1rem',
                                    fontSize: '0.75rem',
                                    fontWeight: '700',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px',
                                    color: 'var(--text-muted)',
                                    borderBottom: '1px solid #f1f5f9',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center'
                                }}>
                                    <span>Resultados para "{globalSearch}"</span>
                                    <span style={{ backgroundColor: '#f1f5f9', padding: '0.1rem 0.4rem', borderRadius: '4px', fontSize: '0.7rem' }}>
                                        {matchingClients.length + matchingPolicies.length} encontrados
                                    </span>
                                </div>

                                {/* Clientes */}
                                {matchingClients.length > 0 && (
                                    <div>
                                        <div style={{ padding: '0.4rem 1rem', fontSize: '0.75rem', fontWeight: '700', color: 'var(--primary)', backgroundColor: '#faf5f0' }}>
                                            Clientes ({matchingClients.length})
                                        </div>
                                        {matchingClients.slice(0, 5).map(c => (
                                            <div
                                                key={`client-${c.id}`}
                                                onClick={() => {
                                                    setShowSearchResults(false);
                                                    if (onNavigate) onNavigate('clients');
                                                }}
                                                style={{
                                                    padding: '0.6rem 1rem',
                                                    cursor: 'pointer',
                                                    borderBottom: '1px solid #f8fafc',
                                                    transition: 'background-color 0.15s',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between'
                                                }}
                                                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#fdf8f6'}
                                                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                                            >
                                                <div>
                                                    <div style={{ fontWeight: '600', fontSize: '0.9rem', color: 'var(--text-main)' }}>{c.name}</div>
                                                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                                        {c.documentId && c.documentId !== 'No Registrado' ? c.documentId : (c.phone || c.email || 'Cliente')}
                                                    </div>
                                                </div>
                                                <span style={{
                                                    fontSize: '0.7rem',
                                                    padding: '0.15rem 0.45rem',
                                                    borderRadius: '4px',
                                                    backgroundColor: c.personType === 'Jurídica' ? '#e0f2fe' : '#f0fdf4',
                                                    color: c.personType === 'Jurídica' ? '#0369a1' : '#15803d',
                                                    fontWeight: '600'
                                                }}>
                                                    {c.personType || 'Física'}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Pólizas */}
                                {matchingPolicies.length > 0 && (
                                    <div>
                                        <div style={{ padding: '0.4rem 1rem', fontSize: '0.75rem', fontWeight: '700', color: 'var(--primary)', backgroundColor: '#faf5f0' }}>
                                            Pólizas ({matchingPolicies.length})
                                        </div>
                                        {matchingPolicies.slice(0, 5).map(p => (
                                            <div
                                                key={`pol-${p.id}`}
                                                onClick={() => {
                                                    setShowSearchResults(false);
                                                    if (onNavigateToPolicy) onNavigateToPolicy(p.id);
                                                    else if (onNavigate) onNavigate('policies');
                                                }}
                                                style={{
                                                    padding: '0.6rem 1rem',
                                                    cursor: 'pointer',
                                                    borderBottom: '1px solid #f8fafc',
                                                    transition: 'background-color 0.15s',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between'
                                                }}
                                                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#fdf8f6'}
                                                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                                            >
                                                <div>
                                                    <div style={{ fontWeight: '700', fontSize: '0.88rem', color: 'var(--primary)' }}>{p.id}</div>
                                                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                                        {p.client} · <span style={{ fontWeight: '500' }}>{p.type}</span>
                                                    </div>
                                                </div>
                                                <div style={{ textAlign: 'right' }}>
                                                    <div style={{ fontSize: '0.75rem', fontWeight: '600', color: '#64748b' }}>{p.insurer}</div>
                                                    <div style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-main)' }}>{p.amount}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {matchingClients.length === 0 && matchingPolicies.length === 0 && (
                                    <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                                        No se encontraron clientes ni pólizas para "<strong>{globalSearch}</strong>"
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Hasura Backend Status Pill */}
                    <button
                        onClick={() => setShowHasuraModal(true)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.45rem',
                            padding: '0.45rem 0.8rem',
                            fontSize: '0.82rem',
                            fontWeight: '600',
                            backgroundColor: backendStatus === 'connected' ? '#f0fdf4' : backendStatus === 'checking' ? '#eff6ff' : '#fef2f2',
                            color: backendStatus === 'connected' ? '#15803d' : backendStatus === 'checking' ? '#1d4ed8' : '#b91c1c',
                            border: `1.5px solid ${backendStatus === 'connected' ? '#bbf7d0' : backendStatus === 'checking' ? '#bfdbfe' : '#fecaca'}`,
                            borderRadius: 'var(--radius-full)',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                        title={`Estado Backend Hasura: ${backendStatus}. Clic para configurar.`}
                    >
                        <Database size={15} />
                        <span>
                            {backendStatus === 'connected' ? 'Hasura Online' : backendStatus === 'checking' ? 'Conectando...' : 'Hasura Local'}
                        </span>
                        <span style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            backgroundColor: backendStatus === 'connected' ? '#22c55e' : backendStatus === 'checking' ? '#3b82f6' : '#ef4444'
                        }}></span>
                    </button>

                    <button style={{
                        position: 'relative',
                        background: 'none',
                        border: 'none',
                        padding: '8px',
                        color: 'var(--text-muted)',
                        cursor: 'pointer'
                    }} title="Notificaciones">
                        <Bell size={24} />
                        <span style={{
                            position: 'absolute',
                            top: '6px',
                            right: '6px',
                            width: '9px',
                            height: '9px',
                            backgroundColor: 'var(--error)',
                            borderRadius: '50%'
                        }}></span>
                    </button>

                    {/* User Profile Selector Pill */}
                    <div style={{ position: 'relative' }} ref={menuRef}>
                        <button
                            onClick={() => setShowUserMenu(!showUserMenu)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.75rem',
                                padding: '0.4rem 0.85rem',
                                backgroundColor: isDemo ? '#fffbeb' : '#f8fafc',
                                border: isDemo ? '1.5px solid #fcd34d' : '1.5px solid var(--border)',
                                borderRadius: 'var(--radius-full)',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                            onMouseEnter={e => e.currentTarget.style.boxShadow = 'var(--shadow-sm)'}
                            onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
                        >
                            <div style={{
                                width: '34px',
                                height: '34px',
                                borderRadius: '50%',
                                backgroundColor: isDemo ? '#d97706' : 'var(--primary)',
                                color: 'white',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: '700',
                                fontSize: '0.85rem'
                            }}>
                                {currentUser?.avatar || 'U'}
                            </div>
                            <div style={{ textAlign: 'left' }}>
                                <div style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--text-main)', lineHeight: 1.2 }}>
                                    {currentUser?.name}
                                </div>
                                <div style={{
                                    fontSize: '0.75rem',
                                    fontWeight: '600',
                                    color: isDemo ? '#b45309' : 'var(--success)'
                                }}>
                                    {isDemo ? '● Modo Prueba (No Guarda)' : '● Administrador'}
                                </div>
                            </div>
                            <ChevronDown size={16} color="var(--text-muted)" style={{ transform: showUserMenu ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                        </button>

                        {/* Dropdown Menu */}
                        {showUserMenu && (
                            <div style={{
                                position: 'absolute',
                                right: 0,
                                top: 'calc(100% + 8px)',
                                width: '320px',
                                backgroundColor: 'white',
                                borderRadius: 'var(--radius-md)',
                                boxShadow: 'var(--shadow-xl)',
                                border: '1px solid var(--border)',
                                padding: '0.75rem',
                                zIndex: 1000
                            }}>
                                <div style={{ padding: '0.5rem 0.75rem', borderBottom: '1px solid var(--border)', marginBottom: '0.5rem' }}>
                                    <span style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
                                        Seleccionar Perfil de Usuario
                                    </span>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                    {users.map((user) => {
                                        const isSelected = user.id === currentUser?.id;
                                        return (
                                            <div
                                                key={user.id}
                                                onClick={() => {
                                                    switchUser(user.id);
                                                    setShowUserMenu(false);
                                                }}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'flex-start',
                                                    gap: '0.75rem',
                                                    padding: '0.75rem',
                                                    borderRadius: 'var(--radius-sm)',
                                                    backgroundColor: isSelected ? (user.isDemo ? '#fffbeb' : '#f0fdf4') : 'transparent',
                                                    border: isSelected ? (user.isDemo ? '1px solid #fde68a' : '1px solid #bbf7d0') : '1px solid transparent',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.15s'
                                                }}
                                                onMouseEnter={e => {
                                                    if (!isSelected) e.currentTarget.style.backgroundColor = '#f8fafc';
                                                }}
                                                onMouseLeave={e => {
                                                    if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                                                }}
                                            >
                                                <div style={{
                                                    width: '36px',
                                                    height: '36px',
                                                    borderRadius: '50%',
                                                    backgroundColor: user.isDemo ? '#d97706' : 'var(--primary)',
                                                    color: 'white',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontWeight: '700',
                                                    fontSize: '0.85rem',
                                                    flexShrink: 0
                                                }}>
                                                    {user.avatar}
                                                </div>
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                        <span style={{ fontWeight: '700', fontSize: '0.95rem', color: 'var(--text-main)' }}>
                                                            {user.name}
                                                        </span>
                                                        {isSelected && <Check size={16} color={user.isDemo ? '#b45309' : '#16a34a'} />}
                                                    </div>
                                                    <span style={{
                                                        display: 'inline-block',
                                                        fontSize: '0.75rem',
                                                        fontWeight: '600',
                                                        color: user.isDemo ? '#b45309' : '#15803d',
                                                        backgroundColor: user.isDemo ? '#fef3c7' : '#dcfce7',
                                                        padding: '0.1rem 0.4rem',
                                                        borderRadius: 'var(--radius-sm)',
                                                        marginTop: '0.2rem'
                                                    }}>
                                                        {user.role}
                                                    </span>
                                                    <p style={{ margin: '0.35rem 0 0', fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.3 }}>
                                                        {user.description}
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Hasura Settings Modal */}
            <HasuraSettingsModal
                isOpen={showHasuraModal}
                onClose={() => setShowHasuraModal(false)}
            />
        </header>
    );
};

export default Header;

