import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const ASSETS_DIR = path.resolve('manual_assets');

const sampleReceiptHtml = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
      background: #ffffff;
      margin: 0;
      padding: 30px;
      color: #0f172a;
    }
    .receipt-container {
      width: 650px;
      margin: 0 auto;
      border: 2px solid #1e3a8a;
      border-radius: 12px;
      padding: 24px;
      box-shadow: 0 4px 15px rgba(0,0,0,0.06);
    }
    .top-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 15px;
      margin-bottom: 15px;
    }
    .brand-title {
      font-size: 18px;
      font-weight: 900;
      color: #1e3a8a;
      margin: 0 0 2px 0;
    }
    .brand-subtitle {
      font-size: 11px;
      color: #64748b;
      margin: 0;
      line-height: 1.3;
    }
    .receipt-badge {
      text-align: right;
    }
    .rec-num {
      background: #1e3a8a;
      color: #ffffff;
      padding: 4px 12px;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 800;
      letter-spacing: 0.05em;
      display: inline-block;
      margin-bottom: 4px;
    }
    .rec-date {
      font-size: 11px;
      color: #64748b;
    }
    .meta-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-bottom: 15px;
      background: #f8fafc;
      padding: 12px;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
    }
    .meta-item {
      font-size: 11.5px;
    }
    .meta-label {
      color: #64748b;
      font-weight: 600;
      display: block;
      font-size: 10px;
      text-transform: uppercase;
    }
    .meta-val {
      font-weight: 800;
      color: #0f172a;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 15px;
      font-size: 11.5px;
    }
    th {
      background: #1e3a8a;
      color: #ffffff;
      text-align: left;
      padding: 7px 10px;
      font-size: 10.5px;
      text-transform: uppercase;
    }
    td {
      padding: 8px 10px;
      border-bottom: 1px solid #e2e8f0;
    }
    .total-box {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 15px;
    }
    .total-card {
      background: #f0fdf4;
      border: 1.5px solid #16a34a;
      border-radius: 8px;
      padding: 10px 18px;
      text-align: right;
    }
    .total-label {
      font-size: 10px;
      font-weight: 700;
      color: #166534;
      text-transform: uppercase;
    }
    .total-amount {
      font-size: 20px;
      font-weight: 900;
      color: #14532d;
    }
    .signatures {
      display: flex;
      justify-content: space-between;
      margin-top: 25px;
      padding-top: 15px;
      border-top: 1px dashed #cbd5e1;
    }
    .sig-box {
      text-align: center;
      width: 45%;
    }
    .sig-line {
      border-top: 1px solid #0f172a;
      margin-top: 30px;
      padding-top: 4px;
      font-size: 10.5px;
      font-weight: 700;
      color: #334155;
    }
    .stamp-badge {
      display: inline-block;
      border: 2px solid #16a34a;
      color: #16a34a;
      padding: 2px 10px;
      border-radius: 6px;
      font-weight: 900;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      transform: rotate(-5deg);
      margin-top: 5px;
    }
  </style>
