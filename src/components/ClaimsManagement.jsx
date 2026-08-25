import React, { useState, useMemo, useEffect } from 'react';
import {
    Search, Plus, Calendar, AlertTriangle, Clock, CheckCircle,
    XCircle, FileText, Paperclip, X, ChevronRight, Shield,
    Phone, Hash, User, Building2, ArrowUpDown, ArrowUp, ArrowDown
} from 'lucide-react';
import { formatDateToDDMMYYYY, formatMoney } from '../utils/policyHelpers';
import InsurerLogo from './InsurerLogo';

// ─── Status Config ────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
    Abierto: { bg: '#fee2e2', text: '#991b1b', border: '#fca5a5', label: 'Abierto', icon: AlertTriangle },
    EnProceso: { bg: '#fef9c3', text: '#854d0e', border: '#fde047', label: 'En Proceso', icon: Clock },
    Cerrado: { bg: '#dcfce7', text: '#166534', border: '#86efac', label: 'Cerrado', icon: CheckCircle },
    Rechazado: { bg: '#f1f5f9', text: '#64748b', border: '#cbd5e1', label: 'Rechazado', icon: XCircle },
};

const TYPE_OPTIONS = [
    'Auto – Colisión', 'Auto – Robo', 'Auto – Responsabilidad Civil',
    'Salud – Hospitalización', 'Salud – Emergencia', 'Salud – Cirugía',
    'Propiedad – Incendio', 'Propiedad – Robo', 'Propiedad – Inundación',
    'Vida', 'Incendio Comercial', 'Responsabilidad Civil', 'Otro'
];

import { useUser } from '../context/UserContext';
import { insertSiniestroHasura, updateSiniestroHasura } from '../services/hasuraService';

// ─── Component ────────────────────────────────────────────────────────────────

