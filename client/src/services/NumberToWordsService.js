/**
 * Service: NumberToWordsService
 * Converts numbers to words for UAE, Oman, and India
 * Supports multiple languages and currency formats
 */

class NumberToWordsService {
  /**
   * English words for numbers
   */
  static englishOnes = [
    '',
    'one',
    'two',
    'three',
    'four',
    'five',
    'six',
    'seven',
    'eight',
    'nine',
  ];

  static englishTens = [
    '',
    '',
    'twenty',
    'thirty',
    'forty',
    'fifty',
    'sixty',
    'seventy',
    'eighty',
    'ninety',
  ];

  static englishTeens = [
    'ten',
    'eleven',
    'twelve',
    'thirteen',
    'fourteen',
    'fifteen',
    'sixteen',
    'seventeen',
    'eighteen',
    'nineteen',
  ];

  static englishScales = [
    '',
    'thousand',
    'million',
    'billion',
    'trillion',
    'quadrillion',
  ];

  /**
   * Arabic words for numbers (0-9)
   */
  static arabicOnes = [
    '',
    'واحد',
    'اثنان',
    'ثلاثة',
    'أربعة',
    'خمسة',
    'ستة',
    'سبعة',
    'ثمانية',
    'تسعة',
  ];

  /**
   * Arabic tens (10, 20, 30, etc.)
   */
  static arabicTens = [
    '',
    '',
    'عشرون',
    'ثلاثون',
    'أربعون',
    'خمسون',
    'ستون',
    'سبعون',
    'ثمانون',
    'تسعون',
  ];

  /**
   * Arabic teens (10-19)
   */
  static arabicTeens = [
    'عشرة',
    'احدى عشر',
    'اثنا عشر',
    'ثلاثة عشر',
    'أربعة عشر',
    'خمسة عشر',
    'ستة عشر',
    'سبعة عشر',
    'ثمانية عشر',
    'تسعة عشر',
  ];

  /**
   * Arabic scales (thousand, million, etc.)
   */
  static arabicScales = ['', 'ألف', 'مليون', 'مليار', 'تريليون', 'كوادريليون'];

  /**
   * Currency data for different countries
   */
  static currencyData = {
    AE: {
      // UAE
      AED: {
        en: { singular: 'Dirham', plural: 'Dirhams', subunit: 'Fils', subunitPlural: 'Fils' },
        ar: { singular: 'درهم', plural: 'دراهم', subunit: 'فلس', subunitPlural: 'فلوس' },
      },
      USD: {
        en: { singular: 'Dollar', plural: 'Dollars', subunit: 'Cent', subunitPlural: 'Cents' },
        ar: { singular: 'دولار', plural: 'دولارات', subunit: 'سنت', subunitPlural: 'سنتات' },
      },
    },
    OM: {
      // Oman
      OMR: {
        en: { singular: 'Rial', plural: 'Rials', subunit: 'Baisa', subunitPlural: 'Baisa' },
        ar: { singular: 'ريال', plural: 'ريالات', subunit: 'بيسة', subunitPlural: 'بيسات' },
      },
      USD: {
        en: { singular: 'Dollar', plural: 'Dollars', subunit: 'Cent', subunitPlural: 'Cents' },
        ar: { singular: 'دولار', plural: 'دولارات', subunit: 'سنت', subunitPlural: 'سنتات' },
      },
    },
    IN: {
      // India
      INR: {
        en: { singular: 'Rupee', plural: 'Rupees', subunit: 'Paisa', subunitPlural: 'Paise' },
        ar: null, // Arabic not supported for India
      },
      USD: {
        en: { singular: 'Dollar', plural: 'Dollars', subunit: 'Cent', subunitPlural: 'Cents' },
        ar: null,
      },
    },
  };

  /**
   * Convert number to words in English
   */
  static convertEnglish(num) {
    if (num === 0) return 'zero';
    if (num < 0) return 'negative ' + this.convertEnglish(-num);

    const parts = [];
    let scaleIndex = 0;

    while (num > 0) {
      const chunk = num % 1000;
      if (chunk !== 0) {
        parts.unshift(this.convertEnglishChunk(chunk) + (scaleIndex > 0 ? ' ' + this.englishScales[scaleIndex] : ''));
      }
      num = Math.floor(num / 1000);
      scaleIndex++;
    }

    return parts.join(' ').replace(/\s+/g, ' ').trim();
  }

  /**
   * Convert chunk (0-999) to English words
   */
  static convertEnglishChunk(num) {
    if (num === 0) return '';
    if (num < 10) return this.englishOnes[num];
    if (num < 20) return this.englishTeens[num - 10];

    const tens = Math.floor(num / 10);
    const ones = num % 10;
    return this.englishTens[tens] + (ones > 0 ? ' ' + this.englishOnes[ones] : '');
  }

  /**
   * Convert number to words in Arabic
   */
  static convertArabic(num) {
    if (num === 0) return 'صفر';
    if (num < 0) return 'سالب ' + this.convertArabic(-num);

    const parts = [];
    let scaleIndex = 0;

    while (num > 0) {
      const chunk = num % 1000;
      if (chunk !== 0) {
        parts.unshift(this.convertArabicChunk(chunk) + (scaleIndex > 0 ? ' ' + this.arabicScales[scaleIndex] : ''));
      }
      num = Math.floor(num / 1000);
      scaleIndex++;
    }

    return parts.join(' ').replace(/\s+/g, ' ').trim();
  }

  /**
   * Convert chunk (0-999) to Arabic words
   */
  static convertArabicChunk(num) {
    if (num === 0) return '';
    if (num < 10) return this.arabicOnes[num];
    if (num < 20) return this.arabicTeens[num - 10];

    const tens = Math.floor(num / 10);
    const ones = num % 10;
    return (ones > 0 ? this.arabicOnes[ones] + ' و' : '') + this.arabicTens[tens];
  }

