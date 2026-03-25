# Sales Invoice Refactoring - Complete Architecture

## 📊 Overview

The 2822-line `SalesInvoice.jsx` has been separated into modular, testable, maintainable layers:

```
SalesInvoice.jsx (150 lines - Main Container)
    ├── State Management
    │   └── useSalesInvoiceState Hook (reducer + actions)
    │
    ├── Business Logic Services
    │   ├── SalesInvoiceCalculationService
    │   ├── SalesInvoiceValidationService
    │   └── SalesInvoiceService
    │
    ├── Handler Hooks
    │   └── useSalesInvoiceHandlers
    │
    └── UI Components
        ├── SalesInvoiceHeader
        ├── SalesInvoiceItemsTable
        ├── SalesInvoiceSummary
        ├── SalesInvoiceModals
        └── SalesInvoiceSearch
```

---

## 🎯 Layer Details

### 1. State Management: `useSalesInvoiceState.js` (in hooks/)

**Purpose:** Central state management using reducer pattern

**Features:**
- Single source of truth for all invoice data
- 25+ action types (ADD_ITEM, UPDATE_ITEM, SET_CUSTOMER, etc.)
- Convenience methods for all common actions
- Pure reducer function (testable, predictable)

**Usage:**
```javascript
const { state, dispatch, addItem, removeItem, setDiscount, ... } = useSalesInvoiceState("001");

// Use state for reading
console.log(state.invoiceData.items);
console.log(state.selectedCustomerDetails);

// Use actions for updates
addItem({ id: 1, itemName: "Product A", qty: 5, ... });
setDiscount(10);
removeItem(1);
```

**Benefits:**
- ✅ No scattered useState hooks
- ✅ Predictable state updates
- ✅ Easy to debug with Redux DevTools
- ✅ Testable reducer functions
- ✅ Type-safe action dispatching

---

### 2. Calculation Service: `SalesInvoiceCalculationService.js` (in services/)

**Purpose:** All mathematical calculations isolated and tested

**Methods:**
- `calculateTotals()` - Subtotals, discounts, taxes, grand total
- `calculateProfitMetrics()` - Gross profit, net profit, margins
- `calculateTotalItemQuantity()` - Sum of all item quantities
- `calculateTotalCost()` - Sum of item costs
- `getTaxDetails()` - Country-specific tax rules
- `calculateItemCost()` - Single line item calculations

**Usage:**
```javascript
const totals = SalesInvoiceCalculationService.calculateTotals(
  items,
  invoiceDiscount,
  invoiceDiscountAmount,
  customerTaxRate,
  round,
  formatNumber
);

console.log(totals.subtotal, totals.tax, totals.total);
```

**Benefits:**
- ✅ Pure functions (no side effects)
- ✅ Easy unit testing
- ✅ Reusable in reports/exports
- ✅ No dependency on React/state

---

### 3. Validation Service: `SalesInvoiceValidationService.js` (in services/)

**Purpose:** All validation logic centralized

**Methods:**
- `validateInvoice()` - Complete invoice validation
- `validateItems()` - All items validation
- `validateItem()` - Single item validation
- `validateCustomer()` - Customer validation
- `validateQuantityAgainstStock()` - Stock availability

**Usage:**
```javascript
const validation = SalesInvoiceValidationService.validateInvoice(
  invoiceData,
  items,
  selectedCustomerDetails,
  companyCountry
);

if (!validation.isValid) {
  showToast(validation.error, "error");
  return;
}
```

**Benefits:**
- ✅ Centralized validation rules
- ✅ Same validation on frontend + backend
- ✅ Easy to update business rules
- ✅ Clear error messages

---

### 4. API Service: `SalesInvoiceService.js` (in services/)

**Purpose:** All backend API communication

**Methods:**
- `fetchInvoices()` - Get all invoices
- `getNextInvoiceNumber()` - Get next invoice number
- `createInvoice()` - Create new invoice
- `updateInvoice()` - Update invoice
- `deleteInvoice()` - Delete invoice
- `fetchProductByBarcode()` - Barcode lookup
- `searchProducts()` - Product search
- `fetchCustomers()` - Get all customers
- `fetchInvoiceById()` - Get single invoice
- `printInvoice()` - Generate PDF

**Usage:**
```javascript
try {
  const invoice = await SalesInvoiceService.createInvoice(payload);
  showToast("Invoice saved", "success");
} catch (error) {
  showToast("Error: " + error.message, "error");
}
```

**Benefits:**
- ✅ Easy to mock for tests
- ✅ Single point for API URL changes
- ✅ Consistent error handling
- ✅ Centralized authorization headers

---

### 5. Handlers Hook: `useSalesInvoiceHandlers.js` (in hooks/)

**Purpose:** All event handlers and complex logic

