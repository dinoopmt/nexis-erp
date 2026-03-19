import logger from '../../../config/logger.js';
import { AppError } from '../../../config/errorHandler.js';

/**
 * ActualCostService
 * Tracks and manages actual production costs
 * Records material, labor, and overhead consumed in manufacturing
 */
class ActualCostService {
  /**
   * Record actual material cost
   * @param {Object} costData - { productionOrderId, materialId, quantity, unitCost, date, costCenter }
   * @returns {Promise<Object>} - Actual material cost record
   */
  static async recordMaterialCost(costData) {
    try {
      const { productionOrderId, materialId, quantity, unitCost, date, costCenter } = costData;

      if (!productionOrderId || !materialId || !quantity || !costCenter) {
        throw new Error('Production Order ID, Material ID, Quantity, and Cost Center are required');
      }

      if (quantity <= 0) {
        throw new Error('Quantity must be greater than 0');
      }

      if (unitCost < 0) {
        throw new Error('Unit cost cannot be negative');
      }

      const totalCost = quantity * unitCost;

      // In real implementation, save to database
      const materialCostRecord = {
        productionOrderId,
        materialId,
        quantity,
        unitCost,
        totalCost,
        costCenter,
        recordDate: date || new Date(),
        status: 'Recorded',
        createdAt: new Date(),
      };

      logger.info('Material cost recorded successfully', {
        productionOrderId,
        materialId,
        quantity,
        totalCost,
        costCenter,
      });

      return materialCostRecord;
    } catch (error) {
      logger.error('Error recording material cost', { error: error.message });
      const err = new Error(error.message);
      err.status = 400;
      throw err;
    }
  }

  /**
   * Record actual labor cost
   * @param {Object} costData - { productionOrderId, employeeId, hoursWorked, hourlyRate, date, costCenter }
   * @returns {Promise<Object>} - Actual labor cost record
   */
  static async recordLaborCost(costData) {
    try {
      const { productionOrderId, employeeId, hoursWorked, hourlyRate, date, costCenter } = costData;

      if (!productionOrderId || !employeeId || hoursWorked === undefined || !costCenter) {
        throw new Error('Production Order ID, Employee ID, Hours Worked, and Cost Center are required');
      }

      if (hoursWorked <= 0) {
        throw new Error('Hours worked must be greater than 0');
      }

      if (hourlyRate < 0) {
        throw new Error('Hourly rate cannot be negative');
      }

      const totalCost = hoursWorked * hourlyRate;

      // In real implementation, save to database
      const laborCostRecord = {
        productionOrderId,
        employeeId,
        hoursWorked,
        hourlyRate,
        totalCost,
        costCenter,
        recordDate: date || new Date(),
        status: 'Recorded',
        createdAt: new Date(),
      };

      logger.info('Labor cost recorded successfully', {
        productionOrderId,
        employeeId,
        hoursWorked,
        totalCost,
        costCenter,
      });

      return laborCostRecord;
    } catch (error) {
      logger.error('Error recording labor cost', { error: error.message });
      const err = new Error(error.message);
      err.status = 400;
      throw err;
    }
  }

  /**
   * Record actual overhead cost
   * @param {Object} costData - { productionOrderId, overheadType, amount, date, costCenter }
   * @returns {Promise<Object>} - Actual overhead cost record
   */
  static async recordOverheadCost(costData) {
    try {
      const { productionOrderId, overheadType, amount, date, costCenter } = costData;

      if (!productionOrderId || !overheadType || amount === undefined || !costCenter) {
        throw new Error('Production Order ID, Overhead Type, Amount, and Cost Center are required');
      }

      if (amount < 0) {
        throw new Error('Overhead amount cannot be negative');
      }

      // Validate overhead type
      const validTypes = ['Utilities', 'Depreciation', 'Rent', 'Maintenance', 'Supervision', 'Other'];
      if (!validTypes.includes(overheadType)) {
        throw new Error(`Invalid overhead type. Valid types: ${validTypes.join(', ')}`);
      }

      // In real implementation, save to database
      const overheadCostRecord = {
        productionOrderId,
        overheadType,
        amount,
        costCenter,
        recordDate: date || new Date(),
        status: 'Recorded',
        createdAt: new Date(),
      };

      logger.info('Overhead cost recorded successfully', {
        productionOrderId,
        overheadType,
        amount,
        costCenter,
      });

      return overheadCostRecord;
    } catch (error) {
      logger.error('Error recording overhead cost', { error: error.message });
      const err = new Error(error.message);
      err.status = 400;
      throw err;
    }
  }

