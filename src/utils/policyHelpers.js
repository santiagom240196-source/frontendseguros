export const getNextRenewalDate = (startDate, renewalFrequency, endDate) => {
    // Si ya existe la fecha final (vigencia_fin), esa es la fecha de próxima renovación
    if (endDate && String(endDate).match(/^\d{4}-\d{2}-\d{2}$/)) {
        return endDate;
    }
    if (!startDate) return '';
    const start = new Date(startDate + 'T00:00:00');
    let expiration = new Date(start);
    const freq = renewalFrequency || 'Anual';
    if (freq === 'Mensual') {
        expiration.setMonth(start.getMonth() + 1);
    } else if (freq === 'Trimestral') {
        expiration.setMonth(start.getMonth() + 3);
    } else if (freq === 'Semestral') {
        expiration.setMonth(start.getMonth() + 6);
    } else { // Anual
        expiration.setFullYear(start.getFullYear() + 1);
    }
    return expiration.toISOString().split('T')[0];
};

/**
 * Calcula el estado de la póliza y ejecuta las reglas de negocio de renovación y cancelación:
 * 1. Si pasó la fecha final y el pago se hizo completo -> Renovar automáticamente y actualizar fechas.
 * 2. Si pasó la fecha final y tiene pago pendiente -> Estado 'Pending' (Alerta de pago pendiente).
 * 3. Si pasó la fecha final y no ha pagado nada -> Estado 'Cancelled' (Cancelada).
 * 4. Si aún no ha pasado y faltan <= 30 días -> 'Expiring' (Por Vencer).
 * 5. Si aún no ha pasado y faltan > 30 días -> 'Active' (Vigente).
 */
export const processPolicyRenewalAndStatus = (policy, paymentsList = []) => {
    if (!policy) return { status: 'Active', isAutoRenewed: false, totalPaid: 0, totalOwed: 0, policy };

    const todayStr = new Date().toISOString().split('T')[0];
    const totalPremium = getPolicyAmountNumeric(policy.amount);
    
    // Pagos de esta póliza
    const policyPayments = paymentsList.filter(p => p.policyId === policy.id || p.polizaId === policy.rawId || p.polizaId === policy.id);
    const totalPaid = policyPayments
        .filter(p => p.status === 'Paid')
        .reduce((acc, p) => acc + (p.amountNum || 0), 0);
    const totalOwed = Math.max(0, totalPremium - totalPaid);

    // REGLA DE NEGOCIO: Si la póliza tiene un movimiento de cancelación o fue formalmente cancelada
    const hasCancellationMovement = (policy.movements || []).some(m => 
        (m.type && m.type.toLowerCase().includes('cancel')) || 
        (m.tipo && m.tipo.toLowerCase().includes('cancel')) ||
        (m.description && m.description.toLowerCase().includes('cancel')) ||
        (m.descripcion && m.descripcion.toLowerCase().includes('cancel'))
    );

    if (policy.status === 'Cancelled' || policy.status === 'Cancelada' || policy.isCancelled || hasCancellationMovement) {
        return {
            status: 'Cancelled',
            isAutoRenewed: false,
            totalPaid,
            totalOwed: Math.max(0, totalPremium - totalPaid),
            policy: {
                ...policy,
                status: 'Cancelled'
            }
        };
    }

    let endDate = policy.endDate || policy.vigenciaFin || policy.renewal || getNextRenewalDate(policy.lastRenewalDate || policy.startDate, policy.renewalFrequency);
    let startDate = policy.startDate || '2025-01-01';
    let lastRenewalDate = policy.lastRenewalDate || startDate;

    let currentStatus = policy.status || 'Active';
    let isAutoRenewed = false;
    let updatedPolicy = { ...policy };

    // Si pasó la fecha de renovación (fecha final)
    if (endDate && todayStr > endDate) {
        // CASO 1: Pago 100% completo -> Renovar automáticamente y actualizar fechas
        if (totalPaid >= totalPremium && totalPremium > 0) {
            lastRenewalDate = endDate;
            const nextEndDate = getNextRenewalDate(lastRenewalDate, policy.renewalFrequency);
            endDate = nextEndDate;
            currentStatus = 'Active';
            isAutoRenewed = true;

            updatedPolicy = {
                ...updatedPolicy,
                lastRenewalDate,
                endDate,
                renewal: nextEndDate,
                status: 'Active',
                movements: [
                    ...(policy.movements || []),
                    {
                        id: (policy.movements?.length || 0) + 1,
                        date: todayStr,
                        type: 'Renovación Automática',
                        description: `Renovación automática completada por pago del 100% de la prima. Nueva vigencia hasta ${formatDateToDDMMYYYY(nextEndDate)}.`,
                        evidence: 'N/A'
                    }
                ]
            };
        } 
        // CASO 2: Tiene pago pendiente (hizo pagos parciales pero debe saldo)
        else if (totalPaid > 0 && totalOwed > 0) {
            currentStatus = 'Pending';
        } 
        // CASO 3: No pagó nada (0% pagado) -> Cancelarla
        else if (totalPaid === 0) {
            currentStatus = 'Cancelled';
            updatedPolicy = {
                ...updatedPolicy,
                status: 'Cancelled'
            };
        } else {
            currentStatus = 'Pending';
        }
    } else if (endDate) {
        // Aún dentro del período de vigencia (todayStr <= endDate)
        const endDateTime = new Date(endDate + 'T00:00:00');
        const todayTime = new Date(todayStr + 'T00:00:00');
        const diffDays = Math.ceil((endDateTime - todayTime) / (1000 * 60 * 60 * 24));
        
        if (diffDays >= 0 && diffDays <= 30) {
            currentStatus = 'Expiring';
        } else {
            currentStatus = 'Active';
        }
    }

    return {
        status: currentStatus,
        isAutoRenewed,
        totalPaid,
        totalOwed,
        policy: updatedPolicy
    };
};

