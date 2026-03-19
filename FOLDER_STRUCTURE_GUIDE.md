# NEXIS-ERP Folder Structure Guide

## 📁 Project Organization

This document explains the improved folder structure of the NEXIS-ERP application.

## Quick Navigation

### CLIENT SIDE (`/client/src/`)

| Folder | Purpose | Key Files |
|--------|---------|-----------|
| `pages/` | Main app pages | Home.jsx, Login.jsx |
| `components/` | Reusable React components | Organized by feature |
| `hooks/` | Custom React hooks | useDecimalFormat, useTaxMaster |
| `context/` | Global state management | AuthContext, CompanyContext |
| `services/` | Business logic & utilities | DecimalFormatService, TaxService |
| `config/` | App configuration | config.js, constants.js |
| `utils/` | Helper functions | formatDate, validateEmail, etc. |
| `constants/` | Application constants | Invoice types, Payment status |
| `assets/` | Static files | Images, icons, fonts |

### SERVER SIDE (`/server/`)

| Folder | Purpose | Key Files |
|--------|---------|-----------|
| `controllers/` | Route handlers | userController, productController |
| `routes/` | API endpoints | userRoutes, productRoutes |
| `Models/` | Database schemas | User.js, Product.js |
| `seeders/` | Database initialization | chartOfAccountsSeeder, taxMasterSeeder |
| `middleware/` | Express middleware | errorHandler, requestLogger |
| `config/` | Configuration | constants.js, environment variables |
| `helpers/` | Common utilities | apiResponse, validation helpers |
| `services/` | Business logic | stockService, taxService |
| `db/` | Database connection | db.js |

## 🎯 Import Patterns

### Cleaner Imports (After Reorganization)

**Before:**
```javascript
import { useDecimalFormat } from '../../hooks/useDecimalFormat';
import { useTaxMaster } from '../../hooks/useTaxMaster';
import { CompanyContext } from '../../context/CompanyContext';
```

**After:**
```javascript
import { useDecimalFormat, useTaxMaster } from '../../hooks';
import { CompanyContext } from '../../context';
```

## 📂 Detailed Folder Descriptions

### `/client/src/components/`

Components are organized by feature:

```
components/
├── shared/          # Reusable across entire app
│   ├── Header.jsx
│   ├── Sidebar.jsx
│   └── Toast.jsx
├── dashboard/       # Dashboard-specific components
├── sales/           # Sales module components
├── inventory/       # Inventory module components
├── product/         # Product management components
├── accounts/        # Accounting module components
├── reports/         # Reporting components
└── settings/        # Settings/configuration components
```

**Benefits:**
- Easy to locate feature-specific code
- Clear separation of concerns
- Scalable for adding new modules
- Reduced component coupling

### `/client/src/hooks/`

Custom React hooks for reusable logic:

```
hooks/
├── useDecimalFormat.js    # Currency & decimal formatting
├── useTaxMaster.js        # Tax data management
├── useCostingMaster.js    # Costing data
└── index.js               # Central exports
```

**Usage:**
```javascript
import { useDecimalFormat, useTaxMaster } from '../../hooks';
```

### `/client/src/context/`

Global state management with Context API:

```
context/
├── AuthContext.jsx        # Authentication state
├── CompanyContext.jsx     # Company settings & data
├── CostingContext.jsx     # Costing & tax data
└── index.js               # Central exports
```

### `/client/src/services/`

Business logic separated from React components:

```
services/
├── DecimalFormatService.js  # Decimal formatting logic
├── TaxService.js            # Tax calculation logic
└── index.js                 # Central exports
```

### `/server/seeders/`

Database initialization scripts:

```
seeders/
├── chartOfAccountsSeeder.js
├── hsnMasterSeeder.js
├── taxMasterSeeder.js
├── sequenceSeeder.js
├── userSeed.js
├── countryConfigSeeder.js
└── README.md                # Seeder documentation
```

**Run all seeders:**
```bash
npm run seed
```

### `/server/middleware/`

