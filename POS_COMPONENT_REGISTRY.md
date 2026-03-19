# NEXIS-ERP POS System - Component Registry

## Component Inventory

All POS components are located in: `d:\NEXIS-ERP\client\src\components\pos\`

### Component Overview

| Component | Purpose | Status |
|-----------|---------|--------|
| POSShiftStart.jsx | Day start - opening balance entry | ✅ Complete |
| POSSystem.jsx | Main router & container | ✅ Complete |
| POSLogin.jsx | Terminal & operator selection | ✅ Complete |
| POSMainMenu.jsx | Dashboard & navigation | ✅ Complete |
| POSSale.jsx | Transaction entry | ✅ Complete |
| POSReturn.jsx | Return management | ✅ Complete |
| POSPayments.jsx | Payment tracking & reconciliation | ✅ Complete |
| POSInventory.jsx | Stock management | ✅ Complete |
| POSReports.jsx | Sales analytics | ✅ Complete |
| POSSettings.jsx | Terminal configuration | ✅ Complete |

---

## Component Details & Dependency Map

### 0. POSShiftStart.jsx
**Type**: Shift Opening Screen  
**Status**: ✅ Complete  
**Lines**: ~300
**Type**: Shift Opening Screen  
**Status**: ✅ Complete  
**Lines**: ~300  
**External Dependencies**:
- React (useState, useEffect)
- axios
- useDecimalFormat (custom hook)
- lucide-react Icons: Sun, DollarSign, AlertCircle, CheckCircle, Zap, ChevronRight

**API Calls**:
- `GET /pos/terminals/{terminalId}/previous-shift-summary` - Previous shift data
- `POST /pos/shifts/open` - Open new shift

**Props**:
- `terminalId: string` - Terminal ID
- `operatorId: string` - Operator ID
- `onShiftOpened(shiftData)` - Callback when shift opens

**Features**:
- Previous shift closing balance display
- Opening balance input
- Variance calculation
- Acknowledgment checkbox
- Pre-shift checklist
- Real-time validation

**State Management**:
- openingBalance: string
- previousShiftData: object
- isLoading: boolean
- isProcessing: boolean
- message: object
- acknowledged: boolean

**Key Functions**:
- `handleOpenShift()` - Submit opening balance and open shift
- `fetchPreviousShiftData()` - Load previous shift summary

---

### 1. POSSystem.jsx
**Type**: Router/Container Component  
**Status**: ✅ Complete  
**Lines**: ~100  
**External Dependencies**:
- React (useState, useEffect)

**Internal Dependencies**:
- POSLogin
- POSShiftStart
- POSMainMenu
- POSSale
- POSReturn
- POSPayments
- POSInventory
- POSReports
- POSSettings

**Props**: None (Standalone)

**Key Functions**:
- `handleNavigate(screen)` - Route to different screens
- `handleLogin(terminal, operator)` - Start session
- `handleShiftOpened(shiftData)` - Mark shift as open
- `handleLogout()` - End session and clear shift

**State Management**:
- currentScreen: string
- terminalId: string
- operatorId: string
- shiftId: string
- shiftOpen: boolean

**Workflow**:
1. Login (POSLogin) → POSShiftStart → POSMainMenu
2. Only shows POSMainMenu if shiftOpen=true
3. Forces back to POSShiftStart if trying to access screens without open shift

**localStorage Keys Used**:
- `posTerminalId`
- `posOperatorId`
- `posShiftId`

---

### 2. POSLogin.jsx
**Type**: Authentication Screen  
**Status**: ✅ Complete  
**Lines**: ~250  
**External Dependencies**:
- React (useState, useEffect)
- axios
- lucide-react Icons: LogIn, AlertCircle, Zap, User, Monitor

**API Calls**:
- `GET /pos/terminals` - List terminals
- `GET /auth/users?role=cashier` - List operators
- `POST /pos/sessions/start` - Authenticate

**Props**:
- `onLogin(terminalId, operatorId)` - Login callback

**State Management**:
- terminals: array
- operators: array
- selectedTerminal: string
- selectedOperator: string
- isLoading: boolean
- error: string

**Validations**:
- Terminal selected required
- Operator selected required

---

### 3. POSMainMenu.jsx
**Type**: Dashboard/Home Screen  
**Status**: ✅ Complete  
**Lines**: ~480  
**External Dependencies**:
- React (useState, useEffect)
- axios
- lucide-react Icons: Clock, Zap, TrendingUp, Users, CheckCircle, AlertCircle, Menu options

**API Calls**:
- `GET /pos/terminals/{terminalId}/status` - Terminal status
- `GET /pos/terminals/{terminalId}/daily-sales` - Daily summary
- `GET /pos/terminals/{terminalId}/current-shift` - Shift data
- `POST /pos/shifts/{shiftId}/close` - Close shift

**Props**:
- `terminalId: string` - Terminal ID
- `operatorId: string` - Operator ID
- `onNavigate(screen)` - Navigate to screens
- `onLogout()` - Logout handler

**Features**:
- Real-time clock (updates every 1s)
- Auto-refresh every 30s
- 8 Quick-action buttons
- Status monitoring
- Daily statistics

**Auto-Refresh**: 30 seconds

---

### 4. POSSale.jsx
**Type**: Transaction Entry Screen  
**Status**: ✅ Complete  
**Lines**: ~650  
**External Dependencies**:
- React (useState, useEffect, useCallback)
- axios
- useDecimalFormat (custom hook) - Currency formatting
- lucide-react Icons: Search, Plus, Minus, Trash2, DollarSign, CheckCircle, AlertCircle

**API Calls**:
- `GET /inventory/products/search?query={term}&limit=10` - Product search
- `POST /pos/sales/create` - Create transaction

**Props**:
- `terminalId: string` - Terminal ID
- `operatorId: string` - Operator ID
- `onBack()` - Return to menu callback

**Features**:
- Product search (autocomplete)
- Barcode scanner support
- Shopping cart management
- Discount application (0-100%)
- Tax calculation (5% VAT)
- Multiple payment methods
- Payment confirmation
- Receipt generation
- Error handling

**State Management**:
- cartItems: array
- searchTerm: string
- searchResults: array
- selectedCustomer: object
- discountPercent: number
- paymentMode: string
- isProcessing: boolean
- showPaymentModal: boolean

**Calculations**:
- Subtotal = sum of line totals
- Tax = Subtotal × 5%
- Total = Subtotal - Discount + Tax

**Validations**:
- Minimum 1 item required
- Payment method required
- Discount 0-100%

---

### 5. POSReturn.jsx
**Type**: Return/Exchange Screen  
**Status**: ✅ Complete  
**Lines**: ~450  
**External Dependencies**:
- React (useState, useEffect)
- axios
- useDecimalFormat (custom hook)
- lucide-react Icons: Package, Search, Plus, Minus, Trash2, DollarSign, AlertCircle, CheckCircle, ChevronLeft

**API Calls**:
- `GET /sales/invoices/search?query={value}` - Find original sales
- `GET /inventory/products/search?query={value}` - Search products
- `POST /sales/returns/create` - Process return

**Props**:
- `terminalId: string` - Terminal ID
- `operatorId: string` - Operator ID
- `onBack()` - Return to menu

**Features**:
- Original sale search
- Product search
- Return reason selection
- Quantity management
- Return confirmation
- Variance calculation

**Return Reasons**:
- defective
- customer_request
- wrong_item
- damaged

**State Management**:
- searchTerm: string
- searchResults: array
- returnItems: array
- selectedCustomer: object
- originalSaleId: string
- returnReason: string
- isProcessing: boolean
- showConfirmation: boolean
- message: object

---

### 6. POSPayments.jsx
**Type**: Payment Management Screen  
**Status**: ✅ Complete  
**Lines**: ~500  
**External Dependencies**:
- React (useState, useEffect)
- axios
- useDecimalFormat (custom hook)
- lucide-react Icons: DollarSign, Banknote, CreditCard, Clock, TrendingUp, AlertCircle, CheckCircle, RefreshCw, ChevronLeft

**API Calls**:
- `GET /pos/shifts/current?terminalId={id}` - Current shift
- `GET /pos/shifts/{shiftId}/payments` - Payment breakdown
- `POST /pos/payments/register` - Record payment
- `POST /pos/shifts/{shiftId}/reconcile` - Reconciliation

**Props**:
- `terminalId: string` - Terminal ID
- `operatorId: string` - Operator ID
- `onBack()` - Return to menu

**Features**:
- Current shift display
- Payment method breakdown
- Manual payment entry
- Cash reconciliation
- Variance detection
- Real-time updates
- 30-second refresh interval

**State Management**:
- currentShift: object
- paymentMethods: array
- selectedMethod: string
- manualEntry: string
- isLoading: boolean
- isProcessing: boolean
- message: object
- showReconciliation: boolean

**Payment Methods**:
- cash
- card/credit_card
- cheque
- online

---

### 7. POSInventory.jsx
**Type**: Stock Management Screen  
**Status**: ✅ Complete  
**Lines**: ~450  
**External Dependencies**:
- React (useState, useEffect)
- axios
- useDecimalFormat (custom hook)
- lucide-react Icons: Package, Search, AlertCircle, TrendingDown, CheckCircle, RefreshCw, Zap, ChevronLeft

**API Calls**:
- `GET /inventory/products?terminal={id}&includeStock=true` - Products
- `GET /inventory/categories` - Categories

**Props**:
- `terminalId: string` - Terminal ID
- `onBack()` - Return to menu

**Features**:
- Product catalog display
- Category filtering
- Product search
- Stock status indicators
- Low stock alerts
- Stock detail breakdown
- Real-time sync

**Stock Status Colors**:
- Out of Stock: Red
- Low Stock: Yellow
- Running Low: Orange
- In Stock: Green

**State Management**:
- products: array
- filteredProducts: array
- searchTerm: string
- selectedCategory: string
- categories: array
- isLoading: boolean
- hasLowStock: array
- message: object

---

### 8. POSReports.jsx
**Type**: Analytics & Reporting Screen  
**Status**: ✅ Complete  
**Lines**: ~550  
**External Dependencies**:
- React (useState, useEffect)
- axios
- useDecimalFormat (custom hook)
- lucide-react Icons: BarChart3, Calendar, TrendingUp, Users, ShoppingCart, Eye, AlertCircle, CheckCircle, Download, ChevronLeft

**API Calls**:
- `GET /pos/reports/sales` - Sales summary
- `GET /pos/reports/top-products` - Top products
- `GET /pos/reports/payment-breakdown` - Payment methods
- `GET /pos/reports/customer-metrics` - Customer data
- `GET /pos/reports/hourly-trends` - Hourly trends

**Props**:
- `terminalId: string` - Terminal ID
- `onBack()` - Return to menu

**Features**:
- Date range selection (Today, Week, Month, Custom)
- Sales summary cards
- Top products ranking
- Payment method breakdown
- Hourly sales trends
- CSV export functionality
- Real-time data sync

**Report Cards**:
- Total Sales
- Transaction Count
- Average Transaction
- Unique Customers

**State Management**:
- dateRange: string
- startDate: string
- endDate: string
- reports: object
  - sales
  - topProducts
  - paymentMethods
  - customerMetrics
  - hourlyTrends
- isLoading: boolean
- message: object

**CSV Export**: Includes header, summary, products, payments

---

### 9. POSSettings.jsx
**Type**: Configuration Screen  
**Status**: ✅ Complete  
**Lines**: ~500  
**External Dependencies**:
- React (useState, useEffect)
- axios
- lucide-react Icons: Settings, Save, RefreshCw, AlertCircle, CheckCircle, Printer, Monitor, Lock, Wifi, ChevronLeft

**API Calls**:
- `GET /pos/terminals/{terminalId}/settings` - Get settings
- `PUT /pos/terminals/{terminalId}/settings` - Update settings

**Props**:
- `terminalId: string` - Terminal ID
- `onBack()` - Return to menu

**Features**:
- Terminal information
- Printer configuration
- Peripheral settings
- System settings
- Debug mode toggle
- Format settings
- Change tracking
- Save/Reset functionality

**Settings Sections**:
1. Terminal Information
   - Terminal Name
   - IP Address
   - MAC Address
2. Printer Settings
   - Receipt Width (standard/narrow)
   - Print Quality (high/medium/draft)
3. Peripheral Settings
   - Barcode Scanner
   - Signature Capture
   - Customer Display
4. System Settings
   - Auto-Sync Interval
   - Currency
   - Debug Mode
5. Format Settings
   - Decimal Places (2-4)

**State Management**:
- settings: object
- initialSettings: object
- isLoading: boolean
- isSaving: boolean
- message: object
- changed: boolean

**Validations**:
- Terminal name required
- IP address format
- Sync interval 5-300 seconds
- Save only when changed

---

## File Size Summary

| Component | File Size | Lines | Status |
|-----------|-----------|-------|--------|
| POSShiftStart.jsx | ~10 KB | 300 | ✅ Complete |
| POSSystem.jsx | ~3.5 KB | 100 | ✅ Complete |
| POSLogin.jsx | ~8 KB | 250 | ✅ Complete |
| POSMainMenu.jsx | ~13 KB | 480 | ✅ Complete |
| POSSale.jsx | ~20 KB | 650 | ✅ Complete |
| POSReturn.jsx | ~15 KB | 450 | ✅ Complete |
| POSPayments.jsx | ~17 KB | 500 | ✅ Complete |
| POSInventory.jsx | ~14 KB | 450 | ✅ Complete |
| POSReports.jsx | ~18 KB | 550 | ✅ Complete |
| POSSettings.jsx | ~16 KB | 500 | ✅ Complete |
| **TOTAL** | **~134 KB** | **4,230** | **✅ Complete** |

---

## Common Patterns Used

### API Call Pattern
```javascript
const fetchData = async () => {
  try {
    setIsLoading(true);
    setMessage({ type: '', text: '' });
    
    const response = await axios.get(`${API_URL}/endpoint`, { params });
    setData(response.data.data || []);
  } catch (error) {
    setMessage({ type: 'error', text: 'Error message' });
  } finally {
    setIsLoading(false);
  }
};
```

### Form Submit Pattern
```javascript
const handleSubmit = async () => {
  try {
    setIsProcessing(true);
    const response = await axios.post(`${API_URL}/endpoint`, payload);
    
    if (response.data.success) {
      setMessage({ type: 'success', text: '...' });
      // Reset form
    }
  } catch (error) {
    setMessage({ type: 'error', text: error.response?.data?.message });
  } finally {
    setIsProcessing(false);
  }
};
```

### Auto-Refresh Pattern
```javascript
useEffect(() => {
  fetchData();
  const interval = setInterval(fetchData, 30000); // 30 seconds
  return () => clearInterval(interval);
}, []);
```

### Message Display Pattern
```javascript
{message.text && (
  <div className={`${message.type === 'success' ? 'bg-green...' : 'bg-red...'}`}>
    {message.type === 'success' ? <CheckCircle /> : <AlertCircle />}
    <p>{message.text}</p>
  </div>
)}
```

---

## Shared Dependencies

### External Libraries
- **react**: ^18.0.0 (Hooks, Context)
- **axios**: ^1.0.0 (HTTP Requests)
- **lucide-react**: ^0.400.0 (Icons)
- **tailwindcss**: ^3.0.0 (Styling)

### Custom Hooks
- **useDecimalFormat()**: Currency formatting with country support
  - Used by: POSSale, POSReturn, POSPayments, POSInventory, POSReports
  - Provides: formatCurrency(amount) function

### Context (Referenced)
- **useCompanyContext()**: Company/terminal context
  - Referenced but not strictly required (fallback to manual props)

---

## Integration Checklist

### Setup
- [ ] All components in `d:\NEXIS-ERP\client\src\components\pos\`
- [ ] Import POSSystem in main App.jsx
- [ ] Configure VITE_API_URL environment variable
- [ ] Verify useDecimalFormat hook exists
- [ ] Tailwind CSS configured for project

### Testing
- [ ] POSSystem renders without errors
- [ ] POSLogin loads terminals and operators
- [ ] Navigation between screens works
- [ ] localStorage persistence works
- [ ] API calls match backend endpoints
- [ ] Error messages display correctly
- [ ] Loading states show during API calls
- [ ] Form validations work
- [ ] Calculations are accurate

### Deployment
- [ ] Backend API endpoints implemented
- [ ] Database models created
- [ ] Error handling in place
- [ ] Authentication working
- [ ] All API responses match specs
- [ ] Hardware integration tested
- [ ] User training completed
- [ ] Go-live checklist verified

---

## Maintenance Notes

### Regular Updates
- Check API response formats quarterly
- Update icon versions when lucide-react updates
- Monitor localStorage usage
- Track error logs for patterns
- Update documentation with changes

### Known Limitations
- No offline mode (requires internet)
- Barcode scanner integration pending
- Receipt printer integration pending
- No multi-language support (uses company settings language)
- No voice commands
- No touch optimization for tablets

### Future Enhancements
- Offline transaction queue
- Mobile app version
- Hardware integration APIs
- Advanced inventory forecasting
- Loyalty program integration
- Dynamic discount tiers
- Multi-facility support
- Receipt template customization

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2024-03-05 | Initial release: All 9 components complete, full documentation |

---

## Support Resources

1. **Full Documentation**: POS_SYSTEM_IMPLEMENTATION_GUIDE.md
2. **Quick Reference**: POS_SYSTEM_QUICK_REFERENCE.md
3. **API Specification**: POS_API_SPECIFICATION.md
4. **Component Code**: Each component has detailed JSDoc comments
5. **Error Messages**: All errors have descriptive, actionable text

---

**Last Updated**: March 5, 2026  
**Maintainer**: NEXIS-ERP Development Team  
**Status**: Production Ready (Frontend Only - Awaiting Backend)
