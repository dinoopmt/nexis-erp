/**
 * Check actual collection data
 */

import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/nexis-erp";

async function checkRawData() {
  try {
    console.log("\n🔍 RAW COLLECTION DATA\n");

    const conn = await mongoose.connect(MONGODB_URI);
    const db = conn.connection.db;

    // Query the actual collection
    const grns = await db.collection('goods_receipt_notes').find({}).limit(5).toArray();
    
    console.log(`📝 Found ${grns.length} GRNs in goods_receipt_notes collection\n`);

    grns.forEach((grn, idx) => {
      console.log(`${idx + 1}. GRN ID: ${grn._id}`);
      console.log(`   Number: ${grn.grnNumber}`);
      console.log(`   Status: ${grn.status}`);
      console.log(`   Edit Lock: ${grn.editLock ? JSON.stringify(grn.editLock) : 'NONE'}`);
      console.log();
    });

    // Show lock status
    const withLocks = await db.collection('goods_receipt_notes').countDocuments({ editLock: { $exists: true, $ne: null } });
    console.log(`💾 GRNs with active locks: ${withLocks}`);

    if (withLocks > 0) {
      console.log(`\n🔒 Removing all locks...`);
      const result = await db.collection('goods_receipt_notes').updateMany(
        { editLock: { $exists: true } },
        { $unset: { editLock: 1 } }
      );
      console.log(`✅ Removed editLock from ${result.modifiedCount} documents`);
    }

  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

checkRawData();
