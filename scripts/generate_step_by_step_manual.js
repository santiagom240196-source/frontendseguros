import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer-core';

const ASSETS_DIR = path.resolve('manual_assets');
const STEPS_DIR = path.resolve('manual_assets', 'steps');
const HTML_OUT = path.resolve('Manual_de_Usuario_Santiago_Morales.html');
const PDF_OUT = path.resolve('Manual_de_Usuario_Paso_a_Paso.pdf');
const PDF_ALT = path.resolve('Manual_de_Usuario_Santiago_Morales.pdf');
const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

function imgB64(folder, filename) {
  const f = path.join(folder, filename);
  if (!fs.existsSync(f)) return '';
  return 'data:image/png;base64,' + fs.readFileSync(f).toString('base64');
}

const imgs = {
  // Login
  login1: imgB64(STEPS_DIR, 'step_login_1.png'),
  login2: imgB64(STEPS_DIR, 'step_login_2.png'),
  loginFull: imgB64(ASSETS_DIR, '00_login.png'),

  // Dashboard
  dashboard: imgB64(ASSETS_DIR, '01_dashboard.png'),

  // Clientes
  cli1: imgB64(STEPS_DIR, 'step_cliente_1.png'),
  cli2: imgB64(STEPS_DIR, 'step_cliente_2.png'),
  cli3: imgB64(STEPS_DIR, 'step_cliente_3.png'),

  // Pólizas
  pol1: imgB64(STEPS_DIR, 'step_poliza_1.png'),
  pol2: imgB64(STEPS_DIR, 'step_poliza_2.png'),
  pol3: imgB64(STEPS_DIR, 'step_poliza_3.png'),
  pol4: imgB64(STEPS_DIR, 'step_poliza_4.png'),
  polDetalle: imgB64(STEPS_DIR, 'step_poliza_detalle_1.png'),

  // Cobros
  cob1: imgB64(STEPS_DIR, 'step_cobro_1.png'),
  cob2: imgB64(STEPS_DIR, 'step_cobro_2.png'),
  cob3: imgB64(STEPS_DIR, 'step_cobro_3.png'),

  // Comisiones
  com1: imgB64(STEPS_DIR, 'step_comision_1.png'),
  com2: imgB64(STEPS_DIR, 'step_comision_2.png'),
  comFull: imgB64(ASSETS_DIR, '07_comisiones.png'),

  // Compañías
  comp1: imgB64(STEPS_DIR, 'step_compania_1.png'),
  compFull: imgB64(ASSETS_DIR, '08_companias.png'),

  // Solicitudes
  sol1: imgB64(STEPS_DIR, 'step_solicitud_1.png'),
  sol2: imgB64(STEPS_DIR, 'step_solicitud_2.png'),

  // Siniestros
  sin1: imgB64(STEPS_DIR, 'step_siniestro_1.png'),
  sin2: imgB64(STEPS_DIR, 'step_siniestro_2.png'),

  // Respaldo
  resp1: imgB64(STEPS_DIR, 'step_respaldo_1.png')
};