export const calculatePolicyStatus = (policy, paymentsList = []) => {
    const res = processPolicyRenewalAndStatus(policy, paymentsList);
    return res.status;
};

export const getPolicyAmountNumeric = (amountStr) => {
    if (!amountStr) return 0;
    if (typeof amountStr === 'number') return amountStr;
    const num = parseFloat(amountStr.replace(/[^0-9.]/g, ''));
    return isNaN(num) ? 0 : num;
};

export const getPolicyPaymentStats = (policy, paymentsList = []) => {
    const totalPremium = getPolicyAmountNumeric(policy.amount);
    
    // Sum of all paid payments
    const policyPayments = paymentsList.filter(p => p.policyId === policy.id && p.status === 'Paid');
    const totalPaid = policyPayments.reduce((acc, p) => acc + (p.amountNum || 0), 0);
    
    const totalOwed = Math.max(0, totalPremium - totalPaid);
    
    // Calculate installment value based on frequency
    const freq = policy.renewalFrequency || 'Anual';
    let divisor = 1;
    if (freq === 'Mensual') divisor = 12;
    else if (freq === 'Trimestral') divisor = 4;
    else if (freq === 'Semestral') divisor = 2;
    
    const standardInstallment = totalPremium / divisor;
    const nextInstallment = totalOwed > 0 ? Math.min(standardInstallment, totalOwed) : 0;
    
    return {
        totalPremium,
        totalPaid,
        totalOwed,
        nextInstallment
    };
};

export const formatDateToDDMMYYYY = (dateStr) => {
    if (!dateStr) return '';
    // If it already contains slash, return as is
    if (String(dateStr).includes('/')) return dateStr;
    
    // Split on dash to convert YYYY-MM-DD to DD/MM/YYYY
    const parts = String(dateStr).split('-');
    if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    
    try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        const dd = String(d.getDate()).padStart(2, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const yyyy = d.getFullYear();
        return `${dd}/${mm}/${yyyy}`;
    } catch (e) {
        return dateStr;
    }
};

export const formatMoney = (amountVal, currency = 'DOP') => {
    if (amountVal === undefined || amountVal === null || amountVal === '') {
        return currency === 'USD' ? 'USD$ 0.00' : 'RD$ 0.00';
    }
    
    let isUSD = currency === 'USD';
    let rawStr = String(amountVal);
    if (rawStr.includes('USD') || (rawStr.includes('$') && !rawStr.includes('RD'))) {
        isUSD = true;
    }
    
    const numeric = typeof amountVal === 'number' ? amountVal : parseFloat(rawStr.replace(/[^0-9.]/g, ''));
    if (isNaN(numeric)) {
        return isUSD ? 'USD$ 0.00' : 'RD$ 0.00';
    }
    
    const formatted = numeric.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const prefix = isUSD ? 'USD$ ' : 'RD$ ';
    return `${prefix}${formatted}`;
};

