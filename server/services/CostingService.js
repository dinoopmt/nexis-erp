/**
 * CostingService - Inventory Costing Methods with Expiry Tracking Support
 * Implements FIFO, LIFO, and WAC (Weighted Average Cost) methods
 * Now supports batch-wise expiry tracking for perishable goods
 */

class CostingService {
  /**
   * FIFO (First In, First Out)
   * Assumes first items purchased are first items sold
   * Best for: Perishable goods, inflation periods
   * WITH EXPIRY TRACKING: Sorts by expiryDate first (oldest expiry first for perishables)
   * WITHOUT EXPIRY TRACKING: Sorts by purchaseDate (oldest first)
   */
  static calculateFIFO(batches, quantityNeeded, batchTrackingEnabled = false) {
    // Filter out expired batches
    const validBatches = batches.filter(batch => {
      // Skip expired batches
      if (batch.expiryDate) {
        const expiryDate = new Date(batch.expiryDate);
        if (expiryDate < new Date()) {
          return false;
        }
      }
      return batch.quantityRemaining > 0;
    });

    // Sort batches based on whether expiry tracking is enabled
    let sortedBatches;
    if (batchTrackingEnabled && validBatches.some(b => b.expiryDate)) {
      // For expiry-tracked products: sort by expiry date (oldest expiry first)
      // This is TRUE FIFO for perishables
      sortedBatches = [...validBatches].sort((a, b) => {
        const dateA = a.expiryDate ? new Date(a.expiryDate) : new Date('2099-12-31');
        const dateB = b.expiryDate ? new Date(b.expiryDate) : new Date('2099-12-31');
        return dateA - dateB;
      });
    } else {
      // For non-tracked products: sort by purchase date (oldest first)
      sortedBatches = [...validBatches].sort(
        (a, b) => new Date(a.purchaseDate || 0) - new Date(b.purchaseDate || 0)
      );
    }

    const result = {
      method: 'FIFO',
      quantityNeeded,
      batches: [],
      totalCost: 0,
      averageCost: 0,
      quantityIssued: 0,
      batchTrackingApplied: batchTrackingEnabled,
      sortedByExpiryDate: batchTrackingEnabled && validBatches.some(b => b.expiryDate),
      expiredBatchesExcluded: batches.length - validBatches.length,
    };

    let remainingQuantity = quantityNeeded;

    for (const batch of sortedBatches) {
      if (remainingQuantity <= 0) break;

      const availableQuantity = Math.min(
        batch.quantityRemaining,
        remainingQuantity
      );

      if (availableQuantity > 0) {
        const batchCost = availableQuantity * batch.costPerUnit;

        result.batches.push({
          batchId: batch._id,
          batchNumber: batch.batchNumber,
          purchaseDate: batch.purchaseDate,
          expiryDate: batch.expiryDate, // Include expiry date in result
          mfgDate: batch.manufacturingDate, // Include manufacturing date
          unitCost: batch.costPerUnit,
          quantity: availableQuantity,
          totalCost: batchCost,
          daysToExpiry: batch.daysToExpiry || null,
        });

        result.totalCost += batchCost;
        result.quantityIssued += availableQuantity;
        remainingQuantity -= availableQuantity;
      }
    }

    if (result.quantityIssued > 0) {
      result.averageCost =
        result.totalCost / result.quantityIssued;
    }

    result.shortfall =
      remainingQuantity > 0 ? remainingQuantity : 0;

    return result;
  }

