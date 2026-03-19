# Vendor Payment Tracking - Step-by-Step Tutorial

## Complete Workflow: From GRN to Full Settlement

---

## Part 1: Setup Phase

### Step 1.1: Add Vendor with Payment Terms

**Location:** Inventory → Vendors → New Vendor

```
1. Click [+ New Vendor] button
2. Fill Basic Info:
   └─ Name: "ABC Supplies Inc"
   └─ Email: abc@supplies.com
   └─ Phone: +1234567890
   └─ Address: 123 Main St, City
   └─ Country: Select your country

3. Click [Payment Terms] Tab
   └─ Payment Type: Select "Credit" (NOT Cash)
   └─ Credit Days: 30
   └─ Payment Terms: NET 30
   
4. Click [Save] ✅
   ✓ Vendor created
   ✓ GL Account auto-assigned: Sundry Creditors (2210)
```

**What happens behind scenes:**
```
Vendor record:
  ├─ paymentType: "Credit"
  ├─ creditDays: 30
  ├─ accountPayableId: "2210" (GL Account)
  └─ isSupplier: true
```

---

### Step 1.2: Confirm GL Mapping

The system automatically creates GL account link:

| Transaction | GL Account |
|---|---|
| Purchase from ABC Supplies | Sundry Creditors (2210) |
| Payment to ABC Supplies | Sundry Creditors (2210) |

---

## Part 2: Purchase Phase

### Step 2.1: Create GRN (Goods Receipt Note)

**Location:** Inventory → GRN → New GRN

```
1. Click [+ New GRN]
2. Select Vendor: "ABC Supplies Inc"
3. Select Supplier Invoice Date: 2026-03-15
4. Add Items:
   ├─ Item: "Widget A" 
   ├─ Qty: 100 units
   ├─ Unit Cost: 100
   ├─ Total: 10,000
   └─ [+ Add Item]

5. Additional Info:
   ├─ Payment Terms: NET 30 → Due: 2026-04-14
   └─ Shipping Cost: 500

6. Click [Save as Draft] or [Submit]
   ✓ GRN-001 created
   ✓ Total: 10,500 (including shipping)
```

**Auto-creates Purchase Invoice:**
```
Backend action:
  GRN submitted → System creates Invoice INV-001
  
Invoice Details:
  ├─ Invoice Number: INV-001
  ├─ Vendor: ABC Supplies Inc
  ├─ Date: 2026-03-15
  ├─ Amount: 10,500
  ├─ Status: Unpaid ⚠️
  ├─ Amount Paid: 0
  └─ Outstanding: 10,500
```

---

## Part 3: Payment Phase - Option A: Advance Payment

### Step 3A.1: Make Advance Payment

**Location:** Accounts → Vendor Payments → New Payment

```
1. Click [New Payment]
2. Fill Payment Form:
   
   Payment Date:      15-Mar-2026
   Pay From Account:  Bank Account 1010
   Pay To Account:    Sundry Creditors 2210 (auto-selected)
   Amount:            5,000  ← Advance amount
   Payment Method:    Bank Transfer
   Vendor:            ABC Supplies Inc
   Reference:         ADV-001
   Description:       Advance against supplies
   
3. Click [Save]
   ✓ Payment created
   ✓ Status: PENDING ⏳
   ✓ Voucher Number: PAY-001 (auto-assigned)
```

### Step 3A.2: Approve Payment

```
1. Find Payment in list: PAY-001
2. Status shows: PENDING ⏳
3. Click [Approve] button
   └─ Manager confirmation
   ✓ Status changes to: APPROVED ✓
```

### Step 3A.3: Execute Payment

```
1. Payment still shows: APPROVED ✓
2. Click [Pay] button
   └─ Confirm payment
   
3. System:
   ├─ Creates GL Entry:
   │  ├─ Debit: Sundry Creditors (2210): 5,000
   │  └─ Credit: Bank Account (1010): 5,000
   │
   ├─ Records Payment:
   │  └─ Status: PAID ✓
   │
   └─ Creates ADVANCE RECORD:
      ├─ Advance_001
      ├─ Amount: 5,000
      ├─ Available: 5,000
      ├─ Applied: 0
      └─ Status: Active 🟢

✓ Advance is now ready to apply to invoices
```

**What you see:**
```
Vendor Payments List
═════════════════════════════════════════
│ Voucher │ Date │ Method │ Amount │ Status │
├─────────┼──────┼────────┼────────┼────────┤
│ PAY-001 │ 15-Mar │ Bank │ 5,000 │ PAID ✓ │
```

---

## Part 4: Apply Advance to Invoice

### Step 4.1: Navigate to Invoice

**Location:** Inventory → Purchase Invoices → INV-001

