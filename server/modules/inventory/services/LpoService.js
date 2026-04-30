/**
 * LPO (Local Purchase Order) Service
 * Manages LPO generation and processing
 * ✅ MATCHING GRN PATTERN FOR MULTI-TERMINAL SUPPORT
 */

import Lpo from "../../../Models/Lpo.js";
import Counter from "../../../Models/SequenceModel.js";
import logger from "../../../config/logger.js";

class LpoService {
  /**
   * ✅ UPDATED: Generate next LPO number using database sequence (FIFO method)
   * Uses atomic increment to prevent duplicates in concurrent scenarios (multi-terminal)
   * @param {string} financialYear - Financial year (e.g., "2025-2026")
   * @returns {Promise<string>} - LPO number (e.g., "LPO-2025-2026-00001")
   */
  async generateLPONumber(financialYear = "2025-2026") {
    try {
      // ✅ Use atomic findOneAndUpdate for FIFO
      // Increments counter atomically to prevent race conditions across multiple terminals
      const sequence = await Counter.findOneAndUpdate(
        {
          module: "LPO",
          financialYear: financialYear,
        },
        {
          $inc: { lastNumber: 1 }, // Atomic increment
        },
        {
          returnDocument: "after", // Return updated document
          upsert: true, // Create if doesn't exist
        }
      );

      const lpoNumber = `LPO-${financialYear}-${String(sequence.lastNumber).padStart(5, "0")}`;
      logger.info("Generated LPO number using sequence", {
        lpoNumber,
        financialYear,
        sequenceId: sequence._id,
      });
      return lpoNumber;
    } catch (err) {
      logger.error("Failed to generate LPO number", {
        error: err.message,
        financialYear,
      });
      throw err;
    }
  }

  /**
   * Validate LPO items
   * @param {Array} items - Array of LPO items
   * @returns {Promise<boolean>} - true if valid
   */
  async validateLPOItems(items) {
    try {
      if (!items || items.length === 0) {
        const error = new Error("LPO must have at least one item");
        error.status = 400;
        throw error;
      }

      for (let i = 0; i < items.length; i++) {
        const item = items[i];

        // Validate quantity
        if (!item.qty || item.qty <= 0) {
          const error = new Error(`Line ${i + 1}: Quantity must be greater than 0`);
          error.status = 400;
          throw error;
        }

        // Validate cost
        if (!item.cost || item.cost <= 0) {
          const error = new Error(`Line ${i + 1}: Cost must be greater than 0`);
          error.status = 400;
          throw error;
        }
      }

      return true;
    } catch (err) {
      logger.error("LPO validation failed", { error: err.message, itemCount: items?.length });
      throw err;
    }
  }

  /**
   * Calculate LPO totals
   * @param {Array} items - Array of LPO items
   * @returns {Object} - { totalAmount, totalTax, netTotal }
   */
  calculateLPOTotals(items) {
    try {
      let totalAmount = 0;
      let totalTax = 0;

      for (const item of items) {
        const itemTotal = item.cost * item.qty;
        totalAmount += itemTotal;
        totalTax += item.tax || 0;
      }

      const netTotal = totalAmount + totalTax;

      return {
        totalAmount,
        totalTax,
        netTotal,
      };
    } catch (err) {
      logger.error("Failed to calculate LPO totals", { error: err.message });
      throw err;
    }
  }
}

export default new LpoService();
