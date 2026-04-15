import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Organization from '../Models/Organization.js';
import connectDB from '../db/db.js';

dotenv.config();

/**
 * Organization Seeder
 * Creates multi-country organizational hierarchy:
 * - HEAD_OFFICE → REGIONAL or BRANCH → STORE
 * - Countries: UAE, Oman, India
 */

const organizationHierarchy = [
  // ==================== UAE ====================
  {
    name: 'NEXIS HQ Dubai',
    code: 'HQ_DXB',
    type: 'HEAD_OFFICE',
    country: 'AE',
    city: 'Dubai',
    address: 'Dubai Business Bay, Dubai',
    postalCode: '123456',
    phone: '+971-4-XXXXXX',
    email: 'hq.dubai@nexis.com',
    currency: 'AED',
    timezone: 'Asia/Dubai',
    allowInventoryTransfer: true,
    children: [
      {
        name: 'Dubai Main Branch',
        code: 'BR_DXB_MAIN',
        type: 'BRANCH',
        country: 'AE',
        city: 'Dubai',
        address: 'Dubai Downtown, Dubai',
        postalCode: '111111',
        phone: '+971-4-XXXX11',
        email: 'branch.dubai@nexis.com',
        currency: 'AED',
        timezone: 'Asia/Dubai',
        allowInventoryTransfer: true,
        children: [
          {
            name: 'Dubai Downtown Store',
            code: 'ST_DXB_DT',
            type: 'STORE',
            country: 'AE',
            city: 'Dubai',
            address: 'Downtown Dubai, Dubai',
            postalCode: '111100',
            phone: '+971-4-XXXX11',
            email: 'store.dxb.dt@nexis.com',
            currency: 'AED',
            timezone: 'Asia/Dubai',
            allowInventoryTransfer: false,
          },
          {
            name: 'Dubai Marina Store',
            code: 'ST_DXB_MR',
            type: 'STORE',
            country: 'AE',
            city: 'Dubai',
            address: 'Dubai Marina, Dubai',
            postalCode: '111200',
            phone: '+971-4-XXXX11',
            email: 'store.dxb.mr@nexis.com',
            currency: 'AED',
            timezone: 'Asia/Dubai',
            allowInventoryTransfer: false,
          },
        ],
      },
      {
        name: 'Abu Dhabi Branch',
        code: 'BR_ADH_MAIN',
        type: 'BRANCH',
        country: 'AE',
        city: 'Abu Dhabi',
        address: 'Abu Dhabi Downtown, Abu Dhabi',
        postalCode: '222222',
        phone: '+971-2-XXXX22',
        email: 'branch.abudhabi@nexis.com',
        currency: 'AED',
        timezone: 'Asia/Dubai',
        allowInventoryTransfer: true,
        children: [
          {
            name: 'Abu Dhabi Store',
            code: 'ST_ADH_MAIN',
            type: 'STORE',
            country: 'AE',
            city: 'Abu Dhabi',
            address: 'Downtown Abu Dhabi, Abu Dhabi',
            postalCode: '222200',
            phone: '+971-2-XXXX22',
            email: 'store.adh@nexis.com',
            currency: 'AED',
            timezone: 'Asia/Dubai',
            allowInventoryTransfer: false,
          },
        ],
      },
    ],
  },

  // ==================== OMAN ====================
  {
    name: 'NEXIS HQ Muscat',
    code: 'HQ_MCT',
    type: 'HEAD_OFFICE',
    country: 'OM',
    city: 'Muscat',
    address: 'Muscat Business District, Muscat',
    postalCode: '333333',
    phone: '+968-XXXXXX',
    email: 'hq.muscat@nexis.com',
    currency: 'OMR',
    timezone: 'Asia/Muscat',
    allowInventoryTransfer: true,
    children: [
      {
        name: 'Muscat Main Branch',
        code: 'BR_MCT_MAIN',
        type: 'BRANCH',
        country: 'OM',
        city: 'Muscat',
        address: 'Muscat City Center, Muscat',
        postalCode: '333300',
        phone: '+968-XXXXXX',
        email: 'branch.muscat@nexis.com',
        currency: 'OMR',
        timezone: 'Asia/Muscat',
        allowInventoryTransfer: true,
        children: [
          {
            name: 'Muscat City Store',
            code: 'ST_MCT_CITY',
            type: 'STORE',
            country: 'OM',
            city: 'Muscat',
            address: 'Muscat City, Muscat',
            postalCode: '333301',
            phone: '+968-XXXXXX',
            email: 'store.mct@nexis.com',
            currency: 'OMR',
            timezone: 'Asia/Muscat',
            allowInventoryTransfer: false,
          },
        ],
      },
    ],
  },

  // ==================== INDIA ====================
  {
    name: 'NEXIS HQ Mumbai',
    code: 'HQ_BOM',
    type: 'HEAD_OFFICE',
    country: 'IN',
    city: 'Mumbai',
    address: 'Mumbai Business District, Mumbai',
    postalCode: '400001',
    phone: '+91-22-XXXX',
    email: 'hq.mumbai@nexis.com',
    currency: 'INR',
    timezone: 'Asia/Kolkata',
    allowInventoryTransfer: true,
    children: [
      {
        name: 'Mumbai Main Branch',
        code: 'BR_BOM_MAIN',
        type: 'BRANCH',
        country: 'IN',
        city: 'Mumbai',
        address: 'Bandra Mumbai, Mumbai',
        postalCode: '400051',
        phone: '+91-22-XXXX',
        email: 'branch.mumbai@nexis.com',
        currency: 'INR',
        timezone: 'Asia/Kolkata',
        allowInventoryTransfer: true,
        children: [
          {
            name: 'Mumbai Bandra Store',
            code: 'ST_BOM_BANDRA',
            type: 'STORE',
            country: 'IN',
            city: 'Mumbai',
            address: 'Bandra, Mumbai',
            postalCode: '400050',
            phone: '+91-22-XXXX',
            email: 'store.bom.bandra@nexis.com',
            currency: 'INR',
            timezone: 'Asia/Kolkata',
            allowInventoryTransfer: false,
          },
          {
            name: 'Mumbai Andheri Store',
            code: 'ST_BOM_ANDHERI',
            type: 'STORE',
            country: 'IN',
            city: 'Mumbai',
            address: 'Andheri, Mumbai',
            postalCode: '400053',
            phone: '+91-22-XXXX',
            email: 'store.bom.andheri@nexis.com',
            currency: 'INR',
            timezone: 'Asia/Kolkata',
            allowInventoryTransfer: false,
          },
        ],
      },
    ],
  },
];

