export const getNextRenewalDate = (startDate, renewalFrequency) => {
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

export const calculatePolicyStatus = (policy, paymentsList = []) => {
    const todayStr = new Date().toISOString().split('T')[0];
    
    if (!policy.startDate) {
        return policy.status || 'Active';
    }

    const nextRenewal = getNextRenewalDate(policy.startDate, policy.renewalFrequency);

    if (todayStr > nextRenewal) {
        return 'Expired';
    }

    // Check payments for this policy
    const policyPayments = paymentsList.filter(p => p.policyId === policy.id);
    
    // If there are overdue payments, status is Expired (lapsed due to non-payment)
    const hasOverdue = policyPayments.some(p => p.status === 'Overdue');
    if (hasOverdue) {
        return 'Expired';
    }

    // If there are pending payments, status is Pending
    const hasPending = policyPayments.some(p => p.status === 'Pending');
    if (hasPending) {
        return 'Pending';
    }

    // If nextRenewal is within 30 days, we can mark it as Expiring soon (Por vencer)
    const nextRenewalTime = new Date(nextRenewal + 'T00:00:00');
    const todayTime = new Date(todayStr + 'T00:00:00');
    const diffTime = nextRenewalTime - todayTime;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays >= 0 && diffDays <= 30) {
        return 'Expiring';
    }

    return 'Active';
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
