import express from "express";
import {
  addProduct,
  getProducts,
  getProductsByBranch,
  getProductById,
  updateProduct,
  deleteProduct,
  restoreProduct,
  updateProductStock,
  getProductsByCategory,
  getProductStats,
  checkBarcodeExists,
  checkItemcodeExists,
  checkDuplicateItemcode,
  checkDuplicateProductName,
  getNextItemCode,
  generateBarcode,
  assignBarcodeToProduct,
  getBarcodeQueueStatus,
  bulkImportProducts,
  bulkImportSimpleProducts,
  getProductCount,
  bulkSyncToMeilisearch,
  resetAndSyncMeilisearch,
  cleanupMeilisearchOrphans,
  fixMissingImagePaths,
  searchProducts,
  getProductByBarcode,
} from "../controllers/productController.js";

// ✅ Import Meilisearch task status function
import { getTaskStatus } from "../../../config/meilisearch.js";

// ✅ Temporarily removed rate limiting due to bug - will re-enable after fix
// import { searchLimiter } from "../../../config/rateLimiter.js";

const searchLimiter = (req, res, next) => next();

// ✅ Import analytics and optimization modules
import { getAnalyticsSummary, resetAnalytics } from "../../../config/queryAnalytics.js";
import { getOptimizationReport, resetMetrics } from "../../../config/queryOptimization.js";

const router = express.Router();

// ================= ADD PRODUCT =================
router.post("/addproduct", addProduct);

// ================= GET ALL PRODUCTS =================
router.get("/getproducts", getProducts);

// ================= GET PRODUCTS BY BRANCH (Multi-Store Support) =================
router.get("/branch/:branchId", getProductsByBranch);

// ================= GET PRODUCT BY ID =================
router.get("/getproduct/:id", getProductById);

// ================= UPDATE PRODUCT =================
router.put("/updateproduct/:id", updateProduct);

// ================= DELETE PRODUCT =================
router.delete("/deleteproduct/:id", deleteProduct);

// ================= RESTORE PRODUCT =================
router.put("/restoreproduct/:id", restoreProduct);

// ================= UPDATE PRODUCT STOCK =================
router.put("/updatestock/:id", updateProductStock);

// ================= GET PRODUCTS BY CATEGORY =================
router.get("/products/category/:category", getProductsByCategory);

// ================= GET PRODUCT STATISTICS =================
router.get("/products/stats", getProductStats);

// ================= CHECK IF BARCODE EXISTS =================
router.post("/checkbarcode", checkBarcodeExists);

// ================= GET PRODUCT BY BARCODE (FOR BARCODE SCANNING) =================
// ✅ Fast exact match endpoint for barcode scanner
// Usage: GET /api/v1/products/barcode/649528918796
router.get("/barcode/:code", getProductByBarcode);

// ================= CHECK IF ITEM CODE EXISTS =================
router.post("/checkitemcode", checkItemcodeExists);

// ================= CHECK IF PRODUCT NAME ALREADY EXISTS (Duplicate Prevention) =================
// ✅ GET /products/check-duplicate-name?name=ProductName&excludeId=productId
router.get("/check-duplicate-name", checkDuplicateProductName);

// ================= CHECK IF ITEM CODE ALREADY EXISTS (Duplicate Prevention - GET) =================
// ✅ GET /products/check-duplicate-itemcode?itemcode=1005&excludeId=productId
router.get("/check-duplicate-itemcode", checkDuplicateItemcode);

// ================= GET NEXT ITEM CODE (Peek - without incrementing) =================
router.get("/nexitemcode", getNextItemCode);

// ================= GENERATE BARCODE (Server-side with FIFO & Duplicate Prevention) =================
router.post("/generatebarcode", generateBarcode);

// ================= ASSIGN BARCODE TO PRODUCT =================
router.post("/assignbarcode", assignBarcodeToProduct);

// ================= GET BARCODE QUEUE STATUS (Debugging/Monitoring) =================
router.get("/barcodequeue/status", getBarcodeQueueStatus);

// ================= BULK IMPORT PRODUCTS FROM EXCEL =================
router.post("/bulk-import", bulkImportProducts);

// ================= BULK IMPORT SIMPLE PRODUCTS (From External Systems) =================
router.post("/bulk-import-simple", bulkImportSimpleProducts);

// ================= GET PRODUCT COUNT =================
router.get("/count", getProductCount);

// ================= BULK SYNC PRODUCTS TO MEILISEARCH =================
// ✅ Index all existing products to Meilisearch
router.post("/bulk-sync-meilisearch", bulkSyncToMeilisearch);

// ================= RESET AND SYNC MEILISEARCH INDEX =================
// ✅ Complete fresh rebuild - clears old/deleted data and re-indexes from DB
router.post("/reset-sync-meilisearch", resetAndSyncMeilisearch);

