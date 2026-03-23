#!/usr/bin/env node

/**
 * Test: Edit GRN-2 using ImprovedGRNEditManager
 * 
 * GRN-2 (GRN-2025-2026-00078)
 * Current: qty=480
 * Target: qty=4800
 * Expected Delta: +4320
 * Expected New Total Stock: 1020 + 4320 = 5340
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import './Models/Grn.js';
import './Models/CurrentStock.js';
import './Models/VendorPayment.js';
import ImprovedGRNEditManager from './modules/accounting/services/ImprovedGRNEditManager.js';

dotenv.config();

async function testEditGRN2() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/nexis_erp');
    console.log('✅ Connected to database\n');

    const Grn = mongoose.model('Grn');
    const CurrentStock = mongoose.model('CurrentStock');

    // ===============================================
    // FIND GRN-2
    // ===============================================
    const grn2Id = '69c0412b415ad92c6f119684';
    const grn2 = await Grn.findById(grn2Id);

    if (!grn2) {
      console.log('❌ GRN-2 not found');
      process.exit(1);
    }

    console.log('📊 BEFORE EDIT:');
    console.log('═══════════════════════════════════════');
    console.log(`GRN: ${grn2.grnNumber}`);
    console.log(`Current qty: ${grn2.items[0].quantity}`);
    console.log(`Current total: ${grn2.totalAmount}\n`);

    const stockBefore = await CurrentStock.findOne({
      productId: grn2.items[0].productId
    });

    console.log(`CurrentStock BEFORE:`);
    console.log(`  totalQuantity: ${stockBefore.totalQuantity}`);
    console.log(`  availableQuantity: ${stockBefore.availableQuantity}\n`);

    // ===============================================
    // EXECUTE EDIT
    // ===============================================
    console.log('🔧 EXECUTING EDIT:');
    console.log('═══════════════════════════════════════');
    console.log(`Changing qty: 480 → 4800`);
    console.log(`Delta: +4320`);
    console.log(`Expected new total: 1020 + 4320 = 5340\n`);

    const editPayload = {
      items: [
        {
          productId: grn2.items[0].productId,
          itemName: grn2.items[0].itemName,
          itemCode: grn2.items[0].itemCode,
          quantity: 4800,  // ← CHANGE FROM 480 TO 4800
          unitType: grn2.items[0].unitType,
          foc: grn2.items[0].foc,
          focQty: grn2.items[0].focQty,
          unitCost: grn2.items[0].unitCost,
          itemDiscount: grn2.items[0].itemDiscount,
          itemDiscountPercent: grn2.items[0].itemDiscountPercent,
          taxType: grn2.items[0].taxType,
          taxPercent: grn2.items[0].taxPercent,
          batchNumber: grn2.items[0].batchNumber || ''
        }
      ],
      notes: 'Test edit: qty 480 → 4800'
    };

    const result = await ImprovedGRNEditManager.editGRN(
      grn2Id,
      editPayload,
      '69beee6a4083203fc968ae78'  // Test user
    );

    console.log('📋 EDIT RESULT:');
    console.log('═══════════════════════════════════════');
    console.log(JSON.stringify(result, null, 2));

    if (!result.success) {
      console.error('\n❌ EDIT FAILED:', result.error);
      process.exit(1);
    }

    // ===============================================
    // VERIFY CHANGES
    // ===============================================
    console.log('\n\n📊 AFTER EDIT:');
    console.log('═══════════════════════════════════════');

    const grn2After = await Grn.findById(grn2Id);
    console.log(`GRN qty: ${grn2After.items[0].quantity}`);
    console.log(`GRN total: ${grn2After.totalAmount}\n`);

    const stockAfter = await CurrentStock.findOne({
      productId: grn2.items[0].productId
    });

    console.log(`CurrentStock AFTER:`);
    console.log(`  totalQuantity: ${stockAfter.totalQuantity}`);
    console.log(`  availableQuantity: ${stockAfter.availableQuantity}\n`);

    // ===============================================
    // VERIFICATION
    // ===============================================
    console.log('✅ VERIFICATION:');
    console.log('═══════════════════════════════════════');

    const expectedTotal = 520 + 4800;  // GRN-1 (520) + GRN-2 (4800)
    const expectedAvailable = expectedTotal - (stockAfter.allocatedQuantity || 0) - (stockAfter.damageQuality || 0);

    const grnQtyCorrect = grn2After.items[0].quantity === 4800;
    const totalQtyCorrect = stockAfter.totalQuantity === expectedTotal;
    const availableQtyCorrect = stockAfter.availableQuantity === expectedAvailable;

    console.log(`GRN qty updated to 4800: ${grnQtyCorrect ? '✅' : '❌'}`);
    console.log(`  Expected: 4800, Got: ${grn2After.items[0].quantity}`);

    console.log(`\nCurrentStock.totalQuantity updated to ${expectedTotal}: ${totalQtyCorrect ? '✅' : '❌'}`);
    console.log(`  Expected: ${expectedTotal}, Got: ${stockAfter.totalQuantity}`);

    console.log(`\nCurrentStock.availableQuantity updated to ${expectedAvailable}: ${availableQtyCorrect ? '✅' : '❌'}`);
    console.log(`  Expected: ${expectedAvailable}, Got: ${stockAfter.availableQuantity}`);

    if (grnQtyCorrect && totalQtyCorrect && availableQtyCorrect) {
      console.log('\n\n🎯 TEST PASSED! ✅');
      console.log('All updates applied correctly and atomically');
    } else {
      console.log('\n\n🔴 TEST FAILED! ❌');
      console.log('Some updates did not apply correctly');
    }

    process.exit(0);

  } catch (error) {
    console.error('❌ Test error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

testEditGRN2();
