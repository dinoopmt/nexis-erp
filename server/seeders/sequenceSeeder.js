import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import Counter from "../Models/SequenceModel.js";
import connectDB from "../db/db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "..", ".env") });

const seedSequences = async () => {
  try {
    await connectDB();

    // Get current financial year
    const currentDate = new Date();
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;
    const financialYear = month > 3 ? `${year}-${year + 1}` : `${year - 1}-${year}`;

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
