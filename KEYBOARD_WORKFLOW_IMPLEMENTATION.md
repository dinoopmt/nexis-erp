# Keyboard Workflow Implementation Details

## Code Structure Overview

### 1. **State & Refs Management**

```javascript
// Store references to all table input fields
const itemInputRefs = useRef({});
// Format: itemInputRefs.current["itemId_fieldName"]
// Example: itemInputRefs.current["1699564800000_qty"]

// Track which cell currently has focus
const [focusedCell, setFocusedCell] = useState(null);
// Format: { itemId: "1699564800000", field: "qty" }
```

### 2. **Ref Storage Pattern**

In each table input, the ref is stored with a unique key:

```javascript
ref={(el) => {
  if (el) itemInputRefs.current[`${item.id}_qty`] = el;
}}
```

This allows quick lookup later:
```javascript
const qtyRef = itemInputRefs.current[`${addedItemId}_qty`];
if (qtyRef) {
  qtyRef.focus();
  qtyRef.select();
}
```

---

## Key Implementation Functions

### Function 1: `handleTableCellKeyDown(e, itemId, currentField, itemIndex)`

**Purpose:** Navigate between table cells when user presses Tab/Enter

**Parameters:**
- `e` - keyboard event
- `itemId` - ID of the item (row identifier)
- `currentField` - current field name (qty, rate, itemDiscount, itemDiscountAmount)
- `itemIndex` - index in items array (0, 1, 2, ...)

**Field Order:** `["qty", "rate", "itemDiscount", "itemDiscountAmount"]`

**Navigation Logic:**

```
User presses Tab/Enter
    ↓
Get current field position in fieldOrder array
    ↓
If Tab: nextFieldIndex = currentFieldIndex + 1
If Shift+Tab: nextFieldIndex = currentFieldIndex - 1
    ↓
Check boundaries:
  - If nextFieldIndex < 0 → go to previous item's last field
  - If nextFieldIndex >= fieldOrder.length → go to next item's first field OR back to search
    ↓
Focus next field and select text
```

**Example Flows:**

```
Tab in Qty (index 0):
  nextFieldIndex = 1 (Rate)
  Focus Rate input
  Select text for editing

Tab in DiscAmt (index 3, last field):
  nextFieldIndex = 4 (out of bounds)
  If more items exist:
    Focus next item's Qty
  Else:
    Focus Search Box (back to item search)

Shift+Tab in Rate (index 1):
  nextFieldIndex = 0 (Qty)
  Focus Qty input (previous field)
```

### Function 2: `addItemFromSearch(product)`

**Purpose:** Add product to invoice and focus its Qty field

**Key Changes:**
1. Extract added item ID before state update
2. Use setTimeout to delay focus (let DOM update first)
3. Focus Qty field ref
4. Select text automatically

**Code:**
```javascript
let addedItemId = null;

setInvoiceData((prev) => {
  // ... add product logic ...
  addedItemId = newItem.id;  // Capture ID
  return { ...prev, items: [...prev.items, newItem] };
});

// Wait for DOM to update
setTimeout(() => {
  const qtyRef = itemInputRefs.current[`${addedItemId}_qty`];
  if (qtyRef) {
    qtyRef.focus();
    qtyRef.select();  // Auto-select text
    setFocusedCell({ itemId: addedItemId, field: "qty" });
  }
}, 50);  // 50ms is enough for React render
```

---

## Table Input Field Structure

### Qty Input Field

```javascript
<input
  ref={(el) => {
    if (el) itemInputRefs.current[`${item.id}_qty`] = el;
  }}
  type="number"
  inputMode="numeric"
  value={parseInt(item.qty) || ""}
  onChange={(e) => handleItemChange(item.id, "qty", parseFloat(e.target.value) || 0)}
  onFocus={() => setFocusedCell({ itemId: item.id, field: "qty" })}
  onKeyDown={(e) => handleTableCellKeyDown(e, item.id, "qty", idx)}
/>
```

**Three Event Handlers:**
1. **ref**: Store for later access
2. **onFocus**: Track which cell is currently focused
3. **onKeyDown**: Handle Tab/Enter/Shift+Tab navigation

### Same Pattern for Other Fields

Rate, Discount %, and Discount Amount use the same pattern:

