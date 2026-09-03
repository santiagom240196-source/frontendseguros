import React, { useState, useMemo, useEffect } from 'react';
import { Search, DollarSign, Plus, Download, CheckCircle, Clock, AlertTriangle, XCircle, Calendar, Printer, FileText, ArrowUpDown, ArrowUp, ArrowDown, Zap, Loader2, Users, Layers, Trash2, Check, RefreshCw, Sparkles, Edit3, Paperclip, Eye, Upload, ShieldCheck, ShieldAlert, FileCheck } from 'lucide-react';
import { getPolicyPaymentStats, formatDateToDDMMYYYY, formatMoney, getNextRenewalDate } from '../utils/policyHelpers';
import InsurerLogo from './InsurerLogo';
import ReceiptModal from './ReceiptModal';
import DocumentViewerModal from './DocumentViewerModal';
import { generateReceiptPdfDataUri } from '../services/receiptPdfService';
import { fileToDataUri, formatFileSize } from '../services/documentsService';

import { useUser } from '../context/UserContext';
import { insertCobroHasura, updateCobroHasura, deleteCobroHasura, updatePolicyHasura, insertMovimientoHasura } from '../services/hasuraService';

const PaymentManagement = ({ policies = [], setPolicies, payments = [], setPayments, clients = [], shouldOpenPaymentModal, onDetailedActionHandled }) => {
    const { isDemo, currentUser } = useUser();
    const today = new Date().toISOString().split('T')[0];

    // Permiso estricto de edición: Solo Santiago Morales / Administrador Principal
    const canEditPayments = Boolean(
        currentUser?.isPrimary || 
        currentUser?.username?.toLowerCase() === 'santiagom2401' || 
        currentUser?.id === 'santiagom2401' ||
        currentUser?.role?.includes('Administrador')
    );

    // Default date range: first day of current month → today
    const firstOfMonth = new Date();
    firstOfMonth.setDate(1);
    const defaultFrom = firstOfMonth.toISOString().split('T')[0];

    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [activeFilter, setActiveFilter] = useState('All'); // 'All', 'Paid', 'Pending', 'Overdue'
    const [dateFrom, setDateFrom] = useState(defaultFrom);
    const [dateTo, setDateTo] = useState(today);

    // Receipt Modal State
    const [selectedReceiptPayment, setSelectedReceiptPayment] = useState(null);
    const [showReceiptModal, setShowReceiptModal] = useState(false);

    // Document Viewer Modal State
    const [selectedViewingDoc, setSelectedViewingDoc] = useState(null);
    const [showDocViewer, setShowDocViewer] = useState(false);

    // Document Attachment State for Create Modal
    const [singleAttachedDocs, setSingleAttachedDocs] = useState([]);
    const [multiAttachedDocs, setMultiAttachedDocs] = useState([]);

    // Edit Payment Modal State (Santiago Only)
    const [editingPayment, setEditingPayment] = useState(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editFormData, setEditFormData] = useState({
        amount: '',
        date: today,
        type: 'Cuota Mensual',
        customType: '',
        paymentMethod: 'Efectivo',
        reference: '',
        status: 'Paid',
        notes: ''
    });
    const [editAttachedDocs, setEditAttachedDocs] = useState([]);
    const [isSavingEdit, setIsSavingEdit] = useState(false);

    // Modal Mode: 'single' (1 Póliza) vs 'multi' (Multipóliza / Multicliente)
    const [paymentMode, setPaymentMode] = useState('single');

    // Single Payment State
    const [newPayment, setNewPayment] = useState({
        client: '', policy: '', date: today,
        amount: '', policyAmount: '', type: 'Cuota Mensual',
        customType: '', status: 'Paid', selectedPolicyId: '',
        paymentMethod: 'Efectivo', reference: '', notes: ''
    });
    const [policySearch, setPolicySearch] = useState('');
    const [showPolicyResults, setShowPolicyResults] = useState(false);

    // Multi-Policy / Multi-Client Payment State
    const [multiPaymentForm, setMultiPaymentForm] = useState({
        totalAmount: '',
        payerName: '',
        clientDoc: '',
        date: today,
        paymentMethod: 'Transferencia',
        reference: '',
        type: 'Pago Consolidado Multipóliza',
        notes: ''
    });
    const [selectedPoliciesForBatch, setSelectedPoliciesForBatch] = useState([]);
    const [batchPolicySearch, setBatchPolicySearch] = useState('');
    const [batchClientFilter, setBatchClientFilter] = useState('ALL');
    const [showBatchPolicyResults, setShowBatchPolicyResults] = useState(false);
    const [isSavingMulti, setIsSavingMulti] = useState(false);

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
        
        // Buscar si el cliente tiene cobro automático configurado
        const clientNameNorm = (policy.client || '').trim().toLowerCase();
        const relClient = clients.find(c => 
            (policy.clienteId && String(c.id) === String(policy.clienteId)) ||
            (c.name && c.name.trim().toLowerCase() === clientNameNorm)
        );

        let defaultMethod = 'Efectivo';
        if (relClient?.cobroAutomatico) {
            defaultMethod = (relClient.metodoCobroAutomatico || '').includes('Tarjeta') ? 'Tarjeta' :
                            (relClient.metodoCobroAutomatico || '').includes('Cuenta') ? 'Transferencia' : 'Tarjeta';
        }

        setNewPayment(prev => ({
            ...prev,
            selectedPolicyId: policy.id,
            client: policy.client,
            policy: `${policy.type} - ${policy.insurer} (${policy.id})`,
            policyAmount: formattedOwed,
            amount: '',
            paymentMethod: defaultMethod
        }));
        setPolicySearch(`${policy.client} - ${policy.id} (${policy.type})`);
        setShowPolicyResults(false);
    };

    const filteredPolicies = policies.filter(p =>
        (p.client?.toLowerCase() || '').includes(policySearch.toLowerCase()) ||
        (p.id?.toLowerCase() || '').includes(policySearch.toLowerCase()) ||
        (p.type?.toLowerCase() || '').includes(policySearch.toLowerCase())
    );

    // Multi-policy helpers
    const handleAddPolicyToBatch = (policy) => {
        if (!policy) return;
        if (selectedPoliciesForBatch.some(p => p.id === policy.id)) {
            alert('Esta póliza ya está agregada en la lista de distribución.');
            return;
        }
        const stats = getPolicyPaymentStats(policy, payments);
        const defaultAmount = stats.totalOwed > 0 ? stats.totalOwed : (parseFloat(String(policy.amount || '0').replace(/[^0-9.]/g, '')) || 0);

        const newEntry = {
            id: policy.id,
            rawId: policy.rawId,
            clienteId: policy.clienteId,
            client: policy.client || 'Cliente General',
            insurer: policy.insurer || 'La Colonial',
            type: policy.type || 'Póliza',
            totalOwed: stats.totalOwed,
            amountToPay: defaultAmount
        };

        setSelectedPoliciesForBatch(prev => [...prev, newEntry]);
        setBatchPolicySearch('');
        setShowBatchPolicyResults(false);

        // Si el pagador está vacío, sugerir el nombre de este cliente
        if (!multiPaymentForm.payerName) {
            setMultiPaymentForm(prev => ({ ...prev, payerName: policy.client || '' }));
        }
    };

    const handleRemovePolicyFromBatch = (policyId) => {
        setSelectedPoliciesForBatch(prev => prev.filter(p => p.id !== policyId));
    };

    const handleUpdateBatchAmount = (policyId, val) => {
        const cleanVal = parseFloat(String(val).replace(/[^0-9.]/g, '')) || 0;
        setSelectedPoliciesForBatch(prev => prev.map(p => {
            if (p.id === policyId) {
                return { ...p, amountToPay: cleanVal };
            }
            return p;
        }));
    };

    const handleSetFullOwedForPolicy = (policyId) => {
        setSelectedPoliciesForBatch(prev => prev.map(p => {
            if (p.id === policyId) {
                return { ...p, amountToPay: p.totalOwed > 0 ? p.totalOwed : 0 };
            }
            return p;
        }));
    };

    const handleAddAllPoliciesOfClient = (clientName) => {
        if (!clientName || clientName === 'ALL') return;
        const clientNameNorm = clientName.trim().toLowerCase();
        const clientPols = policies.filter(p => (p.client || '').trim().toLowerCase() === clientNameNorm);
        
        const toAdd = [];
        clientPols.forEach(p => {
            if (!selectedPoliciesForBatch.some(item => item.id === p.id)) {
                const stats = getPolicyPaymentStats(p, payments);
                toAdd.push({
                    id: p.id,
                    rawId: p.rawId,
                    clienteId: p.clienteId,
                    client: p.client || clientName,
                    insurer: p.insurer || 'La Colonial',
                    type: p.type || 'Póliza',
                    totalOwed: stats.totalOwed,
                    amountToPay: stats.totalOwed > 0 ? stats.totalOwed : (parseFloat(String(p.amount || '0').replace(/[^0-9.]/g, '')) || 0)
                });
            }
        });

        if (toAdd.length > 0) {
            setSelectedPoliciesForBatch(prev => [...prev, ...toAdd]);
            if (!multiPaymentForm.payerName) {
                setMultiPaymentForm(prev => ({ ...prev, payerName: clientName }));
            }
        }
    };

    // Auto-distribuir monto total entre las pólizas seleccionadas
    const handleAutoDistributeBatch = () => {
        const totalReceived = parseFloat(String(multiPaymentForm.totalAmount).replace(/[^0-9.]/g, '')) || 0;
        if (totalReceived <= 0 || selectedPoliciesForBatch.length === 0) return;

        let remaining = totalReceived;
        const updated = selectedPoliciesForBatch.map(p => {
            if (remaining <= 0) {
                return { ...p, amountToPay: 0 };
            }
            const needed = p.totalOwed > 0 ? p.totalOwed : remaining;
            const allocated = Math.min(needed, remaining);
            remaining -= allocated;
            return { ...p, amountToPay: allocated };
        });

        // Si aún queda restante y no todas están saldadas, asignarlo a la última o proporcionalmente
        if (remaining > 0 && updated.length > 0) {
            updated[updated.length - 1].amountToPay += remaining;
        }

        setSelectedPoliciesForBatch(updated);
    };

    // Saldar todas y sincronizar monto total recibido
    const handleSetAllFullOwed = () => {
        let sum = 0;
        const updated = selectedPoliciesForBatch.map(p => {
            const val = p.totalOwed > 0 ? p.totalOwed : 0;
            sum += val;
            return { ...p, amountToPay: val };
        });
        setSelectedPoliciesForBatch(updated);
        setMultiPaymentForm(prev => ({ ...prev, totalAmount: sum }));
    };

    const totalBatchReceivedNum = parseFloat(String(multiPaymentForm.totalAmount || '0').replace(/[^0-9.]/g, '')) || 0;
    const totalBatchAllocatedNum = selectedPoliciesForBatch.reduce((sum, p) => sum + (parseFloat(String(p.amountToPay || '0').replace(/[^0-9.]/g, '')) || 0), 0);
    const batchDifference = totalBatchReceivedNum - totalBatchAllocatedNum;

    // Single Payment Handler
    const handleAddPayment = async (e) => {
        e.preventDefault();
        const paymentId = `REC-${String(payments.length + 1).padStart(5, '0')}`;
        const cleanAmount = parseFloat(String(newPayment.amount).replace(/[^0-9.]/g, '')) || 0;
        
        const matchedPolicy = policies.find(p => p.id === newPayment.selectedPolicyId);

        const policyStats = matchedPolicy ? getPolicyPaymentStats(matchedPolicy, payments) : null;
        const totalOwedBefore = policyStats ? policyStats.totalOwed : (matchedPolicy?.amount || 0);
        const remainingBalance = Math.max(0, totalOwedBefore - cleanAmount);

        // Generar el documento PDF del recibo para almacenarlo en la base de datos
        let pdfDataUri = null;
        try {
            pdfDataUri = await generateReceiptPdfDataUri(
                {
                    id: paymentId,
                    client: newPayment.client,
                    date: newPayment.date,
                    amount: formatMoney(cleanAmount),
                    amountNum: cleanAmount,
                    status: newPayment.status,
                    type: newPayment.type === 'Otro' ? (newPayment.customType || 'Otro') : newPayment.type,
                    paymentMethod: newPayment.paymentMethod || 'Efectivo',
                    policyId: newPayment.selectedPolicyId,
                    policy: newPayment.policy,
                    reference: newPayment.reference || '',
                    remainingBalance: remainingBalance,
                    totalPremium: matchedPolicy?.amount || 0
                },
                matchedPolicy || {},
                {}
            );
        } catch (err) {
            console.warn('No se pudo generar data URI del recibo previo:', err);
        }

        const paymentToAdd = {
            id: paymentId,
            polizaId: matchedPolicy ? (matchedPolicy.rawId || matchedPolicy.id) : null,
            clienteId: matchedPolicy ? matchedPolicy.clienteId : null,
            client: newPayment.client,
            policy: newPayment.policy,
            policyId: newPayment.selectedPolicyId,
            date: newPayment.date,
            amount: formatMoney(cleanAmount),
            amountNum: cleanAmount,
            remainingBalance: remainingBalance,
            totalPremium: matchedPolicy?.amount || 0,
            status: newPayment.status,
            type: newPayment.type === 'Otro' ? (newPayment.customType || 'Otro') : newPayment.type,
            paymentMethod: newPayment.paymentMethod || 'Efectivo',
            reference: newPayment.reference || '',
            receiptUrl: pdfDataUri,
            comprobante: singleAttachedDocs.length > 0 ? singleAttachedDocs[0].dataUri : pdfDataUri,
            attachedDocs: singleAttachedDocs
        };

        if (setPayments) {
            setPayments([paymentToAdd, ...payments]);
        }

        // REGLA DE NEGOCIO: Si la póliza estaba cancelada, reabrirla automáticamente
        if (matchedPolicy && (matchedPolicy.status === 'Cancelada' || matchedPolicy.status === 'Cancelled')) {
            const todayStr = new Date().toISOString().split('T')[0];
            const nextEndDate = getNextRenewalDate(todayStr, matchedPolicy.renewalFrequency || 'Anual');
            const reactivatedPolicy = {
                ...matchedPolicy,
                status: 'Active',
                lastRenewalDate: todayStr,
                endDate: nextEndDate,
                renewal: nextEndDate,
                movements: [
                    ...(matchedPolicy.movements || []),
                    {
                        id: (matchedPolicy.movements?.length || 0) + 1,
                        date: todayStr,
                        type: 'Reapertura Automática por Pago',
                        description: `Póliza reactivada automáticamente tras registrarse cobro ${paymentId} (${formatMoney(cleanAmount)}). Vigencia extendida hasta ${formatDateToDDMMYYYY(nextEndDate)}.`,
                        evidence: 'Recibo ' + paymentId
                    }
                ]
            };

            if (setPolicies) {
                setPolicies(prev => prev.map(p => p.id === matchedPolicy.id ? reactivatedPolicy : p));
            }
        }

        if (!isDemo) {
            try {
                await insertCobroHasura(paymentToAdd, isDemo);

                if (matchedPolicy && (matchedPolicy.status === 'Cancelada' || matchedPolicy.status === 'Cancelled')) {
                    const todayStr = new Date().toISOString().split('T')[0];
                    const nextEndDate = getNextRenewalDate(todayStr, matchedPolicy.renewalFrequency || 'Anual');

                    await updatePolicyHasura(matchedPolicy.rawId || matchedPolicy.id, {
                        status: 'Active',
                        vigencia_fin: nextEndDate,
                        vigencia_inicio: todayStr
                    }, isDemo);

                    await insertMovimientoHasura({
                        polizaId: matchedPolicy.rawId || matchedPolicy.id,
                        date: todayStr,
                        type: 'Reapertura Automática por Pago',
                        description: `Póliza reactivada automáticamente tras registrarse cobro ${paymentId} (${formatMoney(cleanAmount)}).`,
                        evidence: 'Recibo ' + paymentId
                    }, isDemo);
                }
            } catch (err) {
                console.warn('Failed to insert cobro in Hasura:', err);
            }
        }

        setShowModal(false);
        setSingleAttachedDocs([]);
        setNewPayment({ 
            client: '', policy: '', date: today, amount: '', 
            policyAmount: '', type: 'Cuota Mensual', customType: '', 
            status: 'Paid', selectedPolicyId: '', paymentMethod: 'Efectivo', reference: '', notes: ''
        });
        setPolicySearch('');

        // Abrir automáticamente el visor de Recibo PDF para imprimir o descargar
        setSelectedReceiptPayment(paymentToAdd);
        setShowReceiptModal(true);
    };

    // Multi-Payment Handler
    const handleSaveMultiPayment = async (e) => {
        e.preventDefault();
        if (selectedPoliciesForBatch.length === 0) {
            alert('Debes agregar al menos una póliza para distribuir el pago.');
            return;
        }
        if (totalBatchReceivedNum <= 0) {
            alert('Debes ingresar un monto total recibido mayor a 0.');
            return;
        }
        if (Math.abs(batchDifference) > 0.01) {
            const proceed = window.confirm(`Existe una diferencia de ${formatMoney(Math.abs(batchDifference))} entre el total recibido y el total asignado a las pólizas.\n\n¿Deseas continuar y registrar el pago con esta distribución?`);
            if (!proceed) return;
        }

        setIsSavingMulti(true);
        try {
            const masterPaymentId = `REC-M${String(payments.length + 1).padStart(5, '0')}`;
            const payerTitle = multiPaymentForm.payerName || (selectedPoliciesForBatch.length === 1 ? selectedPoliciesForBatch[0].client : 'Pago Consolidado Multicliente');

            const masterPaymentObj = {
                id: masterPaymentId,
                isMultiPolicy: true,
                isMasterPayment: true,
                client: payerTitle,
                payerName: payerTitle,
                clientDoc: multiPaymentForm.clientDoc || 'Varios',
                policy: `Consolidado (${selectedPoliciesForBatch.length} Pólizas)`,
                policyId: selectedPoliciesForBatch.map(p => p.id).join(', '),
                date: multiPaymentForm.date,
                amount: formatMoney(totalBatchReceivedNum),
                amountNum: totalBatchReceivedNum,
                status: 'Paid',
                type: multiPaymentForm.type || 'Pago Consolidado Multipóliza',
                paymentMethod: multiPaymentForm.paymentMethod || 'Transferencia',
                reference: multiPaymentForm.reference || '',
                notes: multiPaymentForm.notes || '',
                items: selectedPoliciesForBatch.map(item => ({
                    client: item.client,
                    clienteId: item.clienteId,
                    policyId: item.id,
                    insurer: item.insurer,
                    type: item.type,
                    concept: multiPaymentForm.type || 'Cuota',
                    amount: formatMoney(item.amountToPay),
                    amountNum: parseFloat(item.amountToPay) || 0
                }))
            };

            // Generar PDF Oficial Consolidado
            let masterPdfDataUri = null;
            try {
                masterPdfDataUri = await generateReceiptPdfDataUri(masterPaymentObj, {}, {});
                masterPaymentObj.receiptUrl = masterPdfDataUri;
                masterPaymentObj.comprobante = masterPdfDataUri;
            } catch (err) {
                console.warn('Error generando PDF de recibo consolidado:', err);
            }

            // Generar pagos individuales para cada póliza (con recibo específico de esa póliza)
            const subPayments = [];
            for (let idx = 0; idx < selectedPoliciesForBatch.length; idx++) {
                const item = selectedPoliciesForBatch[idx];
                const allocAmount = parseFloat(item.amountToPay) || 0;
                const subPaymentId = `${masterPaymentId}-${idx + 1}`;

                const subPaymentData = {
                    id: subPaymentId,
                    masterReceiptId: masterPaymentId,
                    isMultiPolicy: true,
                    isSubPayment: true,
                    polizaId: item.rawId || item.id,
                    clienteId: item.clienteId,
                    client: item.client,
                    policy: `${item.type} - ${item.insurer} (${item.id})`,
                    policyId: item.id,
                    insurer: item.insurer,
                    type: multiPaymentForm.type || 'Cuota / Pago Múltiple',
                    date: multiPaymentForm.date,
                    amount: formatMoney(allocAmount),
                    amountNum: allocAmount,
                    status: 'Paid',
                    paymentMethod: multiPaymentForm.paymentMethod || 'Transferencia',
                    reference: multiPaymentForm.reference || '',
                    notes: `Pago Múltiple (Recibo Maestro ${masterPaymentId}) · Pagador: ${payerTitle}`,
                    masterDetails: {
                        masterId: masterPaymentId,
                        totalAmount: totalBatchReceivedNum,
                        payerName: payerTitle,
                        totalPolicies: selectedPoliciesForBatch.length
                    }
                };

                // Generar PDF individual para esta póliza específica
                let individualPdfDataUri = null;
                try {
                    individualPdfDataUri = await generateReceiptPdfDataUri(
                        subPaymentData,
                        { id: item.id, insurer: item.insurer, type: item.type, client: item.client },
                        {}
                    );
                } catch (err) {
                    console.warn(`Error generando recibo individual para póliza ${item.id}:`, err);
                }

                subPaymentData.receiptUrl = individualPdfDataUri || masterPdfDataUri;
                subPaymentData.comprobante = multiAttachedDocs.length > 0 ? multiAttachedDocs[0].dataUri : (individualPdfDataUri || masterPdfDataUri);
                subPaymentData.attachedDocs = multiAttachedDocs;
                subPaymentData.individualReceiptUrl = individualPdfDataUri;
                subPaymentData.masterReceiptUrl = masterPdfDataUri;

                subPayments.push(subPaymentData);
            }

            if (multiAttachedDocs.length > 0) {
                masterPaymentObj.attachedDocs = multiAttachedDocs;
                masterPaymentObj.comprobante = multiAttachedDocs[0].dataUri;
            }

            // Guardar pagos en estado y en Hasura
            if (setPayments) {
                setPayments([...subPayments, ...payments]);
            }

            // REGLA DE NEGOCIO: Reabrir automáticamente pólizas canceladas incluidas en el lote
            const cancelledItems = selectedPoliciesForBatch.filter(item => {
                const pol = policies.find(p => p.id === item.id);
                return pol && (pol.status === 'Cancelada' || pol.status === 'Cancelled');
            });

            if (cancelledItems.length > 0 && setPolicies) {
                const todayStr = new Date().toISOString().split('T')[0];
                setPolicies(prev => prev.map(p => {
                    if (cancelledItems.some(c => c.id === p.id)) {
                        const nextEndDate = getNextRenewalDate(todayStr, p.renewalFrequency || 'Anual');
                        return {
                            ...p,
                            status: 'Active',
                            lastRenewalDate: todayStr,
                            endDate: nextEndDate,
                            renewal: nextEndDate,
                            movements: [
                                ...(p.movements || []),
                                {
                                    id: (p.movements?.length || 0) + 1,
                                    date: todayStr,
                                    type: 'Reapertura Automática por Pago',
                                    description: `Póliza reactivada automáticamente tras registrarse cobro consolidado ${masterPaymentId}.`,
                                    evidence: 'Recibo Maestro ' + masterPaymentId
                                }
                            ]
                        };
                    }
                    return p;
                }));
            }

            if (!isDemo) {
                for (const sub of subPayments) {
                    try {
                        await insertCobroHasura(sub, isDemo);
                    } catch (err) {
                        console.warn('Error guardando subcobro en Hasura:', err);
                    }
                }

                for (const item of cancelledItems) {
                    try {
                        const todayStr = new Date().toISOString().split('T')[0];
                        const pol = policies.find(p => p.id === item.id);
                        const nextEndDate = getNextRenewalDate(todayStr, pol?.renewalFrequency || 'Anual');

                        await updatePolicyHasura(item.rawId || item.id, {
                            status: 'Active',
                            vigencia_fin: nextEndDate,
                            vigencia_inicio: todayStr
                        }, isDemo);

                        await insertMovimientoHasura({
                            polizaId: item.rawId || item.id,
                            date: todayStr,
                            type: 'Reapertura Automática por Pago',
                            description: `Póliza reactivada automáticamente tras registrarse cobro consolidado ${masterPaymentId}.`,
                            evidence: 'Recibo Maestro ' + masterPaymentId
                        }, isDemo);
                    } catch (itemErr) {
                        console.warn('Error reactivating policy in batch:', itemErr);
                    }
                }
            }

            setShowModal(false);
            setMultiAttachedDocs([]);
            setMultiPaymentForm({
                totalAmount: '',
                payerName: '',
                clientDoc: '',
                date: today,
                paymentMethod: 'Transferencia',
                reference: '',
                type: 'Pago Consolidado Multipóliza',
                notes: ''
            });
            setSelectedPoliciesForBatch([]);
            setBatchPolicySearch('');

            // Abrir automáticamente el visor con el recibo consolidado
            setSelectedReceiptPayment(masterPaymentObj);
            setShowReceiptModal(true);
        } catch (err) {
            console.error('Error procesando pago múltiple:', err);
            alert('Ocurrió un error al procesar el pago múltiple.');
        } finally {
            setIsSavingMulti(false);
        }
    };

    // ─── Handlers para Documentos y Edición de Pagos (Solo Santiago) ───

    const handleSingleFileChange = async (e) => {
        if (e.target.files && e.target.files.length > 0) {
            const filesArray = Array.from(e.target.files);
            try {
                const newDocs = await Promise.all(
                    filesArray.map(async (file) => {
                        const dataUri = await fileToDataUri(file);
                        return {
                            id: `doc_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                            name: file.name,
                            size: formatFileSize(file.size),
                            type: file.type,
                            dataUri,
                            date: newPayment.date
                        };
                    })
                );
                setSingleAttachedDocs(prev => [...prev, ...newDocs]);
            } catch (err) {
                console.error('Error reading files:', err);
                alert('No se pudo cargar uno o más archivos seleccionados.');
            }
            e.target.value = '';
        }
    };

    const handleRemoveSingleDoc = (docId) => {
        setSingleAttachedDocs(prev => prev.filter(d => d.id !== docId));
    };

    const handleMultiFileChange = async (e) => {
        if (e.target.files && e.target.files.length > 0) {
            const filesArray = Array.from(e.target.files);
            try {
                const newDocs = await Promise.all(
                    filesArray.map(async (file) => {
                        const dataUri = await fileToDataUri(file);
                        return {
                            id: `doc_multi_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                            name: file.name,
                            size: formatFileSize(file.size),
                            type: file.type,
                            dataUri,
                            date: multiPaymentForm.date
                        };
                    })
                );
                setMultiAttachedDocs(prev => [...prev, ...newDocs]);
            } catch (err) {
                console.error('Error reading files:', err);
                alert('No se pudo cargar uno o más archivos seleccionados.');
            }
            e.target.value = '';
        }
    };

    const handleRemoveMultiDoc = (docId) => {
        setMultiAttachedDocs(prev => prev.filter(d => d.id !== docId));
    };

    const handleOpenEditModal = (payment) => {
        if (!canEditPayments) {
            alert('Solo el usuario administrador principal (Santiago Morales) tiene autorización para modificar pagos.');
            return;
        }
        setEditingPayment(payment);
        setEditFormData({
            amount: payment.amountNum ? String(payment.amountNum) : String(payment.amount || '').replace(/[^0-9.]/g, ''),
            date: payment.date || today,
            type: ['Cuota Mensual', 'Renovación', 'Anual', 'Semestral', 'Inicial', 'Otro'].includes(payment.type) ? payment.type : 'Otro',
            customType: !['Cuota Mensual', 'Renovación', 'Anual', 'Semestral', 'Inicial'].includes(payment.type) ? (payment.type || '') : '',
            paymentMethod: payment.paymentMethod || 'Efectivo',
            reference: payment.reference || '',
            status: payment.status || 'Paid',
            notes: payment.notes || ''
        });
        setEditAttachedDocs(payment.attachedDocs || (payment.comprobante && payment.comprobante.startsWith('data:') ? [{
            id: `doc_${payment.id}`,
            name: `Comprobante_${payment.id}`,
            type: payment.comprobante.startsWith('data:application/pdf') ? 'application/pdf' : 'image/jpeg',
            dataUri: payment.comprobante,
            date: payment.date
        }] : []));
        setShowEditModal(true);
    };

    const handleEditFileChange = async (e) => {
        if (e.target.files && e.target.files.length > 0) {
            const filesArray = Array.from(e.target.files);
            try {
                const newDocs = await Promise.all(
                    filesArray.map(async (file) => {
                        const dataUri = await fileToDataUri(file);
                        return {
                            id: `doc_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                            name: file.name,
                            size: formatFileSize(file.size),
                            type: file.type,
                            dataUri,
                            date: editFormData.date
                        };
                    })
                );
                setEditAttachedDocs(prev => [...prev, ...newDocs]);
            } catch (err) {
                console.error('Error reading files:', err);
                alert('No se pudo cargar uno o más archivos seleccionados.');
            }
            e.target.value = '';
        }
    };

    const handleRemoveEditAttachedDoc = (docId) => {
        setEditAttachedDocs(prev => prev.filter(d => d.id !== docId));
    };

    const handleSaveEditedPayment = async (e) => {
        e.preventDefault();
        if (!editingPayment) return;

        setIsSavingEdit(true);
        try {
            const cleanAmount = parseFloat(String(editFormData.amount || '0').replace(/[^0-9.]/g, '')) || 0;
            if (cleanAmount <= 0) {
                alert('Por favor ingresa un monto válido.');
                setIsSavingEdit(false);
                return;
            }

            const matchedPolicy = policies.find(p => p.id === editingPayment.policyId || editingPayment.policy?.includes(p.id));
            const policyStats = matchedPolicy ? getPolicyPaymentStats(matchedPolicy, payments) : null;
            const totalOwedBefore = policyStats ? policyStats.totalOwed : (matchedPolicy?.amount || 0);
            const remainingBalance = Math.max(0, totalOwedBefore - cleanAmount);
            const finalType = editFormData.type === 'Otro' ? (editFormData.customType || 'Otro') : editFormData.type;

            const updatedPayment = {
                ...editingPayment,
                amount: formatMoney(cleanAmount, editingPayment.currency || 'DOP'),
                amountNum: cleanAmount,
                date: editFormData.date,
                type: finalType,
                paymentMethod: editFormData.paymentMethod,
                reference: (editFormData.reference || '').trim(),
                status: editFormData.status,
                notes: (editFormData.notes || '').trim(),
                remainingBalance: remainingBalance,
                attachedDocs: editAttachedDocs,
                comprobante: editAttachedDocs.length > 0 ? editAttachedDocs[0].dataUri : editingPayment.comprobante
            };

            // Regenerar Recibo Oficial en PDF
            try {
                const newPdfDataUri = await generateReceiptPdfDataUri(
                    updatedPayment,
                    matchedPolicy || {},
                    {}
                );
                if (newPdfDataUri) {
                    updatedPayment.receiptUrl = newPdfDataUri;
                }
            } catch (pdfErr) {
                console.warn('Error regenerating receipt PDF on edit:', pdfErr);
            }

            // Actualizar estado local
            setPayments(prev => prev.map(p => p.id === editingPayment.id ? updatedPayment : p));

            // Actualizar en Hasura si no es demo
            if (!isDemo) {
                try {
                    await updateCobroHasura(editingPayment.id || editingPayment.rawId, {
                        amount: cleanAmount,
                        date: editFormData.date,
                        type: finalType,
                        paymentMethod: editFormData.paymentMethod,
                        status: editFormData.status,
                        notes: (editFormData.notes || '').trim(),
                        receiptUrl: updatedPayment.receiptUrl,
                        comprobante: updatedPayment.comprobante
                    }, isDemo);
                } catch (dbErr) {
                    console.warn('Error updating payment in Hasura:', dbErr);
                }
            }

            setShowEditModal(false);
            setEditingPayment(null);
        } catch (err) {
            console.error('Error saving edited payment:', err);
            alert(`Error al guardar cambios: ${err.message}`);
        } finally {
            setIsSavingEdit(false);
        }
    };

    const handleDeletePayment = async (payment) => {
        if (!canEditPayments) {
            alert('Solo el usuario administrador principal (Santiago Morales) tiene autorización para eliminar pagos.');
            return;
        }
        const confirmDelete = window.confirm(`¿Estás seguro de que deseas eliminar el registro de pago ${payment.id} de "${payment.client}" por ${formatMoney(payment.amountNum || payment.amount)}?\n\nEsta acción revertirá el cobro.`);
        if (!confirmDelete) return;

        setPayments(prev => prev.filter(p => p.id !== payment.id));
        if (!isDemo) {
            try {
                await deleteCobroHasura(payment.id || payment.rawId, isDemo);
            } catch (dbErr) {
                console.warn('Error deleting payment in Hasura:', dbErr);
            }
        }
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
            if (!searchTerm.trim()) {
                if (activeFilter === 'All') return true;
                return p.status === activeFilter;
            }
            const term = searchTerm.toLowerCase().trim();
            const matchesSearch =
                (p.client?.toLowerCase() || '').includes(term) ||
                (p.id?.toLowerCase() || '').includes(term) ||
                (p.policy?.toLowerCase() || '').includes(term) ||
                (p.type?.toLowerCase() || '').includes(term) ||
                (p.amount?.toLowerCase() || '').includes(term);
            if (activeFilter === 'All') return matchesSearch;
            return matchesSearch && p.status === activeFilter;
        });
    }, [dateFilteredPayments, searchTerm, activeFilter]);

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

    const sortedPayments = useMemo(() => {
        if (!sortConfig.key) return filteredPayments;
        return [...filteredPayments].sort((a, b) => {
            let valA = a[sortConfig.key];
            let valB = b[sortConfig.key];

            if (sortConfig.key === 'amount' || sortConfig.key === 'amountNum') {
                valA = a.amountNum !== undefined ? a.amountNum : parseFloat(String(a.amount || '0').replace(/[^0-9.-]+/g, '')) || 0;
                valB = b.amountNum !== undefined ? b.amountNum : parseFloat(String(b.amount || '0').replace(/[^0-9.-]+/g, '')) || 0;
            } else if (sortConfig.key === 'date') {
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
    }, [filteredPayments, sortConfig]);

    const toggleFilter = (status) => setActiveFilter(prev => prev === status ? 'All' : status);

    const setQuickRange = (type) => {
        const d = new Date();
        if (type === 'month') {
            d.setDate(1); setDateFrom(d.toISOString().split('T')[0]); setDateTo(today);
        } else if (type === 'prev') {
            d.setDate(1); d.setMonth(d.getMonth() - 1); const from = d.toISOString().split('T')[0]; d.setMonth(d.getMonth() + 1); d.setDate(0); setDateFrom(from); setDateTo(d.toISOString().split('T')[0]);
        } else if (type === 'year') {
            setDateFrom(`${d.getFullYear()}-01-01`); setDateTo(today);
        } else {
            setDateFrom(''); setDateTo('');
        }
    };

    // Modal de Cobro Automático por Lote
    const [showAutoBillingModal, setShowAutoBillingModal] = useState(false);
    const [isProcessingAuto, setIsProcessingAuto] = useState(false);

    // Clientes con Cobro Automático activo y cuotas pendientes
    const autoBillingCandidates = useMemo(() => {
        const candidates = [];
        const autoClients = clients.filter(c => c.cobroAutomatico);

        autoClients.forEach(client => {
            const clientNameNorm = (client.name || '').trim().toLowerCase();
            const clientPolicies = policies.filter(p => {
                if (p.clienteId !== undefined && p.clienteId !== null && String(p.clienteId) === String(client.id)) {
                    return true;
                }
                if (p.client && p.client.trim().toLowerCase() === clientNameNorm) {
                    return true;
                }
                return false;
            });

            clientPolicies.forEach(pol => {
                const stats = getPolicyPaymentStats(pol, payments);
                if (stats.totalOwed > 0) {
                    const freq = pol.renewalFrequency || 'Anual';
                    const totalAnnual = parseFloat(String(pol.amount || '0').replace(/[^0-9.-]+/g, '')) || 0;
                    let installmentAmount = totalAnnual;
                    if (freq === 'Mensual') installmentAmount = totalAnnual / 12;
                    else if (freq === 'Trimestral') installmentAmount = totalAnnual / 4;
                    else if (freq === 'Semestral') installmentAmount = totalAnnual / 2;

                    const chargeAmount = Math.min(stats.totalOwed, Math.round(installmentAmount || stats.totalOwed));

                    candidates.push({
                        client,
                        policy: pol,
                        chargeAmount: chargeAmount > 0 ? chargeAmount : stats.totalOwed,
                        totalOwed: stats.totalOwed,
                        debitMethod: client.metodoCobroAutomatico || 'Tarjeta de Crédito',
                        debitDay: client.diaCobroAutomatico || 15
                    });
                }
            });
        });
        return candidates;
    }, [clients, policies, payments]);

    const handleExecuteAutoBilling = async () => {
        if (autoBillingCandidates.length === 0) return;
        setIsProcessingAuto(true);

        try {
            const newPaymentsList = [];
            for (let i = 0; i < autoBillingCandidates.length; i++) {
                const item = autoBillingCandidates[i];
                const paymentId = `REC-${String(payments.length + newPaymentsList.length + 1).padStart(5, '0')}`;

                const paymentObj = {
                    id: paymentId,
                    polizaId: item.policy ? (item.policy.rawId || item.policy.id) : null,
                    clienteId: item.client ? item.client.id : null,
                    client: item.client.name,
                    policy: `${item.policy.type} - ${item.policy.insurer} (${item.policy.id})`,
                    policyId: item.policy.id,
                    date: today,
                    amount: formatMoney(item.chargeAmount),
                    amountNum: item.chargeAmount,
                    status: 'Paid',
                    type: 'Cuota Automática',
                    paymentMethod: item.debitMethod || 'Tarjeta',
                    receiptUrl: null,
                    comprobante: null,
                    isAutoDebit: true
                };

                if (!isDemo) {
                    try {
                        await insertCobroHasura(paymentObj, isDemo);
                    } catch (err) {
                        console.warn('Error inserting auto cobro in Hasura:', err);
                    }
                }
                newPaymentsList.push(paymentObj);
            }

            if (setPayments) {
                setPayments([...newPaymentsList, ...payments]);
            }

            alert(`✅ Se procesaron exitosamente ${newPaymentsList.length} cobro(s) automático(s) autorizados.`);
            setShowAutoBillingModal(false);
        } catch (err) {
            console.error('Error executing auto billing:', err);
            alert('Error al procesar débitos automáticos.');
        } finally {
            setIsProcessingAuto(false);
        }
    };

    return (
        <div>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h2 style={{ fontSize: '2rem', color: 'var(--primary)' }}>Gestión de Cobros</h2>
                    <p style={{ color: 'var(--text-muted)' }}>Control y seguimiento de pagos de pólizas, cuotas y emisión de recibos oficiales.</p>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <button
                        className="btn"
                        onClick={() => setShowAutoBillingModal(true)}
                        style={{
                            backgroundColor: autoBillingCandidates.length > 0 ? '#f0fdf4' : '#f8fafc',
                            color: autoBillingCandidates.length > 0 ? '#15803d' : '#64748b',
                            border: autoBillingCandidates.length > 0 ? '1.5px solid #86efac' : '1px solid var(--border)',
                            fontWeight: '700',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                            boxShadow: autoBillingCandidates.length > 0 ? '0 1px 3px rgba(22, 163, 74, 0.15)' : 'none'
                        }}
                        title="Procesar débitos automáticos solo para clientes autorizados"
                    >
                        <Zap size={17} color={autoBillingCandidates.length > 0 ? '#16a34a' : '#94a3b8'} />
                        Débitos Automáticos ({autoBillingCandidates.length})
                    </button>
                    <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                        <Plus size={18} /> Registrar Cobro Manual
                    </button>
                </div>
            </div>

            {/* Date Filter Bar */}
            <div className="card" style={{ padding: '1rem 1.5rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', backgroundColor: '#fafaf9' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)', fontWeight: '600', fontSize: '0.9rem' }}>
                        <Calendar size={18} />
                        <span>Rango:</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <input
                            type="date"
                            value={dateFrom}
                            onChange={(e) => setDateFrom(e.target.value)}
                            style={{ padding: '0.35rem 0.6rem', fontSize: '0.85rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}
                        />
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>hasta</span>
                        <input
                            type="date"
                            value={dateTo}
                            onChange={(e) => setDateTo(e.target.value)}
                            style={{ padding: '0.35rem 0.6rem', fontSize: '0.85rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}
                        />
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                    {[
                        { label: 'Este Mes', action: () => setQuickRange('month') },
                        { label: 'Mes Anterior', action: () => setQuickRange('prev') },
                        { label: 'Este Año', action: () => setQuickRange('year') },
                        { label: 'Todo el Tiempo', action: () => setQuickRange('all') },
                    ].map(btn => (
                        <button
                            key={btn.label}
                            onClick={btn.action}
                            className="btn"
                            style={{ padding: '0.3rem 0.7rem', fontSize: '0.8rem', border: '1px solid var(--border)', backgroundColor: 'white' }}
                        >
                            {btn.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Summary Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                <div className="card" onClick={() => toggleFilter('Paid')} style={{
                    padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.5rem', cursor: 'pointer',
                    border: activeFilter === 'Paid' ? '2px solid #166534' : '2px solid transparent',
                    backgroundColor: activeFilter === 'Paid' ? '#f0fdf4' : 'white', transition: 'all 0.2s'
                }}>
                    <div style={{ padding: '1rem', borderRadius: '50%', backgroundColor: '#dcfce7', color: '#166534' }}>
                        <CheckCircle size={24} />
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
                            style={{ paddingLeft: '40px', paddingRight: searchTerm ? '36px' : '12px' }}
                        />
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
                                <XCircle size={16} />
                            </button>
                        )}
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
                                <th
                                    onClick={() => handleSort('id')}
                                    style={{ padding: '1rem', textAlign: 'left', color: sortConfig.key === 'id' ? '#2563eb' : 'var(--text-muted)', cursor: 'pointer', userSelect: 'none' }}
                                    title="Hacer clic para ordenar por ID Pago"
                                >
                                    <div style={{ display: 'flex', alignItems: 'center' }}>
                                        <span>ID Pago</span>
                                        {renderSortIcon('id')}
                                    </div>
                                </th>
                                <th
                                    onClick={() => handleSort('client')}
                                    style={{ padding: '1rem', textAlign: 'left', color: sortConfig.key === 'client' ? '#2563eb' : 'var(--text-muted)', cursor: 'pointer', userSelect: 'none' }}
                                    title="Hacer clic para ordenar por Cliente / Póliza"
                                >
                                    <div style={{ display: 'flex', alignItems: 'center' }}>
                                        <span>Cliente / Póliza</span>
                                        {renderSortIcon('client')}
                                    </div>
                                </th>
                                <th
                                    onClick={() => handleSort('type')}
                                    style={{ padding: '1rem', textAlign: 'left', color: sortConfig.key === 'type' ? '#2563eb' : 'var(--text-muted)', cursor: 'pointer', userSelect: 'none' }}
                                    title="Hacer clic para ordenar por Concepto"
                                >
                                    <div style={{ display: 'flex', alignItems: 'center' }}>
                                        <span>Concepto</span>
                                        {renderSortIcon('type')}
                                    </div>
                                </th>
                                <th
                                    onClick={() => handleSort('date')}
                                    style={{ padding: '1rem', textAlign: 'left', color: sortConfig.key === 'date' ? '#2563eb' : 'var(--text-muted)', cursor: 'pointer', userSelect: 'none' }}
                                    title="Hacer clic para ordenar por Fecha"
                                >
                                    <div style={{ display: 'flex', alignItems: 'center' }}>
                                        <span>Fecha</span>
                                        {renderSortIcon('date')}
                                    </div>
                                </th>
                                <th
                                    onClick={() => handleSort('status')}
                                    style={{ padding: '1rem', textAlign: 'left', color: sortConfig.key === 'status' ? '#2563eb' : 'var(--text-muted)', cursor: 'pointer', userSelect: 'none' }}
                                    title="Hacer clic para ordenar por Estado"
                                >
                                    <div style={{ display: 'flex', alignItems: 'center' }}>
                                        <span>Estado</span>
                                        {renderSortIcon('status')}
                                    </div>
                                </th>
                                <th
                                    onClick={() => handleSort('amount')}
                                    style={{ padding: '1rem', textAlign: 'right', color: sortConfig.key === 'amount' ? '#2563eb' : 'var(--text-muted)', cursor: 'pointer', userSelect: 'none' }}
                                    title="Hacer clic para ordenar por Monto"
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                                        <span>Monto</span>
                                        {renderSortIcon('amount')}
                                    </div>
                                </th>
                                <th style={{ padding: '1rem', textAlign: 'right', color: 'var(--text-muted)' }}>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedPayments.length === 0 ? (
                                <tr>
                                    <td colSpan="7" style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                                        No se encontraron pagos para el período y filtro seleccionados.
                                    </td>
                                </tr>
                            ) : sortedPayments.map((payment) => {
                                const statusInfo = getStatusColor(payment.status);
                                const StatusIcon = statusInfo.icon;
                                return (
                                    <tr key={payment.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                        <td style={{ padding: '1rem', fontWeight: 'bold' }}>
                                            <div>{payment.id}</div>
                                            {payment.masterReceiptId && (
                                                <span style={{ fontSize: '0.72rem', padding: '0.12rem 0.45rem', backgroundColor: '#e0f2fe', color: '#0369a1', borderRadius: '4px', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.25rem' }}>
                                                    <Layers size={11} /> Pago Múltiple ({payment.masterReceiptId})
                                                </span>
                                            )}
                                            {payment.isMasterPayment && (
                                                <span style={{ fontSize: '0.72rem', padding: '0.12rem 0.45rem', backgroundColor: '#fef3c7', color: '#92400e', borderRadius: '4px', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.25rem' }}>
                                                    <Sparkles size={11} /> Consolidado ({payment.items?.length || 0} Pólizas)
                                                </span>
                                            )}
                                        </td>
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
                                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                                                {/* Botón Ver / Imprimir Recibo Oficial PDF */}
                                                <button 
                                                    className="btn" 
                                                    onClick={() => {
                                                        setSelectedReceiptPayment(payment);
                                                        setShowReceiptModal(true);
                                                    }}
                                                    style={{ 
                                                        padding: '0.4rem 0.75rem', 
                                                        color: 'var(--primary)', 
                                                        backgroundColor: '#f8fafc',
                                                        border: '1px solid #cbd5e1',
                                                        borderRadius: 'var(--radius-sm)',
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '0.35rem',
                                                        fontSize: '0.8rem',
                                                        fontWeight: '700',
                                                        cursor: 'pointer',
                                                        boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                                                    }}
                                                    title="Ver e Imprimir Recibo Oficial de Pago (PDF)"
                                                >
                                                    <Printer size={13} color="#d97706" /> Recibo PDF
                                                </button>

                                                {/* Botón Ver Documento Adjunto (Comprobante / Transferencia / Cheque) */}
                                                {(payment.attachedDocs?.length > 0 || (payment.comprobante && payment.comprobante.startsWith('data:image'))) && (
                                                    <button
                                                        className="btn"
                                                        onClick={() => {
                                                            const docsList = (payment.attachedDocs && payment.attachedDocs.length > 0) ? payment.attachedDocs : [{
                                                                id: `doc_${payment.id}`,
                                                                name: `Comprobante_${payment.id}`,
                                                                type: payment.comprobante?.startsWith('data:image') ? 'image/jpeg' : 'application/pdf',
                                                                dataUri: payment.comprobante,
                                                                date: payment.date
                                                            }];
                                                            setSelectedViewingDoc(docsList);
                                                            setShowDocViewer(true);
                                                        }}
                                                        style={{
                                                            padding: '0.4rem 0.65rem',
                                                            color: '#0369a1',
                                                            backgroundColor: '#f0f9ff',
                                                            border: '1px solid #bae6fd',
                                                            borderRadius: 'var(--radius-sm)',
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: '0.3rem',
                                                            fontSize: '0.8rem',
                                                            fontWeight: '700',
                                                            cursor: 'pointer'
                                                        }}
                                                        title="Ver Documento(s) / Comprobante(s) Adjunto(s)"
                                                    >
                                                        <Paperclip size={13} color="#0284c7" /> Doc ({payment.attachedDocs?.length || 1})
                                                    </button>
                                                )}

                                                {/* Botón Editar Pago (SOLO PARA SANTIAGO / ADMIN) */}
                                                {canEditPayments && (
                                                    <button
                                                        className="btn"
                                                        onClick={() => handleOpenEditModal(payment)}
                                                        style={{
                                                            padding: '0.4rem 0.65rem',
                                                            color: '#1e293b',
                                                            backgroundColor: '#f1f5f9',
                                                            border: '1px solid #cbd5e1',
                                                            borderRadius: 'var(--radius-sm)',
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: '0.3rem',
                                                            fontSize: '0.8rem',
                                                            fontWeight: '700',
                                                            cursor: 'pointer'
                                                        }}
                                                        title="Editar Pago (Solo Administrador Principal)"
                                                    >
                                                        <Edit3 size={13} color="#475569" /> Editar
                                                    </button>
                                                )}

                                                {/* Botón Eliminar Pago (SOLO PARA SANTIAGO / ADMIN) */}
                                                {canEditPayments && (
                                                    <button
                                                        className="btn"
                                                        onClick={() => handleDeletePayment(payment)}
                                                        style={{
                                                            padding: '0.4rem 0.5rem',
                                                            color: '#dc2626',
                                                            backgroundColor: '#fef2f2',
                                                            border: '1px solid #fecaca',
                                                            borderRadius: 'var(--radius-sm)',
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            fontSize: '0.8rem',
                                                            cursor: 'pointer'
                                                        }}
                                                        title="Eliminar Pago"
                                                    >
                                                        <Trash2 size={13} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Register Payment Modal (Individual & Multipóliza / Multicliente) */}
            {showModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.55)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
                    padding: '1rem'
                }}>
                    <div className="card" style={{ 
                        width: '100%', 
                        maxWidth: paymentMode === 'multi' ? '820px' : '520px', 
                        backgroundColor: 'white', 
                        maxHeight: '92vh', 
                        overflowY: 'auto',
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
                    }}>
                        {/* Modal Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
                            <h3 style={{ margin: 0, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.25rem' }}>
                                <DollarSign size={22} /> Registrar Cobro / Pago
                            </h3>
                            <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', padding: '0.5rem', cursor: 'pointer', color: 'var(--text-muted)' }}>
                                <XCircle size={24} />
                            </button>
                        </div>

                        {/* Modal Tabs: Single vs Multi */}
                        <div style={{ 
                            display: 'grid', 
                            gridTemplateColumns: '1fr 1fr', 
                            gap: '0.5rem', 
                            marginBottom: '1.25rem', 
                            backgroundColor: '#f1f5f9', 
                            padding: '0.35rem', 
                            borderRadius: 'var(--radius-sm)' 
                        }}>
                            <button
                                type="button"
                                onClick={() => setPaymentMode('single')}
                                style={{
                                    padding: '0.6rem 0.8rem',
                                    borderRadius: 'var(--radius-sm)',
                                    border: 'none',
                                    fontWeight: '700',
                                    fontSize: '0.85rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.4rem',
                                    cursor: 'pointer',
                                    backgroundColor: paymentMode === 'single' ? 'white' : 'transparent',
                                    color: paymentMode === 'single' ? 'var(--primary)' : 'var(--text-muted)',
                                    boxShadow: paymentMode === 'single' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                                    transition: 'all 0.2s'
                                }}
                            >
                                <DollarSign size={16} /> Pago Individual (1 Póliza)
                            </button>
                            <button
                                type="button"
                                onClick={() => setPaymentMode('multi')}
                                style={{
                                    padding: '0.6rem 0.8rem',
                                    borderRadius: 'var(--radius-sm)',
                                    border: 'none',
                                    fontWeight: '700',
                                    fontSize: '0.85rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.4rem',
                                    cursor: 'pointer',
                                    backgroundColor: paymentMode === 'multi' ? 'var(--primary)' : 'transparent',
                                    color: paymentMode === 'multi' ? 'white' : 'var(--text-muted)',
                                    boxShadow: paymentMode === 'multi' ? '0 1px 3px rgba(0,0,0,0.15)' : 'none',
                                    transition: 'all 0.2s'
                                }}
                            >
                                <Layers size={16} /> Pago Multipóliza & Multicliente
                            </button>
                        </div>

                        {/* MODE 1: SINGLE POLICY PAYMENT */}
                        {paymentMode === 'single' && (
                            <form onSubmit={handleAddPayment}>
                                {/* Buscar Póliza Autocompletar */}
                                <div style={{ marginBottom: '1.25rem', position: 'relative' }}>
                                    <label style={{ fontWeight: '600', marginBottom: '0.4rem', display: 'block' }}>Buscar Póliza o Cliente</label>
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
                                    {showPolicyResults && policySearch.length > 0 && !newPayment.selectedPolicyId && (
                                        <div style={{
                                            position: 'absolute', top: '100%', left: 0, right: 0,
                                            backgroundColor: 'white', border: '1px solid var(--border)',
                                            borderRadius: '0 0 var(--radius-sm) var(--radius-sm)',
                                            maxHeight: '200px', overflowY: 'auto', zIndex: 100,
                                            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
                                        }}>
                                            {filteredPolicies.length === 0 ? (
                                                <div style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                                    No se encontraron pólizas
                                                </div>
                                            ) : (
                                                filteredPolicies.slice(0, 8).map(p => {
                                                    const stats = getPolicyPaymentStats(p, payments);
                                                    return (
                                                        <div
                                                            key={p.id}
                                                            onClick={() => handleSelectPolicy(p)}
                                                            style={{
                                                                padding: '0.6rem 1rem', cursor: 'pointer',
                                                                borderBottom: '1px solid #f1f5f9',
                                                                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                                                            }}
                                                            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f8fafc'}
                                                            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                                                        >
                                                            <div>
                                                                <div style={{ fontWeight: '600', fontSize: '0.9rem' }}>{p.client}</div>
                                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                                    {p.id} · {p.type} · {p.insurer}
                                                                </div>
                                                            </div>
                                                            <div style={{ textAlign: 'right', fontSize: '0.8rem' }}>
                                                                <div style={{ color: stats.totalOwed > 0 ? '#991b1b' : '#166534', fontWeight: 'bold' }}>
                                                                    Debe: RD$ {stats.totalOwed.toLocaleString('es-DO', { minimumFractionDigits: 0 })}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Banner de Modalidad de Cobro del Cliente */}
                                {(() => {
                                    const matchedPolicy = policies.find(p => p.id === newPayment.selectedPolicyId);
                                    const clientNameNorm = (newPayment.client || matchedPolicy?.client || '').trim().toLowerCase();
                                    const relClient = clients.find(c => 
                                        (matchedPolicy?.clienteId && String(c.id) === String(matchedPolicy.clienteId)) ||
                                        (c.name && c.name.trim().toLowerCase() === clientNameNorm)
                                    );

                                    if (!relClient && !newPayment.client) return null;

                                    return (
                                        <div style={{
                                            padding: '0.6rem 0.85rem',
                                            borderRadius: 'var(--radius-sm)',
                                            marginBottom: '1rem',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.5rem',
                                            fontSize: '0.82rem',
                                            backgroundColor: relClient?.cobroAutomatico ? '#ecfdf5' : '#f8fafc',
                                            border: relClient?.cobroAutomatico ? '1px solid #a7f3d0' : '1px solid #e2e8f0',
                                            color: relClient?.cobroAutomatico ? '#065f46' : '#475569'
                                        }}>
                                            {relClient?.cobroAutomatico ? <Zap size={16} color="#059669" /> : <FileText size={16} color="#64748b" />}
                                            <div>
                                                <strong>Modalidad del Cliente: </strong>
                                                {relClient?.cobroAutomatico 
                                                    ? `⚡ Débito Automático Activo (${relClient.metodoCobroAutomatico || 'Tarjeta'}, Día ${relClient.diaCobroAutomatico || 15})`
                                                    : '✋ Cobro Manual (Predeterminado). Los pagos se registran únicamente de forma manual.'}
                                            </div>
                                        </div>
                                    );
                                })()}

                                <div style={{ marginBottom: '1rem' }}>
                                    <label>Cliente</label>
                                    <input required type="text" placeholder="Nombre del cliente"
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
                                        <label>Método de Pago</label>
                                        <select style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}
                                            value={newPayment.paymentMethod}
                                            onChange={e => setNewPayment({ ...newPayment, paymentMethod: e.target.value })}>
                                            <option value="Efectivo">💵 Efectivo (Recibo de Caja)</option>
                                            <option value="Transferencia">🏦 Transferencia Bancaria</option>
                                            <option value="Tarjeta">💳 Tarjeta de Crédito / Débito</option>
                                            <option value="Cheque">📑 Cheque</option>
                                        </select>
                                    </div>
                                </div>

                                <div style={{ marginBottom: '1rem' }}>
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

                                <div style={{ marginBottom: '1rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div>
                                        <label>No. de Referencia / Voucher / Cheque</label>
                                        <input type="text" placeholder="Ej. TRF-83921 o Chq #102"
                                            value={newPayment.reference}
                                            onChange={e => setNewPayment({ ...newPayment, reference: e.target.value })} />
                                    </div>
                                    <div>
                                        <label>Notas / Observaciones</label>
                                        <input type="text" placeholder="Observaciones opcionales..."
                                            value={newPayment.notes}
                                            onChange={e => setNewPayment({ ...newPayment, notes: e.target.value })} />
                                    </div>
                                </div>

                                {/* Adjuntar Documento o Comprobante (Opcional - Múltiples) */}
                                <div style={{ marginBottom: '1.25rem' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: '700', fontSize: '0.85rem', color: '#1e293b', marginBottom: '0.35rem' }}>
                                        <Paperclip size={15} color="#0284c7" /> Adjuntar Comprobantes o Documentos de Pago (Opcional - Múltiples)
                                    </label>
                                    <input
                                        type="file"
                                        multiple
                                        accept="image/*,.pdf"
                                        onChange={handleSingleFileChange}
                                        style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: 'var(--radius-sm)', border: '1.5px dashed var(--border)', backgroundColor: '#f8fafc', fontSize: '0.84rem' }}
                                    />
                                    {singleAttachedDocs.length > 0 && (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginTop: '0.45rem' }}>
                                            {singleAttachedDocs.map((doc) => (
                                                <div key={doc.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.45rem 0.75rem', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 'var(--radius-sm)', fontSize: '0.82rem' }}>
                                                    <span style={{ color: '#166534', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.35rem', minWidth: 0 }}>
                                                        <CheckCircle size={15} color="#16a34a" style={{ flexShrink: 0 }} />
                                                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                            {doc.name}
                                                        </span>
                                                        <span style={{ fontSize: '0.75rem', color: '#15803d', flexShrink: 0 }}>({doc.size})</span>
                                                    </span>
                                                    <button type="button" onClick={() => handleRemoveSingleDoc(doc.id)} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontWeight: '700', fontSize: '0.78rem', padding: '2px 6px', flexShrink: 0 }}>
                                                        ✕ Quitar
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem' }}>
                                    <button type="button" className="btn" onClick={() => setShowModal(false)} style={{ backgroundColor: '#f1f5f9' }}>
                                        Cancelar
                                    </button>
                                    <button type="submit" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <Printer size={16} /> Registrar y Emitir Recibo
                                    </button>
                                </div>
                            </form>
                        )}

                        {/* MODE 2: MULTI-POLICY & MULTI-CLIENT PAYMENT */}
                        {paymentMode === 'multi' && (
                            <form onSubmit={handleSaveMultiPayment}>
                                {/* 1. Datos Generales de la Transacción */}
                                <div style={{ 
                                    padding: '1rem', 
                                    backgroundColor: '#f8fafc', 
                                    border: '1px solid #e2e8f0', 
                                    borderRadius: 'var(--radius-sm)', 
                                    marginBottom: '1.25rem' 
                                }}>
                                    <div style={{ fontWeight: '700', color: 'var(--primary)', fontSize: '0.95rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                        <DollarSign size={17} /> 1. Datos de la Transacción Global
                                    </div>
                                    
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '0.75rem' }}>
                                        <div>
                                            <label style={{ fontWeight: '700', color: '#92400e' }}>Monto Total Recibido (RD$) *</label>
                                            <input 
                                                required 
                                                type="number" 
                                                step="any"
                                                placeholder="Ej. 150000"
                                                value={multiPaymentForm.totalAmount}
                                                onChange={e => setMultiPaymentForm({ ...multiPaymentForm, totalAmount: e.target.value })}
                                                style={{ 
                                                    borderColor: '#d97706', 
                                                    borderWidth: '2px', 
                                                    fontWeight: '700', 
                                                    fontSize: '1.05rem', 
                                                    backgroundColor: '#fffbeb' 
                                                }} 
                                            />
                                        </div>
                                        <div>
                                            <label>Pagador / Razón Social *</label>
                                            <input 
                                                required 
                                                type="text" 
                                                placeholder="Nombre de la persona o empresa que paga"
                                                value={multiPaymentForm.payerName}
                                                onChange={e => setMultiPaymentForm({ ...multiPaymentForm, payerName: e.target.value })} 
                                            />
                                        </div>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                                        <div>
                                            <label>Fecha de Cobro</label>
                                            <input 
                                                required 
                                                type="date" 
                                                value={multiPaymentForm.date}
                                                onChange={e => setMultiPaymentForm({ ...multiPaymentForm, date: e.target.value })} 
                                            />
                                        </div>
                                        <div>
                                            <label>Método de Pago</label>
                                            <select 
                                                style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}
                                                value={multiPaymentForm.paymentMethod}
                                                onChange={e => setMultiPaymentForm({ ...multiPaymentForm, paymentMethod: e.target.value })}
                                            >
                                                <option value="Transferencia">🏦 Transferencia Bancaria</option>
                                                <option value="Cheque">📑 Cheque</option>
                                                <option value="Tarjeta">💳 Tarjeta de Crédito / Débito</option>
                                                <option value="Efectivo">💵 Efectivo</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label>No. Ref / Cheque</label>
                                            <input 
                                                type="text" 
                                                placeholder="Ej. TRF-98234 o Cheque #402"
                                                value={multiPaymentForm.reference}
                                                onChange={e => setMultiPaymentForm({ ...multiPaymentForm, reference: e.target.value })} 
                                            />
                                        </div>
                                    </div>

                                    {/* Adjuntar Documento o Comprobante para Pago Múltiple (Opcional - Múltiples) */}
                                    <div>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: '700', fontSize: '0.82rem', color: '#1e293b', marginBottom: '0.35rem' }}>
                                            <Paperclip size={14} color="#0284c7" /> Adjuntar Comprobantes Globales de Pago / Transferencias (Opcional - Múltiples)
                                        </label>
                                        <input
                                            type="file"
                                            multiple
                                            accept="image/*,.pdf"
                                            onChange={handleMultiFileChange}
                                            style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)', border: '1.5px dashed var(--border)', backgroundColor: '#ffffff', fontSize: '0.82rem' }}
                                        />
                                        {multiAttachedDocs.length > 0 && (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginTop: '0.45rem' }}>
                                                {multiAttachedDocs.map((doc) => (
                                                    <div key={doc.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.45rem 0.75rem', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem' }}>
                                                        <span style={{ color: '#166534', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.35rem', minWidth: 0 }}>
                                                            <CheckCircle size={14} color="#16a34a" style={{ flexShrink: 0 }} />
                                                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                                {doc.name}
                                                            </span>
                                                            <span style={{ fontSize: '0.75rem', color: '#15803d', flexShrink: 0 }}>({doc.size})</span>
                                                        </span>
                                                        <button type="button" onClick={() => handleRemoveMultiDoc(doc.id)} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontWeight: '700', fontSize: '0.78rem', padding: '2px 6px', flexShrink: 0 }}>
                                                            ✕ Quitar
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* 2. Selector y Buscador de Pólizas */}
                                <div style={{ 
                                    padding: '1rem', 
                                    backgroundColor: '#ffffff', 
                                    border: '1px solid #e2e8f0', 
                                    borderRadius: 'var(--radius-sm)', 
                                    marginBottom: '1.25rem' 
                                }}>
                                    <div style={{ fontWeight: '700', color: 'var(--primary)', fontSize: '0.95rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                            <Users size={17} /> 2. Seleccionar Pólizas a Pagar
                                        </div>
                                        {/* Selector rápido por cliente */}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                            <select
                                                style={{ fontSize: '0.8rem', padding: '0.35rem 0.6rem', borderRadius: 'var(--radius-sm)', border: '1px solid #cbd5e1' }}
                                                value={batchClientFilter}
                                                onChange={e => {
                                                    const val = e.target.value;
                                                    setBatchClientFilter(val);
                                                    if (val !== 'ALL') {
                                                        handleAddAllPoliciesOfClient(val);
                                                    }
                                                }}
                                            >
                                                <option value="ALL">⚡ Agregar todas las de un cliente...</option>
                                                {clients.map(c => (
                                                    <option key={c.id || c.name} value={c.name}>{c.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    {/* Buscador de Póliza */}
                                    <div style={{ position: 'relative', marginBottom: '0.5rem' }}>
                                        <input
                                            type="text"
                                            placeholder="Buscar póliza por número, cliente o aseguradora..."
                                            value={batchPolicySearch}
                                            onChange={e => {
                                                setBatchPolicySearch(e.target.value);
                                                setShowBatchPolicyResults(true);
                                            }}
                                            onFocus={() => setShowBatchPolicyResults(true)}
                                            style={{ width: '100%', padding: '0.65rem 0.75rem 0.65rem 2.2rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: '0.88rem' }}
                                        />
                                        <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />

                                        {showBatchPolicyResults && batchPolicySearch.trim().length > 0 && (
                                            <div style={{
                                                position: 'absolute', top: '100%', left: 0, right: 0,
                                                backgroundColor: 'white', border: '1px solid var(--border)',
                                                borderRadius: '0 0 var(--radius-sm) var(--radius-sm)',
                                                maxHeight: '220px', overflowY: 'auto', zIndex: 110,
                                                boxShadow: '0 6px 12px rgba(0,0,0,0.1)'
                                            }}>
                                                {policies
                                                    .filter(p => 
                                                        (p.client || '').toLowerCase().includes(batchPolicySearch.toLowerCase()) ||
                                                        (p.id || '').toLowerCase().includes(batchPolicySearch.toLowerCase()) ||
                                                        (p.insurer || '').toLowerCase().includes(batchPolicySearch.toLowerCase()) ||
                                                        (p.type || '').toLowerCase().includes(batchPolicySearch.toLowerCase())
                                                    )
                                                    .slice(0, 10)
                                                    .map(p => {
                                                        const isSelected = selectedPoliciesForBatch.some(item => item.id === p.id);
                                                        const stats = getPolicyPaymentStats(p, payments);
                                                        return (
                                                            <div
                                                                key={p.id}
                                                                onClick={() => {
                                                                    if (!isSelected) handleAddPolicyToBatch(p);
                                                                }}
                                                                style={{
                                                                    padding: '0.6rem 0.85rem',
                                                                    borderBottom: '1px solid #f1f5f9',
                                                                    display: 'flex',
                                                                    justifyContent: 'space-between',
                                                                    alignItems: 'center',
                                                                    cursor: isSelected ? 'default' : 'pointer',
                                                                    backgroundColor: isSelected ? '#f8fafc' : 'white',
                                                                    opacity: isSelected ? 0.6 : 1
                                                                }}
                                                                onMouseEnter={e => { if (!isSelected) e.currentTarget.style.backgroundColor = '#f1f5f9'; }}
                                                                onMouseLeave={e => { if (!isSelected) e.currentTarget.style.backgroundColor = 'white'; }}
                                                            >
                                                                <div>
                                                                    <div style={{ fontWeight: '600', fontSize: '0.88rem' }}>{p.client}</div>
                                                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                                        {p.id} · {p.type} · {p.insurer}
                                                                    </div>
                                                                </div>
                                                                <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                                    <div>
                                                                        <div style={{ fontSize: '0.8rem', fontWeight: '700', color: stats.totalOwed > 0 ? '#991b1b' : '#166534' }}>
                                                                            Debe: {formatMoney(stats.totalOwed)}
                                                                        </div>
                                                                    </div>
                                                                    {isSelected ? (
                                                                        <span style={{ fontSize: '0.75rem', color: '#059669', fontWeight: '700' }}>✓ Agregada</span>
                                                                    ) : (
                                                                        <span style={{ fontSize: '0.78rem', color: '#2563eb', fontWeight: '700' }}>+ Agregar</span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                            </div>
                                        )}
                                    </div>

                                    {/* 3. Lista de Pólizas Seleccionadas y Asignación de Montos */}
                                    <div style={{ marginTop: '1rem' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                            <span style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-main)' }}>
                                                Pólizas en este pago ({selectedPoliciesForBatch.length}):
                                            </span>
                                            {selectedPoliciesForBatch.length > 0 && (
                                                <div style={{ display: 'flex', gap: '0.4rem' }}>
                                                    <button
                                                        type="button"
                                                        onClick={handleAutoDistributeBatch}
                                                        style={{
                                                            padding: '0.3rem 0.65rem',
                                                            fontSize: '0.78rem',
                                                            borderRadius: 'var(--radius-sm)',
                                                            border: '1px solid #d97706',
                                                            backgroundColor: '#fef3c7',
                                                            color: '#92400e',
                                                            fontWeight: '700',
                                                            cursor: 'pointer',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '0.3rem'
                                                        }}
                                                        title="Distribuir el monto total recibido entre las pólizas seleccionadas"
                                                    >
                                                        <Sparkles size={13} /> Auto-distribuir Monto
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={handleSetAllFullOwed}
                                                        style={{
                                                            padding: '0.3rem 0.65rem',
                                                            fontSize: '0.78rem',
                                                            borderRadius: 'var(--radius-sm)',
                                                            border: '1px solid #86efac',
                                                            backgroundColor: '#f0fdf4',
                                                            color: '#166534',
                                                            fontWeight: '700',
                                                            cursor: 'pointer',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '0.3rem'
                                                        }}
                                                        title="Poner el monto adeudado exacto en cada póliza y actualizar el total recibido"
                                                    >
                                                        <Check size={13} /> Saldar Todas
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setSelectedPoliciesForBatch([])}
                                                        style={{
                                                            padding: '0.3rem 0.5rem',
                                                            fontSize: '0.78rem',
                                                            borderRadius: 'var(--radius-sm)',
                                                            border: '1px solid #cbd5e1',
                                                            backgroundColor: '#f8fafc',
                                                            color: '#64748b',
                                                            cursor: 'pointer'
                                                        }}
                                                        title="Limpiar lista"
                                                    >
                                                        Limpiar
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        {selectedPoliciesForBatch.length === 0 ? (
                                            <div style={{
                                                padding: '1.75rem 1rem',
                                                textAlign: 'center',
                                                backgroundColor: '#f8fafc',
                                                border: '1px dashed #cbd5e1',
                                                borderRadius: 'var(--radius-sm)',
                                                color: 'var(--text-muted)',
                                                fontSize: '0.85rem'
                                            }}>
                                                No has agregado ninguna póliza todavía. Busca arriba por cliente o número de póliza para añadirla a la distribución.
                                            </div>
                                        ) : (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '230px', overflowY: 'auto' }}>
                                                {selectedPoliciesForBatch.map((item) => (
                                                    <div
                                                        key={item.id}
                                                        style={{
                                                            padding: '0.65rem 0.85rem',
                                                            backgroundColor: '#f8fafc',
                                                            border: '1px solid #e2e8f0',
                                                            borderRadius: 'var(--radius-sm)',
                                                            display: 'flex',
                                                            justifyContent: 'space-between',
                                                            alignItems: 'center',
                                                            gap: '0.75rem'
                                                        }}
                                                    >
                                                        <div style={{ minWidth: '220px', flex: 1 }}>
                                                            <div style={{ fontWeight: '700', fontSize: '0.88rem', color: 'var(--text-main)' }}>
                                                                {item.client}
                                                            </div>
                                                            <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                                                <InsurerLogo name={item.insurer} size={14} />
                                                                <span>{item.id} · {item.type}</span>
                                                            </div>
                                                            <div style={{ fontSize: '0.72rem', color: item.totalOwed > 0 ? '#991b1b' : '#166534', fontWeight: '600', marginTop: '0.1rem' }}>
                                                                Pendiente: {formatMoney(item.totalOwed)}
                                                            </div>
                                                        </div>

                                                        {/* Monto Asignado a esta póliza */}
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                            <div style={{ textAlign: 'right' }}>
                                                                <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', margin: 0 }}>Monto a Aplicar (RD$)</label>
                                                                <input
                                                                    type="number"
                                                                    step="any"
                                                                    value={item.amountToPay}
                                                                    onChange={e => handleUpdateBatchAmount(item.id, e.target.value)}
                                                                    style={{
                                                                        width: '125px',
                                                                        padding: '0.35rem 0.5rem',
                                                                        textAlign: 'right',
                                                                        fontWeight: '700',
                                                                        fontSize: '0.9rem',
                                                                        borderColor: '#94a3b8'
                                                                    }}
                                                                />
                                                            </div>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleSetFullOwedForPolicy(item.id)}
                                                                style={{
                                                                    padding: '0.35rem 0.5rem',
                                                                    fontSize: '0.72rem',
                                                                    backgroundColor: '#f0fdf4',
                                                                    border: '1px solid #86efac',
                                                                    color: '#166534',
                                                                    borderRadius: 'var(--radius-sm)',
                                                                    cursor: 'pointer',
                                                                    fontWeight: '700'
                                                                }}
                                                                title="Saldar monto total adeudado de esta póliza"
                                                            >
                                                                Saldar
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleRemovePolicyFromBatch(item.id)}
                                                                style={{
                                                                    padding: '0.35rem',
                                                                    background: 'none',
                                                                    border: 'none',
                                                                    color: '#ef4444',
                                                                    cursor: 'pointer'
                                                                }}
                                                                title="Eliminar de la distribución"
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* 4. Barra de Balance y Validación en Tiempo Real */}
                                <div style={{
                                    padding: '0.85rem 1rem',
                                    backgroundColor: Math.abs(batchDifference) < 0.01 && totalBatchReceivedNum > 0 ? '#f0fdf4' : batchDifference < 0 ? '#fef2f2' : '#fefce8',
                                    border: `1px solid ${Math.abs(batchDifference) < 0.01 && totalBatchReceivedNum > 0 ? '#86efac' : batchDifference < 0 ? '#fca5a5' : '#fef08a'}`,
                                    borderRadius: 'var(--radius-sm)',
                                    marginBottom: '1.25rem'
                                }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', textAlign: 'center', marginBottom: '0.5rem' }}>
                                        <div>
                                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: '600' }}>TOTAL RECIBIDO</div>
                                            <div style={{ fontSize: '1rem', fontWeight: '800', color: 'var(--primary)' }}>
                                                {formatMoney(totalBatchReceivedNum)}
                                            </div>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: '600' }}>TOTAL ASIGNADO</div>
                                            <div style={{ fontSize: '1rem', fontWeight: '800', color: '#166534' }}>
                                                {formatMoney(totalBatchAllocatedNum)}
                                            </div>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: '600' }}>DIFERENCIA / RESTANTE</div>
                                            <div style={{ 
                                                fontSize: '1rem', 
                                                fontWeight: '800', 
                                                color: Math.abs(batchDifference) < 0.01 ? '#166534' : batchDifference < 0 ? '#991b1b' : '#b45309' 
                                            }}>
                                                {formatMoney(batchDifference)}
                                            </div>
                                        </div>
                                    </div>

                                    <div style={{ fontSize: '0.8rem', textAlign: 'center', fontWeight: '600' }}>
                                        {totalBatchReceivedNum === 0 ? (
                                            <span style={{ color: '#64748b' }}>ℹ️ Ingrese el monto total recibido para comenzar la distribución.</span>
                                        ) : Math.abs(batchDifference) < 0.01 ? (
                                            <span style={{ color: '#15803d' }}>✅ El monto total recibido coincide exactamente con la suma asignada a las pólizas (100% distribuido).</span>
                                        ) : batchDifference > 0 ? (
                                            <span style={{ color: '#b45309' }}>⚠️ Quedan {formatMoney(batchDifference)} por asignar del monto total recibido.</span>
                                        ) : (
                                            <span style={{ color: '#b91c1c' }}>❌ El monto asignado a las pólizas supera el total recibido por {formatMoney(Math.abs(batchDifference))}.</span>
                                        )}
                                    </div>
                                </div>

                                {/* Modal Actions */}
                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border)' }}>
                                    <button type="button" className="btn" onClick={() => setShowModal(false)} style={{ backgroundColor: '#f1f5f9' }}>
                                        Cancelar
                                    </button>
                                    <button 
                                        type="submit" 
                                        className="btn btn-primary" 
                                        disabled={isSavingMulti || selectedPoliciesForBatch.length === 0 || totalBatchReceivedNum <= 0}
                                        style={{ 
                                            display: 'flex', 
                                            alignItems: 'center', 
                                            gap: '0.5rem',
                                            backgroundColor: 'var(--primary)',
                                            fontWeight: '700'
                                        }}
                                    >
                                        {isSavingMulti ? (
                                            <>
                                                <Loader2 className="animate-spin" size={16} /> Procesando Pago...
                                            </>
                                        ) : (
                                            <>
                                                <Printer size={16} /> Aplicar Pago y Emitir Recibo Consolidado
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}

            {/* Modal de Procesamiento de Débitos Automáticos */}
            {showAutoBillingModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
                    padding: '1rem'
                }}>
                    <div className="card" style={{ width: '100%', maxWidth: '650px', backgroundColor: 'white', maxHeight: '90vh', overflowY: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                            <h3 style={{ margin: 0, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Zap size={22} color="#16a34a" /> Débitos / Cobros Automáticos Autorizados
                            </h3>
                            <button onClick={() => setShowAutoBillingModal(false)} style={{ background: 'none', border: 'none', padding: '0.5rem', cursor: 'pointer' }}>
                                <XCircle size={24} />
                            </button>
                        </div>

                        <div style={{ padding: '0.85rem 1rem', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 'var(--radius-sm)', marginBottom: '1.25rem', fontSize: '0.86rem', color: '#1e40af' }}>
                            💡 <strong>Regla de Cobro:</strong> Solo se procesan débitos automáticos para clientes que tienen activada la casilla de <strong>Cobro Automático</strong> en su ficha de cliente. Todos los clientes en <strong>Cobro Manual</strong> requieren registro manual.
                        </div>

                        {autoBillingCandidates.length === 0 ? (
                            <div style={{ padding: '2.5rem 1.5rem', textAlign: 'center', backgroundColor: '#f8fafc', borderRadius: 'var(--radius-md)', border: '1px solid #e2e8f0', marginBottom: '1.5rem' }}>
                                <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🛡️</div>
                                <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-main)' }}>No hay cobros automáticos pendientes</h4>
                                <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-muted)' }}>
                                    Todos los clientes registrados están en modalidad de <strong>Cobro Manual</strong> o ya están al día con sus pagos. Para activar cobro automático en un cliente, edite su perfil en la sección de Clientes.
                                </p>
                            </div>
                        ) : (
                            <div style={{ marginBottom: '1.5rem' }}>
                                <div style={{ fontWeight: '700', fontSize: '0.9rem', marginBottom: '0.75rem', color: 'var(--text-main)' }}>
                                    Pólizas autorizadas para cobro automático este período ({autoBillingCandidates.length}):
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', maxHeight: '300px', overflowY: 'auto' }}>
                                    {autoBillingCandidates.map((item, idx) => (
                                        <div key={idx} style={{
                                            padding: '0.85rem 1rem',
                                            backgroundColor: '#f0fdf4',
                                            border: '1px solid #bbf7d0',
                                            borderRadius: 'var(--radius-sm)',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            gap: '1rem'
                                        }}>
                                            <div>
                                                <div style={{ fontWeight: '700', color: '#14532d', fontSize: '0.92rem' }}>
                                                    {item.client.name}
                                                </div>
                                                <div style={{ fontSize: '0.78rem', color: '#166534', marginTop: '0.2rem' }}>
                                                    {item.policy.id} · {item.policy.type} ({item.policy.insurer})
                                                </div>
                                                <div style={{ fontSize: '0.75rem', color: '#15803d', marginTop: '0.15rem' }}>
                                                    💳 {item.debitMethod} · Día {item.debitDay} del mes
                                                </div>
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                <div style={{ fontWeight: '800', color: '#166534', fontSize: '1rem' }}>
                                                    {formatMoney(item.chargeAmount)}
                                                </div>
                                                <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                                                    Pendiente: {formatMoney(item.totalOwed)}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
                            <button type="button" className="btn" onClick={() => setShowAutoBillingModal(false)} style={{ backgroundColor: '#f1f5f9' }}>
                                Cerrar
                            </button>
                            {autoBillingCandidates.length > 0 && (
                                <button
                                    type="button"
                                    className="btn btn-primary"
                                    onClick={handleExecuteAutoBilling}
                                    disabled={isProcessingAuto}
                                    style={{
                                        backgroundColor: '#16a34a',
                                        borderColor: '#15803d',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.4rem'
                                    }}
                                >
                                    {isProcessingAuto ? (
                                        <>
                                            <Loader2 className="animate-spin" size={16} /> Procesando...
                                        </>
                                    ) : (
                                        <>
                                            <Zap size={16} /> Procesar {autoBillingCandidates.length} Cobro(s) Automático(s)
                                        </>
                                    )}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Official Cash Receipt PDF Preview Modal */}
            {showReceiptModal && selectedReceiptPayment && (
                <ReceiptModal
                    isOpen={showReceiptModal}
                    onClose={() => {
                        setShowReceiptModal(false);
                        setSelectedReceiptPayment(null);
                    }}
                    payment={selectedReceiptPayment}
                    policy={policies.find(p => p.id === selectedReceiptPayment.policyId || selectedReceiptPayment.policy?.includes(p.id)) || {}}
                />
            )}

            {/* Modal de Edición de Pagos (Exclusivo para Santiago Morales / Administrador) */}
            {showEditModal && editingPayment && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(15, 23, 42, 0.65)',
                    backdropFilter: 'blur(4px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000,
                    padding: '1rem',
                    animation: 'fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
                }}>
                    <div className="card" style={{
                        width: '100%',
                        maxWidth: '640px',
                        backgroundColor: '#ffffff',
                        maxHeight: '92vh',
                        overflowY: 'auto',
                        borderRadius: 'var(--radius-lg)',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                        border: '1px solid var(--border)',
                        padding: '1.75rem'
                    }}>
                        {/* Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.85rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                                <div style={{
                                    width: '40px', height: '40px', borderRadius: '10px',
                                    backgroundColor: '#eff6ff', color: 'var(--primary)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    border: '1px solid #bfdbfe'
                                }}>
                                    <Edit3 size={20} />
                                </div>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--primary)', fontWeight: '800' }}>
                                        Editar Registro de Pago
                                    </h3>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.2rem' }}>
                                        <span style={{ fontSize: '0.75rem', fontWeight: '800', padding: '0.12rem 0.45rem', borderRadius: '4px', backgroundColor: '#fef3c7', color: '#92400e', border: '1px solid #fde68a', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                                            <ShieldCheck size={12} /> {currentUser?.name?.split(' ')[0] || 'Administrador'}
                                        </span>
                                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                            Recibo #{editingPayment.id}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => { setShowEditModal(false); setEditingPayment(null); }}
                                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
                            >
                                <XCircle size={22} />
                            </button>
                        </div>

                        {/* Info Banner */}
                        <div style={{
                            padding: '0.75rem 1rem',
                            backgroundColor: '#f8fafc',
                            border: '1px solid #e2e8f0',
                            borderRadius: 'var(--radius-sm)',
                            marginBottom: '1.25rem',
                            fontSize: '0.85rem',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.35rem'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: 'var(--text-muted)' }}>Cliente:</span>
                                <strong style={{ color: 'var(--text-main)' }}>{editingPayment.client}</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: 'var(--text-muted)' }}>Póliza:</span>
                                <strong style={{ color: 'var(--primary)' }}>{editingPayment.policyId || editingPayment.policy}</strong>
                            </div>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleSaveEditedPayment}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                                <div>
                                    <label style={{ fontWeight: '700', fontSize: '0.85rem' }}>Monto Pagado *</label>
                                    <input
                                        type="number"
                                        step="any"
                                        required
                                        value={editFormData.amount}
                                        onChange={e => setEditFormData({ ...editFormData, amount: e.target.value })}
                                        style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: 'var(--radius-sm)', border: '2px solid var(--primary)', fontWeight: '700', fontSize: '1rem' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ fontWeight: '700', fontSize: '0.85rem' }}>Fecha del Pago *</label>
                                    <input
                                        type="date"
                                        required
                                        value={editFormData.date}
                                        onChange={e => setEditFormData({ ...editFormData, date: e.target.value })}
                                        style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                                <div>
                                    <label style={{ fontWeight: '700', fontSize: '0.85rem' }}>Método de Pago</label>
                                    <select
                                        value={editFormData.paymentMethod}
                                        onChange={e => setEditFormData({ ...editFormData, paymentMethod: e.target.value })}
                                        style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}
                                    >
                                        <option value="Efectivo">💵 Efectivo (Recibo de Caja)</option>
                                        <option value="Transferencia">🏦 Transferencia Bancaria</option>
                                        <option value="Tarjeta">💳 Tarjeta de Crédito / Débito</option>
                                        <option value="Cheque">📑 Cheque</option>
                                        <option value="Depósito">🏛️ Depósito Bancario</option>
                                    </select>
                                </div>
                                <div>
                                    <label style={{ fontWeight: '700', fontSize: '0.85rem' }}>Estado</label>
                                    <select
                                        value={editFormData.status}
                                        onChange={e => setEditFormData({ ...editFormData, status: e.target.value })}
                                        style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontWeight: '700' }}
                                    >
                                        <option value="Paid">✅ Pagado / Aplicado</option>
                                        <option value="Pending">⏳ Pendiente</option>
                                        <option value="Overdue">⚠️ Vencido</option>
                                    </select>
                                </div>
                            </div>

                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ fontWeight: '700', fontSize: '0.85rem' }}>Concepto</label>
                                <select
                                    value={editFormData.type}
                                    onChange={e => setEditFormData({ ...editFormData, type: e.target.value })}
                                    style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}
                                >
                                    <option value="Cuota Mensual">Cuota Mensual</option>
                                    <option value="Renovación">Renovación</option>
                                    <option value="Anual">Anual</option>
                                    <option value="Semestral">Semestral</option>
                                    <option value="Inicial">Inicial</option>
                                    <option value="Otro">Otro</option>
                                </select>
                                {editFormData.type === 'Otro' && (
                                    <input
                                        type="text"
                                        placeholder="Especificar concepto personalizado"
                                        value={editFormData.customType}
                                        onChange={e => setEditFormData({ ...editFormData, customType: e.target.value })}
                                        style={{ marginTop: '0.5rem', width: '100%', padding: '0.55rem 0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}
                                    />
                                )}
                            </div>

                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ fontWeight: '700', fontSize: '0.85rem' }}>No. de Referencia / Voucher / Cheque</label>
                                <input
                                    type="text"
                                    placeholder="Ej. TRF-99214 o Cheque #501"
                                    value={editFormData.reference}
                                    onChange={e => setEditFormData({ ...editFormData, reference: e.target.value })}
                                    style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}
                                />
                            </div>

                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ fontWeight: '700', fontSize: '0.85rem' }}>Notas / Observaciones</label>
                                <input
                                    type="text"
                                    placeholder="Detalles u observaciones del cobro..."
                                    value={editFormData.notes}
                                    onChange={e => setEditFormData({ ...editFormData, notes: e.target.value })}
                                    style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}
                                />
                            </div>

                            {/* Gestión de Documentos y Comprobantes Adjuntos (Opcional) */}
                            <div style={{
                                padding: '1rem',
                                backgroundColor: '#f8fafc',
                                border: '1.5px dashed #cbd5e1',
                                borderRadius: 'var(--radius-sm)',
                                marginBottom: '1.5rem'
                            }}>
                                <label style={{ fontWeight: '700', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#1e293b', marginBottom: '0.5rem' }}>
                                    <Paperclip size={16} color="#0284c7" /> Documentos y Evidencias de Pago Adjuntas (Opcional)
                                </label>

                                {editAttachedDocs.length > 0 && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '0.75rem' }}>
                                        {editAttachedDocs.map((doc, idx) => (
                                            <div key={doc.id || idx} style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                padding: '0.5rem 0.75rem',
                                                backgroundColor: '#ffffff',
                                                border: '1px solid #e2e8f0',
                                                borderRadius: 'var(--radius-sm)',
                                                fontSize: '0.82rem'
                                            }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', minWidth: 0 }}>
                                                    <FileText size={15} color="#2563eb" />
                                                    <span style={{ fontWeight: '600', color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                        {doc.name}
                                                    </span>
                                                    {doc.size && <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>({doc.size})</span>}
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    {doc.dataUri && (
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setSelectedViewingDoc(doc);
                                                                setShowDocViewer(true);
                                                            }}
                                                            style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', fontWeight: '700', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
                                                        >
                                                            <Eye size={13} /> Ver
                                                        </button>
                                                    )}
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveEditAttachedDoc(doc.id)}
                                                        style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontWeight: '700', fontSize: '0.78rem' }}
                                                    >
                                                        ✕ Quitar
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <input
                                        type="file"
                                        multiple
                                        accept="image/*,.pdf"
                                        onChange={handleEditFileChange}
                                        style={{ width: '100%', padding: '0.45rem 0.65rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', backgroundColor: '#ffffff', fontSize: '0.82rem' }}
                                    />
                                </div>
                            </div>

                            {/* Modal Actions */}
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
                                <button
                                    type="button"
                                    className="btn"
                                    onClick={() => { setShowEditModal(false); setEditingPayment(null); }}
                                    disabled={isSavingEdit}
                                    style={{ backgroundColor: '#f1f5f9' }}
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    disabled={isSavingEdit}
                                    style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: '700' }}
                                >
                                    {isSavingEdit ? <RefreshCw size={16} className="animate-spin" /> : <Check size={16} />}
                                    {isSavingEdit ? 'Guardando Cambios...' : 'Guardar Cambios'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Visor de Documentos y Evidencias Adjuntas */}
            {showDocViewer && selectedViewingDoc && (
                <DocumentViewerModal
                    isOpen={showDocViewer}
                    onClose={() => {
                        setShowDocViewer(false);
                        setSelectedViewingDoc(null);
                    }}
                    document={selectedViewingDoc}
                />
            )}
        </div>
    );
};

export default PaymentManagement;
