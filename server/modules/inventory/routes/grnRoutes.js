import express from "express";
import {
  getNextGrnNumber,
  getAllGrns,
  getGrnById,
  createGrn,
  updateGrn,
  postGrn,
  saveDraftGrn,
  postGrnWithUpdates,
  deleteGrn,
  getGrnReport,
  getGrnHtml,
} from "../controllers/grnController.js";

const router = express.Router();

/**
 * @route   GET /api/v1/grn
 * @desc    Get all GRNs
 * @access  Public
 */
router.get("/", getAllGrns);

/**
 * @route   GET /api/v1/grn/next-number
 * @desc    Get next GRN number from sequence table (FIFO method)
 * @access  Public
 * @query   {financialYear: "2025-26"}
 */
router.get("/next-number", getNextGrnNumber);

/**
 * @route   GET /api/v1/grn/report
 * @desc    Get GRN report with statistics
 * @access  Public
 */
router.get("/report", getGrnReport);

/**
 * @route   GET /api/v1/grn/:id/html
 * @desc    Get GRN as HTML for printing/PDF
 * @access  Public
 */
router.get("/:id/html", getGrnHtml);

/**
 * @route   GET /api/v1/grn/:id
 * @desc    Get GRN by ID
 * @access  Public
 */
router.get("/:id", getGrnById);

/**
 * @route   POST /api/v1/grn
 * @desc    Create new GRN
 * @access  Public
 */
router.post("/", createGrn);

/**
 * @route   POST /api/v1/grn/:id/can-edit
 * @desc    Check if GRN can be edited (batch validation)
 * @access  Public
 */
router.post("/:id/can-edit", async (req, res) => {
  try {
    const { id } = req.params;
    const GRNBatchEditValidator = (await import("../../accounting/services/GRNBatchEditValidator.js")).default;
    
    const result = await GRNBatchEditValidator.canEditGrn(id);
    res.status(200).json(result);
  } catch (error) {
    console.error("Error checking edit eligibility:", error);
    res.status(500).json({
      canEdit: false,
      error: error.message
    });
  }
});

/**
 * @route   PATCH /api/v1/grn/:id/apply-edit
 * @desc    Apply delta-based edits to POSTED GRN (strict batch validation)
 * @access  Public
 * @body    { "items": [...], "createdBy": "userId" }
 */
router.patch("/:id/apply-edit", async (req, res) => {
  try {
    const { id } = req.params;
    const { items, createdBy } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Items array is required"
      });
    }

    const GRNBatchEditValidator = (await import("../../accounting/services/GRNBatchEditValidator.js")).default;
    
    const result = await GRNBatchEditValidator.applyGrnEdit(id, items, createdBy || "System");
    
    if (result.success) {
      res.status(200).json({
        success: true,
        message: "GRN edited successfully",
        data: result
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.error || "Failed to apply edits",
        data: result
      });
    }
  } catch (error) {
    console.error("Error applying GRN edit:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @route   POST /api/v1/grn/save-draft
 * @desc    Save GRN as Draft (NO vendor payments, NO stock updates)
 * @access  Public
 */
router.post("/save-draft", saveDraftGrn);

/**
 * @route   POST /api/v1/grn/post-with-updates
 * @desc    Post GRN with all updates (vendor payments, journal entries, stock updates)
 * @access  Public
 */
router.post("/post-with-updates", postGrnWithUpdates);

/**
 * @route   PUT /api/v1/grn/:id
 * @desc    Update GRN
 * @access  Public
 */
router.put("/:id", updateGrn);

/**
 * @route   POST /api/v1/grn/:id/post
 * @desc    Post GRN and create double-entry accounting journals
 * @access  Public
 * @body    { "createdBy": "username" }
 */
router.post("/:id/post", postGrn);

/**
 * @route   DELETE /api/v1/grn/:id
 * @desc    Delete GRN
 * @access  Public
 */
router.delete("/:id", deleteGrn);

export default router;
