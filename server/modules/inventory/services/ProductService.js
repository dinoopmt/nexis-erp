/**
 * Product Service
 * Manages product catalog including item codes, pricing, stock levels, and grouping
 */

import Product from '../../../Models/AddProduct.js';
import Grouping from '../../../Models/Grouping.js';
import BarcodeQueue from '../../../Models/BarcodeQueue.js';
import logger from '../../../config/logger.js';

class ProductService {
  /**
   * Generate next auto-incrementing item code
   * @returns {Promise<string>} - Next item code (e.g., "1001", "1002")
   */
  async generateNextItemCode() {
    try {
      const lastProduct = await Product.findOne({ isDeleted: false })
        .sort({ itemcode: -1 })
        .lean();

      let nextCode = '1001'; // Starting code

      if (lastProduct && lastProduct.itemcode) {
        const numericPart = parseInt(lastProduct.itemcode.replace(/\D/g, ''));
        if (!isNaN(numericPart)) {
          nextCode = String(numericPart + 1);
        }
      }

      logger.info('Generated next item code', { itemCode: nextCode });
      return nextCode;
    } catch (err) {
      logger.error('Failed to generate item code', { error: err.message });
      return '1001'; // Fallback
    }
  }

  /**
   * Validate product grouping hierarchy
   * @param {string} categoryId - Department/Category ID
   * @param {string} groupingId - Sub-category ID
   * @returns {Promise<Object>} - { category, grouping }
   */
  async validateGrouping(categoryId, groupingId) {
    try {
      let category = null;
      let grouping = null;

      // Validate and fetch category
      if (categoryId) {
        category = await Grouping.findById(categoryId);
        if (!category || category.isDeleted || category.level !== 0) {
          const error = new Error('Invalid category selected (must be a department/level 0)');
          error.status = 400;
          throw error;
        }
      }

      // Validate and fetch grouping
      if (groupingId) {
        grouping = await Grouping.findById(groupingId);
        if (!grouping || grouping.isDeleted) {
          const error = new Error('Invalid or deleted sub-category selected');
          error.status = 400;
          throw error;
        }

        // Verify grouping is child of category if both provided
        if (categoryId && grouping.parentId?.toString() !== categoryId) {
          const error = new Error('Sub-category does not belong to selected category');
          error.status = 400;
          throw error;
        }
      }

      logger.info('Grouping hierarchy validated', { categoryId, groupingId });
      return { category, grouping };
    } catch (err) {
      logger.error('Failed to validate grouping', { error: err.message });
      throw err;
    }
  }

  /**
   * Check if barcode is unique
   * @param {string} barcode - Product barcode
   * @param {string} excludeId - Optional product ID to exclude
   * @returns {Promise<boolean>} - true if unique
   */
  async isBarcodeUnique(barcode, excludeId = null) {
    try {
      const query = {
        barcode: barcode.toUpperCase(),
        isDeleted: false,
      };

      if (excludeId) {
        query._id = { $ne: excludeId };
      }

      const existing = await Product.findOne(query);
      return !existing;
    } catch (err) {
      logger.error('Barcode uniqueness check failed', { barcode, error: err.message });
      throw err;
    }
  }

  /**
   * Create a new product
   * @param {Object} productData - Product details
   * @returns {Promise<Object>} - Created product with populated grouping
   */
  async createProduct(productData) {
    try {
      const { itemcode, hsn, barcode, name, vendor, cost, price, stock, categoryId, groupingId, packingUnits } = productData;

      // Validate required fields
      // categoryId (Department) is REQUIRED
      // groupingId (Sub-Department) is OPTIONAL
      if (!barcode || !name || !vendor || !cost || !price || stock === undefined || stock === null || !categoryId) {
        const error = new Error('Required fields missing: barcode, name, vendor, cost, price, stock, and categoryId (department)');
        error.status = 400;
        throw error;
      }

      // Validate grouping hierarchy
      await this.validateGrouping(categoryId, groupingId);

      // Check barcode uniqueness
      const isUnique = await this.isBarcodeUnique(barcode);
      if (!isUnique) {
        const error = new Error('Product with this barcode already exists');
        error.status = 409;
        throw error;
      }

      // Auto-generate item code if not provided
      let finalItemCode = itemcode;
      if (!finalItemCode) {
        finalItemCode = await this.generateNextItemCode();
      }

      // Convert to uppercase
      const uppercaseBarcode = barcode.toUpperCase();
      const uppercaseItemcode = finalItemCode.toUpperCase();

      // Create product
      const product = new Product({
        itemcode: uppercaseItemcode,
        hsn: hsn || '',
        barcode: uppercaseBarcode,
        itemname: name,
        vendor,
        costPrice: Math.round(parseFloat(cost) * 100), // In cents
        sellingPrice: Math.round(parseFloat(price) * 100), // In cents
        quantityInStock: parseInt(stock) || 0,
        categoryId,
        groupingId,
        packingUnits: packingUnits || 1,
        minStock: productData.minStock || 10,
        maxStock: productData.maxStock || 1000,
        reorderLevel: productData.reorderLevel || 20,
      });

      await product.save();
      await product.populate('categoryId', 'groupingName');
      await product.populate('groupingId', 'groupingName parentId');

      logger.info('Product created', { productId: product._id, itemcode: product.itemcode, barcode });
      return product;
    } catch (err) {
      logger.error('Failed to create product', { error: err.message });
      throw err;
    }
  }