/**
 * Determina si un siniestro se encuentra actualmente abierto o en trámite
 */
export const isOpenClaim = (claim) => {
    if (!claim) return false;
    const status = String(claim.status || '').toLowerCase().trim();
    if (status === 'cerrado' || status === 'rechazado' || status === 'closed' || status === 'rejected') {
        return false;
    }
    return true; // 'Abierto', 'EnProceso', 'En Proceso', 'Investigación', etc.
};

/**
 * Obtiene los siniestros asociados a una póliza
 */
export const getPolicyClaims = (policy, claims = []) => {
    if (!policy || !Array.isArray(claims)) return [];
    const polIdStr = String(policy.id || '').trim().toLowerCase();
    const rawIdStr = policy.rawId !== undefined && policy.rawId !== null ? String(policy.rawId) : '';

    return claims.filter(c => {
        if (c.polizaId !== undefined && c.polizaId !== null && (String(c.polizaId) === rawIdStr || String(c.polizaId) === String(policy.id))) {
            return true;
        }
        const claimPolStr = String(c.policy || '').trim().toLowerCase();
        if (claimPolStr && (claimPolStr === polIdStr || claimPolStr.includes(polIdStr))) {
            return true;
        }
        return false;
    });
};

/**
 * Obtiene los siniestros asociados a un cliente
 */
export const getClientClaims = (client, claims = [], policies = []) => {
    if (!client || !Array.isArray(claims)) return [];
    const clientIdStr = String(client.id || '');
    const clientNameNorm = String(client.name || '').trim().toLowerCase();

    // Obtener IDs de pólizas del cliente
    const clientPolicyIds = new Set();
    if (Array.isArray(policies)) {
        policies.forEach(p => {
            const matchesClient = 
                (p.clienteId !== undefined && String(p.clienteId) === clientIdStr) ||
                (p.client && p.client.trim().toLowerCase() === clientNameNorm);
            if (matchesClient) {
                if (p.id) clientPolicyIds.add(String(p.id).trim().toLowerCase());
                if (p.rawId) clientPolicyIds.add(String(p.rawId));
            }
        });
    }

    return claims.filter(c => {
        if (c.clienteId !== undefined && c.clienteId !== null && String(c.clienteId) === clientIdStr) {
            return true;
        }
        if (c.client && c.client.trim().toLowerCase() === clientNameNorm) {
            return true;
        }
        if (c.polizaId && clientPolicyIds.has(String(c.polizaId))) {
            return true;
        }
        if (c.policy && clientPolicyIds.has(String(c.policy).trim().toLowerCase())) {
            return true;
        }
        return false;
    });
};

/**
 * Determina si una póliza corresponde a un código de corredor y aseguradora específico
 */
export const policyMatchesAgentCode = (policy, codeItem) => {
    if (!policy || !codeItem) return false;
    
    const polInsurer = (policy.insurer || '').toLowerCase().trim();
    const targetInsurer = (codeItem.insurer || '').toLowerCase().trim();
    
    // Normalización de aseguradoras dominicanas
    const isColonial = (polInsurer.includes('colonial') || polInsurer === 'la colonial') && (targetInsurer.includes('colonial') || targetInsurer === 'la colonial');
    const isHumano = polInsurer.includes('humano') && targetInsurer.includes('humano');
    const isUniversal = polInsurer.includes('universal') && targetInsurer.includes('universal');
    const isMapfre = polInsurer.includes('mapfre') && targetInsurer.includes('mapfre');
    const isReservas = polInsurer.includes('reservas') && targetInsurer.includes('reservas');
    const isSura = polInsurer.includes('sura') && targetInsurer.includes('sura');
    
    const insurerMatch = isColonial || isHumano || isUniversal || isMapfre || isReservas || isSura || 
        polInsurer === targetInsurer || polInsurer.includes(targetInsurer) || targetInsurer.includes(polInsurer);
    
    if (!insurerMatch) return false;
    
    const polCode = String(policy.agentCode || policy.codigoAsegurador || '').trim();
    const polCartera = String(policy.cartera || '').trim().toLowerCase();
    const targetCode = String(codeItem.code || '').trim();
    const targetAgent = String(codeItem.agent || '').trim().toLowerCase();

    // Caso Raquel Rodríguez
    if (targetAgent.includes('raquel') || targetCode === '897') {
        return polCartera.includes('raquel') || polCode === '897';
    }

    // Caso Santiago Morales y Asociados
    if (targetAgent.includes('santiago') || !polCartera.includes('raquel')) {
        if (targetCode === '8055') {
            return isColonial;
        }
        if (targetCode === '76713') {
            return isHumano;
        }
        if (polCode === targetCode) {
            return true;
        }
    }

    return polCode === targetCode;
};

