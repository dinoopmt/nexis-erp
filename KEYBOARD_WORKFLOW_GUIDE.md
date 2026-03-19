# Sales Invoice Keyboard Workflow Guide

## Quick Navigation Flow

Fast data entry through keyboard-driven workflow for adding items and editing fields:

```
SEARCH BOX (Item Name/Code/Barcode)
    ↓ (Press Enter)
    ↓
QUANTITY Field
    ↓ (Press Tab or Enter)
    ↓
PRICE Field
    ↓ (Press Tab or Enter)
    ↓
DISCOUNT % Field
    ↓ (Press Tab or Enter)
    ↓
DISCOUNT AMOUNT Field
    ↓ (Press Tab or Enter)
    ↓
NEXT ITEM's QUANTITY (if more items)
OR
SEARCH BOX (if last item)
```

---

## Step-by-Step Workflow

### 1. **Start: Item Search Box**
```
Focus is here by default when entering invoice form
Type item name, code, or barcode:
  • "Product ABC"
  • "ITEM001"
  • "123456789"
```

### 2. **Select Item (Press Enter)**
```
Search: "Product ABC"
           ↓ (Press Enter)
Item added to table
Focus jumps to: Qty field of newly added item
Qty field is auto-selected (blue highlight, text selected)
```

### 3. **Edit Quantity (Press Tab or Enter)**
```
Qty: [1] ← Cursor here
        ↓ (Press Tab or Enter to move next)
Next field: Price
Item's quantity updated immediately
```

### 4. **Edit Price (Press Tab or Enter)**
```
Price: [99.99] ← Cursor here
            ↓ (Press Tab or Enter to move next)
Next field: Discount %
Price updated immediately
```

### 5. **Edit Discount % (Press Tab or Enter)**
```
Disc%: [10] ← Cursor here
         ↓ (Press Tab or Enter to move next)
Next field: Discount Amount
Discount % calculated immediately
```

### 6. **Edit Discount Amount (Press Tab or Enter)**
```
DiscAmt: [50.00] ← Cursor here
              ↓ (Press Tab or Enter)
              ↓
Next Item's Qty OR Search Box (if last item)
```

### 7. **Multiple Items**
```
After completing Item 1:
  - Tab moves to Item 2's Qty field
  - Continue same workflow for Item 2
  
After last item's DiscAmt:
  - Tab returns focus to Search Box
  - Ready to add next item immediately
```

---

## Keyboard Shortcuts

### Tab Navigation
| Key | Action |
|-----|--------|
| **Tab** | Move to next field |
| **Shift+Tab** | Move to previous field |
| **Enter** | Move to next field (same as Tab) |

### In Search Box
| Key | Action |
|-----|--------|
| **Tab/↓** | Navigate dropdown items |
| **Enter** | Add selected item to table and focus Qty |
| **Escape** | Close dropdown |

### In Table Fields
| Key | Action |
|-----|--------|
| **Tab** | Next field (Qty → Price → Disc% → DiscAmt) |
| **Shift+Tab** | Previous field (reverse) |
| **Enter** | Same as Tab (next field) |
| **Escape** | Return to Search Box |

---

## Complete Example: Adding 3 Items

### Item 1: Add "Product ABC"
```
[Search Box] Type "Product ABC"
             ↓ (Press Enter)
[Qty] "1" (auto-focused, highlighted)
      ↓ Type "5" (clears old value)
[Price] "99.99" (auto-focused)
        ↓ (Press Tab)
[Disc%] "10" (focused)
        ↓ (Press Tab)
[DiscAmt] "0" (focused)
          ↓ (Press Tab)
[Search Box] Ready for Item 2 (back here)
```

### Item 2: Add "Item XYZ"
```
[Search Box] Type "Item XYZ"
             ↓ (Press Enter)
[Item 2 Qty] "1" (focused)
             ↓ Type "3"
[Item 2 Price] "50.00"
               ↓ (Press Tab)
[Item 2 Disc%] "5"
               └─ Continue...
```

### Item 3: Add "Barcode 789"
```
[Search Box] Type "789"
             ↓ (Press Enter)
[Item 3 Qty] "1" (focused)
             ↓ Type "10"
[Item 3 Price] "25.99"
               └─ Continue...
               (After DiscAmt)
               ↓ (Press Tab)
[Search Box] Ready to add more OR Save Invoice
```

---

## Features Enabled by This Workflow

### ✅ Fast Data Entry
- No mouse clicking needed
- Keyboard-only navigation
- Estimated 50% faster than mouse-based entry

### ✅ Auto-Focus Management
- Focus automatically moves to next field
- Text is pre-selected for easy replacement
- After last item, returns to search for next item

### ✅ Tab Order (Left to Right)
- **Item Row 1**: Qty → Price → Disc% → DiscAmt
- **Item Row 2**: Qty → Price → Disc% → DiscAmt
- **Search Box**: Loop back for next item

### ✅ Shift+Tab (Reverse Navigation)
- Move backwards through fields
- Shift+Tab from first field goes to previous item's last field
- Good for correcting mistakes

### ✅ Circular Navigation
- Last item's DiscAmt + Tab = Search Box
- Search Box + Tab goes down to items
- Shift+Tab from first item's Qty = previous item's DiscAmt

