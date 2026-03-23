# STOCK RECONCILIATION GUIDE

## Overview

The Stock Reconciliation Service recalculates running balances **from scratch** to verify data accuracy and identify discrepancies.

**Key Features:**
- ✅ Recalculates all movements chronologically
- ✅ Compares with current stock data
- ✅ Identifies discrepancies automatically
- ✅ Generates detailed reports
- ✅ Auto-heal option to fix issues
- ✅ Export to JSON/CSV formats

---

## Quick Start

### 1. **Basic Reconciliation (Check Only)**

```bash
cd server
node scripts/reconciliation-script.js
```

**Output:**
```
📊 STOCK RECONCILIATION STARTED
   Found 1,247 products to reconcile
   
📦 Product-A001
   Movements: 45
   Current: 500
   Calculated: 500
   ✅ Match
   
📦 Product-B002
   Movements: 32
   Current: 750
   Calculated: 800
   ⚠️ DISCREPANCY: -50 (-6.67%)
   
✅ RECONCILIATION COMPLETE
   Reconciled: 1,247
   Discrepancies found: 23
   Errors: 0
   Total variance: -1,250
```

### 2. **Reconciliation with Auto-Heal**

Edit `reconciliation-script.js` line at bottom:
```javascript
// Change from:
reconcileAllProducts().then(() => {

// To:
reconcileAndHealAll().then(() => {
```

Then run:
```bash
node scripts/reconciliation-script.js
```

**⚠️ WARNING:** This will automatically fix discrepancies. Test on dev first!

### 3. **Check Specific Products**

```javascript
// In Node REPL or script:
import StockReconciliationService from "./modules/accounting/services/StockReconciliationService.js";

const productIds = [
  "69beef0d228dfd0cc59b9fcc",
  "69beee6a4083203fc968ae78"
];

const result = await StockReconciliationService.reconcileAllStock({
  products: productIds,
  autoHeal: false,
  verbose: true
});
```

### 4. **Quick Discrepancy Check (Top 10)**

```bash
# Edit line in reconciliation-script.js to call:
quickCheck().then(() => {
```

---

## Understanding the Report

### Summary Section
```json
{
  "summary": {
    "totalProducts": 1247,          // Total products checked
    "reconciled": 1247,             // Successfully reconciled
    "discrepancies": 23,            // Products with variance
    "discrepancyRate": "1.84%",     // Percentage with issues
    "healed": 0,                    // Auto-healed count
    "errors": 0                     // Reconciliation failures
  }
}
```

### Financial Impact
```json
{
  "financialImpact": {
    "totalCurrentStock": 50000,      // Sum of all current quantities
    "totalCalculatedBalance": 51250, // Sum of recalculated quantities
    "totalVariance": -1250,          // Difference
    "variance_percent": "-2.39%"     // Percentage variance
  }
}
```

### Discrepancies Section
```json
{
  "discrepancies": [
    {
      "product": "Product-A001",
      "current": 500,
      "calculated": 550,
      "variance": -50,              // Negative = shortage
      "variance_percent": "-9.09%",
      "status": "DISCREPANCY"
    },
    {
      "product": "Product-B002",
      "current": 750,
      "calculated": 700,
      "variance": +50,              // Positive = overage
      "variance_percent": "+7.14%",
      "status": "HEALED"            // Was fixed by auto-heal
    }
  ]
}
```

---

## What Gets Compared

| Field | Current Stock | Recalculated | Used in Check |
|-------|---------------|--------------|---------------|
| `totalQuantity` | ✅ Compared | ✅ Calculated | ✅ YES - Main check |
| `availableQuantity` | ✅ Stored | ❌ Not recalculated | ❌ NO - Informational only |
| `grnReceivedQuantity` | ✅ Stored | ❌ Not recalculated | ❌ NO - Informational only |

**Note:** `totalQuantity` is the key metric for reconciliation. If it matches calculated balance, reconciliation passes.

---

## Recalculation Algorithm

For each product:

