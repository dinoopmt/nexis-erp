# Keyboard Shortcut Cheat Sheet

## Quick Reference

### Main Workflow
```
Type Item → Enter → Qty → Tab → Price → Tab → Disc% → Tab → DiscAmt → Tab → Next Item
```

### Keyboard Shortcuts

| Key | In Search Box | In Table Field |
|-----|---|---|
| **Tab** | Next item ↓ | Next field → |
| **Shift+Tab** | - | Previous field ← |
| **Enter** | Add item | Next field → |
| **Escape** | Close dropdown | Go to Search |
| **↓/↑** | Navigate dropdown | - |

---

## Visual Flow Chart

```
START
  ↓
[Search Box] ← Focus here first
  ↓
Type item name/code/barcode
  ↓
Press ENTER
  ↓
[Item Added] ✓
  ↓
[Qty Field] ← Auto-focused (text selected)
  ↓
Edit quantity → Press TAB
  ↓
[Price Field] ← Now focused
  ↓
Edit price → Press TAB
  ↓
[Discount %] ← Now focused
  ↓
Edit discount % → Press TAB
  ↓
[Discount Amt] ← Now focused
  ↓
Edit amount → Press TAB
  ↓
IF more items? YES → [Next Item's Qty]
              NO  → [Search Box]
```

---

## Common Tasks

### Add One Item
```
Type name → Enter → 5 TABs → Search Box
(6 keystrokes total)
```

### Add Three Items
```
Item 1: Name → Enter → Edit Qty → TAB → Edit Price → TAB → Edit Disc% → TAB → Edit DiscAmt
Item 2: (same pattern)
Item 3: (same pattern)
Done: After Item 3 DiscAmt → TAB → Back in Search Box
```

### Edit Field & Continue
```
In Qty field:
  Clear current value (already selected)
  Type new value
  Press TAB → moves to Price
```

### Go Back One Field
```
In Price field:
  Press SHIFT+TAB → goes back to Qty
  Edit Qty again
  Press TAB → back to Price
```

### Return to Search
```
From any table field:
  Press ESCAPE → Focus returns to Search Box
  OR
Press TAB from last field (DiscAmt) of last item → Search Box
```

---

## Field Order (Left to Right)

1. Qty (Quantity)
2. Price (Rate)
3. Disc% (Discount Percent)
4. DiscAmt (Discount Amount)

Then: → Next Item's Qty OR ← Back to Search Box

---

## Status Indicators

| Indicator | Meaning |
|-----------|---------|
| 🔵 Blue ring around field | This field is focused |
| 📝 Highlighted text | Text selected, ready to replace |
| ✓ Green "Added" message | Item successfully added |
| 📋 Item count "5 items" | Shows total items in invoice |

---

## Troubleshooting Quick Fixes

| Problem | Fix |
|---------|-----|
| Tab doesn't work | Make sure you're in editable field (Qty, Price, Disc%, DiscAmt) |
| Focus went to wrong field | Press TAB again to continue, or SHIFT+TAB to go back |
| Can't find Search Box | Press ESCAPE from any field, or TAB from last item's last field |
| Text not auto-selected | Click field to select, or use Ctrl+A |
| Dropdown still showing | Press ESCAPE to close |

---

## Pro Tips

💡 **Tip 1:** Search auto-completes
- Type "Pro" → shows "Product ABC"
- Press Enter → adds it immediately
- No menu clicking needed

💡 **Tip 2:** Zero-Discount Skip
- Press TAB through Discount % and DiscAmt even if 0
- Only takes 1 keypress per field

💡 **Tip 3:** Numeric Keypad
- Use numeric keypad for quantities
- Decimal point for prices
- Much faster than arrow keys

💡 **Tip 4:** Bulk Add Multiple Items
- Build your list rapidly
- Save/submit once at the end
- No need to wait between items

💡 **Tip 5:** Ctrl+Z Undo
- Delete item by mistake? Use Ctrl+Z
- Most recent changes auto-save

---

## Browser Support

✅ Chrome, Firefox, Safari, Edge
⚠️ IE 11 (limited)
⚠️ Mobile on-screen keyboard (use physical keyboard)

---

## Time Comparison

### Mouse-Based (Old Way)
```
1. Click Search Box
2. Type "Product ABC"
3. Click Add Button
4. Click Qty Cell
5. Delete value
6. Type "5"
7. Click Price Cell
8. Delete value
9. Type "99.99"
10. Click Discount Cell
... more clicks ...
TOTAL: 15+ clicks per item
TIME: ~45 seconds per item
```

### Keyboard-Based (New Way)
```
1. Type "Product ABC"
2. Press Enter (item added, Qty focused)
3. Type "5"
4. Press Tab (Price focused)
5. Type "99.99"
6. Press Tab (Discount % focused)
... press Tab between fields ...
TOTAL: 6 keypresses per item
TIME: ~15 seconds per item
```

**Savings: 60% faster! ⚡**

---

## Printable Reference

Save this for your desk:

```
╔═══════════════════════════════════════════╗
║  SALES INVOICE KEYBOARD WORKFLOW          ║
╚═══════════════════════════════════════════╝

TYPE ITEM → ENTER → EDIT QTY → 
TAB → EDIT PRICE → TAB → 
EDIT DISC% → TAB → EDIT DISCAMT → 
TAB → NEXT ITEM OR SEARCH

KEY SHORTCUTS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Tab        → Next field / next item
Shift+Tab  → Previous field
Enter      → Next field (same as Tab)
Escape     → Return to Search Box
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

FIELD ORDER:
1. Qty
2. Price
3. Disc%
4. DiscAmt

╔═══════════════════════════════════════════╗
║  50% FASTER DATA ENTRY                    ║
╚═══════════════════════════════════════════╝
```

---

## Questions?

1. **Workflow not working?** Check browser console (F12)
2. **Fields not focusing?** Try refreshing page
3. **Need help?** Contact dev team with:
   - Browser name & version
   - Error message (if any)
   - Exact steps to reproduce

---

**Version:** 1.0  
**Last Updated:** March 1, 2026  
**Status:** ✅ Active

