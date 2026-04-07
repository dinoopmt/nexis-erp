import mongoose from 'mongoose';
import POSTerminal from '../Models/POS/POSTerminal.js';
import User from '../Models/User.js';
import Role from '../Models/Role.js';
import connectDB from '../db/db.js';

async function seedPOS() {
  try {
    await connectDB();
    console.log('✓ Database connected');

    // Find or create Cashier role
    let cashierRole = await Role.findOne({ name: 'Cashier' });
    if (!cashierRole) {
      cashierRole = new Role({
        name: 'Cashier',
        description: 'POS operator role',
        permissions: ['CREATE_SALES_INVOICE', 'MANAGE_SALES_RETURN', 'CREATE_JOURNAL_ENTRY'],
      });
      await cashierRole.save();
      console.log('✓ Created Cashier role');
    }

    // Create test operators
    const operators = [
      {
        username: 'operator1',
        email: 'operator1@test.com',
        password: 'Test@123', // In production, this should be hashed
        fullName: 'John Operator',
        role: cashierRole._id,
      },
      {
        username: 'operator2',
        email: 'operator2@test.com',
        password: 'Test@123',
        fullName: 'Jane Cashier',
        role: cashierRole._id,
      },
    ];

    for (const op of operators) {
      const exists = await User.findOne({ username: op.username });
      if (!exists) {
        const user = new User(op);
        await user.save();
        console.log(`✓ Created operator: ${op.fullName}`);
      }
    }

    // Create test terminals
    const terminals = [
      {
        terminalId: 'POS-001',
        terminalName: 'Main Counter',
        location: 'Floor 1 - Counter A',
        description: 'Main sales counter',
      },
      {
        terminalId: 'POS-002',
        terminalName: 'Express Lane',
        location: 'Floor 1 - Express',
        description: 'Express checkout lane',
      },
      {
        terminalId: 'POS-003',
        terminalName: 'Service Counter',
        location: 'Floor 2 - Service',
        description: 'Service and refund counter',
      },
    ];

    for (const terminal of terminals) {
      const exists = await POSTerminal.findOne({ terminalId: terminal.terminalId });
      if (!exists) {
        const newTerminal = new POSTerminal(terminal);
        await newTerminal.save();
        console.log(`✓ Created terminal: ${terminal.terminalName}`);
      }
    }

    console.log('\n✅ POS seeding completed successfully!');
    console.log('\nTest credentials:');
    console.log('  Operator 1: operator1 / Test@123');
    console.log('  Operator 2: operator2 / Test@123');
    console.log('\nAvailable terminals:');
    console.log('  POS-001 (Main Counter)');
    console.log('  POS-002 (Express Lane)');
    console.log('  POS-003 (Service Counter)');

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
