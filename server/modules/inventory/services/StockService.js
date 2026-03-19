/**
 * Stock Service
 * Manages inventory stock movements, batch tracking, and stock level calculations
 */

import InventoryBatch from '../../Models/InventoryBatch.js';
import StockMovement from '../../Models/StockMovement.js';
import Product from '../../../Models/AddProduct.js';
import logger from '../../../config/logger.js';

class StockService {
  /**
   * Get current stock for a product (sum of all active batches)
   * @param {string} productId - Product ID
   * @returns {Promise<Object>} - Stock summary with batches
   */
  async getCurrentStock(productId) {
    try {
      // Verify product exists
      const product = await Product.findById(productId);
      if (!product) {
        const error = new Error('Product not found');
        error.status = 404;
        throw error;
      }

      // Get all active batches
      const batches = await InventoryBatch.find({
        productId,
        batchStatus: 'ACTIVE',
      }).lean();

      // Calculate totals
      const currentStock = batches.reduce((sum, batch) => sum + (batch.quantityRemaining || 0), 0);
      const stockValue = batches.reduce((sum, batch) => sum + ((batch.quantityRemaining || 0) * (batch.purchasePrice || 0)), 0);

      // Determine stock status
      const getStockStatus = () => {
        if (currentStock === 0) return 'OUT_OF_STOCK';
        if (currentStock <= (product.minStock || 0)) return 'LOW_STOCK';
        if (currentStock >= (product.maxStock || 1000)) return 'OVERSTOCKED';
        return 'IN_STOCK';
      };

      logger.info('Retrieved current stock', { productId, currentStock });

      return {
        success: true,
        productId,
        productName: product.itemname,
        currentStock,
        stockValue,
        minStock: product.minStock || 0,
        maxStock: product.maxStock || 1000,
        reorderLevel: product.reorderLevel || 0,
        status: getStockStatus(),
        batches: batches.map((b) => ({
          batchId: b._id,
          batchNumber: b.batchNumber,
          quantityRemaining: b.quantityRemaining,
          purchasePrice: b.purchasePrice,
          value: (b.quantityRemaining || 0) * (b.purchasePrice || 0),
          purchaseDate: b.purchaseDate,
          expiryDate: b.expiryDate,
          batchStatus: b.batchStatus,
        })),
      };
    } catch (err) {
      logger.error('Failed to get current stock', { error: err.message, productId });
      throw err;
    }
  }

  /**
   * Record stock inbound movement (purchase receipt)
   * @param {Object} stockData - { productId, quantity, purchasePrice, vendorId, batchNumber, expiryDate }
   * @returns {Promise<Object>} - Created batch and movement
   */
  async recordStockIn(stockData) {
    try {
      const { productId, quantity, purchasePrice, vendorId, batchNumber, expiryDate } = stockData;

      // Validate required fields
      if (!productId || !quantity || !purchasePrice) {
        const error = new Error('Product ID, quantity, and purchase price are required');
        error.status = 400;
        throw error;
      }

      // Validate product exists
      const product = await Product.findById(productId);
      if (!product) {
        const error = new Error('Product not found');
        error.status = 404;
        throw error;
      }

      // Validate quantity
      if (quantity <= 0) {
        const error = new Error('Quantity must be greater than 0');
        error.status = 400;
        throw error;
      }

      const quantityInt = parseInt(quantity);
      const priceInCents = Math.round(parseFloat(purchasePrice) * 100);

      // Create or update batch
      const finalBatchNumber = batchNumber || `BATCH-${Date.now()}`;

      const batch = new InventoryBatch({
        productId,
        batchNumber: finalBatchNumber,
        quantityReceived: quantityInt,
        quantityRemaining: quantityInt,
        purchasePrice: priceInCents,
        vendorId,
        purchaseDate: new Date(),
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        batchStatus: 'ACTIVE',
      });

      await batch.save();

      // Record stock movement
      const movement = new StockMovement({
        productId,
        movementType: 'INBOUND',
        quantity: quantityInt,
        reference: `Batch-${batch._id}`,
        notes: `Stock in: ${finalBatchNumber}`,
        createdBy: stockData.createdBy || 'SYSTEM',
        batchId: batch._id,
      });

      await movement.save();

      // Update product stock
      product.quantityInStock = (product.quantityInStock || 0) + quantityInt;
      await product.save();

      logger.info('Stock recorded inbound', { productId, quantity: quantityInt, batchNumber: finalBatchNumber });

      return {
        batch,
        movement,
        newStock: product.quantityInStock,
      };
    } catch (err) {
      logger.error('Failed to record stock in', { error: err.message });
      throw err;
    }
  }

