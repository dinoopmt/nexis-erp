import mongoose from 'mongoose';
import Grn from './server/Models/Grn.js';
import AddProduct from './server/Models/AddProduct.js';
import CurrentStock from './server/Models/CurrentStock.js';
import GRNStockUpdateService from './server/modules/accounting/services/GRNStockUpdateService.js';

console.log('\n🧪 TESTING GRN STOCK UPDATE - DIRECT METHOD CALL\n');

(async () => {
  try {
    // Connect
    console.log('1️⃣ Connecting to MongoDB...');
    await mongoose.connect('mongodb://127.0.0.1:27017/nexis_erp');
    console.log('✅ Connected\n');
    
    // Get product
    console.log('2️⃣ Getting product...');
    const product = await AddProduct.findOne();
    if (!product) {
      console.log('❌ No products found');
      throw new Error('No products');
    }
    console.log(`✅ Found: ${product.itemcode}\n`);
    
    // Clear previous test data
    console.log('3️⃣ Clearing previous test stock data...');
    await CurrentStock.deleteMany({ productId: product._id });
    console.log('✅ Cleared\n');
    
    // Create test GRN object
    console.log('4️⃣ Creating test GRN object...');
    const testGrn = {
      _id: new mongoose.Types.ObjectId(),
      grnNumber: `TEST-GRN-${Date.now()}`,
      grnDate: new Date(),
      vendorId: new mongoose.Types.ObjectId(),
      vendorName: 'TEST VENDOR',
      createdBy: 'TEST_USER'
    };
    console.log(`✅ Created: ${testGrn.grnNumber}\n`);
    
    // Create test item
    console.log('5️⃣ Creating test item...');
    const testItem = {
      productId: product._id,
      itemCode: product.itemcode,
      quantity: 100,
      conversionFactor: 1,
      unitCost: 50,
      totalCost: 5000
    };
    console.log(`✅ Created item: ${testItem.quantity} units\n`);
    
    // Call updateCurrentStock directly
    console.log('6️⃣ CALLING updateCurrentStock directly...\n');
    console.log('─'.repeat(60));
    const result = await GRNStockUpdateService.updateCurrentStock(product, testItem, testGrn);
    console.log('─'.repeat(60)\n);
    
    if (!result) {
      console.log('❌ updateCurrentStock returned null\n');
      throw new Error('Update failed');
    }
    
    console.log('✅ updateCurrentStock returned result:');
    console.log(`   Stock ID: ${result.stockId}`);
    console.log(`   Total Qty: ${result.totalQuantity}`);
    console.log(`   Available: ${result.availableQuantity}\n`);
    
    // Verify in database
    console.log('7️⃣ Verifying in current_stock collection...');
    const savedStock = await CurrentStock.findOne({ productId: product._id });
    if (!savedStock) {
      console.log('❌ NOT FOUND in current_stock collection!\n');
    } else {
      console.log(`✅ Found in collection:`);
      console.log(`   Total: ${savedStock.totalQuantity}`);
      console.log(`   Available: ${savedStock.availableQuantity}`);
      console.log(`   History entries: ${savedStock.updateHistory?.length || 0}\n`);
    }
    
    // Check direct MongoDB
    console.log('8️⃣ Checking direct MongoDB...');
    const db = mongoose.connection.db;
    const directDoc = await db.collection('current_stock').findOne({ productId: product._id });
    if (!directDoc) {
      console.log('❌ NOT FOUND in MongoDB current_stock collection!\n');
    } else {
      console.log(`✅ Found in MongoDB:`);
      console.log(`   Total: ${directDoc.totalQuantity}`);
      console.log(`   Available: ${directDoc.availableQuantity}\n`);
    }
    
    console.log('═'.repeat(60));
    console.log('✅ TEST COMPLETE\n');
    
    await mongoose.connection.close();
    process.exit(0);
    
  } catch (err) {
    console.error('\n❌ ERROR:', err.message);
    process.exit(1);
  }
})();
