/**
 * ✅ TEST: GRN-2 EDIT (480 → 4800) WITH NO-TRANSACTION VERSION
 * 
 * This test uses the new ImprovedGRNEditManager without transactions
 * Compatible with standalone MongoDB instances
 */

import mongoose from 'mongoose';
import Grn from './Models/Grn.js';
import CurrentStock from './Models/CurrentStock.js';
import ImprovedGRNEditManager from './modules/accounting/services/ImprovedGRNEditManager.js';

const MONGO_URI = 'mongodb://localhost:27017/nexis-erp';

async function runTest() {
  try {
    console.log('🚀 CONNECTING TO DATABASE...\n');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    // ===============================================
    // STEP 1: FETCH GRN-2 BEFORE EDIT
    // ===============================================
    console.log('📊 STEP 1: FETCH GRN DATA BEFORE EDIT\n');

    const grn2 = await Grn.findOne({ grnNumber: 'GRN-2025-2026-00078' });
    
    if (!grn2) {
      console.error('❌ GRN-2 not found');
      process.exit(1);
    }

    console.log(`   GRN ID: ${grn2._id}`);
    console.log(`   GRN Number: ${grn2.grnNumber}`);
    console.log(`   Status: ${grn2.status}`);
    console.log(`   Current Items: ${grn2.items?.length}\n`);

    // Show item details
    console.log('   📝 ITEMS BEFORE EDIT:');
    grn2.items?.forEach((item, idx) => {
      console.log(`      [${idx}] Product: ${item.productId}`);
      console.log(`          Qty: ${item.quantity}`);
      console.log(`          Cost: ${item.unitCost || item.cost}`);
    });

    // Get current stock before
    console.log('\n   📦 CURRENT STOCK BEFORE EDIT:');
    const firstProductId = grn2.items?.[0]?.productId;
    const stockBefore = await CurrentStock.findOne({ productId: firstProductId });
    
    if (stockBefore) {
      console.log(`      Product: ${firstProductId}`);
      console.log(`      Total Qty: ${stockBefore.totalQuantity}`);
      console.log(`      Available: ${stockBefore.availableQuantity}`);
    }

    // Get total stock across all products
    const allStocks = await CurrentStock.find({});
    const totalStockBefore = allStocks.reduce((sum, s) => sum + (s.totalQuantity || 0), 0);
    console.log(`      TOTAL ACROSS ALL: ${totalStockBefore}`);

    // ===============================================
    // STEP 2: PREPARE EDIT DATA (480 → 4800)
    // ===============================================
    console.log('\n\n🔧 STEP 2: PREPARE EDIT DATA\n');

    const editedItems = grn2.items.map((item, idx) => {
      if (idx === 0) {
        // Change first item qty from 480 to 4800
        console.log(`   Editing item [0]:`);
        console.log(`      Old qty: ${item.quantity}`);
        console.log(`      New qty: 4800`);
        console.log(`      Delta: +${4800 - item.quantity}`);
        
        return {
          ...item.toObject?.() || item,
          quantity: 4800  // Changed from 480 to 4800
        };
      }
      return item;
    });

    // ===============================================
    // STEP 3: EXECUTE GRN EDIT
    // ===============================================
    console.log('\n\n📝 STEP 3: EXECUTING GRN EDIT\n');

    const userId = new mongoose.Types.ObjectId();
    
    const editResult = await ImprovedGRNEditManager.editGRN(
      grn2._id,
      {
        items: editedItems,
        notes: 'Test Edit: 480 → 4800 (No Transaction Version)'
      },
      userId
    );

    console.log('\n   Edit Result:', JSON.stringify(editResult, null, 2));

    // ===============================================
    // STEP 4: VERIFY RESULTS
    // ===============================================
    console.log('\n\n✅ STEP 4: VERIFY RESULTS\n');

    // Fetch GRN after edit
    const grn2After = await Grn.findById(grn2._id);
    console.log(`   📖 GRN-2 After Edit:`);
    console.log(`      Status: ${grn2After.status}`);
    console.log(`      Items: ${grn2After.items?.length}`);
    
    const firstItemAfter = grn2After.items?.[0];
    console.log(`      First Item Qty: ${firstItemAfter?.quantity}`);
    
    // Verify stock was updated
    console.log(`\n   📦 Stock After Edit:`);
    const stockAfter = await CurrentStock.findOne({ productId: firstProductId });
    
    if (stockAfter) {
      console.log(`      Total Qty: ${stockAfter.totalQuantity}`);
      console.log(`      Available: ${stockAfter.availableQuantity}`);
    }

    const allStocksAfter = await CurrentStock.find({});
    const totalStockAfter = allStocksAfter.reduce((sum, s) => sum + (s.totalQuantity || 0), 0);
    console.log(`      TOTAL ACROSS ALL: ${totalStockAfter}`);

    // Calculate expected
    const deltaMade = 4800 - 480;
    const expectedTotal = totalStockBefore + deltaMade;

    console.log(`\n   🧮 STOCK CALCULATION CHECK:`);
    console.log(`      Before Total: ${totalStockBefore}`);
    console.log(`      Delta Applied: +${deltaMade}`);
    console.log(`      Expected After: ${expectedTotal}`);
    console.log(`      Actual After: ${totalStockAfter}`);

    if (totalStockAfter === expectedTotal) {
      console.log(`      ✅ STOCK CALCULATION CORRECT!`);
    } else {
      console.log(`      ❌ STOCK CALCULATION INCORRECT!`);
      console.log(`         Mismatch: ${totalStockAfter - expectedTotal}`);
    }

    // ===============================================
    // FINAL RESULT
    // ===============================================
    console.log('\n\n' + '='.repeat(50));
    
    if (editResult.success && totalStockAfter === expectedTotal && firstItemAfter?.quantity === 4800) {
      console.log('✅ TEST PASSED - GRN EDIT SUCCESSFUL');
      console.log('   - GRN item quantity updated ✅');
      console.log('   - Stock delta applied correctly ✅');
      console.log('   - Total stock recalculated ✅');
    } else {
      console.log('❌ TEST FAILED - GRN EDIT UNSUCCESSFUL');
      if (!editResult.success) console.log(`   - Edit failed: ${editResult.error}`);
      if (firstItemAfter?.quantity !== 4800) console.log(`   - Item qty not updated (got ${firstItemAfter?.quantity})`);
      if (totalStockAfter !== expectedTotal) console.log(`   - Stock not updated correctly`);
    }

    console.log('='.repeat(50) + '\n');

    process.exit(editResult.success && totalStockAfter === expectedTotal ? 0 : 1);

  } catch (error) {
    console.error('\n❌ TEST ERROR:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

runTest();