**Methods:**
- `addItem()` - Add item to invoice
- `removeItem()` - Remove item
- `updateItemField()` - Update item property
- `addItemFromSearch()` - Add from search result
- `addItemByBarcode()` - Add via barcode scanner
- `handleSaveInvoice()` - Save invoice to backend
- `handlePrint()` - Print invoice
- `handleSaveAndPrint()` - Save then print
- `resetForm()` - Clear form for new invoice
- `deleteInvoice()` - Delete invoice
- `getCustomerTaxRate()` - Get customer tax

**Usage:**
```javascript
const handlers = useSalesInvoiceHandlers(state, actions, { round, formatNumber, config, taxMaster, showToast });

// Now use handlers
handlers.addItem();
handlers.removeItem(itemId);
const saved = await handlers.handleSaveInvoice(() => {
  console.log("Saved successfully");
});
```

**Benefits:**
- ✅ Separated from UI rendering
- ✅ Reusable in multiple components
- ✅ Easy to test business logic
- ✅ Clean component hierarchy

---

### 6. UI Components (in components/sales/invoice/)

**Structure:**
```
/invoice/
├── SalesInvoiceHeader.jsx      (Header + buttons)
├── SalesInvoiceItemsTable.jsx  (Line items table)
├── SalesInvoiceSummary.jsx     (Totals + tax breakdown)
├── SalesInvoiceSearch.jsx      (Product/item search)
├── SalesInvoiceModals.jsx      (History, notes, serial, etc.)
├── SalesInvoiceCustomerSection.jsx (Customer selection)
└── SalesInvoiceBarcode.jsx     (Barcode scanner input)
```

**Each component:**
- ~200-300 lines max
- Pure presentation logic
- Receives props from parent
- Calls handler functions on user interaction
- No complex calculations

**Example (SalesInvoiceHeader.jsx):**
```javascript
const SalesInvoiceHeader = ({
  invoiceData,
  onHistoryClick,
  onSave,
  customers,
  selectedCustomerDetails,
  onCustomerSelect,
  ...props
}) => {
  return (
    <div className="...">
      <button onClick={onHistoryClick}>History</button>
      <button onClick={onSave}>Save</button>
      {/* Customer dropdown */}
    </div>
  );
};
```

**Benefits:**
- ✅ Small, focused components
- ✅ Easy to maintain and test
- ✅ Reusable across project
- ✅ Props clearly document requirements

---

## 🔄 Data Flow

```
User Action
    ↓
UI Component calls handler function
    ↓
Handler (useSalesInvoiceHandlers hook)
    ├→ Validates data (ValidationService)
    ├→ Calculates metrics (CalculationService)
    └→ Calls API (SalesInvoiceService)
    ↓
API Service makes HTTP request
    ↓
Backend returns result
    ↓
Handler calls state action
    ↓
State updated via reducer (useSalesInvoiceState)
    ↓
Component re-renders with new state
    ↓
User sees result
```

---

## 📈 File Organization

**Frontend Structure:**
```
/client/src/
├── services/
│   ├── SalesInvoiceCalculationService.js    (Pure math)
│   ├── SalesInvoiceValidationService.js     (Validation rules)
│   └── SalesInvoiceService.js               (API calls)
│
├── hooks/
│   ├── useSalesInvoiceState.js              (State + reducer)
│   └── useSalesInvoiceHandlers.js           (Handlers + logic)
│
└── components/sales/
    ├── SalesInvoice.jsx                     (Main container ~150 lines)
    └── invoice/
        ├── SalesInvoiceHeader.jsx           (~150 lines)
        ├── SalesInvoiceItemsTable.jsx       (~250 lines)
        ├── SalesInvoiceSummary.jsx          (~200 lines)
        ├── SalesInvoiceModals.jsx           (~300 lines)
        ├── SalesInvoiceSearch.jsx           (~200 lines)
        ├── SalesInvoiceCustomerSection.jsx  (~150 lines)
        └── SalesInvoiceBarcode.jsx          (~100 lines)
```

**Total lines:**
- Before: 1 file, 2822 lines ❌
- After: 13 files, ~1800 lines ✅ (more readable, testable)

---

## 🧪 Testing Strategy

**Unit Tests:**
```javascript
// SalesInvoiceCalculationService.test.js
describe("SalesInvoiceCalculationService", () => {
  it("should calculate totals correctly", () => {
    const items = [{ qty: 2, rate: 100, itemDiscount: 10 }];
    const result = calculateTotals(items, 0, 0, 5, round, formatNumber);
    expect(result.subtotal).toBe("200");
    expect(result.tax).toBe("9.50");
  });
});

// useSalesInvoiceState.test.js
describe("useSalesInvoiceState", () => {
  it("should add item to invoice", () => {
    const { state, actions } = renderHook(() => useSalesInvoiceState());
    act(() => {
      actions.addItem({ id: 1, itemName: "Test" });
    });
    expect(state.invoiceData.items).toHaveLength(1);
  });
});
```