```javascript
// 1. Get all movements sorted by date
movements = await StockMovement.find({ productId })
  .sort({ documentDate: 1, createdAt: 1 })

// 2. Recalculate balance from scratch
calculatedBalance = 0;
movements.forEach(movement => {
  calculatedBalance += movement.quantity;  // Running total
});

// 3. Compare with current stock
currentTotal = CurrentStock.findOne({ productId }).totalQuantity;

// 4. Find discrepancy
variance = currentTotal - calculatedBalance;
hasDiscrepancy = variance !== 0;
```

**Key Points:**
- ✅ Sorts by `documentDate` (transaction date) first
- ✅ Then by `createdAt` (creation time) as tiebreaker
- ✅ Accumulates quantity for running total
- ✅ Handles INBOUND (+), OUTBOUND (-), ADJUSTMENT (±)

---

## Identifying Root Causes

| Discrepancy | Likely Cause | How to Fix |
|-------------|--------------|-----------|
| `-` (shortage) | Inventory theft, Lost items | Physical count & adjust |
| `+` (overage) | Unrecorded purchases, Data entry error | Trace to GRN/transaction |
| Large `%` variance | Major data corruption | Audit historical movements |

### Example: Product has -50 units shortage
```bash
# 1. Check recent movements
db.StockMovement.find({ productId: "..." }).sort({ documentDate: -1 }).limit(10)

# 2. Find related transactions
db.GRN.find({ products: { $in: ["..."] } }).sort({ createdAt: -1 })

# 3. Trace to source document
# Look for incorrect quantities, missing records, or deletion errors

# 4. Create adjustment movement if needed
# Document the discrepancy in the adjustment notes
```

---

## Healing Data

### Automatic Healing (Recommended First Time)

```javascript
const result = await StockReconciliationService.reconcileAllStock({
  autoHeal: true,      // ⚠️ This fixes all discrepancies
  verbose: true
});

// Result shows:
// ✅ Healed: 23
// - Recalculated all 23 discrepant products
// - Updated CurrentStock with correct balances
// - Created audit logs for all changes
```

### Manual Healing (Single Product)

```bash
# In Node REPL:

import UniversalStockRecalculationService from 
  "./modules/accounting/services/UniversalStockRecalculationService.js";

const productId = "69beef0d228dfd0cc59b9fcc";
const userId = "user-id-here";

const result = await UniversalStockRecalculationService.recalculateFullProduct(
  productId,
  userId
);

console.log(result);
// {
//   success: true,
//   totalMovements: 45,
//   updated: 8,           // Balance fields updated
//   finalBalance: 500,
//   errors: []
// }
```

### Batch Healing (Multiple Products)

```javascript
const productIds = ["id1", "id2", "id3"];

for (const productId of productIds) {
  try {
    await UniversalStockRecalculationService.recalculateFullProduct(
      productId,
      userId
    );
    console.log(`✅ ${productId} healed`);
  } catch (err) {
    console.log(`❌ ${productId}: ${err.message}`);
  }
}
```

---

## Exporting Reports

### 1. **JSON Format** (Full detail)

```javascript
const report = StockReconciliationService.generateReport(reconciliationData);
const json = StockReconciliationService.exportReport(report, 'json');

// Save to file
fs.writeFileSync('reconciliation-report.json', json);
```

### 2. **CSV Format** (Excel-friendly)

```javascript
const csv = StockReconciliationService.exportReport(report, 'csv');

// Output:
// Product,Current Stock,Calculated,Variance,Variance %,Status
// Product-A001,500,550,-50,-9.09,DISCREPANCY
// Product-B002,750,700,50,7.14,HEALED
```

### 3. **Custom Report**

```javascript
const report = StockReconciliationService.generateReport(reconciliationData);

console.log("Discrepancy Summary:");
console.log(`Total: ${report.summary.discrepancies}`);
console.log(`Rate: ${report.summary.discrepancyRate}`);
console.log(`Financial Impact: ${report.financialImpact.totalVariance}`);

console.log("\nTop 5 Worst Discrepancies:");
report.discrepancies
  .sort((a, b) => Math.abs(b.variance) - Math.abs(a.variance))
  .slice(0, 5)
  .forEach(item => {
    console.log(`  ${item.product}: ${item.variance} units`);
  });
```

---

## Best Practices

