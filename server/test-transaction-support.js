/**
 * ✅ TEST: VERIFY TRANSACTION SUPPORT
 * 
 * Run this AFTER setting up MongoDB replica set
 * Should succeed when MongoDB is configured for transactions
 */

import mongoose from 'mongoose';

const MONGO_URI = 'mongodb://localhost:27017/nexis-erp';

async function testTransactionSupport() {
  try {
    console.log('🚀 TESTING TRANSACTION SUPPORT\n');
    console.log('URI:', MONGO_URI);
    console.log('Expected: Single-node or multi-node MongoDB Replica Set\n');

    // ===============================================
    // STEP 1: CONNECT
    // ===============================================
    console.log('📡 Step 1: Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected\n');

    // ===============================================
    // STEP 2: CHECK REPLICA SET STATUS
    // ===============================================
    console.log('📊 Step 2: Checking replica set status...');
    
    const adminDb = mongoose.connection.db.admin();
    const replicaStatus = await adminDb.command({ replSetGetStatus: 1 });
    
    console.log('✅ Replica Set Status:');
    console.log(`   Set Name: ${replicaStatus.set}`);
    console.log(`   Members: ${replicaStatus.members.length}`);
    replicaStatus.members.forEach((member, idx) => {
      console.log(`     [${idx}] ${member.name} (${member.stateStr})`);
    });
    console.log();

    // ===============================================
    // STEP 3: TEST SESSION CREATION
    // ===============================================
    console.log('🔄 Step 3: Creating MongoDB session...');
    
    const session = await mongoose.startSession();
    console.log('✅ Session created successfully!\n');

    // ===============================================
    // STEP 4: TEST TRANSACTION (if supported)
    // ===============================================
    console.log('💳 Step 4: Testing transaction...');

    try {
      // Start a transaction
      await session.withTransaction(async () => {
        console.log('   ✅ Inside transaction block');
        
        // Do a simple operation
        const testDb = mongoose.connection.db;
        const testResult = await testDb.collection('test_transactions').insertOne(
          { test: true, createdAt: new Date() },
          { session }
        );
        
        console.log('   ✅ Write operation succeeded');
        console.log(`   ✅ Document ID: ${testResult.insertedId}`);
      });

      console.log('✅ Transaction completed successfully!\n');

    } catch (txnError) {
      console.error('❌ Transaction failed:', txnError.message);
      throw txnError;
    } finally {
      session.endSession();
    }

    // ===============================================
    // RESULTS
    // ===============================================
    console.log('='.repeat(60));
    console.log('✅ ALL TESTS PASSED');
    console.log('');
    console.log('TRANSACTION SUPPORT: ENABLED ✅');
    console.log('');
    console.log('Your MongoDB is ready for:');
    console.log('  ✓ ImprovedGRNEditManager (with transactions)');
    console.log('  ✓ Atomic GRN edits with stock updates');
    console.log('  ✓ Data consistency guarantees');
    console.log('  ✓ Production deployment');
    console.log('='.repeat(60) + '\n');

    process.exit(0);

  } catch (error) {
    console.error('\n' + '='.repeat(60));
    console.error('❌ TEST FAILED');
    console.error('='.repeat(60));
    
    const isReplicaSetError = 
      error.message?.includes('replica set') ||
      error.message?.includes('transaction');

    if (isReplicaSetError) {
      console.error('\n⚠️  MongoDB is not configured for transactions\n');
      console.error('SOLUTION:');
      console.error('  1. Read: MONGODB_REPLICA_SET_SETUP.md');
      console.error('  2. Set up MongoDB replica set (single-node or multi-node)');
      console.error('  3. Run rs.initiate() in mongosh');
      console.error('  4. Re-run this test\n');
    } else {
      console.error('\n❌ Connection Error:', error.message, '\n');
      console.error('SOLUTION:');
      console.error('  1. Verify MongoDB is running: net start MongoDB');
      console.error('  2. Check port 27017 is open: netstat -an | findstr 27017');
      console.error('  3. Try: mongosh directly to test connection');
      console.error('  4. Re-run this test\n');
    }

    console.error('Full error:', error);
    console.error('='.repeat(60) + '\n');

    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

testTransactionSupport();
