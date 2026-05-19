import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import Counter from "../Models/SequenceModel.js";
import FinancialYear from "../Models/FinancialYear.js";
import connectDB from "../db/db.js";
import { normalizeFinancialYear } from "../utils/financialYearFormat.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "..", ".env") });

const seedSequences = async () => {
  try {
    await connectDB();

    // Use configured/current financial year from master data only.
    const activeFinancialYear =
      (await FinancialYear.findOne({ isCurrent: true, isDeleted: false }).lean()) ||
      (await FinancialYear.findOne({
        isDeleted: false,
        startDate: { $lte: new Date() },
        endDate: { $gte: new Date() },
      }).lean());

    if (!activeFinancialYear?.yearCode) {
      console.log("⚠ No Financial Year found. Skipping sequence seeding.");
      return;
    }

    const financialYear = normalizeFinancialYear(activeFinancialYear.yearCode);

    // Define all sequences
    const sequences = [
      { module: "sales_invoice", prefix: "SI", lastNumber: 0 },
      { module: "product_code", prefix: "PC", lastNumber: 0 },
      { module: "purchase_order", prefix: "PO", lastNumber: 0 },
      { module: "delivery_note", prefix: "DN", lastNumber: 0 },
      { module: "sales_order", prefix: "SO", lastNumber: 0 },
      { module: "sales_return", prefix: "SR", lastNumber: 0 },
      { module: "journal_entry", prefix: "JE", lastNumber: 0 },
      { module: "payment", prefix: "PMT", lastNumber: 0 },
      { module: "receipt", prefix: "RCP", lastNumber: 0 },
      { module: "LPO", prefix: "LPO", lastNumber: 0 },
      { module: "GRN", prefix: "GRN", lastNumber: 0 },
      { module: "RTV", prefix: "RTV", lastNumber: 0 },
    ];

    // Insert sequences for current financial year
    for (const seq of sequences) {
      await Counter.findOneAndUpdate(
        { module: seq.module, financialYear },
        {
          module: seq.module,
          financialYear,
          prefix: seq.prefix,
          lastNumber: seq.lastNumber,
        },
        { upsert: true }
      );
    }

    console.log(`✓ Sequences seeded successfully for FY ${financialYear}`);
    console.log(`  Total sequences created: ${sequences.length}`);
  } catch (error) {
    console.error('Error seeding sequences', error);
    throw error;
  }
};

export { seedSequences };

// Run as standalone script
if (import.meta.url === `file://${process.argv[1]}`) {
  seedSequences().then(() => process.exit(0)).catch(() => process.exit(1));
}
