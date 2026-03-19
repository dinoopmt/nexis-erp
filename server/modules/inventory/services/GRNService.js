/**
 * GRN (Goods Receipt Note) Service
 * Manages goods receipt processing and inventory updates
 */

import Grn from '../../../Models/Grn.js';
import Product from '../../../Models/AddProduct.js';
import InventoryBatch from '../../../Models/InventoryBatch.js';
import StockMovement from '../../../Models/StockMovement.js';
import Counter from '../../../Models/SequenceModel.js';
import logger from '../../../config/logger.js';

class GRNService {
  /**
   * ✅ UPDATED: Generate next GRN number using database sequence (FIFO method)
   * Uses atomic increment to prevent duplicates in concurrent scenarios
   * @param {string} financialYear - Financial year (e.g., "2025-2026")
   * @returns {Promise<string>} - GRN number (e.g., "GRN-2025-2026-00001")
   */
  async generateGRNNumber(financialYear = '2025-26') {
    try {
      // ✅ Use atomic findOneAndUpdate for FIFO
      // Increments counter atomically to prevent race conditions
      const sequence = await Counter.findOneAndUpdate(
        {
          module: 'GRN',
          financialYear: financialYear,
        },
        {
          $inc: { lastNumber: 1 }, // Atomic increment
        },
        {
          new: true, // Return updated document
          upsert: true, // Create if doesn't exist
        }
      );

      const grnNumber = `GRN-${financialYear}-${String(sequence.lastNumber).padStart(5, '0')}`;
      logger.info('Generated GRN number using sequence', { grnNumber, financialYear, sequenceId: sequence._id });
      return grnNumber;
    } catch (err) {
      logger.error('Failed to generate GRN number', { error: err.message, financialYear });
      throw err;
    }
  }

  /**
   * Validate GRN items
   * @param {Array} items - Array of { productId, quantity, purchasePrice, batchNumber, expiryDate }
   * @returns {Promise<boolean>} - true if valid
   */
  async validateGRNItems(items) {
    try {
      if (!items || items.length === 0) {
        const error = new Error('GRN must have at least one item');
        error.status = 400;
        throw error;
      }

      for (let i = 0; i < items.length; i++) {
        const item = items[i];

        // Check product exists
        const product = await Product.findById(item.productId);
        if (!product) {
          const error = new Error(`Line ${i + 1}: Product not found`);
          error.status = 400;
          throw error;
        }

        // Validate quantity
        if (!item.quantity || item.quantity <= 0) {
          const error = new Error(`Line ${i + 1}: Quantity must be greater than 0`);
          error.status = 400;
          throw error;
        }

        // Validate price
        if (!item.purchasePrice || item.purchasePrice <= 0) {
          const error = new Error(`Line ${i + 1}: Purchase price must be greater than 0`);
          error.status = 400;
          throw error;
        }
      }

      return true;
    } catch (err) {
      logger.error('GRN item validation failed', { error: err.message });
      throw err;
    }
  }

  /**
   * Create a new GRN
   * @param {Object} grnData - GRN details
   * @returns {Promise<Object>} - Created GRN
   */
  async createGRN(grnData) {
    try {
      const { vendorId, vendorName, referenceNumber, deliveryDate, items, notes, createdBy } = grnData;

      // Validate required fields
      if (!vendorId || !vendorName || !items) {
        const error = new Error('Vendor ID, Vendor Name, and Items are required');
        error.status = 400;
        throw error;
      }

      // Validate items
      await this.validateGRNItems(items);

      // Generate GRN number
      const grnNumber = await this.generateGRNNumber();

      // Calculate total quantity and value
      let totalQuantity = 0;
      let totalValue = 0;

      const processedItems = [];
      for (const item of items) {
        const quantityInt = parseInt(item.quantity);
        const priceInCents = Math.round(parseFloat(item.purchasePrice) * 100);
        const itemValue = quantityInt * priceInCents;

        totalQuantity += quantityInt;
        totalValue += itemValue;

        processedItems.push({
          productId: item.productId,
          quantity: quantityInt,
          purchasePrice: priceInCents,
          batchNumber: item.batchNumber || `BATCH-${Date.now()}`,
          expiryDate: item.expiryDate ? new Date(item.expiryDate) : null,
          itemValue,
        });
      }

      // Create GRN
      const grn = new Grn({
        grnNumber,
        grnDate: new Date(),
        vendorId,
        vendorName,
        referenceNumber,
        deliveryDate: deliveryDate ? new Date(deliveryDate) : null,
        items: processedItems,
        totalQuantity,
        totalValue,
        status: 'Received',
        notes,
        createdBy,
      });

      await grn.save();

      logger.info('GRN created', { grnId: grn._id, grnNumber, totalItems: items.length });
      return grn;
    } catch (err) {
      logger.error('Failed to create GRN', { error: err.message });
      throw err;
    }
  }

