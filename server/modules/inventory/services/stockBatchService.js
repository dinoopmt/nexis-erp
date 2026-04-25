import StockBatch from '../../../Models/StockBatch.js';
import Product from '../../../Models/AddProduct.js';

class StockBatchService {
  // Create a new stock batch
  async createBatch(batchData) {
    try {
      const batch = new StockBatch(batchData);
      const savedBatch = await batch.save();
      await this.updateProductExpiryStatus(batchData.productId);
      return savedBatch;
    } catch (error) {
      throw new Error(`Error creating batch: ${error.message}`);
    }
  }

  // Get batches for a product
  async getBatchesByProduct(productId) {
    try {
      return await StockBatch.find({ productId, isActive: true })
        .sort({ expiryDate: 1 });
    } catch (error) {
      throw new Error(`Error fetching batches: ${error.message}`);
    }
  }

  // Get expiring batches (expiring within X days)
  async getExpiringBatches(days = 30) {
    try {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + days);

      return await StockBatch.find({
        expiryDate: { $lte: futureDate, $gt: new Date() },
        batchStatus: { $in: ['ACTIVE', 'EXPIRING_SOON'] },
        isActive: true,
      })
        .populate('productId', 'name itemcode')
        .sort({ expiryDate: 1 });
    } catch (error) {
      throw new Error(`Error fetching expiring batches: ${error.message}`);
    }
  }

  // Get expired batches
  async getExpiredBatches() {
    try {
      return await StockBatch.find({
        expiryDate: { $lt: new Date() },
        batchStatus: 'EXPIRED',
        isActive: true,
      })
        .populate('productId', 'name itemcode')
        .sort({ expiryDate: 1 });
    } catch (error) {
      throw new Error(`Error fetching expired batches: ${error.message}`);
    }
  }

  // Use quantity from batch
  async consumeBatchQuantity(batchId, quantityToUse) {
    try {
      const batch = await StockBatch.findById(batchId);
      if (!batch) throw new Error('Batch not found');

      const available = batch.quantity - batch.usedQuantity;
      if (quantityToUse > available) {
        throw new Error(`Insufficient quantity. Available: ${available}, Requested: ${quantityToUse}`);
      }

      batch.usedQuantity += quantityToUse;
      
      if (batch.availableQuantity === 0) {
        batch.batchStatus = 'CLOSED';
      }

      const updated = await batch.save();
      await this.updateProductExpiryStatus(batch.productId);
      return updated;
    } catch (error) {
      throw new Error(`Error consuming batch quantity: ${error.message}`);
    }
  }

  // Update batch
  async updateBatch(batchId, updateData) {
    try {
      const batch = await StockBatch.findByIdAndUpdate(
        batchId,
        updateData,
        { returnDocument: 'after', runValidators: true }
      );
      if (batch) await this.updateProductExpiryStatus(batch.productId);
      return batch;
    } catch (error) {
      throw new Error(`Error updating batch: ${error.message}`);
    }
  }

  // Delete batch
  async deleteBatch(batchId) {
    try {
      const batch = await StockBatch.findByIdAndDelete(batchId);
      if (batch) await this.updateProductExpiryStatus(batch.productId);
      return batch;
    } catch (error) {
      throw new Error(`Error deleting batch: ${error.message}`);
    }
  }

  // Get batch expiry statistics for a product
  async getBatchStats(productId) {
    try {
      const batches = await StockBatch.find({ productId, isActive: true });

      const today = new Date();
      const stats = {
        totalBatches: batches.length,
        activeBatches: 0,
        expiringBatches: 0,
        expiredBatches: 0,
        closedBatches: 0,
        totalStock: 0,
        totalAvailable: 0,
        nearestExpiryDate: null,
        totalBatchCost: 0,
      };

      batches.forEach((batch) => {
        stats.totalStock += batch.quantity;
        stats.totalAvailable += batch.availableQuantity;
        stats.totalBatchCost += batch.totalBatchCost;

        if (batch.batchStatus === 'ACTIVE') stats.activeBatches++;
        else if (batch.batchStatus === 'EXPIRING_SOON') stats.expiringBatches++;
        else if (batch.batchStatus === 'EXPIRED') stats.expiredBatches++;
        else if (batch.batchStatus === 'CLOSED') stats.closedBatches++;

        if (!stats.nearestExpiryDate || batch.expiryDate < stats.nearestExpiryDate) {
          stats.nearestExpiryDate = batch.expiryDate;
        }
      });

      return stats;
    } catch (error) {
      throw new Error(`Error getting batch stats: ${error.message}`);
    }
  }

  // Update product expiry status based on its batches
  async updateProductExpiryStatus(productId) {
    try {
      const batches = await StockBatch.find({ productId, isActive: true });

      if (batches.length === 0) return;

      // Calculate product-level expiry info
      const activeBatches = batches.filter((b) => b.batchStatus === 'ACTIVE');
      if (activeBatches.length > 0) {
        const nearestExpiry = activeBatches.reduce((min, b) =>
          b.expiryDate < min.expiryDate ? b : min
        );

        await Product.findByIdAndUpdate(productId, {
          expiryDate: nearestExpiry.expiryDate,
          manufacturingDate: nearestExpiry.manufacturingDate,
        });
      }
    } catch (error) {
      console.error(`Error updating product expiry status: ${error.message}`);
    }
  }

  // Get lowstock batches (low on quantity)
  async getLowStockBatches(threshold = 10) {
    try {
      return await StockBatch.find({
        availableQuantity: { $lte: threshold, $gt: 0 },
        batchStatus: { $in: ['ACTIVE', 'EXPIRING_SOON'] },
        isActive: true,
      })
        .populate('productId', 'name itemcode')
        .sort({ availableQuantity: 1 });
    } catch (error) {
      throw new Error(`Error fetching low stock batches: ${error.message}`);
    }
  }

  // FIFO (First In First Out) - Get oldest batch by manufacturing date
  async getFIFOBatch(productId) {
    try {
      return await StockBatch.findOne({
        productId,
        batchStatus: 'ACTIVE',
        isActive: true,
        availableQuantity: { $gt: 0 },
      })
        .sort({ manufacturingDate: 1 });
    } catch (error) {
      throw new Error(`Error getting FIFO batch: ${error.message}`);
    }
  }

  // Get batch by batch number
  async getBatchByNumber(productId, batchNumber) {
    try {
      return await StockBatch.findOne({
        productId,
        batchNumber: batchNumber.toUpperCase(),
        isActive: true,
      });
    } catch (error) {
      throw new Error(`Error fetching batch: ${error.message}`);
    }
  }
}

export default new StockBatchService();
