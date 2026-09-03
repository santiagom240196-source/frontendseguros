import React, { useState, useEffect } from 'react';
import { Users, FileText, AlertCircle, PlusCircle, Search, DollarSign, PieChart, AlertTriangle, ShieldAlert, Shield, ArrowRight, FileCheck, RefreshCw } from 'lucide-react';
import { formatDateToDDMMYYYY, isOpenClaim } from '../utils/policyHelpers';
import DashboardAlertsAndReminders from './DashboardAlertsAndReminders';
import QuickPolicyModal from './QuickPolicyModal';
import QuickPaymentModal from './QuickPaymentModal';
import QuickMovementModal from './QuickMovementModal';
import QuickClaimModal from './QuickClaimModal';
import QuickCommissionModal from './QuickCommissionModal';

const StatCard = ({ title, value, icon: Icon, color, onClick }) => (
    <div
        className="card"
        onClick={onClick}
        style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1.5rem',
            borderLeft: `6px solid ${color}`,
            cursor: onClick ? 'pointer' : 'default',
            transition: 'transform 0.2s'
        }}
        onMouseOver={(e) => onClick && (e.currentTarget.style.transform = 'translateY(-2px)')}
        onMouseOut={(e) => onClick && (e.currentTarget.style.transform = 'translateY(0)')}
    >
        <div style={{
            padding: '1rem',
            borderRadius: '50%',
            backgroundColor: `${color}20`,
            color: color
        }}>
            <Icon size={40} />
        </div>
        <div>
            <p style={{ fontSize: '1.1rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>{title}</p>
            <h3 style={{ fontSize: '2.5rem', margin: 0, color: 'var(--primary)' }}>{value}</h3>
        </div>
    </div>
);

const QuickIconButton = ({ label, shortLabel, icon: Icon, onClick, color = 'var(--primary)', isMobile }) => {
    const [isHovered, setIsHovered] = useState(false);

    if (isMobile) {
        return (
            <button
                type="button"
                onClick={onClick}
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '0.35rem 0.2rem',
                    borderRadius: 'var(--radius-md)',
                    color: color,
                    flex: 1,
                    minWidth: 0,
                    transition: 'transform 0.15s ease',
                    outline: 'none',
                    WebkitTapHighlightColor: 'transparent'
                }}
                onTouchStart={e => e.currentTarget.style.transform = 'scale(0.92)'}
                onTouchEnd={e => e.currentTarget.style.transform = 'scale(1)'}
            >
                <div style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '50%',
                    backgroundColor: `${color}15`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: color,
                    marginBottom: '0.2rem',
                    boxShadow: `0 2px 6px ${color}20`
                }}>
                    <Icon size={19} strokeWidth={2.4} />
                </div>
                <span style={{
                    fontSize: '0.66rem',
                    fontWeight: '700',
                    color: 'var(--text-main)',
                    textAlign: 'center',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    maxWidth: '100%',
                    letterSpacing: '-0.01em'
                }}>
                    {shortLabel || label}
                </span>
            </button>
        );
    }

    return (
        <div style={{ position: 'relative', display: 'inline-flex', flexDirection: 'column', alignItems: 'center' }}>
            <button
                onClick={onClick}
                title={label}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 'clamp(44px, 10vw, 52px)',
                    height: 'clamp(44px, 10vw, 52px)',
                    borderRadius: '50%',
                    backgroundColor: isHovered ? color : `${color}14`,
                    color: isHovered ? '#ffffff' : color,
                    border: `1.5px solid ${isHovered ? color : `${color}35`}`,
                    cursor: 'pointer',
                    boxShadow: isHovered ? `0 8px 20px -2px ${color}45` : '0 2px 6px rgba(0,0,0,0.04)',
                    transform: isHovered ? 'translateY(-3px) scale(1.08)' : 'translateY(0) scale(1)',
                    transition: 'all 0.22s cubic-bezier(0.4, 0, 0.2, 1)',
                    outline: 'none',
                    flexShrink: 0
                }}
            >
                <Icon size={22} strokeWidth={2.4} />
            </button>
            {/* Tooltip / Micro-etiqueta sutil */}
            <span style={{
                position: 'absolute',
                top: '56px',
                backgroundColor: 'var(--text-main)',
                color: '#ffffff',
                fontSize: '0.74rem',
                fontWeight: '700',
                padding: '0.2rem 0.55rem',
                borderRadius: 'var(--radius-sm)',
                whiteSpace: 'nowrap',
                pointerEvents: 'none',
                opacity: isHovered ? 1 : 0,
                transform: isHovered ? 'translateY(0)' : 'translateY(-4px)',
                transition: 'all 0.2s',
                zIndex: 10,
                boxShadow: '0 4px 10px rgba(0,0,0,0.15)'
            }}>
                {label}
            </span>
        </div>
    );
};

