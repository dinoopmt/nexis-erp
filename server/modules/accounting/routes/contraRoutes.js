import express from "express";
import {
  createContra,
  getContras,
  getContraById,
  updateContra,
  approveContra,
  completeContra,
  cancelContra,
  deleteContra,
  getContraStats
} from "../controllers/contraController.js";

const router = express.Router();

// Stats route (must be before :id routes)
router.get("/stats", getContraStats);

// Base CRUD routes
router.post("/", createContra);
router.get("/", getContras);
router.get("/:id", getContraById);
router.put("/:id", updateContra);
router.delete("/:id", deleteContra);

// Status change routes
router.patch("/:id/approve", approveContra);
router.patch("/:id/complete", completeContra);
router.patch("/:id/cancel", cancelContra);

export default router;
