import express from "express";
import {
  createReceipt,
  getReceipts,
  getReceiptById,
  updateReceipt,
  approveReceipt,
  markReceiptAsReceived,
  cancelReceipt,
  markReceiptAsBounced,
  deleteReceipt,
  getReceiptStats
} from "../controllers/receiptController.js";

const router = express.Router();

// Stats route (must be before :id routes)
router.get("/stats", getReceiptStats);

// Base CRUD routes
router.post("/", createReceipt);
router.get("/", getReceipts);
router.get("/:id", getReceiptById);
router.put("/:id", updateReceipt);
router.delete("/:id", deleteReceipt);

// Status change routes
router.patch("/:id/approve", approveReceipt);
router.patch("/:id/receive", markReceiptAsReceived);
router.patch("/:id/cancel", cancelReceipt);
router.patch("/:id/bounced", markReceiptAsBounced);

export default router;
