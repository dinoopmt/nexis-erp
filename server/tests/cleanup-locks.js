/**
 * Clean up stale edit locks
 */

import mongoose from "mongoose";
import Grn from "../Models/Grn.js";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/nexis-erp";

async function cleanupStaleLocks() {
  try {
    console.log("\n🔓 CLEANING UP STALE LOCKS...\n");

    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    // Find all GRNs with locks
    const grnsWithLocks = await Grn.find({
      editLock: { $exists: true, $ne: null }
    }).select("grnNumber editLock");

    console.log(`📋 Found ${grnsWithLocks.length} GRNs with locks\n`);

    let staleCount = 0;
    const now = new Date();

    for (const grn of grnsWithLocks) {
      const lockExpiry = grn.editLock?.expiresAt;
      
      // Check if lock is expired or invalid
      if (!lockExpiry || lockExpiry < now) {
        console.log(`🔓 Removing stale lock from ${grn.grnNumber}`);
        console.log(`   Lock info:`, {
          lockedBy: grn.editLock?.lockedBy,
          lockedAt: grn.editLock?.lockedAt,
          expiresAt: lockExpiry || "INVALID",
        });
        
        await Grn.updateOne(
          { _id: grn._id },
          { editLock: null }
        );
        staleCount++;
      } else {
        const timeLeft = Math.round((lockExpiry - now) / 1000);
        console.log(`✅ Active lock on ${grn.grnNumber} (expires in ${timeLeft}s)`);
      }
    }

    console.log(`\n✅ Cleanup complete: ${staleCount} stale locks removed\n`);

  } catch (error) {
    console.error("❌ Error during cleanup:", error.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

cleanupStaleLocks();
