# 🚀 DEPLOYMENT & INTEGRATION GUIDE

## PHASE 1: DEPLOY THE CODE

### Step 1: Copy Files to Server
```powershell
# From your workspace, copy these files:

1. UniversalStockRecalculationService.js
   → D:\NEXIS-ERP\server\modules\accounting\services\

2. SimpleGRNEditManager.js (ALREADY UPDATED)
   → Already in place

3. GRNStockUpdateService.js (ALREADY UPDATED)
   → Already in place
```

### Step 2: Verify Installation
```bash
# Check the file exists
ls server/modules/accounting/services/Universal*

# Should see: UniversalStockRecalculationService.js
```

### Step 3: Restart Server
```bash
# Stop running server (Ctrl+C in terminal)
# Then restart:
npm run dev
# or
npm start
```

### Step 4: Verify Deployment
```bash
# Check for no errors in console
# Look for: "Server running on port 5000"
# No import errors should appear
```

✅ **DEPLOYMENT COMPLETE** - GRN edits now use universal recalculation!

---

## PHASE 2: INTEGRATE SALES/RTV (IN PROGRESS)

### Step 1: Update SalesInvoiceService.js

**Location**: `server/modules/sales/services/SalesInvoiceService.js`

**Add import at top**:
```javascript
import UniversalStockRecalculationService from "../../accounting/services/UniversalStockRecalculationService.js";
```

**Find where sales are created** (look for `createSalesInvoice()` or similar):
```javascript
// After creating the sale invoice record:
// Trigger stock deduction and recalculation

const qtyDeducted = lineItem.quantity;
await UniversalStockRecalculationService.recalculateFromTransaction(
  productId,
  saleInvoice._id,
  0,  // oldQty (no previous sale)
  -qtyDeducted,  // newQty (negative = deduction)
  userId,
  `SALES_INVOICE: ${invoiceNumber}`
);
```

### Step 2: Update SalesReturnService.js

**Location**: `server/modules/sales/services/SalesReturnService.js`

**Add import at top**:
```javascript
import UniversalStockRecalculationService from "../../accounting/services/UniversalStockRecalculationService.js";
```

**In `processReturnStock()` method**:
```javascript
// After processing the return:
const qtyReturned = returnItem.quantity;
const oldQty = -(originalSaleQty);  // Previous sale deduction
const newQty = -(originalSaleQty - qtyReturned);  // New deduction

await UniversalStockRecalculationService.recalculateFromTransaction(
  productId,
  salesReturn._id,
  oldQty,
  newQty,
  userId,
  `SALES_RETURN: ${returnNumber}`
);
```

**Status**: ⏳ TODO (Need to implement after Phase 1)

---

## PHASE 3: RUN TESTS

### Option A: Manual Testing (Quick)

**Test Scenario 1: Simple GRN Edit**
```
1. Create GRN: 100 units
2. Create Sale: 30 units (balance = 70)
3. Edit GRN: 100 → 80 units
4. Verify: Sale balance = 50 (80-30) ✅
```

**Test Scenario 2: Multiple Edits**
```
1. Create GRN: 100 units
2. Edit: 100 → 90 → 80 → 75
3. Create Sales: 20, 15, 10 units
4. Verify balances cascade correctly ✅
```

**Test Scenario 3: Late-Dated GRN**
```
1. Create Sale dated Today: 100 units
2. Create GRN dated Yesterday: 150 units
3. Run: recalculateFullProduct()
4. Verify: Balances calculated by date order ✅
```

### Option B: Jest Automated Tests

**Create file**: `server/tests/universal-stock-recalculation.test.js`

```javascript
import UniversalStockRecalculationService from 
  "../modules/accounting/services/UniversalStockRecalculationService.js";
import StockMovement from "../Models/StockMovement.js";
import CurrentStock from "../Models/CurrentStock.js";
import mongoose from "mongoose";

describe("UniversalStockRecalculation", () => {
  
  beforeAll(async () => {
    // Connect to test MongoDB
    // Use separate test DB
  });

  afterAll(async () => {
    // Disconnect & cleanup
  });

  test("Should recalculate after quantity change", async () => {
    // Create test product & movements
    // Change one movement qty
    // Call recalculate
    // Verify all later movements updated
    // Assert: final balance correct
  });

  test("Should handle multiple edits", async () => {
    // Multiple sequential edits
    // Each should cascade correctly
  });

  test("Should create audit log", async () => {
    // Verify ActivityLog created
    // Check all details recorded
  });
});
```

