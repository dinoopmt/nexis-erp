import logger from '../../../config/logger.js';
import { AppError } from '../../../config/errorHandler.js';

/**
 * StandardCostingService
 * Manages standard costing for products and services
 * Used for budgeting, forecasting, and variance analysis
 */
class StandardCostingService {
  /**
   * Create or update standard cost for a product
   * @param {Object} costData - { productId, costCenter, materialCost, laborCost, overheadCost, effectiveDate, approvedBy }
   * @returns {Promise<Object>} - Standard cost record
   */
  static async createStandardCost(costData) {
    try {
      const { productId, costCenter, materialCost, laborCost, overheadCost, effectiveDate, approvedBy } = costData;

      if (!productId || !costCenter) {
        throw new Error('Product ID and Cost Center are required');
      }

      if ((materialCost || 0) < 0 || (laborCost || 0) < 0 || (overheadCost || 0) < 0) {
        throw new Error('Material, Labor, and Overhead costs cannot be negative');
      }

      const totalCost = (materialCost || 0) + (laborCost || 0) + (overheadCost || 0);

      // In real implementation, save to database
      const standardCost = {
        productId,
        costCenter,
        materialCost: materialCost || 0,
        laborCost: laborCost || 0,
        overheadCost: overheadCost || 0,
        totalStandardCost: totalCost,
        effectiveDate: effectiveDate || new Date(),
        approvedBy,
        status: 'Active',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      logger.info('Standard cost created successfully', {
        productId,
        costCenter,
        totalStandardCost: totalCost,
        createdBy: approvedBy,
      });

      return standardCost;
    } catch (error) {
      logger.error('Error creating standard cost', { error: error.message });
      const err = new Error(error.message);
      err.status = 400;
      throw err;
    }
  }

  /**
   * Update standard cost
   * @param {string} standardCostId - Standard cost record ID
   * @param {Object} updateData - Fields to update
   * @returns {Promise<Object>} - Updated standard cost
   */
  static async updateStandardCost(standardCostId, updateData) {
    try {
      if (!standardCostId) {
        throw new Error('Standard Cost ID is required');
      }

      // Validate numeric fields if provided
      if (updateData.materialCost !== undefined && updateData.materialCost < 0) {
        throw new Error('Material cost cannot be negative');
      }
      if (updateData.laborCost !== undefined && updateData.laborCost < 0) {
        throw new Error('Labor cost cannot be negative');
      }
      if (updateData.overheadCost !== undefined && updateData.overheadCost < 0) {
        throw new Error('Overhead cost cannot be negative');
      }

      // In real implementation, fetch and update in database
      const updatedCost = {
        ...updateData,
        updatedAt: new Date(),
      };

      logger.info('Standard cost updated successfully', {
        standardCostId,
        fieldsUpdated: Object.keys(updateData),
      });

      return updatedCost;
    } catch (error) {
      logger.error('Error updating standard cost', { error: error.message, standardCostId });
      const err = new Error(error.message);
      err.status = 400;
      throw err;
    }
  }

  /**
   * Get standard cost for product
   * @param {string} productId - Product ID
   * @param {string} costCenter - Cost center code
   * @returns {Promise<Object>} - Standard cost
   */
  static async getStandardCost(productId, costCenter) {
    try {
      if (!productId || !costCenter) {
        throw new Error('Product ID and Cost Center are required');
      }

      // In real implementation, fetch from database
      logger.info('Standard cost retrieved', { productId, costCenter });

      return {
        productId,
        costCenter,
        materialCost: 1000,
        laborCost: 500,
        overheadCost: 300,
        totalStandardCost: 1800,
        status: 'Active',
      };
    } catch (error) {
      logger.error('Error retrieving standard cost', { error: error.message, productId, costCenter });
      const err = new Error(error.message);
      err.status = 404;
      throw err;
    }
  }

  /**
   * Get standard costs by cost center
   * @param {string} costCenter - Cost center code
   * @param {Object} filters - { page, limit, status }
   * @returns {Promise<Object>} - Paginated list
   */
  static async getStandardCostsByCenter(costCenter, filters = {}) {
    try {
      const { page = 1, limit = 50, status = 'Active' } = filters;

      if (!costCenter) {
        throw new Error('Cost Center is required');
      }

      const skip = (page - 1) * limit;

      // In real implementation, query database with pagination
      const costs = [
        {
          productId: 'PROD001',
          costCenter,
          totalStandardCost: 1800,
          status,
        },
        {
          productId: 'PROD002',
          costCenter,
          totalStandardCost: 2500,
          status,
        },
      ];

      logger.info('Standard costs retrieved by cost center', { costCenter, page, limit });

      return {
        data: costs,
        pagination: {
          page,
          limit,
          total: 2,
          pages: 1,
        },
      };
    } catch (error) {
      logger.error('Error retrieving standard costs by center', { error: error.message, costCenter });
      const err = new Error(error.message);
      err.status = 400;
      throw err;
    }
  }

  /**
   * Get standard costs for multiple products
   * @param {Array<string>} productIds - Array of product IDs
   * @returns {Promise<Array>} - Standard costs for products
   */
  static async getStandardCostsForProducts(productIds) {
    try {
      if (!Array.isArray(productIds) || productIds.length === 0) {
        throw new Error('Product IDs array is required and must not be empty');
      }

      if (productIds.length > 500) {
        throw new Error('Cannot retrieve standard costs for more than 500 products at once');
      }

      // In real implementation, query database with IN clause
      const costs = productIds.map((productId) => ({
        productId,
        costCenter: 'CC001',
        totalStandardCost: 1800,
        status: 'Active',
      }));

      logger.info('Standard costs retrieved for multiple products', { count: productIds.length });

      return costs;
    } catch (error) {
      logger.error('Error retrieving standard costs for products', { error: error.message });
      const err = new Error(error.message);
      err.status = 400;
      throw err;
    }
  }

  /**
   * Archive standard cost (soft delete)
   * @param {string} standardCostId - Standard cost record ID
   * @returns {Promise<Object>} - Archived cost
   */
  static async archiveStandardCost(standardCostId) {
    try {
      if (!standardCostId) {
        throw new Error('Standard Cost ID is required');
      }

      // In real implementation, update isDeleted flag
      const archived = {
        standardCostId,
        status: 'Archived',
        archivedAt: new Date(),
      };

      logger.info('Standard cost archived successfully', { standardCostId });

      return archived;
    } catch (error) {
      logger.error('Error archiving standard cost', { error: error.message, standardCostId });
      const err = new Error(error.message);
      err.status = 400;
      throw err;
    }
  }

  /**
   * Calculate total standard cost for bill of materials
   * @param {Array<Object>} bomItems - BOM items array with { productId, quantity, costCenter }
   * @returns {Promise<Object>} - Total cost and breakdown
   */
  static async calculateBOMCost(bomItems) {
    try {
      if (!Array.isArray(bomItems) || bomItems.length === 0) {
        throw new Error('BOM items array is required and must not be empty');
      }

      let totalMaterialCost = 0;
      let totalLaborCost = 0;
      let totalOverheadCost = 0;
      const itemCosts = [];

      // In real implementation, fetch standard costs from database
      for (const item of bomItems) {
        const { productId, quantity, costCenter } = item;

        if (!productId || !quantity || !costCenter) {
          throw new Error('Each BOM item must have productId, quantity, and costCenter');
        }

        // Mock fetch
        const standardCost = {
          materialCost: 1000,
          laborCost: 500,
          overheadCost: 300,
          totalStandardCost: 1800,
        };

        const itemCost = {
          productId,
          quantity,
          unitCost: standardCost.totalStandardCost,
          totalCost: standardCost.totalStandardCost * quantity,
          breakdown: {
            materialCost: standardCost.materialCost * quantity,
            laborCost: standardCost.laborCost * quantity,
            overheadCost: standardCost.overheadCost * quantity,
          },
        };

        itemCosts.push(itemCost);
        totalMaterialCost += itemCost.breakdown.materialCost;
        totalLaborCost += itemCost.breakdown.laborCost;
        totalOverheadCost += itemCost.breakdown.overheadCost;
      }

      const totalCost = totalMaterialCost + totalLaborCost + totalOverheadCost;

      logger.info('BOM cost calculated successfully', {
        itemCount: bomItems.length,
        totalCost,
      });

      return {
        itemCosts,
        totalMaterialCost,
        totalLaborCost,
        totalOverheadCost,
        totalCost,
        costPerUnit: totalCost / bomItems.reduce((sum, item) => sum + item.quantity, 0),
      };
    } catch (error) {
      logger.error('Error calculating BOM cost', { error: error.message });
      const err = new Error(error.message);
      err.status = 400;
      throw err;
    }
  }

  /**
   * Generate standard cost report
   * @param {Object} filters - { costCenter, status, fromDate, toDate }
   * @returns {Promise<Object>} - Cost report
   */
  static async generateStandardCostReport(filters = {}) {
    try {
      const { costCenter, status = 'Active', fromDate, toDate } = filters;

      // In real implementation, aggregate from database
      const report = {
        reportPeriod: {
          fromDate: fromDate || new Date(new Date().getFullYear(), 0, 1),
          toDate: toDate || new Date(),
        },
        costCenter: costCenter || 'All',
        status,
        summary: {
          totalProducts: 150,
          totalMaterialCost: 180000,
          totalLaborCost: 90000,
          totalOverheadCost: 54000,
          totalStandardCost: 324000,
          averageCostPerProduct: 2160,
        },
        costDistribution: {
          materialPercentage: 55.56,
          laborPercentage: 27.78,
          overheadPercentage: 16.67,
        },
        topCostProducts: [
          {
            productId: 'PROD001',
            totalStandardCost: 5000,
          },
          {
            productId: 'PROD002',
            totalStandardCost: 4000,
          },
        ],
      };

      logger.info('Standard cost report generated', {
        costCenter,
        status,
        totalProducts: report.summary.totalProducts,
      });

      return report;
    } catch (error) {
      logger.error('Error generating standard cost report', { error: error.message });
      const err = new Error(error.message);
      err.status = 400;
      throw err;
    }
  }

  /**
   * Validate standard cost data
   * @param {Object} costData - Cost data to validate
   * @returns {Object} - Validation result
   */
  static validateStandardCostData(costData) {
    const errors = [];

    if (!costData.productId) {
      errors.push('Product ID is required');
    }
    if (!costData.costCenter) {
      errors.push('Cost Center is required');
    }
    if (costData.materialCost !== undefined && typeof costData.materialCost !== 'number') {
      errors.push('Material cost must be a number');
    }
    if (costData.laborCost !== undefined && typeof costData.laborCost !== 'number') {
      errors.push('Labor cost must be a number');
    }
    if (costData.overheadCost !== undefined && typeof costData.overheadCost !== 'number') {
      errors.push('Overhead cost must be a number');
    }
    if ((costData.materialCost || 0) < 0) {
      errors.push('Material cost cannot be negative');
    }
    if ((costData.laborCost || 0) < 0) {
      errors.push('Labor cost cannot be negative');
    }
    if ((costData.overheadCost || 0) < 0) {
      errors.push('Overhead cost cannot be negative');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

export default StandardCostingService;
