import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer-core';

const ASSETS_DIR = path.resolve('manual_assets');
const HTML_OUT = path.resolve('Manual_de_Usuario_Santiago_Morales.html');
const PDF_OUT = path.resolve('Manual_de_Usuario_Santiago_Morales.pdf');
const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

function imgBase64(filename) {
  const f = path.join(ASSETS_DIR, filename);
  if (!fs.existsSync(f)) return '';
  return 'data:image/png;base64,' + fs.readFileSync(f).toString('base64');
}

const pages = [
  {
    num: 1,
    header: '1. Inicio de Sesión y Acceso Seguro',
    title: '🔐 ¿Cómo Ingresar al Sistema?',
    desc: 'El sistema cuenta con un portal de acceso seguro y protegido para garantizar que la información de los clientes, pólizas y pagos esté siempre confidencial y respaldada.',
    img: imgBase64('00_login.png'),
    caption: 'Figura 1.0: Portal de Acceso con selección rápida de usuario y cifrado de datos.',
    sectionTitle: 'Paso a paso para ingresar:',
    steps: [
      '<strong>Abre tu navegador de internet:</strong> Ingresa la dirección <code>http://localhost:5174</code> en Google Chrome o Microsoft Edge.',
      '<strong>Acceso con un solo clic:</strong> En la sección <em>"Acceso Rápido"</em>, pulsa directamente sobre tu perfil <strong>"Santiago Alberto (👑 Principal)"</strong> o <strong>"Usuario de Prueba (🧪 Sandbox)"</strong>.',
      '<strong>Ingreso manual con contraseña:</strong> Si prefieres escribir tus credenciales, escribe tu usuario (ej. <code>santiagom2401</code> o <code>admin</code>) y tu contraseña.',
      '<strong>Entrar al sistema:</strong> Haz clic en el botón dorado grande <strong>"Acceder al Sistema"</strong>. ¡Listo! Entrarás inmediatamente al panel de control.'
    ],
    tipTitle: '💡 Consejo Práctico:',
    tipText: 'Deja marcada la casilla <strong>"Recordar sesión en este equipo"</strong> para que al encender la computadora en la oficina entres directamente sin tener que escribir la contraseña todos los días.'
  },
  {
    num: 2,
    header: '2. Inicio / Dashboard',
    title: '📊 El Panel de Inicio (Dashboard)',
    desc: 'El <strong>Inicio</strong> es la pantalla principal que ves al entrar. Es como el tablero de tu vehículo: te muestra de un vistazo la salud completa de tu correduría de seguros.',
    img: imgBase64('01_dashboard.png'),
    caption: 'Figura 2.0: Panel Principal con métricas financieras, gráficos de cartera y semáforo de vencimientos.',
    sectionTitle: '¿Qué encontramos en esta pantalla?',
    steps: [
      '<strong>Tarjetas de Resumen Superior:</strong> Cantidad de Pólizas Activas, Total de Primas Emitidas (en RD$ y US$), Clientes Registrados y Siniestros abiertos en trámite.',
      '<strong>Semáforo de Renovaciones:</strong> Alertas visuales automáticas que te indican qué pólizas vencen en los próximos 15, 30 y 45 días para contactar a los clientes a tiempo.',
      '<strong>Botones de Acción Rápida:</strong> Botones directos para emitir una nueva póliza, registrar un cobro o crear un nuevo cliente en un solo paso.',
      '<strong>Gráficos de Producción:</strong> Distribución de cartera por aseguradora (La Colonial, Universal, Humano, Mapfre, etc.) y por ramo de seguro.'
    ],
    tipTitle: '🎯 Regla de Oro del Asesor:',
    tipText: 'Revisa todos los días a primera hora la lista de <strong>"Próximas Renovaciones"</strong>. Un cliente contactado 30 días antes de vencer su póliza casi nunca se va con otra compañía.'
  },
  {
    num: 3,
    header: '3. Directorio de Clientes',
    title: '👥 Módulo de Clientes',
    desc: 'Aquí se almacenan todos los datos personales y de contacto de tus asegurados, ya sean personas particulares o empresas.',
    img: imgBase64('02_clientes.png'),
    caption: 'Figura 3.0: Listado general de clientes con buscador inteligente y accesos directos de contacto.',
    sectionTitle: 'Cómo registrar un nuevo cliente paso a paso:',
    steps: [
      'Haz clic en el botón superior derecho <strong>"+ Nuevo Cliente"</strong>.',
      'Selecciona si es <strong>Persona Física</strong> (con Cédula) o <strong>Persona Jurídica</strong> (Empresa con RNC).',
      'Escribe su Nombre o Razón Social, Cédula/RNC, Teléfono principal, Celular y Correo Electrónico.',
      'Haz clic en <strong>"Guardar Cliente"</strong>. El cliente quedará disponible de inmediato para emitirle pólizas.'
    ],
    tipTitle: '🔍 Búsqueda Rápida:',
    tipText: 'Escribe en la barra de búsqueda cualquier palabra: el nombre, el apellido, el número de cédula o el teléfono. La lista se filtra automáticamente en tiempo real.'
  },
  {
    num: 4,
    header: '4. Pólizas de Seguros',
    title: '📄 Gestión Integral de Pólizas',
    desc: 'Este es el módulo central del negocio. Aquí se consultan, emiten, renuevan y supervisan todos los contratos de seguros de los clientes.',
    img: imgBase64('03_polizas.png'),
    caption: 'Figura 4.0: Listado de pólizas con número, aseguradora, vigencia, estado y badge de comisión individual.',
    sectionTitle: 'Elementos clave que debes conocer:',
    steps: [
      '<strong>Pestañas de Estado (Arriba):</strong> Te permiten filtrar rápidamente entre pólizas <em>Activas</em>, <em>Pendientes de Pago</em>, <em>Vencidas</em> y <em>Canceladas</em>.',
      '<strong>Columna de Comisión Individual:</strong> Debajo del monto de la prima de cada póliza verás su porcentaje específico (ej. <strong>Com: 15%</strong> o <strong>Com: 20%</strong>).',
      '<strong>Alerta de Siniestro Abierto:</strong> Si una póliza tiene un reclamo de accidente en proceso, verás un distintivo rojo de alerta para dar seguimiento prioritario.',
      '<strong>Clic para ver Detalles:</strong> Haz clic en cualquier fila para abrir el panel lateral completo con toda la historia de la póliza.'
    ],
    tipTitle: '💡 Consejo:',
    tipText: 'Puedes ordenar las pólizas por fecha de vencimiento o por prima anual haciendo clic en los encabezados de las columnas.'
  },
  {
    num: 5,
    header: '5. Emisión de Póliza y Comisiones',
    title: '✍️ Cómo Emitir una Póliza y Fijar su Comisión',
    desc: 'Ahora las comisiones se configuran <strong>individualmente en cada póliza</strong>, permitiendo adaptar el porcentaje según el producto, cliente o convenio con la aseguradora.',
    img: imgBase64('04_nueva_poliza.png'),
    caption: 'Figura 5.0: Formulario de emisión rápida con el campo obligatorio de "% Comisión Individual" y cálculo en vivo.',
    sectionTitle: 'Pasos para emitir una póliza:',
    steps: [
      'Pulsa el botón azul <strong>"+ Emitir Nueva Póliza"</strong> en la parte superior.',
      'Escribe el <strong>Número de Póliza</strong> asignado por la compañía (ej. <code>1-2-170-0007336</code>).',
      'Selecciona el <strong>Cliente</strong> (o créalo ahí mismo con el botón rápido).',
      'Elige la <strong>Aseguradora</strong> (La Colonial, Universal, etc.) y el <strong>Ramo</strong> (Vehículo, Salud, Vida, Incendio).',
      'Indica el <strong>Monto Asegurado</strong> y la <strong>Prima Anual</strong> (ej. RD$ 25,000.00).',
      '<strong>Configura el % de Comisión:</strong> Escribe el porcentaje pactado (ej. <code>15.0</code>, <code>18.0</code> o <code>20.0</code>). El sistema te mostrará abajo automáticamente la <strong>"Comisión Estimada"</strong> en pesos o dólares.',
      'Presiona <strong>"Emitir Póliza"</strong>. Quedará guardada en la base de datos de inmediato.'
    ],
    tipTitle: '✨ Gran Ventaja:',
    tipText: 'Ya no tienes que conformarte con un porcentaje fijo por aseguradora. Cada póliza tiene su cálculo exacto para que tus reportes de ingresos nunca tengan errores.'
  },
  {
    num: 6,
    header: '6. Expediente y Detalle de la Póliza',
    title: '🔎 Consultar y Editar una Póliza',
    desc: 'Al hacer clic sobre cualquier póliza en la tabla, se abre un panel lateral a la derecha con todo su expediente digital.',
    img: imgBase64('05_poliza_detalle.png'),
    caption: 'Figura 6.0: Drawer lateral de detalles con vigencias, comisiones y opciones de edición.',
    sectionTitle: '¿Qué información puedes ver y hacer aquí?',
    steps: [
      '<strong>Datos Financieros y Comisión:</strong> Observa la prima total, el porcentaje individual configurado y la comisión ganada estimada.',
      '<strong>Control de Vigencias:</strong> Revisa la fecha de inicio original, la última renovación y la fecha exacta en que vence el contrato.',
      '<strong>Botón "Editar Póliza":</strong> Permite corregir cualquier dato: cambiar el porcentaje de comisión, actualizar la prima, cambiar de aseguradora o corregir coberturas.',
      '<strong>Historial de Movimientos:</strong> Registro de todas las renovaciones, endosos, inclusiones de vehículos o cancelaciones ocurridas a lo largo del tiempo.'
    ],
    tipTitle: '📌 ¿Cómo cambiar el porcentaje de comisión de una póliza ya creada?',
    tipText: 'Solo haz clic en <strong>"Editar Póliza"</strong> dentro de este panel, cambia el número en el campo <em>"% Comisión Individual"</em> y presiona <strong>"Guardar Cambios"</strong>.'
  },
  {
    num: 7,
    header: '7. Módulo de Cobros y Pagos',
    title: '💰 Cobros y Emisión de Recibos Oficiales',
    desc: 'En este módulo llevas el control estricto de los cobros realizados a los clientes y las cuotas pendientes de pago.',
    img: imgBase64('06_cobros.png'),
    caption: 'Figura 7.0: Control de cobros con estados Pagado/Pendiente y generación de recibos PDF.',
    sectionTitle: '¿Cómo registrar un cobro y emitir su recibo?',
    steps: [
      'Haz clic en <strong>"+ Registrar Cobro"</strong>.',
      'Selecciona el cliente y la póliza correspondiente.',
      'Indica el monto cobrado (en pesos RD$ o dólares US$) y la fecha de pago.',
      'Marca el estado como <strong>"Pagado"</strong> y guarda el cobro.',
      '<strong>Descargar Recibo Oficial:</strong> En la tabla de cobros, haz clic en el botón con ícono de documento al lado del pago. El sistema generará y descargará inmediatamente un <strong>Recibo Oficial en PDF</strong> con el membrete de Santiago Morales & Asociados listo para enviar al cliente.'
    ],
    tipTitle: '📄 Beneficio para el cliente:',
    tipText: 'El recibo en PDF incluye número de comprobante, aseguradora, número de póliza, fecha y sello de pagado, brindando total tranquilidad y formalidad.'
  },
  {
    num: 8,
    header: '8. Reporte de Comisiones',
    title: '📈 Reportes de Comisiones Exactos',
    desc: 'Este reporte calcula exactamente cuánto dinero le corresponde a la correduría por cada cobro recibido, utilizando el porcentaje individual de cada póliza.',
    img: imgBase64('07_comisiones.png'),
    caption: 'Figura 8.0: Resumen financiero por aseguradora con exportación a Excel, PDF y Google Drive.',
    sectionTitle: '¿Cómo analizar las comisiones de tu negocio?',
    steps: [
      '<strong>Selecciona el período:</strong> Usa los botones rápidos (<em>Este Mes</em>, <em>Mes Anterior</em>, <em>Año Actual</em>) o elige fechas específicas de inicio y fin.',
      '<strong>Filtro por Cartera:</strong> Puedes ver las comisiones globales o filtrar únicamente por la cartera de <em>Santiago Morales y Asociados</em> o de <em>Raquel Rodríguez</em>.',
      '<strong>Ver desglose de clientes:</strong> Haz clic en cualquier aseguradora (ej. La Colonial de Seguros) para desplegar la lista de todos los cobros individuales con su prima, su <strong>% individual</strong> y su comisión generada.',
      '<strong>Exportar a Excel o PDF:</strong> Pulsa el botón de descarga para tener el reporte en tu computadora o subirlo directamente a la nube de Google Drive.'
    ],
    tipTitle: '📊 Tasa Promedio Ponderada:',
    tipText: 'En la tabla principal verás la columna <strong>"% Promedio"</strong> para cada aseguradora. Esta tasa refleja el promedio real de comisiones generado según el mix de pólizas vendidas.'
  },
  {
    num: 9,
    header: '9. Aseguradoras y Contactos',
    title: '🏢 Directorio de Aseguradoras',
    desc: 'Tu agenda corporativa con todas las compañías de seguros de la República Dominicana, sus contactos clave y sus estadísticas de producción.',
    img: imgBase64('08_companias.png'),
    caption: 'Figura 9.0: Tarjetas corporativas de aseguradoras con contactos de ejecutivos y líneas directas.',
    sectionTitle: '¿Para qué sirve este módulo?',
    steps: [
      '<strong>Contactos de Emergencia:</strong> Acceso inmediato a los números de grúa, asistencia vial, autorizaciones médicas y cabina de siniestros de cada compañía.',
      '<strong>Ejecutivos y Suscriptores:</strong> Nombre, celular, correo y departamento de las personas que atienden tus casos en cada aseguradora.',
      '<strong>Métricas Reales por Compañía:</strong> Muestra cuántas pólizas activas tenemos en cada aseguradora, primas totales emitidas y comisiones cobradas calculadas póliza por póliza.',
      '<strong>Botón "+ Agregar Aseguradora":</strong> Si comienzas a trabajar con una nueva empresa o cooperativa de seguros, puedes registrarla con su logotipo en un instante.'
    ],
    tipTitle: '📞 Botón de llamada rápida:',
    tipText: 'Al hacer clic en el botón <strong>"Contactos"</strong> de cualquier tarjeta, puedes copiar el correo electrónico o marcar el teléfono del suscriptor con un solo clic.'
  },
  {
    num: 10,
    header: '10. Solicitudes y Cartas',
    title: '📬 Emisión de Solicitudes Formales',
    desc: 'Genera cartas y comunicaciones oficiales dirigidas a las aseguradoras para tramitar cotizaciones, inclusiones, exclusiones o cancelaciones.',
    img: imgBase64('09_solicitudes.png'),
    caption: 'Figura 10.0: Panel de cartas de solicitud con generación de documentos membretados.',
    sectionTitle: '¿Cómo crear una carta formal en segundos?',
    steps: [
      'Haz clic en <strong>"+ Nueva Solicitud"</strong>.',
      'Selecciona el cliente y la compañía aseguradora a la que va dirigida la carta.',
      'Elige el tipo de trámite (Cotización de póliza, Carta de nombramiento, Solicitud de cambio o Reclamación).',
      'Escribe los detalles o especificaciones que exige la compañía.',
      'Presiona <strong>"Generar Carta PDF"</strong>. El sistema creará un documento formal con membrete y firma listo para imprimir o enviar por correo electrónico.'
    ],
    tipTitle: '💡 Tip:',
    tipText: 'Las cartas generadas quedan archivadas en el historial de solicitudes para que siempre tengas evidencia de la fecha y hora en que se envió el trámite.'
  },
  {
    num: 11,
    header: '11. Siniestros y Reclamos',
    title: '🛡️ Seguimiento de Siniestros y Reclamaciones',
    desc: 'El momento de la verdad en los seguros es cuando ocurre un siniestro. Este módulo te permite acompañar a tu cliente desde el primer reporte hasta el pago de la indemnización.',
    img: imgBase64('10_siniestros.png'),
    caption: 'Figura 11.0: Registro de accidentes y reclamaciones con seguimiento de estatus.',
    sectionTitle: '¿Cómo registrar y dar seguimiento a un siniestro?',
    steps: [
      '<strong>Registrar el reporte:</strong> Pulsa <strong>"+ Reportar Siniestro"</strong> cuando un cliente te notifique un choque, robo, enfermedad o daño.',
      '<strong>Asociar a la Póliza:</strong> Elige la póliza afectada. El sistema traerá automáticamente el nombre del asegurado y la compañía aseguradora.',
      '<strong>Detalles del hecho:</strong> Anota la fecha, lugar, descripción del accidente y número de reclamación asignado por la aseguradora.',
      '<strong>Actualizar el Estado:</strong> Conforme la aseguradora avance, cambia el estado a <em>"En Evaluación"</em>, <em>"Taller Asignado"</em>, <em>"Indemnizado"</em> o <em>"Cerrado"</em>.'
    ],
    tipTitle: '⚠️ Atención especial:',
    tipText: 'Las pólizas con siniestros activos muestran automáticamente un distintivo rojo en el listado de pólizas para que todo el equipo recuerde darles seguimiento constante.'
  },
  {
    num: 12,
    header: '12. Configuración y Copia de Seguridad',
    title: '⚙️ Configuración y Respaldo de Datos',
    desc: 'La seguridad de la información es primordial. En esta sección puedes descargar copias de respaldo de todos tus datos y gestionar los códigos de corredor.',
    img: imgBase64('11_configuracion.png'),
    caption: 'Figura 12.0: Panel de configuración y descarga de copias de seguridad en Excel.',
    sectionTitle: '¿Cómo hacer una copia de seguridad en Excel?',
    steps: [
      'Entra al menú <strong>"Configuración"</strong> en la barra lateral.',
      'Busca la sección <strong>"Copia de Seguridad y Respaldo"</strong>.',
      'Haz clic en el botón verde <strong>"Descargar Respaldo Completo (.xlsx)"</strong>.',
      'Se descargará un libro de Excel con hojas separadas para: <em>Pólizas (con su % de comisión)</em>, <em>Clientes</em>, <em>Cobros</em>, <em>Siniestros</em>, <em>Aseguradoras</em> y <em>Códigos de Cartera</em>.'
    ],
    tipTitle: '🔒 Recomendación de Seguridad:',
    tipText: 'Descarga un respaldo en Excel todos los viernes antes de cerrar la oficina y guárdalo en un disco externo o en tu Google Drive. Así tendrás tu negocio protegido ante cualquier eventualidad.'
  }
];

