/**
 * Sales Order Service
 * Handles business logic for sales order creation, updates, and management
 */

import SalesOrder from '../../../Models/Sales/SalesOrder.js';
import Sequence from '../../../Models/SequenceModel.js';
import Customer from '../../../Models/Customer.js';
import Product from '../../../Models/Product.js';
import logger from '../../../config/logger.js';

class SalesOrderService {
  /**
   * Generate next order number
   * @param {string} financialYear - Financial year
   * @returns {Promise<string>} - Generated order number (e.g., "SO-2024-2025-00001")
   */
  async getNextOrderNumber(financialYear) {
    try {
      if (!financialYear) {
        const error = new Error('Financial year is required');
        error.status = 400;
        throw error;
      }

      let sequence = await Sequence.findOne({
        name: 'SalesOrder',
        financialYear,
      });

      if (!sequence) {
        sequence = new Sequence({
          name: 'SalesOrder',
          financialYear,
          lastNumber: 0,
        });
      }

      sequence.lastNumber += 1;
      await sequence.save();

      const orderNumber = `SO-${financialYear}-${String(sequence.lastNumber).padStart(5, '0')}`;
      logger.info('Generated sales order number', { orderNumber, financialYear });
      return orderNumber;
    } catch (err) {
      logger.error('Failed to generate order number', { error: err.message, financialYear });
      throw err;
    }
  }

  /**
   * Validate order data
   * @param {Object} orderData - Order details
   * @returns {boolean} - true if valid
   */
  validateOrderData(orderData) {
    const { orderNumber, customerId, deliveryDate, items } = orderData;

    if (!orderNumber || !customerId || !deliveryDate || !items || items.length === 0) {
      const error = new Error('Missing required fields: orderNumber, customerId, deliveryDate, items');
      error.status = 400;
      throw error;
    }

    // Validate delivery date is in future
    if (new Date(deliveryDate) <= new Date()) {
      const error = new Error('Delivery date must be in the future');
      error.status = 400;
      throw error;
    }

    return true;
  }

  /**
   * Create a new sales order
   * @param {Object} orderData - Order details
   * @returns {Promise<Object>} - Created order
   */
  async createSalesOrder(orderData) {
    try {
      this.validateOrderData(orderData);

      const order = new SalesOrder(orderData);
      await order.save();

      logger.info('Sales order created', { orderId: order._id, orderNumber: order.orderNumber });
      return order;
    } catch (err) {
      logger.error('Failed to create sales order', { error: err.message });
      throw err;
    }
  }

  /**
   * Get order by ID
   * @param {string} orderId - Order ID
   * @returns {Promise<Object>} - Order with populated customer and items
   */
  async getOrderById(orderId) {
    try {
      const order = await SalesOrder.findById(orderId)
        .populate('customerId')
        .populate('items.productId');

      if (!order) {
        const error = new Error('Sales order not found');
        error.status = 404;
        throw error;
      }

      logger.info('Retrieved sales order', { orderId });
      return order;
    } catch (err) {
      logger.error('Failed to get sales order', { error: err.message, orderId });
      throw err;
    }
  }

  /**
   * Get all orders with pagination and filters
   * @param {Object} filters - { customerId, status, startDate, endDate, page, limit }
   * @returns {Promise<Object>} - Paginated orders with count
   */
  async getAllOrders(filters = {}) {
    try {
      const { customerId, status, startDate, endDate, page = 1, limit = 20 } = filters;
      const skip = (page - 1) * limit;

      let query = { isDeleted: false };

      if (customerId) query.customerId = customerId;
      if (status) query.status = status;
      if (startDate || endDate) {
        query.orderDate = {};
        if (startDate) query.orderDate.$gte = new Date(startDate);
        if (endDate) query.orderDate.$lte = new Date(endDate);
      }

      const orders = await SalesOrder.find(query)
        .populate('customerId')
        .populate('items.productId')
        .sort({ orderDate: -1 })
        .skip(skip)
        .limit(limit);

      const total = await SalesOrder.countDocuments(query);

      logger.info('Retrieved sales orders', { count: orders.length, total, page, limit });
      return {
        orders,
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      };
    } catch (err) {
      logger.error('Failed to get sales orders', { error: err.message });
      throw err;
    }
  }

