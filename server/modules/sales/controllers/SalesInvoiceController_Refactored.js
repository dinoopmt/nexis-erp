/**
 * Sales Invoice Controller (Refactored)
 * Thin HTTP handler layer - delegates business logic to SalesInvoiceService
 */

import SalesInvoiceService from '../services/SalesInvoiceService.js';
import { catchAsync } from '../../../config/errorHandler.js';
import logger from '../../../config/logger.js';

/**
 * GET /invoice/next-number?financialYear=2024-2025
 * Auto-generate next invoice number
 */
export const getNextInvoiceNumber = catchAsync(async (req, res) => {
  const { financialYear } = req.query;
  const invoiceNumber = await SalesInvoiceService.getNextInvoiceNumber(financialYear);
  res.json({
    success: true,
    data: { invoiceNumber },
    message: 'Invoice number generated successfully',
  });
});

/**
 * POST /invoice
 * Create a new sales invoice
 */
export const createSalesInvoice = catchAsync(async (req, res) => {
  const result = await SalesInvoiceService.createSalesInvoice(req.body);
  res.status(201).json({
    success: true,
    data: result,
    message: 'Sales invoice created successfully',
  });
});

/**
 * GET /invoice/:id
 * Get invoice by ID
 */
export const getSalesInvoiceById = catchAsync(async (req, res) => {
  const invoice = await SalesInvoiceService.getInvoiceById(req.params.id);
  res.json({
    success: true,
    data: invoice,
    message: 'Invoice retrieved successfully',
  });
});

/**
 * GET /invoice
 * Get all invoices with pagination and filters
 * Query: ?customerId=...&status=...&startDate=...&endDate=...&page=1&limit=20
 */
export const getAllSalesInvoices = catchAsync(async (req, res) => {
  const filters = {
    customerId: req.query.customerId,
    status: req.query.status,
    startDate: req.query.startDate,
    endDate: req.query.endDate,
    page: parseInt(req.query.page) || 1,
    limit: parseInt(req.query.limit) || 20,
  };

  const result = await SalesInvoiceService.getAllInvoices(filters);

  res.json({
    success: true,
    data: result,
    message: 'Invoices retrieved successfully',
  });
});

/**
 * PUT /invoice/:id
 * Update an invoice
 */
export const updateSalesInvoice = catchAsync(async (req, res) => {
  const invoice = await SalesInvoiceService.updateInvoice(req.params.id, req.body);
  res.json({
    success: true,
    data: invoice,
    message: 'Invoice updated successfully',
  });
});

/**
 * DELETE /invoice/:id
 * Delete an invoice (soft delete)
 */
export const deleteSalesInvoice = catchAsync(async (req, res) => {
  await SalesInvoiceService.deleteInvoice(req.params.id);
  res.json({
    success: true,
    message: 'Invoice deleted successfully',
  });
});

/**
 * GET /invoice/summary
 * Get invoice summary/dashboard data
 * Query: ?year=2024&month=1&customerId=...
 */
export const getInvoiceSummary = catchAsync(async (req, res) => {
  const filters = {
    year: req.query.year,
    month: req.query.month,
    customerId: req.query.customerId,
  };

  const summary = await SalesInvoiceService.getInvoiceSummary(filters);

  res.json({
    success: true,
    data: summary,
    message: 'Invoice summary retrieved successfully',
  });
});
