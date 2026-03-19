import express from "express";
import {
  createPayment,
  getPayments,
  getPaymentById,
  updatePayment,
  approvePayment,
  markPaymentAsPaid,
  cancelPayment,
  deletePayment,
  getPaymentStats
} from "../controllers/paymentController.js";

const router = express.Router();

// GET /api/payments/stats - Get payment statistics
router.get("/stats", getPaymentStats);

// GET /api/payments - Get all payments
router.get("/", getPayments);

// GET /api/payments/:id - Get payment by ID
router.get("/:id", getPaymentById);

// POST /api/payments - Create new payment
router.post("/", createPayment);

// PUT /api/payments/:id - Update payment
router.put("/:id", updatePayment);

// PATCH /api/payments/:id/approve - Approve payment
router.patch("/:id/approve", approvePayment);

// PATCH /api/payments/:id/pay - Mark payment as paid
router.patch("/:id/pay", markPaymentAsPaid);

// PATCH /api/payments/:id/cancel - Cancel payment
router.patch("/:id/cancel", cancelPayment);

// DELETE /api/payments/:id - Delete payment (soft delete)
router.delete("/:id", deletePayment);

export default router;
