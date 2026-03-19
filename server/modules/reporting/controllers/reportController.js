import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import mongoose from "mongoose";

const jobs = new Map();

function getCollection(reportName) {
  const db = mongoose.connection.db;
  if (!db) throw new Error("Database not connected");
  return db.collection(reportName);
}

function buildQuery({ from, to, search }) {
  const q = {};
  if (from || to) {
    q.createdAt = {};
    if (from) q.createdAt.$gte = new Date(from);
    if (to) q.createdAt.$lte = new Date(to);
  }
  if (search) {
    const rx = new RegExp(search, "i");
    q.$or = [{ name: rx }, { code: rx }, { description: rx }];
  }
  return q;
}

export async function getHtmlReport(req, res, next) {
  try {
    const { reportName } = req.params;
    const page = Number(req.query.page || 1);
    const limit = Number(req.query.limit || 25);
    const skip = (page - 1) * limit;

    const collection = getCollection(reportName);
    const query = buildQuery(req.query);

    const [rows, total] = await Promise.all([
      collection.find(query).sort({ _id: -1 }).skip(skip).limit(limit).toArray(),
      collection.countDocuments(query)
    ]);

    const clean = rows.map(({ __v, ...r }) => r);
    const columns = clean[0] ? Object.keys(clean[0]) : [];

    res.json({ ok: true, page, limit, total, columns, rows: clean });
  } catch (err) {
    next(err);
  }
}

export async function createExport(req, res, next) {
  try {
    const { reportName } = req.params;
    const format = (req.body?.format || "xlsx").toLowerCase();
    if (!["xlsx", "pdf"].includes(format)) {
      return res.status(400).json({ ok: false, message: "format must be xlsx or pdf" });
    }

    const jobId = randomUUID();
    jobs.set(jobId, { id: jobId, status: "queued", filePath: null, fileName: null, mimeType: null, error: null });

    setImmediate(async () => {
      const job = jobs.get(jobId);
      job.status = "running";
      try {
        const collection = getCollection(reportName);
        const query = buildQuery(req.body || {});
        const rows = await collection.find(query).sort({ _id: -1 }).limit(50000).toArray();
        const clean = rows.map(({ __v, ...r }) => r);
        const columns = clean[0] ? Object.keys(clean[0]) : [];

        const exportDir = path.join(process.cwd(), "tmp", "exports");
        fs.mkdirSync(exportDir, { recursive: true });

        if (format === "xlsx") {
          const fileName = `report-${jobId}.xlsx`;
          const filePath = path.join(exportDir, fileName);

          const wb = new ExcelJS.stream.xlsx.WorkbookWriter({ filename: filePath });
          const ws = wb.addWorksheet("Report");
          ws.columns = columns.map((c) => ({ header: c, key: c, width: 22 }));
          clean.forEach((r) => ws.addRow(r).commit());
          await wb.commit();

          Object.assign(job, {
            status: "completed",
            filePath,
            fileName,
            mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          });
        } else {
          const fileName = `report-${jobId}.pdf`;
          const filePath = path.join(exportDir, fileName);

          await new Promise((resolve, reject) => {
            const doc = new PDFDocument({ margin: 24, size: "A4" });
            const out = fs.createWriteStream(filePath);
            doc.pipe(out);

            doc.fontSize(12).text(`Report: ${reportName}`);
            doc.moveDown();
            doc.fontSize(9).text(columns.join(" | "));
            doc.moveDown(0.5);

            clean.forEach((r) => {
              const line = columns.map((c) => String(r[c] ?? "")).join(" | ");
              doc.text(line.slice(0, 1800));
            });

            doc.end();
            out.on("finish", resolve);
            out.on("error", reject);
          });

          Object.assign(job, { status: "completed", filePath, fileName, mimeType: "application/pdf" });
        }
      } catch (e) {
        Object.assign(job, { status: "failed", error: e.message || "Export failed" });
      }
    });

    return res.status(202).json({ ok: true, jobId, status: "queued" });
  } catch (err) {
    next(err);
  }
}

export function getExportStatus(req, res) {
  const job = jobs.get(req.params.jobId);
  if (!job) return res.status(404).json({ ok: false, message: "Job not found" });
  res.json({ ok: true, job });
}

export function downloadExport(req, res) {
  const job = jobs.get(req.params.jobId);
  if (!job) return res.status(404).json({ ok: false, message: "Job not found" });
  if (job.status !== "completed") return res.status(409).json({ ok: false, message: "Job not completed" });
  if (!fs.existsSync(job.filePath)) return res.status(410).json({ ok: false, message: "File not found/expired" });

  res.setHeader("Content-Type", job.mimeType);
  res.setHeader("Content-Disposition", `attachment; filename="${job.fileName}"`);
  fs.createReadStream(job.filePath).pipe(res);
}