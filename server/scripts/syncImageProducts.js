/**
 * Script to manually sync products with imagePath to MeiliSearch
 * Simple version using direct MeiliSearch indexing
 */

import mongoose from 'mongoose';
import { getClient } from '../config/meilisearch.js';
import CurrentStock from '../Models/CurrentStock.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/nexis_erp';

async function syncProductsWithImages() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find products that have imagePath set using raw collection
    console.log('\n🔍 Finding products with imagePath...');
    const productsWithImages = await mongoose.connection.collection('addproducts').find({ 
      imagePath: { $exists: true, $ne: null } 
    }).toArray();

    console.log(`📦 Found ${productsWithImages.length} products with imagePath\n`);

    if (productsWithImages.length === 0) {
      console.log('⚠️  No products with imagePath found to sync');
      await mongoose.disconnect();
      process.exit(0);
    }

    // Get CurrentStock data
    const productIds = productsWithImages.map(p => new mongoose.Types.ObjectId(p._id));
    const currentStocks = await CurrentStock.find({
      productId: { $in: productIds },
      isDeleted: { $ne: true }
    }).lean();

    const stockMap = new Map();
    currentStocks.forEach(stock => {
      stockMap.set(stock.productId.toString(), stock);
    });

    // Prepare documents for MeiliSearch
    console.log('📝 Preparing documents for MeiliSearch...');
    const documents = productsWithImages.map((product) => {
      const currentStock = stockMap.get(product._id.toString());
      return {
        _id: product._id.toString(),
        name: product.name,
        itemcode: product.itemcode,
        barcode: product.barcode || '',
        price: parseFloat(product.price) || 0,
        finalPrice: parseFloat(product.finalPrice) || 0,
        cost: parseFloat(product.cost) || 0,
        stock: product.stock || 0,
        currentStock: currentStock ? {
          totalQuantity: currentStock.totalQuantity || 0,
          availableQuantity: currentStock.availableQuantity || 0,
          allocatedQuantity: currentStock.allocatedQuantity || 0,
          grnReceivedQuantity: currentStock.grnReceivedQuantity || 0
        } : null,
        tax: product.tax || 0,
        taxPercent: parseFloat(product.taxPercent) || 0,
        taxType: product.taxType || '',
        trackExpiry: product.trackExpiry || false,
        vendor: product.vendor || '',
        categoryId: product.categoryId || '',
        unitType: product.unitType || '',
        unitSymbol: product.unitSymbol || '',
        unitDecimal: product.unitDecimal || 0,
        packingUnits: product.packingUnits ? JSON.stringify(product.packingUnits) : '[]',
        isDeleted: product.isDeleted || false,
        image: product.image || null,
        imagePath: product.imagePath || null,  // ✅ Include imagePath
        createdate: product.createdate ? new Date(product.createdate).getTime() : Date.now(),
      };
    });

    console.log(`📝 Prepared ${documents.length} documents for indexing\n`);
    
    // Show what we're indexing
    console.log('📤 Documents to be indexed:');
    documents.forEach((doc, idx) => {
      console.log(`   ${idx + 1}. ${doc.name} (imagePath: ${doc.imagePath})`);
    });

    // Index to MeiliSearch
    console.log(`\n🔄 Indexing to MeiliSearch...`);
    const meilisearchClient = getClient();
    const task = await meilisearchClient.index('products').addDocuments(documents);
    const taskUid = task?.taskUid ?? task?.uid;

    if (taskUid) {
      console.log(`⏳ Waiting for MeiliSearch task ${taskUid}...`);
      const completedTask = await meilisearchClient.tasks.waitForTask(taskUid, {
        timeoutMs: 30000,
        intervalMs: 500,
      });

      if (completedTask.status === 'succeeded') {
        console.log(`✅ Task ${taskUid} completed successfully - ${documents.length} products indexed`);
      } else {
        console.log(`⚠️  Task completed with status: ${completedTask.status}`);
      }
    }

    // Verify in MeiliSearch
    console.log('\n🔍 Verifying in MeiliSearch...');
    const meilisearchClientForSearch = getClient();
    const searchResults = await meilisearchClientForSearch.index('products').search('I Phone', {
      limit: 5,
      attributesToRetrieve: ['_id', 'name', 'itemcode', 'imagePath', 'image']
    });

    if (searchResults.hits.length > 0) {
      const iphone = searchResults.hits[0];
      console.log(`\n📱 I Phone search result:`);
      console.log(`   Name: ${iphone.name}`);
      console.log(`   imagePath: ${iphone.imagePath}`);
      console.log(`   image: ${iphone.image}`);
    }

    console.log('\n✅ Sync completed!');
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error(err);
    await mongoose.disconnect();
    process.exit(1);
  }
}

syncProductsWithImages();


