import jsPDF from 'jspdf';
import { formatDateToDDMMYYYY, formatMoney } from '../utils/policyHelpers.js';
import { loadImageAsBase64 } from './receiptPdfService.js';

/**
 * Retorna la fecha en formato extendido formal en español
 * Ej: "20 de agosto de 2026"
 */
export const formatExtendedSpanishDate = (dateStr) => {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-');
  const months = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
  ];
  const mIndex = parseInt(month, 10) - 1;
  const dNum = parseInt(day, 10);
  return `${dNum} de ${months[mIndex] || ''} de ${year}`;
};

/**
 * Obtiene el código de agente correspondiente para la aseguradora y cartera
 */
export const getAgentCodeForLetter = (insurerName = '', carteraName = '', agentCodes = []) => {
  const normInsurer = (insurerName || '').toLowerCase().trim();
  const isRaquel = (carteraName || '').toLowerCase().includes('raquel');

  const matched = agentCodes.find(ac => {
    const acInsurer = (ac.insurer || '').toLowerCase().trim();
    const acAgent = (ac.agent || '').toLowerCase().trim();
    if (isRaquel) {
      return acAgent.includes('raquel') && normInsurer.includes(acInsurer.split(' ')[0]);
    } else {
      return (acAgent.includes('santiago') || acAgent.includes('morales')) && normInsurer.includes(acInsurer.split(' ')[0]);
    }
  });

  if (matched?.code) return matched.code;

  if (isRaquel && normInsurer.includes('colonial')) return '897';
  if (!isRaquel && normInsurer.includes('humano')) return '76713';
  if (!isRaquel && normInsurer.includes('colonial')) return '8055';

  return 'N/A';
};

/**
 * Construye los datos y textos estructurados para el formato de carta de solicitud
 */
