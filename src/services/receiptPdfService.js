import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatDateToDDMMYYYY, formatMoney } from '../utils/policyHelpers.js';
import { numberToWordsSpanish } from '../utils/numberToWordsSpanish.js';

/**
 * Carga una imagen de URL a Base64 para jsPDF
 */
export const loadImageAsBase64 = (url) => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        const dataURL = canvas.toDataURL('image/png');
        resolve(dataURL);
      } catch (e) {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
};

/**
 * Genera el documento jsPDF del Recibo Oficial de Pago / Efectivo
 */
export const generateReceiptPdf = async (payment, policy = {}, client = {}) => {
  // Formato A4 Vertical (210 x 297 mm)
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Solo es multi-póliza si NO es un subpago individual de una póliza y explícitamente es master payment o lista consolidada sin policyId específico
  const isMulti = !payment.isSubPayment && !!(
    payment.isMasterPayment || 
    (payment.isMultiPolicy && !payment.policyId) ||
    (payment.items && payment.items.length > 1 && !payment.policyId) ||
    (payment.policiesBreakdown && payment.policiesBreakdown.length > 1 && !payment.policyId)
  );
  const items = isMulti ? (payment.items || payment.policiesBreakdown || []) : [];

  const receiptNo = payment.id || payment.receiptId || `REC-${Date.now().toString().slice(-6)}`;
  const clientName = (payment.client || policy.client || client.name || payment.payerName || (isMulti ? 'PAGO CONSOLIDADO MULTICLIENTE' : 'Cliente General')).toUpperCase();
  const clientDoc = payment.clientDoc || client.documentId || policy.clientDoc || (isMulti ? 'Múltiples / Varios' : 'N/A');
  const clientPhone = client.phone || payment.phone || (isMulti ? 'N/A' : '809-555-0000');
  const clientEmail = client.email || payment.email || '';

  const policyId = payment.policyId || policy.id || (isMulti ? `Consolidado (${items.length} Pólizas)` : 'N/A');
  const insurer = policy.insurer || payment.insurer || (isMulti ? 'Múltiples Aseguradoras' : 'La Colonial de Seguros');
  const branch = policy.type || payment.type || (isMulti ? 'Multipóliza / Multicliente' : 'Póliza de Seguros');

  const rawAmount = Number(payment.amountNum) || parseFloat(String(payment.amount || '0').replace(/[^0-9.]/g, '')) || 0;
  const currency = payment.currency || policy.currency || 'DOP';
  const formattedAmount = formatMoney(rawAmount, currency);
  const wordsAmount = numberToWordsSpanish(rawAmount, currency);

  // Cálculo del Balance Restante
  const policyPremium = Number(policy.amountNum) || parseFloat(String(policy.amount || payment.policyAmount || '0').replace(/[^0-9.]/g, '')) || 0;
  let remainingBalance = 0;
  if (payment.remainingBalance !== undefined && payment.remainingBalance !== null) {
    remainingBalance = Number(payment.remainingBalance);
  } else if (payment.balanceAfter !== undefined && payment.balanceAfter !== null) {
    remainingBalance = Number(payment.balanceAfter);
  } else if (payment.totalOwed !== undefined && payment.totalOwed !== null) {
    remainingBalance = Math.max(0, Number(payment.totalOwed) - rawAmount);
  } else if (policy.totalOwed !== undefined && policy.totalOwed !== null) {
    remainingBalance = Number(policy.totalOwed);
  } else if (policy.balance !== undefined && policy.balance !== null) {
    remainingBalance = Number(policy.balance);
  } else if (policyPremium > 0) {
    remainingBalance = Math.max(0, policyPremium - rawAmount);
  }
  const formattedRemaining = formatMoney(remainingBalance, currency);

  const paymentDate = payment.date || new Date().toISOString().split('T')[0];
  const paymentMethod = payment.paymentMethod || 'Efectivo';
  const concept = payment.type || (isMulti ? 'Pago Consolidado Multipóliza' : 'Pago de Cuota / Prima de Seguro');
  const reference = payment.reference || payment.checkNumber || payment.referencia || (payment.masterReceiptId ? `Pago Múltiple (Recibo Consolidado: ${payment.masterReceiptId})` : 'N/A');

  // Intentar cargar logo oficial de Santiago Morales & Asoc.
  const logoBase64 = await loadImageAsBase64('/logo.png');

  // Paleta de Colores
  const primaryColor = [69, 26, 3]; // #451a03 Dark Brown
  const accentColor = [217, 119, 6]; // #d97706 Gold
  const slateDark = [30, 41, 59]; // #1e293b
  const slateLight = [248, 250, 252]; // #f8fafc

  // 1. Franja Superior Corporativa
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, 210, 8, 'F');

  // Franja Dorada
  doc.setFillColor(...accentColor);
  doc.rect(0, 8, 210, 2, 'F');

  // 2. Encabezado / Logo y Datos de la Empresa
  let currentY = 16;

  if (logoBase64) {
    try {
      doc.addImage(logoBase64, 'PNG', 14, currentY, 22, 22);
    } catch (e) {}
  }

  const headerLeftX = logoBase64 ? 40 : 14;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(...primaryColor);
  doc.text('SANTIAGO MORALES & ASOC.', headerLeftX, currentY + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text('GESTIÓN Y ASESORÍA DE SEGUROS', headerLeftX, currentY + 11);
  doc.text('RNC: 1-31-98765-4 · Reg. Superintendencia de Seguros No. 4520', headerLeftX, currentY + 15.5);
  doc.text('Av. 27 de Febrero, Santo Domingo, R.D. · Tel: (809) 555-0100', headerLeftX, currentY + 20);

  // Cuadro Recibo No. (Esquina Superior Derecha)
  doc.setFillColor(...slateLight);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(135, currentY, 61, 24, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...primaryColor);
  doc.text(isMulti ? 'RECIBO CONSOLIDADO' : 'RECIBO DE INGRESO', 165.5, currentY + 6, { align: 'center' });

  doc.setFontSize(12);
  doc.setTextColor(...accentColor);
  doc.text(receiptNo, 165.5, currentY + 13, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(`Fecha: ${formatDateToDDMMYYYY(paymentDate)}`, 165.5, currentY + 19, { align: 'center' });

  // 3. Monto Destacado
  currentY += 28;
  doc.setFillColor(254, 243, 199); // #fef3c7
  doc.setDrawColor(...accentColor);
  doc.setLineWidth(0.4);
  doc.roundedRect(14, currentY, 182, 14, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...primaryColor);
  doc.text(isMulti ? 'VALOR TOTAL CONSOLIDADO RECIBIDO:' : 'VALOR RECIBIDO:', 20, currentY + 9);

  doc.setFontSize(14);
  doc.setTextColor(180, 83, 9);
  doc.text(formattedAmount, 190, currentY + 9.5, { align: 'right' });

  // 4. Bloque Datos del Cliente y Póliza / Transacción
  currentY += 18;

  if (isMulti) {
    // Bloque Pagador / Clientes (Izquierda)
    doc.setFillColor(...slateLight);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(14, currentY, 88, 36, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...primaryColor);
    doc.text('DATOS DEL PAGADOR / GRUPO', 18, currentY + 6);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...slateDark);
    const splitClientName = doc.splitTextToSize(clientName, 80);
    doc.text(splitClientName, 18, currentY + 12);

    const nameOffset = Math.min(splitClientName.length * 4.5, 9);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`Identificación / RNC: `, 18, currentY + 13 + nameOffset);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...slateDark);
    doc.text(clientDoc, 48, currentY + 13 + nameOffset);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(`Distribución: `, 18, currentY + 18 + nameOffset);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(22, 101, 52);
    doc.text(`${items.length} Póliza(s) Aplicada(s)`, 38, currentY + 18 + nameOffset);

    // Bloque Transacción y Referencia (Derecha)
    doc.setFillColor(...slateLight);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(108, currentY, 88, 36, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...primaryColor);
    doc.text('DETALLES DE LA TRANSACCIÓN', 112, currentY + 6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('Método de Pago:', 112, currentY + 12);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(22, 101, 52);
    doc.text(paymentMethod.toUpperCase(), 140, currentY + 12);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('Ref. / Cheque #:', 112, currentY + 18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...slateDark);
    doc.text(reference, 140, currentY + 18);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text('Modalidad:', 112, currentY + 24);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...primaryColor);
    doc.text('Pago Consolidado Multipóliza', 130, currentY + 24);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text('Estado:', 112, currentY + 30);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(22, 101, 52);
    doc.text('APLICADO / PAGADO', 126, currentY + 30);
  } else {
    // Bloque Cliente Individual (Izquierda)
    doc.setFillColor(...slateLight);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(14, currentY, 88, 36, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...primaryColor);
    doc.text('DATOS DEL CLIENTE / PAGADOR', 18, currentY + 6);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...slateDark);
    const splitClientName = doc.splitTextToSize(clientName, 80);
    doc.text(splitClientName, 18, currentY + 12);

    const nameOffset = Math.min(splitClientName.length * 4.5, 9);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`Cédula / RNC: `, 18, currentY + 13 + nameOffset);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...slateDark);
    doc.text(clientDoc, 40, currentY + 13 + nameOffset);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(`Teléfono: `, 18, currentY + 18 + nameOffset);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...slateDark);
    doc.text(clientPhone, 32, currentY + 18 + nameOffset);

    // Bloque Póliza Individual (Derecha)
    doc.setFillColor(...slateLight);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(108, currentY, 88, 36, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...primaryColor);
    doc.text('DATOS DE LA PÓLIZA', 112, currentY + 6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('Póliza No.:', 112, currentY + 12);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...primaryColor);
    doc.text(policyId, 130, currentY + 12);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('Aseguradora:', 112, currentY + 18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...slateDark);
    doc.text(insurer, 134, currentY + 18);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text('Ramo / Tipo:', 112, currentY + 24);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...slateDark);
    doc.text(branch, 132, currentY + 24);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text('Forma de Pago:', 112, currentY + 30);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(22, 101, 52);
    doc.text(paymentMethod.toUpperCase(), 138, currentY + 30);
  }

  // 5. Tabla de Detalle del Cobro
  currentY += 41;

  if (isMulti && items.length > 0) {
    const tableBody = items.map(it => {
      const itAmount = Number(it.amountNum) || parseFloat(String(it.amount || '0').replace(/[^0-9.]/g, '')) || 0;
      const itRemaining = it.remainingBalance !== undefined ? it.remainingBalance : it.totalOwed !== undefined ? Math.max(0, it.totalOwed - itAmount) : 0;
      return [
        it.client || clientName,
        it.policyId || it.policy || 'N/A',
        `${it.insurer || 'Aseguradora'} · ${it.type || 'Póliza'}`,
        it.concept || it.paymentType || 'Cuota',
        formatMoney(itAmount, currency),
        itRemaining > 0 ? formatMoney(itRemaining, currency) : `${formatMoney(0, currency)} (Al Día)`
      ];
    });

    autoTable(doc, {
      startY: currentY,
      margin: { left: 14, right: 14 },
      head: [['CLIENTE / TITULAR', 'PÓLIZA #', 'ASEGURADORA & RAMO', 'CONCEPTO', 'PAGADO', 'RESTANTE']],
      body: tableBody,
      foot: [
        [
          { content: `TOTAL DISTRIBUIDO (${items.length} PÓLIZAS)`, colSpan: 4, styles: { halign: 'right', fontStyle: 'bold' } },
          { content: formattedAmount, styles: { halign: 'right', fontStyle: 'bold', textColor: [180, 83, 9] } },
          { content: isFullyPaid ? 'AL DÍA' : `Resta: ${formattedRemaining}`, styles: { halign: 'right', fontStyle: 'bold', textColor: isFullyPaid ? [22, 101, 52] : [153, 27, 27] } }
        ]
      ],
      headStyles: {
        fillColor: primaryColor,
        textColor: [255, 255, 255],
        fontSize: 8,
        fontStyle: 'bold',
        halign: 'left',
        cellPadding: 3.2,
      },
      footStyles: {
        fillColor: [254, 243, 199],
        textColor: primaryColor,
        fontSize: 8.5,
        fontStyle: 'bold',
        cellPadding: 3.5,
      },
      columnStyles: {
        0: { cellWidth: 42 },
        1: { cellWidth: 32, fontStyle: 'bold' },
        2: { cellWidth: 38 },
        3: { cellWidth: 22 },
        4: { cellWidth: 24, halign: 'right', fontStyle: 'bold' },
        5: { cellWidth: 24, halign: 'right', fontStyle: 'bold' }
      },
      styles: {
        fontSize: 8,
        cellPadding: 3,
        textColor: slateDark,
        lineColor: [226, 232, 240],
        lineWidth: 0.2
      },
      alternateRowStyles: {
        fillColor: [255, 255, 255]
      }
    });
  } else {
    autoTable(doc, {
      startY: currentY,
      margin: { left: 14, right: 14 },
      head: [['CONCEPTO / DESCRIPCIÓN', 'REFERENCIA', 'PAGADO', 'RESTANTE', 'ESTADO']],
      body: [
        [
          concept,
          `Póliza ${policyId}`,
          formattedAmount,
          remainingBalance > 0 ? formattedRemaining : `${formatMoney(0, currency)} (Al Día)`,
          payment.status === 'Paid' || payment.status === 'Pagado' ? 'PAGADO' : 'PENDIENTE'
        ]
      ],
      headStyles: {
        fillColor: primaryColor,
        textColor: [255, 255, 255],
        fontSize: 8.5,
        fontStyle: 'bold',
        halign: 'left',
        cellPadding: 3.5,
      },
      footStyles: {
        fillColor: [254, 243, 199],
        textColor: primaryColor,
        fontSize: 8.5,
        fontStyle: 'bold',
        cellPadding: 3.5,
      },
      foot: [
        [
          { content: 'TOTAL PAGADO EN ESTE RECIBO:', colSpan: 2, styles: { halign: 'right', fontStyle: 'bold' } },
          { content: formattedAmount, styles: { halign: 'right', fontStyle: 'bold', textColor: [180, 83, 9] } },
          { content: `Resta: ${formattedRemaining}`, colSpan: 2, styles: { halign: 'center', fontStyle: 'bold', textColor: remainingBalance > 0 ? [153, 27, 27] : [22, 101, 52] } }
        ]
      ],
      columnStyles: {
        0: { cellWidth: 68 },
        1: { cellWidth: 38 },
        2: { cellWidth: 26, halign: 'right', fontStyle: 'bold' },
        3: { cellWidth: 28, halign: 'right', fontStyle: 'bold' },
        4: { cellWidth: 22, halign: 'center' }
      },
      styles: {
        fontSize: 8.5,
        cellPadding: 4,
        textColor: slateDark,
        lineColor: [226, 232, 240],
        lineWidth: 0.2
      },
      alternateRowStyles: {
        fillColor: [255, 255, 255]
      }
    });
  }

  currentY = doc.lastAutoTable.finalY + 4;

  // 6. Monto en Letras
  doc.setFillColor(...slateLight);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, currentY, 182, 14, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('CANTIDAD EN LETRAS:', 18, currentY + 5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...primaryColor);
  doc.text(wordsAmount, 18, currentY + 10);

  // 7. Notas y Resumen
  currentY += 18;

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(
    '* Este recibo constituye comprobante oficial de pago de prima y cuotas de seguro. Conservar como constancia válida.',
    14,
    currentY
  );

  // 8. Firmas de Conformidad
  currentY += 22;

  // Línea Firma Santiago Morales
  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.3);
  doc.line(24, currentY + 12, 85, currentY + 12);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...primaryColor);
  doc.text('Santiago Morales & Asoc.', 54.5, currentY + 17, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('Firma Autorizada / Sello', 54.5, currentY + 21, { align: 'center' });

  // Línea Firma Cliente
  doc.line(125, currentY + 12, 186, currentY + 12);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...slateDark);
  doc.text('Recibido Conforme (Cliente)', 155.5, currentY + 17, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('Firma o Cédula', 155.5, currentY + 21, { align: 'center' });

  // Sello Digital / Pie de Página
  currentY += 30;
  doc.setDrawColor(226, 232, 240);
  doc.line(14, currentY, 196, currentY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(148, 163, 184);
  doc.text(`Documento generado electrónicamente · ID Validación: ${receiptNo}-${Date.now().toString().slice(-4)} · Santiago Morales & Asoc.`, 105, currentY + 4, { align: 'center' });

  // Franja Inferior
  doc.setFillColor(...primaryColor);
  doc.rect(0, 292, 210, 5, 'F');

  return doc;
};

/**
 * Genera un Blob del PDF para previsualizarlo o subirlo a Google Drive
 */
export const generateReceiptPdfBlob = async (payment, policy = {}, client = {}) => {
  const doc = await generateReceiptPdf(payment, policy, client);
  return doc.output('blob');
};

/**
 * Genera un Blob URL del PDF para previsualizarlo en un iframe
 */
export const generateReceiptPdfBlobUrl = async (payment, policy = {}, client = {}) => {
  const blob = await generateReceiptPdfBlob(payment, policy, client);
  return URL.createObjectURL(blob);
};

/**
 * Descarga directamente el archivo PDF del recibo
 */
export const downloadReceiptPdf = async (payment, policy = {}, client = {}) => {
  const doc = await generateReceiptPdf(payment, policy, client);
  const receiptNo = payment.id || payment.receiptId || 'RECIBO';
  doc.save(`Recibo_${receiptNo}_${payment.client || 'Cliente'}.pdf`);
};

/**
 * Genera el documento PDF como Data URI Base64 para guardarlo directamente en la base de datos
 */
export const generateReceiptPdfDataUri = async (payment, policy = {}, client = {}) => {
  const doc = await generateReceiptPdf(payment, policy, client);
  return doc.output('datauristring');
};

/**
 * Abre el cuadro de diálogo de impresión del navegador para el recibo
 */
export const printReceiptDirectly = async (payment, policy = {}, client = {}) => {
  const blobUrl = await generateReceiptPdfBlobUrl(payment, policy, client);
  const printWindow = window.open(blobUrl);
  if (printWindow) {
    printWindow.onload = () => {
      printWindow.focus();
      printWindow.print();
    };
  }
};

