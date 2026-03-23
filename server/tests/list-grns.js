import mongoose from "mongoose";
import Grn from "../Models/Grn.js";

const MONGO_URI = "mongodb://localhost:27017/nexis-erp";

async function checkDatabase() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to nexis-erp database\n");

    const count = await Grn.countDocuments();
    console.log(`📊 Total GRNs in database: ${count}\n`);

    if (count > 0) {
      console.log("📋 Sample GRNs:\n");
      const grns = await Grn.find().limit(10).select("grnNumber status items");
      grns.forEach((grn, i) => {
        console.log(`${i + 1}. GRN: ${grn.grnNumber}`);
        console.log(`   Status: ${grn.status}`);
        console.log(`   Items: ${grn.items?.length}`);
        if (grn.items?.length > 0) {
          console.log(`   First item qty: ${grn.items[0].quantity}`);
        }
        console.log();
      });

      // Check for the specific GRN by number
      console.log(`🔍 Searching for GRN-2025-2026-00053...\n`);
      const specific = await Grn.findOne({ grnNumber: "GRN-2025-2026-00053" });
      if (specific) {
        console.log(`   ✓ Found!`);
        console.log(`   ID: ${specific._id}`);
        console.log(`   Status: ${specific.status}`);
        console.log(`   Items: ${specific.items?.length}`);
      } else {
        console.log(`   ✗ Not found`);
      }
    } else {
      console.log("⚠️ No GRNs found in database");
      console.log("   Collections in database:");
      const collections = await mongoose.connection.db.listCollections().toArray();
      collections.forEach(col => {
        console.log(`   - ${col.name}`);
      });
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

checkDatabase();
