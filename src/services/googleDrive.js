/**
 * Google Drive API Service - Frontend Seguros (Santiago Morales & Asoc.)
 *
 * Utiliza Google Identity Services (GIS) para el flujo OAuth 2.0 en el navegador
 * y llamadas directas a la API REST v3 de Google Drive.
 */

const STORAGE_KEYS = {
  CLIENT_ID: 'gdrive_client_id',
  API_KEY: 'gdrive_api_key',
  PARENT_FOLDER_ID: 'gdrive_parent_folder_id',
  ACCESS_TOKEN: 'gdrive_access_token',
  TOKEN_EXPIRY: 'gdrive_token_expiry',
  USER_INFO: 'gdrive_user_info',
  FOLDER_MAPPINGS: 'gdrive_folder_mappings'
};

const DEFAULT_SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive'
].join(' ');

let tokenClient = null;
let gisLoadedPromise = null;

// =========================================================================
// 0. CONFIGURACIÓN Y PERSISTENCIA
// =========================================================================

export const getStoredDriveConfig = () => {
  return {
    clientId: localStorage.getItem(STORAGE_KEYS.CLIENT_ID) || import.meta.env.VITE_GOOGLE_CLIENT_ID || '821740511057-kl2tn6r2eeeip7sk1p0jes93ihlmrcng.apps.googleusercontent.com',
    apiKey: localStorage.getItem(STORAGE_KEYS.API_KEY) || import.meta.env.VITE_GOOGLE_API_KEY || '',
    parentFolderId: localStorage.getItem(STORAGE_KEYS.PARENT_FOLDER_ID) || import.meta.env.VITE_GOOGLE_DRIVE_FOLDER_ID || ''
  };
};

export const saveDriveConfig = ({ clientId, apiKey, parentFolderId }) => {
  if (clientId !== undefined) localStorage.setItem(STORAGE_KEYS.CLIENT_ID, clientId.trim());
  if (apiKey !== undefined) localStorage.setItem(STORAGE_KEYS.API_KEY, apiKey.trim());
  if (parentFolderId !== undefined) localStorage.setItem(STORAGE_KEYS.PARENT_FOLDER_ID, parentFolderId.trim());
  tokenClient = null; // Reiniciar client al cambiar configuración
};

export const getStoredAccessToken = () => {
  const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
  const expiry = localStorage.getItem(STORAGE_KEYS.TOKEN_EXPIRY);
  if (!token) return null;
  if (expiry && Date.now() > parseInt(expiry, 10)) {
    localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.TOKEN_EXPIRY);
    return null;
  }
  return token;
};

export const isDriveAuthenticated = () => {
  return !!getStoredAccessToken();
};

export const getConnectedUser = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.USER_INFO);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
};

export const getFolderMappings = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.FOLDER_MAPPINGS);
    return raw ? JSON.parse(raw) : { clients: {}, policies: {}, root: null };
  } catch (e) {
    return { clients: {}, policies: {}, root: null };
  }
};

export const saveFolderMappings = (mappings) => {
  localStorage.setItem(STORAGE_KEYS.FOLDER_MAPPINGS, JSON.stringify(mappings));
};

// =========================================================================
// 1. CARGA DE GIS Y AUTENTICACIÓN (OAuth 2.0 Desktop / Web)
// =========================================================================

export const loadGisScript = () => {
  if (window.google?.accounts?.oauth2) {
    return Promise.resolve(window.google.accounts.oauth2);
  }
  if (gisLoadedPromise) return gisLoadedPromise;

  gisLoadedPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
    if (existing) {
      existing.addEventListener('load', () => resolve(window.google.accounts.oauth2));
      existing.addEventListener('error', reject);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (window.google?.accounts?.oauth2) {
        resolve(window.google.accounts.oauth2);
      } else {
        reject(new Error('Google Identity Services no se inicializó correctamente.'));
      }
    };
    script.onerror = () => reject(new Error('Error al cargar el script de Google Identity Services.'));
    document.head.appendChild(script);
  });

  return gisLoadedPromise;
};

export const initGoogleDrive = async () => {
  const config = getStoredDriveConfig();
  if (!config.clientId) {
    console.info('Google Drive: Client ID no configurado aún.');
    return false;
  }

  await loadGisScript();
  return true;
};

