import InventoryBatch from '../../../Models/InventoryBatch.js';
import StockBatch from '../../../Models/StockBatch.js';
import StockMovement from '../../../Models/StockMovement.js';
import CostingMethod from '../../../Models/CostingMethod.js';
import AddProduct from '../../../Models/AddProduct.js';
import CostingService from '../../../services/CostingService.js';

// ==================== Inventory Batch Operations ====================

export const getAllBatches = async (req, res) => {
  try {
    const { productId, limit = 50, skip = 0 } = req.query;

    const query = productId ? { productId } : {};
    const batches = await InventoryBatch.find(query)
      .populate('productId', 'name sku')
      .populate('vendorId', 'name email')
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .sort({ purchaseDate: -1 });

    const total = await InventoryBatch.countDocuments(query);

    res.json({
      success: true,
      total,
      count: batches.length,
      data: batches,
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: error.message });
  }
};

export const createBatch = async (req, res) => {
  try {
    const {
      productId,
      batchNumber,
      purchasePrice,
      quantity,
      purchaseDate,
      vendorId,
      expiryDate,
      lotNumber,
      invoiceNumber,
    } = req.body;

    // Validate product exists
    const product = await AddProduct.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    // Check if batch already exists
    const existingBatch = await InventoryBatch.findOne({
      productId,
      batchNumber,
      purchaseDate: new Date(purchaseDate),
    });

    if (existingBatch) {
      return res.status(400).json({
        success: false,
        message: 'Batch with this number and date already exists',
      });
    }

    const batch = new InventoryBatch({
      productId,
      batchNumber,
      purchasePrice,
      quantity,
      quantityRemaining: quantity,
      purchaseDate: new Date(purchaseDate),
      vendorId,
      expiryDate: expiryDate ? new Date(expiryDate) : null,
      lotNumber,
      invoiceNumber,
      batchStatus: 'ACTIVE',
    });

    await batch.save();
    await batch.populate('productId', 'name sku');
    await batch.populate('vendorId', 'name');

    res.status(201).json({
      success: true,
      message: 'Batch created successfully',
      data: batch,
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: error.message });
  }
};

export const getBatchById = async (req, res) => {
  try {
    const batch = await InventoryBatch.findById(req.params.id)
      .populate('productId', 'name sku')
      .populate('vendorId', 'name email')
      .populate('costMovements');

    if (!batch) {
      return res.status(404).json({
        success: false,
        message: 'Batch not found',
      });
    }

    res.json({ success: true, data: batch });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: error.message });
  }
};

export const updateBatch = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Don't allow changing productId or batchNumber
    delete updates.productId;
    delete updates.batchNumber;

    const batch = await InventoryBatch.findByIdAndUpdate(
      id,
      updates,
      { returnDocument: 'after', runValidators: true }
    )
      .populate('productId', 'name sku')
      .populate('vendorId', 'name');

    if (!batch) {
      return res
        .status(404)
        .json({ success: false, message: 'Batch not found' });
    }

    res.json({
      success: true,
      message: 'Batch updated successfully',
      data: batch,
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: error.message });
  }
};

export const deleteBatch = async (req, res) => {
  try {
    const batch = await InventoryBatch.findByIdAndDelete(req.params.id);

    if (!batch) {
      return res
        .status(404)
        .json({ success: false, message: 'Batch not found' });
    }

    // Delete associated stock movements
    await StockMovement.deleteMany({ batchId: batch._id });

    res.json({
      success: true,
      message: 'Batch deleted successfully',
      data: batch,
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: error.message });
  }
};

// ==================== Costing Calculations ====================

export const calculateCost = async (req, res) => {
  try {
    const {
      productId,
      quantityNeeded,
      method = 'FIFO',
    } = req.body;

    if (!productId || !quantityNeeded) {
      return res.status(400).json({
        success: false,
        message: 'productId and quantityNeeded are required',
      });
    }

    // Get product to check expiry tracking status
    const product = await AddProduct.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    const trackExpiryEnabled = product.trackExpiry || false;

    // Get batches from appropriate model based on expiry tracking
    let batches;
    if (trackExpiryEnabled) {
      // Use StockBatch model for expiry-tracked products
      batches = await StockBatch.find({
        productId,
        isActive: true,
        quantityRemaining: { $gt: 0 },
      }).sort({ expiryDate: 1 });
    } else {
      // Use InventoryBatch model for regular products
      batches = await InventoryBatch.find({
        productId,
        batchStatus: 'ACTIVE',
        quantityRemaining: { $gt: 0 },
      }).sort({ purchaseDate: 1 });
    }

    if (batches.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No active batches found for this product',
      });
    }

    // Validate stock availability
    const validation = CostingService.validateAvailableStock(
      batches,
      quantityNeeded
    );

    if (!validation.isAvailable) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient stock available',
        validation,
      });
    }

    // Calculate cost based on method
    let result;

    switch (method.toUpperCase()) {
      case 'FIFO':
        result = CostingService.calculateFIFO(batches, quantityNeeded, trackExpiryEnabled);
        break;
      case 'LIFO':
        result = CostingService.calculateLIFO(batches, quantityNeeded, trackExpiryEnabled);
        break;
      case 'WAC':
        result = CostingService.calculateWAC(batches, quantityNeeded, trackExpiryEnabled);
        break;
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid costing method. Use FIFO, LIFO, or WAC',
        });
    }

    res.json({
      success: true,
      data: CostingService.formatResult(result),
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: error.message });
  }
};