Express middleware for request handling:

```
middleware/
├── errorHandler.js       # Global error handling
├── requestLogger.js      # Request logging
├── validation.js         # Input validation
├── auth.js              # Authentication
└── index.js             # Central exports
```

### `/server/config/`

Application configuration:

```
config/
├── constants.js         # Server constants
├── database.js          # DB configuration
└── environment.js       # Environment variables
```

### `/server/helpers/`

Reusable utility functions:

```
helpers/
├── apiResponse.js       # Standard response format
├── validators.js        # Validation utilities
├── formatters.js        # Formatting utilities
└── index.js             # Central exports
```

## 🔄 File Naming Conventions

### React Components (Frontend)
```
✅ Product.jsx           # PascalCase for components
✅ useDecimalFormat.js   # camelCase for hooks
✅ AuthContext.jsx       # PascalCase for context
✅ index.js              # lowercase for index files
```

### Backend
```
✅ productController.js  # camelCase ending with 'Controller'
✅ Product.js            # PascalCase for models
✅ productRoutes.js      # camelCase ending with 'Routes'
✅ productService.js     # camelCase ending with 'Service'
```

## 🎓 Best Practices

### 1. **Use Index Files for Clean Imports**

Instead of:
```javascript
import { useDecimalFormat } from '../hooks/useDecimalFormat';
import { useTaxMaster } from '../hooks/useTaxMaster';
```

Use:
```javascript
import { useDecimalFormat, useTaxMaster } from '../hooks';
```

### 2. **Organize Imports**

```javascript
// 1. React & third-party
import React, { useState } from 'react';
import axios from 'axios';

// 2. Local imports
import { useDecimalFormat } from '../../hooks';
import { CompanyContext } from '../../context';

// 3. Styles
import './Component.css';
```

### 3. **Feature-Based Organization**

Group related components, hooks, and utilities by feature:
- `/components/sales/` - Sales-related components
- `/components/inventory/` - Inventory-related components
- `/components/accounts/` - Accounting-related components

### 4. **Centralize Configuration**

Keep all configuration in `/config`:
- API URLs
- Constants
- Routes configuration
- Feature flags

### 5. **Separate Business Logic from UI**

Use services for business logic:
- Tax calculations → `TaxService.js`
- Formatting → `DecimalFormatService.js`
- API calls → `apiService.js`

## 🚀 Migration Checklist

- [x] Create seeds folder structure
- [x] Create middleware folder
- [x] Create config subfolder
- [x] Create helpers folder
- [x] Create constants folder (client)
- [x] Create index.js files for exports
- [x] Add documentation

## 📋 Import Verification

Check that all imports are using the new structure:

```bash
# Find imports from old paths
grep -r "from '../'" --include="*.jsx" --include="*.js"
```

## 🔗 Related Documentation

- See `PROJECT_STRUCTURE.md` for complete folder layout
- See `seeders/README.md` for database seeder details
- Check `.env.example` for environment variables

## 💡 Tips

1. **Always update index.js** when adding new files to a folder
2. **Use absolute paths** if configured in your build tool
3. **Keep services focused** on single responsibility
4. **Organize by feature first**, then by type
5. **Document custom hooks** with JSDoc comments

## ❓ FAQ

**Q: Why organize by feature instead of by file type?**
A: Feature-based organization makes it easier to find all related code for a feature and reduces coupling between features.

**Q: Should I move existing seeders to the new seeders folder?**
A: Yes, but update the import paths in server.js. See `seeders/README.md` for details.

**Q: How do I add a new helper function?**
A: Add it to `/server/helpers/index.js` and export it for use across your application.

**Q: Can I customize the folder structure?**
A: Yes! Adjust based on your team's preferences, but maintain consistency across the project.

## 📞 Support

For questions about the folder structure, refer to:
- `PROJECT_STRUCTURE.md` - Detailed structure guide
- `seeders/README.md` - Seeder documentation
- Component `index.js` files - Available exports

---

**Last Updated:** March 2026
**Version:** 1.0