let pagesHtml = '';

// PORTADA
pagesHtml += `
  <div class="page cover-page">
    <div class="cover-container">
      <div class="cover-badge">Manual e Instructivo Oficial de Capacitación</div>
      <h1 class="cover-title">Santiago Morales & Asociados<br><span>Sistema de Gestión de Seguros</span></h1>
      <p class="cover-subtitle">
        Guía práctica ilustrada diseñada para todo el personal de la empresa. Explicación paso a paso de cada módulo, funciones diarias, emisión de pólizas, cobros y reportes de comisiones.
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
          <span class="cover-meta-label">Base de Datos:</span>
          <span class="cover-meta-val">PostgreSQL & Hasura GraphQL en Servidor Local</span>
        </div>
        <div class="cover-meta-item">
          <span class="cover-meta-label">Edición:</span>
          <span class="cover-meta-val">Versión 2026 (Comisiones Individuales por Póliza)</span>
        </div>
      </div>

      <div style="font-size: 13px; color: #64748b; max-width: 520px; line-height: 1.5;">
        <em>"Este manual está redactado de manera clara y sencilla para que cualquier miembro del equipo, sin importar su edad o experiencia tecnológica, domine el uso diario de la plataforma."</em>
      </div>
    </div>
  </div>
`;

// PAGINAS DE CONTENIDO
for (const p of pages) {
  pagesHtml += `
  <div class="page">
    <div class="header-bar">
      <span class="header-title">${p.header}</span>
      <span class="header-subtitle">Santiago Morales & Asociados</span>
    </div>

    <h1>${p.title}</h1>
    <p>${p.desc}</p>

    <div class="screen-container">
      <img src="${p.img}" class="screen-img" alt="${p.title}" />
      <div class="screen-caption">${p.caption}</div>
    </div>

    <h2>${p.sectionTitle}</h2>
    <ul class="steps-list">
      ${p.steps.map((st, i) => `
        <li>
          <span class="step-num">${i + 1}</span>
          <div>${st}</div>
        </li>
      `).join('')}
    </ul>

    <div class="callout callout-tip">
      <span class="callout-title">${p.tipTitle}</span>
      <div>${p.tipText}</div>
    </div>

    <div class="footer-bar">
      <span>Manual de Uso Oficial · Sistema de Seguros</span>
      <span>Página ${p.num}</span>
    </div>
  </div>
  `;
}

