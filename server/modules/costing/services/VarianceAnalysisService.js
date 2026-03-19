import logger from '../../../config/logger.js';
import { AppError } from '../../../config/errorHandler.js';

/**
 * VarianceAnalysisService
 * Analyzes variances between standard and actual costs
 * Identifies and categorizes performance deviations
 */
class VarianceAnalysisService {
  /**
   * Calculate material cost variance
   * @param {string} productionOrderId - Production order ID
   * @param {number} standardQuantity - Standard quantity expected
   * @param {number} actualQuantity - Actual quantity used
   * @param {number} standardPrice - Standard price per unit
   * @param {number} actualPrice - Actual price per unit
   * @returns {Promise<Object>} - Material variance analysis
   */
  static async calculateMaterialVariance(
    productionOrderId,
    standardQuantity,
    actualQuantity,
    standardPrice,
    actualPrice,
  ) {
    try {
      if (!productionOrderId) {
        throw new Error('Production Order ID is required');
      }

      if (standardQuantity === undefined || actualQuantity === undefined) {
        throw new Error('Standard and Actual quantities are required');
      }

      if (standardPrice === undefined || actualPrice === undefined) {
        throw new Error('Standard and Actual prices are required');
      }

      // Material Quantity Variance = (Standard Quantity - Actual Quantity) × Standard Price
      const quantityVariance = (standardQuantity - actualQuantity) * standardPrice;

      // Material Price Variance = (Standard Price - Actual Price) × Actual Quantity
      const priceVariance = (standardPrice - actualPrice) * actualQuantity;

      // Total Material Variance
      const totalVariance = quantityVariance + priceVariance;

      // Variance Analysis
      const quantityVarianceType = quantityVariance > 0 ? 'Favorable' : quantityVariance < 0 ? 'Unfavorable' : 'Neutral';
      const priceVarianceType = priceVariance > 0 ? 'Favorable' : priceVariance < 0 ? 'Unfavorable' : 'Neutral';
      const totalVarianceType =
        totalVariance > 0 ? 'Favorable' : totalVariance < 0 ? 'Unfavorable' : 'Neutral';

      const analysis = {
        productionOrderId,
        variances: {
          quantityVariance: {
            amount: quantityVariance,
            type: quantityVarianceType,
            percentage: ((quantityVariance / (standardQuantity * standardPrice)) * 100).toFixed(2),
          },
          priceVariance: {
            amount: priceVariance,
            type: priceVarianceType,
            percentage: ((priceVariance / (actualQuantity * standardPrice)) * 100).toFixed(2),
          },
          totalVariance: {
            amount: totalVariance,
            type: totalVarianceType,
            percentage: (
              ((totalVariance / (standardQuantity * standardPrice)) * 100)
            ).toFixed(2),
          },
        },
        standardCost: standardQuantity * standardPrice,
        actualCost: actualQuantity * actualPrice,
      };

      logger.info('Material variance calculated successfully', {
        productionOrderId,
        quantityVariance,
        priceVariance,
        totalVariance,
      });

      return analysis;
    } catch (error) {
      logger.error('Error calculating material variance', { error: error.message });
      const err = new Error(error.message);
      err.status = 400;
      throw err;
    }
  }