  /**
   * Update a sales order
   * @param {string} orderId - Order ID
   * @param {Object} updateData - Fields to update
   * @returns {Promise<Object>} - Updated order
   */
  async updateSalesOrder(orderId, updateData) {
    try {
      // Validate if updating delivery date
      if (updateData.deliveryDate && new Date(updateData.deliveryDate) <= new Date()) {
        const error = new Error('Delivery date must be in the future');
        error.status = 400;
        throw error;
      }

      const order = await SalesOrder.findByIdAndUpdate(orderId, updateData, {
        returnDocument: 'after',
        runValidators: true,
      });

      if (!order) {
        const error = new Error('Sales order not found');
        error.status = 404;
        throw error;
      }

      logger.info('Sales order updated', { orderId, updatedFields: Object.keys(updateData) });
      return order;
    } catch (err) {
      logger.error('Failed to update sales order', { error: err.message, orderId });
      throw err;
    }
  }

  /**
   * Delete a sales order (soft delete)
   * @param {string} orderId - Order ID
   * @returns {Promise<void>}
   */
  async deleteSalesOrder(orderId) {
    try {
      const order = await SalesOrder.findByIdAndUpdate(orderId, { isDeleted: true }, { returnDocument: 'after' });

      if (!order) {
        const error = new Error('Sales order not found');
        error.status = 404;
        throw error;
      }

      logger.info('Sales order deleted (soft)', { orderId });
    } catch (err) {
      logger.error('Failed to delete sales order', { error: err.message, orderId });
      throw err;
    }
  }

  /**
   * Update order status
   * @param {string} orderId - Order ID
   * @param {string} status - New status (Pending, Confirmed, Shipped, Delivered, Cancelled)
   * @returns {Promise<Object>} - Updated order
   */
  async updateOrderStatus(orderId, status) {
    try {
      const validStatuses = ['Pending', 'Confirmed', 'Shipped', 'Delivered', 'Cancelled'];
      if (!validStatuses.includes(status)) {
        const error = new Error(`Invalid status. Allowed: ${validStatuses.join(', ')}`);
        error.status = 400;
        throw error;
      }

      const order = await SalesOrder.findByIdAndUpdate(orderId, { status, updatedDate: new Date() }, { returnDocument: 'after' });

      if (!order) {
        const error = new Error('Sales order not found');
        error.status = 404;
        throw error;
      }

      logger.info('Order status updated', { orderId, newStatus: status });
      return order;
    } catch (err) {
      logger.error('Failed to update order status', { error: err.message, orderId });
      throw err;
    }
  }

  /**
   * Get orders by customer
   * @param {string} customerId - Customer ID
   * @param {Object} filters - { status, page, limit }
   * @returns {Promise<Object>} - Paginated orders
   */
  async getOrdersByCustomer(customerId, filters = {}) {
    try {
      const { status, page = 1, limit = 20 } = filters;
      const skip = (page - 1) * limit;

      let query = { customerId, isDeleted: false };
      if (status) query.status = status;

      const orders = await SalesOrder.find(query)
        .populate('customerId')
        .populate('items.productId')
        .sort({ orderDate: -1 })
        .skip(skip)
        .limit(limit);

      const total = await SalesOrder.countDocuments(query);

      logger.info('Retrieved customer orders', { customerId, count: orders.length });
      return {
        orders,
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      };
    } catch (err) {
      logger.error('Failed to get customer orders', { error: err.message, customerId });
      throw err;
    }
  }

  /**
   * Get orders pending delivery
   * @returns {Promise<Array>} - Orders with status = Shipped
   */
  async getPendingDeliveryOrders() {
    try {
      const orders = await SalesOrder.find({ status: 'Shipped', isDeleted: false })
        .populate('customerId')
        .populate('items.productId')
        .sort({ deliveryDate: 1 });

      logger.info('Retrieved pending delivery orders', { count: orders.length });
      return orders;
    } catch (err) {
      logger.error('Failed to get pending delivery orders', { error: err.message });
      throw err;
    }
  }
}

export default new SalesOrderService();
