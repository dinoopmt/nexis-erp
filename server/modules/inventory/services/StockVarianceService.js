/**
 * Stock Variance Service
 * Manages stock variance (difference between theoretical and actual stock)
 * and variance reconciliation
 */

import Product from '../../../Models/AddProduct.js';
import InventoryBatch from '../../Models/InventoryBatch.js';
import StockMovement from '../../Models/StockMovement.js';
import StockVariance from '../../Models/StockVariance.js';
import logger from '../../../config/logger.js';

class StockVarianceService {
  /**
   * Calculate theoretical stock from movements
   * @param {string} productId - Product ID
   * @returns {Promise<number>} - Theoretical quantity
   */
  async calculateTheoreticalStock(productId) {
    try {
      const movements = await StockMovement.find({ productId });

      let theoretical = 0;
      movements.forEach((movement) => {
        if (movement.movementType === 'INBOUND' || (movement.movementType === 'ADJUSTMENT' && movement.quantity > 0)) {
          theoretical += movement.quantity;
        } else if (movement.movementType === 'OUTBOUND' || (movement.movementType === 'ADJUSTMENT' && movement.quantity < 0)) {
          theoretical += movement.quantity;
        }
      });

      return Math.max(0, theoretical);
    } catch (err) {
      logger.error('Failed to calculate theoretical stock', { error: err.message, productId });
      throw err;
    }
  }

  /**
   * Calculate actual stock from batches
   * @param {string} productId - Product ID
   * @returns {Promise<number>} - Actual quantity
   */
  async calculateActualStock(productId) {
    try {
      const batches = await InventoryBatch.find({
        productId,
        batchStatus: 'ACTIVE',
      });

      const actual = batches.reduce((sum, batch) => sum + (batch.quantityRemaining || 0), 0);
      return Math.max(0, actual);
    } catch (err) {
      logger.error('Failed to calculate actual stock', { error: err.message, productId });
      throw err;
    }
  }

  /**
   * Detect variance for a product
   * @param {string} productId - Product ID
   * @returns {Promise<Object>} - Variance details
   */
  async detectVariance(productId) {
    try {
      const product = await Product.findById(productId);
      if (!product) {
        const error = new Error('Product not found');
        error.status = 404;
        throw error;
      }

      // Calculate both stock types
      const theoretical = await this.calculateTheoreticalStock(productId);
      const actual = await this.calculateActualStock(productId);
      const variance = actual - theoretical;
      const variancePercentage = theoretical > 0 ? (variance / theoretical) * 100 : 0;

      logger.info('Detected variance', { productId, theoretical, actual, variance });

      return {
        productId,
        productName: product.itemname,
        theoreticalStock: theoretical,
        actualStock: actual,
        variance,
        variancePercentage: (variancePercentage).toFixed(2),
        discrepancy: variance < 0 ? 'SHORTAGE' : variance > 0 ? 'OVERAGE' : 'BALANCED',
      };
    } catch (err) {
      logger.error('Failed to detect variance', { error: err.message, productId });
      throw err;
    }
  }

  /**
   * Detect variance for all products
   * @param {Object} filters - { status, page, limit }
   * @returns {Promise<Object>} - Paginated variance report
   */
  async detectAllVariances(filters = {}) {
    try {
      const { status, page = 1, limit = 50 } = filters;
      const skip = (page - 1) * limit;

      const products = await Product.find({ isDeleted: false })
        .skip(skip)
        .limit(limit);

      const variances = [];

      for (const product of products) {
        const variance = await this.detectVariance(product._id);

        // Filter by status if provided
        if (status && variance.discrepancy !== status) {
          continue;
        }

        variances.push(variance);
      }

      const total = await Product.countDocuments({ isDeleted: false });

      logger.info('Detected all variances', { count: variances.length, total });

      return {
        variances,
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
        summary: {
          totalProducts: variances.length,
          shortages: variances.filter((v) => v.discrepancy === 'SHORTAGE').length,
          overages: variances.filter((v) => v.discrepancy === 'OVERAGE').length,
          balanced: variances.filter((v) => v.discrepancy === 'BALANCED').length,
        },
      };
    } catch (err) {
      logger.error('Failed to detect all variances', { error: err.message });
      throw err;
    }
  }

  /**
   * Get variance by threshold (only products with variance above threshold)
   * @param {number} threshold - Variance percentage threshold
   * @returns {Promise<Array>} - Products above threshold
   */
  async getVariancesByThreshold(threshold = 5) {
    try {
      const products = await Product.find({ isDeleted: false });

      const variances = [];

      for (const product of products) {
        const variance = await this.detectVariance(product._id);

        if (Math.abs(parseFloat(variance.variancePercentage)) >= threshold) {
          variances.push(variance);
        }
      }

      variances.sort((a, b) => Math.abs(parseFloat(b.variancePercentage)) - Math.abs(parseFloat(a.variancePercentage)));

      logger.info('Retrieved variances by threshold', { threshold, count: variances.length });
      return variances;
    } catch (err) {
      logger.error('Failed to get variances by threshold', { error: err.message, threshold });
      throw err;
    }
  }

