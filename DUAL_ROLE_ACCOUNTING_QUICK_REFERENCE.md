# Quick Reference: Dual-Role Party Accounting

## What is a Dual-Role Party?

A **Dual-Role Party** is a company/vendor/customer that both:
- **Supplies goods to you** (acts as Vendor/Supplier)
- **Buys goods from you** (acts as Customer)

Example: A distributor who supplies inventory but also buys slow-moving stock back.

---

## Account Structure

```
┌─────────────────────────────────────────┐
│  DUAL-ROLE PARTY ACCOUNTING ACCOUNTS    │
├─────────────────────────────────────────┤
│                                         │
│  Payable Account (2250)                 │
│  "Related Parties - Payable"            │
│  └─ What we OWE them (credit balance)   │
│                                         │
│  Receivable Account (1250)              │
│  "Related Parties - Receivable"         │
│  └─ What they OWE us (debit balance)    │
│                                         │
└─────────────────────────────────────────┘
```

---

## How Transactions Flow

### Scenario: V009 (Vendor who also buys from us)

**Transaction 1: Purchase from V009**
```
↓ GRN Created - Purchase ₹10,000 goods
│
Debit:  Inventory               ₹10,000
Credit: Related Parties (2250)           ₹10,000
│
Result: Account balance = ₹10,000 PAYABLE
```

**Transaction 2: Sales to V009**
```
↓ Invoice Created - Sold ₹8,000 goods
│
Debit:  Related Parties (1250)   ₹8,000
Credit: Sales Revenue                    ₹8,000
│
Result: Net balance = ₹2,000 PAYABLE
```

**Transaction 3: Payment to V009**
```
↓ Check issued for ₹5,000
│
Debit:  Related Parties (2250)   ₹5,000
Credit: Bank Account                     ₹5,000
│
Result: Net balance = (₹3,000) RECEIVABLE [They now owe us]
```

---

## Reading the Balance Sheet

### Trial Balance Line Items:

```
Related Parties - Receivable (1250)    Debit:  2,000
Related Parties - Payable (2250)       Credit: 5,000
                                       ───────────────
Net Payable Position:                         3,000
```

**Interpretation:**
- **Receivable side (1250) = ₹2,000 Debit** → We expect to receive ₹2,000
- **Payable side (2250) = ₹5,000 Credit** → We owe ₹5,000
- **Net = ₹3,000 Payable** → We OWE them (after netting)

---

## Bank Reconciliation Example

### Party: V009 - Multi-Role Vendor/Customer
**Period: January - March 2026**

| Date | Description | DR/CR | Amount | Balance | Interpretation |
|------|---|---|---|---|---|
| 1-Jan | Opening Balance | | - | 0 | Clean slate |
| 15-Jan | Purchase GRN-001 | DR (Payable ↑) | 10,000 | 10,000 P | We owe them |
| 20-Jan | Sales INV-001 | CR (Rec ↓) | (8,000) | 2,000 P | Still payable |
| 28-Jan | Payment CHQ-001 | CR (Payable ↓) | (5,000) | (3,000) R | They owe us now |
| 10-Feb | Bank Receipt | DR (Rec ↓) | (7,000) | 4,000 R | Strong receivable |
| 25-Feb | Sales INV-002 | CR (Rec ↓) | (3,000) | 1,000 R | Small receivable |
| 15-Mar | Payment CHQ-002 | CR (Payable ↓) | (1,500) | (500) R | Tiny receivable |

**Final Balance: (500) Receivable** = They owe us ₹500

---

## System Behavior

### Automatic Actions:

✅ **When you enable "Also a Customer" on a Vendor:**
- System auto-links to Related Parties account (2250)
- Creates separate receivable account (1250) [if not exists]
- Stores account link in: dualRoleAccountId field

✅ **When you create a Customer who can Supply:**
- System checks for linked Vendor with dual role
- If exists, uses same Related Parties account
- If not, creates independent Related Parties setup

✅ **Transaction Posting Rules:**
- **GRN Posted** → Uses dualRoleAccountId instead of Sundry Creditors
- **Invoice Posted** → Uses Related Parties Receivable (1250)
- **Payment Made** → Debits Related Parties Payable (2250)
- **Receipt Taken** → Credits Related Parties Receivable (1250)

---

## Common Issues & Resolution

### Issue 1: Balance shows both DEBIT and CREDIT
**Solution:** This is normal! Use NET balance.
- Debit = receivable side
- Credit = payable side  
- NET = who owes whom

### Issue 2: Account not linked when enabled "Also a Customer"
**Solution:** 
- Check if Related Parties account group exists
- Create it if missing: Chart of Accounts → Setup → Create Group "Related Parties"
- Re-save vendor to trigger account linking

### Issue 3: Confusion about which account to use
**Solution:** System handles automatically:
- Purchases → Related Parties Payable (2250)
- Sales → Related Parties Receivable (1250)
- You don't need to select manually

---

## Reporting

### Generate Report: Dual-Role Party Statement

```javascript
// Show all transactions for party V009
Vendor: V009
Name: Multi-Purpose Vendor  
Country: UAE
Status: Active

Role: ✓ Supplier  ✓ Customer  ✓ Shipper
Account: Related Parties (Unified)

Transactions (Jan-Mar 2026):
─────────────────────────────────
Date      | Ref    | Amount | Type   | Bal
15-Jan    | GRN-001| 10,000 | Debit  | 10,000 P
20-Jan    | INV-001| (8,000)| Credit | 2,000 P  
28-Jan    | CHQ-001| (5,000)| Credit | (3,000) R
...
─────────────────────────────────
Final Balance: 500 R (Receivable)
```

---

## Setup Checklist

- [ ] Create "Related Parties" Account Group
- [ ] Create GL Account 2250 - Related Parties Payable
- [ ] Create GL Account 1250 - Related Parties Receivable
- [ ] Link receivable to payable (cross-reference)
- [ ] Test with vendor having both supplier+customer roles
- [ ] Generate trial balance report
- [ ] Train users on balance interpretation
- [ ] Create reconciliation procedure

---

## Key Advantages

✅ **Single Account** = Less GL clutter
✅ **Automatic Netting** = Easy to see net exposure
✅ **One Statement** = No need for two party statements  
✅ **Natural Offset** = Payables and receivables offset automatically
✅ **Clean Trial Balance** = One line per party type, not two

---

## Training Takeaway

**Remember:**
- Dual-Role Account = "Settlement Account"
- Debit = Receivable (they owe us)
- Credit = Payable (we owe them)
- **USE THE NET BALANCE** for actual exposure
