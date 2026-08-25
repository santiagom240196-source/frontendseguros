import React, { useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';

const Layout = ({ children, activePage, onNavigate, clients = [], policies = [], requests = [], onNavigateToPolicy }) => {
    const [isPinned, setIsPinned] = useState(() => {
        const saved = localStorage.getItem('sidebar_pinned');
        return saved !== null ? JSON.parse(saved) : true;
    });
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);

    const handleTogglePin = () => {
        const next = !isPinned;
        setIsPinned(next);
        localStorage.setItem('sidebar_pinned', JSON.stringify(next));
        if (next) {
            setIsDrawerOpen(false);
        }
    };

    const isCollapsed = !isPinned && !isDrawerOpen;

    return (
        <div className="layout" style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--background)', position: 'relative' }}>
            {/* Sidebar Space Holder (Always in flex flow, manages width transition) */}
            <div 
                style={{
                    width: isPinned ? '280px' : '80px',
                    transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    position: 'relative',
                    flexShrink: 0,
                    zIndex: 999
                }}
            >
                {/* The actual sliding/shrinking panel drawer */}
                <div style={{
                    width: isPinned || isDrawerOpen ? '280px' : '80px',
                    position: 'fixed',
                    left: 0,
                    top: 0,
                    bottom: 0,
                    transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    boxShadow: !isPinned && isDrawerOpen ? '4px 0 20px rgba(0,0,0,0.15)' : 'none',
                    height: '100vh',
                    backgroundColor: 'var(--primary)',
                    overflow: 'hidden'
                }}>
                    <Sidebar 
                        activePage={activePage} 
                        onNavigate={(page) => {
                            onNavigate(page);
                            if (!isPinned) {
                                setIsDrawerOpen(false);
                            }
                        }} 
                        isPinned={isPinned}
                        onTogglePin={handleTogglePin}
                        isCollapsed={isCollapsed}
                        requests={requests}
                    />
                </div>
            </div>

            {/* Main Content Pane */}
            <div style={{ 
                flex: 1, 
                display: 'flex', 
                flexDirection: 'column',
                minWidth: 0
            }}>
                <Header 
                    onToggleSidebar={() => setIsDrawerOpen(!isDrawerOpen)} 
                    showMenuButton={!isPinned}
                    clients={clients}
                    policies={policies}
                    onNavigate={onNavigate}
                    onNavigateToPolicy={onNavigateToPolicy}
                />
                <main style={{ padding: '2rem', flex: 1 }}>
                    <div className="container">
                        {children}
                    </div>
                </main>
            </div>

            {/* Overlay to dim contents when drawer is floated/opened */}
            {!isPinned && isDrawerOpen && (
                <div 
                    onClick={() => {
                        setIsDrawerOpen(false);
                    }}
                    style={{
                        position: 'fixed',
                        inset: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.2)',
                        backdropFilter: 'blur(2px)',
                        zIndex: 980,
                        cursor: 'pointer'
                    }}
                />
            )}
        </div>
    );
};

export default Layout;
