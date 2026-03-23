/**
 * ✅ COMPREHENSIVE TEST: GRN EDIT WITH NO TRANSACTIONS
 * 
 * This test:
 * 1. Creates sample GRN data
 * 2. Tests the edit functionality
 * 3. Verifies delta calculations
 * 4. Validates stock updates
 */

import mongoose from 'mongoose';
import Grn from './Models/Grn.js';
import CurrentStock from './Models/CurrentStock.js';
import ImprovedGRNEditManager from './modules/accounting/services/ImprovedGRNEditManager.js';

const MONGO_URI = 'mongodb://localhost:27017/nexis-erp';

async function createSampleData() {
  try {
    console.log('📝 CREATING SAMPLE DATA...\n');

    // Create sample products
    const product1Id = new mongoose.Types.ObjectId();
    const product2Id = new mongoose.Types.ObjectId();
    const vendorId = new mongoose.Types.ObjectId();

    // Create sample CurrentStock records
    await CurrentStock.deleteMany({});
    
    await CurrentStock.create([
      {
        productId: product1Id,
        totalQuantity: 500,
        allocatedQuantity: 0,
        damageQuality: 0,
        availableQuantity: 500
      },
      {
        productId: product2Id,
        totalQuantity: 300,
        allocatedQuantity: 0,
        damageQuality: 0,
        availableQuantity: 300
      }
    ]);

    console.log('✅ Created CurrentStock records');

    // Create sample GRN
    const grn = await Grn.create({
      grnNumber: 'GRN-2025-2026-00001',
      status: 'Received',
      vendorId,
      items: [
        {
          productId: product1Id,
          quantity: 100,
          unitCost: 50,
          batchNumber: 'BATCH-001',
          expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
        },
        {
          productId: product2Id,
          quantity: 150,
          unitCost: 30,
          batchNumber: 'BATCH-002',
          expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
        }
      ],
      totalAmount: (100 * 50) + (150 * 30),  // 5000 + 4500 = 9500
      finalTotal: 9500,
      notes: 'Sample GRN for testing'
    });

    console.log('✅ Created sample GRN:', grn.grnNumber);

    return {
      grnId: grn._id,
      product1Id,
      product2Id,
      vendorId
    };

  } catch (error) {
    console.error('❌ Error creating sample data:', error.message);
    throw error;
  }
}

