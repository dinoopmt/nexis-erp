/**
 * ✅ SIMPLE TEST: GRN EDIT NO-TRANSACTION VERSION
 * 
 * Direct test with raw MongoDB operations to avoid middleware issues
 */

import mongoose from 'mongoose';
import Grn from './Models/Grn.js';
import CurrentStock from './Models/CurrentStock.js';
import ImprovedGRNEditManager from './modules/accounting/services/ImprovedGRNEditManager.js';

const MONGO_URI = 'mongodb://localhost:27017/nexis-erp';

async function runTest() {
  const objectIds = [];

  try {
    console.log('🚀 CONNECTING TO DATABASE...\n');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    // ===============================================
    // SETUP: CREATE SAMPLE DATA DIRECTLY
    // ===============================================
    console.log('📝 CREATING SAMPLE DATA...\n');

    const product1Id = new mongoose.Types.ObjectId();
    const product2Id = new mongoose.Types.ObjectId();
    const vendorId = new mongoose.Types.ObjectId();
    const grnId = new mongoose.Types.ObjectId();

    objectIds.push(product1Id, product2Id, vendorId, grnId);

    // Insert into database using raw commands
    const db = mongoose.connection.db;

    // Delete previous test data
    await db.collection('current_stock').deleteMany({});
    await db.collection('goods_receipt_notes').deleteMany({});

    // Insert CurrentStock
    await db.collection('current_stock').insertMany([
      {
        _id: new mongoose.Types.ObjectId(),
        productId: product1Id,
        totalQuantity: 500,
        allocatedQuantity: 0,
        damageQuality: 0,
        availableQuantity: 500,
        totalCost: 25000,
        averageCost: 50,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        _id: new mongoose.Types.ObjectId(),
        productId: product2Id,
        totalQuantity: 300,
        allocatedQuantity: 0,
        damageQuality: 0,
        availableQuantity: 300,
        totalCost: 9000,
        averageCost: 30,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);

    console.log('✅ Created CurrentStock records');
    console.log('   - Product 1: 500 units');
    console.log('   - Product 2: 300 units');
    console.log('   - Total before: 800 units\n');

    // Insert GRN
    await db.collection('goods_receipt_notes').insertOne({
      _id: grnId,
      grnNumber: 'TEST-GRN-001',
      status: 'Received',
      vendorId,
      items: [
        {
          productId: product1Id,
          quantity: 100,
          unitCost: 50,
          batchNumber: 'BATCH-001',
          cost: 5000
        },
        {
          productId: product2Id,
          quantity: 150,
          unitCost: 30,
          batchNumber: 'BATCH-002',
          cost: 4500
        }
      ],
      totalAmount: 9500,
      finalTotal: 9500,
      notes: 'Test GRN',
      createdAt: new Date(),
      updatedAt: new Date()
    });

    console.log('✅ Created test GRN: TEST-GRN-001');
    console.log('   - Item 1 (Product 1): 100 units @ 50 = 5000');
    console.log('   - Item 2 (Product 2): 150 units @ 30 = 4500\n');

    // ===============================================
    // STEP 1: VERIFY BEFORE STATE
    // ===============================================
    console.log('\n' + '='.repeat(60));
    console.log('📊 BEFORE EDIT\n');

    const grnBefore = await Grn.findById(grnId);
    console.log(`GRN: ${grnBefore.grnNumber}`);
    console.log(`Items: ${grnBefore.items?.length}`);
    grnBefore.items?.forEach((item, idx) => {
      console.log(`  [${idx}] Product: ${item.productId} | Qty: ${item.quantity}`);
    });

    const stock1Before = await CurrentStock.findOne({ productId: product1Id }).lean();
    const stock2Before = await CurrentStock.findOne({ productId: product2Id }).lean();
    const totalBefore = (stock1Before?.totalQuantity || 0) + (stock2Before?.totalQuantity || 0);

    console.log(`\nStock Total: ${totalBefore} units`);

    // ===============================================
    // STEP 2: PERFORM EDIT
    // ===============================================
    console.log('\n' + '='.repeat(60));
    console.log('🔧 EDITING: Item 1 qty 100 → 400 (Delta: +300)\n');

    // Convert items to plain objects
    const plainItems = grnBefore.items.map(item => item.toObject?.() || item);
    
    const editedItems = plainItems.map((item, idx) => ({
      ...item,
      quantity: idx === 0 ? 400 : item.quantity // Change first item to 400
    }));

    const userId = new mongoose.Types.ObjectId();

    console.log('Calling ImprovedGRNEditManager.editGRN()...\n');

    const result = await ImprovedGRNEditManager.editGRN(
      grnId,
      { items: editedItems, notes: 'Test edit' },
      userId
    );

    // ===============================================
    // STEP 3: VERIFY AFTER STATE
    // ===============================================
    console.log('\n' + '='.repeat(60));
    console.log('✅ AFTER EDIT\n');

    const grnAfter = await Grn.findById(grnId);
    console.log(`GRN: ${grnAfter.grnNumber}`);
    console.log(`Items: ${grnAfter.items?.length}`);
    grnAfter.items?.forEach((item, idx) => {
      console.log(`  [${idx}] Product: ${item.productId} | Qty: ${item.quantity}`);
    });

    const stock1After = await CurrentStock.findOne({ productId: product1Id }).lean();
    const stock2After = await CurrentStock.findOne({ productId: product2Id }).lean();
    const totalAfter = (stock1After?.totalQuantity || 0) + (stock2After?.totalQuantity || 0);

    console.log(`\nStock Total: ${totalAfter} units`);

    // ===============================================
    // VERIFICATION
    // ===============================================
    console.log('\n' + '='.repeat(60));
    console.log('🧮 VERIFICATION\n');

    const expectedDelta = 400 - 100;  // +300
    const expectedTotal = totalBefore + expectedDelta;

    console.log(`Before Total: ${totalBefore}`);
    console.log(`Delta: +${expectedDelta}`);
    console.log(`Expected After: ${expectedTotal}`);
    console.log(`Actual After: ${totalAfter}`);

    const testsPass = 
      result.success &&
      grnAfter.items[0].quantity === 400 &&
      totalAfter === expectedTotal;

    console.log('\n' + '='.repeat(60));

    if (testsPass) {
      console.log('✅ ALL TESTS PASSED');
      console.log('   ✓ GRN edited successfully');
      console.log('   ✓ Item quantity updated (100 → 400)');
      console.log('   ✓ Stock delta applied correctly (+300)');
      console.log('   ✓ No transactions required - works on standalone MongoDB!');
    } else {
      console.log('❌ TESTS FAILED');
      if (!result.success) console.log(`   ✗ Edit failed: ${result.error}`);
      if (grnAfter.items[0].quantity !== 400) console.log(`   ✗ Item qty = ${grnAfter.items[0].quantity}, expected 400`);
      if (totalAfter !== expectedTotal) console.log(`   ✗ Stock = ${totalAfter}, expected ${expectedTotal}`);
    }

    console.log('='.repeat(60) + '\n');

    process.exit(testsPass ? 0 : 1);

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

runTest();
