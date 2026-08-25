/**
 * Hasura Service
 * GraphQL queries, mutations, adapters and synchronization methods.
 * Full relational schema support: clientes, polizas, companias, cobros, siniestros, movimientos_poliza.
 */

import { executeGraphQL } from './hasuraClient';
import { formatMoney, formatDateToDDMMYYYY, getNextRenewalDate } from '../utils/policyHelpers';

// ─── GraphQL Master Query ───────────────────────────────────────────────────

export const GET_ALL_DATA_QUERY = `
  query GetAllSegurosData {
    clientes(order_by: { id: asc }) {
      id
      nombre
      apellidos
      cedula_rnc
      codigo_compania
      cartera
      codigo_agente
      email
      telefono
      tipo_personeria
      notas
      created_at
    }
    polizas(order_by: { id: asc }) {
      id
      cliente_id
      numero_poliza
      compania
      codigo_asegurador
      cartera
      codigo_agente
      ramo
      inicio_poliza
      vigencia_inicio
      vigencia_fin
      renovacion
      frecuencia_pago
      monto
      prima_anual
      status
      created_at
    }
    companias(order_by: { id: asc }) {
      id
      nombre
      dominio
      comision_porcentaje
      telefono
      email_contacto
      direccion
      logo_url
      activa
    }
    agentes_codigos(order_by: { agente: asc, compania: asc }) {
      id
      agente
      compania
      codigo
      notas
      created_at
    }
    cobros(order_by: { id: desc }) {
      id
      numero_recibo
      poliza_id
      cliente_id
      fecha
      fecha_vencimiento
      monto
      moneda
      tipo
      status
      metodo_pago
      comprobante
      notas
    }
    siniestros(order_by: { id: desc }) {
      id
      numero_siniestro
      poliza_id
      cliente_id
      tipo
      fecha_ocurrencia
      fecha_reporte
      descripcion
      monto_reclamado
      monto_aprobado
      moneda
      status
      ajustador_nombre
      ajustador_telefono
      archivos_adjuntos
      notas
      created_at
    }
    movimientos_poliza(order_by: { fecha: desc }) {
      id
      poliza_id
      fecha
      tipo
      descripcion
      evidencia
    }
    solicitudes(order_by: { id: desc }) {
      id
      numero_solicitud
      tipo
      subtipo
      cliente_id
      poliza_id
      cliente_nombre
      compania
      cartera
      ramo
      fecha_solicitud
      fecha_efectiva
      status
      prioridad
      monto_estimado
      devolucion_estimada
      descripcion
      motivo
      notas_aseguradora
      numero_endoso
      nueva_poliza_id
      adjuntos
      created_at
      updated_at
    }
  }
`;

// ─── Normalizers & Adapters ──────────────────────────────────────────────────

export const normalizeClientFromHasura = (c) => {
  const fullName = c.apellidos ? `${c.nombre} ${c.apellidos}`.trim() : (c.nombre || '');
  const personType = c.tipo_personeria === 'Moral' || c.tipo_personeria === 'Jurídica' ? 'Jurídica' : 'Física';
  const isRaquel = (c.cartera && c.cartera.includes('Raquel')) || c.codigo_agente === '897';
  const cartera = isRaquel ? 'Raquel Rodríguez' : (c.cartera || 'Santiago Morales y Asociados, S.R.L.');
  const agentCode = isRaquel ? '897' : (c.codigo_agente || '8055');

  // Extracción de configuración de cobro automático (Manual por defecto)
  let cobroAutomatico = false;
  let metodoCobroAutomatico = 'Tarjeta de Crédito';
  let diaCobroAutomatico = 15;
  const notasRaw = c.notas || '';

  if (notasRaw.includes('[COBRO_AUTO')) {
    cobroAutomatico = true;
    const match = notasRaw.match(/\[COBRO_AUTO:([^:\]]+)(?::(\d+))?\]/);
    if (match) {
      metodoCobroAutomatico = match[1] || 'Tarjeta de Crédito';
      diaCobroAutomatico = match[2] ? parseInt(match[2], 10) : 15;
    }
  }

  return {
    id: c.id,
    name: fullName,
    personType,
    documentId: c.cedula_rnc || (personType === 'Jurídica' ? '1-01-00000-0' : '001-0000000-0'),
    insurerCode: c.codigo_compania ? String(c.codigo_compania) : agentCode,
    agentCode,
    cartera,
    email: c.email || '',
    phone: c.telefono || '',
    address: '',
    city: 'Santo Domingo',
    sector: '',
    policy: notasRaw.replace(/\[COBRO_AUTO:[^\]]+\]\s*/g, '').trim(),
    cobroAutomatico,
    metodoCobroAutomatico,
    diaCobroAutomatico,
    status: 'Active',
    folderLink: '#',
  };
};