```javascript
// Rate field
ref: itemInputRefs.current[`${item.id}_rate`]
onKeyDown: handleTableCellKeyDown(e, item.id, "rate", idx)

// Discount %
ref: itemInputRefs.current[`${item.id}_itemDiscount`]
onKeyDown: handleTableCellKeyDown(e, item.id, "itemDiscount", idx)

// Discount Amount
ref: itemInputRefs.current[`${item.id}_itemDiscountAmount`]
onKeyDown: handleTableCellKeyDown(e, item.id, "itemDiscountAmount", idx)
```

---

## Cleanup & Edge Cases

### Ref Cleanup (Important!)

When items are deleted, their refs should be cleaned up:

```javascript
const removeItem = (id) => {
  // Remove from invoice data
  setInvoiceData({
    ...invoiceData,
    items: invoiceData.items.filter((item) => item.id !== id),
  });
  
  // Clean up refs (optional but good practice)
  const fieldOrder = ["qty", "rate", "itemDiscount", "itemDiscountAmount"];
  fieldOrder.forEach((field) => {
    delete itemInputRefs.current[`${id}_${field}`];
  });
};
```

### Edge Case: Last Item's Last Field With No More Items

```javascript
// User in last item's DiscAmt field
// Presses Tab
  ↓
nextFieldIndex = 4 (out of bounds)
itemIndex = 2 (last item)
itemIndex < invoiceData.items.length - 1 → FALSE
  ↓
Focus back to Search Box
searchInputRef.current?.focus();
```

### Edge Case: Navigating When Items Deleted

If user has Item 1, 2, 3 and deletes Item 2:
- Items array becomes [Item 1, Item 3]
- `idx` (index from map) automatically updates
- Re-navigation uses correct `idx` from next render

---

## Performance Optimizations

### 1. **Debounced Focus Updates**

Use `setTimeout` after state changes:
```javascript
setTimeout(() => {
  qtyRef.focus();
}, 50);  // Let React finish rendering first
```

### 2. **Ref Lookup is O(1)**

```javascript
// Fast lookup
const ref = itemInputRefs.current[`${itemId}_fieldName`];

// NOT: searching through array every time
const ref = document.querySelector(`[data-item-id="${itemId}"]`);
```

### 3. **No Extra State Updates**

`focusedCell` state is only for visual tracking, not critical:
```javascript
setFocusedCell({ itemId: item.id, field: "qty" });
// This is optional - only useful for styling active cell
// If performance is critical, this could be removed
```

### 4. **Memory Cleanup**

```javascript
// Bad: refs accumulate for deleted items
itemInputRefs.current[`${deletedItemId}_qty`] = undefined;

// Good: remove the entry
delete itemInputRefs.current[`${deletedItemId}_qty`];
```

---

## Testing the Implementation

### Test 1: Basic Navigation
```
1. Add item "Product ABC"
2. Qty field should auto-focus
3. Press Tab → focus moves to Rate
4. Press Tab → focus moves to Discount %
5. Press Tab → focus moves to Discount Amount
```

**Expected:** Each field focuses in order, blue ring visible

### Test 2: Return to Search
```
1. Add one item
2. Navigate through all fields (Qty → Rate → Disc% → DiscAmt)
3. Press Tab after DiscAmt
4. Focus should return to Search Box
```

**Expected:** Search box is focused again (cursor visible)

### Test 3: Add Second Item Seamlessly
```
1. Add Item 1 (fully navigate)
2. After Item 1's DiscAmt, Tab should focus Item 2's Qty IF MULTIPLE ITEMS
3. If only 1 item, Tab goes to Search Box
```

### Test 4: Shift+Tab (Backwards)
```
1. Navigate forward through one item
2. Go back with Shift+Tab
3. Should move backwards: DiscAmt → Disc% → Rate → Qty
4. Shift+Tab from Qty should go to previous item's DiscAmt (if exists)
```

### Test 5: Text Auto-Selection
```
1. Focus any field (Tab or click)
2. Field text should be highlighted/selected
3. Type new value → replaces old value (no need to clear)
```

**Expected:** Can start typing immediately without clearing

### Test 6: Multiple Items
```
1. Add 3 items
2. Tab through Item 1 completely
3. Auto-focus should switch to Item 2's Qty
4. Continue through Item 2 and 3
5. After Item 3's DiscAmt, focus returns to Search
```

---

## Maintenance & Future Updates

### Adding a New Editable Field

If you add a new editable column (e.g., Remarks):

1. **Update fieldOrder array** in `handleTableCellKeyDown`:
```javascript
const fieldOrder = ["qty", "rate", "itemDiscount", "itemDiscountAmount", "remarks"];
```

