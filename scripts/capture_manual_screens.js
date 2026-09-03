import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const APP_URL = 'http://localhost:5174/';
const OUTPUT_DIR = path.resolve('manual_assets');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function run() {
  console.log('Iniciando captura indexada con espera de Hasura...');
  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
    defaultViewport: { width: 1440, height: 900 }
  });

  const page = await browser.newPage();

  try {
    // 0. Login
    await page.goto(APP_URL, { waitUntil: 'networkidle2' });
    await sleep(1500);
    await page.screenshot({ path: path.join(OUTPUT_DIR, '00_login.png') });

    // Autenticar
    await page.evaluate(() => {
      localStorage.setItem('app_remember_session_v2', 'true');
      localStorage.setItem('app_is_authenticated_v2', 'true');
      localStorage.setItem('app_active_user_id_v2', 'santiagom2401');
    });
    await page.goto(APP_URL, { waitUntil: 'networkidle2' });

    console.log('Esperando a que Hasura termine de sincronizar...');
    await page.waitForFunction(
      () => !document.body.innerText.includes('Cargando datos de la base de datos Hasura'),
      { timeout: 30000 }
    );
    await sleep(2000);

    async function clickMenu(label) {
      await page.evaluate((target) => {
        const buttons = Array.from(document.querySelectorAll('nav button'));
        const btn = buttons.find(b => b.innerText && b.innerText.includes(target));
        if (btn) btn.click();
      }, label);
      await sleep(2000);
    }

    // 01: Inicio / Dashboard
    console.log('01_dashboard.png');
    await clickMenu('Inicio');
    await page.screenshot({ path: path.join(OUTPUT_DIR, '01_dashboard.png') });

    // 02: Clientes
    console.log('02_clientes.png');
    await clickMenu('Clientes');
    await page.screenshot({ path: path.join(OUTPUT_DIR, '02_clientes.png') });

    // 03: Pólizas
    console.log('03_polizas.png');
    await clickMenu('Pólizas');
    await page.screenshot({ path: path.join(OUTPUT_DIR, '03_polizas.png') });

    // 04: Modal Nueva Póliza
    console.log('04_nueva_poliza.png');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const b = btns.find(x => x.innerText && (x.innerText.includes('Emitir Nueva Póliza') || x.innerText.includes('Nueva Póliza')));
      if (b) b.click();
    });
    await sleep(1500);
    await page.screenshot({ path: path.join(OUTPUT_DIR, '04_nueva_poliza.png') });

    // Cerrar modal
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const c = btns.find(x => x.innerText && (x.innerText.trim() === 'Cancelar' || x.innerText.trim() === '×'));
      if (c) c.click();
    });
    await sleep(1000);

    // 05: Detalle de Póliza (drawer)
    console.log('05_poliza_detalle.png');
    await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('tr.hover-row'));
      if (rows.length > 0) rows[0].click();
    });
    await sleep(1500);
    await page.screenshot({ path: path.join(OUTPUT_DIR, '05_poliza_detalle.png') });

    // Cerrar drawer
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const closeB = btns.find(x => x.innerText && (x.innerText.trim() === '✕' || x.innerText.trim() === '×'));
      if (closeB) closeB.click();
    });
    await sleep(1000);

    // 06: Cobros
    console.log('06_cobros.png');
    await clickMenu('Cobros');
    await page.screenshot({ path: path.join(OUTPUT_DIR, '06_cobros.png') });

    // 07: Comisiones
    console.log('07_comisiones.png');
    await clickMenu('Comisiones');
    await page.screenshot({ path: path.join(OUTPUT_DIR, '07_comisiones.png') });

    // 08: Compañías
    console.log('08_companias.png');
    await clickMenu('Compañías');
    await page.screenshot({ path: path.join(OUTPUT_DIR, '08_companias.png') });

    // 09: Solicitudes
    console.log('09_solicitudes.png');
    await clickMenu('Solicitudes');
    await page.screenshot({ path: path.join(OUTPUT_DIR, '09_solicitudes.png') });

    // 10: Siniestros
    console.log('10_siniestros.png');
    await clickMenu('Siniestros');
    await page.screenshot({ path: path.join(OUTPUT_DIR, '10_siniestros.png') });

    // 11: Configuración
    console.log('11_configuracion.png');
    await clickMenu('Configuración');
    await page.screenshot({ path: path.join(OUTPUT_DIR, '11_configuracion.png') });

    console.log('COMPLETADO CON EXITO');
  } catch (err) {
    console.error(err);
  } finally {
    await browser.close();
  }
}

run();
