# Customers Module Services - Implementation Guide

## Overview

The Customers Module manages all customer master data, credit management, and tax configurations. Three services provide complete customer lifecycle management with country isolation (UAE, Oman, India), credit limit tracking, and GST-based tax configurations.

## Services Created

### 1. **CustomerService**
**Location**: `modules/customers/services/CustomerService.js`

Manages customer master data, creation, updates, and customer listing with country isolation.

#### Methods

| Method | Purpose | Parameters | Returns |
|--------|---------|-----------|---------|
| `generateNextCustomerCode()` | Auto-generate code | None | `Promise<string>` |
| `validateEmail(email)` | Validate email format | `email: string` | `boolean` |
| `isEmailUnique(email, excludeId)` | Check uniqueness | `email, excludeId` | `Promise<boolean>` |
| `isGSTUnique(gstNumber, excludeId, country)` | Check GST uniqueness | `gstNumber, excludeId, country` | `Promise<boolean>` |
| `createCustomer(customerData)` | Create customer | `customerData: Object` | `Promise<Object>` |
| `getCustomerById(customerId)` | Retrieve customer | `customerId: string` | `Promise<Object>` |
| `getCustomerByCode(customerCode)` | Get by code | `customerCode: string` | `Promise<Object>` |
| `getAllCustomers(filters)` | Paginated list | `filters: Object` | `Promise<Object>` |
| `getActiveCustomersrs(country, limit)` | Active by country | `country, limit` | `Promise<Array>` |
| `updateCustomer(customerId, updateData)` | Update customer | `customerId, updateData` | `Promise<Object>` |
| `updateCustomerStatus(customerId, status)` | Change status | `customerId, status` | `Promise<Object>` |
| `deleteCustomer(customerId)` | Soft delete | `customerId: string` | `Promise<Object>` |
| `searchCustomers(searchTerm, country, limit)` | Search | `searchTerm, country, limit` | `Promise<Array>` |
| `getCustomerStatistics(country)` | Statistics | `country: string` | `Promise<Object>` |
| `getCustomerContacts(country)` | Contact list | `country: string` | `Promise<Array>` |

#### Key Features

- **Auto-Generated Codes**: CUST001, CUST002, CUST003...
- **Multi-Country Support**: UAE, Oman, India with country isolation
- **Email Validation & Uniqueness**: Prevents duplicate emails
- **GST Number Tracking**: Country-specific GST validation
- **Ledger Accounts**: Auto-links to AR account for India
- **Payment Type**: Credit Sale or Cash Sale
- **Status Management**: Active, Inactive, Blacklisted, On Hold
- **Search & Pagination**: Full-text search across fields
- **Contact Management**: Quick access to customer contacts
- **Soft Deletes**: Historical customer records preserved

#### Usage Example

```javascript
import { CustomerService } from './services/index.js';

// Create customer
const customer = await CustomerService.createCustomer({
  name: 'ABC Trading Ltd',
  email: 'contact@abctrading.com',
  phone: '9876543210',
  address: '123 Business Park',
  city: 'Mumbai',
  gstNumber: '27AABCT1234H1Z0',
  country: 'India',
  taxType: 'Registered',
  paymentType: 'Credit Sale',
  paymentTerms: 'NET 15',
  creditLimit: 100000, // in rupees
});
// Returns: { customerCode: 'CUST001', ... }

// Get customer by code
const cust = await CustomerService.getCustomerByCode('CUST001');

// Get all customers in India
const indiaCustomers = await CustomerService.getAllCustomers({
  page: 1,
  limit: 50,
  country: 'India',
  status: 'Active',
});

// Get active customers for UAE
const uaeActive = await CustomerService.getActiveCustomers('UAE', 100);

// Search customers
const results = await CustomerService.searchCustomers('ABC', 'India', 20);

// Get statistics
const stats = await CustomerService.getCustomerStatistics('India');
// { totalCustomers: 500, byStatus: [...], byCountry: [...], byPaymentType: [...] }

// Update customer status
const updated = await CustomerService.updateCustomerStatus(customerId, 'On Hold');
```

---

### 2. **CustomerCreditService**
**Location**: `modules/customers/services/CustomerCreditService.js`

Manages credit limits, outstanding amounts, and credit risk analysis for customers.

#### Methods