  /**
   * Get GRN by ID
   * @param {string} grnId - GRN ID
   * @returns {Promise<Object>} - GRN with populated items
   */
  async getGRNById(grnId) {
    try {
      const grn = await Grn.findById(grnId)
        .populate('vendorId', 'vendorName')
        .populate('items.productId', 'itemname itemcode');

      if (!grn) {
        const error = new Error('GRN not found');
        error.status = 404;
        throw error;
      }

      logger.info('Retrieved GRN', { grnId });
      return grn;
    } catch (err) {
      logger.error('Failed to get GRN', { error: err.message, grnId });
      throw err;
    }
  }

  /**
   * Get all GRNs with filters
   * @param {Object} filters - { vendorId, status, startDate, endDate, page, limit }
   * @returns {Promise<Object>} - Paginated GRNs
   */
  async getAllGRNs(filters = {}) {
    try {
      const { vendorId, status, startDate, endDate, page = 1, limit = 50 } = filters;
      const skip = (page - 1) * limit;

      let query = {};

      if (vendorId) query.vendorId = vendorId;
      if (status) query.status = status;
      if (startDate || endDate) {
        query.grnDate = {};
        if (startDate) query.grnDate.$gte = new Date(startDate);
        if (endDate) query.grnDate.$lte = new Date(endDate);
      }

      const grns = await Grn.find(query)
        .populate('vendorId', 'vendorName')
        .sort({ grnDate: -1 })
        .skip(skip)
        .limit(limit);

      const total = await Grn.countDocuments(query);

      logger.info('Retrieved GRNs', { count: grns.length, total });
      return {
        grns,
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      };
    } catch (err) {
      logger.error('Failed to get GRNs', { error: err.message });
      throw err;
    }
  }

  /**
   * Receive GRN items (create stock batches and movements)
   * @param {string} grnId - GRN ID
   * @param {string} receivedBy - User receiving
   * @returns {Promise<Object>} - Updated GRN with batches
   */
  async receiveGRN(grnId, receivedBy) {
    try {
      const grn = await Grn.findById(grnId);

      if (!grn) {
        const error = new Error('GRN not found');
        error.status = 404;
        throw error;
      }

      if (grn.status === 'Received') {
        const error = new Error('GRN already received');
        error.status = 409;
        throw error;
      }

      // Create batches and movements for each item
      const batches = [];

      for (const item of grn.items) {
        // Create batch
        const batch = new InventoryBatch({
          productId: item.productId,
          batchNumber: item.batchNumber,
          quantityReceived: item.quantity,
          quantityRemaining: item.quantity,
          purchasePrice: item.purchasePrice,
          purchaseDate: grn.grnDate,
          expiryDate: item.expiryDate,
          batchStatus: 'ACTIVE',
          grnReference: grn._id,
        });

        await batch.save();
        batches.push(batch);

        // Create stock movement
        const movement = new StockMovement({
          productId: item.productId,
          movementType: 'INBOUND',
          quantity: item.quantity,
          reference: `GRN-${grn.grnNumber}`,
          notes: `GRN: ${grn.grnNumber}, Batch: ${item.batchNumber}`,
          createdBy: receivedBy,
          batchId: batch._id,
        });

        await movement.save();

        // Update product stock
        const product = await Product.findById(item.productId);
        if (product) {
          product.quantityInStock = (product.quantityInStock || 0) + item.quantity;
          await product.save();
        }
      }

      // Update GRN status
      grn.status = 'Received';
      grn.receivedBy = receivedBy;
      grn.receivedDate = new Date();
      grn.batches = batches.map((b) => b._id);
      await grn.save();

      logger.info('GRN received', { grnId, grnNumber: grn.grnNumber, receivedBy, batchCount: batches.length });

      return {
        grn,
        batches,
        message: `Received ${batches.length} batches from GRN ${grn.grnNumber}`,
      };
    } catch (err) {
      logger.error('Failed to receive GRN', { error: err.message, grnId });
      throw err;
    }
  }

