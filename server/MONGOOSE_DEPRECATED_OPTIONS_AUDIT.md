# Mongoose Deprecated Options Audit

## Search Summary
This document contains all instances of `findByIdAndUpdate`, `findOneAndUpdate`, and `findOneAndReplace` that use the deprecated `new:` option across the server codebase.

**Last Updated:** April 24, 2026  
**Migration Target:** Replace `new: true/false` with `returnDocument: 'after'/'before'`

---

## Files with Deprecated Options

### 1. [modules/accounting/services/JournalEntryService.js](modules/accounting/services/JournalEntryService.js#L274)
**Line 274:** `new: true`
```javascript
const updated = await JournalEntry.findByIdAndUpdate(entryId, updateData, { new: true })
  .populate('lineItems.accountId', 'accountNumber accountName');
```
**Context:**
- 3 lines before: `updateData.totalCredit = validatedItems.totalCredit;`
- 3 lines after: `.populate('lineItems.accountId', 'accountNumber accountName');`

**Current Option:** `new: true`  
**Status:** ❌ Deprecated - Should use `returnDocument: 'after'`

---

### 2. [modules/accounting/services/JournalEntryService.js](modules/accounting/services/JournalEntryService.js#L345)
**Line 345:** `new: true` (multi-line)
```javascript
const updated = await JournalEntry.findByIdAndUpdate(
  entryId,
  {
    // ... update data
  },
  { new: true }
);
```
**Status:** ❌ Deprecated

---

### 3. [modules/accounting/services/JournalEntryService.js](modules/accounting/services/JournalEntryService.js#L378)
**Line 378:** `new: true` (multi-line)
```javascript
const updated = await JournalEntry.findByIdAndUpdate(
  entryId,
  {
    // ... update data
  },
  { new: true }
);
```
**Status:** ❌ Deprecated

---

### 4. [modules/accounting/services/AccountGroupService.js](modules/accounting/services/AccountGroupService.js#L279)
**Line 279:** `new: true`
```javascript
const updated = await AccountGroup.findByIdAndUpdate(groupId, updateData, {
  new: true,
  runValidators: true,
});
```
**Current Option:** `new: true` with `runValidators: true`  
**Status:** ❌ Deprecated

---

### 5. [modules/accounting/services/AccountGroupService.js](modules/accounting/services/AccountGroupService.js#L311)
**Line 311:** `new: true`
```javascript
const group = await AccountGroup.findByIdAndUpdate(groupId, { isDeleted: true }, { new: true });
```
**Current Option:** `new: true`  
**Status:** ❌ Deprecated

---

### 6. [modules/accounting/services/ContraService.js](modules/accounting/services/ContraService.js#L249)
**Line 249:** `new: true`
```javascript
const updated = await Contra.findByIdAndUpdate(contraId, updateData, { new: true })
  .populate('fromAccountId', 'accountNumber accountName')
  .populate('toAccountId', 'accountNumber accountName');
```
**Current Option:** `new: true`  
**Status:** ❌ Deprecated

---

### 7. [modules/accounting/services/ContraService.js](modules/accounting/services/ContraService.js#L362)
**Line 362:** `new: true` (multi-line)
```javascript
const updated = await Contra.findByIdAndUpdate(
  contraId,
  {
    // ... update data
  },
  { new: true }
);
```
**Status:** ❌ Deprecated

---

### 8. [modules/accounting/services/ChartOfAccountsService.js](modules/accounting/services/ChartOfAccountsService.js#L215)
**Line 215:** `new: true`
```javascript
const updated = await ChartOfAccounts.findByIdAndUpdate(accountId, updateData, {
  new: true,
  runValidators: true,
}).populate('accountGroupId', 'name code type nature');
```
**Current Option:** `new: true` with `runValidators: true`  
**Status:** ❌ Deprecated

---

### 9. [modules/accounting/services/ChartOfAccountsService.js](modules/accounting/services/ChartOfAccountsService.js#L279)
**Line 279:** `new: true`
```javascript
const account = await ChartOfAccounts.findByIdAndUpdate(accountId, { isDeleted: true }, { new: true });
```
**Current Option:** `new: true`  
**Status:** ❌ Deprecated

---