| Method | Purpose | Parameters | Returns |
|--------|---------|-----------|---------|
| `getCustomerCreditProfile(customerId)` | Get credit profile | `customerId: string` | `Promise<Object>` |
| `updateCreditLimit(customerId, newCreditLimit)` | Update limit | `customerId, newLimit` | `Promise<Object>` |
| `getCustomersExceedingCreditLimit()` | Over limit | None | `Promise<Array>` |
| `getCustomersByCreditLimitRange(min, max)` | By range | `minLimit, maxLimit` | `Promise<Array>` |
| `calculateAvailableCredit(customer, outstanding)` | Calculate available | `customer, outstanding` | `number` |
| `canMakePurchase(customerId, amount, outstanding)` | Check eligibility | `customerId, amount, outstanding` | `Promise<Object>` |
| `getCreditAnalysis(customers, outstanding)` | Detailed analysis | `customers, outstanding` | `Object` |
| `getCreditUtilizationReport(outstandingData)` | Utilization % | `outstandingData: Array` | `Promise<Object>` |
| `getPaymentTermsDistribution()` | Terms summary | None | `Promise<Array>` |
| `getCustomersOnHold()` | On hold list | None | `Promise<Array>` |
| `getCreditLimitSummaryByCountry()` | By country | None | `Promise<Array>` |

#### Key Features

- **Credit Limit Management**: Update and track per-customer limits
- **Availability Calculation**: Real-time available credit
- **Purchase Eligibility**: Check before order creation
- **Risk Stratification**: Identify high-risk customers (>90% utilization)
- **Utilization Report**: Credit used vs. limit buckets
- **Country-Level Summaries**: Aggregate credit by country
- **Payment Terms Analysis**: Distribution of payment terms
- **Hold Management**: Track customers on hold

#### Credit Utilization Buckets

```
0-50%: Healthy customers
50-70%: Healthy with monitor
70-90%: Caution (watch closely)
90%+: Risk (high credit exposure)
```

#### Usage Example

```javascript
import { CustomerCreditService } from './services/index.js';

// Get customer credit profile
const profile = await CustomerCreditService.getCustomerCreditProfile(customerId);
// { creditLimit: 100000, paymentTerms: 'NET 15', ... }

// Update credit limit
const updated = await CustomerCreditService.updateCreditLimit(
  customerId,
  150000 // new limit
);

// Check if customer can make purchase
const canBuy = await CustomerCreditService.canMakePurchase(
  customerId,
  50000, // purchase amount
  20000  // current outstanding
);
// { allowed: true, remainingAfterPurchase: 80000, ... }

// Get customers exceeding credit limit
const overLimit = await CustomerCreditService.getCustomersExceedingCreditLimit();

// Get customers by credit limit range
const customers = await CustomerCreditService.getCustomersByCreditLimitRange(
  50000,   // min
  200000   // max
);

// Get credit analysis
const analysis = await CustomerCreditService.getCreditAnalysis(
  customerList,
  { customerId1: 50000, customerId2: 75000 } // outstanding amounts map
);
// {
//   totalCreditLimit: 500000,
//   totalOutstanding: 200000,
//   utilizationRate: 40,
//   riskCustomers: [...],
//   healthyCustomers: [...],
//   overLimitCustomers: [...]
// }

// Get credit utilization report
const report = await CustomerCreditService.getCreditUtilizationReport(
  outstandingData
);
// {
//   byUtilization: {
//     zeroToFifty: [...],
//     fiftyToSeventy: [...],
//     seventyToNinety: [...],
//     ninetyPlus: [...]
//   },
//   summary: { totalCustomers, healthyCount, cautionCount, riskCount }
// }

// Get credit limit summary by country
const byCountry = await CustomerCreditService.getCreditLimitSummaryByCountry();
// [ { _id: 'India', totalCreditLimit: 500000, avgCreditLimit: 50000, ... } ]
```

---

### 3. **CustomerTaxService**
**Location**: `modules/customers/services/CustomerTaxService.js`

Manages country-specific tax configurations, GST numbers, and tax group assignments.

#### Methods

