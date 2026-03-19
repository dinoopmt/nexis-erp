import logger from '../../../config/logger.js';
import { AppError } from '../../../config/errorHandler.js';

/**
 * FinancialReportService
 * Generates financial statements and reports
 * Income Statement, Balance Sheet, Cash Flow, Trial Balance
 */
class FinancialReportService {
  /**
   * Generate income statement
   * @param {Object} filters - { fromDate, toDate, costCenter, comparisonYear }
   * @returns {Promise<Object>} - Income statement
   */
  static async generateIncomeStatement(filters = {}) {
    try {
      const { fromDate, toDate, costCenter, comparisonYear } = filters;

      // Validate dates
      if (fromDate && toDate && new Date(fromDate) > new Date(toDate)) {
        throw new Error('From date must be before to date');
      }

      // In real implementation, aggregate from GL entries
      const statement = {
        reportType: 'Income Statement',
        period: {
          fromDate: fromDate || new Date(new Date().getFullYear(), 0, 1),
          toDate: toDate || new Date(),
        },
        costCenter: costCenter || 'All',
        revenues: {
          salesRevenue: 5000000,
          serviceRevenue: 1000000,
          otherIncome: 500000,
          totalRevenues: 6500000,
        },
        costOfSales: {
          materialCost: 2500000,
          laborCost: 1000000,
          manufacturingOverhead: 500000,
          totalCostOfSales: 4000000,
        },
        grossProfit: 2500000,
        operatingExpenses: {
          salaries: 600000,
          rent: 300000,
          utilities: 200000,
          depreciation: 150000,
          other: 150000,
          totalOperatingExpenses: 1400000,
        },
        operatingIncome: 1100000,
        nonOperatingItems: {
          interestExpense: -100000,
          interestIncome: 50000,
          otherIncome: 25000,
          totalNonOperatingItems: -25000,
        },
        profitBeforeTax: 1075000,
        taxExpense: 188750, // 17.5% effective rate
        netProfit: 886250,
        key_ratios: {
          grossMargin: 38.46,
          operatingMargin: 16.92,
          netMargin: 13.64,
          roe: 29.54, // Return on equity
          roa: 19.74, // Return on assets
        },
      };

      logger.info('Income statement generated successfully', {
        period: statement.period,
        netProfit: statement.netProfit,
        costCenter,
      });

      return statement;
    } catch (error) {
      logger.error('Error generating income statement', { error: error.message });
      const err = new Error(error.message);
      err.status = 400;
      throw err;
    }
  }

  /**
   * Generate balance sheet
   * @param {Object} filters - { asOfDate, includeComparative }
   * @returns {Promise<Object>} - Balance sheet
   */
  static async generateBalanceSheet(filters = {}) {
    try {
      const { asOfDate, includeComparative } = filters;

      // In real implementation, get account balances from GL
      const sheet = {
        reportType: 'Balance Sheet',
        asOfDate: asOfDate || new Date(),
        assets: {
          currentAssets: {
            cash: 500000,
            accountsReceivable: 800000,
            inventory: 1200000,
            prepaidExpenses: 100000,
            totalCurrentAssets: 2600000,
          },
          fixedAssets: {
            propertyPlantEquipment: 2000000,
            accumulatedDepreciation: -500000,
            netPPE: 1500000,
            intangibleAssets: 200000,
            totalFixedAssets: 1700000,
          },
          totalAssets: 4300000,
        },
        liabilities: {
          currentLiabilities: {
            accountsPayable: 400000,
            shortTermDebt: 300000,
            currentPortionLongTermDebt: 100000,
            accruals: 200000,
            totalCurrentLiabilities: 1000000,
          },
          longTermLiabilities: {
            longTermDebt: 900000,
            deferredTaxLiability: 100000,
            totalLongTermLiabilities: 1000000,
          },
          totalLiabilities: 2000000,
        },
        equity: {
          capital: 1000000,
          retainedEarnings: 1300000,
          totalEquity: 2300000,
        },
        totalLiabilitiesAndEquity: 4300000,
        balance_check: 'Balanced',
        key_ratios: {
          currentRatio: 2.6,
          quickRatio: 1.4,
          debtToEquity: 0.87,
          assetTurnover: 1.63,
        },
      };

      // Validate balance sheet equation
      if (Math.abs(sheet.totalAssets - (sheet.totalLiabilities + sheet.equity.totalEquity)) > 1) {
        sheet.balance_check = 'Out of Balance';
      }

      logger.info('Balance sheet generated successfully', {
        asOfDate: sheet.asOfDate,
        totalAssets: sheet.totalAssets,
      });

      return sheet;
    } catch (error) {
      logger.error('Error generating balance sheet', { error: error.message });
      const err = new Error(error.message);
      err.status = 400;
      throw err;
    }
  }