export const LA_COLONIAL_DENOMINATIONS = {
    '170': { code: '170', ramo: '170 Seguro Médico Catastrófico', category: 'Salud', label: 'Seguro Médico Catastrófico' },
    '183': { code: '183', ramo: '183 Seguro Médico Internacional Individual', category: 'Salud', label: 'Seguro Médico Internacional Individual' },
    '188': { code: '188', ramo: '188 Seguro Médico Internacional Aetna Familiar', category: 'Salud', label: 'Seguro Médico Internacional Aetna Familiar' },
    '200': { code: '200', ramo: '200 Incendio y Líneas Aliadas', category: 'Incendio', label: 'Incendio y Líneas Aliadas' },
    '205': { code: '205', ramo: '205 Todo Riesgo Incendio', category: 'Incendio', label: 'Todo Riesgo Incendio' },
    '207': { code: '207', ramo: '207 Multiprotección Viviendas', category: 'Incendio', label: 'Multiprotección Viviendas' },
    '400': { code: '400', ramo: '400 Transporte de Carga', category: 'Transporte de Carga', label: 'Transporte de Carga' },
    '402': { code: '402', ramo: '402 Transporte Terrestre', category: 'Transporte de Carga', label: 'Transporte Terrestre' },
    '500': { code: '500', ramo: '500 Vehículos de Motor', category: 'Auto', label: 'Vehículos de Motor' },
    '504': { code: '504', ramo: '504 Vehículos de Motor ArmaloTu', category: 'Auto', label: 'Vehículos de Motor ÁrmaloTú' },
    '710': { code: '710', ramo: '710 Fianzas Comerciales', category: 'Fidelidad / Fianzas', label: 'Fianzas Comerciales' },
    '713': { code: '713', ramo: '713 Fianzas Judiciales', category: 'Fidelidad / Fianzas', label: 'Fianzas Judiciales' },
    '714': { code: '714', ramo: '714 Fianzas de Cumplimiento', category: 'Fidelidad / Fianzas', label: 'Fianzas de Cumplimiento' },
    '732': { code: '732', ramo: '732 Fidelidad 3D', category: 'Fidelidad / Fianzas', label: 'Fidelidad 3D' },
    '812': { code: '812', ramo: '812 Todo Riesgo Equipo Contratista', category: 'Otros', label: 'Todo Riesgo Equipo Contratista' },
    '813': { code: '813', ramo: '813 Todo Riesgo Construcción (CAR)', category: 'Otros', label: 'Todo Riesgo Construcción (CAR)' },
    '830': { code: '830', ramo: '830 Responsabilidad Civil General', category: 'Responsabilidad Civil', label: 'Responsabilidad Civil General' },
    '831': { code: '831', ramo: '831 Responsabilidad Civil General Exceso', category: 'Responsabilidad Civil', label: 'Responsabilidad Civil Exceso' },
    '839': { code: '839', ramo: '839 Responsabilidad Civil Profesional', category: 'Responsabilidad Civil', label: 'Responsabilidad Civil Profesional' },
};

export const getLaColonialRamoInfo = (policyNumber) => {
    if (!policyNumber) return null;
    const str = String(policyNumber).trim();
    const parts = str.split('-');
    let code = '';
    if (parts.length >= 3) {
        code = parts[2];
    } else {
        const digits = str.replace(/\D/g, '');
        if (digits.length === 12) {
            code = digits.slice(2, 5);
        }
    }
    return LA_COLONIAL_DENOMINATIONS[code] || null;
};