</head>
<body>
  <div class="receipt-container">
    <div class="top-header">
      <div>
        <div class="brand-title">SANTIAGO MORALES & ASOCIADOS, S.R.L.</div>
        <div class="brand-subtitle">
          Corredores y Asesores de Seguros · RNC: 1-31-98765-4<br>
          Av. 27 de Febrero No. 208, Santo Domingo, D.N. · Tel: (809) 567-8900
        </div>
      </div>
      <div class="receipt-badge">
        <div class="rec-num">RECIBO NO. REC-2026-00482</div>
        <div class="rec-date">Fecha: 03/09/2026 · 10:45 AM</div>
      </div>
    </div>

    <div class="meta-grid">
      <div class="meta-item">
        <span class="meta-label">Asegurado / Pagador:</span>
        <span class="meta-val">INGENIERÍA & CONSTRUCCIONES MORALES, S.A.S.</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">RNC / Cédula:</span>
        <span class="meta-val">1-30-55443-2</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">Póliza No. / Ramo:</span>
        <span class="meta-val">1-2-170-0007336 · Vehículos de Motor</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">Compañía Aseguradora:</span>
        <span class="meta-val">La Colonial de Seguros, S.A.</span>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>Descripción del Concepto</th>
          <th>Vigencia</th>
          <th style="text-align: right;">Importe Pagado</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>
            <strong>Pago de Cuota Inicial de Prima Anual</strong><br>
            <span style="font-size: 10px; color: #64748b;">Cobertura Todo Riesgo · Camión Freightliner 2023 · Ficha 04</span>
          </td>
          <td>03/09/2026 al 03/09/2027</td>
          <td style="text-align: right; font-weight: 800;">RD$ 45,000.00</td>
        </tr>
      </tbody>
    </table>

    <div class="total-box">
      <div class="total-card">
        <div class="total-label">Total Recibido Conforme</div>
        <div class="total-amount">RD$ 45,000.00</div>
        <div style="font-size: 10px; color: #15803d; font-weight: 600;">CUARENTA Y CINCO MIL PESOS DOMINICANOS CON 00/100</div>
      </div>
    </div>

    <div style="font-size: 10.5px; color: #475569; background: #f8fafc; padding: 6px 10px; border-radius: 6px; border: 1px solid #e2e8f0;">
      <strong>Forma de Pago:</strong> Transferencia Bancaria Directa (Banco BHD) · Ref: 99482103 · Cobro aplicado a cartera Santiago Morales y Asoc.
    </div>

    <div class="signatures">
      <div class="sig-box">
        <div class="stamp-badge">PAGADO</div>
        <div class="sig-line">Recibido por: Santiago Morales y Asoc., S.R.L.</div>
      </div>
      <div class="sig-box">
        <div style="height: 25px;"></div>
        <div class="sig-line">Firma del Cliente / Asegurado</div>
      </div>
    </div>
  </div>