  /**
   * LIFO (Last In, First Out)
   * Assumes last items purchased are first items sold
   * Best for: Non-perishable goods, deflation periods
   * WITH EXPIRY TRACKING: Still uses newest first, but skips expired batches
   */
  static calculateLIFO(batches, quantityNeeded, batchTrackingEnabled = false) {
    // Filter out expired batches
    const validBatches = batches.filter(batch => {
      // Skip expired batches if expiry tracking is enabled
      if (batchTrackingEnabled && batch.expiryDate) {
        const expiryDate = new Date(batch.expiryDate);
        if (expiryDate < new Date()) {
          return false;
        }
      }
      return batch.quantityRemaining > 0;
    });

    // Sort batches by purchase date (newest first) for LIFO cost calculation
    const sortedBatches = [...validBatches].sort(
      (a, b) => new Date(b.purchaseDate || 0) - new Date(a.purchaseDate || 0)
    );

    const result = {
      method: 'LIFO',
      quantityNeeded,
      batches: [],
      totalCost: 0,
      averageCost: 0,
      quantityIssued: 0,
      batchTrackingApplied: batchTrackingEnabled,
      expiredBatchesExcluded: batches.length - validBatches.length,
    };

    let remainingQuantity = quantityNeeded;

    for (const batch of sortedBatches) {
      if (remainingQuantity <= 0) break;

      const availableQuantity = Math.min(
        batch.quantityRemaining,
        remainingQuantity
      );

      if (availableQuantity > 0) {
        const batchCost = availableQuantity * batch.costPerUnit;

        result.batches.push({
          batchId: batch._id,
          batchNumber: batch.batchNumber,
          purchaseDate: batch.purchaseDate,
          expiryDate: batch.expiryDate, // Include expiry date in result
          mfgDate: batch.manufacturingDate, // Include manufacturing date
          unitCost: batch.costPerUnit,
          quantity: availableQuantity,
          totalCost: batchCost,
          daysToExpiry: batch.daysToExpiry || null,
        });

        result.totalCost += batchCost;
        result.quantityIssued += availableQuantity;
        remainingQuantity -= availableQuantity;
      }
    }

    if (result.quantityIssued > 0) {
      result.averageCost =
        result.totalCost / result.quantityIssued;
    }

    result.shortfall =
      remainingQuantity > 0 ? remainingQuantity : 0;

    return result;
  }

  /**
   * WAC (Weighted Average Cost)
   * Uses average cost of all available units
   * Method: Total Cost / Total Quantity Available
   * Best for: Standard costing, production environments
   * WITH EXPIRY TRACKING: Excludes expired batches from WAC calculation
   */
  static calculateWAC(batches, quantityNeeded, batchTrackingEnabled = false) {
    // Filter out expired batches
    const validBatches = batches.filter(batch => {
      // Skip expired batches if expiry tracking is enabled
      if (batchTrackingEnabled && batch.expiryDate) {
        const expiryDate = new Date(batch.expiryDate);
        if (expiryDate < new Date()) {
          return false;
        }
      }
      return batch.quantityRemaining > 0;
    });

    // Calculate total cost and total quantity across all valid batches
    let totalCostAllBatches = 0;
    let totalQuantityAvailable = 0;

    for (const batch of validBatches) {
      if (batch.quantityRemaining > 0) {
        totalCostAllBatches +=
          batch.costPerUnit * batch.quantityRemaining;
        totalQuantityAvailable += batch.quantityRemaining;
      }
    }

    // Calculate weighted average cost per unit
    const weightedAverageCost =
      totalQuantityAvailable > 0
        ? totalCostAllBatches / totalQuantityAvailable
        : 0;

    // Determine how much can be issued
    const quantityIssued = Math.min(
      totalQuantityAvailable,
      quantityNeeded
    );
    const totalCost = quantityIssued * weightedAverageCost;

    const result = {
      method: 'WAC',
      quantityNeeded,
      quantityIssued,
      totalCost,
      averageCost: weightedAverageCost,
      batches: [],
      shortfall: Math.max(0, quantityNeeded - quantityIssued),
      batchTrackingApplied: batchTrackingEnabled,
      expiredBatchesExcluded: batches.length - validBatches.length,
      allBatchesApplied: {
        totalCostAllBatches,
        totalQuantityAvailable,
      },
    };

    // Break down which batches contributed to the WAC
    if (quantityIssued > 0) {
      let remainingToAllocate = quantityIssued;

      for (const batch of validBatches) {
        if (remainingToAllocate <= 0) break;

        const availableQuantity = Math.min(
          batch.quantityRemaining,
          remainingToAllocate
        );

        if (availableQuantity > 0) {
          result.batches.push({
            batchId: batch._id,
            batchNumber: batch.batchNumber,
            purchaseDate: batch.purchaseDate,
            expiryDate: batch.expiryDate, // Include expiry date in result
            mfgDate: batch.manufacturingDate, // Include manufacturing date
            unitCost: batch.costPerUnit,
            quantity: availableQuantity,
            totalCost: availableQuantity * weightedAverageCost,
            daysToExpiry: batch.daysToExpiry || null,
            note: 'Using WAC, actual cost allocated is weighted average, not batch cost',
          });

          remainingToAllocate -= availableQuantity;
        }
      }
    }

    return result;
  }

