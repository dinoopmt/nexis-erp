import mongoose from 'mongoose';
import dotenv from 'dotenv';
import UnitType from '../Models/UnitType.js';
import connectDB from '../config/database.js';

dotenv.config();

const defaultUnits = [
  // WEIGHT Category
  {
    unitName: 'Kilogram',
    unitSymbol: 'KG',
    factor: 1,
    unitDecimal: 3,
    category: 'WEIGHT',
    baseUnit: true,
    description: 'Base unit for weight measurement',
    conversionNote: '1 KG = 1000 G',
    isActive: true,
  },
  {
    unitName: 'Gram',
    unitSymbol: 'G',
    factor: 1000,
    unitDecimal: 2,
    category: 'WEIGHT',
    baseUnit: false,
    description: 'Gram unit for weight',
    conversionNote: '1 KG = 1000 G',
    isActive: true,
  },
  {
    unitName: 'Milligram',
    unitSymbol: 'MG',
    factor: 1000000,
    unitDecimal: 2,
    category: 'WEIGHT',
    baseUnit: false,
    description: 'Milligram unit for weight',
    conversionNote: '1 KG = 1000000 MG',
    isActive: true,
  },
  {
    unitName: 'Pound',
    unitSymbol: 'LB',
    factor: 2.20462,
    unitDecimal: 3,
    category: 'WEIGHT',
    baseUnit: false,
    description: 'Pound unit for weight',
    conversionNote: '1 KG = 2.20462 LB',
    isActive: true,
  },
  {
    unitName: 'Ounce',
    unitSymbol: 'OZ',
    factor: 35.274,
    unitDecimal: 2,
    category: 'WEIGHT',
    baseUnit: false,
    description: 'Ounce unit for weight',
    conversionNote: '1 KG = 35.274 OZ',
    isActive: true,
  },

  // LENGTH Category
  {
    unitName: 'Meter',
    unitSymbol: 'M',
    factor: 1,
    unitDecimal: 3,
    category: 'LENGTH',
    baseUnit: true,
    description: 'Base unit for length measurement',
    conversionNote: '1 M = 100 CM',
    isActive: true,
  },
  {
    unitName: 'Centimeter',
    unitSymbol: 'CM',
    factor: 100,
    unitDecimal: 2,
    category: 'LENGTH',
    baseUnit: false,
    description: 'Centimeter unit for length',
    conversionNote: '1 M = 100 CM',
    isActive: true,
  },
  {
    unitName: 'Millimeter',
    unitSymbol: 'MM',
    factor: 1000,
    unitDecimal: 2,
    category: 'LENGTH',
    baseUnit: false,
    description: 'Millimeter unit for length',
    conversionNote: '1 M = 1000 MM',
    isActive: true,
  },
  {
    unitName: 'Kilometer',
    unitSymbol: 'KM',
    factor: 0.001,
    unitDecimal: 4,
    category: 'LENGTH',
    baseUnit: false,
    description: 'Kilometer unit for length',
    conversionNote: '1 M = 0.001 KM',
    isActive: true,
  },
  {
    unitName: 'Mile',
    unitSymbol: 'MI',
    factor: 0.000621371,
    unitDecimal: 5,
    category: 'LENGTH',
    baseUnit: false,
    description: 'Mile unit for length',
    conversionNote: '1 M = 0.000621371 MI',
    isActive: true,
  },

  // VOLUME Category
  {
    unitName: 'Liter',
    unitSymbol: 'L',
    factor: 1,
    unitDecimal: 3,
    category: 'VOLUME',
    baseUnit: true,
    description: 'Base unit for volume measurement',
    conversionNote: '1 L = 1000 ML',
    isActive: true,
  },
  {
    unitName: 'Milliliter',
    unitSymbol: 'ML',
    factor: 1000,
    unitDecimal: 2,
    category: 'VOLUME',
    baseUnit: false,
    description: 'Milliliter unit for volume',
    conversionNote: '1 L = 1000 ML',
    isActive: true,
  },
  {
    unitName: 'Gallon',
    unitSymbol: 'GAL',
    factor: 0.264172,
    unitDecimal: 3,
    category: 'VOLUME',
    baseUnit: false,
    description: 'Gallon unit for volume (US)',
    conversionNote: '1 L = 0.264172 GAL',
    isActive: true,
  },

  // QUANTITY Category
  {
    unitName: 'Piece',
    unitSymbol: 'PC',
    factor: 1,
    unitDecimal: 0,
    category: 'QUANTITY',
    baseUnit: true,
    description: 'Base unit for counting individual items',
    conversionNote: '1 PC = 1 piece',
    isActive: true,
  },
  {
    unitName: 'Dozen',
    unitSymbol: 'DZ',
    factor: 0.0833333,
    unitDecimal: 2,
    category: 'QUANTITY',
    baseUnit: false,
    description: 'Dozen unit for quantity',
    conversionNote: '1 PC = 0.0833333 DZ',
    isActive: true,
  },
  {
    unitName: 'Box',
    unitSymbol: 'BOX',
    factor: 0.1,
    unitDecimal: 2,
    category: 'QUANTITY',
    baseUnit: false,
    description: 'Box unit for packaging',
    conversionNote: '1 PC = 0.1 BOX',
    isActive: true,
  },
  {
    unitName: 'Bundle',
    unitSymbol: 'BDL',
    factor: 0.05,
    unitDecimal: 2,
    category: 'QUANTITY',
    baseUnit: false,
    description: 'Bundle unit for grouping',
    conversionNote: '1 PC = 0.05 BDL',
    isActive: true,
  },

  // AREA Category
  {
    unitName: 'Square Meter',
    unitSymbol: 'SQM',
    factor: 1,
    unitDecimal: 3,
    category: 'AREA',
    baseUnit: true,
    description: 'Base unit for area measurement',
    conversionNote: '1 SQM = 10000 SQCM',
    isActive: true,
  },
  {
    unitName: 'Square Kilometer',
    unitSymbol: 'SQKM',
    factor: 0.000001,
    unitDecimal: 6,
    category: 'AREA',
    baseUnit: false,
    description: 'Square kilometer unit for area',
    conversionNote: '1 SQM = 0.000001 SQKM',
    isActive: true,
  },
  {
    unitName: 'Square Mile',
    unitSymbol: 'SQMI',
    factor: 0.000000386102,
    unitDecimal: 8,
    category: 'AREA',
    baseUnit: false,
    description: 'Square mile unit for area',
    conversionNote: '1 SQM = 0.000000386102 SQMI',
    isActive: true,
  },
];

