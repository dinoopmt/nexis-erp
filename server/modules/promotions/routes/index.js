import express from "express";
import {
  getPromotions,
  getPromotion,
  addPromotion,
  updatePromotion,
  deletePromotion,
  getActivePromotionsForProduct,
} from "../controllers/promotionController.js";

const router = express.Router();

// GET all promotions with pagination and filters
router.get("/", getPromotions);

// GET single promotion by ID
router.get("/:id", getPromotion);

// GET active promotions for a specific product
router.get("/product/:productId/active", getActivePromotionsForProduct);

// POST create new promotion
router.post("/addpromotion", addPromotion);

// PUT update promotion
router.put("/updatepromotion/:id", updatePromotion);

// DELETE promotion
router.delete("/deletepromotion/:id", deletePromotion);

export default router;
