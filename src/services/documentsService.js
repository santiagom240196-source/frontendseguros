/**
 * Servicio Centralizado de Gestión de Documentos Adjuntos
 * Maneja el almacenamiento local e IndexedDB/LocalStorage de archivos,
 * conversión a Data URI (Base64), categorización por tipo de póliza/cliente
 * y agregación de documentos generados por el sistema (recibos PDF, etc.).
 */

const STORAGE_PREFIX = 'sm_docs_';

// Categorías de documentos recomendadas según el tipo de póliza
export const POLICY_TYPE_RECOMMENDED_DOCS = {
  'Vehículo': [
    { id: 'matricula', name: 'Matrícula del Vehículo', required: true, icon: 'FileText' },
    { id: 'inspeccion', name: 'Fotos / Inspección del Vehículo', required: true, icon: 'Camera' },
    { id: 'licencia', name: 'Licencia de Conducir del Conductor', required: true, icon: 'CreditCard' },
    { id: 'cedula_propietario', name: 'Cédula / RNC del Propietario', required: true, icon: 'User' },
    { id: 'solicitud', name: 'Formulario de Solicitud de Seguro Auto', required: false, icon: 'FileCheck' },
    { id: 'condiciones', name: 'Carátula y Condiciones de Póliza', required: false, icon: 'Shield' },
  ],
  'Auto': [
    { id: 'matricula', name: 'Matrícula del Vehículo', required: true, icon: 'FileText' },
    { id: 'inspeccion', name: 'Fotos / Inspección del Vehículo', required: true, icon: 'Camera' },
    { id: 'licencia', name: 'Licencia de Conducir del Conductor', required: true, icon: 'CreditCard' },
    { id: 'cedula_propietario', name: 'Cédula / RNC del Propietario', required: true, icon: 'User' },
    { id: 'solicitud', name: 'Formulario de Solicitud de Seguro Auto', required: false, icon: 'FileCheck' },
  ],
  'Salud': [
    { id: 'declaracion_salud', name: 'Declaración de Salud / Cuestionario', required: true, icon: 'FileText' },
    { id: 'cedula_afiliados', name: 'Cédula de Titular y Dependientes', required: true, icon: 'User' },
    { id: 'analiticas', name: 'Exámenes / Analíticas Médicas', required: false, icon: 'Activity' },
    { id: 'solicitud_salud', name: 'Formulario de Afiliación / Solicitud', required: false, icon: 'FileCheck' },
  ],
  'Vida': [
    { id: 'declaracion_salud', name: 'Declaración Médica / Cuestionario de Salud', required: true, icon: 'FileText' },
    { id: 'beneficiarios', name: 'Designación de Beneficiarios', required: true, icon: 'Users' },
    { id: 'cedula_asegurado', name: 'Cédula de Identidad del Asegurado', required: true, icon: 'User' },
    { id: 'solicitud_vida', name: 'Solicitud de Seguro de Vida', required: false, icon: 'FileCheck' },
  ],
  'Incendio': [
    { id: 'tasacion', name: 'Tasación / Avalúo de la Propiedad', required: true, icon: 'Building' },
    { id: 'titulo', name: 'Copia de Título de Propiedad / Contrato Alquiler', required: true, icon: 'FileText' },
    { id: 'planos', name: 'Planos y Memoria Descriptiva', required: false, icon: 'Map' },
    { id: 'fotos_inmueble', name: 'Fotos del Inmueble y Medidas de Seguridad', required: false, icon: 'Camera' },
  ],
  'Propiedad': [
    { id: 'tasacion', name: 'Tasación / Avalúo de la Propiedad', required: true, icon: 'Building' },
    { id: 'titulo', name: 'Copia de Título de Propiedad / Contrato Alquiler', required: true, icon: 'FileText' },
    { id: 'planos', name: 'Planos y Memoria Descriptiva', required: false, icon: 'Map' },
    { id: 'fotos_inmueble', name: 'Fotos del Inmueble', required: false, icon: 'Camera' },
  ],
  'Responsabilidad Civil': [
    { id: 'contrato_obra', name: 'Contrato de Obra / Servicios', required: true, icon: 'FileText' },
    { id: 'cedula_rnc', name: 'RNC / Cédula del Contratista', required: true, icon: 'User' },
    { id: 'solicitud_rc', name: 'Formulario de Solicitud RC', required: false, icon: 'FileCheck' },
  ],
  'Fianzas': [
    { id: 'contrato_fianza', name: 'Contrato Principal / Pliego de Condiciones', required: true, icon: 'FileText' },
    { id: 'estados_financieros', name: 'Estados Financieros Auditados', required: true, icon: 'DollarSign' },
    { id: 'rnc_empresa', name: 'RNC y Registro Mercantil', required: true, icon: 'Building' },
  ],
  'General': [
    { id: 'solicitud_general', name: 'Formulario de Solicitud Firmado', required: true, icon: 'FileCheck' },
    { id: 'cedula_general', name: 'Cédula / Documento de Identidad', required: true, icon: 'User' },
    { id: 'condiciones_general', name: 'Condiciones y Coberturas', required: false, icon: 'Shield' },
  ]
};

