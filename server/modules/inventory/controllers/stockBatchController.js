import StockBatch from '../../../Models/StockBatch.js';
import AddProduct from '../../../Models/AddProduct.js';
import stockBatchService from '../services/stockBatchService.js';

/**
 * Stock Batch Controller
 * Handles batch-level inventory tracking with expiry management
 */

// Create new stock batch
export const createBatch = async (req, res) => {
  try {
    const {
      productId,
      batchNumber,
      manufacturingDate,
      expiryDate,
      quantity,
      costPerUnit,
      supplier,
      referenceNumber,
      notes,
    } = req.body;

    // Validate required fields
    if (!productId || !batchNumber || !quantity || !costPerUnit) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: productId, batchNumber, quantity, costPerUnit',
      });
    }

    // Check if product exists
    const product = await AddProduct.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    // Check if batch number already exists for this product
    const existingBatch = await StockBatch.findOne({
      productId,
      batchNumber,
      batchStatus: { $ne: 'CLOSED' },
    });
    if (existingBatch) {
      return res.status(400).json({
        success: false,
        message: 'Batch number already exists for this product',
      });
    }

    // Create batch object
    const batchData = {
      productId,
      batchNumber,
      manufacturingDate: manufacturingDate || new Date(),
      expiryDate,
      quantity,
      usedQuantity: 0,
      costPerUnit,
      supplier: supplier || '',
      referenceNumber: referenceNumber || '',
      notes: notes || '',
    };

    // Create batch using service
    const newBatch = await stockBatchService.createBatch(batchData);

    // Update product's batch-related fields if batch tracking enabled
    if (product.batchTrackingEnabled) {
      await stockBatchService.updateProductExpiryStatus(productId);
    }

    res.status(201).json({
      success: true,
      message: 'Stock batch created successfully',
      data: newBatch,
    });
  } catch (error) {
    console.error('Create batch error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating batch',
      error: error.message,
    });
  }
};

// Get batches by product
export const getBatchesByProduct = async (req, res) => {
  try {
    const { productId } = req.params;

    // Check if product exists
    const product = await AddProduct.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    const batches = await stockBatchService.getBatchesByProduct(productId);

    res.status(200).json({
      success: true,
      message: 'Batches retrieved successfully',
      data: batches,
      count: batches.length,
    });
  } catch (error) {
    console.error('Get batches error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving batches',
      error: error.message,
    });
  }
};

// Get expiring batches
export const getExpiringBatches = async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const numDays = parseInt(days) || 30;

    const expiringBatches = await stockBatchService.getExpiringBatches(numDays);

    res.status(200).json({
      success: true,
      message: `Batches expiring within ${numDays} days retrieved`,
      data: expiringBatches,
      count: expiringBatches.length,
    });
  } catch (error) {
    console.error('Get expiring batches error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving expiring batches',
      error: error.message,
    });
  }
};

// Get expired batches
export const getExpiredBatches = async (req, res) => {
  try {
    const expiredBatches = await stockBatchService.getExpiredBatches();

    res.status(200).json({
      success: true,
      message: 'Expired batches retrieved successfully',
      data: expiredBatches,
      count: expiredBatches.length,
    });
  } catch (error) {
    console.error('Get expired batches error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving expired batches',
      error: error.message,
    });
  }
};

// Consume batch quantity
export const consumeBatchQuantity = async (req, res) => {
  try {
    const { batchId } = req.params;
    const { quantityToUse } = req.body;

    if (!quantityToUse || quantityToUse <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid quantity required',
      });
    }

    const batch = await StockBatch.findById(batchId);
    if (!batch) {
      return res.status(404).json({
        success: false,
        message: 'Batch not found',
      });
    }

    const updatedBatch = await stockBatchService.consumeBatchQuantity(
      batchId,
      quantityToUse
    );

    res.status(200).json({
      success: true,
      message: 'Batch quantity consumed successfully',
      data: updatedBatch,
    });
  } catch (error) {
    console.error('Consume batch quantity error:', error);
    res.status(500).json({
      success: false,
      message: 'Error consuming batch quantity',
      error: error.message,
    });
  }
};

// Update batch
export const updateBatch = async (req, res) => {
  try {
    const { batchId } = req.params;
    const updateData = req.body;

    const batch = await StockBatch.findById(batchId);
    if (!batch) {
      return res.status(404).json({
        success: false,
        message: 'Batch not found',
      });
    }

    const updatedBatch = await stockBatchService.updateBatch(
      batchId,
      updateData
    );

    res.status(200).json({
      success: true,
      message: 'Batch updated successfully',
      data: updatedBatch,
    });
  } catch (error) {
    console.error('Update batch error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating batch',
      error: error.message,
    });
  }
};

// Delete batch
export const deleteBatch = async (req, res) => {
  try {
    const { batchId } = req.params;

    const batch = await StockBatch.findById(batchId);
    if (!batch) {
      return res.status(404).json({
        success: false,
        message: 'Batch not found',
      });
    }

    await stockBatchService.deleteBatch(batchId);

    res.status(200).json({
      success: true,
      message: 'Batch deleted successfully',
      data: { deletedId: batchId },
    });
  } catch (error) {
    console.error('Delete batch error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting batch',
      error: error.message,
    });
  }
};

// Get batch statistics
export const getBatchStats = async (req, res) => {
  try {
    const { productId } = req.params;

    // Check if product exists
    const product = await AddProduct.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    const stats = await stockBatchService.getBatchStats(productId);

    res.status(200).json({
      success: true,
      message: 'Batch statistics retrieved successfully',
      data: stats,
    });
  } catch (error) {
    console.error('Get batch stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving batch statistics',
      error: error.message,
    });
  }
};

// Get FIFO batch
export const getFIFOBatch = async (req, res) => {
  try {
    const { productId } = req.params;

    // Check if product exists
    const product = await AddProduct.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    const fifoBatch = await stockBatchService.getFIFOBatch(productId);

    if (!fifoBatch) {
      return res.status(404).json({
        success: false,
        message: 'No active batches found for this product',
      });
    }

    res.status(200).json({
      success: true,
      message: 'FIFO batch retrieved successfully',
      data: fifoBatch,
    });
  } catch (error) {
    console.error('Get FIFO batch error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving FIFO batch',
      error: error.message,
    });
  }
};

// Get low stock batches
export const getLowStockBatches = async (req, res) => {
  try {
    const { threshold = 10 } = req.query;
    const numThreshold = parseInt(threshold) || 10;

    const lowStockBatches = await stockBatchService.getLowStockBatches(
      numThreshold
    );

    res.status(200).json({
      success: true,
      message: `Batches with <= ${numThreshold} quantity retrieved`,
      data: lowStockBatches,
      count: lowStockBatches.length,
    });
  } catch (error) {
    console.error('Get low stock batches error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving low stock batches',
      error: error.message,
    });
  }
};

// Get batch by number
export const getBatchByNumber = async (req, res) => {
  try {
    const { productId, batchNumber } = req.params;

    // Check if product exists
    const product = await AddProduct.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    const batch = await stockBatchService.getBatchByNumber(
      productId,
      batchNumber
    );

    if (!batch) {
      return res.status(404).json({
        success: false,
        message: 'Batch not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Batch retrieved successfully',
      data: batch,
    });
  } catch (error) {
    console.error('Get batch by number error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving batch',
      error: error.message,
    });
  }
};
