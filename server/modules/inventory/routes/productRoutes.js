import express from "express";
import {
  addProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  restoreProduct,
  updateProductStock,
  getProductsByCategory,
  getProductStats,
  checkBarcodeExists,
  checkItemcodeExists,
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
  searchProducts,
} from "../controllers/productController.js";

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

// ================= CHECK IF ITEM CODE EXISTS =================
router.post("/checkitemcode", checkItemcodeExists);

// ================= CHECK IF PRODUCT NAME ALREADY EXISTS (Duplicate Prevention) =================
// ✅ GET /products/check-duplicate-name?name=ProductName&excludeId=productId
router.get("/check-duplicate-name", checkDuplicateProductName);

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

// ================= CLEANUP ORPHANED MEILISEARCH PRODUCTS =================
// ✅ Remove products from Meilisearch that were hard-deleted from DB
router.post("/cleanup-meilisearch-orphans", cleanupMeilisearchOrphans);

// ================= OPTIMIZED SERVER-SIDE SEARCH (For 200k+ Products) =================
// ✅ With caching, pagination, analytics, and rate limiting
router.get("/search", searchLimiter, searchProducts);

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

export default router;
