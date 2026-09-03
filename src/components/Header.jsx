import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Bell, Search, Menu, RefreshCw, UserCheck, ChevronDown, Check, ShieldAlert, 
  X, Clock, AlertTriangle, FileText, CheckCheck, FileCheck, ArrowRight, DollarSign, Shield, LogOut, CheckCircle, XCircle 
} from 'lucide-react';
import { useUser } from '../context/UserContext';
import { formatDateToDDMMYYYY, formatMoney, calculatePolicyStatus, getPolicyPaymentStats } from '../utils/policyHelpers';

const Header = ({ 
  onToggleSidebar, 
  showMenuButton, 
  clients = [], 
  policies = [], 
  requests = [], 
  claims = [], 
  payments = [], 
  onNavigate, 
  onNavigateToPolicy,
  onNavigateToClient
}) => {
    const { currentUser, users, switchUser, isDemo, resetDemoData, logout } = useUser();
    const [showUserMenu, setShowUserMenu] = useState(false);
    const menuRef = useRef(null);

    // Global Search State
    const [globalSearch, setGlobalSearch] = useState('');
    const [showSearchResults, setShowSearchResults] = useState(false);
    const searchRef = useRef(null);

    // Notifications State
    const [showNotifications, setShowNotifications] = useState(false);
    const [notifFilter, setNotifFilter] = useState('ALL'); // 'ALL', 'claims', 'policies', 'requests'
    const notifRef = useRef(null);
    const [readNotificationIds, setReadNotificationIds] = useState(() => {
        try {
            const saved = localStorage.getItem('app_read_notifications');
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            return [];
        }
    });

    // Build real-time notifications list
    const notifications = useMemo(() => {
        const list = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // 1. Siniestros abiertos / en curso
        if (Array.isArray(claims)) {
            claims.forEach(c => {
                const isPending = !c.status || c.status === 'Abierto' || c.status === 'En Proceso' || c.status === 'Pendiente' || c.status === 'Open';
                if (isPending) {
                    list.push({
                        id: `claim_${c.id || c.numero_siniestro}`,
                        category: 'claims',
                        type: 'claim',
                        title: `Siniestro en Curso: ${c.numero_siniestro || `SIN-${c.id}`}`,
                        subtitle: `${c.client || 'Cliente'} · ${c.type || 'Siniestro'} · Reclamado: ${c.amount || (c.monto_reclamado ? formatMoney(c.monto_reclamado) : 'N/D')}`,
                        dateStr: c.date ? formatDateToDDMMYYYY(c.date) : 'En curso',
                        priority: 'high',
                        action: () => {
                            if (onNavigate) onNavigate('claims');
                        }
                    });
                }
            });
        }

        // 2. Pólizas próximas a vencer o vencidas
        if (Array.isArray(policies)) {
            policies.forEach(p => {
                if (!p.endDate) return;
                const endD = new Date(p.endDate);
                if (isNaN(endD.getTime())) return;
                endD.setHours(0, 0, 0, 0);

                const diffDays = Math.round((endD.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

                if (diffDays < 0 && p.status !== 'Cancelled' && p.status !== 'Cancelada') {
                    list.push({
                        id: `policy_expired_${p.id}`,
                        category: 'policies',
                        type: 'policy_expired',
                        title: `Póliza Vencida: ${p.id}`,
                        subtitle: `${p.client} · ${p.type} (${p.insurer}) · Venció el ${formatDateToDDMMYYYY(p.endDate)}`,
                        dateStr: `Hace ${Math.abs(diffDays)} días`,
                        priority: 'high',
                        action: () => {
                            if (onNavigateToPolicy) onNavigateToPolicy(p.id);
                            else if (onNavigate) onNavigate('policies');
                        }
                    });
                } else if (diffDays >= 0 && diffDays <= 30 && p.status !== 'Cancelled' && p.status !== 'Cancelada') {
                    const pStats = getPolicyPaymentStats(p, payments);
                    const isPaid = pStats.totalOwed <= 0;
                    list.push({
                        id: `policy_expiring_${p.id}`,
                        category: 'policies',
                        type: 'policy_expiring',
                        title: isPaid ? `Próxima a Renovar: ${p.id}` : `Póliza por Vencer: ${p.id}`,
                        subtitle: `${p.client} · ${p.type} (${p.insurer}) · Vence: ${formatDateToDDMMYYYY(p.endDate)}`,
                        dateStr: diffDays === 0 ? 'Vence Hoy' : `En ${diffDays} días`,
                        priority: diffDays <= 7 ? 'high' : 'medium',
                        action: () => {
                            if (onNavigateToPolicy) onNavigateToPolicy(p.id);
                            else if (onNavigate) onNavigate('policies');
                        }
                    });
                }
            });
        }

        // 3. Solicitudes pendientes
        if (Array.isArray(requests)) {
            requests.forEach(r => {
                if (r.status === 'Pendiente' || r.status === 'En Trámite') {
                    list.push({
                        id: `req_${r.id}`,
                        category: 'requests',
                        type: 'request',
                        title: `Solicitud Pendiente: ${r.type || 'Trámite'}`,
                        subtitle: `${r.client || r.applicantName || 'Cliente'} · ${r.insurer || 'Compañía'}`,
                        dateStr: r.date ? formatDateToDDMMYYYY(r.date) : 'Pendiente',
                        priority: 'medium',
                        action: () => {
                            if (onNavigate) onNavigate('requests');
                        }
                    });
                }
            });
        }

        return list;
    }, [claims, policies, requests, onNavigate, onNavigateToPolicy]);

    const unreadCount = useMemo(() => {
        return notifications.filter(n => !readNotificationIds.includes(n.id)).length;
    }, [notifications, readNotificationIds]);

    const markAllAsRead = () => {
        const allIds = notifications.map(n => n.id);
        setReadNotificationIds(allIds);
        try {
            localStorage.setItem('app_read_notifications', JSON.stringify(allIds));
        } catch (e) {}
    };

    const markAsRead = (id) => {
        if (!readNotificationIds.includes(id)) {
            const updated = [...readNotificationIds, id];
            setReadNotificationIds(updated);
            try {
                localStorage.setItem('app_read_notifications', JSON.stringify(updated));
            } catch (e) {}
        }
    };

    const handleNotificationClick = (item) => {
        markAsRead(item.id);
        setShowNotifications(false);
        if (item.action) {
            item.action();
        }
    };

    const filteredNotifications = useMemo(() => {
        if (notifFilter === 'ALL') return notifications;
        return notifications.filter(n => n.category === notifFilter);
    }, [notifications, notifFilter]);

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
            if (notifRef.current && !notifRef.current.contains(event.target)) {
                setShowNotifications(false);
            }
            if (searchRef.current && !searchRef.current.contains(event.target)) {
                setShowSearchResults(false);
            }
        };

        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                setShowSearchResults(false);
                setShowUserMenu(false);
                setShowNotifications(false);
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
                            onClick={() => switchUser('santiagom2401')}
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
                minHeight: '65px',
                height: 'auto',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.6rem clamp(0.75rem, 2.5vw, 2rem)',
                gap: '0.75rem',
                flexWrap: 'wrap'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
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
                                transition: 'background-color 0.2s',
                                flexShrink: 0
                            }}
                            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#ebdcd4'}
                            onMouseLeave={e => e.currentTarget.style.backgroundColor = '#fdf8f6'}
                            title="Mostrar barra lateral"
                        >
                            <Menu size={22} />
                        </button>
                    )}
                    <div>
                        <h1 style={{ fontSize: 'clamp(1.15rem, 2.5vw, 1.6rem)', color: 'var(--primary)', margin: 0, whiteSpace: 'nowrap' }}>Panel Principal</h1>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(0.4rem, 1.5vw, 1rem)', flexWrap: 'wrap' }}>
                    <div ref={searchRef} style={{ position: 'relative' }}>
                        <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={16} />
                        <input
                            type="text"
                            placeholder="Buscar..."
                            value={globalSearch}
                            onChange={(e) => {
                                setGlobalSearch(e.target.value);
                                setShowSearchResults(true);
                            }}
                            onFocus={() => {
                                if (globalSearch.trim()) setShowSearchResults(true);
                            }}
                            style={{
                                paddingLeft: '36px',
                                paddingRight: globalSearch ? '32px' : '10px',
                                width: 'clamp(130px, 20vw, 280px)',
                                height: '38px',
                                fontSize: '0.88rem'
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
                                    right: '8px',
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
                                <X size={15} />
                            </button>
                        )}

                        {/* Live Global Search Results Popover */}
                        {showSearchResults && globalSearch.trim().length > 0 && (
                            <div style={{
                                position: 'absolute',
                                top: 'calc(100% + 8px)',
                                right: 0,
                                width: 'min(380px, calc(100vw - 32px))',
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
                                        {matchingClients.slice(0, 8).map(c => (
                                            <div
                                                key={`client-${c.id}`}
                                                onClick={() => {
                                                    setShowSearchResults(false);
                                                    setGlobalSearch('');
                                                    if (onNavigateToClient) {
                                                        onNavigateToClient(c.id);
                                                    } else if (onNavigate) {
                                                        onNavigate('clients');
                                                    }
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
                                        {matchingPolicies.slice(0, 8).map(p => {
                                            const computedStatus = calculatePolicyStatus ? calculatePolicyStatus(p, payments) : (p.status || 'Active');
                                            const pStats = getPolicyPaymentStats ? getPolicyPaymentStats(p, payments) : { totalOwed: 0 };
                                            const isPaid = pStats.totalOwed <= 0;
                                            const isAvailable = computedStatus === 'Active';
                                            const isExpiring = computedStatus === 'Expiring' || computedStatus === 'Pending';
                                            const statusLabel = isAvailable ? 'Disponible' : isExpiring ? (isPaid ? 'Próximo a renovar' : 'A punto de vencer') : 'Vencido';
                                            const statusBg = isAvailable ? '#dcfce7' : isExpiring ? (isPaid ? '#e0f2fe' : '#ffedd5') : '#fee2e2';
                                            const statusColor = isAvailable ? '#166534' : isExpiring ? (isPaid ? '#0369a1' : '#9a3412') : '#991b1b';

                                            return (
                                                <div
                                                    key={`pol-${p.id}`}
                                                    onClick={() => {
                                                        setShowSearchResults(false);
                                                        setGlobalSearch('');
                                                        if (onNavigateToPolicy) {
                                                            onNavigateToPolicy(p.id);
                                                        } else if (onNavigate) {
                                                            onNavigate('policies');
                                                        }
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
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                                                            <span style={{ fontWeight: '700', fontSize: '0.88rem', color: 'var(--primary)' }}>{p.id}</span>
                                                            <span style={{
                                                                fontSize: '0.68rem',
                                                                fontWeight: '700',
                                                                padding: '0.12rem 0.45rem',
                                                                borderRadius: '999px',
                                                                backgroundColor: statusBg,
                                                                color: statusColor,
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                gap: '0.25rem'
                                                            }}>
                                                                {isAvailable ? <CheckCircle size={10} /> : isExpiring ? <AlertTriangle size={10} /> : <XCircle size={10} />}
                                                                {statusLabel}
                                                            </span>
                                                        </div>
                                                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                                            {p.client} · <span style={{ fontWeight: '500' }}>{p.type}</span>
                                                        </div>
                                                    </div>
                                                    <div style={{ textAlign: 'right' }}>
                                                        <div style={{ fontSize: '0.75rem', fontWeight: '600', color: '#64748b' }}>{p.insurer}</div>
                                                        <div style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-main)' }}>{p.amount}</div>
                                                    </div>
                                                </div>
                                            );
                                        })}
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

                    {/* Interactive Notifications Panel */}
                    <div style={{ position: 'relative' }} ref={notifRef}>
                        <button
                            onClick={() => {
                                setShowNotifications(!showNotifications);
                                setShowUserMenu(false);
                                setShowSearchResults(false);
                            }}
                            style={{
                                position: 'relative',
                                background: showNotifications ? '#f1f5f9' : 'none',
                                border: 'none',
                                padding: '8px',
                                color: showNotifications ? 'var(--primary)' : 'var(--text-muted)',
                                borderRadius: '50%',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.2s'
                            }}
                            title="Centro de Notificaciones y Avisos"
                        >
                            <Bell size={22} />
                            {unreadCount > 0 && (
                                <span style={{
                                    position: 'absolute',
                                    top: '2px',
                                    right: '2px',
                                    minWidth: '18px',
                                    height: '18px',
                                    backgroundColor: '#ef4444',
                                    color: 'white',
                                    borderRadius: '999px',
                                    fontSize: '0.68rem',
                                    fontWeight: '800',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    padding: '0 4px',
                                    boxShadow: '0 2px 4px rgba(239, 68, 68, 0.4)',
                                    border: '2px solid white'
                                }}>
                                    {unreadCount > 99 ? '99+' : unreadCount}
                                </span>
                            )}
                        </button>

                        {/* Notifications Dropdown Panel */}
                        {showNotifications && (
                            <div style={{
                                position: 'absolute',
                                right: isDemo ? '-50px' : '-20px',
                                top: 'calc(100% + 10px)',
                                width: '390px',
                                maxWidth: '92vw',
                                backgroundColor: 'white',
                                borderRadius: 'var(--radius-md)',
                                boxShadow: '0 20px 40px -15px rgba(0,0,0,0.2), 0 0 0 1px rgba(0,0,0,0.06)',
                                border: '1px solid var(--border)',
                                zIndex: 1100,
                                overflow: 'hidden',
                                animation: 'fadeIn 0.15s ease-out'
                            }}>
                                {/* Header */}
                                <div style={{
                                    padding: '0.85rem 1rem',
                                    backgroundColor: '#f8fafc',
                                    borderBottom: '1px solid var(--border)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <div style={{
                                            width: '28px',
                                            height: '28px',
                                            borderRadius: '8px',
                                            backgroundColor: '#eff6ff',
                                            color: 'var(--primary)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}>
                                            <Bell size={16} />
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: '800', fontSize: '0.92rem', color: 'var(--text-main)' }}>
                                                Notificaciones
                                            </div>
                                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                                {unreadCount} aviso{unreadCount === 1 ? '' : 's'} pendiente{unreadCount === 1 ? '' : 's'}
                                            </div>
                                        </div>
                                    </div>

                                    {unreadCount > 0 && (
                                        <button
                                            type="button"
                                            onClick={markAllAsRead}
                                            style={{
                                                background: 'none',
                                                border: 'none',
                                                color: '#2563eb',
                                                fontSize: '0.75rem',
                                                fontWeight: '700',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.25rem',
                                                padding: '0.3rem 0.5rem',
                                                borderRadius: '4px'
                                            }}
                                            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#eff6ff'}
                                            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                                            title="Marcar todas como leídas"
                                        >
                                            <CheckCheck size={14} /> Marcar leídas
                                        </button>
                                    )}
                                </div>

                                {/* Filter Categories Tabs */}
                                <div style={{
                                    display: 'flex',
                                    gap: '0.35rem',
                                    padding: '0.5rem 0.85rem',
                                    backgroundColor: '#ffffff',
                                    borderBottom: '1px solid #f1f5f9',
                                    overflowX: 'auto'
                                }}>
                                    {[
                                        { id: 'ALL', label: 'Todas', count: notifications.length },
                                        { id: 'claims', label: 'Siniestros', count: notifications.filter(n => n.category === 'claims').length },
                                        { id: 'policies', label: 'Pólizas', count: notifications.filter(n => n.category === 'policies').length },
                                        { id: 'requests', label: 'Solicitudes', count: notifications.filter(n => n.category === 'requests').length },
                                    ].map(tab => (
                                        <button
                                            key={tab.id}
                                            type="button"
                                            onClick={() => setNotifFilter(tab.id)}
                                            style={{
                                                padding: '0.25rem 0.6rem',
                                                borderRadius: '999px',
                                                fontSize: '0.74rem',
                                                fontWeight: notifFilter === tab.id ? '700' : '600',
                                                border: 'none',
                                                backgroundColor: notifFilter === tab.id ? 'var(--primary)' : '#f1f5f9',
                                                color: notifFilter === tab.id ? 'white' : 'var(--text-muted)',
                                                cursor: 'pointer',
                                                whiteSpace: 'nowrap',
                                                transition: 'all 0.15s'
                                            }}
                                        >
                                            {tab.label} ({tab.count})
                                        </button>
                                    ))}
                                </div>

                                {/* Notifications List */}
                                <div style={{ maxHeight: '330px', overflowY: 'auto' }}>
                                    {filteredNotifications.length === 0 ? (
                                        <div style={{ padding: '2.5rem 1.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                            <div style={{ fontSize: '2rem', marginBottom: '0.4rem' }}>✨</div>
                                            <div style={{ fontWeight: '700', fontSize: '0.9rem', color: 'var(--text-main)', marginBottom: '0.2rem' }}>
                                                Sin notificaciones pendientes
                                            </div>
                                            <div style={{ fontSize: '0.78rem' }}>
                                                {notifFilter === 'ALL'
                                                    ? 'Todo se encuentra al día y en orden.'
                                                    : 'No hay alertas para esta categoría.'}
                                            </div>
                                        </div>
                                    ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                            {filteredNotifications.map((notif) => {
                                                const isUnread = !readNotificationIds.includes(notif.id);
                                                return (
                                                    <div
                                                        key={notif.id}
                                                        onClick={() => handleNotificationClick(notif)}
                                                        style={{
                                                            padding: '0.75rem 1rem',
                                                            borderBottom: '1px solid #f1f5f9',
                                                            backgroundColor: isUnread ? '#f8fafc' : 'white',
                                                            display: 'flex',
                                                            alignItems: 'flex-start',
                                                            gap: '0.75rem',
                                                            cursor: 'pointer',
                                                            position: 'relative',
                                                            transition: 'background-color 0.15s'
                                                        }}
                                                        onMouseEnter={e => e.currentTarget.style.backgroundColor = isUnread ? '#f1f5f9' : '#fafafa'}
                                                        onMouseLeave={e => e.currentTarget.style.backgroundColor = isUnread ? '#f8fafc' : 'white'}
                                                    >
                                                        {/* Icon */}
                                                        <div style={{
                                                            width: '32px',
                                                            height: '32px',
                                                            borderRadius: '8px',
                                                            backgroundColor: notif.category === 'claims' 
                                                                ? '#fee2e2' 
                                                                : notif.type === 'policy_expired'
                                                                ? '#fee2e2'
                                                                : notif.type === 'policy_expiring'
                                                                ? '#fef3c7'
                                                                : '#eff6ff',
                                                            color: notif.category === 'claims' || notif.type === 'policy_expired'
                                                                ? '#dc2626'
                                                                : notif.type === 'policy_expiring'
                                                                ? '#d97706'
                                                                : '#2563eb',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            flexShrink: 0,
                                                            marginTop: '2px'
                                                        }}>
                                                            {notif.category === 'claims' ? (
                                                                <Shield size={16} />
                                                            ) : notif.type === 'policy_expired' ? (
                                                                <AlertTriangle size={16} />
                                                            ) : notif.type === 'policy_expiring' ? (
                                                                <Clock size={16} />
                                                            ) : (
                                                                <FileCheck size={16} />
                                                            )}
                                                        </div>

                                                        {/* Text */}
                                                        <div style={{ flex: 1, minWidth: 0 }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.15rem' }}>
                                                                <span style={{ fontWeight: isUnread ? '800' : '600', fontSize: '0.85rem', color: 'var(--text-main)', lineHeight: 1.2 }}>
                                                                    {notif.title}
                                                                </span>
                                                                {isUnread && (
                                                                    <span style={{
                                                                        width: '7px',
                                                                        height: '7px',
                                                                        borderRadius: '50%',
                                                                        backgroundColor: '#2563eb',
                                                                        flexShrink: 0
                                                                    }} />
                                                                )}
                                                            </div>
                                                            <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', lineHeight: 1.3, marginBottom: '0.3rem' }}>
                                                                {notif.subtitle}
                                                            </div>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                                <span style={{
                                                                    fontSize: '0.68rem',
                                                                    fontWeight: '700',
                                                                    padding: '0.08rem 0.35rem',
                                                                    borderRadius: '4px',
                                                                    backgroundColor: notif.priority === 'high' ? '#fee2e2' : '#f1f5f9',
                                                                    color: notif.priority === 'high' ? '#dc2626' : 'var(--text-muted)'
                                                                }}>
                                                                    {notif.dateStr}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>

                                {/* Footer */}
                                <div style={{
                                    padding: '0.65rem 1rem',
                                    backgroundColor: '#f8fafc',
                                    borderTop: '1px solid var(--border)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowNotifications(false);
                                            if (onNavigate) onNavigate('dashboard');
                                        }}
                                        style={{
                                            background: 'none',
                                            border: 'none',
                                            color: 'var(--primary)',
                                            fontSize: '0.78rem',
                                            fontWeight: '700',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.35rem'
                                        }}
                                    >
                                        Ir al Panel de Control / Dashboard <ArrowRight size={14} />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

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
                                                    setShowUserMenu(false);
                                                    if (!isSelected) {
                                                        switchUser(user.id);
                                                    }
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

                                <div style={{ borderTop: '1px solid var(--border)', marginTop: '0.6rem', paddingTop: '0.6rem' }}>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowUserMenu(false);
                                            logout();
                                        }}
                                        style={{
                                            width: '100%',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '0.5rem',
                                            padding: '0.55rem',
                                            borderRadius: 'var(--radius-sm)',
                                            border: '1px solid #fee2e2',
                                            backgroundColor: '#fef2f2',
                                            color: '#dc2626',
                                            fontWeight: '700',
                                            fontSize: '0.82rem',
                                            cursor: 'pointer',
                                            transition: 'all 0.15s'
                                        }}
                                        onMouseEnter={e => e.currentTarget.style.backgroundColor = '#fee2e2'}
                                        onMouseLeave={e => e.currentTarget.style.backgroundColor = '#fef2f2'}
                                    >
                                        <LogOut size={16} /> Cerrar Sesión / Cambiar de Usuario
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Header;

