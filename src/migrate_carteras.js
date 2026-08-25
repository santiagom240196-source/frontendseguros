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
  console.log('1. Adding cartera and codigo_agente columns to polizas and clientes...');
  const alterSql = `
    ALTER TABLE polizas ADD COLUMN IF NOT EXISTS cartera VARCHAR(100) DEFAULT 'Santiago Morales y Asociados, S.R.L.';
    ALTER TABLE polizas ADD COLUMN IF NOT EXISTS codigo_agente VARCHAR(50);
    ALTER TABLE clientes ADD COLUMN IF NOT EXISTS cartera VARCHAR(100) DEFAULT 'Santiago Morales y Asociados, S.R.L.';
    ALTER TABLE clientes ADD COLUMN IF NOT EXISTS codigo_agente VARCHAR(50);

    -- Tabla de Códigos de Agentes por Compañía
    CREATE TABLE IF NOT EXISTS agentes_codigos (
      id BIGSERIAL PRIMARY KEY,
      agente VARCHAR(150) NOT NULL,
      compania VARCHAR(150) NOT NULL,
      codigo VARCHAR(50) NOT NULL,
      notas TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(agente, compania, codigo)
    );

    -- Insertar códigos iniciales
    INSERT INTO agentes_codigos (agente, compania, codigo, notas)
    VALUES
      ('Santiago Morales y Asociados, S.R.L.', 'Humano Seguros', '76713', 'Código oficial suministrado para Humano Seguros'),
      ('Santiago Morales y Asociados, S.R.L.', 'La Colonial de Seguros', '8055', 'Código de agencia en La Colonial de Seguros'),
      ('Santiago Morales y Asociados, S.R.L.', 'La Colonial de Seguros', '45449', 'Código de cliente/agente Santiago Morales'),
      ('Raquel Rodríguez', 'La Colonial de Seguros', '897', 'Código de agente en La Colonial de Seguros')
    ON CONFLICT (agente, compania, codigo) DO NOTHING;

    -- Actualizar pólizas con sus carteras basadas en codigo_asegurador y clientes
    UPDATE polizas SET cartera = 'Santiago Morales y Asociados, S.R.L.', codigo_agente = '8055' 
    WHERE (codigo_asegurador = '8055' OR codigo_asegurador IS NULL OR codigo_asegurador = '45449') AND (cartera IS NULL OR cartera = '');

    UPDATE polizas SET cartera = 'Raquel Rodríguez', codigo_agente = '897'
    WHERE cliente_id = 58 OR codigo_asegurador = '897' OR codigo_asegurador = '100460';

    UPDATE clientes SET cartera = 'Raquel Rodríguez', codigo_agente = '897'
    WHERE id = 58 OR nombre ILIKE '%RODRIGUEZ MARTINEZ, RAQUEL%' OR codigo_agente = '897' OR codigo_agente = '100460';

    UPDATE clientes SET cartera = 'Santiago Morales y Asociados, S.R.L.'
    WHERE cartera IS NULL OR cartera = '';
  `;

  const alterRes = await runSql(alterSql);
  console.log('SQL Result:', JSON.stringify(alterRes, null, 2));

  console.log('2. Tracking agentes_codigos in Hasura...');
  const trackRes = await trackTable('agentes_codigos');
  console.log('Track Result:', JSON.stringify(trackRes, null, 2));

  console.log('3. Verifying agentes_codigos data...');
  const checkCodes = await runSql("SELECT * FROM agentes_codigos;");
  console.log('agentes_codigos rows:', JSON.stringify(checkCodes.result, null, 2));

  console.log('4. Verifying polizas cartera counts...');
  const checkPol = await runSql("SELECT cartera, COUNT(*) FROM polizas GROUP BY cartera;");
  console.log('polizas by cartera:', JSON.stringify(checkPol.result, null, 2));
}

main().catch(console.error);
