# Chart of Accounts Data Seeder

This seeder initializes the database with a standard chart of accounts structure including account groups and default accounts.

## Default Chart of Accounts Structure

### Account Groups (10 Groups)
- **Current Assets** (AG001) - Cash, receivables, inventory, prepaid expenses
- **Fixed Assets** (AG002) - Property, equipment, intangible assets
- **Current Liabilities** (AG003) - Payables, short-term debt, accrued expenses
- **Long-term Liabilities** (AG004) - Long-term debt, deferred taxes
- **Equity** (AG005) - Capital stock, retained earnings, drawings
- **Revenue** (AG006) - Sales revenue, service revenue, other income
- **Operating Expenses** (AG007) - COGS, utilities, repairs, transportation
- **Administrative Expenses** (AG008) - Salaries, office supplies, depreciation
- **Selling Expenses** (AG009) - Advertising, commissions, discounts
- **Finance Expenses** (AG010) - Interest, bank charges, exchange losses

### Chart of Accounts (38 Accounts)
Each account includes:
- Unique account number (e.g., 1010, 4020)
- Account name
- Account group
- Description
- Opening and current balance
- Active/Inactive status
- Bank flag (for bank accounts)

## How to Run

### Option 1: Seed Chart of Accounts Only
```bash
npm run seed:accounts
```

### Option 2: Seed Users Only
```bash
npm run seed:users
```

### Option 3: Seed Sequences Only
```bash
npm run seed:sequences
```

### Option 4: Seed Everything (Users + Chart of Accounts + Sequences)
```bash
npm run seed:all
```

## Features

✅ **Idempotent** - Only seeds if no data exists (won't overwrite existing data)
✅ **Standard Accounting Structure** - Follows IFRS/GAAP guidelines
✅ **Complete Account Types** - Assets, Liabilities, Equity, Income, Expenses
✅ **Bank Account Support** - Includes bank account configuration
✅ **Error Handling** - Proper error messages and logging
✅ **Database Validation** - Uses Mongoose models for validation
✅ **Auto-Sequence Generation** - Initializes number sequences for all modules

## Sequence Initialization

The sequence seeder initializes the auto-number generation counters for various modules, each starting at 0 for the current financial year:

- **Sales Invoice** (SI) - Format: SI/YYYY-YY/0001
- **Product Code** (PC) - Format: PC/YYYY-YY/0001
- **Purchase Order** (PO) - Format: PO/YYYY-YY/0001
- **Delivery Note** (DN) - Format: DN/YYYY-YY/0001
- **Sales Order** (SO) - Format: SO/YYYY-YY/0001
- **Sales Return** (SR) - Format: SR/YYYY-YY/0001
- **Journal Entry** (JE) - Format: JE/YYYY-YY/0001
- **Payment** (PMT) - Format: PMT/YYYY-YY/0001
- **Receipt** (RCP) - Format: RCP/YYYY-YY/0001

Each sequence is automatically associated with the current financial year and can be extended for additional modules as needed.

## Sample Accounts Created

### Assets
- Cash in Hand (1010)
- Cash at Bank (1020) - Bank account
- Accounts Receivable (1030)
- Inventory (1040)
- PP&E (1110)

### Liabilities
- Accounts Payable (2010)
- Short-term Borrowing (2020)
- Long-term Debt (2110)

### Equity
- Capital Stock (3010)
- Retained Earnings (3020)

### Income
- Sales Revenue (4010)
- Service Revenue (4020)

### Expenses
- COGS (5010)
- Salaries & Wages (5110)
- Advertising & Marketing (5210)
- Interest Expense (5310)

## Notes

- All monetary values are stored in the smallest currency unit (filas/cents) × 100
- Account numbers follow a logical structure: First digit indicates account type
- All accounts start with zero balance (opening and current)
- All accounts are created in active state
- Bank accounts include bank name and account type information

## Troubleshooting

If seeding fails:
1. Check `.env` file has valid `MONGO_URI`
2. Ensure MongoDB is running
3. Clear the database first if needed: `db.dropDatabase()` in MongoDB
4. Run the seeder again: `npm run seed:accounts`

For detailed logs, check console output during execution.
