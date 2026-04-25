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
import barcodeTemplateRoutes from './routes/barcodeTemplateRoutes.js';
import invoicePdfRoutes from './routes/invoicePdfRoutes.js';
import documentPdfRoutes from './routes/documentPdfRoutes.js';
import { validateTerminalIdRoute } from './routes/terminalValidationRoute.js';
import { seedInvoiceTemplates } from './seedInvoiceTemplates.js';
import { seedDocumentTemplates } from './seedDocumentTemplates.js';
import { seedBarcodeTemplates, seedAdditionalBarcodeTemplates } from './Seeders/barcodeSeed.js';
import { seedDefaultTerminals } from './seeders/seedDefaultTerminals.js';
import { globalLimiter, authLimiter, apiLimiter } from './middleware/rateLimiter.js';
import { requestLogger } from './middleware/structuredLogger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Initialize database
let db;
try {
  db = await connectDB();
  // Create indexes for terminal management
  console.log('🔑 Setting up terminal database indexes...');
  try {
    await db.collection('terminals').createIndex({ terminalId: 1 }, { unique: true });
    console.log('✅ Terminal ID unique index created');
  } catch (indexErr) {
    if (indexErr.code === 11000 || indexErr.message.includes('already exists')) {
      console.log('✅ Terminal ID unique index already exists');
    } else {
      console.warn('⚠️ Terminal ID index error:', indexErr.message);
    }
  }
  try {
    await db.collection('terminals').createIndex({ deviceFingerprint: 1 });
    console.log('✅ Device fingerprint index created');
  } catch (indexErr) {
    if (indexErr.message.includes('already exists')) {
      console.log('✅ Device fingerprint index already exists');
    } else {
      console.warn('⚠️ Device fingerprint index error:', indexErr.message);
    }
  }
} catch (dbErr) {
  console.error('❌ Database connection failed:', dbErr.message);
  process.exit(1);
}

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

// ✅ STEP 3B: Seed document format templates (Delivery Note, Quotation, Sales Order, Sales Return)
console.log('📋 Seeding document format templates...');
try {
  await seedDocumentTemplates();
} catch (seedErr) {
  console.error('❌ Error seeding document templates:', seedErr.message);
}

// ✅ STEP 4: Seed barcode templates on startup
console.log('📦 Seeding barcode templates...');
try {
  await seedBarcodeTemplates();
  await seedAdditionalBarcodeTemplates();
  console.log('✅ Barcode templates seeded successfully');
} catch (barcodeErr) {
  console.error('❌ Error seeding barcode templates:', barcodeErr.message);
}

// ✅ STEP 5: Seed default terminals on startup (REQUIRED for license control)
console.log('🖥️  Seeding default terminals...');
try {
  await seedDefaultTerminals();
} catch (terminalErr) {
  console.error('❌ Error seeding default terminals:', terminalErr.message);
}

// Middleware
app.use(cors({
  origin: Array.isArray(environment.CORS_ORIGIN) ? environment.CORS_ORIGIN : [environment.CORS_ORIGIN],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'terminal-id', 'store-id'],
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Request ID generator
app.use((req, res, next) => {
  req.id = req.get('x-request-id') || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  res.set('X-Request-ID', req.id);
  next();
});

// Structured request logging
app.use(requestLogger);

// Rate limiting middleware
app.use(globalLimiter);
app.use('/api/v1/auth/login', authLimiter);
app.use('/api/v1/auth/register', authLimiter);
app.use('/api/v1/auth/forgot-password', authLimiter);

// ✅ SERVE STATIC FILES: Product images stored on file system
// Maps /images/* to server/images/* directory
// Add explicit CORS headers for static files
app.use('/images', (req, res, next) => {
  // ✅ CORS headers for cross-origin image requests from React
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.header('Access-Control-Allow-Headers', '*');
  res.header('Access-Control-Max-Age', '86400');
  res.header('Cache-Control', 'public, max-age=86400');
  
  // ✅ Handle OPTIONS preflight requests
  if (req.method === 'OPTIONS') {
    return res.send();
  }
  
  next();
});

app.use('/images', express.static(path.join(__dirname, 'images'), {
  maxAge: '1d',  // Cache for 1 day
  etag: false,   // Disable etag for performance
}));
console.log(`✅ Static image directory mapped to: ${path.join(__dirname, 'images')}`);

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
app.use(`${apiV1}/quotations`, salesRoutes.quotationRoutes);
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

// Terminal Validation API (Device-based Terminal ID system) - MUST be before terminalManagementRoutes
// to prevent GET /:terminalId from catching /device-info and /validate-id
validateTerminalIdRoute(app, db);

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

// Barcode Template Management
app.use(`${apiV1}/barcode-templates`, barcodeTemplateRoutes);
app.use(`${apiV1}`, invoicePdfRoutes);
app.use(`${apiV1}`, documentPdfRoutes);

// Health check endpoints
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'NEXIS ERP API Server',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString(),
  });
});

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