  /**
   * Convert number to Indian numbering format (with Lakh, Crore)
   */
  static convertIndian(num) {
    if (num === 0) return 'zero';
    if (num < 0) return 'negative ' + this.convertIndian(-num);

    let parts = [];

    // Handle crores (10 million +)
    const crores = Math.floor(num / 10000000);
    if (crores > 0) {
      parts.push(this.convertEnglish(crores) + ' crore');
      num = num % 10000000;
    }

    // Handle lakhs (100,000 +)
    const lakhs = Math.floor(num / 100000);
    if (lakhs > 0) {
      parts.push(this.convertEnglish(lakhs) + ' lakh');
      num = num % 100000;
    }

    // Handle remaining thousands
    if (num > 0) {
      parts.push(this.convertEnglish(num));
    }

    return parts.join(' ');
  }

  /**
   * Main conversion method
   */
  static convertToWords(amount, countryCode = 'AE', language = 'en', currency = null) {
    const integerPart = Math.floor(amount);
    const decimalPart = Math.round((amount - integerPart) * 100);

    let result = '';

    // Convert integer part
    if (countryCode === 'IN' || language === 'en') {
      result = countryCode === 'IN' ? this.convertIndian(integerPart) : this.convertEnglish(integerPart);
    } else if (language === 'ar') {
      result = this.convertArabic(integerPart);
    } else {
      result = this.convertEnglish(integerPart);
    }

    // Add currency name if provided
    if (currency) {
      const currencyName = this.getCurrencyName(currency, countryCode, language, integerPart);
      result += ' ' + currencyName;
    }

    // Add decimal part if exists
    if (decimalPart > 0) {
      const decimalWord = language === 'ar' ? 'و' : 'and';
      const decimalConverted = language === 'ar' ? this.convertArabic(decimalPart) : this.convertEnglish(decimalPart);
      
      const subunit = this.getSubunitName(currency, countryCode, language, decimalPart);
      result += ' ' + decimalWord + ' ' + decimalConverted + ' ' + subunit;
    }

    return result.trim();
  }

  /**
   * Convert to words with currency
   */
  static convertToWordsWithCurrency(amount, countryCode = 'AE', language = 'en', currency = null) {
    return this.convertToWords(amount, countryCode, language, currency);
  }

  /**
   * Convert only integer part
   */
  static convertIntegerToWords(amount, countryCode = 'AE', language = 'en') {
    const integerPart = Math.floor(amount);

    if (countryCode === 'IN' || language === 'en') {
      return countryCode === 'IN' ? this.convertIndian(integerPart) : this.convertEnglish(integerPart);
    } else if (language === 'ar') {
      return this.convertArabic(integerPart);
    }

    return this.convertEnglish(integerPart);
  }

  /**
   * Convert only decimal part
   */
  static convertDecimalToWords(amount, countryCode = 'AE', language = 'en') {
    const decimalPart = Math.round((amount - Math.floor(amount)) * 100);

    if (decimalPart === 0) return '';

    if (language === 'ar') {
      return this.convertArabic(decimalPart);
    }

    return countryCode === 'IN' ? this.convertIndian(decimalPart) : this.convertEnglish(decimalPart);
  }

  /**
   * Get currency name (singular/plural)
   */
  static getCurrencyName(currencyCode, countryCode = 'AE', language = 'en', amount = 1) {
    const countryData = this.currencyData[countryCode];
    if (!countryData || !countryData[currencyCode]) {
      return currencyCode; // Return code if not found
    }

    const currencyInfo = countryData[currencyCode][language];
    if (!currencyInfo) {
      return currencyCode;
    }

    return amount === 1 ? currencyInfo.singular : currencyInfo.plural;
  }

  /**
   * Get subunit name (paisa, fils, etc.)
   */
  static getSubunitName(currencyCode, countryCode = 'AE', language = 'en', amount = 1) {
    const countryData = this.currencyData[countryCode];
    if (!countryData || !countryData[currencyCode]) {
      return '';
    }

    const currencyInfo = countryData[currencyCode][language];
    if (!currencyInfo || !currencyInfo.subunit) {
      return '';
    }

    return amount === 1 ? currencyInfo.subunit : currencyInfo.subunitPlural;
  }

  /**
   * Get currency words object
   */
  static getCurrencyWords(currencyCode, countryCode = 'AE', language = 'en') {
    const countryData = this.currencyData[countryCode];
    if (!countryData || !countryData[currencyCode]) {
      return { singular: currencyCode, plural: currencyCode, subunit: '', subunitPlural: '' };
    }

    return countryData[currencyCode][language] || { singular: currencyCode, plural: currencyCode };
  }

  /**
   * Check if language is supported for country
   */
  static isLanguageSupported(countryCode = 'AE', language = 'en') {
    if (language === 'en') return true;
    if (language === 'ar') {
      return countryCode === 'AE' || countryCode === 'OM';
    }
    return false;
  }

  /**
   * Get supported currencies for country
   */
  static getSupportedCurrencies(countryCode = 'AE') {
    const countryData = this.currencyData[countryCode];
    return countryData ? Object.keys(countryData) : [];
  }

  /**
   * Format amount as check/invoice text
   * Example: "Five Thousand Two Hundred and Thirty-Four Dirhams and Fifty Fils"
   */
  static formatForCheck(amount, countryCode = 'AE', language = 'en', currency = null) {
    const result = this.convertToWords(amount, countryCode, language, currency);
    return result.charAt(0).toUpperCase() + result.slice(1);
  }
}

export default NumberToWordsService;


