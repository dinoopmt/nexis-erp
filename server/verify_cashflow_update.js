import mongoose from 'mongoose';

const mongoURI = 'mongodb://127.0.0.1:27017/nexis_erp';

async function checkCashflowAfterReceipt() {
  try {
    await mongoose.connect(mongoURI);
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db;

    // Find the cashflow entry for the invoice
    const cashflows = db.collection('credit_customer_cashflows');
    const cashflow = await cashflows.findOne({ invoiceNumber: 'SI/2025-26/0115' });

    if (cashflow) {
      console.log('✅ CASHFLOW ENTRY FOUND:\n');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`Invoice: ${cashflow.invoiceNumber}`);
      console.log(`Customer: ${cashflow.customerName}`);
      console.log(`DR Amount (Invoice): ₹${cashflow.drAmount}`);
      console.log(`CR Amount (Payment): ₹${cashflow.crAmount}`);
      console.log(`Discount Amount: ₹${cashflow.discountAmount || 0}`);
      console.log(`Balance: ₹${cashflow.balance}`);
      console.log(`Status: ${cashflow.status}`);
      console.log(`Updated Date: ${cashflow.updatedDate}`);
      console.log(`Narration: ${cashflow.narration || 'N/A'}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

      // Verification
      if (cashflow.balance === 0 && cashflow.status === 'Settled' && cashflow.crAmount === 15.75) {
        console.log('✅ ✅ ✅ SUCCESS! CASHFLOW WAS PROPERLY UPDATED!');
        console.log('   ✓ Balance reduced to 0');
        console.log('   ✓ Status changed to Settled');
        console.log('   ✓ CR Amount set to payment received (15.75)');
      } else {
        console.log('⚠️  CASHFLOW NOT PROPERLY UPDATED:');
        if (cashflow.balance !== 0) console.log(`   ✗ Balance: ${cashflow.balance} (expected 0)`);
        if (cashflow.status !== 'Settled') console.log(`   ✗ Status: ${cashflow.status} (expected Settled)`);
        if (cashflow.crAmount !== 15.75) console.log(`   ✗ CR Amount: ${cashflow.crAmount} (expected 15.75)`);
      }
    } else {
      console.log('❌ NO CASHFLOW ENTRY FOUND for invoice SI/2025-26/0115');
    }

    // Also check if there are any recent cashflow entries
    console.log('\n📊 Recent cashflow entries (last 5):');
    const recent = await cashflows.find({}).sort({ updatedDate: -1 }).limit(5).toArray();
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    for (const entry of recent) {
      console.log(`${entry.invoiceNumber || 'No Invoice'} | Balance: ${entry.balance} | Status: ${entry.status} | Updated: ${new Date(entry.updatedDate).toLocaleTimeString()}`);
    }
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkCashflowAfterReceipt();
