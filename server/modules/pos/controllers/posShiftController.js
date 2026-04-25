import POSShift from '../../../Models/POS/POSShift.js';
import POSTerminal from '../../../Models/POS/POSTerminal.js';
import User from '../../../Models/User.js';

/**
 * Get previous shift summary for a terminal
 * GET /api/v1/pos/terminals/:terminalId/previous-shift-summary
 */
export const getPreviousShiftSummary = async (req, res) => {
  try {
    const { terminalId } = req.params;

    if (!terminalId) {
      return res.status(400).json({
        success: false,
        error: 'Terminal ID is required',
      });
    }

    // Find the terminal
    const terminal = await POSTerminal.findOne({ terminalId, isDeleted: false });
    if (!terminal) {
      return res.status(404).json({
        success: false,
        error: 'Terminal not found',
      });
    }

    // Find the most recent closed shift for this terminal
    const previousShift = await POSShift.findOne(
      {
        terminalId: terminalId,
        status: 'closed',
        isDeleted: false,
      },
      {
        shiftNumber: 1,
        operatorName: 1,
        openedAt: 1,
        closedAt: 1,
        closingBalance: 1,
        openingBalance: 1,
        totalSales: 1,
        totalReturns: 1,
        netSales: 1,
        transactionCount: 1,
        closingVariance: 1,
        closingVarianceAcknowledged: 1,
      }
    ).sort({ closedAt: -1 });

    if (!previousShift) {
      // First shift of the day/period - no previous shift
      return res.status(200).json({
        success: true,
        data: {
          hasPreviousShift: false,
          message: 'No previous shift found - this is the first shift',
        },
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        hasPreviousShift: true,
        shiftNumber: previousShift.shiftNumber,
        operatorName: previousShift.operatorName,
        openedAt: previousShift.openedAt,
        closedAt: previousShift.closedAt,
        closingBalance: previousShift.closingBalance,
        openingBalance: previousShift.openingBalance,
        totalSales: previousShift.totalSales,
        totalReturns: previousShift.totalReturns,
        netSales: previousShift.netSales,
        transactionCount: previousShift.transactionCount,
        closingVariance: previousShift.closingVariance,
        closingVarianceAcknowledged: previousShift.closingVarianceAcknowledged,
      },
    });
  } catch (error) {
    console.error('Error fetching previous shift summary:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch previous shift summary',
    });
  }
};

/**
 * Open a new shift
 * POST /api/v1/pos/shifts/open
 */
export const openShift = async (req, res) => {
  try {
    const { terminalId, operatorId, operatorName, openingBalance } = req.body;

    // Validation
    if (!terminalId || !operatorId || !operatorName || openingBalance === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: terminalId, operatorId, operatorName, openingBalance',
      });
    }

    if (typeof openingBalance !== 'number' || openingBalance < 0) {
      return res.status(400).json({
        success: false,
        error: 'openingBalance must be a non-negative number',
      });
    }

    // Verify terminal exists
    const terminal = await POSTerminal.findOne({ terminalId, isDeleted: false });
    if (!terminal) {
      return res.status(404).json({
        success: false,
        error: 'Terminal not found',
      });
    }

    // Verify operator exists
    const operator = await User.findById(operatorId);
    if (!operator) {
      return res.status(404).json({
        success: false,
        error: 'Operator not found',
      });
    }

    // Check if terminal already has an open shift
    const existingOpenShift = await POSShift.findOne({
      terminalId: terminalId,
      status: 'open',
      isDeleted: false,
    });

    if (existingOpenShift) {
      return res.status(409).json({
        success: false,
        error: 'Terminal already has an open shift',
        currentShiftId: existingOpenShift._id,
      });
    }

    // Get previous shift to calculate expected opening balance
    const previousShift = await POSShift.findOne(
      {
        terminalId: terminalId,
        status: 'closed',
        isDeleted: false,
      },
      { closingBalance: 1 }
    ).sort({ closedAt: -1 });

    const expectedOpening = previousShift ? previousShift.closingBalance : 0;
    const openingVariance = openingBalance - expectedOpening;

    // Generate shift number
    const today = new Date();
    const dateString = today.toISOString().split('T')[0].replace(/-/g, '');
    const shiftCount = await POSShift.countDocuments({
      terminalId: terminalId,
      openedAt: {
        $gte: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
        $lt: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1),
      },
    });

    const shiftNumber = `SHIFT-${dateString}-${String(shiftCount + 1).padStart(3, '0')}`;

    // Create new shift
    const newShift = new POSShift({
      shiftNumber,
      terminal: terminal._id,
      terminalId,
      operator: operator._id,
      operatorId,
      operatorName,
      openingBalance,
      expectedOpening,
      openingVariance,
      openedBy: operator._id,
      closingBalance: null,
      status: 'open',
    });

    await newShift.save();

    // Update terminal to reference current shift
    await POSTerminal.findByIdAndUpdate(
      terminal._id,
      { currentShift: newShift._id },
      { returnDocument: 'after' }
    );

    res.status(201).json({
      success: true,
      message: 'Shift opened successfully',
      data: {
        shiftId: newShift._id,
        shiftNumber: newShift.shiftNumber,
        terminalId: newShift.terminalId,
        operatorName: newShift.operatorName,
        openedAt: newShift.openedAt,
        openingBalance: newShift.openingBalance,
        expectedOpening: newShift.expectedOpening,
        openingVariance: newShift.openingVariance,
        status: newShift.status,
      },
    });
  } catch (error) {
    console.error('Error opening shift:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to open shift',
    });
  }
};

