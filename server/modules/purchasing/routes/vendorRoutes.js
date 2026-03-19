import express from "express";
import {
  addVendor,
  getVendors,
  getVendorById,
  updateVendor,
  deleteVendor,
  getVendorByCode,
  getActiveVendors,
  bulkUpdateStatus,
} from "../controllers/vendorController.js";

const router = express.Router();

// ================= ADD VENDOR =================
router.post("/addvendor", addVendor);

// ================= GET VENDORS =================
// Pagination + Search
router.get("/getvendors", getVendors);

// ================= GET SINGLE VENDOR =================
router.get("/:id", getVendorById);

// ================= GET VENDOR BY CODE =================
router.get("/code/:code", getVendorByCode);

// ================= GET ACTIVE VENDORS =================
router.get("/active/list", getActiveVendors);

// ================= UPDATE VENDOR =================
router.put("/updatevendor/:id", updateVendor);

// ================= DELETE VENDOR =================
router.delete("/deletevendor/:id", deleteVendor);

// ================= BULK UPDATE STATUS =================
router.put("/bulk/updatestatus", bulkUpdateStatus);

export default router;

