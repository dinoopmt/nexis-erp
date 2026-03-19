import express from "express";
import {
  createFinancialYear,
  getFinancialYears,
  getCurrentFinancialYear,
  getFinancialYearById,
  getFinancialYearForDate,
  updateFinancialYear,
  setCurrentFinancialYear,
  closeFinancialYear,
  lockFinancialYear,
  reopenFinancialYear,
  deleteFinancialYear,
  validatePostingDate
} from "../controllers/financialYearController.js";

const router = express.Router();

// Base routes
router.post("/", createFinancialYear);
router.get("/", getFinancialYears);
router.get("/current", getCurrentFinancialYear);
router.post("/validate-posting", validatePostingDate);
router.get("/by-date/:date", getFinancialYearForDate);
router.get("/:id", getFinancialYearById);
router.put("/:id", updateFinancialYear);
router.delete("/:id", deleteFinancialYear);

// Status management routes
router.patch("/:id/set-current", setCurrentFinancialYear);
router.patch("/:id/close", closeFinancialYear);
router.patch("/:id/lock", lockFinancialYear);
router.patch("/:id/reopen", reopenFinancialYear);

export default router;
