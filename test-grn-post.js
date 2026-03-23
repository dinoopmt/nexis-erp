const mongoose = require('mongoose');
const axios = require('axios');

(async () => {
  try {
    console.log('🔍 Connecting to MongoDB and finding GRNs...\n');
    
    await mongoose.connect('mongodb://127.0.0.1:27017/nexis_erp');
    
    // Find a draft GRN
    const grn = await mongoose.connection.db.collection('grns').findOne({
      status: { $in: ['Draft', 'draft'] }
    });

    if (!grn) {
      console.log('❌ No draft GRN found. Looking for any GRN...');
      const allGrn = await mongoose.connection.db.collection('grns').findOne({});
      if (allGrn) {
        console.log(`Found GRN: ${allGrn.grnNumber} (Status: ${allGrn.status})`);
        console.log(`ID: ${allGrn._id}`);
      } else {
        console.log('❌ No GRNs found at all');
        process.exit(1);
      }
    } else {
      console.log(`✅ Found draft GRN: ${grn.grnNumber}`);
      console.log(`ID: ${grn._id}`);
      console.log(`Items: ${grn.items?.length || 0}`);
      
      // Post the GRN
      const url = `http://localhost:5000/api/v1/grn/${grn._id.toString()}/post`;
      console.log(`\n📤 Posting GRN to: ${url}`);
      
      try {
        const response = await axios.post(url, { createdBy: 'TEST_USER' });
        console.log(`\n✅ GRN Posted Successfully!`);
        console.log(`Response:`, JSON.stringify(response.data, null, 2));
        
        // Now check current_stock collection
        console.log(`\n🔍 Checking current_stock collection...`);
        const stocks = await mongoose.connection.db.collection('current_stock').find({}).toArray();
        console.log(`📊 Current stock documents: ${stocks.length}`);
        if (stocks.length > 0) {
          console.log(`First document:`, JSON.stringify(stocks[0], null, 2));
        }
      } catch (err) {
        console.error(`❌ Error posting GRN:`, err.response?.data || err.message);
      }
    }
    
    await mongoose.connection.close();
    
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
})();
