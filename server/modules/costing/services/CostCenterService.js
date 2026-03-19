import logger from '../../../config/logger.js';
import { AppError } from '../../../config/errorHandler.js';

/**
 * CostCenterService
 * Manages cost centers for allocating and tracking departmental costs
 */
class CostCenterService {
  /**
   * Create cost center
   * @param {Object} costCenterData - { code, name, description, department, managerName, location, budgetLimit }
   * @returns {Promise<Object>} - Created cost center
   */
  static async createCostCenter(costCenterData) {
    try {
      const { code, name, description, department, managerName, location, budgetLimit } = costCenterData;

      if (!code || !name || !department) {
        throw new Error('Cost Center Code, Name, and Department are required');
      }

      // Check if cost center code already exists
      const costCenterExists = await this.getCostCenterByCode(code);
      if (costCenterExists) {
        const err = new Error('Cost Center code already exists');
        err.status = 409;
        throw err;
      }

      if (budgetLimit !== undefined && budgetLimit < 0) {
        throw new Error('Budget limit cannot be negative');
      }

      // In real implementation, save to database
      const costCenter = {
        code,
        name,
        description,
        department,
        managerName,
        location,
        budgetLimit: budgetLimit || 0,
        status: 'Active',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      logger.info('Cost center created successfully', {
        code,
        name,
        department,
        budgetLimit,
      });

      return costCenter;
    } catch (error) {
      logger.error('Error creating cost center', { error: error.message });
      const err = error.status ? error : new Error(error.message);
      if (!err.status) err.status = 400;
      throw err;
    }
  }

  /**
   * Get cost center by code
   * @param {string} costCenterCode - Cost center code
   * @returns {Promise<Object>} - Cost center details
   */
  static async getCostCenterByCode(costCenterCode) {
    try {
      if (!costCenterCode) {
        throw new Error('Cost Center Code is required');
      }

      // In real implementation, fetch from database
      const costCenter = {
        code: costCenterCode,
        name: 'Manufacturing Floor',
        description: 'Main production facility',
        department: 'Production',
        managerName: 'John Doe',
        location: 'Plant A',
        budgetLimit: 500000,
        status: 'Active',
      };

      logger.info('Cost center retrieved by code', { code: costCenterCode });

      return costCenter;
    } catch (error) {
      logger.error('Error retrieving cost center by code', { error: error.message });
      const err = new Error(error.message);
      err.status = 404;
      throw err;
    }
  }

  /**
   * Get cost center by ID
   * @param {string} costCenterId - Cost center ID
   * @returns {Promise<Object>} - Cost center details
   */
  static async getCostCenterById(costCenterId) {
    try {
      if (!costCenterId) {
        throw new Error('Cost Center ID is required');
      }

      // In real implementation, fetch from database
      logger.info('Cost center retrieved by ID', { costCenterId });

      return {
        _id: costCenterId,
        code: 'CC001',
        name: 'Manufacturing Floor',
        department: 'Production',
        budgetLimit: 500000,
        status: 'Active',
      };
    } catch (error) {
      logger.error('Error retrieving cost center by ID', { error: error.message, costCenterId });
      const err = new Error(error.message);
      err.status = 404;
      throw err;
    }
  }

  /**
   * Get all cost centers
   * @param {Object} filters - { page, limit, status, department }
   * @returns {Promise<Object>} - Paginated cost centers
   */
  static async getAllCostCenters(filters = {}) {
    try {
      const { page = 1, limit = 50, status = 'Active', department } = filters;

      if (page < 1 || limit < 1) {
        throw new Error('Page and limit must be positive integers');
      }

      const skip = (page - 1) * limit;

      // In real implementation, query database
      const costCenters = [
        {
          code: 'CC001',
          name: 'Manufacturing Floor',
          department: 'Production',
          budgetLimit: 500000,
          status,
        },
        {
          code: 'CC002',
          name: 'Warehouse',
          department: 'Inventory',
          budgetLimit: 200000,
          status,
        },
      ];

      logger.info('All cost centers retrieved', { page, limit, department });

      return {
        data: costCenters,
        pagination: {
          page,
          limit,
          total: 2,
          pages: 1,
        },
      };
    } catch (error) {
      logger.error('Error retrieving all cost centers', { error: error.message });
      const err = new Error(error.message);
      err.status = 400;
      throw err;
    }
  }

  /**
   * Get cost centers by department
   * @param {string} department - Department name
   * @returns {Promise<Array>} - Cost centers in department
   */
  static async getCostCentersByDepartment(department) {
    try {
      if (!department) {
        throw new Error('Department is required');
      }

      // In real implementation, query database
      const costCenters = [
        {
          code: 'CC001',
          name: 'Manufacturing Floor',
          department,
          budgetLimit: 500000,
          status: 'Active',
        },
      ];

      logger.info('Cost centers retrieved by department', { department, count: costCenters.length });

      return costCenters;
    } catch (error) {
      logger.error('Error retrieving cost centers by department', {
        error: error.message,
        department,
      });
      const err = new Error(error.message);
      err.status = 400;
      throw err;
    }
  }

  /**
   * Update cost center
   * @param {string} costCenterId - Cost center ID
   * @param {Object} updateData - Fields to update
   * @returns {Promise<Object>} - Updated cost center
   */
  static async updateCostCenter(costCenterId, updateData) {
    try {
      if (!costCenterId) {
        throw new Error('Cost Center ID is required');
      }

      if (updateData.budgetLimit !== undefined && updateData.budgetLimit < 0) {
        throw new Error('Budget limit cannot be negative');
      }

      // In real implementation, update in database
      const updated = {
        costCenterId,
        ...updateData,
        updatedAt: new Date(),
      };

      logger.info('Cost center updated successfully', {
        costCenterId,
        fields: Object.keys(updateData),
      });

      return updated;
    } catch (error) {
      logger.error('Error updating cost center', { error: error.message, costCenterId });
      const err = new Error(error.message);
      err.status = 400;
      throw err;
    }
  }

  /**
   * Update cost center status
   * @param {string} costCenterId - Cost center ID
   * @param {string} status - New status (Active/Inactive)
   * @returns {Promise<Object>} - Updated cost center
   */
  static async updateCostCenterStatus(costCenterId, status) {
    try {
      const validStatuses = ['Active', 'Inactive', 'Suspended'];

      if (!costCenterId) {
        throw new Error('Cost Center ID is required');
      }

      if (!validStatuses.includes(status)) {
        throw new Error(`Invalid status. Valid statuses: ${validStatuses.join(', ')}`);
      }

      // In real implementation, update in database
      const updated = {
        costCenterId,
        status,
        updatedAt: new Date(),
      };

      logger.info('Cost center status updated successfully', { costCenterId, status });

      return updated;
    } catch (error) {
      logger.error('Error updating cost center status', { error: error.message, costCenterId });
      const err = new Error(error.message);
      err.status = 400;
      throw err;
    }
  }

  /**
   * Get cost center budget vs actual
   * @param {string} costCenterId - Cost center ID
   * @param {Object} filters - { fromDate, toDate }
   * @returns {Promise<Object>} - Budget vs actual comparison
   */
  static async getBudgetVsActual(costCenterId, filters = {}) {
    try {
      if (!costCenterId) {
        throw new Error('Cost Center ID is required');
      }

      const { fromDate, toDate } = filters;

      // In real implementation, aggregate from database
      const comparison = {
        costCenterId,
        period: {
          fromDate: fromDate || new Date(new Date().getFullYear(), 0, 1),
          toDate: toDate || new Date(),
        },
        budget: {
          materialCost: 100000,
          laborCost: 50000,
          overheadCost: 30000,
          total: 180000,
        },
        actual: {
          materialCost: 98000,
          laborCost: 51000,
          overheadCost: 29500,
          total: 178500,
        },
        variance: {
          materialCost: 2000,
          laborCost: -1000,
          overheadCost: 500,
          total: 1500,
        },
        variancePercentage: 0.83,
        percentageUsed: 99.17,
      };

      logger.info('Budget vs actual retrieved successfully', {
        costCenterId,
        variancePercentage: comparison.variancePercentage,
      });

      return comparison;
    } catch (error) {
      logger.error('Error retrieving budget vs actual', { error: error.message, costCenterId });
      const err = new Error(error.message);
      err.status = 404;
      throw err;
    }
  }

  /**
   * Get cost center allocation summary
   * @param {string} costCenterId - Cost center ID
   * @returns {Promise<Object>} - Cost allocation breakdown
   */
  static async getCostAllocationSummary(costCenterId) {
    try {
      if (!costCenterId) {
        throw new Error('Cost Center ID is required');
      }

      // In real implementation, aggregate from database
      const summary = {
        costCenterId,
        totalCostAllocated: 178500,
        allocation: {
          directCosts: 149000,
          indirectCosts: 29500,
        },
        byProductionOrder: [
          {
            productionOrderId: 'PO001',
            allocatedCost: 50000,
            percentage: 28.03,
          },
          {
            productionOrderId: 'PO002',
            allocatedCost: 40000,
            percentage: 22.42,
          },
        ],
        costByType: {
          material: 98000,
          labor: 51000,
          overhead: 29500,
        },
      };

      logger.info('Cost allocation summary retrieved', {
        costCenterId,
        totalCost: summary.totalCostAllocated,
      });

      return summary;
    } catch (error) {
      logger.error('Error retrieving cost allocation summary', { error: error.message, costCenterId });
      const err = new Error(error.message);
      err.status = 404;
      throw err;
    }
  }

  /**
   * Generate cost center report
   * @param {Object} filters - { costCenter, fromDate, toDate }
   * @returns {Promise<Object>} - Comprehensive cost center report
   */
  static async generateCostCenterReport(filters = {}) {
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
          totalCostCenters: 10,
          totalBudget: 1800000,
          totalActual: 1785000,
          totalVariance: 15000,
          variancePercentage: 0.83,
        },
        costCenterList: [
          {
            code: 'CC001',
            name: 'Manufacturing Floor',
            budget: 500000,
            actual: 498000,
            variance: 2000,
            variancePercentage: 0.4,
          },
          {
            code: 'CC002',
            name: 'Warehouse',
            budget: 200000,
            actual: 202000,
            variance: -2000,
            variancePercentage: -1,
          },
        ],
        topCostCenters: [
          {
            code: 'CC001',
            totalCost: 498000,
          },
          {
            code: 'CC003',
            totalCost: 350000,
          },
        ],
      };

      logger.info('Cost center report generated', {
        costCenter,
        totalCenters: report.summary.totalCostCenters,
      });

      return report;
    } catch (error) {
      logger.error('Error generating cost center report', { error: error.message });
      const err = new Error(error.message);
      err.status = 400;
      throw err;
    }
  }

  /**
   * Validate cost center data
   * @param {Object} costCenterData - Data to validate
   * @returns {Object} - Validation result
   */
  static validateCostCenterData(costCenterData) {
    const errors = [];

    if (!costCenterData.code) {
      errors.push('Cost Center Code is required');
    }
    if (!costCenterData.name) {
      errors.push('Cost Center Name is required');
    }
    if (!costCenterData.department) {
      errors.push('Department is required');
    }
    if (costCenterData.budgetLimit !== undefined && typeof costCenterData.budgetLimit !== 'number') {
      errors.push('Budget limit must be a number');
    }
    if (costCenterData.budgetLimit < 0) {
      errors.push('Budget limit cannot be negative');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

export default CostCenterService;
