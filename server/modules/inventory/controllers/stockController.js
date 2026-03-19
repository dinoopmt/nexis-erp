import InventoryBatch from '../../../Models/InventoryBatch.js';
import StockMovement from '../../../Models/StockMovement.js';
import Product from '../../../Models/AddProduct.js';

// ================= GET CURRENT STOCK =================
export const getCurrentStock = async (req, res) => {
  try {
    const { productId } = req.params;

    // Find all active batches for this product
    const batches = await InventoryBatch.find({
      productId,
      batchStatus: 'ACTIVE'
    }).lean();

    // Calculate current stock
    const currentStock = batches.reduce(
      (sum, batch) => sum + (batch.quantityRemaining || 0),
      0
    );

    // Calculate stock value
    const stockValue = batches.reduce(
      (sum, batch) => sum + ((batch.quantityRemaining || 0) * (batch.purchasePrice || 0)),
      0
    );

    // Get product details
    const product = await Product.findById(productId).lean();

    res.json({
      success: true,
      productId,
      productName: product?.itemname,
      currentStock,
      stockValue,
      minStock: product?.minStock || 0,
      maxStock: product?.maxStock || 1000,
      status: getStockStatus(currentStock, product),
      batches: batches.map(b => ({
        batchNumber: b.batchNumber,
        quantityRemaining: b.quantityRemaining,
        purchasePrice: b.purchasePrice,
        value: (b.quantityRemaining || 0) * (b.purchasePrice || 0),
        purchaseDate: b.purchaseDate,
        expiryDate: b.expiryDate,
        batchStatus: b.batchStatus
      }))
    });
  } catch (err) {
    console.error('Error fetching current stock:', err);
    res.status(500).json({
      success: false,
      message: 'Error fetching current stock',
      error: err.message
    });
  }
};

// ================= STOCK IN (PURCHASE RECEIPT) =================
export const stockIn = async (req, res) => {
  try {
    const {
      productId,
      quantity,
      purchasePrice,
      vendorId,
      batchNumber,
      purchaseOrderNo,
      expiryDate
    } = req.body;

    // Validation
    if (!productId || !quantity || !purchasePrice) {
      return res.status(400).json({
        success: false,
        message: 'Product ID, quantity, and purchase price are required'
      });
    }

    // Create new batch
    const batch = new InventoryBatch({
      productId,
      batchNumber: batchNumber || `BATCH-${Date.now()}`,
      purchasePrice,
      quantity,
      quantityRemaining: quantity,
      purchaseDate: new Date(),
      vendorId,
      expiryDate,
      batchStatus: 'ACTIVE'
    });
    await batch.save();

    // Record movement
    const movement = new StockMovement({
      productId,
      batchId: batch._id,
      movementType: 'INBOUND',
      quantity,
      unitCost: purchasePrice,
      totalAmount: quantity * purchasePrice,
      reference: purchaseOrderNo || `BATCH-${batch._id}`,
      referenceType: 'PURCHASE_ORDER',
      costingMethodUsed: 'FIFO',
      documentDate: new Date()
    });
    await movement.save();

    // Update product stock
    await Product.findByIdAndUpdate(
      productId,
      { $inc: { stock: quantity } }
    );

    res.json({
      success: true,
      message: 'Stock received successfully',
      batch,
      movement
    });
  } catch (err) {
    console.error('Error in stock in:', err);
    res.status(500).json({
      success: false,
      message: 'Error receiving stock',
      error: err.message
    });
  }
};

