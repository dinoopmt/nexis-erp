import FinancialYear from '../../../Models/FinancialYear.js';

// Get all financial years
export const getFinancialYears = async (req, res) => {
  try {
    const financialYears = await FinancialYear.find({ isDeleted: false })
      .sort({ startDate: -1 });
    
    res.status(200).json({
      success: true,
      message: 'Financial years fetched successfully',
      data: financialYears
    });
  } catch (error) {
    console.error('Error fetching financial years:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching financial years',
      error: error.message
    });
  }
};

// Get financial year by ID
export const getFinancialYearById = async (req, res) => {
  try {
    const { id } = req.params;
    const financialYear = await FinancialYear.findById(id);

    if (!financialYear || financialYear.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Financial year not found'
      });
    }

    res.status(200).json({
      success: true,
      data: financialYear
    });
  } catch (error) {
    console.error('Error fetching financial year:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching financial year',
      error: error.message
    });
  }
};

// Create financial year
export const createFinancialYear = async (req, res) => {
  try {
    const { yearCode, yearName, startDate, endDate, status = 'OPEN', isCurrent = false } = req.body;

    // Validate required fields
    if (!yearCode || !yearName || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: yearCode, yearName, startDate, endDate'
      });
    }

    // Check if year code already exists
    const existingYear = await FinancialYear.findOne({ yearCode, isDeleted: false });
    if (existingYear) {
      return res.status(409).json({
        success: false,
        message: 'Financial year with this code already exists'
      });
    }

    // If setting as current, unset previous current year
    if (isCurrent) {
      await FinancialYear.updateMany(
        { isCurrent: true, isDeleted: false },
        { isCurrent: false }
      );
    }

    const financialYear = new FinancialYear({
      yearCode: yearCode.toUpperCase(),
      yearName,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      status,
      isCurrent,
      createdDate: new Date(),
      updatedDate: new Date()
    });

    await financialYear.save();
    console.log(`✅ Financial year created: ${yearCode}`);

    res.status(201).json({
      success: true,
      message: 'Financial year created successfully',
      data: financialYear
    });
  } catch (error) {
    console.error('Error creating financial year:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating financial year',
      error: error.message
    });
  }
};

// Update financial year
export const updateFinancialYear = async (req, res) => {
  try {
    const { id } = req.params;
    const { yearCode, yearName, startDate, endDate, status, isCurrent } = req.body;

    const financialYear = await FinancialYear.findById(id);

    if (!financialYear || financialYear.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Financial year not found'
      });
    }

    // If changing yearCode, check if new code already exists
    if (yearCode && yearCode !== financialYear.yearCode) {
      const existingYear = await FinancialYear.findOne({
        yearCode: yearCode.toUpperCase(),
        _id: { $ne: id },
        isDeleted: false
      });
      if (existingYear) {
        return res.status(409).json({
          success: false,
          message: 'Financial year with this code already exists'
        });
      }
    }

    // If setting as current, unset previous current year
    if (isCurrent && !financialYear.isCurrent) {
      await FinancialYear.updateMany(
        { isCurrent: true, isDeleted: false, _id: { $ne: id } },
        { isCurrent: false }
      );
    }

    // Update fields
    if (yearCode) financialYear.yearCode = yearCode.toUpperCase();
    if (yearName) financialYear.yearName = yearName;
    if (startDate) financialYear.startDate = new Date(startDate);
    if (endDate) financialYear.endDate = new Date(endDate);
    if (status) financialYear.status = status;
    if (isCurrent !== undefined) financialYear.isCurrent = isCurrent;

    financialYear.updatedDate = new Date();
    await financialYear.save();

    console.log(`✅ Financial year updated: ${id}`);

    res.status(200).json({
      success: true,
      message: 'Financial year updated successfully',
      data: financialYear
    });
  } catch (error) {
    console.error('Error updating financial year:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating financial year',
      error: error.message
    });
  }
};

// Set financial year as current
export const setCurrentFinancialYear = async (req, res) => {
  try {
    const { id } = req.params;

    const financialYear = await FinancialYear.findById(id);

    if (!financialYear || financialYear.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Financial year not found'
      });
    }

    // Unset all other current years
    await FinancialYear.updateMany(
      { isCurrent: true, isDeleted: false, _id: { $ne: id } },
      { isCurrent: false }
    );

    // Set this year as current
    financialYear.isCurrent = true;
    financialYear.updatedDate = new Date();
    await financialYear.save();

    console.log(`✅ Financial year set as current: ${id}`);

    res.status(200).json({
      success: true,
      message: 'Financial year set as current',
      data: financialYear
    });
  } catch (error) {
    console.error('Error setting current financial year:', error);
    res.status(500).json({
      success: false,
      message: 'Error setting current financial year',
      error: error.message
    });
  }
};

// Delete financial year (soft delete)
export const deleteFinancialYear = async (req, res) => {
  try {
    const { id } = req.params;

    const financialYear = await FinancialYear.findById(id);

    if (!financialYear || financialYear.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Financial year not found'
      });
    }

    // Don't allow deletion of current year
    if (financialYear.isCurrent) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete the current financial year'
      });
    }

    financialYear.isDeleted = true;
    financialYear.deletedAt = new Date();
    await financialYear.save();

    console.log(`✅ Financial year deleted: ${id}`);

    res.status(200).json({
      success: true,
      message: 'Financial year deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting financial year:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting financial year',
      error: error.message
    });
  }
};

// Get current financial year
export const getCurrentFinancialYear = async (req, res) => {
  try {
    const currentYear = await FinancialYear.findOne({
      isCurrent: true,
      isDeleted: false
    });

    if (!currentYear) {
      return res.status(404).json({
        success: false,
        message: 'No current financial year set'
      });
    }

    res.status(200).json({
      success: true,
      data: currentYear
    });
  } catch (error) {
    console.error('Error fetching current financial year:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching current financial year',
      error: error.message
    });
  }
};
