import React, { useState, useMemo } from 'react';
import { 
  PieChart, DollarSign, TrendingUp, Calendar, Download, 
  ArrowRight, X, Building, User, Layers, CheckCircle, Percent
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { formatMoney, formatDateToDDMMYYYY } from '../utils/policyHelpers';
import InsurerLogo from './InsurerLogo';

const QuickCommissionModal = ({
  isOpen,
  onClose,
  payments = [],
  policies = [],
  agentCodes = [],
  onNavigate
}) => {
  const [period, setPeriod] = useState('current_month'); // 'current_month' | 'prev_month' | 'current_year' | 'all'

  // Filter payments by selected period
  const filteredPayments = useMemo(() => {
    const today = new Date();
    const curYear = today.getFullYear();
    const curMonth = today.getMonth();

    return (payments || []).filter(p => {
      if (!p.date) return true;
      const pDate = new Date(p.date);
      if (isNaN(pDate.getTime())) return true;

      if (period === 'current_month') {
        return pDate.getFullYear() === curYear && pDate.getMonth() === curMonth;
      }
      if (period === 'prev_month') {
        const prevM = curMonth === 0 ? 11 : curMonth - 1;
        const prevY = curMonth === 0 ? curYear - 1 : curYear;
        return pDate.getFullYear() === prevY && pDate.getMonth() === prevM;
      }
      if (period === 'current_year') {
        return pDate.getFullYear() === curYear;
      }
      return true; // 'all'
    });
  }, [payments, period]);

  // Aggregate by Insurer
  const insurerStats = useMemo(() => {
    const map = {};

    filteredPayments.forEach(pay => {
      const pol = policies.find(p => p.id === pay.policyId || p.id === pay.polizaId || (p.rawId && String(p.rawId) === String(pay.polizaId))) || {};
      const insurerName = pol.insurer || 'Otras Aseguradoras';
      const polPercent = (pol.commissionRate !== undefined && pol.commissionRate !== null)
        ? Number(pol.commissionRate)
        : (pol.porcentajeComision !== undefined && pol.porcentajeComision !== null ? Number(pol.porcentajeComision) : 15.0);
      const rawAmt = typeof pay.amountNum === 'number' ? pay.amountNum : (parseFloat(String(pay.amount || '0').replace(/[^0-9.]/g, '')) || 0);
      const comm = rawAmt * (polPercent / 100);

      if (!map[insurerName]) {
        map[insurerName] = {
          name: insurerName,
          totalPremium: 0,
          totalCommission: 0,
          paymentsCount: 0
        };
      }

      map[insurerName].totalPremium += rawAmt;
      map[insurerName].totalCommission += comm;
      map[insurerName].paymentsCount += 1;
    });

    return Object.values(map)
      .map(item => ({
        ...item,
        avgRate: item.totalPremium > 0 ? ((item.totalCommission / item.totalPremium) * 100).toFixed(1) : '0.0'
      }))
      .sort((a, b) => b.totalCommission - a.totalCommission);
  }, [filteredPayments, policies]);

  // Totals
  const totalPremium = useMemo(() => {
    return insurerStats.reduce((acc, curr) => acc + curr.totalPremium, 0);
  }, [insurerStats]);

  const totalCommission = useMemo(() => {
    return insurerStats.reduce((acc, curr) => acc + curr.totalCommission, 0);
  }, [insurerStats]);

  const avgRate = totalPremium > 0 ? ((totalCommission / totalPremium) * 100).toFixed(1) : '15.0';

  // Export summary to Excel
  const handleExportExcel = () => {
    const rows = [
      ['RESUMEN DE COMISIONES POR ASEGURADORA'],
      [`Período: ${period}`],
      [`Generado: ${new Date().toLocaleDateString('es-DO')}`],
      [],
      ['Aseguradora', 'Tasa (%)', '# Cobros', 'Total Prima (RD$)', 'Comisión Estimada (RD$)'],
      ...insurerStats.map(s => [
        s.name,
        `${s.rate}%`,
        s.paymentsCount,
        s.totalPremium,
        s.totalCommission
      ]),
      [],
      ['TOTALES', `${avgRate}%`, filteredPayments.length, totalPremium, totalCommission]
    ];

    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Comisiones_Resumen');
    XLSX.writeFile(wb, `Resumen_Comisiones_${period}_${Date.now()}.xlsx`);
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.65)',
      backdropFilter: 'blur(5px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2100,
      padding: '1rem',
      animation: 'fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
    }}>
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: 'var(--radius-lg)',
        width: '100%',
        maxWidth: '860px',
        maxHeight: '92vh',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        border: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        position: 'relative'
      }}>
        
        {/* Header */}
        <div style={{
          padding: '1.25rem 1.75rem',
          background: 'linear-gradient(135deg, #7e22ce 0%, #581c87 100%)',
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              backgroundColor: 'rgba(255, 255, 255, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)'
            }}>
              <PieChart size={24} />
            </div>
            <div>
              <h3 style={{ margin: 0, color: '#ffffff', fontSize: '1.3rem', fontWeight: '800', letterSpacing: '-0.02em' }}>
                Resumen Rápido de Comisiones
              </h3>
              <p style={{ margin: '0.15rem 0 0 0', fontSize: '0.86rem', color: '#f3e8ff', opacity: 0.9 }}>
                Cálculo instantáneo de primas cobradas y comisiones por aseguradora
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.12)',
              border: 'none',
              color: '#ffffff',
              cursor: 'pointer',
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease'
            }}
            onMouseOver={e => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.25)'}
            onMouseOut={e => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.12)'}
            title="Cerrar modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Period Selector Tabs */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.85rem clamp(1rem, 3vw, 1.75rem)',
          borderBottom: '1px solid var(--border)',
          backgroundColor: '#faf8f5',
          flexWrap: 'wrap',
          gap: '0.75rem'
        }}>
          <div style={{ display: 'flex', gap: '0.4rem', backgroundColor: '#f1f5f9', padding: '0.25rem', borderRadius: 'var(--radius-md)', overflowX: 'auto', maxWidth: '100%' }}>
            {[
              { id: 'current_month', label: 'Mes Actual' },
              { id: 'prev_month', label: 'Mes Anterior' },
              { id: 'current_year', label: 'Año en Curso' },
              { id: 'all', label: 'Histórico Total' }
            ].map(p => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPeriod(p.id)}
                style={{
                  border: 'none',
                  padding: '0.4rem 0.85rem',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: period === p.id ? '#ffffff' : 'transparent',
                  color: period === p.id ? '#7e22ce' : 'var(--text-muted)',
                  fontWeight: period === p.id ? '800' : '600',
                  fontSize: '0.84rem',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  boxShadow: period === p.id ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  transition: 'all 0.15s'
                }}
              >
                {p.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            className="btn"
            onClick={handleExportExcel}
            style={{
              backgroundColor: '#ffffff',
              border: '1.5px solid var(--border)',
              color: '#16a34a',
              fontWeight: '700',
              fontSize: '0.84rem',
              padding: '0.45rem 0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem'
            }}
          >
            <Download size={15} /> Exportar a Excel (.xlsx)
          </button>
        </div>

        {/* Body */}
        <div style={{
          padding: '1.5rem 1.75rem',
          overflowY: 'auto',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: '1.35rem',
          backgroundColor: '#fcfaf7'
        }}>

          {/* Metric Cards Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem'
          }}>
            <div style={{
              backgroundColor: '#ffffff',
              border: '1.5px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              padding: '1.1rem',
              boxShadow: 'var(--shadow-sm)',
              borderLeft: '5px solid #2563eb'
            }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>Primas Cobradas</span>
              <h3 style={{ fontSize: '1.75rem', margin: '0.3rem 0 0 0', color: '#1e40af' }}>{formatMoney(totalPremium)} DOP</h3>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{filteredPayments.length} pago(s) registrados</span>
            </div>

            <div style={{
              backgroundColor: '#ffffff',
              border: '1.5px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              padding: '1.1rem',
              boxShadow: 'var(--shadow-sm)',
              borderLeft: '5px solid #16a34a'
            }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>Comisiones Estimadas</span>
              <h3 style={{ fontSize: '1.75rem', margin: '0.3rem 0 0 0', color: '#166534' }}>{formatMoney(totalCommission)} DOP</h3>
              <span style={{ fontSize: '0.78rem', color: '#15803d', fontWeight: '700' }}>Tasa promedio: {avgRate}%</span>
            </div>

            <div style={{
              backgroundColor: '#ffffff',
              border: '1.5px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              padding: '1.1rem',
              boxShadow: 'var(--shadow-sm)',
              borderLeft: '5px solid #9333ea'
            }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>Aseguradoras Activas</span>
              <h3 style={{ fontSize: '1.75rem', margin: '0.3rem 0 0 0', color: '#6b21a8' }}>{insurerStats.length}</h3>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Con primas en este período</span>
            </div>
          </div>

          {/* Breakdown by Insurer List */}
          <div style={{
            backgroundColor: '#ffffff',
            border: '1.5px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            padding: '1.25rem',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <h4 style={{ margin: '0 0 1rem 0', color: 'var(--primary)', fontSize: '1.05rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <Building size={18} /> Desglose de Comisiones por Aseguradora
            </h4>

            {insurerStats.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {insurerStats.map((stat, i) => {
                  const percentOfTotal = totalCommission > 0 ? ((stat.totalCommission / totalCommission) * 100).toFixed(1) : 0;
                  return (
                    <div
                      key={i}
                      style={{
                        padding: '0.85rem 1rem',
                        backgroundColor: '#faf8f5',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-md)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.45rem'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <strong style={{ fontSize: '0.98rem', color: 'var(--text-main)' }}>{stat.name}</strong>
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginLeft: '0.5rem' }}>
                            ({stat.paymentsCount} cobro{stat.paymentsCount !== 1 ? 's' : ''} · Tasa Promedio: {stat.avgRate}%)
                          </span>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <strong style={{ color: '#166534', fontSize: '1rem' }}>{formatMoney(stat.totalCommission)} DOP</strong>
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block' }}>
                            Prima: {formatMoney(stat.totalPremium)} DOP
                          </span>
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div style={{ width: '100%', height: '6px', backgroundColor: '#e2e8f0', borderRadius: '999px', overflow: 'hidden' }}>
                        <div style={{ width: `${percentOfTotal}%`, height: '100%', backgroundColor: '#9333ea', borderRadius: '999px' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                No hay registros de cobro en el período seleccionado.
              </div>
            )}
          </div>

        </div>

        {/* Footer */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '1.1rem 1.75rem',
          borderTop: '1px solid var(--border)',
          backgroundColor: '#ffffff'
        }}>
          <button
            type="button"
            className="btn"
            onClick={onClose}
            style={{ backgroundColor: '#f1f5f9', fontWeight: '700', padding: '0.65rem 1.25rem' }}
          >
            Cerrar
          </button>

          {onNavigate && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                onClose();
                onNavigate('commissions');
              }}
              style={{
                backgroundColor: '#7e22ce',
                fontWeight: '800',
                padding: '0.65rem 1.4rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem'
              }}
            >
              Ver Reporte Completo &amp; Ajustar Tasas <ArrowRight size={16} />
            </button>
          )}
        </div>

      </div>
    </div>
  );
};

export default QuickCommissionModal;
