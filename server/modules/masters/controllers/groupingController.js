import Grouping from "../../../Models/Grouping.js";

// ================= ADD GROUPING =================
export const addGrouping = async (req, res) => {
  try {
    const { name, description, parentId } = req.body;

    if (!name || name.trim() === "") {
      return res.status(400).json({
        message: "Grouping name is required",
      });
    }

    const uppercaseName = name.toUpperCase();

    // Check if grouping already exists
    const existingGrouping = await Grouping.findOne({
      name: uppercaseName,
      isDeleted: false,
    });

    if (existingGrouping) {
      return res.status(400).json({
        message: "Grouping with this name already exists",
      });
    }

    // Auto-calculate level based on parentId
    let level = "1";
    if (parentId) {
      const parent = await Grouping.findById(parentId);
      if (!parent || parent.isDeleted) {
        return res.status(400).json({
          message: "Invalid parent grouping",
        });
      }
      // Calculate level as parent's level + 1
      level = String(parseInt(parent.level) + 1);
    }

    const grouping = new Grouping({
      name: uppercaseName,
      description,
      parentId: parentId || null,
      level,
    });

    await grouping.save();
    await grouping.populate("parentId", "name level");

    res.status(201).json({
      message: "Grouping added successfully",
      grouping,
    });
  } catch (err) {
    console.error("Error adding grouping:", err);
    res.status(500).json({
      message: "Error adding grouping",
      error: err.message,
    });
  }
};

// ================= GET ALL GROUPINGS =================
export const getGroupings = async (req, res) => {
  try {
    const groupings = await Grouping.find({ isDeleted: false })
      .populate("parentId", "name level")
      .sort({ level: 1, name: 1 });

    // Format hierarchically
    const hierarchy = {
      departments: [],
      subdepartments: {},
    };

    groupings.forEach((g) => {
      if (!g.parentId) {
        hierarchy.departments.push(g);
      } else {
        const parentId = g.parentId._id.toString();
        if (!hierarchy.subdepartments[parentId]) {
          hierarchy.subdepartments[parentId] = [];
        }
        hierarchy.subdepartments[parentId].push(g);
      }
    });

    res.json({
      groupings,
      hierarchy,
    });
  } catch (err) {
    console.error("Error fetching groupings:", err);
    res.status(500).json({
      message: "Error fetching groupings",
      error: err.message,
    });
  }
};

// ================= GET GROUPING BY ID =================
export const getGroupingById = async (req, res) => {
  try {
    const grouping = await Grouping.findById(req.params.id).populate(
      "parentId",
      "name level"
    );

    if (!grouping || grouping.isDeleted) {
      return res.status(404).json({
        message: "Grouping not found",
      });
    }

    res.json(grouping);
  } catch (err) {
    console.error("Error fetching grouping:", err);
    res.status(500).json({
      message: "Error fetching grouping",
      error: err.message,
    });
  }
};

// ================= UPDATE GROUPING =================
export const updateGrouping = async (req, res) => {
  try {
    const { name, description, parentId } = req.body;

    const grouping = await Grouping.findById(req.params.id);

    if (!grouping || grouping.isDeleted) {
      return res.status(404).json({
        message: "Grouping not found",
      });
    }

    // Type validation: check that name is a string before calling toUpperCase()
    if (name && typeof name !== "string") {
      return res.status(400).json({
        message: "Grouping name must be a string",
      });
    }

    // Check if new name already exists
    if (name && name.toUpperCase() !== grouping.name) {
      const existingGrouping = await Grouping.findOne({
        name: name.toUpperCase(),
        isDeleted: false,
        _id: { $ne: req.params.id },
      });

      if (existingGrouping) {
        return res.status(400).json({
          message: "Grouping with this name already exists",
        });
      }
    }

    // Update name and description
    if (name) {
      grouping.name = name.toUpperCase();
    }
    if (description !== undefined) {
      grouping.description = description;
    }

    // Handle parent and auto-calculate level
    if (parentId !== undefined && parentId !== grouping.parentId?.toString()) {
      if (parentId) {
        const parent = await Grouping.findById(parentId);
        if (!parent || parent.isDeleted) {
          return res.status(400).json({
            message: "Invalid parent grouping",
          });
        }
        // Prevent circular reference
        if (parentId === req.params.id) {
          return res.status(400).json({
            message: "Cannot set grouping as its own parent",
          });
        }
        // Auto-calculate level as parent's level + 1
        grouping.level = String(parseInt(parent.level) + 1);
      } else {
        // No parent: level = 1 (department)
        grouping.level = "1";
      }
      grouping.parentId = parentId || null;
    }

    grouping.updatedAt = new Date();
    await grouping.save();
    await grouping.populate("parentId", "name level");

    res.json({
      message: "Grouping updated successfully",
      grouping,
    });
  } catch (err) {
    console.error("Error updating grouping:", err);
    res.status(500).json({
      message: "Error updating grouping",
      error: err.message,
    });
  }
};

// ================= DELETE GROUPING (Soft Delete) =================
export const deleteGrouping = async (req, res) => {
  try {
    const grouping = await Grouping.findByIdAndUpdate(
      req.params.id,
      {
        isDeleted: true,
        deletedAt: new Date(),
      },
      { returnDocument: 'after' }
    );

    if (!grouping) {
      return res.status(404).json({
        message: "Grouping not found",
      });
    }

    res.json({
      message: "Grouping deleted successfully",
      grouping,
    });
  } catch (err) {
    console.error("Error deleting grouping:", err);
    res.status(500).json({
      message: "Error deleting grouping",
      error: err.message,
    });
  }
};

// ================= GET DEPARTMENT (Level 0) =================
export const getDepartments = async (req, res) => {
  try {
    const departments = await Grouping.find({
      isDeleted: false,
      parentId: null,
    }).sort({ name: 1 });

    res.json(departments);
  } catch (err) {
    console.error("Error fetching departments:", err);
    res.status(500).json({
      message: "Error fetching departments",
      error: err.message,
    });
  }
};

// ================= GET SUBDEPARTMENTS BY PARENT =================
export const getSubDepartments = async (req, res) => {
  try {
    const subdepartments = await Grouping.find({
      isDeleted: false,
      parentId: req.params.parentId,
    }).sort({ name: 1 });

    res.json(subdepartments);
  } catch (err) {
    console.error("Error fetching subdepartments:", err);
    res.status(500).json({
      message: "Error fetching subdepartments",
      error: err.message,
    });
  }
};
