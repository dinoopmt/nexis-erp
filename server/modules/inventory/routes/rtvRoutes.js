/**
 * RTV Routes
 * API endpoints for Return to Vendor operations
 */
import express from "express";
import * as rtvController from "../controllers/rtvController.js";

const router = express.Router();

// Utility Routes (must come BEFORE parameterized routes)
router.get("/next-number", rtvController.getRtvNextNumber);
router.get("/grn/list", rtvController.getGrnList);
router.get("/grn/available", rtvController.getAvailableRtvStock);
router.get("/grn/stock/:grnId", rtvController.getGrnStockTracking);

// CRUD Operations
router.post("/", rtvController.createRtv);
router.get("/", rtvController.getRtvList);
router.get("/:rtvId", rtvController.getRtvById);
router.put("/:rtvId", rtvController.updateRtv);
router.delete("/:rtvId", rtvController.deleteRtv);

// Workflow Operations
router.patch("/:rtvId/submit", rtvController.submitRtv);
router.patch("/:rtvId/approve", rtvController.approveRtv);
router.patch("/:rtvId/post", rtvController.postRtv);
router.patch("/:rtvId/cancel", rtvController.cancelRtv);

// Credit Note
router.post("/:rtvId/credit-note", rtvController.generateCreditNote);

export default router;
