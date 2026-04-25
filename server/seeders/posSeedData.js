import mongoose from 'mongoose';
import connectDB from '../db/db.js';

async function seedPOS() {
  try {
    await connectDB();
    console.log('✓ Database connected');

    console.log('\n✅ POS seeding completed successfully!');
    console.log('Roles and terminals can be created from UI.');

  } catch (error) {
    console.error('❌ Seeding failed:', error);
    throw error;
  }
}

export { seedPOS };

// Run as standalone script
if (import.meta.url === `file://${process.argv[1]}`) {
  seedPOS().then(() => process.exit(0)).catch(() => process.exit(1));
}