  /**
   * Generate cash flow statement
   * @param {Object} filters - { fromDate, toDate, costCenter }
   * @returns {Promise<Object>} - Cash flow statement
   */
  static async generateCashFlowStatement(filters = {}) {
    try {
      const { fromDate, toDate, costCenter } = filters;

      // In real implementation, get from GL and sub-ledgers
      const statement = {
        reportType: 'Cash Flow Statement',
        period: {
          fromDate: fromDate || new Date(new Date().getFullYear(), 0, 1),
          toDate: toDate || new Date(),
        },
        operatingActivities: {
          netIncome: 886250,
          depreciation: 150000,
          accountsReceivableChange: -100000,
          inventoryChange: 50000,
          accountsPayableChange: 75000,
          cashFromOperations: 1061250,
        },
        investingActivities: {
          purchaseOfPPE: -200000,
          saleOfEquipment: 50000,
          cashFromInvesting: -150000,
        },
        financingActivities: {
          borrowing: 200000,
          debtRepayment: -100000,
          dividendPaid: -200000,
          cashFromFinancing: -100000,
        },
        netCashChange: 811250,
        openingCash: 500000,
        closingCash: 1311250,
        key_metrics: {
          operatingCashFlow: 1061250,
          freeGrCashFlow: 861250,
          cashFlowMargin: 16.34,
          operatingCashFlowRatio: 1.06,
        },
      };

      logger.info('Cash flow statement generated successfully', {
        period: statement.period,
        netCashChange: statement.netCashChange,
        closingCash: statement.closingCash,
      });

      return statement;
    } catch (error) {
      logger.error('Error generating cash flow statement', { error: error.message });
      const err = new Error(error.message);
      err.status = 400;
      throw err;
    }
  }

  /**
   * Generate trial balance
   * @param {Object} filters - { asOfDate, showZeroBalance }
   * @returns {Promise<Object>} - Trial balance
   */
  static async generateTrialBalance(filters = {}) {
    try {
      const { asOfDate, showZeroBalance } = filters;

      // In real implementation, get all GL account balances
      const trialBalance = {
        reportType: 'Trial Balance',
        asOfDate: asOfDate || new Date(),
        accounts: [
          {
            accountCode: '1001',
            accountName: 'Cash',
            accountType: 'Asset',
            debit: 500000,
            credit: 0,
          },
          {
            accountCode: '1101',
            accountName: 'Accounts Receivable',
            accountType: 'Asset',
            debit: 800000,
            credit: 0,
          },
          {
            accountCode: '1201',
            accountName: 'Inventory',
            accountType: 'Asset',
            debit: 1200000,
            credit: 0,
          },
          {
            accountCode: '2001',
            accountName: 'Accounts Payable',
            accountType: 'Liability',
            debit: 0,
            credit: 400000,
          },
          {
            accountCode: '3001',
            accountName: 'Capital',
            accountType: 'Equity',
            debit: 0,
            credit: 1000000,
          },
          {
            accountCode: '4001',
            accountName: 'Sales Revenue',
            accountType: 'Revenue',
            debit: 0,
            credit: 5000000,
          },
          {
            accountCode: '5001',
            accountName: 'Cost of Sales',
            accountType: 'Expense',
            debit: 4000000,
            credit: 0,
          },
        ],
        summary: {
          totalDebits: 6500000,
          totalCredits: 6400000,
          difference: 100000,
          balanced: false,
        },
      };

      // Calculate totals
      let totalDebits = 0;
      let totalCredits = 0;

      for (const account of trialBalance.accounts) {
        totalDebits += account.debit;
        totalCredits += account.credit;
      }

      trialBalance.summary.totalDebits = totalDebits;
      trialBalance.summary.totalCredits = totalCredits;
      trialBalance.summary.difference = Math.abs(totalDebits - totalCredits);
      trialBalance.summary.balanced = Math.abs(trialBalance.summary.difference) < 1;

      logger.info('Trial balance generated successfully', {
        asOfDate: trialBalance.asOfDate,
        balanced: trialBalance.summary.balanced,
        accountCount: trialBalance.accounts.length,
      });

      return trialBalance;
    } catch (error) {
      logger.error('Error generating trial balance', { error: error.message });
      const err = new Error(error.message);
      err.status = 400;
      throw err;
    }
  }

