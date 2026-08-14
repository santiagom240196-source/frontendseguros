import React, { useState, useMemo, useEffect } from 'react';
import { Search, DollarSign, Plus, Download, CheckCircle, Clock, AlertTriangle, XCircle, Calendar } from 'lucide-react';
import { getPolicyPaymentStats, formatDateToDDMMYYYY, formatMoney } from '../utils/policyHelpers';
import InsurerLogo from './InsurerLogo';

const PaymentManagement = ({ policies = [], payments = [], setPayments, shouldOpenPaymentModal, onDetailedActionHandled }) => {
    const today = new Date().toISOString().split('T')[0];

    // Default date range: first day of current month → today
    const firstOfMonth = new Date();
    firstOfMonth.setDate(1);
    const defaultFrom = firstOfMonth.toISOString().split('T')[0];

    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [activeFilter, setActiveFilter] = useState('All'); // 'All', 'Paid', 'Pending', 'Overdue'
    const [dateFrom, setDateFrom] = useState(defaultFrom);
    const [dateTo, setDateTo] = useState(today);

    const [newPayment, setNewPayment] = useState({
        client: '', policy: '', date: today,
        amount: '', policyAmount: '', type: 'Cuota Mensual',
        customType: '', status: 'Paid', selectedPolicyId: ''
    });
    const [policySearch, setPolicySearch] = useState('');
    const [showPolicyResults, setShowPolicyResults] = useState(false);

    useEffect(() => {
        if (shouldOpenPaymentModal) {
            setShowModal(true);
            if (onDetailedActionHandled) onDetailedActionHandled();
        }
    }, [shouldOpenPaymentModal, onDetailedActionHandled]);

    const handleSelectPolicy = (policy) => {
        if (!policy) {
            setNewPayment(prev => ({ ...prev, selectedPolicyId: '', client: '', policy: '', amount: '', policyAmount: '' }));
            setPolicySearch('');
            return;
        }
        const stats = getPolicyPaymentStats(policy, payments);
        const formattedOwed = `RD$ ${stats.totalOwed.toLocaleString('es-DO', { minimumFractionDigits: 0 })}`;
        setNewPayment(prev => ({
            ...prev, selectedPolicyId: policy.id, client: policy.client,
            policy: `${policy.type} - ${policy.insurer} (${policy.id})`,
            policyAmount: formattedOwed, amount: ''
        }));
        setPolicySearch(`${policy.client} - ${policy.id} (${policy.type})`);
        setShowPolicyResults(false);
    };

    const filteredPolicies = policies.filter(p =>
        (p.client?.toLowerCase() || '').includes(policySearch.toLowerCase()) ||
        (p.id?.toLowerCase() || '').includes(policySearch.toLowerCase()) ||
        (p.type?.toLowerCase() || '').includes(policySearch.toLowerCase())
    );

    const handleAddPayment = (e) => {
        e.preventDefault();
        const paymentId = `PAY-00${payments.length + 1}`;
        const paymentToAdd = {
            id: paymentId, client: newPayment.client, policy: newPayment.policy,
            policyId: newPayment.selectedPolicyId,
            date: newPayment.date, amount: newPayment.amount, amountNum: parseFloat(newPayment.amount.replace(/[^0-9.]/g, '')) || 0,
            status: newPayment.status,
            type: newPayment.type === 'Otro' ? (newPayment.customType || 'Otro') : newPayment.type
        };
        if (setPayments) {
            setPayments([paymentToAdd, ...payments]);
        }
        setShowModal(false);
        setNewPayment({ client: '', policy: '', date: today, amount: '', policyAmount: '', type: 'Cuota Mensual', customType: '', status: 'Paid', selectedPolicyId: '' });
        setPolicySearch('');
        alert(`Pago ${paymentId} registrado correctamente.`);
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'Paid': return { bg: '#dcfce7', text: '#166534', label: 'Pagado', icon: CheckCircle };
            case 'Pending': return { bg: '#fef9c3', text: '#854d0e', label: 'Pendiente', icon: Clock };
            case 'Overdue': return { bg: '#fee2e2', text: '#991b1b', label: 'Vencido', icon: AlertTriangle };
            default: return { bg: '#f1f5f9', text: '#64748b', label: 'Desconocido', icon: AlertTriangle };
        }
    };

    // Payments filtered only by date range (for summary cards)
    const dateFilteredPayments = useMemo(() => {
        return payments.filter(p => {
            if (!dateFrom && !dateTo) return true;
            const pDate = p.date;
            if (dateFrom && pDate < dateFrom) return false;
            if (dateTo && pDate > dateTo) return false;
            return true;
        });
    }, [payments, dateFrom, dateTo]);

    // Summary stats from date-filtered payments
    const stats = useMemo(() => {
        const paid = dateFilteredPayments.filter(p => p.status === 'Paid');
        const pending = dateFilteredPayments.filter(p => p.status === 'Pending');
        const overdue = dateFilteredPayments.filter(p => p.status === 'Overdue');
        const sum = (arr) => arr.reduce((acc, p) => acc + (p.amountNum || 0), 0);
        const fmt = (n) => formatMoney(n);
        return {
            paidTotal: fmt(sum(paid)),
            pendingTotal: fmt(sum(pending)),
            overdueTotal: fmt(sum(overdue)),
            paidCount: paid.length,
            pendingCount: pending.length,
            overdueCount: overdue.length,
        };
    }, [dateFilteredPayments]);

    // Payments filtered by date + search + status card
    const filteredPayments = useMemo(() => {
        return dateFilteredPayments.filter(p => {
            const term = searchTerm.toLowerCase();
            const matchesSearch =
                (p.client?.toLowerCase() || '').includes(term) ||
                (p.id?.toLowerCase() || '').includes(term) ||
                (p.policy?.toLowerCase() || '').includes(term);
            if (activeFilter === 'All') return matchesSearch;
            return matchesSearch && p.status === activeFilter;
        });
    }, [dateFilteredPayments, searchTerm, activeFilter]);

    const toggleFilter = (status) => setActiveFilter(prev => prev === status ? 'All' : status);

    const formatDateLabel = () => {
        if (!dateFrom && !dateTo) return 'Todos los períodos';
        const fmtDate = (d) => {
            if (!d) return '...';
            const [y, m, day] = d.split('-');
            return `${day}/${m}/${y}`;
        };
        return `${fmtDate(dateFrom)} — ${fmtDate(dateTo)}`;
    };

    return (
        <div>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h2 style={{ fontSize: '2rem', color: 'var(--primary)' }}>Gestión de Cobros</h2>
                    <p style={{ color: 'var(--text-muted)' }}>Registro y seguimiento de pagos de pólizas.</p>
                </div>
                <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                    <Plus size={20} /> Registrar Pago
                </button>
            </div>

            {/* Date Range Selector */}
            <div className="card" style={{ padding: '1rem 1.5rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <Calendar size={20} color="var(--primary)" style={{ flexShrink: 0 }} />
                <span style={{ fontWeight: '600', color: 'var(--text-main)', whiteSpace: 'nowrap' }}>Período:</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <input
                        type="date"
                        value={dateFrom}
                        onChange={e => setDateFrom(e.target.value)}
                        style={{ padding: '0.4rem 0.75rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: '0.9rem' }}
                    />
                    <span style={{ color: 'var(--text-muted)' }}>hasta</span>
                    <input
                        type="date"
                        value={dateTo}
                        onChange={e => setDateTo(e.target.value)}
                        style={{ padding: '0.4rem 0.75rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: '0.9rem' }}
                    />
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginLeft: 'auto' }}>
                    {[
                        { label: 'Este Mes', fn: () => { const d = new Date(); d.setDate(1); setDateFrom(d.toISOString().split('T')[0]); setDateTo(today); } },
                        { label: 'Mes Anterior', fn: () => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - 1); const from = d.toISOString().split('T')[0]; d.setMonth(d.getMonth() + 1); d.setDate(0); setDateFrom(from); setDateTo(d.toISOString().split('T')[0]); } },
                        { label: 'Este Año', fn: () => { const y = new Date().getFullYear(); setDateFrom(`${y}-01-01`); setDateTo(today); } },
                        { label: 'Todo', fn: () => { setDateFrom(''); setDateTo(''); } },
                    ].map(({ label, fn }) => (
                        <button key={label} className="btn" onClick={fn}
                            style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem', backgroundColor: '#f1f5f9', border: '1px solid var(--border)' }}>
                            {label}
                        </button>
                    ))}
                </div>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                    📅 {formatDateLabel()} · <strong>{dateFilteredPayments.length}</strong> registro(s)
                </span>
            </div>

            {/* Summary Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                <div className="card" onClick={() => toggleFilter('Paid')} style={{
                    padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.5rem', cursor: 'pointer',
                    border: activeFilter === 'Paid' ? '2px solid #166534' : '2px solid transparent',
                    backgroundColor: activeFilter === 'Paid' ? '#f0fdf4' : 'white', transition: 'all 0.2s'
                }}>
                    <div style={{ padding: '1rem', borderRadius: '50%', backgroundColor: '#dcfce7', color: '#166534' }}>
                        <DollarSign size={24} />
                    </div>
                    <div>
                        <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.85rem' }}>Cobrado · {stats.paidCount} pago(s)</p>
                        <h3 style={{ fontSize: '1.4rem', color: 'var(--primary)', margin: 0 }}>{stats.paidTotal}</h3>
                    </div>
                </div>
                <div className="card" onClick={() => toggleFilter('Pending')} style={{
                    padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.5rem', cursor: 'pointer',
                    border: activeFilter === 'Pending' ? '2px solid #854d0e' : '2px solid transparent',
                    backgroundColor: activeFilter === 'Pending' ? '#fefce8' : 'white', transition: 'all 0.2s'
                }}>
                    <div style={{ padding: '1rem', borderRadius: '50%', backgroundColor: '#fef9c3', color: '#854d0e' }}>
                        <Clock size={24} />
                    </div>
                    <div>
                        <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.85rem' }}>Pendiente · {stats.pendingCount} pago(s)</p>
                        <h3 style={{ fontSize: '1.4rem', color: 'var(--primary)', margin: 0 }}>{stats.pendingTotal}</h3>
                    </div>
                </div>
                <div className="card" onClick={() => toggleFilter('Overdue')} style={{
                    padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.5rem', cursor: 'pointer',
                    border: activeFilter === 'Overdue' ? '2px solid #991b1b' : '2px solid transparent',
                    backgroundColor: activeFilter === 'Overdue' ? '#fef2f2' : 'white', transition: 'all 0.2s'
                }}>
                    <div style={{ padding: '1rem', borderRadius: '50%', backgroundColor: '#fee2e2', color: '#991b1b' }}>
                        <AlertTriangle size={24} />
                    </div>
                    <div>
                        <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.85rem' }}>Vencido · {stats.overdueCount} pago(s)</p>
                        <h3 style={{ fontSize: '1.4rem', color: 'var(--primary)', margin: 0 }}>{stats.overdueTotal}</h3>
                    </div>
                </div>
            </div>

            {/* Payments Table */}
            <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
                <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ position: 'relative', flex: 1, minWidth: '200px', maxWidth: '400px' }}>
                        <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={20} />
                        <input
                            type="text"
                            placeholder="Buscar pago, cliente o póliza..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ paddingLeft: '40px' }}
                        />
                    </div>
                    {activeFilter !== 'All' && (
                        <div style={{ padding: '0.35rem 0.75rem', backgroundColor: '#f1f5f9', borderRadius: '999px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            Filtro: {activeFilter === 'Paid' ? 'Cobrado' : activeFilter === 'Pending' ? 'Pendiente' : 'Vencido'}
                            <button onClick={() => setActiveFilter('All')} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0, display: 'flex', color: 'var(--text-muted)' }}>
                                <XCircle size={14} />
                            </button>
                        </div>
                    )}
                </div>

                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid var(--border)' }}>
                                <th style={{ padding: '1rem', textAlign: 'left', color: 'var(--text-muted)' }}>ID Pago</th>
                                <th style={{ padding: '1rem', textAlign: 'left', color: 'var(--text-muted)' }}>Cliente / Póliza</th>
                                <th style={{ padding: '1rem', textAlign: 'left', color: 'var(--text-muted)' }}>Concepto</th>
                                <th style={{ padding: '1rem', textAlign: 'left', color: 'var(--text-muted)' }}>Fecha</th>
                                <th style={{ padding: '1rem', textAlign: 'left', color: 'var(--text-muted)' }}>Estado</th>
                                <th style={{ padding: '1rem', textAlign: 'right', color: 'var(--text-muted)' }}>Monto</th>
                                <th style={{ padding: '1rem', textAlign: 'right', color: 'var(--text-muted)' }}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredPayments.length === 0 ? (
                                <tr>
                                    <td colSpan="7" style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                                        No se encontraron pagos para el período y filtro seleccionados.
                                    </td>
                                </tr>
                            ) : filteredPayments.map((payment) => {
                                const statusInfo = getStatusColor(payment.status);
                                const StatusIcon = statusInfo.icon;
                                return (
                                    <tr key={payment.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                        <td style={{ padding: '1rem', fontWeight: 'bold' }}>{payment.id}</td>
                                        <td style={{ padding: '1rem' }}>
                                            <div style={{ fontWeight: '600' }}>{payment.client}</div>
                                            {(() => {
                                                const relPolicy = policies.find(p => p.id === payment.policyId || payment.policy?.includes(p.id));
                                                const insName = relPolicy ? relPolicy.insurer : '';
                                                return (
                                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.15rem' }}>
                                                        {insName && <InsurerLogo name={insName} size={16} />}
                                                        <span>{payment.policy}</span>
                                                    </div>
                                                );
                                            })()}
                                        </td>
                                        <td style={{ padding: '1rem' }}>{payment.type}</td>
                                        <td style={{ padding: '1rem' }}>{formatDateToDDMMYYYY(payment.date)}</td>
                                        <td style={{ padding: '1rem' }}>
                                            <span style={{
                                                display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                                                padding: '0.25rem 0.75rem', borderRadius: '999px',
                                                fontSize: '0.85rem', fontWeight: '600',
                                                backgroundColor: statusInfo.bg, color: statusInfo.text
                                            }}>
                                                <StatusIcon size={14} />
                                                {statusInfo.label}
                                            </span>
                                        </td>
                                        <td style={{ padding: '1rem', textAlign: 'right', fontWeight: '700' }}>{formatMoney(payment.amount)}</td>
                                        <td style={{ padding: '1rem', textAlign: 'right' }}>
                                            <button className="btn" style={{ padding: '0.5rem', color: 'var(--text-muted)' }}>
                                                <Download size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Register Payment Modal */}
            {showModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
                }}>
                    <div className="card" style={{ width: '100%', maxWidth: '500px', backgroundColor: 'white', maxHeight: '90vh', overflowY: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h3 style={{ margin: 0 }}>Registrar Nuevo Pago</h3>
                            <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', padding: '0.5rem', cursor: 'pointer' }}>
                                <XCircle size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleAddPayment}>
                            {/* Policy Search Autocomplete */}
                            <div style={{ marginBottom: '1.5rem', position: 'relative' }}>
                                <label style={{ fontWeight: '600', marginBottom: '0.5rem', display: 'block' }}>Buscar Póliza (Autocompletar)</label>
                                <div style={{ position: 'relative' }}>
                                    <input
                                        type="text"
                                        placeholder="Escribe nombre del cliente o # de póliza..."
                                        value={policySearch}
                                        onChange={(e) => {
                                            setPolicySearch(e.target.value);
                                            setShowPolicyResults(true);
                                            if (newPayment.selectedPolicyId) {
                                                setNewPayment(prev => ({ ...prev, selectedPolicyId: '', client: '', policy: '', amount: '' }));
                                            }
                                        }}
                                        onFocus={() => setShowPolicyResults(true)}
                                        style={{ width: '100%', padding: '0.75rem', paddingLeft: '2.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}
                                    />
                                    <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                    {newPayment.selectedPolicyId && (
                                        <button type="button" onClick={() => handleSelectPolicy(null)}
                                            style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                                            <XCircle size={16} />
                                        </button>
                                    )}
                                </div>
                                {showPolicyResults && policySearch.length > 0 && (
                                    <div style={{
                                        position: 'absolute', top: '100%', left: 0, right: 0,
                                        backgroundColor: 'white', border: '1px solid var(--border)',
                                        borderRadius: '0 0 var(--radius-sm) var(--radius-sm)',
                                        maxHeight: '200px', overflowY: 'auto', zIndex: 100,
                                        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
                                    }}>
                                        {filteredPolicies.length > 0 ? filteredPolicies.map(p => (
                                            <div key={p.id} onClick={() => handleSelectPolicy(p)}
                                                style={{ padding: '0.75rem', borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }}
                                                onMouseOver={e => e.currentTarget.style.backgroundColor = '#f8fafc'}
                                                onMouseOut={e => e.currentTarget.style.backgroundColor = 'white'}>
                                                <div style={{ fontWeight: '600', fontSize: '0.9rem' }}>{p.client} ({p.id})</div>
                                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.2rem' }}>
                                                    <span>{p.type} -</span>
                                                    <InsurerLogo name={p.insurer} size={16} showName={true} textStyle={{ fontSize: '0.8rem', color: 'var(--text-muted)' }} />
                                                    <span>· {formatMoney(p.amount, p.currency)}</span>
                                                </div>
                                            </div>
                                        )) : (
                                            <div style={{ padding: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', fontSize: '0.9rem' }}>
                                                No se encontraron resultados
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div style={{ marginBottom: '1rem' }}>
                                <label>Cliente</label>
                                <input required type="text" placeholder="Nombre del Cliente"
                                    value={newPayment.client}
                                    onChange={e => setNewPayment({ ...newPayment, client: e.target.value })}
                                    readOnly={!!newPayment.selectedPolicyId}
                                    style={{ backgroundColor: newPayment.selectedPolicyId ? '#f1f5f9' : 'white' }} />
                            </div>
                            <div style={{ marginBottom: '1rem' }}>
                                <label>Póliza / Referencia</label>
                                <input required type="text" placeholder="Ej. Auto - Full"
                                    value={newPayment.policy}
                                    onChange={e => setNewPayment({ ...newPayment, policy: e.target.value })}
                                    readOnly={!!newPayment.selectedPolicyId}
                                    style={{ backgroundColor: newPayment.selectedPolicyId ? '#f1f5f9' : 'white' }} />
                            </div>
                            <div style={{ marginBottom: '1rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <label>Fecha</label>
                                    <input required type="date" value={newPayment.date}
                                        onChange={e => setNewPayment({ ...newPayment, date: e.target.value })} />
                                </div>
                                <div>
                                    <label>Concepto</label>
                                    <select style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}
                                        value={newPayment.type}
                                        onChange={e => setNewPayment({ ...newPayment, type: e.target.value })}>
                                        <option value="Cuota Mensual">Cuota Mensual</option>
                                        <option value="Renovación">Renovación</option>
                                        <option value="Anual">Anual</option>
                                        <option value="Semestral">Semestral</option>
                                        <option value="Inicial">Inicial</option>
                                        <option value="Otro">Otro</option>
                                    </select>
                                    {newPayment.type === 'Otro' && (
                                        <input type="text" placeholder="Especificar concepto"
                                            value={newPayment.customType || ''}
                                            onChange={e => setNewPayment({ ...newPayment, customType: e.target.value })}
                                            style={{ marginTop: '0.5rem', width: '100%' }} />
                                    )}
                                </div>
                            </div>

                            <div style={{ marginBottom: '1rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <label style={{ color: 'var(--text-muted)' }}>Monto Pendiente</label>
                                    <input type="text" readOnly disabled
                                        value={newPayment.policyAmount || 'N/A'}
                                        style={{ backgroundColor: '#f1f5f9', color: '#64748b' }} />
                                </div>
                                <div>
                                    <label style={{ fontWeight: 'bold' }}>Monto a Pagar</label>
                                    <input required type="text" placeholder="RD$ 0.00"
                                        value={newPayment.amount}
                                        onChange={e => setNewPayment({ ...newPayment, amount: e.target.value })}
                                        style={{ borderColor: 'var(--primary)', borderWidth: '2px' }} />
                                </div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem' }}>
                                <button type="button" className="btn" onClick={() => setShowModal(false)} style={{ backgroundColor: '#f1f5f9' }}>
                                    Cancelar
                                </button>
                                <button type="submit" className="btn btn-primary">
                                    Registrar Pago
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PaymentManagement;
