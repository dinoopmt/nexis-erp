import Product from "../../../Models/AddProduct.js";
import InventoryBatch from "../../../Models/InventoryBatch.js";
import StockMovement from "../../../Models/StockMovement.js";

/**
 * Calculate theoretical stock from movements
 * @param {string} productId - Product ID
 * @returns {number} Theoretical stock quantity
 */
const calculateTheoreticalStock = async (productId) => {
  try {
    const movements = await StockMovement.find({ productId });

    let theoreticalStock = 0;
    movements.forEach((movement) => {
      if (
        movement.movementType === "INBOUND" ||
        (movement.movementType === "ADJUSTMENT" && movement.quantity > 0)
      ) {
        theoreticalStock += movement.quantity;
      } else if (
        movement.movementType === "OUTBOUND" ||
        (movement.movementType === "ADJUSTMENT" && movement.quantity < 0)
      ) {
        theoreticalStock += movement.quantity;
      }
    });

    return Math.max(0, theoreticalStock);
  } catch (error) {
    console.error("Error calculating theoretical stock:", error);
    return 0;
  }
};

/**
 * Calculate actual stock from batches
 * @param {string} productId - Product ID
 * @returns {number} Actual stock quantity
 */
const calculateActualStock = async (productId) => {
  try {
    const batches = await InventoryBatch.find({
      productId,
      batchStatus: "Active",
    });

    const actualStock = batches.reduce(
      (sum, batch) => sum + batch.quantityRemaining,
      0
    );
    return actualStock;
  } catch (error) {
    console.error("Error calculating actual stock:", error);
    return 0;
  }
};

/**
 * Get stock variance for a single product
 */
