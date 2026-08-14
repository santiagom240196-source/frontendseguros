import { Users, FileText, AlertCircle, PlusCircle, Search, DollarSign, PieChart, AlertTriangle } from 'lucide-react';
import { formatDateToDDMMYYYY } from '../utils/policyHelpers';

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

const ActionButton = ({ label, icon: Icon, onClick, color = 'var(--primary)' }) => (
    <button className="card" style={{
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '1rem',
        cursor: 'pointer',
        textAlign: 'center',
        minHeight: '140px',
        border: 'none',
        background: 'white',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        transition: 'transform 0.2s, box-shadow 0.2s'
    }}
        onClick={onClick}
        onMouseOver={(e) => {
            e.currentTarget.style.transform = 'translateY(-4px)';
            e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1)';
        }}
        onMouseOut={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
        }}
    >
        <div style={{
            padding: '1rem',
            borderRadius: '50%',
            backgroundColor: `${color}15`,
            color: color
        }}>
            <Icon size={32} />
        </div>
        <span style={{ fontSize: '1.1rem', fontWeight: '600', color: 'var(--text-main)' }}>{label}</span>
    </button>
);

const Dashboard = ({ policies = [], onNavigateToPolicy, onNavigate, onNavigateToCreatePolicy, onNavigateToPaymentCreation }) => {
    // Compute recent activity from policies
    const recentActivity = policies
        .flatMap(policy =>
            (policy.movements || []).map(movement => ({
                ...movement,
                clientName: policy.client,
                policyId: policy.id
            }))
        )
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 5);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div>
                <h2 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Buenos días, Sr. Morales</h2>
                <p style={{ fontSize: '1.25rem', color: 'var(--text-muted)' }}>Aquí está el resumen de hoy, {new Date().toLocaleDateString('es-DO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
                <StatCard title="Clientes Activos" value="1,245" icon={Users} color="var(--primary)" onClick={() => onNavigate('clients')} />
                <StatCard title="Pólizas Vigentes" value="3,890" icon={FileText} color="var(--accent)" onClick={() => onNavigate('policies')} />
                <StatCard title="Siniestros en Curso" value="12" icon={AlertCircle} color="var(--error)" onClick={() => onNavigate('claims')} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '2rem', marginTop: '1rem' }}>
                <div className="card">
                    <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <FileText size={28} /> Actividad Reciente
                    </h3>
                    <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {recentActivity.length > 0 ? (
                            recentActivity.map((item, i) => (
                                <li key={i}
                                    onClick={() => onNavigateToPolicy && onNavigateToPolicy(item.policyId)}
                                    style={{
                                        padding: '1rem',
                                        backgroundColor: 'var(--background)',
                                        borderRadius: 'var(--radius-sm)',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        cursor: 'pointer',
                                        transition: 'background-color 0.2s'
                                    }}
                                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#e2e8f0'}
                                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'var(--background)'}
                                >
                                    <div>
                                        <div style={{ fontSize: '1.1rem', fontWeight: '500' }}>{item.type}: {item.description}</div>
                                        <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>{item.clientName} - {item.policyId}</div>
                                    </div>
                                    <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>{formatDateToDDMMYYYY(item.date)}</span>
                                </li>
                            ))
                        ) : (
                            <p style={{ color: 'var(--text-muted)', textAlign: 'center' }}>No hay actividad reciente.</p>
                        )}
                    </ul>
                </div>

                <div>
                    <h3 style={{ marginBottom: '1.5rem' }}>Acciones Rápidas</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                        <ActionButton label="Nueva Póliza" icon={PlusCircle} onClick={() => onNavigateToCreatePolicy && onNavigateToCreatePolicy()} color="var(--primary)" />
                        <ActionButton label="Registrar Pago" icon={DollarSign} onClick={() => onNavigateToPaymentCreation && onNavigateToPaymentCreation()} color="#16a34a" />
                        <ActionButton label="Empezar Siniestro" icon={AlertTriangle} onClick={() => onNavigate('claims')} color="#dc2626" />
                        <ActionButton label="Reporte Comisiones" icon={PieChart} onClick={() => onNavigate('commissions')} color="#9333ea" />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