const Dashboard = ({ 
    policies = [], 
    setPolicies,
    clients = [], 
    setClients,
    claims = [], 
    setClaims,
    payments = [], 
    setPayments,
    requests = [],
    setRequests,
    companies = [],
    agentCodes = [],
    onNavigateToPolicy, 
    onNavigate, 
    onNavigateToCreatePolicy, 
    onNavigateToPaymentCreation 
}) => {
    // Mobile viewport state for bottom docked action bar
    const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' ? window.innerWidth < 768 : false);

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < 768);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Quick Action Modals States
    const [isPolicyModalOpen, setIsPolicyModalOpen] = useState(false);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [isMovementModalOpen, setIsMovementModalOpen] = useState(false);
    const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);
    const [isCommissionModalOpen, setIsCommissionModalOpen] = useState(false);
    const [selectedMovementPolicyId, setSelectedMovementPolicyId] = useState(null);

    // Dynamic real stats from database
    const totalClientsCount = clients.length.toLocaleString('es-DO');
    const totalPoliciesCount = policies.length.toLocaleString('es-DO');
    const openClaimsList = claims.filter(isOpenClaim);
    const activeClaimsCount = openClaimsList.length.toLocaleString('es-DO');
    const pendingRequestsCount = requests.filter(r => r.status === 'Pendiente' || r.status === 'En Trámite').length.toLocaleString('es-DO');

    // Compute recent activity from policies, payments AND claims
    const recentActivity = [
        ...claims.map(c => ({
            type: 'Siniestro',
            isOpen: isOpenClaim(c),
            claimId: c.id,
            description: `${c.type} (${c.status})`,
            clientName: c.client,
            policyId: c.policy,
            amount: c.amount,
            date: c.reportDate || c.date || '2026-02-15'
        })),
        ...policies.slice(0, 6).map(p => ({
            type: 'Póliza',
            description: `${p.type} - ${p.insurer}`,
            clientName: p.client,
            policyId: p.id,
            date: p.startDate || '2025-01-01'
        })),
        ...payments.slice(0, 4).map(pay => ({
            type: 'Cobro',
            description: `${pay.type} (${pay.amount})`,
            clientName: pay.client,
            policyId: pay.policyId,
            date: pay.date || '2026-02-15'
        }))
    ]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 6);

    return (
        <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '2rem',
            paddingBottom: isMobile ? '85px' : '0px'
        }}>
            <div>
                <h2 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Buenos días, Sr. Morales</h2>
                <p style={{ fontSize: '1.25rem', color: 'var(--text-muted)' }}>Aquí está el resumen de hoy, {new Date().toLocaleDateString('es-DO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
                <StatCard 
                    title="Clientes Registrados" 
                    value={totalClientsCount} 
                    icon={Users} 
                    color="var(--primary)" 
                    onClick={() => onNavigate('clients')} 
                />
                <StatCard 
                    title="Pólizas en Cartera" 
                    value={totalPoliciesCount} 
                    icon={FileText} 
                    color="var(--accent)" 
                    onClick={() => onNavigate('policies')} 
                />
                <StatCard 
                    title="Solicitudes en Trámite" 
                    value={pendingRequestsCount} 
                    icon={FileCheck} 
                    color="#7c3aed" 
                    onClick={() => onNavigate('requests')} 
                />
                <StatCard 
                    title="Siniestros en Curso" 
                    value={activeClaimsCount} 
                    icon={AlertCircle} 
                    color="#dc2626" 
                    onClick={() => onNavigate('claims')} 
                />
            </div>

            {/* Barra Estética de Acciones Rápidas (Desktop: Pill centrada | Mobile: Dock inferior fijo) */}
            <div style={isMobile ? {
                position: 'fixed',
                bottom: '10px',
                left: '50%',
                transform: 'translateX(-50%)',
                width: 'calc(100% - 18px)',
                maxWidth: '480px',
                zIndex: 1050,
                backgroundColor: 'rgba(255, 255, 255, 0.96)',
                backdropFilter: 'blur(16px)',
                borderRadius: '20px',
                boxShadow: '0 10px 30px rgba(60, 42, 33, 0.22), 0 2px 8px rgba(0,0,0,0.08)',
                border: '1.5px solid var(--border)',
                padding: '0.4rem 0.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-around',
                animation: 'fadeIn 0.25s ease'
            } : {
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 'clamp(0.75rem, 3.5vw, 2.25rem)',
                flexWrap: 'wrap',
                padding: 'clamp(0.6rem, 2vw, 0.85rem) clamp(0.85rem, 3vw, 2.5rem)',
                backgroundColor: '#ffffff',
                borderRadius: 'var(--radius-full)',
                border: '1px solid var(--border)',
                boxShadow: '0 4px 16px -2px rgba(60, 42, 33, 0.06)',
                width: 'min(100%, fit-content)',
                maxWidth: '100%',
                margin: '-0.5rem auto 0 auto'
            }}>
                <QuickIconButton
                    label="Nueva Póliza"
                    shortLabel="Póliza"
                    icon={PlusCircle}
                    onClick={() => setIsPolicyModalOpen(true)}
                    color="var(--primary)"
                    isMobile={isMobile}
                />
                <QuickIconButton
                    label="Registrar Pago"
                    shortLabel="Pago"
                    icon={DollarSign}
                    onClick={() => setIsPaymentModalOpen(true)}
                    color="#16a34a"
                    isMobile={isMobile}
                />
                <QuickIconButton
                    label="Cambios en Póliza"
                    shortLabel="Movimiento"
                    icon={RefreshCw}
                    onClick={() => {
                        setSelectedMovementPolicyId(null);
                        setIsMovementModalOpen(true);
                    }}
                    color="#2563eb"
                    isMobile={isMobile}
                />
                <QuickIconButton
                    label="Gestionar Siniestros"
                    shortLabel="Siniestro"
                    icon={AlertTriangle}
                    onClick={() => setIsClaimModalOpen(true)}
                    color="#dc2626"
                    isMobile={isMobile}
                />
                <QuickIconButton
                    label="Reporte Comisiones"
                    shortLabel="Comisión"
                    icon={PieChart}
                    onClick={() => setIsCommissionModalOpen(true)}
                    color="#9333ea"
                    isMobile={isMobile}
                />
            </div>

            {/* Banner de Siniestros Abiertos */}
            {openClaimsList.length > 0 && (
                <div style={{
                    backgroundColor: '#fef2f2',
                    border: '1.5px solid #fca5a5',
                    borderRadius: 'var(--radius-md)',
                    padding: '1.1rem 1.5rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '1rem',
                    boxShadow: '0 2px 8px rgba(220, 38, 38, 0.08)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{
                            width: '38px',
                            height: '38px',
                            borderRadius: '50%',
                            backgroundColor: '#fee2e2',
                            color: '#dc2626',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                        }}>
                            <ShieldAlert size={22} />
                        </div>
                        <div>
                            <strong style={{ color: '#991b1b', fontSize: '1.05rem', display: 'block' }}>
                                Atención: Hay {openClaimsList.length} siniestro(s) abierto(s) que requieren seguimiento
                            </strong>
                            <span style={{ fontSize: '0.88rem', color: '#7f1d1d' }}>
                                {openClaimsList.slice(0, 3).map(c => `${c.id} (${c.client} - ${c.type})`).join(' · ')}
                                {openClaimsList.length > 3 ? ` y ${openClaimsList.length - 3} más...` : ''}
                            </span>
                        </div>
                    </div>
                    <button
                        className="btn"
                        onClick={() => onNavigate('claims')}
                        style={{
                            backgroundColor: '#dc2626',
                            color: 'white',
                            fontWeight: '700',
                            padding: '0.55rem 1.1rem',
                            fontSize: '0.88rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                            boxShadow: '0 2px 4px rgba(220, 38, 38, 0.3)'
                        }}
                    >
                        Gestionar Siniestros <ArrowRight size={16} />
                    </button>
                </div>
            )}

            {/* Sección de Alertas Inteligentes y Gestor de Tareas/Recordatorios */}
            <DashboardAlertsAndReminders
                policies={policies}
                payments={payments}
                clients={clients}
                claims={claims}
                onNavigateToPolicy={onNavigateToPolicy}
                onNavigateToPaymentCreation={onNavigateToPaymentCreation}
                onNavigate={onNavigate}
            />

            {/* Registros y Actividad Reciente */}
            <div className="card" style={{ padding: '1.5rem' }}>
                <h3 style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <FileText size={24} color="var(--primary)" /> Registros y Actividad Reciente
                </h3>
                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: 0, margin: 0 }}>
                    {recentActivity.length > 0 ? (
                        recentActivity.map((item, i) => {
                            const isClaim = item.type === 'Siniestro';
                            const isOpenClaimItem = isClaim && item.isOpen;

                            return (
                                <li key={i}
                                    onClick={() => {
                                        if (isClaim) {
                                            onNavigate('claims');
                                        } else if (onNavigateToPolicy) {
                                            onNavigateToPolicy(item.policyId);
                                        }
                                    }}
                                    style={{
                                        padding: '0.85rem 1.1rem',
                                        backgroundColor: isOpenClaimItem ? '#fff5f5' : 'var(--background)',
                                        border: isOpenClaimItem ? '1px solid #fecaca' : '1px solid var(--border)',
                                        borderRadius: 'var(--radius-md)',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        cursor: 'pointer',
                                        transition: 'all 0.15s'
                                    }}
                                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = isOpenClaimItem ? '#fee2e2' : '#ebdcd4'}
                                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = isOpenClaimItem ? '#fff5f5' : 'var(--background)'}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        {isClaim ? (
                                            <div style={{
                                                padding: '6px',
                                                borderRadius: '50%',
                                                backgroundColor: isOpenClaimItem ? '#fee2e2' : '#e2e8f0',
                                                color: isOpenClaimItem ? '#dc2626' : '#64748b',
                                                display: 'flex'
                                            }}>
                                                <ShieldAlert size={18} />
                                            </div>
                                        ) : null}
                                        <div>
                                            <div style={{ fontSize: '0.98rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <span>{item.type}: {item.description}</span>
                                                {isOpenClaimItem && (
                                                    <span style={{
                                                        padding: '0.15rem 0.5rem',
                                                        borderRadius: '999px',
                                                        backgroundColor: '#dc2626',
                                                        color: 'white',
                                                        fontSize: '0.72rem',
                                                        fontWeight: '800'
                                                    }}>
                                                        ABIERTO
                                                    </span>
                                                )}
                                            </div>
                                            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                                {item.clientName} {item.policyId ? `· Póliza: ${item.policyId}` : ''}
                                            </div>
                                        </div>
                                    </div>
                                    <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', fontWeight: '600' }}>
                                        {formatDateToDDMMYYYY(item.date)}
                                    </span>
                                </li>
                            );
                        })
                    ) : (
                        <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '1.5rem 0' }}>No hay actividad reciente.</p>
                    )}
                </ul>
            </div>

            {/* Modal Intuitivo: Nueva Póliza */}
            <QuickPolicyModal
                isOpen={isPolicyModalOpen}
                onClose={() => setIsPolicyModalOpen(false)}
                policies={policies}
                setPolicies={setPolicies}
                clients={clients}
                setClients={setClients}
                companies={companies}
                agentCodes={agentCodes}
                onNavigateToPolicy={onNavigateToPolicy}
            />

            {/* Modal Intuitivo: Registrar Pago */}
            <QuickPaymentModal
                isOpen={isPaymentModalOpen}
                onClose={() => setIsPaymentModalOpen(false)}
                policies={policies}
                setPolicies={setPolicies}
                payments={payments}
                setPayments={setPayments}
                clients={clients}
                onNavigateToPolicy={onNavigateToPolicy}
            />

            {/* Modal Intuitivo: Cambios y Movimientos en Póliza */}
            <QuickMovementModal
                isOpen={isMovementModalOpen}
                onClose={() => {
                    setIsMovementModalOpen(false);
                    setSelectedMovementPolicyId(null);
                }}
                policies={policies}
                setPolicies={setPolicies}
                requests={requests}
                setRequests={setRequests}
                onNavigateToPolicy={onNavigateToPolicy}
                preselectedPolicyId={selectedMovementPolicyId}
            />

            {/* Modal Intuitivo: Gestión y Reporte de Siniestros */}
            <QuickClaimModal
                isOpen={isClaimModalOpen}
                onClose={() => setIsClaimModalOpen(false)}
                policies={policies}
                claims={claims}
                setClaims={setClaims}
                onNavigate={onNavigate}
            />

            {/* Modal Intuitivo: Resumen de Comisiones */}
            <QuickCommissionModal
                isOpen={isCommissionModalOpen}
                onClose={() => setIsCommissionModalOpen(false)}
                payments={payments}
                policies={policies}
                agentCodes={agentCodes}
                onNavigate={onNavigate}
            />
        </div>
    );
};

export default Dashboard;