</body>
</html>`;

const sampleLetterHtml = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
      background: #ffffff;
      margin: 0;
      padding: 30px;
      color: #0f172a;
    }
    .letter-container {
      width: 650px;
      margin: 0 auto;
      border: 1.5px solid #cbd5e1;
      border-radius: 10px;
      padding: 30px 36px;
      box-shadow: 0 4px 15px rgba(0,0,0,0.06);
    }
    .letter-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px solid #1e3a8a;
      padding-bottom: 12px;
      margin-bottom: 20px;
    }
    .brand-title {
      font-size: 16px;
      font-weight: 900;
      color: #1e3a8a;
    }
    .brand-sub {
      font-size: 10px;
      color: #64748b;
    }
    .date-line {
      text-align: right;
      font-size: 11px;
      color: #475569;
      margin-bottom: 18px;
    }
    .recipient-box {
      font-size: 12px;
      line-height: 1.4;
      margin-bottom: 16px;
    }
    .subject-line {
      font-size: 12.5px;
      font-weight: 800;
      color: #1e3a8a;
      background: #eff6ff;
      padding: 6px 12px;
      border-left: 3px solid #1e3a8a;
      margin-bottom: 16px;
    }
    .body-text {
      font-size: 11.5px;
      line-height: 1.55;
      color: #334155;
      margin-bottom: 14px;
      text-align: justify;
    }
    .specs-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 10px 14px;
      margin-bottom: 16px;
      font-size: 11px;
    }
    .specs-card ul {
      margin: 4px 0 0 16px;
      padding: 0;
    }
    .closing-box {
      margin-top: 25px;
      font-size: 11.5px;
    }
    .sig-block {
      margin-top: 35px;
      font-size: 11px;
    }
    .sig-name {
      font-weight: 800;
      color: #0f172a;
    }
    .sig-title {
      color: #64748b;
    }
  </style>
</head>
<body>
  <div class="letter-container">
    <div class="letter-header">
      <div>
        <div class="brand-title">SANTIAGO MORALES & ASOCIADOS, S.R.L.</div>
        <div class="brand-sub">Corredores y Asesores de Seguros · Registro Superintendencia de Seguros</div>
      </div>
      <div style="font-size: 10.5px; font-weight: 800; color: #1e3a8a; text-align: right;">
        SOLICITUD NO. SOL-2026-089
      </div>
    </div>

    <div class="date-line">Santo Domingo, Distrito Nacional · 03 de Septiembre de 2026</div>

    <div class="recipient-box">
      <strong>Señores:</strong><br>
      <strong>LA COLONIAL DE SEGUROS, S.A.</strong><br>
      Atención: Departamento de Suscripción de Ramos Generales<br>
      Santo Domingo, R.D.
    </div>

    <div class="subject-line">
      ASUNTO: Solicitud de Inclusión de Unidad y Emisión de Endoso
    </div>

    <div class="body-text">
      Estimados señores:<br><br>
      Por medio de la presente, en nuestra calidad de Asesores y Corredores de Seguros autorizados del cliente <strong>INGENIERÍA & CONSTRUCCIONES MORALES, S.A.S.</strong> (RNC 1-30-55443-2), tenemos a bien solicitar formalmente la emisión de un endoso de inclusión bajo la póliza matriz descrita a continuación:
    </div>

    <div class="specs-card">
      <strong>Detalles de la Unidad para Asegurar:</strong>
      <ul>
        <li><strong>Póliza Referencia:</strong> 1-2-170-0007336 (Flotilla de Vehículos Comerciales)</li>
        <li><strong>Vehículo:</strong> Camioneta Toyota Hilux Doble Cabina 4x4, Año 2024</li>
        <li><strong>Chasis:</strong> MROER22G90145892 · <strong>Placa:</strong> L-419820</li>
        <li><strong>Valor Asegurado Solicitado:</strong> US$ 42,000.00 (Dólares Americanos)</li>
        <li><strong>Cobertura Solicitada:</strong> Todo Riesgo Comercial + Asistencia Vial Ilimitada</li>
      </ul>
    </div>

    <div class="body-text">
      Agradecemos de antemano la pronta tramitación de esta solicitud y el envío del endoso correspondiente para el debido registro de cobro y entrega al cliente.
    </div>

    <div class="closing-box">
      Atentamente,
    </div>

    <div class="sig-block">
      <div style="height: 35px; border-bottom: 1px solid #94a3b8; width: 220px; margin-bottom: 4px;"></div>
      <div class="sig-name">Santiago Alberto Morales Rodriguez</div>
      <div class="sig-title">Santiago Morales y Asociados, S.R.L. · Código de Agente: 8055</div>
    </div>
  </div>
</body>
</html>`;

async function renderSamples() {
  console.log('Iniciando renderizado de documentos de muestra...');
  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1000, height: 1000, deviceScaleFactor: 2 });

  // 1. Recibo Oficial
  await page.setContent(sampleReceiptHtml, { waitUntil: 'networkidle0' });
  const receiptEl = await page.$('.receipt-container');
  if (receiptEl) {
    await receiptEl.screenshot({ path: path.join(ASSETS_DIR, 'doc_recibo_oficial.png') });
    console.log('Capturado: doc_recibo_oficial.png');
  }

  // 2. Carta Formal
  const page2 = await browser.newPage();
  await page2.setViewport({ width: 1000, height: 1000, deviceScaleFactor: 2 });
  await page2.setContent(sampleLetterHtml, { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 600));
  const letterEl = await page2.$('.letter-container');
  if (letterEl) {
    await letterEl.screenshot({ path: path.join(ASSETS_DIR, 'doc_carta_formal.png') });
    console.log('Capturado: doc_carta_formal.png');
  }

  await browser.close();
  console.log('Todos los documentos de muestra generados con exito!');
}

renderSamples();
