#!/usr/bin/env node

/**
 * Direct MongoDB Query - Raw collection check
 */

import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

async function checkRaw() {
  const client = new MongoClient(process.env.MONGODB_URI || 'mongodb://localhost:27017');
  
  try {
    console.log('🔍 Direct MongoDB Check\n');
    await client.connect();
    const db = client.db();
    
    // List all collections
    const collections = await db.listCollections().toArray();
    console.log(`📊 Collections found: ${collections.length}`);
    collections.forEach(c => console.log(`   - ${c.name}`));

    // Check specific collections
    console.log('\n📈 Record Counts:');
    
    const collections_to_check = ['current_stock', 'granitestocks', 'grns', 'stock_movements', 'gnrs', 'grn'];
    
    for (const collName of collections_to_check) {
      try {
        const count = await db.collection(collName).countDocuments();
        const sample = await db.collection(collName).findOne();
        console.log(`\n   ${collName}:`);
        console.log(`      Count: ${count}`);
        if (sample) {
          console.log(`      Sample: ${JSON.stringify(sample).substring(0, 100)}...`);
        }
      } catch (e) {
        // Collection might not exist
      }
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await client.close();
  }
}

checkRaw();
