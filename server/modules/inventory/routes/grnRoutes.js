import express from "express";
import {
  getNextGrnNumber,
  getAllGrns,
  getGrnById,
  createGrn,
  updateGrn,
  postGrn,
  deleteGrn,
  getGrnReport,
} from "../controllers/grnController.js";

const router = express.Router();

/**
 * @route   GET /api/grn
 * @desc    Get all GRNs
 * @access  Public
 */
router.get("/", getAllGrns);

/**
 * @route   GET /api/grn/next-number
 * @desc    Get next GRN number from sequence table (FIFO method)
 * @access  Public
 * @query   {financialYear: "2025-26"}
 */
router.get("/next-number", getNextGrnNumber);

/**
 * @route   GET /api/grn/report
 * @desc    Get GRN report with statistics
 * @access  Public
 */
router.get("/report", getGrnReport);

/**
 * @route   GET /api/grn/:id
 * @desc    Get GRN by ID
 * @access  Public
 */
router.get("/:id", getGrnById);

/**
 * @route   POST /api/grn
 * @desc    Create new GRN
 * @access  Public
 * @body    {
 *   "grnNumber": "GRN-001",
 *   "grnDate": "2024-03-04",
 *   "vendorId": "vendor_id",
 *   "vendorName": "Vendor Name",
 *   "referenceNumber": "PO-2024-001",
 *   "deliveryDate": "2024-03-05",
 *   "status": "Received",
 *   "items": [
 *     {
 *       "productId": "product_id",
 *       "itemName": "Item Name",
 *       "itemCode": "ITEM-001",
 *       "quantity": 10,
 *       "unitCost": 50,
 *       "totalCost": 500,
 *       "batchNumber": "BATCH-001",
 *       "expiryDate": "2025-03-04"
 *     }
 *   ],
 *   "notes": "Sample notes"
 * }
 */
router.post("/", createGrn);

/**
 * @route   PUT /api/grn/:id
 * @desc    Update GRN
 * @access  Public
 */
router.put("/:id", updateGrn);

/**
 * @route   POST /api/grn/:id/post
 * @desc    Post GRN and create double-entry accounting journals
 * @access  Public
 * @body    { "createdBy": "username" }
 */
router.post("/:id/post", postGrn);

/**
 * @route   DELETE /api/grn/:id
 * @desc    Delete GRN
 * @access  Public
 */
router.delete("/:id", deleteGrn);

export default router;