// ================= STOCK OUT (SALES/ISSUANCE) =================
export const stockOut = async (req, res) => {
  try {
    const {
      items,        // [{productId, quantity}, ...]
      saleInvoiceId,
      saleInvoiceNo
    } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Items array is required'
      });
    }

    const movements = [];

    // Process each item
    for (const item of items) {
      const { productId, quantity } = item;

      if (!productId || !quantity) {
        return res.status(400).json({
          success: false,
          message: 'Each item must have productId and quantity'
        });
      }

      // Find active batches for this product (FIFO - oldest first)
      const batches = await InventoryBatch.find({
        productId,
        batchStatus: 'ACTIVE',
        quantityRemaining: { $gt: 0 }
      }).sort({ purchaseDate: 1 });  // Oldest first

      if (batches.length === 0) {
        return res.status(400).json({
          success: false,
          message: `No stock available for product ${productId}`
        });
      }

      let remainingQty = quantity;

      // Issue from oldest batches first (FIFO)
      for (const batch of batches) {
        if (remainingQty <= 0) break;

        const qtyFromBatch = Math.min(batch.quantityRemaining, remainingQty);

        // Update batch
        batch.quantityRemaining -= qtyFromBatch;
        if (batch.quantityRemaining === 0) {
          batch.batchStatus = 'CLOSED';
        }
        await batch.save();

        // Record movement
        const movement = new StockMovement({
          productId,
          batchId: batch._id,
          movementType: 'OUTBOUND',
          quantity: qtyFromBatch,
          unitCost: batch.purchasePrice,
          totalAmount: qtyFromBatch * batch.purchasePrice,
          reference: saleInvoiceNo || `INV-${saleInvoiceId}`,
          referenceId: saleInvoiceId,
          referenceType: 'SALES_INVOICE',
          costingMethodUsed: 'FIFO',
          documentDate: new Date()
        });
        await movement.save();
        movements.push(movement);

        remainingQty -= qtyFromBatch;
      }

      if (remainingQty > 0) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for product ${productId}. Shortage: ${remainingQty} units`
        });
      }

      // Update product stock
      await Product.findByIdAndUpdate(
        productId,
        { $inc: { stock: -quantity } }
      );
    }

    res.json({
      success: true,
      message: 'Stock issued successfully',
      movements
    });
  } catch (err) {
    console.error('Error in stock out:', err);
    res.status(500).json({
      success: false,
      message: 'Error issuing stock',
      error: err.message
    });
  }
};

// ================= STOCK ADJUSTMENT =================
export const adjustStock = async (req, res) => {
  try {
    const {
      productId,
      quantity,        // Positive = add, Negative = reduce
      reason,          // 'DAMAGE' | 'LOSS' | 'EXPIRY' | 'COUNT_VARIANCE'
      notes,
      referenceNumber
    } = req.body;

    if (!productId || quantity === undefined || quantity === 0) {
      return res.status(400).json({
        success: false,
        message: 'Product ID and quantity are required, and quantity cannot be zero'
      });
    }

    if (quantity < 0) {
      // Reducing stock
      const batches = await InventoryBatch.find({
        productId,
        batchStatus: 'ACTIVE',
        quantityRemaining: { $gt: 0 }
      }).sort({ purchaseDate: -1 });  // Most recent first

      if (batches.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No active stock to adjust'
        });
      }

      const batch = batches[0];

      if (batch.quantityRemaining < Math.abs(quantity)) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock to adjust. Available: ${batch.quantityRemaining}`
        });
      }

      batch.quantityRemaining += quantity;  // quantity is negative
      if (batch.quantityRemaining === 0) {
        batch.batchStatus = 'CLOSED';
      }
      await batch.save();

      // Record adjustment
      const movement = new StockMovement({
        productId,
        batchId: batch._id,
        movementType: 'ADJUSTMENT',
        quantity: Math.abs(quantity),
        unitCost: batch.purchasePrice,
        totalAmount: Math.abs(quantity) * batch.purchasePrice,
        reference: referenceNumber || `ADJ-${Date.now()}`,
        referenceType: 'STOCK_ADJUSTMENT',
        reasonCode: reason,
        notes,
        documentDate: new Date()
      });
      await movement.save();

      // Update product
      await Product.findByIdAndUpdate(
        productId,
        { $inc: { stock: quantity } }  // Reduce
      );

      res.json({
        success: true,
        message: 'Stock reduced successfully',
        movement
      });
    } else {
      // Adding stock
      const adjustmentBatch = new InventoryBatch({
        productId,
        batchNumber: `ADJ-BATCH-${Date.now()}`,
        purchasePrice: 0,  // Adjustment has no cost
        quantity,
        quantityRemaining: quantity,
        purchaseDate: new Date(),
        batchStatus: 'ACTIVE'
      });
      await adjustmentBatch.save();

      const movement = new StockMovement({
        productId,
        batchId: adjustmentBatch._id,
        movementType: 'ADJUSTMENT',
        quantity,
        unitCost: 0,
        totalAmount: 0,
        reference: referenceNumber || `ADJ-${Date.now()}`,
        referenceType: 'STOCK_ADJUSTMENT',
        reasonCode: reason,
        notes,
        documentDate: new Date()
      });
      await movement.save();

      // Update product
      await Product.findByIdAndUpdate(
        productId,
        { $inc: { stock: quantity } }  // Add
      );

      res.json({
        success: true,
        message: 'Stock added successfully',
        movement
      });
    }
  } catch (err) {
    console.error('Error in stock adjustment:', err);
    res.status(500).json({
      success: false,
      message: 'Error adjusting stock',
      error: err.message
    });
  }
};

// ================= GET STOCK HISTORY =================
export const getStockHistory = async (req, res) => {
  try {
    const { productId } = req.params;
    const { startDate, endDate, movementType } = req.query;

    let query = { productId };

    if (startDate && endDate) {
      query.documentDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    if (movementType) {
      query.movementType = movementType;
    }

    const movements = await StockMovement.find(query)
      .populate('batchId', 'batchNumber')
      .sort({ documentDate: -1 });

    // Calculate running balance
    let runningBalance = 0;
    const withBalance = movements
      .reverse()
      .map(m => {
        if (m.movementType === 'INBOUND' || m.movementType === 'ADJUSTMENT') {
          runningBalance += m.quantity;
        } else if (m.movementType === 'OUTBOUND') {
          runningBalance -= m.quantity;
        }

        return {
          ...m.toObject(),
          balance: runningBalance
        };
      })
      .reverse();

    res.json({
      success: true,
      productId,
      movements: withBalance,
      count: withBalance.length
    });
  } catch (err) {
    console.error('Error fetching stock history:', err);
    res.status(500).json({
      success: false,
      message: 'Error fetching stock history',
      error: err.message
    });
  }
};

// ================= HELPER FUNCTION: Get Stock Status =================
function getStockStatus(currentStock, product) {
  if (!product) {
    return { status: 'UNKNOWN', color: 'gray', message: 'Product not found' };
  }

  const minStock = product.minStock || 0;
  const maxStock = product.maxStock || 1000;

  if (currentStock <= minStock) {
    return { status: 'CRITICAL', color: 'red', message: 'REORDER NOW' };
  }
  if (currentStock <= minStock * 1.5) {
    return { status: 'LOW', color: 'orange', message: 'Low stock' };
  }
  if (currentStock >= maxStock) {
    return { status: 'OVERSTOCKED', color: 'yellow', message: 'Reduce stock' };
  }
  return { status: 'HEALTHY', color: 'green', message: 'OK' };
}