const ClaimsManagement = ({ policies = [], claims = [], setClaims }) => {
    const { isDemo } = useUser();
    const today = new Date().toISOString().split('T')[0];
    const firstOfMonth = new Date(); firstOfMonth.setDate(1);
    const defaultFrom = firstOfMonth.toISOString().split('T')[0];

    const [searchTerm, setSearchTerm] = useState('');
    const [activeFilter, setActiveFilter] = useState('All');
    const [dateFrom, setDateFrom] = useState(defaultFrom);
    const [dateTo, setDateTo] = useState(today);
    const [showModal, setShowModal] = useState(false);
    const [selectedClaim, setSelectedClaim] = useState(null); // detail view

    const [newClaim, setNewClaim] = useState({
        client: '', policy: '', policyDesc: '', type: TYPE_OPTIONS[0],
        date: today, description: '', amount: '', adjuster: '', phone: '',
        notes: '', status: 'Abierto', attachments: [], selectedPolicyId: ''
    });
    const [policySearch, setPolicySearch] = useState('');
    const [showPolicyResults, setShowPolicyResults] = useState(false);

    // Quick period presets
    const setQuickRange = (type) => {
        const d = new Date();
        if (type === 'month') { const f = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0]; setDateFrom(f); setDateTo(today); }
        else if (type === 'prev') { const f = new Date(d.getFullYear(), d.getMonth() - 1, 1).toISOString().split('T')[0]; const t = new Date(d.getFullYear(), d.getMonth(), 0).toISOString().split('T')[0]; setDateFrom(f); setDateTo(t); }
        else if (type === 'year') { setDateFrom(`${d.getFullYear()}-01-01`); setDateTo(today); }
        else if (type === 'all') { setDateFrom(''); setDateTo(''); }
    };

    const formatDateLabel = () => {
        if (!dateFrom && !dateTo) return 'Todos los períodos';
        const fmt = (d) => { if (!d) return '…'; const [y, m, day] = d.split('-'); return `${day}/${m}/${y}`; };
        return `${fmt(dateFrom)} — ${fmt(dateTo)}`;
    };

    // Policy autocomplete
    const filteredPolicies = policies.filter(p =>
        (p.client?.toLowerCase() || '').includes(policySearch.toLowerCase()) ||
        (p.id?.toLowerCase() || '').includes(policySearch.toLowerCase()) ||
        (p.type?.toLowerCase() || '').includes(policySearch.toLowerCase())
    );
    const handleSelectPolicy = (p) => {
        if (!p) { setNewClaim(prev => ({ ...prev, selectedPolicyId: '', client: '', policy: '', policyDesc: '' })); setPolicySearch(''); return; }
        setNewClaim(prev => ({ ...prev, selectedPolicyId: p.id, client: p.client, policy: p.id, policyDesc: `${p.type} · ${p.insurer}` }));
        setPolicySearch(`${p.client} — ${p.id} (${p.type})`);
        setShowPolicyResults(false);
    };

    // Handle file selection (mock — just store names)
    const handleFiles = (e) => {
        const names = Array.from(e.target.files).map(f => f.name);
        setNewClaim(prev => ({ ...prev, attachments: [...prev.attachments, ...names] }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const id = `SIN-${String(claims.length + 1).padStart(4, '0')}`;
        const cleanAmount = parseFloat(newClaim.amount.replace(/[^0-9.]/g, '')) || 0;
        const formattedAmount = formatMoney(cleanAmount);
        
        const matchedPolicy = policies.find(p => p.id === newClaim.selectedPolicyId);

        const claimToAdd = {
            id,
            ...newClaim,
            polizaId: matchedPolicy ? (matchedPolicy.rawId || matchedPolicy.id) : null,
            clienteId: matchedPolicy ? matchedPolicy.clienteId : null,
            amount: formattedAmount,
            reportDate: today,
            amountNum: cleanAmount,
            amountApproved: 'RD$ 0',
            amountApprovedNum: 0,
        };

        setClaims([claimToAdd, ...claims]);

        if (!isDemo) {
            try {
                await insertSiniestroHasura(claimToAdd, isDemo);
            } catch (err) {
                console.warn('Failed to insert claim in Hasura:', err);
            }
        }

        setShowModal(false);
        setNewClaim({ client: '', policy: '', policyDesc: '', type: TYPE_OPTIONS[0], date: today, description: '', amount: '', adjuster: '', phone: '', notes: '', status: 'Abierto', attachments: [], selectedPolicyId: '' });
        setPolicySearch('');
        alert(`Siniestro ${id} registrado correctamente.`);
    };

    // Stats (date-filtered)
    const dateFiltClaims = useMemo(() => claims.filter(c => {
        if (dateFrom && c.date < dateFrom) return false;
        if (dateTo && c.date > dateTo) return false;
        return true;
    }), [claims, dateFrom, dateTo]);

    const stats = useMemo(() => {
        const byStatus = (s) => dateFiltClaims.filter(c => c.status === s);
        const sumAmt = (arr) => arr.reduce((a, c) => a + c.amountNum, 0);
        const fmt = (n) => formatMoney(n);
        return {
            total: dateFiltClaims.length,
            totalAmt: fmt(sumAmt(dateFiltClaims)),
            abierto: byStatus('Abierto').length,
            enProceso: byStatus('EnProceso').length,
            cerrado: byStatus('Cerrado').length,
            rechazado: byStatus('Rechazado').length,
        };
    }, [dateFiltClaims]);

    // Final filtered list
    const filteredClaims = useMemo(() => dateFiltClaims.filter(c => {
        const term = searchTerm.toLowerCase();
        const matchSearch = [c.id, c.client, c.policy, c.type, c.policyDesc]
            .some(v => (v || '').toLowerCase().includes(term));
        if (activeFilter === 'All') return matchSearch;
        return matchSearch && c.status === activeFilter;
    }), [dateFiltClaims, searchTerm, activeFilter]);

    // Sorting state
    const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });

    const handleSort = (key) => {
        setSortConfig(prev => {
            if (prev.key === key) {
                return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
            }
            return { key, direction: 'asc' };
        });
    };

    const renderSortIcon = (columnKey) => {
        if (sortConfig.key !== columnKey) {
            return <ArrowUpDown size={13} style={{ opacity: 0.35, marginLeft: '5px', verticalAlign: 'middle' }} />;
        }
        return sortConfig.direction === 'asc'
            ? <ArrowUp size={14} style={{ color: '#2563eb', marginLeft: '5px', verticalAlign: 'middle', fontWeight: 'bold' }} />
            : <ArrowDown size={14} style={{ color: '#2563eb', marginLeft: '5px', verticalAlign: 'middle', fontWeight: 'bold' }} />;
    };

    const sortedClaims = useMemo(() => {
        if (!sortConfig.key) return filteredClaims;
        return [...filteredClaims].sort((a, b) => {
            let valA = a[sortConfig.key];
            let valB = b[sortConfig.key];

            if (sortConfig.key === 'amount' || sortConfig.key === 'amountNum') {
                valA = a.amountNum !== undefined ? a.amountNum : parseFloat(String(a.amount || '0').replace(/[^0-9.-]+/g, '')) || 0;
                valB = b.amountNum !== undefined ? b.amountNum : parseFloat(String(b.amount || '0').replace(/[^0-9.-]+/g, '')) || 0;
            } else if (sortConfig.key === 'date' || sortConfig.key === 'reportDate') {
                valA = new Date(valA || '1970-01-01').getTime();
                valB = new Date(valB || '1970-01-01').getTime();
            }

            if (typeof valA === 'number' && typeof valB === 'number') {
                return sortConfig.direction === 'asc' ? valA - valB : valB - valA;
            }

            const strA = String(valA || '').toLowerCase();
            const strB = String(valB || '').toLowerCase();
            return sortConfig.direction === 'asc' ? strA.localeCompare(strB, 'es') : strB.localeCompare(strA, 'es');
        });
    }, [filteredClaims, sortConfig]);

    const toggleFilter = (s) => setActiveFilter(prev => prev === s ? 'All' : s);

    const StatusBadge = ({ status }) => {
        const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.Abierto;
        const Icon = cfg.icon;
        return (
            <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                padding: '0.25rem 0.75rem', borderRadius: '999px',
                fontSize: '0.8rem', fontWeight: '600', whiteSpace: 'nowrap',
                backgroundColor: cfg.bg, color: cfg.text, border: `1px solid ${cfg.border}`
            }}>
                <Icon size={12} /> {cfg.label}
            </span>
        );
    };

    // ── Detail Modal ──────────────────────────────────────────────────────────
    if (selectedClaim) {
        const cfg = STATUS_CONFIG[selectedClaim.status] || STATUS_CONFIG.Abierto;
        return (
            <div>
                {/* Back button */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
                    <button className="btn" style={{ padding: '0.5rem' }} onClick={() => setSelectedClaim(null)}>
                        <ChevronRight size={22} style={{ transform: 'rotate(180deg)' }} />
                    </button>
                    <div>
                        <h2 style={{ fontSize: '2rem', color: 'var(--primary)', margin: 0 }}>{selectedClaim.id}</h2>
                        <p style={{ color: 'var(--text-muted)', margin: 0 }}>{selectedClaim.client} · {selectedClaim.policyDesc}</p>
                    </div>
                    <div style={{ marginLeft: 'auto' }}>
                        <StatusBadge status={selectedClaim.status} />
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))', gap: '1.5rem' }}>
                    {/* Main Info */}
                    <div className="card" style={{ gridColumn: '1 / -1' }}>
                        <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Shield size={18} color="var(--primary)" /> Información del Siniestro
                        </h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: '1rem' }}>
                            {[
                                { label: 'Tipo de Siniestro', value: selectedClaim.type },
                                { label: 'Fecha del Evento', value: formatDateToDDMMYYYY(selectedClaim.date) },
                                { label: 'Fecha Reportado', value: formatDateToDDMMYYYY(selectedClaim.reportDate) },
                                { label: 'Monto Reclamado', value: formatMoney(selectedClaim.amount), bold: true },
                                { label: 'Póliza', value: selectedClaim.policy },
                            ].map(({ label, value, bold }) => (
                                <div key={label}>
                                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>{label}</p>
                                    <p style={{ fontWeight: bold ? '700' : '600', color: bold ? 'var(--primary)' : 'var(--text-main)', margin: '0.2rem 0 0', fontSize: bold ? '1.1rem' : 'inherit' }}>{value || '—'}</p>
                                </div>
                            ))}
                        </div>
                        <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#f8fafc', borderRadius: 'var(--radius-sm)' }}>
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0 0 0.4rem' }}>Descripción</p>
                            <p style={{ margin: 0, lineHeight: 1.6 }}>{selectedClaim.description || 'Sin descripción'}</p>
                        </div>
                    </div>

                    {/* Adjuster */}
                    <div className="card">
                        <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <User size={18} color="var(--primary)" /> Ajustador Asignado
                        </h3>
                        {selectedClaim.adjuster ? (
                            <>
                                <p style={{ fontWeight: '600', fontSize: '1.1rem' }}>{selectedClaim.adjuster}</p>
                                {selectedClaim.phone && (
                                    <a href={`tel:${selectedClaim.phone}`} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)', textDecoration: 'none', marginTop: '0.5rem' }}>
                                        <Phone size={16} /> {selectedClaim.phone}
                                    </a>
                                )}
                            </>
                        ) : (
                            <p style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Sin ajustador asignado aún.</p>
                        )}
                    </div>

                    {/* Attachments */}
                    <div className="card">
                        <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Paperclip size={18} color="var(--primary)" /> Documentos Adjuntos ({selectedClaim.attachments.length})
                        </h3>
                        {selectedClaim.attachments.length > 0 ? (
                            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {selectedClaim.attachments.map((att, i) => (
                                    <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0.75rem', backgroundColor: '#f8fafc', borderRadius: 'var(--radius-sm)', fontSize: '0.9rem' }}>
                                        <FileText size={16} color="var(--primary)" />
                                        <span style={{ flex: 1 }}>{att}</span>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Sin documentos adjuntos.</p>
                        )}
                    </div>

                    {/* Notes */}
                    {selectedClaim.notes && (
                        <div className="card" style={{ gridColumn: '1 / -1' }}>
                            <h3 style={{ marginBottom: '0.5rem' }}>📝 Notas Internas</h3>
                            <p style={{ margin: 0, lineHeight: 1.6, color: 'var(--text-muted)', fontStyle: 'italic' }}>{selectedClaim.notes}</p>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // ── Main List View ────────────────────────────────────────────────────────
    return (
        <div>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h2 style={{ fontSize: '2rem', color: 'var(--primary)' }}>Gestión de Siniestros</h2>
                    <p style={{ color: 'var(--text-muted)' }}>Registro y seguimiento de reclamaciones por póliza.</p>
                </div>
                <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                    <Plus size={20} /> Registrar Siniestro
                </button>
            </div>

            {/* Date Range */}
            <div className="card" style={{ padding: '1rem 1.5rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <Calendar size={20} color="var(--primary)" style={{ flexShrink: 0 }} />
                <span style={{ fontWeight: '600', whiteSpace: 'nowrap' }}>Período:</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                        style={{ padding: '0.4rem 0.75rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: '0.9rem' }} />
                    <span style={{ color: 'var(--text-muted)' }}>hasta</span>
                    <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                        style={{ padding: '0.4rem 0.75rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: '0.9rem' }} />
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', marginLeft: 'auto', flexWrap: 'wrap' }}>
                    {[{ l: 'Este Mes', t: 'month' }, { l: 'Mes Anterior', t: 'prev' }, { l: 'Este Año', t: 'year' }, { l: 'Todo', t: 'all' }].map(({ l, t }) => (
                        <button key={t} className="btn" onClick={() => setQuickRange(t)}
                            style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem', backgroundColor: '#f1f5f9', border: '1px solid var(--border)' }}>{l}</button>
                    ))}
                </div>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                    📅 {formatDateLabel()} · <strong>{dateFiltClaims.length}</strong> siniestro(s)
                </span>
            </div>

            {/* Summary Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
                {[
                    { label: `Total Reclamado`, value: stats.totalAmt, icon: Shield, color: '#1e40af', bg: '#eff6ff', filter: null },
                    { label: `Abiertos · ${stats.abierto}`, value: null, icon: AlertTriangle, color: '#991b1b', bg: '#fee2e2', filter: 'Abierto' },
                    { label: `En Proceso · ${stats.enProceso}`, value: null, icon: Clock, color: '#854d0e', bg: '#fef9c3', filter: 'EnProceso' },
                    { label: `Cerrados · ${stats.cerrado}`, value: null, icon: CheckCircle, color: '#166534', bg: '#dcfce7', filter: 'Cerrado' },
                    { label: `Rechazados · ${stats.rechazado}`, value: null, icon: XCircle, color: '#64748b', bg: '#f1f5f9', filter: 'Rechazado' },
                ].map(({ label, value, icon: Icon, color, bg, filter }) => (
                    <div key={label} className="card" onClick={() => filter && toggleFilter(filter)}
                        style={{
                            padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem',
                            cursor: filter ? 'pointer' : 'default',
                            border: activeFilter === filter ? `2px solid ${color}` : '2px solid transparent',
                            backgroundColor: activeFilter === filter ? bg : 'white',
                            transition: 'all 0.2s'
                        }}>
                        <div style={{ padding: '0.75rem', borderRadius: '50%', backgroundColor: bg, color, flexShrink: 0 }}>
                            <Icon size={20} />
                        </div>
                        <div>
                            <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.82rem' }}>{label}</p>
                            {value && <h3 style={{ fontSize: '1.2rem', color: 'var(--primary)', margin: 0 }}>{value}</h3>}
                        </div>
                    </div>
                ))}
            </div>

            {/* Table */}
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ position: 'relative', flex: 1, minWidth: '200px', maxWidth: '400px' }}>
                        <Search size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input type="text" placeholder="Buscar por ID, cliente, tipo…"
                            value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                            style={{ paddingLeft: 40, paddingRight: searchTerm ? 36 : 12 }} />
                        {searchTerm && (
                            <button
                                onClick={() => setSearchTerm('')}
                                style={{
                                    position: 'absolute',
                                    right: '10px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    color: 'var(--text-muted)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    padding: '2px'
                                }}
                                title="Limpiar búsqueda"
                            >
                                <X size={16} />
                            </button>
                        )}
                    </div>
                    {activeFilter !== 'All' && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.35rem 0.75rem', backgroundColor: '#f1f5f9', borderRadius: '999px', fontSize: '0.85rem' }}>
                            {STATUS_CONFIG[activeFilter]?.label}
                            <button onClick={() => setActiveFilter('All')} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0, display: 'flex', color: 'var(--text-muted)' }}>
                                <X size={14} />
                            </button>
                        </div>
                    )}
                </div>

                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid var(--border)' }}>
                                <th
                                    onClick={() => handleSort('id')}
                                    style={{ padding: '1rem', textAlign: 'left', color: sortConfig.key === 'id' ? '#2563eb' : 'var(--text-muted)', cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}
                                    title="Hacer clic para ordenar por ID"
                                >
                                    <div style={{ display: 'flex', alignItems: 'center' }}>
                                        <span>ID</span>
                                        {renderSortIcon('id')}
                                    </div>
                                </th>
                                <th
                                    onClick={() => handleSort('client')}
                                    style={{ padding: '1rem', textAlign: 'left', color: sortConfig.key === 'client' ? '#2563eb' : 'var(--text-muted)', cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}
                                    title="Hacer clic para ordenar por Cliente / Póliza"
                                >
                                    <div style={{ display: 'flex', alignItems: 'center' }}>
                                        <span>Cliente / Póliza</span>
                                        {renderSortIcon('client')}
                                    </div>
                                </th>
                                <th
                                    onClick={() => handleSort('type')}
                                    style={{ padding: '1rem', textAlign: 'left', color: sortConfig.key === 'type' ? '#2563eb' : 'var(--text-muted)', cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}
                                    title="Hacer clic para ordenar por Tipo"
                                >
                                    <div style={{ display: 'flex', alignItems: 'center' }}>
                                        <span>Tipo</span>
                                        {renderSortIcon('type')}
                                    </div>
                                </th>
                                <th
                                    onClick={() => handleSort('date')}
                                    style={{ padding: '1rem', textAlign: 'left', color: sortConfig.key === 'date' ? '#2563eb' : 'var(--text-muted)', cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}
                                    title="Hacer clic para ordenar por Fecha"
                                >
                                    <div style={{ display: 'flex', alignItems: 'center' }}>
                                        <span>Fecha</span>
                                        {renderSortIcon('date')}
                                    </div>
                                </th>
                                <th
                                    onClick={() => handleSort('amount')}
                                    style={{ padding: '1rem', textAlign: 'right', color: sortConfig.key === 'amount' ? '#2563eb' : 'var(--text-muted)', cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}
                                    title="Hacer clic para ordenar por Monto"
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                                        <span>Monto</span>
                                        {renderSortIcon('amount')}
                                    </div>
                                </th>
                                <th
                                    onClick={() => handleSort('status')}
                                    style={{ padding: '1rem', textAlign: 'left', color: sortConfig.key === 'status' ? '#2563eb' : 'var(--text-muted)', cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}
                                    title="Hacer clic para ordenar por Estado"
                                >
                                    <div style={{ display: 'flex', alignItems: 'center' }}>
                                        <span>Estado</span>
                                        {renderSortIcon('status')}
                                    </div>
                                </th>
                                <th style={{ padding: '1rem', width: '50px' }}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedClaims.length === 0 ? (
                                <tr><td colSpan="7" style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                                    No se encontraron siniestros para el período y filtro seleccionados.
                                </td></tr>
                            ) : sortedClaims.map(c => (
                                <tr key={c.id} className="hover-row" style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer' }}
                                    onClick={() => setSelectedClaim(c)}>
                                    <td style={{ padding: '1rem', fontWeight: 'bold', color: 'var(--primary)', whiteSpace: 'nowrap' }}>{c.id}</td>
                                    <td style={{ padding: '1rem' }}>
                                        <div style={{ fontWeight: '600' }}>{c.client}</div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{c.policyDesc}</div>
                                    </td>
                                    <td style={{ padding: '1rem', fontSize: '0.9rem' }}>{c.type}</td>
                                    <td style={{ padding: '1rem', whiteSpace: 'nowrap', fontSize: '0.9rem' }}>{formatDateToDDMMYYYY(c.date)}</td>
                                    <td style={{ padding: '1rem', textAlign: 'right', fontWeight: '700', whiteSpace: 'nowrap' }}>{formatMoney(c.amount)}</td>
                                    <td style={{ padding: '1rem' }}><StatusBadge status={c.status} /></td>
                                    <td style={{ padding: '1rem' }}>
                                        <ChevronRight size={18} color="var(--text-muted)" />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Register Modal */}
            {showModal && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
                    <div className="card" style={{ width: '100%', maxWidth: '600px', backgroundColor: 'white', maxHeight: '92vh', overflowY: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h3 style={{ margin: 0 }}>Registrar Nuevo Siniestro</h3>
                            <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={24} /></button>
                        </div>

                        <form onSubmit={handleSubmit}>
                            {/* Policy Autocomplete */}
                            <div style={{ marginBottom: '1.25rem', position: 'relative' }}>
                                <label style={{ fontWeight: '600', display: 'block', marginBottom: '0.4rem' }}>Buscar Póliza / Cliente</label>
                                <div style={{ position: 'relative' }}>
                                    <input type="text" placeholder="Nombre del cliente o # de póliza…"
                                        value={policySearch}
                                        onChange={e => { setPolicySearch(e.target.value); setShowPolicyResults(true); if (newClaim.selectedPolicyId) handleSelectPolicy(null); }}
                                        onFocus={() => setShowPolicyResults(true)}
                                        style={{ width: '100%', paddingLeft: '2.5rem' }} />
                                    <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                    {newClaim.selectedPolicyId && (
                                        <button type="button" onClick={() => handleSelectPolicy(null)}
                                            style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}>
                                            <X size={14} />
                                        </button>
                                    )}
                                </div>
                                {showPolicyResults && policySearch.length > 0 && (
                                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: 'white', border: '1px solid var(--border)', borderRadius: '0 0 var(--radius-sm) var(--radius-sm)', maxHeight: '180px', overflowY: 'auto', zIndex: 100, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                                        {filteredPolicies.length > 0 ? filteredPolicies.map(p => (
                                            <div key={p.id} onClick={() => handleSelectPolicy(p)}
                                                style={{ padding: '0.75rem', borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }}
                                                onMouseOver={e => e.currentTarget.style.backgroundColor = '#f8fafc'}
                                                onMouseOut={e => e.currentTarget.style.backgroundColor = 'white'}>
                                                <div style={{ fontWeight: '600', fontSize: '0.9rem' }}>{p.client} ({p.id})</div>
                                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.2rem' }}>
                                                    <span>{p.type} ·</span>
                                                    <InsurerLogo name={p.insurer} size={16} showName={true} textStyle={{ fontSize: '0.8rem', color: 'var(--text-muted)' }} />
                                                </div>
                                            </div>
                                        )) : (
                                            <div style={{ padding: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', fontSize: '0.9rem' }}>Sin resultados. Ingresa datos manualmente.</div>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                                <div>
                                    <label>Cliente *</label>
                                    <input required type="text" placeholder="Nombre del cliente" value={newClaim.client}
                                        onChange={e => setNewClaim({ ...newClaim, client: e.target.value })}
                                        readOnly={!!newClaim.selectedPolicyId} style={{ backgroundColor: newClaim.selectedPolicyId ? '#f1f5f9' : 'white' }} />
                                </div>
                                <div>
                                    <label>Póliza</label>
                                    <input type="text" placeholder="Ej. POL-001" value={newClaim.policy}
                                        onChange={e => setNewClaim({ ...newClaim, policy: e.target.value })}
                                        readOnly={!!newClaim.selectedPolicyId} style={{ backgroundColor: newClaim.selectedPolicyId ? '#f1f5f9' : 'white' }} />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                                <div>
                                    <label>Tipo de Siniestro *</label>
                                    <select style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}
                                        value={newClaim.type} onChange={e => setNewClaim({ ...newClaim, type: e.target.value })}>
                                        {TYPE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label>Fecha del Evento *</label>
                                    <input required type="date" value={newClaim.date} onChange={e => setNewClaim({ ...newClaim, date: e.target.value })} />
                                </div>
                            </div>

                            <div style={{ marginBottom: '1rem' }}>
                                <label>Descripción del Evento *</label>
                                <textarea required rows={3} placeholder="Describe brevemente lo ocurrido…"
                                    value={newClaim.description} onChange={e => setNewClaim({ ...newClaim, description: e.target.value })}
                                    style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', resize: 'vertical' }} />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                                <div>
                                    <label>Monto Reclamado</label>
                                    <input type="text" placeholder="RD$ 0.00" value={newClaim.amount}
                                        onChange={e => setNewClaim({ ...newClaim, amount: e.target.value })} />
                                </div>
                                <div>
                                    <label>Estado Inicial</label>
                                    <select style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}
                                        value={newClaim.status} onChange={e => setNewClaim({ ...newClaim, status: e.target.value })}>
                                        {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                                <div>
                                    <label>Ajustador Asignado</label>
                                    <input type="text" placeholder="Nombre del ajustador" value={newClaim.adjuster}
                                        onChange={e => setNewClaim({ ...newClaim, adjuster: e.target.value })} />
                                </div>
                                <div>
                                    <label>Teléfono del Ajustador</label>
                                    <input type="tel" placeholder="809-000-0000" value={newClaim.phone}
                                        onChange={e => setNewClaim({ ...newClaim, phone: e.target.value })} />
                                </div>
                            </div>

                            <div style={{ marginBottom: '1rem' }}>
                                <label>Notas Internas</label>
                                <textarea rows={2} placeholder="Observaciones adicionales…"
                                    value={newClaim.notes} onChange={e => setNewClaim({ ...newClaim, notes: e.target.value })}
                                    style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', resize: 'vertical' }} />
                            </div>

                            {/* File attachments */}
                            <div style={{ marginBottom: '1.5rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.4rem' }}>Documentos Adjuntos</label>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1rem', border: '2px dashed var(--border)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                    <Paperclip size={16} /> Seleccionar archivos (PDF, imágenes, etc.)
                                    <input type="file" multiple style={{ display: 'none' }} onChange={handleFiles} />
                                </label>
                                {newClaim.attachments.length > 0 && (
                                    <div style={{ marginTop: '0.5rem', display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                                        {newClaim.attachments.map((f, i) => (
                                            <span key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.25rem 0.6rem', backgroundColor: '#f1f5f9', borderRadius: '999px', fontSize: '0.8rem' }}>
                                                <FileText size={12} /> {f}
                                                <button type="button" onClick={() => setNewClaim(prev => ({ ...prev, attachments: prev.attachments.filter((_, j) => j !== i) }))}
                                                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', color: 'var(--text-muted)' }}>
                                                    <X size={12} />
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                                <button type="button" className="btn" onClick={() => setShowModal(false)} style={{ backgroundColor: '#f1f5f9' }}>Cancelar</button>
                                <button type="submit" className="btn btn-primary">Registrar Siniestro</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <style>{`
                .hover-row:hover { background-color: #f8fafc !important; }
            `}</style>
        </div>
    );
};

export default ClaimsManagement;
