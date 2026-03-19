import Promotion from "../../../Models/Promotion.js";
import logger from "../../../config/logger.js";

class PromotionService {
  // Get all promotions with pagination
  async getPromotions(page = 1, limit = 10, filters = {}) {
    try {
      const skip = (page - 1) * limit;
      const query = { ...filters };

      const promotions = await Promotion.find(query)
        .populate("productId", "name itemcode")
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 });

      const total = await Promotion.countDocuments(query);

      return {
        promotions,
        total,
        pages: Math.ceil(total / limit),
        currentPage: page,
      };
    } catch (error) {
      logger.error("Error fetching promotions:", error);
      throw error;
    }
  }

  // Get single promotion
  async getPromotionById(id) {
    try {
      const promotion = await Promotion.findById(id).populate(
        "productId",
        "name itemcode"
      );

      if (!promotion) {
        const error = new Error("Promotion not found");
        error.status = 404;
        throw error;
      }

      return promotion;
    } catch (error) {
      logger.error("Error fetching promotion:", error);
      throw error;
    }
  }

  // Create promotion
  async addPromotion(promotionData) {
    try {
      // Validate promotion type specific data
      if (promotionData.promotionType === "BOGO") {
        if (!promotionData.bogoDetails.applicableToAll && !promotionData.productId) {
          const error = new Error("Product ID required for product-specific BOGO promotion");
          error.status = 400;
          throw error;
        }
      }

      if (promotionData.promotionType === "PERCENTAGE") {
        if (!promotionData.productId) {
          const error = new Error("Product ID required for percentage discount");
          error.status = 400;
          throw error;
        }
        if (promotionData.percentageDetails.discountPercent < 0 || promotionData.percentageDetails.discountPercent > 100) {
          const error = new Error("Discount percentage must be between 0 and 100");
          error.status = 400;
          throw error;
        }
      }

      if (promotionData.promotionType === "PERIOD_WISE") {
        if (!promotionData.productId) {
          const error = new Error("Product ID required for period-wise promotion");
          error.status = 400;
          throw error;
        }
        if (!promotionData.periodWiseDetails.periods || promotionData.periodWiseDetails.periods.length === 0) {
          const error = new Error("At least one period required for period-wise promotion");
          error.status = 400;
          throw error;
        }
      }

      const promotion = new Promotion(promotionData);
      await promotion.save();

      logger.info("Promotion created successfully", { promotionId: promotion._id });

      return promotion;
    } catch (error) {
      logger.error("Error creating promotion:", error);
      throw error;
    }
  }

  // Update promotion
  async updatePromotion(id, promotionData) {
    try {
      const promotion = await Promotion.findById(id);

      if (!promotion) {
        const error = new Error("Promotion not found");
        error.status = 404;
        throw error;
      }

      Object.assign(promotion, promotionData);
      promotion.updatedAt = new Date();

      await promotion.save();

      logger.info("Promotion updated successfully", { promotionId: id });

      return promotion;
    } catch (error) {
      logger.error("Error updating promotion:", error);
      throw error;
    }
  }

  // Delete promotion
  async deletePromotion(id) {
    try {
      const promotion = await Promotion.findByIdAndDelete(id);

      if (!promotion) {
        const error = new Error("Promotion not found");
        error.status = 404;
        throw error;
      }

      logger.info("Promotion deleted successfully", { promotionId: id });

      return { message: "Promotion deleted successfully" };
    } catch (error) {
      logger.error("Error deleting promotion:", error);
      throw error;
    }
  }

  // Get active promotions for a product
  async getActivePromotionsForProduct(productId) {
    try {
      const today = new Date();

      const promotions = await Promotion.find({
        status: "active",
        startDate: { $lte: today },
        endDate: { $gte: today },
        $or: [
          { productId },
          { "bogoDetails.applicableToAll": true },
        ],
      });

      return promotions;
    } catch (error) {
      logger.error("Error fetching active promotions:", error);
      throw error;
    }
  }

  // Apply promotion discount to price
  async applyPromotionDiscount(productId, quantity, originalPrice) {
    try {
      const promotions = await this.getActivePromotionsForProduct(productId);

      let discountedPrice = originalPrice;
      let appliedPromotion = null;

      for (const promo of promotions) {
        if (promo.promotionType === "PERCENTAGE") {
          if (quantity >= promo.percentageDetails.minPurchaseQuantity) {
            const discount = (originalPrice * promo.percentageDetails.discountPercent) / 100;
            discountedPrice = originalPrice - discount;
            appliedPromotion = promo;
            break;
          }
        } else if (promo.promotionType === "BOGO") {
          if (quantity >= promo.bogoDetails.buyQuantity) {
            // BOGO is handled differently - it gives free items, not a direct price reduction
            appliedPromotion = promo;
            break;
          }
        }
      }

      return {
        originalPrice,
        discountedPrice,
        discount: originalPrice - discountedPrice,
        appliedPromotion,
      };
    } catch (error) {
      logger.error("Error applying promotion discount:", error);
      throw error;
    }
  }
}

export default new PromotionService();
