import express from "express";
import {
  getAllActivityLogs,
  getUserActivityHistory,
  logActivity,
  getActivityStatistics,
  deleteOldActivityLogs,
} from "../controllers/activityLogController.js";

const router = express.Router();

router.get("/", getAllActivityLogs);
router.get("/statistics/overview", getActivityStatistics);
router.get("/user/:userId", getUserActivityHistory);
router.post("/", logActivity);
router.delete("/cleanup", deleteOldActivityLogs);

export default router;
