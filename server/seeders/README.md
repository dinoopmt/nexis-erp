# Database Seeders Guide

This folder contains database seed scripts that initialize required data for the NEXIS-ERP application.

## Available Seeders

### 1. **chartOfAccountsSeeder.js**
Initializes the Chart of Accounts for accounting functionality.
```bash
node seeders/chartOfAccountsSeeder.js
```
Creates:
- Account groups and classifications
- Standard accounting ledger accounts
- Account hierarchies

### 2. **hsnMasterSeeder.js**
Populates HSN (Harmonized System of Nomenclature) codes for Indian GST.
```bash
node seeders/hsnMasterSeeder.js
```
Creates:
- HSN code database
- GST rate mappings
- Product classifications

### 3. **taxMasterSeeder.js**
Initializes tax groups and tax rates for different countries.
```bash
node seeders/taxMasterSeeder.js
```
Creates:
- Tax groups for UAE VAT
- Tax groups for Oman VAT
- Tax groups for India GST (with CGST/SGST breakdown)

### 4. **sequenceSeeder.js**
Sets up sequence/sequence number generation for documents.
```bash
node seeders/sequenceSeeder.js
```
Creates:
- Invoice number sequences
- GRN number sequences
- Journal entry sequences
- Document ID auto-increment rules

### 5. **userSeed.js**
Creates initial system users and roles.
```bash
node seeders/userSeed.js
```
Creates:
- Default admin user
- Default roles (Admin, Manager, User)
- Initial user permissions

### 6. **countryConfigSeeder.js**
Initializes country-specific configurations.
```bash
node seeders/countryConfigSeeder.js
```
Creates:
- UAE company setup with VAT
- Oman company setup with VAT
- India company setup with GST

## Running All Seeders

To run all seeders in sequence:
```bash
npm run seed
```

Or manually:
```bash
node seeders/chartOfAccountsSeeder.js && \
node seeders/hsnMasterSeeder.js && \
node seeders/taxMasterSeeder.js && \
node seeders/sequenceSeeder.js && \
node seeders/userSeed.js && \
node seeders/countryConfigSeeder.js
```

## Seeder Order (Important!)

Run seeders in this order to avoid foreign key/reference issues:
1. chartOfAccountsSeeder.js
2. hsnMasterSeeder.js
3. taxMasterSeeder.js
4. sequenceSeeder.js
5. userSeed.js
6. countryConfigSeeder.js

## Safety Notes

⚠️ **WARNING**: 
- Seeders will overwrite existing data if records already exist
- Always backup your database before running seeders
- Test on development environment first
- Some seeders include `deleteMany()` to clear existing data

## Adding a New Seeder

1. Create a new file in `/seeders`: `mySeeder.js`
2. Follow the template:
```javascript
const mongoose = require('mongoose');
const MyModel = require('../Models/MyModel');
const db = require('../db/db');

const seedMyData = async () => {
  try {
    await db();
    console.log('🌱 Seeding MyData...');
    
    const data = [
      // Your seed data here
    ];
    
    await MyModel.insertMany(data);
    console.log('✅ MyData seeded successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding MyData:', error);
    process.exit(1);
  }
};

seedMyData();
```

3. Update `package.json` to include your seeder in the seed script:
```json
{
  "scripts": {
    "seed": "node seeders/chartOfAccountsSeeder.js && node seeders/mySeeder.js && ..."
  }
}
```

## Seed Data Location

Original seeder files are in the `/seeders` folder. Keep them here for better organization.

## Troubleshooting

**Issue**: "Cannot find module '../db/db'"
- Solution: Ensure paths are correct relative to seeder location

**Issue**: "Database connection failed"
- Solution: Check `.env` file and MongoDB connection string

**Issue**: "E11000 duplicate key error"
- Solution: Clear MongoDB collection before running seeder or modify seeder to check existing records

## Related Files

- See original `SEEDER_README.md` in server root for additional context
- Check individual seeder files for detailed seed data
