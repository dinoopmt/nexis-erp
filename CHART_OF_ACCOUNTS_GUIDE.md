# Chart of Accounts - Enhanced UI Features

## Overview
The Chart of Accounts component now provides three comprehensive views to understand and manage your accounting structure easily.

## Features

### 1. 📊 Grouped View
This is the default view that displays all accounts organized by their account groups.

**What you see:**
- Account groups with headers showing:
  - Group name (e.g., "Current Assets")
  - Group code (e.g., "AG001")
  - Account type (ASSET, LIABILITY, EQUITY, INCOME, EXPENSE)
  - Natural balance side (DEBIT/CREDIT)
  - Description
  - Number of accounts in the group

- For each group, a detailed table showing:
  - Account Number (e.g., 1010)
  - Account Name (e.g., "Cash in Hand")
  - Description
  - Current Balance
  - Status badges (Active/Inactive, Bank indicator)
  - Edit and Delete buttons

**Best for:** Understanding the overall structure and seeing accounts grouped by category

---

### 2. 📋 List View
A comprehensive table listing all accounts with full details.

**What you see:**
- Complete table with columns:
  - Account Number
  - Account Name
  - Account Group (with badge)
  - Description
  - Opening Balance
  - Current Balance
  - Active/Inactive Status
  - Action buttons (Edit/Delete)

**Features:**
- Search by account number or name
- Filter by account group
- Filter by account type (bank/non-bank)
- Sortable data

**Best for:** Quick lookups and detailed account information

---

### 3. 📈 Summary View
Strategic overview with statistics and analytics.

**Key Statistics Section:**
- Total Accounts count
- Active Accounts count
- Bank Accounts count
- Total Account Groups count

**Account Groups Summary:**
Grid view showing for each group:
- Group name and code
- Account type (color-coded)
- Number of accounts
- Total balance for all accounts in group
- Count of active accounts

**Accounts by Type:**
Quick breakdown showing:
- ASSET: Number of accounts
- LIABILITY: Number of accounts
- EQUITY: Number of accounts
- INCOME: Number of accounts
- EXPENSE: Number of accounts

**Color Coding:**
- Blue: Assets
- Red: Liabilities
- Green: Equity
- Purple: Income
- Orange: Expenses

**Best for:** High-level overview and quick statistics

---

## Data Organization

### Account Structure
```
Current Assets (AG001) - ASSET
├── 1010 - Cash in Hand
├── 1020 - Cash at Bank [BANK ACCOUNT]
├── 1030 - Accounts Receivable
├── 1040 - Inventory
└── 1050 - Prepaid Expenses

Fixed Assets (AG002) - ASSET
├── 1110 - Property, Plant & Equipment
├── 1120 - Accumulated Depreciation
└── 1130 - Intangible Assets

... and 8 more groups
```

### Account Types
- **34 Total Accounts** across **10 Account Groups**
- **1 Bank Account** (Cash at Bank - 1020)
- **All accounts start as Active**

---

## Search & Filter Features

All views support:
- **Search:** Find accounts by number or name
- **Group Filter:** Show only accounts from selected group
- **Bank Filter:** Show bank accounts only or exclude them

---

## Quick Actions

From any view, you can:
- **Add Account:** Click "+ Add Account" button
  - Opens form for creating new account
  - Must select account group
  - Optional: Set opening balance, bank details
  
- **Edit Account:** Click "Edit" on any account
  - Opens form with current data
  - Account number cannot be changed (unique identifier)
  - All other fields are editable
  
- **Delete Account:** Click "Delete" on any account
  - Soft delete (data is preserved)
  - Marks account as deleted

---

## Example Usage Scenarios

### Scenario 1: "I want to see all my assets"
1. Go to **Grouped View**
2. Look for "Current Assets" and "Fixed Assets" sections
3. View all asset accounts with their balances

### Scenario 2: "What's my cash account number?"
1. Go to **List View**
2. Search for "Cash"
3. Find account 1010 or 1020 immediately

### Scenario 3: "How many accounts do I have by type?"
1. Go to **Summary View**
2. Check "Accounts by Type" section
3. See quick breakdown of all account types

### Scenario 4: "What's the total balance in my Revenue group?"
1. Go to **Summary View**
2. Look for "Revenue" in "Account Groups Summary"
3. See total balance immediately

---

## Default Chart of Accounts Data

### Asset Accounts (1000-1200)
- 1010: Cash in Hand
- 1020: Cash at Bank (Bank Account)
- 1030: Accounts Receivable
- 1040: Inventory
- 1050: Prepaid Expenses
- 1110: Property, Plant & Equipment
- 1120: Accumulated Depreciation
- 1130: Intangible Assets

### Liability Accounts (2000-2200)
- 2010: Accounts Payable
- 2020: Short-term Borrowing
- 2030: Accrued Expenses
- 2040: Tax Payable
- 2110: Long-term Debt
- 2120: Deferred Tax Liability

### Equity Accounts (3000-3100)
- 3010: Capital Stock
- 3020: Retained Earnings
- 3030: Drawings

### Income Accounts (4000-4100)
- 4010: Sales Revenue
- 4020: Service Revenue
- 4030: Other Income

### Expense Accounts (5000-5400)
- 5010: Cost of Goods Sold
- 5020: Fuel & Utilities
- 5030: Repairs & Maintenance
- 5040: Transportation
- 5110: Salaries & Wages
- 5120: Office Supplies
- 5130: Professional Services
- 5140: Depreciation Expense
- 5210: Advertising & Marketing
- 5220: Sales Commissions
- 5230: Trade Discounts
- 5310: Interest Expense
- 5320: Bank Charges
- 5330: Currency Exchange Loss

---

## Tips & Best Practices

1. **Use Grouped View** for initial training and understanding the structure
2. **Use List View** when searching for specific accounts
3. **Use Summary View** for executive reporting and quick overviews
4. **Account Numbers** follow a pattern:
   - 1xxx = Assets
   - 2xxx = Liabilities
   - 3xxx = Equity
   - 4xxx = Income
   - 5xxx = Expenses

5. All balances are shown in your currency units (smallest denomination × 100)

---

## Technical Notes

- Bank accounts show a special badge 🏦
- Color-coded account types for easy identification
- Responsive design works on mobile, tablet, and desktop
- Real-time search across all fields
- Soft delete preserves historical data
