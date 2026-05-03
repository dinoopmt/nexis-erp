import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import Counter from "../Models/SequenceModel.js";
import connectDB from "../db/db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "..", ".env") });

const diagnosticCheck = async () => {
  try {
    await connectDB();
    console.log("🔍 Starting diagnostic check...\n");

    // Check all sequences
    console.log("📊 All Sequences in Database:");
    console.log("━".repeat(80));
    
    const allSeq = await Counter.find().sort({ module: 1, financialYear: -1 });
    
    if (allSeq.length === 0) {
      console.log("❌ NO SEQUENCES FOUND IN DATABASE!\n");
    } else {
      allSeq.forEach(seq => {
        console.log(`  Module: ${seq.module.padEnd(15)} | FY: ${seq.financialYear.padEnd(10)} | LastNumber: ${seq.lastNumber} | ID: ${seq._id}`);
      });
    }

    console.log("\n📍 LPO Sequences Specifically:");
    console.log("━".repeat(80));
    
    const lpoSeqs = await Counter.find({ module: "LPO" }).sort({ financialYear: -1 });
    
    if (lpoSeqs.length === 0) {
      console.log("❌ NO LPO SEQUENCES FOUND!\n");
    } else {
      lpoSeqs.forEach(seq => {
        console.log(`  FY: ${seq.financialYear} | LastNumber: ${seq.lastNumber} | ID: ${seq._id}`);
      });
    }

    console.log("\n📍 LPO-2026-2027 Sequences:");
    console.log("━".repeat(80));
    
    const lpo20262027 = await Counter.find({ 
      module: "LPO", 
      financialYear: "2026-2027" 
    });
    
    if (lpo20262027.length === 0) {
      console.log("❌ NO LPO-2026-2027 SEQUENCES FOUND!\n");
    } else {
      console.log(`Total LPO-2026-2027 sequences: ${lpo20262027.length}\n`);
      lpo20262027.forEach((seq, idx) => {
        console.log(`  [${idx + 1}] LastNumber: ${seq.lastNumber} | ID: ${seq._id} | prefix: ${seq.prefix}`);
      });
    }

    // Check indexes
    console.log("\n🔑 Indexes on 'sequences' collection:");
    console.log("━".repeat(80));
    const indexes = await Counter.collection.getIndexes();
    Object.entries(indexes).forEach(([name, spec]) => {
      console.log(`  ${name}: ${JSON.stringify(spec)}`);
    });

    process.exit(0);
  } catch (error) {
    console.error("❌ Error during diagnostic check:", error.message);
    process.exit(1);
  }
};

diagnosticCheck();
