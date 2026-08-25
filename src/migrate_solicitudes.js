const fetch = globalThis.fetch;
const HASURA_ENDPOINT = 'http://127.0.0.1:8080';
const ADMIN_SECRET = 'hasura_dev_admin_secret_key_123456';
const SOURCE_NAME = 'app_db_dev';

async function runSql(sql) {
  const res = await fetch(`${HASURA_ENDPOINT}/v2/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-hasura-admin-secret': ADMIN_SECRET },
    body: JSON.stringify({ type: 'run_sql', args: { source: SOURCE_NAME, sql } })
  });
  return res.json();
}

async function trackTable(tableName) {
  const res = await fetch(`${HASURA_ENDPOINT}/v1/metadata`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-hasura-admin-secret': ADMIN_SECRET },
    body: JSON.stringify({
      type: 'pg_track_table',
      args: { source: SOURCE_NAME, table: { schema: 'public', name: tableName } }
    })
  });
  return res.json();
}

async function main() {
  console.log('1. Creating solicitudes table in PostgreSQL...');
  const createTableSql = `
    CREATE TABLE IF NOT EXISTS solicitudes (
      id BIGSERIAL PRIMARY KEY,
      numero_solicitud VARCHAR(50) UNIQUE NOT NULL,
      tipo VARCHAR(50) NOT NULL,
      subtipo VARCHAR(100),
      cliente_id BIGINT,
      poliza_id BIGINT,
      cliente_nombre VARCHAR(255),
      compania VARCHAR(150),
      cartera VARCHAR(100) DEFAULT 'Santiago Morales y Asociados, S.R.L.',
      ramo VARCHAR(100),
      fecha_solicitud DATE DEFAULT CURRENT_DATE,
      fecha_efectiva DATE,
      status VARCHAR(50) DEFAULT 'Pendiente',
      prioridad VARCHAR(20) DEFAULT 'Media',
      monto_estimado NUMERIC(15, 2),
      devolucion_estimada NUMERIC(15, 2),
      descripcion TEXT,
      motivo TEXT,
      notas_aseguradora TEXT,
      numero_endoso VARCHAR(100),
      nueva_poliza_id VARCHAR(100),
      adjuntos JSONB DEFAULT '[]'::jsonb,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Insert sample solicitudes if empty
    INSERT INTO solicitudes (numero_solicitud, tipo, subtipo, cliente_nombre, compania, cartera, ramo, fecha_solicitud, status, prioridad, monto_estimado, descripcion)
    SELECT 'SOL-2026-0001', 'Emisión', 'Nueva Póliza', 'GRUPO EMPRESARIAL MORALES SRL', 'La Colonial de Seguros', 'Santiago Morales y Asociados, S.R.L.', 'Vehículo Comercial', CURRENT_DATE, 'En Trámite', 'Alta', 45000.00, 'Solicitud de emisión para flota de 2 camiones de distribución.'
    WHERE NOT EXISTS (SELECT 1 FROM solicitudes LIMIT 1);

    INSERT INTO solicitudes (numero_solicitud, tipo, subtipo, cliente_nombre, compania, cartera, ramo, fecha_solicitud, status, prioridad, descripcion)
    SELECT 'SOL-2026-0002', 'Cambio en Póliza', 'Cambio de Vehículo', 'JUAN BAUTISTA PEREZ', 'Humano Seguros', 'Santiago Morales y Asociados, S.R.L.', 'Auto', CURRENT_DATE - INTERVAL '2 days', 'Pendiente', 'Media', 'Endoso por cambio de vehículo: venta de Toyota Corolla 2018 e inclusión de Honda CR-V 2022.'
    WHERE NOT EXISTS (SELECT 1 FROM solicitudes WHERE numero_solicitud = 'SOL-2026-0002');
  `;

  const sqlRes = await runSql(createTableSql);
  console.log('SQL Result:', JSON.stringify(sqlRes, null, 2));

  console.log('2. Tracking solicitudes table in Hasura...');
  const trackRes = await trackTable('solicitudes');
  console.log('Track Result:', JSON.stringify(trackRes, null, 2));

  console.log('3. Verifying solicitudes rows...');
  const check = await runSql('SELECT * FROM solicitudes;');
  console.log('Rows:', JSON.stringify(check.result, null, 2));
}

main().catch(console.error);
