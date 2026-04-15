import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import connectDB from "./config/database.js";
import environment from "./config/environment.js";
import logger from "./config/logger.js";
import { errorHandler, notFoundHandler } from "./config/errorHandler.js";
import { initializeMeilisearch, setupIndex } from "./config/meilisearch.js";

// Import module routes
import salesRoutes from './modules/sales/routes/index.js';
import inventoryRoutes from './modules/inventory/routes/index.js';
import accountingRoutes from './modules/accounting/routes/index.js';
import purchasingRoutes from './modules/purchasing/routes/index.js';
import customerRoutes from './modules/customers/routes/index.js';
import authRoutes from './modules/auth/routes/index.js';
import masterRoutes from './modules/masters/routes/index.js';
import settingsRoutes from './modules/settings/routes/index.js';
import taxRoutes from './modules/tax/routes/index.js';
import costingRoutes from './modules/costing/routes/index.js';
import reportingRoutes from './modules/reporting/routes/index.js';
import activityRoutes from './modules/activity/routes/index.js';
import paymentRoutes from './modules/payments/routes/index.js';
import posRoutes from './modules/pos/routes/index.js';
import promotionRoutes from './modules/promotions/routes/index.js';
import unitTypeRoutes from './modules/unit/routes/index.js';
import productPackingRoutes from './modules/inventory/routes/productPackingRoutes.js';
import stockBatchRoutes from './modules/inventory/routes/stockBatchRoutes.js';
import organizationRoutes from './modules/organization/routes/organizationRoutes.js';
import invoiceTemplateRoutes from './routes/invoiceTemplateRoutes.js';
import invoicePdfRoutes from './routes/invoicePdfRoutes.js';
import { seedInvoiceTemplates } from './seedInvoiceTemplates.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Initialize database
await connectDB();

// ✅ Initialize Meilisearch for full-text search
await initializeMeilisearch();
await setupIndex();

// ✅ STEP 1: Clean orphan products from Meilisearch (removes products that don't exist in DB)
console.log('🧹 Cleaning orphan products from Meilisearch...');
try {
  const { cleanupOrphanProducts } = await import('./services/OrphanProductCleanup.js');
  const cleanupResult = await cleanupOrphanProducts();
  if (cleanupResult.orphanFound > 0) {
    console.log(`✅ Cleanup complete: Removed ${cleanupResult.orphanRemoved} orphan products`);
    if (cleanupResult.orphanErrors > 0) {
      console.warn(`⚠️  ${cleanupResult.orphanErrors} errors during cleanup`);
    }
  } else {
    console.log('✅ No orphan products found');
  }
} catch (cleanupErr) {
  console.warn('⚠️  Orphan cleanup skipped:', cleanupErr.message);
}

// ✅ STEP 2: Auto-sync products to Meilisearch on startup (takes ~2-5s for 50k products)
// This ensures search works fast even after server restart
console.log('🔄 Auto-syncing products to Meilisearch index after startup...');
try {
  const { syncAllProductsToMeilisearch } = await import('./modules/inventory/services/ProductMeilisearchSync.js');
  const syncResult = await syncAllProductsToMeilisearch();
  if (syncResult.success) {
    console.log(`✅ Auto-sync complete: ${syncResult.indexed} products indexed`);
  } else {
    console.warn(`⚠️  Auto-sync partial: ${syncResult.indexed} indexed, ${syncResult.failed} failed`);
  }
} catch (syncErr) {
  console.warn('⚠️  Auto-sync skipped on startup (will work on first search):', syncErr.message);
}

// ✅ STEP 3: Seed invoice templates on startup
console.log('📄 Seeding invoice templates...');
try {
  await seedInvoiceTemplates();
} catch (seedErr) {
  console.error('❌ Error seeding invoice templates:', seedErr.message);
}