  /**
   * Get product by ID
   * @param {string} productId - Product ID
   * @returns {Promise<Object>} - Product with populated grouping
   */
  async getProductById(productId) {
    try {
      const product = await Product.findById(productId)
        .populate('categoryId', 'groupingName')
        .populate('groupingId', 'groupingName');

      if (!product) {
        const error = new Error('Product not found');
        error.status = 404;
        throw error;
      }

      logger.info('Retrieved product', { productId });
      return product;
    } catch (err) {
      logger.error('Failed to get product', { error: err.message, productId });
      throw err;
    }
  }

  /**
   * Get all products with pagination and filters
   * @param {Object} filters - { categoryId, groupingId, vendor, page, limit }
   * @returns {Promise<Object>} - Paginated products
   */
  async getAllProducts(filters = {}) {
    try {
      const { categoryId, groupingId, vendor, page = 1, limit = 50 } = filters;
      const skip = (page - 1) * limit;

      let query = { isDeleted: false };

      if (categoryId) query.categoryId = categoryId;
      if (groupingId) query.groupingId = groupingId;
      if (vendor) query.vendor = vendor;

      const products = await Product.find(query)
        .populate('categoryId', 'groupingName')
        .populate('groupingId', 'groupingName')
        .sort({ itemcode: 1 })
        .skip(skip)
        .limit(limit);

      const total = await Product.countDocuments(query);

      logger.info('Retrieved products', { count: products.length, total });
      return {
        products,
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      };
    } catch (err) {
      logger.error('Failed to get products', { error: err.message });
      throw err;
    }
  }

  /**
   * Update a product
   * @param {string} productId - Product ID
   * @param {Object} updateData - Fields to update
   * @returns {Promise<Object>} - Updated product
   */
  async updateProduct(productId, updateData) {
    try {
      const product = await Product.findById(productId);

      if (!product) {
        const error = new Error('Product not found');
        error.status = 404;
        throw error;
      }

      // Validate grouping if updating
      if (updateData.categoryId || updateData.groupingId) {
        const categoryId = updateData.categoryId || product.categoryId;
        const groupingId = updateData.groupingId || product.groupingId;
        await this.validateGrouping(categoryId, groupingId);
      }

      // Check barcode uniqueness if updating
      if (updateData.barcode && updateData.barcode !== product.barcode) {
        const isUnique = await this.isBarcodeUnique(updateData.barcode, productId);
        if (!isUnique) {
          const error = new Error('Barcode already exists');
          error.status = 409;
          throw error;
        }
        updateData.barcode = updateData.barcode.toUpperCase();
      }

      // Convert prices to cents if updating
      if (updateData.costPrice) {
        updateData.costPrice = Math.round(parseFloat(updateData.costPrice) * 100);
      }
      if (updateData.sellingPrice) {
        updateData.sellingPrice = Math.round(parseFloat(updateData.sellingPrice) * 100);
      }

      const updated = await Product.findByIdAndUpdate(productId, updateData, {
        new: true,
        runValidators: true,
      })
        .populate('categoryId', 'groupingName')
        .populate('groupingId', 'groupingName');

      logger.info('Product updated', { productId, updatedFields: Object.keys(updateData) });
      return updated;
    } catch (err) {
      logger.error('Failed to update product', { error: err.message, productId });
      throw err;
    }
  }

  /**
   * Delete product (soft delete)
   * @param {string} productId - Product ID
   * @returns {Promise<void>}
   */
  async deleteProduct(productId) {
    try {
      const product = await Product.findByIdAndUpdate(productId, { isDeleted: true }, { new: true });

      if (!product) {
        const error = new Error('Product not found');
        error.status = 404;
        throw error;
      }

      logger.info('Product deleted (soft)', { productId });
    } catch (err) {
      logger.error('Failed to delete product', { error: err.message, productId });
      throw err;
    }
  }