// ================= FIX MISSING IMAGEPATH FIELDS =================
// ✅ Set imagePath to null for all products that don't have it
router.post("/fix-missing-imagepaths", fixMissingImagePaths);

// ================= CLEANUP ORPHANED MEILISEARCH PRODUCTS =================
// ✅ Remove products from Meilisearch that were hard-deleted from DB
router.post("/cleanup-meilisearch-orphans", cleanupMeilisearchOrphans);

// ================= OPTIMIZED SERVER-SIDE SEARCH (For 200k+ Products) =================
// ✅ With caching, pagination, analytics, and rate limiting
router.get("/search", searchLimiter, searchProducts);

// ================= GET MEILISEARCH TASK STATUS (For Frontend Polling) =================
// ✅ Frontend polls this endpoint to check if task is completed
// Usage: GET /api/v1/products/meilisearch-task-status/12345
router.get("/meilisearch-task-status/:taskUid", async (req, res) => {
  try {
    const { taskUid } = req.params;
    const taskId = parseInt(taskUid, 10);
    
    if (isNaN(taskId)) {
      return res.status(400).json({ 
        message: "Invalid taskUid - must be a number",
        taskUid
      });
    }
    
    const task = await getTaskStatus(taskId);
    
    res.json({
      success: true,
      task: {
        uid: task.uid,
        status: task.status,  // 'enqueued', 'processing', 'succeeded', 'failed'
        type: task.type,      // 'documentAdditionOrUpdate'
        indexUid: task.indexUid,
        createdAt: task.enqueuedAt,
        startedAt: task.startedAt,
        finishedAt: task.finishedAt,
        duration: task.duration,
        error: task.error
      }
    });
  } catch (err) {
    console.error("❌ Error getting task status:", err.message);
    res.status(500).json({
      success: false,
      message: "Failed to get task status",
      error: err.message
    });
  }
});

