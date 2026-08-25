import React, { useState } from 'react';
import { Users, FileText, AlertCircle, PlusCircle, Search, DollarSign, PieChart, AlertTriangle, ShieldAlert, Shield, ArrowRight, FileCheck, RefreshCw } from 'lucide-react';
import { formatDateToDDMMYYYY, isOpenClaim } from '../utils/policyHelpers';
import DashboardAlertsAndReminders from './DashboardAlertsAndReminders';

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

const QuickIconButton = ({ label, icon: Icon, onClick, color = 'var(--primary)', bgHover }) => {
    const [isHovered, setIsHovered] = useState(false);

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
                    width: '52px',
                    height: '52px',
                    borderRadius: '50%',
                    backgroundColor: isHovered ? color : `${color}14`,
                    color: isHovered ? '#ffffff' : color,
                    border: `1.5px solid ${isHovered ? color : `${color}35`}`,
                    cursor: 'pointer',
                    boxShadow: isHovered ? `0 8px 20px -2px ${color}45` : '0 2px 6px rgba(0,0,0,0.04)',
                    transform: isHovered ? 'translateY(-3px) scale(1.08)' : 'translateY(0) scale(1)',
                    transition: 'all 0.22s cubic-bezier(0.4, 0, 0.2, 1)',
                    outline: 'none'
                }}
            >
                <Icon size={24} strokeWidth={2.4} />
            </button>
            {/* Tooltip / Micro-etiqueta sutil */}
            <span style={{
                position: 'absolute',
                top: '58px',
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
    clients = [], 
    claims = [], 
    payments = [], 
    requests = [],
    onNavigateToPolicy, 
    onNavigate, 
    onNavigateToCreatePolicy, 
    onNavigateToPaymentCreation 
}) => {
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
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

            {/* Barra Estética de Acciones Rápidas con Iconos */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '2.25rem',
                flexWrap: 'wrap',
                padding: '0.85rem 2.5rem',
                backgroundColor: '#ffffff',
                borderRadius: 'var(--radius-full)',
                border: '1px solid var(--border)',
                boxShadow: '0 4px 16px -2px rgba(60, 42, 33, 0.06)',
                width: 'fit-content',
                margin: '-0.5rem auto 0 auto'
            }}>
                <QuickIconButton
                    label="Nueva Póliza"
                    icon={PlusCircle}
                    onClick={() => onNavigateToCreatePolicy && onNavigateToCreatePolicy()}
                    color="var(--primary)"
                    bgHover="#fdf8f4"
                />
                <QuickIconButton
                    label="Registrar Pago"
                    icon={DollarSign}
                    onClick={() => onNavigateToPaymentCreation && onNavigateToPaymentCreation()}
                    color="#16a34a"
                    bgHover="#f0fdf4"
                />
                <QuickIconButton
                    label="Registrar Movimiento"
                    icon={RefreshCw}
                    onClick={() => {
                        alert('Por favor, selecciona una póliza de la lista para registrarle un movimiento.');
                        onNavigate('policies');
                    }}
                    color="#2563eb"
                    bgHover="#eff6ff"
                />
                <QuickIconButton
                    label="Gestionar Siniestros"
                    icon={AlertTriangle}
                    onClick={() => onNavigate('claims')}
                    color="#dc2626"
                    bgHover="#fef2f2"
                />
                <QuickIconButton
                    label="Reporte Comisiones"
                    icon={PieChart}
                    onClick={() => onNavigate('commissions')}
                    color="#9333ea"
                    bgHover="#faf5ff"
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
        </div>
    );
};

export default Dashboard;

