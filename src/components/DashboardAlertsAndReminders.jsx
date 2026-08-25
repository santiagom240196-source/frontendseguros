import React, { useState, useEffect, useMemo } from 'react';
import { 
    AlertTriangle, 
    Clock, 
    Calendar, 
    CheckCircle2, 
    Circle, 
    Plus, 
    Trash2, 
    Edit3, 
    ShieldAlert, 
    DollarSign, 
    FileText, 
    ArrowRight, 
    User, 
    Tag, 
    X, 
    Check, 
    ChevronRight, 
    Filter,
    BellRing,
    Sparkles,
    CalendarClock,
    ListTodo
} from 'lucide-react';
import { 
    formatDateToDDMMYYYY, 
    formatMoney, 
    processPolicyRenewalAndStatus, 
    getPolicyPaymentStats,
    isOpenClaim
} from '../utils/policyHelpers';

// Local storage key for persistent tasks and reminders
const TASKS_STORAGE_KEY = 'app_dashboard_tasks_reminders';

const DEFAULT_SAMPLE_TASKS = [
    {
        id: 'task-1',
        title: 'Llamar a Carlos Mendoza para coordinar cobro de cuota',
        date: new Date().toISOString().split('T')[0],
        time: '10:30',
        priority: 'high', // 'high' | 'medium' | 'normal'
        status: 'pending', // 'pending' | 'in_progress' | 'completed'
        category: 'payment', // 'payment' | 'renewal' | 'claim' | 'request' | 'call' | 'meeting' | 'general'
        clientName: 'Carlos Mendoza',
        policyId: 'POL-001',
        notes: 'Informarle sobre el vencimiento de la cuota trimestral de su póliza de salud.',
        createdAt: new Date().toISOString()
    },
    {
        id: 'task-2',
        title: 'Solicitar cotización de renovación a La Colonial',
        date: new Date(Date.now() + 86400000).toISOString().split('T')[0], // Mañana
        time: '15:00',
        priority: 'medium',
        status: 'in_progress',
        category: 'renewal',
        clientName: 'Constructora del Caribe SRL',
        policyId: 'POL-003',
        notes: 'Verificar descuento por baja siniestralidad acumulada en el año anterior.',
        createdAt: new Date().toISOString()
    },
    {
        id: 'task-3',
        title: 'Enviar reporte de inspección de siniestro de vehículo',
        date: new Date(Date.now() + 172800000).toISOString().split('T')[0], // En 2 días
        time: '09:00',
        priority: 'high',
        status: 'pending',
        category: 'claim',
        clientName: 'María Rodríguez',
        policyId: 'POL-004',
        notes: 'Adjuntar fotos de peritaje y presupuesto del taller mecánico.',
        createdAt: new Date().toISOString()
    }
];