  /**
   * Record stock outbound movement (sales, usage)
   * @param {Object} stockData - { productId, quantity, reason, batchId }
   * @returns {Promise<Object>} - Updated batch and movement
   */
  async recordStockOut(stockData) {
    try {
      const { productId, quantity, reason, batchId } = stockData;

      // Validate
      if (!productId || !quantity) {
        const error = new Error('Product ID and quantity are required');
        error.status = 400;
        throw error;
      }

      if (quantity <= 0) {
        const error = new Error('Quantity must be greater than 0');
        error.status = 400;
        throw error;
      }

      const quantityInt = parseInt(quantity);

      // Get product
      const product = await Product.findById(productId);
      if (!product) {
        const error = new Error('Product not found');
        error.status = 404;
        throw error;
      }

      // Get batch (FIFO - first active batch)
      let batch = null;
      if (batchId) {
        batch = await InventoryBatch.findById(batchId);
      } else {
        batch = await InventoryBatch.findOne({ productId, batchStatus: 'ACTIVE' }).sort({ createdDate: 1 });
      }

      if (!batch || batch.quantityRemaining < quantityInt) {
        const error = new Error('Insufficient stock in batch');
        error.status = 400;
        throw error;
      }

      // Update batch
      batch.quantityRemaining -= quantityInt;
      if (batch.quantityRemaining === 0) {
        batch.batchStatus = 'EXHAUSTED';
      }
      await batch.save();

      // Record movement
      const movement = new StockMovement({
        productId,
        movementType: 'OUTBOUND',
        quantity: quantityInt,
        reference: `Batch-${batch._id}`,
        notes: reason || 'Stock out',
        createdBy: stockData.createdBy || 'SYSTEM',
        batchId: batch._id,
      });

      await movement.save();

      // Update product stock
      product.quantityInStock = Math.max(0, (product.quantityInStock || 0) - quantityInt);
      await product.save();

      logger.info('Stock recorded outbound', { productId, quantity: quantityInt, reason });

      return {
        batch,
        movement,
        remainingStock: batch.quantityRemaining,
      };
    } catch (err) {
      logger.error('Failed to record stock out', { error: err.message });
      throw err;
    }
  }

  /**
   * Record manual stock adjustment
   * @param {Object} adjustmentData - { productId, quantity, reason, adjustmentType }
   * @returns {Promise<Object>} - Movement record
   */
  async recordAdjustment(adjustmentData) {
    try {
      const { productId, quantity, reason, adjustmentType } = adjustmentData;

      // Validate
      if (!productId || quantity === undefined || !adjustmentType) {
        const error = new Error('Product ID, quantity, and adjustment type are required');
        error.status = 400;
        throw error;
      }

      const quantityInt = parseInt(quantity);

      // Get product
      const product = await Product.findById(productId);
      if (!product) {
        const error = new Error('Product not found');
        error.status = 404;
        throw error;
      }

      // Record movement
      const movement = new StockMovement({
        productId,
        movementType: 'ADJUSTMENT',
        quantity: quantityInt,
        adjustmentType,
        reference: reason || 'Stock adjustment',
        notes: reason || 'Manual adjustment',
        createdBy: adjustmentData.createdBy || 'SYSTEM',
      });

      await movement.save();

      // Update product
      if (quantityInt > 0) {
        product.quantityInStock = (product.quantityInStock || 0) + quantityInt;
      } else {
        product.quantityInStock = Math.max(0, (product.quantityInStock || 0) + quantityInt);
      }
      await product.save();

      logger.info('Stock adjustment recorded', { productId, quantity: quantityInt, type: adjustmentType });

      return {
        movement,
        newStock: product.quantityInStock,
      };
    } catch (err) {
      logger.error('Failed to record adjustment', { error: err.message });
      throw err;
    }
  }

