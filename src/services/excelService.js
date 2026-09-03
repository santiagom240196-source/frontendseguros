import * as XLSX from 'xlsx';
import { executeGraphQL } from './hasuraClient.js';
import { getNextRenewalDate } from '../utils/policyHelpers.js';

/**
 * Convierte valores de fecha de Excel (números seriales, DD/MM/YYYY, YYYY-MM-DD) a string YYYY-MM-DD
 */
export const normalizeExcelDate = (val) => {
  if (!val) return '';
  
  // Si es un número serial de Excel (ej: 45123)
  if (typeof val === 'number') {
    const excelEpoch = new Date(1899, 11, 30);
    const date = new Date(excelEpoch.getTime() + val * 86400000);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
  }

  const str = String(val).trim();
  if (!str) return '';

  // Formato DD/MM/YYYY o DD-MM-YYYY
  const matchDMY = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (matchDMY) {
    const day = matchDMY[1].padStart(2, '0');
    const month = matchDMY[2].padStart(2, '0');
    const year = matchDMY[3];
    return `${year}-${month}-${day}`;
  }

  // Formato YYYY-MM-DD o YYYY/MM/DD
  const matchYMD = str.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if (matchYMD) {
    const year = matchYMD[1];
    const month = matchYMD[2].padStart(2, '0');
    const day = matchYMD[3].padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  try {
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      return d.toISOString().split('T')[0];
    }
  } catch (e) {}

  return '';
};

/**
 * Convierte valores monetarios o números con formato a número limpio
 */
export const normalizeExcelNumber = (val) => {
  if (val === undefined || val === null || val === '') return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  const cleanStr = String(val).replace(/[^0-9.-]+/g, '');
  const num = parseFloat(cleanStr);
  return isNaN(num) ? 0 : num;
};

/**
 * Normaliza nombres de columnas para detección automática flexible
 */
