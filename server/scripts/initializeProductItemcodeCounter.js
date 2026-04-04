/**
 * Initialize Product Code Counter
 * 
 * Purpose: 
 * - Find the current maximum itemcode from products collection
 * - Use the existing 'product_code' counter in sequences collection
 * - Set it to current max for atomic increment on next product
 * 
 * Usage: node scripts/initializeProductItemcodeCounter.js
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import Product from "../Models/AddProduct.js";
import Counter from "../Models/SequenceModel.js";

// Load environment
dotenv.config();

const getCurrentFinancialYear = () => {
  const currentDate = new Date();
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;
  return month > 3 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
};

const initializeCounter = async () => {
  try {
    console.log("🔄 Initializing Product Itemcode Counter...\n");

    // ✅ Connect to MongoDB
    if (!mongoose.connection.readyState) {
      await mongoose.connect(process.env.MONGO_URI);
      console.log("✅ Connected to MongoDB\n");
    }

    // ✅ Step 1: Find current max numeric itemcode
    console.log("📊 Finding current maximum itemcode from products collection...");
    
    const result = await Product.aggregate([
      { $match: { isDeleted: false } },
      {
        $addFields: {
          isNumeric: { $eq: [{ $substr: ['$itemcode', 0, 4] }, 'AUTO'] }
        }
      },
      {
        $match: { isNumeric: false } // Only numeric itemcodes
      },
      {
        $group: {
          _id: null,
          maxItemcode: { $max: { $toInt: '$itemcode' } },
          count: { $sum: 1 }
        }
      }
    ]);

    let maxItemcode = 1000;
    let productCount = 0;

    if (result && result.length > 0 && result[0].maxItemcode) {
      maxItemcode = result[0].maxItemcode;
      productCount = result[0].count || 0;
    }

    console.log(`  ✅ Found ${productCount} products`);
    console.log(`  ✅ Current max itemcode: ${maxItemcode}\n`);

    const financialYear = getCurrentFinancialYear();

    // ✅ Step 2: Check if counter already exists
    console.log("🔍 Checking for existing product_code counter...");
    
    const existingCounter = await Counter.findOne({
      module: 'product_code',
      financialYear: financialYear
    });

    if (existingCounter) {
      console.log(`  ✅ Counter exists with lastNumber: ${existingCounter.lastNumber}`);
      console.log(`  ✅ Current max in products: ${maxItemcode}`);
      
      if (existingCounter.lastNumber < maxItemcode) {
        console.log(`  ⚠️  Counter is behind! Updating ${existingCounter.lastNumber} → ${maxItemcode}\n`);
      } else {
        console.log(`  ✅ Counter is already up to date\n`);
      }
    }

    // ✅ Step 3: Initialize or update counter in sequences collection
    console.log("💾 Updating product_code counter in sequences collection...");

    const counter = await Counter.findOneAndUpdate(
      {
        module: 'product_code',  // ✅ Using existing counter
        financialYear: financialYear
      },
      {
        $set: {
          module: 'product_code',
          financialYear: financialYear,
          prefix: 'PC',
          lastNumber: Math.max(existingCounter?.lastNumber || 0, maxItemcode)  // ✅ Use whichever is higher
        }
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true
      }
    );

    console.log(`  ✅ Counter updated:`);
    console.log(`     - Module: ${counter.module}`);
    console.log(`     - Financial Year: ${counter.financialYear}`);
    console.log(`     - Prefix: ${counter.prefix}`);
    console.log(`     - Current lastNumber: ${counter.lastNumber}\n`);

    // ✅ Step 4: Add unique index for safety
    console.log("🔐 Ensuring unique index on product_code counter...");
    
    try {
      await Counter.collection.createIndex(
        { module: 1, financialYear: 1 },
        { unique: true, sparse: true }
      );
      console.log("  ✅ Unique index ensured\n");
    } catch (indexError) {
      if (indexError.code === 11000 || indexError.message.includes('duplicate')) {
        console.log("  ⚠️  Index already exists\n");
      } else {
        throw indexError;
      }
    }

    // ✅ Step 5: Verify counter works
    console.log("✅ Testing counter atomic increment...");
    
    const testCounter = await Counter.findOneAndUpdate(
      {
        module: 'product_code',
        financialYear: financialYear
      },
      {
        $inc: { lastNumber: 1 }
      },
      { new: true }
    );

    console.log(`  ✅ Next itemcode would be: ${testCounter.lastNumber}`);
    console.log(`  ✅ Reverting test increment...\n`);

    // Revert the test increment
    await Counter.findOneAndUpdate(
      {
        module: 'product_code',
        financialYear: financialYear
      },
      {
        $inc: { lastNumber: -1 }
      }
    );

    console.log("✅ INITIALIZATION COMPLETE!\n");
    console.log("📝 Summary:");
    console.log(`   - Module: product_code (existing counter)`);
    console.log(`   - Financial Year: ${financialYear}`);
    console.log(`   - Current max itemcode from products: ${maxItemcode}`);
    console.log(`   - Counter lastNumber: ${counter.lastNumber}`);
    console.log(`   - Next itemcode will be: ${counter.lastNumber + 1}`);
    console.log(`   - Counter ready for production use ✅\n`);
    console.log("📋 Database entry:");
    console.log(`   db.sequences.findOne({ module: 'product_code', financialYear: '${financialYear}' })\n`);

    process.exit(0);

  } catch (error) {
    console.error("❌ Initialization failed:", error.message);
    console.error("\nFull error:", error);
    process.exit(1);
  }
};

// Run initialization
initializeCounter();

