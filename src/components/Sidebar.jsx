import React from 'react';
import { Home, Users, FileText, Settings, Shield, DollarSign, PieChart, Building2, Pin, User } from 'lucide-react';

const Sidebar = ({ activePage, onNavigate, isPinned, onTogglePin, isCollapsed }) => {
    const menuItems = [
        { id: 'dashboard', icon: Home, label: 'Inicio' },
        { id: 'clients', icon: Users, label: 'Clientes' },
        { id: 'policies', icon: FileText, label: 'Pólizas' },
        { id: 'companies', icon: Building2, label: 'Compañías' },
        { id: 'payments', icon: DollarSign, label: 'Cobros' },
        { id: 'commissions', icon: PieChart, label: 'Comisiones' },
        { id: 'claims', icon: Shield, label: 'Siniestros' },
        { id: 'settings', icon: Settings, label: 'Ajustes' },
    ];

    return (
        <aside className="sidebar-scroll" style={{
            width: '100%',
            backgroundColor: 'var(--primary)',
            color: 'white',
            padding: isCollapsed ? '2rem 0.5rem' : '2rem 1.25rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '2rem',
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

            <div style={{ textAlign: 'center', marginBottom: isCollapsed ? '0.5rem' : '1.25rem' }}>
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

            <nav>
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
                                    padding: isCollapsed ? '0.75rem 0' : '1rem',
                                    backgroundColor: activePage === item.id ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                                    border: 'none',
                                    borderRadius: isCollapsed ? 'var(--radius-sm)' : 'var(--radius-md)',
                                    color: 'white',
                                    cursor: 'pointer',
                                    fontSize: '1.1rem',
                                    transition: 'all 0.2s',
                                    textAlign: isCollapsed ? 'center' : 'left'
                                }}
                                title={isCollapsed ? item.label : undefined}
                            >
                                <item.icon size={isCollapsed ? 24 : 28} style={{ flexShrink: 0 }} />
                                {!isCollapsed && <span>{item.label}</span>}
                            </button>
                        </li>
                    ))}
                </ul>
            </nav>

            {isCollapsed ? (
                <div style={{ 
                    width: '40px', 
                    height: '40px', 
                    borderRadius: '50%', 
                    backgroundColor: 'rgba(255, 255, 255, 0.1)', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    margin: 'auto auto 0',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                }} title="Santiago Morales">
                    <User size={20} />
                </div>
            ) : (
                <div style={{ marginTop: 'auto', padding: '1rem', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius-md)' }}>
                    <p style={{ fontSize: '0.875rem', opacity: 0.8 }}>Usuario conectado:</p>
                    <p style={{ fontWeight: 'bold' }}>Santiago Morales</p>
                </div>
            )}
        </aside>
    );
};

export default Sidebar;
