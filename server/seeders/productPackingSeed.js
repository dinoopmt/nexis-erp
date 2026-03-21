import mongoose from 'mongoose';
import dotenv from 'dotenv';
import ProductPacking from '../Models/ProductPacking.js';
import AddProduct from '../Models/AddProduct.js';
import UnitType from '../Models/UnitType.js';
import connectDB from '../config/database.js';

dotenv.config();

const seedProductPackings = async () => {
  try {
    // Connect to database
    await connectDB();
    console.log('✓ Database connected');

    // Get a product to work with (create if doesn't exist)
    let product = await AddProduct.findOne({}).populate('unitType');

    if (!product) {
      console.log('⚠ No products found. Creating sample product first...');

      // Get PC unit type
      const pcUnit = await UnitType.findOne({ unitSymbol: 'PC' });
      if (!pcUnit) {
        console.log('✗ PC unit type not found. Please seed unit types first.');
        process.exit(1);
      }

      product = new AddProduct({
        productName: 'Sample Product',
        productCode: 'SAMPLE-001',
        productCategory: 'Stationery',
        description: 'Sample product for packing demonstration',
        unitType: pcUnit._id,
        costPrice: 50,
        sellingPrice: 75,
        wholeSalePrice: 70,
        isActive: true,
      });

      await product.save();
      product = await product.populate('unitType');
      console.log('✓ Sample product created');
    }

    console.log(`\n📦 Creating packings for product: ${product.productName}`);

    // Clean existing packings for this product
    await ProductPacking.deleteMany({ productId: product._id });
    console.log('✓ Existing packings removed');

    // Create diverse packing options based on product unit type
    const pcUnit = await UnitType.findOne({ unitSymbol: 'PC' });
    const kgUnit = await UnitType.findOne({ unitSymbol: 'KG' });
    const lUnit = await UnitType.findOne({ unitSymbol: 'L' });

    let packingTemplates = [];

    // Determine unit type and create appropriate packings
    if (product.unitType.unitSymbol === 'PC') {
      packingTemplates = [
        {
          packingName: 'Individual Piece',
          packingSymbol: 'PC',
          packingFactor: 1,
          quantity: 1,
          packingPrice: 75,
          isDefault: true,
          description: 'Single piece',
        },
        {
          packingName: 'Box',
          packingSymbol: 'BOX',
          packingFactor: 12,
          quantity: 12,
          packingPrice: 750,
          isDefault: false,
          description: 'Box of 12 pieces',
        },
        {
          packingName: 'Carton',
          packingSymbol: 'CTN',
          packingFactor: 60,
          quantity: 60,
          packingPrice: 3600,
          isDefault: false,
          description: 'Carton of 60 pieces (5 boxes)',
        },
        {
          packingName: 'Pallet',
          packingSymbol: 'PLT',
          packingFactor: 600,
          quantity: 600,
          packingPrice: 36000,
          isDefault: false,
          description: 'Pallet of 600 pieces',
        },
      ];
    } else if (product.unitType.unitSymbol === 'KG') {
      packingTemplates = [
        {
          packingName: 'Kilogram',
          packingSymbol: 'KG',
          packingFactor: 1,
          quantity: 1,
          packingPrice: 500,
          isDefault: true,
          description: 'Loose kilogram',
        },
        {
          packingName: 'Bag',
          packingSymbol: 'BAG',
          packingFactor: 5,
          quantity: 5,
          packingPrice: 2400,
          isDefault: false,
          description: 'Bag of 5 KG',
        },
        {
          packingName: 'Box',
          packingSymbol: 'BOX',
          packingFactor: 20,
          quantity: 20,
          packingPrice: 9600,
          isDefault: false,
          description: 'Box of 20 KG',
        },
        {
          packingName: 'Drum',
          packingSymbol: 'DRM',
          packingFactor: 100,
          quantity: 100,
          packingPrice: 47500,
          isDefault: false,
          description: 'Drum of 100 KG',
        },
      ];
    } else if (product.unitType.unitSymbol === 'L') {
      packingTemplates = [
        {
          packingName: 'Liter',
          packingSymbol: 'L',
          packingFactor: 1,
          quantity: 1,
          packingPrice: 100,
          isDefault: true,
          description: 'Single liter',
        },
        {
          packingName: 'Bottle',
          packingSymbol: 'BTL',
          packingFactor: 1,
          quantity: 1,
          packingPrice: 120,
          isDefault: false,
          description: '1L bottle',
        },
        {
          packingName: 'Can',
          packingSymbol: 'CAN',
          packingFactor: 5,
          quantity: 5,
          packingPrice: 500,
          isDefault: false,
          description: 'Can of 5 liters',
        },
        {
          packingName: 'Jerrycan',
          packingSymbol: 'JRY',
          packingFactor: 20,
          quantity: 20,
          packingPrice: 1900,
          isDefault: false,
          description: 'Jerrycan of 20 liters',
        },
      ];
    } else {
      packingTemplates = [
        {
          packingName: 'Default',
          packingSymbol: 'DEF',
          packingFactor: 1,
          quantity: 1,
          packingPrice: product.sellingPrice,
          isDefault: true,
          description: 'Default packing',
        },
      ];
    }

    // Create packings
    const createdPackings = [];

    for (const template of packingTemplates) {
      const packing = new ProductPacking({
        productId: product._id,
        packingName: template.packingName,
        packingSymbol: template.packingSymbol,
        packingFactor: template.packingFactor,
        quantity: template.quantity,
        unitType: product.unitType._id,
        packingPrice: template.packingPrice,
        barcode: `${product.productCode}-${template.packingSymbol}`,
        isDefault: template.isDefault,
        isActive: true,
        description: template.description,
        stock: Math.floor(Math.random() * 1000),
        reorderLevel: 50,
      });

      await packing.save();
      createdPackings.push(packing);
    }

    console.log(`\n✓ Created ${createdPackings.length} packing options:\n`);

    createdPackings.forEach((p) => {
      console.log(`  📦 ${p.packingName.padEnd(20)} | ${p.packingSymbol.padEnd(5)} | Factor: ${p.packingFactor.toString().padEnd(6)} | Price: ₹${p.packingPrice} | Stock: ${p.stock}`);
    });

    // Display conversion examples
    console.log('\n\n=== Conversion Examples ===\n');

    if (createdPackings.length >= 2) {
      const from = createdPackings[0];
      const to = createdPackings[1];

      const baseUnits = 10 * from.packingFactor;
      const converted = baseUnits / to.packingFactor;

      console.log(`Convert: 10 ${from.packingSymbol} → ${to.packingSymbol}`);
      console.log(`  Formula: 10 × ${from.packingFactor} ÷ ${to.packingFactor} = ${converted.toFixed(2)} ${to.packingSymbol}`);
      console.log(`  Cost: 10 × ₹${from.packingPrice} = ₹${(10 * from.packingPrice).toFixed(2)}`);
    }

    console.log('\n✓ Product packing seeding completed successfully!');
  } catch (error) {
    console.error('✗ Error seeding product packings:', error.message);
    throw error;
  } finally {
    await mongoose.connection.close();
  }
};

export { seedProductPackings };

// Run as standalone script
if (import.meta.url === `file://${process.argv[1]}`) {
  seedProductPackings().then(() => process.exit(0)).catch(() => process.exit(1));
}
