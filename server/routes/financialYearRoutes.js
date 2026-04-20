import express from 'express';
import {
  getFinancialYears,
  getFinancialYearById,
  createFinancialYear,
  updateFinancialYear,
  setCurrentFinancialYear,
  deleteFinancialYear,
  getCurrentFinancialYear
} from '../controllers/financialYearController.js';

const router = express.Router();

// Get all financial years
router.get('/', getFinancialYears);

// Get current financial year
router.get('/current', getCurrentFinancialYear);

// Get financial year by ID
router.get('/:id', getFinancialYearById);

// Create financial year
router.post('/', createFinancialYear);

// Update financial year
router.put('/:id', updateFinancialYear);

// Set financial year as current
router.put('/:id/set-current', setCurrentFinancialYear);

// Delete financial year
router.delete('/:id', deleteFinancialYear);

export default router;
