/**
 * Seed Default Terminals
 * 
 * Creates system default BACKOFFICE terminal on server startup
 * Required for:
 * - License control and terminal limits
 * - System fallback when no terminals configured
 * - User license verification
 */

import TerminalManagement from './Models/TerminalManagement.js';
import StoreSettings from './Models/StoreSettings.js';
import mongoose from 'mongoose';

export const seedDefaultTerminals = async () => {
  try {
    // Check if default BACKOFFICE terminal exists
    const existingDefault = await TerminalManagement.findOne({
      terminalId: 'BACKOFFICE-DEFAULT',
    });

    if (existingDefault) {
      console.log('✅ Default BACKOFFICE terminal already exists');
      return;
    }

    // Get or create a default store
    let storeId;
    try {
      const defaultStore = await StoreSettings.findOne().sort({ createdAt: 1 });
      if (defaultStore) {
        storeId = defaultStore._id;
      } else {
        // Create a default store if none exists
        const newStore = new StoreSettings({
          storeName: 'Default Store',
          storeCode: 'DEFAULT',
        });
        await newStore.save();
        storeId = newStore._id;
        console.log('✅ Created default store for terminal seeding');
      }
    } catch (storeErr) {
      console.warn('⚠️  Could not find or create store, using placeholder ObjectId');
      storeId = new mongoose.Types.ObjectId();
    }

    // Create default BACKOFFICE terminal
    const defaultTerminal = new TerminalManagement({
      terminalId: 'BACKOFFICE-DEFAULT',
      terminalName: 'Default Backoffice',
      terminalType: 'BACKOFFICE',
      terminalStatus: 'ACTIVE',
      storeId: storeId,
      invoiceControls: {
        invoiceNumberPrefix: 'BO',
        invoiceFormat: 'STANDARD',
      },
      formatMapping: {
        invoice: {
          enabled: true,
          templateId: null,
          printOnSale: true,
          copies: 1,
        },
        deliveryNote: {
          enabled: false,
          templateId: null,
          requiresSignature: false,
        },
        quotation: {
          enabled: false,
          templateId: null,
          validityDays: 30,
        },
        salesOrder: {
          enabled: false,
          templateId: null,
          requiresApproval: false,
        },
        salesReturn: {
          enabled: true,
          templateId: null,
          requiresReason: true,
        },
      },
      hardwareMapping: {
        printer: {
          enabled: false,
          printerName: '',
          printerModel: 'EPSON',
          paperSize: '80MM',
          copies: 1,
          timeout: 5000,
        },
        customerDisplay: {
          enabled: false,
          displayType: 'LCD',
          displayId: '',
          protocol: 'USB',
          displayItems: true,
          displayPrice: true,
          displayTotal: true,
          displayDiscount: true,
        },
      },
      createdBy: 'SYSTEM',
    });

    const result = await defaultTerminal.save();
    console.log('✅ Default BACKOFFICE terminal created successfully');
    console.log(`   Terminal ID: BACKOFFICE-DEFAULT`);
    console.log(`   Terminal Name: Default Backoffice`);
    console.log(`   Type: BACKOFFICE (Administrative Terminal)`);
    console.log(`   Store ID: ${storeId}`);

    return result;
  } catch (error) {
    if (error.code === 11000) {
      // Duplicate key error - already exists
      console.log('✅ Default BACKOFFICE terminal already exists (duplicate prevention)');
      return;
    }
    console.error('❌ Error seeding default terminals:', error.message);
    throw error;
  }
};