export const normalizePolicyFromHasura = (p, clientMap = {}, movementsMap = {}) => {
  const clientName = clientMap[p.cliente_id] || `Cliente #${p.cliente_id}`;
  const policyNum = p.numero_poliza || `POL-${String(p.id).padStart(3, '0')}`;
  
  // Format ramo / type cleanly
  let type = p.ramo || 'General';
  if (type.toLowerCase().includes('auto') || type.toLowerCase().includes('vehiculo')) type = 'Auto';
  else if (type.toLowerCase().includes('medico') || type.toLowerCase().includes('salud') || type.toLowerCase().includes('aetna')) type = 'Salud';
  else if (type.toLowerCase().includes('vida')) type = 'Vida';
  else if (type.toLowerCase().includes('incendio') || type.toLowerCase().includes('propiedad')) type = 'Incendio';
  else if (type.toLowerCase().includes('responsabilidad')) type = 'Responsabilidad Civil';
  else type = p.ramo.replace(/^\d+\s*-?\s*/, '').trim() || 'General';

  // Frequency
  let frequency = 'Anual';
  if (p.frecuencia_pago) {
    const fLower = p.frecuencia_pago.toLowerCase();
    if (fLower.includes('mensual')) frequency = 'Mensual';
    else if (fLower.includes('trimestral')) frequency = 'Trimestral';
    else if (fLower.includes('semestral')) frequency = 'Semestral';
    else frequency = 'Anual';
  }

  // Insurer normalization
  let rawInsurer = String(p.compania || '').trim();
  let insurer = 'La Colonial de Seguros';
  const insUpper = rawInsurer.toUpperCase();

  if (insUpper.includes('COLONIAL') || rawInsurer === '897' || rawInsurer === '8055' || (p.numero_poliza && String(p.numero_poliza).startsWith('1-2-'))) {
    insurer = 'La Colonial de Seguros';
  } else if (insUpper.includes('HUMANO') || rawInsurer === '76713') {
    insurer = 'Humano Seguros';
  } else if (insUpper.includes('UNIVERSAL')) {
    insurer = 'Seguros Universal';
  } else if (insUpper.includes('MAPFRE')) {
    insurer = 'Mapfre BHD Seguros';
  } else if (insUpper.includes('RESERVAS')) {
    insurer = 'Seguros Reservas';
  } else if (insUpper.includes('SURA')) {
    insurer = 'Seguros Sura';
  } else if (rawInsurer) {
    insurer = rawInsurer;
  }

  const isRaquel = (p.cartera && p.cartera.includes('Raquel')) || p.codigo_agente === '897' || rawInsurer === '897';
  const cartera = isRaquel ? 'Raquel Rodríguez' : (p.cartera || 'Santiago Morales y Asociados, S.R.L.');
  const agentCode = isRaquel ? '897' : (p.codigo_agente || (insurer === 'Humano Seguros' ? '76713' : '8055'));

  const movements = movementsMap[p.id] || [];

  const startDate = p.inicio_poliza || '2025-01-01';
  const lastRenewalDate = p.vigencia_inicio || p.inicio_poliza || '2025-01-01';
  const endDate = p.vigencia_fin || getNextRenewalDate(lastRenewalDate, frequency);

  return {
    id: policyNum,
    rawId: p.id,
    clienteId: p.cliente_id,
    client: clientName,
    type,
    insurer,
    cartera,
    agentCode,
    startDate,
    lastRenewalDate,
    endDate,
    renewal: endDate,
    renewalFrequency: frequency,
    insuredAmount: p.monto ? formatMoney(Number(p.monto)) : 'RD$ 0',
    amount: p.prima_anual ? formatMoney(Number(p.prima_anual)) : 'RD$ 0',
    details: p.ramo ? `Ramo: ${p.ramo}` : 'Cobertura estándar',
    movements,
  };
};

