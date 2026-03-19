# Company Master + License + Basic Settings Module

## Overview
This module provides comprehensive management of company information, license management, and system-wide basic settings for the NEXIS ERP system.

## Module Components

### 1. Company Master
**Purpose:** Store and manage main company information.

**Features:**
- Company Logo upload and management
- Basic company information (name, registration, tax ID, industry)
- Contact information (email, phone, website)
- Address information (street, city, state, postal code, country)
- Fiscal year end configuration

**Data Fields:**
```javascript
{
  companyName: string (required),
  registrationNumber: string,
  taxId: string,
  email: string (required, email validation),
  phone: string (required),
  website: string,
  logoUrl: string (base64 or URL),
  industry: string,
  fiscalYearEnd: string (format: MM-DD),
  address: string (required),
  city: string (required),
  state: string,
  postalCode: string,
  country: string (required)
}
```

### 2. License Management
**Purpose:** Handle software licensing, validation, and feature control.

**Features:**
- Display current license information
- License key management (copy-to-clipboard)
- License status monitoring (active, expiring soon, expired)
- Feature enablement/disablement based on license
- License validation and activation
- Support contact information

**License Information:**
```javascript
{
  licenseKey: string (unique),
  licensePlan: enum ('Starter', 'Professional', 'Enterprise'),
  companyName: string,
  issuedDate: date,
  expiryDate: date,
  maxUsers: number,
  maxProducts: number,
  maxInvoices: string,
  maxReports: string,
  features: {
    invoicing: boolean,
    inventory: boolean,
    accounting: boolean,
    sales: boolean,
    multiCurrency: boolean,
    advancedReports: boolean,
    customization: boolean,
    support: boolean
  }
}
```

### 3. Basic Settings
**Purpose:** Configure system-wide default settings and feature toggles.

**System Settings:**
- Date Format (DD-MM-YYYY, MM-DD-YYYY, YYYY-MM-DD, DD/MM/YYYY)
- Time Format (24-hour or 12-hour AM/PM)
- Default Currency (AED, USD, EUR, GBP, INR)
- Timezone (Asia/Dubai, Asia/Kolkata, Europe/London, America/New_York)
- Default Language (English, Arabic, Urdu)

**Feature Toggles:**
- Multi-Currency Support
- Multiple Warehouses
- Discounts
- Taxes
- Allow Negative Stock

**Invoice Settings:**
- Invoice Prefix (e.g., INV)
- Starting Invoice Number
- Invoice Signature requirement
- Terms & Conditions display

**Backup Settings:**
- Enable/Disable Auto Backup
- Backup Frequency (hourly, daily, weekly, monthly)
- Backup Time (24-hour format)

**Localization:**
- Show Company Name on documents
- Show Tax ID on documents
- Show Registration Number on documents

## API Endpoints

### Company Settings
```
GET    /api/settings/company          - Get company information
POST   /api/settings/company          - Update company information
PUT    /api/settings/company          - Update company information (alternative)
```

### License Management
```
GET    /api/settings/license          - Get current license
POST   /api/settings/license/validate - Validate and activate new license
```

### System Settings
```
GET    /api/settings/system           - Get system settings
POST   /api/settings/system           - Update system settings
PUT    /api/settings/system           - Update system settings (alternative)
```

### Combined
```
GET    /api/settings                  - Get all settings (company + license + system)
```

## Database Models

### Company Model
```javascript
- id (PK)
- companyName
- registrationNumber
- taxId
- email
- phone
- website
- logoUrl
- industry
- fiscalYearEnd
- address
- city
- state
- postalCode
- country
- createdAt
- updatedAt
```

### License Model
```javascript
- id (PK)
- licenseKey (unique)
- companyId (FK)
- licensePlan
- companyName
- issuedDate
- expiryDate
- maxUsers
- maxProducts
- maxInvoices
- maxReports
- features (JSON)
- isActive (boolean)
- createdAt
- updatedAt
```

