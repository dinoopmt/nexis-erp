import FinancialYear from "../../../Models/FinancialYear.js";

// Create a new Financial Year
export const createFinancialYear = async (req, res) => {
  try {
    const { yearCode, yearName, startDate, endDate, isCurrent, remarks } = req.body;

    // Validate required fields
    if (!yearCode || !yearName || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: "Year code, year name, start date and end date are required"
      });
    }

    // Check if year code already exists
    const existingYear = await FinancialYear.findOne({ yearCode, isDeleted: false });
    if (existingYear) {
      return res.status(400).json({
        success: false,
        message: "Financial year with this code already exists"
      });
    }

    // Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (end <= start) {
      return res.status(400).json({
        success: false,
        message: "End date must be after start date"
      });
    }

    // Check for overlapping financial years
    const overlapping = await FinancialYear.findOne({
      isDeleted: false,
      $or: [
        { startDate: { $lte: end }, endDate: { $gte: start } }
      ]
    });
    if (overlapping) {
      return res.status(400).json({
        success: false,
        message: `Date range overlaps with existing financial year: ${overlapping.yearCode}`
      });
    }

    // Get previous financial year
    const previousYear = await FinancialYear.findOne({
      endDate: { $lt: start },
      isDeleted: false
    }).sort({ endDate: -1 });

    const financialYear = new FinancialYear({
      yearCode,
      yearName,
      startDate: start,
      endDate: end,
      isCurrent: isCurrent || false,
      previousYearId: previousYear?._id || null,
      remarks: remarks || ""
    });

    const savedYear = await financialYear.save();

    res.status(201).json({
      success: true,
      message: "Financial year created successfully",
      data: savedYear
    });
  } catch (error) {
    console.error("Error creating financial year:", error);
    res.status(500).json({
      success: false,
      message: "Error creating financial year",
      error: error.message
    });
  }
};

// Get all Financial Years
export const getFinancialYears = async (req, res) => {
  try {
    const { status, includeDeleted } = req.query;
    
    const filter = {};
    if (!includeDeleted) filter.isDeleted = false;
    if (status) filter.status = status;

    const years = await FinancialYear.find(filter)
      .populate("previousYearId", "yearCode yearName")
      .sort({ startDate: -1 });

    res.status(200).json({
      success: true,
      count: years.length,
      data: years
    });
  } catch (error) {
    console.error("Error fetching financial years:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching financial years",
      error: error.message
    });
  }
};

// Get current Financial Year
export const getCurrentFinancialYear = async (req, res) => {
  try {
    const currentYear = await FinancialYear.getCurrentYear();
    
    if (!currentYear) {
      return res.status(404).json({
        success: false,
        message: "No current financial year set"
      });
    }

    res.status(200).json({
      success: true,
      data: currentYear
    });
  } catch (error) {
    console.error("Error fetching current financial year:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching current financial year",
      error: error.message
    });
  }
};

// Get Financial Year by ID
export const getFinancialYearById = async (req, res) => {
  try {
    const { id } = req.params;

    const year = await FinancialYear.findById(id)
      .populate("previousYearId", "yearCode yearName");

    if (!year || year.isDeleted) {
      return res.status(404).json({
        success: false,
        message: "Financial year not found"
      });
    }

    res.status(200).json({
      success: true,
      data: year
    });
  } catch (error) {
    console.error("Error fetching financial year:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching financial year",
      error: error.message
    });
  }
};

// Get Financial Year for a specific date
export const getFinancialYearForDate = async (req, res) => {
  try {
    const { date } = req.params;

    const year = await FinancialYear.getYearForDate(new Date(date));

    if (!year) {
      return res.status(404).json({
        success: false,
        message: "No financial year found for the specified date"
      });
    }

    res.status(200).json({
      success: true,
      data: year
    });
  } catch (error) {
    console.error("Error fetching financial year for date:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching financial year for date",
      error: error.message
    });
  }
};

// Update Financial Year
export const updateFinancialYear = async (req, res) => {
  try {
    const { id } = req.params;
    const { yearName, startDate, endDate, remarks, allowPosting } = req.body;

    const year = await FinancialYear.findById(id);
    if (!year || year.isDeleted) {
      return res.status(404).json({
        success: false,
        message: "Financial year not found"
      });
    }

    // Cannot modify closed/locked years
    if (year.status === "CLOSED" || year.status === "LOCKED") {
      return res.status(400).json({
        success: false,
        message: "Cannot modify a closed or locked financial year"
      });
    }

    // Update allowed fields
    if (yearName) year.yearName = yearName;
    if (remarks !== undefined) year.remarks = remarks;
    if (allowPosting !== undefined) year.allowPosting = allowPosting;

    // Only allow date changes if no transactions exist
    if (startDate || endDate) {
      // TODO: Check if transactions exist in this year before allowing date changes
      if (startDate) year.startDate = new Date(startDate);
      if (endDate) year.endDate = new Date(endDate);
    }

    const updatedYear = await year.save();

    res.status(200).json({
      success: true,
      message: "Financial year updated successfully",
      data: updatedYear
    });
  } catch (error) {
    console.error("Error updating financial year:", error);
    res.status(500).json({
      success: false,
      message: "Error updating financial year",
      error: error.message
    });
  }
};