  /**
   * Search products by item code, name, or barcode
   * @param {string} searchTerm - Search query
   * @param {number} limit - Max results
   * @returns {Promise<Array>} - Matching products
   */
  async searchProducts(searchTerm, limit = 20) {
    try {
      if (!searchTerm || searchTerm.length < 2) {
        const error = new Error('Search term must be at least 2 characters');
        error.status = 400;
        throw error;
      }

      const regex = new RegExp(searchTerm, 'i');
      const products = await Product.find({
        $or: [{ itemcode: regex }, { itemname: regex }, { barcode: regex }],
        isDeleted: false,
      })
        .populate('categoryId', 'groupingName')
        .populate('groupingId', 'groupingName')
        .limit(limit);

      logger.info('Searched products', { searchTerm, count: products.length });
      return products;
    } catch (err) {
      logger.error('Failed to search products', { error: err.message, searchTerm });
      throw err;
    }
  }

  /**
   * Get low stock products (below reorder level)
   * @param {Object} filters - { page, limit }
   * @returns {Promise<Object>} - Products below reorder level
   */
  async getLowStockProducts(filters = {}) {
    try {
      const { page = 1, limit = 50 } = filters;
      const skip = (page - 1) * limit;

      const products = await Product.find({
        $expr: { $lte: ['$quantityInStock', '$reorderLevel'] },
        isDeleted: false,
      })
        .populate('categoryId', 'groupingName')
        .populate('groupingId', 'groupingName')
        .sort({ quantityInStock: 1 })
        .skip(skip)
        .limit(limit);

      const total = await Product.countDocuments({
        $expr: { $lte: ['$quantityInStock', '$reorderLevel'] },
        isDeleted: false,
      });

      logger.info('Retrieved low stock products', { count: products.length });
      return {
        products,
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      };
    } catch (err) {
      logger.error('Failed to get low stock products', { error: err.message });
      throw err;
    }
  }

  /**
   * Get high stock products (above max stock level)
   * @param {Object} filters - { page, limit }
   * @returns {Promise<Object>} - Products above max level
   */
  async getHighStockProducts(filters = {}) {
    try {
      const { page = 1, limit = 50 } = filters;
      const skip = (page - 1) * limit;

      const products = await Product.find({
        $expr: { $gte: ['$quantityInStock', '$maxStock'] },
        isDeleted: false,
      })
        .populate('categoryId', 'groupingName')
        .populate('groupingId', 'groupingName')
        .sort({ quantityInStock: -1 })
        .skip(skip)
        .limit(limit);

      const total = await Product.countDocuments({
        $expr: { $gte: ['$quantityInStock', '$maxStock'] },
        isDeleted: false,
      });

      logger.info('Retrieved high stock products', { count: products.length });
      return {
        products,
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      };
    } catch (err) {
      logger.error('Failed to get high stock products', { error: err.message });
      throw err;
    }
  }

  /**
   * Get product pricing and cost analysis
   * @returns {Promise<Object>} - Pricing summary
   */
  async getPricingAnalysis() {
    try {
      const analysis = await Product.aggregate([
        { $match: { isDeleted: false } },
        {
          $group: {
            _id: null,
            avgCostPrice: { $avg: '$costPrice' },
            avgSellingPrice: { $avg: '$sellingPrice' },
            totalProducts: { $sum: 1 },
            totalStockValue: { $sum: { $multiply: ['$costPrice', '$quantityInStock'] } },
          },
        },
        {
          $project: {
            _id: 0,
            avgCostPrice: { $divide: ['$avgCostPrice', 100] },
            avgSellingPrice: { $divide: ['$avgSellingPrice', 100] },
            avgMargin: {
              $multiply: [
                { $divide: [{ $subtract: ['$avgSellingPrice', '$avgCostPrice'] }, '$avgSellingPrice'] },
                100,
              ],
            },
            totalProducts: 1,
            totalStockValue: { $divide: ['$totalStockValue', 100] },
          },
        },
      ]);

      logger.info('Retrieved pricing analysis');
      return analysis[0] || {};
    } catch (err) {
      logger.error('Failed to get pricing analysis', { error: err.message });
      throw err;
    }
  }