  /**
   * Get stock movements for a product
   * @param {string} productId - Product ID
   * @param {Object} filters - { movementType, startDate, endDate, page, limit }
   * @returns {Promise<Object>} - Paginated movements
   */
  async getStockMovements(productId, filters = {}) {
    try {
      const { movementType, startDate, endDate, page = 1, limit = 50 } = filters;
      const skip = (page - 1) * limit;

      let query = { productId };

      if (movementType) query.movementType = movementType;
      if (startDate || endDate) {
        query.createdDate = {};
        if (startDate) query.createdDate.$gte = new Date(startDate);
        if (endDate) query.createdDate.$lte = new Date(endDate);
      }

      const movements = await StockMovement.find(query)
        .sort({ createdDate: -1 })
        .skip(skip)
        .limit(limit);

      const total = await StockMovement.countDocuments(query);

      logger.info('Retrieved stock movements', { productId, count: movements.length });
      return {
        movements,
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      };
    } catch (err) {
      logger.error('Failed to get stock movements', { error: err.message, productId });
      throw err;
    }
  }

  /**
   * Get all batches for a product
   * @param {string} productId - Product ID
   * @param {Object} filters - { status, page, limit }
   * @returns {Promise<Object>} - Paginated batches
   */
  async getProductBatches(productId, filters = {}) {
    try {
      const { status, page = 1, limit = 50 } = filters;
      const skip = (page - 1) * limit;

      let query = { productId };
      if (status) query.batchStatus = status;

      const batches = await InventoryBatch.find(query)
        .sort({ createdDate: -1 })
        .skip(skip)
        .limit(limit);

      const total = await InventoryBatch.countDocuments(query);

      logger.info('Retrieved product batches', { productId, count: batches.length });
      return {
        batches,
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      };
    } catch (err) {
      logger.error('Failed to get product batches', { error: err.message, productId });
      throw err;
    }
  }

  /**
   * Check batch expiry status
   * @param {string} batchId - Batch ID
   * @returns {Promise<Object>} - { isExpired, daysUntilExpiry, expiryDate }
   */
  async checkBatchExpiry(batchId) {
    try {
      const batch = await InventoryBatch.findById(batchId);

      if (!batch) {
        const error = new Error('Batch not found');
        error.status = 404;
        throw error;
      }

      const now = new Date();
      const expiry = new Date(batch.expiryDate);
      const daysUntilExpiry = Math.floor((expiry - now) / (1000 * 60 * 60 * 24));

      const isExpired = now > expiry;

      logger.info('Checked batch expiry', { batchId, daysUntilExpiry, isExpired });

      return {
        batchNumber: batch.batchNumber,
        expiryDate: batch.expiryDate,
        isExpired,
        daysUntilExpiry,
        status: isExpired ? 'EXPIRED' : daysUntilExpiry <= 30 ? 'EXPIRING_SOON' : 'VALID',
      };
    } catch (err) {
      logger.error('Failed to check batch expiry', { error: err.message, batchId });
      throw err;
    }
  }

  /**
   * Get expiring batches
   * @param {number} daysAhead - Check for expiry in next N days (default: 30)
   * @returns {Promise<Array>} - Batches expiring soon
   */
  async getExpiringBatches(daysAhead = 30) {
    try {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + daysAhead);

      const batches = await InventoryBatch.find({
        expiryDate: { $lte: futureDate, $gte: new Date() },
        batchStatus: 'ACTIVE',
      })
        .populate('productId', 'itemname itemcode')
        .sort({ expiryDate: 1 });

      logger.info('Retrieved expiring batches', { count: batches.length, daysAhead });
      return batches;
    } catch (err) {
      logger.error('Failed to get expiring batches', { error: err.message });
      throw err;
    }
  }

  /**
   * Get stock summary (total inbound, outbound, adjustments)
   * @param {string} productId - Product ID
   * @returns {Promise<Object>} - Movement summary
   */
  async getStockSummary(productId) {
    try {
      const summary = await StockMovement.aggregate([
        { $match: { productId } },
        {
          $group: {
            _id: '$movementType',
            totalQuantity: { $sum: '$quantity' },
            count: { $sum: 1 },
          },
        },
      ]);

      const result = {
        INBOUND: 0,
        OUTBOUND: 0,
        ADJUSTMENT: 0,
      };

      summary.forEach((item) => {
        result[item._id] = item.totalQuantity;
      });

      logger.info('Retrieved stock summary', { productId });
      return result;
    } catch (err) {
      logger.error('Failed to get stock summary', { error: err.message, productId });
      throw err;
    }
  }
}

export default new StockService();
