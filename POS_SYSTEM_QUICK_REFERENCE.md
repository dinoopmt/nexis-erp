# NEXIS-ERP POS System - Quick Reference

## What's Been Created

### Frontend Components (Complete)

| Component | File | Purpose | Status |
|-----------|------|---------|--------|
| POSShiftStart | POSShiftStart.jsx | Day start - opening balance | ✅ Complete |
| POSSystem | POSSystem.jsx | Main router & container | ✅ Complete |
| POSLogin | POSLogin.jsx | Terminal & operator selection | ✅ Complete |
| POSMainMenu | POSMainMenu.jsx | Dashboard & navigation | ✅ Complete |
| POSSale | POSSale.jsx | Transaction entry | ✅ Complete |
| POSReturn | POSReturn.jsx | Return management | ✅ Complete |
| POSPayments | POSPayments.jsx | Payment tracking & reconciliation | ✅ Complete |
| POSInventory | POSInventory.jsx | Stock management | ✅ Complete |
| POSReports | POSReports.jsx | Sales analytics | ✅ Complete |
| POSSettings | POSSettings.jsx | Terminal configuration | ✅ Complete |

**Location**: `d:\NEXIS-ERP\client\src\components\pos\`

### Documentation

| Document | Location | Purpose |
|----------|----------|---------|
| POS System Implementation Guide | `d:\NEXIS-ERP\POS_SYSTEM_IMPLEMENTATION_GUIDE.md` | Complete architecture & API specs |
| This Quick Reference | `d:\NEXIS-ERP\POS_SYSTEM_QUICK_REFERENCE.md` | Developer quick guide |

---

## How to Use the POS System

### 1. Import in Your App
```jsx
import POSSystem from './components/pos/POSSystem';

function App() {
  return (
    <div>
      <POSSystem />
    </div>
  );
}
```

### 2. Typical User Workflow
```
POSLogin (Select Terminal & Operator)
    ↓
POSShiftStart (Enter Opening Balance) ← NEW!
    ↓
POSMainMenu (Dashboard & Navigation)
    ├── New Sale → POSSale
    ├── Returns → POSReturn
    ├── Payments → POSPayments (includes close shift)
    ├── Inventory → POSInventory
    ├── Reports → POSReports
    └── Settings → POSSettings
    ↓
Logout (Closes Shift)
```

---

## Quick Features Overview

### POSSale (Transaction Entry)
**What it does**: Create sales transactions
**Key Features**:
- Product search (type 2+ characters)
- Barcode scanner support
- Shopping cart with qty controls
- Line-item level discounts
- Tax calculation (5% VAT)
- Multiple payment methods
- Receipt printing

**Input**: Product name/SKU/barcode
**Output**: Transaction saved to DB, receipt printed

### POSReturn (Returns)
**What it does**: Process product returns
**Key Features**:
- Search original invoice
- Select items to return
- Return reason selection
- Quantity adjustment
- Auto-refund calculation

**Input**: Original invoice + return items
**Output**: Return processed, inventory updated

### POSPayments (Cash & Reconciliation)
**What it does**: Track payments and reconcile cash
**Key Features**:
- Payment method breakdown
- Manual payment entry
- Cash reconciliation workflow
- Variance detection
- Shift open/close

**Input**: Cash counted, payment records
**Output**: Reconciliation report, shift closed

### POSInventory (Stock View)
**What it does**: Display available inventory
**Key Features**:
- Real-time stock levels
- Low stock alerts
- Stock status colors
- Category filtering
- Reserved/in-transit tracking

**Input**: Filter by category/search
**Output**: Stock information, order alerts

### POSReports (Analytics)
**What it does**: Generate sales reports
**Key Features**:
- Date range selection
- Sales summary cards
- Top products ranking
- Payment breakdown
- Hourly trends
- CSV export

**Input**: Date range
**Output**: Reports & export file

### POSSettings (Configuration)
**What it does**: Configure terminal
**Key Features**:
- Terminal naming
- Printer settings
- Barcode scanner enable/disable
- Currency selection
- Auto-sync interval
- Debug mode

**Input**: Settings changes
**Output**: Settings saved to DB

---

## Data Flow

### Sale Transaction
```
Product Search
    ↓
Add to Cart
    ↓
Apply Discount
    ↓
Calculate Tax
    ↓
Select Payment Method
    ↓
Confirm & Create
    ↓
POST /pos/sales/create
    ↓
GL Auto-Post (optional)
    ↓
Inventory Deduction
    ↓
Receipt Print
```

### Shift Management
```
Login
    ↓
Shift Opens & Data Loads
    ↓
[Multiple Transactions]
    ↓
End of Day
    ↓
Cash Count
    ↓
POST /pos/shifts/{id}/reconcile
    ↓
Variance Check
    ↓
Shift Close
    ↓