const fullHtml = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Manual e Instructivo de Usuario Paso a Paso - Santiago Morales y Asociados</title>
  <style>
    @page {
      size: letter;
      margin: 10mm 12mm 10mm 12mm;
    }
    *, *:before, *:after { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #1e293b;
      line-height: 1.4;
      font-size: 12.5px;
      margin: 0;
      padding: 0;
      background-color: #ffffff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .page {
      page-break-after: always;
      position: relative;
      height: 254mm;
      max-height: 254mm;
      overflow: hidden;
      padding-bottom: 22px;
    }
    .page:last-child { page-break-after: auto; }
    .header-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px solid #1e3a8a;
      padding-bottom: 4px;
      margin-bottom: 8px;
    }
    .header-title {
      font-size: 10.5px;
      font-weight: 800;
      color: #1e3a8a;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }
    .header-subtitle {
      font-size: 9.5px;
      color: #64748b;
      font-weight: 600;
    }
    .footer-bar {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-top: 1px solid #e2e8f0;
      padding-top: 4px;
      font-size: 9px;
      color: #64748b;
    }
    .cover-container {
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      height: 240mm;
      text-align: center;
      padding: 20px 20px;
    }
    .cover-badge {
      background: linear-gradient(135deg, #1e3a8a 0%, #0f172a 100%);
      color: #ffffff;
      padding: 6px 18px;
      border-radius: 999px;
      font-size: 11.5px;
      font-weight: 800;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      margin-bottom: 18px;
      display: inline-block;
    }
    .cover-title {
      font-size: 29px;
      font-weight: 900;
      color: #0f172a;
      line-height: 1.15;
      margin: 0 0 10px 0;
    }
    .cover-title span { color: #b58c5c; }
    .cover-subtitle {
      font-size: 15px;
      color: #475569;
      max-width: 620px;
      margin: 0 auto 18px auto;
      font-weight: 500;
    }
    .cover-card {
      background: #f8fafc;
      border: 1.5px solid #e2e8f0;
      border-radius: 12px;
      padding: 16px 24px;
      max-width: 530px;
      width: 100%;
      text-align: left;
      margin-bottom: 20px;
    }
    .cover-meta-item {
      display: flex;
      justify-content: space-between;
      padding: 6px 0;
      border-bottom: 1px dashed #cbd5e1;
      font-size: 12px;
    }
    .cover-meta-item:last-child { border-bottom: none; }
    .cover-meta-label { color: #64748b; font-weight: 600; }
    .cover-meta-val { color: #0f172a; font-weight: 800; }
    h1 {
      font-size: 17.5px;
      font-weight: 900;
      color: #0f172a;
      margin: 0 0 4px 0;
    }
    h2 {
      font-size: 13px;
      font-weight: 800;
      color: #1e3a8a;
      margin: 6px 0 4px 0;
    }
    p { margin: 0 0 6px 0; color: #334155; }
    
    /* Action Step Box */
    .step-card {
      background: #f8fafc;
      border: 1.5px solid #e2e8f0;
      border-radius: 8px;
      padding: 8px 10px;
      margin-bottom: 8px;
    }
    .step-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 5px;
    }
    .step-number {
      background: #1e3a8a;
      color: #ffffff;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 10.5px;
      font-weight: 900;
      flex-shrink: 0;
    }
    .step-title {
      font-weight: 800;
      color: #0f172a;
      font-size: 12.5px;
    }
    .step-desc {
      font-size: 11.8px;
      color: #334155;
      margin-bottom: 5px;
    }
    .step-img-box {
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      overflow: hidden;
      background: #ffffff;
      text-align: center;
    }
    .step-img {
      width: 100%;
      max-height: 140px;
      object-fit: contain;
      display: block;
      margin: 0 auto;
      background: #f1f5f9;
    }
    .callout {
      border-radius: 6px;
      padding: 6px 10px;
      margin: 6px 0;
      font-size: 11.5px;
      line-height: 1.35;
    }
    .callout-tip {
      background-color: #f0fdf4;
      border-left: 4px solid #16a34a;
      color: #14532d;
    }
    .callout-alert {
      background-color: #fffbeb;
      border-left: 4px solid #d97706;
      color: #78350f;
    }
    .callout-title { font-weight: 800; margin-bottom: 1px; display: block; }
  </style>
</head>
<body>

  <!-- PORTADA -->
  <div class="page">
    <div class="cover-container">
      <div class="cover-badge">Instructivo Visual Paso a Paso con Imágenes</div>
      <h1 class="cover-title">Santiago Morales & Asociados<br><span>Manual Práctico de Operaciones</span></h1>
      <p class="cover-subtitle">
        Guía ilustrada paso por paso: cómo realizar cada acción del sistema con capturas visuales de cada botón, formulario, emisión de pólizas, cobros y cálculo de comisiones.
      </p>

      <div class="cover-card">
        <div class="cover-meta-item">
          <span class="cover-meta-label">Sistema:</span>
          <span class="cover-meta-val">Portal Web de Gestión de Seguros</span>
        </div>
        <div class="cover-meta-item">
          <span class="cover-meta-label">Dirección Local:</span>
          <span class="cover-meta-val">http://localhost:5174</span>
        </div>
        <div class="cover-meta-item">
          <span class="cover-meta-label">Empresa:</span>
          <span class="cover-meta-val">Santiago Morales y Asociados, S.R.L.</span>
        </div>
        <div class="cover-meta-item">
          <span class="cover-meta-label">Formato:</span>
          <span class="cover-meta-val">Paso a paso ilustrado con imágenes por acción</span>
        </div>
        <div class="cover-meta-item">
          <span class="cover-meta-label">Edición:</span>
          <span class="cover-meta-val">Versión 2026 (Comisión Individual por Póliza)</span>
        </div>
      </div>

      <div style="font-size: 13px; color: #64748b; max-width: 530px; line-height: 1.5;">
        <em>"Este instructivo muestra exactamente qué pantalla verás, en qué botón debes pulsar y qué información escribir para cada tarea diaria de la oficina."</em>
      </div>
    </div>
  </div>

  <!-- PÁGINA 1: ACCIÓN INICIAR SESIÓN -->
  <div class="page">
    <div class="header-bar">
      <span class="header-title">Acción 1: Inicio de Sesión y Acceso Rápido</span>
      <span class="header-subtitle">Santiago Morales & Asociados</span>
    </div>

    <h1>🔐 Cómo Iniciar Sesión en el Sistema</h1>
    <p>Para ingresar al sistema desde cualquier computadora de la oficina, sigue estos sencillos pasos visuales:</p>

    <!-- PASO 1 -->
    <div class="step-card">
      <div class="step-header">
        <span class="step-number">1</span>
        <span class="step-title">Paso 1: Selecciona tu Perfil de Acceso con un solo clic</span>
      </div>
      <div class="step-desc">
        Abre el navegador en <code>http://localhost:5174</code>. En la sección superior <strong>"Acceso Rápido"</strong>, haz clic directamente sobre tu tarjeta de usuario:
      </div>
      <div class="step-img-box">
        <img src="${imgs.login1}" class="step-img" style="max-height: 105px;" alt="Selector de perfil" />
      </div>
    </div>

    <!-- PASO 2 -->
    <div class="step-card">
      <div class="step-header">
        <span class="step-number">2</span>
        <span class="step-title">Paso 2: Activa "Recordar Sesión" y pulsa "Acceder al Sistema"</span>
      </div>
      <div class="step-desc">
        Verifica que la casilla <strong>"Recordar sesión en este equipo"</strong> esté marcada para no tener que escribir tu clave todos los días. Luego haz clic en el botón dorado:
      </div>
      <div class="step-img-box">
        <img src="${imgs.login2}" class="step-img" style="max-height: 105px;" alt="Botón acceder" />
      </div>
    </div>

    <div class="callout callout-tip">
      <span class="callout-title">💡 ¿Olvidaste tu contraseña?</span>
      Puedes pulsar sobre el perfil <strong>"Santiago Alberto (👑 Principal)"</strong> o <strong>"Usuario de Prueba (🧪 Sandbox)"</strong> para ingresar inmediatamente con un solo clic sin escribir contraseñas.
    </div>

    <div class="footer-bar">
      <span>Instructivo Paso a Paso · Sistema de Seguros</span>
      <span>Página 1</span>
    </div>
  </div>

  <!-- PÁGINA 2: ACCIÓN CLIENTES -->
  <div class="page">
    <div class="header-bar">
      <span class="header-title">Acción 2: Registro de un Nuevo Cliente</span>
      <span class="header-subtitle">Santiago Morales & Asociados</span>
    </div>

    <h1>👥 Cómo Registrar un Cliente Nuevo</h1>
    <p>Para registrar un asegurado (persona física con Cédula o empresa con RNC):</p>

    <!-- PASO 1 -->
    <div class="step-card">
      <div class="step-header">
        <span class="step-number">1</span>
        <span class="step-title">Paso 1: Pulsa el botón "+ Nuevo Cliente"</span>
      </div>
      <div class="step-desc">
        Ve al menú <strong>Clientes</strong> en la barra lateral izquierda y haz clic en el botón superior derecho <strong>"+ Nuevo Cliente"</strong>:
      </div>
      <div class="step-img-box">
        <img src="${imgs.cli1}" class="step-img" style="max-height: 80px;" alt="Botón nuevo cliente" />
      </div>
    </div>

    <!-- PASO 2 -->
    <div class="step-card">
      <div class="step-header">
        <span class="step-number">2</span>
        <span class="step-title">Paso 2: Completa los datos en el formulario</span>
      </div>
      <div class="step-desc">
        Elige si es <strong>Persona Física</strong> (Cédula) o <strong>Empresa</strong> (RNC), escribe su Nombre, Teléfono, Celular y Correo. Luego presiona <strong>"Guardar Cliente"</strong>:
      </div>
      <div class="step-img-box">
        <img src="${imgs.cli2}" class="step-img" style="max-height: 110px;" alt="Formulario cliente" />
      </div>
    </div>

    <!-- PASO 3 -->
    <div class="step-card">
      <div class="step-header">
        <span class="step-number">3</span>
        <span class="step-title">Paso 3: Verifica el cliente en el directorio</span>
      </div>
      <div class="step-desc">
        El cliente aparecerá de inmediato en el directorio con botones para llamarlo, enviarle correo o emitirle pólizas:
      </div>
      <div class="step-img-box">
        <img src="${imgs.cli3}" class="step-img" style="max-height: 75px;" alt="Cliente en lista" />
      </div>
    </div>

    <div class="footer-bar">
      <span>Instructivo Paso a Paso · Sistema de Seguros</span>
      <span>Página 2</span>
    </div>
  </div>

  <!-- PÁGINA 3: ACCIÓN EMITIR PÓLIZA Y COMISIÓN PARTE 1 -->
  <div class="page">
    <div class="header-bar">
      <span class="header-title">Acción 3: Emisión de Póliza y Fijación de Comisión</span>
      <span class="header-subtitle">Santiago Morales & Asociados</span>
    </div>

    <h1>✍️ Cómo Emitir una Póliza y Fijar su Comisión (Parte 1)</h1>
    <p>Ahora cada póliza tiene su propio porcentaje de comisión configurado individualmente:</p>

    <!-- PASO 1 -->
    <div class="step-card">
      <div class="step-header">
        <span class="step-number">1</span>
        <span class="step-title">Paso 1: Pulsa en "+ Emitir Nueva Póliza"</span>
      </div>
      <div class="step-desc">
        En el menú <strong>Pólizas</strong>, presiona el botón azul destacado <strong>"+ Emitir Nueva Póliza"</strong> en la parte superior derecha:
      </div>
      <div class="step-img-box">
        <img src="${imgs.pol1}" class="step-img" style="max-height: 80px;" alt="Botón emitir póliza" />
      </div>
    </div>

    <!-- PASO 2 -->
    <div class="step-card">
      <div class="step-header">
        <span class="step-number">2</span>
        <span class="step-title">Paso 2: Escribe el No. de Póliza, Cliente, Aseguradora y Prima</span>
      </div>
      <div class="step-desc">
        Escribe el número oficial de contrato, elige el cliente asegurado, la compañía aseguradora (ej. La Colonial, Universal), el ramo y la prima anual:
      </div>
      <div class="step-img-box">
        <img src="${imgs.pol2}" class="step-img" style="max-height: 135px;" alt="Formulario póliza" />
      </div>
    </div>

    <div class="callout callout-tip">
      <span class="callout-title">✨ Regla de Oro:</span>
      Si el cliente aún no está registrado, no tienes que salirte; pulsa el botón <strong>"+ Nuevo"</strong> al lado del campo Cliente para crearlo al instante.
    </div>

    <div class="footer-bar">
      <span>Instructivo Paso a Paso · Sistema de Seguros</span>
      <span>Página 3</span>
    </div>
  </div>

  <!-- PÁGINA 4: ACCIÓN EMITIR PÓLIZA Y COMISIÓN PARTE 2 -->
  <div class="page">
    <div class="header-bar">
      <span class="header-title">Acción 3: Emisión de Póliza y Fijación de Comisión</span>
      <span class="header-subtitle">Santiago Morales & Asociados</span>
    </div>

    <h1>✍️ Cómo Emitir una Póliza y Fijar su Comisión (Parte 2)</h1>
    <p>Configuración del porcentaje de ganancia y verificación en el sistema:</p>

    <!-- PASO 3 -->
    <div class="step-card">
      <div class="step-header">
        <span class="step-number">3</span>
        <span class="step-title">Paso 3: Escribe el % de Comisión Individual y mira el cálculo en vivo</span>
      </div>
      <div class="step-desc">
        En el campo <strong>"% Comisión Individual *"</strong> escribe el porcentaje pactado (ej. 15.0, 18.0 o 20.0). El sistema te muestra abajo inmediatamente la <strong>"Comisión Estimada"</strong> en pesos o dólares:
      </div>
      <div class="step-img-box">
        <img src="${imgs.pol3}" class="step-img" style="max-height: 100px;" alt="Campo de comisión" />
      </div>
    </div>

    <!-- PASO 4 -->
    <div class="step-card">
      <div class="step-header">
        <span class="step-number">4</span>
        <span class="step-title">Paso 4: Guarda y confirma el distintivo en la tabla</span>
      </div>
      <div class="step-desc">
        Haz clic en <strong>"Emitir Póliza"</strong>. En el listado general verás tu póliza emitida con su prima y su insignia de comisión individual (ej. <strong>Com: 15%</strong>):
      </div>
      <div class="step-img-box">
        <img src="${imgs.pol4}" class="step-img" style="max-height: 80px;" alt="Badge comisión tabla" />
      </div>
    </div>

    <div class="callout callout-tip">
      <span class="callout-title">💰 ¿Por qué es mejor este sistema?</span>
      Porque ahora tus reportes de ingresos coincidirán al centavo con las liquidaciones de las aseguradoras, sin importar qué producto o cliente sea.
    </div>

    <div class="footer-bar">
      <span>Instructivo Paso a Paso · Sistema de Seguros</span>
      <span>Página 4</span>
    </div>
  </div>

  <!-- PÁGINA 5: ACCIÓN EDITAR PÓLIZA Y CONSULTAR DETALLES -->
  <div class="page">
    <div class="header-bar">
      <span class="header-title">Acción 4: Consultar y Modificar una Póliza Existente</span>
      <span class="header-subtitle">Santiago Morales & Asociados</span>
    </div>

    <h1>🔎 Consultar Expediente y Modificar una Póliza</h1>
    <p>Si una póliza cambió de prima, vigencia o porcentaje de comisión, puedes corregirla en 3 pasos:</p>

    <!-- PASO 1 -->
    <div class="step-card">
      <div class="step-header">
        <span class="step-number">1</span>
        <span class="step-title">Paso 1: Haz clic sobre la fila de la póliza en la tabla</span>
      </div>
      <div class="step-desc">
        En el menú <strong>Pólizas</strong>, pulsa sobre el nombre del cliente o número de póliza para abrir el expediente completo.
      </div>
    </div>

    <!-- PASO 2 -->
    <div class="step-card">
      <div class="step-header">
        <span class="step-number">2</span>
        <span class="step-title">Paso 2: Revisa los datos en el panel lateral (Drawer)</span>
      </div>
      <div class="step-desc">
        Se abrirá el panel lateral con la prima, el porcentaje de comisión, la comisión estimada y las fechas de vigencia:
      </div>
      <div class="step-img-box">
        <img src="${imgs.polDetalle}" class="step-img" style="max-height: 140px;" alt="Drawer detalle póliza" />
      </div>
    </div>

    <!-- PASO 3 -->
    <div class="step-card">
      <div class="step-header">
        <span class="step-number">3</span>
        <span class="step-title">Paso 3: Pulsa "Editar Póliza" y guarda los cambios</span>
      </div>
      <div class="step-desc">
        Haz clic en el botón <strong>"Editar Póliza"</strong> en la parte superior del panel lateral, cambia el porcentaje o la prima y presiona <strong>"Guardar Cambios"</strong>.
      </div>
    </div>

    <div class="footer-bar">
      <span>Instructivo Paso a Paso · Sistema de Seguros</span>
      <span>Página 5</span>
    </div>
  </div>

  <!-- PÁGINA 6: ACCIÓN COBROS Y RECIBOS -->
  <div class="page">
    <div class="header-bar">
      <span class="header-title">Acción 5: Registrar Cobro y Descargar Recibo Oficial</span>
      <span class="header-subtitle">Santiago Morales & Asociados</span>
    </div>

    <h1>💰 Registrar un Pago y Emitir el Recibo en PDF</h1>
    <p>Para asentar el pago de una prima y entregarle el recibo formal al cliente:</p>

    <!-- PASO 1 -->
    <div class="step-card">
      <div class="step-header">
        <span class="step-number">1</span>
        <span class="step-title">Paso 1: Pulsa en "+ Registrar Cobro"</span>
      </div>
      <div class="step-desc">
        Entra al menú <strong>Cobros</strong> y haz clic en el botón superior derecho <strong>"+ Registrar Cobro"</strong>:
      </div>
      <div class="step-img-box">
        <img src="${imgs.cob1}" class="step-img" style="max-height: 75px;" alt="Botón registrar cobro" />
      </div>
    </div>

    <!-- PASO 2 -->
    <div class="step-card">
      <div class="step-header">
        <span class="step-number">2</span>
        <span class="step-title">Paso 2: Completa el monto, cliente y póliza</span>
      </div>
      <div class="step-desc">
        Selecciona la póliza que se está pagando, el monto cobrado (RD$ o US$), la fecha de pago y marca el estado como <strong>"Pagado"</strong>:
      </div>
      <div class="step-img-box">
        <img src="${imgs.cob2}" class="step-img" style="max-height: 110px;" alt="Modal de cobro" />
      </div>
    </div>

    <!-- PASO 3 -->
    <div class="step-card">
      <div class="step-header">
        <span class="step-number">3</span>
        <span class="step-title">Paso 3: Descarga el Recibo Oficial en PDF con 1 clic</span>
      </div>
      <div class="step-desc">
        En la tabla de cobros, haz clic en el botón con ícono de documento. Se descargará el <strong>Recibo Oficial en PDF</strong> listo para WhatsApp o imprimir:
      </div>
      <div class="step-img-box">
        <img src="${imgs.cob3}" class="step-img" style="max-height: 75px;" alt="Botón recibo" />
      </div>
    </div>

    <div class="footer-bar">
      <span>Instructivo Paso a Paso · Sistema de Seguros</span>
      <span>Página 6</span>
    </div>
  </div>

  <!-- PÁGINA 7: ACCIÓN REPORTES DE COMISIONES -->
  <div class="page">
    <div class="header-bar">
      <span class="header-title">Acción 6: Consultar y Exportar Comisiones</span>
      <span class="header-subtitle">Santiago Morales & Asociados</span>
    </div>

    <h1>📈 Cómo Consultar y Exportar el Reporte de Comisiones</h1>
    <p>Para ver cuánto dinero ha ganado la oficina por aseguradora y descargar el reporte a Excel o PDF:</p>

    <!-- PASO 1 -->
    <div class="step-card">
      <div class="step-header">
        <span class="step-number">1</span>
        <span class="step-title">Paso 1: Selecciona el período de consulta</span>
      </div>
      <div class="step-desc">
        En el menú <strong>Comisiones</strong>, elige el período deseado: <strong>"Este Mes"</strong>, <strong>"Mes Anterior"</strong> o <strong>"Año Actual"</strong>:
      </div>
      <div class="step-img-box">
        <img src="${imgs.com1}" class="step-img" style="max-height: 80px;" alt="Filtro de período" />
      </div>
    </div>

    <!-- PASO 2 -->
    <div class="step-card">
      <div class="step-header">
        <span class="step-number">2</span>
        <span class="step-title">Paso 2: Revisa las comisiones reales por aseguradora</span>
      </div>
      <div class="step-desc">
        Observa el resumen con primas cobradas, tasa promedio ponderada y comisiones netas ganadas:
      </div>
      <div class="step-img-box">
        <img src="${imgs.com2}" class="step-img" style="max-height: 120px;" alt="Tabla de comisiones" />
      </div>
    </div>

    <!-- PASO 3 -->
    <div class="step-card">
      <div class="step-header">
        <span class="step-number">3</span>
        <span class="step-title">Paso 3: Exporta a Excel, PDF o sube a Google Drive</span>
      </div>
      <div class="step-desc">
        Haz clic en los botones de exportación ubicados arriba a la derecha para tener el informe en Excel o PDF listo para contabilidad.
      </div>
    </div>

    <div class="footer-bar">
      <span>Instructivo Paso a Paso · Sistema de Seguros</span>
      <span>Página 7</span>
    </div>
  </div>

  <!-- PÁGINA 8: ACCIÓN COMPAÑÍAS Y ASISTENCIA -->
  <div class="page">
    <div class="header-bar">
      <span class="header-title">Acción 7: Directorio de Aseguradoras y Asistencia 24/7</span>
      <span class="header-subtitle">Santiago Morales & Asociados</span>
    </div>

    <h1>🏢 Consultar Teléfonos y Asistencia de Aseguradoras</h1>
    <p>Para conseguir rápido los números de grúa, autorizaciones o teléfonos de ejecutivos:</p>

    <!-- PASO 1 -->
    <div class="step-card">
      <div class="step-header">
        <span class="step-number">1</span>
        <span class="step-title">Paso 1: Entra al menú "Compañías"</span>
      </div>
      <div class="step-desc">
        Haz clic en <strong>Compañías</strong> en la barra lateral. Verás las tarjetas de todas las aseguradoras del país (La Colonial, Humano, Universal, Mapfre, etc.).
      </div>
    </div>

    <!-- PASO 2 -->
    <div class="step-card">
      <div class="step-header">
        <span class="step-number">2</span>
        <span class="step-title">Paso 2: Consulta contactos directos y asistencias</span>
      </div>
      <div class="step-desc">
        Cada tarjeta muestra el teléfono de cabina de emergencias, los contactos de los ejecutivos asignados y las pólizas activas que tenemos con ellos:
      </div>
      <div class="step-img-box">
        <img src="${imgs.comp1}" class="step-img" style="max-height: 160px;" alt="Tarjeta aseguradora" />
      </div>
    </div>

    <div class="callout callout-tip">
      <span class="callout-title">📞 Llamada en 1 clic:</span>
      Haz clic en el número de teléfono o correo para marcarlo o abrir un correo directamente sin tener que digitarlo manualmente.
    </div>

    <div class="footer-bar">
      <span>Instructivo Paso a Paso · Sistema de Seguros</span>
      <span>Página 8</span>
    </div>
  </div>

  <!-- PÁGINA 9: ACCIÓN SOLICITUDES Y CARTAS -->
  <div class="page">
    <div class="header-bar">
      <span class="header-title">Acción 8: Emisión de Solicitudes y Cartas Formales</span>
      <span class="header-subtitle">Santiago Morales & Asociados</span>
    </div>

    <h1>📬 Cómo Emitir una Carta de Solicitud Formal</h1>
    <p>Para enviar comunicaciones oficiales membretadas a las compañías aseguradoras:</p>

    <!-- PASO 1 -->
    <div class="step-card">
      <div class="step-header">
        <span class="step-number">1</span>
        <span class="step-title">Paso 1: Pulsa en "+ Nueva Solicitud"</span>
      </div>
      <div class="step-desc">
        En el menú <strong>Solicitudes</strong>, haz clic en el botón superior derecho <strong>"+ Nueva Solicitud"</strong>:
      </div>
      <div class="step-img-box">
        <img src="${imgs.sol1}" class="step-img" style="max-height: 80px;" alt="Botón nueva solicitud" />
      </div>
    </div>

    <!-- PASO 2 -->
    <div class="step-card">
      <div class="step-header">
        <span class="step-number">2</span>
        <span class="step-title">Paso 2: Completa el trámite y genera la carta PDF</span>
      </div>
      <div class="step-desc">
        Elige el cliente, la aseguradora y el tipo de trámite (Cotización, Nombramiento, Cambio de vehículo o Reclamación). Luego presiona <strong>"Generar Carta PDF"</strong>:
      </div>
      <div class="step-img-box">
        <img src="${imgs.sol2}" class="step-img" style="max-height: 135px;" alt="Modal solicitud" />
      </div>
    </div>

    <div class="footer-bar">
      <span>Instructivo Paso a Paso · Sistema de Seguros</span>
      <span>Página 9</span>
    </div>
  </div>

  <!-- PÁGINA 10: ACCIÓN SINIESTROS -->
  <div class="page">
    <div class="header-bar">
      <span class="header-title">Acción 9: Reportar y Seguir un Siniestro / Accidente</span>
      <span class="header-subtitle">Santiago Morales & Asociados</span>
    </div>

    <h1>🛡️ Cómo Reportar un Choque o Siniestro de Cliente</h1>
    <p>Cuando un asegurado te llama por un choque, robo o daño, regístralo inmediatamente:</p>

    <!-- PASO 1 -->
    <div class="step-card">
      <div class="step-header">
        <span class="step-number">1</span>
        <span class="step-title">Paso 1: Pulsa en "+ Reportar Siniestro"</span>
      </div>
      <div class="step-desc">
        En el menú <strong>Siniestros</strong>, haz clic en el botón superior derecho <strong>"+ Reportar Siniestro"</strong>:
      </div>
      <div class="step-img-box">
        <img src="${imgs.sin1}" class="step-img" style="max-height: 80px;" alt="Botón siniestro" />
      </div>
    </div>

    <!-- PASO 2 -->
    <div class="step-card">
      <div class="step-header">
        <span class="step-number">2</span>
        <span class="step-title">Paso 2: Asocia la póliza y describe los hechos</span>
      </div>
      <div class="step-desc">
        Selecciona la póliza involucrada, escribe la fecha del accidente, el lugar y el número de reclamación de la compañía:
      </div>
      <div class="step-img-box">
        <img src="${imgs.sin2}" class="step-img" style="max-height: 130px;" alt="Modal siniestro" />
      </div>
    </div>

    <div class="callout callout-alert">
      <span class="callout-title">⚠️ Alerta automática:</span>
      Al guardar el siniestro, la póliza mostrará una insignia roja de advertencia en el listado para que todo el equipo le dé prioridad al caso.
    </div>

    <div class="footer-bar">
      <span>Instructivo Paso a Paso · Sistema de Seguros</span>
      <span>Página 10</span>
    </div>
  </div>

  <!-- PÁGINA 11: ACCIÓN RESPALDO EN EXCEL -->
  <div class="page">
    <div class="header-bar">
      <span class="header-title">Acción 10: Descargar Copia de Respaldo en Excel</span>
      <span class="header-subtitle">Santiago Morales & Asociados</span>
    </div>

    <h1>💾 Cómo Descargar una Copia de Seguridad Completa</h1>
    <p>Para proteger toda la información de clientes, pólizas y pagos en tu computadora:</p>

    <!-- PASO 1 -->
    <div class="step-card">
      <div class="step-header">
        <span class="step-number">1</span>
        <span class="step-title">Paso 1: Entra al menú "Configuración"</span>
      </div>
      <div class="step-desc">
        Haz clic en <strong>Configuración</strong> en la barra lateral izquierda y desplázate hacia abajo hasta la sección <strong>"Copia de Seguridad y Respaldo"</strong>.
      </div>
    </div>

    <!-- PASO 2 -->
    <div class="step-card">
      <div class="step-header">
        <span class="step-number">2</span>
        <span class="step-title">Paso 2: Haz clic en el botón verde "Descargar Respaldo Completo (.xlsx)"</span>
      </div>
      <div class="step-desc">
        Presiona el botón verde. Se descargará de inmediato un archivo Excel con todas las hojas del sistema (Pólizas con su % de comisión, Clientes, Cobros, Siniestros y Aseguradoras):
      </div>
      <div class="step-img-box">
        <img src="${imgs.resp1}" class="step-img" style="max-height: 150px;" alt="Botón respaldo" />
      </div>
    </div>

    <div class="callout callout-tip">
      <span class="callout-title">🔒 Consejo de Seguridad:</span>
      Realiza esta descarga todos los viernes antes de salir de la oficina y guarda el archivo en un pendrive o en Google Drive.
    </div>

    <div class="footer-bar">
      <span>Instructivo Paso a Paso · Sistema de Seguros</span>
      <span>Página 11</span>
    </div>
  </div>

  <!-- PÁGINA 12: RESUMEN Y AYUDA -->
  <div class="page">
    <div class="header-bar">
      <span class="header-title">Resumen de Operaciones y Ayuda Rápida</span>
      <span class="header-subtitle">Santiago Morales & Asociados</span>
    </div>

    <h1>📋 Resumen de Teclas y Accesos Frecuentes</h1>
    <p>Guía de consulta rápida para el escritorio de cada estación de trabajo:</p>

    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 8px;">
      <div class="step-card">
        <strong style="color: #1e3a8a; font-size: 12px; display: block; margin-bottom: 2px;">¿Cómo buscar algo rápido?</strong>
        <span style="font-size: 11.5px; color: #475569;">Usa la barra de búsqueda en la parte superior de Clientes o Pólizas; busca por nombre, cédula, póliza o placa.</span>
      </div>
      <div class="step-card">
        <strong style="color: #1e3a8a; font-size: 12px; display: block; margin-bottom: 2px;">¿Cómo ver pólizas por vencer?</strong>
        <span style="font-size: 11.5px; color: #475569;">En el Inicio (Dashboard), revisa el semáforo de 15, 30 y 45 días de vencimiento para contactar al cliente con tiempo.</span>
      </div>
      <div class="step-card">
        <strong style="color: #1e3a8a; font-size: 12px; display: block; margin-bottom: 2px;">¿Cómo enviar recibos por WhatsApp?</strong>
        <span style="font-size: 11.5px; color: #475569;">En Cobros, pulsa el botón de documento para descargar el PDF oficial y arrástralo directamente a WhatsApp Web.</span>
      </div>
      <div class="step-card">
        <strong style="color: #1e3a8a; font-size: 12px; display: block; margin-bottom: 2px;">¿Cómo corregir una comisión?</strong>
        <span style="font-size: 11.5px; color: #475569;">Haz clic en la póliza, pulsa "Editar Póliza", cambia el campo "% Comisión Individual" y guarda los cambios.</span>
      </div>
    </div>

    <div style="margin-top: 20px; padding: 14px; background: #f8fafc; border: 1.5px solid #cbd5e1; border-radius: 10px; text-align: center;">
      <h3 style="margin: 0 0 4px 0; color: #0f172a; font-size: 13.5px;">Soporte Técnico Interno</h3>
      <p style="margin: 0; color: #64748b; font-size: 12px;">
        <strong>Santiago Morales y Asociados, S.R.L.</strong><br>
        Santo Domingo, República Dominicana · Plataforma Local Segura Hasura PostgreSQL
      </p>
    </div>

    <div class="footer-bar">
      <span>Instructivo Paso a Paso · Sistema de Seguros</span>
      <span>Página 12</span>
    </div>
  </div>

</body>
</html>`;

fs.writeFileSync(HTML_OUT, fullHtml, 'utf8');
console.log('HTML Paso a Paso generado en: ' + HTML_OUT);

async function exportPdf() {
  console.log('Generando PDF paso a paso con Microsoft Edge...');
  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });

  const page = await browser.newPage();
  const fileUrl = 'file:///' + HTML_OUT.replace(/\\/g, '/');
  await page.goto(fileUrl, { waitUntil: 'networkidle0' });

  await page.pdf({
    path: PDF_OUT,
    format: 'Letter',
    printBackground: true,
    margin: {
      top: '10mm',
      right: '12mm',
      bottom: '10mm',
      left: '12mm'
    }
  });

  await browser.close();

  if (fs.existsSync(PDF_OUT)) {
    const stats = fs.statSync(PDF_OUT);
    console.log('EXITO TOTAL: Nuevo PDF paso a paso generado!');
    console.log('Ruta: ' + PDF_OUT);
    console.log('Tamano: ' + Math.round(stats.size / 1024) + ' KB');
    try {
      fs.copyFileSync(PDF_OUT, PDF_ALT);
      console.log('Copiado tambien a: ' + PDF_ALT);
    } catch (e) {
      console.log('Nota: ' + PDF_ALT + ' esta actualmente abierto por el usuario.');
    }
  }
}

exportPdf();