const DashboardAlertsAndReminders = ({
    policies = [],
    payments = [],
    clients = [],
    claims = [],
    onNavigateToPolicy,
    onNavigateToPaymentCreation,
    onNavigate
}) => {
    // ─── Estado de Tareas y Recordatorios ─────────────────────────────────────
    const [tasks, setTasks] = useState(() => {
        try {
            const saved = localStorage.getItem(TASKS_STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed)) return parsed;
            }
        } catch (e) {
            console.error('Error cargando tareas de localStorage:', e);
        }
        return DEFAULT_SAMPLE_TASKS;
    });

    // Guardar tareas en localStorage al modificar
    useEffect(() => {
        try {
            localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(tasks));
        } catch (e) {
            console.error('Error guardando tareas en localStorage:', e);
        }
    }, [tasks]);

    // Filtros de Alertas
    const [alertFilter, setAlertFilter] = useState('all'); // 'all' | 'payments' | 'policies' | 'claims'

    // Filtros de Tareas
    const [taskFilter, setTaskFilter] = useState('active'); // 'active' | 'today' | 'in_progress' | 'completed' | 'all'

    // Modal de Creación / Edición de Tarea
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
    const [editingTaskId, setEditingTaskId] = useState(null);
    const [taskForm, setTaskForm] = useState({
        title: '',
        date: new Date().toISOString().split('T')[0],
        time: '09:00',
        priority: 'medium',
        status: 'pending',
        category: 'general',
        clientName: '',
        policyId: '',
        notes: ''
    });

    const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

    // ─── Generador de Alertas Inteligentes del Sistema ────────────────────────
    const systemAlerts = useMemo(() => {
        const alerts = [];
        const todayDate = new Date(todayStr + 'T00:00:00');

        // 1. ALERTAS DE PAGOS PRÓXIMOS O VENCIDOS
        payments.forEach(p => {
            const isPending = p.status === 'Pending' || p.status === 'Pendiente' || p.status === 'Overdue' || p.status === 'Vencido';
            if (!isPending) return;

            const targetDateStr = p.dueDate || p.date;
            if (!targetDateStr) return;

            const targetDate = new Date(targetDateStr + 'T00:00:00');
            const diffTime = targetDate - todayDate;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            // Si está vencido o vence en los próximos 30 días
            if (diffDays <= 30) {
                const isOverdue = diffDays < 0;
                const isDueToday = diffDays === 0;

                let severity = 'warning';
                let urgencyLabel = '';
                
                if (isOverdue) {
                    severity = 'critical';
                    const absDays = Math.abs(diffDays);
                    urgencyLabel = `Vencido hace ${absDays} día${absDays > 1 ? 's' : ''}`;
                } else if (isDueToday) {
                    severity = 'critical';
                    urgencyLabel = 'Vence HOY';
                } else if (diffDays <= 5) {
                    severity = 'high';
                    urgencyLabel = `Vence en ${diffDays} días`;
                } else {
                    severity = 'medium';
                    urgencyLabel = `Vence en ${diffDays} días`;
                }

                alerts.push({
                    id: `alert-pay-${p.id || p.rawId}`,
                    type: 'payment',
                    severity,
                    title: `Pago Pendiente: ${p.client || 'Cliente'}`,
                    description: `Cuota de ${formatMoney(p.amountNum || p.amount)} · Póliza: ${p.policyId || 'N/A'}`,
                    dateStr: targetDateStr,
                    urgencyLabel,
                    diffDays,
                    clientName: p.client,
                    policyId: p.policyId,
                    amount: p.amount,
                    actionType: 'pay',
                    rawItem: p
                });
            }
        });

        // 2. ALERTAS DE PÓLIZAS POR VENCER O EN RIESGO POR FALTA DE PAGO
        policies.forEach(pol => {
            const statusAnalysis = processPolicyRenewalAndStatus(pol, payments);
            const stats = getPolicyPaymentStats(pol, payments);
            const endDateStr = pol.endDate || pol.vigenciaFin || pol.renewal;

            if (!endDateStr) return;

            const endDate = new Date(endDateStr + 'T00:00:00');
            const diffDays = Math.ceil((endDate - todayDate) / (1000 * 60 * 60 * 24));

            // Caso A: Riesgo de cancelación por falta de pago (vigencia vencida o en límite con deuda pendiente)
            if (stats.totalOwed > 0 && diffDays <= 7) {
                const isExpired = diffDays < 0;
                alerts.push({
                    id: `alert-pol-risk-${pol.id || pol.rawId}`,
                    type: 'policy_risk',
                    severity: 'critical',
                    title: `Riesgo de Cancelación por Falta de Pago: ${pol.id}`,
                    description: `${pol.client} tiene balance pendiente de ${formatMoney(stats.totalOwed)} (${pol.type} - ${pol.insurer})`,
                    dateStr: endDateStr,
                    urgencyLabel: isExpired ? `Vigencia vencida con deuda` : `Vence en ${diffDays} días con saldo deudor`,
                    diffDays,
                    clientName: pol.client,
                    policyId: pol.id,
                    actionType: 'policy',
                    rawItem: pol
                });
            }
            // Caso B: Póliza próxima a vencer (en los próximos 30 días)
            else if (diffDays >= 0 && diffDays <= 30) {
                alerts.push({
                    id: `alert-pol-exp-${pol.id || pol.rawId}`,
                    type: 'policy_expiring',
                    severity: diffDays <= 10 ? 'high' : 'medium',
                    title: `Póliza Próxima a Renovar: ${pol.id}`,
                    description: `${pol.client} · Ramo: ${pol.type} · Aseguradora: ${pol.insurer}`,
                    dateStr: endDateStr,
                    urgencyLabel: diffDays === 0 ? 'Vence HOY' : `Vence en ${diffDays} días (${formatDateToDDMMYYYY(endDateStr)})`,
                    diffDays,
                    clientName: pol.client,
                    policyId: pol.id,
                    actionType: 'policy',
                    rawItem: pol
                });
            }
        });

        // 3. ALERTAS DE SINIESTROS ABIERTOS
        claims.filter(isOpenClaim).forEach(c => {
            const reportDate = c.reportDate || c.date || todayStr;
            const diffDays = Math.ceil((todayDate - new Date(reportDate + 'T00:00:00')) / (1000 * 60 * 60 * 24));

            alerts.push({
                id: `alert-claim-${c.id || c.rawId}`,
                type: 'claim',
                severity: diffDays > 7 ? 'high' : 'medium',
                title: `Siniestro en Seguimiento: ${c.id}`,
                description: `${c.client} · ${c.type} (${c.status || 'Abierto'}) · Póliza: ${c.policy || 'N/A'}`,
                dateStr: reportDate,
                urgencyLabel: `${diffDays} día${diffDays === 1 ? '' : 's'} en trámite`,
                diffDays: -diffDays,
                clientName: c.client,
                policyId: c.policy,
                actionType: 'claim',
                rawItem: c
            });
        });

        // Ordenar por severidad (crítico primero) y luego por días restantes
        const severityWeight = { critical: 4, high: 3, medium: 2, low: 1 };
        return alerts.sort((a, b) => {
            const diffWeight = (severityWeight[b.severity] || 0) - (severityWeight[a.severity] || 0);
            if (diffWeight !== 0) return diffWeight;
            return a.diffDays - b.diffDays;
        });
    }, [policies, payments, claims, todayStr]);

    // Filtrar alertas según pestaña seleccionada
    const filteredAlerts = useMemo(() => {
        if (alertFilter === 'payments') {
            return systemAlerts.filter(a => a.type === 'payment');
        }
        if (alertFilter === 'policies') {
            return systemAlerts.filter(a => a.type === 'policy_risk' || a.type === 'policy_expiring');
        }
        if (alertFilter === 'claims') {
            return systemAlerts.filter(a => a.type === 'claim');
        }
        return systemAlerts;
    }, [systemAlerts, alertFilter]);

    // ─── Filtrado de Tareas ───────────────────────────────────────────────────
    const filteredTasks = useMemo(() => {
        return tasks.filter(t => {
            if (taskFilter === 'active') return t.status !== 'completed';
            if (taskFilter === 'today') return t.date === todayStr && t.status !== 'completed';
            if (taskFilter === 'in_progress') return t.status === 'in_progress';
            if (taskFilter === 'completed') return t.status === 'completed';
            return true; // 'all'
        }).sort((a, b) => {
            // No completadas primero
            if (a.status === 'completed' && b.status !== 'completed') return 1;
            if (a.status !== 'completed' && b.status === 'completed') return -1;
            
            // Prioridad alta primero
            const pWeight = { high: 3, medium: 2, normal: 1 };
            const pDiff = (pWeight[b.priority] || 1) - (pWeight[a.priority] || 1);
            if (pDiff !== 0) return pDiff;

            // Fecha y hora más próximas
            const dateA = `${a.date || '9999-99-99'}T${a.time || '00:00'}`;
            const dateB = `${b.date || '9999-99-99'}T${b.time || '00:00'}`;
            return dateA.localeCompare(dateB);
        });
    }, [tasks, taskFilter, todayStr]);

    // Contadores de Tareas
    const taskStats = useMemo(() => {
        const active = tasks.filter(t => t.status !== 'completed').length;
        const todayCount = tasks.filter(t => t.date === todayStr && t.status !== 'completed').length;
        const completed = tasks.filter(t => t.status === 'completed').length;
        return { active, todayCount, completed, total: tasks.length };
    }, [tasks, todayStr]);

    // ─── Handlers de Tareas ───────────────────────────────────────────────────
    const handleToggleTaskStatus = (taskId) => {
        setTasks(prev => prev.map(t => {
            if (t.id === taskId) {
                const nextStatus = t.status === 'completed' ? 'pending' : 'completed';
                return {
                    ...t,
                    status: nextStatus,
                    completedAt: nextStatus === 'completed' ? new Date().toISOString() : null
                };
            }
            return t;
        }));
    };

    const handleChangeTaskState = (taskId, newStatus) => {
        setTasks(prev => prev.map(t => {
            if (t.id === taskId) {
                return {
                    ...t,
                    status: newStatus,
                    completedAt: newStatus === 'completed' ? new Date().toISOString() : null
                };
            }
            return t;
        }));
    };

    const handleDeleteTask = (taskId) => {
        setTasks(prev => prev.filter(t => t.id !== taskId));
    };

    const handleOpenCreateModal = () => {
        setEditingTaskId(null);
        setTaskForm({
            title: '',
            date: todayStr,
            time: '10:00',
            priority: 'medium',
            status: 'pending',
            category: 'general',
            clientName: '',
            policyId: '',
            notes: ''
        });
        setIsTaskModalOpen(true);
    };

    const handleOpenEditModal = (task) => {
        setEditingTaskId(task.id);
        setTaskForm({
            title: task.title || '',
            date: task.date || todayStr,
            time: task.time || '10:00',
            priority: task.priority || 'medium',
            status: task.status || 'pending',
            category: task.category || 'general',
            clientName: task.clientName || '',
            policyId: task.policyId || '',
            notes: task.notes || ''
        });
        setIsTaskModalOpen(true);
    };

    const handleSaveTask = (e) => {
        e.preventDefault();
        if (!taskForm.title.trim()) return;

        if (editingTaskId) {
            setTasks(prev => prev.map(t => {
                if (t.id === editingTaskId) {
                    return {
                        ...t,
                        ...taskForm,
                        updatedAt: new Date().toISOString()
                    };
                }
                return t;
            }));
        } else {
            const newTask = {
                id: `task-${Date.now()}`,
                ...taskForm,
                createdAt: new Date().toISOString()
            };
            setTasks(prev => [newTask, ...prev]);
        }

        setIsTaskModalOpen(false);
        setEditingTaskId(null);
    };

    // Helper para formatear fecha y hora relativa
    const formatTaskDateTime = (dateStr, timeStr) => {
        if (!dateStr) return { text: '', isToday: false, isPast: false };
        const isToday = dateStr === todayStr;
        const isPast = dateStr < todayStr;
        const formattedDate = isToday ? 'Hoy' : formatDateToDDMMYYYY(dateStr);
        const timeDisplay = timeStr ? ` a las ${timeStr}` : '';
        return { text: `${formattedDate}${timeDisplay}`, isToday, isPast };
    };

    // Helper para obtener estilo de categoría
    const getCategoryBadge = (category) => {
        const map = {
            payment: { label: 'Cobro / Pago', color: '#16a34a', bg: '#dcfce7', icon: DollarSign },
            renewal: { label: 'Renovación', color: '#b58c5c', bg: '#fdf8f4', icon: FileText },
            claim: { label: 'Siniestro', color: '#dc2626', bg: '#fee2e2', icon: ShieldAlert },
            request: { label: 'Trámite', color: '#7c3aed', bg: '#f3e8ff', icon: Tag },
            call: { label: 'Llamada', color: '#0284c7', bg: '#e0f2fe', icon: BellRing },
            meeting: { label: 'Reunión', color: '#d97706', bg: '#fef3c7', icon: Calendar },
            general: { label: 'General', color: '#64748b', bg: '#f1f5f9', icon: CheckCircle2 }
        };
        return map[category] || map.general;
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Encabezado de la Sección */}
            <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                flexWrap: 'wrap', 
                gap: '1rem',
                borderBottom: '2px solid var(--border)',
                paddingBottom: '0.75rem'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: 'var(--radius-md)',
                        backgroundColor: 'var(--primary)',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: 'var(--shadow-sm)'
                    }}>
                        <CalendarClock size={24} />
                    </div>
                    <div>
                        <h3 style={{ fontSize: '1.4rem', margin: 0, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            Alertas y Gestión de Tareas
                            <span style={{ 
                                fontSize: '0.8rem', 
                                fontWeight: '700', 
                                backgroundColor: systemAlerts.length > 0 ? '#fee2e2' : '#e2e8f0', 
                                color: systemAlerts.length > 0 ? '#dc2626' : '#64748b',
                                padding: '0.2rem 0.6rem',
                                borderRadius: '999px'
                            }}>
                                {systemAlerts.length} Alertas Activas
                            </span>
                        </h3>
                        <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                            Vencimientos de pagos, pólizas en riesgo y agenda de tareas con fecha y hora
                        </p>
                    </div>
                </div>

                <button
                    className="btn btn-primary"
                    onClick={handleOpenCreateModal}
                    style={{
                        padding: '0.6rem 1.2rem',
                        fontSize: '0.92rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                    }}
                >
                    <Plus size={18} />
                    Nueva Tarea / Recordatorio
                </button>
            </div>

            {/* Grid Principal de 2 Columnas */}
            <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', 
                gap: '1.5rem',
                alignItems: 'start'
            }}>
                
                {/* ═══════════════════════════════════════════════════════════════ */}
                {/* PANEL IZQUIERDO: ALERTAS INTELIGENTES DEL SISTEMA              */}
                {/* ═══════════════════════════════════════════════════════════════ */}
                <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    
                    {/* Header Panel Alertas */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <ShieldAlert size={20} color="#ea580c" />
                            <h4 style={{ fontSize: '1.15rem', margin: 0, color: 'var(--text-main)' }}>
                                Alertas Operativas del Sistema
                            </h4>
                        </div>
                        <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: '600' }}>
                            {filteredAlerts.length} de {systemAlerts.length}
                        </span>
                    </div>

                    {/* Filtros de Alertas */}
                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                        {[
                            { key: 'all', label: 'Todas' },
                            { key: 'payments', label: 'Pagos Próximos' },
                            { key: 'policies', label: 'Pólizas en Riesgo' },
                            { key: 'claims', label: 'Siniestros' }
                        ].map(f => (
                            <button
                                key={f.key}
                                onClick={() => setAlertFilter(f.key)}
                                style={{
                                    padding: '0.35rem 0.75rem',
                                    fontSize: '0.82rem',
                                    fontWeight: alertFilter === f.key ? '700' : '500',
                                    borderRadius: 'var(--radius-sm)',
                                    border: '1px solid',
                                    borderColor: alertFilter === f.key ? 'var(--primary)' : 'var(--border)',
                                    backgroundColor: alertFilter === f.key ? 'var(--primary)' : 'white',
                                    color: alertFilter === f.key ? 'white' : 'var(--text-muted)',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s'
                                }}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>

                    {/* Lista de Alertas */}
                    <div style={{ 
                        display: 'flex', 
                        flexDirection: 'column', 
                        gap: '0.75rem', 
                        maxHeight: '480px', 
                        overflowY: 'auto',
                        paddingRight: '0.25rem'
                    }}>
                        {filteredAlerts.length > 0 ? (
                            filteredAlerts.map(alert => {
                                const isCritical = alert.severity === 'critical';
                                const isHigh = alert.severity === 'high';

                                const cardBg = isCritical ? '#fff5f5' : isHigh ? '#fffbeb' : '#fafafa';
                                const borderCol = isCritical ? '#fca5a5' : isHigh ? '#fde68a' : '#e2e8f0';
                                const badgeBg = isCritical ? '#dc2626' : isHigh ? '#d97706' : '#64748b';

                                return (
                                    <div
                                        key={alert.id}
                                        style={{
                                            padding: '1rem',
                                            backgroundColor: cardBg,
                                            border: `1.5px solid ${borderCol}`,
                                            borderRadius: 'var(--radius-md)',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '0.6rem',
                                            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                                            transition: 'transform 0.15s, box-shadow 0.15s'
                                        }}
                                        onMouseEnter={e => {
                                            e.currentTarget.style.transform = 'translateY(-2px)';
                                            e.currentTarget.style.boxShadow = '0 4px 10px rgba(0,0,0,0.06)';
                                        }}
                                        onMouseLeave={e => {
                                            e.currentTarget.style.transform = 'translateY(0)';
                                            e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.03)';
                                        }}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                {alert.type === 'payment' && <DollarSign size={18} color="#16a34a" />}
                                                {(alert.type === 'policy_risk' || alert.type === 'policy_expiring') && <FileText size={18} color="#b58c5c" />}
                                                {alert.type === 'claim' && <ShieldAlert size={18} color="#dc2626" />}
                                                <strong style={{ fontSize: '0.95rem', color: isCritical ? '#991b1b' : 'var(--text-main)' }}>
                                                    {alert.title}
                                                </strong>
                                            </div>

                                            <span style={{
                                                padding: '0.2rem 0.55rem',
                                                borderRadius: '999px',
                                                backgroundColor: badgeBg,
                                                color: 'white',
                                                fontSize: '0.75rem',
                                                fontWeight: '800',
                                                whiteSpace: 'nowrap'
                                            }}>
                                                {alert.urgencyLabel}
                                            </span>
                                        </div>

                                        <p style={{ margin: 0, fontSize: '0.86rem', color: 'var(--text-muted)' }}>
                                            {alert.description}
                                        </p>

                                        {/* Botones de Acción Rápida */}
                                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.25rem' }}>
                                            {alert.actionType === 'pay' && (
                                                <button
                                                    onClick={() => onNavigateToPaymentCreation && onNavigateToPaymentCreation()}
                                                    style={{
                                                        backgroundColor: '#16a34a',
                                                        color: 'white',
                                                        border: 'none',
                                                        padding: '0.35rem 0.75rem',
                                                        borderRadius: 'var(--radius-sm)',
                                                        fontSize: '0.8rem',
                                                        fontWeight: '700',
                                                        cursor: 'pointer',
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '0.3rem'
                                                    }}
                                                >
                                                    <DollarSign size={14} /> Registrar Cobro
                                                </button>
                                            )}

                                            {alert.actionType === 'policy' && (
                                                <button
                                                    onClick={() => onNavigateToPolicy ? onNavigateToPolicy(alert.policyId) : onNavigate('policies')}
                                                    style={{
                                                        backgroundColor: 'var(--primary)',
                                                        color: 'white',
                                                        border: 'none',
                                                        padding: '0.35rem 0.75rem',
                                                        borderRadius: 'var(--radius-sm)',
                                                        fontSize: '0.8rem',
                                                        fontWeight: '700',
                                                        cursor: 'pointer',
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '0.3rem'
                                                    }}
                                                >
                                                    Ver Póliza <ArrowRight size={14} />
                                                </button>
                                            )}

                                            {alert.actionType === 'claim' && (
                                                <button
                                                    onClick={() => onNavigate('claims')}
                                                    style={{
                                                        backgroundColor: '#dc2626',
                                                        color: 'white',
                                                        border: 'none',
                                                        padding: '0.35rem 0.75rem',
                                                        borderRadius: 'var(--radius-sm)',
                                                        fontSize: '0.8rem',
                                                        fontWeight: '700',
                                                        cursor: 'pointer',
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '0.3rem'
                                                    }}
                                                >
                                                    Ver Siniestro <ArrowRight size={14} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--text-muted)' }}>
                                <CheckCircle2 size={36} color="#16a34a" style={{ margin: '0 auto 0.5rem' }} />
                                <p style={{ fontWeight: '600', margin: 0 }}>¡Todo al día!</p>
                                <span style={{ fontSize: '0.85rem' }}>No hay alertas pendientes en esta categoría.</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* ═══════════════════════════════════════════════════════════════ */}
                {/* PANEL DERECHO: GESTOR DE TAREAS Y RECORDATORIOS                */}
                {/* ═══════════════════════════════════════════════════════════════ */}
                <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    
                    {/* Header Panel Tareas */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <ListTodo size={20} color="var(--primary)" />
                            <h4 style={{ fontSize: '1.15rem', margin: 0, color: 'var(--text-main)' }}>
                                Agenda de Tareas & Recordatorios
                            </h4>
                        </div>
                        <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: '600' }}>
                            {taskStats.active} pendientes ({taskStats.todayCount} para hoy)
                        </span>
                    </div>

                    {/* Filtros de Tareas */}
                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                        {[
                            { key: 'active', label: `Pendientes (${taskStats.active})` },
                            { key: 'today', label: `Para Hoy (${taskStats.todayCount})` },
                            { key: 'in_progress', label: 'En Progreso' },
                            { key: 'completed', label: `Completadas (${taskStats.completed})` },
                            { key: 'all', label: `Todas (${taskStats.total})` }
                        ].map(f => (
                            <button
                                key={f.key}
                                onClick={() => setTaskFilter(f.key)}
                                style={{
                                    padding: '0.35rem 0.75rem',
                                    fontSize: '0.82rem',
                                    fontWeight: taskFilter === f.key ? '700' : '500',
                                    borderRadius: 'var(--radius-sm)',
                                    border: '1px solid',
                                    borderColor: taskFilter === f.key ? 'var(--primary)' : 'var(--border)',
                                    backgroundColor: taskFilter === f.key ? 'var(--primary)' : 'white',
                                    color: taskFilter === f.key ? 'white' : 'var(--text-muted)',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s'
                                }}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>

                    {/* Lista de Tareas y Recordatorios */}
                    <div style={{ 
                        display: 'flex', 
                        flexDirection: 'column', 
                        gap: '0.75rem', 
                        maxHeight: '480px', 
                        overflowY: 'auto',
                        paddingRight: '0.25rem'
                    }}>
                        {filteredTasks.length > 0 ? (
                            filteredTasks.map(task => {
                                const isCompleted = task.status === 'completed';
                                const isInProgress = task.status === 'in_progress';
                                const isHigh = task.priority === 'high';
                                const { text: timeFormatted, isToday, isPast } = formatTaskDateTime(task.date, task.time);
                                const isOverdue = isPast && !isCompleted;
                                const categoryBadge = getCategoryBadge(task.category);
                                const CategoryIcon = categoryBadge.icon;

                                return (
                                    <div
                                        key={task.id}
                                        style={{
                                            padding: '0.9rem 1rem',
                                            backgroundColor: isCompleted ? '#f8fafc' : isOverdue ? '#fff5f5' : '#ffffff',
                                            border: `1px solid ${isCompleted ? '#e2e8f0' : isOverdue ? '#fca5a5' : 'var(--border)'}`,
                                            borderRadius: 'var(--radius-md)',
                                            display: 'flex',
                                            alignItems: 'flex-start',
                                            gap: '0.75rem',
                                            boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                                            opacity: isCompleted ? 0.75 : 1,
                                            transition: 'all 0.15s'
                                        }}
                                    >
                                        {/* Checkbox interactivo */}
                                        <button
                                            onClick={() => handleToggleTaskStatus(task.id)}
                                            style={{
                                                background: 'none',
                                                border: 'none',
                                                padding: '2px',
                                                cursor: 'pointer',
                                                color: isCompleted ? '#16a34a' : isOverdue ? '#dc2626' : 'var(--text-muted)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                flexShrink: 0,
                                                marginTop: '2px'
                                            }}
                                            title={isCompleted ? 'Marcar como pendiente' : 'Marcar como completada'}
                                        >
                                            {isCompleted ? <CheckCircle2 size={22} color="#16a34a" /> : <Circle size={22} />}
                                        </button>

                                        {/* Contenido Principal de la Tarea */}
                                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                                                <span style={{
                                                    fontSize: '0.95rem',
                                                    fontWeight: '600',
                                                    color: isCompleted ? 'var(--text-muted)' : 'var(--text-main)',
                                                    textDecoration: isCompleted ? 'line-through' : 'none',
                                                    lineHeight: 1.3
                                                }}>
                                                    {task.title}
                                                </span>

                                                {/* Badge de Prioridad */}
                                                <span style={{
                                                    padding: '0.15rem 0.5rem',
                                                    borderRadius: '999px',
                                                    fontSize: '0.72rem',
                                                    fontWeight: '800',
                                                    backgroundColor: isHigh ? '#fee2e2' : task.priority === 'medium' ? '#fef3c7' : '#e0f2fe',
                                                    color: isHigh ? '#dc2626' : task.priority === 'medium' ? '#d97706' : '#0369a1',
                                                    whiteSpace: 'nowrap'
                                                }}>
                                                    {isHigh ? 'URGENTE' : task.priority === 'medium' ? 'MEDIA' : 'NORMAL'}
                                                </span>
                                            </div>

                                            {/* Detalles / Notas si existen */}
                                            {task.notes && (
                                                <p style={{ 
                                                    margin: 0, 
                                                    fontSize: '0.84rem', 
                                                    color: 'var(--text-muted)',
                                                    textDecoration: isCompleted ? 'line-through' : 'none'
                                                }}>
                                                    {task.notes}
                                                </p>
                                            )}

                                            {/* Meta información: Fecha, Hora, Categoría y Vinculación */}
                                            <div style={{ 
                                                display: 'flex', 
                                                alignItems: 'center', 
                                                gap: '0.6rem', 
                                                flexWrap: 'wrap',
                                                fontSize: '0.78rem',
                                                marginTop: '0.2rem'
                                            }}>
                                                {/* Fecha y Hora */}
                                                <span style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '0.25rem',
                                                    fontWeight: '700',
                                                    color: isOverdue ? '#dc2626' : isToday ? '#d97706' : 'var(--text-muted)'
                                                }}>
                                                    <Clock size={13} />
                                                    {isOverdue && <span style={{ color: '#dc2626' }}>¡Atrasada!</span>}
                                                    {timeFormatted}
                                                </span>

                                                {/* Categoría */}
                                                <span style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '0.25rem',
                                                    padding: '0.1rem 0.45rem',
                                                    borderRadius: 'var(--radius-sm)',
                                                    backgroundColor: categoryBadge.bg,
                                                    color: categoryBadge.color,
                                                    fontWeight: '600'
                                                }}>
                                                    <CategoryIcon size={12} />
                                                    {categoryBadge.label}
                                                </span>

                                                {/* Cliente / Póliza Vinculada */}
                                                {(task.clientName || task.policyId) && (
                                                    <span style={{
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '0.25rem',
                                                        color: 'var(--primary)',
                                                        fontWeight: '600'
                                                    }}>
                                                        <User size={12} />
                                                        {task.clientName} {task.policyId ? `(${task.policyId})` : ''}
                                                    </span>
                                                )}

                                                {/* Estado (Por Hacer / En Progreso) */}
                                                {!isCompleted && (
                                                    <select
                                                        value={task.status}
                                                        onChange={(e) => handleChangeTaskState(task.id, e.target.value)}
                                                        style={{
                                                            padding: '0.1rem 0.4rem',
                                                            fontSize: '0.74rem',
                                                            fontWeight: '600',
                                                            borderRadius: 'var(--radius-sm)',
                                                            border: '1px solid var(--border)',
                                                            backgroundColor: isInProgress ? '#eff6ff' : '#f8fafc',
                                                            color: isInProgress ? '#1d4ed8' : 'var(--text-muted)',
                                                            cursor: 'pointer',
                                                            width: 'auto'
                                                        }}
                                                    >
                                                        <option value="pending">Por Hacer</option>
                                                        <option value="in_progress">En Progreso</option>
                                                        <option value="completed">Completada</option>
                                                    </select>
                                                )}
                                            </div>
                                        </div>

                                        {/* Acciones de Edición / Borrado */}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', flexShrink: 0 }}>
                                            <button
                                                onClick={() => handleOpenEditModal(task)}
                                                style={{
                                                    background: 'none',
                                                    border: 'none',
                                                    padding: '4px',
                                                    cursor: 'pointer',
                                                    color: 'var(--text-muted)',
                                                    borderRadius: 'var(--radius-sm)'
                                                }}
                                                title="Editar tarea"
                                            >
                                                <Edit3 size={15} />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteTask(task.id)}
                                                style={{
                                                    background: 'none',
                                                    border: 'none',
                                                    padding: '4px',
                                                    cursor: 'pointer',
                                                    color: '#ef4444',
                                                    borderRadius: 'var(--radius-sm)'
                                                }}
                                                title="Eliminar tarea"
                                            >
                                                <Trash2 size={15} />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--text-muted)' }}>
                                <CheckCircle2 size={36} color="#16a34a" style={{ margin: '0 auto 0.5rem' }} />
                                <p style={{ fontWeight: '600', margin: 0 }}>Sin tareas en esta vista</p>
                                <span style={{ fontSize: '0.85rem' }}>Haz clic en "+ Nueva Tarea" para programar recordatorios.</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════════════ */}
            {/* MODAL PARA CREAR / EDITAR TAREA O RECORDATORIO                     */}
            {/* ═══════════════════════════════════════════════════════════════════ */}
            {isTaskModalOpen && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000,
                    padding: '1rem',
                    backdropFilter: 'blur(3px)'
                }}>
                    <div style={{
                        backgroundColor: 'white',
                        borderRadius: 'var(--radius-lg)',
                        width: '100%',
                        maxWidth: '560px',
                        maxHeight: '90vh',
                        overflowY: 'auto',
                        boxShadow: 'var(--shadow-xl)',
                        display: 'flex',
                        flexDirection: 'column'
                    }}>
                        {/* Modal Header */}
                        <div style={{
                            padding: '1.25rem 1.5rem',
                            borderBottom: '1px solid var(--border)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <CalendarClock size={22} color="var(--primary)" />
                                <h3 style={{ margin: 0, fontSize: '1.3rem', color: 'var(--primary)' }}>
                                    {editingTaskId ? 'Editar Tarea / Recordatorio' : 'Nueva Tarea / Recordatorio'}
                                </h3>
                            </div>
                            <button
                                onClick={() => setIsTaskModalOpen(false)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                            >
                                <X size={22} />
                            </button>
                        </div>

                        {/* Modal Body Form */}
                        <form onSubmit={handleSaveTask} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                            {/* Título */}
                            <div>
                                <label style={{ display: 'block', fontWeight: '700', marginBottom: '0.4rem', fontSize: '0.95rem' }}>
                                    Título de la Tarea / Compromiso *
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Ej: Llamar a cliente para renovar póliza de auto"
                                    value={taskForm.title}
                                    onChange={e => setTaskForm(prev => ({ ...prev, title: e.target.value }))}
                                    style={{ width: '100%' }}
                                />
                            </div>

                            {/* Fecha y Hora en 2 Columnas */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', fontWeight: '700', marginBottom: '0.4rem', fontSize: '0.95rem' }}>
                                        Fecha Programada *
                                    </label>
                                    <input
                                        type="date"
                                        required
                                        value={taskForm.date}
                                        onChange={e => setTaskForm(prev => ({ ...prev, date: e.target.value }))}
                                        style={{ width: '100%' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontWeight: '700', marginBottom: '0.4rem', fontSize: '0.95rem' }}>
                                        Hora *
                                    </label>
                                    <input
                                        type="time"
                                        required
                                        value={taskForm.time}
                                        onChange={e => setTaskForm(prev => ({ ...prev, time: e.target.value }))}
                                        style={{ width: '100%' }}
                                    />
                                </div>
                            </div>

                            {/* Prioridad y Categoría en 2 Columnas */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', fontWeight: '700', marginBottom: '0.4rem', fontSize: '0.95rem' }}>
                                        Nivel de Prioridad
                                    </label>
                                    <select
                                        value={taskForm.priority}
                                        onChange={e => setTaskForm(prev => ({ ...prev, priority: e.target.value }))}
                                        style={{ width: '100%' }}
                                    >
                                        <option value="high">🔴 Alta / Urgente</option>
                                        <option value="medium">🟡 Media</option>
                                        <option value="normal">🟢 Normal</option>
                                    </select>
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontWeight: '700', marginBottom: '0.4rem', fontSize: '0.95rem' }}>
                                        Categoría / Tipo
                                    </label>
                                    <select
                                        value={taskForm.category}
                                        onChange={e => setTaskForm(prev => ({ ...prev, category: e.target.value }))}
                                        style={{ width: '100%' }}
                                    >
                                        <option value="general">General</option>
                                        <option value="payment">Cobro / Pago</option>
                                        <option value="renewal">Renovación</option>
                                        <option value="claim">Siniestro</option>
                                        <option value="request">Solicitud / Trámite</option>
                                        <option value="call">Llamada a Cliente</option>
                                        <option value="meeting">Cita / Reunión</option>
                                    </select>
                                </div>
                            </div>

                            {/* Vinculación con Cliente / Póliza */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', fontWeight: '700', marginBottom: '0.4rem', fontSize: '0.95rem' }}>
                                        Cliente Asociado (Opcional)
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Nombre del cliente"
                                        value={taskForm.clientName}
                                        onChange={e => setTaskForm(prev => ({ ...prev, clientName: e.target.value }))}
                                        style={{ width: '100%' }}
                                    />
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontWeight: '700', marginBottom: '0.4rem', fontSize: '0.95rem' }}>
                                        No. Póliza (Opcional)
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Ej: POL-001"
                                        value={taskForm.policyId}
                                        onChange={e => setTaskForm(prev => ({ ...prev, policyId: e.target.value }))}
                                        style={{ width: '100%' }}
                                    />
                                </div>
                            </div>

                            {/* Notas / Descripción */}
                            <div>
                                <label style={{ display: 'block', fontWeight: '700', marginBottom: '0.4rem', fontSize: '0.95rem' }}>
                                    Notas y Detalles Adicionales
                                </label>
                                <textarea
                                    rows="3"
                                    placeholder="Agrega cualquier observación, teléfono de contacto o instrucción..."
                                    value={taskForm.notes}
                                    onChange={e => setTaskForm(prev => ({ ...prev, notes: e.target.value }))}
                                    style={{ width: '100%' }}
                                />
                            </div>

                            {/* Modal Footer Buttons */}
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                                <button
                                    type="button"
                                    onClick={() => setIsTaskModalOpen(false)}
                                    style={{
                                        padding: '0.6rem 1.2rem',
                                        backgroundColor: '#f1f5f9',
                                        color: 'var(--text-main)',
                                        border: '1px solid var(--border)',
                                        borderRadius: 'var(--radius-md)',
                                        fontWeight: '600',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    style={{
                                        padding: '0.6rem 1.4rem',
                                        fontSize: '0.95rem'
                                    }}
                                >
                                    <Check size={18} />
                                    {editingTaskId ? 'Guardar Cambios' : 'Crear Tarea'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DashboardAlertsAndReminders;