```
Invoice Details:
┌─────────────────────────────────────┐
│ INV-001 - ABC Supplies              │
├─────────────────────────────────────┤
│ Invoice Date: 15-Mar-2026          │
│ Total: 10,500                       │
│                                     │
│ Amount Paid: 0                      │
│ Outstanding: 10,500                 │
│ Status: Unpaid                      │
│                                     │
│ [Available Advances] ▼              │
│ • Advance_001: 5,000 [Apply]       │
└─────────────────────────────────────┘
```

### Step 4.2: Apply Advance

```
1. Click [Apply] next to Advance_001
2. Dialog opens:
   
   Advance to Apply:  Advance_001
   Advance Balance:   5,000
   Apply Amount:      5,000 (pre-filled)
   
3. Click [Apply Advance]

System updates:
  ├─ Invoice:
  │  ├─ Amount Paid: 5,000 ← Updated
  │  ├─ Outstanding: 5,500
  │  └─ Status: Partial 🟡
  │
  ├─ Advance:
  │  ├─ Available: 0 ← Used up
  │  ├─ Applied: 5,000
  │  └─ Status: FullyUsed
  │
  └─ GL Entry:
     ├─ Debit: AP account: 5,000
     └─ Credit: AP prepayments: 5,000

✓ Advance successfully applied!
```

**Invoice Now Shows:**
```
┌─────────────────────────────────────┐
│ INV-001 - ABC Supplies              │
├─────────────────────────────────────┤
│ Total: 10,500                       │
│ Amount Paid: 5,000 (Advance)        │
│ Outstanding: 5,500  ← Balance       │
│ Status: Partial 🟡                  │
│                                     │
│ Payment History:                    │
│ ├─ 15-Mar: Advance Applied: 5,000  │
│ └─ [Available Advances]: None       │
└─────────────────────────────────────┘
```

---

## Part 5: Final Partial Payments

### Step 5.1: First Partial Payment (Cash)

**Location:** Accounts → Vendor Payments → New Payment

```
1. Click [New Payment]
2. Fill Form:
   
   Payment Date:      17-Mar-2026
   Pay From:          Cash Box 1005
   Pay To:            Sundry Creditors 2210
   Amount:            2,500
   Payment Method:    Cash
   Vendor:            ABC Supplies Inc
   Reference:         INV-001
   
3. Click [Save]
   ✓ Payment: PAY-002 (Status: PENDING)

4. [Approve] → Status: APPROVED ✓

5. [Pay] → Status: PAID ✓
   ├─ GL Entry posted
   └─ Advance balance: 0 (already used)
```

**Invoice Updates:**
```
Amount Paid: 7,500 (5,000 advance + 2,500 cash)
Outstanding: 3,000
Status: Partial 🟡
```

---

### Step 5.2: Final Payment (Check)

**Location:** Accounts → Vendor Payments → New Payment

```
1. [+ New Payment]
2. Fill Form:
   
   Payment Date:      20-Mar-2026
   Pay From:          Bank 1010
   Pay To:            Sundry Creditors 2210
   Amount:            3,000  ← Final balance
   Payment Method:    Cheque
   Cheque Number:     CHK-101
   Cheque Date:       20-Mar-2026
   Bank Name:         First Bank
   Reference:         INV-001
   
3. [Save] → PAY-003 (PENDING)

4. [Approve] → APPROVED ✓

5. [Pay] → PAID ✓
   └─ GL Entry: DR AP 3,000 / CR Bank 3,000
```

**Final State:**
```
┌─────────────────────────────────────┐
│ INV-001 - PAID ✅                    │
├─────────────────────────────────────┤
│ Total: 10,500                       │
│ Amount Paid: 10,500 ✓               │
│ Outstanding: 0                      │
│ Status: PAID ✅                     │
│                                     │
│ Payment History:                    │
│ ├─ 15-Mar: Advance Applied: 5,000  │
│ ├─ 17-Mar: Cash Payment: 2,500     │
│ ├─ 20-Mar: Cheque Payment: 3,000   │
│ └─ TOTAL PAID: 10,500 ✓            │
└─────────────────────────────────────┘
```

---

## Part 6: Reports & Reconciliation

### Step 6.1: Vendor Payment Report

**Location:** Reports → Vendor Payments

```
Vendor: ABC Supplies Inc
Period: March 2026

Payment Summary:
├─ Total Invoiced: 10,500
├─ Advance Paid: 5,000
├─ Cash Paid: 2,500
├─ Check Paid: 3,000
└─ TOTAL PAID: 10,500 ✓

Outstanding:
├─ 0-30 Days: 0
├─ 30-60 Days: 0
├─ 60-90 Days: 0
└─ Total Outstanding: 0 ✓

Status: FULLY PAID ✅
```

### Step 6.2: Advance Usage Report

**Location:** Reports → Advance Payments

```
Advance Summary (ABC Supplies)
═════════════════════════════════════

Advance_001:
├─ Created: 15-Mar-2026
├─ Amount: 5,000
├─ Applied to: INV-001 (5,000)
├─ Balance: 0
├─ Status: FullyUsed ✅
└─ Applied Date: 16-Mar-2026
```

### Step 6.3: GL Account Reconciliation

