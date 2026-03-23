import mongoose from 'mongoose';
import Grn from './server/Models/Grn.js';
import AddProduct from './server/Models/AddProduct.js';
import GRNStockUpdateService from './server/modules/accounting/services/GRNStockUpdateService.js';
import CurrentStock from './server/Models/CurrentStock.js';

(async () => {
  try {
    console.log('📦 COMPREHENSIVE GRN STOCK UPDATE TEST\n');
    console.log('═'.repeat(80));
    
    // STEP 1: Connect
    console.log('\n1️⃣ CONNECTING TO MONGODB...');
    await mongoose.connect('mongodb://127.0.0.1:27017/nexis_erp');
    console.log('✅ Connected');
    
    // STEP 2: Verify models
    console.log('\n2️⃣ VERIFYING MODELS...');
    console.log(`   Grn model: ${Grn.modelName}`);
    console.log(`   AddProduct model: ${AddProduct.modelName}`);
    console.log(`   CurrentStock model: ${CurrentStock.modelName}`);
    console.log(`   CurrentStock collection: ${CurrentStock.collection.name}`);
    
    // STEP 3: Get or create test data
    console.log('\n3️⃣ GETTING TEST DATA...');
    let product = await AddProduct.findOne().select('_id itemcode stock quantity');
    if (!product) {
      console.log('   ❌ No products found in database');
      process.exit(1);
    }
    console.log(`   ✅ Found product: ${product.itemcode} (ID: ${product._id})`);
    
    // STEP 4: Create test GRN
    console.log('\n4️⃣ CREATING TEST GRN...');
    const testGrn = new Grn({
      grnNumber: `TEST-GRN-${Date.now()}`,
      grnDate: new Date(),
      vendorId: new mongoose.Types.ObjectId(),
      vendorName: 'TEST VENDOR',
      items: [{
        productId: product._id,
        itemCode: product.itemcode,
        quantity: 50,
        conversionFactor: 1,
        unitCost: 100,
        totalCost: 5000
      }],
      status: 'Draft',
      createdBy: 'TEST_USER'
    });
    const savedGrn = await testGrn.save();
    console.log(`   ✅ Created: ${savedGrn.grnNumber} (ID: ${savedGrn._id})`);
    
    // STEP 5: Call processGrnStockUpdate directly
    console.log('\n5️⃣ CALLING processGrnStockUpdate...');
    const result = await GRNStockUpdateService.processGrnStockUpdate(savedGrn.toObject(), 'TEST_USER');
    console.log('   Stock update result:');
    console.log(`   - Items processed: ${result.processedItems?.length || 0}`);
    console.log(`   - Current stock updates: ${result.currentStockUpdates?.length || 0}`);
    console.log(`   - Errors: ${result.errors?.length || 0}`);
    
    if (result.currentStockUpdates && result.currentStockUpdates.length > 0) {
      console.log(`\n   Current stock updates details:`);
      result.currentStockUpdates.forEach((u, i) => {
        console.log(`   [${i}] ${u.itemCode}: +${u.quantityAdded} (Total: ${u.totalQuantity})`);
      });
    }
    
    // STEP 6: Check current_stock collection
    console.log('\n6️⃣ CHECKING current_stock COLLECTION...');
    const stocks = await CurrentStock.find().select('productId totalQuantity availableQuantity');
    console.log(`   Total documents: ${stocks.length}`);
    
    stocks.forEach((s, i) => {
      console.log(`   [${i}] ProductID: ${s.productId} | Total: ${s.totalQuantity} | Available: ${s.availableQuantity}`);
    });
    
    if (stocks.length === 0) {
      console.log('   ❌ COLLECTION IS EMPTY!');
    }
    
    // STEP 7: Check direct MongoDB
    console.log('\n7️⃣ CHECKING DIRECT MONGODB...');
    const db = mongoose.connection.db;
    const directCount = await db.collection('current_stock').countDocuments();
    console.log(`   Direct count: ${directCount}`);
    
    const directDocs = await db.collection('current_stock').find().limit(3).toArray();
    directDocs.forEach((doc, i) => {
      console.log(`   [${i}] ${doc._id} | Total: ${doc.totalQuantity}`);
    });
    
    console.log('\n' + '═'.repeat(80));
    console.log('✅ TEST COMPLETE\n');
    
    await mongoose.connection.close();
    process.exit(0);
    
  } catch (err) {
    console.error('\n❌ ERROR:', err.message);
    console.error('Stack:', err.stack);
    process.exit(1);
  }
})();