export const getProductVariance = async (req, res) => {
  try {
    const { productId } = req.params;
    const { startDate, endDate } = req.query;

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Get theoretical stock
    let movementFilter = { productId };
    if (startDate && endDate) {
      movementFilter.documentDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const theoreticalStock = await calculateTheoreticalStock(productId);
    const actualStock = await calculateActualStock(productId);

    const variance = actualStock - theoreticalStock;
    const variancePercent =
      theoreticalStock > 0 ? ((variance / theoreticalStock) * 100).toFixed(2) : 0;

    // Determine variance severity
    let severity = "NORMAL";
    if (variance < 0 && Math.abs(variancePercent) > 10) {
      severity = "CRITICAL";
    } else if (variance < 0 && Math.abs(variancePercent) > 5) {
      severity = "WARNING";
    } else if (variance !== 0) {
      severity = "MINOR";
    }

    // Get recent movements
    const recentMovements = await StockMovement.find(movementFilter)
      .sort({ documentDate: -1 })
      .limit(10);

    // Get all batches
    const batches = await InventoryBatch.find({ productId });

    res.status(200).json({
      product: {
        _id: product._id,
        itemname: product.itemname,
        itemcode: product.itemcode,
        currentStock: product.stock,
      },
      variance: {
        theoreticalStock,
        actualStock,
        variance,
        variancePercent,
        severity,
        hasDiscrepancy: variance !== 0,
      },
      batches: batches.map((batch) => ({
        _id: batch._id,
        batchNumber: batch.batchNumber,
        quantity: batch.quantity,
        quantityRemaining: batch.quantityRemaining,
        quantityIssued: batch.quantity - batch.quantityRemaining,
        purchaseDate: batch.purchaseDate,
        purchasePrice: batch.purchasePrice,
        status: batch.batchStatus,
      })),
      recentMovements: recentMovements.map((movement) => ({
        _id: movement._id,
        movementType: movement.movementType,
        quantity: movement.quantity,
        reference: movement.reference,
        referenceType: movement.referenceType,
        documentDate: movement.documentDate,
      })),
    });
  } catch (error) {
    console.error("Error getting product variance:", error);
    res.status(500).json({
      message: "Failed to get product variance",
      error: error.message,
    });
  }
};

/**
 * Get variance report for all products
 */
export const getVarianceReport = async (req, res) => {
  try {
    const { country, minVariance, maxVariance, severity, searchTerm } =
      req.query;

    let filter = {};

    if (country) {
      filter.country = country;
    }

    if (searchTerm) {
      filter.$or = [
        { itemname: { $regex: searchTerm, $options: "i" } },
        { itemcode: { $regex: searchTerm, $options: "i" } },
        { barcode: { $regex: searchTerm, $options: "i" } },
      ];
    }

    const products = await Product.find(filter);

    // Calculate variance for each product
    const varianceData = [];
    let totalVariance = 0;
    let totalVarianceValue = 0;

    for (const product of products) {
      const theoreticalStock = await calculateTheoreticalStock(product._id);
      const actualStock = await calculateActualStock(product._id);
      const variance = actualStock - theoreticalStock;
      const variancePercent =
        theoreticalStock > 0
          ? ((variance / theoreticalStock) * 100).toFixed(2)
          : 0;

      let varianceSeverity = "NORMAL";
      if (variance < 0 && Math.abs(variancePercent) > 10) {
        varianceSeverity = "CRITICAL";
      } else if (variance < 0 && Math.abs(variancePercent) > 5) {
        varianceSeverity = "WARNING";
      } else if (variance !== 0) {
        varianceSeverity = "MINOR";
      }

      // Apply filters
      if (severity && varianceSeverity !== severity) {
        continue;
      }

      if (minVariance && Math.abs(variance) < parseFloat(minVariance)) {
        continue;
      }

      if (maxVariance && Math.abs(variance) > parseFloat(maxVariance)) {
        continue;
      }

      // Only include products with discrepancies (optional filter)
      if (variance !== 0) {
        const varianceValue = variance * (product.cost || 0);

        varianceData.push({
          productId: product._id,
          itemname: product.itemname,
          itemcode: product.itemcode,
          category: product.categoryId?.name || "-",
          theoreticalStock,
          actualStock,
          variance,
          variancePercent,
          severity: varianceSeverity,
          varianceValue,
          cost: product.cost,
          price: product.price,
          minStock: product.minStock || 0,
          maxStock: product.maxStock || 0,
        });

        totalVariance += Math.abs(variance);
        totalVarianceValue += Math.abs(varianceValue);
      }
    }

    // Sort by variance value (largest discrepancies first)
    varianceData.sort((a, b) => Math.abs(b.varianceValue) - Math.abs(a.varianceValue));

    // Summary statistics
    const summary = {
      totalProducts: products.length,
      productsWithVariance: varianceData.length,
      totalVariance,
      totalVarianceValue,
      bySeverity: {
        critical: varianceData.filter((v) => v.severity === "CRITICAL").length,
        warning: varianceData.filter((v) => v.severity === "WARNING").length,
        minor: varianceData.filter((v) => v.severity === "MINOR").length,
      },
      avgVariancePercent:
        varianceData.length > 0
          ? (
              varianceData.reduce((sum, v) => sum + Math.abs(v.variancePercent), 0) /
              varianceData.length
            ).toFixed(2)
          : 0,
    };

    res.status(200).json({
      summary,
      data: varianceData,
    });
  } catch (error) {
    console.error("Error getting variance report:", error);
    res.status(500).json({
      message: "Failed to get variance report",
      error: error.message,
    });
  }
};

/**
 * Get variance investigation details
 */
export const getVarianceInvestigation = async (req, res) => {
  try {
    const { productId, startDate, endDate } = req.query;

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    let movementFilter = { productId };
    if (startDate && endDate) {
      movementFilter.documentDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    // Get all movements in detail
    const movements = await StockMovement.find(movementFilter)
      .sort({ documentDate: 1 })
      .populate("batchId", "batchNumber quantityRemaining");

    // Calculate running balance
    let runningBalance = 0;
    const detailedMovements = movements.map((movement) => {
      if (movement.movementType === "INBOUND") {
        runningBalance += movement.quantity;
      } else if (
        movement.movementType === "OUTBOUND" ||
        (movement.movementType === "ADJUSTMENT" && movement.quantity < 0)
      ) {
        runningBalance += movement.quantity; // quantity is already negative
      } else if (movement.movementType === "ADJUSTMENT" && movement.quantity > 0) {
        runningBalance += movement.quantity;
      } else if (movement.movementType === "RETURN") {
        runningBalance += movement.quantity;
      }

      return {
        _id: movement._id,
        movementType: movement.movementType,
        quantity: movement.quantity,
        reference: movement.reference,
        referenceType: movement.referenceType,
        documentDate: movement.documentDate,
        batchNumber: movement.batchId?.batchNumber || "-",
        runningBalance,
        costingMethod: movement.costingMethodUsed,
      };
    });

    // Get current vs theoretical at each point
    const theoreticalStock = await calculateTheoreticalStock(productId);
    const actualStock = await calculateActualStock(productId);

    res.status(200).json({
      product: {
        itemname: product.itemname,
        itemcode: product.itemcode,
        cost: product.cost,
      },
      theoreticalStock,
      actualStock,
      variance: actualStock - theoreticalStock,
      movements: detailedMovements,
      periodStart: startDate || "All time",
      periodEnd: endDate || "Current",
    });
  } catch (error) {
    console.error("Error getting variance investigation:", error);
    res.status(500).json({
      message: "Failed to get variance investigation",
      error: error.message,
    });
  }
};