  /**
   * Calculate labor cost variance
   * @param {string} productionOrderId - Production order ID
   * @param {number} standardHours - Standard hours expected
   * @param {number} actualHours - Actual hours worked
   * @param {number} standardRate - Standard hourly rate
   * @param {number} actualRate - Actual hourly rate
   * @returns {Promise<Object>} - Labor variance analysis
   */
  static async calculateLaborVariance(
    productionOrderId,
    standardHours,
    actualHours,
    standardRate,
    actualRate,
  ) {
    try {
      if (!productionOrderId) {
        throw new Error('Production Order ID is required');
      }

      if (standardHours === undefined || actualHours === undefined) {
        throw new Error('Standard and Actual hours are required');
      }

      if (standardRate === undefined || actualRate === undefined) {
        throw new Error('Standard and Actual rates are required');
      }

      // Labor Efficiency Variance = (Standard Hours - Actual Hours) × Standard Rate
      const efficiencyVariance = (standardHours - actualHours) * standardRate;

      // Labor Rate Variance = (Standard Rate - Actual Rate) × Actual Hours
      const rateVariance = (standardRate - actualRate) * actualHours;

      // Total Labor Variance
      const totalVariance = efficiencyVariance + rateVariance;

      // Variance Analysis
      const efficiencyVarianceType =
        efficiencyVariance > 0 ? 'Favorable' : efficiencyVariance < 0 ? 'Unfavorable' : 'Neutral';
      const rateVarianceType = rateVariance > 0 ? 'Favorable' : rateVariance < 0 ? 'Unfavorable' : 'Neutral';
      const totalVarianceType =
        totalVariance > 0 ? 'Favorable' : totalVariance < 0 ? 'Unfavorable' : 'Neutral';

      const analysis = {
        productionOrderId,
        variances: {
          efficiencyVariance: {
            amount: efficiencyVariance,
            type: efficiencyVarianceType,
            percentage: (
              ((efficiencyVariance / (standardHours * standardRate)) * 100)
            ).toFixed(2),
          },
          rateVariance: {
            amount: rateVariance,
            type: rateVarianceType,
            percentage: (
              ((rateVariance / (actualHours * standardRate)) * 100)
            ).toFixed(2),
          },
          totalVariance: {
            amount: totalVariance,
            type: totalVarianceType,
            percentage: (
              ((totalVariance / (standardHours * standardRate)) * 100)
            ).toFixed(2),
          },
        },
        standardCost: standardHours * standardRate,
        actualCost: actualHours * actualRate,
      };

      logger.info('Labor variance calculated successfully', {
        productionOrderId,
        efficiencyVariance,
        rateVariance,
        totalVariance,
      });

      return analysis;
    } catch (error) {
      logger.error('Error calculating labor variance', { error: error.message });
      const err = new Error(error.message);
      err.status = 400;
      throw err;
    }
  }

  /**
   * Get variance analysis for production order
   * @param {string} productionOrderId - Production order ID
   * @returns {Promise<Object>} - Complete variance analysis
   */
  static async getVarianceAnalysis(productionOrderId) {
    try {
      if (!productionOrderId) {
        throw new Error('Production Order ID is required');
      }

      // In real implementation, fetch from database
      const analysis = {
        productionOrderId,
        materialVariance: {
          quantityVariance: 500,
          priceVariance: -200,
          totalVariance: 300,
        },
        laborVariance: {
          efficiencyVariance: -100,
          rateVariance: 50,
          totalVariance: -50,
        },
        overheadVariance: {
          budgetVariance: 25,
          volumeVariance: -10,
          totalVariance: 15,
        },
        totalVariance: 265,
        variancePercentage: 2.8,
        status: 'Acceptable', // Within threshold
      };

      logger.info('Variance analysis retrieved successfully', {
        productionOrderId,
        totalVariance: analysis.totalVariance,
      });

      return analysis;
    } catch (error) {
      logger.error('Error retrieving variance analysis', { error: error.message, productionOrderId });
      const err = new Error(error.message);
      err.status = 404;
      throw err;
    }
  }

  /**
   * Get variances by time period
   * @param {Object} filters - { fromDate, toDate, costCenter, varianceType }
   * @returns {Promise<Array>} - Variances in period
   */
  static async getVariancesByPeriod(filters = {}) {
    try {
      const { fromDate, toDate, costCenter, varianceType } = filters;

      // Validate dates
      if (fromDate && toDate && fromDate > toDate) {
        throw new Error('From date must be before to date');
      }

      // In real implementation, query database
      const variances = [
        {
          productionOrderId: 'PO001',
          materialVariance: 300,
          laborVariance: -50,
          overheadVariance: 15,
          totalVariance: 265,
          date: new Date(),
          status: 'Acceptable',
        },
        {
          productionOrderId: 'PO002',
          materialVariance: -500,
          laborVariance: 100,
          overheadVariance: -25,
          totalVariance: -425,
          date: new Date(),
          status: 'Review',
        },
      ];

      logger.info('Variances retrieved for period', {
        count: variances.length,
        costCenter,
      });

      return variances;
    } catch (error) {
      logger.error('Error retrieving variances by period', { error: error.message });
      const err = new Error(error.message);
      err.status = 400;
      throw err;
    }
  }

