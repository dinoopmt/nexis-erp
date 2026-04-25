import User from "../../../Models/User.js";
import Role from "../../../Models/Role.js";
import bcrypt from "bcryptjs";

// Get all users
export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().populate("role", "name description");
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: "Error fetching users", error: error.message });
  }
};

// Get single user
export const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).populate("role", "name description");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: "Error fetching user", error: error.message });
  }
};

// Create new user
export const createUser = async (req, res) => {
  try {
    const { username, email, password, fullName, phone, role, status } = req.body;

    // Validate required fields
    if (!username || !email || !password || !fullName || !role) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      return res.status(400).json({ message: "User with this username or email already exists" });
    }

    // Verify role exists
    const roleExists = await Role.findById(role);
    if (!roleExists) {
      return res.status(400).json({ message: "Role does not exist" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const newUser = new User({
      username,
      email,
      password: hashedPassword,
      fullName,
      phone,
      role,
      status: status || "active",
    });

    const savedUser = await newUser.save();
    const populatedUser = await savedUser.populate("role", "name description");

    // Update role userCount
    await Role.findByIdAndUpdate(role, { $inc: { userCount: 1 } });

    res.status(201).json(populatedUser);
  } catch (error) {
    res.status(500).json({ message: "Error creating user", error: error.message });
  }
};

// Update user
export const updateUser = async (req, res) => {
  try {
    const { username, email, password, fullName, phone, role, status } = req.body;
    const userId = req.params.id;

    // Get current user to check role change
    const currentUser = await User.findById(userId);
    if (!currentUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // Build update object
    const updateData = {
      ...(username && { username }),
      ...(email && { email }),
      ...(fullName && { fullName }),
      ...(phone && { phone }),
      ...(status && { status }),
    };

    // Hash new password if provided
    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    // Handle role change
    if (role && String(role) !== String(currentUser.role)) {
      updateData.role = role;

      // Verify new role exists
      const roleExists = await Role.findById(role);
      if (!roleExists) {
        return res.status(400).json({ message: "New role does not exist" });
      }

      // Update role counts
      await Role.findByIdAndUpdate(currentUser.role, { $inc: { userCount: -1 } });
      await Role.findByIdAndUpdate(role, { $inc: { userCount: 1 } });
    }

    // Update user
    const updatedUser = await User.findByIdAndUpdate(userId, updateData, { returnDocument: 'after' }).populate(
      "role",
      "name description"
    );

    res.status(200).json(updatedUser);
  } catch (error) {
    res.status(500).json({ message: "Error updating user", error: error.message });
  }
};

// Delete user
export const deleteUser = async (req, res) => {
  try {
    const userId = req.params.id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Update role userCount
    if (user.role) {
      await Role.findByIdAndUpdate(user.role, { $inc: { userCount: -1 } });
    }

    // Delete user
    await User.findByIdAndDelete(userId);

    res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting user", error: error.message });
  }
};

// Update last login
export const updateLastLogin = async (req, res) => {
  try {
    const userId = req.params.id;

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { lastLogin: new Date() },
      { returnDocument: 'after' }
    ).populate("role", "name description");

    res.status(200).json(updatedUser);
  } catch (error) {
    res.status(500).json({ message: "Error updating last login", error: error.message });
  }
};