| Method | Purpose | Parameters | Returns |
|--------|---------|-----------|---------|
| `validateTaxType(taxType)` | Validate tax type | `taxType: string` | `boolean` |
| `getCustomerTaxConfig(customerId)` | Get tax config | `customerId: string` | `Promise<Object>` |
| `updateCustomerTaxType(customerId, taxType)` | Update tax type | `customerId, taxType` | `Promise<Object>` |
| `updateCustomerGSTNumber(customerId, gstNumber)` | Update GST | `customerId, gstNumber` | `Promise<Object>` |
| `assignTaxGroup(customerId, taxGroupId)` | Assign tax group | `customerId, taxGroupId` | `Promise<Object>` |
| `removeTaxGroup(customerId)` | Remove tax group | `customerId: string` | `Promise<Object>` |
| `getCustomersByTaxType(taxType, country)` | By tax type | `taxType, country` | `Promise<Array>` |
| `getRegisteredGSTCustomers(country)` | Registered GST | `country: string` | `Promise<Array>` |
| `getUnregisteredCustomers(country)` | Unregistered | `country: string` | `Promise<Array>` |
| `getTaxConfigByCountry(country)` | By country | `country: string` | `Promise<Object>` |
| `validateGSTEligibility(customerId)` | Eligibility check | `customerId: string` | `Promise<Object>` |
| `getTaxSummaryReport()` | Full report | None | `Promise<Object>` |

#### Key Features

- **Tax Types**: Registered, Unregistered, Non-resident, SEZ, Government Entity, Other
- **GST Validation**: Format checking with lenient validation
- **GST Uniqueness**: Per-country uniqueness validation
- **Tax Groups**: Link customers to tax masters
- **Country Isolation**: India-specific tax configuration
- **Eligibility Checking**: GST transaction eligibility
- **Tax Reports**: By country and tax type summaries
- **Batch Queries**: Get registered/unregistered in bulk

#### Valid Tax Types

```
Registered         - GST registered, eligible for ITC
Unregistered       - No GST, no ITC
Non-resident       - Non-resident supplier
SEZ                - Special Economic Zone
Government Entity  - Government buyer (RFQ, tender)
Other              - Custom tax treatment
```

#### Usage Example

```javascript
import { CustomerTaxService } from './services/index.js';

// Get customer tax configuration
const taxConfig = await CustomerTaxService.getCustomerTaxConfig(customerId);
// { taxType: 'Registered', gstNumber: '27AABCT...', ... }

// Update customer tax type
const updated = await CustomerTaxService.updateCustomerTaxType(
  customerId,
  'Registered'
);

// Update GST number
const withGST = await CustomerTaxService.updateCustomerGSTNumber(
  customerId,
  '27AABCT1234H1Z0'
);

// Assign tax group
const withTax = await CustomerTaxService.assignTaxGroup(
  customerId,
  taxGroupId
);

// Validate GST eligibility for transaction
const eligible = await CustomerTaxService.validateGSTEligibility(customerId);
// { eligible: true, gstNumber: '27AABCT...', taxType: 'Registered' }

// Get customers by tax type
const registeredInIndia = await CustomerTaxService.getCustomersByTaxType(
  'Registered',
  'India'
);

// Get registered GST customers
const withGSTNumbers = await CustomerTaxService.getRegisteredGSTCustomers('India');

// Get unregistered customers
const unregistered = await CustomerTaxService.getUnregisteredCustomers('India');

// Get tax configuration by country
const indiaTax = await CustomerTaxService.getTaxConfigByCountry('India');
// {
//   country: 'India',
//   totalCustomers: 1000,
//   customersWithGST: 800,
//   customersWithoutGST: 200,
//   byTaxType: [...]
// }

// Get complete tax summary report
const report = await CustomerTaxService.getTaxSummaryReport();
// {
//   byCountry: {
//     India: { totalCustomers: 1000, customersWithGST: 800, ... },
//     UAE: { ... },
//     Oman: { ... }
//   },
//   totalCustomers: 1500
// }
```

---

## Controller Refactoring Pattern

Controllers should delegate to services:

```javascript
import { CustomerService, CustomerCreditService, CustomerTaxService } from '../services/index.js';
import { catchAsync } from '../../../config/errorHandler.js';

// POST /customers
export const createCustomer = catchAsync(async (req, res) => {
  const customer = await CustomerService.createCustomer(req.body);
  res.status(201).json({
    success: true,
    data: customer,
    message: 'Customer created successfully',
  });
});

// POST /customers/:id/credit-check
export const checkCreditEligibility = catchAsync(async (req, res) => {
  const { amount, outstanding } = req.body;
  const eligibility = await CustomerCreditService.canMakePurchase(
    req.params.id,
    amount,
    outstanding
  );
  res.json({
    success: true,
    data: eligibility,
    message: 'Credit check completed',
  });
});

// PUT /customers/:id/gst-number
export const updateGSTNumber = catchAsync(async (req, res) => {
  const customer = await CustomerTaxService.updateCustomerGSTNumber(
    req.params.id,
    req.body.gstNumber
  );
  res.json({
    success: true,
    data: customer,
    message: 'GST number updated successfully',
  });
});
```

