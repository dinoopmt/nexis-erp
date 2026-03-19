import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import HSNMaster from '../Models/HSNMaster.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Comprehensive HSN Master Data
const hsnData = [
  // CHAPTER 09: Coffee, Tea, Spices
  {
    code: '090111',
    chapter: 9,
    heading: 1,
    subHeading: 11,
    description: 'Coffee, not roasted, not decaffeinated',
    category: 'Foodstuffs',
    gstRate: 5,
    hsnChapterDescription: 'Coffee, tea, maté and spices',
    applicableFrom: new Date('2017-07-01'),
    applicableTo: ['IN']
  },
  {
    code: '090112',
    chapter: 9,
    heading: 1,
    subHeading: 12,
    description: 'Coffee, not roasted, decaffeinated',
    category: 'Foodstuffs',
    gstRate: 5,
    hsnChapterDescription: 'Coffee, tea, maté and spices',
    applicableFrom: new Date('2017-07-01'),
    applicableTo: ['IN']
  },
  {
    code: '090121',
    chapter: 9,
    heading: 1,
    subHeading: 21,
    description: 'Coffee, roasted, not decaffeinated',
    category: 'Foodstuffs',
    gstRate: 5,
    hsnChapterDescription: 'Coffee, tea, maté and spices',
    applicableFrom: new Date('2017-07-01'),
    applicableTo: ['IN']
  },
  {
    code: '090122',
    chapter: 9,
    heading: 1,
    subHeading: 22,
    description: 'Coffee, roasted, decaffeinated',
    category: 'Foodstuffs',
    gstRate: 5,
    hsnChapterDescription: 'Coffee, tea, maté and spices',
    applicableFrom: new Date('2017-07-01'),
    applicableTo: ['IN']
  },
  
  // TEA
  {
    code: '090210',
    chapter: 9,
    heading: 2,
    subHeading: 10,
    description: 'Tea, in immediate packings of a content not exceeding 3 kg',
    category: 'Foodstuffs',
    gstRate: 5,
    hsnChapterDescription: 'Coffee, tea, maté and spices',
    applicableFrom: new Date('2017-07-01'),
    applicableTo: ['IN']
  },
  
  // SPICES
  {
    code: '090411',
    chapter: 9,
    heading: 4,
    subHeading: 11,
    description: 'Black pepper (Peppercorns)',
    category: 'Foodstuffs',
    gstRate: 5,
    hsnChapterDescription: 'Spices',
    applicableFrom: new Date('2017-07-01'),
    applicableTo: ['IN']
  },
  {
    code: '090412',
    chapter: 9,
    heading: 4,
    subHeading: 12,
    description: 'Black pepper, crushed or ground',
    category: 'Foodstuffs',
    gstRate: 5,
    hsnChapterDescription: 'Spices',
    applicableFrom: new Date('2017-07-01'),
    applicableTo: ['IN']
  },

  // CHAPTER 10: Cereals
  {
    code: '100610',
    chapter: 10,
    heading: 6,
    subHeading: 10,
    description: 'Rice, semi-milled or wholly milled',
    category: 'Foodstuffs',
    gstRate: 5,
    hsnChapterDescription: 'Cereals',
    applicableFrom: new Date('2017-07-01'),
    applicableTo: ['IN']
  },
  {
    code: '100620',
    chapter: 10,
    heading: 6,
    subHeading: 20,
    description: 'Rice, broken',
    category: 'Foodstuffs',
    gstRate: 5,
    hsnChapterDescription: 'Cereals',
    applicableFrom: new Date('2017-07-01'),
    applicableTo: ['IN']
  },

  // FLOUR
  {
    code: '110100',
    chapter: 11,
    heading: 1,
    subHeading: 0,
    description: 'Wheat or meslin flour',
    category: 'Foodstuffs',
    gstRate: 5,
    hsnChapterDescription: 'Products of the milling industry',
    applicableFrom: new Date('2017-07-01'),
    applicableTo: ['IN']
  },
  {
    code: '110811',
    chapter: 11,
    heading: 8,
    subHeading: 11,
    description: 'Cornflour',
    category: 'Foodstuffs',
    gstRate: 5,
    hsnChapterDescription: 'Products of the milling industry',
    applicableFrom: new Date('2017-07-01'),
    applicableTo: ['IN']
  },

  // CHAPTER 15: Oils & Fats
  {
    code: '151590',
    chapter: 15,
    heading: 15,
    subHeading: 90,
    description: 'Other vegetable oils',
    category: 'Foodstuffs',
    gstRate: 5,
    hsnChapterDescription: 'Animal or vegetable fats and oils',
    applicableFrom: new Date('2017-07-01'),
    applicableTo: ['IN']
  },
  {
    code: '150711',
    chapter: 15,
    heading: 7,
    subHeading: 11,
    description: 'Soya-bean oil, crude',
    category: 'Foodstuffs',
    gstRate: 5,
    hsnChapterDescription: 'Animal or vegetable fats and oils',
    applicableFrom: new Date('2017-07-01'),
    applicableTo: ['IN']
  },
  {
    code: '150790',
    chapter: 15,
    heading: 7,
    subHeading: 90,
    description: 'Soya-bean oil, other',
    category: 'Foodstuffs',
    gstRate: 5,
    hsnChapterDescription: 'Animal or vegetable fats and oils',
    applicableFrom: new Date('2017-07-01'),
    applicableTo: ['IN']
  },

  // CHAPTER 17: Sugar & Sugar Preparations
  {
    code: '170131',
    chapter: 17,
    heading: 1,
    subHeading: 31,
    description: 'Cane sugar, refined, in solid form',
    category: 'Foodstuffs',
    gstRate: 5,
    hsnChapterDescription: 'Sugars and sugar confectionery',
    applicableFrom: new Date('2017-07-01'),
    applicableTo: ['IN']
  },

  // CHAPTER 04: Dairy Products
  {
    code: '040110',
    chapter: 4,
    heading: 1,
    subHeading: 10,
    description: 'Milk, fresh, not concentrated, not sweetened',
    category: 'Foodstuffs',
    gstRate: 5,
    hsnChapterDescription: 'Dairy produce; birds eggs; natural honey',
    applicableFrom: new Date('2017-07-01'),
    applicableTo: ['IN']
  },
  {
    code: '040610',
    chapter: 4,
    heading: 6,
    subHeading: 10,
    description: 'Fresh cheese (unripened/uncured)',
    category: 'Foodstuffs',
    gstRate: 5,
    hsnChapterDescription: 'Dairy produce; birds eggs; natural honey',
    applicableFrom: new Date('2017-07-01'),
    applicableTo: ['IN']
  },

  // CHAPTER 05: Meat & Meat Preparations
  {
    code: '020110',
    chapter: 2,
    heading: 1,
    subHeading: 10,
    description: 'Beef, fresh or chilled',
    category: 'Foodstuffs',
    gstRate: 5,
    hsnChapterDescription: 'Meat and edible meat offal',
    applicableFrom: new Date('2017-07-01'),
    applicableTo: ['IN']
  },

  // CHAPTER 61: Textiles - Clothing
  {
    code: '610510',
    chapter: 61,
    heading: 5,
    subHeading: 10,
    description: 'Men\'s or boys\' shirts, cotton',
    category: 'Textiles',
    gstRate: 12,
    hsnChapterDescription: 'Articles of apparel and clothing accessories',
    applicableFrom: new Date('2017-07-01'),
    applicableTo: ['IN']
  },
  {
    code: '620462',
    chapter: 62,
    heading: 4,
    subHeading: 62,
    description: 'Women\'s or girls\' trousers, cotton',
    category: 'Textiles',
    gstRate: 12,
    hsnChapterDescription: 'Articles of apparel and clothing accessories',
    applicableFrom: new Date('2017-07-01'),
    applicableTo: ['IN']
  },
  {
    code: '600622',
    chapter: 60,
    heading: 6,
    subHeading: 22,
    description: 'Woven fabrics of cotton',
    category: 'Textiles',
    gstRate: 5,
    hsnChapterDescription: 'Knitted or crocheted fabrics',
    applicableFrom: new Date('2017-07-01'),
    applicableTo: ['IN']
  },

  // CHAPTER 64: Footwear
  {
    code: '640399',
    chapter: 64,
    heading: 3,
    subHeading: 99,
    description: 'Other footwear with leather upper',
    category: 'Textiles',
    gstRate: 12,
    hsnChapterDescription: 'Footwear',
    applicableFrom: new Date('2017-07-01'),
    applicableTo: ['IN']
  },

  // CHAPTER 70: Glass & Glass Ware
  {
    code: '700711',
    chapter: 70,
    heading: 7,
    subHeading: 11,
    description: 'Safety glass, (tempered)',
    category: 'Stone & Glass',
    gstRate: 12,
    hsnChapterDescription: 'Glass and glassware',
    applicableFrom: new Date('2017-07-01'),
    applicableTo: ['IN']
  },

  // CHAPTER 73: Iron & Steel
  {
    code: '730890',
    chapter: 73,
    heading: 8,
    subHeading: 90,
    description: 'Other structures and parts',
    category: 'Metals',
    gstRate: 12,
    hsnChapterDescription: 'Iron and steel',
    applicableFrom: new Date('2017-07-01'),
    applicableTo: ['IN']
  },

  // CHAPTER 84: Machinery
  {
    code: '841551',
    chapter: 84,
    heading: 15,
    subHeading: 51,
    description: 'Refrigerating or freezing machines',
    category: 'Machinery',
    gstRate: 12,
    hsnChapterDescription: 'Nuclear reactors, boilers, machinery',
    applicableFrom: new Date('2017-07-01'),
    applicableTo: ['IN']
  },
  {
    code: '841821',
    chapter: 84,
    heading: 18,
    subHeading: 21,
    description: 'Machine-tool air-conditioning machines',
    category: 'Machinery',
    gstRate: 12,
    hsnChapterDescription: 'Nuclear reactors, boilers, machinery',
    applicableFrom: new Date('2017-07-01'),
    applicableTo: ['IN']
  },

  // CHAPTER 85: Electrical Machinery
  {
    code: '850720',
    chapter: 85,
    heading: 7,
    subHeading: 20,
    description: 'Electric power transformers',
    category: 'Electrical',
    gstRate: 12,
    hsnChapterDescription: 'Electrical machinery and equipment',
    applicableFrom: new Date('2017-07-01'),
    applicableTo: ['IN']
  },
  {
    code: '853921',
    chapter: 85,
    heading: 39,
    subHeading: 21,
    description: 'Filament lamps',
    category: 'Electrical',
    gstRate: 12,
    hsnChapterDescription: 'Electrical machinery and equipment',
    applicableFrom: new Date('2017-07-01'),
    applicableTo: ['IN']
  },
  {
    code: '851712',
    chapter: 85,
    heading: 17,
    subHeading: 12,
    description: 'Mobile telephones for cellular networks',
    category: 'Electrical',
    gstRate: 12,
    hsnChapterDescription: 'Electrical machinery and equipment',
    applicableFrom: new Date('2017-07-01'),
    applicableTo: ['IN']
  },

  // CHAPTER 87: Vehicles
  {
    code: '870321',
    chapter: 87,
    heading: 3,
    subHeading: 21,
    description: 'Motor vehicles for transport of persons, petrol',
    category: 'Vehicles',
    gstRate: 28,
    hsnChapterDescription: 'Vehicles other than railway',
    applicableFrom: new Date('2017-07-01'),
    applicableTo: ['IN']
  },

  // CHAPTER 90: Optical Instruments
  {
    code: '900580',
    chapter: 90,
    heading: 5,
    subHeading: 80,
    description: 'Other optical elements',
    category: 'Optical Instruments',
    gstRate: 12,
    hsnChapterDescription: 'Optical, photographic instruments',
    applicableFrom: new Date('2017-07-01'),
    applicableTo: ['IN']
  },

  // SERVICES (0% GST - Exempted)
  {
    code: '997100',
    chapter: 99,
    heading: 71,
    subHeading: 0,
    description: 'Services - Exempted',
    category: 'Miscellaneous',
    gstRate: 0,
    hsnChapterDescription: 'Services',
    applicableFrom: new Date('2017-07-01'),
    applicableTo: ['IN'],
    remarks: 'Exempted services'
  }
];