// Categorías de documentos generales para Clientes
export const CLIENT_RECOMMENDED_DOCS = [
  { id: 'cedula', name: 'Cédula de Identidad / RNC', required: true, icon: 'User' },
  { id: 'licencia', name: 'Licencia de Conducir', required: false, icon: 'CreditCard' },
  { id: 'pasaporte', name: 'Pasaporte (Extranjeros)', required: false, icon: 'Globe' },
  { id: 'kyc', name: 'Formulario Conozca a su Cliente (KYC)', required: false, icon: 'FileCheck' },
  { id: 'contrato', name: 'Contrato / Carta de Nombramiento de Corredor', required: false, icon: 'FileText' },
  { id: 'registro_mercantil', name: 'Registro Mercantil (Empresas)', required: false, icon: 'Building' },
];

/**
 * Obtiene la lista de documentos recomendados según el ramo / tipo de póliza
 */
export const getRecommendedDocumentTypes = (policyType = '') => {
  const typeNorm = (policyType || '').trim();
  for (const key of Object.keys(POLICY_TYPE_RECOMMENDED_DOCS)) {
    if (typeNorm.toLowerCase().includes(key.toLowerCase())) {
      return POLICY_TYPE_RECOMMENDED_DOCS[key];
    }
  }
  return POLICY_TYPE_RECOMMENDED_DOCS['General'];
};

/**
 * Convierte un archivo File (desde input file) a base64 Data URI
 */
export const fileToDataUri = (file) => {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error('No se proporcionó ningún archivo'));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
};

/**
 * Formatea el tamaño en bytes a KB o MB
 */
export const formatFileSize = (bytes) => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

/**
 * Obtiene los documentos almacenados para una entidad ('client', 'policy', 'movement')
 */
export const getDocumentsForEntity = (entityType, entityId) => {
  if (!entityId) return [];
  try {
    const key = `${STORAGE_PREFIX}${entityType}_${entityId}`;
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.warn(`Error leyendo documentos para ${entityType} ${entityId}:`, e);
    return [];
  }
};

/**
 * Guarda un documento para una entidad ('client', 'policy', 'movement')
 */
