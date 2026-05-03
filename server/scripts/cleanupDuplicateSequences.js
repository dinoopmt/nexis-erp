import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import Counter from "../Models/SequenceModel.js";
import connectDB from "../db/db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "..", ".env") });

const cleanupDuplicates = async () => {
  try {
    await connectDB();
    console.log("🧹 Starting cleanup of duplicate sequences...\n");

    // Find all duplicate (module, financialYear) combinations
    const duplicates = await Counter.aggregate([
      {
        $group: {
          _id: { module: "$module", financialYear: "$financialYear" },
          count: { $sum: 1 },
          ids: { $push: "$_id" },
          lastNumbers: { $push: "$lastNumber" }
        }
      },
      {
        $match: { count: { $gt: 1 } }
      }
    ]);

    if (duplicates.length === 0) {
      console.log("✅ No duplicate sequences found. Database is clean!");
      process.exit(0);
    }

    console.log(`Found ${duplicates.length} sets of duplicate sequences:\n`);

    for (const dup of duplicates) {
      const { module, financialYear } = dup._id;
      const { count, ids, lastNumbers } = dup;

      console.log(`  📍 ${module} (FY: ${financialYear})`);
      console.log(`     Total duplicates: ${count}`);
      console.log(`     Sequence IDs: ${ids.map(id => id.toString()).join(", ")}`);
      console.log(`     Last numbers: ${lastNumbers.join(", ")}`);

      // Find max lastNumber
      const maxLastNumber = Math.max(...lastNumbers);
      const keepIndex = lastNumbers.indexOf(maxLastNumber);
      const keepId = ids[keepIndex];

      console.log(`     ✅ Keeping: ${keepId} (lastNumber=${maxLastNumber})`);

      // Delete all except the one with highest lastNumber
      const deleteIds = ids.filter((id, idx) => idx !== keepIndex);
      if (deleteIds.length > 0) {
        await Counter.deleteMany({ _id: { $in: deleteIds } });
        console.log(`     ❌ Deleted ${deleteIds.length} duplicates\n`);
      }
    }

    console.log("✅ Cleanup completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error during cleanup:", error.message);
    process.exit(1);
  }
};

cleanupDuplicates();
