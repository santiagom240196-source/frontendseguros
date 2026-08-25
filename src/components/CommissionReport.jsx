import React, { useState, useMemo, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Calendar, PieChart, TrendingUp, Download, FileText, ArrowLeft, User, Settings, CheckCircle, AlertCircle, Loader, CloudUpload, X, ExternalLink, FolderOpen, Briefcase } from 'lucide-react';
import { formatDateToDDMMYYYY, formatMoney } from '../utils/policyHelpers';
import InsurerLogo from './InsurerLogo';
import { useUser } from '../context/UserContext';


// ─── Google Drive Helpers ────────────────────────────────────────────────────

function generateExcelBuffer(insurer, details, period) {
    const wb = XLSX.utils.book_new();
    const totalPremium = details.reduce((s, p) => s + p.premium, 0);
    const totalCommission = details.reduce((s, p) => s + p.commissionAmount, 0);
    const allRows = [
        [`Reporte de Comisiones – ${insurer}`],
        [`Período: ${period}`],
        [`Generado: ${new Date().toLocaleString('es-DO')}`],
        [],
        ['ID Pago', 'Cliente', 'Fecha', 'Prima (RD$)', 'Comisión (RD$)', '% Comisión'],
        ...details.map(p => [
            p.id, p.client, formatDateToDDMMYYYY(p.date),
            p.premium, p.commissionAmount,
            parseFloat((p.commissionAmount / p.premium * 100).toFixed(2))
        ]),
        ['', '', 'TOTAL', totalPremium, totalCommission, '']
    ];
    const ws = XLSX.utils.aoa_to_sheet(allRows);
    ws['!cols'] = [{ wch: 12 }, { wch: 28 }, { wch: 14 }, { wch: 16 }, { wch: 16 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Comisiones');
    return XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
}

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

async function uploadFileToDrive(fileName, fileBuffer, folderId, accessToken) {
    const metadata = { name: fileName, mimeType: XLSX_MIME, parents: [folderId] };
    const fileBlob = new Blob([fileBuffer], { type: XLSX_MIME });
    const formData = new FormData();
    formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    formData.append('file', fileBlob);
    const res = await fetch(
        'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink',
        { method: 'POST', headers: { Authorization: `Bearer ${accessToken}` }, body: formData }
    );
    if (!res.ok) { const err = await res.json(); throw new Error(err?.error?.message || 'Error al subir a Drive'); }
    return res.json();
}

function generatePDFBlob(insurer, details, period) {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const totalPremium = details.reduce((s, p) => s + p.premium, 0);
    const totalCommission = details.reduce((s, p) => s + p.commissionAmount, 0);
    const fmt = (n) => formatMoney(n);

    // Header block
    doc.setFillColor(30, 64, 175);
    doc.rect(0, 0, 297, 28, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18); doc.setFont('helvetica', 'bold');
    doc.text('Santiago Morales y Asociados', 14, 11);
    doc.setFontSize(11); doc.setFont('helvetica', 'normal');
    doc.text(`Reporte de Comisiones – ${insurer}`, 14, 19);
    doc.setFontSize(9);
    doc.text(`Período: ${period}   |   Generado: ${new Date().toLocaleString('es-DO')}`, 14, 25.5);

    // Summary chips
    doc.setTextColor(30, 64, 175);
    doc.setFontSize(10); doc.setFont('helvetica', 'bold');
    doc.text(`Total Prima: ${fmt(totalPremium)}`, 14, 37);
    doc.setTextColor(21, 128, 61);
    doc.text(`Total Comisiones: ${fmt(totalCommission)}`, 110, 37);
    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
    doc.text(`Pagos: ${details.length}`, 210, 37);

    // Table
    autoTable(doc, {
        startY: 42,
        head: [['ID Pago', 'Cliente', 'Fecha', 'Prima (RD$)', 'Comisión (RD$)', '% Comisión']],
        body: [
            ...details.map(p => [
                p.id, p.client, formatDateToDDMMYYYY(p.date),
                fmt(p.premium),
                fmt(p.commissionAmount),
                `${(p.commissionAmount / p.premium * 100).toFixed(1)}%`
            ]),
            ['', '', 'TOTAL', fmt(totalPremium), fmt(totalCommission), '']
        ],
        headStyles: { fillColor: [30, 64, 175], textColor: 255, fontStyle: 'bold', fontSize: 9 },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        footStyles: { fillColor: [241, 245, 249], textColor: [30, 64, 175], fontStyle: 'bold' },
        bodyStyles: { fontSize: 9 },
        columnStyles: {
            0: { cellWidth: 22 },
            1: { cellWidth: 60 },
            2: { cellWidth: 24 },
            3: { halign: 'right', cellWidth: 40 },
            4: { halign: 'right', cellWidth: 40, textColor: [21, 128, 61], fontStyle: 'bold' },
            5: { halign: 'right', cellWidth: 22 }
        },
        didDrawCell: (data) => {
            // Highlight total row
            if (data.row.index === details.length) {
                doc.setFillColor(224, 242, 254);
            }
        },
        margin: { left: 14, right: 14 }
    });

    // Footer
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8); doc.setTextColor(148, 163, 184);
        doc.text(`Página ${i} de ${pageCount}`, 283, 200, { align: 'right' });
    }

    return doc.output('blob');
}

