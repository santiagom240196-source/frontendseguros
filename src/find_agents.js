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
  console.log('--- CARTERA ROWS ---');
  const cData = await querySql("SELECT * FROM cartera LIMIT 50;");
  console.log('cartera:', JSON.stringify(cData.result, null, 2));

  console.log('--- V_CARTERA_COMPLETA DEFINITION OR SAMPLE ---');
  const vData = await querySql("SELECT * FROM v_cartera_completa LIMIT 10;");
  console.log('v_cartera_completa:', JSON.stringify(vData.result, null, 2));

  console.log('--- CHECK FOR SANTIAGO OR RAQUEL IN ANY TABLE ---');
  const findS = await querySql("SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = 'public';");
  console.log('All columns:', JSON.stringify(findS.result, null, 2));

  console.log('--- CHECK ALL DISTINCT CODES IN POLIZAS ---');
  const pCodes = await querySql("SELECT DISTINCT compania, codigo_asegurador FROM polizas;");
  console.log('polizas codes:', JSON.stringify(pCodes.result, null, 2));

  console.log('--- CHECK IF ANY CLIENTS HAVE AGENT INFO ---');
  const cl = await querySql("SELECT id, nombre, apellidos, cedula_rnc, codigo_compania FROM clientes WHERE nombre ILIKE '%raquel%' OR apellidos ILIKE '%raquel%' OR nombre ILIKE '%morales%' OR apellidos ILIKE '%morales%';");
  console.log('clientes match:', JSON.stringify(cl.result, null, 2));
}

run().catch(console.error);