  /**
   * Get cost comparison across all three methods
   * Useful for decision-making and analysis
   * Supports batch-wise expiry tracking
   */
  static compareCostingMethods(batches, quantityNeeded, batchTrackingEnabled = false) {
    return {
      fifo: this.calculateFIFO(batches, quantityNeeded, batchTrackingEnabled),
      lifo: this.calculateLIFO(batches, quantityNeeded, batchTrackingEnabled),
      wac: this.calculateWAC(batches, quantityNeeded, batchTrackingEnabled),
      batchTrackingEnabled,
      comparison: {
        highestCost: null,
        lowestCost: null,
        difference: 0,
      },
    };
  }

  /**
   * Validate sufficient stock available
   */
  static validateAvailableStock(batches, quantityNeeded) {
    const totalAvailable = batches.reduce(
      (sum, batch) => sum + (batch.quantityRemaining || 0),
      0
    );

    return {
      isAvailable: totalAvailable >= quantityNeeded,
      available: totalAvailable,
      needed: quantityNeeded,
      shortfall: Math.max(0, quantityNeeded - totalAvailable),
    };
  }

  /**
   * Get active batches (non-expired, non-closed)
   */
  static getActiveBatches(batches) {
    return batches.filter(
      (batch) =>
        batch.batchStatus === 'ACTIVE' &&
        (!batch.expiryDate || new Date(batch.expiryDate) > new Date()) &&
        batch.quantityRemaining > 0
    );
  }

  /**
   * Calculate ABC analysis for inventory classification
   * A items: 80% value, 20% quantity
   * B items: 15% value, 30% quantity
   * C items: 5% value, 50% quantity
   */
  static calculateABCAnalysis(batches) {
    // Sort by total cost descending
    const sorted = [...batches]
      .map((batch) => ({
        ...batch,
        totalValue: batch.purchasePrice * batch.quantityRemaining,
      }))
      .sort((a, b) => b.totalValue - a.totalValue);

    const totalValue = sorted.reduce(
      (sum, batch) => sum + batch.totalValue,
      0
    );

    let cumulativeValue = 0;
    const classified = sorted.map((batch) => {
      cumulativeValue += batch.totalValue;
      const percentage = (cumulativeValue / totalValue) * 100;

      let classification = 'C';
      if (percentage <= 80) classification = 'A';
      else if (percentage <= 95) classification = 'B';

      return {
        batchNumber: batch.batchNumber,
        quantityRemaining: batch.quantityRemaining,
        unitCost: batch.purchasePrice,
        totalValue: batch.totalValue,
        percentageOfTotal: (batch.totalValue / totalValue) * 100,
        cumulativePercentage: percentage,
        classification,
      };
    });

    return classified;
  }

  /**
   * Format costing result for display
   */
  static formatResult(result) {
    return {
      ...result,
      totalCostFormatted: `${result.totalCost.toFixed(2)}`,
      averageCostFormatted: `${result.averageCost.toFixed(2)}`,
      batches: result.batches.map((b) => ({
        ...b,
        totalCostFormatted: `${b.totalCost.toFixed(2)}`,
        unitCostFormatted: `${b.unitCost.toFixed(2)}`,
      })),
    };
  }
}

export default CostingService;
