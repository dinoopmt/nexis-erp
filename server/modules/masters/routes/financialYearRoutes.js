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
import { validate, createFinancialYearSchema, updateFinancialYearSchema, setCurrentFinancialYearSchema } from "../../../middleware/validators/schemaValidator.js";
import { z } from "zod";

const router = express.Router();

// Validation schemas
const dateSchema = z.object({
  date: z.string().datetime().optional(),
});

const idParamSchema = z.object({
  id: z.string().regex(/^[0-9a-f]{24}$/i, 'Invalid MongoDB ObjectId'),
});

// Base routes
router.post("/", validate(createFinancialYearSchema, 'body'), createFinancialYear);
router.get("/", getFinancialYears);
router.get("/current", getCurrentFinancialYear);
router.post("/validate-posting", validate(dateSchema, 'body'), validatePostingDate);
router.get("/by-date/:date", getFinancialYearForDate);
router.get("/:id", validate(idParamSchema, 'params'), getFinancialYearById);
router.put("/:id", validate(idParamSchema, 'params'), validate(updateFinancialYearSchema, 'body'), updateFinancialYear);
router.delete("/:id", validate(idParamSchema, 'params'), deleteFinancialYear);

// Status management routes
router.patch("/:id/set-current", validate(idParamSchema, 'params'), setCurrentFinancialYear);
router.patch("/:id/close", validate(idParamSchema, 'params'), closeFinancialYear);
router.patch("/:id/lock", validate(idParamSchema, 'params'), lockFinancialYear);
router.patch("/:id/reopen", validate(idParamSchema, 'params'), reopenFinancialYear);

export default router;
