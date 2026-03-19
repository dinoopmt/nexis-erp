import productPackingService from '../services/productPackingService.js';

/**
 * Create a new product packing option
 * POST /api/v1/product-packing/create
 */
export const createProductPacking = async (req, res) => {
  try {
    const packing = await productPackingService.createPacking(req.body);
    res.status(201).json({
      success: true,
      message: 'Product packing created successfully',
      data: packing,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Get all packings for a product
 * GET /api/v1/product-packing/product/:productId
 */
export const getProductPackings = async (req, res) => {
  try {
    const { productId } = req.params;
    const { isActive } = req.query;

    const filters = {};
    if (isActive !== undefined) {
      filters.isActive = isActive === 'true';
    }

    const packings = await productPackingService.getPackingsByProduct(productId, filters);

    res.status(200).json({
      success: true,
      message: `Retrieved ${packings.length} packings`,
      data: packings,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Get single packing by ID
 * GET /api/v1/product-packing/:id
 */
export const getProductPackingById = async (req, res) => {
  try {
    const { id } = req.params;
    const packing = await productPackingService.getPackingById(id);

    res.status(200).json({
      success: true,
      message: 'Product packing retrieved',
      data: packing,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Get default packing for product
 * GET /api/v1/product-packing/default/:productId
 */
export const getDefaultProductPacking = async (req, res) => {
  try {
    const { productId } = req.params;
    const packing = await productPackingService.getDefaultPacking(productId);

    if (!packing) {
      return res.status(404).json({
        success: false,
        message: 'No default packing found for this product',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Default packing retrieved',
      data: packing,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Update product packing
 * PUT /api/v1/product-packing/update/:id
 */
export const updateProductPacking = async (req, res) => {
  try {
    const { id } = req.params;
    const packing = await productPackingService.updatePacking(id, req.body);

    res.status(200).json({
      success: true,
      message: 'Product packing updated successfully',
      data: packing,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Delete product packing
 * DELETE /api/v1/product-packing/delete/:id
 */
export const deleteProductPacking = async (req, res) => {
  try {
    const { id } = req.params;
    const packing = await productPackingService.deletePacking(id);

    res.status(200).json({
      success: true,
      message: 'Product packing deleted successfully',
      data: packing,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Convert packing quantity
 * POST /api/v1/product-packing/convert
 * Body: { productId, fromPackingId, toPackingId, quantity }
 */
export const convertPackingQuantity = async (req, res) => {
  try {
    const { productId, fromPackingId, toPackingId, quantity } = req.body;

    if (!productId || !fromPackingId || !toPackingId || quantity === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: productId, fromPackingId, toPackingId, quantity',
      });
    }

    const result = await productPackingService.convertPackingQuantity(
      productId,
      fromPackingId,
      toPackingId,
      quantity
    );

    res.status(200).json({
      success: true,
      message: 'Packing conversion calculated',
      data: result,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Calculate packing cost
 * POST /api/v1/product-packing/calculate-cost
 * Body: { packingId, quantity }
 */
export const calculatePackingCost = async (req, res) => {
  try {
    const { packingId, quantity } = req.body;

    if (!packingId || quantity === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: packingId, quantity',
      });
    }

    const result = await productPackingService.calculatePackingCost(packingId, quantity);

    res.status(200).json({
      success: true,
      message: 'Packing cost calculated',
      data: result,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Get packing statistics
 * GET /api/v1/product-packing/stats/:productId
 */
export const getPackingStats = async (req, res) => {
  try {
    const { productId } = req.params;
    const stats = await productPackingService.getPackingStats(productId);

    res.status(200).json({
      success: true,
      message: 'Packing statistics retrieved',
      data: stats,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Create packings from template
 * POST /api/v1/product-packing/create-from-template
 * Body: { productId, template: [{name, symbol, factor, quantity, price}] }
 */
export const createFromTemplate = async (req, res) => {
  try {
    const { productId, template } = req.body;

    if (!productId || !template || !Array.isArray(template)) {
      return res.status(400).json({
        success: false,
        message: 'Missing or invalid fields: productId, template (array required)',
      });
    }

    const packings = await productPackingService.createPackingsFromTemplate(productId, template);

    res.status(201).json({
      success: true,
      message: `Created ${packings.length} packings from template`,
      data: packings,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Update packing stock
 * PUT /api/v1/product-packing/stock/:id
 * Body: { quantity }
 */
export const updatePackingStock = async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity } = req.body;

    if (quantity === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Quantity is required',
      });
    }

    const packing = await productPackingService.updatePackingStock(id, quantity);

    res.status(200).json({
      success: true,
      message: 'Packing stock updated successfully',
      data: packing,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Adjust packing stock (incr/decr)
 * POST /api/v1/product-packing/adjust-stock/:id
 * Body: { adjustment } (can be negative)
 */
export const adjustPackingStock = async (req, res) => {
  try {
    const { id } = req.params;
    const { adjustment } = req.body;

    if (adjustment === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Adjustment value is required',
      });
    }

    const packing = await productPackingService.adjustPackingStock(id, adjustment);

    res.status(200).json({
      success: true,
      message: `Packing stock adjusted by ${adjustment}`,
      data: packing,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Get low stock packings
 * GET /api/v1/product-packing/low-stock/:productId
 */
export const getLowStock = async (req, res) => {
  try {
    const { productId } = req.params;
    const packings = await productPackingService.getLowStockPackings(productId);

    res.status(200).json({
      success: true,
      message: `Found ${packings.length} low stock packings`,
      data: packings,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};