// PAGINA 13: PREGUNTAS FRECUENTES Y AYUDA
pagesHtml += `
  <div class="page">
    <div class="header-bar">
      <span class="header-title">13. Preguntas Frecuentes y Consejos</span>
      <span class="header-subtitle">Santiago Morales & Asociados</span>
    </div>

    <h1>❓ Preguntas Frecuentes y Ayuda Rápida</h1>
    <p>Respuestas claras a las dudas más comunes que surgen en el trabajo cotidiano de la oficina.</p>

    <div style="display: flex; flex-direction: column; gap: 12px; margin-top: 14px;">
      <div class="feature-box">
        <strong style="color: #1e3a8a; font-size: 13.5px;">1. ¿Qué hago si una póliza cambió de prima o de porcentaje de comisión?</strong>
        <span style="font-size: 12.5px; color: #334155; margin-top: 4px; display: block;">
          Ve al menú <strong>Pólizas</strong>, haz clic sobre la póliza para abrir el panel lateral y pulsa el botón <strong>"Editar Póliza"</strong>. Cambia el monto o el % de comisión y presiona <strong>"Guardar Cambios"</strong>. Se actualizará inmediatamente en todo el sistema y en los reportes.
        </span>
      </div>

      <div class="feature-box">
        <strong style="color: #1e3a8a; font-size: 13.5px;">2. ¿Por qué el reporte de comisiones ya no me pide configurar tasas fijas por aseguradora?</strong>
        <span style="font-size: 12.5px; color: #334155; margin-top: 4px; display: block;">
          Porque ahora las comisiones son <strong>individuales por póliza</strong>. Cada póliza tiene su propio porcentaje pactado, por lo que el sistema calcula el dinero exacto sumando las comisiones reales de cada cobro, eliminando discrepancias.
        </span>
      </div>

      <div class="feature-box">
        <strong style="color: #1e3a8a; font-size: 13.5px;">3. ¿Cómo sé si un cliente tiene pagos pendientes o retrasados?</strong>
        <span style="font-size: 12.5px; color: #334155; margin-top: 4px; display: block;">
          En el menú <strong>Pólizas</strong>, haz clic en la pestaña <strong>"Pendiente de Pago"</strong> en la parte superior. También puedes revisar el menú <strong>Cobros</strong> para ver todas las facturas en estado "Pendiente".
        </span>
      </div>

      <div class="feature-box">
        <strong style="color: #1e3a8a; font-size: 13.5px;">4. ¿Cómo envío un recibo de cobro a un cliente por WhatsApp?</strong>
        <span style="font-size: 12.5px; color: #334155; margin-top: 4px; display: block;">
          En el menú <strong>Cobros</strong>, pulsa el botón de documento para descargar el recibo en formato PDF en tu computadora. Luego solo abre WhatsApp Web y adjunta el archivo PDF al chat del cliente.
        </span>
      </div>

      <div class="feature-box">
        <strong style="color: #1e3a8a; font-size: 13.5px;">5. ¿Puedo utilizar el sistema desde una Tablet o teléfono móvil?</strong>
        <span style="font-size: 12.5px; color: #334155; margin-top: 4px; display: block;">
          Sí. El sistema tiene un diseño adaptable (responsive). Puedes abrir el navegador desde cualquier teléfono o iPad y consultar pólizas o clientes con total comodidad.
        </span>
      </div>
    </div>

    <div style="margin-top: 25px; padding: 16px; background: #f8fafc; border: 1.5px solid #cbd5e1; border-radius: 12px; text-align: center;">
      <h3 style="margin: 0 0 6px 0; color: #0f172a; font-size: 14px;">¿Necesitas asistencia técnica o soporte adicional?</h3>
      <p style="margin: 0; color: #64748b; font-size: 12px;">
        Comunícate con la administración de <strong>Santiago Morales y Asociados, S.R.L.</strong><br>
        Santo Domingo, República Dominicana · Soporte de Base de Datos Local Hasura PostgreSQL
      </p>
    </div>

    <div class="footer-bar">
      <span>Manual de Uso Oficial · Sistema de Seguros</span>
      <span>Página 13</span>
    </div>
  </div>
`;