---

## Tips for Power Users

### Tip 1: Search & Add in One Motion
```
Type "ABC" → Dropdown appears
Press Enter → Item added, focus on Qty
No menu selection needed if only 1 match
```

### Tip 2: Multi-Item Rapid Entry
```
Item 1: Qty → Tab → Price → Tab → Disc% → Tab → DiscAmt → Tab
        ↓
Item 2: Qty → Tab → Price → Tab → Disc% → Tab → DiscAmt → Tab
        ↓
Item 3: Qty → Tab → Price → Tab → Disc% → Tab → DiscAmt → Tab
        ↓
Search Box (back here, ready for Item 4)
```

### Tip 3: Field Values Auto-Clear & Select
```
When you focus a field, its current value is selected
Just start typing to replace it:
  - Click Qty field → value "5" is selected
  - Type "10" → replaces "5" instantly
  - No need to clear first
```

### Tip 4: Quick Discount Skip
```
No discount? 
- Press Tab in Disc% field (leave as 0)
- Skip directly to DiscAmt
- Press Tab again to go to next item
```

### Tip 5: Escape to Start Over
```
Made a mistake?
- Press Escape in any field
- Focus returns to Search Box
- Clear search and start next item
```

---

## Field Focus Visual Indicators

When a field is focused, you'll see:
- ✨ **Blue ring** around the field (focus-ring-blue-500)
- 📝 **Text highlighted** and ready to replace
- 🎯 **Cursor visible** in the input

Example:
```
┌─────────────┐
│  Qty: [5] ✓ │ ← Has blue ring, text pre-selected
└─────────────┘
```

---

## Troubleshooting

### Issue: Tab doesn't move to next field
**Solution:** Make sure you're in a table input field
- Valid: Qty, Price, Disc%, DiscAmt
- Invalid: Item Name, Code, VAT% (display-only)

### Issue: Focus jumps to wrong field
**Solution:** This is normal when adding items
- When you add an item via Enter, focus jumps to its Qty field
- This is intentional for efficient entry

### Issue: Shift+Tab goes to previous item instead of previous field
**Solution:** When at first field of an item:
- Shift+Tab goes to last field of previous item (correct)
- This allows backwards navigation across items

### Issue: Can't get back to Search Box
**Solution:** Press Tab after last field (DiscAmt) of last item
- Cycles focus back to Search Box
- Or press Escape in any field

---

## Mobile/Touch Device Support

**Keyboard navigation requires physical keyboard:**
- ✅ Works: Desktop keyboard, Bluetooth keyboard
- ✅ Works: Numeric keypad for fast number entry
- ⚠️ Limited: Mobile on-screen keyboard (focus still works, but Tab key may not appear)

For mobile users:
- Touch fields directly to focus
- Use device's keyboard for input
- Tab navigation will work with Bluetooth keyboard

---

## Accessibility Features

- ✅ **Tab index management**: Fields navigate in logical order
- ✅ **Focus indicators**: Clear visual feedback (blue ring)
- ✅ **Text selection**: Auto-selected for easy replacement
- ✅ **Keyboard only**: No mouse required
- ✅ **ARIA labels**: (If screen reader support needed, contact dev)

---

## Performance Notes

- Refs stored efficiently: `itemInputRefs: {itemId_fieldName: ref}`
- Focus state tracked: Single `focusedCell` state object
- No memory leaks: Refs cleaned when items deleted
- Minimal re-renders: Focus changes don't re-render whole table

---

## Keyboard Workflow Implementation

### Backend: No Changes Needed
- All field handling on frontend
- API saves data immediately on change
- Server validates input

### Frontend: React Hooks Used
```javascript
// State tracking
const [focusedCell, setFocusedCell] = useState(null);
const itemInputRefs = useRef({});

// When Tab/Enter pressed in a field
handleTableCellKeyDown(event, itemId, currentField, rowIndex)
  ↓
Calculates next field
  ↓
Focuses next field input
  ↓
Auto-selects text for editing

// When item added via Search Enter
addItemFromSearch(product)
  ↓
Item added to table
  ↓
setTimeout focuses Qty field
  ↓
User sees selected text ready to edit
```

---

## Browser Compatibility

| Browser | Support |
|---------|---------|
| Chrome | ✅ Full support |
| Firefox | ✅ Full support |
| Safari | ✅ Full support |
| Edge | ✅ Full support |
| IE 11 | ⚠️ Limited (no Refs) |

---

## Summary

**Before (Mouse-based):**
- Click search box
- Type item
- Click Add button
- Click Qty cell
- Edit quantity
- Click Price cell
- Edit price
- ... 10+ clicks total per item

**After (Keyboard workflow):**
- Type item name (search auto-focuses)
- Press Enter (item added, Qty focused)
- Type quantity
- Press Tab (Price focused)
- Type price
- Press Tab (Disc% focused)
- ... 5 keypresses total per item
- **50% fewer actions needed** ⚡

---

## Questions?

For issues with keyboard navigation:
1. Check browser console (F12) for errors
2. Verify you're in editable fields (Qty, Price, Disc%, DiscAmt)
3. Try refreshing the page if focus behaves oddly
4. Contact dev team if arrows/tab don't work as expected

