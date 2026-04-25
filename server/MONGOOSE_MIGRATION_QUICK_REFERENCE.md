# Quick Migration Reference - Mongoose returnDocument Option

## 🔄 Migration Cheat Sheet

### One-Line Replacements

```javascript
// ❌ OLD (Deprecated)
{ new: true }

// ✅ NEW (Correct)
{ returnDocument: 'after' }
```

```javascript
// ❌ OLD (Deprecated)
{ new: false }

// ✅ NEW (Correct)
{ returnDocument: 'before' }
```

---

## 📋 Complete Examples

### Simple Update with new: true
```javascript
// ❌ Before
const updated = await User.findByIdAndUpdate(userId, updateData, { new: true });

// ✅ After
const updated = await User.findByIdAndUpdate(userId, updateData, { returnDocument: 'after' });
```

### Update with Multiple Options
```javascript
// ❌ Before
const updated = await Product.findByIdAndUpdate(productId, updateData, {
  new: true,
  runValidators: true
});

// ✅ After
const updated = await Product.findByIdAndUpdate(productId, updateData, {
  returnDocument: 'after',
  runValidators: true
});
```

### Upsert with new: true
```javascript
// ❌ Before
const counter = await Counter.findOneAndUpdate(
  { module: 'sales_invoice' },
  { $inc: { lastNumber: 1 } },
  { new: true, upsert: true }
);

// ✅ After
const counter = await Counter.findOneAndUpdate(
  { module: 'sales_invoice' },
  { $inc: { lastNumber: 1 } },
  { returnDocument: 'after', upsert: true }
);
```

### With Populate
```javascript
// ❌ Before
const user = await User.findByIdAndUpdate(userId, updateData, { new: true })
  .populate('role', 'name');

// ✅ After
const user = await User.findByIdAndUpdate(userId, updateData, { returnDocument: 'after' })
  .populate('role', 'name');
```

---

## 🚀 Find & Replace Pattern (VS Code)

### Pattern 1: Single line with `new: true`
**Find:** `new: true`  
**Replace:** `returnDocument: 'after'`

### Pattern 2: Multi-line with new: true
**Find:** `\{\s*new:\s*true([,\s}])`  
**Replace:** `{ returnDocument: 'after'$1`  
(Use regex search)

### Pattern 3: With upsert
**Find:** `new: true,\s*upsert: true`  
**Replace:** `returnDocument: 'after', upsert: true`

### Pattern 4: With runValidators
**Find:** `new: true,\s*runValidators: true`  
**Replace:** `returnDocument: 'after', runValidators: true`

---

## 🎯 Priority Files (Quick Links)

### Phase 1 - Accounting Services (5 files, 9 instances)
- [ ] JournalEntryService.js (3 instances)
- [ ] AccountGroupService.js (2 instances)
- [ ] ChartOfAccountsService.js (2 instances)
- [ ] ContraService.js (2 instances)

### Phase 2 - Sales Services (5 files, 12 instances)
- [ ] SalesReturnService.js (3 instances)
- [ ] SalesOrderService.js (3 instances)
- [ ] SalesInvoiceService.js (3 instances)
- [ ] SalesInvoiceService.js (2 instances with findOneAndUpdate)

### Phase 3 - Controllers & Routes (5 files, 14 instances)
- [ ] quotationController.js (3 instances - **MIXED**, just remove `new: true`)
- [ ] deliveryNoteController.js (3 instances)
- [ ] barcodeTemplateRoutes.js (2 instances)
- [ ] invoiceTemplateRoutes.js (2 instances)
- [ ] vendorController.js (1 instance)
- [ ] productController.js (1 instance)
- [ ] userController.js (2 instances)

### Phase 4 - Other Services (5 files, 5 instances)
- [ ] ProductService.js (2 instances)
- [ ] GRNService.js (1 instance)
- [ ] OrganizationService.js (2 instances)

---

## ⚠️ Special Cases

### Mixed Options (quotationController.js)
Currently has BOTH `returnDocument: 'after'` AND `new: true` - **just remove `new: true`**

**Before:**
```javascript
const quotation = await Quotation.findByIdAndUpdate(id, data, { 
  returnDocument: 'after', 
  new: true 
});
```

**After:**
```javascript
const quotation = await Quotation.findByIdAndUpdate(id, data, { 
  returnDocument: 'after'
});
```

---

## ✅ Already Migrated Files

These files are already using `returnDocument` - **NO ACTION NEEDED**:
- roleController.js ✅
- salesReturnController.js ✅
- salesOrderController.js ✅
- customerRoutes.js ✅
- GRNEditManager.js (most instances) ✅

---

## 📚 Mongoose Documentation Reference

**Deprecated Option:** `new` (Mongoose 7.x)  
**Replacement:** `returnDocument` (Mongoose 7.x+)

### Allowed Values:
- `'after'` → returns the document AFTER the update
- `'before'` → returns the document BEFORE the update

---

## 🧪 Testing After Migration

```javascript
// Test that the returned object is correct
const updated = await Model.findByIdAndUpdate(id, { name: 'new' }, { returnDocument: 'after' });

// Should contain the updated field
console.log(updated.name); // "new"

// With 'before' option
const before = await Model.findByIdAndUpdate(id, { name: 'newer' }, { returnDocument: 'before' });

// Should contain the OLD value
console.log(before.name); // "new" (not "newer")
```

---

## 🔗 Related Files

- Full Audit: [MONGOOSE_DEPRECATED_OPTIONS_AUDIT.md](./MONGOOSE_DEPRECATED_OPTIONS_AUDIT.md)
- Memory Note: `/memories/repo/mongoose-deprecated-options-audit-april2026.md`