export const normalizeCobroFromHasura = (cobro, clientMap = {}, policyMap = {}) => {
  const policyObj = policyMap[cobro.poliza_id] || {};
  const clientName = clientMap[cobro.cliente_id] || policyObj.client || `Cliente #${cobro.cliente_id || ''}`;
  const policyIdStr = policyObj.numero_poliza || (cobro.poliza_id ? `POL-${String(cobro.poliza_id).padStart(3, '0')}` : 'General');
  const policyLabel = policyObj.ramo ? `${policyObj.ramo} - ${policyObj.compania || ''} (${policyIdStr})` : policyIdStr;

  const rawMonto = Number(cobro.monto) || 0;

  return {
    id: cobro.numero_recibo || `PAY-${String(cobro.id).padStart(3, '0')}`,
    rawId: cobro.id,
    polizaId: cobro.poliza_id,
    clienteId: cobro.cliente_id,
    client: clientName,
    policyId: policyIdStr,
    policy: policyLabel,
    date: cobro.fecha || '2026-02-15',
    dueDate: cobro.fecha_vencimiento,
    amount: formatMoney(rawMonto, cobro.moneda || 'DOP'),
    amountNum: rawMonto,
    status: cobro.status || 'Pending',
    type: cobro.tipo || 'Renovación',
    paymentMethod: cobro.metodo_pago,
    receiptUrl: cobro.comprobante,
    notes: cobro.notas || '',
  };
};

export const normalizeSiniestroFromHasura = (s, clientMap = {}, policyMap = {}) => {
  const policyObj = policyMap[s.poliza_id] || {};
  const clientName = clientMap[s.cliente_id] || policyObj.client || `Cliente #${s.cliente_id || ''}`;
  const policyIdStr = policyObj.numero_poliza || (s.poliza_id ? `POL-${String(s.poliza_id).padStart(3, '0')}` : 'General');
  const policyLabel = policyObj.ramo ? `${policyObj.ramo} · ${policyObj.compania || ''}` : policyIdStr;

  const rawReclamado = Number(s.monto_reclamado) || 0;
  const rawAprobado = Number(s.monto_aprobado) || 0;

  let attachments = [];
  if (Array.isArray(s.archivos_adjuntos)) {
    attachments = s.archivos_adjuntos;
  } else if (typeof s.archivos_adjuntos === 'string') {
    try { attachments = JSON.parse(s.archivos_adjuntos); } catch (e) {}
  }

  return {
    id: s.numero_siniestro || `SIN-${String(s.id).padStart(3, '0')}`,
    rawId: s.id,
    polizaId: s.poliza_id,
    clienteId: s.cliente_id,
    client: clientName,
    policy: policyIdStr,
    policyDesc: policyLabel,
    type: s.tipo,
    date: s.fecha_ocurrencia,
    reportDate: s.fecha_reporte || s.fecha_ocurrencia,
    description: s.descripcion,
    amount: formatMoney(rawReclamado, s.moneda || 'DOP'),
    amountNum: rawReclamado,
    amountApproved: formatMoney(rawAprobado, s.moneda || 'DOP'),
    amountApprovedNum: rawAprobado,
    status: s.status || 'Abierto',
    adjuster: s.ajustador_nombre || '',
    phone: s.ajustador_telefono || '',
    attachments,
    notes: s.notas || '',
  };
};

export const normalizeSolicitudFromHasura = (s, clientMap = {}, policyMap = {}) => {
  const clientName = s.cliente_nombre || clientMap[s.cliente_id] || (s.cliente_id ? `Cliente #${s.cliente_id}` : 'General');
  const policyObj = policyMap[s.poliza_id] || {};
  const policyIdStr = policyObj.numero_poliza || (s.poliza_id ? `POL-${String(s.poliza_id).padStart(3, '0')}` : '');

  const montoNum = Number(s.monto_estimado) || 0;
  const devolucionNum = Number(s.devolucion_estimada) || 0;

  let attachments = [];
  try {
    attachments = Array.isArray(s.adjuntos) ? s.adjuntos : JSON.parse(s.adjuntos || '[]');
  } catch (e) {
    attachments = [];
  }

  return {
    id: s.numero_solicitud || `SOL-${String(s.id).padStart(4, '0')}`,
    rawId: s.id,
    type: s.tipo || 'Emisión',
    subtype: s.subtipo || '',
    clienteId: s.cliente_id,
    client: clientName,
    polizaId: s.poliza_id,
    policy: policyIdStr,
    policyDesc: policyObj.ramo ? `${policyObj.ramo} · ${policyObj.compania || ''}` : (s.ramo || ''),
    insurer: s.compania || policyObj.compania || 'La Colonial de Seguros',
    cartera: s.cartera || 'Santiago Morales y Asociados, S.R.L.',
    ramo: s.ramo || policyObj.ramo || 'General',
    requestDate: s.fecha_solicitud || new Date().toISOString().split('T')[0],
    effectiveDate: s.fecha_efectiva || '',
    status: s.status || 'Pendiente',
    priority: s.prioridad || 'Media',
    estimatedAmount: montoNum ? formatMoney(montoNum) : '',
    estimatedAmountNum: montoNum,
    estimatedRefund: devolucionNum ? formatMoney(devolucionNum) : '',
    estimatedRefundNum: devolucionNum,
    description: s.descripcion || '',
    reason: s.motivo || '',
    insurerNotes: s.notas_aseguradora || '',
    endorsementNumber: s.numero_endoso || '',
    newPolicyId: s.nueva_poliza_id || '',
    attachments,
    createdAt: s.created_at || new Date().toISOString(),
  };
};

