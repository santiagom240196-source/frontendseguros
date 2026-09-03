import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer-core';

const ASSETS_DIR = path.resolve('manual_assets');
const STEPS_DIR = path.resolve('manual_assets', 'steps');
const HTML_OUT = path.resolve('Manual_de_Usuario_Completo.html');
const PDF_OUT = path.resolve('Manual_de_Usuario_Completo.pdf');
const PDF_ALT1 = path.resolve('Manual_de_Usuario_Santiago_Morales.pdf');
const PDF_ALT2 = path.resolve('Manual_de_Usuario_Paso_a_Paso.pdf');
const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

function imgB64(folder, filename) {
  const f = path.join(folder, filename);
  if (!fs.existsSync(f)) return '';
  return 'data:image/png;base64,' + fs.readFileSync(f).toString('base64');
}

const imgs = {
  // Full screens
  loginFull: imgB64(ASSETS_DIR, '00_login.png'),
  dashboardFull: imgB64(ASSETS_DIR, '01_dashboard.png'),
  clientesFull: imgB64(ASSETS_DIR, '02_clientes.png'),
  polizasFull: imgB64(ASSETS_DIR, '03_polizas.png'),
  nuevaPolizaFull: imgB64(ASSETS_DIR, '04_nueva_poliza.png'),
  polizaDetalleFull: imgB64(ASSETS_DIR, '05_poliza_detalle.png'),
  cobrosFull: imgB64(ASSETS_DIR, '06_cobros.png'),
  comisionesFull: imgB64(ASSETS_DIR, '07_comisiones.png'),
  companiasFull: imgB64(ASSETS_DIR, '08_companias.png'),
  solicitudesFull: imgB64(ASSETS_DIR, '09_solicitudes.png'),
  siniestrosFull: imgB64(ASSETS_DIR, '10_siniestros.png'),
  configuracionFull: imgB64(ASSETS_DIR, '11_configuracion.png'),

  // Step closeups
  login1: imgB64(STEPS_DIR, 'step_login_1.png'),
  login2: imgB64(STEPS_DIR, 'step_login_2.png'),
  cli1: imgB64(STEPS_DIR, 'step_cliente_1.png'),
  cli2: imgB64(STEPS_DIR, 'step_cliente_2.png'),
  cli3: imgB64(STEPS_DIR, 'step_cliente_3.png'),
  pol1: imgB64(STEPS_DIR, 'step_poliza_1.png'),
  pol2: imgB64(STEPS_DIR, 'step_poliza_2.png'),
  pol3: imgB64(STEPS_DIR, 'step_poliza_3.png'),
  pol4: imgB64(STEPS_DIR, 'step_poliza_4.png'),
  polDetalle1: imgB64(STEPS_DIR, 'step_poliza_detalle_1.png'),
  cob1: imgB64(STEPS_DIR, 'step_cobro_1.png'),
  cob2: imgB64(STEPS_DIR, 'step_cobro_2.png'),
  cob3: imgB64(STEPS_DIR, 'step_cobro_3.png'),
  com1: imgB64(STEPS_DIR, 'step_comision_1.png'),
  com2: imgB64(STEPS_DIR, 'step_comision_2.png'),
  comp1: imgB64(STEPS_DIR, 'step_compania_1.png'),
  sol1: imgB64(STEPS_DIR, 'step_solicitud_1.png'),
  sol2: imgB64(STEPS_DIR, 'step_solicitud_2.png'),
  sin1: imgB64(STEPS_DIR, 'step_siniestro_1.png'),
  sin2: imgB64(STEPS_DIR, 'step_siniestro_2.png'),
  resp1: imgB64(STEPS_DIR, 'step_respaldo_1.png'),

  // Generated documents
  docRecibo: imgB64(ASSETS_DIR, 'doc_recibo_oficial.png'),
  docCarta: imgB64(ASSETS_DIR, 'doc_carta_formal.png')
};

