import mongoose from 'mongoose';
import dotenv from 'dotenv';
import UnitType from '../Models/UnitType.js';
import connectDB from '../config/database.js';

dotenv.config();

// Simplified, validated units only

const defaultUnits = [
  // WEIGHT Category
  { unitName: 'Kilogram', unitSymbol: 'KG', factor: 1, unitDecimal: 3, category: 'WEIGHT', baseUnit: true, isActive: true },
  { unitName: 'Gram', unitSymbol: 'G', factor: 1000, unitDecimal: 2, category: 'WEIGHT', baseUnit: false, isActive: true },
  { unitName: 'Milligram', unitSymbol: 'MG', factor: 1000000, unitDecimal: 2, category: 'WEIGHT', baseUnit: false, isActive: true },
  { unitName: 'Pound', unitSymbol: 'LB', factor: 2.20462, unitDecimal: 3, category: 'WEIGHT', baseUnit: false, isActive: true },
  { unitName: 'Ounce', unitSymbol: 'OZ', factor: 35.274, unitDecimal: 2, category: 'WEIGHT', baseUnit: false, isActive: true },

  // LENGTH Category
  { unitName: 'Meter', unitSymbol: 'M', factor: 1, unitDecimal: 3, category: 'LENGTH', baseUnit: true, isActive: true },
  { unitName: 'Centimeter', unitSymbol: 'CM', factor: 100, unitDecimal: 2, category: 'LENGTH', baseUnit: false, isActive: true },
  { unitName: 'Millimeter', unitSymbol: 'MM', factor: 1000, unitDecimal: 2, category: 'LENGTH', baseUnit: false, isActive: true },
  { unitName: 'Kilometer', unitSymbol: 'KM', factor: 0.001, unitDecimal: 4, category: 'LENGTH', baseUnit: false, isActive: true },
  { unitName: 'Inch', unitSymbol: 'IN', factor: 39.3701, unitDecimal: 2, category: 'LENGTH', baseUnit: false, isActive: true },

  // VOLUME Category
  { unitName: 'Liter', unitSymbol: 'L', factor: 1, unitDecimal: 3, category: 'VOLUME', baseUnit: true, isActive: true },
  { unitName: 'Milliliter', unitSymbol: 'ML', factor: 1000, unitDecimal: 2, category: 'VOLUME', baseUnit: false, isActive: true },
  { unitName: 'Gallon', unitSymbol: 'GAL', factor: 0.264172, unitDecimal: 3, category: 'VOLUME', baseUnit: false, isActive: true },

  // QUANTITY Category
  { unitName: 'Piece', unitSymbol: 'PC', factor: 1, unitDecimal: 0, category: 'QUANTITY', baseUnit: true, isActive: true },
  { unitName: 'Dozen', unitSymbol: 'DOZ', factor: 0.08333, unitDecimal: 2, category: 'QUANTITY', baseUnit: false, isActive: true },

  // AREA Category
  { unitName: 'Square Meter', unitSymbol: 'SQM', factor: 1, unitDecimal: 3, category: 'AREA', baseUnit: true, isActive: true },
  { unitName: 'Square Kilometer', unitSymbol: 'SQKM', factor: 0.000001, unitDecimal: 5, category: 'AREA', baseUnit: false, isActive: true },
];

const seedUnits = async () => {
  try {
    console.log('🔄 Starting unit seeding...');
    
    // Connect to database
    await connectDB();
    console.log('✓ Database connected');

    // Check if units already exist
    const existingCount = await UnitType.countDocuments();
    if (existingCount > 0) {
      console.log(`ℹ ${existingCount} unit types already exist. Skipping.`);
      return;
    }

    // Insert default units
    const result = await UnitType.insertMany(defaultUnits);
    console.log(`✓ Successfully created ${result.length} unit types`);

  } catch (error) {
    console.error('✗ Error seeding units:', error.message || error);
    throw error;
  }
};

export { seedUnits };

// Run as standalone script
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('✓ Running as standalone script');
  seedUnits().then(() => {
    console.log('✓ Seeding complete');
    process.exit(0);
  }).catch((err) => {
    console.error('✗ Seeding failed:', err);
    process.exit(1);
  });
}
