import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';

const Layout = ({ children, activePage, onNavigate, clients = [], policies = [], requests = [], claims = [], payments = [], onNavigateToPolicy, onNavigateToClient }) => {
    const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' ? window.innerWidth < 768 : false);
    const [isPinned, setIsPinned] = useState(() => {
        const saved = localStorage.getItem('sidebar_pinned');
        return saved !== null ? JSON.parse(saved) : true;
    });
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);

    useEffect(() => {
        const handleResize = () => {
            const mobile = window.innerWidth < 768;
            setIsMobile(mobile);
            if (mobile) {
                setIsDrawerOpen(false);
            }
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const handleTogglePin = () => {
        if (isMobile) {
            setIsDrawerOpen(false);
            return;
        }
        const next = !isPinned;
        setIsPinned(next);
        localStorage.setItem('sidebar_pinned', JSON.stringify(next));
        if (next) {
            setIsDrawerOpen(false);
        }
    };

    const isCollapsed = isMobile ? false : (!isPinned && !isDrawerOpen);
    const showMenuButton = isMobile || !isPinned;

    return (
        <div className="layout" style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--background)', position: 'relative' }}>
            {/* Sidebar Space Holder (desktop only) */}
            {!isMobile && (
                <div 
                    style={{
                        width: isPinned ? '280px' : '80px',
                        transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        position: 'relative',
                        flexShrink: 0,
                        zIndex: 999
                    }}
                />
            )}

            {/* The actual sliding/shrinking panel drawer */}
            <div style={{
                width: isMobile ? '280px' : (isPinned || isDrawerOpen ? '280px' : '80px'),
                position: 'fixed',
                left: 0,
                top: 0,
                bottom: 0,
                transform: isMobile ? (isDrawerOpen ? 'translateX(0)' : 'translateX(-100%)') : 'none',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: (isMobile && isDrawerOpen) || (!isPinned && isDrawerOpen) ? '4px 0 25px rgba(0,0,0,0.25)' : 'none',
                height: '100vh',
                backgroundColor: 'var(--primary)',
                overflow: 'hidden',
                zIndex: 1000
            }}>
                <Sidebar 
                    activePage={activePage} 
                    onNavigate={(page) => {
                        onNavigate(page);
                        if (isMobile || !isPinned) {
                            setIsDrawerOpen(false);
                        }
                    }} 
                    isPinned={isMobile ? false : isPinned}
                    onTogglePin={handleTogglePin}
                    isCollapsed={isCollapsed}
                    requests={requests}
                />
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
                    showMenuButton={showMenuButton}
                    clients={clients}
                    policies={policies}
                    requests={requests}
                    claims={claims}
                    payments={payments}
                    onNavigate={onNavigate}
                    onNavigateToPolicy={onNavigateToPolicy}
                    onNavigateToClient={onNavigateToClient}
                />
                <main style={{ padding: isMobile ? '1rem 0.6rem' : '2rem', flex: 1 }}>
                    <div className="container">
                        {children}
                    </div>
                </main>
            </div>

            {/* Overlay to dim contents when drawer is open on mobile or unpinned on desktop */}
            {((isMobile && isDrawerOpen) || (!isPinned && isDrawerOpen)) && (
                <div 
                    onClick={() => {
                        setIsDrawerOpen(false);
                    }}
                    style={{
                        position: 'fixed',
                        inset: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.45)',
                        backdropFilter: 'blur(3px)',
                        zIndex: 990,
                        cursor: 'pointer'
                    }}
                />
            )}
        </div>
    );
};

export default Layout;