2. **Add ref to new input:**
```javascript
ref={(el) => {
  if (el) itemInputRefs.current[`${item.id}_remarks`] = el;
}}
```

3. **Add event handlers:**
```javascript
onFocus={() => setFocusedCell({ itemId: item.id, field: "remarks" })}
onKeyDown={(e) => handleTableCellKeyDown(e, item.id, "remarks", idx)}
```

### Removing a Field

1. Remove from `fieldOrder` array
2. Remove ref and event handlers from input JSX
3. No other changes needed (cleanup auto-handles)

### Changing Tab Behavior

To change what happens after last field:

```javascript
else {
  // Currently: goes to search
  // Option 1: Save invoice
  // Option 2: Focus specific button
  // Option 3: Open new modal
  
  setFocusedCell(null);
  searchInputRef.current?.focus();  // ← Change this line
}
```

---

## Browser DevTools Debugging

### Inspect Active Refs

```javascript
// In browser console (F12)
// Check what refs are stored
console.log(itemInputRefs.current);

// Output:
{
  "1699564800000_qty": HTMLInputElement,
  "1699564800000_rate": HTMLInputElement,
  "1699564801111_qty": HTMLInputElement,
  ...
}
```

### Check Focused Cell State

```javascript
// In DevTools React Extension
// Look for focusedCell state
focusedCell = {
  itemId: "1699564800000",
  field: "qty"
}
```

### Test Focus Manually

```javascript
// Focus a specific field
const ref = itemInputRefs.current["1699564800000_qty"];
if (ref) {
  ref.focus();
  ref.select();
  ref.scrollIntoView({ block: "center" });
}
```

---

## Known Limitations

### 1. **Mobile Keyboards**
Tab key may not appear on mobile on-screen keyboards. Users can:
- Use Bluetooth keyboard
- Touch fields to focus directly
- Type and submit

### 2. **Screen Readers**
Current implementation doesn't include ARIA labels. To add:
```javascript
aria-label={`${currentField} for item ${item.itemName}`}
```

### 3. **Very Large Item Lists (100+ items)**
Navigation still works but may feel slow. To optimize:
- Implement virtual scrolling (react-virtual)
- Pagination with "Load More" button

### 4. **Complex Field Dependencies**
If adding item A automatically changes item B, focus may not behave as expected. Consider:
- Debouncing field changes
- Warning user of side effects
- Manual focus management

---

## Code Snapshot (Implementation Summary)

```javascript
// 1. Add refs and state
const itemInputRefs = useRef({});
const [focusedCell, setFocusedCell] = useState(null);

// 2. When item added via search
const addItemFromSearch = (product) => {
  let addedItemId = null;
  setInvoiceData((prev) => {
    // ... add logic ...
    addedItemId = newItem.id;
    return { ...prev, items: [...prev.items, newItem] };
  });

  // Focus Qty field
  setTimeout(() => {
    const qtyRef = itemInputRefs.current[`${addedItemId}_qty`];
    if (qtyRef) {
      qtyRef.focus();
      qtyRef.select();
    }
  }, 50);
};

// 3. Handle Tab/Enter navigation
const handleTableCellKeyDown = (e, itemId, currentField, itemIndex) => {
  const fieldOrder = ["qty", "rate", "itemDiscount", "itemDiscountAmount"];
  const currentFieldIndex = fieldOrder.indexOf(currentField);
  
  if (e.key === "Tab" || e.key === "Enter") {
    e.preventDefault();
    
    const nextFieldIndex = e.shiftKey 
      ? currentFieldIndex - 1 
      : currentFieldIndex + 1;
    
    // Logic to focus next field...
    const nextRef = itemInputRefs.current[`${itemId}_${nextField}`];
    if (nextRef) {
      nextRef.focus();
      nextRef.select();
    }
  }
};

// 4. In JSX: bind handlers to inputs
<input
  ref={(el) => {
    if (el) itemInputRefs.current[`${item.id}_qty`] = el;
  }}
  onFocus={() => setFocusedCell({ itemId: item.id, field: "qty" })}
  onKeyDown={(e) => handleTableCellKeyDown(e, item.id, "qty", idx)}
/>
```

---

## Support & Resources

- **Files Modified:** `client/src/components/sales/SalesInvoice.jsx`
- **User Guide:** `KEYBOARD_WORKFLOW_GUIDE.md` (user-facing docs)
- **This File:** Implementation details for developers
- **Testing:** See "Testing the Implementation" section above