// Seed function
async function seedHSNMaster() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');
    
    console.log('🔄 Starting HSN Master seeding...');
    
    // Clear existing data
    const deleteResult = await HSNMaster.deleteMany({});
    console.log(`✓ Cleared ${deleteResult.deletedCount} existing HSN records`);
    
    // Insert new data
    const insertResult = await HSNMaster.insertMany(hsnData, { ordered: false });
    console.log(`✓ Inserted ${insertResult.length} HSN codes`);
    
    // Verify
    const total = await HSNMaster.countDocuments();
    const active = await HSNMaster.countDocuments({ isActive: true });
    const byRate = await HSNMaster.aggregate([
      { $group: { _id: '$gstRate', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);
    
    console.log(`\n✅ HSN Master Seeding Complete!`);
    console.log(`📊 Statistics:`);
    console.log(`   - Total codes: ${total}`);
    console.log(`   - Active codes: ${active}`);
    console.log(`   - By GST Rate:`);
    byRate.forEach(rate => {
      console.log(`     • ${rate._id}% GST: ${rate.count} codes`);
    });
    
    // Sample queries
    console.log(`\n📝 Sample Queries:`);
    
    const coffeeHSN = await HSNMaster.findByCode('090111');
    console.log(`   Coffee HSN (090111): ${coffeeHSN?.description}`);
    
    const foodstuffs = await HSNMaster.findByCategory('Foodstuffs');
    console.log(`   Foodstuffs category: ${foodstuffs.length} codes`);
    
    const electrical = await HSNMaster.findByCategory('Electrical');
    console.log(`   Electrical category: ${electrical.length} codes`);
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error seeding HSN Master:', error.message);
    process.exit(1);
  }
}

// Run seeder
seedHSNMaster();