/**
 * Recursively creates organization tree
 */
const createOrganizationHierarchy = async (orgData, parentId = null) => {
  try {
    // Check if organization already exists by code
    const existingOrg = await Organization.findOne({ code: orgData.code });
    if (existingOrg) {
      console.log(`ℹ  Organization ${orgData.code} already exists. Skipping.`);
      return existingOrg._id;
    }

    // Create the current organization
    const level = parentId ? (await Organization.findById(parentId)).level + 1 : 0;
    const orgDoc = new Organization({
      ...orgData,
      parentId: parentId || null,
      level: level,
      isActive: true,
      createdBy: 'seeder',
      updatedBy: 'seeder',
    });

    await orgDoc.save();
    console.log(`✓ Created ${orgData.type}: ${orgData.name} (${orgData.code})`);

    // Recursively create children
    if (orgData.children && orgData.children.length > 0) {
      for (const childData of orgData.children) {
        await createOrganizationHierarchy(childData, orgDoc._id);
      }
    }

    return orgDoc._id;
  } catch (error) {
    console.error(`✗ Error creating organization ${orgData.code}:`, error.message);
    throw error;
  }
};

const seedOrganizations = async () => {
  let connection;
  try {
    console.log('🏢 Starting organization hierarchy seeding...\n');

    // Connect to database
    connection = await connectDB();
    console.log('✓ Database connected\n');

    // Check if organizations already exist
    const existingCount = await Organization.countDocuments();
    if (existingCount > 0) {
      console.log(`ℹ ${existingCount} organizations already exist.\n`);
      console.log('📊 Current Organization Hierarchy:');
      const rootOrgs = await Organization.find({ level: 0 }).lean();
      for (const org of rootOrgs) {
        console.log(`  ├─ ${org.name} (${org.code})`);
        const branches = await Organization.find({ parentId: org._id }).lean();
        for (const branch of branches) {
          console.log(`  │  ├─ ${branch.name} (${branch.code})`);
          const stores = await Organization.find({ parentId: branch._id }).lean();
          for (const store of stores) {
            console.log(`  │  │  └─ ${store.name} (${store.code})`);
          }
        }
      }
      console.log();
      return;
    }

    // Seed all root organizations with their hierarchies
    console.log('📊 Creating multi-country organizational hierarchy:\n');
    let count = 0;

    for (const rootOrgData of organizationHierarchy) {
      await createOrganizationHierarchy(rootOrgData);
      count++;
      console.log();
    }

    // Verify seeding
    const totalOrgs = await Organization.countDocuments();
    const headOffices = await Organization.countDocuments({ type: 'HEAD_OFFICE' });
    const branches = await Organization.countDocuments({ type: 'BRANCH' });
    const stores = await Organization.countDocuments({ type: 'STORE' });

    console.log('\n✅ Organization seeding completed!\n');
    console.log('📈 Summary:');
    console.log(`  Total Organizations: ${totalOrgs}`);
    console.log(`  Head Offices: ${headOffices}`);
    console.log(`  Branches: ${branches}`);
    console.log(`  Stores: ${stores}`);
    console.log('\n📊 Hierarchy Structure:');

    const rootOrgs = await Organization.find({ level: 0 }).lean();
    for (const org of rootOrgs) {
      console.log(`  ${org.name} (${org.code})`);
      const branchList = await Organization.find({ parentId: org._id }).lean();
      for (const branch of branchList) {
        console.log(`    ├─ ${branch.name} (${branch.code})`);
        const storeList = await Organization.find({ parentId: branch._id }).lean();
        for (const store of storeList) {
          console.log(`    │  └─ ${store.name} (${store.code})`);
        }
      }
    }
  } catch (error) {
    console.error('\n❌ Error during organization seeding:', error.message);
    process.exit(1);
  }
};

export default seedOrganizations;
