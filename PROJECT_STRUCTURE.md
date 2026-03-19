# NEXIS-ERP Project Structure

## Recommended Folder Organization

### CLIENT STRUCTURE (`/client/src/`)

```
src/
├── pages/                          # Main application pages
│   ├── Home.jsx                   # Main dashboard/home page
│   ├── Login.jsx                  # Authentication page
│   ├── index.js                   # Page exports
│   └── NotFound.jsx              # 404 page
│
├── components/                     # Reusable React components (organized by feature)
│   ├── shared/                    # Shared components used across app
│   │   ├── Header.jsx
│   │   ├── Sidebar.jsx
│   │   ├── Footer.jsx
│   │   └── Toast.jsx
│   ├── dashboard/                 # Dashboard/analytics components
│   │   ├── InventoryDashboard.jsx
│   │   ├── SalesDashboard.jsx
│   │   └── index.js
│   ├── sales/                     # Sales module components
│   │   ├── SalesInvoice.jsx
│   │   ├── SalesOrder.jsx
│   │   ├── SalesReturn.jsx
│   │   ├── DeliveryNote.jsx
│   │   ├── Quotation.jsx
│   │   ├── Customers.jsx
│   │   └── index.js
│   ├── inventory/                 # Inventory module components
│   │   ├── GrnForm.jsx           # Goods Receipt Note
│   │   ├── GrvForm.jsx           # Goods Return Note
│   │   ├── InventoryAdjust.jsx
│   │   ├── StockTracking.jsx
│   │   ├── Vendors.jsx
│   │   └── index.js
│   ├── product/                   # Product management
│   │   ├── Product.jsx
│   │   ├── Grouping.jsx
│   │   ├── Promotion.jsx
│   │   └── index.js
│   ├── accounts/                  # Accounting module
│   │   ├── ChartOfAccounts.jsx
│   │   ├── Journal.jsx
│   │   ├── Payment.jsx
│   │   ├── Receipt.jsx
│   │   ├── Contra.jsx
│   │   ├── VendorPayments.jsx
│   │   ├── CustomerReceipts.jsx
│   │   ├── AccountSettings.jsx
│   │   └── index.js
│   ├── reports/                   # Reporting components
│   │   ├── StockVarianceReport.jsx
│   │   ├── SalesReport.jsx
│   │   ├── AccountsReport.jsx
│   │   └── index.js
│   ├── settings/                  # Settings/configuration
│   │   ├── GeneralSettings.jsx
│   │   ├── CompanySettings.jsx
│   │   └── index.js
│   └── menu/                      # Menu/navigation components
│       ├── DashBoard.jsx
│       └── index.js
│
├── hooks/                          # Custom React hooks
│   ├── useDecimalFormat.js        # Decimal/currency formatting
│   ├── useTaxMaster.js            # Tax master data hook
│   ├── useCostingMaster.js        # Costing data hook
│   ├── useApi.js                  # Generic API call hook
│   └── index.js
│
├── context/                        # Context API (global state)
│   ├── AuthContext.jsx            # Authentication state
│   ├── CompanyContext.jsx         # Company/company settings state
│   ├── CostingContext.jsx         # Costing/tax data state
│   └── index.js
│
├── services/                       # Business logic & API services
│   ├── DecimalFormatService.js    # Decimal formatting logic
│   ├── TaxService.js              # Tax calculation logic
│   ├── authService.js             # Authentication API calls
│   ├── apiService.js              # Generic API service
│   └── index.js
│
├── config/                         # Configuration files
│   ├── config.js                  # App configuration (API URL, etc)
│   ├── constants.js               # App constants
│   ├── reportsRoutes.jsx          # Report routes configuration
│   └── index.js
│
├── utils/                          # Utility functions
│   ├── formatters.js              # Formatting utilities
│   ├── validators.js              # Validation utilities
│   ├── helpers.js                 # Helper functions
│   └── index.js
│
├── assets/                         # Static assets
│   ├── images/
│   ├── icons/
│   ├── fonts/
│   └── styles/
│
├── App.jsx                         # Main App component
├── main.jsx                        # Entry point
├── index.css                       # Global styles
└── index.html                      # HTML template
```

### SERVER STRUCTURE (`/server/`)