/**
 * Close a shift
 * POST /api/v1/pos/shifts/:shiftId/close
 */
export const closeShift = async (req, res) => {
  try {
    const { shiftId } = req.params;
    const { closingBalance, reconcilationNotes } = req.body;

    if (!shiftId) {
      return res.status(400).json({
        success: false,
        error: 'Shift ID is required',
      });
    }

    if (closingBalance === undefined || typeof closingBalance !== 'number') {
      return res.status(400).json({
        success: false,
        error: 'closingBalance is required and must be a number',
      });
    }

    // Find shift
    const shift = await POSShift.findById(shiftId);
    if (!shift) {
      return res.status(404).json({
        success: false,
        error: 'Shift not found',
      });
    }

    if (shift.status === 'closed') {
      return res.status(409).json({
        success: false,
        error: 'Shift is already closed',
      });
    }

    // Calculate closing variance
    const expectedClosing = shift.openingBalance + shift.netSales;
    const closingVariance = closingBalance - expectedClosing;

    // Update shift
    shift.closingBalance = closingBalance;
    shift.expectedClosing = expectedClosing;
    shift.closingVariance = closingVariance;
    shift.reconcilationNotes = reconcilationNotes || '';
    shift.closedAt = new Date();
    shift.status = 'closed';

    await shift.save();

    // Update terminal
    const terminal = await POSTerminal.findById(shift.terminal);
    if (terminal) {
      terminal.lastShift = shift._id;
      terminal.currentShift = null;
      await terminal.save();
    }

    res.status(200).json({
      success: true,
      message: 'Shift closed successfully',
      data: {
        shiftId: shift._id,
        shiftNumber: shift.shiftNumber,
        closingBalance: shift.closingBalance,
        expectedClosing: shift.expectedClosing,
        closingVariance: shift.closingVariance,
        totalSales: shift.totalSales,
        totalReturns: shift.totalReturns,
        netSales: shift.netSales,
        closedAt: shift.closedAt,
        status: shift.status,
      },
    });
  } catch (error) {
    console.error('Error closing shift:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to close shift',
    });
  }
};

/**
 * Get shift details
 * GET /api/v1/pos/shifts/:shiftId
 */
export const getShiftDetails = async (req, res) => {
  try {
    const { shiftId } = req.params;

    if (!shiftId) {
      return res.status(400).json({
        success: false,
        error: 'Shift ID is required',
      });
    }

    const shift = await POSShift.findById(shiftId)
      .populate('terminal', 'terminalId terminalName')
      .populate('operator', 'fullName username');

    if (!shift) {
      return res.status(404).json({
        success: false,
        error: 'Shift not found',
      });
    }

    res.status(200).json({
      success: true,
      data: shift,
    });
  } catch (error) {
    console.error('Error fetching shift details:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch shift details',
    });
  }
};

