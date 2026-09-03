import React from 'react';
import { Home, Users, FileText, Settings, Shield, DollarSign, PieChart, Building2, Pin, User, ShieldAlert, ArrowLeftRight, CheckCircle2, FileCheck, LogOut } from 'lucide-react';
import { useUser } from '../context/UserContext';

const Sidebar = ({ activePage, onNavigate, isPinned, onTogglePin, isCollapsed, requests = [] }) => {
    const { currentUser, switchUser, isDemo, logout } = useUser();

    const pendingRequestsCount = Array.isArray(requests) ? requests.filter(r => r.status === 'Pendiente').length : 0;

    const menuItems = [
        { id: 'dashboard', icon: Home, label: 'Inicio' },
        { id: 'clients', icon: Users, label: 'Clientes' },
        { id: 'policies', icon: FileText, label: 'Pólizas' },
        { id: 'requests', icon: FileCheck, label: 'Solicitudes', badge: pendingRequestsCount },
        { id: 'companies', icon: Building2, label: 'Compañías' },
        { id: 'payments', icon: DollarSign, label: 'Cobros' },
        { id: 'commissions', icon: PieChart, label: 'Comisiones' },
        { id: 'claims', icon: Shield, label: 'Siniestros' },
        { id: 'settings', icon: Settings, label: 'Configuración' },
    ];

    const toggleUser = () => {
        if (isDemo) {
            switchUser('santiagom2401');
        } else {
            switchUser('admin');
        }
    };

    return (
        <aside className="sidebar-scroll" style={{
            width: '100%',
            backgroundColor: 'var(--primary)',
            color: 'white',
            padding: isCollapsed ? '2rem 0.5rem' : '2rem 1.25rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.5rem',
            position: 'relative',
            height: '100vh',
            overflowY: 'auto',
            transition: 'padding 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
        }}>
            {/* Small Pin Button */}
            {!isCollapsed && (
                <button
                    onClick={onTogglePin}
                    style={{
                        position: 'absolute',
                        right: '12px',
                        top: '12px',
                        background: 'none',
                        border: 'none',
                        color: 'rgba(255, 255, 255, 0.5)',
                        cursor: 'pointer',
                        padding: '6px',
                        borderRadius: 'var(--radius-sm)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s',
                        zIndex: 10
                    }}
                    onMouseEnter={e => {
                        e.currentTarget.style.color = 'white';
                        e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                    }}
                    onMouseLeave={e => {
                        e.currentTarget.style.color = 'rgba(255, 255, 255, 0.5)';
                        e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                    title={isPinned ? "Desacoplar Barra" : "Acoplar Barra"}
                >
                    <Pin size={12} style={{ transform: isPinned ? 'rotate(45deg)' : 'none', transition: 'transform 0.2s' }} />
                </button>
            )}

            <div style={{ textAlign: 'center', marginBottom: isCollapsed ? '0.5rem' : '1rem' }}>
                <div style={{
                    width: isCollapsed ? '40px' : '64px',
                    height: isCollapsed ? '40px' : '64px',
                    backgroundColor: 'white',
                    borderRadius: '50%',
                    margin: isCollapsed ? '0 auto' : '0 auto 1rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                    border: '2px solid rgba(255, 255, 255, 0.2)',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                }}>
                    <img 
                        src="/logo.png" 
                        alt="Santiago Morales & Asoc" 
                        style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scale(1.15)' }} 
                    />
                </div>
                {!isCollapsed && (
                    <>
                        <h2 style={{ color: 'white', fontSize: '1.15rem', fontWeight: '700', letterSpacing: '0.05em', margin: 0, marginTop: '0.5rem' }}>Santiago Morales &amp; Asoc.</h2>
                        <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '0.2rem', display: 'block' }}>Gestión de Seguros</span>
                    </>
                )}
            </div>

            <nav style={{ flex: 1 }}>
                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {menuItems.map((item) => (
                        <li key={item.id}>
                            <button
                                onClick={() => onNavigate(item.id)}
                                style={{
                                    width: '100%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: isCollapsed ? 'center' : 'flex-start',
                                    gap: isCollapsed ? '0' : '1rem',
                                    padding: isCollapsed ? '0.75rem 0' : '0.85rem 1rem',
                                    backgroundColor: activePage === item.id ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                                    border: 'none',
                                    borderRadius: isCollapsed ? 'var(--radius-sm)' : 'var(--radius-md)',
                                    color: 'white',
                                    cursor: 'pointer',
                                    fontSize: '1.05rem',
                                    transition: 'all 0.2s',
                                    textAlign: isCollapsed ? 'center' : 'left'
                                }}
                                title={isCollapsed ? item.label : undefined}
                            >
                                <item.icon size={isCollapsed ? 24 : 26} style={{ flexShrink: 0 }} />
                                {!isCollapsed && (
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flex: 1 }}>
                                        <span>{item.label}</span>
                                        {Boolean(item.badge && item.badge > 0) && (
                                            <span style={{
                                                fontSize: '0.72rem',
                                                fontWeight: '800',
                                                padding: '0.1rem 0.45rem',
                                                borderRadius: '999px',
                                                backgroundColor: '#f59e0b',
                                                color: '#78350f'
                                            }}>
                                                {item.badge}
                                            </span>
                                        )}
                                    </div>
                                )}
                            </button>
                        </li>
                    ))}
                </ul>
            </nav>

            {/* Bottom User Area with Quick Switcher */}
            {isCollapsed ? (
                <button
                    onClick={toggleUser}
                    style={{ 
                        width: '44px', 
                        height: '44px', 
                        borderRadius: '50%', 
                        backgroundColor: isDemo ? '#d97706' : 'rgba(255, 255, 255, 0.15)',
                        border: isDemo ? '2px solid #fcd34d' : '2px solid rgba(255, 255, 255, 0.3)',
                        color: 'white',
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        margin: 'auto auto 0',
                        cursor: 'pointer',
                        fontWeight: '700',
                        fontSize: '0.85rem',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                    }}
                    title={`Usuario: ${currentUser?.name} (${isDemo ? 'Modo Prueba' : 'Administrador'}). Clic para cambiar.`}
                >
                    {currentUser?.avatar || 'U'}
                </button>
            ) : (
                <div style={{
                    marginTop: 'auto',
                    padding: '1rem',
                    backgroundColor: isDemo ? 'rgba(180, 83, 9, 0.35)' : 'rgba(0,0,0,0.25)',
                    border: isDemo ? '1px solid rgba(253, 230, 138, 0.3)' : '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: 'var(--radius-md)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{
                            width: '38px',
                            height: '38px',
                            borderRadius: '50%',
                            backgroundColor: isDemo ? '#d97706' : 'var(--accent)',
                            border: isDemo ? '2px solid #fef3c7' : 'none',
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: '700',
                            fontSize: '0.9rem',
                            flexShrink: 0
                        }}>
                            {currentUser?.avatar || 'U'}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Usuario activo:
                            </div>
                            <div style={{ fontWeight: '700', fontSize: '0.95rem', color: 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {currentUser?.name}
                            </div>
                            <div style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.25rem',
                                fontSize: '0.7rem',
                                fontWeight: '600',
                                color: isDemo ? '#fef3c7' : '#86efac',
                                marginTop: '0.15rem'
                            }}>
                                {isDemo ? (
                                    <>
                                        <ShieldAlert size={12} />
                                        <span>Modo Sandbox (Sin Guardar)</span>
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle2 size={12} />
                                        <span>Administrador Activo</span>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={toggleUser}
                        style={{
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.5rem',
                            padding: '0.5rem',
                            fontSize: '0.8rem',
                            fontWeight: '600',
                            color: isDemo ? '#451a03' : 'white',
                            backgroundColor: isDemo ? '#fef3c7' : 'rgba(255, 255, 255, 0.12)',
                            border: isDemo ? 'none' : '1px solid rgba(255, 255, 255, 0.2)',
                            borderRadius: 'var(--radius-sm)',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                        onMouseEnter={e => {
                            if (isDemo) e.currentTarget.style.backgroundColor = '#fde68a';
                            else e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
                        }}
                        onMouseLeave={e => {
                            if (isDemo) e.currentTarget.style.backgroundColor = '#fef3c7';
                            else e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.12)';
                        }}
                    >
                        <ArrowLeftRight size={13} />
                        {isDemo ? 'Iniciar como Santiago Alberto Morales' : 'Cambiar a Usuario de Prueba (admin)'}
                    </button>

                    <button
                        onClick={logout}
                        style={{
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.45rem',
                            padding: '0.4rem',
                            marginTop: '0.4rem',
                            fontSize: '0.76rem',
                            fontWeight: '600',
                            color: 'rgba(255, 255, 255, 0.75)',
                            backgroundColor: 'transparent',
                            border: '1px dashed rgba(255, 255, 255, 0.2)',
                            borderRadius: 'var(--radius-sm)',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                        onMouseEnter={e => {
                            e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.2)';
                            e.currentTarget.style.color = '#fca5a5';
                            e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.4)';
                        }}
                        onMouseLeave={e => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                            e.currentTarget.style.color = 'rgba(255, 255, 255, 0.75)';
                            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                        }}
                        title="Cerrar sesión actual y volver a pantalla de login"
                    >
                        <LogOut size={12} />
                        <span>Cerrar Sesión / Salir</span>
                    </button>
                </div>
            )}
        </aside>
    );
};

export default Sidebar;
