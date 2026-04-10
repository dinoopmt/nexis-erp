import Role from "../../../Models/Role.js";
import User from "../../../Models/User.js";

// Get all roles
export const getAllRoles = async (req, res) => {
  try {
    const roles = await Role.find();
    res.status(200).json(roles);
  } catch (error) {
    res.status(500).json({ message: "Error fetching roles", error: error.message });
  }
};

// Get single role
export const getRoleById = async (req, res) => {
  try {
    const role = await Role.findById(req.params.id);
    if (!role) {
      return res.status(404).json({ message: "Role not found" });
    }
    const userCount = await User.countDocuments({ role: req.params.id });
    role.userCount = userCount;
    res.status(200).json(role);
  } catch (error) {
    res.status(500).json({ message: "Error fetching role", error: error.message });
  }
};

// Create new role
export const createRole = async (req, res) => {
  try {
    const { name, description, permissions } = req.body;

    // Validate required fields
    if (!name) {
      return res.status(400).json({ message: "Role name is required" });
    }

    if (!permissions || permissions.length === 0) {
      return res.status(400).json({ message: "At least one permission is required" });
    }

    // Check if role already exists
    const existingRole = await Role.findOne({ name });
    if (existingRole) {
      return res.status(400).json({ message: "Role with this name already exists" });
    }

    // Create new role
    const newRole = new Role({
      name,
      description: description || "",
      permissions,
      userCount: 0,
    });

    const savedRole = await newRole.save();
    res.status(201).json(savedRole);
  } catch (error) {
    res.status(500).json({ message: "Error creating role", error: error.message });
  }
};

// Update role
export const updateRole = async (req, res) => {
  try {
    const { name, description, permissions } = req.body;
    const roleId = req.params.id;

    // Validate required fields
    if (!name) {
      return res.status(400).json({ message: "Role name is required" });
    }

    if (!permissions || permissions.length === 0) {
      return res.status(400).json({ message: "At least one permission is required" });
    }

    // Check if role exists
    const role = await Role.findById(roleId);
    if (!role) {
      return res.status(404).json({ message: "Role not found" });
    }

    // Build update object
    const updateData = {
      name,
      description: description || "",
      permissions,
    };

    // Update role
    const updatedRole = await Role.findByIdAndUpdate(roleId, updateData, { returnDocument: 'after' });

    res.status(200).json(updatedRole);
  } catch (error) {
    res.status(500).json({ message: "Error updating role", error: error.message });
  }
};

// Delete role
export const deleteRole = async (req, res) => {
  try {
    const roleId = req.params.id;

    const role = await Role.findById(roleId);
    if (!role) {
      return res.status(404).json({ message: "Role not found" });
    }

    // Check if any users are assigned to this role
    const userCount = await User.countDocuments({ role: roleId });
    if (userCount > 0) {
      return res.status(400).json({
        message: `Cannot delete role. ${userCount} user(s) are assigned to this role.`,
      });
    }

    // Delete role
    await Role.findByIdAndDelete(roleId);

    res.status(200).json({ message: "Role deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting role", error: error.message });
  }
};

// Get available permissions
export const getAvailablePermissions = async (req, res) => {
  try {
    const permissions = {
      "User Management": [
        { id: "MANAGE_USERS", label: "Manage Users" },
        { id: "MANAGE_ROLES", label: "Manage Roles" },
      ],
      "Sales Module": [
        { id: "VIEW_SALES", label: "View Sales" },
        { id: "CREATE_SALES_INVOICE", label: "Create Sales Invoice" },
        { id: "MANAGE_SALES_RETURN", label: "Manage Sales Return" },
      ],
      "Inventory Module": [
        { id: "VIEW_INVENTORY", label: "View Inventory" },
        { id: "MANAGE_PRODUCTS", label: "Manage Products" },
        { id: "MANAGE_WAREHOUSE", label: "Manage Warehouse" },
      ],
      "Accounts Module": [
        { id: "VIEW_ACCOUNTS", label: "View Accounts" },
        { id: "CREATE_JOURNAL_ENTRY", label: "Create Journal Entry" },
        { id: "MANAGE_CHART_ACCOUNTS", label: "Manage Chart of Accounts" },
      ],
      "Reports & Settings": [
        { id: "VIEW_REPORTS", label: "View Reports" },
        { id: "MANAGE_COMPANY_SETTINGS", label: "Manage Company Settings" },
        { id: "MANAGE_SYSTEM_SETTINGS", label: "Manage System Settings" },
      ],
    };

    res.status(200).json(permissions);
  } catch (error) {
    res.status(500).json({ message: "Error fetching permissions", error: error.message });
  }
};