### SystemSettings Model
```javascript
- id (PK)
- companyId (FK)
- dateFormat
- timeFormat
- currency
- defaultLanguage
- timezone
- enableMultiCurrency
- enableMultipleWarehouses
- enableDiscounts
- enableTaxes
- enableNegativeStock
- emailProvider
- smtpHost
- smtpPort
- smtpUsername
- smtpPassword
- smtpFromEmail
- invoicePrefix
- invoiceStartNumber
- enableInvoiceSignature
- enableInvoiceTerms
- enableAutoBackup
- backupFrequency
- backupTime
- companyNameDisplay
- showTaxId
- showRegistrationNumber
- createdAt
- updatedAt
```

## Usage

### Frontend Integration

1. **Accessing Company Settings:**
```jsx
import CompanySettings from './components/settings/CompanySettings'

// Use in main app
<CompanySettings />
```

2. **Fetching Settings Data:**
```javascript
// Get all settings
fetch('/api/settings')
  .then(res => res.json())
  .then(data => {
    console.log(data.company)
    console.log(data.license)
    console.log(data.systemSettings)
  })

// Get specific setting
fetch('/api/settings/company')
  .then(res => res.json())
  .then(data => console.log(data))
```

3. **Updating Settings:**
```javascript
// Update company settings
fetch('/api/settings/company', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(formData)
})
  .then(res => res.json())
  .then(data => console.log('Updated:', data))
```

### Backend Integration

1. **Accessing License in Other Controllers:**
```javascript
import { License } from '../Models/License.js'

// Check if feature is enabled
const license = await License.findOne({ where: { companyId: 1 } })
if (license.features.invoicing) {
  // Allow invoicing
}
```

2. **Accessing System Settings:**
```javascript
import { SystemSettings } from '../Models/SystemSettings.js'

// Get date format
const settings = await SystemSettings.findOne({ where: { companyId: 1 } })
console.log(settings.dateFormat) // DD-MM-YYYY
```

## Setup Instructions

### 1. Database Setup
```sql
-- The models will auto-create tables if using Sequelize sync
-- Or run migrations if using migration tools
```

### 2. Server Configuration
Add the following to your `.env` file:
```
COMPANY_ID=1
DEFAULT_TIMEZONE=Asia/Dubai
DEFAULT_CURRENCY=AED
```

### 3. Initialize Company Data
On first run, create initial company record:
```javascript
await Company.create({
  companyName: 'Your Company Name',
  email: 'company@example.com',
  phone: '+971554507149',
  country: 'United Arab Emirates'
})
```

## Features by License Plan

### Starter
- Basic invoicing
- Single warehouse
- Standard reports
- 5 users max
- 1,000 products max

### Professional
- Full invoicing
- Multi-warehouse support
- Advanced reports
- Multi-currency
- 50 users max
- 10,000 products max
- Custom branding

### Enterprise
- Everything in Professional
- Unlimited users
- Unlimited products
- Unlimited invoices
- API access
- Custom integration support
- Advanced customization

## Security Considerations

1. **Password Protection:** SMTP password is stored encrypted in production
2. **License Validation:** License keys are validated on server-side
3. **Audit Trail:** All settings changes should be logged for audit purposes
4. **Role-Based Access:** Only administrators should access settings

## Future Enhancements

1. **SMTP Email Testing:** Test email configuration before saving
2. **Backup Management:** Download, restore previous backups
3. **Audit Log:** Track all settings changes with timestamp and user
4. **Multi-Company Support:** Manage multiple companies
5. **License Analytics:** Track usage vs. license limits
6. **Notifications:** Alert when license is expiring
7. **Data Export:** Export company data in multiple formats
8. **API Integration:** Connect external services for backups, email, etc.

## Troubleshooting

### Issue: License validation fails
- **Solution:** Ensure license key format is correct and valid in database

### Issue: Settings not saving
- **Solution:** Check database connection and user permissions

### Issue: Email not sending
- **Solution:** Verify SMTP settings are correct and test connection

## Support
For issues or questions regarding this module, contact: support@alarabcomputersllc.com
Phone: +971 55 450 7149
