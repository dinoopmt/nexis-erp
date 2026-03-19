import ActivityLog from "../../../Models/ActivityLog.js";

// Get all activity logs with filtering
export const getAllActivityLogs = async (req, res) => {
  try {
    const { module, action, userId, startDate, endDate, limit = 50, skip = 0 } = req.query;

    const filter = {};

    if (module) filter.module = module;
    if (action) filter.action = action;
    if (userId) filter.userId = userId;

    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) filter.timestamp.$gte = new Date(startDate);
      if (endDate) filter.timestamp.$lte = new Date(endDate);
    }

    const logs = await ActivityLog.find(filter)
      .populate("userId", "username fullName email")
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));

    const total = await ActivityLog.countDocuments(filter);

    res.status(200).json({
      logs,
      total,
      limit: parseInt(limit),
      skip: parseInt(skip),
    });
  } catch (error) {
    res.status(500).json({ message: "Error fetching activity logs", error: error.message });
  }
};

// Get user activity history
export const getUserActivityHistory = async (req, res) => {
  try {
    const userId = req.params.userId;
    const { limit = 30, skip = 0 } = req.query;

    const logs = await ActivityLog.find({ userId })
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));

    const total = await ActivityLog.countDocuments({ userId });

    res.status(200).json({
      logs,
      total,
      limit: parseInt(limit),
      skip: parseInt(skip),
    });
  } catch (error) {
    res.status(500).json({ message: "Error fetching user activity", error: error.message });
  }
};

// Log activity (called internally)
export const logActivity = async (req, res) => {
  try {
    const { userId, username, action, module, resource, description, permission, ipAddress, status, changes } =
      req.body;

    const activityLog = new ActivityLog({
      userId,
      username,
      action,
      module,
      resource,
      description: description || "",
      permission: permission || "",
      ipAddress: ipAddress || "",
      status: status || "success",
      changes: changes || null,
    });

    const savedLog = await activityLog.save();
    res.status(201).json(savedLog);
  } catch (error) {
    res.status(500).json({ message: "Error logging activity", error: error.message });
  }
};

// Get activity statistics
export const getActivityStatistics = async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    // Total activities
    const totalActivities = await ActivityLog.countDocuments({
      timestamp: { $gte: startDate },
    });

    // Activities by module
    const byModule = await ActivityLog.aggregate([
      {
        $match: {
          timestamp: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: "$module",
          count: { $sum: 1 },
        },
      },
    ]);

    // Activities by action
    const byAction = await ActivityLog.aggregate([
      {
        $match: {
          timestamp: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: "$action",
          count: { $sum: 1 },
        },
      },
    ]);

    // Failed activities
    const failedActivities = await ActivityLog.countDocuments({
      timestamp: { $gte: startDate },
      status: "failed",
    });

    // Most active users
    const activeUsers = await ActivityLog.aggregate([
      {
        $match: {
          timestamp: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: "$username",
          count: { $sum: 1 },
        },
      },
      {
        $sort: { count: -1 },
      },
      {
        $limit: 10,
      },
    ]);

    res.status(200).json({
      period: `Last ${days} days`,
      totalActivities,
      byModule,
      byAction,
      failedActivities,
      activeUsers,
    });
  } catch (error) {
    res.status(500).json({ message: "Error fetching statistics", error: error.message });
  }
};

// Delete old activity logs
export const deleteOldActivityLogs = async (req, res) => {
  try {
    const { days = 90 } = req.query;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - parseInt(days));

    const result = await ActivityLog.deleteMany({
      timestamp: { $lt: cutoffDate },
    });

    res.status(200).json({
      message: `Deleted ${result.deletedCount} activity logs older than ${days} days`,
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    res.status(500).json({ message: "Error deleting activity logs", error: error.message });
  }
};