export const buildRequestLetterData = (request, client = {}, policy = {}, agentCodes = []) => {
  const isRaquel = (request.cartera || '').toLowerCase().includes('raquel');
  const insurer = request.insurer || policy.insurer || 'La Colonial de Seguros';
  const agentCode = getAgentCodeForLetter(insurer, request.cartera, agentCodes);

  const clientName = (request.client || client.name || 'Cliente').toUpperCase();
  const clientDoc = client.documentId || client.cedula_rnc || 'N/A';
  const policyNum = request.policy || policy.id || policy.numero_poliza || 'N/A';
  const ramo = request.ramo || policy.type || request.subtype || 'Seguro General';

  const reqDate = request.requestDate || new Date().toISOString().split('T')[0];
  const effDate = request.effectiveDate || reqDate;
  const spanishDate = formatExtendedSpanishDate(reqDate);
  const spanishEffDate = formatExtendedSpanishDate(effDate);

  const brokerName = isRaquel
    ? 'RAQUEL RODRÍGUEZ'
    : 'SANTIAGO MORALES Y ASOCIADOS, S.R.L.';
  const brokerTitle = isRaquel
    ? 'Asesora Profesional de Seguros'
    : 'Corredores & Asesores de Seguros';
  const brokerRnc = isRaquel ? 'Céd. 001-0000000-0' : 'RNC: 1-31-98765-4';
  const brokerContact = isRaquel
    ? 'Tel: (809) 555-0199 · Correo: raquel.rodriguez@seguros.com.do'
    : 'Av. 27 de Febrero, Santo Domingo, D.N. · Tel: (809) 555-0100 · info@santiagomorales.com.do';

  let subject = '';
  let department = '';
  let greeting = 'Distinguidos señores:';
  let introParagraph = '';
  let bodyParagraphs = [];
  let closingParagraph = '';

  if (request.type === 'Emisión') {
    subject = `SOLICITUD DE EMISIÓN DE PÓLIZA NUEVA — RAMO ${ramo.toUpperCase()} — ${clientName}`;
    department = 'Departamento de Suscripción y Emisiones';
    introParagraph = `Cortésmente nos dirigimos a ustedes con el propósito de solicitar la emisión de una nueva póliza de seguros en el ramo de ${ramo}, a favor de nuestro cliente ${clientName}, con vigencia efectiva a partir del ${spanishEffDate}.`;

    const details = [];
    if (request.subtype) details.push(`Modalidad / Trámite: ${request.subtype}`);
    if (request.estimatedAmountNum) details.push(`Prima Anual Estimada: ${formatMoney(request.estimatedAmountNum)}`);
    if (request.description) details.push(`Especificaciones y Coberturas:\n${request.description}`);

    bodyParagraphs = details;
    closingParagraph = 'Agradecemos de antemano la debida atención a esta solicitud y quedamos a la espera de la carátula de póliza y factura correspondiente para su entrega formal al asegurado.';
  } else if (request.type === 'Cambio en Póliza') {
    subject = `SOLICITUD DE ENDOSO / MODIFICACIÓN A PÓLIZA NO. ${policyNum} — ${clientName}`;
    department = 'Departamento de Operaciones y Endosos';
    introParagraph = `Por medio de la presente, tenemos a bien solicitarles la aplicación formal del endoso de modificación para la póliza de la referencia No. ${policyNum} (${ramo}), correspondiente a nuestro mutuo cliente ${clientName}, con fecha de efectividad a partir del ${spanishEffDate}.`;

    const details = [];
    if (request.subtype) details.push(`Tipo de Modificación: ${request.subtype}`);
    if (request.description) details.push(`Detalle de los Cambios Solicitados:\n${request.description}`);
    if (request.endorsementNumber) details.push(`No. de Endoso Solicitado / Referencia: ${request.endorsementNumber}`);

    bodyParagraphs = details;
    closingParagraph = 'Agradecemos emitir el endoso correspondiente y remitirnos copia del documento expedido, así como cualquier ajuste o reliquidación de prima que aplique.';
  } else {
    // Cancelación
    subject = `SOLICITUD DE CANCELACIÓN FORMAL DE PÓLIZA NO. ${policyNum} — ${clientName}`;
    department = 'Departamento de Cancelaciones y Cartera';
    introParagraph = `Por la presente comunicación, formalizamos ante ustedes la solicitud de cancelación definitiva de la póliza de referencia No. ${policyNum} (${ramo}), emitida a nombre de ${clientName}, con efectividad formal a partir del ${spanishEffDate}.`;

    const details = [];
    if (request.reason || request.subtype) details.push(`Motivo de la Cancelación: ${request.reason || request.subtype}`);
    if (request.estimatedRefundNum) details.push(`Devolución de Prima Solicitada / Estimada: ${formatMoney(request.estimatedRefundNum)}`);
    if (request.description) details.push(`Instrucciones Adicionales:\n${request.description}`);

    bodyParagraphs = details;
    closingParagraph = 'Agradecemos procesar la anulación de la póliza y proceder con la expedición del comprobante de cancelación, así como la liquidación y devolución de la prima no devengada a favor del asegurado según aplique.';
  }

  return {
    requestId: request.id,
    requestType: request.type,
    subtype: request.subtype,
    spanishDate,
    spanishEffDate,
    brokerName,
    brokerTitle,
    brokerRnc,
    brokerContact,
    insurer,
    agentCode,
    department,
    clientName,
    clientDoc,
    policyNum,
    ramo,
    subject,
    greeting,
    introParagraph,
    bodyParagraphs,
    closingParagraph,
    attachments: request.attachments || [],
  };
};

/**
 * Genera el documento PDF formal de la Carta de Solicitud utilizando jsPDF
 */