  /**
   * Get actual costs for production order
   * @param {string} productionOrderId - Production order ID
   * @returns {Promise<Object>} - All actual costs
   */
  static async getActualCostsForOrder(productionOrderId) {
    try {
      if (!productionOrderId) {
        throw new Error('Production Order ID is required');
      }

      // In real implementation, fetch from database
      const materialCosts = [
        {
          materialId: 'MAT001',
          quantity: 100,
          unitCost: 50,
          totalCost: 5000,
        },
      ];

      const laborCosts = [
        {
          employeeId: 'EMP001',
          hoursWorked: 20,
          hourlyRate: 100,
          totalCost: 2000,
        },
      ];

      const overheadCosts = [
        {
          overheadType: 'Utilities',
          amount: 500,
        },
      ];

      const totalMaterialCost = materialCosts.reduce((sum, item) => sum + item.totalCost, 0);
      const totalLaborCost = laborCosts.reduce((sum, item) => sum + item.totalCost, 0);
      const totalOverheadCost = overheadCosts.reduce((sum, item) => sum + item.amount, 0);
      const totalActualCost = totalMaterialCost + totalLaborCost + totalOverheadCost;

      logger.info('Actual costs retrieved for production order', {
        productionOrderId,
        totalActualCost,
      });

      return {
        productionOrderId,
        materialCosts,
        laborCosts,
        overheadCosts,
        summary: {
          totalMaterialCost,
          totalLaborCost,
          totalOverheadCost,
          totalActualCost,
        },
      };
    } catch (error) {
      logger.error('Error retrieving actual costs', { error: error.message, productionOrderId });
      const err = new Error(error.message);
      err.status = 404;
      throw err;
    }
  }

  /**
   * Get actual costs by cost center
   * @param {string} costCenter - Cost center code
   * @param {Object} filters - { fromDate, toDate, page, limit }
   * @returns {Promise<Object>} - Paginated costs
   */
  static async getActualCostsByCenter(costCenter, filters = {}) {
    try {
      const { fromDate, toDate, page = 1, limit = 50 } = filters;

      if (!costCenter) {
        throw new Error('Cost Center is required');
      }

      const skip = (page - 1) * limit;

      // In real implementation, query database
      const costs = [
        {
          productionOrderId: 'PO001',
          totalMaterialCost: 5000,
          totalLaborCost: 2000,
          totalOverheadCost: 500,
          totalActualCost: 7500,
          recordDate: new Date(),
        },
      ];

      logger.info('Actual costs retrieved by cost center', {
        costCenter,
        page,
        limit,
      });

      return {
        data: costs,
        pagination: {
          page,
          limit,
          total: 1,
          pages: 1,
        },
      };
    } catch (error) {
      logger.error('Error retrieving actual costs by cost center', {
        error: error.message,
        costCenter,
      });
      const err = new Error(error.message);
      err.status = 400;
      throw err;
    }
  }

  /**
   * Calculate total actual cost for multiple orders
   * @param {Array<string>} productionOrderIds - Array of production order IDs
   * @returns {Promise<Array>} - Actual costs for each order
   */
  static async calculateActualCostsForOrders(productionOrderIds) {
    try {
      if (!Array.isArray(productionOrderIds) || productionOrderIds.length === 0) {
        throw new Error('Production Order IDs array is required and must not be empty');
      }

      if (productionOrderIds.length > 500) {
        throw new Error('Cannot calculate costs for more than 500 orders at once');
      }

      // In real implementation, query database
      const costs = productionOrderIds.map((orderId) => ({
        productionOrderId: orderId,
        totalMaterialCost: 5000,
        totalLaborCost: 2000,
        totalOverheadCost: 500,
        totalActualCost: 7500,
      }));

      logger.info('Actual costs calculated for multiple orders', {
        count: productionOrderIds.length,
      });

      return costs;
    } catch (error) {
      logger.error('Error calculating actual costs for orders', { error: error.message });
      const err = new Error(error.message);
      err.status = 400;
      throw err;
    }
  }

