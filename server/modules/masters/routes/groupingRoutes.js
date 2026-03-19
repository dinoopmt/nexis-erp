import express from "express";
import {
  addGrouping,
  getGroupings,
  getGroupingById,
  updateGrouping,
  deleteGrouping,
  getDepartments,
  getSubDepartments,
} from "../controllers/groupingController.js";

const router = express.Router();

// ================= ADD GROUPING =================
router.post("/addgrouping", addGrouping);

// ================= GET ALL GROUPINGS =================
router.get("/getgroupings", getGroupings);

// ================= GET GROUPING BY ID =================
router.get("/getgrouping/:id", getGroupingById);

// ================= UPDATE GROUPING =================
router.put("/updategrouping/:id", updateGrouping);

// ================= DELETE GROUPING =================
router.delete("/deletegrouping/:id", deleteGrouping);

// ================= GET ALL DEPARTMENTS (Level 0) =================
router.get("/departments", getDepartments);

// ================= GET SUBDEPARTMENTS BY PARENT =================
router.get("/subdepartments/:parentId", getSubDepartments);

export default router;
