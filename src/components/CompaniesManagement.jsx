import React, { useState, useMemo } from 'react';
import { Building2, FileText, ShieldAlert, DollarSign, Percent, Settings, X, Plus, Edit3, ArrowUpRight, CheckCircle2, Search } from 'lucide-react';
import { formatMoney, formatDateToDDMMYYYY } from '../utils/policyHelpers';
import InsurerLogo, { getInitials, getColorForInsurer } from './InsurerLogo';

const CompaniesManagement = ({ policies = [], payments = [], claims = [], companies = [], setCompanies }) => {
    const [insurerRates, setInsurerRates] = useState(() => {
        const saved = localStorage.getItem('insurer_commission_rates');
        if (saved) return JSON.parse(saved);
        return {
            'Seguros Universal': 0.20,
            'Humano Seguros': 0.15,
            'Mapfre BHD Seguros': 0.22,
            'La Colonial de Seguros': 0.20,
            'Seguros Reservas': 0.18,
            'Seguros Sura': 0.15,
            'General de Seguros': 0.12,
            'Dominicana de Seguros': 0.15,
            'Patria Compañía de Seguros': 0.15,
            'Aspirante Seguros': 0.15,
            'Seguros Pepín': 0.10,
            'La Monumental de Seguros': 0.15,
            'Angloamericana de Seguros': 0.15,
            'CoopSeguros': 0.15,
            'Seguros Crecer': 0.15,
            'K&M Seguros': 0.15
        };
    });

    const [searchTerm, setSearchTerm] = useState('');
    const [editingInsurer, setEditingInsurer] = useState(null);
    const [tempRate, setTempRate] = useState('');
    const [selectedInsurerDetails, setSelectedInsurerDetails] = useState(null);
    const [detailType, setDetailType] = useState('policies'); // 'policies' or 'claims'

    // CRUD state
    const [showAddModal, setShowAddModal] = useState(false);
    const [newCompany, setNewCompany] = useState({ name: '', domain: '' });
    const [editingCompany, setEditingCompany] = useState(null); // { originalName, name, domain }
    const [deletingCompanyConfirm, setDeletingCompanyConfirm] = useState(null); // company name to delete

    const handleAddCompany = (e) => {
        e.preventDefault();
        const trimmedName = newCompany.name.trim();
        const trimmedDomain = newCompany.domain.trim();
        if (!trimmedName) return;

        if (companies.some(c => c.name.toLowerCase() === trimmedName.toLowerCase())) {
            alert(`La compañía "${trimmedName}" ya existe en el sistema.`);
            return;
        }

        const newObj = { name: trimmedName, domain: trimmedDomain };
        setCompanies([...companies, newObj]);

        // Initialize commission rate
        const updatedRates = { ...insurerRates, [trimmedName]: 0.15 };
        setInsurerRates(updatedRates);
        localStorage.setItem('insurer_commission_rates', JSON.stringify(updatedRates));

        setNewCompany({ name: '', domain: '' });
        setShowAddModal(false);
    };

    const handleEditCompanySubmit = (e) => {
        e.preventDefault();
        const trimmedName = editingCompany.name.trim();
        const trimmedDomain = editingCompany.domain.trim();
        const originalName = editingCompany.originalName;
        if (!trimmedName) return;

        if (companies.some(c => c.name.toLowerCase() === trimmedName.toLowerCase() && c.name.toLowerCase() !== originalName.toLowerCase())) {
            alert(`La compañía "${trimmedName}" ya existe.`);
            return;
        }

        // Update in companies array
        const updated = companies.map(c => {
            if (c.name.toLowerCase() === originalName.toLowerCase()) {
                return { name: trimmedName, domain: trimmedDomain };
            }
            return c;
        });
        setCompanies(updated);

        // Update commission rate key
        const updatedRates = { ...insurerRates };
        const oldRate = updatedRates[originalName] !== undefined ? updatedRates[originalName] : 0.15;
        updatedRates[trimmedName] = oldRate;
        if (trimmedName.toLowerCase() !== originalName.toLowerCase()) {
            delete updatedRates[originalName];
        }
        setInsurerRates(updatedRates);
        localStorage.setItem('insurer_commission_rates', JSON.stringify(updatedRates));

        setEditingCompany(null);
    };

    const handleDeleteCompany = (name) => {
        const policyCount = policies.filter(p => p.insurer.toLowerCase() === name.toLowerCase()).length;
        if (policyCount > 0) {
            alert(`No se puede eliminar "${name}" porque tiene ${policyCount} pólizas asociadas.`);
            return;
        }
        setDeletingCompanyConfirm(name);
    };

    const handleConfirmDelete = () => {
        if (!deletingCompanyConfirm) return;
        const name = deletingCompanyConfirm;
        const updated = companies.filter(c => c.name.toLowerCase() !== name.toLowerCase());
        setCompanies(updated);

        // Remove rate key
        const updatedRates = { ...insurerRates };
        delete updatedRates[name];
        setInsurerRates(updatedRates);
        localStorage.setItem('insurer_commission_rates', JSON.stringify(updatedRates));

        setDeletingCompanyConfirm(null);
    };

    const handleSaveRate = (insurer) => {
        const val = parseFloat(tempRate) / 100;
        if (!isNaN(val) && val >= 0 && val <= 1) {
            const updated = { ...insurerRates, [insurer]: val };
            setInsurerRates(updated);
            localStorage.setItem('insurer_commission_rates', JSON.stringify(updated));
            setEditingInsurer(null);
        } else {
            alert('Por favor introduzca un porcentaje válido entre 0% y 100%.');
        }
    };

    // Calculate aggregated statistics per company
    const statsByInsurer = useMemo(() => {
        const data = {};

        companies.forEach(company => {
            const insurer = company.name;
            const insurerPolicies = policies.filter(p => p.insurer === insurer);
            
            // Primas Emitidas (DOP & USD)
            let dopPremiums = 0;
            let usdPremiums = 0;
            insurerPolicies.forEach(pol => {
                const num = parseFloat(String(pol.amount).replace(/[^0-9.]/g, '')) || 0;
                if (pol.currency === 'USD') usdPremiums += num;
                else dopPremiums += num;
            });

            // Siniestros
            const insurerClaims = claims.filter(c => {
                const pol = policies.find(p => p.id === c.policy);
                return (pol && pol.insurer === insurer) || (c.policyDesc && c.policyDesc.includes(insurer));
            });

            // Comisiones (Based on Paid payments for policies of this insurer)
            let dopCommissionsPaid = 0;
            let usdCommissionsPaid = 0;
            const rate = insurerRates[insurer] || 0.15;

            payments.forEach(pay => {
                if (pay.status !== 'Paid') return;
                const pol = policies.find(p => p.id === pay.policyId);
                if (pol && pol.insurer === insurer) {
                    const payAmt = pay.amountNum || parseFloat(String(pay.amount).replace(/[^0-9.]/g, '')) || 0;
                    if (pol.currency === 'USD') usdCommissionsPaid += payAmt * rate;
                    else dopCommissionsPaid += payAmt * rate;
                }
            });

            data[insurer] = {
                policiesCount: insurerPolicies.length,
                claimsCount: insurerClaims.length,
                dopPremiums,
                usdPremiums,
                dopCommissionsPaid,
                usdCommissionsPaid,
                rate
            };
        });

        return data;
    }, [companies, policies, payments, claims, insurerRates]);

    // Overall summary stats
    const summary = useMemo(() => {
        let totalPolicies = policies.length;
        let totalClaims = claims.length;
        let dopPremiumsSum = 0;
        let usdPremiumsSum = 0;
        let dopCommissionsSum = 0;
        let usdCommissionsSum = 0;

        Object.values(statsByInsurer).forEach(item => {
            dopPremiumsSum += item.dopPremiums;
            usdPremiumsSum += item.usdPremiums;
            dopCommissionsSum += item.dopCommissionsPaid;
            usdCommissionsSum += item.usdCommissionsPaid;
        });

        return {
            totalPolicies,
            totalClaims,
            dopPremiumsSum,
            usdPremiumsSum,
            dopCommissionsSum,
            usdCommissionsSum
        };
    }, [policies, claims, statsByInsurer]);

    const filteredInsurers = useMemo(() => {
        return companies.filter(company => 
            company.name.toLowerCase().includes(searchTerm.toLowerCase())
        ).map(c => c.name).sort((a, b) => a.localeCompare(b));
    }, [companies, searchTerm]);

    // Details view policies / claims
    const currentDetailsData = useMemo(() => {
        if (!selectedInsurerDetails) return [];
        if (detailType === 'policies') {
            return policies.filter(p => p.insurer === selectedInsurerDetails);
        } else {
            return claims.filter(c => {
                const pol = policies.find(p => p.id === c.policy);
                return (pol && pol.insurer === selectedInsurerDetails) || (c.policyDesc && c.policyDesc.includes(selectedInsurerDetails));
            });
        }
    }, [selectedInsurerDetails, detailType, policies, claims]);

    return (
        <div>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h2 style={{ fontSize: '2rem', color: 'var(--primary)' }}>Compañías Aseguradoras</h2>
                    <p style={{ color: 'var(--text-muted)' }}>Métricas clave, tasas de comisión fija y control de primas por aseguradora.</p>
                </div>
                <button 
                    className="btn btn-primary" 
                    onClick={() => {
                        setNewCompany({ name: '', domain: '' });
                        setShowAddModal(true);
                    }}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                    <Plus size={18} /> Agregar Aseguradora
                </button>
            </div>

            {/* Quick Summary Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ padding: '0.75rem', backgroundColor: '#fdf8f6', borderRadius: '50%', color: 'var(--primary)' }}>
                        <Building2 size={24} />
                    </div>
                    <div>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>Total Compañías</p>
                        <h4 style={{ fontSize: '1.5rem', margin: '0.2rem 0 0' }}>{companies.length}</h4>
                    </div>
                </div>
                <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ padding: '0.75rem', backgroundColor: '#f0fdf4', borderRadius: '50%', color: '#166534' }}>
                        <FileText size={24} />
                    </div>
                    <div>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>Pólizas Emitidas</p>
                        <h4 style={{ fontSize: '1.5rem', margin: '0.2rem 0 0' }}>{summary.totalPolicies}</h4>
                    </div>
                </div>
                <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ padding: '0.75rem', backgroundColor: '#fef2f2', borderRadius: '50%', color: '#991b1b' }}>
                        <ShieldAlert size={24} />
                    </div>
                    <div>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>Siniestros Totales</p>
                        <h4 style={{ fontSize: '1.5rem', margin: '0.2rem 0 0' }}>{summary.totalClaims}</h4>
                    </div>
                </div>
                <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ padding: '0.75rem', backgroundColor: '#fffbeb', borderRadius: '50%', color: '#b45309' }}>
                        <DollarSign size={24} />
                    </div>
                    <div>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>Comisiones Cobradas</p>
                        <h4 style={{ fontSize: '1.2rem', margin: '0.2rem 0 0', fontWeight: '700' }}>
                            RD$ {formatMoney(summary.dopCommissionsSum).replace('RD$ ', '').replace('USD$ ', '')}
                            {summary.usdCommissionsSum > 0 && <div style={{ fontSize: '0.85rem', color: '#10b981' }}>USD$ {formatMoney(summary.usdCommissionsSum).replace('RD$ ', '').replace('USD$ ', '')}</div>}
                        </h4>
                    </div>
                </div>
            </div>

            {/* Filter bar */}
            <div className="card" style={{ padding: '1rem 1.5rem', marginBottom: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', border: '1px solid var(--border)', padding: '0.4rem 0.75rem', borderRadius: 'var(--radius-sm)', backgroundColor: 'white', flex: 1, maxWidth: '400px' }}>
                    <Search size={18} color="var(--text-muted)" />
                    <input
                        type="text"
                        placeholder="Buscar compañía por nombre..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        style={{ border: 'none', outline: 'none', width: '100%', fontSize: '0.95rem' }}
                    />
                </div>
                <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                    Mostrando <strong>{filteredInsurers.length}</strong> de {companies.length} aseguradoras
                </span>
            </div>

            {/* Grid list of companies */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
                {filteredInsurers.map(insurer => {
                    const stats = statsByInsurer[insurer];
                    const initials = getInitials(insurer);
                    const color = getColorForInsurer(insurer);
                    const isEditing = editingInsurer === insurer;

                    return (
                        <div key={insurer} className="card hover-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', padding: '1.5rem', position: 'relative' }}>
                            {/* Card Header */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <InsurerLogo name={insurer} domain={companies.find(c => c.name === insurer)?.domain} size={64} initialsSize="1.4rem" />
                                <div style={{ flex: 1 }}>
                                    <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-main)', fontWeight: '600' }}>{insurer}</h3>
                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                        {companies.find(c => c.name === insurer)?.domain || 'República Dominicana'}
                                    </span>
                                </div>
                                <div style={{ display: 'flex', gap: '0.25rem' }}>
                                    <button
                                        onClick={() => {
                                            const comp = companies.find(c => c.name === insurer) || {};
                                            setEditingCompany({ originalName: insurer, name: insurer, domain: comp.domain || '' });
                                        }}
                                        className="btn-icon"
                                        title="Editar Compañía"
                                        style={{ padding: '0.35rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', borderRadius: 'var(--radius-sm)', transition: 'background-color 0.2s' }}
                                        onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                                        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                                    >
                                        <Edit3 size={15} />
                                    </button>
                                    <button
                                        onClick={() => handleDeleteCompany(insurer)}
                                        className="btn-icon"
                                        title="Eliminar Compañía"
                                        style={{ padding: '0.35rem', background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', borderRadius: 'var(--radius-sm)', transition: 'background-color 0.2s' }}
                                        onMouseEnter={e => e.currentTarget.style.backgroundColor = '#fef2f2'}
                                        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                                    >
                                        <X size={15} />
                                    </button>
                                </div>
                            </div>

                            {/* Rate configuration block */}
                            <div style={{
                                padding: '0.75rem',
                                backgroundColor: '#f8fafc',
                                borderRadius: 'var(--radius-sm)',
                                border: '1px solid var(--border)',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '600' }}>
                                    <Percent size={15} color="var(--primary)" /> TASA DE COMISIÓN
                                </div>
                                {isEditing ? (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                        <input
                                            type="number"
                                            min="0"
                                            max="100"
                                            step="0.5"
                                            value={tempRate}
                                            onChange={e => setTempRate(e.target.value)}
                                            style={{ width: '60px', padding: '0.2rem 0.35rem', fontSize: '0.85rem', textAlign: 'right' }}
                                            autoFocus
                                        />
                                        <span style={{ fontSize: '0.85rem', fontWeight: '600' }}>%</span>
                                        <button className="btn btn-primary" onClick={() => handleSaveRate(insurer)} style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem', height: 'auto' }}>
                                            OK
                                        </button>
                                        <button className="btn" onClick={() => setEditingInsurer(null)} style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem', height: 'auto', backgroundColor: '#e2e8f0' }}>
                                            X
                                        </button>
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <span style={{ fontWeight: '700', color: 'var(--primary)' }}>{Math.round(stats.rate * 100)}%</span>
                                        <button onClick={() => { setEditingInsurer(insurer); setTempRate(String(Math.round(stats.rate * 100))); }} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.2rem', display: 'flex' }}>
                                            <Edit3 size={14} />
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Stats grids */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.9rem' }}>
                                <div style={{ borderRight: '1px solid var(--border)', paddingRight: '0.5rem' }}>
                                    <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: '600' }}>Pólizas</div>
                                    <button onClick={() => { setSelectedInsurerDetails(insurer); setDetailType('policies'); }} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem', padding: 0, fontWeight: '700', fontSize: '1.1rem', color: 'var(--primary)', textDecoration: 'underline' }}>
                                        {stats.policiesCount} <ArrowUpRight size={14} />
                                    </button>
                                </div>
                                <div style={{ paddingLeft: '0.5rem' }}>
                                    <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: '600' }}>Siniestros</div>
                                    <button onClick={() => { setSelectedInsurerDetails(insurer); setDetailType('claims'); }} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem', padding: 0, fontWeight: '700', fontSize: '1.1rem', color: stats.claimsCount > 0 ? '#dc2626' : 'var(--text-main)', textDecoration: stats.claimsCount > 0 ? 'underline' : 'none' }} disabled={stats.claimsCount === 0}>
                                        {stats.claimsCount} {stats.claimsCount > 0 && <ArrowUpRight size={14} />}
                                    </button>
                                </div>
                            </div>

                            {/* Financial totals */}
                            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.75rem', fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: 'var(--text-muted)' }}>Primas DOP:</span>
                                    <span style={{ fontWeight: '600' }}>{formatMoney(stats.dopPremiums, 'DOP')}</span>
                                </div>
                                {stats.usdPremiums > 0 && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span style={{ color: 'var(--text-muted)' }}>Primas USD:</span>
                                        <span style={{ fontWeight: '600', color: '#10b981' }}>{formatMoney(stats.usdPremiums, 'USD')}</span>
                                    </div>
                                )}
                                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed #e2e8f0', paddingTop: '0.4rem', marginTop: '0.2rem' }}>
                                    <span style={{ color: 'var(--text-muted)' }}>Comisión Cobrada:</span>
                                    <span style={{ fontWeight: '700', color: 'var(--primary)' }}>
                                        {formatMoney(stats.dopCommissionsPaid, 'DOP')}
                                        {stats.usdCommissionsPaid > 0 && <div style={{ fontSize: '0.75rem', color: '#10b981', textAlign: 'right' }}>{formatMoney(stats.usdCommissionsPaid, 'USD')}</div>}
                                    </span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Details Modal */}
            {selectedInsurerDetails && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
                    <div className="card" style={{ width: '100%', maxWidth: '800px', backgroundColor: 'white', maxHeight: '90vh', overflowY: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <InsurerLogo name={selectedInsurerDetails} domain={companies.find(c => c.name === selectedInsurerDetails)?.domain} size={64} initialsSize="1.4rem" />
                                <div>
                                    <h3 style={{ margin: 0, color: 'var(--primary)', fontWeight: '700' }}>{selectedInsurerDetails}</h3>
                                    <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.9rem' }}>
                                        {detailType === 'policies' ? 'Pólizas de Seguros Emitidas' : 'Reclamaciones por Siniestros Registradas'}
                                    </p>
                                </div>
                            </div>
                            <button onClick={() => setSelectedInsurerDetails(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={24} /></button>
                        </div>

                        {/* Modal Navigation */}
                        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                            <button 
                                className={`btn ${detailType === 'policies' ? 'btn-primary' : ''}`}
                                onClick={() => setDetailType('policies')}
                                style={{ padding: '0.4rem 1rem', fontSize: '0.9rem', backgroundColor: detailType === 'policies' ? 'var(--primary)' : '#f1f5f9' }}
                            >
                                Pólizas ({policies.filter(p => p.insurer === selectedInsurerDetails).length})
                            </button>
                            <button 
                                className={`btn ${detailType === 'claims' ? 'btn-primary' : ''}`}
                                onClick={() => setDetailType('claims')}
                                style={{ padding: '0.4rem 1rem', fontSize: '0.9rem', backgroundColor: detailType === 'claims' ? 'var(--primary)' : '#f1f5f9' }}
                            >
                                Siniestros ({claims.filter(c => {
                                    const pol = policies.find(p => p.id === c.policy);
                                    return (pol && pol.insurer === selectedInsurerDetails) || (c.policyDesc && c.policyDesc.includes(selectedInsurerDetails));
                                }).length})
                            </button>
                        </div>

                        {/* Data representation */}
                        {currentDetailsData.length === 0 ? (
                            <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center', padding: '3rem' }}>
                                No se encontraron registros de este tipo para esta aseguradora.
                            </p>
                        ) : detailType === 'policies' ? (
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid var(--border)' }}>
                                            {['ID Póliza', 'Cliente', 'Ramo', 'Inicio', 'Prima', 'Frecuencia'].map(h => (
                                                <th key={h} style={{ padding: '0.75rem', textAlign: h === 'Prima' ? 'right' : 'left', color: 'var(--text-muted)', fontSize: '0.85rem' }}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {currentDetailsData.map(pol => {
                                            const numVal = parseFloat(String(pol.amount).replace(/[^0-9.]/g, '')) || 0;
                                            return (
                                                <tr key={pol.id} style={{ borderBottom: '1px solid var(--border)', fontSize: '0.9rem' }}>
                                                    <td style={{ padding: '0.75rem', fontWeight: '700', color: 'var(--primary)' }}>{pol.id}</td>
                                                    <td style={{ padding: '0.75rem', fontWeight: '600' }}>{pol.client}</td>
                                                    <td style={{ padding: '0.75rem' }}>{pol.type}</td>
                                                    <td style={{ padding: '0.75rem' }}>{formatDateToDDMMYYYY(pol.startDate)}</td>
                                                    <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: '700' }}>{formatMoney(numVal, pol.currency)}</td>
                                                    <td style={{ padding: '0.75rem' }}>{pol.renewalFrequency}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid var(--border)' }}>
                                            {['ID Siniestro', 'Cliente / Póliza', 'Tipo de Evento', 'Fecha Siniestro', 'Monto Reclamado', 'Estado'].map(h => (
                                                <th key={h} style={{ padding: '0.75rem', textAlign: h === 'Monto Reclamado' ? 'right' : 'left', color: 'var(--text-muted)', fontSize: '0.85rem' }}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {currentDetailsData.map(c => (
                                            <tr key={c.id} style={{ borderBottom: '1px solid var(--border)', fontSize: '0.9rem' }}>
                                                <td style={{ padding: '0.75rem', fontWeight: '700', color: 'var(--primary)' }}>{c.id}</td>
                                                <td style={{ padding: '0.75rem' }}>
                                                    <div style={{ fontWeight: '600' }}>{c.client}</div>
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{c.policy}</div>
                                                </td>
                                                <td style={{ padding: '0.75rem' }}>{c.type}</td>
                                                <td style={{ padding: '0.75rem' }}>{formatDateToDDMMYYYY(c.date)}</td>
                                                <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: '700', color: '#991b1b' }}>{formatMoney(c.amountNum || parseFloat(String(c.amount).replace(/[^0-9.]/g, '')) || 0)}</td>
                                                <td style={{ padding: '0.75rem' }}>
                                                    <span style={{
                                                        padding: '0.2rem 0.5rem',
                                                        borderRadius: '999px',
                                                        fontSize: '0.75rem',
                                                        fontWeight: '600',
                                                        backgroundColor: c.status === 'Cerrado' ? '#dcfce7' : c.status === 'EnProceso' ? '#fef9c3' : '#fee2e2',
                                                        color: c.status === 'Cerrado' ? '#166534' : c.status === 'EnProceso' ? '#854d0e' : '#991b1b'
                                                    }}>
                                                        {c.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                            <button className="btn btn-primary" onClick={() => setSelectedInsurerDetails(null)}>
                                Cerrar Ventana
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Company Modal */}
            {showAddModal && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
                    <div className="card animate-fade-in" style={{ width: '100%', maxWidth: '500px', backgroundColor: 'white', padding: '2rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
                            <h3 style={{ margin: 0, color: 'var(--primary)', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Building2 size={20} /> Agregar Aseguradora
                            </h3>
                            <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleAddCompany} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            <div>
                                <label style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '0.4rem' }}>Nombre de la Compañía *</label>
                                <input
                                    required
                                    type="text"
                                    placeholder="Ej: Seguros Patria"
                                    value={newCompany.name}
                                    onChange={e => setNewCompany({ ...newCompany, name: e.target.value })}
                                    style={{ width: '100%', padding: '0.6rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: '0.95rem' }}
                                />
                            </div>
                            <div>
                                <label style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '0.4rem' }}>Dominio de Internet (Logo)</label>
                                <input
                                    type="text"
                                    placeholder="Ej: segurospatria.com.do (opcional)"
                                    value={newCompany.domain}
                                    onChange={e => setNewCompany({ ...newCompany, domain: e.target.value })}
                                    style={{ width: '100%', padding: '0.6rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: '0.95rem' }}
                                />
                                <small style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>
                                    Usado para descargar automáticamente el logotipo de la marca.
                                </small>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                                <button type="button" className="btn" onClick={() => setShowAddModal(false)} style={{ backgroundColor: '#e2e8f0', color: 'var(--text-main)', border: '1px solid var(--border)' }}>
                                    Cancelar
                                </button>
                                <button type="submit" className="btn btn-primary">
                                    Guardar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Company Modal */}
            {editingCompany && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
                    <div className="card animate-fade-in" style={{ width: '100%', maxWidth: '500px', backgroundColor: 'white', padding: '2rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
                            <h3 style={{ margin: 0, color: 'var(--primary)', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Edit3 size={20} /> Editar Aseguradora
                            </h3>
                            <button onClick={() => setEditingCompany(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleEditCompanySubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            <div>
                                <label style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '0.4rem' }}>Nombre de la Compañía *</label>
                                <input
                                    required
                                    type="text"
                                    value={editingCompany.name}
                                    onChange={e => setEditingCompany({ ...editingCompany, name: e.target.value })}
                                    style={{ width: '100%', padding: '0.6rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: '0.95rem' }}
                                />
                            </div>
                            <div>
                                <label style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '0.4rem' }}>Dominio de Internet (Logo)</label>
                                <input
                                    type="text"
                                    value={editingCompany.domain}
                                    onChange={e => setEditingCompany({ ...editingCompany, domain: e.target.value })}
                                    style={{ width: '100%', padding: '0.6rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: '0.95rem' }}
                                />
                                <small style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>
                                    Usado para descargar automáticamente el logotipo de la marca.
                                </small>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                                <button type="button" className="btn" onClick={() => setEditingCompany(null)} style={{ backgroundColor: '#e2e8f0', color: 'var(--text-main)', border: '1px solid var(--border)' }}>
                                    Cancelar
                                </button>
                                <button type="submit" className="btn btn-primary">
                                    Guardar Cambios
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {/* Delete Confirmation Custom Modal */}
            {deletingCompanyConfirm && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
                    <div className="card animate-fade-in" style={{ width: '100%', maxWidth: '400px', backgroundColor: 'white', padding: '2rem', textAlign: 'center' }}>
                        <div style={{ color: '#dc2626', marginBottom: '1rem' }}>
                            <ShieldAlert size={48} style={{ margin: '0 auto' }} />
                        </div>
                        <h3 style={{ margin: '0 0 0.5rem 0', fontWeight: '700', fontSize: '1.25rem', color: 'var(--text-main)' }}>¿Confirmar Eliminación?</h3>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: '1.4' }}>
                            ¿Está seguro de que desea eliminar la compañía <strong>"{deletingCompanyConfirm}"</strong>? Esta acción no se puede deshacer.
                        </p>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
                            <button className="btn" onClick={() => setDeletingCompanyConfirm(null)} style={{ backgroundColor: '#e2e8f0', color: 'var(--text-main)', border: '1px solid var(--border)' }}>
                                Cancelar
                            </button>
                            <button className="btn" onClick={handleConfirmDelete} style={{ backgroundColor: '#dc2626', color: 'white', border: 'none' }}>
                                Sí, Eliminar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CompaniesManagement;
