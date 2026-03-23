import mongoose from "mongoose";
import Grn from "../Models/Grn.js";

const MONGO_URI = "mongodb://localhost:27017/NEXIS_ERP";

async function checkDB() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB");

    const count = await Grn.countDocuments();
    console.log(`\nTotal GRNs: ${count}`);

    const statuses = await Grn.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } }
    ]);

    console.log(`\nBy status:`);
    statuses.forEach(s => console.log(`  ${s._id}: ${s.count}`));

    if (count > 0) {
      console.log(`\n📋 Sample GRNs:`);
      const samples = await Grn.find().limit(3).select("grnNumber status items finalTotal");
      samples.forEach(grn => {
        console.log(`  - ${grn.grnNumber} (${grn.status}): qty=${grn.items?.[0]?.quantity || 'N/A'}, total=${grn.finalTotal}`);
      });
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
}

checkDB();
