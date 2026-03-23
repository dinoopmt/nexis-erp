/**
 * TEST: GRN EDIT - STOCK MOVEMENT UPDATE
 * 
 * Verifies that when editing a GRN, the original StockMovement record
 * is updated to reflect the new quantities (for audit trail accuracy)
 */

import mongoose from 'mongoose';
import Grn from './Models/Grn.js';
import CurrentStock from './Models/CurrentStock.js';
import StockMovement from './Models/StockMovement.js';
import VendorPayment from './Models/VendorPayment.js';
import ImprovedGRNEditManager from './modules/accounting/services/ImprovedGRNEditManager.js';

const MONGO_URI = 'mongodb://localhost:27017/nexis-erp';

async function runTest() {
  try {
    console.log('🚀 GRN EDIT TEST - STOCK MOVEMENT UPDATE\n');
    console.log('Scenario: Edit GRN qty from 10 → 100\n');
    console.log('Expected: StockMovement record updated to reflect new quantity\n');

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
    const movementCollection = db.collection('stock_movements');
    const paymentCollection = db.collection('vendor_payments');

    // Delete existing test data
    await grnCollection.deleteMany({ grnNumber: 'GRN-2025-2026-00093' });
    await stockCollection.deleteMany({ productId: new mongoose.Types.ObjectId('69beef0d228dfd0cc59b9fcc') });
    await movementCollection.deleteMany({ reference: 'GRN-2025-2026-00093' });
    await paymentCollection.deleteMany({ grnNumber: 'GRN-2025-2026-00093' });

    // Object IDs
    const productId = new mongoose.Types.ObjectId('69beef0d228dfd0cc59b9fcc');
    const grnId = new mongoose.Types.ObjectId('69c0c2abb7faec9b5231f485');
    const movementId = new mongoose.Types.ObjectId('69c0c2abb7faec9b5231f497');
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

    // Insert original StockMovement (as created when GRN was posted)
    await movementCollection.insertOne({
      _id: movementId,
      productId,
      batchId: new mongoose.Types.ObjectId('69c0c2abb7faec9b5231f493'),
      movementType: 'INBOUND',
      quantity: 10,  // Original qty
      stockBefore: 0,
      newStock: 10,
      currentStock: 10,
      unitCost: 10,
      totalAmount: 100,
      reference: 'GRN-2025-2026-00093',
      referenceId: grnId,
      referenceType: 'PURCHASE_ORDER',
      costingMethodUsed: 'FIFO',
      documentDate: new Date('2026-03-23'),
      notes: 'GRN Receipt - GRN-2025-2026-00093 from al arab',
      createdBy: userId,
      updatedBy: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      __v: 0
    });

    // Insert payment
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

    console.log('✅ Test data created (qty=10, total=$105)\n');

    // ===============================================
    // STEP 3: FETCH BEFORE STATE
    // ===============================================
    console.log('📖 BEFORE Edit:');
    const GrnModel = mongoose.model('Grn');
    const grn = await GrnModel.findById(grnId);
    const movementBefore = await StockMovement.findById(movementId);

    console.log(`   GRN qty: ${grn.items[0].quantity}`);
    console.log(`   StockMovement qty: ${movementBefore?.quantity || 0}`);
    console.log(`   StockMovement newStock: ${movementBefore?.newStock || 0}\n`);

    // ===============================================
    // STEP 4: PREPARE EDIT (qty 10 → 100)
    // ===============================================
    console.log('='.repeat(60));
    console.log('🔧 Step 4: Preparing GRN Edit\n');

    const editedItems = grn.items.map(item => ({
      ...item.toObject?.() || item,
      quantity: 100,
      netCost: 1000,
      taxAmount: 50,
      totalCost: 1050,
    }));

    console.log(`Edit: qty 10 → 100 (delta: +90)`);
    console.log(`Cost: $105 → $1,050\n`);

    // ===============================================
    // STEP 5: EXECUTE EDIT
    // ===============================================
    console.log('🔄 Step 5: Executing Edit with TRANSACTION\n');

    const result = await ImprovedGRNEditManager.editGRN(
      grn._id,
      {
        items: editedItems,
        notes: 'Test: qty increase from 10 to 100'
      },
      userId
    );

    // ===============================================
    // STEP 6: VERIFY RESULTS
    // ===============================================
    console.log('\n' + '='.repeat(60));
    console.log('✅ Step 6: Verifying Results\n');

    const grnAfter = await GrnModel.findById(grnId);
    const movementAfter = await StockMovement.findById(movementId);

    console.log(`📖 AFTER Edit:`);
    console.log(`   GRN qty: ${grnAfter.items[0].quantity}`);
    console.log(`   StockMovement qty: ${movementAfter?.quantity || 0}`);
    console.log(`   StockMovement newStock: ${movementAfter?.newStock || 0}\n`);

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
    if (grnAfter.items[0].quantity === 100) {
      console.log('   ✅ GRN quantity updated (10 → 100)');
    } else {
      console.log(`   ❌ GRN quantity NOT updated (got ${grnAfter.items[0].quantity})`);
      allPassed = false;
    }

    // Check 3: StockMovement quantity updated ✅ NEW CHECK
    if (movementAfter?.quantity === 100) {
      console.log('   ✅ StockMovement quantity UPDATED (10 → 100) 🎉');
    } else {
      console.log(`   ❌ StockMovement quantity NOT updated (got ${movementAfter?.quantity})`);
      allPassed = false;
    }

    // Check 4: StockMovement newStock updated ✅ NEW CHECK
    if (movementAfter?.newStock === 100) {
      console.log('   ✅ StockMovement newStock UPDATED (10 → 100) 🎉');
    } else {
      console.log(`   ❌ StockMovement newStock NOT updated (got ${movementAfter?.newStock})`);
      allPassed = false;
    }

    // Check 5: StockMovement totalAmount updated
    if (movementAfter?.totalAmount === 1000) {
      console.log('   ✅ StockMovement totalAmount UPDATED ($100 → $1,000)');
    } else {
      console.log(`   ❌ StockMovement totalAmount NOT updated (got $${movementAfter?.totalAmount})`);
      allPassed = false;
    }

    console.log('\n' + '='.repeat(60));
    if (allPassed) {
      console.log(`✅ ALL TESTS PASSED - STOCK MOVEMENT UPDATES WORK!\n`);
      console.log(`What happened:`);
      console.log(`  ✓ GRN qty: 10 → 100 units`);
      console.log(`  ✓ StockMovement qty: 10 → 100 (audit trail updated)`);
      console.log(`  ✓ StockMovement newStock: 10 → 100`);
      console.log(`  ✓ StockMovement totalAmount: $100 → $1,000`);
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