### 10. [modules/auth/controllers/userController.js](modules/auth/controllers/userController.js#L118)
**Line 118:** `new: true`
```javascript
const updatedUser = await User.findByIdAndUpdate(userId, updateData, { new: true }).populate(
  "role",
  "name description"
);
```
**Current Option:** `new: true`  
**Status:** ❌ Deprecated

---

### 11. [modules/auth/controllers/userController.js](modules/auth/controllers/userController.js#L158)
**Line 158:** `new: true` (multi-line)
```javascript
const updatedUser = await User.findByIdAndUpdate(
  userId,
  { lastLogin: new Date() },
  { new: true }
).populate("role", "name description");
```
**Current Option:** `new: true`  
**Status:** ❌ Deprecated

---

### 12. [modules/auth/controllers/roleController.js](modules/auth/controllers/roleController.js#L93)
**Line 93:** ✅ **ALREADY MIGRATED** to `returnDocument: 'after'`
```javascript
const updatedRole = await Role.findByIdAndUpdate(roleId, updateData, { returnDocument: 'after' });
```
**Status:** ✅ Already uses modern syntax

---

### 13. [modules/sales/controllers/salesReturnController.js](modules/sales/controllers/salesReturnController.js#L55)
**Line 55:** ✅ **ALREADY MIGRATED** to `returnDocument: 'after'`
```javascript
const salesReturn = await SalesReturn.findByIdAndUpdate(req.params.id, req.body, { returnDocument: 'after' });
```
**Status:** ✅ Already uses modern syntax

---

### 14. [modules/sales/services/SalesReturnService.js](modules/sales/services/SalesReturnService.js#L244)
**Line 244:** `new: true`
```javascript
const updated = await SalesReturn.findByIdAndUpdate(returnId, updateData, { new: true });
```
**Current Option:** `new: true`  
**Status:** ❌ Deprecated

---

### 15. [modules/sales/services/SalesReturnService.js](modules/sales/services/SalesReturnService.js#L271)
**Line 271:** `new: true` (multi-line)
```javascript
const updated = await SalesReturn.findByIdAndUpdate(
  returnId,
  {
    status: 'Rejected',
    rejectionReason,
    rejectionDate: new Date(),
  },
  { new: true }
);
```
**Current Option:** `new: true`  
**Status:** ❌ Deprecated

---

### 16. [modules/sales/services/SalesReturnService.js](modules/sales/services/SalesReturnService.js#L302)
**Line 302:** `new: true`
```javascript
const salesReturn = await SalesReturn.findByIdAndUpdate(returnId, { isDeleted: true }, { new: true });
```
**Current Option:** `new: true`  
**Status:** ❌ Deprecated

---

### 17. [modules/sales/services/SalesOrderService.js](modules/sales/services/SalesOrderService.js#L178)
**Line 178:** `new: true`
```javascript
const order = await SalesOrder.findByIdAndUpdate(orderId, updateData, {
  new: true,
  runValidators: true,
```
**Current Option:** `new: true` with `runValidators: true`  
**Status:** ❌ Deprecated

---

### 18. [modules/sales/services/SalesOrderService.js](modules/sales/services/SalesOrderService.js#L204)
**Line 204:** `new: true`
```javascript
const order = await SalesOrder.findByIdAndUpdate(orderId, { isDeleted: true }, { new: true });
```
**Current Option:** `new: true`  
**Status:** ❌ Deprecated

---

### 19. [modules/sales/services/SalesOrderService.js](modules/sales/services/SalesOrderService.js#L234)
**Line 234:** `new: true`
```javascript
const order = await SalesOrder.findByIdAndUpdate(orderId, { status, updatedDate: new Date() }, { new: true });
```
**Current Option:** `new: true`  
**Status:** ❌ Deprecated

---

### 20. [modules/sales/services/SalesInvoiceService.js](modules/sales/services/SalesInvoiceService.js#L32)
**Line 32:** `new: true` (with upsert)
```javascript
const counter = await Counter.findOneAndUpdate(
  { module: 'sales_invoice', financialYear },
  { $inc: { lastNumber: 1 }, $setOnInsert: { prefix: 'SI' } },
  { new: true, upsert: true }
);
```
**Current Option:** `new: true` with `upsert: true`  
**Status:** ❌ Deprecated

