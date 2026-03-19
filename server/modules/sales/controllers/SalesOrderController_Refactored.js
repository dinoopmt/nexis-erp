/**
 * Sales Order Controller (Refactored)
 * Thin HTTP handler layer - delegates business logic to SalesOrderService
 */

import SalesOrderService from '../services/SalesOrderService.js';
import { catchAsync } from '../../../config/errorHandler.js';
import logger from '../../../config/logger.js';

/**
 * GET /order/next-number?financialYear=2024-2025
 * Auto-generate next order number
 */
export const getNextOrderNumber = catchAsync(async (req, res) => {
  const { financialYear } = req.query;
  const orderNumber = await SalesOrderService.getNextOrderNumber(financialYear);
  res.json({
    success: true,
    data: { orderNumber },
    message: 'Order number generated successfully',
  });
});

/**
 * POST /order
 * Create a new sales order
 */
export const createSalesOrder = catchAsync(async (req, res) => {
  const order = await SalesOrderService.createSalesOrder(req.body);
  res.status(201).json({
    success: true,
    data: order,
    message: 'Sales order created successfully',
  });
});

/**
 * GET /order/:id
 * Get order by ID
 */
export const getSalesOrderById = catchAsync(async (req, res) => {
  const order = await SalesOrderService.getOrderById(req.params.id);
  res.json({
    success: true,
    data: order,
    message: 'Order retrieved successfully',
  });
});

/**
 * GET /order
 * Get all orders with pagination and filters
 * Query: ?customerId=...&status=...&startDate=...&endDate=...&page=1&limit=20
 */
export const getAllSalesOrders = catchAsync(async (req, res) => {
  const filters = {
    customerId: req.query.customerId,
    status: req.query.status,
    startDate: req.query.startDate,
    endDate: req.query.endDate,
    page: parseInt(req.query.page) || 1,
    limit: parseInt(req.query.limit) || 20,
  };

  const result = await SalesOrderService.getAllOrders(filters);

  res.json({
    success: true,
    data: result,
    message: 'Orders retrieved successfully',
  });
});

/**
 * PUT /order/:id
 * Update an order
 */
export const updateSalesOrder = catchAsync(async (req, res) => {
  const order = await SalesOrderService.updateSalesOrder(req.params.id, req.body);
  res.json({
    success: true,
    data: order,
    message: 'Order updated successfully',
  });
});

/**
 * DELETE /order/:id
 * Delete an order (soft delete)
 */
export const deleteSalesOrder = catchAsync(async (req, res) => {
  await SalesOrderService.deleteSalesOrder(req.params.id);
  res.json({
    success: true,
    message: 'Order deleted successfully',
  });
});

/**
 * PUT /order/:id/status
 * Update order status
 * Body: { status: "Pending|Confirmed|Shipped|Delivered|Cancelled" }
 */
export const updateOrderStatus = catchAsync(async (req, res) => {
  const { status } = req.body;
  const order = await SalesOrderService.updateOrderStatus(req.params.id, status);
  res.json({
    success: true,
    data: order,
    message: 'Order status updated successfully',
  });
});

/**
 * GET /order/customer/:customerId
 * Get all orders for a specific customer
 * Query: ?status=...&page=1&limit=20
 */
export const getCustomerOrders = catchAsync(async (req, res) => {
  const { customerId } = req.params;
  const filters = {
    status: req.query.status,
    page: parseInt(req.query.page) || 1,
    limit: parseInt(req.query.limit) || 20,
  };

  const result = await SalesOrderService.getOrdersByCustomer(customerId, filters);

  res.json({
    success: true,
    data: result,
    message: 'Customer orders retrieved successfully',
  });
});

/**
 * GET /order/pending-delivery
 * Get orders pending delivery
 */
export const getPendingDeliveryOrders = catchAsync(async (req, res) => {
  const orders = await SalesOrderService.getPendingDeliveryOrders();
  res.json({
    success: true,
    data: orders,
    message: 'Pending delivery orders retrieved successfully',
  });
});