  /**
   * Generate barcode with duplicate prevention
   * FIFO queue system for multi-system data entry
   * Format: [DeptCode:2] + [PricingLevel:1] + [Random:7] = 10 digits
   * Client generates random component, server validates uniqueness
   * @param {string} baseBarcode - 10-digit barcode [DeptCode:2] + [PricingLevel:1] + [Random:7]
   * @param {string} itemCode - Product item code (optional, for reference only)
   * @param {string} departmentId - Department ID (optional, for reference only)
   * @param {string} systemId - System/terminal identifier (default: "system-default")
   * @returns {Promise<Object>} - { barcode, queueId, status }
   */
  async generateNextBarcode(baseBarcode, itemCode, departmentId, systemId = 'system-default') {
    try {
      logger.info('Starting barcode generation', { baseBarcode, departmentId, systemId });

      // Validate base barcode format (must be 10 digits)
      const cleanBarcode = String(baseBarcode).replace(/[^0-9]/g, '');
      if (!cleanBarcode || cleanBarcode.length !== 10) {
        const error = new Error('Invalid barcode format (must be exactly 10 numeric digits)');
        error.status = 400;
        throw error;
      }

      const generatedBarcode = cleanBarcode.slice(0, 10);

      // Check if barcode already exists in active products
      const existingProduct = await Product.findOne(
        { barcode: generatedBarcode.toUpperCase(), isDeleted: false },
        { _id: 1 }
      ).lean();

      if (existingProduct) {
        const error = new Error(
          `Barcode ${generatedBarcode} already exists in database. Please generate a new barcode.`
        );
        error.status = 409;
        logger.warn('Barcode generation conflict', { barcode: generatedBarcode });
        throw error;
      }

      // Check if barcode exists in queue (pending or assigned)
      const existingQueue = await BarcodeQueue.findOne(
        {
          generatedBarcode: generatedBarcode,
          status: { $in: ['pending', 'assigned'] }
        },
        { _id: 1 }
      ).lean();

      if (existingQueue) {
        const error = new Error(
          `Barcode ${generatedBarcode} is already queued. Please generate a new barcode.`
        );
        error.status = 409;
        logger.warn('Barcode already in queue', { barcode: generatedBarcode });
        throw error;
      }

      // Create queue entry for FIFO tracking (multi-system support)
      const queueEntry = new BarcodeQueue({
        systemId,
        baseBarcode: generatedBarcode,
        generatedBarcode: generatedBarcode,
        suffix: 0, // No suffix needed since client provides random component
        status: 'pending',
        itemCode: itemCode || '',
        departmentId: departmentId || '',
        retryCount: 0,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000) // 5-minute expiration
      });

      await queueEntry.save();

      logger.info('Barcode generated successfully', {
        barcode: generatedBarcode,
        queueId: queueEntry._id,
        systemId
      });

      return {
        barcode: generatedBarcode,
        queueId: queueEntry._id.toString(),
        suffix: 0,
        baseBarcode: generatedBarcode,
        status: 'pending'
      };
    } catch (err) {
      logger.error('Failed to generate barcode', {
        error: err.message,
        baseBarcode,
        departmentId
      });
      throw err;
    }
  }

  /**
   * Assign generated barcode to product (mark queue entry as assigned)
   * Called after product is successfully created
   * @param {string} queueId - Queue entry ID
   * @param {string} productId - Product ID
   * @returns {Promise<Object>} - Updated queue entry
   */
  async assignBarcodeToProduct(queueId, productId) {
    try {
      const queueEntry = await BarcodeQueue.findByIdAndUpdate(
        queueId,
        {
          status: 'assigned',
          productId,
          updatedAt: new Date()
        },
        { new: true }
      );

      if (!queueEntry) {
        const error = new Error('Queue entry not found');
        error.status = 404;
        throw error;
      }

      logger.info('Barcode assigned to product', {
        queueId,
        productId,
        barcode: queueEntry.generatedBarcode
      });

      return queueEntry;
    } catch (err) {
      logger.error('Failed to assign barcode to product', {
        error: err.message,
        queueId,
        productId
      });
      throw err;
    }
  }

  /**
   * Clean up expired queue entries (older than 5 minutes)
   * Run periodically (every 10 minutes)
   * @returns {Promise<Object>} - { deletedCount }
   */
  async cleanupExpiredBarcodes() {
    try {
      const result = await BarcodeQueue.deleteMany({
        status: 'pending',
        expiresAt: { $lt: new Date() }
      });

      logger.info('Cleanup expired barcodes', { deletedCount: result.deletedCount });

      return { deletedCount: result.deletedCount };
    } catch (err) {
      logger.error('Failed to cleanup expired barcodes', { error: err.message });
      throw err;
    }
  }

  /**
   * Get barcode generation queue status (for debugging/monitoring)
   * @param {Object} filters - { status, systemId, itemCode, limit }
   * @returns {Promise<Array>} - Queue entries
   */
  async getBarcodeQueueStatus(filters = {}) {
    try {
      const { status, systemId, itemCode, limit = 50 } = filters;
      let query = {};

      if (status) query.status = status;
      if (systemId) query.systemId = systemId;
      if (itemCode) query.itemCode = itemCode;

      const queueEntries = await BarcodeQueue.find(query)
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();

      logger.info('Retrieved barcode queue status', {
        count: queueEntries.length,
        filters
      });

      return queueEntries;
    } catch (err) {
      logger.error('Failed to get queue status', { error: err.message });
      throw err;
    }
  }
}

export default new ProductService();