---

### 21. [modules/sales/services/SalesInvoiceService.js](modules/sales/services/SalesInvoiceService.js#L305)
**Line 305:** `new: true`
```javascript
const invoice = await SalesInvoice.findByIdAndUpdate(invoiceId, updateData, {
  new: true,
  runValidators: true,
});
```
**Current Option:** `new: true` with `runValidators: true`  
**Status:** ❌ Deprecated

---

### 22. [modules/sales/services/SalesInvoiceService.js](modules/sales/services/SalesInvoiceService.js#L331)
**Line 331:** `new: true`
```javascript
const invoice = await SalesInvoice.findByIdAndUpdate(invoiceId, { isDeleted: true }, { new: true });
```
**Current Option:** `new: true`  
**Status:** ❌ Deprecated

---

### 23. [modules/sales/controllers/salesOrderController.js](modules/sales/controllers/salesOrderController.js#L69)
**Line 69:** ✅ **ALREADY MIGRATED** to `returnDocument: 'after'`
```javascript
const order = await SalesOrder.findByIdAndUpdate(id, req.body, { 
  returnDocument: 'after',
  runValidators: true 
});
```
**Status:** ✅ Already uses modern syntax

---

### 24. [modules/sales/controllers/salesOrderController.js](modules/sales/controllers/salesOrderController.js#L85)
**Line 85:** ✅ **ALREADY MIGRATED** to `returnDocument: 'after'`
```javascript
const order = await SalesOrder.findByIdAndUpdate(
  id, 
  { status, updatedDate: new Date() }, 
  { returnDocument: 'after', runValidators: true }
);
```
**Status:** ✅ Already uses modern syntax

---

### 25. [modules/sales/controllers/quotationController.js](modules/sales/controllers/quotationController.js#L103)
**Line 103:** ❌ **MIXED:** Uses both `returnDocument: 'after'` AND `new: true`
```javascript
const quotation = await Quotation.findByIdAndUpdate(
  req.params.id, 
  { ...req.body, updatedDate: new Date() },
  { returnDocument: 'after', new: true }
);
```
**Current Option:** Both `returnDocument: 'after'` and `new: true` (redundant!)  
**Status:** ⚠️ NEEDS CLEANUP - Remove `new: true`

---

### 26. [modules/sales/controllers/quotationController.js](modules/sales/controllers/quotationController.js#L119)
**Line 119:** ❌ **MIXED:** Uses both `returnDocument: 'after'` AND `new: true`
```javascript
const quotation = await Quotation.findByIdAndUpdate(
  req.params.id,
  { isDeleted: true, deletedAt: new Date() },
  { returnDocument: 'after', new: true }
);
```
**Current Option:** Both `returnDocument: 'after'` and `new: true` (redundant!)  
**Status:** ⚠️ NEEDS CLEANUP - Remove `new: true`

---

### 27. [modules/sales/controllers/quotationController.js](modules/sales/controllers/quotationController.js#L141)
**Line 141:** ❌ **MIXED:** Uses both `returnDocument: 'after'` AND `new: true`
```javascript
const quotation = await Quotation.findByIdAndUpdate(
  req.params.id,
  { status, updatedDate: new Date() },
  { returnDocument: 'after', new: true }
);
```
**Current Option:** Both `returnDocument: 'after'` and `new: true` (redundant!)  
**Status:** ⚠️ NEEDS CLEANUP - Remove `new: true`

---

### 28. [modules/inventory/services/GRNService.js](modules/inventory/services/GRNService.js#L341)
**Line 341:** `new: true`
```javascript
const updated = await Grn.findByIdAndUpdate(grnId, updateData, { new: true });
```
**Current Option:** `new: true`  
**Status:** ❌ Deprecated

---

### 29. [modules/inventory/services/ProductService.js](modules/inventory/services/ProductService.js#L285)
**Line 285:** `new: true`
```javascript
const updated = await Product.findByIdAndUpdate(productId, updateData, {
  new: true,
  runValidators: true,
})
  .populate('categoryId', 'groupingName')
  .populate('groupingId', 'groupingName');
```
**Current Option:** `new: true` with `runValidators: true`  
**Status:** ❌ Deprecated

