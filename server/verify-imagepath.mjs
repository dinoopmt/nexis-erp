import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/nexis_erp';

async function checkImagePath() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Checking MongoDB for imagePath data...\n');
    
    // Check the raw collection
    const collection = mongoose.connection.collection('addproducts');
    
    // Check for I Phone specifically
    const iphone = await collection.findOne({ name: 'I Phone' });
    console.log('I Phone product:');
    console.log('  - Name:', iphone?.name);
    console.log('  - imagePath:', iphone?.imagePath);
    
    // Check count
    const count = await collection.countDocuments({ imagePath: { $exists: true, $ne: null } });
    console.log('\nTotal products with imagePath:', count);
    
    // Show some samples
    const samples = await collection.find({ imagePath: { $exists: true, $ne: null } }).limit(5).toArray();
    console.log('Sample products with imagePath:');
    samples.forEach(p => console.log('  -', p.name, ':', p.imagePath));
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

checkImagePath();