  /**
   * Generate financial ratio analysis
   * @param {Object} filters - { fromDate, toDate }
   * @returns {Promise<Object>} - Financial ratios
   */
  static async generateFinancialRatiosReport(filters = {}) {
    try {
      const { fromDate, toDate } = filters;

      // In real implementation, calculate from statements
      const report = {
        reportType: 'Financial Ratio Analysis',
        period: {
          fromDate: fromDate || new Date(new Date().getFullYear(), 0, 1),
          toDate: toDate || new Date(),
        },
        profitabilityRatios: {
          grossProfitMargin: 38.46,
          operatingProfitMargin: 16.92,
          netProfitMargin: 13.64,
          returnOnAssets: 19.74,
          returnOnEquity: 29.54,
        },
        liquidityRatios: {
          currentRatio: 2.6,
          quickRatio: 1.4,
          workingCapital: 1600000,
          cashRatio: 0.5,
        },
        solvencyRatios: {
          debtToEquity: 0.87,
          debtToAssets: 0.47,
          equityMultiplier: 1.87,
          interestCoverage: 10.75,
        },
        efficiencyRatios: {
          assetTurnover: 1.63,
          inventoryTurnover: 3.33,
          receivablesTurnover: 6.25,
          payablesTurnover: 10.0,
        },
        growthRatios: {
          revenueGrowth: 12.5,
          profitGrowth: 18.3,
          assetGrowth: 8.2,
          equityGrowth: 15.6,
        },
        analysis: {
          overallHealth: 'Healthy',
          trends: 'Improving',
          riskLevel: 'Low',
          recommendations: [
            'Maintain current profitability momentum',
            'Monitor inventory levels for efficiency',
            'Continue debt reduction strategy',
          ],
        },
      };

      logger.info('Financial ratios report generated successfully', {
        period: report.period,
        netProfitMargin: report.profitabilityRatios.netProfitMargin,
      });

      return report;
    } catch (error) {
      logger.error('Error generating ratios report', { error: error.message });
      const err = new Error(error.message);
      err.status = 400;
      throw err;
    }
  }

  /**
   * Generate departmental financial report
   * @param {string} costCenter - Cost center code
   * @param {Object} filters - { fromDate, toDate }
   * @returns {Promise<Object>} - Departmental report
   */
  static async generateDepartmentalReport(costCenter, filters = {}) {
    try {
      if (!costCenter) {
        throw new Error('Cost Center is required');
      }

      const { fromDate, toDate } = filters;

      // In real implementation, aggregate by cost center
      const report = {
        reportType: 'Departmental Financial Report',
        costCenter,
        period: {
          fromDate: fromDate || new Date(new Date().getFullYear(), 0, 1),
          toDate: toDate || new Date(),
        },
        revenues: 2000000,
        directCosts: 1200000,
        indirectCosts: 400000,
        grossMargin: 400000,
        grossMarginPercentage: 20,
        departmentScore: 85,
        performance: {
          vs_previousPeriod: 12.5,
          vs_budget: 5.2,
          vs_industry: 8.3,
        },
      };

      logger.info('Departmental report generated successfully', {
        costCenter,
        grossMarginPercentage: report.grossMarginPercentage,
      });

      return report;
    } catch (error) {
      logger.error('Error generating departmental report', { error: error.message, costCenter });
      const err = new Error(error.message);
      err.status = 400;
      throw err;
    }
  }

  /**
   * Generate consolidated financial statements
   * @param {Array<string>} subsidiaries - Subsidiary codes
   * @param {Object} filters - { fromDate, toDate }
   * @returns {Promise<Object>} - Consolidated statements
   */
  static async generateConsolidatedStatements(subsidiaries, filters = {}) {
    try {
      const { fromDate, toDate } = filters;

      if (!Array.isArray(subsidiaries) || subsidiaries.length === 0) {
        throw new Error('Subsidiaries array is required');
      }

      // In real implementation, consolidate from subsidiary statements
      const consolidated = {
        reportType: 'Consolidated Financial Statements',
        subsidiaries,
        period: {
          fromDate: fromDate || new Date(new Date().getFullYear(), 0, 1),
          toDate: toDate || new Date(),
        },
        consolidationAdjustments: [
          {
            description: 'Elimination of inter-company transactions',
            amount: -500000,
          },
          {
            description: 'Goodwill amortization',
            amount: -50000,
          },
        ],
        consolidatedIncomeStatement: {
          totalRevenues: 15000000,
          costOfSales: 9000000,
          grossProfit: 6000000,
          operatingExpenses: 3000000,
          netProfit: 2000000,
        },
        consolidatedBalance: {
          totalAssets: 20000000,
          totalLiabilities: 8000000,
          totalEquity: 12000000,
        },
        minorityInterest: 1500000,
      };

      logger.info('Consolidated statements generated successfully', {
        subsidiaryCount: subsidiaries.length,
        netProfit: consolidated.consolidatedIncomeStatement.netProfit,
      });

      return consolidated;
    } catch (error) {
      logger.error('Error generating consolidated statements', { error: error.message });
      const err = new Error(error.message);
      err.status = 400;
      throw err;
    }
  }

  /**
   * Validate financial statement integrity
   * @param {Object} statement - Statement to validate
   * @returns {Object} - Validation result
   */
  static validateFinancialStatement(statement) {
    const errors = [];
    const warnings = [];

    if (!statement.period || !statement.period.fromDate || !statement.period.toDate) {
      errors.push('Period dates are required');
    }

    if (statement.reportType === 'Balance Sheet') {
      const difference = Math.abs(
        statement.totalAssets - (statement.totalLiabilities + statement.equity.totalEquity),
      );
      if (difference > 1) {
        errors.push(`Balance sheet does not balance. Difference: ${difference}`);
      }
    }

    if (statement.reportType === 'Trial Balance') {
      const difference = Math.abs(statement.summary.totalDebits - statement.summary.totalCredits);
      if (difference > 1) {
        errors.push(`Trial balance does not balance. Difference: ${difference}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }
}

export default FinancialReportService;
