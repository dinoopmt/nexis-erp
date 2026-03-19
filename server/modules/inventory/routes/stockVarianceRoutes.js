import express from "express";
import {
  getProductVariance,
  getVarianceReport,
  getVarianceInvestigation,
} from "../controllers/stockVarianceController.js";

const router = express.Router();

/**
 * @route   GET /api/stock-variance/report
 * @desc    Get variance report for all products
 * @access  Public
 * @query   {
 *   "country": "UAE",
 *   "severity": "CRITICAL|WARNING|MINOR|NORMAL",
 *   "minVariance": 5,
 *   "maxVariance": 100,
 *   "searchTerm": "product name or code"
 * }
 */
router.get("/report", getVarianceReport);

/**
 * @route   GET /api/stock-variance/product/:productId
 * @desc    Get variance for a single product
 * @access  Public
 * @query   {
 *   "startDate": "2024-01-01",
 *   "endDate": "2024-12-31"
 * }
 */
router.get("/product/:productId", getProductVariance);

/**
 * @route   GET /api/stock-variance/investigation
 * @desc    Get detailed variance investigation with running balance
 * @access  Public
 * @query   {
 *   "productId": "product_id",
 *   "startDate": "2024-01-01",
 *   "endDate": "2024-12-31"
 * }
 */
router.get("/investigation", getVarianceInvestigation);

export default router;
