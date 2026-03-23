/**
 * Diagnose database state
 */

import mongoose from "mongoose";
import Grn from "../Models/Grn.js";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/nexis-erp";

async function diagnose() {
  try {
    console.log("\n🔍 DATABASE DIAGNOSIS\n");
    console.log(`MongoDB URI: ${MONGODB_URI}\n`);

    const conn = await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB");
    console.log(`Database: ${conn.connection.name}`);
    console.log(`Host: ${conn.connection.host}`);

    // List all collections
    const collections = await conn.connection.db.listCollections().toArray();
    console.log(`\n📊 Collections in database:`);
    collections.forEach(col => console.log(`   • ${col.name}`));

    // Count GRNs
    const grnCount = await Grn.countDocuments();
    console.log(`\n📝 GRN collection:`);
    console.log(`   Total documents: ${grnCount}`);

    if (grnCount > 0) {
      const sample = await Grn.findOne().select("grnNumber status editLock");
      console.log(`   Sample GRN: ${sample?.grnNumber}`);
      console.log(`   Status: ${sample?.status}`);
      console.log(`   Edit Lock: ${sample?.editLock ? 'YES' : 'NO'}`);
    }

  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

diagnose();
