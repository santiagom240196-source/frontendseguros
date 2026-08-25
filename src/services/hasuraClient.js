/**
 * Hasura GraphQL Client Service
 * Santiago Morales & Asoc. - Gestión de Seguros
 */

const DEFAULT_ENDPOINT = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_HASURA_GRAPHQL_ENDPOINT) || 'http://127.0.0.1:8080/v1/graphql';
const DEFAULT_ADMIN_SECRET = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_HASURA_ADMIN_SECRET) || 'hasura_dev_admin_secret_key_123456';
const DEFAULT_ROLE = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_HASURA_ROLE) || 'admin';

export const getHasuraConfig = () => {
  const customEndpoint = localStorage.getItem('hasura_endpoint');
  const customSecret = localStorage.getItem('hasura_admin_secret');
  const customRole = localStorage.getItem('hasura_role');

  const validSecret = (customSecret && customSecret !== 'myadminsecretkey')
    ? customSecret
    : DEFAULT_ADMIN_SECRET;

  return {
    endpoint: customEndpoint || DEFAULT_ENDPOINT,
    adminSecret: validSecret,
    role: customRole || DEFAULT_ROLE,
  };
};

export const saveHasuraConfig = ({ endpoint, adminSecret, role }) => {
  if (endpoint) localStorage.setItem('hasura_endpoint', endpoint);
  if (adminSecret !== undefined) localStorage.setItem('hasura_admin_secret', adminSecret);
  if (role) localStorage.setItem('hasura_role', role);
};

export const resetHasuraConfig = () => {
  localStorage.removeItem('hasura_endpoint');
  localStorage.removeItem('hasura_admin_secret');
  localStorage.removeItem('hasura_role');
};

/**
 * Helper to perform fetch with timeout
 */
const doFetch = async (url, headers, body, timeoutMs) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(timer);
    return response;
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
};

/**
 * Execute a GraphQL query or mutation against Hasura.
 * Supports auto-fallback between proxy (/v1/graphql) and direct (http://localhost:8080/v1/graphql).
 */
export const executeGraphQL = async (query, variables = {}, options = {}) => {
  const { isDemo = false, timeoutMs = 7000 } = options;
  const config = getHasuraConfig();

  // Protect database in Demo / Sandbox mode: intercept write mutations
  const isMutation = query.trim().startsWith('mutation');
  if (isDemo && isMutation) {
    console.warn('🛡️ [Hasura Sandbox]: Mutación GraphQL bloqueada para el Usuario de Prueba.');
    return { data: null, isSandboxIntercepted: true };
  }

  const headers = {
    'Content-Type': 'application/json',
  };

  if (config.adminSecret) {
    headers['x-hasura-admin-secret'] = config.adminSecret;
  }

  if (config.role) {
    headers['x-hasura-role'] = config.role;
  }

  const body = { query, variables };
  let primaryUrl = config.endpoint;
  let fallbackUrl = primaryUrl.startsWith('http') ? '/v1/graphql' : 'http://localhost:8080/v1/graphql';

  try {
    let response;
    try {
      response = await doFetch(primaryUrl, headers, body, timeoutMs);
    } catch (primaryErr) {
      // If primary failed due to network/CORS, try fallback URL
      console.info(`Primary endpoint [${primaryUrl}] failed, trying fallback [${fallbackUrl}]...`);
      response = await doFetch(fallbackUrl, headers, body, timeoutMs);
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP Error ${response.status}: ${errorText || response.statusText}`);
    }

    const result = await response.json();

    if (result.errors && result.errors.length > 0) {
      throw new Error(result.errors.map(e => e.message).join(' | '));
    }

    return result;
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('Tiempo de espera agotado al conectar con Hasura (Timeout).');
    }
    throw error;
  }
};

/**
 * Check if the Hasura backend is accessible and responsive.
 */
export const checkHasuraHealth = async () => {
  const startTime = Date.now();
  const config = getHasuraConfig();

  try {
    const res = await executeGraphQL('query PingHealth { __typename }', {}, { timeoutMs: 3500 });
    const latencyMs = Date.now() - startTime;
    return {
      isHealthy: Boolean(res && res.data),
      latencyMs,
      endpoint: config.endpoint,
      error: null,
    };
  } catch (err) {
    return {
      isHealthy: false,
      latencyMs: Date.now() - startTime,
      endpoint: config.endpoint,
      error: err.message || 'No se pudo contactar el servidor Hasura.',
    };
  }
};
