import Product from '../../../Models/AddProduct.js';
import Grouping from '../../../Models/Grouping.js';
import logger from '../../../config/logger.js';

/**
 * InventoryService - Handles inventory and product business logic
 */

class InventoryService {
  /**
   * Generate next item code
   * @returns {Promise<string>} Next item code
   */
  async generateNextItemCode() {
    try {
      const lastProduct = await Product.findOne({ isDeleted: false })
        .sort({ itemcode: -1 })
        .lean();

      let nextCode = '1001'; // Default starting code

      if (lastProduct && lastProduct.itemcode) {
        const numericPart = parseInt(lastProduct.itemcode.replace(/\D/g, ''));
        if (!isNaN(numericPart)) {
          nextCode = String(numericPart + 1);
        }
      }

      return nextCode;
    } catch (error) {
      logger.error('Error generating item code', { error: error.message });
      return '1001';
    }
  }

  /**
   * Create new product
   * @param {Object} productData - Product data
   * @returns {Promise<Object>} Created product
   * @throws {Error} If creation fails
   */
  async createProduct(productData) {
    try {
      const { itemcode, hsn, barcode, name, vendor, cost, price, stock, categoryId, groupingId, packingUnits } = productData;

      // Validate required fields
      if (!barcode || !name || !vendor || !cost || !price || !stock || !categoryId || !groupingId) {
        const error = new Error('All fields are required');
        error.status = 400;
        throw error;
      }

      // Validate category
      if (categoryId) {
        const categoryGrouping = await Grouping.findById(categoryId);
        if (!categoryGrouping || categoryGrouping.isDeleted || categoryGrouping.level !== 0) {
          const error = new Error('Invalid category selected');
          error.status = 400;
          throw error;
        }
      }

      // Validate grouping
      if (groupingId) {
        const grouping = await Grouping.findById(groupingId);
        if (!grouping || grouping.isDeleted || grouping.level !== 1) {
          const error = new Error('Invalid sub-category selected');
          error.status = 400;
          throw error;
        }
      }

      // Check for duplicate barcode
      const existingProduct = await Product.findOne({ barcode, isDeleted: false });
      if (existingProduct) {
        const error = new Error('Barcode already exists');
        error.status = 409;
        throw error;
      }

      // Generate item code if not provided
      let finalItemCode = itemcode;
      if (!itemcode) {
        finalItemCode = await this.generateNextItemCode();
      }

      // Create product
      const newProduct = new Product({
        itemcode: finalItemCode,
        hsn,
        barcode,
        name,
        vendor,
        cost: parseFloat(cost),
        price: parseFloat(price),
        stock: parseInt(stock),
        categoryId,
        groupingId,
        packingUnits,
      });

      await newProduct.save();

      logger.info('Product created successfully', { 
        productId: newProduct._id, 
        name: newProduct.name 
      });

      return newProduct;
    } catch (error) {
      logger.error('Create product service error', { error: error.message });
      throw error;
    }
  }

  /**
   * Get product by ID
   * @param {string} productId - Product ID
   * @returns {Promise<Object>} Product object
   * @throws {Error} If product not found
   */
  async getProductById(productId) {
    try {
      const product = await Product.findById(productId);

      if (!product || product.isDeleted) {
        const error = new Error('Product not found');
        error.status = 404;
        throw error;
      }

      return product;
    } catch (error) {
      logger.error('Get product service error', { error: error.message });
      throw error;
    }
  }

  /**
   * Update product
   * @param {string} productId - Product ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} Updated product
   * @throws {Error} If update fails
   */
  async updateProduct(productId, updateData) {
    try {
      const product = await Product.findByIdAndUpdate(
        productId,
        { $set: updateData },
        { new: true, runValidators: true }
      );

      if (!product) {
        const error = new Error('Product not found');
        error.status = 404;
        throw error;
      }

      logger.info('Product updated successfully', { productId, updates: Object.keys(updateData) });

      return product;
    } catch (error) {
      logger.error('Update product service error', { error: error.message });
      throw error;
    }
  }

  /**
   * Delete product (soft delete)
   * @param {string} productId - Product ID
   * @returns {Promise<Object>} Success message
   * @throws {Error} If deletion fails
   */
  async deleteProduct(productId) {
    try {
      const product = await Product.findByIdAndUpdate(
        productId,
        { $set: { isDeleted: true } },
        { new: true }
      );

      if (!product) {
        const error = new Error('Product not found');
        error.status = 404;
        throw error;
      }

      logger.info('Product deleted successfully', { productId });

      return { message: 'Product deleted successfully' };
    } catch (error) {
      logger.error('Delete product service error', { error: error.message });
      throw error;
    }
  }

  /**
   * Get all products with pagination
   * @param {number} page - Page number
   * @param {number} limit - Items per page
   * @param {Object} filters - Filter criteria
   * @returns {Promise<Object>} Paginated products
   */
  async getAllProducts(page = 1, limit = 20, filters = {}) {
    try {
      const skip = (page - 1) * limit;

      const query = { isDeleted: false, ...filters };

      const products = await Product.find(query)
        .skip(skip)
        .limit(limit)
        .lean();

      const total = await Product.countDocuments(query);

      return {
        data: products,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error('Get all products service error', { error: error.message });
      throw error;
    }
  }

  /**
   * Search products
   * @param {string} searchTerm - Search term
   * @param {number} limit - Results limit
   * @returns {Promise<Array>} Search results
   */
  async searchProducts(searchTerm, limit = 10) {
    try {
      const results = await Product.find(
        {
          $text: { $search: searchTerm },
          isDeleted: false,
        },
        { score: { $meta: 'textScore' } }
      )
        .sort({ score: { $meta: 'textScore' } })
        .limit(limit)
        .lean();

      return results;
    } catch (error) {
      logger.error('Search products service error', { error: error.message });
      throw error;
    }
  }

  /**
   * Get stock level for product
   * @param {string} productId - Product ID
   * @returns {Promise<Object>} Stock info
   */
  async getStockLevel(productId) {
    try {
      const product = await Product.findById(productId, 'stock name itemcode').lean();

      if (!product) {
        const error = new Error('Product not found');
        error.status = 404;
        throw error;
      }

      return {
        productId: product._id,
        name: product.name,
        itemcode: product.itemcode,
        stock: product.stock,
      };
    } catch (error) {
      logger.error('Get stock level service error', { error: error.message });
      throw error;
    }
  }

  /**
   * Update stock
   * @param {string} productId - Product ID
   * @param {number} quantity - Quantity to add/subtract
   * @param {string} reason - Reason for stock change
   * @returns {Promise<Object>} Updated stock
   */
  async updateStock(productId, quantity, reason = 'Manual adjustment') {
    try {
      const product = await Product.findByIdAndUpdate(
        productId,
        { $inc: { stock: quantity } },
        { new: true }
      );

      if (!product) {
        const error = new Error('Product not found');
        error.status = 404;
        throw error;
      }

      logger.info('Stock updated', { 
        productId, 
        quantity, 
        reason, 
        newStock: product.stock 
      });

      return {
        productId: product._id,
        stock: product.stock,
        message: 'Stock updated successfully',
      };
    } catch (error) {
      logger.error('Update stock service error', { error: error.message });
      throw error;
    }
  }
}

export default new InventoryService();