export const normalizeCompaniaFromHasura = (c) => ({
  id: c.id,
  name: c.nombre,
  domain: c.dominio || (c.nombre.toLowerCase().replace(/[^a-z0-9]/g, '') + '.com.do'),
  commissionRate: Number(c.comision_porcentaje) || 15.0,
  phone: c.telefono || '',
  email: c.email_contacto || '',
  address: c.direccion || '',
  logoUrl: c.logo_url || '',
  active: c.activa !== false,
});

// ─── Fetch All Data from Hasura ──────────────────────────────────────────────

export const fetchAllHasuraData = async (isDemo = false) => {
  try {
    const res = await executeGraphQL(GET_ALL_DATA_QUERY, {}, { isDemo, timeoutMs: 8000 });
    if (!res || !res.data) return null;

    const { clientes, polizas, companias, cobros, siniestros, movimientos_poliza, solicitudes } = res.data;

    // Build Maps
    const clientMap = {};
    const normalizedClients = Array.isArray(clientes)
      ? clientes.map(c => {
          const norm = normalizeClientFromHasura(c);
          clientMap[c.id] = norm.name;
          return norm;
        })
      : [];

    const rawPolicyMap = {};
    if (Array.isArray(polizas)) {
      polizas.forEach(p => {
        rawPolicyMap[p.id] = {
          ...p,
          client: clientMap[p.cliente_id] || `Cliente #${p.cliente_id}`
        };
      });
    }

    const movementsMap = {};
    if (Array.isArray(movimientos_poliza)) {
      movimientos_poliza.forEach(m => {
        if (!movementsMap[m.poliza_id]) movementsMap[m.poliza_id] = [];
        movementsMap[m.poliza_id].push({
          id: m.id,
          date: m.fecha,
          type: m.tipo,
          description: m.descripcion,
          evidence: m.evidencia
        });
      });
    }

    const normalizedPolicies = Array.isArray(polizas)
      ? polizas.map(p => normalizePolicyFromHasura(p, clientMap, movementsMap))
      : [];

    // Associate policy names to clients
    normalizedPolicies.forEach(pol => {
      const client = normalizedClients.find(c => c.id === pol.clienteId || c.name === pol.client);
      if (client && (!client.policy || client.policy === '')) {
        client.policy = `${pol.type} - ${pol.id}`;
      }
    });

    const normalizedCompanies = Array.isArray(companias) && companias.length > 0
      ? companias.map(normalizeCompaniaFromHasura)
      : [{ id: 1, name: 'La Colonial de Seguros', domain: 'lacolonial.com.do', commissionRate: 15 }];

    const normalizedCobros = Array.isArray(cobros)
      ? cobros.map(cb => normalizeCobroFromHasura(cb, clientMap, rawPolicyMap))
      : [];

    const normalizedSiniestros = Array.isArray(siniestros)
      ? siniestros.map(s => normalizeSiniestroFromHasura(s, clientMap, rawPolicyMap))
      : [];

    const normalizedSolicitudes = Array.isArray(solicitudes)
      ? solicitudes.map(s => normalizeSolicitudFromHasura(s, clientMap, rawPolicyMap))
      : [];

    const normalizedAgentCodes = Array.isArray(res.data.agentes_codigos)
      ? res.data.agentes_codigos.map(ac => ({
          id: ac.id,
          agent: ac.agente,
          insurer: ac.compania,
          code: ac.codigo,
          notes: ac.notas || '',
        }))
      : [
          { id: 1, agent: 'Santiago Morales y Asociados, S.R.L.', insurer: 'Humano Seguros', code: '76713', notes: 'Código oficial Humano' },
          { id: 2, agent: 'Santiago Morales y Asociados, S.R.L.', insurer: 'La Colonial de Seguros', code: '8055', notes: 'Código oficial Colonial' },
          { id: 3, agent: 'Raquel Rodríguez', insurer: 'La Colonial de Seguros', code: '897', notes: 'Código oficial Colonial' }
        ];

    return {
      clients: normalizedClients,
      policies: normalizedPolicies,
      companies: normalizedCompanies,
      payments: normalizedCobros,
      claims: normalizedSiniestros,
      requests: normalizedSolicitudes,
      agentCodes: normalizedAgentCodes,
    };
  } catch (error) {
    console.error('Error fetching data from Hasura:', error);
    return null;
  }
};

