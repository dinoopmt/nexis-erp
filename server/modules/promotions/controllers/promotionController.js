import promotionService from "../services/promotionService.js";
import { catchAsync } from "../../../config/errorHandler.js";
import logger from "../../../config/logger.js";

/**
 * PromotionController - Handles HTTP requests for promotions
 */

export const getPromotions = catchAsync(async (req, res) => {
  const { page = 1, limit = 10, type, status } = req.query;
  const filters = {};

  if (type) filters.promotionType = type;
  if (status) filters.status = status;

  const result = await promotionService.getPromotions(
    parseInt(page),
    parseInt(limit),
    filters
  );

  res.status(200).json({
    success: true,
    data: result,
    message: "Promotions fetched successfully",
  });
});

export const getPromotion = catchAsync(async (req, res) => {
  const { id } = req.params;

  const promotion = await promotionService.getPromotionById(id);

  res.status(200).json({
    success: true,
    data: promotion,
    message: "Promotion fetched successfully",
  });
});

export const addPromotion = catchAsync(async (req, res) => {
  const promotionData = req.body;

  const promotion = await promotionService.addPromotion(promotionData);

  res.status(201).json({
    success: true,
    promotion,
    message: "Promotion created successfully",
  });
});

export const updatePromotion = catchAsync(async (req, res) => {
  const { id } = req.params;
  const promotionData = req.body;

  const promotion = await promotionService.updatePromotion(id, promotionData);

  res.status(200).json({
    success: true,
    promotion,
    message: "Promotion updated successfully",
  });
});

export const deletePromotion = catchAsync(async (req, res) => {
  const { id } = req.params;

  await promotionService.deletePromotion(id);

  res.status(200).json({
    success: true,
    message: "Promotion deleted successfully",
  });
});

export const getActivePromotionsForProduct = catchAsync(async (req, res) => {
  const { productId } = req.params;

  const promotions = await promotionService.getActivePromotionsForProduct(
    productId
  );

  res.status(200).json({
    success: true,
    data: promotions,
    message: "Active promotions fetched successfully",
  });
});
