const mongoose = require('mongoose');
const Product = require('./models/Product');

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/nexis-erp')
  .then(async () => {
    console.log('Checking MongoDB for imagePath data...\n');
    
    // Check for I Phone specifically
    const iphone = await Product.findOne({ name: 'I Phone' });
    console.log('I Phone product:');
    console.log('  - Name:', iphone?.name);
    console.log('  - imagePath:', iphone?.imagePath);
    
    // Check count
    const count = await Product.countDocuments({ imagePath: { $exists: true, $ne: null } });
    console.log('\nTotal products with imagePath:', count);
    
    // Show some samples
    const samples = await Product.find({ imagePath: { $exists: true, $ne: null } }).limit(5);
    console.log('Sample products with imagePath:');
    samples.forEach(p => console.log('  -', p.name, ':', p.imagePath));
    
    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
  });