export const saveDocumentForEntity = (entityType, entityId, docData) => {
  if (!entityId || !docData) return null;
  try {
    const key = `${STORAGE_PREFIX}${entityType}_${entityId}`;
    const current = getDocumentsForEntity(entityType, entityId);

    const newDoc = {
      id: docData.id || `doc_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      name: docData.name || 'Documento sin título',
      category: docData.category || 'General',
      date: docData.date || new Date().toISOString().split('T')[0],
      size: docData.size || '150 KB',
      sizeBytes: docData.sizeBytes || 153600,
      type: docData.type || 'application/pdf',
      dataUri: docData.dataUri || null,
      fileUrl: docData.fileUrl || docData.dataUri || '#',
      movementType: docData.movementType || null,
      notes: docData.notes || '',
      uploadedBy: docData.uploadedBy || 'Santiago Morales & Asoc.',
      isSystemGenerated: !!docData.isSystemGenerated,
      createdAt: docData.createdAt || new Date().toISOString()
    };

    // Si ya existe (por ID), se actualiza, sino se agrega al inicio
    const existingIdx = current.findIndex(d => d.id === newDoc.id);
    let updated;
    if (existingIdx >= 0) {
      updated = [...current];
      updated[existingIdx] = { ...updated[existingIdx], ...newDoc };
    } else {
      updated = [newDoc, ...current];
    }

    localStorage.setItem(key, JSON.stringify(updated));
    return newDoc;
  } catch (e) {
    console.error(`Error guardando documento para ${entityType} ${entityId}:`, e);
    return null;
  }
};

/**
 * Elimina un documento por su ID
 */
export const deleteDocumentForEntity = (entityType, entityId, docId) => {
  if (!entityId || !docId) return false;
  try {
    const key = `${STORAGE_PREFIX}${entityType}_${entityId}`;
    const current = getDocumentsForEntity(entityType, entityId);
    const filtered = current.filter(d => d.id !== docId);
    localStorage.setItem(key, JSON.stringify(filtered));
    return true;
  } catch (e) {
    console.error(`Error eliminando documento ${docId}:`, e);
    return false;
  }
};

/**
 * Agrega todos los documentos de una póliza:
 * 1. Documentos directos de la póliza (Matrícula, Inspección, etc.)
 * 2. Recibos oficiales generados en el sistema (PDFs de pagos)
 * 3. Documentos de movimientos (Endosos, Inclusiones, etc.)
 */
export const getAllPolicyDocuments = (policy, paymentsList = []) => {
  if (!policy) return [];
  const directDocs = getDocumentsForEntity('policy', policy.id);

  // Extraer recibos oficiales PDF asociados a esta póliza
  const policyPayments = paymentsList.filter(p => 
    p.policyId === policy.id || p.polizaId === policy.rawId || p.polizaId === policy.id
  );

  const paymentDocs = policyPayments
    .filter(p => p.receiptUrl || p.comprobante)
    .map(p => ({
      id: `rcpt_${p.id}`,
      name: `Recibo Oficial ${p.id} - ${p.type || 'Pago'}.pdf`,
      category: 'Recibo Oficial de Pago',
      date: p.date,
      size: '120 KB',
      type: 'application/pdf',
      dataUri: p.receiptUrl || p.comprobante,
      fileUrl: p.receiptUrl || p.comprobante,
      isSystemGenerated: true,
      notes: `Monto: ${p.amount || 'N/D'} · Método: ${p.paymentMethod || 'Efectivo'}`,
      uploadedBy: 'Sistema Contable'
    }));

  // Extraer evidencias de movimientos si están en policy.movements
  const movementDocs = (policy.movements || [])
    .filter(m => m.evidence && m.evidence !== 'N/A')
    .map(m => ({
      id: `mov_doc_${m.id}`,
      name: m.evidence,
      category: `Movimiento: ${m.type || 'Endoso'}`,
      date: m.date,
      size: '2.1 MB',
      type: m.evidence.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg',
      dataUri: m.dataUri || null,
      fileUrl: m.dataUri || '#',
      movementType: m.type,
      notes: m.description,
      uploadedBy: 'Gestión de Pólizas'
    }));

  // Combinar sin duplicados por ID
  const allMap = new Map();
  directDocs.forEach(d => allMap.set(d.id, d));
  paymentDocs.forEach(d => allMap.set(d.id, d));
  movementDocs.forEach(d => {
    if (!allMap.has(d.id)) allMap.set(d.id, d);
  });

  return Array.from(allMap.values());
};

/**
 * Agrega todos los documentos de un cliente:
 * 1. Documentos directos del cliente (Cédula, Licencia, etc.)
 * 2. Recibos de pagos emitidos a nombre del cliente
 */
export const getAllClientDocuments = (client, paymentsList = []) => {
  if (!client) return [];
  const clientDirectDocs = getDocumentsForEntity('client', client.id);

  // Recibos de pagos del cliente
  const clientNameNorm = (client.name || '').trim().toLowerCase();
  const clientPayments = paymentsList.filter(p => 
    (p.clienteId && String(p.clienteId) === String(client.id)) ||
    (p.client && p.client.trim().toLowerCase() === clientNameNorm)
  );

  const receiptDocs = clientPayments
    .filter(p => p.receiptUrl || p.comprobante)
    .map(p => ({
      id: `rcpt_cli_${p.id}`,
      name: `Recibo Oficial ${p.id} - ${p.policy || 'Póliza'}.pdf`,
      category: 'Recibo Oficial de Pago',
      date: p.date,
      size: '120 KB',
      type: 'application/pdf',
      dataUri: p.receiptUrl || p.comprobante,
      fileUrl: p.receiptUrl || p.comprobante,
      isSystemGenerated: true,
      notes: `Monto: ${p.amount || 'N/D'} · Concepto: ${p.type || 'Cuota'}`,
      uploadedBy: 'Sistema Contable'
    }));

  const allMap = new Map();
  clientDirectDocs.forEach(d => allMap.set(d.id, d));
  receiptDocs.forEach(d => allMap.set(d.id, d));

  return Array.from(allMap.values());
};
