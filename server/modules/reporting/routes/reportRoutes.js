import { Router } from "express";
import {
  getHtmlReport,
  createExport,
  getExportStatus,
  downloadExport
} from "../controllers/reportController.js";

const router = Router();

router.get("/exports/:jobId", getExportStatus);
router.get("/exports/:jobId/download", downloadExport);
router.get("/:reportName", getHtmlReport);
router.post("/:reportName/export", createExport);

export default router;