// ─── CRUD Mutation Helpers ───────────────────────────────────────────────────

// CLIENTS
export const insertClientHasura = async (client, isDemo = false) => {
  const mutation = `
    mutation InsertClient($object: clientes_insert_input!) {
      insert_clientes_one(object: $object) {
        id
        nombre
      }
    }
  `;
  let notasVal = client.policy || client.notas || '';
  if (client.cobroAutomatico) {
    notasVal = `[COBRO_AUTO:${client.metodoCobroAutomatico || 'Tarjeta de Crédito'}:${client.diaCobroAutomatico || 15}] ${notasVal}`.trim();
  }

  return executeGraphQL(mutation, {
    object: {
      nombre: client.name,
      cedula_rnc: client.documentId,
      codigo_compania: client.insurerCode ? parseInt(client.insurerCode, 10) || null : null,
      cartera: client.cartera || 'Santiago Morales y Asociados, S.R.L.',
      codigo_agente: client.agentCode || client.insurerCode || null,
      email: client.email,
      telefono: client.phone,
      tipo_personeria: client.personType,
      notas: notasVal,
    }
  }, { isDemo });
};

export const updateClientHasura = async (id, client, isDemo = false) => {
  const mutation = `
    mutation UpdateClient($id: bigint!, $set: clientes_set_input!) {
      update_clientes_by_pk(pk_columns: { id: $id }, _set: $set) {
        id
        nombre
      }
    }
  `;
  let notasVal = client.policy || client.notas || '';
  if (client.cobroAutomatico) {
    notasVal = `[COBRO_AUTO:${client.metodoCobroAutomatico || 'Tarjeta de Crédito'}:${client.diaCobroAutomatico || 15}] ${notasVal}`.trim();
  }

  const setObj = {
    nombre: client.name,
    cedula_rnc: client.documentId,
    codigo_compania: client.insurerCode ? parseInt(client.insurerCode, 10) || null : null,
    cartera: client.cartera || 'Santiago Morales y Asociados, S.R.L.',
    codigo_agente: client.agentCode || client.insurerCode || null,
    email: client.email,
    telefono: client.phone,
    tipo_personeria: client.personType,
    notas: notasVal,
  };

  return executeGraphQL(mutation, { id, set: setObj }, { isDemo });
};

export const deleteClientHasura = async (id, isDemo = false) => {
  const mutation = `
    mutation DeleteClient($id: bigint!) {
      delete_clientes_by_pk(id: $id) {
        id
      }
    }
  `;
  return executeGraphQL(mutation, { id }, { isDemo });
};

// POLICIES
export const insertPolicyHasura = async (policy, isDemo = false) => {
  const mutation = `
    mutation InsertPolicy($object: polizas_insert_input!) {
      insert_polizas_one(object: $object) {
        id
        numero_poliza
      }
    }
  `;
  const cleanAmount = parseFloat(String(policy.amount || '0').replace(/[^0-9.-]+/g, '')) || 0;
  const cleanInsured = parseFloat(String(policy.insuredAmount || '0').replace(/[^0-9.-]+/g, '')) || 0;

  return executeGraphQL(mutation, {
    object: {
      numero_poliza: policy.id,
      cliente_id: policy.clienteId || null,
      compania: policy.insurer,
      cartera: policy.cartera || 'Santiago Morales y Asociados, S.R.L.',
      codigo_agente: policy.agentCode || null,
      ramo: policy.type,
      inicio_poliza: policy.startDate,
      vigencia_inicio: policy.lastRenewalDate || policy.startDate,
      vigencia_fin: policy.endDate,
      frecuencia_pago: policy.renewalFrequency,
      monto: cleanInsured,
      prima_anual: cleanAmount,
      status: policy.status || 'Active',
    }
  }, { isDemo });
};

