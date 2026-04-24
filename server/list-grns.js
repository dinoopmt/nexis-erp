import mongoose from 'mongoose';
import Grn from './Models/Grn.js';

mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/nexis_erp').then(async () => {
  const count = await Grn.countDocuments();
  console.log(`Total GRNs in DB: ${count}`);
  
  if (count === 0) {
    console.log('No GRNs found. Will need to create test data.');
  } else {
    const grns = await Grn.find().limit(10).select('_id grnNumber status items');
    console.log('\nAvailable GRNs:');
    grns.forEach(g => {
      console.log(`  ${g.grnNumber} (${g.status}) - ${g.items?.length || 0} items`);
    });
  }
  process.exit(0);
}).catch(e => {
  console.error('Error:', e.message);
  process.exit(1);
});
