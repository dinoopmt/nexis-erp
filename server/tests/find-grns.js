import mongoose from "mongoose";
import Grn from "../Models/Grn.js";

const MONGO_URI = "mongodb://localhost:27017/NEXIS_ERP";

async function findGRNs() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB (PRODUCTION)");

    // List all GRNs with status Received
    const grns = await Grn.find({ status: "Received" }).limit(5);
    
    console.log(`\n📋 Found ${grns.length} GRNs with status 'Received':\n`);
    grns.forEach((grn, i) => {
      console.log(`${i + 1}. ${grn.grnNumber}`);
      console.log(`   Status: ${grn.status}`);
      console.log(`   Items: ${grn.items?.length}`);
      console.log(`   Qty 1st item: ${grn.items?.[0]?.quantity || 'N/A'}`);
      console.log(`   Total: ${grn.finalTotal}`);
    });

    // Also check for the specific GRN
    console.log(`\n🔍 Searching for GRN-2025-2026-00053...`);
    const specific = await Grn.findOne({ grnNumber: "GRN-2025-2026-00053" });
    if (specific) {
      console.log(`   Found! Status: ${specific.status}`);
      console.log(`   Items: ${specific.items?.length}`);
      console.log(`   Qty: ${specific.items?.[0]?.quantity}`);
    } else {
      console.log(`   Not found`);
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
}

findGRNs();