// ─── Component ───────────────────────────────────────────────────────────────

const CommissionReport = ({ payments = [], policies = [] }) => {
    const { isDemo } = useUser();
    const today = new Date().toISOString().split('T')[0];
    const firstOfMonth = new Date();
    firstOfMonth.setDate(1);
    const defaultFrom = firstOfMonth.toISOString().split('T')[0];

    // Date range & Filters
    const [dateFrom, setDateFrom] = useState(defaultFrom);
    const [dateTo, setDateTo] = useState(today);
    const [selectedCartera, setSelectedCartera] = useState('ALL');
    const [selectedInsurer, setSelectedInsurer] = useState(null);
    const [showRatesModal, setShowRatesModal] = useState(false);

    // Drive State
    const [showDriveConfig, setShowDriveConfig] = useState(false);
    const [driveClientId, setDriveClientId] = useState(() => localStorage.getItem('drive_client_id') || '');
    const [driveFolderId, setDriveFolderId] = useState(() => localStorage.getItem('drive_folder_id') || '');
    const [accessToken, setAccessToken] = useState(null);
    const [gisLoaded, setGisLoaded] = useState(false);
    const [uploadStatus, setUploadStatus] = useState({}); // { [insurer]: 'idle'|'uploading'|'done'|'error' }
    const [uploadLinks, setUploadLinks] = useState({}); // { [insurer]: webViewLink }
    const tokenClientRef = useRef(null);

    // Load Google Identity Services script
    useEffect(() => {
        if (document.getElementById('gis-script')) { setGisLoaded(true); return; }
        const script = document.createElement('script');
        script.id = 'gis-script';
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.onload = () => setGisLoaded(true);
        document.head.appendChild(script);
    }, []);

    const saveDriveConfig = () => {
        localStorage.setItem('drive_client_id', driveClientId);
        localStorage.setItem('drive_folder_id', driveFolderId);
        setShowDriveConfig(false);
        setAccessToken(null); // reset auth on config change
    };

    const handleAuthenticate = () => {
        if (!driveClientId) { alert('Por favor configura el Google Client ID primero.'); setShowDriveConfig(true); return; }
        if (!gisLoaded) { alert('Google Identity Services aún se está cargando, intenta en un momento.'); return; }

        tokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
            client_id: driveClientId,
            scope: 'https://www.googleapis.com/auth/drive.file',
            callback: (response) => {
                if (response.error) { alert('Error de autenticación: ' + response.error); return; }
                setAccessToken(response.access_token);
            }
        });
        tokenClientRef.current.requestAccessToken({ prompt: 'consent' });
    };

    const handleUploadInsurer = async (insurer) => {
        if (!accessToken) { alert('Primero autentícate con Google Drive.'); return; }
        if (!driveFolderId) { alert('Configura el ID de la carpeta de Drive.'); setShowDriveConfig(true); return; }

        const details = reportData.byInsurer[insurer]?.details || [];
        const period = formatDateLabel();
        const excelBuffer = generateExcelBuffer(insurer, details, period);
        const safeName = insurer.replace(/[^a-zA-Z0-9ÁÉÍÓÚáéíóúÑñ ]/g, '_');
        const fileName = `Comisiones_${safeName}_${dateFrom || 'all'}_${dateTo || 'all'}.xlsx`;

        setUploadStatus(prev => ({ ...prev, [insurer]: 'uploading' }));
        try {
            const result = await uploadFileToDrive(fileName, excelBuffer, driveFolderId, accessToken);
            setUploadStatus(prev => ({ ...prev, [insurer]: 'done' }));
            setUploadLinks(prev => ({ ...prev, [insurer]: result.webViewLink }));
        } catch (err) {
            console.error(err);
            setUploadStatus(prev => ({ ...prev, [insurer]: 'error' }));
            alert(`Error al subir "${insurer}": ${err.message}`);
        }
    };

    const handleUploadAll = async () => {
        for (const insurer of Object.keys(reportData.byInsurer)) {
            await handleUploadInsurer(insurer);
        }
    };

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

    const setQuickRange = (type) => {
        const d = new Date();
        if (type === 'month') { const f = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0]; setDateFrom(f); setDateTo(today); }
        else if (type === 'prevMonth') { const f = new Date(d.getFullYear(), d.getMonth() - 1, 1).toISOString().split('T')[0]; const t = new Date(d.getFullYear(), d.getMonth(), 0).toISOString().split('T')[0]; setDateFrom(f); setDateTo(t); }
        else if (type === 'year') { setDateFrom(`${d.getFullYear()}-01-01`); setDateTo(today); }
        else if (type === 'all') { setDateFrom(''); setDateTo(''); }
        else if (type === '1q') { const f = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0]; const t = new Date(d.getFullYear(), d.getMonth(), 15).toISOString().split('T')[0]; setDateFrom(f); setDateTo(t); }
        else if (type === '2q') { const f = new Date(d.getFullYear(), d.getMonth(), 16).toISOString().split('T')[0]; const t = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0]; setDateFrom(f); setDateTo(t); }
        else if (type === '1qp') { const f = new Date(d.getFullYear(), d.getMonth() - 1, 1).toISOString().split('T')[0]; const t = new Date(d.getFullYear(), d.getMonth() - 1, 15).toISOString().split('T')[0]; setDateFrom(f); setDateTo(t); }
        else if (type === '2qp') { const f = new Date(d.getFullYear(), d.getMonth() - 1, 16).toISOString().split('T')[0]; const t = new Date(d.getFullYear(), d.getMonth(), 0).toISOString().split('T')[0]; setDateFrom(f); setDateTo(t); }
    };

    const formatDateLabel = () => {
        if (!dateFrom && !dateTo) return 'Todos los períodos';
        const fmt = (d) => { if (!d) return '...'; const [y, m, day] = d.split('-'); return `${day}/${m}/${y}`; };
        return `${fmt(dateFrom)} — ${fmt(dateTo)}`;
    };

    const reportData = useMemo(() => {
        const relevant = payments.filter(p => {
            if (p.status !== 'Paid') return false;
            if (dateFrom && p.date < dateFrom) return false;
            if (dateTo && p.date > dateTo) return false;
            if (selectedCartera !== 'ALL') {
                const policy = policies.find(pol => pol.id === p.policyId);
                const pCartera = policy?.cartera || 'Santiago Morales y Asociados, S.R.L.';
                if (pCartera !== selectedCartera) return false;
            }
            return true;
        });
        const byInsurer = {};
        let totalCommission = 0, totalPremiums = 0;
        relevant.forEach(p => {
            const policy = policies.find(pol => pol.id === p.policyId);
            const insurer = policy ? policy.insurer : 'Otros';
            const premium = p.amountNum || parseFloat(String(p.amount).replace(/[^0-9.]/g, '')) || 0;
            const rate = insurerRates[insurer] || 0.10;
            const commission = premium * rate;
            if (!byInsurer[insurer]) byInsurer[insurer] = { premiums: 0, commission: 0, count: 0, rate, details: [] };
            byInsurer[insurer].premiums += premium;
            byInsurer[insurer].commission += commission;
            byInsurer[insurer].count += 1;
            byInsurer[insurer].details.push({
                ...p,
                client: p.client,
                insurer: insurer,
                premium: premium,
                commissionAmount: commission
            });
            totalCommission += commission;
            totalPremiums += premium;
        });
        return { byInsurer, totalCommission, totalPremiums, count: relevant.length };
    }, [payments, policies, dateFrom, dateTo, selectedCartera, insurerRates]);

    const formatCurrency = (n) => formatMoney(n);

    const handleDownloadExcel = (insurer) => {
        const details = reportData.byInsurer[insurer]?.details || [];
        const buf = generateExcelBuffer(insurer, details, formatDateLabel());
        const blob = new Blob([buf], { type: XLSX_MIME });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url;
        a.download = `Comisiones_${insurer.replace(/\s+/g, '_')}_${dateFrom || 'all'}_${dateTo || 'all'}.xlsx`;
        a.click(); URL.revokeObjectURL(url);
    };

    const handleDownloadPDF = (insurer) => {
        const details = reportData.byInsurer[insurer]?.details || [];
        const blob = generatePDFBlob(insurer, details, formatDateLabel());
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url;
        a.download = `Comisiones_${insurer.replace(/\s+/g, '_')}_${dateFrom || 'all'}_${dateTo || 'all'}.pdf`;
        a.click(); URL.revokeObjectURL(url);
    };

    const UploadIcon = ({ insurer }) => {
        const s = uploadStatus[insurer];
        if (s === 'uploading') return <Loader size={16} className="spin" />;
        if (s === 'done') return <CheckCircle size={16} color="#16a34a" />;
        if (s === 'error') return <AlertCircle size={16} color="#dc2626" />;
        return <CloudUpload size={16} />;
    };

    const handleDownloadAll = (format) => Object.keys(reportData.byInsurer).forEach(ins =>
        format === 'pdf' ? handleDownloadPDF(ins) : handleDownloadExcel(ins)
    );
    const driveConfigured = driveClientId && driveFolderId;

    return (
        <div>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    {selectedInsurer ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <button className="btn" style={{ padding: '0.5rem' }} onClick={() => setSelectedInsurer(null)}><ArrowLeft size={24} /></button>
                            <div>
                                <h2 style={{ fontSize: '2rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.75rem', margin: 0 }}>
                                    <InsurerLogo name={selectedInsurer} size={36} />
                                    <span>{selectedInsurer}</span>
                                </h2>
                                <p style={{ color: 'var(--text-muted)', marginTop: '0.2rem' }}>Detalle de comisiones por cliente</p>
                            </div>
                        </div>
                    ) : (
                        <>
                            <h2 style={{ fontSize: '2rem', color: 'var(--primary)' }}>Reporte de Comisiones</h2>
                            <p style={{ color: 'var(--text-muted)' }}>Cálculo automático por aseguradora. Exporta o sube a Drive.</p>
                        </>
                    )}
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    {/* Drive Auth Status */}
                    {accessToken ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', backgroundColor: '#dcfce7', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem', color: '#166534', fontWeight: '600' }}>
                            <CheckCircle size={16} /> Conectado a Drive
                            <button onClick={() => setAccessToken(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#166534', display: 'flex' }}>
                                <X size={14} />
                            </button>
                        </div>
                    ) : (
                        <button className="btn" onClick={handleAuthenticate}
                            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: driveConfigured ? 'white' : '#f1f5f9', border: '1px solid var(--border)' }}>
                            <img src="https://www.gstatic.com/images/branding/product/1x/drive_2020q4_48dp.png" alt="Drive" style={{ width: 18, height: 18, objectFit: 'contain' }} />
                            Conectar Drive
                        </button>
                    )}
                    <button className="btn" onClick={() => setShowDriveConfig(true)}
                        style={{ padding: '0.5rem', border: '1px solid var(--border)', backgroundColor: 'white', position: 'relative' }}>
                        <Settings size={20} />
                        {!driveConfigured && (
                            <span style={{ position: 'absolute', top: -4, right: -4, width: 10, height: 10, backgroundColor: '#f59e0b', borderRadius: '50%', border: '2px solid white' }} />
                        )}
                    </button>
                    <button className="btn" onClick={() => setShowRatesModal(true)}
                        style={{ padding: '0.5rem 1rem', border: '1px solid var(--border)', backgroundColor: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <PieChart size={20} /> Configurar Tasas %
                    </button>
                    {!selectedInsurer && accessToken && Object.keys(reportData.byInsurer).length > 0 && (
                        <button className="btn btn-primary" onClick={handleUploadAll} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <CloudUpload size={18} /> Subir Todo a Drive
                        </button>
                    )}
                    {!selectedInsurer && (
                        <>
                            <button className="btn" onClick={() => handleDownloadAll('excel')}
                                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', border: '1px solid var(--border)' }}>
                                <Download size={18} /> Excel (Todo)
                            </button>
                            <button className="btn" onClick={() => handleDownloadAll('pdf')}
                                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', border: '1px solid var(--border)', color: '#dc2626' }}>
                                <FileText size={18} /> PDF (Todo)
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Drive Config Modal */}
            {showDriveConfig && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div className="card" style={{ width: '100%', maxWidth: '560px', backgroundColor: 'white' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <img src="https://www.gstatic.com/images/branding/product/1x/drive_2020q4_48dp.png" alt="" style={{ width: 24 }} />
                                Configurar Google Drive
                            </h3>
                            <button onClick={() => setShowDriveConfig(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={24} /></button>
                        </div>

                        {/* Instructions */}
                        <div style={{ backgroundColor: '#f0f9ff', borderRadius: 'var(--radius-sm)', padding: '1rem', marginBottom: '1.5rem', fontSize: '0.875rem', lineHeight: 1.6 }}>
                            <strong style={{ color: 'var(--primary)' }}>📋 Pasos para configurar:</strong>
                            <ol style={{ margin: '0.5rem 0 0 1.2rem', padding: 0 }}>
                                <li>Ve a <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)' }}>Google Cloud Console <ExternalLink size={10} /></a></li>
                                <li>Crea un proyecto y activa la <strong>Google Drive API</strong></li>
                                <li>En "Credenciales" → "Crear credencial" → <strong>ID de cliente OAuth 2.0</strong></li>
                                <li>Tipo: <em>Aplicación web</em> · Origen: <code style={{ fontSize: '0.8rem', backgroundColor: '#e2e8f0', padding: '0 4px', borderRadius: 3 }}>{window.location.origin}</code></li>
                                <li>Copia el <strong>Client ID</strong> y pégalo abajo</li>
                                <li>El <strong>ID de carpeta</strong> de Drive está en la URL al abrir la carpeta: <br /><code style={{ fontSize: '0.8rem', backgroundColor: '#e2e8f0', padding: '2px 4px', borderRadius: 3 }}>drive.google.com/drive/folders/<strong>[ESTE ES EL ID]</strong></code></li>
                            </ol>
                        </div>

                        <div style={{ marginBottom: '1rem' }}>
                            <label style={{ fontWeight: '600', display: 'block', marginBottom: '0.4rem' }}>Google OAuth Client ID</label>
                            <input type="text" placeholder="xxxxxxxx.apps.googleusercontent.com"
                                value={driveClientId} onChange={e => setDriveClientId(e.target.value)} />
                        </div>
                        <div style={{ marginBottom: '1.5rem' }}>
                            <label style={{ fontWeight: '600', display: 'block', marginBottom: '0.4rem' }}>
                                <FolderOpen size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                                ID de Carpeta en Google Drive
                            </label>
                            <input type="text" placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs"
                                value={driveFolderId} onChange={e => setDriveFolderId(e.target.value)} />
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                                Los reportes Excel (.xlsx) de cada aseguradora se guardarán en esta carpeta.
                            </p>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                            <button className="btn" onClick={() => setShowDriveConfig(false)} style={{ backgroundColor: '#f1f5f9' }}>Cancelar</button>
                            <button className="btn btn-primary" onClick={saveDriveConfig}>Guardar Configuración</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Date Range & Cartera Selector */}
            {!selectedInsurer && (
                <div className="card" style={{ padding: '1rem 1.5rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Briefcase size={18} color="var(--primary)" />
                        <select
                            value={selectedCartera}
                            onChange={(e) => setSelectedCartera(e.target.value)}
                            style={{
                                padding: '0.45rem 0.8rem',
                                borderRadius: 'var(--radius-sm)',
                                border: selectedCartera !== 'ALL' ? '1.5px solid #2563eb' : '1px solid var(--border)',
                                fontSize: '0.88rem',
                                fontWeight: '700',
                                backgroundColor: selectedCartera !== 'ALL' ? '#eff6ff' : 'white',
                                color: selectedCartera !== 'ALL' ? '#1d4ed8' : 'var(--text-main)',
                                cursor: 'pointer'
                            }}
                        >
                            <option value="ALL">💼 Todas las Carteras</option>
                            <option value="Santiago Morales y Asociados, S.R.L.">💼 Santiago Morales y Asoc.</option>
                            <option value="Raquel Rodríguez">💼 Raquel Rodríguez</option>
                        </select>
                    </div>

                    <div style={{ height: '24px', width: '1px', backgroundColor: 'var(--border)' }} />

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Calendar size={18} color="var(--primary)" style={{ flexShrink: 0 }} />
                        <span style={{ fontWeight: '600', fontSize: '0.9rem', whiteSpace: 'nowrap' }}>Período:</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                                style={{ padding: '0.4rem 0.6rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: '0.88rem' }} />
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>hasta</span>
                            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                                style={{ padding: '0.4rem 0.6rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: '0.88rem' }} />
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginLeft: 'auto' }}>
                        {[
                            { label: '1ra Q. (1-15)', type: '1q' },
                            { label: '2da Q. (16-30)', type: '2q' },
                            { label: '1ra Q. Ant.', type: '1qp' },
                            { label: '2da Q. Ant.', type: '2qp' },
                            { label: 'Este Mes', type: 'month' },
                            { label: 'Mes Ant.', type: 'prevMonth' },
                            { label: 'Todo', type: 'all' },
                        ].map(({ label, type }) => (
                            <button key={type} className="btn" onClick={() => setQuickRange(type)}
                                style={{ fontSize: '0.78rem', padding: '0.35rem 0.6rem', backgroundColor: '#f1f5f9', border: '1px solid var(--border)' }}>
                                {label}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {!selectedInsurer ? (
                <>
                    {/* Summary Cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                        <div className="card" style={{ background: 'linear-gradient(135deg, var(--primary), #1e40af)', color: 'white' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                                <div>
                                    <p style={{ opacity: 0.9, marginBottom: '0.25rem' }}>Total Comisiones Estimadas</p>
                                    <h3 style={{ fontSize: '2.5rem', color: '#fbbf24' }}>{formatCurrency(reportData.totalCommission)}</h3>
                                </div>
                                <div style={{ padding: '0.75rem', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: '50%' }}>
                                    <TrendingUp size={32} />
                                </div>
                            </div>
                            <p style={{ fontSize: '0.9rem', opacity: 0.8 }}>
                                Basado en {formatCurrency(reportData.totalPremiums)} de primas cobradas
                            </p>
                        </div>
                        <div className="card">
                            <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)' }}>
                                <Calendar size={20} /> Período Seleccionado
                            </h3>
                            <p style={{ fontSize: '1.2rem', fontWeight: '600', color: 'var(--text-main)' }}>{formatDateLabel()}</p>
                            <p style={{ fontSize: '1rem', color: 'var(--primary)', marginTop: '0.5rem' }}>
                                {reportData.count} pago(s) · {Object.keys(reportData.byInsurer).length} aseguradora(s)
                            </p>
                            {accessToken && (
                                <p style={{ fontSize: '0.8rem', color: '#166534', marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                    <CheckCircle size={13} /> Drive conectado — listo para subir
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Breakdown Table */}
                    <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
                        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', gap: '1rem', alignItems: 'center', backgroundColor: '#f0f9ff' }}>
                            <PieChart size={20} color="var(--primary)" />
                            <h3 style={{ fontSize: '1.25rem' }}>Desglose por Aseguradora</h3>
                            <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>
                                Click en la fila para ver detalles
                            </span>
                        </div>

                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid var(--border)' }}>
                                        <th style={{ padding: '1rem', textAlign: 'left', color: 'var(--text-muted)' }}>Aseguradora</th>
                                        <th style={{ padding: '1rem', textAlign: 'right', color: 'var(--text-muted)' }}>Pagos</th>
                                        <th style={{ padding: '1rem', textAlign: 'right', color: 'var(--text-muted)' }}>Prima Total</th>
                                        <th style={{ padding: '1rem', textAlign: 'right', color: 'var(--text-muted)' }}>% Comisión</th>
                                        <th style={{ padding: '1rem', textAlign: 'right', color: 'var(--text-muted)' }}>Comisión</th>
                                        <th style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)' }}>Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {Object.keys(reportData.byInsurer).length > 0 ? (
                                        Object.entries(reportData.byInsurer).map(([insurer, data]) => {
                                            const status = uploadStatus[insurer] || 'idle';
                                            const link = uploadLinks[insurer];
                                            return (
                                                <tr key={insurer} className="hover-row"
                                                    style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer' }}
                                                    onClick={() => setSelectedInsurer(insurer)}>
                                                    <td style={{ padding: '1rem' }}>
                                                        <InsurerLogo name={insurer} size={24} showName={true} textStyle={{ color: 'var(--primary)', fontWeight: '600' }} />
                                                    </td>
                                                    <td style={{ padding: '1rem', textAlign: 'right' }}>{data.count}</td>
                                                    <td style={{ padding: '1rem', textAlign: 'right' }}>{formatCurrency(data.premiums)}</td>
                                                    <td style={{ padding: '1rem', textAlign: 'right' }}>{parseFloat((data.rate * 100).toFixed(2))}%</td>
                                                    <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 'bold', color: 'var(--success)' }}>
                                                        {formatCurrency(data.commission)}
                                                    </td>
                                                    <td style={{ padding: '0.75rem', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                                                        <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center' }}>
                                                            {/* Download Excel */}
                                                            <button title="Descargar Excel" className="btn"
                                                                onClick={() => handleDownloadExcel(insurer)}
                                                                style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                                                                <Download size={14} />
                                                            </button>
                                                            {/* Download PDF */}
                                                            <button title="Descargar PDF" className="btn"
                                                                onClick={() => handleDownloadPDF(insurer)}
                                                                style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem', color: '#dc2626', border: '1px solid var(--border)' }}>
                                                                <FileText size={14} />
                                                            </button>

                                                            {/* Upload to Drive */}
                                                            <button title={status === 'done' ? 'Subido — clic para abrir' : 'Subir a Google Drive'}
                                                                className="btn"
                                                                onClick={() => status === 'done' && link ? window.open(link, '_blank') : handleUploadInsurer(insurer)}
                                                                disabled={status === 'uploading'}
                                                                style={{
                                                                    padding: '0.4rem 0.6rem', fontSize: '0.8rem',
                                                                    border: '1px solid var(--border)',
                                                                    backgroundColor: status === 'done' ? '#dcfce7' : status === 'error' ? '#fee2e2' : accessToken ? '#f0f9ff' : '#f1f5f9',
                                                                    color: status === 'done' ? '#166534' : status === 'error' ? '#dc2626' : 'var(--text-muted)',
                                                                    cursor: status === 'uploading' ? 'wait' : 'pointer'
                                                                }}>
                                                                <UploadIcon insurer={insurer} />
                                                            </button>

                                                            {status === 'done' && link && (
                                                                <a href={link} target="_blank" rel="noopener noreferrer"
                                                                    title="Ver en Drive" className="btn"
                                                                    style={{ padding: '0.4rem 0.6rem', border: '1px solid var(--border)', color: '#166534', display: 'flex', alignItems: 'center' }}>
                                                                    <ExternalLink size={14} />
                                                                </a>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    ) : (
                                        <tr>
                                            <td colSpan="6" style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                                                No hay pagos registrados para el período seleccionado.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                                {Object.keys(reportData.byInsurer).length > 0 && (
                                    <tfoot>
                                        <tr style={{ backgroundColor: '#f1f5f9' }}>
                                            <td style={{ padding: '1rem', fontWeight: 'bold' }}>TOTALES</td>
                                            <td style={{ padding: '1rem', textAlign: 'right' }}>{Object.values(reportData.byInsurer).reduce((s, d) => s + d.count, 0)}</td>
                                            <td style={{ padding: '1rem', textAlign: 'right', fontWeight: '600' }}>{formatCurrency(reportData.totalPremiums)}</td>
                                            <td style={{ padding: '1rem', textAlign: 'right' }}>—</td>
                                            <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 'bold', color: 'var(--primary)', fontSize: '1.1rem' }}>
                                                {formatCurrency(reportData.totalCommission)}
                                            </td>
                                            <td />
                                        </tr>
                                    </tfoot>
                                )}
                            </table>
                        </div>
                    </div>
                </>
            ) : (
                /* Drill-down View */
                <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
                    <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                        <User size={20} color="var(--primary)" />
                        <h3 style={{ fontSize: '1.25rem' }}>Pagos — {selectedInsurer}</h3>
                        <span style={{ marginLeft: 'auto', fontSize: '0.85rem', color: 'var(--text-muted)' }}>📅 {formatDateLabel()}</span>
                        <button className="btn" onClick={() => handleDownloadExcel(selectedInsurer)}
                            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', border: '1px solid var(--border)', fontSize: '0.85rem' }}>
                            <Download size={16} /> Excel
                        </button>
                        <button className="btn" onClick={() => handleDownloadPDF(selectedInsurer)}
                            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', border: '1px solid var(--border)', fontSize: '0.85rem', color: '#dc2626' }}>
                            <FileText size={16} /> PDF
                        </button>
                        {accessToken && (
                            <button className="btn" onClick={() => handleUploadInsurer(selectedInsurer)}
                                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#f0f9ff', border: '1px solid var(--border)', fontSize: '0.85rem' }}>
                                <CloudUpload size={16} /> Subir a Drive
                            </button>
                        )}
                    </div>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid var(--border)' }}>
                                    <th style={{ padding: '1rem', textAlign: 'left', color: 'var(--text-muted)' }}>Cliente</th>
                                    <th style={{ padding: '1rem', textAlign: 'left', color: 'var(--text-muted)' }}>Fecha Pago</th>
                                    <th style={{ padding: '1rem', textAlign: 'left', color: 'var(--text-muted)' }}>ID Pago</th>
                                    <th style={{ padding: '1rem', textAlign: 'right', color: 'var(--text-muted)' }}>Prima Pagada</th>
                                    <th style={{ padding: '1rem', textAlign: 'right', color: 'var(--text-muted)' }}>Comisión Generada</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(reportData.byInsurer[selectedInsurer]?.details || []).map(p => (
                                    <tr key={p.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                        <td style={{ padding: '1rem', fontWeight: '600' }}>{p.client}</td>
                                        <td style={{ padding: '1rem' }}>{formatDateToDDMMYYYY(p.date)}</td>
                                        <td style={{ padding: '1rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>{p.id}</td>
                                        <td style={{ padding: '1rem', textAlign: 'right' }}>{formatCurrency(p.premium)}</td>
                                        <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 'bold', color: 'var(--success)' }}>
                                            {formatCurrency(p.commissionAmount)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            {reportData.byInsurer[selectedInsurer] && (
                                <tfoot>
                                    <tr style={{ backgroundColor: '#f1f5f9' }}>
                                        <td colSpan="3" style={{ padding: '1rem', fontWeight: 'bold' }}>SUBTOTAL</td>
                                        <td style={{ padding: '1rem', textAlign: 'right', fontWeight: '600' }}>
                                            {formatCurrency(reportData.byInsurer[selectedInsurer].premiums)}
                                        </td>
                                        <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 'bold', color: 'var(--primary)', fontSize: '1.1rem' }}>
                                            {formatCurrency(reportData.byInsurer[selectedInsurer].commission)}
                                        </td>
                                    </tr>
                                </tfoot>
                            )}
                        </table>
                    </div>
                </div>
            )}

            {/* Commission Rates Modal */}
            {showRatesModal && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
                    <div className="card" style={{ width: '100%', maxWidth: '500px', backgroundColor: 'white', maxHeight: '90vh', overflowY: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Settings size={22} color="var(--primary)" /> Tasas de Comisión por Compañía
                            </h3>
                            <button onClick={() => setShowRatesModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                                <X size={24} />
                            </button>
                        </div>
                        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                            Fije el porcentaje fijo de comisión correspondiente a cada aseguradora para los cálculos de reportes.
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
                            {Object.keys(insurerRates).map(insurer => (
                                <div key={insurer} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <InsurerLogo name={insurer} size={24} showName={true} textStyle={{ fontWeight: '500', fontSize: '0.95rem' }} />
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <input
                                            type="number"
                                            min="0"
                                            max="100"
                                            step="any"
                                            defaultValue={insurerRates[insurer] !== undefined ? parseFloat((insurerRates[insurer] * 100).toFixed(4)) : ''}
                                            key={`${insurer}_${insurerRates[insurer]}`}
                                            onChange={e => {
                                                const val = parseFloat(e.target.value) / 100;
                                                if (!isNaN(val) && val >= 0 && val <= 1) {
                                                    const updated = { ...insurerRates, [insurer]: val };
                                                    setInsurerRates(updated);
                                                    if (!isDemo) {
                                                        localStorage.setItem('insurer_commission_rates', JSON.stringify(updated));
                                                    }
                                                }
                                            }}
                                            style={{ width: '85px', padding: '0.35rem 0.5rem', textAlign: 'right', fontWeight: '600' }}
                                        />
                                        <span style={{ fontWeight: '600' }}>%</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <button className="btn btn-primary" onClick={() => setShowRatesModal(false)}>
                                Aceptar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                .hover-row:hover { background-color: #f1f5f9 !important; }
                @keyframes spin { to { transform: rotate(360deg); } }
                .spin { animation: spin 1s linear infinite; }
            `}</style>
        </div>
    );
};

export default CommissionReport;
