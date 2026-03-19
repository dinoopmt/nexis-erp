import express from 'express';
import {
  openShift,
  closeShift,
  getShiftDetails,
  acknowledgeOpening,
  getPreviousShiftSummary,
  getTerminalStatus,
  getCurrentShift,
  getDailySales,
} from '../controllers/posShiftController.js';

const router = express.Router();

// Shift operations - /pos/shifts routes
router.post('/shifts/open', openShift);
router.post('/shifts/:shiftId/close', closeShift);
router.get('/shifts/:shiftId', getShiftDetails);
router.post('/shifts/:shiftId/acknowledge-opening', acknowledgeOpening);

// Terminal operations - /pos/terminals routes
router.get('/terminals/:terminalId/previous-shift-summary', getPreviousShiftSummary);
router.get('/terminals/:terminalId/status', getTerminalStatus);
router.get('/terminals/:terminalId/current-shift', getCurrentShift);
router.get('/terminals/:terminalId/daily-sales', getDailySales);

export default router;
