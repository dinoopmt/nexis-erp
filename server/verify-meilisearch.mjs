import mongoose from 'mongoose';
import { getClient } from './config/meilisearch.js';

const MONGODB_URI = 'mongodb://localhost:27017/nexis_erp';

async function verify() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('=== MongoDB Check ===');
    
    const collection = mongoose.connection.collection('addproducts');
    const iphone = await collection.findOne({ name: 'I Phone' });
    console.log('I Phone in MongoDB:');
    console.log('  imagePath:', iphone?.imagePath);
    
    const query = { imagePath: { $exists: true, $ne: null } };
    const withImagePath = await collection.countDocuments(query);
    console.log('Total products with imagePath in MongoDB:', withImagePath);
    
    console.log('\n=== MeiliSearch Check ===');
    const client = getClient();
    const searchResults = await client.index('products').search('I Phone', {
      limit: 1,
      attributesToRetrieve: ['_id', 'name', 'imagePath', 'image']
    });
    
    if (searchResults.hits.length > 0) {
      console.log('I Phone in MeiliSearch:');
      console.log('  imagePath:', searchResults.hits[0].imagePath);
      console.log('  image:', searchResults.hits[0].image);
    }
    
    console.log('\n=== Conclusion ===');
    if (iphone?.imagePath && !searchResults.hits[0]?.imagePath) {
      console.log('ISSUE FOUND: imagePath is in MongoDB but NOT in MeiliSearch');
      console.log('Solution: Need to re-index products with imagePath to MeiliSearch');
    }
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

verify();