export const connectGoogleDrive = async () => {
  const config = getStoredDriveConfig();
  if (!config.clientId) {
    throw new Error('Debes configurar tu "Client ID de OAuth" antes de conectar con Google Drive.');
  }

  await loadGisScript();

  return new Promise((resolve, reject) => {
    try {
      tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: config.clientId,
        scope: DEFAULT_SCOPES,
        callback: async (tokenResponse) => {
          if (tokenResponse.error) {
            reject(new Error(`Error de autenticación Google: ${tokenResponse.error}`));
            return;
          }

          const accessToken = tokenResponse.access_token;
          const expiresIn = parseInt(tokenResponse.expires_in || '3599', 10);
          const expiryTime = Date.now() + (expiresIn - 60) * 1000;

          localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
          localStorage.setItem(STORAGE_KEYS.TOKEN_EXPIRY, expiryTime.toString());

          // Obtener datos del perfil conectado
          try {
            const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
              headers: { Authorization: `Bearer ${accessToken}` }
            });
            if (userRes.ok) {
              const userInfo = await userRes.json();
              localStorage.setItem(STORAGE_KEYS.USER_INFO, JSON.stringify(userInfo));
            }
          } catch (uErr) {
            console.warn('No se pudo obtener información del perfil:', uErr);
          }

          resolve({
            accessToken,
            expiresIn,
            user: getConnectedUser()
          });
        }
      });

      // Solicitar token (abre ventana emergente de Google)
      tokenClient.requestAccessToken({ prompt: 'consent' });
    } catch (err) {
      reject(err);
    }
  });
};

export const disconnectGoogleDrive = () => {
  const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
  if (token && window.google?.accounts?.oauth2) {
    try {
      window.google.accounts.oauth2.revoke(token, () => {
        console.log('Token de Google Drive revocado.');
      });
    } catch (e) {
      console.warn('Error revocando token:', e);
    }
  }
  localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
  localStorage.removeItem(STORAGE_KEYS.TOKEN_EXPIRY);
  localStorage.removeItem(STORAGE_KEYS.USER_INFO);
};

// Helper interno para llamadas autenticadas con manejo de expiración
const fetchDriveApi = async (url, options = {}) => {
  let token = getStoredAccessToken();
  if (!token) {
    throw new Error('No hay una sesión activa de Google Drive. Por favor inicia sesión.');
  }

  const headers = {
    ...options.headers,
    Authorization: `Bearer ${token}`
  };

  const response = await fetch(url, { ...options, headers });

  if (response.status === 401) {
    disconnectGoogleDrive();
    throw new Error('La sesión de Google Drive ha expirado. Por favor reconecta tu cuenta.');
  }

  if (!response.ok) {
    const errorBody = await response.text();
    let errorMsg = `Error de Google Drive (${response.status}): ${response.statusText}`;
    try {
      const parsed = JSON.parse(errorBody);
      if (parsed.error?.message) errorMsg = parsed.error.message;
    } catch (e) {}
    throw new Error(errorMsg);
  }

  return response;
};

// =========================================================================
// 2. OPERACIONES DE CREAR (Carpetas y Archivos)
// =========================================================================

/**
 * Crea una carpeta en Google Drive
 */
export const createFolder = async (folderName, parentFolderId = null) => {
  const config = getStoredDriveConfig();
  const parentId = parentFolderId || config.parentFolderId || null;

  const metadata = {
    name: folderName,
    mimeType: 'application/vnd.google-apps.folder'
  };

  if (parentId) {
    metadata.parents = [parentId];
  }

  const res = await fetchDriveApi('https://www.googleapis.com/drive/v3/files?fields=id,name,webViewLink,parents', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(metadata)
  });

  const data = await res.json();
  return {
    id: data.id,
    name: data.name,
    webViewLink: data.webViewLink || `https://drive.google.com/drive/folders/${data.id}`,
    parents: data.parents
  };
};

/**
 * Busca si ya existe una carpeta con ese nombre exacto dentro del padre. Si existe la devuelve, sino la crea.
 */
