# Dual-Role Party Accounting Guide (Vendor + Customer)

## Overview
When a party acts as both **Vendor** (supplier) and **Customer**, the unified account approach handles both roles using a single GL account.

---

## Account Structure

### Account Hierarchy:
```
ASSETS (1000)
  ├── Current Assets (1100)
  │   └── Receivables (1200)
  │       ├── Sundry Debtors (1210) - Customers ONLY
  │       └── Related Parties - Receivable / Payable (1250) - DUAL ROLE
  │
LIABILITIES (2000)
  ├── Current Liabilities (2100)
  │   └── Payables (2200)
  │       ├── Sundry Creditors (2210) - Vendors ONLY
  │       └── Related Parties - Dual Role (2250) - DUAL ROLE [LINKED to 1250]
```

---

## Transaction Posting Rules

### **UNIFIED ACCOUNT APPROACH**

When Party has **BOTH isSupplier=true AND isCustomer=true**:

| Transaction Type | GL Account | Debit | Credit | Effect |
|---|---|---|---|---|
| **Purchase from Dual-Role Party** | Related Parties (2250) | ✓ | | Increases Payable |
| **Sales to Dual-Role Party** | Related Parties (1250) | ✓ | | Increases Receivable |
| **Receipt from Dual-Role Party** | Related Parties (2250) | | ✓ | Decreases Payable |
| **Payment to Dual-Role Party** | Related Parties (2250) | ✓ | | Increases/Maintains Payable |

### Account Balance Interpretation:
- **Debit Balance** = Net Receivable (they owe us)
- **Credit Balance** = Net Payable (we owe them)
- **Zero Balance** = Settled  / No transactions

---

## Journal Entry Examples

### Example 1: Purchase from Dual-Role Party (V009 - supplier+customer)
```
Date: 15-Mar-2026
Reference: GRN-2026-001

Debit  Inventory              10,000
    Credit  Related Parties (2250)      10,000
    (Purchase goods from V009 - Dual Role Vendor)
```

### Example 2: Sales to Same Party
```
Date: 16-Mar-2026
Reference: INV-2026-001

Debit  Related Parties (1250)        8,000
    Credit  Sales Revenue             8,000
    Credit  GST Payable               1,280
    (Sold goods to V009 - Dual Role Customer)
```

### Example 3: Partial Payment to Dual-Role Party
```
Date: 17-Mar-2026
Reference: CHQ-001

Debit  Related Parties (2250)  5,000
    Credit  Bank Account              5,000
    (Paid ₹5,000 to V009 against purchase)
```

### Example 4: Receipt from Dual-Role Party
```
Date: 18-Mar-2026
Reference: CHQ-002

Debit  Bank Account            7,000
    Credit  Related Parties (1250)    7,000
    (Received ₹7,000 from V009 against sales)
```

---

## Account Linking Architecture

### Data Flow:

```
VENDOR (V009)
├── isSupplier: true
├── isShipper: false
├── isCustomer: true
├── accountPayableId: ObjId_A (Sundry Creditors)
└── dualRoleAccountId: ObjId_C (Related Parties)
    │
    └─→ [UNIFIED GL ACCOUNT (2250 - Related Parties Dual Role)]
        │
        └─→ Related Receivable Link: ObjId_B (Asset 1250)
```

### Related Customer Link:
```
CUSTOMER (C001)
├── isSupplier: true
├── ledgerAccountId: ObjId_B (Sundry Debtors or Related Parties)
└── linkedDualVendorId: V009._id [if vendor with dual role exists]
```

---

## System Configuration

### Step 1: Create Account Groups (Admin Setup)
```javascript
// Account Group: Related Parties - Dual Role
{
  name: "Related Parties - Dual Role",
  code: "RP",
  level: 2,
  type: "MIXED", // Can have debit and credit balances
  accountCategory: "BALANCE_SHEET"
}
```

### Step 2: Create GL Accounts
```javascript
// Receivable side (1250)
{
  accountNumber: "1250",
  accountName: "Related Parties - Receivable",
  accountGroupId: RelatedPartiesGroupId,
  accountCategory: "BALANCE_SHEET",
  nature: "DEBIT"
}

// Payable side (2250)
{
  accountNumber: "2250",
  accountName: "Related Parties - Payable",
  accountGroupId: RelatedPartiesGroupId,
  accountCategory: "BALANCE_SHEET",
  nature: "CREDIT",
  linkedReceivableAccountId: "1250" // Cross-reference
}
```

