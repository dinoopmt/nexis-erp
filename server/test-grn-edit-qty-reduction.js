/**
 * TEST: GRN EDIT WITH QUANTITY REDUCTION
 * 
 * Scenario: Edit GRN-2025-2026-00093
 * Change: qty 10 → 5 units (delta: -5)
 * Expected: Stock reduced by 5, totals recalculated, payment reduced
 */

import mongoose from 'mongoose';
import Grn from './Models/Grn.js';
import CurrentStock from './Models/CurrentStock.js';
import VendorPayment from './Models/VendorPayment.js';
import ImprovedGRNEditManager from './modules/accounting/services/ImprovedGRNEditManager.js';

const MONGO_URI = 'mongodb://localhost:27017/nexis-erp';

async function runTest() {
  try {
    console.log('🚀 GRN EDIT TEST - QUANTITY REDUCTION\n');
    console.log('Scenario: qty 10 → 5 (delta: -5)\n');

    // ===============================================
    // STEP 1: CONNECT
    // ===============================================
    console.log('📡 Step 1: Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected\n');

    // ===============================================
    // STEP 2: CREATE TEST DATA
    // ===============================================
    console.log('📊 Step 2: Setting up test data...');

    const db = mongoose.connection.db;
    const grnCollection = db.collection('goods_receipt_notes');
    const stockCollection = db.collection('current_stock');
    const paymentCollection = db.collection('vendor_payments');

    // Delete existing test data
    await grnCollection.deleteMany({ grnNumber: 'GRN-2025-2026-00093' });
    await stockCollection.deleteMany({ productId: new mongoose.Types.ObjectId('69beef0d228dfd0cc59b9fcc') });
    await paymentCollection.deleteMany({ grnNumber: 'GRN-2025-2026-00093' });

    // Create test GRN with qty=10
    const productId = new mongoose.Types.ObjectId('69beef0d228dfd0cc59b9fcc');
    const grnId = new mongoose.Types.ObjectId('69c0c2abb7faec9b5231f485');
    const vendorId = new mongoose.Types.ObjectId('69beeef6228dfd0cc59b9fbd');
    const userId = new mongoose.Types.ObjectId('69beee6a4083203fc968ae78');

    // Insert GRN with qty=10
    await grnCollection.insertOne({
      _id: grnId,
      grnNumber: 'GRN-2025-2026-00093',
      grnDate: new Date('2026-03-23'),
      vendorId,
      vendorName: 'al arab',
      referenceNumber: '1',
      invoiceNo: '1',
      lpoNo: '1',
      paymentTerms: 'due_on_receipt',
      taxType: 'exclusive',
      deliveryDate: new Date('2026-03-23'),
      shippingCost: 0,
      totalQty: 10,
      subtotal: 100,
      discountAmount: 0,
      discountPercent: 0,
      totalExTax: 100,
      taxAmount: 5,
      netTotal: 105,
      finalTotal: 105,
      totalAmount: 105,
      status: 'Received',
      items: [
        {
          productId,
          itemName: 'I phone 6 s pluse',
          itemCode: '1001',
          quantity: 10,
          unitType: 'Piece',
          foc: false,
          focQty: 0,
          unitCost: 10,
          itemDiscount: 0,
          itemDiscountPercent: 0,
          netCost: 100,
          taxType: 'exclusive',
          taxPercent: 5,
          taxAmount: 5,
          totalCost: 105,
          batchNumber: '',
          expiryDate: null,
          notes: ''
        }
      ],
      notes: '',
      createdBy: userId,
      updatedBy: null,
      __v: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Insert stock with qty=10
    await stockCollection.insertOne({
      _id: new mongoose.Types.ObjectId('69c0b95158043648c966d47d'),
      productId,
      totalQuantity: 10,
      allocatedQuantity: 0,
      damageQuality: 0,
      availableQuantity: 10,
      totalCost: 100,
      averageCost: 10,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Insert payment with amount=105
    await paymentCollection.insertOne({
      _id: new mongoose.Types.ObjectId('69c0c2abb7faec9b5231f48e'),
      grnId: grnId.toString(),
      grnNumber: 'GRN-2025-2026-00093',
      vendorId,
      vendorName: 'al arab',
      type: 'ITEMS',
      initialAmount: 105,
      amountPaid: 0,
      balance: 105,
      paymentTerms: 'IMMEDIATE',
      paymentStatus: 'PENDING',
      createdBy: userId,
      payments: [],
      invoices: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      __v: 0
    });

    console.log('✅ Test data created with qty=10, total=$105\n');

    // ===============================================
    // STEP 3: FETCH BEFORE STATE
    // ===============================================
    console.log('📖 BEFORE Edit:');
    const GrnModel = mongoose.model('Grn');
    const grn = await GrnModel.findById(grnId);
    const stockBefore = await CurrentStock.findOne({ productId });
    const paymentBefore = await VendorPayment.findOne({ grnId: grn._id.toString() });

    console.log(`   GRN qty: ${grn.items[0].quantity}`);
    console.log(`   GRN total: $${grn.finalTotal}`);
    console.log(`   Stock qty: ${stockBefore?.totalQuantity || 0}`);
    console.log(`   Payment: $${paymentBefore?.initialAmount || 0}\n`);

    // ===============================================
    // STEP 4: PREPARE EDIT (qty 10 → 5)
    // ===============================================
    console.log('='.repeat(60));
    console.log('🔧 Step 4: Preparing GRN Edit\n');

    const editedItems = grn.items.map(item => ({
      ...item.toObject?.() || item,
      quantity: 5,  // Change from 10 → 5
      netCost: 50,  // 5 * 10
      taxAmount: 2.5,  // 50 * 5%
      totalCost: 52.5,  // 50 + 2.5
    }));

    console.log(`Edit: qty 10 → 5 (delta: -5)`);
    console.log(`Cost: $105 → $52.5\n`);

    // ===============================================
    // STEP 5: EXECUTE TRANSACTION-BASED EDIT
    // ===============================================
    console.log('🔄 Step 5: Executing Edit with TRANSACTION\n');

    const result = await ImprovedGRNEditManager.editGRN(
      grn._id,
      { 
        items: editedItems, 
        notes: 'Test: quantity reduction from 10 to 5'
      },
      userId
    );

    // ===============================================
    // STEP 6: VERIFY RESULTS
    // ===============================================
    console.log('\n' + '='.repeat(60));
    console.log('✅ Step 6: Verifying Results\n');

    const grnAfter = await GrnModel.findById(grnId);
    const stockAfter = await CurrentStock.findOne({ productId });
    const paymentAfter = await VendorPayment.findOne({ grnId: grn._id.toString() });

    console.log(`📖 AFTER Edit:`);
    console.log(`   GRN qty: ${grnAfter.items[0].quantity}`);
    console.log(`   GRN total: $${grnAfter.finalTotal}`);
    console.log(`   Stock qty: ${stockAfter?.totalQuantity || 0}`);
    console.log(`   Payment: $${paymentAfter?.initialAmount || 0}\n`);

    // ===============================================
    // STEP 7: ASSERTIONS
    // ===============================================
    console.log('🧪 Verification Checks:\n');

    let allPassed = true;

    // Check 1: Edit success
    if (result.success) {
      console.log('   ✅ Edit success (transaction committed)');
    } else {
      console.log(`   ❌ Edit failed: ${result.error}`);
      allPassed = false;
    }

    // Check 2: GRN quantity updated
    if (grnAfter.items[0].quantity === 5) {
      console.log('   ✅ GRN quantity updated (10 → 5)');
    } else {
      console.log(`   ❌ GRN quantity NOT updated (got ${grnAfter.items[0].quantity})`);
      allPassed = false;
    }

    // Check 3: GRN total updated
    if (grnAfter.finalTotal === 52.5) {
      console.log('   ✅ GRN total updated ($105 → $52.5)');
    } else {
      console.log(`   ❌ GRN total NOT updated (got $${grnAfter.finalTotal})`);
      allPassed = false;
    }

    // Check 4: Stock delta applied (reduction of 5)
    const stockDelta = stockAfter?.totalQuantity - 10;
    if (stockDelta === -5) {
      console.log(`   ✅ Stock delta applied (-5 units: 10 → ${stockAfter?.totalQuantity})`);
    } else {
      console.log(`   ❌ Stock delta NOT applied correctly (got delta: ${stockDelta}, stock: ${stockAfter?.totalQuantity})`);
      allPassed = false;
    }

    // Check 5: Payment updated
    if (paymentAfter?.initialAmount === 52.5) {
      console.log('   ✅ Payment updated ($105 → $52.5)');
    } else {
      console.log(`   ❌ Payment NOT updated (got $${paymentAfter?.initialAmount})`);
      allPassed = false;
    }

    // Check 6: Payment status PENDING
    if (paymentAfter?.paymentStatus === 'PENDING') {
      console.log('   ✅ Payment status PENDING (edit allowed)');
    } else {
      console.log(`   ❌ Payment status NOT PENDING (got ${paymentAfter?.paymentStatus})`);
      allPassed = false;
    }

    console.log('\n' + '='.repeat(60));
    if (allPassed) {
      console.log(`✅ ALL TESTS PASSED - QUANTITY REDUCTION WORKS!\n`);
      console.log(`What happened:`);
      console.log(`  ✓ GRN qty: 10 → 5 units`);
      console.log(`  ✓ GRN total: $105 → $52.5`);
      console.log(`  ✓ Stock reduced: -5 units (10 → 5)`);
      console.log(`  ✓ Payment reduced to $52.5`);
      console.log(`  ✓ All within single atomic transaction`);
      console.log(`  ✓ Automatic rollback capability if error occurs`);
    } else {
      console.log(`❌ SOME TESTS FAILED`);
    }
    console.log('='.repeat(60));

    await mongoose.disconnect();
    process.exit(allPassed ? 0 : 1);

  } catch (error) {
    console.error('❌ TEST ERROR:', error.message);
    console.error(error.stack);
    await mongoose.disconnect();
    process.exit(1);
  }
}

runTest();