export const findOrCreateFolder = async (folderName, parentFolderId = null) => {
  const queryParts = [
    `name = '${folderName.replace(/'/g, "\\'")}'`,
    "mimeType = 'application/vnd.google-apps.folder'",
    "trashed = false"
  ];
  if (parentFolderId) {
    queryParts.push(`'${parentFolderId}' in parents`);
  }

  const query = encodeURIComponent(queryParts.join(' and '));
  const fields = encodeURIComponent('files(id, name, webViewLink, parents)');

  const res = await fetchDriveApi(`https://www.googleapis.com/drive/v3/files?q=${query}&pageSize=1&fields=${fields}`);
  const data = await res.json();

  if (data.files && data.files.length > 0) {
    const f = data.files[0];
    return {
      id: f.id,
      name: f.name,
      webViewLink: f.webViewLink || `https://drive.google.com/drive/folders/${f.id}`,
      parents: f.parents,
      alreadyExisted: true
    };
  }

  const created = await createFolder(folderName, parentFolderId);
  return { ...created, alreadyExisted: false };
};

/**
 * Sube un archivo a Google Drive (Soporta Blob, File, ArrayBuffer o String)
 */
export const uploadFile = async ({ name, content, mimeType = 'application/octet-stream', parentFolderId = null }) => {
  const config = getStoredDriveConfig();
  const parentId = parentFolderId || config.parentFolderId || null;

  const metadata = {
    name: name,
    mimeType: mimeType
  };

  if (parentId) {
    metadata.parents = [parentId];
  }

  let blobContent;
  if (content instanceof Blob) {
    blobContent = content;
  } else if (typeof content === 'string') {
    blobContent = new Blob([content], { type: mimeType });
  } else if (content instanceof ArrayBuffer) {
    blobContent = new Blob([content], { type: mimeType });
  } else {
    blobContent = new Blob([JSON.stringify(content)], { type: 'application/json' });
  }

  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const metadataPart = 'Content-Type: application/json; charset=UTF-8\r\n\r\n' + JSON.stringify(metadata);
  const mediaHeader = `Content-Type: ${mimeType}\r\n\r\n`;

  const multipartBody = new Blob([
    delimiter,
    metadataPart,
    delimiter,
    mediaHeader,
    blobContent,
    closeDelimiter
  ], { type: `multipart/related; boundary=${boundary}` });

  const res = await fetchDriveApi('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,size,webViewLink,webContentLink,createdTime', {
    method: 'POST',
    headers: {
      'Content-Type': `multipart/related; boundary=${boundary}`
    },
    body: multipartBody
  });

  return await res.json();
};

/**
 * Helper para crear o recuperar la carpeta de un cliente
 */
export const createClientFolder = async (clientName, parentFolderId = null) => {
  if (!isDriveAuthenticated()) {
    return {
      id: 'mock-folder-' + Date.now(),
      name: clientName,
      webViewLink: '#'
    };
  }

  try {
    return await findOrCreateFolder(clientName, parentFolderId);
  } catch (err) {
    console.error('Error al crear carpeta en Google Drive:', err);
    return {
      id: 'fallback-folder-' + Date.now(),
      name: clientName,
      webViewLink: '#'
    };
  }
};

// =========================================================================
// 3. SINCRONIZACIÓN Y CREACIÓN MASIVA DE BASE DE DATOS EN DRIVE
// =========================================================================

/**
 * Recorre todos los clientes y sus pólizas y crea la jerarquía completa en Google Drive:
 * 📁 Cartera - Santiago Morales & Asoc. (Raíz)
 *   └── 📁 [Nombre Cliente] ([Cédula/RNC])
 *         └── 📁 Póliza [Número] · [Ramo] ([Aseguradora])
 */