```
server/
├── seeders/                        # Database seeders (move here)
│   ├── chartOfAccountsSeeder.js
│   ├── hsnMasterSeeder.js
│   ├── taxMasterSeeder.js
│   ├── sequenceSeeder.js
│   ├── userSeed.js
│   ├── countryConfigSeeder.js
│   └── README.md                  # Seeder documentation
│
├── controllers/                    # Route handlers/business logic
│   ├── accountGroupController.js
│   ├── activityLogController.js
│   ├── authController.js
│   ├── chartOfAccountsController.js
│   ├── contraController.js
│   ├── financialYearController.js
│   ├── grnController.js
│   ├── groupingController.js
│   ├── journalEntryController.js
│   ├── paymentController.js
│   ├── productController.js
│   ├── receiptController.js
│   ├── reportController.js
│   ├── roleController.js
│   ├── sequenceController.js
│   ├── settingsController.js
│   ├── stockVarianceController.js
│   ├── userController.js
│   ├── vendorController.js
│   └── sales/
│       ├── salesInvoiceController.js
│       ├── salesOrderController.js
│       └── index.js
│
├── routes/                         # API routes
│   ├── accountGroupRoutes.js
│   ├── activityLogRoutes.js
│   ├── Auth.js
│   ├── chartOfAccountsRoutes.js
│   ├── contraRoutes.js
│   ├── customerReceiptRoutes.js
│   ├── customerRoutes.js
│   ├── financialYearRoutes.js
│   ├── groupingRoutes.js
│   ├── grnRoutes.js
│   ├── journalEntryRoutes.js
│   ├── paymentRoutes.js
│   ├── productRoutes.js
│   ├── receiptRoutes.js
│   ├── reportRoutes.js
│   ├── roleRoutes.js
│   ├── sequenceRoutes.js
│   ├── settingsRoutes.js
│   ├── stockRoutes.js
│   ├── stockVarianceRoutes.js
│   ├── userRoutes.js
│   ├── vendorRoutes.js
│   └── sales/
│       ├── salesInvoiceRoutes.js
│       ├── salesOrderRoutes.js
│       └── index.js
│
├── Models/                         # Database models/schemas
│   ├── AccountGroup.js
│   ├── ActivityLog.js
│   ├── AddProduct.js
│   ├── ChartOfAccounts.js
│   ├── Company.js
│   ├── Contra.js
│   ├── CreateVendor.js
│   ├── Customer.js
│   ├── CustomerReceipt.js
│   ├── FinancialYear.js
│   ├── Grn.js
│   ├── Grouping.js
│   ├── InventoryBatch.js
│   ├── JournalEntry.js
│   ├── License.js
│   ├── Payment.js
│   ├── Receipt.js
│   ├── Role.js
│   ├── SequenceModel.js
│   ├── StockMovement.js
│   ├── SystemSettings.js
│   ├── User.js
│   └── Sales/
│       ├── SalesInvoice.js
│       ├── SalesOrder.js
│       └── index.js
│
├── middleware/                     # Express middleware
│   ├── auth.js                    # Authentication middleware
│   ├── errorHandler.js            # Error handling middleware
│   ├── logging.js                 # Request logging middleware
│   ├── validation.js              # Input validation middleware
│   └── index.js
│
├── config/                         # Configuration
│   ├── database.js                # Database configuration
│   ├── constants.js               # Server constants
│   └── environment.js             # Environment variables
│
├── helpers/                        # Helper utilities
│   ├── taxCalculations.js         # Tax calculation helpers
│   ├── validators.js              # Validation helpers
│   ├── formatters.js              # Formatting helpers
│   ├── apiResponse.js             # Standard API response format
│   └── index.js
│
├── services/                       # Business logic services
│   ├── stockService.js            # Stock management logic
│   ├── taxService.js              # Tax calculation service
│   ├── reportService.js           # Reporting logic
│   └── index.js
│
├── db/                             # Database setup
│   └── db.js                      # MongoDB connection
│
├── logs/                           # Application logs
│   └── .gitkeep
│
├── .env                            # Environment variables
├── .gitignore                      # Git ignore rules
├── package.json                    # Dependencies
├── package-lock.json
├── server.js                       # Main server file
│
├── SEEDERS_README.md              # Seeder documentation
├── .env.example                    # Example env file
└── README.md                       # Server documentation
```

## File Naming Conventions

### React Components
```
- PascalCase for component files: Dashboard.jsx, UserProfile.jsx
- Folder names: lowercase (dashboard, user-profile)
- Hooks: useCustomHook.js (camelCase)
- Context: NameContext.jsx (PascalCase)
```

### Backend
```
- Controllers: camelCase ending with 'Controller': userController.js, productController.js
- Models: PascalCase: User.js, Product.js
- Routes: camelCase ending with 'Routes': userRoutes.js
- Middleware: camelCase: authMiddleware.js
- Services: camelCase: userService.js
```

## Import Organization

### Client Side
```javascript
// 1. Third-party imports
import React, { useState } from 'react';
import axios from 'axios';

// 2. Local imports (absolute paths)
import { useDecimalFormat } from '../../hooks';
import { CompanyContext } from '../../context';
import { API_URL } from '../../config';

// 3. Component imports
import SharedComponent from '../shared/SharedComponent';
import { formatCurrency } from '../../utils';

// 4. Styles
import './Component.css';
```

### Server Side
```javascript
// 1. Core modules
const express = require('express');
const mongoose = require('mongoose');

// 2. Local imports
const { errorHandler } = require('../middleware');
const { apiResponse } = require('../helpers');
const User = require('../Models/User');
const userService = require('../services/userService');

// 3. Constants
const { STATUS_CODES } = require('../config/constants');
```

## Module Exports

### Client Side
```javascript
// hooks/index.js
export { useDecimalFormat } from './useDecimalFormat';
export { useTaxMaster } from './useTaxMaster';

// components/sales/index.js
export { default as SalesInvoice } from './SalesInvoice';
export { default as SalesOrder } from './SalesOrder';
```

### Server Side
```javascript
// models/index.js
module.exports = {
  User: require('./User'),
  Product: require('./AddProduct'),
  Customer: require('./Customer'),
};

// routes/index.js
module.exports = (app) => {
  app.use('/api/users', require('./userRoutes'));
  app.use('/api/products', require('./productRoutes'));
};
```

## Benefits of This Structure

✅ **Scalability**: Easy to add new features and modules
✅ **Maintainability**: Clear separation of concerns
✅ **Reusability**: Shared components and utilities are organized
✅ **Testability**: Services and utilities are isolated for testing
✅ **Readability**: Self-documenting folder structure
✅ **Performance**: Code splitting and lazy loading friendly
✅ **Developer Experience**: Quick to navigate and understand codebase

## Migration Steps

1. Create new folders in both client and server
2. Move files to appropriate folders systematically
3. Update all import paths in moved files
4. Create `index.js` files for cleaner imports
5. Update `server.js` route registration if needed
6. Test all functionality after migration
7. Delete old folders once migration is complete

## Notes

- This structure can be extended with additional modules as needed
- Use absolute path imports (configured in tsconfig.json or vite config)
- Keep `index.js` files updated for clean imports
- Organize by feature first, then by type within features