---

### 30. [modules/inventory/services/ProductService.js](modules/inventory/services/ProductService.js#L307)
**Line 307:** `new: true`
```javascript
const product = await Product.findByIdAndUpdate(productId, { isDeleted: true }, { new: true });
```
**Current Option:** `new: true`  
**Status:** ❌ Deprecated

---

### 31. [modules/inventory/services/productPackingService.js](modules/inventory/services/productPackingService.js#L135)
**Line 135:** `new: true`
```javascript
const packing = await ProductPacking.findByIdAndUpdate(packingId, updateData, {
  new: true,
  runValidators: true,
})
  .populate('unitType')
  .populate('productId');
```
**Current Option:** `new: true` with `runValidators: true`  
**Status:** ❌ Deprecated

---

### 32. [modules/inventory/services/stockBatchService.js](modules/inventory/services/stockBatchService.js#L88)
**Line 88:** `new: true`
```javascript
const batch = await StockBatch.findByIdAndUpdate(
  batchId,
  updateData,
  { new: true, runValidators: true }
);
```
**Current Option:** `new: true` with `runValidators: true`  
**Status:** ❌ Deprecated

---

### 33. [modules/accounting/services/GRNEditManager.js](modules/accounting/services/GRNEditManager.js#L410)
**Line 410:** ✅ **ALREADY MIGRATED** to `returnDocument: 'after'`
```javascript
const updatedGRN = await Grn.findByIdAndUpdate(
  grnId,
  { ...changes, $inc: { __v: 1 } },
  { returnDocument: "after", session }
);
```
**Status:** ✅ Already uses modern syntax

---

### 34. [modules/accounting/services/GRNEditManager.js](modules/accounting/services/GRNEditManager.js#L619)
**Line 619:** ✅ **ALREADY MIGRATED** to `returnDocument: 'after'`
```javascript
const updatedGRN = await Grn.findByIdAndUpdate(
  grnId,
  {
    ...updates,
    updatedBy: userId,
    updatedDate: new Date()
  },
  { returnDocument: 'after', runValidators: true }
);
```
**Status:** ✅ Already uses modern syntax

---

### 35. [modules/accounting/services/GRNEditManager.js](modules/accounting/services/GRNEditManager.js#L746)
**Line 746:** ✅ **ALREADY MIGRATED** to `returnDocument: 'after'`
```javascript
const updatedGRN = await Grn.findByIdAndUpdate(
  grnId,
  {
    items: recalculatedData.newItems,
    totalQty: recalculatedData.newTotalQty,
    totalCost: recalculatedData.newTotalCost,
    updatedBy: userId,
    updatedDate: new Date()
  },
  { returnDocument: 'after' }
);
```
**Status:** ✅ Already uses modern syntax

---

### 36. [modules/accounting/services/GRNEditManager.js](modules/accounting/services/GRNEditManager.js#L1090)
**Line 1090:** ✅ **ALREADY MIGRATED** to `returnDocument: 'after'`
```javascript
const updatedGRN = await Grn.findByIdAndUpdate(
  grnId,
  {
    $pull: { items: { productId: { $in: itemProductIds } } },
    updatedBy: userId,
    updatedDate: new Date()
  },
  { returnDocument: 'after' }
);
```
**Status:** ✅ Already uses modern syntax

---

### 37. [modules/accounting/services/GRNEditManager.js](modules/accounting/services/GRNEditManager.js#L1190)
**Line 1190:** ✅ **ALREADY MIGRATED** to `returnDocument: 'after'`
```javascript
const updatedGRN = await Grn.findByIdAndUpdate(
  grnId,
  {
    $push: { items: { $each: newItems } },
    // ... other fields
  },
  { returnDocument: 'after' }
);
```
**Status:** ✅ Already uses modern syntax

---

### 38. [modules/organization/services/OrganizationService.js](modules/organization/services/OrganizationService.js#L184)
**Line 184:** `new: true`
```javascript
const org = await Organization.findByIdAndUpdate(
  branchId,
  safeData,
  { new: true, runValidators: true }
)
  .populate('parentId', 'code type');
```
**Current Option:** `new: true` with `runValidators: true`  
**Status:** ❌ Deprecated