  /**
   * Generate actual cost report
   * @param {Object} filters - { costCenter, fromDate, toDate }
   * @returns {Promise<Object>} - Cost report
   */
  static async generateActualCostReport(filters = {}) {
    try {
      const { costCenter, fromDate, toDate } = filters;

      // In real implementation, aggregate from database
      const report = {
        reportPeriod: {
          fromDate: fromDate || new Date(new Date().getFullYear(), 0, 1),
          toDate: toDate || new Date(),
        },
        costCenter: costCenter || 'All',
        summary: {
          totalProductionOrders: 50,
          totalMaterialCost: 300000,
          totalLaborCost: 100000,
          totalOverheadCost: 30000,
          totalActualCost: 430000,
          averageCostPerOrder: 8600,
        },
        costDistribution: {
          materialPercentage: 69.77,
          laborPercentage: 23.26,
          overheadPercentage: 6.98,
        },
        costCenterComparison: [
          {
            costCenter: 'CC001',
            totalCost: 150000,
            percentage: 34.88,
          },
          {
            costCenter: 'CC002',
            totalCost: 280000,
            percentage: 65.12,
          },
        ],
      };

      logger.info('Actual cost report generated', {
        costCenter,
        totalOrders: report.summary.totalProductionOrders,
      });

      return report;
    } catch (error) {
      logger.error('Error generating actual cost report', { error: error.message });
      const err = new Error(error.message);
      err.status = 400;
      throw err;
    }
  }

  /**
   * Close production order costs
   * @param {string} productionOrderId - Production order ID
   * @returns {Promise<Object>} - Closed cost summary
   */
  static async closeProductionOrderCosts(productionOrderId) {
    try {
      if (!productionOrderId) {
        throw new Error('Production Order ID is required');
      }

      // In real implementation, finalize costs in database
      const closedCosts = {
        productionOrderId,
        status: 'Closed',
        totalMaterialCost: 5000,
        totalLaborCost: 2000,
        totalOverheadCost: 500,
        totalActualCost: 7500,
        closedDate: new Date(),
        closedBy: 'user123',
      };

      logger.info('Production order costs closed successfully', {
        productionOrderId,
        totalCost: closedCosts.totalActualCost,
      });

      return closedCosts;
    } catch (error) {
      logger.error('Error closing production order costs', { error: error.message, productionOrderId });
      const err = new Error(error.message);
      err.status = 400;
      throw err;
    }
  }

  /**
   * Export actual costs for accounting
   * @param {string} productionOrderId - Production order ID
   * @returns {Promise<Object>} - Journal entry ready format
   */
  static async exportForAccounting(productionOrderId) {
    try {
      if (!productionOrderId) {
        throw new Error('Production Order ID is required');
      }

      // In real implementation, fetch costs from database
      const journalEntries = {
        entries: [
          {
            accountCode: '1001', // WIP account
            debit: 7500,
            credit: 0,
            description: 'Work in Progress for Order ' + productionOrderId,
          },
          {
            accountCode: '5001', // Material consumed
            debit: 0,
            credit: 5000,
            description: 'Material Consumed',
          },
          {
            accountCode: '5002', // Labor consumed
            debit: 0,
            credit: 2000,
            description: 'Labor Consumed',
          },
          {
            accountCode: '5003', // Overhead consumed
            debit: 0,
            credit: 500,
            description: 'Overhead Consumed',
          },
        ],
        totalDebit: 7500,
        totalCredit: 7500,
      };

      logger.info('Actual costs exported for accounting', {
        productionOrderId,
        entries: journalEntries.entries.length,
      });

      return journalEntries;
    } catch (error) {
      logger.error('Error exporting costs for accounting', { error: error.message, productionOrderId });
      const err = new Error(error.message);
      err.status = 400;
      throw err;
    }
  }
}

export default ActualCostService;
