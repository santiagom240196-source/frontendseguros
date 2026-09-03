import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const APP_URL = 'http://localhost:5174/';
const STEPS_DIR = path.resolve('manual_assets', 'steps');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function capture() {
  console.log('Iniciando captura de pasos detallados con Puppeteer...');
  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
    defaultViewport: { width: 1440, height: 900 }
  });

  const page = await browser.newPage();

  try {
    // ----------------------------------------------------
    // ACCION 1: LOGIN
    // ----------------------------------------------------
    await page.goto(APP_URL, { waitUntil: 'networkidle2' });
    await sleep(1500);

    // Step Login 1: Perfiles
    const profileSelector = await page.$('.grid');
    if (profileSelector) {
      await profileSelector.screenshot({ path: path.join(STEPS_DIR, 'step_login_1.png') });
    }

    // Step Login 2: Botón Acceder y Formulario
    const loginForm = await page.$('form');
    if (loginForm) {
      await loginForm.screenshot({ path: path.join(STEPS_DIR, 'step_login_2.png') });
    }

    // Autenticar
    await page.evaluate(() => {
      localStorage.setItem('app_remember_session_v2', 'true');
      localStorage.setItem('app_is_authenticated_v2', 'true');
      localStorage.setItem('app_active_user_id_v2', 'santiagom2401');
    });
    await page.goto(APP_URL, { waitUntil: 'networkidle2' });

    console.log('Esperando sincronización de Hasura...');
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
      await sleep(1800);
    }

    // ----------------------------------------------------
    // ACCION 2: CLIENTES
    // ----------------------------------------------------
    console.log('Capturando pasos de Clientes...');
    await clickMenu('Clientes');

    // Step Cliente 1: Botón Nuevo Cliente y Barra de búsqueda
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({
      path: path.join(STEPS_DIR, 'step_cliente_1.png'),
      clip: { x: 260, y: 70, width: 1150, height: 120 }
    });

    // Abrir modal Nuevo Cliente
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const b = btns.find(x => x.innerText && x.innerText.includes('Nuevo Cliente'));
      if (b) b.click();
    });
    await sleep(1500);

    // Step Cliente 2: Modal de Nuevo Cliente
    const modalClient = await page.$('div[role="dialog"], .modal, div.fixed.inset-0');
    if (modalClient) {
      await modalClient.screenshot({ path: path.join(STEPS_DIR, 'step_cliente_2.png') });
    } else {
      await page.screenshot({ path: path.join(STEPS_DIR, 'step_cliente_2.png'), clip: { x: 400, y: 150, width: 640, height: 600 } });
    }

    // Cerrar modal
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const c = btns.find(x => x.innerText && (x.innerText.trim() === 'Cancelar' || x.innerText.trim() === '×' || x.innerText.trim() === '✕'));
      if (c) c.click();
    });
    await sleep(1000);

    // Step Cliente 3: Fila de cliente en directorio
    await page.screenshot({
      path: path.join(STEPS_DIR, 'step_cliente_3.png'),
      clip: { x: 260, y: 190, width: 1150, height: 180 }
    });

    // ----------------------------------------------------
    // ACCION 3: PÓLIZAS Y COMISIÓN INDIVIDUAL
    // ----------------------------------------------------
    console.log('Capturando pasos de Pólizas...');
    await clickMenu('Pólizas');

    // Step Poliza 1: Barra superior con botón Emitir
    await page.screenshot({
      path: path.join(STEPS_DIR, 'step_poliza_1.png'),
      clip: { x: 260, y: 70, width: 1150, height: 120 }
    });

    // Abrir modal Emitir Póliza
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const b = btns.find(x => x.innerText && (x.innerText.includes('Emitir Nueva Póliza') || x.innerText.includes('Nueva Póliza')));
      if (b) b.click();
    });
    await sleep(1500);

    // Step Poliza 2: Modal completo
    await page.screenshot({
      path: path.join(STEPS_DIR, 'step_poliza_2.png'),
      clip: { x: 380, y: 50, width: 680, height: 780 }
    });

    // Step Poliza 3: Foco en el campo de Comisión Individual
    await page.screenshot({
      path: path.join(STEPS_DIR, 'step_poliza_3.png'),
      clip: { x: 400, y: 520, width: 640, height: 180 }
    });

    // Cerrar modal
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const c = btns.find(x => x.innerText && (x.innerText.trim() === 'Cancelar' || x.innerText.trim() === '×' || x.innerText.trim() === '✕'));
      if (c) c.click();
    });
    await sleep(1000);

    // Step Poliza 4: Fila de póliza en la tabla con su badge de comisión
    await page.screenshot({
      path: path.join(STEPS_DIR, 'step_poliza_4.png'),
      clip: { x: 260, y: 220, width: 1150, height: 160 }
    });

    // ----------------------------------------------------
    // ACCION 4: DETALLE Y EDICION DE POLIZA
    // ----------------------------------------------------
    console.log('Capturando detalle de póliza...');
    await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('tr.hover-row'));
      if (rows.length > 0) rows[0].click();
    });
    await sleep(1500);

    // Step Detalle 1: Drawer lateral
    await page.screenshot({
      path: path.join(STEPS_DIR, 'step_poliza_detalle_1.png'),
      clip: { x: 920, y: 0, width: 520, height: 850 }
    });

    // Cerrar drawer
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const closeB = btns.find(x => x.innerText && (x.innerText.trim() === '✕' || x.innerText.trim() === '×'));
      if (closeB) closeB.click();
    });
    await sleep(1000);

    // ----------------------------------------------------
    // ACCION 5: COBROS Y RECIBOS
    // ----------------------------------------------------
    console.log('Capturando pasos de Cobros...');
    await clickMenu('Cobros');

    // Step Cobro 1: Botón Registrar Cobro y tabla
    await page.screenshot({
      path: path.join(STEPS_DIR, 'step_cobro_1.png'),
      clip: { x: 260, y: 70, width: 1150, height: 120 }
    });

    // Abrir modal Registrar Cobro
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const b = btns.find(x => x.innerText && x.innerText.includes('Registrar Cobro'));
      if (b) b.click();
    });
    await sleep(1500);

    // Step Cobro 2: Modal de cobro
    await page.screenshot({
      path: path.join(STEPS_DIR, 'step_cobro_2.png'),
      clip: { x: 420, y: 100, width: 600, height: 680 }
    });

    // Cerrar modal
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const c = btns.find(x => x.innerText && (x.innerText.trim() === 'Cancelar' || x.innerText.trim() === '×' || x.innerText.trim() === '✕'));
      if (c) c.click();
    });
    await sleep(1000);

    // Step Cobro 3: Fila con botón de Recibo PDF
    await page.screenshot({
      path: path.join(STEPS_DIR, 'step_cobro_3.png'),
      clip: { x: 260, y: 220, width: 1150, height: 160 }
    });

    // ----------------------------------------------------
    // ACCION 6: REPORTE DE COMISIONES
    // ----------------------------------------------------
    console.log('Capturando pasos de Comisiones...');
    await clickMenu('Comisiones');

    // Step Comision 1: Selector de período y filtros
    await page.screenshot({
      path: path.join(STEPS_DIR, 'step_comision_1.png'),
      clip: { x: 260, y: 70, width: 1150, height: 130 }
    });

    // Step Comision 2: Tabla de comisiones por aseguradora
    await page.screenshot({
      path: path.join(STEPS_DIR, 'step_comision_2.png'),
      clip: { x: 260, y: 220, width: 1150, height: 260 }
    });

    // Step Comision 3: Botones de Exportar Excel / PDF
    await page.screenshot({
      path: path.join(STEPS_DIR, 'step_comision_3.png'),
      clip: { x: 950, y: 70, width: 460, height: 70 }
    });

    // ----------------------------------------------------
    // ACCION 7: COMPAÑÍAS
    // ----------------------------------------------------
    console.log('Capturando pasos de Compañías...');
    await clickMenu('Compañías');

    // Step Compañía 1: Tarjeta de aseguradora
    await page.screenshot({
      path: path.join(STEPS_DIR, 'step_compania_1.png'),
      clip: { x: 260, y: 150, width: 550, height: 400 }
    });

    // ----------------------------------------------------
    // ACCION 8: SINIESTROS
    // ----------------------------------------------------
    console.log('Capturando pasos de Siniestros...');
    await clickMenu('Siniestros');

    // Step Siniestro 1: Botón Reportar Siniestro y filtros
    await page.screenshot({
      path: path.join(STEPS_DIR, 'step_siniestro_1.png'),
      clip: { x: 260, y: 70, width: 1150, height: 130 }
    });

    // Abrir modal Siniestro
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const b = btns.find(x => x.innerText && x.innerText.includes('Reportar Siniestro'));
      if (b) b.click();
    });
    await sleep(1500);

    // Step Siniestro 2: Modal de reporte
    await page.screenshot({
      path: path.join(STEPS_DIR, 'step_siniestro_2.png'),
      clip: { x: 400, y: 100, width: 640, height: 680 }
    });

    // Cerrar modal
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const c = btns.find(x => x.innerText && (x.innerText.trim() === 'Cancelar' || x.innerText.trim() === '×' || x.innerText.trim() === '✕'));
      if (c) c.click();
    });
    await sleep(1000);

    // ----------------------------------------------------
    // ACCION 9: CONFIGURACIÓN Y RESPALDOS
    // ----------------------------------------------------
    console.log('Capturando pasos de Configuración...');
    await clickMenu('Configuración');

    // Step Respaldo 1: Sección Copia de Seguridad
    await page.screenshot({
      path: path.join(STEPS_DIR, 'step_respaldo_1.png'),
      clip: { x: 260, y: 460, width: 1150, height: 260 }
    });

    console.log('TODOS LOS PASOS CAPTURADOS CON EXITO!');
  } catch (err) {
    console.error('Error durante la captura:', err);
  } finally {
    await browser.close();
  }
}

capture();
