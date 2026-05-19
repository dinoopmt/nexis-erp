import FinancialYear from '../Models/FinancialYear.js';
import { normalizeFinancialYear } from './financialYearFormat.js';

export const resolveFinancialYearCode = async (requestedFinancialYear) => {
  const normalizedRequested = normalizeFinancialYear(requestedFinancialYear || '');

  if (normalizedRequested) {
    const requestedExists = await FinancialYear.findOne({
      yearCode: normalizedRequested,
      isDeleted: false,
    }).lean();

    if (!requestedExists) {
      const error = new Error(`Financial year ${normalizedRequested} does not exist`);
      error.status = 400;
      throw error;
    }

    return normalizedRequested;
  }

  const now = new Date();
  const activeFinancialYear =
    (await FinancialYear.findOne({ isCurrent: true, isDeleted: false }).lean()) ||
    (await FinancialYear.findOne({
      isDeleted: false,
      startDate: { $lte: now },
      endDate: { $gte: now },
    }).lean());

  if (!activeFinancialYear?.yearCode) {
    const error = new Error('No active financial year configured. Create/set current financial year first.');
    error.status = 400;
    throw error;
  }

  return normalizeFinancialYear(activeFinancialYear.yearCode);
};