export const updatePolicyHasura = async (id, policy, isDemo = false) => {
  const mutation = `
    mutation UpdatePolicy($id: bigint!, $set: polizas_set_input!) {
      update_polizas_by_pk(pk_columns: { id: $id }, _set: $set) {
        id
        numero_poliza
      }
    }
  `;
  const cleanAmount = parseFloat(String(policy.amount || '0').replace(/[^0-9.-]+/g, '')) || 0;
  const cleanInsured = parseFloat(String(policy.insuredAmount || '0').replace(/[^0-9.-]+/g, '')) || 0;

  const setObj = {
    numero_poliza: policy.id || policy.numeroPoliza,
    compania: policy.insurer,
    cartera: policy.cartera || 'Santiago Morales y Asociados, S.R.L.',
    codigo_agente: policy.agentCode || (policy.cartera?.includes('Raquel') ? '897' : '8055'),
    ramo: policy.type,
    inicio_poliza: policy.startDate,
    frecuencia_pago: policy.renewalFrequency,
    monto: cleanInsured,
    prima_anual: cleanAmount,
  };

  if (policy.clienteId) setObj.cliente_id = policy.clienteId;
  if (policy.lastRenewalDate) setObj.vigencia_inicio = policy.lastRenewalDate;
  if (policy.endDate) setObj.vigencia_fin = policy.endDate;
  if (policy.status) setObj.status = policy.status;
  if (policy.details) setObj.renovacion = policy.details;

  return executeGraphQL(mutation, { id, set: setObj }, { isDemo });
};

// AGENTES CODIGOS POR COMPANIA
export const insertAgenteCodigoHasura = async (record, isDemo = false) => {
  const mutation = `
    mutation InsertAgenteCodigo($object: agentes_codigos_insert_input!) {
      insert_agentes_codigos_one(object: $object) {
        id
        agente
        compania
        codigo
        notas
      }
    }
  `;
  return executeGraphQL(mutation, {
    object: {
      agente: record.agent || record.agente,
      compania: record.insurer || record.compania,
      codigo: String(record.code || record.codigo),
      notas: record.notes || record.notas || '',
    }
  }, { isDemo });
};

export const updateAgenteCodigoHasura = async (id, record, isDemo = false) => {
  const mutation = `
    mutation UpdateAgenteCodigo($id: bigint!, $set: agentes_codigos_set_input!) {
      update_agentes_codigos_by_pk(pk_columns: { id: $id }, _set: $set) {
        id
        agente
        compania
        codigo
        notas
      }
    }
  `;
  const setObj = {};
  if (record.agent || record.agente) setObj.agente = record.agent || record.agente;
  if (record.insurer || record.compania) setObj.compania = record.insurer || record.compania;
  if (record.code || record.codigo) setObj.codigo = String(record.code || record.codigo);
  if (record.notes !== undefined || record.notas !== undefined) setObj.notas = record.notes || record.notas || '';

  return executeGraphQL(mutation, { id, set: setObj }, { isDemo });
};

export const deleteAgenteCodigoHasura = async (id, isDemo = false) => {
  const mutation = `
    mutation DeleteAgenteCodigo($id: bigint!) {
      delete_agentes_codigos_by_pk(id: $id) {
        id
      }
    }
  `;
  return executeGraphQL(mutation, { id }, { isDemo });
};

// COBROS / PAGOS
export const insertCobroHasura = async (cobro, isDemo = false) => {
  const mutation = `
    mutation InsertCobro($object: cobros_insert_input!) {
      insert_cobros_one(object: $object) {
        id
        numero_recibo
      }
    }
  `;
  const cleanAmount = parseFloat(String(cobro.amount || cobro.amountNum || '0').replace(/[^0-9.-]+/g, '')) || 0;

  return executeGraphQL(mutation, {
    object: {
      numero_recibo: cobro.id,
      poliza_id: cobro.polizaId || null,
      cliente_id: cobro.clienteId || null,
      fecha: cobro.date || new Date().toISOString().split('T')[0],
      fecha_vencimiento: cobro.dueDate || null,
      monto: cleanAmount,
      moneda: cobro.currency || 'DOP',
      tipo: cobro.type || 'Renovación',
      status: cobro.status || 'Paid',
      metodo_pago: cobro.paymentMethod || 'Efectivo',
      comprobante: cobro.receiptUrl || cobro.comprobante || null,
      notas: cobro.notes || '',
    }
  }, { isDemo });
};

