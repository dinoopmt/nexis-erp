/**
 * Force remove all locks - for debugging stale lock issues
 */

import mongoose from "mongoose";
import Grn from "../Models/Grn.js";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/nexis-erp";

async function forceRemoveAllLocks() {
  try {
    console.log("\n🔓 FORCE REMOVING ALL LOCKS...\n");

    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    // Find ALL GRNs with any kind of lock data
    const allGrns = await Grn.find({}).select("grnNumber editLock _id");
    console.log(`\n📋 Total GRNs in database: ${allGrns.length}`);

    let withLocks = 0;
    for (const grn of allGrns) {
      if (grn.editLock) {
        withLocks++;
        console.log(`\n🔒 GRN: ${grn.grnNumber}`);
        console.log(`   Lock data:`, JSON.stringify(grn.editLock, null, 2));
      }
    }

    console.log(`\n   Found ${withLocks} GRNs with locks\n`);

    // Force remove ALL editLock fields
    const result = await Grn.updateMany(
      { editLock: { $exists: true } },
      { $unset: { editLock: 1 } }
    );

    console.log(`✅ Removed locks from ${result.modifiedCount} GRNs\n`);

    // Verify cleanup
    const verifyGrns = await Grn.find({ editLock: { $exists: true } });
    console.log(`📊 GRNs still with locks: ${verifyGrns.length}`);

    if (verifyGrns.length === 0) {
      console.log(`✅ All locks successfully removed!\n`);
    }

  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

forceRemoveAllLocks();