  /**
   * Identify high variance productions
   * @param {number} thresholdPercentage - Variance threshold percentage (default 5%)
   * @returns {Promise<Array>} - Productions exceeding threshold
   */
  static async getHighVarianceProductions(thresholdPercentage = 5) {
    try {
      if (thresholdPercentage < 0 || thresholdPercentage > 100) {
        throw new Error('Threshold percentage must be between 0 and 100');
      }

      // In real implementation, query database
      const highVarianceOrders = [
        {
          productionOrderId: 'PO005',
          standardCost: 10000,
          actualCost: 11200,
          variance: 1200,
          variancePercentage: 12,
          varianceType: 'Unfavorable',
          mainCause: 'Material price increase',
          severity: 'High',
        },
        {
          productionOrderId: 'PO006',
          standardCost: 8000,
          actualCost: 7400,
          variance: 600,
          variancePercentage: 7.5,
          varianceType: 'Favorable',
          mainCause: 'Labor efficiency improvement',
          severity: 'Medium',
        },
      ];

      logger.info('High variance productions identified', {
        threshold: thresholdPercentage,
        count: highVarianceOrders.length,
      });

      return highVarianceOrders;
    } catch (error) {
      logger.error('Error identifying high variance productions', { error: error.message });
      const err = new Error(error.message);
      err.status = 400;
      throw err;
    }
  }

  /**
   * Generate variance analysis report
   * @param {Object} filters - { fromDate, toDate, costCenter }
   * @returns {Promise<Object>} - Comprehensive variance report
   */
  static async generateVarianceReport(filters = {}) {
    try {
      const { fromDate, toDate, costCenter } = filters;

      // In real implementation, aggregate from database
      const report = {
        reportPeriod: {
          fromDate: fromDate || new Date(new Date().getFullYear(), 0, 1),
          toDate: toDate || new Date(),
        },
        costCenter: costCenter || 'All',
        summary: {
          totalProductions: 50,
          totalStandardCost: 500000,
          totalActualCost: 510000,
          totalVariance: 10000,
          variancePercentage: 2,
        },
        varianceBreakdown: {
          favorableVariances: 15,
          unfavorableVariances: 30,
          neutralVariances: 5,
        },
        byType: {
          materialVariance: {
            total: 5000,
            favorable: 2000,
            unfavorable: 3000,
          },
          laborVariance: {
            total: 3000,
            favorable: 2500,
            unfavorable: 500,
          },
          overheadVariance: {
            total: 2000,
            favorable: 1500,
            unfavorable: 500,
          },
        },
        topProductionOrders: [
          {
            productionOrderId: 'PO001',
            variance: 1500,
            varianceType: 'Unfavorable',
          },
          {
            productionOrderId: 'PO002',
            variance: 1200,
            varianceType: 'Favorable',
          },
        ],
      };

      logger.info('Variance report generated', {
        costCenter,
        totalProductions: report.summary.totalProductions,
        totalVariance: report.summary.totalVariance,
      });

      return report;
    } catch (error) {
      logger.error('Error generating variance report', { error: error.message });
      const err = new Error(error.message);
      err.status = 400;
      throw err;
    }
  }

  /**
   * Categorize variance for investigation
   * @param {Object} varianceData - { amount, type, percentage, cause }
   * @returns {string} - Categorization result
   */
  static categorizeVariance(varianceData) {
    const { amount, percentage } = varianceData;

    if (Math.abs(percentage) <= 2) {
      return 'Acceptable';
    } else if (Math.abs(percentage) <= 5) {
      return 'Monitor';
    } else if (Math.abs(percentage) <= 10) {
      return 'Review';
    } else {
      return 'Investigate';
    }
  }

  /**
   * Export variance data for analysis
   * @param {string} productionOrderId - Production order ID
   * @returns {Promise<Object>} - Export-ready variance data
   */
  static async exportVarianceData(productionOrderId) {
    try {
      if (!productionOrderId) {
        throw new Error('Production Order ID is required');
      }

      // In real implementation, fetch from database
      const exportData = {
        productionOrderId,
        timestamp: new Date(),
        materialVariance: {
          quantity: 10,
          price: -5,
          total: 5,
        },
        laborVariance: {
          efficiency: -20,
          rate: 10,
          total: -10,
        },
        overheadVariance: {
          budget: 5,
          volume: -2,
          total: 3,
        },
        totalVariance: -2,
        notes: 'Variance analysis completed',
      };

      logger.info('Variance data exported successfully', {
        productionOrderId,
      });

      return exportData;
    } catch (error) {
      logger.error('Error exporting variance data', { error: error.message, productionOrderId });
      const err = new Error(error.message);
      err.status = 400;
      throw err;
    }
  }
}

export default VarianceAnalysisService;
