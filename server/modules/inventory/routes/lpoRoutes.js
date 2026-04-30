import express from "express";
import {
  getNextLpoNumber,
  getAllLpos,
  getLpoById,
  createLpo,
  updateLpo,
  deleteLpo,
  getLpoHtml,
} from "../controllers/lpoController.js";

const router = express.Router();

/**
 * @route   GET /api/v1/lpo/next-number
 * @desc    Get next LPO number from sequence table (FIFO method)
 * @access  Public
 * @query   {financialYear: "2025-26"}
 * ✅ MATCHING GRN PATTERN FOR MULTI-TERMINAL SUPPORT
 * ⚠️ MUST BE BEFORE /:id routes to prevent ID matching
 */
router.get("/next-number", getNextLpoNumber);

/**
 * @route   GET /api/v1/lpo/:id/html
 * @desc    Get LPO as HTML for printing/PDF
 * @access  Public
 * ⚠️ MUST BE BEFORE /:id route to prevent ID matching
 */
router.get("/:id/html", getLpoHtml);

/**
 * @route   GET /api/v1/lpo
 * @desc    Get all LPOs
 * @access  Public
 * ⚠️ MUST BE BEFORE /:id to prevent "/" matching as ID
 */
router.get("/", getAllLpos);

/**
 * @route   GET /api/v1/lpo/:id
 * @desc    Get LPO by ID
 * @access  Public
 */
router.get("/:id", getLpoById);

/**
 * @route   POST /api/v1/lpo
 * @desc    Create new LPO
 * @access  Public
 */
router.post("/", createLpo);

/**
 * @route   PUT /api/v1/lpo/:id
 * @desc    Update LPO
 * @access  Public
 */
router.put("/:id", updateLpo);

/**
 * @route   DELETE /api/v1/lpo/:id
 * @desc    Delete LPO
 * @access  Public
 */
router.delete("/:id", deleteLpo);

export default router;