export const updateCobroHasura = async (id, cobro, isDemo = false) => {
  const mutation = `
    mutation UpdateCobro($id: bigint!, $set: cobros_set_input!) {
      update_cobros_by_pk(pk_columns: { id: $id }, _set: $set) {
        id
        status
        comprobante
      }
    }
  `;
  const cleanAmount = parseFloat(String(cobro.amount || cobro.amountNum || '0').replace(/[^0-9.-]+/g, '')) || undefined;

  const setObj = {};
  if (cobro.status) setObj.status = cobro.status;
  if (cobro.date) setObj.fecha = cobro.date;
  if (cobro.type) setObj.tipo = cobro.type;
  if (cleanAmount !== undefined) setObj.monto = cleanAmount;
  if (cobro.paymentMethod) setObj.metodo_pago = cobro.paymentMethod;
  if (cobro.receiptUrl !== undefined || cobro.comprobante !== undefined) {
    setObj.comprobante = cobro.receiptUrl || cobro.comprobante || null;
  }
  if (cobro.notes !== undefined) setObj.notas = cobro.notes;

  return executeGraphQL(mutation, { id, set: setObj }, { isDemo });
};

export const deleteCobroHasura = async (id, isDemo = false) => {
  const mutation = `
    mutation DeleteCobro($id: bigint!) {
      delete_cobros_by_pk(id: $id) {
        id
      }
    }
  `;
  return executeGraphQL(mutation, { id }, { isDemo });
};

// SINIESTROS
export const insertSiniestroHasura = async (siniestro, isDemo = false) => {
  const mutation = `
    mutation InsertSiniestro($object: siniestros_insert_input!) {
      insert_siniestros_one(object: $object) {
        id
        numero_siniestro
      }
    }
  `;
  const cleanReclamado = parseFloat(String(siniestro.amount || siniestro.amountNum || '0').replace(/[^0-9.-]+/g, '')) || 0;
  const cleanAprobado = parseFloat(String(siniestro.amountApproved || siniestro.amountApprovedNum || '0').replace(/[^0-9.-]+/g, '')) || 0;

  return executeGraphQL(mutation, {
    object: {
      numero_siniestro: siniestro.id,
      poliza_id: siniestro.polizaId || null,
      cliente_id: siniestro.clienteId || null,
      tipo: siniestro.type,
      fecha_ocurrencia: siniestro.date || new Date().toISOString().split('T')[0],
      fecha_reporte: siniestro.reportDate || new Date().toISOString().split('T')[0],
      descripcion: siniestro.description || 'Siniestro reportado',
      monto_reclamado: cleanReclamado,
      monto_aprobado: cleanAprobado,
      moneda: 'DOP',
      status: siniestro.status || 'Abierto',
      ajustador_nombre: siniestro.adjuster || '',
      ajustador_telefono: siniestro.phone || '',
      archivos_adjuntos: siniestro.attachments || [],
      notas: siniestro.notes || '',
    }
  }, { isDemo });
};

export const updateSiniestroHasura = async (id, siniestro, isDemo = false) => {
  const mutation = `
    mutation UpdateSiniestro($id: bigint!, $set: siniestros_set_input!) {
      update_siniestros_by_pk(pk_columns: { id: $id }, _set: $set) {
        id
        status
      }
    }
  `;
  const setObj = {};
  if (siniestro.status) setObj.status = siniestro.status;
  if (siniestro.adjuster !== undefined) setObj.ajustador_nombre = siniestro.adjuster;
  if (siniestro.phone !== undefined) setObj.ajustador_telefono = siniestro.phone;
  if (siniestro.notes !== undefined) setObj.notas = siniestro.notes;
  if (siniestro.amountApprovedNum !== undefined) setObj.monto_aprobado = siniestro.amountApprovedNum;

  return executeGraphQL(mutation, { id, set: setObj }, { isDemo });
};

export const deleteSiniestroHasura = async (id, isDemo = false) => {
  const mutation = `
    mutation DeleteSiniestro($id: bigint!) {
      delete_siniestros_by_pk(id: $id) {
        id
      }
    }
  `;
  return executeGraphQL(mutation, { id }, { isDemo });
};