### Step 3: Enable Dual-Role on Vendor/Customer
```
UI Checkbox: ✓ Supplier  ✓ Also a Customer
```
→ System automatically links to Related Parties account group

---

## Reporting & Reconciliation

### Trial Balance Impact:
```
Related Parties - Receivable (1250)    Debit    2,500
Related Parties - Payable (2250)             Credit  5,000
───────────────────────────────────
Net Payable Position:                         2,500
(Company owes party ₹2,500)
```

### Account Statement for Dual-Role Party:
```
Party: V009 - Dual Role Vendor
Period: Jan 2026 - Mar 2026

Date        Description          Debit      Credit    Balance
01-Jan      Opening Balance                            -
15-Mar      Purchase (GRN)      10,000              (10,000) Dr [Payable]
16-Mar      Sales (INV)                   8,000     (2,000) Dr [Payable]
17-Mar      Payment              5,000                3,000 Cr [Receivable]
18-Mar      Receipt                       7,000     (4,000) Cr [Payable]
──────────────────────────────────────────────────────
Balance as on 18-Mar:            (4,000) Cr
```

---

## Implementation Checklist

- [ ] Create Related Parties account group
- [ ] Create GL accounts for Related Parties (1250, 2250)
- [ ] Add `dualRoleAccountId` field to Vendor model
- [ ] Add `linkedDualVendorId` field to Customer model
- [ ] Update vendor controller to auto-link accounts when isCustomer=true
- [ ] Update GRN posting to use dualRoleAccountId if vendor is also customer
- [ ] Update Sales Invoice posting to use dualRoleAccountId if customer is also supplier
- [ ] Create account reconciliation reports
- [ ] Add UI to show account linking status
- [ ] Train users on dual-role balance interpretation

---

## Key Points

✅ **Single GL Account** handles both buy/sell transactions
✅ **Net Balance** shows either we owe them (payable) or they owe us (receivable)
✅ **Separate Receivable/Payable** accounts kept for easy reconciliation
✅ **Automatic Linking** when isCustomer OR isSupplier dual flags are enabled
✅ **Flexible Credit Limits** - can be managed independently

---

## Field Additions Required

### Vendor Model:
```javascript
dualRoleAccountId: ObjectId (ref: ChartOfAccounts)  // When isCustomer=true
```

### Customer Model:
```javascript
linkedDualVendorId: ObjectId (ref: Vendor)  // Cross-reference when isSupplier=true
```

### Chart of Accounts:
```javascript
isDualRoleAccount: Boolean  // Flag for reporting
linkedReceivableAccount: ObjectId // For payable side to link to receivable
linkedPayableAccount: ObjectId // For receivable side to link to payable accountCategory: "MIXED" // New category for accounts with both debit/credit nature
```

---

## Example Query for Dual-Role Balance

```javascript
// Find net position for dual-role party V009
db.journalEntries.aggregate([
  { $match: { 
      "vendorId|customerId": ObjectId("V009"),
      accountId: { $in: [ObjId_1250, ObjId_2250] }  // Related Parties accounts
  }},
  { $group: {
      _id: null,
      totalDebit: { $sum: "$debitAmount" },
      totalCredit: { $sum: "$creditAmount" }
  }},
  { $project: {
      netBalance: { $subtract: ["$totalDebit", "$totalCredit"] },
      position: { $cond: [
          { $gte: [{ $subtract: ["$totalDebit", "$totalCredit"] }, 0] },
          "PAYABLE",
          "RECEIVABLE"
      ]}
  }}
])
```

---

## Training Notes for Users

**When viewing dual-role party account:**
- Debit Balance = "They Owe Us" → Focus on collections
- Credit Balance = "We Owe Them" → Focus on payments
- Easy netoff → If partially due both ways, system automatically nets

**No Changes Needed For:**
- Pure Vendors (isSupplier=true, isCustomer=false) → Still use Sundry Creditors
- Pure Customers (isSupplier=false, isCustomer=true) → Still use Sundry Debtors
