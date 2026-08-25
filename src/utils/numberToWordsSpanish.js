/**
 * Convierte un número a su representación en letras en español (moneda dominicana / estándar)
 * Ej: 2000.04 -> "DOS MIL PESOS DOMINICANOS CON 04/100"
 */
export const numberToWordsSpanish = (amount, currency = 'DOP') => {
  if (amount === undefined || amount === null || isNaN(amount)) return 'CERO PESOS 00/100';

  const num = Math.abs(Number(amount));
  const integerPart = Math.floor(num);
  const decimalPart = Math.round((num - integerPart) * 100);
  const decimalStr = String(decimalPart).padStart(2, '0');

  const unidades = ['', 'UN', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE'];
  const especiales = ['DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISEIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE'];
  const decenas = ['', '', 'VEINTE', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];
  const veintis = ['', 'VEINTIUN', 'VEINTIDOS', 'VEINTITRES', 'VEINTICUATRO', 'VEINTICINCO', 'VEINTISEIS', 'VEINTISIETE', 'VEINTIOCHO', 'VEINTINUEVE'];
  const centenas = ['', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS'];

  function convertGroup(n) {
    let output = '';
    if (n === 100) return 'CIEN';

    const c = Math.floor(n / 100);
    const d = Math.floor((n % 100) / 10);
    const u = n % 10;

    if (c > 0) output += centenas[c] + ' ';

    if (d === 1) {
      output += especiales[u] + ' ';
    } else if (d === 2) {
      if (u === 0) output += 'VEINTE ';
      else output += veintis[u] + ' ';
    } else if (d > 2) {
      output += decenas[d];
      if (u > 0) output += ' Y ' + unidades[u] + ' ';
      else output += ' ';
    } else if (u > 0) {
      output += unidades[u] + ' ';
    }

    return output.trim();
  }

  function convertNumber(n) {
    if (n === 0) return 'CERO';

    let result = '';

    // Millones
    const millones = Math.floor(n / 1000000);
    if (millones > 0) {
      if (millones === 1) result += 'UN MILLON ';
      else result += convertGroup(millones) + ' MILLONES ';
    }

    // Miles
    const miles = Math.floor((n % 1000000) / 1000);
    if (miles > 0) {
      if (miles === 1) result += 'MIL ';
      else result += convertGroup(miles) + ' MIL ';
    }

    // Cientos / Unidades
    const restos = n % 1000;
    if (restos > 0) {
      result += convertGroup(restos) + ' ';
    }

    return result.trim();
  }

  const words = convertNumber(integerPart);
  const currencyLabel = currency === 'USD' ? 'DOLARES ESTADOUNIDENSES' : 'PESOS DOMINICANOS';

  return `${words} ${currencyLabel} CON ${decimalStr}/100`;
};