  /**
   * Create variance record (for reconciliation)
   * @param {Object} varianceData - { productId, theoreticalStock, actualStock, reason, notes }
   * @returns {Promise<Object>} - Created variance record
   */
  async createVarianceRecord(varianceData) {
    try {
      const { productId, theoreticalStock, actualStock, reason, notes, adjustedBy } = varianceData;

      // Validate
      if (!productId || theoreticalStock === undefined || actualStock === undefined) {
        const error = new Error('Product ID, theoretical stock, and actual stock are required');
        error.status = 400;
        throw error;
      }

      // Verify product
      const product = await Product.findById(productId);
      if (!product) {
        const error = new Error('Product not found');
        error.status = 404;
        throw error;
      }

      const variance = parseInt(actualStock) - parseInt(theoreticalStock);

      // Create variance record
      const record = new StockVariance({
        productId,
        theoreticalStock: parseInt(theoreticalStock),
        actualStock: parseInt(actualStock),
        variance,
        variancePercentage: theoreticalStock > 0 ? (variance / theoreticalStock) * 100 : 0,
        reason,
        notes,
        adjustedBy,
        status: 'Recorded',
        recordedDate: new Date(),
      });

      await record.save();

      logger.info('Created variance record', { varianceRecordId: record._id, productId, variance });
      return record;
    } catch (err) {
      logger.error('Failed to create variance record', { error: err.message });
      throw err;
    }
  }

  /**
   * Reconcile variance (adjust product stock)
   * @param {string} varianceId - Variance record ID
   * @param {string} approvedBy - User approving reconciliation
   * @returns {Promise<Object>} - Reconciled variance
   */
  async reconcileVariance(varianceId, approvedBy) {
    try {
      const variance = await StockVariance.findById(varianceId);

      if (!variance) {
        const error = new Error('Variance record not found');
        error.status = 404;
        throw error;
      }

      if (variance.status !== 'Recorded') {
        const error = new Error('Only recorded variances can be reconciled');
        error.status = 409;
        throw error;
      }

      // Update product stock to actual
      const product = await Product.findById(variance.productId);
      if (product) {
        product.quantityInStock = variance.actualStock;
        await product.save();
      }

      // Mark variance as reconciled
      variance.status = 'Reconciled';
      variance.approvedBy = approvedBy;
      variance.approvalDate = new Date();
      await variance.save();

      logger.info('Variance reconciled', { varianceId, productId: variance.productId, approvedBy });

      return variance;
    } catch (err) {
      logger.error('Failed to reconcile variance', { error: err.message, varianceId });
      throw err;
    }
  }

  /**
   * Get variance history for a product
   * @param {string} productId - Product ID
   * @param {number} limit - Number of records
   * @returns {Promise<Array>} - Variance records
   */
  async getVarianceHistory(productId, limit = 20) {
    try {
      const records = await StockVariance.find({ productId })
        .sort({ recordedDate: -1 })
        .limit(limit);

      logger.info('Retrieved variance history', { productId, count: records.length });
      return records;
    } catch (err) {
      logger.error('Failed to get variance history', { error: err.message, productId });
      throw err;
    }
  }

  /**
   * Get pending variance approvals
   * @returns {Promise<Array>} - Recorded but not reconciled variances
   */
  async getPendingApprovals() {
    try {
      const pending = await StockVariance.find({ status: 'Recorded' })
        .populate('productId', 'itemname itemcode')
        .sort({ recordedDate: -1 });

      logger.info('Retrieved pending variance approvals', { count: pending.length });
      return pending;
    } catch (err) {
      logger.error('Failed to get pending approvals', { error: err.message });
      throw err;
    }
  }

  /**
   * Get variance summary statistics
   * @returns {Promise<Object>} - Summary stats
   */
  async getVarianceSummary() {
    try {
      const summary = await StockVariance.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalVariance: { $sum: '$variance' },
            avgVariancePercentage: { $avg: '$variancePercentage' },
          },
        },
      ]);

      const stats = {
        Recorded: 0,
        Reconciled: 0,
        totalVariance: 0,
        avgVariancePercentage: 0,
      };

      summary.forEach((item) => {
        stats[item._id] = item.count;
        stats.totalVariance += item.totalVariance;
        stats.avgVariancePercentage += item.avgVariancePercentage;
      });

      logger.info('Retrieved variance summary');
      return stats;
    } catch (err) {
      logger.error('Failed to get variance summary', { error: err.message });
      throw err;
    }
  }

  /**
   * Get products with shortages
   * @returns {Promise<Array>} - Products with shortage variance
   */
  async getShortageProducts() {
    try {
      const products = await Product.find({ isDeleted: false });
      const shortages = [];

      for (const product of products) {
        const theoretical = await this.calculateTheoreticalStock(product._id);
        const actual = await this.calculateActualStock(product._id);

        if (actual < theoretical) {
          shortages.push({
            productId: product._id,
            productName: product.itemname,
            theoreticalStock: theoretical,
            actualStock: actual,
            shortage: theoretical - actual,
          });
        }
      }

      shortages.sort((a, b) => b.shortage - a.shortage);

      logger.info('Retrieved shortage products', { count: shortages.length });
      return shortages;
    } catch (err) {
      logger.error('Failed to get shortage products', { error: err.message });
      throw err;
    }
  }

  /**
   * Get products with overages
   * @returns {Promise<Array>} - Products with overage variance
   */
  async getOverageProducts() {
    try {
      const products = await Product.find({ isDeleted: false });
      const overages = [];

      for (const product of products) {
        const theoretical = await this.calculateTheoreticalStock(product._id);
        const actual = await this.calculateActualStock(product._id);

        if (actual > theoretical) {
          overages.push({
            productId: product._id,
            productName: product.itemname,
            theoreticalStock: theoretical,
            actualStock: actual,
            overage: actual - theoretical,
          });
        }
      }

      overages.sort((a, b) => b.overage - a.overage);

      logger.info('Retrieved overage products', { count: overages.length });
      return overages;
    } catch (err) {
      logger.error('Failed to get overage products', { error: err.message });
      throw err;
    }
  }
}

export default new StockVarianceService();