const fullHtml = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Manual de Usuario Integral - Santiago Morales y Asociados</title>
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
      margin-bottom: 16px;
      display: inline-block;
    }
    .cover-title {
      font-size: 28px;
      font-weight: 900;
      color: #0f172a;
      line-height: 1.15;
      margin: 0 0 10px 0;
    }
    .cover-title span { color: #b58c5c; }
    .cover-subtitle {
      font-size: 14.5px;
      color: #475569;
      max-width: 630px;
      margin: 0 auto 18px auto;
      font-weight: 500;
    }
    .cover-card {
      background: #f8fafc;
      border: 1.5px solid #e2e8f0;
      border-radius: 12px;
      padding: 14px 22px;
      max-width: 530px;
      width: 100%;
      text-align: left;
      margin-bottom: 18px;
    }
    .cover-meta-item {
      display: flex;
      justify-content: space-between;
      padding: 5px 0;
      border-bottom: 1px dashed #cbd5e1;
      font-size: 12px;
    }
    .cover-meta-item:last-child { border-bottom: none; }
    .cover-meta-label { color: #64748b; font-weight: 600; }
    .cover-meta-val { color: #0f172a; font-weight: 800; }
    h1 {
      font-size: 17px;
      font-weight: 900;
      color: #0f172a;
      margin: 0 0 4px 0;
    }
    h2 {
      font-size: 12.5px;
      font-weight: 800;
      color: #1e3a8a;
      margin: 6px 0 4px 0;
    }
    p { margin: 0 0 6px 0; color: #334155; }
    
    /* Overview Screen Box */
    .screen-container {
      margin: 6px 0 8px 0;
      border-radius: 8px;
      overflow: hidden;
      border: 1.5px solid #cbd5e1;
      background: #f8fafc;
      text-align: center;
    }
    .screen-img {
      width: 100%;
      max-height: 255px;
      object-fit: contain;
      display: block;
      background: #f1f5f9;
      margin: 0 auto;
    }
    .screen-caption {
      background: #f8fafc;
      padding: 3px 8px;
      font-size: 10px;
      color: #475569;
      font-weight: 700;
      border-top: 1px solid #e2e8f0;
      text-align: left;
    }
    
    /* Step Cards */
    .step-card {
      background: #f8fafc;
      border: 1.5px solid #e2e8f0;
      border-radius: 7px;
      padding: 7px 9px;
      margin-bottom: 6px;
    }
    .step-header {
      display: flex;
      align-items: center;
      gap: 7px;
      margin-bottom: 4px;
    }
    .step-number {
      background: #1e3a8a;
      color: #ffffff;
      width: 19px;
      height: 19px;
      border-radius: 50%;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 10px;
      font-weight: 900;
      flex-shrink: 0;
    }
    .step-title {
      font-weight: 800;
      color: #0f172a;
      font-size: 12px;
    }
    .step-desc {
      font-size: 11.5px;
      color: #334155;
      margin-bottom: 4px;
    }
    .step-img-box {
      border: 1px solid #cbd5e1;
      border-radius: 5px;
      overflow: hidden;
      background: #ffffff;
      text-align: center;
    }
    .step-img {
      width: 100%;
      max-height: 115px;
      object-fit: contain;
      display: block;
      margin: 0 auto;
      background: #f1f5f9;
    }
    
    /* Callouts */
    .callout {
      border-radius: 6px;
      padding: 5px 8px;
      margin: 5px 0;
      font-size: 11px;
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
    
    /* Features Grid */
    .features-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6px;
      margin: 6px 0;
    }
    .feature-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 6px 8px;
    }
    .feature-box strong {
      display: block;
      color: #0f172a;
      font-size: 11.5px;
      margin-bottom: 2px;
    }
    .feature-box span {
      font-size: 10.8px;
      color: #64748b;
      line-height: 1.3;
      display: block;
    }

    /* Document sample box */
    .doc-sample-container {
      margin: 8px 0;
      border-radius: 8px;
      border: 2px solid #1e3a8a;
      overflow: hidden;
      background: #ffffff;
      text-align: center;
      box-shadow: 0 4px 12px rgba(0,0,0,0.06);
    }
    .doc-sample-img {
      width: 100%;
      max-height: 290px;
      object-fit: contain;
      display: block;
      margin: 0 auto;
      background: #ffffff;
    }
  </style>
</head>
<body>

  <!-- PORTADA -->
  <div class="page">
    <div class="cover-container">
      <div class="cover-badge">Manual e Instructivo Integral de Operaciones</div>
      <h1 class="cover-title">Santiago Morales & Asociados<br><span>Sistema de Gestión de Seguros</span></h1>
      <p class="cover-subtitle">
        Guía integral ilustrada: explicación completa de cada módulo ("para qué sirve cada cosa"), tutoriales paso por paso con imágenes de cada acción y modelos de documentos emitidos (recibos y cartas).
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
          <span class="cover-meta-label">Contenido:</span>
          <span class="cover-meta-val">Módulos generales + Pasos a seguir + Documentos creados</span>
        </div>
        <div class="cover-meta-item">
          <span class="cover-meta-label">Edición:</span>
          <span class="cover-meta-val">Versión 2026 (Comisión Individual por Póliza)</span>
        </div>
      </div>

      <div style="font-size: 12.5px; color: #64748b; max-width: 530px; line-height: 1.5;">
        <em>"Diseñado para que cualquier integrante del equipo, joven o mayor, domine todas las funciones de la oficina con total claridad y confianza."</em>
      </div>
    </div>
  </div>

  <!-- PÁGINA 1: MÓDULO ACCESO SEGURO (CONCEPTO + PASOS) -->
  <div class="page">
    <div class="header-bar">
      <span class="header-title">1. Inicio de Sesión y Acceso Seguro</span>
      <span class="header-subtitle">Santiago Morales & Asociados</span>
    </div>

    <h1>🔐 Acceso Seguro al Sistema</h1>
    <p>El portal protege la información de los clientes, pólizas y cobros asegurando que solo el personal autorizado ingrese.</p>

    <div class="screen-container">
      <img src="${imgs.loginFull}" class="screen-img" style="max-height: 160px;" alt="Login screen" />
      <div class="screen-caption">Figura 1.0: Portal de bienvenida con selección rápida de usuario y cifrado de credenciales.</div>
    </div>

    <h2>Pasos para ingresar al sistema:</h2>

    <div class="step-card">
      <div class="step-header">
        <span class="step-number">1</span>
        <span class="step-title">Paso 1: Selecciona tu perfil de usuario con un solo clic</span>
      </div>
      <div class="step-desc">En la sección <strong>"Acceso Rápido"</strong>, pulsa sobre tu perfil (ej. <em>Santiago Alberto</em> o <em>Usuario de Prueba</em>):</div>
      <div class="step-img-box">
        <img src="${imgs.login1}" class="step-img" style="max-height: 60px;" alt="Selector perfil" />
      </div>
    </div>

    <div class="step-card">
      <div class="step-header">
        <span class="step-number">2</span>
        <span class="step-title">Paso 2: Marca "Recordar sesión" y pulsa "Acceder al Sistema"</span>
      </div>
      <div class="step-desc">Mantén marcada la casilla de recordar sesión y pulsa el botón dorado grande:</div>
      <div class="step-img-box">
        <img src="${imgs.login2}" class="step-img" style="max-height: 65px;" alt="Botón acceder" />
      </div>
    </div>

    <div class="footer-bar">
      <span>Instructivo Integral · Santiago Morales & Asoc.</span>
      <span>Página 1</span>
    </div>
  </div>

  <!-- PÁGINA 2: DASHBOARD / INICIO -->
  <div class="page">
    <div class="header-bar">
      <span class="header-title">2. Inicio / Dashboard</span>
      <span class="header-subtitle">Santiago Morales & Asociados</span>
    </div>

    <h1>📊 El Panel de Inicio (Dashboard)</h1>
    <p>Es tu centro de mando diario: te muestra en segundos la producción del mes, pólizas activas y las alertas urgentes de renovación.</p>

    <div class="screen-container">
      <img src="${imgs.dashboardFull}" class="screen-img" style="max-height: 220px;" alt="Dashboard" />
      <div class="screen-caption">Figura 2.0: Panel Principal con indicadores financieros, gráficos por aseguradora y semáforo de vencimientos.</div>
    </div>

    <h2>¿Para qué sirve cada sección de esta pantalla?</h2>
    <div class="features-grid">
      <div class="feature-box">
        <strong>1. Indicadores Superiores</strong>
        <span>Cantidad de Pólizas Activas, Total de Primas Emitidas (RD$ y US$), Clientes Registrados y Siniestros abiertos.</span>
      </div>
      <div class="feature-box">
        <strong>2. Semáforo de Renovaciones</strong>
        <span>Alertas visuales de pólizas que vencen en los próximos 15, 30 y 45 días para llamar al cliente antes de que venza.</span>
      </div>
      <div class="feature-box">
        <strong>3. Accesos Rápidos</strong>
        <span>Botones directos para emitir una nueva póliza, cobrar una cuota o crear un nuevo cliente en un clic.</span>
      </div>
      <div class="feature-box">
        <strong>4. Gráficos de Producción</strong>
        <span>Distribución de cartera por aseguradora (La Colonial, Universal, Humano, etc.) y por ramo asegurado.</span>
      </div>
    </div>

    <div class="callout callout-tip">
      <span class="callout-title">🎯 Regla de Oro del Asesor:</span>
      Revisa la lista de <strong>"Próximas Renovaciones"</strong> cada mañana. Un cliente contactado con 30 días de anticipación siempre renueva con nosotros.
    </div>

    <div class="footer-bar">
      <span>Instructivo Integral · Santiago Morales & Asoc.</span>
      <span>Página 2</span>
    </div>
  </div>

  <!-- PÁGINA 3: MÓDULO CLIENTES (CONCEPTO + PASOS) -->
  <div class="page">
    <div class="header-bar">
      <span class="header-title">3. Directorio de Clientes</span>
      <span class="header-subtitle">Santiago Morales & Asociados</span>
    </div>

    <h1>👥 Directorio y Gestión de Clientes</h1>
    <p>Almacena el expediente completo de cada asegurado (persona física o empresa), sus teléfonos de contacto y todas sus pólizas asociadas.</p>

    <div class="screen-container">
      <img src="${imgs.clientesFull}" class="screen-img" style="max-height: 140px;" alt="Clientes listado" />
      <div class="screen-caption">Figura 3.0: Listado de asegurados con buscador inteligente y accesos directos de llamada y WhatsApp.</div>
    </div>

    <h2>Pasos para registrar un cliente nuevo:</h2>

    <div class="step-card">
      <div class="step-header">
        <span class="step-number">1</span>
        <span class="step-title">Paso 1: Pulsa en "+ Nuevo Cliente"</span>
      </div>
      <div class="step-desc">En la esquina superior derecha del módulo, presiona el botón azul:</div>
      <div class="step-img-box">
        <img src="${imgs.cli1}" class="step-img" style="max-height: 55px;" alt="Botón nuevo cliente" />
      </div>
    </div>

    <div class="step-card">
      <div class="step-header">
        <span class="step-number">2</span>
        <span class="step-title">Paso 2: Completa los datos en el formulario y guarda</span>
      </div>
      <div class="step-desc">Indica si es Persona Física (Cédula) o Jurídica (RNC), escribe Nombre, Teléfono, Celular y Correo. Presiona <strong>"Guardar Cliente"</strong>:</div>
      <div class="step-img-box">
        <img src="${imgs.cli2}" class="step-img" style="max-height: 70px;" alt="Modal cliente" />
      </div>
    </div>

    <div class="footer-bar">
      <span>Instructivo Integral · Santiago Morales & Asoc.</span>
      <span>Página 3</span>
    </div>
  </div>

  <!-- PÁGINA 4: MÓDULO PÓLIZAS GENERAL -->
  <div class="page">
    <div class="header-bar">
      <span class="header-title">4. Pólizas de Seguros (Visión General)</span>
      <span class="header-subtitle">Santiago Morales & Asociados</span>
    </div>

    <h1>📄 Gestión Integral de Pólizas</h1>
    <p>El núcleo operativo de la correduría. Aquí se supervisan todos los contratos, vigencias, coberturas y comisiones pactadas.</p>

    <div class="screen-container">
      <img src="${imgs.polizasFull}" class="screen-img" style="max-height: 220px;" alt="Pólizas tabla" />
      <div class="screen-caption">Figura 4.0: Listado general de pólizas con estados, prima anual y badge de porcentaje de comisión individual.</div>
    </div>

    <h2>¿Para qué sirve cada parte de esta vista?</h2>
    <div class="features-grid">
      <div class="feature-box">
        <strong>1. Filtros por Pestaña</strong>
        <span>Permite filtrar al instante entre pólizas <em>Activas</em>, <em>Pendientes de Pago</em>, <em>Vencidas</em> y <em>Canceladas</em>.</span>
      </div>
      <div class="feature-box">
        <strong>2. Columna de Comisión Individual</strong>
        <span>Muestra la prima anual y debajo el porcentaje de comisión específico configurado para esa póliza (ej. <strong>Com: 15%</strong>).</span>
      </div>
      <div class="feature-box">
        <strong>3. Alerta de Siniestro</strong>
        <span>Si una póliza tiene un accidente o reclamo abierto, muestra un distintivo rojo de alerta para seguimiento prioritario.</span>
      </div>
      <div class="feature-box">
        <strong>4. Clic para Abrir Expediente</strong>
        <span>Al hacer clic sobre cualquier póliza se abre el panel lateral (Drawer) con todo su historial de movimientos y coberturas.</span>
      </div>
    </div>

    <div class="footer-bar">
      <span>Instructivo Integral · Santiago Morales & Asoc.</span>
      <span>Página 4</span>
    </div>
  </div>

  <!-- PÁGINA 5: ACCIÓN EMITIR PÓLIZA Y COMISIÓN INDIVIDUAL -->
  <div class="page">
    <div class="header-bar">
      <span class="header-title">4. Pólizas · Paso a Paso: Emisión y Comisión</span>
      <span class="header-subtitle">Santiago Morales & Asociados</span>
    </div>

    <h1>✍️ Cómo Emitir una Póliza y Fijar su Comisión</h1>
    <p>Cada póliza tiene su propio porcentaje de comisión individual, permitiendo cálculos 100% exactos:</p>

    <div class="step-card">
      <div class="step-header">
        <span class="step-number">1</span>
        <span class="step-title">Paso 1: Pulsa en "+ Emitir Nueva Póliza"</span>
      </div>
      <div class="step-desc">Haz clic en el botón azul ubicado en la esquina superior derecha:</div>
      <div class="step-img-box">
        <img src="${imgs.pol1}" class="step-img" style="max-height: 60px;" alt="Botón emitir" />
      </div>
    </div>

    <div class="step-card">
      <div class="step-header">
        <span class="step-number">2</span>
        <span class="step-title">Paso 2: Escribe No. de Póliza, Cliente, Aseguradora y Prima</span>
      </div>
      <div class="step-desc">Selecciona el cliente, la aseguradora (La Colonial, Universal, etc.), el ramo y la prima anual:</div>
      <div class="step-img-box">
        <img src="${imgs.pol2}" class="step-img" style="max-height: 80px;" alt="Formulario póliza" />
      </div>
    </div>

    <div class="step-card">
      <div class="step-header">
        <span class="step-number">3</span>
        <span class="step-title">Paso 3: Fija el % de Comisión Individual y mira el cálculo en vivo</span>
      </div>
      <div class="step-desc">Escribe el porcentaje pactado (ej. 15.0, 18.0 o 20.0). El sistema calculará la <strong>Comisión Estimada</strong> automáticamente:</div>
      <div class="step-img-box">
        <img src="${imgs.pol3}" class="step-img" style="max-height: 65px;" alt="Campo comisión" />
      </div>
    </div>

    <div class="callout callout-tip">
      <span class="callout-title">✨ Guardado en Base de Datos:</span>
      Al presionar <strong>"Emitir Póliza"</strong>, la póliza y su porcentaje quedan guardados permanentemente en PostgreSQL y sincronizados con Hasura.
    </div>

    <div class="footer-bar">
      <span>Instructivo Integral · Santiago Morales & Asoc.</span>
      <span>Página 5</span>
    </div>
  </div>

  <!-- PÁGINA 6: EXPEDIENTE Y DETALLE DE PÓLIZA -->
  <div class="page">
    <div class="header-bar">
      <span class="header-title">4. Pólizas · Expediente y Modificaciones</span>
      <span class="header-subtitle">Santiago Morales & Asociados</span>
    </div>

    <h1>🔎 Consultar Expediente y Modificar una Póliza</h1>
    <p>Al hacer clic sobre cualquier póliza en la tabla, se despliega el panel lateral con todo su expediente:</p>

    <div class="screen-container">
      <img src="${imgs.polizaDetalleFull}" class="screen-img" style="max-height: 190px;" alt="Drawer lateral" />
      <div class="screen-caption">Figura 4.1: Drawer lateral con datos financieros, coberturas, vigencias y botón de edición.</div>
    </div>

    <h2>¿Cómo modificar el porcentaje de comisión o la prima de una póliza?</h2>
    <div class="step-card">
      <div class="step-header">
        <span class="step-number">1</span>
        <span class="step-title">Paso 1: Abre el expediente haciendo clic en la póliza</span>
      </div>
      <div class="step-desc">Revisa la prima, el porcentaje de comisión actual y las fechas de vigencia.</div>
    </div>

    <div class="step-card">
      <div class="step-header">
        <span class="step-number">2</span>
        <span class="step-title">Paso 2: Haz clic en el botón "Editar Póliza"</span>
      </div>
      <div class="step-desc">Modifica el campo <strong>"% Comisión Individual"</strong> o la prima y presiona <strong>"Guardar Cambios"</strong>. Se actualizará inmediatamente en todo el sistema y en los reportes de comisiones.</div>
    </div>

    <div class="footer-bar">
      <span>Instructivo Integral · Santiago Morales & Asoc.</span>
      <span>Página 6</span>
    </div>
  </div>

  <!-- PÁGINA 7: MÓDULO COBROS Y PAGOS -->
  <div class="page">
    <div class="header-bar">
      <span class="header-title">5. Cobros y Pagos (Visión General y Pasos)</span>
      <span class="header-subtitle">Santiago Morales & Asociados</span>
    </div>

    <h1>💰 Control de Cobros y Registro de Pagos</h1>
    <p>Supervisa las cuotas pagadas y las facturas pendientes de cobro de todos tus asegurados.</p>

    <div class="screen-container">
      <img src="${imgs.cobrosFull}" class="screen-img" style="max-height: 140px;" alt="Cobros tabla" />
      <div class="screen-caption">Figura 5.0: Módulo de cobros con estados Pagado/Pendiente y botón para generar recibos oficiales.</div>
    </div>

    <h2>Pasos para registrar un pago y generar su recibo:</h2>

    <div class="step-card">
      <div class="step-header">
        <span class="step-number">1</span>
        <span class="step-title">Paso 1: Pulsa en "+ Registrar Cobro"</span>
      </div>
      <div class="step-desc">Haz clic en el botón superior derecho para abrir el formulario de pago:</div>
      <div class="step-img-box">
        <img src="${imgs.cob1}" class="step-img" style="max-height: 55px;" alt="Botón cobro" />
      </div>
    </div>

    <div class="step-card">
      <div class="step-header">
        <span class="step-number">2</span>
        <span class="step-title">Paso 2: Selecciona la póliza, escribe el monto y marca "Pagado"</span>
      </div>
      <div class="step-desc">Indica si fue pagado en efectivo, transferencia o cheque y presiona <strong>"Registrar y Emitir Recibo"</strong>:</div>
      <div class="step-img-box">
        <img src="${imgs.cob2}" class="step-img" style="max-height: 70px;" alt="Modal cobro" />
      </div>
    </div>

    <div class="footer-bar">
      <span>Instructivo Integral · Santiago Morales & Asoc.</span>
      <span>Página 7</span>
    </div>
  </div>

  <!-- PÁGINA 8: DOCUMENTO OFICIAL CREADO - RECIBO OFICIAL EN PDF -->
  <div class="page">
    <div class="header-bar">
      <span class="header-title">5. Documento Creado: Recibo Oficial de Pago</span>
      <span class="header-subtitle">Santiago Morales & Asociados</span>
    </div>

    <h1>🧾 Documento Generado: Recibo Oficial en PDF</h1>
    <p>
      Al registrar un pago, el sistema genera automáticamente el <strong>Recibo Oficial de Pago / Comprobante de Caja</strong> con el membrete corporativo de Santiago Morales & Asociados:
    </p>

    <div class="doc-sample-container">
      <img src="${imgs.docRecibo}" class="doc-sample-img" alt="Recibo Oficial de Pago" />
    </div>

    <h2>Elementos clave del recibo que recibe el cliente:</h2>
    <div class="features-grid">
      <div class="feature-box">
        <strong>1. Número de Recibo Único</strong>
        <span>Identificador oficial (ej. REC-2026-00482) para control contable y auditoría.</span>
      </div>
      <div class="feature-box">
        <strong>2. Datos del Asegurado y Póliza</strong>
        <span>Nombre del cliente, RNC/Cédula, número de póliza, compañía aseguradora y vigencia.</span>
      </div>
      <div class="feature-box">
        <strong>3. Monto en Números y Letras</strong>
        <span>Importe exacto pagado con descripción en letras para evitar cualquier alteración.</span>
      </div>
      <div class="feature-box">
        <strong>4. Sello Oficial "PAGADO"</strong>
        <span>Sello de conformidad y línea de firma para entrega por WhatsApp o correo electrónico.</span>
      </div>
    </div>

    <div class="footer-bar">
      <span>Instructivo Integral · Santiago Morales & Asoc.</span>
      <span>Página 8</span>
    </div>
  </div>

  <!-- PÁGINA 9: REPORTE DE COMISIONES -->
  <div class="page">
    <div class="header-bar">
      <span class="header-title">6. Reporte Financiero de Comisiones</span>
      <span class="header-subtitle">Santiago Morales & Asociados</span>
    </div>

    <h1>📈 Reporte de Comisiones Exacto</h1>
    <p>Calcula las comisiones reales ganadas por la correduría aplicando el porcentaje individual configurado en cada póliza.</p>

    <div class="screen-container">
      <img src="${imgs.comisionesFull}" class="screen-img" style="max-height: 180px;" alt="Comisiones pantalla" />
      <div class="screen-caption">Figura 6.0: Reporte financiero por aseguradora con desglose individual de pólizas y exportación a Excel y PDF.</div>
    </div>

    <h2>Pasos para consultar y exportar comisiones:</h2>

    <div class="step-card">
      <div class="step-header">
        <span class="step-number">1</span>
        <span class="step-title">Paso 1: Elige el período (Este Mes, Mes Anterior o Año Actual)</span>
      </div>
      <div class="step-desc">Usa los botones rápidos o selecciona un rango de fechas específico:</div>
      <div class="step-img-box">
        <img src="${imgs.com1}" class="step-img" style="max-height: 55px;" alt="Filtros fechas" />
      </div>
    </div>

    <div class="step-card">
      <div class="step-header">
        <span class="step-number">2</span>
        <span class="step-title">Paso 2: Revisa las comisiones reales y exporta a Excel / PDF</span>
      </div>
      <div class="step-desc">Haz clic en los botones de exportación superiores para descargar el informe en Excel o PDF listo para contabilidad.</div>
    </div>

    <div class="footer-bar">
      <span>Instructivo Integral · Santiago Morales & Asoc.</span>
      <span>Página 9</span>
    </div>
  </div>

  <!-- PÁGINA 10: COMPAÑÍAS ASEGURADORAS -->
  <div class="page">
    <div class="header-bar">
      <span class="header-title">7. Directorio de Aseguradoras</span>
      <span class="header-subtitle">Santiago Morales & Asociados</span>
    </div>

    <h1>🏢 Directorio de Aseguradoras y Asistencia 24/7</h1>
    <p>Tu agenda centralizada con todas las aseguradoras del país (La Colonial, Universal, Humano, Mapfre, etc.).</p>

    <div class="screen-container">
      <img src="${imgs.companiasFull}" class="screen-img" style="max-height: 170px;" alt="Compañías pantalla" />
      <div class="screen-caption">Figura 7.0: Directorio corporativo con métricas de producción y teléfonos de asistencia.</div>
    </div>

    <h2>¿Para qué sirve y cómo se utiliza?</h2>

    <div class="step-card">
      <div class="step-header">
        <span class="step-number">1</span>
        <span class="step-title">Consulta de Asistencia Vial y Cabina de Emergencias</span>
      </div>
      <div class="step-desc">Cada tarjeta muestra el número directo de grúa y emergencias 24/7 para asistir a los clientes en caso de accidente:</div>
      <div class="step-img-box">
        <img src="${imgs.comp1}" class="step-img" style="max-height: 110px;" alt="Tarjeta aseguradora" />
      </div>
    </div>

    <div class="callout callout-tip">
      <span class="callout-title">📞 Contactos de Ejecutivos:</span>
      Pulsa en el botón <strong>"Contactos"</strong> de cualquier tarjeta para ver el nombre, celular y correo del suscriptor que atiende nuestros casos.
    </div>

    <div class="footer-bar">
      <span>Instructivo Integral · Santiago Morales & Asoc.</span>
      <span>Página 10</span>
    </div>
  </div>

  <!-- PÁGINA 11: SOLICITUDES Y CARTAS -->
  <div class="page">
    <div class="header-bar">
      <span class="header-title">8. Solicitudes y Cartas Formales</span>
      <span class="header-subtitle">Santiago Morales & Asociados</span>
    </div>

    <h1>📬 Emisión de Solicitudes y Cartas Formales</h1>
    <p>Genera comunicaciones formales dirigidas a las compañías aseguradoras sin tener que redactar documentos desde cero.</p>

    <div class="screen-container">
      <img src="${imgs.solicitudesFull}" class="screen-img" style="max-height: 140px;" alt="Solicitudes pantalla" />
      <div class="screen-caption">Figura 8.0: Panel de solicitudes con archivo histórico de trámites y cartas generadas.</div>
    </div>

    <h2>Pasos para generar una carta formal:</h2>

    <div class="step-card">
      <div class="step-header">
        <span class="step-number">1</span>
        <span class="step-title">Paso 1: Pulsa en "+ Nueva Solicitud"</span>
      </div>
      <div class="step-desc">Haz clic en el botón superior derecho para abrir el generador de cartas:</div>
      <div class="step-img-box">
        <img src="${imgs.sol1}" class="step-img" style="max-height: 55px;" alt="Botón solicitud" />
      </div>
    </div>

    <div class="step-card">
      <div class="step-header">
        <span class="step-number">2</span>
        <span class="step-title">Paso 2: Elige el trámite, completa los detalles y pulsa "Generar Carta PDF"</span>
      </div>
      <div class="step-desc">Selecciona si es Cotización, Inclusión o Nombramiento, escribe los requerimientos y presiona generar:</div>
      <div class="step-img-box">
        <img src="${imgs.sol2}" class="step-img" style="max-height: 70px;" alt="Modal solicitud" />
      </div>
    </div>

    <div class="footer-bar">
      <span>Instructivo Integral · Santiago Morales & Asoc.</span>
      <span>Página 11</span>
    </div>
  </div>

  <!-- PÁGINA 12: DOCUMENTO OFICIAL CREADO - CARTA FORMAL EN PDF -->
  <div class="page">
    <div class="header-bar">
      <span class="header-title">8. Documento Creado: Carta Formal Membretada</span>
      <span class="header-subtitle">Santiago Morales & Asociados</span>
    </div>

    <h1>✉️ Documento Generado: Carta de Solicitud en PDF</h1>
    <p>
      El sistema crea automáticamente cartas formales listas para enviar a las aseguradoras con membrete oficial y código de agente:
    </p>

    <div class="doc-sample-container">
      <img src="${imgs.docCarta}" class="doc-sample-img" alt="Carta Formal de Solicitud" />
    </div>

    <h2>Estructura de la carta oficial generada:</h2>
    <div class="features-grid">
      <div class="feature-box">
        <strong>1. Membrete y Fecha Oficial</strong>
        <span>Nombre corporativo de la correduría, número de solicitud y fecha formal de expedición.</span>
      </div>
      <div class="feature-box">
        <strong>2. Destinatario y Asunto</strong>
        <span>Compañía aseguradora, departamento de suscripción y referencia del trámite.</span>
      </div>
      <div class="feature-box">
        <strong>3. Recuadro Técnico de la Unidad</strong>
        <span>Póliza matriz, chasis, placa, marca, valor asegurado y coberturas solicitadas.</span>
      </div>
      <div class="feature-box">
        <strong>4. Firma y Código de Agente</strong>
        <span>Firma autorizada de Santiago Morales y Asociados con el código oficial ante la compañía.</span>
      </div>
    </div>

    <div class="footer-bar">
      <span>Instructivo Integral · Santiago Morales & Asoc.</span>
      <span>Página 12</span>
    </div>
  </div>

  <!-- PÁGINA 13: SINIESTROS Y RECLAMOS -->
  <div class="page">
    <div class="header-bar">
      <span class="header-title">9. Siniestros y Reclamaciones</span>
      <span class="header-subtitle">Santiago Morales & Asociados</span>
    </div>

    <h1>🛡️ Seguimiento de Siniestros y Accidentes</h1>
    <p>Acompaña a tu asegurado desde el momento del choque o siniestro hasta la entrega del cheque o liquidación.</p>

    <div class="screen-container">
      <img src="${imgs.siniestrosFull}" class="screen-img" style="max-height: 140px;" alt="Siniestros pantalla" />
      <div class="screen-caption">Figura 9.0: Panel de siniestros con estados de reclamación y seguimiento de talleres.</div>
    </div>

    <h2>Pasos para reportar y atender un siniestro:</h2>

    <div class="step-card">
      <div class="step-header">
        <span class="step-number">1</span>
        <span class="step-title">Paso 1: Pulsa en "+ Reportar Siniestro"</span>
      </div>
      <div class="step-desc">Haz clic en el botón superior derecho cuando el asegurado te notifique un accidente:</div>
      <div class="step-img-box">
        <img src="${imgs.sin1}" class="step-img" style="max-height: 55px;" alt="Botón siniestro" />
      </div>
    </div>

    <div class="step-card">
      <div class="step-header">
        <span class="step-number">2</span>
        <span class="step-title">Paso 2: Asocia la póliza y describe los hechos</span>
      </div>
      <div class="step-desc">Anota la fecha, lugar, descripción del choque y número de reclamación asignado por la aseguradora:</div>
      <div class="step-img-box">
        <img src="${imgs.sin2}" class="step-img" style="max-height: 70px;" alt="Modal siniestro" />
      </div>
    </div>

    <div class="footer-bar">
      <span>Instructivo Integral · Santiago Morales & Asoc.</span>
      <span>Página 13</span>
    </div>
  </div>

  <!-- PÁGINA 14: CONFIGURACIÓN Y RESPALDO EN EXCEL -->
  <div class="page">
    <div class="header-bar">
      <span class="header-title">10. Configuración y Copia de Seguridad</span>
      <span class="header-subtitle">Santiago Morales & Asociados</span>
    </div>

    <h1>💾 Configuración y Respaldo Total en Excel</h1>
    <p>Protege toda la información de la correduría con copias de seguridad descargables en 1 clic.</p>

    <div class="screen-container">
      <img src="${imgs.configuracionFull}" class="screen-img" style="max-height: 140px;" alt="Configuración pantalla" />
      <div class="screen-caption">Figura 10.0: Panel de configuración y descarga de copias de seguridad de la base de datos.</div>
    </div>

    <h2>¿Cómo descargar el respaldo completo de la oficina en Excel?</h2>

    <div class="step-card">
      <div class="step-header">
        <span class="step-number">1</span>
        <span class="step-title">Paso 1: Entra al menú "Configuración"</span>
      </div>
      <div class="step-desc">En la barra lateral izquierda haz clic en <strong>Configuración</strong> y baja hasta <em>"Copia de Seguridad y Respaldo"</em>.</div>
    </div>

    <div class="step-card">
      <div class="step-header">
        <span class="step-number">2</span>
        <span class="step-title">Paso 2: Presiona el botón verde "Descargar Respaldo Completo (.xlsx)"</span>
      </div>
      <div class="step-desc">Se descargará un libro de Excel con hojas separadas para: <em>Pólizas (con su % de comisión individual)</em>, <em>Clientes</em>, <em>Cobros</em>, <em>Siniestros</em> y <em>Aseguradoras</em>:</div>
      <div class="step-img-box">
        <img src="${imgs.resp1}" class="step-img" style="max-height: 85px;" alt="Botón respaldo" />
      </div>
    </div>

    <div class="callout callout-tip">
      <span class="callout-title">🔒 Recomendación de Seguridad:</span>
      Descarga este archivo todos los viernes antes de cerrar la oficina y guárdalo en un pendrive o en Google Drive.
    </div>

    <div class="footer-bar">
      <span>Instructivo Integral · Santiago Morales & Asoc.</span>
      <span>Página 14</span>
    </div>
  </div>

  <!-- PÁGINA 15: PREGUNTAS FRECUENTES Y SOPORTE -->
  <div class="page">
    <div class="header-bar">
      <span class="header-title">11. Preguntas Frecuentes y Asistencia</span>
      <span class="header-subtitle">Santiago Morales & Asociados</span>
    </div>

    <h1>❓ Preguntas Frecuentes y Consejos de Oro</h1>
    <p>Respuestas rápidas a las situaciones más comunes del día a día en la correduría:</p>

    <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 6px;">
      <div class="feature-box">
        <strong style="color: #1e3a8a; font-size: 11.5px;">1. ¿Qué hago si una póliza cambió de prima o de comisión?</strong>
        <span style="font-size: 11px; color: #334155; margin-top: 2px;">
          Haz clic en la póliza para abrir el panel lateral, pulsa <strong>"Editar Póliza"</strong>, modifica el % de comisión o la prima y presiona <strong>"Guardar Cambios"</strong>. Se actualiza al instante en Hasura PostgreSQL.
        </span>
      </div>

      <div class="feature-box">
        <strong style="color: #1e3a8a; font-size: 11.5px;">2. ¿Por qué ya no hay que configurar comisiones fijas en Aseguradoras?</strong>
        <span style="font-size: 11px; color: #334155; margin-top: 2px;">
          Porque ahora el porcentaje es <strong>individual por póliza</strong>. Cada póliza tiene su propia tasa pactada, por lo que los reportes suman exactamente lo que ganaste en cada cobro sin discrepancias.
        </span>
      </div>

      <div class="feature-box">
        <strong style="color: #1e3a8a; font-size: 11.5px;">3. ¿Cómo sé si un cliente tiene pagos retrasados?</strong>
        <span style="font-size: 11px; color: #334155; margin-top: 2px;">
          En el menú <strong>Pólizas</strong> haz clic en la pestaña <strong>"Pendiente de Pago"</strong>, o entra al menú <strong>Cobros</strong> para revisar las facturas pendientes.
        </span>
      </div>

      <div class="feature-box">
        <strong style="color: #1e3a8a; font-size: 11.5px;">4. ¿Cómo envío un recibo al cliente por WhatsApp?</strong>
        <span style="font-size: 11px; color: #334155; margin-top: 2px;">
          En el menú <strong>Cobros</strong> pulsa el botón de documento para descargar el PDF oficial en tu equipo. Luego arrastra el archivo directamente a WhatsApp Web.
        </span>
      </div>
    </div>

    <div style="margin-top: 14px; padding: 10px; background: #f8fafc; border: 1.5px solid #cbd5e1; border-radius: 8px; text-align: center;">
      <h3 style="margin: 0 0 2px 0; color: #0f172a; font-size: 12.5px;">Soporte Técnico Interno</h3>
      <p style="margin: 0; color: #64748b; font-size: 11px;">
        <strong>Santiago Morales y Asociados, S.R.L.</strong><br>
        Santo Domingo, República Dominicana · Plataforma Local Segura Hasura PostgreSQL
      </p>
    </div>

    <div class="footer-bar">
      <span>Instructivo Integral · Santiago Morales & Asoc.</span>
      <span>Página 15</span>
    </div>
  </div>

</body>
</html>`;

fs.writeFileSync(HTML_OUT, fullHtml, 'utf8');
console.log('HTML Master generado en: ' + HTML_OUT);

async function exportMasterPdf() {
  console.log('Compilando Master PDF con Microsoft Edge...');
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
    console.log('==============================================');
    console.log('EXITO TOTAL: Master PDF Compilado Satisfactoriamente!');
    console.log('Archivo Principal: ' + PDF_OUT);
    console.log('Tamano: ' + Math.round(stats.size / 1024) + ' KB');
    console.log('==============================================');

    try {
      fs.copyFileSync(PDF_OUT, PDF_ALT1);
      console.log('Copiado exitosamente a: ' + PDF_ALT1);
    } catch (e) {
      console.log('Nota: ' + PDF_ALT1 + ' esta bloqueado por el visor.');
    }

    try {
      fs.copyFileSync(PDF_OUT, PDF_ALT2);
      console.log('Copiado exitosamente a: ' + PDF_ALT2);
    } catch (e) {
      console.log('Nota: ' + PDF_ALT2 + ' esta bloqueado por el visor.');
    }
  }
}

exportMasterPdf();
