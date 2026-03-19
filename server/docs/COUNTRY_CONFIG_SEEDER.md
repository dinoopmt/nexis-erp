# CountryConfig Database Seeding

This file documents how to seed the CountryConfig collection with default country data.

## Overview

The **CountryConfig** collection stores centralized configuration for different countries including:
- Country information (name, code, label, flag emoji)
- Tax system details (type, rate, registration name)
- Compliance regulations and requirements
- Address placeholders specific to each country

## Database Models

### CountryConfig Collection Structure

```javascript
{
  countryName: String,        // 'UAE', 'Oman', 'India'
  countryCode: String,        // 'AE', 'OM', 'IN' (ISO 3166-1 alpha-2)
  label: String,              // Full country name
  flagEmoji: String,          // Country flag emoji
  taxSystem: {
    taxType: String,          // 'VAT', 'GST', etc.
    taxRate: Number,          // 5.00, 18.00, etc.
    registrationName: String  // 'FTA', 'DGRA', 'GSTIN', etc.
  },
  regulations: [{
    title: String,
    description: String,
    requirement: String
  }],
  addressPlaceholder: {
    street: String,
    city: String,
    state: String,
    postalCode: String
  },
  complianceRequirements: [{
    name: String,
    description: String
  }],
  isActive: Boolean,
  timestamps: true
}
```

## How to Seed the Database

### Step 1: Ensure MongoDB is Running
Make sure your MongoDB instance is running and the connection string in `.env` is correct.

### Step 2: Run the Seeder Script
From the server directory, run:

```bash
cd server
node countryConfigSeeder.js
```

### Expected Output
```
Connected to MongoDB
Cleared existing country configurations
Successfully seeded 3 country configurations
Country configurations:
  - United Arab Emirates (AE)
  - Oman (OM)
  - India (IN)
```

## Seeded Countries

### 1. United Arab Emirates (UAE)
- **Code:** AE
- **Tax System:** VAT at 5%
- **Key Authority:** FTA (Federal Tax Authority)
- **Accounting Standard:** IFRS

### 2. Oman (OM)
- **Code:** OM
- **Tax System:** VAT at 5%
- **Key Authority:** DGRA (State General Revenue Authority)
- **Special Requirements:** Omanization

### 3. India (IN)
- **Code:** IN
- **Tax System:** GST at 18%
- **Key Identifiers:** GSTIN, PAN
- **Accounting Standard:** Indian GAAP / Ind-AS
- **Fiscal Year:** April 1 - March 31

## API Endpoints

### Get All Countries
```
GET /api/countries
```
Returns all active country configurations.

### Get Country by Code
```
GET /api/countries/code/:code
```
Example: `GET /api/countries/code/AE`

### Get Country by Name
```
GET /api/countries/name/:name
```
Example: `GET /api/countries/name/UAE`

### Create Country (Admin)
```
POST /api/countries
```
Requires authentication and admin role.

### Update Country (Admin)
```
PUT /api/countries/:code
```
Requires authentication and admin role.

### Delete Country (Admin)
```
DELETE /api/countries/:code
```
Sets `isActive` to false (soft delete).

## Frontend Integration

The frontend component `CompanyMaster.jsx` now fetches country configurations from the API instead of hardcoding them:

1. **Fetches all countries on component mount**
2. **Auto-populates country-specific fields** (tax type, rate, code)
3. **Displays dynamic compliance requirements** from the database
4. **Sets country-specific address placeholders**

## Adding New Countries

To add a new country:

1. Create a country document in the CountryConfig collection
2. Include all required fields (countryName, countryCode, taxSystem, etc.)
3. The frontend will automatically render the new country in the dropdown

Example document structure:
```javascript
{
  countryName: 'NewCountry',
  countryCode: 'NC',
  label: 'New Country',
  flagEmoji: '🏳️',
  taxSystem: {
    taxType: 'VAT',
    taxRate: 5.0,
    registrationName: 'Tax Authority'
  },
  regulations: [...],
  addressPlaceholder: {...},
  complianceRequirements: [...],
  isActive: true
}
```

## Troubleshooting

### Script doesn't connect to MongoDB
- Verify MongoDB is running
- Check `.env` file has correct `MONGODB_URI`
- Ensure firewall allows MongoDB connection

### Countries not appearing in dropdown
- Run the seeder script to populate the collection
- Check browser console for API errors
- Verify API endpoint `/api/countries` returns data

### Data not updating after seeding
- Clear browser cache and reload
- Check network tab in DevTools to see if API is returning data
- Verify MongoDB contains the seeded documents

## Notes

- The seeder clears existing country configurations before inserting new ones
- All countries are set as `isActive: true` by default
- Timestamps (createdAt, updatedAt) are automatically managed by Mongoose