export const syncFullDatabaseHierarchy = async ({ clients = [], policies = [], onProgress = () => {} }) => {
  if (!isDriveAuthenticated()) {
    throw new Error('Debes conectar tu cuenta de Google Drive antes de iniciar la sincronización.');
  }

  const config = getStoredDriveConfig();
  const mappings = getFolderMappings();

  // 1. Obtener o crear Carpeta Raíz de la Empresa
  const rootFolderName = 'Santiago Morales & Asoc - Cartera y Pólizas';
  onProgress({
    step: 'root',
    percentage: 5,
    message: `Verificando o creando carpeta principal "${rootFolderName}"...`
  });

  let rootFolder;
  if (config.parentFolderId) {
    rootFolder = { id: config.parentFolderId, name: rootFolderName, webViewLink: `https://drive.google.com/drive/folders/${config.parentFolderId}` };
  } else {
    rootFolder = await findOrCreateFolder(rootFolderName, null);
    // Guardar como carpeta padre para el futuro
    saveDriveConfig({ parentFolderId: rootFolder.id });
  }

  mappings.root = rootFolder;

  const totalClients = clients.length;
  let processedClients = 0;
  let createdClientFolders = 0;
  let createdPolicyFolders = 0;

  for (let i = 0; i < clients.length; i++) {
    const client = clients[i];
    const clientDoc = client.documentId ? ` (${client.documentId})` : '';
    const clientFolderName = `${client.name || 'Cliente'}${clientDoc}`.trim();

    processedClients++;
    const progressPercent = Math.round(5 + (processedClients / totalClients) * 90);

    onProgress({
      step: 'client',
      current: processedClients,
      total: totalClients,
      percentage: progressPercent,
      clientName: client.name,
      message: `[${processedClients}/${totalClients}] Creando carpeta para: ${client.name}...`
    });

    // Crear / Buscar carpeta del cliente
    let clientFolder;
    try {
      clientFolder = await findOrCreateFolder(clientFolderName, rootFolder.id);
      if (!clientFolder.alreadyExisted) createdClientFolders++;
      
      mappings.clients[client.id] = {
        id: clientFolder.id,
        name: clientFolder.name,
        webViewLink: clientFolder.webViewLink,
        documentId: client.documentId
      };
      // También mapear por nombre para compatibilidad
      mappings.clients[client.name] = mappings.clients[client.id];
    } catch (cErr) {
      console.error(`Error procesando cliente ${client.name}:`, cErr);
      continue;
    }

    // Buscar pólizas asociadas al cliente
    const clientPolicies = policies.filter(p => 
      p.clienteId === client.id || 
      p.rawId === client.id || 
      (p.client && client.name && p.client.toLowerCase() === client.name.toLowerCase())
    );

    for (const policy of clientPolicies) {
      const polNum = policy.id || policy.numero_poliza || 'S/N';
      const ramo = policy.type || policy.ramo || 'General';
      const aseguradora = policy.insurer || policy.compania || '';
      const policyFolderName = `Póliza ${polNum} · ${ramo}${aseguradora ? ` (${aseguradora})` : ''}`.trim();

      onProgress({
        step: 'policy',
        current: processedClients,
        total: totalClients,
        percentage: progressPercent,
        clientName: client.name,
        policyName: policyFolderName,
        message: `  └── Creando subcarpeta: ${policyFolderName}`
      });

      try {
        const policyFolder = await findOrCreateFolder(policyFolderName, clientFolder.id);
        if (!policyFolder.alreadyExisted) createdPolicyFolders++;

        mappings.policies[policy.id] = {
          id: policyFolder.id,
          name: policyFolder.name,
          webViewLink: policyFolder.webViewLink,
          clientId: client.id,
          clientFolderId: clientFolder.id
        };
      } catch (pErr) {
        console.error(`Error procesando póliza ${polNum}:`, pErr);
      }
    }
  }

  saveFolderMappings(mappings);

  onProgress({
    step: 'completed',
    percentage: 100,
    message: `¡Sincronización completada! ${processedClients} clientes y ${createdPolicyFolders} pólizas estructuradas en Drive.`
  });

  return {
    rootFolder,
    mappings,
    stats: {
      totalClients,
      createdClientFolders,
      createdPolicyFolders
    }
  };
};

/**
 * Retorna el ID de la subcarpeta de una póliza o cliente para subir documentos
 */
export const getTargetFolderForUpload = (policyId, clientId, clientName) => {
  const mappings = getFolderMappings();

  if (policyId && mappings.policies[policyId]?.id) {
    return mappings.policies[policyId].id;
  }

  if (clientId && mappings.clients[clientId]?.id) {
    return mappings.clients[clientId].id;
  }

  if (clientName && mappings.clients[clientName]?.id) {
    return mappings.clients[clientName].id;
  }

  const config = getStoredDriveConfig();
  return config.parentFolderId || null;
};