export const compareMethods = async (req, res) => {
  try {
    const { productId, quantityNeeded } = req.body;

    if (!productId || !quantityNeeded) {
      return res.status(400).json({
        success: false,
        message: 'productId and quantityNeeded are required',
      });
    }

    // Get product to check batch tracking status
    const product = await AddProduct.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    const batchTrackingEnabled = product.batchTrackingEnabled || false;

    // Get batches from appropriate model based on batch tracking
    let batches;
    if (batchTrackingEnabled) {
      // Use StockBatch model for expiry-tracked products
      batches = await StockBatch.find({
        productId,
        isActive: true,
        quantityRemaining: { $gt: 0 },
      }).sort({ expiryDate: 1 });
    } else {
      // Use InventoryBatch model for regular products
      batches = await InventoryBatch.find({
        productId,
        batchStatus: 'ACTIVE',
        quantityRemaining: { $gt: 0 },
      }).sort({ purchaseDate: 1 });
    }

    if (batches.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No active batches found',
      });
    }

    const comparison = CostingService.compareCostingMethods(
      batches,
      quantityNeeded,
      batchTrackingEnabled
    );

    // Add formatted versions
    comparison.fifo = CostingService.formatResult(comparison.fifo);
    comparison.lifo = CostingService.formatResult(comparison.lifo);
    comparison.wac = CostingService.formatResult(comparison.wac);

    // Calculate cost difference
    const costs = [
      comparison.fifo.totalCost,
      comparison.lifo.totalCost,
      comparison.wac.totalCost,
    ];

    comparison.comparison = {
      highestCost: Math.max(...costs),
      lowestCost: Math.min(...costs),
      difference: Math.max(...costs) - Math.min(...costs),
    };

    res.json({
      success: true,
      data: comparison,
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: error.message });
  }
};

// ==================== Costing Method Configuration ====================

export const getCostingMethod = async (req, res) => {
  try {
    const { companyId } = req.params;

    const method = await CostingMethod.findOne({ companyId });

    if (!method) {
      return res.status(404).json({
        success: false,
        message: 'Costing method configuration not found',
      });
    }

    res.json({ success: true, data: method });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: error.message });
  }
};

export const updateCostingMethod = async (req, res) => {
  try {
    const { companyId } = req.params;
    const updates = req.body;

    let method = await CostingMethod.findOne({ companyId });

    if (!method) {
      method = new CostingMethod({
        companyId,
        ...updates,
      });
    } else {
      Object.assign(method, updates);
    }

    await method.save();

    res.json({
      success: true,
      message: 'Costing method updated successfully',
      data: method,
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: error.message });
  }
};

// ==================== Inventory Analysis ====================

export const getABCAnalysis = async (req, res) => {
  try {
    const { productId } = req.query;

    const query = productId ? { productId } : {};
    const batches = await InventoryBatch.find(query);

    if (batches.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No batches found',
      });
    }

    const analysis = CostingService.calculateABCAnalysis(batches);

    res.json({
      success: true,
      data: analysis,
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: error.message });
  }
};

export const getInventoryValuation = async (req, res) => {
  try {
    const { productId, costingMethod = 'FIFO' } = req.query;

    const query = productId ? { productId } : {};
    const batches = await InventoryBatch.find(query)
      .populate('productId', 'name sku');

    if (batches.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No batches found',
      });
    }

    // Group by product
    const byProduct = {};

    for (const batch of batches) {
      const pId = batch.productId._id;
      if (!byProduct[pId]) {
        byProduct[pId] = {
          product: batch.productId,
          totalQuantity: 0,
          totalValue: 0,
          batches: [],
        };
      }

      byProduct[pId].totalQuantity += batch.quantityRemaining;
      byProduct[pId].totalValue +=
        batch.purchasePrice * batch.quantityRemaining;
      byProduct[pId].batches.push(batch);
    }

    // Calculate valuations
    const valuations = Object.values(byProduct).map((item) => ({
      productId: item.product._id,
      productName: item.product.name,
      productSKU: item.product.sku,
      totalQuantity: item.totalQuantity,
      totalValue: item.totalValue,
      averageCost: item.totalQuantity > 0
        ? (item.totalValue / item.totalQuantity).toFixed(2)
        : 0,
    }));

    res.json({
      success: true,
      totalInventoryValue: valuations.reduce((sum, v) => sum + v.totalValue, 0),
      totalQuantity: valuations.reduce((sum, v) => sum + v.totalQuantity, 0),
      costingMethod,
      data: valuations,
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: error.message });
  }
};
