import express from 'express';
import {
  getHSNList,
  getHSNByCode,
  getHSNByCategory,
  searchHSN,
  getHSNStats,
  getHSNCategories,
  createHSN,
  updateHSN,
  repealHSN,
  validateHSN,
  getHSNWithProductCount,
  getHSNDropdown
} from '../controllers/hsnController.js';

const router = express.Router();

/**
 * HSN Master Routes
 * Base: /api/hsn
 */

// ✅ List & Search
router.get('/list', getHSNList);                    // GET /api/hsn/list?category=Foodstuffs&gstRate=5&limit=50&page=1
router.get('/search', searchHSN);                   // GET /api/hsn/search?query=coffee
router.get('/dropdown', getHSNDropdown);            // GET /api/hsn/dropdown - for form selects
router.get('/stats', getHSNStats);                  // GET /api/hsn/stats
router.get('/categories', getHSNCategories);        // GET /api/hsn/categories
router.get('/with-products', getHSNWithProductCount); // GET /api/hsn/with-products

// ✅ Lookup by Code/Category
router.get('/code/:code', getHSNByCode);            // GET /api/hsn/code/090111
router.get('/category/:category', getHSNByCategory); // GET /api/hsn/category/Foodstuffs
router.get('/validate/:code', validateHSN);         // GET /api/hsn/validate/090111

// ✅ CRUD Operations
router.post('/create', createHSN);                  // POST /api/hsn/create
router.put('/update/:code', updateHSN);             // PUT /api/hsn/update/090111
router.post('/repeal/:code', repealHSN);            // POST /api/hsn/repeal/090111 (soft delete)

export default router;