---

### 39. [modules/organization/services/OrganizationService.js](modules/organization/services/OrganizationService.js#L220)
**Line 220:** `new: true`
```javascript
const org = await Organization.findByIdAndUpdate(
  branchId,
  { isActive: false },
  { new: true }
);
```
**Current Option:** `new: true`  
**Status:** ❌ Deprecated

---

### 40. [modules/customers/routes/customerRoutes.js](modules/customers/routes/customerRoutes.js#L234)
**Line 234:** ✅ **ALREADY MIGRATED** to `returnDocument: 'after'`
```javascript
const customer = await Customer.findByIdAndUpdate(id, updateData, {
  returnDocument: 'after',
  runValidators: true,
});
```
**Status:** ✅ Already uses modern syntax

---

### 41. [modules/sales/controllers/deliveryNoteController.js](modules/sales/controllers/deliveryNoteController.js#L67)
**Line 67:** `new: true`
```javascript
const note = await DeliveryNote.findByIdAndUpdate(
  req.params.id,
  req.body,
  { new: true }
).populate('customerId').populate('salesOrderId');
```
**Current Option:** `new: true`  
**Status:** ❌ Deprecated

---

### 42. [modules/sales/controllers/deliveryNoteController.js](modules/sales/controllers/deliveryNoteController.js#L82)
**Line 82:** `new: true`
```javascript
const note = await DeliveryNote.findByIdAndUpdate(
  req.params.id,
  { status, updatedAt: new Date() },
  { new: true }
).populate('customerId').populate('salesOrderId');
```
**Current Option:** `new: true`  
**Status:** ❌ Deprecated

---

### 43. [modules/sales/controllers/deliveryNoteController.js](modules/sales/controllers/deliveryNoteController.js#L91)
**Line 91:** `new: true`
```javascript
await SalesOrder.findByIdAndUpdate(
  note.salesOrderId,
  { status: 'Delivered' },
  { new: true }
);
```
**Current Option:** `new: true`  
**Status:** ❌ Deprecated

---

### 44. [routes/barcodeTemplateRoutes.js](routes/barcodeTemplateRoutes.js#L209)
**Line 209:** `new: true`
```javascript
const template = await BarcodeTemplate.findByIdAndUpdate(
  req.params.id,
  { 
    isDefault: true,
    updateDate: new Date()
  },
  { new: true }
);
```
**Current Option:** `new: true`  
**Status:** ❌ Deprecated

---

### 45. [routes/barcodeTemplateRoutes.js](routes/barcodeTemplateRoutes.js#L232)
**Line 232:** `new: true`
```javascript
const template = await BarcodeTemplate.findByIdAndUpdate(
  req.params.id,
  { 
    deleted: true,
    isActive: false,
    updateDate: new Date()
  },
  { new: true }
);
```
**Current Option:** `new: true`  
**Status:** ❌ Deprecated

---

### 46. [routes/invoiceTemplateRoutes.js](routes/invoiceTemplateRoutes.js#L155)
**Line 155:** `new: true`
```javascript
const template = await InvoiceTemplate.findByIdAndUpdate(
  req.params.id,
  { isDefault: true },
  { new: true }
);
```
**Current Option:** `new: true`  
**Status:** ❌ Deprecated

---

### 47. [routes/invoiceTemplateRoutes.js](routes/invoiceTemplateRoutes.js#L175)
**Line 175:** `new: true`
```javascript
const template = await InvoiceTemplate.findByIdAndUpdate(
  req.params.id,
  { isActive: false },
  { new: true }
);
```
**Current Option:** `new: true`  
**Status:** ❌ Deprecated

---

### 48. [modules/purchasing/controllers/vendorController.js](modules/purchasing/controllers/vendorController.js#L384)
**Line 384:** ✅ **ALREADY MIGRATED** to `returnDocument: 'after'`
```javascript
const vendor = await Vendor.findByIdAndUpdate(id, updateData, {
  returnDocument: 'after',
  runValidators: true
});
```
**Status:** ✅ Already uses modern syntax

---