**Run tests**:
```bash
npm install jest --save-dev
npm test
```

---

## PHASE 4: DATA HEALING

### Create Healing Script

**File**: `server/scripts/heal-stock-balances.js`

```javascript
import UniversalStockRecalculationService from 
  "../modules/accounting/services/UniversalStockRecalculationService.js";
import AddProduct from "../Models/AddProduct.js";
import mongoose from "mongoose";

async function healAllProductStocks() {
  try {
    console.log("🔄 Starting stock balance healing...\n");
    
    // Get all products
    const products = await AddProduct.find({}).select("_id itemcode");
    console.log(`📊 Found ${products.length} products to heal\n`);
    
    let successful = 0;
    let failed = 0;
    
    for (const product of products) {
      try {
        console.log(`Processing: ${product.itemcode}`);
        
        const result = await UniversalStockRecalculationService.recalculateFullProduct(
          product._id,
          "SYSTEM_HEAL"  // System user
        );
        
        if (result.success) {
          console.log(`  ✅ ${result.updated} movements recalculated, final balance: ${result.finalBalance}\n`);
          successful++;
        } else {
          console.log(`  ❌ Failed: ${result.errors?.[0]?.error || "Unknown error"}\n`);
          failed++;
        }
        
      } catch (err) {
        console.error(`  ❌ Error processing ${product.itemcode}:`, err.message);
        failed++;
      }
    }
    
    console.log(`\n✅ HEALING COMPLETE`);
    console.log(`✅ Successful: ${successful}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📊 Total: ${successful + failed}`);
    
    process.exit(0);
    
  } catch (error) {
    console.error("❌ Healing error:", error);
    process.exit(1);
  }
}

// Connect to MongoDB & run
mongoose.connect(process.env.MONGO_URI)
  .then(() => healAllProductStocks())
  .catch(err => {
    console.error("Connection error:", err);
    process.exit(1);
  });
```

**Run healing**:
```bash
node server/scripts/heal-stock-balances.js
```

**Output**: Will show progress for each product

---

## 📋 COMPLETE DEPLOYMENT CHECKLIST

### Phase 1: Deploy ✅
- [ ] Copy UniversalStockRecalculationService.js
- [ ] Verify no import errors
- [ ] Restart server
- [ ] Test GRN edit - verify recalculation works
- [ ] Check ActivityLog for recalculation events

### Phase 2: Sales Integration ⏳
- [ ] Add import to SalesInvoiceService.js
- [ ] Add recalculation trigger to create/edit methods
- [ ] Add import to SalesReturnService.js
- [ ] Add recalculation trigger to process return methods
- [ ] Test sales stock deduction
- [ ] Test sales returns

### Phase 3: Tests ⏳
- [ ] Run manual test scenarios (quick)
- [ ] Create Jest test file
- [ ] Install Jest
- [ ] Run automated tests
- [ ] All tests pass ✅

### Phase 4: Data Healing ⏳
- [ ] Create healing script
- [ ] Test on one product first
- [ ] Run full healing
- [ ] Verify all balances correct
- [ ] Document healing results

---

## 🎯 Priority Order

### IMMEDIATE (RIGHT NOW)
1. ✅ Deploy Phase 1
2. ⏳ Manual test Phase 3

### SOON (THIS WEEK)
3. ⏳ Sales integration Phase 2
4. ⏳ Jest tests Phase 3

### LATER (NEXT WEEK)
5. ⏳ Data healing Phase 4
6. ⏳ Production deployment

---

## 🚀 Quick Command Reference

```bash
# Deploy
npm run dev

# Test one scenario
# Edit GRN in UI and verify stock updates

# Create healing script
cat > server/scripts/heal-stock-balances.js << 'EOF'
[paste script from Phase 4]
EOF

# Run healing
node server/scripts/heal-stock-balances.js

# Run Jest tests (after npm install jest)
npm test
```

---

## ✨ Next Action

Which phase would you like to do FIRST?

1. **Deploy Now** - I can give you exact terminal commands
2. **Sales Integration** - I can write the exact code to add
3. **Create Tests** - I can set up Jest and test scenarios
4. **Data Healing** - I can create the healing script

Pick one, and I'll give you step-by-step instructions! 🎯
