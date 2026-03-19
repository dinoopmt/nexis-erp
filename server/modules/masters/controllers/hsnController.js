import HSNMaster from '../../../Models/HSNMaster.js';
import Product from '../../../Models/AddProduct.js';

/**
 * HSN Controller - Manage HSN Master data and validations
 */

// ✅ GET: Get all HSN codes with filters
export const getHSNList = async (req, res) => {
  try {
    const { category, gstRate, isActive, search, limit = 100, page = 1 } = req.query;

    // Build filter
    let filter = {};
    
    if (category) {
      filter.category = category;
    }
    
    if (gstRate !== undefined) {
      filter.gstRate = parseInt(gstRate);
    }
    
    if (isActive !== undefined) {
      filter.isActive = isActive === 'true';
    } else {
      filter.isActive = true;  // Default: only active
      filter.repealed = false;
    }

    // Text search
    if (search) {
      filter.$text = { $search: search };
    }

    // Pagination
    const skip = (page - 1) * limit;

    // Query
    const hsnList = await HSNMaster.find(filter)
      .select('code description category gstRate isActive repealed applicableFrom')
      .limit(parseInt(limit))
      .skip(skip)
      .sort({ code: 1 });

    const total = await HSNMaster.countDocuments(filter);

    res.json({
      success: true,
      data: hsnList,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
        limit: parseInt(limit)
      }
    });

  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// ✅ GET: Get single HSN by code
export const getHSNByCode = async (req, res) => {
  try {
    const { code } = req.params;

    const hsn = await HSNMaster.findByCode(code);

    if (!hsn) {
      return res.status(404).json({
        success: false,
        error: 'HSN code not found'
      });
    }

    res.json({
      success: true,
      data: hsn
    });

  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// ✅ GET: Get HSN codes by category
export const getHSNByCategory = async (req, res) => {
  try {
    const { category } = req.params;

    const hsnList = await HSNMaster.findByCategory(category);

    if (hsnList.length === 0) {
      return res.status(404).json({
        success: false,
        error: `No HSN codes found for category: ${category}`
      });
    }

    res.json({
      success: true,
      category,
      data: hsnList,
      count: hsnList.length
    });

  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// ✅ GET: Search HSN by description
export const searchHSN = async (req, res) => {
  try {
    const { query } = req.query;

    if (!query || query.trim().length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Search query must be at least 2 characters'
      });
    }

    const hsnList = await HSNMaster.searchByDescription(query);

    res.json({
      success: true,
      query,
      data: hsnList,
      count: hsnList.length
    });

  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// ✅ GET: Get HSN statistics
export const getHSNStats = async (req, res) => {
  try {
    const stats = await HSNMaster.aggregate([
      {
        $group: {
          _id: '$gstRate',
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const categories = await HSNMaster.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    const total = await HSNMaster.countDocuments();
    const active = await HSNMaster.countDocuments({ isActive: true, repealed: false });
    const repealed = await HSNMaster.countDocuments({ repealed: true });

    res.json({
      success: true,
      statistics: {
        total,
        active,
        repealed,
        byGSTRate: stats,
        byCategory: categories
      }
    });

  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// ✅ GET: Get all unique categories
export const getHSNCategories = async (req, res) => {
  try {
    const categories = await HSNMaster.distinct('category');

    res.json({
      success: true,
      data: categories.sort()
    });

  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// ✅ POST: Create new HSN
export const createHSN = async (req, res) => {
  try {
    const { code, description, category, gstRate, ...otherData } = req.body;

    // Validate required fields
    if (!code || !description || !category || gstRate === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Code, description, category, and gstRate are required'
      });
    }

    // Check if HSN already exists
    const existing = await HSNMaster.findByCode(code);
    if (existing) {
      return res.status(400).json({
        success: false,
        error: `HSN code ${code} already exists`
      });
    }

    // Extract chapter, heading, subheading from code
    if (!/^\d{6}$/.test(code.toString())) {
      return res.status(400).json({
        success: false,
        error: 'HSN code must be exactly 6 digits'
      });
    }

    const chapter = parseInt(code.substring(0, 2));
    const heading = parseInt(code.substring(2, 4));
    const subHeading = parseInt(code.substring(4, 6));

    // Create new HSN
    const newHSN = new HSNMaster({
      code,
      chapter,
      heading,
      subHeading,
      description,
      category,
      gstRate,
      ...otherData
    });

    await newHSN.save();

    res.status(201).json({
      success: true,
      message: 'HSN code created successfully',
      data: newHSN
    });

  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// ✅ PUT: Update HSN
export const updateHSN = async (req, res) => {
  try {
    const { code } = req.params;
    const updates = req.body;

    // Prevent changing code
    if (updates.code) {
      return res.status(400).json({
        success: false,
        error: 'HSN code cannot be changed'
      });
    }

    // Find and update
    const hsn = await HSNMaster.findByIdAndUpdate(
      await HSNMaster.findByCode(code),
      updates,
      { new: true, runValidators: true }
    );

    if (!hsn) {
      return res.status(404).json({
        success: false,
        error: 'HSN code not found'
      });
    }

    res.json({
      success: true,
      message: 'HSN code updated successfully',
      data: hsn
    });

  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// ✅ DELETE: Mark HSN as repealed (soft delete)
export const repealHSN = async (req, res) => {
  try {
    const { code } = req.params;
    const { replacementCode, reason } = req.body;

    const hsn = await HSNMaster.findOne({ code });

    if (!hsn) {
      return res.status(404).json({
        success: false,
        error: 'HSN code not found'
      });
    }

    // Update HSN
    hsn.repealed = true;
    hsn.repealedDate = new Date();
    hsn.replacementHSN = replacementCode || null;
    hsn.remarks = reason || 'Superseded by new HSN';
    hsn.isActive = false;

    await hsn.save();

    res.json({
      success: true,
      message: 'HSN code marked as repealed',
      data: hsn
    });

  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// ✅ VALIDATION: Validate HSN code
export const validateHSN = async (req, res) => {
  try {
    const { code } = req.params;

    // Format check
    if (!/^\d{6}$/.test(code.toString())) {
      return res.json({
        success: true,
        valid: false,
        code,
        error: 'HSN code must be exactly 6 digits'
      });
    }

    // Check if exists
    const hsn = await HSNMaster.findByCode(code);

    if (!hsn) {
      return res.json({
        success: true,
        valid: false,
        code,
        error: 'HSN code not found in master database'
      });
    }

    // Check if active
    if (!hsn.isValidForUse()) {
      return res.json({
        success: true,
        valid: false,
        code,
        error: 'HSN code is no longer active',
        replacement: hsn.replacementHSN,
        repealedDate: hsn.repealedDate
      });
    }

    res.json({
      success: true,
      valid: true,
      code,
      hsn: {
        code: hsn.code,
        description: hsn.description,
        category: hsn.category,
        gstRate: hsn.gstRate,
        isActive: hsn.isActive
      }
    });

  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// ✅ GET: Get HSN with product count
export const getHSNWithProductCount = async (req, res) => {
  try {
    const hsnWithCount = await HSNMaster.aggregate([
      {
        $lookup: {
          from: 'products',
          localField: 'code',
          foreignField: 'hsn',
          as: 'products'
        }
      },
      {
        $project: {
          code: 1,
          description: 1,
          category: 1,
          gstRate: 1,
          productCount: { $size: '$products' }
        }
      },
      { $sort: { code: 1 } }
    ]);

    res.json({
      success: true,
      data: hsnWithCount
    });

  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// ✅ GET: Get HSN for dropdown (minimal info)
export const getHSNDropdown = async (req, res) => {
  try {
    const { category } = req.query;

    let filter = { isActive: true, repealed: false };
    
    if (category) {
      filter.category = category;
    }

    const hsnList = await HSNMaster.find(filter)
      .select('code description gstRate')
      .sort({ code: 1 })
      .limit(1000);

    const formatted = hsnList.map(hsn => ({
      value: hsn.code,
      label: `${hsn.code} - ${hsn.description} (${hsn.gstRate}% GST)`,
      code: hsn.code,
      description: hsn.description,
      gstRate: hsn.gstRate
    }));

    res.json({
      success: true,
      data: formatted
    });

  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};
