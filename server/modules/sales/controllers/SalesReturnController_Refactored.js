/**
 * Sales Return Controller (Refactored)
 * Thin HTTP handler layer - delegates business logic to SalesReturnService
 */

import SalesReturnService from '../services/SalesReturnService.js';
import { catchAsync } from '../../../config/errorHandler.js';
import logger from '../../../config/logger.js';

/**
 * GET /return/next-number?financialYear=2024-2025
 * Auto-generate next return number
 */
export const getNextReturnNumber = catchAsync(async (req, res) => {
  const { financialYear } = req.query;
  const returnNumber = await SalesReturnService.getNextReturnNumber(financialYear);
  res.json({
    success: true,
    data: { returnNumber },
    message: 'Return number generated successfully',
  });
});

/**
 * POST /return
 * Create a new sales return
 */
export const createSalesReturn = catchAsync(async (req, res) => {
  const salesReturn = await SalesReturnService.createSalesReturn(req.body);
  res.status(201).json({
    success: true,
    data: salesReturn,
    message: 'Sales return created successfully',
  });
});

/**
 * GET /return/:id
 * Get return by ID
 */
export const getSalesReturnById = catchAsync(async (req, res) => {
  const salesReturn = await SalesReturnService.getReturnById(req.params.id);
  res.json({
    success: true,
    data: salesReturn,
    message: 'Return retrieved successfully',
  });
});

/**
 * GET /return
 * Get all returns with pagination and filters
 * Query: ?customerId=...&status=...&invoiceId=...&startDate=...&endDate=...&page=1&limit=20
 */
export const getAllSalesReturns = catchAsync(async (req, res) => {
  const filters = {
    customerId: req.query.customerId,
    status: req.query.status,
    invoiceId: req.query.invoiceId,
    startDate: req.query.startDate,
    endDate: req.query.endDate,
    page: parseInt(req.query.page) || 1,
    limit: parseInt(req.query.limit) || 20,
  };

  const result = await SalesReturnService.getAllReturns(filters);

  res.json({
    success: true,
    data: result,
    message: 'Returns retrieved successfully',
  });
});

/**
 * PUT /return/:id
 * Update a return
 */
export const updateSalesReturn = catchAsync(async (req, res) => {
  const salesReturn = await SalesReturnService.updateSalesReturn(req.params.id, req.body);
  res.json({
    success: true,
    data: salesReturn,
    message: 'Return updated successfully',
  });
});

/**
 * POST /return/:id/approve
 * Approve a return and process refund
 * Body: { approvedBy: "...", notes: "...", refundAmount: 5000 }
 */
export const approveReturn = catchAsync(async (req, res) => {
  const { approvedBy, notes, refundAmount } = req.body;
  const salesReturn = await SalesReturnService.approveReturn(req.params.id, {
    approvedBy,
    notes,
    refundAmount,
  });
  res.json({
    success: true,
    data: salesReturn,
    message: 'Return approved and refund processed',
  });
});

/**
 * POST /return/:id/reject
 * Reject a return
 * Body: { rejectionReason: "..." }
 */
export const rejectReturn = catchAsync(async (req, res) => {
  const { rejectionReason } = req.body;
  const salesReturn = await SalesReturnService.rejectReturn(req.params.id, rejectionReason);
  res.json({
    success: true,
    data: salesReturn,
    message: 'Return rejected',
  });
});

/**
 * DELETE /return/:id
 * Delete a return (soft delete)
 */
export const deleteSalesReturn = catchAsync(async (req, res) => {
  await SalesReturnService.deleteSalesReturn(req.params.id);
  res.json({
    success: true,
    message: 'Return deleted successfully',
  });
});

/**
 * GET /return/pending
 * Get pending returns (awaiting approval)
 */
export const getPendingReturns = catchAsync(async (req, res) => {
  const returns = await SalesReturnService.getPendingReturns();
  res.json({
    success: true,
    data: returns,
    message: 'Pending returns retrieved successfully',
  });
});

/**
 * GET /return/summary
 * Get return summary
 * Query: ?year=2024&month=1&status=Approved
 */
export const getReturnSummary = catchAsync(async (req, res) => {
  const filters = {
    year: req.query.year,
    month: req.query.month,
    status: req.query.status,
  };

  const summary = await SalesReturnService.getReturnSummary(filters);

  res.json({
    success: true,
    data: summary,
    message: 'Return summary retrieved successfully',
  });
});
