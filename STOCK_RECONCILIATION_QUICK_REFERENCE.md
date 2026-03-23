# STOCK RECONCILIATION QUICK REFERENCE

## One-Liner Usage

### Check for discrepancies (no changes)
```bash
cd server && node scripts/reconciliation-script.js
```

### Check and auto-heal all discrepancies
Edit `reconciliation-script.js`, change last call to `reconcileAndHealAll()`, then run above.

---

## Quick Commands

### All Products - Report Only
```javascript
const result = await StockReconciliationService.reconcileAllStock({
  autoHeal: false, verbose: true
});
```

### All Products - With Auto-Heal
```javascript
const result = await StockReconciliationService.reconcileAllStock({
  autoHeal: true, verbose: true
});
```

### Specific Products
```javascript
const result = await StockReconciliationService.reconcileAllStock({
  products: ["id1", "id2"], 
  autoHeal: false
});
```

### Single Product
```javascript
await StockReconciliationService.reconcileProduct("productId", false, true);
```

### Top 10 Discrepancies
```javascript
const data = await StockReconciliationService.reconcileAllStock({ 
  autoHeal: false, verbose: false 
});
const top10 = data.details
  .filter(d => d.hasDiscrepancy)
  .sort((a, b) => Math.abs(b.variance) - Math.abs(a.variance))
  .slice(0, 10);
```

### Export Report
```javascript
const report = StockReconciliationService.generateReport(result);
const json = StockReconciliationService.exportReport(report, 'json');
const csv = StockReconciliationService.exportReport(report, 'csv');
```

---

## Understanding Output

| Message | Meaning | Action |
|---------|---------|--------|
| `✅ Match` | No discrepancy | ✅ OK |
| `⚠️ DISCREPANCY: -50 (-6.67%)` | 50 units shortage | 🔍 Investigate |
| `⚠️ DISCREPANCY: +50 (+7.14%)` | 50 units overage | 🔍 Investigate |
| `✅ Healed successfully` | Auto-healed | ✅ Fixed |
| `⚠️ Heal failed` | Healing error | ❌ Manual intervention needed |

---

## Report Sections

| Section | Contains | Purpose |
|---------|----------|---------|
| **Summary** | Total/Reconciled/Discrepancies/Errors | Overview |
| **Financial Impact** | Total variance in units | Business impact |
| **Discrepancies** | List of all mismatches | Details to review |
| **OK Products** | Count of matching products | Quality metric |
| **Errors** | Failed reconciliations | Troubleshoot |

---

## Common Scenarios

### Scenario 1: Weekly Health Check
```javascript
// Run silently, show top discrepancies
const data = await StockReconciliationService.reconcileAllStock({ 
  verbose: false 
});
console.log(`Total discrepancies: ${data.discrepancies}`);
```

### Scenario 2: Find Stock Shortages (< -10 units)
```javascript
const data = await StockReconciliationService.reconcileAllStock({}); 
const shortages = data.details.filter(d => d.variance < -10);
```

### Scenario 3: Audit Trail for Product
```javascript
// Get specific product details
const result = await StockReconciliationService.reconcileProduct(productId);
console.log(`Movements: ${result.totalMovements}`);
console.log(`Current: ${result.currentStock.totalQuantity}`);
console.log(`Calculated: ${result.calculatedBalance}`);
```

### Scenario 4: Monthly Reporting
```javascript
const data = await StockReconciliationService.reconcileAllStock({});
const report = StockReconciliationService.generateReport(data);

// Save report
const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
fs.writeFileSync(`reconciliation-${timestamp}.json`, JSON.stringify(report, null, 2));
```

### Scenario 5: Heal Specific Products
```javascript
const productIds = ["id1", "id2", "id3"];
for (const id of productIds) {
  await UniversalStockRecalculationService.recalculateFullProduct(id, userId);
}
```

---

## When to Use

| Use Case | Command | Notes |
|----------|---------|-------|
| Daily status check | `quickCheck()` | Non-blocking |
| Weekly reconciliation | `reconcileAllStock({autoHeal:false})` | During off-peak |
| Monthly audit | Export report to CSV | Archive |
| Fix discrepancies | `reconcileAllStock({autoHeal:true})` | ⚠️ Test first |
| Trace issue | Single product reconciliation | Detailed debug |

---

## Locations

| File | Purpose |
|------|---------|
| `server/modules/accounting/services/StockReconciliationService.js` | Service code |
| `scripts/reconciliation-script.js` | CLI script |
| `STOCK_RECONCILIATION_GUIDE.md` | Full documentation |

---

## Performance

- 100 products: ~2-3 seconds
- 1,000 products: ~20-30 seconds  
- 10,000+ products: ~3-5 minutes

**Tip:** Run during off-peak hours.

---

## Reconciliation Formula

```
For each product by date order:
  calculatedBalance = sum of all movements (INBOUND, OUTBOUND, ADJUSTMENT)
  currentStock = CurrentStock.totalQuantity
  
  if (calculatedBalance === currentStock) {
    ✅ Match - OK
  } else {
    ⚠️ Discrepancy = currentStock - calculatedBalance
  }
```

---

## Related

- **UniversalStockRecalculationService** - Core engine
- **GRNStockUpdateService** - GRN posting
- **SimpleGRNEditManager** - GRN edits
- **SalesInvoiceService** - Future integration

---

**Version:** 1.0 | **Created:** 2026-03-22
