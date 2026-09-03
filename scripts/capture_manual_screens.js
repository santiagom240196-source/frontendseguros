import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const APP_URL = 'http://localhost:5174/';
const OUTPUT_DIR = path.resolve('manual_assets');

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function run() {
  console.log('Iniciando navegador Edge...');
  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
    defaultViewport: { width: 1440, height: 900 }
  });

  const page = await browser.newPage();

  try {
    console.log('Cargando portal de inicio...');
    await page.goto(APP_URL, { waitUntil: 'networkidle2', timeout: 30000 });
    await sleep(2000);

    // 0. Capturar Login
    console.log('Capturando 00_login.png...');
    await page.screenshot({ path: path.join(OUTPUT_DIR, '00_login.png') });

    // Iniciar Sesion (Hacer click en la cuenta de acceso rapido o submit)
    console.log('Iniciando sesion...');
    await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('div'));
      const santiagoCard = cards.find(c => c.innerText && c.innerText.includes('Santiago Alberto'));
      if (santiagoCard) santiagoCard.click();
      
      const submitBtn = document.querySelector('button[type="submit"]');
      if (submitBtn) submitBtn.click();
    });

    // Esperar a que cargue la aplicacion principal
    console.log('Esperando carga del sistema y Hasura...');
    await sleep(4000);

    // Helper para hacer click en el menu lateral
    async function clickMenu(label) {
      await page.evaluate((targetLabel) => {
        const buttons = Array.from(document.querySelectorAll('nav button'));
        const btn = buttons.find(b => b.innerText.includes(targetLabel));
        if (btn) btn.click();
      }, label);
      await sleep(1800);
    }

    // 1. Dashboard
    console.log('Capturando 01_dashboard.png...');
    await clickMenu('Inicio');
    await page.screenshot({ path: path.join(OUTPUT_DIR, '01_dashboard.png') });

    // 2. Clientes
    console.log('Capturando 02_clientes.png...');
    await clickMenu('Clientes');
    await page.screenshot({ path: path.join(OUTPUT_DIR, '02_clientes.png') });

    // 3. Polizas
    console.log('Capturando 03_polizas.png...');
    await clickMenu('Pólizas');
    await page.screenshot({ path: path.join(OUTPUT_DIR, '03_polizas.png') });

    // 4. Modal Nueva Poliza
    console.log('Capturando 04_nueva_poliza.png...');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find(b => b.innerText.includes('Emitir Nueva Póliza') || b.innerText.includes('Nueva Póliza'));
      if (btn) btn.click();
    });
    await sleep(1500);
    await page.screenshot({ path: path.join(OUTPUT_DIR, '04_nueva_poliza.png') });

    // Cerrar modal
    await page.evaluate(() => {
      const closeButtons = Array.from(document.querySelectorAll('button'));
      const cancelBtn = closeButtons.find(b => b.innerText.trim() === 'Cancelar' || b.innerText.trim() === '×' || b.innerText.trim() === 'X');
      if (cancelBtn) cancelBtn.click();
    });
    await sleep(1000);

    // 5. Detalle de Poliza
    console.log('Capturando 05_poliza_detalle.png...');
    await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('tr.hover-row'));
      if (rows.length > 0) rows[0].click();
    });
    await sleep(1500);
    await page.screenshot({ path: path.join(OUTPUT_DIR, '05_poliza_detalle.png') });

    // Cerrar drawer
    await page.evaluate(() => {
      const closeBtn = document.querySelector('button[title="Cerrar"]');
      if (closeBtn) closeBtn.click();
      else {
        const btns = Array.from(document.querySelectorAll('button'));
        const xBtn = btns.find(b => b.innerText.trim() === '✕' || b.innerText.trim() === '×');
        if (xBtn) xBtn.click();
      }
    });
    await sleep(1000);

    // 6. Cobros
    console.log('Capturando 06_cobros.png...');
    await clickMenu('Cobros');
    await page.screenshot({ path: path.join(OUTPUT_DIR, '06_cobros.png') });

    // 7. Comisiones
    console.log('Capturando 07_comisiones.png...');
    await clickMenu('Comisiones');
    await page.screenshot({ path: path.join(OUTPUT_DIR, '07_comisiones.png') });

    // 8. Compañias
    console.log('Capturando 08_companias.png...');
    await clickMenu('Compañías');
    await page.screenshot({ path: path.join(OUTPUT_DIR, '08_companias.png') });

    // 9. Solicitudes
    console.log('Capturando 09_solicitudes.png...');
    await clickMenu('S