**Location:** Accounting → Trial Balance

```
Sundry Creditors (2210):
┌──────────────────────────────────────┐
│ Opening Balance: 0                   │
│                                      │
│ Transactions:                        │
│ ├─ GRN INV-001 (15-Mar): +10,500    │
│ ├─ Advance (15-Mar): -5,000         │
│ ├─ Payment (17-Mar): -2,500         │
│ └─ Payment (20-Mar): -3,000         │
│                                      │
│ Closing Balance: 0 ✓                │
│                                      │
│ Status: BALANCED ✅                 │
└──────────────────────────────────────┘
```

---

## Common Scenarios

### A. Multiple Invoices + One Advance

```
Invoice 1: 5,000
Invoice 2: 3,000
Advance:   6,000

Allocation:
├─ INV-1: Apply 5,000 advance → Paid ✓
├─ INV-2: Apply 1,000 advance → Outstanding 2,000
├─ Pay INV-2 cash: 2,000 → Paid ✓
└─ Advance Balance: 0
```

### B. Partial Advances

```
Advance: 10,000

Month 1: Apply 4,000 (Invoice 1)
         Apply 3,000 (Invoice 2)
         → Balance: 3,000

Month 2: Apply 3,000 (Invoice 3)
         → Balance: 0 (FullyUsed)
```

### C. Advance Reversal

```
Advance: 8,000
Applied to INV-1: 5,000
Remaining: 3,000

User needs to undo the INV-1 application:
→ Click [Reverse]
→ Advance: Back to 8,000 available
→ INV-1: Back to 5,000 outstanding
```

---

## Troubleshooting

### Issue: Cannot Apply Advance

**Error:** "Advance balance insufficient"

**Solution:**
1. Check Advance balance in [Advanced Payments] list
2. Reduce application amount
3. Or request additional advance

---

### Issue: Invoice Shows Wrong Payment Status

**Problem:** Invoice shows "Unpaid" but we paid

**Fix:**
1. Check Payment status in [Vendor Payments]
2. Must be PAID ✓ (not PENDING ⏳)
3. Ensure approval workflow completed
4. Try "Reconcile" button

---

### Issue: Advance Not Showing as Available

**Problem:** Paid advance but doesn't appear

**Fix:**
1. Verify payment status = PAID
2. Wait 5 seconds (auto-refresh)
3. Manual refresh: F5
4. Check Advance_001 exists in [Advances] list

---

## Key Screenshots Locations

```
Create Payment:
  Accounts → Vendor Payments → [+ New Payment]

Approve/Pay:
  Accounts → Vendor Payments → Find Payment → [Approve] → [Pay]

Apply Advance:
  Inventory → Purchase Invoices → Select Invoice → [Apply Advance]

View Advances:
  Accounts → Advances → Filter by Vendor

Invoice Payment Status:
  Inventory → Purchase Invoices → Select Invoice → View details

GL Reconciliation:
  Accounting → Trial Balance → Filter Sundry Creditors (2210)
```

---

## Best Practices (For Users)

✅ **DO:**
- ✅ Create advance when paying upfront
- ✅ Apply advances before making cash payments
- ✅ Always approve before marking as paid
- ✅ Check invoice balance before partial payment
- ✅ Reconcile GL accounts monthly
- ✅ Keep payment references clear (Invoice number)

❌ **DON'T:**
- ❌ Skip approval step (security risk)
- ❌ Pay more than outstanding amount
- ❌ Apply advance > invoice balance
- ❌ Cancel paid payments (reverse instead)
- ❌ Create duplicate payments
- ❌ Leave payments in PENDING status

---

## Summary for Users

### The Payment Workflow
```
┌─────────────────────────────────────────┐
│ 1. Receive GRN from Warehouse           │
│    ↓                                    │
│ 2. System Creates Invoice (Unpaid)      │
│    ↓                                    │
│ 3. Create Advance Payment (if needed)   │
│    ↓                                    │
│ 4. Approve & Execute Payment            │
│    ↓                                    │
│ 5. Apply Advance to Invoice             │
│    ↓                                    │
│ 6. Make Partial Cash Payments           │
│    ↓                                    │
│ 7. Final Settlement = Invoice PAID ✅   │
│    ↓                                    │
│ 8. GL Reconciliation Complete ✅        │
└─────────────────────────────────────────┘
```

### Key Numbers to Track
- **Invoice Outstanding** = Total - Paid amount
- **Advance Balance** = Original - Applied amount
- **Payment Pending** = PENDING (needs approval)
- **GL Balance** = Should be 0 when fully paid

---

## Need Help?

See documentation:
- **Detailed Guide:** `VENDOR_PAYMENT_TRACKING_GUIDE.md`
- **Quick Ref:** `VENDOR_PAYMENT_QUICK_REFERENCE.md`
- **Tech Details:** `VENDOR_PAYMENT_IMPLEMENTATION_PATTERNS.md`

Contact: Your ERP Administrator