### ✅ DO:
- Run reconciliation weekly/monthly during low-traffic periods
- Test on dev environment first before healing
- Export reports before making changes
- Document all significant discrepancies
- Review healed discrepancies in ActivityLog

### ❌ DON'T:
- Run during peak business hours (impacts performance)
- Heal without reviewing discrepancies first
- Delete movements to "fix" discrepancies (trace root cause)
- Assume all discrepancies are errors (might be system design differences)

---

## Troubleshooting

### Issue: "No movements found for product"
```
This is normal for newly created products with no transactions.
Reconciliation will show 0 movements and 0 balance - this is correct.
```

### Issue: "Calculated balance is negative"
```
This indicates outbound movements without prior inbound movements.
Trace the first movement - it might be:
- Return/adjustment with no initial purchase
- Data entry error
- System initialization issue

Fix: Create appropriate inbound adjustment if legitimate.
```

### Issue: "Healing failed: User not found"
```
Solution: Provide valid userId for healing operations:

const userId = await User.findOne({ email: "admin@company.com" })._id;
await UniversalStockRecalculationService.recalculateFullProduct(
  productId,
  userId
);
```

### Issue: "Script timeout with large dataset"
```
For 100k+ products, use batch processing:

const batchSize = 100;
for (let i = 0; i < allProducts.length; i += batchSize) {
  const batch = allProducts.slice(i, i + batchSize);
  await StockReconciliationService.reconcileAllStock({
    products: batch,
    autoHeal: false
  });
  console.log(`Processed batch ${i/100}`);
}
```

---

## Performance Notes

| Scenario | Time | CPU | Memory |
|----------|------|-----|--------|
| 100 products | 2-3s | Low | 50MB |
| 1,000 products | 20-30s | Medium | 150MB |
| 10,000+ products | 3-5 mins | High | 500MB+ |

**Tip:** Reconcile during off-peak hours for best performance.

---

## API Reference

### StockReconciliationService.reconcileAllStock(options)

```javascript
/**
 * @param {Object} options
 *   @param {Array} products - ProductIds to reconcile (empty = all)
 *   @param {Boolean} autoHeal - Automatically fix discrepancies
 *   @param {Boolean} verbose - Detailed logging
 * 
 * @returns {Promise<Object>}
 *   {
 *     timestamp: Date,
 *     totalProducts: number,
 *     reconciled: number,
 *     discrepancies: number,
 *     healed: number,
 *     errors: number,
 *     details: Array,
 *     summary: { totalVariance, ... }
 *   }
 */
```

### StockReconciliationService.reconcileProduct(productId, autoHeal, verbose)

```javascript
/**
 * Reconcile single product
 * 
 * @returns {Promise<Object>}
 *   {
 *     productId: string,
 *     itemcode: string,
 *     totalMovements: number,
 *     currentStock: { totalQuantity, ... },
 *     calculatedBalance: number,
 *     hasDiscrepancy: boolean,
 *     variance: number,
 *     healed: boolean
 *   }
 */
```

### StockReconciliationService.generateReport(reconciliationData)

```javascript
/**
 * Format reconciliation data for reporting
 * 
 * @returns {Object} - Human-readable report with summary and discrepancies
 */
```

### StockReconciliationService.exportReport(report, format)

```javascript
/**
 * Export report to format
 * 
 * @param {string} format - 'json' or 'csv'
 * @returns {string} - Formatted data
 */
```

---

## Related Services

- **UniversalStockRecalculationService** - Core recalculation engine
  - `recalculateFromTransaction()` - One transaction changed
  - `recalculateBatch()` - Multiple products changed
  - `recalculateFullProduct()` - Complete product recalc

- **GRNStockUpdateService** - GRN posting
- **SalesInvoiceService** - Sales deduction (future integration)
- **SalesReturnService** - Return inbound (future integration)

---

## Next Steps

1. **Run your first reconciliation** (check only, no healing)
2. **Review the report** and identify discrepancies
3. **Trace root causes** of any significant variances
4. **Heal if appropriate** using auto-heal or manual method
5. **Export and archive** reports for compliance
6. **Schedule regular runs** (monthly recommended)

---

**Created:** 2026-03-22  
**Last Updated:** 2026-03-22  
**Version:** 1.0