// MOVIMIENTOS POLIZA
export const insertMovimientoHasura = async (movimiento, isDemo = false) => {
  const mutation = `
    mutation InsertMovimiento($object: movimientos_poliza_insert_input!) {
      insert_movimientos_poliza_one(object: $object) {
        id
      }
    }
  `;
  return executeGraphQL(mutation, {
    object: {
      poliza_id: movimiento.polizaId,
      fecha: movimiento.date || new Date().toISOString().split('T')[0],
      tipo: movimiento.type,
      descripcion: movimiento.description,
      evidencia: movimiento.evidence || '',
    }
  }, { isDemo });
};

// COMPANIAS
export const updateCompaniaCommissionHasura = async (companiaName, newRate, isDemo = false) => {
  const mutation = `
    mutation UpdateCompaniaRate($name: String!, $rate: numeric!) {
      update_companias(where: { nombre: { _eq: $name } }, _set: { comision_porcentaje: $rate }) {
        affected_rows
      }
    }
  `;
  return executeGraphQL(mutation, { name: companiaName, rate: newRate }, { isDemo });
};

// SOLICITUDES
export const insertSolicitudHasura = async (solicitud, isDemo = false) => {
  const mutation = `
    mutation InsertSolicitud($object: solicitudes_insert_input!) {
      insert_solicitudes_one(object: $object) {
        id
        numero_solicitud
      }
    }
  `;
  return executeGraphQL(mutation, {
    object: {
      numero_solicitud: solicitud.id,
      tipo: solicitud.type,
      subtipo: solicitud.subtype || null,
      cliente_id: solicitud.clienteId ? parseInt(solicitud.clienteId, 10) || null : null,
      poliza_id: solicitud.polizaId ? parseInt(solicitud.polizaId, 10) || null : null,
      cliente_nombre: solicitud.client || '',
      compania: solicitud.insurer || '',
      cartera: solicitud.cartera || 'Santiago Morales y Asociados, S.R.L.',
      ramo: solicitud.ramo || '',
      fecha_solicitud: solicitud.requestDate || new Date().toISOString().split('T')[0],
      fecha_efectiva: solicitud.effectiveDate || null,
      status: solicitud.status || 'Pendiente',
      prioridad: solicitud.priority || 'Media',
      monto_estimado: solicitud.estimatedAmountNum || null,
      devolucion_estimada: solicitud.estimatedRefundNum || null,
      descripcion: solicitud.description || '',
      motivo: solicitud.reason || '',
      notas_aseguradora: solicitud.insurerNotes || '',
      numero_endoso: solicitud.endorsementNumber || null,
      nueva_poliza_id: solicitud.newPolicyId || null,
      adjuntos: solicitud.attachments || [],
    }
  }, { isDemo });
};

export const updateSolicitudHasura = async (id, solicitud, isDemo = false) => {
  const mutation = `
    mutation UpdateSolicitud($id: bigint!, $set: solicitudes_set_input!) {
      update_solicitudes_by_pk(pk_columns: { id: $id }, _set: $set) {
        id
        status
      }
    }
  `;
  const setObj = {};
  if (solicitud.status) setObj.status = solicitud.status;
  if (solicitud.priority) setObj.prioridad = solicitud.priority;
  if (solicitud.effectiveDate !== undefined) setObj.fecha_efectiva = solicitud.effectiveDate || null;
  if (solicitud.description !== undefined) setObj.descripcion = solicitud.description;
  if (solicitud.reason !== undefined) setObj.motivo = solicitud.reason;
  if (solicitud.insurerNotes !== undefined) setObj.notas_aseguradora = solicitud.insurerNotes;
  if (solicitud.endorsementNumber !== undefined) setObj.numero_endoso = solicitud.endorsementNumber;
  if (solicitud.newPolicyId !== undefined) setObj.nueva_poliza_id = solicitud.newPolicyId;
  if (solicitud.estimatedAmountNum !== undefined) setObj.monto_estimado = solicitud.estimatedAmountNum;
  if (solicitud.estimatedRefundNum !== undefined) setObj.devolucion_estimada = solicitud.estimatedRefundNum;
  if (solicitud.attachments !== undefined) setObj.adjuntos = solicitud.attachments;
  setObj.updated_at = new Date().toISOString();

  return executeGraphQL(mutation, { id, set: setObj }, { isDemo });
};

export const deleteSolicitudHasura = async (id, isDemo = false) => {
  const mutation = `
    mutation DeleteSolicitud($id: bigint!) {
      delete_solicitudes_by_pk(id: $id) {
        id
      }
    }
  `;
  return executeGraphQL(mutation, { id }, { isDemo });
};

