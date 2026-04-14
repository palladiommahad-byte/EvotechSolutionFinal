export function numberToFrenchWords(num: number): string {
  if (num === 0) return 'zéro';
  if (num < 0) return 'moins ' + numberToFrenchWords(Math.abs(num));

  const units = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf'];
  const teens = ['dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf'];
  const tens = ['', 'dix', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante-dix', 'quatre-vingts', 'quatre-vingt-dix'];

  function convertLess100(n: number): string {
    if (n < 10) return units[n];
    if (n < 20) return teens[n - 10];
    
    const tense = Math.floor(n / 10);
    const un = n % 10;
    
    if (tense === 7 || tense === 9) {
      const baseTen = tense === 7 ? 'soixante' : 'quatre-vingt';
      if (un === 1 && tense === 7) return baseTen + ' et onze';
      return baseTen + (un === 0 ? '-dix' : '-' + teens[un]);
    }
    
    let result = tens[tense];
    if (tense === 8 && un === 0) return result; // quatre-vingts
    if (tense === 8) result = 'quatre-vingt'; // quatre-vingt-un
    
    if (un === 1 && tense < 8) return result + ' et un';
    if (un > 0) return result + '-' + units[un];
    return result;
  }

  function convertLess1000(n: number): string {
    if (n < 100) return convertLess100(n);
    const hundreds = Math.floor(n / 100);
    const rest = n % 100;
    
    let result = '';
    if (hundreds === 1) result = 'cent';
    else result = units[hundreds] + ' cent' + (rest === 0 ? 's' : '');
    
    if (rest > 0) result += ' ' + convertLess100(rest);
    return result;
  }

  const parts = [];
  
  const billions = Math.floor(num / 1000000000);
  if (billions > 0) {
    parts.push(convertLess1000(billions) + ' milliard' + (billions > 1 ? 's' : ''));
    num %= 1000000000;
  }
  
  const millions = Math.floor(num / 1000000);
  if (millions > 0) {
    parts.push(convertLess1000(millions) + ' million' + (millions > 1 ? 's' : ''));
    num %= 1000000;
  }
  
  const thousands = Math.floor(num / 1000);
  if (thousands > 0) {
    if (thousands === 1) parts.push('mille');
    else parts.push(convertLess1000(thousands) + ' mille');
    num %= 1000;
  }
  
  if (num > 0) {
    parts.push(convertLess1000(num));
  }
  
  return parts.join(' ');
}

export function amountToFrenchWords(amount: number, currency: string = 'Dirhams', subunit: string = 'Centimes'): string {
  if (amount === 0) return `Zéro ${currency}`;
  
  const integerPart = Math.floor(amount);
  const decimalPart = Math.round((amount - integerPart) * 100);
  
  let result = integerPart > 0 ? `${numberToFrenchWords(integerPart)} ${currency}` : '';
  
  if (decimalPart > 0) {
    if (result) result += ' et ';
    result += `${numberToFrenchWords(decimalPart)} ${subunit}`;
  }
  
  // Capitalize first letter
  return result.charAt(0).toUpperCase() + result.slice(1);
}