  /**
   * Update GRN (only if not received)
   * @param {string} grnId - GRN ID
   * @param {Object} updateData - Fields to update
   * @returns {Promise<Object>} - Updated GRN
   */
  async updateGRN(grnId, updateData) {
    try {
      const grn = await Grn.findById(grnId);

      if (!grn) {
        const error = new Error('GRN not found');
        error.status = 404;
        throw error;
      }

      if (grn.status === 'Received') {
        const error = new Error('Cannot update received GRNs');
        error.status = 409;
        throw error;
      }

      // Validate items if updating
      if (updateData.items) {
        await this.validateGRNItems(updateData.items);
      }

      const updated = await Grn.findByIdAndUpdate(grnId, updateData, { new: true });

      logger.info('GRN updated', { grnId, updatedFields: Object.keys(updateData) });
      return updated;
    } catch (err) {
      logger.error('Failed to update GRN', { error: err.message, grnId });
      throw err;
    }
  }

  /**
   * Cancel GRN
   * @param {string} grnId - GRN ID
   * @param {string} cancelReason - Cancellation reason
   * @returns {Promise<Object>} - Updated GRN
   */
  async cancelGRN(grnId, cancelReason) {
    try {
      if (!cancelReason) {
        const error = new Error('Cancellation reason is required');
        error.status = 400;
        throw error;
      }

      const grn = await Grn.findById(grnId);

      if (!grn) {
        const error = new Error('GRN not found');
        error.status = 404;
        throw error;
      }

      if (grn.status === 'Received') {
        const error = new Error('Cannot cancel received GRNs');
        error.status = 409;
        throw error;
      }

      grn.status = 'Cancelled';
      grn.cancelReason = cancelReason;
      grn.cancelledDate = new Date();
      await grn.save();

      logger.info('GRN cancelled', { grnId, reason: cancelReason });
      return grn;
    } catch (err) {
      logger.error('Failed to cancel GRN', { error: err.message, grnId });
      throw err;
    }
  }

  /**
   * Get pending GRNs (not yet received)
   * @returns {Promise<Array>} - Pending GRNs
   */
  async getPendingGRNs() {
    try {
      const pending = await Grn.find({ status: { $ne: 'Received', $ne: 'Cancelled' } })
        .populate('vendorId', 'vendorName')
        .sort({ grnDate: -1 });

      logger.info('Retrieved pending GRNs', { count: pending.length });
      return pending;
    } catch (err) {
      logger.error('Failed to get pending GRNs', { error: err.message });
      throw err;
    }
  }

  /**
   * Get GRN summary
   * @param {Object} filters - { vendorId, startDate, endDate }
   * @returns {Promise<Object>} - Summary stats
   */
  async getGRNSummary(filters = {}) {
    try {
      const { vendorId, startDate, endDate } = filters;
      let matchStage = {};

      if (vendorId) matchStage.vendorId = vendorId;
      if (startDate || endDate) {
        matchStage.grnDate = {};
        if (startDate) matchStage.grnDate.$gte = new Date(startDate);
        if (endDate) matchStage.grnDate.$lte = new Date(endDate);
      }

      const summary = await Grn.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalValue: { $sum: '$totalValue' },
            totalQuantity: { $sum: '$totalQuantity' },
          },
        },
      ]);

      logger.info('Generated GRN summary', { filters });
      return summary;
    } catch (err) {
      logger.error('Failed to get GRN summary', { error: err.message });
      throw err;
    }
  }

  /**
   * Get GRN by vendor
   * @param {string} vendorId - Vendor ID
   * @param {number} limit - Max results
   * @returns {Promise<Array>} - GRNs from vendor
   */
  async getGRNsByVendor(vendorId, limit = 50) {
    try {
      const grns = await Grn.find({ vendorId })
        .populate('vendorId', 'vendorName')
        .sort({ grnDate: -1 })
        .limit(limit);

      logger.info('Retrieved vendor GRNs', { vendorId, count: grns.length });
      return grns;
    } catch (err) {
      logger.error('Failed to get vendor GRNs', { error: err.message, vendorId });
      throw err;
    }
  }
}

export default new GRNService();