// Set as Current Financial Year
export const setCurrentFinancialYear = async (req, res) => {
  try {
    const { id } = req.params;

    const year = await FinancialYear.findById(id);
    if (!year || year.isDeleted) {
      return res.status(404).json({
        success: false,
        message: "Financial year not found"
      });
    }

    if (year.status !== "OPEN") {
      return res.status(400).json({
        success: false,
        message: "Only open financial years can be set as current"
      });
    }

    year.isCurrent = true;
    await year.save(); // Pre-save hook will unset other current years

    res.status(200).json({
      success: true,
      message: `${year.yearCode} is now the current financial year`,
      data: year
    });
  } catch (error) {
    console.error("Error setting current financial year:", error);
    res.status(500).json({
      success: false,
      message: "Error setting current financial year",
      error: error.message
    });
  }
};

// Close Financial Year
export const closeFinancialYear = async (req, res) => {
  try {
    const { id } = req.params;
    const { closedBy } = req.body;

    const year = await FinancialYear.findById(id);
    if (!year || year.isDeleted) {
      return res.status(404).json({
        success: false,
        message: "Financial year not found"
      });
    }

    if (year.status !== "OPEN") {
      return res.status(400).json({
        success: false,
        message: "Financial year is already closed or locked"
      });
    }

    // TODO: Add checks for:
    // 1. All entries are posted
    // 2. Trial balance matches
    // 3. P&L has been closed to retained earnings

    year.status = "CLOSED";
    year.allowPosting = false;
    year.closingDate = new Date();
    year.closedBy = closedBy || "System";
    year.isCurrent = false;

    const closedYear = await year.save();

    res.status(200).json({
      success: true,
      message: `Financial year ${year.yearCode} has been closed`,
      data: closedYear
    });
  } catch (error) {
    console.error("Error closing financial year:", error);
    res.status(500).json({
      success: false,
      message: "Error closing financial year",
      error: error.message
    });
  }
};

// Lock Financial Year (permanent - prevents reopening)
export const lockFinancialYear = async (req, res) => {
  try {
    const { id } = req.params;

    const year = await FinancialYear.findById(id);
    if (!year || year.isDeleted) {
      return res.status(404).json({
        success: false,
        message: "Financial year not found"
      });
    }

    if (year.status !== "CLOSED") {
      return res.status(400).json({
        success: false,
        message: "Only closed financial years can be locked"
      });
    }

    year.status = "LOCKED";
    const lockedYear = await year.save();

    res.status(200).json({
      success: true,
      message: `Financial year ${year.yearCode} has been permanently locked`,
      data: lockedYear
    });
  } catch (error) {
    console.error("Error locking financial year:", error);
    res.status(500).json({
      success: false,
      message: "Error locking financial year",
      error: error.message
    });
  }
};

// Reopen Financial Year (only if not locked)
export const reopenFinancialYear = async (req, res) => {
  try {
    const { id } = req.params;

    const year = await FinancialYear.findById(id);
    if (!year || year.isDeleted) {
      return res.status(404).json({
        success: false,
        message: "Financial year not found"
      });
    }

    if (year.status === "LOCKED") {
      return res.status(400).json({
        success: false,
        message: "Locked financial years cannot be reopened"
      });
    }

    if (year.status === "OPEN") {
      return res.status(400).json({
        success: false,
        message: "Financial year is already open"
      });
    }

    year.status = "OPEN";
    year.allowPosting = true;
    year.closingDate = null;
    year.closedBy = "";

    const reopenedYear = await year.save();

    res.status(200).json({
      success: true,
      message: `Financial year ${year.yearCode} has been reopened`,
      data: reopenedYear
    });
  } catch (error) {
    console.error("Error reopening financial year:", error);
    res.status(500).json({
      success: false,
      message: "Error reopening financial year",
      error: error.message
    });
  }
};

// Delete Financial Year (soft delete)
export const deleteFinancialYear = async (req, res) => {
  try {
    const { id } = req.params;

    const year = await FinancialYear.findById(id);
    if (!year || year.isDeleted) {
      return res.status(404).json({
        success: false,
        message: "Financial year not found"
      });
    }

    // TODO: Check if any transactions exist in this year
    // If transactions exist, prevent deletion

    year.isDeleted = true;
    year.deletedAt = new Date();
    year.isCurrent = false;
    await year.save();

    res.status(200).json({
      success: true,
      message: "Financial year deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting financial year:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting financial year",
      error: error.message
    });
  }
};

// Validate if posting is allowed for a date
export const validatePostingDate = async (req, res) => {
  try {
    const { date } = req.body;

    if (!date) {
      return res.status(400).json({
        success: false,
        message: "Date is required"
      });
    }

    const checkDate = new Date(date);
    const year = await FinancialYear.getYearForDate(checkDate);

    if (!year) {
      return res.status(400).json({
        success: false,
        allowed: false,
        message: "No financial year exists for the specified date"
      });
    }

    if (year.status !== "OPEN") {
      return res.status(400).json({
        success: false,
        allowed: false,
        message: `Financial year ${year.yearCode} is ${year.status.toLowerCase()}`
      });
    }

    if (!year.allowPosting) {
      return res.status(400).json({
        success: false,
        allowed: false,
        message: `Posting is not allowed in financial year ${year.yearCode}`
      });
    }

    res.status(200).json({
      success: true,
      allowed: true,
      financialYear: year,
      message: "Posting is allowed"
    });
  } catch (error) {
    console.error("Error validating posting date:", error);
    res.status(500).json({
      success: false,
      message: "Error validating posting date",
      error: error.message
    });
  }
};