// Middleware
app.use(cors({
  origin: environment.CORS_ORIGIN,
  credentials: true,
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

// Module Routes with API versioning (v1)
const apiV1 = '/api/v1';

// Auth routes (separate from v1 for immediate access)
app.use(`${apiV1}/auth`, authRoutes.authRoutes);

// User management routes
app.use(`${apiV1}/users`, authRoutes.userRoutes);

// Role management routes
app.use(`${apiV1}/roles`, authRoutes.roleRoutes);

// Sales module
app.use(`${apiV1}/sales-invoices`, salesRoutes.salesInvoiceRoutes);
app.use(`${apiV1}/sales-orders`, salesRoutes.salesOrderRoutes);
app.use(`${apiV1}/sales-returns`, salesRoutes.salesReturnRoutes);
app.use(`${apiV1}/delivery-notes`, salesRoutes.deliveryNoteRoutes);
app.use(`${apiV1}/credit-sale-receipts`, salesRoutes.creditSaleReceiptRoutes);

// Inventory module
app.use(`${apiV1}/products`, inventoryRoutes.productRoutes);
app.use(`${apiV1}/stock`, inventoryRoutes.stockRoutes);
app.use(`${apiV1}/stock-variance`, inventoryRoutes.stockVarianceRoutes);
app.use(`${apiV1}/grn`, inventoryRoutes.grnRoutes);
app.use(`${apiV1}/rtv`, inventoryRoutes.rtvRoutes);

// Accounting module
app.use(`${apiV1}/chart-of-accounts`, accountingRoutes.chartOfAccountsRoutes);
app.use(`${apiV1}/journals`, accountingRoutes.journalEntryRoutes);
app.use(`${apiV1}/account-groups`, accountingRoutes.accountGroupRoutes);
app.use(`${apiV1}/contras`, accountingRoutes.contraRoutes);
app.use(`${apiV1}/vendor-payments`, accountingRoutes.vendorPaymentRoutes);

// Purchasing module
app.use(`${apiV1}/vendors`, purchasingRoutes.vendorRoutes);

// Customers module
app.use(`${apiV1}/customer-receipts`, customerRoutes.customerReceiptRoutes);
app.use(`${apiV1}/customers`, customerRoutes.customerRoutes);

// Masters module
app.use(`${apiV1}/groupings`, masterRoutes.groupingRoutes);
app.use(`${apiV1}/hsn`, masterRoutes.hsnRoutes);
app.use(`${apiV1}/financial-years`, masterRoutes.financialYearRoutes);

// Settings module
app.use(`${apiV1}/settings`, settingsRoutes.settingsRoutes);

// Terminal Management module
app.use(`${apiV1}/terminals`, settingsRoutes.terminalManagementRoutes);

// Tax module
app.use(`${apiV1}/tax-masters`, taxRoutes.taxMasterRoutes);
app.use(`${apiV1}/countries`, taxRoutes.countryConfigRoutes);

// Costing module
app.use(`${apiV1}/costing`, costingRoutes.costingRoutes);

// Reporting module
app.use(`${apiV1}/reports`, reportingRoutes.reportRoutes);

// Activity module
app.use(`${apiV1}/activity-logs`, activityRoutes.activityLogRoutes);

// Payments module
app.use(`${apiV1}/payments`, paymentRoutes.paymentRoutes);
app.use(`${apiV1}/receipts`, paymentRoutes.receiptRoutes);

// POS module
app.use(`${apiV1}/pos`, posRoutes.posShiftRoutes);

// Promotions module
app.use(`${apiV1}/promotions`, promotionRoutes);

// Unit Types module
app.use(`${apiV1}/unit-types`, unitTypeRoutes);

// Product Packing module
app.use(`${apiV1}/product-packing`, productPackingRoutes);

// Stock Batch module (Product Expiry Tracking)
app.use(`${apiV1}/stock-batches`, stockBatchRoutes);

// Organization module (Branch Management)
app.use(`${apiV1}/organizations`, organizationRoutes);

// Invoice Printing System - Templates & PDF Generation
app.use(`${apiV1}/invoice-templates`, invoiceTemplateRoutes);
app.use(`${apiV1}`, invoicePdfRoutes);

// Health check endpoints
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'NEXIS ERP API Server',
    version: '1.0.0',
    status: 'running',
  });
});

app.get('/api', (req, res) => {
  res.json({
    success: true,
    message: 'NEXIS ERP API',
    api_base: `http://localhost:${environment.PORT}/api/v1`,
  });
});

app.get(`${apiV1}`, (req, res) => {
  res.json({
    success: true,
    message: 'NEXIS ERP API v1',
    endpoints: {
      auth: `${apiV1}/auth`,
      products: `${apiV1}/products`,
      sales: `${apiV1}/sales-invoices`,
      customers: `${apiV1}/customers`,
      vendors: `${apiV1}/vendors`,
    },
  });
});

// Error handling middleware
app.use(notFoundHandler);
app.use(errorHandler);

// Server startup
const PORT = environment.PORT;

app.listen(PORT, () => {
  logger.info(`🚀 Server running on port ${PORT}`);
  logger.info(`📍 Environment: ${environment.NODE_ENV}`);
  logger.info(`📚 API Base: http://localhost:${PORT}/api/v1`);
});

export default app;