// =========================================================================
// 4. OPERACIONES DE LLAMAR / LEER / BUSCAR
// =========================================================================

/**
 * Busca archivos o carpetas en Google Drive
 */
export const searchFiles = async ({ name, parentFolderId, mimeType, query, pageSize = 30 } = {}) => {
  const queryParts = ['trashed = false'];

  if (name) {
    queryParts.push(`name contains '${name.replace(/'/g, "\\'")}'`);
  }

  if (parentFolderId) {
    queryParts.push(`'${parentFolderId}' in parents`);
  }

  if (mimeType) {
    queryParts.push(`mimeType = '${mimeType}'`);
  }

  if (query) {
    queryParts.push(`(${query})`);
  }

  const finalQuery = encodeURIComponent(queryParts.join(' and '));
  const fields = encodeURIComponent('files(id, name, mimeType, size, modifiedTime, createdTime, webViewLink, webContentLink, iconLink, parents)');

  const res = await fetchDriveApi(
    `https://www.googleapis.com/drive/v3/files?q=${finalQuery}&pageSize=${pageSize}&fields=${fields}&orderBy=modifiedTime desc`
  );

  const data = await res.json();
  return data.files || [];
};

/**
 * Obtiene los metadatos completos de un archivo por su ID
 */
export const getFileMetadata = async (fileId) => {
  const fields = encodeURIComponent('id, name, mimeType, size, modifiedTime, createdTime, webViewLink, webContentLink, parents, owners');
  const res = await fetchDriveApi(`https://www.googleapis.com/drive/v3/files/${fileId}?fields=${fields}`);
  return await res.json();
};

/**
 * Lee o descarga el contenido de un archivo
 */
export const readFileContent = async (fileId, format = 'text') => {
  const res = await fetchDriveApi(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`);

  if (format === 'blob') {
    return await res.blob();
  } else if (format === 'json') {
    return await res.json();
  } else if (format === 'arrayBuffer') {
    return await res.arrayBuffer();
  } else {
    return await res.text();
  }
};

// =========================================================================
// 5. OPERACIONES DE MODIFICAR / BORRAR
// =========================================================================

/**
 * Actualiza el contenido y/o nombre de un archivo existente
 */
export const updateFileContent = async (fileId, { name, content, mimeType } = {}) => {
  if (content === undefined) {
    const res = await fetchDriveApi(`https://www.googleapis.com/drive/v3/files/${fileId}?fields=id,name,modifiedTime,webViewLink`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    });
    return await res.json();
  }

  const metadata = {};
  if (name) metadata.name = name;

  let blobContent;
  if (content instanceof Blob) {
    blobContent = content;
  } else if (typeof content === 'string') {
    blobContent = new Blob([content], { type: mimeType || 'text/plain' });
  } else {
    blobContent = new Blob([content], { type: mimeType || 'application/octet-stream' });
  }

  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const metadataPart = 'Content-Type: application/json; charset=UTF-8\r\n\r\n' + JSON.stringify(metadata);
  const mediaHeader = `Content-Type: ${mimeType || blobContent.type || 'application/octet-stream'}\r\n\r\n`;

  const multipartBody = new Blob([
    delimiter,
    metadataPart,
    delimiter,
    mediaHeader,
    blobContent,
    closeDelimiter
  ], { type: `multipart/related; boundary=${boundary}` });

  const res = await fetchDriveApi(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart&fields=id,name,mimeType,size,modifiedTime,webViewLink`, {
    method: 'PATCH',
    headers: {
      'Content-Type': `multipart/related; boundary=${boundary}`
    },
    body: multipartBody
  });

  return await res.json();
};

/**
 * Elimina un archivo o carpeta en Google Drive
 */
export const deleteFile = async (fileId, permanent = false) => {
  if (permanent) {
    await fetchDriveApi(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
      method: 'DELETE'
    });
    return { success: true, permanent: true, fileId };
  } else {
    const res = await fetchDriveApi(`https://www.googleapis.com/drive/v3/files/${fileId}?fields=id,name,trashed`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trashed: true })
    });
    const data = await res.json();
    return { success: true, permanent: false, ...data };
  }
};
