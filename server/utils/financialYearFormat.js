/**
 * Financial year formatting helpers.
 * Canonical format: YYYY-YY (example: 2026-27), fiscal year Apr-Mar.
 */

const FOUR_DIGIT_FY_REGEX = /^(\d{4})-(\d{4})$/;
const SHORT_FY_REGEX = /^(\d{4})-(\d{2})$/;

export const normalizeFinancialYear = (value) => {
  if (typeof value !== 'string') return value;

  const trimmed = value.trim().toUpperCase().replace(/^FY/, '');

  const fourDigitMatch = trimmed.match(FOUR_DIGIT_FY_REGEX);
  if (fourDigitMatch) {
    const startYear = fourDigitMatch[1];
    const endYearShort = fourDigitMatch[2].slice(-2);
    return `${startYear}-${endYearShort}`;
  }

  const shortMatch = trimmed.match(SHORT_FY_REGEX);
  if (shortMatch) {
    return `${shortMatch[1]}-${shortMatch[2]}`;
  }

  return trimmed;
};

export const getCurrentFinancialYear = (date = new Date()) => {
  const year = date.getFullYear();
  const monthIndex = date.getMonth();

  // Fiscal year starts in April.
  const startYear = monthIndex >= 3 ? year : year - 1;
  const endYearShort = String(startYear + 1).slice(-2);

  return `${startYear}-${endYearShort}`;
};

export const getFinancialYearFromDateRange = (startDate, endDate, fiscalYearEnd = '03-31') => {
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return null;
  }

  const [endMonthStr, endDayStr] = String(fiscalYearEnd).split('-');
  const fiscalEndMonth = Number(endMonthStr);
  const fiscalEndDay = Number(endDayStr);

  if (
    Number.isNaN(fiscalEndMonth) ||
    Number.isNaN(fiscalEndDay) ||
    fiscalEndMonth < 1 ||
    fiscalEndMonth > 12 ||
    fiscalEndDay < 1 ||
    fiscalEndDay > 31
  ) {
    return null;
  }

  // End date must exactly match configured fiscal year end (UTC-safe checks).
  const isFiscalEnd = end.getUTCMonth() === fiscalEndMonth - 1 && end.getUTCDate() === fiscalEndDay;

  // Start date must be the next day of previous year's fiscal end date.
  const expectedStart = new Date(Date.UTC(end.getUTCFullYear() - 1, fiscalEndMonth - 1, fiscalEndDay));
  expectedStart.setUTCDate(expectedStart.getUTCDate() + 1);

  const isFiscalStart =
    start.getUTCFullYear() === expectedStart.getUTCFullYear() &&
    start.getUTCMonth() === expectedStart.getUTCMonth() &&
    start.getUTCDate() === expectedStart.getUTCDate();

  const startYear = start.getUTCFullYear();
  const endYearShort = String(end.getUTCFullYear()).slice(-2);

  if (!isFiscalStart || !isFiscalEnd) {
    return null;
  }

  return `${startYear}-${endYearShort}`;
};
