const HASURA_ENDPOINT = 'http://127.0.0.1:8080';
const ADMIN_SECRET = 'hasura_dev_admin_secret_key_123456';
const SOURCE_NAME = 'app_db_dev';

async function querySql(sql) {
  const res = await fetch(`${HASURA_ENDPOINT}/v2/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-hasura-admin-secret': ADMIN_SECRET },
    body: JSON.stringify({ type: 'run_sql', args: { source: SOURCE_NAME, sql } })
  });
  return res.json();
}

async function run() {
  console.log('--- CARTERA TABLE STRUCTURE & DATA ---');
  const cStructure = await querySql("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'cartera';");
  console.log('cartera columns:', JSON.stringify(cStructure.result, null, 2));

  const cData = await querySql("SELECT * FROM cartera;");
  console.log('cartera data:', JSON.stringify(cData.result, null, 2));

  console.log('--- V_CARTERA_COMPLETA VIEW ---');
  const vData = await querySql("SELECT * FROM v_cartera_completa LIMIT 10;");
  console.log('v_cartera_completa:', JSON.stringify(vData.result, null, 2));

  console.log('--- DISTINCT CODIGO_ASEGURADOR IN POLIZAS ---');
  const pCodes = await querySql("SELECT DISTINCT compania, codigo_asegurador, COUNT(*) FROM polizas GROUP BY compania, codigo_asegurador;");
  console.log('polizas codes:', JSON.stringify(pCodes.result, null, 2));

  console.log('--- DISTINCT CODIGO_COMPANIA IN CLIENTES ---');
  const clCodes = await querySql("SELECT DISTINCT codigo_compania, COUNT(*) FROM clientes GROUP BY codigo_compania;");
  console.log('clientes codes:', JSON.stringify(clCodes.result, null, 2));

  console.log('--- POLIZAS_DEMO DATA SAMPLE ---');
  const pdSample = await querySql("SELECT DISTINCT compania, codigo_asegurador FROM polizas_demo;");
  console.log('polizas_demo:', JSON.stringify(pdSample.result, null, 2));

  console.log('--- COMPANIAS TABLE DATA ---');
  const compData = await querySql("SELECT * FROM companias;");
  console.log('companias:', JSON.stringify(compData.result, null, 2));
}

run().catch(console.error);
