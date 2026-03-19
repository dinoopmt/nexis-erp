# POS System Complete Implementation Guide

## Overview

The NEXIS-ERP POS (Point of Sale) System is a comprehensive multi-terminal, multi-user solution designed for retail operations. The system provides complete transaction management, inventory sync, payment processing, and business analytics.

## System Architecture

### Frontend Components

The POS system is built with React components organized in `d:\NEXIS-ERP\client\src\components\pos\`

#### 0. **POSShiftStart.jsx** - Shift Opening/Day Start
- **Purpose**: Open new shift with opening balance declaration
- **Responsibilities**: 
  - Display previous shift closing details
  - Collect opening balance from cashier
  - Validate cash drawer amount
  - Start new shift
- **Props**:
  - `terminalId: string` - Terminal ID
  - `operatorId: string` - Operator ID
  - `onShiftOpened(shiftData)` - Callback when shift opens
- **API Endpoints Called**:
  - `GET /pos/terminals/{id}/previous-shift-summary` - Previous shift data
  - `POST /pos/shifts/open` - Open new shift
- **Key Features**:
  - Previous shift closing balance display
  - Variance calculation from previous shift
  - Opening balance confirmation
  - Acknowledgment checkbox
  - Pre-shift checklist guidance

#### 1. **POSSystem.jsx** - Main Router/Navigation
- **Purpose**: Main container managing navigation between all POS screens, including shift start workflow
- **Responsibilities**: 
  - Route management between screens
  - Session state management (terminalId, operatorId, shiftId)
  - localStorage persistence for session data
  - Shift state tracking (open/closed)
  - Authentication/Login redirection
  - Force POSShiftStart if shift not open
- **Props**: None (standalone component)
- **State Variables**:
  - `currentScreen`: Current active screen (login, menu, sale, return, payments, inventory, reports, settings)
  - `terminalId`: Active terminal ID
  - `operatorId`: Logged-in operator ID

#### 2. **POSLogin.jsx** - Authentication & Session Start
- **Purpose**: Terminal and operator selection before POS access
- **Workflow**: Login → POSShiftStart (if no active shift) → POSMainMenu (when shift open)
- **Features**:
  - Terminal dropdown selection with status indicators
  - Operator (cashier) selection
  - Real-time data loading from API
  - Error handling and connection status
- **API Endpoints Called**:
  - `GET /pos/terminals` - Load available terminals
  - `GET /auth/users?role=cashier` - Load operator list
  - `POST /pos/sessions/start` - Start new POS session
- **Props**:
  - `onLogin(terminalId, operatorId)` - Callback when login succeeds

#### 3. **POSMainMenu.jsx** - Dashboard & Home Screen
- **Purpose**: Shift management dashboard showing terminal status and navigation
- **Prerequisite**: Only accessible when shift is open (redirects to POSShiftStart if not)
- **Features**:
  - Real-time clock display (updates every 1 second)
  - Terminal status card (Active/Inactive/Offline/Maintenance)
  - Daily sales summary (today's sales, cash balance, shift status)
  - 8 quick-action buttons for main functions
  - Payment method breakdown
  - Top 5 products ranking
  - Daily statistics
  - Auto-refresh every 30 seconds
- **API Endpoints Called**:
  - `GET /pos/terminals/{terminalId}/status` - Terminal info
  - `GET /pos/terminals/{terminalId}/daily-sales` - Daily summary
  - `GET /pos/terminals/{terminalId}/current-shift` - Active shift data
  - `POST /pos/shifts/{shiftId}/close` - Close shift on logout
- **Props**:
  - `terminalId` - Current terminal ID
  - `operatorId` - Logged-in operator
  - `shiftId` - Active shift ID
  - `onNavigate(screen)` - Navigate to other screens
  - `onLogout()` - Close shift and logout

#### 4. **POSSale.jsx** - Transaction Entry Screen
- **Purpose**: Create new point-of-sale transactions
- **Prerequisite**: Shift must be open
- **Features**:
  - Product search with autocomplete (minimum 2 characters)
  - Barcode scanner support
  - Shopping cart with quantity management
  - Line-item price calculations
  - Discount management (0-100%)
  - Tax calculation (5% VAT for UAE)
  - Customer selection (optional)
  - Payment method selection
  - Payment confirmation modal
  - Receipt preview/printing
- **API Endpoints Called**:
  - `GET /inventory/products/search?query={term}&limit=10` - Product search
  - `POST /pos/sales/create` - Save transaction
- **Props**:
  - `terminalId` - Current terminal
  - `operatorId` - Operator performing sale
  - `onBack()` - Return to menu
- **State Variables**:
  - `cartItems[]` - Products in cart
  - `searchTerm` - Current search query
  - `searchResults[]` - Matching products
  - `selectedCustomer` - Selected/walk-in customer
  - `discountPercent` - Applied discount
  - `paymentMode` - Payment method (cash, card, cheque, online)

#### 5. **POSReturn.jsx** - Return/Exchange Management
- **Purpose**: Process product returns and exchanges
- **Prerequisite**: Shift must be open
- **Features**:
  - Original sale search
  - Product search for returns
  - Return reason selection (defective, customer request, wrong item, damaged)
  - Quantity management for returns
  - Return summary with totals
  - Confirmation workflow
- **API Endpoints Called**:
  - `GET /sales/invoices/search?query={value}` - Find original invoices
  - `GET /inventory/products/search?query={value}` - Search products
  - `POST /sales/returns/create` - Process return
- **Props**:
  - `terminalId` - Current terminal
  - `operatorId` - Operator
  - `onBack()` - Return to menu

#### 6. **POSPayments.jsx** - Payment Management & Cash Reconciliation
- **Purpose**: Track payments and perform shift-end reconciliation
- **Prerequisite**: Shift must be open
- **Features**:
  - Current shift information
  - Payment method breakdown
  - Manual payment entry
  - Real-time payment total updates
  - Cash reconciliation workflow
  - Variance detection
- **API Endpoints Called**:
  - `GET /pos/shifts/current?terminalId={id}` - Current shift info
  - `GET /pos/shifts/{shiftId}/payments` - Payment breakdown
  - `POST /pos/payments/register` - Record manual payment
  - `POST /pos/shifts/{shiftId}/reconcile` - Perform reconciliation
- **Props**:
  - `terminalId` - Current terminal
  - `operatorId` - Operator
  - `onBack()` - Return to menu

#### 7. **POSInventory.jsx** - Stock Management
- **Purpose**: View and manage inventory at terminal level
- **Prerequisite**: Shift must be open
- **Features**:
  - Product catalog with stock levels
  - Stock status indicators (Out of Stock, Low Stock, Running Low, In Stock)
  - Product search by name/SKU/barcode
  - Category filtering
  - Low stock alerts
  - Stock details (reserved, in-transit)
  - Terminal-specific inventory view
- **API Endpoints Called**:
  - `GET /inventory/products?terminal={id}&includeStock=true` - Products with stock
  - `GET /inventory/categories` - Product categories
- **Props**:
  - `terminalId` - Current terminal
  - `onBack()` - Return to menu

#### 8. **POSReports.jsx** - Sales Analytics & Reporting
- **Purpose**: Provide business intelligence and sales reporting
- **Prerequisite**: Shift must be open
- **Features**:
  - Date range selection (Today, Last 7 days, Last 30 days, Custom)
  - Sales summary cards (Total Sales, Transaction Count, Avg Transaction, Unique Customers)
  - Top 5 products ranking
  - Payment method breakdown with percentages
  - Hourly sales trends
  - CSV export functionality
  - Real-time data sync
- **API Endpoints Called**:
  - `GET /pos/reports/sales` - Sales summary
  - `GET /pos/reports/top-products` - Top products
  - `GET /pos/reports/payment-breakdown` - Payment methods
  - `GET /pos/reports/customer-metrics` - Customer data
  - `GET /pos/reports/hourly-trends` - Hourly data
- **Props**:
  - `terminalId` - Current terminal
  - `onBack()` - Return to menu

#### 9. **POSSettings.jsx** - Terminal Configuration
- **Purpose**: Configure terminal hardware and system settings
- **Prerequisite**: Shift must be open
- **Features**:
  - Terminal information (Name, ID, IP, MAC address)
  - Printer settings (Receipt width, print quality)
  - Peripheral settings (Barcode scanner, signature, customer display)
  - System settings (auto-sync interval, currency)
  - Debug mode toggle
  - Format settings (decimal places)
  - Change tracking with save/reset
- **API Endpoints Called**:
  - `GET /pos/terminals/{id}/settings` - Current settings
  - `PUT /pos/terminals/{id}/settings` - Save settings
- **Props**:
  - `terminalId` - Current terminal
  - `onBack()` - Return to menu

## API Endpoint Structure

### Base URL
```
http://localhost:5000/api
```

### POS Endpoints Needed

#### Terminals
```
GET    /pos/terminals                              - List all terminals
GET    /pos/terminals/{id}                          - Get terminal details
GET    /pos/terminals/{id}/settings                - Get terminal settings
PUT    /pos/terminals/{id}/settings                - Update terminal settings
GET    /pos/terminals/{id}/status                  - Real-time status
GET    /pos/terminals/{id}/daily-sales             - Daily summary
POST   /pos/terminals/{terminalId}/register        - Register new terminal
```

#### Sessions & Shifts
```
POST   /pos/sessions/start                         - Start POS session
GET    /pos/shifts/current?terminalId={id}         - Get active shift
GET    /pos/shifts/{id}/payments                   - Get shift payments
POST   /pos/shifts/{id}/close                      - Close shift
POST   /pos/shifts/{id}/reconcile                  - Cash reconciliation
```

#### Sales Transactions
```
POST   /pos/sales/create                           - Create transaction
GET    /pos/sales/recent?terminalId={id}           - Recent transactions
POST   /pos/sales/{id}/void                        - Void transaction
```

#### Returns
```
POST   /sales/returns/create                       - Process return
GET    /sales/returns?terminalId={id}              - Get returns
```

#### Payments
```
POST   /pos/payments/register                      - Record payment
GET    /pos/shifts/{id}/payments                   - Get payment breakdown
```

#### Reports
```
GET    /pos/reports/sales                          - Sales summary
GET    /pos/reports/top-products                   - Top products
GET    /pos/reports/payment-breakdown              - Payment methods
GET    /pos/reports/customer-metrics               - Customer data
GET    /pos/reports/hourly-trends                  - Hourly trends
```

## Data Models Required

### POSSale Model
```javascript
{
  _id: ObjectId,
  terminalId: String,
  operatorId: String,
  customerId: String, // optional, null for walk-in
  items: [{
    productId: String,
    quantity: Number,
    price: Number,
    lineTotal: Number
  }],
  subtotal: Number,
  discountAmount: Number,
  taxAmount: Number,
  total: Number,
  paymentMethod: String, // cash, card, cheque, online
  reference: String, // Receipt number
  status: String, // completed, voided, pending
  createdAt: Date,
  timestamp: Date
}
```

### POSShift Model
```javascript
{
  _id: ObjectId,
  terminalId: String,
  operatorId: String,
  openedAt: Date,
  closedAt: Date,
  status: String, // open, closed
  openingBalance: Number,
  closingBalance: Number,
  declaredCashAmount: Number,
  variance: Number,
  paymentMethods: [{
    method: String, // cash, card, cheque, online
    amount: Number,
    count: Number
  }],
  totalSales: Number,
  transactionCount: Number,
  timestamp: Date
}
```

### POSTerminal Model
```javascript
{
  _id: ObjectId,
  terminalName: String,
  ipAddress: String,
  macAddress: String,
  status: String, // active, inactive, offline, maintenance
  lastSync: Date,
  settings: {
    receiptWidth: String,
    printQuality: String,
    autoSyncInterval: Number,
    enableBarcode: Boolean,
    enableSignature: Boolean,
    enableCustomerDisplay: Boolean,
    currency: String,
    decimalPlaces: Number
  },
  createdAt: Date
}
```

## Integration Checklist

### Backend Setup
- [ ] Create POS routes in `server/modules/pos/routes/`
- [ ] Create POS controllers in `server/modules/pos/controllers/`
- [ ] Create POS services in `server/modules/pos/services/`
- [ ] Create models: POSSale, POSShift, POSTerminal
- [ ] Implement all endpoints listed above
- [ ] Add authentication/authorization for POS operators
- [ ] Implement real-time shift management
- [ ] Add GL entry auto-posting for sales
- [ ] Implement inventory sync on sale creation

### Frontend Setup
- [ ] Import all POS components into POSSystem
- [ ] Update app routing to include POS
- [ ] Test navigation between all screens
- [ ] Verify API calls match backend endpoints
- [ ] Test error handling and messages
- [ ] Validate form data before submission
- [ ] Test localStorage persistence
- [ ] Implement offline mode (optional)

### Testing Requirements
- [ ] Login flow with terminal and operator
- [ ] Create multiple transactions
- [ ] Test discount and tax calculations
- [ ] Verify payment method tracking
- [ ] Test shift operations (open/close)
- [ ] Validate cash reconciliation
- [ ] Check report generation
- [ ] Test multi-terminal sync
- [ ] Verify inventory updates

## Hooks & Utilities Used

### Custom Hooks
- `useDecimalFormat()` - Currency formatting with country support
- `useCompanyContext()` - Company/terminal context (referenced in POSMainMenu)

### External Libraries
- `axios` - HTTP requests
- `lucide-react` - Icons
- `tailwind` - Styling

## Configuration

### Currency Support
- UAE (AED): 2 decimal places
- Oman (OMR): 3 decimal places  
- India (INR): 2 decimal places

### Tax Rates
- Default: 5% VAT (UAE)
- Configurable per country/terminal

### Timeout Values
- Auto-refresh: 30 seconds
- Clock update: 1 second
- Data sync: Configurable per terminal

## Multi-Terminal Support

### Key Features
- Each terminal has independent session
- Shared backend data synchronization
- Separate shift management per terminal
- Centralized reporting across terminals
- Real-time inventory sync between terminals
- Terminal-specific settings and configuration

### Session Management
- One operator per terminal at a time
- Session starts with shift open
- Session ends with shift close
- Browser localStorage for quick access
- Backend session validation

## Security Considerations

- Validate operator credentials on `/pos/sessions/start`
- Encrypt sensitive terminal settings
- Audit all POS transactions to activity log
- Require pin/password for refunds/voids
- Role-based access control (Cashier, Supervisor, Manager)
- Restrict void/refund to authorized operators only
- Log all payment reconciliation activities

## Error Handling

All components include:
- Try/catch for API calls
- User-friendly error messages
- Automatic retry for network failures
- Loading states during data fetch
- Validation before submission
- Connection status indicators

## Next Steps

1. **Backend Implementation**: Create POS module routes/controllers/services
2. **API Integration**: Build all endpoints listed in "API Endpoint Structure"
3. **Database Models**: Create MongoDB models for POSSale, POSShift, POSTerminal
4. **Testing**: Unit test all components and API endpoints
5. **Deployment**: Deploy frontend and backend to production
6. **Hardware Setup**: Configure printers, barcode scanners, displays
7. **Training**: User training on POS operations
8. **Go-Live**: Pilot test with limited terminals, then full rollout

## Support & Documentation

- Frontend components are self-documented with JSDoc comments
- Each component has inline comments explaining logic
- API endpoints follow RESTful conventions
- Error messages are user-friendly and action-oriented
- Toast messages for success/failure feedback

---

**Last Updated**: March 5, 2026
**System Version**: 1.0.0
**Status**: Frontend Complete, Backend In Progress