async function runTest() {
  try {
    console.log('🚀 CONNECTING TO DATABASE...\n');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    // ===============================================
    // SETUP: CREATE SAMPLE DATA
    // ===============================================
    const { grnId, product1Id, product2Id } = await createSampleData();

    // ===============================================
    // STEP 1: FETCH GRN BEFORE EDIT
    // ===============================================
    console.log('\n\n📊 STEP 1: FETCH GRN DATA BEFORE EDIT\n');

    const grnBefore = await Grn.findById(grnId);
    
    console.log(`   GRN: ${grnBefore.grnNumber}`);
    console.log(`   Status: ${grnBefore.status}`);
    console.log(`   Items: ${grnBefore.items?.length}`);

    console.log('\n   📝 ITEMS BEFORE EDIT:');
    grnBefore.items?.forEach((item, idx) => {
      console.log(`      [${idx}] Product: ${item.productId}`);
      console.log(`          Qty: ${item.quantity}`);
      console.log(`          Batch: ${item.batchNumber}`);
    });

    // Get current stock before
    console.log('\n   📦 CURRENT STOCK BEFORE EDIT:');
    const stockBefore1 = await CurrentStock.findOne({ productId: product1Id });
    const stockBefore2 = await CurrentStock.findOne({ productId: product2Id });
    
    console.log(`      Product 1: ${stockBefore1.totalQuantity}`);
    console.log(`      Product 2: ${stockBefore2.totalQuantity}`);

    const totalBefore = (stockBefore1?.totalQuantity || 0) + (stockBefore2?.totalQuantity || 0);
    console.log(`      TOTAL: ${totalBefore}`);

    // ===============================================
    // STEP 2: PREPARE EDIT DATA
    // ===============================================
    console.log('\n\n🔧 STEP 2: PREPARE EDIT DATA\n');

    const editedItems = grnBefore.items.map((item, idx) => {
      if (idx === 0) {
        // Change first item qty from 100 to 400 (delta: +300)
        console.log(`   Editing item [0]:`);
        console.log(`      Old qty: ${item.quantity}`);
        console.log(`      New qty: 400`);
        console.log(`      Delta: +${400 - item.quantity}`);
        
        return {
          ...item.toObject?.() || item,
          quantity: 400  // Changed from 100 to 400
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
      grnId,
      {
        items: editedItems,
        notes: 'Test Edit: 100 → 400 (No Transaction Version)'
      },
      userId
    );

    // ===============================================
    // STEP 4: VERIFY RESULTS
    // ===============================================
    console.log('\n\n✅ STEP 4: VERIFY RESULTS\n');

    // Fetch GRN after edit
    const grnAfter = await Grn.findById(grnId);
    console.log(`   📖 GRN After Edit:`);
    console.log(`      Items: ${grnAfter.items?.length}`);
    
    const firstItemAfter = grnAfter.items?.[0];
    console.log(`      First Item Qty: ${firstItemAfter?.quantity}`);
    console.log(`      Total Amount: ${grnAfter.totalAmount}`);
    
    // Verify stock was updated
    console.log(`\n   📦 Stock After Edit:`);
    const stockAfter1 = await CurrentStock.findOne({ productId: product1Id });
    const stockAfter2 = await CurrentStock.findOne({ productId: product2Id });
    
    console.log(`      Product 1: ${stockAfter1.totalQuantity}`);
    console.log(`      Product 2: ${stockAfter2.totalQuantity}`);

    const totalAfter = (stockAfter1?.totalQuantity || 0) + (stockAfter2?.totalQuantity || 0);
    console.log(`      TOTAL: ${totalAfter}`);

    // Calculate expected
    const deltaMade = 400 - 100;  // +300
    const expectedTotal = totalBefore + deltaMade;

    console.log(`\n   🧮 CALCULATION CHECK:`);
    console.log(`      Stock Before: ${totalBefore}`);
    console.log(`      Delta Applied: +${deltaMade}`);
    console.log(`      Expected After: ${expectedTotal}`);
    console.log(`      Actual After: ${totalAfter}`);

    // ===============================================
    // FINAL RESULT
    // ===============================================
    console.log('\n\n' + '='.repeat(60));
    
    const itemQtyCorrect = firstItemAfter?.quantity === 400;
    const stockCorrect = totalAfter === expectedTotal;
    const editSuccess = editResult.success;

    if (editSuccess && itemQtyCorrect && stockCorrect) {
      console.log('✅ ALL TESTS PASSED - GRN EDIT WORKING CORRECTLY');
      console.log('   ✓ GRN item quantity updated (100 → 400)');
      console.log('   ✓ Stock delta applied correctly (+300)');
      console.log('   ✓ Total stock recalculated correctly');
      console.log('   ✓ No transactions required (standalone MongoDB compatible)');
    } else {
      console.log('❌ TESTS FAILED');
      if (!editSuccess) console.log(`   ✗ Edit failed: ${editResult.error}`);
      if (!itemQtyCorrect) console.log(`   ✗ Item qty (got ${firstItemAfter?.quantity}, expected 400)`);
      if (!stockCorrect) console.log(`   ✗ Stock (got ${totalAfter}, expected ${expectedTotal})`);
    }

    console.log('='.repeat(60) + '\n');

    process.exit(editSuccess && itemQtyCorrect && stockCorrect ? 0 : 1);

  } catch (error) {
    console.error('\n❌ TEST ERROR:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

runTest();