const seedUnits = async () => {
  try {
    // Connect to database
    await connectDB();
    console.log('✓ Database connected');

    // Check if units already exist
    const existingCount = await UnitType.countDocuments();
    if (existingCount > 0) {
      console.log(`ℹ ${existingCount} unit types already exist in database`);
      const response = await new Promise((resolve) => {
        process.stdout.write('Do you want to replace them? (yes/no): ');
        let input = '';
        process.stdin.setEncoding('utf8');
        process.stdin.on('data', (key) => {
          input += key;
          if (input.includes('\n')) {
            resolve(input.trim().toLowerCase());
          }
        });
      });

      if (response !== 'yes' && response !== 'y') {
        console.log('✗ Seeding cancelled');
        process.exit(0);
      }

      await UnitType.deleteMany({});
      console.log('⚠ Existing units deleted');
    }

    // Insert default units
    const result = await UnitType.insertMany(defaultUnits);
    console.log(`✓ Successfully created ${result.length} unit types`);

    // Display summary
    const summary = await UnitType.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          units: { $push: { name: '$unitName', symbol: '$unitSymbol', baseUnit: '$baseUnit' } },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    console.log('\n=== Unit Types Summary ===');
    summary.forEach((cat) => {
      console.log(`\n${cat._id} (${cat.count} units):`);
      cat.units.forEach((unit) => {
        const baseLabel = unit.baseUnit ? ' [BASE]' : '';
        console.log(`  • ${unit.name} (${unit.symbol})${baseLabel}`);
      });
    });

    console.log('\n✓ Unit seeding completed successfully!');
  } catch (error) {
    console.error('✗ Error seeding units:', error.message);
    process.exit(1);
  } finally {
    // Close database connection
    await mongoose.connection.close();
    process.exit(0);
  }
};

seedUnits();