// ================= ANALYTICS ENDPOINTS (Admin Only) =================
// ✅ Get search analytics summary
router.get("/analytics/summary", async (req, res) => {
  try {
    const summary = getAnalyticsSummary();
    res.json({
      status: "success",
      data: summary,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error("❌ Error getting analytics summary:", err);
    res.status(500).json({ message: "Error retrieving analytics", error: err.message });
  }
});

// ✅ Reset analytics (for testing/troubleshooting)
router.post("/analytics/reset", async (req, res) => {
  try {
    resetAnalytics();
    res.json({ message: "✅ Analytics reset successfully" });
  } catch (err) {
    console.error("❌ Error resetting analytics:", err);
    res.status(500).json({ message: "Error resetting analytics", error: err.message });
  }
});

// ================= OPTIMIZATION ENDPOINTS (Developer/Admin Only) =================
// ✅ Get database query optimization report
router.get("/optimization/report", async (req, res) => {
  try {
    const report = getOptimizationReport();
    res.json({
      status: "success",
      data: report,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error("❌ Error getting optimization report:", err);
    res.status(500).json({ message: "Error retrieving optimization report", error: err.message });
  }
});

// ✅ Reset optimization metrics
router.post("/optimization/reset", async (req, res) => {
  try {
    resetMetrics();
    res.json({ message: "✅ Optimization metrics reset successfully" });
  } catch (err) {
    console.error("❌ Error resetting metrics:", err);
    res.status(500).json({ message: "Error resetting metrics", error: err.message });
  }
});

// ================= SYNC SINGLE PRODUCT TO MEILISEARCH =================
// ✅ Manually re-sync a specific product (useful for fixing stale search data)
router.post("/sync-product-meilisearch/:id", async (req, res) => {
  try {
    console.log(`🔄 Syncing product ${req.params.id} to Meilisearch...`);
    
    const { syncProductToMeilisearch } = await import("../services/ProductMeilisearchSync.js");
    const Product = await import("../../../Models/AddProduct.js");
    
    // Get product from database
    const product = await Product.default.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({
        message: "Product not found",
        success: false
      });
    }
    
    // Sync to Meilisearch
    const syncResult = await syncProductToMeilisearch(product);
    
    res.json({
      message: `✅ Product sync attempt completed`,
      success: syncResult.success,
      synced: syncResult.synced,
      productId: product._id,
      productName: product.name,
      productData: {
        _id: product._id,
        name: product.name,
        itemcode: product.itemcode,
        taxPercent: product.taxPercent,
        price: product.price,
        cost: product.cost,
        barcode: product.barcode
      },
      syncError: syncResult.error || null,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error("❌ Error syncing product:", err);
    res.status(500).json({
      message: "Error syncing product to Meilisearch",
      error: err.message,
      success: false
    });
  }
});

// ================= CACHE MANAGEMENT ENDPOINTS (Admin Only) =================
// ⚠️ Note: Redis caching has been replaced with Meilisearch
router.post("/cache/flush", async (req, res) => {
  try {
    // Meilisearch handles its own caching - no manual flush needed
    res.json({
      message: "✅ Cache management info: Using Meilisearch (no Redis cache to flush)",
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error("❌ Error in cache endpoint:", err);
    res.status(500).json({ message: "Error in cache endpoint", error: err.message });
  }
});

// ✅ DIAGNOSTIC: Verify CurrentStock entries exist for all products
router.get("/diagnostic/verify-current-stock", async (req, res) => {
  try {
    const AddProduct = (await import("../../../Models/AddProduct.js")).default;
    const CurrentStock = (await import("../../../Models/CurrentStock.js")).default;
    
    /// Get all active products
    const allProducts = await AddProduct.find({ isDeleted: false }).select('_id name itemcode barcode').lean();
    const totalProducts = allProducts.length;
    
    // Get all CurrentStock entries
    const allStocks = await CurrentStock.find().select('productId').lean();
    const totalStocks = allStocks.length;
    const stockProductIds = new Set(allStocks.map(s => s.productId.toString()));
    
    // Find orphaned products (no CurrentStock)
    const orphanedProducts = [];
    for (const product of allProducts) {
      if (!stockProductIds.has(product._id.toString())) {
        orphanedProducts.push({
          _id: product._id,
          name: product.name,
          itemcode: product.itemcode,
          barcode: product.barcode
        });
      }
    }
    
    // Find orphaned stocks (no Product)
    const productIds = new Set(allProducts.map(p => p._id.toString()));
    const orphanedStocks = [];
    for (const stock of allStocks) {
      if (!productIds.has(stock.productId.toString())) {
        orphanedStocks.push(stock.productId);
      }
    }
    
    const status = orphanedProducts.length === 0 && orphanedStocks.length === 0 
      ? "✅ OK" 
      : "❌ ISSUES FOUND";
    
    res.json({
      status,
      timestamp: new Date().toISOString(),
      summary: {
        totalProducts,
        totalCurrentStockEntries: totalStocks,
        orphanedProductsCount: orphanedProducts.length,
        orphanedStocksCount: orphanedStocks.length,
      },
      orphanedProducts: orphanedProducts.slice(0, 50), // First 50
      orphanedStocks: orphanedStocks.slice(0, 50), // First 50
      notes: orphanedProducts.length > 50 
        ? `... and ${orphanedProducts.length - 50} more products without CurrentStock`
        : orphanedStocks.length > 50
        ? `... and ${orphanedStocks.length - 50} more CurrentStock entries without products`
        : "No issues found"
    });
  } catch (err) {
    console.error("❌ Error in diagnostic endpoint:", err);
    res.status(500).json({ 
      message: "Error in diagnostic endpoint", 
      error: err.message,
      status: "❌ FAILED"
    });
  }
});

// ✅ REPAIR: Create missing CurrentStock entries for orphaned products
router.post("/diagnostic/repair-current-stock", async (req, res) => {
  try {
    const AddProduct = (await import("../../../Models/AddProduct.js")).default;
    const CurrentStock = (await import("../../../Models/CurrentStock.js")).default;
    
    // Get all active products
    const allProducts = await AddProduct.find({ isDeleted: false }).select('_id name itemcode barcode').lean();
    
    // Get all CurrentStock entries
    const allStocks = await CurrentStock.find().select('productId').lean();
    const stockProductIds = new Set(allStocks.map(s => s.productId.toString()));
    
    // Find orphaned products (no CurrentStock)
    const orphanedProducts = [];
    for (const product of allProducts) {
      if (!stockProductIds.has(product._id.toString())) {
        orphanedProducts.push(product);
      }
    }
    
    // Create missing CurrentStock entries
    const created = [];
    const errors = [];
    
    for (const product of orphanedProducts) {
      try {
        const newStock = new CurrentStock({
          productId: product._id,
          totalQuantity: 0,
          availableQuantity: 0,
          allocatedQuantity: 0,
          grnReceivedQuantity: 0,
          rtvReturnedQuantity: 0,
          salesOutQuantity: 0,
          salesReturnQuantity: 0,
          adjustmentQuantity: 0,
          damageQuality: 0,
          isActive: true,
        });
        
        await newStock.save();
        created.push({
          productId: product._id,
          name: product.name,
          itemcode: product.itemcode
        });
      } catch (err) {
        errors.push({
          productId: product._id,
          name: product.name,
          error: err.message
        });
      }
    }
    
    res.json({
      status: errors.length === 0 ? "✅ SUCCESS" : "⚠️  PARTIAL",
      timestamp: new Date().toISOString(),
      created: created.length,
      createdProducts: created,
      failed: errors.length,
      errors: errors,
      message: `Created ${created.length} missing CurrentStock entries${errors.length > 0 ? `, ${errors.length} failed` : ""}`
    });
  } catch (err) {
    console.error("❌ Error in repair endpoint:", err);
    res.status(500).json({ 
      message: "Error in repair endpoint", 
      error: err.message,
      status: "❌ FAILED"
    });
  }
});

export default router;