**Integration Tests:**
```javascript
// SalesInvoice.integration.test.js
describe("Sales Invoice Flow", () => {
  it("should create full invoice with validation", async () => {
    const { getByText, getByRole } = render(<SalesInvoice />);
    // Select customer
    fireEvent.click(getByPlaceholderText("Select Party"));
    // Add item
    fireEvent.click(getByText("Add Item"));
    // Save
    fireEvent.click(getByText("Save"));
    // Verify API called
    expect(mockApi.createInvoice).toHaveBeenCalled();
  });
});
```

---

## 🚀 Migration Guide

### Step 1: Update Main Component (SalesInvoice.jsx)

```javascript
import React, { useState, useEffect } from "react";
import { useSalesInvoiceState } from "./hooks/useSalesInvoiceState";
import { useSalesInvoiceHandlers } from "./hooks/useSalesInvoiceHandlers";
import { useDecimalFormat } from "./hooks/useDecimalFormat";
import { useTaxMaster } from "./hooks/useTaxMaster";
import SalesInvoiceCalculationService from "./services/SalesInvoiceCalculationService";
import SalesInvoiceService from "./services/SalesInvoiceService";

// Sub-components
import SalesInvoiceHeader from "./components/sales/invoice/SalesInvoiceHeader";
import SalesInvoiceItemsTable from "./components/sales/invoice/SalesInvoiceItemsTable";
import SalesInvoiceSummary from "./components/sales/invoice/SalesInvoiceSummary";

const SalesInvoice = () => {
  // State management
  const { state, dispatch, ...actions } = useSalesInvoiceState("001");
  
  // Utilities
  const { round, formatCurrency, formatNumber, config } = useDecimalFormat();
  const { taxMaster } = useTaxMaster();
  
  // Handlers
  const handlers = useSalesInvoiceHandlers(state, actions, {
    round,
    formatNumber,
    config,
    taxMaster,
    showToast: (msg, type) => console.log(msg, type),
  });

  // Fetch data on mount
  useEffect(() => {
    const loadData = async () => {
      const customers = await SalesInvoiceService.fetchCustomers();
      actions.setCustomersList(customers);
    };
    loadData();
  }, []);

  // Calculate totals
  const totals = SalesInvoiceCalculationService.calculateTotals(
    state.invoiceData.items,
    state.invoiceData.discount,
    state.invoiceData.discountAmount,
    handlers.getCustomerTaxRate(),
    round,
    formatNumber
  );

  return (
    <div className="absolute inset-0 flex flex-col bg-gray-100">
      <SalesInvoiceHeader
        invoiceData={state.invoiceData}
        customers={state.customers}
        selectedCustomerDetails={state.selectedCustomerDetails}
        onSave={handlers.handleSaveInvoice}
        onSaveAndPrint={handlers.handleSaveAndPrint}
        onCustomerSelect={actions.setSelectedCustomerDetails}
        loading={state.loading}
        {...handlers}
      />
      
      <SalesInvoiceItemsTable
        items={state.invoiceData.items}
        onAddItem={handlers.addItem}
        onRemoveItem={handlers.removeItem}
        onUpdateItem={handlers.updateItemField}
        onAddFromSearch={handlers.addItemFromSearch}
      />
      
      <SalesInvoiceSummary
        totals={totals}
        onDiscountChange={(val) => actions.setDiscount(val)}
        onDiscountAmountChange={(val) => actions.setDiscountAmount(val)}
      />
    </div>
  );
};

export default SalesInvoice;
```

---

## ✅ Benefits Summary

| Before | After |
|--------|-------|
| 2822 lines | ~1800 lines |
| Mixed concerns | Separated concerns |
| Hard to test | Easy to test |
| State scattered | State centralized |
| Handlers in component | Handlers in hooks |
| API calls mixed in | API service layer |
| Business logic in UI | Business logic in services |
| No reusability | Highly reusable |

---

## 🎓 Key Principles Applied

1. **Separation of Concerns** - Each file has single responsibility
2. **DRY (Don't Repeat Yourself)** - Shared logic in services/hooks
3. **Testability** - Pure functions, mocked dependencies
4. **Scalability** - Easy to add features without huge files
5. **Maintainability** - Clear data flow, easy to understand
6. **Reusability** - Services/hooks work in any component
7. **Type Safety** - Clear props and return types (consider TypeScript)

---

## 🔗 Next Steps

1. ✅ Create services (DONE)
2. ✅ Create state hook (DONE)
3. ✅ Create handlers hook (DONE)
4. ✅ Create sub-components
5. ✅ Update main component
6. ✅ Test all flows
7. ✅ Remove old monolithic component