export const generateRequestLetterPdf = async (request, client = {}, policy = {}, agentCodes = []) => {
  const data = buildRequestLetterData(request, client, policy, agentCodes);

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const primaryColor = [69, 26, 3]; // #451a03 Dark Brown
  const accentColor = [217, 119, 6]; // #d97706 Gold
  const slateDark = [30, 41, 59]; // #1e293b
  const slateMuted = [100, 116, 139]; // #64748b

  // 1. Franja Superior Corporativa
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, 210, 8, 'F');
  doc.setFillColor(...accentColor);
  doc.rect(0, 8, 210, 2.5, 'F');

  // 2. Encabezado / Letterhead
  let currentY = 20;
  const logoBase64 = await loadImageAsBase64('/logo.png');

  if (logoBase64 && !data.brokerName.includes('RAQUEL')) {
    try {
      doc.addImage(logoBase64, 'PNG', 18, currentY, 20, 20);
    } catch (e) {}
  }

  const headerLeftX = (logoBase64 && !data.brokerName.includes('RAQUEL')) ? 42 : 18;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...primaryColor);
  doc.text(data.brokerName, headerLeftX, currentY + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...slateMuted);
  doc.text(data.brokerTitle.toUpperCase(), headerLeftX, currentY + 10);
  doc.text(`${data.brokerRnc} · Superintendencia de Seguros`, headerLeftX, currentY + 14.5);
  doc.text(data.brokerContact, headerLeftX, currentY + 19);

  // Cuadro de Control / Solicitud No.
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(140, currentY, 52, 20, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...primaryColor);
  doc.text('SOLICITUD DE TRÁMITE', 166, currentY + 5, { align: 'center' });

  doc.setFontSize(10.5);
  doc.setTextColor(...accentColor);
  doc.text(data.requestId, 166, currentY + 11.5, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...slateMuted);
  doc.text(`Cód. Agente: ${data.agentCode}`, 166, currentY + 16.5, { align: 'center' });

  // Línea Divisoria Decorativa
  currentY += 27;
  doc.setDrawColor(226, 232, 240);
  doc.line(18, currentY, 192, currentY);

  // 3. Lugar y Fecha
  currentY += 8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(...slateDark);
  doc.text(`Santo Domingo, D.N., ${data.spanishDate}`, 18, currentY);

  // 4. Destinatario
  currentY += 9;
  doc.setFont('helvetica', 'bold');
  doc.text('Señores:', 18, currentY);
  currentY += 5;
  doc.setFontSize(10.5);
  doc.setTextColor(...primaryColor);
  doc.text(data.insurer.toUpperCase(), 18, currentY);

  currentY += 4.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(...slateDark);
  doc.text(`Atención: ${data.department}`, 18, currentY);
  currentY += 4.5;
  doc.text('Ciudad.', 18, currentY);

  // 5. Asunto Destacado
  currentY += 8;
  doc.setFillColor(254, 243, 199); // #fef3c7
  doc.setDrawColor(...accentColor);
  doc.setLineWidth(0.3);
  doc.roundedRect(18, currentY, 174, 10, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...primaryColor);
  const splitSubject = doc.splitTextToSize(`ASUNTO: ${data.subject}`, 168);
  doc.text(splitSubject, 22, currentY + 6.5);

  // 6. Saludo
  currentY += 16;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(...slateDark);
  doc.text(data.greeting, 18, currentY);

  // 7. Párrafo Introductorio
  currentY += 6;
  const splitIntro = doc.splitTextToSize(data.introParagraph, 174);
  doc.text(splitIntro, 18, currentY);
  currentY += splitIntro.length * 4.8 + 3;

  // 8. Cuadro de Especificaciones y Detalles
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.2);

  const startBoxY = currentY;
  let boxContentY = currentY + 6;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...primaryColor);
  doc.text('DETALLES DE LA SOLICITUD:', 24, boxContentY);
  boxContentY += 5.5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...slateDark);

  data.bodyParagraphs.forEach(para => {
    const lines = doc.splitTextToSize(para, 162);
    doc.text(lines, 24, boxContentY);
    boxContentY += lines.length * 4.6 + 2;
  });

  const boxHeight = boxContentY - startBoxY + 3;
  doc.roundedRect(18, startBoxY, 174, boxHeight, 2, 2, 'D');
  currentY = startBoxY + boxHeight + 6;

  // 9. Párrafo de Cierre
  const splitClosing = doc.splitTextToSize(data.closingParagraph, 174);
  doc.text(splitClosing, 18, currentY);
  currentY += splitClosing.length * 4.8 + 4;

  // 10. Documentos Adjuntos (si aplica)
  if (data.attachments && data.attachments.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...slateMuted);
    doc.text('Documentos Anexos:', 18, currentY);
    currentY += 4.5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    data.attachments.forEach(att => {
      doc.text(`•  ${att}`, 24, currentY);
      currentY += 4;
    });
    currentY += 4;
  }

  // 11. Despedida y Firmas
  currentY = Math.max(currentY + 6, 230);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(...slateDark);
  doc.text('Atentamente,', 18, currentY);

  // Línea de Firma Asesor / Corredor
  currentY += 18;
  doc.setDrawColor(...slateDark);
  doc.line(18, currentY, 90, currentY);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...primaryColor);
  doc.text(data.brokerName, 18, currentY + 4.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...slateMuted);
  doc.text(data.brokerTitle, 18, currentY + 8.5);
  doc.text(`Código de Agente Aseguradora: ${data.agentCode}`, 18, currentY + 12.5);

  // Línea de Firma del Cliente (Derecha)
  doc.line(122, currentY, 192, currentY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...slateDark);
  const shortClient = doc.splitTextToSize(data.clientName, 70);
  doc.text(shortClient, 122, currentY + 4.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...slateMuted);
  doc.text('Firma / Sello del Solicitante', 122, currentY + 8.5 + (shortClient.length > 1 ? 3 : 0));
  doc.text(`Doc: ${data.clientDoc}`, 122, currentY + 12.5 + (shortClient.length > 1 ? 3 : 0));

  // 12. Pie de Página Corporativo
  doc.setFillColor(...primaryColor);
  doc.rect(0, 290, 210, 7, 'F');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text('Santiago Morales & Asoc. · Sistema de Gestión y Trámites de Seguros', 105, 294.5, { align: 'center' });

  // Descargar o guardar PDF
  const filename = `Carta_Solicitud_${data.requestId}_${data.clientName.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 20)}.pdf`;
  doc.save(filename);
};

