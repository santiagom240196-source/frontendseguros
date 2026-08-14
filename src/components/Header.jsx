import React from 'react';
import { Bell, Search, Menu } from 'lucide-react';

const Header = ({ onToggleSidebar, showMenuButton }) => {
    return (
        <header style={{
            height: '80px',
            backgroundColor: 'white',
            borderBottom: '1px solid var(--border)',
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
                <h1 style={{ fontSize: '1.75rem', color: 'var(--primary)' }}>Panel Principal</h1>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                <div style={{ position: 'relative' }}>
                    <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={20} />
                    <input
                        type="text"
                        placeholder="Buscar cliente o póliza..."
                        style={{
                            paddingLeft: '40px',
                            width: '300px',
                            height: '48px',
                            fontSize: '1rem'
                        }}
                    />
                </div>

                <button style={{
                    position: 'relative',
                    background: 'none',
                    border: 'none',
                    padding: '8px',
                    color: 'var(--text-muted)'
                }}>
                    <Bell size={28} />
                    <span style={{
                        position: 'absolute',
                        top: '4px',
                        right: '4px',
                        width: '10px',
                        height: '10px',
                        backgroundColor: 'var(--error)',
                        borderRadius: '50%'
                    }}></span>
                </button>
            </div>
        </header>
    );
};

export default Header;