/**
 * Acknowledge opening variance
 * POST /api/v1/pos/shifts/:shiftId/acknowledge-opening
 */
export const acknowledgeOpening = async (req, res) => {
  try {
    const { shiftId } = req.params;

    if (!shiftId) {
      return res.status(400).json({
        success: false,
        error: 'Shift ID is required',
      });
    }

    const shift = await POSShift.findByIdAndUpdate(
      shiftId,
      { openingVarianceAcknowledged: true },
      { returnDocument: 'after' }
    );

    if (!shift) {
      return res.status(404).json({
        success: false,
        error: 'Shift not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Opening variance acknowledged',
      data: {
        shiftId: shift._id,
        openingVarianceAcknowledged: shift.openingVarianceAcknowledged,
      },
    });
  } catch (error) {
    console.error('Error acknowledging opening variance:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to acknowledge opening variance',
    });
  }
};

/**
 * Get current shift for terminal
 * GET /api/v1/pos/terminals/:terminalId/current-shift
 */
export const getCurrentShift = async (req, res) => {
  try {
    const { terminalId } = req.params;

    if (!terminalId) {
      return res.status(400).json({
        success: false,
        error: 'Terminal ID is required',
      });
    }

    const shift = await POSShift.findOne({
      terminalId,
      status: 'open',
      isDeleted: false,
    }).select('_id shiftNumber status openedAt operatorName');

    if (!shift) {
      return res.status(200).json({
        success: true,
        data: null,
        message: 'No active shift for this terminal',
      });
    }

    res.status(200).json({
      success: true,
      data: shift,
    });
  } catch (error) {
    console.error('Error fetching current shift:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch current shift',
    });
  }
};

/**
 * Get terminal status and daily summary
 * GET /api/v1/pos/terminals/:terminalId/status
 */
export const getTerminalStatus = async (req, res) => {
  try {
    const { terminalId } = req.params;

    if (!terminalId) {
      return res.status(400).json({
        success: false,
        error: 'Terminal ID is required',
      });
    }

    const terminal = await POSTerminal.findOne({ terminalId, isDeleted: false })
      .populate('currentShift', 'shiftNumber status openedAt operatorName transactionCount totalSales');

    if (!terminal) {
      return res.status(404).json({
        success: false,
        error: 'Terminal not found',
      });
    }

    res.status(200).json({
      success: true,
      data: {
        terminalId: terminal.terminalId,
        terminalName: terminal.terminalName,
        status: terminal.status,
        currentShift: terminal.currentShift,
        location: terminal.location,
      },
    });
  } catch (error) {
    console.error('Error fetching terminal status:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch terminal status',
    });
  }
};

/**
 * Get daily sales for terminal
 * GET /api/v1/pos/terminals/:terminalId/daily-sales
 */
export const getDailySales = async (req, res) => {
  try {
    const { terminalId } = req.params;

    if (!terminalId) {
      return res.status(400).json({
        success: false,
        error: 'Terminal ID is required',
      });
    }

    // Get shifts for today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const shifts = await POSShift.find({
      terminalId,
      openedAt: { $gte: today, $lt: tomorrow },
      isDeleted: false,
    }).select('shiftNumber totalSales totalReturns netSales transactionCount status');

    const totalSales = shifts.reduce((sum, shift) => sum + shift.totalSales, 0);
    const totalReturns = shifts.reduce((sum, shift) => sum + shift.totalReturns, 0);
    const netSales = shifts.reduce((sum, shift) => sum + shift.netSales, 0);
    const totalTransactions = shifts.reduce((sum, shift) => sum + shift.transactionCount, 0);

    res.status(200).json({
      success: true,
      data: {
        date: today.toISOString().split('T')[0],
        terminalId,
        totalSales,
        totalReturns,
        netSales,
        totalTransactions,
        shiftsCount: shifts.length,
        shifts: shifts,
      },
    });
  } catch (error) {
    console.error('Error fetching daily sales:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch daily sales',
    });
  }
};
