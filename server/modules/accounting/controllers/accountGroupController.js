import AccountGroup from "../../../Models/AccountGroup.js";

// Add Account Group
export const addAccountGroup = async (req, res) => {
  try {
    const { name, code, description, type, nature, level, parentGroupId, sortOrder } = req.body;

    if (!name || !code || !type || !nature) {
      return res.status(400).json({
        message: "Name, Code, Type, and Nature are required"
      });
    }

    const validTypes = ["ASSET", "LIABILITY", "EQUITY", "INCOME", "EXPENSE"];
    const validNatures = ["DEBIT", "CREDIT"];

    if (!validTypes.includes(type)) {
      return res.status(400).json({ message: "Invalid account type" });
    }
    if (!validNatures.includes(nature)) {
      return res.status(400).json({ message: "Invalid account nature" });
    }

    const existingGroup = await AccountGroup.findOne({
      $or: [{ code: code.toUpperCase() }, { name: name.toUpperCase() }],
      isDeleted: false
    });

    if (existingGroup) {
      return res.status(400).json({ message: "Account group already exists" });
    }

    const accountGroup = new AccountGroup({
      name: name.toUpperCase(),
      code: code.toUpperCase(),
      description,
      type,
      nature,
      level: level || 2,
      parentGroupId: parentGroupId || null,
      sortOrder: sortOrder || 0
    });

    await accountGroup.save();

    res.status(201).json({
      message: "Account group added successfully",
      accountGroup
    });
  } catch (err) {
    console.error("Error adding account group:", err);
    res.status(500).json({
      message: "Error adding account group",
      error: err.message
    });
  }
};

// Get All Account Groups
export const getAccountGroups = async (req, res) => {
  try {
    const { level, type, parentGroupId } = req.query;
    
    const filter = { isDeleted: false };
    
    // Filter by level if provided
    if (level) {
      filter.level = parseInt(level);
    }
    
    // Filter by type if provided
    if (type) {
      filter.type = type.toUpperCase();
    }
    
    // Filter by parent if provided
    if (parentGroupId) {
      filter.parentGroupId = parentGroupId;
    }
    
    const groups = await AccountGroup.find(filter)
      .populate('parentGroupId', 'name code type')
      .sort({ level: 1, sortOrder: 1, code: 1 });
    
    res.status(200).json({
      message: "Account groups fetched successfully",
      accountGroups: groups
    });
  } catch (err) {
    console.error("Error fetching account groups:", err);
    res.status(500).json({
      message: "Error fetching account groups",
      error: err.message
    });
  }
};

// Get Account Group by ID
export const getAccountGroupById = async (req, res) => {
  try {
    const { id } = req.params;

    const accountGroup = await AccountGroup.findById(id);

    if (!accountGroup || accountGroup.isDeleted) {
      return res.status(404).json({ message: "Account group not found" });
    }

    res.status(200).json({
      message: "Account group fetched successfully",
      accountGroup
    });
  } catch (err) {
    console.error("Error fetching account group:", err);
    res.status(500).json({
      message: "Error fetching account group",
      error: err.message
    });
  }
};

// Update Account Group
export const updateAccountGroup = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, code, description, type, nature, isActive } = req.body;

    const accountGroup = await AccountGroup.findById(id);

    if (!accountGroup || accountGroup.isDeleted) {
      return res.status(404).json({ message: "Account group not found" });
    }

    if (name) accountGroup.name = name.toUpperCase();
    if (code) {
      const existingCode = await AccountGroup.findOne({
        code: code.toUpperCase(),
        _id: { $ne: id },
        isDeleted: false
      });
      if (existingCode) {
        return res.status(400).json({ message: "Account code already exists" });
      }
      accountGroup.code = code.toUpperCase();
    }
    if (description) accountGroup.description = description;
    if (type) accountGroup.type = type;
    if (nature) accountGroup.nature = nature;
    if (isActive !== undefined) accountGroup.isActive = isActive;

    accountGroup.updatedDate = Date.now();
    await accountGroup.save();

    res.status(200).json({
      message: "Account group updated successfully",
      accountGroup
    });
  } catch (err) {
    console.error("Error updating account group:", err);
    res.status(500).json({
      message: "Error updating account group",
      error: err.message
    });
  }
};

// Delete Account Group (Soft Delete)
export const deleteAccountGroup = async (req, res) => {
  try {
    const { id } = req.params;

    const accountGroup = await AccountGroup.findById(id);

    if (!accountGroup || accountGroup.isDeleted) {
      return res.status(404).json({ message: "Account group not found" });
    }

    accountGroup.isDeleted = true;
    accountGroup.deletedAt = Date.now();
    await accountGroup.save();

    res.status(200).json({
      message: "Account group deleted successfully"
    });
  } catch (err) {
    console.error("Error deleting account group:", err);
    res.status(500).json({
      message: "Error deleting account group",
      error: err.message
    });
  }
};

// Get Groups by Type
export const getGroupsByType = async (req, res) => {
  try {
    const { type } = req.params;

    const validTypes = ["ASSET", "LIABILITY", "EQUITY", "INCOME", "EXPENSE"];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ message: "Invalid account type" });
    }

    const groups = await AccountGroup.find({ type, isDeleted: false }).sort({ code: 1 });

    res.status(200).json({
      message: "Account groups fetched successfully",
      accountGroups: groups
    });
  } catch (err) {
    console.error("Error fetching account groups:", err);
    res.status(500).json({
      message: "Error fetching account groups",
      error: err.message
    });
  }
};
