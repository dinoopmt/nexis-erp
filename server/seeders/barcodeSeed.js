import mongoose from 'mongoose';
import BarcodeTemplate from '../Models/BarcodeTemplate.js';

/**
 * Seed barcode templates collection with sample data
 */
export const seedBarcodeTemplates = async () => {
  try {
    // Check if template already exists
    const existingTemplate = await BarcodeTemplate.findOne({
      templateName: 'BARCODE_DEFAULT_WITHOUT_PRICE'
    });

    if (existingTemplate) {
      console.log('ℹ️  BARCODE_DEFAULT_WITHOUT_PRICE template already exists');
      return;
    }

    console.log('📝 Creating BARCODE_DEFAULT_WITHOUT_PRICE template...');
    const sampleTemplate = new BarcodeTemplate({
      templateName: 'BARCODE_DEFAULT_WITHOUT_PRICE',
      templateType: 'barcode_label',
      
      configTxt: `SIZE 38 mm, 25 mm
DIRECTION 1
REFERENCE 0,0
OFFSET 0 mm
SET PEEL OFF
SET CUTTER OFF
SET TEAR ON
CLS
CODEBARCODE 50,120,"128",50,2,0,2,2,"{BARCODE}"
PRINT 1,{LABEL_QUANTITY}`,
      
      isActive: true,
      isDefault: true,
      deleted: false,
      
      createdBy: 'system',
      updatedBy: 'system',
      createdDate: new Date(),
      updateDate: new Date(),
      
      intVersion: 0,
      classVersion: 0
    });

    await sampleTemplate.save();
    console.log('✅ Barcode template seeded successfully');
    
  } catch (error) {
    console.error('❌ Error seeding barcode template:', error.message);
    throw error;
  }
};

/**
 * Create additional barcode templates for common label sizes
 */
export const seedAdditionalBarcodeTemplates = async () => {
  try {
    const additionalTemplates = [
      {
        templateName: 'BARCODE_WITH_PRICE',
        templateType: 'barcode_label',
        configTxt: `SIZE 38 mm, 25 mm
DIRECTION 1
REFERENCE 0,0
OFFSET 0 mm
SET PEEL OFF
SET CUTTER OFF
SET TEAR ON
CLS
TEXT 10,69,\"1\",0,1,1,\"{ITEM_NAME}\"
TEXT 10,90,\"1\",0,1,1,\"Price: {PRICE}\"
BARCODE 50,120,\"128\",50,2,0,2,2,\"{BARCODE}\"
PRINT 1,{LABEL_QUANTITY}`,
        isActive: true,
        isDefault: false
      },
      {
        templateName: 'BARCODE_SMALL_30x20',
        templateType: 'barcode_label',
        configTxt: `SIZE 30 mm, 20 mm
DIRECTION 1
REFERENCE 0,0
OFFSET 0 mm
SET PEEL OFF
SET TEAR ON
CLS
BARCODE 40,80,\"128\",40,1,0,2,2,\"{BARCODE}\"
PRINT 1,{LABEL_QUANTITY}`,
        isActive: true,
        isDefault: false
      },
      {
        templateName: 'BARCODE_LARGE_50x40',
        templateType: 'barcode_label',
        configTxt: `SIZE 50 mm, 40 mm
DIRECTION 1
REFERENCE 0,0
OFFSET 0 mm
SET PEEL OFF
SET TEAR ON
CLS
TEXT 20,50,\"2\",0,1,1,\"{ITEM_NAME}\"
BARCODE 80,150,\"128\",60,2,0,2,2,\"{BARCODE}\"
TEXT 20,240,\"1\",0,1,1,\"SKU: {SKU}\"
PRINT 1,{LABEL_QUANTITY}`,
        isActive: true,
        isDefault: false
      },
      {
        templateName: 'SHELF_LABEL_STANDARD',
        templateType: 'shelf_label',
        configTxt: `SIZE 100 mm, 70 mm
DIRECTION 1
CLS
TEXT 20,50,\"0\",0,2,2,\"{ITEM_NAME}\"
TEXT 20,120,\"0\",0,1,1,\"Price: {PRICE}\"
TEXT 20,150,\"0\",0,1,1,\"SKU: {SKU}\"
PRINT 1,{LABEL_QUANTITY}`,
        isActive: true,
        isDefault: false
      }
    ];

    for (const template of additionalTemplates) {
      const exists = await BarcodeTemplate.findOne({
        templateName: template.templateName
      });

      if (!exists) {
        const newTemplate = new BarcodeTemplate({
          ...template,
          createdBy: 'system',
          updatedBy: 'system',
          createdDate: new Date(),
          updateDate: new Date()
        });
        await newTemplate.save();
        console.log(`✅ Created barcode template: ${template.templateName}`);
      }
    }
  } catch (error) {
    console.error('❌ Error seeding additional barcode templates:', error.message);
    throw error;
  }
};

// Execute seeders if run directly
const args = import.meta.url;
const [filepath] = process.argv.slice(1);
const isMainModule = args.includes(filepath) || process.argv[1]?.endsWith('barcodeSeed.js');

if (isMainModule) {
  (async () => {
    try {
      const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/nexis_erp';
      console.log(`🔗 Connecting to MongoDB: ${mongoUri}`);
      
      await mongoose.connect(mongoUri);
      console.log('✅ Connected to MongoDB');
      
      console.log('🌱 Seeding barcode templates...');
      await seedBarcodeTemplates();
      
      console.log('🌱 Seeding additional templates...');
      await seedAdditionalBarcodeTemplates();
      
      console.log('✅ All barcode templates seeded successfully');
      await mongoose.connection.close();
      console.log('👋 MongoDB connection closed');
      process.exit(0);
    } catch (error) {
      console.error('❌ Seeding failed:', error.message);
      await mongoose.connection.close().catch(() => {});
      process.exit(1);
    }
  })();
}