/**
 * Abre ventana de impresión con formato formal HTML
 */
export const printRequestLetter = (request, client = {}, policy = {}, agentCodes = []) => {
  const data = buildRequestLetterData(request, client, policy, agentCodes);

  const printWindow = window.open('', '_blank', 'width=850,height=950');
  if (!printWindow) {
    alert('Por favor habilite las ventanas emergentes (popups) para imprimir la carta.');
    return;
  }

  const htmlContent = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Carta de Solicitud - ${data.requestId}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 15mm 18mm 15mm 18mm;
    }
    body {
      font-family: 'Segoe UI', Arial, Helvetica, sans-serif;
      color: #1e293b;
      line-height: 1.5;
      font-size: 13.5px;
      margin: 0;
      padding: 0;
      background-color: #fff;
    }
    .header-bar {
      height: 8px;
      background-color: #451a03;
    }
    .header-subbar {
      height: 3px;
      background-color: #d97706;
      margin-bottom: 20px;
    }
    .letterhead {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 1.5px solid #e2e8f0;
      padding-bottom: 15px;
      margin-bottom: 20px;
    }
    .broker-info h1 {
      margin: 0;
      font-size: 18px;
      color: #451a03;
      font-weight: 800;
      letter-spacing: -0.3px;
    }
    .broker-info .subtitle {
      font-size: 11px;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
      margin-top: 2px;
    }
    .broker-info .details {
      font-size: 10.5px;
      color: #64748b;
      margin-top: 4px;
    }
    .control-box {
      border: 1px solid #cbd5e1;
      background-color: #f8fafc;
      border-radius: 6px;
      padding: 8px 14px;
      text-align: center;
    }
    .control-box .tag {
      font-size: 10px;
      font-weight: 800;
      color: #451a03;
      text-transform: uppercase;
    }
    .control-box .id {
      font-size: 15px;
      font-weight: 800;
      color: #d97706;
      font-family: monospace;
      margin: 2px 0;
    }
    .control-box .code {
      font-size: 9.5px;
      color: #64748b;
    }
    .date-row {
      margin-bottom: 18px;
      font-size: 13.5px;
      color: #334155;
    }
    .addressee {
      margin-bottom: 18px;
    }
    .addressee .company {
      font-size: 15px;
      font-weight: 800;
      color: #451a03;
    }
    .subject-box {
      background-color: #fef3c7;
      border: 1px solid #fcd34d;
      border-radius: 4px;
      padding: 9px 14px;
      font-weight: 800;
      font-size: 12.5px;
      color: #78350f;
      margin-bottom: 20px;
    }
    .letter-body p {
      margin: 0 0 12px 0;
      text-align: justify;
    }
    .details-box {
      border: 1px solid #cbd5e1;
      background-color: #f8fafc;
      border-radius: 6px;
      padding: 12px 16px;
      margin: 15px 0;
    }
    .details-box .title {
      font-size: 11.5px;
      font-weight: 800;
      color: #451a03;
      text-transform: uppercase;
      margin-bottom: 8px;
    }
    .details-box ul {
      margin: 0;
      padding-left: 18px;
    }
    .details-box li {
      margin-bottom: 6px;
      font-size: 13px;
      white-space: pre-line;
    }
    .attachments {
      margin-top: 15px;
      font-size: 11.5px;
      color: #475569;
    }
    .attachments strong {
      color: #1e293b;
    }
    .signatures {
      margin-top: 50px;
      display: flex;
      justify-content: space-between;
      gap: 40px;
    }
    .sig-block {
      flex: 1;
      border-top: 1.5px solid #1e293b;
      padding-top: 6px;
    }
    .sig-block .name {
      font-weight: 800;
      font-size: 13px;
      color: #451a03;
    }
    .sig-block .role {
      font-size: 10.5px;
      color: #64748b;
    }
    .footer-bar {
      margin-top: 35px;
      border-top: 1px solid #e2e8f0;
      padding-top: 8px;
      text-align: center;
      font-size: 10px;
      color: #94a3b8;
    }
    @media print {
      body {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    }
  </style>
</head>
<body>
  <div class="header-bar"></div>
  <div class="header-subbar"></div>

  <div class="letterhead">
    <div class="broker-info">
      <h1>${data.brokerName}</h1>
      <div class="subtitle">${data.brokerTitle}</div>
      <div class="details">
        ${data.brokerRnc} · Reg. Superintendencia de Seguros<br>
        ${data.brokerContact}
      </div>
    </div>
    <div class="control-box">
      <div class="tag">Solicitud de Trámite</div>
      <div class="id">${data.requestId}</div>
      <div class="code">Cód. Agente: <strong>${data.agentCode}</strong></div>
    </div>
  </div>

  <div class="date-row">
    Santo Domingo, D.N., ${data.spanishDate}
  </div>

  <div class="addressee">
    <strong>Señores:</strong><br>
    <div class="company">${data.insurer}</div>
    <div>Atención: <strong>${data.department}</strong></div>
    <div>Ciudad.</div>
  </div>

  <div class="subject-box">
    ASUNTO: ${data.subject}
  </div>

  <div class="letter-body">
    <p>${data.greeting}</p>
    <p>${data.introParagraph}</p>

    <div class="details-box">
      <div class="title">Detalles de la Operación</div>
      <ul>
        ${data.bodyParagraphs.map(p => `<li>${p}</li>`).join('')}
      </ul>
    </div>

    <p>${data.closingParagraph}</p>

    ${data.attachments.length > 0 ? `
      <div class="attachments">
        <strong>Documentos Anexos:</strong> ${data.attachments.join(' · ')}
      </div>
    ` : ''}

    <div class="signatures">
      <div class="sig-block">
        <div class="name">${data.brokerName}</div>
        <div class="role">${data.brokerTitle}</div>
        <div class="role">Código de Asegurador: <strong>${data.agentCode}</strong></div>
      </div>
      <div class="sig-block">
        <div class="name">${data.clientName}</div>
        <div class="role">Firma / Sello del Solicitante</div>
        <div class="role">Cédula / RNC: <strong>${data.clientDoc}</strong></div>
      </div>
    </div>

    <div class="footer-bar">
      Santiago Morales & Asoc. · Sistema de Gestión y Trámites de Seguros
    </div>
  </div>

  <script>
    window.onload = function() {
      window.print();
    };
  </script>
</body>
</html>
  `;

  printWindow.document.open();
  printWindow.document.write(htmlContent);
  printWindow.document.close();
};