Logout
```

---

## Required Backend Endpoints

### Must-Have (Phase 1)
- `GET /pos/terminals` - List terminals
- `GET /auth/users?role=cashier` - Get operators
- `POST /pos/sessions/start` - Login
- `GET /inventory/products/search` - Product search
- `POST /pos/sales/create` - Save transaction
- `GET /pos/shifts/current` - Current shift
- `POST /pos/shifts/{id}/close` - Close shift

### Nice-to-Have (Phase 2)
- `POST /pos/payments/register` - Record payment
- `GET /pos/reports/*` - Analytics
- `POST /pos/shifts/{id}/reconcile` - Reconciliation
- `GET /pos/terminals/{id}/status` - Real-time status

---

## Testing Checklist

### Component Rendering
- [ ] POSSystem loads without errors
- [ ] POSLogin displays terminals & operators
- [ ] All screens navigate back to menu
- [ ] Login persists to localStorage

### POSSale
- [ ] Product search works (try "test")
- [ ] Adding product to cart works
- [ ] Quantity ± buttons work
- [ ] Discount calculation correct
- [ ] Tax calculation correct (5% of subtotal)
- [ ] Payment modal appears
- [ ] API call success/failure handled

### POSReturn
- [ ] Can search original invoices
- [ ] Can select items to return
- [ ] Qty adjustment works
- [ ] Totals calculate correctly
- [ ] Return reason required

### POSPayments
- [ ] Shows current shift info
- [ ] Payment breakdown displays
- [ ] Manual entry works
- [ ] Reconciliation modal appears
- [ ] Variance calculated correctly

### POSInventory
- [ ] Products load with correct stock
- [ ] Category filter works
- [ ] Search filters products
- [ ] Stock status colors correct
- [ ] Low stock alerts show

### POSReports
- [ ] Date range selection works
- [ ] Summary cards populate
- [ ] Top products list shows
- [ ] Export button works
- [ ] CSV has correct data

### POSSettings
- [ ] Settings load from API
- [ ] Changes tracked (changed flag)
- [ ] Save button works
- [ ] Reset clears changes
- [ ] All input types work

---

## Common Issues & Fixes

### Issue: "Cannot find module POSComponentName"
**Fix**: Make sure all imports in POSSystem.jsx match actual file names
```jsx
import POSSale from './POSSale'; // Must match filename exactly
```

### Issue: API calls return 404
**Fix**: Check that API_URL is correct
```javascript
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
```

### Issue: Session not persisting
**Fix**: Check localStorage is enabled
```javascript
localStorage.getItem('pos_terminal_id')
localStorage.setItem('pos_terminal_id', terminalId)
```

### Issue: Calculations incorrect
**Fix**: Verify number parsing
```javascript
parseFloat(manualEntry) // Ensure string converts to number
```

### Issue: Search not debounced
**Fix**: Add debouncing to prevent excessive API calls
```javascript
const handleSearch = async (value) => {
  // Add 300ms delay before API call
};
```

---

## Code Examples

### Creating a Sale (Backend needed)
```javascript
// Frontend (POSSale.jsx)
const handleCheckout = async () => {
  const response = await axios.post(`${API_URL}/pos/sales/create`, {
    terminalId,
    operatorId,
    items: cartItems.map(item => ({
      productId: item._id,
      quantity: item.quantity,
      price: item.price
    })),
    subtotal: totals.subtotal,
    taxAmount: totals.taxAmount,
    total: totals.total,
    paymentMethod
  });
};

// Backend (needed)
router.post('/create', async (req, res) => {
  // Validate items exist
  // Calculate totals
  // Create POSSale document
  // Deduct inventory
  // Create GL entries
  // Return success
});
```

### Search Products
```javascript
// Frontend
const handleSearch = async (value) => {
  if (value.length < 2) return;
  const res = await axios.get(
    `${API_URL}/inventory/products/search?query=${value}&limit=10`
  );
  setSearchResults(res.data.data);
};

// Backend (should already exist)
// GET /inventory/products/search
// Returns: [{ _id, name, sku, price, stock.available }]
```

---

## Environment Setup

### Required .env Variables (Frontend)
```env
VITE_API_URL=http://localhost:5000/api
```

### Package Dependencies (Already have)
- react
- axios
- lucide-react
- tailwind

---

## Next Development Tasks

### Priority 1 (Critical)
1. Create POS routes file
2. Create POS controllers
3. Create POSSale model
4. Implement `/pos/sales/create` endpoint
5. Test transaction creation

### Priority 2 (Important)
1. Create POSShift model
2. Implement shift open/close
3. Add cash reconciliation
4. Implement `/pos/shifts` endpoints

### Priority 3 (Nice-to-Have)
1. Receipt printing integration
2. Barcode scanner driver
3. Offline mode
4. Multi-user sync
5. Advanced reports

---

## File Structure Summary

```
d:\NEXIS-ERP\
├── client\src\
│   ├── components\pos\
│   │   ├── POSSystem.jsx         ← Start here
│   │   ├── POSLogin.jsx
│   │   ├── POSMainMenu.jsx
│   │   ├── POSSale.jsx
│   │   ├── POSReturn.jsx
│   │   ├── POSPayments.jsx
│   │   ├── POSInventory.jsx
│   │   ├── POSReports.jsx
│   │   └── POSSettings.jsx
│   ├── hooks\
│   │   └── useDecimalFormat.js   ← Used for currency
│   └── services\
│       └── NumberToWordsService.js
├── server\
│   ├── modules\
│   │   ├── pos\                  ← Create this
│   │   │   ├── routes\
│   │   │   ├── controllers\
│   │   │   └── services\
│   │   └── ...other modules
│   ├── Models\                   ← Add POSSale, POSShift, POSTerminal
│   └── server.js
├── POS_SYSTEM_IMPLEMENTATION_GUIDE.md
└── POS_SYSTEM_QUICK_REFERENCE.md  ← You are here
```

---

## Support Resources

- **Full Documentation**: Read POS_SYSTEM_IMPLEMENTATION_GUIDE.md
- **Component Code**: Each file has detailed JSDoc comments
- **API Spec**: See API Endpoint Structure in guide
- **Data Models**: See Data Models Required in guide

---

**Quick Start**: Import POSSystem in your main App.jsx, set VITE_API_URL, and test login screen.

**Questions?** Check the JSDoc comments in each component file or the full implementation guide.