const cleanKey = (key) => {
  return String(key || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Quita tildes
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
};

/**
 * Parsea un archivo Excel y extrae clientes, pólizas y cobros
 */
export const parseExcelFile = async (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array', cellDates: false });

        const rawClients = [];
        const rawPolicies = [];
        const rawPayments = [];

        const sheetNames = workbook.SheetNames;
        
        sheetNames.forEach(sheetName => {
          const sheet = workbook.Sheets[sheetName];
          const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
          if (!rows || rows.length === 0) return;

          rows.forEach((row, idx) => {
            const mappedRow = {};
            Object.keys(row).forEach(k => {
              mappedRow[cleanKey(k)] = row[k];
            });

            // 1. Detección flexible de Nombre de Cliente / Empresa
            const clientName = mappedRow.nombre ||
              mappedRow.cliente ||
              mappedRow.nombres ||
              mappedRow.nombre_cliente ||
              mappedRow.asegurado ||
              mappedRow.titular ||
              mappedRow.nombre_completo ||
              mappedRow.razon_social ||
              mappedRow.nombre_o_razon_social ||
              mappedRow.nombre_de_asegurado ||
              mappedRow.nombre_asegurado ||
              '';
            const apellidos = mappedRow.apellidos || mappedRow.apellido || mappedRow.apellidos_cliente || '';
            const fullName = apellidos ? `${clientName} ${apellidos}`.trim() : String(clientName).trim();

            // 2. Detección flexible de Cédula o RNC
            const docId = String(
              mappedRow.cedula ||
              mappedRow.rnc ||
              mappedRow.cedula_rnc ||
              mappedRow.documento ||
              mappedRow.id_cliente ||
              mappedRow.identificacion ||
              mappedRow.cedula_o_rnc ||
              mappedRow.no_documento ||
              ''
            ).trim();

            const phone = String(mappedRow.telefono || mappedRow.celular || mappedRow.tel || mappedRow.phone || mappedRow.contacto || mappedRow.telefonos || '').trim();
            const email = String(mappedRow.email || mappedRow.correo || mappedRow.mail || mappedRow.correo_electronico || '').trim();
            
            const isJuridica = (docId.includes('-') && docId.startsWith('1-')) ||
              String(mappedRow.tipo_personeria || mappedRow.personeria || mappedRow.tipo_persona || '').toLowerCase().includes('jur') ||
              String(mappedRow.tipo_personeria || mappedRow.personeria || mappedRow.tipo_persona || '').toLowerCase().includes('mor') ||
              fullName.toUpperCase().includes('SRL') ||
              fullName.toUpperCase().includes('S.R.L.') ||
              fullName.toUpperCase().includes('SA') ||
              fullName.toUpperCase().includes('S.A.') ||
              fullName.toUpperCase().includes('EIRL') ||
              fullName.toUpperCase().includes('CORP');
            const personType = isJuridica ? 'Jurídica' : 'Física';

            // 3. Detección flexible de Póliza
            const policyNum = String(
              mappedRow.numero_poliza ||
              mappedRow.poliza ||
              mappedRow.no_poliza ||
              mappedRow.num_poliza ||
              mappedRow.policy ||
              mappedRow.no_de_poliza ||
              mappedRow.poliza_no ||
              mappedRow.n_poliza ||
              mappedRow.num_de_poliza ||
              ''
            ).trim();

            let rawInsurer = String(
              mappedRow.compania ||
              mappedRow.aseguradora ||
              mappedRow.empresa ||
              mappedRow.insurer ||
              mappedRow.cia_aseguradora ||
              mappedRow.compania_aseguradora ||
              mappedRow.cia ||
              'La Colonial de Seguros'
            ).trim();

            let insurer = 'La Colonial de Seguros';
            const insUpper = rawInsurer.toUpperCase();
            if (insUpper.includes('COLONIAL') || rawInsurer === '897' || rawInsurer === '8055' || policyNum.startsWith('1-2-')) {
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

            const branch = String(
              mappedRow.ramo ||
              mappedRow.tipo_seguro ||
              mappedRow.cobertura ||
              mappedRow.tipo ||
              mappedRow.producto ||
              mappedRow.tipo_de_poliza ||
              mappedRow.tipo_poliza ||
              'Auto'
            ).trim();

            const insuredSum = normalizeExcelNumber(mappedRow.suma_asegurada || mappedRow.monto_asegurado || mappedRow.valor_asegurado || mappedRow.monto || mappedRow.limite || 0);
            const premium = normalizeExcelNumber(mappedRow.prima || mappedRow.prima_anual || mappedRow.monto_prima || mappedRow.costo || mappedRow.prima_total || mappedRow.prima_neta || 0);
            const frequency = String(mappedRow.frecuencia || mappedRow.frecuencia_pago || mappedRow.forma_pago || mappedRow.periodo || mappedRow.modo_pago || 'Anual').trim();
            
            // 4. Detección flexible de Cartera y Código de Agente
            const rawCartera = String(
              mappedRow.cartera ||
              mappedRow.agente ||
              mappedRow.ejecutivo ||
              mappedRow.productor ||
              ''
            ).trim();

            const rawCodAgente = String(
              mappedRow.codigo_agente ||
              mappedRow.cod_agente ||
              mappedRow.codigo_promotor ||
              mappedRow.codigo_asesor ||
              ''
            ).trim();

            const isRaquel = rawCartera.toLowerCase().includes('raquel') || rawCodAgente === '897' || rawInsurer === '897';
            const cartera = isRaquel ? 'Raquel Rodríguez' : 'Santiago Morales y Asociados, S.R.L.';
            const agentCode = isRaquel ? '897' : (rawCodAgente || (insurer === 'Humano Seguros' ? '76713' : '8055'));

            const insurerCode = String(
              mappedRow.codigo_compania ||
              mappedRow.codigo_asegurado ||
              mappedRow.codigo_cliente ||
              mappedRow.cod_cliente ||
              mappedRow.codigo ||
              mappedRow.no_cliente ||
              ''
            ).trim();

            // 5. Fechas
            const todayStr = new Date().toISOString().split('T')[0];
            const startDate = normalizeExcelDate(
              mappedRow.fecha_inicio ||
              mappedRow.inicio_poliza ||
              mappedRow.emision ||
              mappedRow.inicio ||
              mappedRow.fecha_emision ||
              mappedRow.desde ||
              mappedRow.vigencia_desde
            ) || todayStr;

            const lastRenewal = normalizeExcelDate(
              mappedRow.ultima_renovacion ||
              mappedRow.vigencia_inicio ||
              mappedRow.renovacion ||
              mappedRow.fecha_renovacion
            ) || startDate;

            const endDate = normalizeExcelDate(
              mappedRow.fecha_final ||
              mappedRow.vigencia_fin ||
              mappedRow.vencimiento ||
              mappedRow.proxima_renovacion ||
              mappedRow.fin_vigencia ||
              mappedRow.hasta ||
              mappedRow.vigencia_hasta
            ) || getNextRenewalDate(lastRenewal, frequency);

            if (fullName || docId || policyNum) {
              const clientObj = {
                id: idx + 1,
                name: fullName || `Cliente ${policyNum || idx + 1}`,
                personType,
                documentId: docId || '',
                insurerCode,
                email,
                phone,
                cartera,
                agentCode,
                city: String(mappedRow.ciudad || mappedRow.provincia || 'Santo Domingo'),
                sector: String(mappedRow.sector || ''),
                status: 'Active',
              };

              rawClients.push(clientObj);

              if (policyNum) {
                rawPolicies.push({
                  id: policyNum,
                  clientName: clientObj.name,
                  clientDoc: clientObj.documentId,
                  insurer,
                  type: branch,
                  insuredAmount: insuredSum,
                  amount: premium,
                  renewalFrequency: frequency,
                  cartera,
                  agentCode,
                  startDate,
                  lastRenewalDate: lastRenewal,
                  endDate,
                  details: String(mappedRow.detalles || mappedRow.cobertura || `Ramo: ${branch}`),
                  status: 'Active',
                });

                // Detección de Cobros/Pagos incluidos en el Excel
                // Solo registrar cuando el archivo contenga explícitamente un pago realizado
                const explicitPaidAmount = normalizeExcelNumber(mappedRow.monto_pagado || mappedRow.pago_realizado || (mappedRow.monto_cobro && String(mappedRow.estado_pago || mappedRow.estado_cobro || '').toLowerCase().includes('pag') ? mappedRow.monto_cobro : null));
                
                if (explicitPaidAmount > 0) {
                  const paymentDate = normalizeExcelDate(mappedRow.fecha_pago || mappedRow.fecha_cobro || startDate) || startDate;
                  rawPayments.push({
                    receiptId: `REC-${policyNum.replace(/[^a-zA-Z0-9]/g, '')}-${idx + 1}`,
                    policyId: policyNum,
                    clientName: clientObj.name,
                    date: paymentDate,
                    dueDate: endDate,
                    amount: explicitPaidAmount,
                    status: 'Paid',
                    type: 'Prima Inicial / Renovación',
                    paymentMethod: String(mappedRow.metodo_pago || 'Transferencia'),
                    notes: 'Pago importado vía Excel',
                  });
                }
              }
            }
          });
        });

        // Deduplicar clientes en el archivo
        const uniqueClientsMap = new Map();
        rawClients.forEach(c => {
          const key = (c.documentId && c.documentId.length > 5)
            ? c.documentId.toLowerCase()
            : c.name.toLowerCase();
          if (!uniqueClientsMap.has(key)) {
            uniqueClientsMap.set(key, c);
          }
        });
        const deduplicatedClients = Array.from(uniqueClientsMap.values());

        // Deduplicar pólizas en el archivo
        const uniquePoliciesMap = new Map();
        rawPolicies.forEach(p => {
          if (!uniquePoliciesMap.has(p.id)) {
            uniquePoliciesMap.set(p.id, p);
          }
        });
        const deduplicatedPolicies = Array.from(uniquePoliciesMap.values());

        resolve({
          fileName: file.name,
          clients: deduplicatedClients,
          policies: deduplicatedPolicies,
          payments: rawPayments,
          totalRows: deduplicatedClients.length + deduplicatedPolicies.length,
        });
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
};

/**
 * Descarga una plantilla modelo en Excel (.xlsx) para que el usuario conozca las columnas esperadas
 */
export const downloadSampleExcelTemplate = () => {
  const sampleData = [
    {
      'Nombre Cliente': 'LUIS GUILLERMO',
      'Apellidos': 'BRUGAL ROMERO',
      'Tipo Persona': 'Física',
      'Cedula o RNC': '001-0123456-7',
      'Telefono': '809-555-0101',
      'Email': 'lbrugal@example.com',
      'Codigo Asegurado': '1297996',
      'Cartera': 'Santiago Morales y Asociados, S.R.L.',
      'Codigo Agente': '8055',
      'Numero Poliza': '1-2-170-0009999',
      'Aseguradora': 'La Colonial de Seguros',
      'Ramo': 'Salud Catastrófico',
      'Suma Asegurada': 1500000,
      'Prima Anual': 24000,
      'Frecuencia Pago': 'Mensual',
      'Fecha Inicio': '15/09/2020',
      'Ultima Renovacion': '15/09/2025',
      'Fecha Final (Proxima Renovacion)': '15/09/2026',
      'Detalles Cobertura': 'Cobertura Médica Internacional con Deducible RD$ 25,000',
      'Monto Cobro Inicial': 2000,
      'Estado Cobro': 'Pagado',
      'Metodo Pago': 'Transferencia'
    },
    {
      'Nombre Cliente': 'COMERCIALIZADORA DEL CARIBE SRL',
      'Apellidos': '',
      'Tipo Persona': 'Jurídica',
      'Cedula o RNC': '1-31-99887-2',
      'Telefono': '809-555-0202',
      'Email': 'contacto@caribesrl.do',
      'Codigo Asegurado': '1444879',
      'Cartera': 'Raquel Rodríguez',
      'Codigo Agente': '897',
      'Numero Poliza': '1-2-200-0088771',
      'Aseguradora': 'La Colonial de Seguros',
      'Ramo': 'Auto',
      'Suma Asegurada': 3200000,
      'Prima Anual': 65000,
      'Frecuencia Pago': 'Anual',
      'Fecha Inicio': '01/03/2023',
      'Ultima Renovacion': '01/03/2026',
      'Fecha Final (Proxima Renovacion)': '01/03/2027',
      'Detalles Cobertura': 'Póliza Flotilla Comercial Full Cobertura',
      'Monto Cobro Inicial': 65000,
      'Estado Cobro': 'Pagado',
      'Metodo Pago': 'Cheque'
    }
  ];

  const ws = XLSX.utils.json_to_sheet(sampleData);
  
  // Ajustar anchos de columnas
  ws['!cols'] = [
    { wch: 25 }, { wch: 20 }, { wch: 15 }, { wch: 18 }, { wch: 16 },
    { wch: 25 }, { wch: 18 }, { wch: 35 }, { wch: 15 }, { wch: 20 },
    { wch: 25 }, { wch: 20 }, { wch: 16 }, { wch: 14 }, { wch: 16 },
    { wch: 14 }, { wch: 18 }, { wch: 30 }, { wch: 35 }, { wch: 20 },
    { wch: 14 }, { wch: 16 }
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Cartera y Clientes');
  XLSX.writeFile(wb, 'Plantilla_Importacion_Santiago_Morales.xlsx');
};



/**
 * Importa los datos parseados de Excel a Hasura GraphQL y PostgreSQL
 */
export const importExcelDataToHasura = async (parsedData, isDemo = false, onProgress = () => {}) => {
  const { clients = [], policies = [], payments = [] } = parsedData;
  const results = {
    clientsInserted: 0,
    clientsUpdated: 0,
    policiesInserted: 0,
    policiesUpdated: 0,
    paymentsInserted: 0,
    errors: [],
  };

  if (isDemo) {
    onProgress({ stage: 'clients', progress: 30, message: 'Registrando clientes en memoria...' });
    await new Promise(r => setTimeout(r, 400));
    onProgress({ stage: 'policies', progress: 70, message: 'Registrando pólizas en memoria...' });
    await new Promise(r => setTimeout(r, 400));
    onProgress({ stage: 'payments', progress: 100, message: 'Completado en modo de prueba.' });
    return {
      clientsInserted: clients.length,
      clientsUpdated: 0,
      policiesInserted: policies.length,
      policiesUpdated: 0,
      paymentsInserted: payments.length,
      errors: [],
    };
  }

  // 0. Cargar clientes y pólizas existentes para matching inteligente
  onProgress({ stage: 'init', progress: 10, message: 'Verificando registros existentes en la base de datos...' });
  
  const existingClientsMap = new Map(); // Doc/Nombre -> DB Client
  const existingPoliciesMap = new Map(); // NumPoliza -> DB Policy ID

  try {
    const checkQuery = `
      query GetExistingForImport {
        clientes {
          id
          nombre
          apellidos
          cedula_rnc
          codigo_compania
        }
        polizas {
          id
          numero_poliza
          cliente_id
        }
      }
    `;
    const checkRes = await executeGraphQL(checkQuery, {}, { isDemo });
    if (checkRes?.data?.clientes) {
      checkRes.data.clientes.forEach(c => {
        const fullName = c.apellidos ? `${c.nombre} ${c.apellidos}`.trim().toLowerCase() : (c.nombre || '').trim().toLowerCase();
        existingClientsMap.set(fullName, c.id);
        if (c.cedula_rnc && c.cedula_rnc.trim()) {
          existingClientsMap.set(c.cedula_rnc.trim().toLowerCase(), c.id);
        }
        if (c.codigo_compania) {
          existingClientsMap.set(`code_${c.codigo_compania}`, c.id);
        }
      });
    }
    if (checkRes?.data?.polizas) {
      checkRes.data.polizas.forEach(p => {
        if (p.numero_poliza) {
          existingPoliciesMap.set(p.numero_poliza.trim().toLowerCase(), p.id);
        }
      });
    }
  } catch (err) {
    console.warn('Advertencia al consultar datos existentes para importación:', err);
  }

  // 1. Insertar / Actualizar Clientes en Hasura PostgreSQL
  const clientDbMap = new Map(); // Mapea nombre o cédula al ID en PostgreSQL
  onProgress({ stage: 'clients', progress: 25, message: `Procesando ${clients.length} clientes en PostgreSQL...` });

  for (const c of clients) {
    try {
      const cleanDoc = c.documentId ? c.documentId.trim().toLowerCase() : '';
      const cleanName = c.name ? c.name.trim().toLowerCase() : '';
      const cleanCode = c.insurerCode ? parseInt(c.insurerCode, 10) : null;

      let existingId = null;
      if (cleanDoc && cleanDoc.length > 5) {
        existingId = existingClientsMap.get(cleanDoc);
      }
      if (!existingId && cleanCode) {
        existingId = existingClientsMap.get(`code_${cleanCode}`);
      }
      if (!existingId && cleanName) {
        existingId = existingClientsMap.get(cleanName);
      }

      if (existingId) {
        // Cliente ya existe: actualizar datos de contacto si vienen nuevos
        clientDbMap.set(cleanName, existingId);
        if (cleanDoc) clientDbMap.set(cleanDoc, existingId);

        const updateMut = `
          mutation UpdateClientImport($id: bigint!, $set: clientes_set_input!) {
            update_clientes_by_pk(pk_columns: { id: $id }, _set: $set) { id }
          }
        `;
        const setObj = {};
        if (c.phone) setObj.telefono = c.phone;
        if (c.email) setObj.email = c.email;
        if (c.cartera) setObj.cartera = c.cartera;
        if (c.agentCode) setObj.codigo_agente = c.agentCode;

        if (Object.keys(setObj).length > 0) {
          await executeGraphQL(updateMut, { id: existingId, set: setObj }, { isDemo });
        }
        results.clientsUpdated++;
      } else {
        // Cliente nuevo: insertar
        const insertMut = `
          mutation InsertClientImport($obj: clientes_insert_input!) {
            insert_clientes_one(object: $obj) {
              id
              nombre
              cedula_rnc
            }
          }
        `;
        const res = await executeGraphQL(insertMut, {
          obj: {
            nombre: c.name,
            tipo_personeria: c.personType || 'Física',
            cedula_rnc: c.documentId || null,
            codigo_compania: cleanCode || null,
            email: c.email || null,
            telefono: c.phone || null,
            cartera: c.cartera || 'Santiago Morales y Asociados, S.R.L.',
            codigo_agente: c.agentCode || (c.cartera?.includes('Raquel') ? '897' : '8055'),
            notas: 'Importado desde Excel',
          }
        }, { isDemo });

        if (res?.data?.insert_clientes_one?.id) {
          const id = res.data.insert_clientes_one.id;
          clientDbMap.set(cleanName, id);
          if (cleanDoc) clientDbMap.set(cleanDoc, id);
          existingClientsMap.set(cleanName, id);
          if (cleanDoc) existingClientsMap.set(cleanDoc, id);
          results.clientsInserted++;
        } else if (res?.errors && res.errors.length > 0) {
          results.errors.push(`Cliente ${c.name}: ${res.errors[0].message}`);
        }
      }
    } catch (err) {
      console.warn(`Error procesando cliente ${c.name}:`, err);
      results.errors.push(`Cliente ${c.name}: ${err.message || 'Error de inserción'}`);
    }
  }

  // 2. Insertar / Actualizar Pólizas en Hasura PostgreSQL
  onProgress({ stage: 'policies', progress: 65, message: `Procesando ${policies.length} pólizas en PostgreSQL...` });
  const policyDbMap = new Map();

  for (const p of policies) {
    try {
      const cleanDoc = p.clientDoc ? p.clientDoc.trim().toLowerCase() : '';
      const cleanClientName = p.clientName ? p.clientName.trim().toLowerCase() : '';
      const policyKey = p.id ? p.id.trim().toLowerCase() : '';

      let clienteId = clientDbMap.get(cleanDoc) || clientDbMap.get(cleanClientName) || existingClientsMap.get(cleanDoc) || existingClientsMap.get(cleanClientName);

      // Si no se encuentra el cliente, crear cliente temporal para no romper la llave foránea
      if (!clienteId) {
        try {
          const autoClientRes = await executeGraphQL(`
            mutation CreateAutoClient($obj: clientes_insert_input!) {
              insert_clientes_one(object: $obj) { id }
            }
          `, {
            obj: {
              nombre: p.clientName || `Titular Póliza ${p.id}`,
              tipo_personeria: 'Física',
              cedula_rnc: p.clientDoc || null,
              cartera: p.cartera || 'Santiago Morales y Asociados, S.R.L.',
              codigo_agente: p.agentCode || (p.cartera?.includes('Raquel') ? '897' : '8055'),
              notas: 'Creado automáticamente durante importación de póliza'
            }
          }, { isDemo });
          if (autoClientRes?.data?.insert_clientes_one?.id) {
            clienteId = autoClientRes.data.insert_clientes_one.id;
            clientDbMap.set(cleanClientName, clienteId);
            results.clientsInserted++;
          }
        } catch (e) {}
      }

      if (!clienteId) {
        // Fallback al primer cliente de la base de datos si todo falla
        const firstId = Array.from(existingClientsMap.values())[0];
        clienteId = firstId || 1;
      }

      const todayStr = new Date().toISOString().split('T')[0];
      const validStartDate = p.startDate || todayStr;
      const validVigenciaInicio = p.lastRenewalDate || validStartDate;
      const validVigenciaFin = p.endDate || getNextRenewalDate(validVigenciaInicio, p.renewalFrequency || 'Anual');

      const existingPolId = existingPoliciesMap.get(policyKey);

      if (existingPolId) {
        // Actualizar póliza existente
        const updatePolMut = `
          mutation UpdatePolicyImport($id: bigint!, $set: polizas_set_input!) {
            update_polizas_by_pk(pk_columns: { id: $id }, _set: $set) { id }
          }
        `;
        await executeGraphQL(updatePolMut, {
          id: existingPolId,
          set: {
            cliente_id: clienteId,
            compania: p.insurer || 'La Colonial de Seguros',
            ramo: p.type || 'Auto',
            inicio_poliza: validStartDate,
            vigencia_inicio: validVigenciaInicio,
            vigencia_fin: validVigenciaFin,
            frecuencia_pago: p.renewalFrequency || 'Anual',
            monto: p.insuredAmount || 0,
            prima_anual: p.amount || 0,
            cartera: p.cartera || 'Santiago Morales y Asociados, S.R.L.',
            codigo_agente: p.agentCode || (p.cartera?.includes('Raquel') ? '897' : '8055'),
            status: 'Active',
          }
        }, { isDemo });

        policyDbMap.set(p.id, existingPolId);
        results.policiesUpdated++;
      } else {
        // Insertar nueva póliza
        const insertPolMut = `
          mutation InsertPolicyImport($obj: polizas_insert_input!) {
            insert_polizas_one(object: $obj) {
              id
              numero_poliza
            }
          }
        `;
        const res = await executeGraphQL(insertPolMut, {
          obj: {
            numero_poliza: p.id,
            cliente_id: clienteId,
            compania: p.insurer || 'La Colonial de Seguros',
            ramo: p.type || 'Auto',
            inicio_poliza: validStartDate,
            vigencia_inicio: validVigenciaInicio,
            vigencia_fin: validVigenciaFin,
            frecuencia_pago: p.renewalFrequency || 'Anual',
            monto: p.insuredAmount || 0,
            prima_anual: p.amount || 0,
            cartera: p.cartera || 'Santiago Morales y Asociados, S.R.L.',
            codigo_agente: p.agentCode || (p.cartera?.includes('Raquel') ? '897' : '8055'),
            status: 'Active',
          }
        }, { isDemo });

        if (res?.data?.insert_polizas_one?.id) {
          const id = res.data.insert_polizas_one.id;
          policyDbMap.set(p.id, id);
          existingPoliciesMap.set(policyKey, id);
          results.policiesInserted++;

          // Registrar movimiento de póliza
          try {
            await executeGraphQL(`
              mutation InsertMovImport($obj: movimientos_poliza_insert_input!) {
                insert_movimientos_poliza_one(object: $obj) { id }
              }
            `, {
              obj: {
                poliza_id: id,
                fecha: validStartDate,
                tipo: 'Emisión / Importación Excel',
                descripcion: 'Carga inicial de póliza importada desde archivo Excel.',
                evidencia: 'Excel Import',
              }
            }, { isDemo });
          } catch (e) {}
        } else if (res?.errors && res.errors.length > 0) {
          results.errors.push(`Póliza ${p.id}: ${res.errors[0].message}`);
        }
      }
    } catch (err) {
      console.warn(`Error procesando póliza ${p.id}:`, err);
      results.errors.push(`Póliza ${p.id}: ${err.message || 'Error de inserción'}`);
    }
  }

  // 3. Insertar Cobros en Hasura PostgreSQL
  onProgress({ stage: 'payments', progress: 90, message: `Registrando ${payments.length} cobros en PostgreSQL...` });

  for (const pay of payments) {
    try {
      const polizaId = policyDbMap.get(pay.policyId) || existingPoliciesMap.get((pay.policyId || '').trim().toLowerCase()) || null;
      const cleanClientName = pay.clientName ? pay.clientName.trim().toLowerCase() : '';
      const clienteId = clientDbMap.get(cleanClientName) || existingClientsMap.get(cleanClientName) || null;

      const insertCobroMut = `
        mutation InsertCobroImport($obj: cobros_insert_input!) {
          insert_cobros_one(object: $obj) { id }
        }
      `;
      const res = await executeGraphQL(insertCobroMut, {
        obj: {
          numero_recibo: pay.receiptId,
          poliza_id: polizaId,
          cliente_id: clienteId,
          fecha: pay.date || new Date().toISOString().split('T')[0],
          fecha_vencimiento: pay.dueDate || null,
          monto: pay.amount || 0,
          moneda: 'DOP',
          tipo: pay.type || 'Prima Inicial / Renovación',
          status: pay.status || 'Paid',
          metodo_pago: pay.paymentMethod || 'Transferencia',
          notas: pay.notes || 'Importado vía Excel',
        }
      }, { isDemo });

      if (res?.data?.insert_cobros_one?.id) {
        results.paymentsInserted++;

        // REGLA DE NEGOCIO: Si la póliza estaba cancelada y se importa/detecta un pago, reabrirla automáticamente
        if (polizaId && (pay.status === 'Paid' || !pay.status)) {
          try {
            const reopenRes = await executeGraphQL(`
              mutation ReopenCancelledPolicyOnPayment($polId: bigint!) {
                update_polizas(
                  where: { id: { _eq: $polId }, status: { _in: ["Cancelada", "Cancelled"] } },
                  _set: { status: "Active" }
                ) {
                  affected_rows
                }
              }
            `, { polId: polizaId }, { isDemo });

            if (reopenRes?.data?.update_polizas?.affected_rows > 0) {
              await executeGraphQL(`
                mutation InsertAutoReopenMov($obj: movimientos_poliza_insert_input!) {
                  insert_movimientos_poliza_one(object: $obj) { id }
                }
              `, {
                obj: {
                  poliza_id: polizaId,
                  fecha: pay.date || new Date().toISOString().split('T')[0],
                  tipo: 'Reapertura Automática por Pago',
                  descripcion: `Póliza reactivada automáticamente tras registrarse cobro ${pay.receiptId || ''} (${pay.amount || 0} DOP) desde actualización de base de datos.`,
                  evidencia: 'Excel / DB Update'
                }
              }, { isDemo });
            }
          } catch (reopenErr) {
            // Ignorar si no estaba cancelada
          }
        }
      }
    } catch (err) {
      console.warn(`Error insertando cobro ${pay.receiptId}:`, err);
    }
  }

  onProgress({ stage: 'done', progress: 100, message: '¡Importación finalizada con éxito!' });
  return results;
};

/**
 * Exporta toda la base de datos a un libro de Excel (.xlsx) estructurado y consolidado
 */
export const exportFullDatabaseToExcel = ({
  clients = [],
  policies = [],
  payments = [],
  claims = [],
  companies = [],
  agentCodes = []
}) => {
  const wb = XLSX.utils.book_new();

  // 1. Pólizas Sheet
  const polData = policies.map(p => ({
    'ID Póliza': p.id || '',
    'Cliente': p.client || '',
    'Aseguradora': p.insurer || '',
    'Ramo': p.type || '',
    'Cartera': p.cartera || '',
    'Código Agente': p.agentCode || '',
    'Prima / Monto': p.amount || 0,
    'Comisión (%)': p.commissionRate !== undefined && p.commissionRate !== null ? p.commissionRate : (p.porcentajeComision ?? 15.0),
    'Moneda': p.currency || 'DOP',
    'Frecuencia': p.renewalFrequency || 'Anual',
    'Fecha Inicio': p.startDate || '',
    'Última Renovación': p.lastRenewalDate || '',
    'Vigencia / Renovación': p.endDate || p.renewal || '',
    'Estado': p.status || 'Active',
    'Detalles': p.details || ''
  }));
  const wsPol = XLSX.utils.json_to_sheet(polData);
  XLSX.utils.book_append_sheet(wb, wsPol, 'Pólizas');

  // 2. Clientes Sheet
  const cliData = clients.map(c => ({
    'ID': c.id || '',
    'Nombre / Razón Social': c.name || '',
    'Tipo Persona': c.personType || '',
    'RNC / Cédula': c.documentId || c.cedula || c.rnc || '',
    'Código Aseguradora': c.insurerCode || '',
    'Teléfono': c.phone || '',
    'Celular': c.mobile || '',
    'Email': c.email || '',
    'Ciudad': c.city || '',
    'Sector': c.sector || '',
    'Dirección': c.address || '',
    'Notas': c.notes || ''
  }));
  const wsCli = XLSX.utils.json_to_sheet(cliData);
  XLSX.utils.book_append_sheet(wb, wsCli, 'Clientes');

  // 3. Cobros Sheet
  const cobData = payments.map(pay => ({
    'No. Recibo': pay.receiptId || pay.id || '',
    'No. Póliza': pay.policyId || '',
    'Cliente': pay.clientName || pay.client || '',
    'Aseguradora': pay.insurer || '',
    'Fecha': pay.date || '',
    'Fecha Vencimiento': pay.dueDate || '',
    'Monto': pay.amount || 0,
    'Moneda': pay.currency || 'DOP',
    'Tipo': pay.type || '',
    'Estado': pay.status || '',
    'Método de Pago': pay.paymentMethod || '',
    'Notas': pay.notes || ''
  }));
  const wsCob = XLSX.utils.json_to_sheet(cobData);
  XLSX.utils.book_append_sheet(wb, wsCob, 'Cobros');

  // 4. Siniestros Sheet
  const sinData = claims.map(s => ({
    'No. Reclamación': s.claimNumber || s.id || '',
    'No. Póliza': s.policyId || '',
    'Cliente': s.client || '',
    'Aseguradora': s.insurer || '',
    'Fecha Ocurrencia': s.incidentDate || '',
    'Fecha Notificación': s.notificationDate || '',
    'Monto Reclamado': s.claimedAmount || 0,
    'Monto Liquidado': s.approvedAmount || 0,
    'Estado': s.status || '',
    'Descripción': s.description || ''
  }));
  const wsSin = XLSX.utils.json_to_sheet(sinData);
  XLSX.utils.book_append_sheet(wb, wsSin, 'Siniestros');

  // 5. Aseguradoras Sheet
  const compData = companies.map(comp => ({
    'Aseguradora': comp.name || '',
    'RNC': comp.rnc || '',
    'Teléfono': comp.phone || '',
    'Email': comp.email || '',
    'Contacto': comp.contactPerson || ''
  }));
  const wsComp = XLSX.utils.json_to_sheet(compData);
  XLSX.utils.book_append_sheet(wb, wsComp, 'Aseguradoras');

  // 6. Códigos de Cartera Sheet
  const codData = agentCodes.map(ac => ({
    'Cartera / Agente': ac.agent || '',
    'Aseguradora': ac.insurer || '',
    'Código': ac.code || '',
    'Notas': ac.notes || ''
  }));
  const wsCod = XLSX.utils.json_to_sheet(codData);
  XLSX.utils.book_append_sheet(wb, wsCod, 'Códigos de Cartera');

  // Generate date stamp for filename
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = `${String(now.getHours()).padStart(2,'0')}${String(now.getMinutes()).padStart(2,'0')}`;
  const filename = `Respaldo_SantiagoMorales_${dateStr}_${timeStr}.xlsx`;

  XLSX.writeFile(wb, filename);
  return filename;
};

export const exportDatabaseToExcel = exportFullDatabaseToExcel;



