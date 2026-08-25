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
  console.log('--- POLICIES OF RAQUEL RODRIGUEZ (cliente_id = 58) ---');
  const pRaquel = await querySql("SELECT * FROM polizas WHERE cliente_id = 58;");
  console.log(JSON.stringify(pRaquel.result, null, 2));

  console.log('--- CHECK DISTINCT codigo_asegurador in polizas ---');
  const pAseg = await querySql("SELECT DISTINCT codigo_asegurador FROM polizas;");
  console.log(JSON.stringify(pAseg.result, null, 2));

  console.log('--- CHECK DISTINCT codigo_asegurador in cartera table ---');
  const cAseg = await querySql("SELECT DISTINCT codigo_asegurador FROM cartera;");
  console.log(JSON.stringify(cAseg.result, null, 2));

  console.log('--- CHECK ALL DISTINCT compania IN polizas ---');
  const comps = await querySql("SELECT DISTINCT compania FROM polizas;");
  console.log(JSON.stringify(comps.result, null, 2));
}

run().catch(console.error);