---

## Error Handling

All services use consistent error handling:

```javascript
// Validation errors (400)
const error = new Error('Customer name is required');
error.status = 400;
throw error;

// Not found (404)
const error = new Error('Customer not found');
error.status = 404;
throw error;

// Conflict (409)
const error = new Error('Email already exists for another customer');
error.status = 409;
throw error;

// Business rule (400/409)
const error = new Error('Country must be one of: UAE, Oman, India');
error.status = 400;
throw error;
```

---

## Logging

All services use structured logging:

```javascript
logger.info('Customer created successfully', { customerId, customerCode, name, country });
logger.warn('GST format may be incorrect', { gstNumber });
logger.info('Credit analysis completed', { riskCustomers: 5, healthyCustomers: 95 });
logger.error('Error creating customer', { error });
```

---

## Country Isolation

The system enforces strict country isolation:

```
India:  GST-based tax system, 18% standard rate
UAE:    VAT-based tax system (not in this implementation)
Oman:   Tax system (not in this implementation)

Each customer linked to ONE country only
No inter-country sales in this implementation
```

---

## Customer Concepts

### Status Types

- **Active**: Normal operations
- **Inactive**: No new sales
- **Blacklisted**: Blocked due to bad debt
- **On Hold**: Temporary suspension

### Payment Types

- **Credit Sale**: Uses credit limit, invoice terms
- **Cash Sale**: Payment upfront, no credit limit check

### Tax Types (India only)

- **Registered**: Full GST compliance, Input Tax Credit
- **Unregistered**: No GST, no ITC
- **SEZ**: Special Economic Zone (exemption)
- **Government**: Government procurement (often tax-exempt)

### Credit Management

- **Credit Limit**: Maximum outstanding amount
- **Payment Terms**: NET 15, NET 30, NET 45, etc.
- **Available Credit**: Limit - Outstanding Amount
- **Utilization Rate**: Outstanding / Limit × 100%

---

## Files Created

### New Service Files
- `modules/customers/services/CustomerService.js` (480+ lines)
- `modules/customers/services/CustomerCreditService.js` (420+ lines)
- `modules/customers/services/CustomerTaxService.js` (400+ lines)
- `modules/customers/services/index.js` (Export aggregator)

### Service Statistics
- **Total Lines**: 1,300+
- **Total Methods**: 38
- **Complete Error Handling**: ✅
- **Structured Logging**: ✅
- **JSDoc Documentation**: ✅
- **Input Validation**: ✅
- **Country Isolation**: ✅

---

## Integration Checklist

- [ ] Refactor existing customer controller to use CustomerService
- [ ] Create credit check API endpoint
- [ ] Create tax configuration API endpoints
- [ ] Integrate validation middleware into customer routes
- [ ] Update sales order routes to check credit eligibility
- [ ] Create customer dashboard with credit/tax info
- [ ] Create credit limit reports
- [ ] Create tax compliance reports
- [ ] Create customer portal (self-service)
- [ ] Create bulk customer import
- [ ] Create customer audit trail
- [ ] Create segment-based customer groups

---

## Next Steps

1. **Refactor Controllers** to use services
2. **Integrate Validation Middleware** into routes
3. **Create Credit Check API** for order validation
4. **Create Tax Configuration UI** for admins
5. **Create Customer Portal** with credit/tax info
6. **Create Bulk Import** for customer creation
7. **Create Audit Trail** for customer changes
8. **Create Reports** (credit, tax, segments)
9. **Create Alerts** (credit exceeded, payment due)
10. **Create Analytics** (customer value, risk scoring)

---

## Quality Assurance

✅ Customer codes auto-generated uniquely
✅ Email validation and uniqueness enforced
✅ GST number country-specific validation
✅ Country isolation enforced
✅ Credit limit numeric validation
✅ Purchase eligibility checking
✅ Tax type validation by country
✅ GST eligibility for transactions
✅ Credit analysis multi-bucket categorization
✅ Soft deletes implemented
✅ Comprehensive error handling
✅ Structured logging throughout
✅ JSDoc documentation complete
✅ Pagination & search support
✅ Ledger account auto-linking
✅ Multi-country support