const fullHtml = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Manual de Usuario - Santiago Morales y Asociados</title>
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
      height: 255mm;
      max-height: 255mm;
      overflow: hidden;
      padding-bottom: 22px;
    }
    .page:last-child { page-break-after: auto; }
    .header-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px solid #1e3a8a;
      padding-bottom: 5px;
      margin-bottom: 10px;
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
      font-size: 30px;
      font-weight: 900;
      color: #0f172a;
      line-height: 1.15;
      margin: 0 0 10px 0;
    }
    .cover-title span { color: #b58c5c; }
    .cover-subtitle {
      font-size: 15px;
      color: #475569;
      max-width: 600px;
      margin: 0 auto 20px auto;
      font-weight: 500;
    }
    .cover-card {
      background: #f8fafc;
      border: 1.5px solid #e2e8f0;
      border-radius: 12px;
      padding: 16px 24px;
      max-width: 520px;
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
      font-size: 18px;
      font-weight: 900;
      color: #0f172a;
      margin: 0 0 5px 0;
    }
    h2 {
      font-size: 13.5px;
      font-weight: 800;
      color: #1e3a8a;
      margin: 8px 0 4px 0;
    }
    p { margin: 0 0 6px 0; color: #334155; }
    .screen-container {
      margin: 8px 0 10px 0;
      border-radius: 8px;
      overflow: hidden;
      border: 1.5px solid #cbd5e1;
      background: #f8fafc;
      text-align: center;
    }
    .screen-img {
      width: 100%;
      max-height: 330px;
      object-fit: contain;
      display: block;
      background: #f1f5f9;
    }
    .screen-caption {
      background: #f8fafc;
      padding: 4px 8px;
      font-size: 10px;
      color: #475569;
      font-weight: 700;
      border-top: 1px solid #e2e8f0;
      text-align: left;
    }
    .steps-list {
      list-style: none;
      padding: 0;
      margin: 0 0 8px 0;
    }
    .steps-list li {
      display: flex;
      align-items: flex-start;
      gap: 7px;
      margin-bottom: 5px;
      font-size: 12px;
    }
    .step-num {
      background: #1e3a8a;
      color: #ffffff;
      width: 18px;
      height: 18px;
      border-radius: 50%;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 10px;
      font-weight: 800;
      flex-shrink: 0;
      margin-top: 1px;
    }
    .callout {
      border-radius: 6px;
      padding: 6px 10px;
      margin: 8px 0;
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
    .callout-title { font-weight: 800; margin-bottom: 2px; display: block; }
    .feature-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 6px 10px;
    }
  </style>
</head>
<body>
  ${pagesHtml}
</body>
</html>`;

fs.writeFileSync(HTML_OUT, fullHtml, 'utf8');
console.log('HTML generado correctamente en: ' + HTML_OUT);

async function generatePdf() {
  console.log('Iniciando Puppeteer con Microsoft Edge...');
  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });

  const page = await browser.newPage();
  const fileUrl = 'file:///' + HTML_OUT.replace(/\\/g, '/');
  console.log('Cargando HTML en navegador: ' + fileUrl);
  await page.goto(fileUrl, { waitUntil: 'networkidle0' });

  console.log('Exportando a archivo PDF...');
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
    console.log('====================================');
    console.log('EXITO TOTAL: PDF CREADO SATISFACTORIAMENTE');
    console.log('Archivo: ' + PDF_OUT);
    console.log('Tamano: ' + Math.round(stats.size / 1024) + ' KB');
    console.log('====================================');
  } else {
    console.error('El archivo PDF no se encontro despues de la exportacion.');
  }
}

generatePdf();