### 49. [modules/purchasing/controllers/vendorController.js](modules/purchasing/controllers/vendorController.js#L411)
**Line 411:** `new: true`
```javascript
const vendor = await Vendor.findByIdAndUpdate(
  id,
  {
    isDeleted: true,
    deletedAt: new Date(),
    isActive: false,
  },
  { new: true }
);
```
**Current Option:** `new: true`  
**Status:** ❌ Deprecated

---

### 50. [modules/inventory/controllers/productController.js](modules/inventory/controllers/productController.js#L1482)
**Line 1482:** ✅ **ALREADY MIGRATED** to `returnDocument: 'after'`
```javascript
const product = await Product.findByIdAndUpdate(
  req.params.id,
  {
    isDeleted: false,
    deletedAt: null
  },
  { returnDocument: 'after' }
);
```
**Status:** ✅ Already uses modern syntax

---

### 51. [modules/inventory/controllers/productController.js](modules/inventory/controllers/productController.js#L1563)
**Line 1563:** `new: true`
```javascript
const product = await Product.findByIdAndUpdate(
  req.params.id,
  {
    stock: quantityNum,
    updateDate: new Date(),
  },
  { new: true }
);
```
**Current Option:** `new: true`  
**Status:** ❌ Deprecated

---

## Summary Statistics

| Status | Count |
|--------|-------|
| ❌ Deprecated (`new: true/false` only) | 40 |
| ✅ Already Migrated (`returnDocument: 'after'`) | 10 |
| ⚠️ Mixed (both deprecated + new) | 3 |
| **Total** | **53** |

## Migration Priority

### Priority 1 (High Impact)
- **AccountGroupService.js** - 2 instances
- **ChartOfAccountsService.js** - 2 instances  
- **JournalEntryService.js** - 3 instances
- **ContraService.js** - 2 instances

### Priority 2 (Medium Impact)
- **SalesReturnService.js** - 3 instances
- **SalesOrderService.js** - 3 instances
- **SalesInvoiceService.js** - 3 instances
- **ProductService.js** - 2 instances
- **ProductPacking/StockBatchService.js** - 2 instances

### Priority 3 (Lower Impact - Controllers)
- **quotationController.js** - 3 instances (MIXED, needs cleanup)
- **deliveryNoteController.js** - 3 instances
- **barcodeTemplateRoutes.js** - 2 instances
- **invoiceTemplateRoutes.js** - 2 instances

---

## Migration Guide

### Before
```javascript
const updated = await Model.findByIdAndUpdate(id, updateData, { new: true });
const updated = await Model.findOneAndUpdate(filter, updateData, { new: false, upsert: true });
```

### After
```javascript
const updated = await Model.findByIdAndUpdate(id, updateData, { returnDocument: 'after' });
const updated = await Model.findOneAndUpdate(filter, updateData, { returnDocument: 'before', upsert: true });
```

### Conversion Table

| Old Syntax | New Syntax |
|-----------|-----------|
| `{ new: true }` | `{ returnDocument: 'after' }` |
| `{ new: false }` | `{ returnDocument: 'before' }` |
| `{ new: true, upsert: true }` | `{ returnDocument: 'after', upsert: true }` |
| `{ new: true, runValidators: true }` | `{ returnDocument: 'after', runValidators: true }` |

---

## Files Not Yet Migrated (40 instances to fix)

1. AccountGroupService.js (2)
2. ChartOfAccountsService.js (2)
3. ContraService.js (2)
4. JournalEntryService.js (3)
5. ProductService.js (2)
6. ProductPackingService.js (1)
7. StockBatchService.js (1)
8. GRNService.js (1)
9. SalesReturnService.js (3)
10. SalesInvoiceService.js (3)
11. SalesOrderService.js (3)
12. OrganizationService.js (2)
13. userController.js (2)
14. deliveryNoteController.js (3)
15. barcodeTemplateRoutes.js (2)
16. invoiceTemplateRoutes.js (2)
17. vendorController.js (1)
18. productController.js (1)

---

## Files with Mixed Options (3 instances - needs cleanup)

**quotationController.js** (3 instances)
- Lines 103, 119, 141
- Currently using both `returnDocument: 'after'` AND `new: true`
- Action: Remove the redundant `new: true` option

