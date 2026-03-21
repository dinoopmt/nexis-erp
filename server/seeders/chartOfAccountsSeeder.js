import connectDB from "../db/db.js";
import AccountGroup from "../Models/AccountGroup.js";
import ChartOfAccounts from "../Models/ChartOfAccounts.js";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "..", ".env") });

const seedChartOfAccounts = async () => {
  await connectDB();

  try {
    // Check if data already exists
    const existingGroups = await AccountGroup.countDocuments();
    const existingAccounts = await ChartOfAccounts.countDocuments();

    if (existingGroups > 0 || existingAccounts > 0) {
      console.log("Chart of Accounts data already exists. Skipping seeding.");
      console.log("To reseed, delete existing data first.");
      return;
    }

    console.log("🏢 Creating Corporate-Level 3-Tier Chart of Accounts...\n");

    // ═══════════════════════════════════════════════════════════════════
    // LEVEL 1: MAIN GROUPS (5 Primary Account Types) - 6-digit codes
    // Format: X00000 (1st digit = main type)
    // allowPosting: false (cannot post to group accounts)
    // ═══════════════════════════════════════════════════════════════════
    const mainGroups = [
      {
        code: "100000",
        name: "ASSETS",
        type: "ASSET",
        nature: "DEBIT",
        accountCategory: "BALANCE_SHEET",
        level: 1,
        sortOrder: 1,
        allowPosting: false,
        description: "Resources owned by the company"
      },
      {
        code: "200000",
        name: "LIABILITIES",
        type: "LIABILITY",
        nature: "CREDIT",
        accountCategory: "BALANCE_SHEET",
        level: 1,
        sortOrder: 2,
        allowPosting: false,
        description: "Obligations owed to external parties"
      },
      {
        code: "300000",
        name: "EQUITY",
        type: "EQUITY",
        nature: "CREDIT",
        accountCategory: "BALANCE_SHEET",
        level: 1,
        sortOrder: 3,
        allowPosting: false,
        description: "Owner's stake in the business"
      },
      {
        code: "400000",
        name: "INCOME",
        type: "INCOME",
        nature: "CREDIT",
        accountCategory: "PROFIT_LOSS",
        level: 1,
        sortOrder: 4,
        allowPosting: false,
        description: "Revenue from business operations"
      },
      {
        code: "500000",
        name: "EXPENSES",
        type: "EXPENSE",
        nature: "DEBIT",
        accountCategory: "PROFIT_LOSS",
        level: 1,
        sortOrder: 5,
        allowPosting: false,
        description: "Costs incurred in business operations"
      }
    ];

    const savedMainGroups = await AccountGroup.insertMany(mainGroups);
    console.log(`✓ Level 1: Created ${savedMainGroups.length} Main Groups`);

    // Create map for parent reference
    const mainGroupMap = {};
    savedMainGroups.forEach(g => {
      mainGroupMap[g.code] = g._id;
    });

    // ═══════════════════════════════════════════════════════════════════
    // LEVEL 2: SUB GROUPS (Corporate-Level Categories) - 6-digit codes
    // Format: XX0000 (1st digit = main type, 2nd digit = sub group)
    // allowPosting: false (cannot post to group accounts)
    // ═══════════════════════════════════════════════════════════════════
    const subGroups = [
      // ─────────────────────── ASSET SUB-GROUPS ───────────────────────
      {
        code: "110000",
        name: "CURRENT ASSETS",
        type: "ASSET",
        nature: "DEBIT",
        accountCategory: "BALANCE_SHEET",
        level: 2,
        parentGroupId: mainGroupMap["100000"],
        sortOrder: 1,
        allowPosting: false,
        description: "Assets convertible to cash within one year"
      },
      {
        code: "120000",
        name: "BANK ACCOUNTS",
        type: "ASSET",
        nature: "DEBIT",
        accountCategory: "BALANCE_SHEET",
        level: 2,
        parentGroupId: mainGroupMap["100000"],
        sortOrder: 2,
        allowPosting: false,
        description: "Cash held in bank accounts"
      },
      {
        code: "130000",
        name: "RECEIVABLES",
        type: "ASSET",
        nature: "DEBIT",
        accountCategory: "BALANCE_SHEET",
        level: 2,
        parentGroupId: mainGroupMap["100000"],
        sortOrder: 3,
        allowPosting: false,
        description: "Amounts due from customers and debtors"
      },
      {
        code: "140000",
        name: "INVENTORY",
        type: "ASSET",
        nature: "DEBIT",
        accountCategory: "BALANCE_SHEET",
        level: 2,
        parentGroupId: mainGroupMap["100000"],
        sortOrder: 4,
        allowPosting: false,
        description: "Goods held for sale or production"
      },
      {
        code: "150000",
        name: "FIXED ASSETS",
        type: "ASSET",
        nature: "DEBIT",
        accountCategory: "BALANCE_SHEET",
        level: 2,
        parentGroupId: mainGroupMap["100000"],
        sortOrder: 5,
        allowPosting: false,
        description: "Long-term tangible assets"
      },
      {
        code: "160000",
        name: "INTANGIBLE ASSETS",
        type: "ASSET",
        nature: "DEBIT",
        accountCategory: "BALANCE_SHEET",
        level: 2,
        parentGroupId: mainGroupMap["100000"],
        sortOrder: 6,
        allowPosting: false,
        description: "Non-physical assets like patents and goodwill"
      },
      {
        code: "170000",
        name: "INVESTMENTS",
        type: "ASSET",
        nature: "DEBIT",
        accountCategory: "BALANCE_SHEET",
        level: 2,
        parentGroupId: mainGroupMap["100000"],
        sortOrder: 7,
        allowPosting: false,
        description: "Long-term investments and securities"
      },

      // ─────────────────────── LIABILITY SUB-GROUPS ───────────────────────
      {
        code: "210000",
        name: "CURRENT LIABILITIES",
        type: "LIABILITY",
        nature: "CREDIT",
        accountCategory: "BALANCE_SHEET",
        level: 2,
        parentGroupId: mainGroupMap["200000"],
        sortOrder: 1,
        allowPosting: false,
        description: "Obligations due within one year"
      },
      {
        code: "220000",
        name: "PAYABLES",
        type: "LIABILITY",
        nature: "CREDIT",
        accountCategory: "BALANCE_SHEET",
        level: 2,
        parentGroupId: mainGroupMap["200000"],
        sortOrder: 2,
        allowPosting: false,
        description: "Amounts owed to suppliers and creditors"
      },
      {
        code: "230000",
        name: "ACCRUED LIABILITIES",
        type: "LIABILITY",
        nature: "CREDIT",
        accountCategory: "BALANCE_SHEET",
        level: 2,
        parentGroupId: mainGroupMap["200000"],
        sortOrder: 3,
        allowPosting: false,
        description: "Expenses incurred but not yet paid"
      },
      {
        code: "240000",
        name: "TAX LIABILITIES",
        type: "LIABILITY",
        nature: "CREDIT",
        accountCategory: "BALANCE_SHEET",
        level: 2,
        parentGroupId: mainGroupMap["200000"],
        sortOrder: 4,
        allowPosting: false,
        description: "Taxes payable to authorities"
      },
      {
        code: "250000",
        name: "LONG-TERM LIABILITIES",
        type: "LIABILITY",
        nature: "CREDIT",
        accountCategory: "BALANCE_SHEET",
        level: 2,
        parentGroupId: mainGroupMap["200000"],
        sortOrder: 5,
        allowPosting: false,
        description: "Obligations due after one year"
      },
      {
        code: "260000",
        name: "PROVISIONS",
        type: "LIABILITY",
        nature: "CREDIT",
        accountCategory: "BALANCE_SHEET",
        level: 2,
        parentGroupId: mainGroupMap["200000"],
        sortOrder: 6,
        allowPosting: false,
        description: "Estimated future obligations"
      },

      // ─────────────────────── EQUITY SUB-GROUPS ───────────────────────
      {
        code: "310000",
        name: "SHARE CAPITAL",
        type: "EQUITY",
        nature: "CREDIT",
        accountCategory: "BALANCE_SHEET",
        level: 2,
        parentGroupId: mainGroupMap["300000"],
        sortOrder: 1,
        allowPosting: false,
        description: "Capital invested by shareholders"
      },
      {
        code: "320000",
        name: "RESERVES",
        type: "EQUITY",
        nature: "CREDIT",
        accountCategory: "BALANCE_SHEET",
        level: 2,
        parentGroupId: mainGroupMap["300000"],
        sortOrder: 2,
        allowPosting: false,
        description: "Retained earnings and reserves"
      },
      {
        code: "330000",
        name: "DRAWINGS",
        type: "EQUITY",
        nature: "DEBIT",
        accountCategory: "BALANCE_SHEET",
        level: 2,
        parentGroupId: mainGroupMap["300000"],
        sortOrder: 3,
        allowPosting: false,
        description: "Withdrawals by owners"
      },

      // ─────────────────────── INCOME SUB-GROUPS ───────────────────────
      {
        code: "410000",
        name: "SALES REVENUE",
        type: "INCOME",
        nature: "CREDIT",
        accountCategory: "PROFIT_LOSS",
        level: 2,
        parentGroupId: mainGroupMap["400000"],
        sortOrder: 1,
        allowPosting: false,
        description: "Income from sale of goods"
      },
      {
        code: "420000",
        name: "SERVICE REVENUE",
        type: "INCOME",
        nature: "CREDIT",
        accountCategory: "PROFIT_LOSS",
        level: 2,
        parentGroupId: mainGroupMap["400000"],
        sortOrder: 2,
        allowPosting: false,
        description: "Income from services rendered"
      },
      {
        code: "430000",
        name: "OTHER INCOME",
        type: "INCOME",
        nature: "CREDIT",
        accountCategory: "PROFIT_LOSS",
        level: 2,
        parentGroupId: mainGroupMap["400000"],
        sortOrder: 3,
        allowPosting: false,
        description: "Miscellaneous and non-operating income"
      },
      {
        code: "440000",
        name: "FINANCIAL INCOME",
        type: "INCOME",
        nature: "CREDIT",
        accountCategory: "PROFIT_LOSS",
        level: 2,
        parentGroupId: mainGroupMap["400000"],
        sortOrder: 4,
        allowPosting: false,
        description: "Interest, dividends, and investment income"
      },

      // ─────────────────────── EXPENSE SUB-GROUPS ───────────────────────
      {
        code: "510000",
        name: "COST OF GOODS SOLD",
        type: "EXPENSE",
        nature: "DEBIT",
        accountCategory: "PROFIT_LOSS",
        level: 2,
        parentGroupId: mainGroupMap["500000"],
        sortOrder: 1,
        allowPosting: false,
        description: "Direct costs of products sold"
      },
      {
        code: "520000",
        name: "DIRECT EXPENSES",
        type: "EXPENSE",
        nature: "DEBIT",
        accountCategory: "PROFIT_LOSS",
        level: 2,
        parentGroupId: mainGroupMap["500000"],
        sortOrder: 2,
        allowPosting: false,
        description: "Expenses directly tied to production"
      },
      {
        code: "530000",
        name: "PERSONNEL EXPENSES",
        type: "EXPENSE",
        nature: "DEBIT",
        accountCategory: "PROFIT_LOSS",
        level: 2,
        parentGroupId: mainGroupMap["500000"],
        sortOrder: 3,
        allowPosting: false,
        description: "Salaries, wages, and employee benefits"
      },
      {
        code: "540000",
        name: "ADMINISTRATIVE EXPENSES",
        type: "EXPENSE",
        nature: "DEBIT",
        accountCategory: "PROFIT_LOSS",
        level: 2,
        parentGroupId: mainGroupMap["500000"],
        sortOrder: 4,
        allowPosting: false,
        description: "General administrative and office expenses"
      },
      {
        code: "550000",
        name: "SELLING & MARKETING",
        type: "EXPENSE",
        nature: "DEBIT",
        accountCategory: "PROFIT_LOSS",
        level: 2,
        parentGroupId: mainGroupMap["500000"],
        sortOrder: 5,
        allowPosting: false,
        description: "Sales and marketing related expenses"
      },
      {
        code: "560000",
        name: "OPERATING EXPENSES",
        type: "EXPENSE",
        nature: "DEBIT",
        accountCategory: "PROFIT_LOSS",
        level: 2,
        parentGroupId: mainGroupMap["500000"],
        sortOrder: 6,
        allowPosting: false,
        description: "Day-to-day operational costs"
      },
      {
        code: "570000",
        name: "FINANCIAL EXPENSES",
        type: "EXPENSE",
        nature: "DEBIT",
        accountCategory: "PROFIT_LOSS",
        level: 2,
        parentGroupId: mainGroupMap["500000"],
        sortOrder: 7,
        allowPosting: false,
        description: "Interest, bank charges, and financial costs"
      },
      {
        code: "580000",
        name: "DEPRECIATION & AMORTIZATION",
        type: "EXPENSE",
        nature: "DEBIT",
        accountCategory: "PROFIT_LOSS",
        level: 2,
        parentGroupId: mainGroupMap["500000"],
        sortOrder: 8,
        allowPosting: false,
        description: "Asset depreciation and amortization"
      },
      {
        code: "590000",
        name: "TAX EXPENSES",
        type: "EXPENSE",
        nature: "DEBIT",
        accountCategory: "PROFIT_LOSS",
        level: 2,
        parentGroupId: mainGroupMap["500000"],
        sortOrder: 9,
        allowPosting: false,
        description: "Income tax and other taxes"
      }
    ];

    const savedSubGroups = await AccountGroup.insertMany(subGroups);
    console.log(`✓ Level 2: Created ${savedSubGroups.length} Sub Groups`);

    // Create map for sub group reference
    const subGroupMap = {};
    savedSubGroups.forEach(g => {
      subGroupMap[g.code] = g._id;
    });

    // ═══════════════════════════════════════════════════════════════════
    // LEVEL 3: LEDGER ACCOUNTS (Individual Accounts) - 6-digit codes
    // Format: XXXX00 or XXXXXX (sequential within sub-group)
    // allowPosting: true (can post journal entries to ledger accounts)
    // ═══════════════════════════════════════════════════════════════════
    const ledgerAccounts = [
      // ─────────────────────── CURRENT ASSETS (110000) ───────────────────────
      {
        accountNumber: "110100",
        accountName: "Cash in Hand",
        accountGroupId: subGroupMap["110000"],
        description: "Physical cash held at premises",
        allowPosting: true,
        isBank: false
      },
      {
        accountNumber: "110200",
        accountName: "Petty Cash",
        accountGroupId: subGroupMap["110000"],
        description: "Small cash fund for minor expenses",
        allowPosting: true,
        isBank: false
      },
      {
        accountNumber: "110300",
        accountName: "Cash in Transit",
        accountGroupId: subGroupMap["110000"],
        description: "Cash being transferred between locations",
        allowPosting: true,
        isBank: false
      },
      {
        accountNumber: "110400",
        accountName: "Cash",
        accountGroupId: subGroupMap["110000"],
        description: "Sale Cash Account",
        allowPosting: true,
        isBank: false
      },


      // ─────────────────────── BANK ACCOUNTS (120000) ───────────────────────
      {
        accountNumber: "120100",
        accountName: "Main Bank Account",
        accountGroupId: subGroupMap["120000"],
        description: "Primary business bank account",
        allowPosting: true,
        isBank: true,
        bankName: "Primary Bank",
        accountTypeBank: "Current"
      },

      // ─────────────────────── RECEIVABLES (130000) ───────────────────────
      {
        accountNumber: "130100",
        accountName: "Accounts Receivable",
        accountGroupId: subGroupMap["130000"],
        description: "Amounts due from customers for sales",
        allowPosting: true,
        isBank: false
      },
      {
        accountNumber: "130200",
        accountName: "Notes Receivable",
        accountGroupId: subGroupMap["130000"],
        description: "Formal written promises to pay",
        allowPosting: true,
        isBank: false
      },
      {
        accountNumber: "130300",
        accountName: "Employee Advances",
        accountGroupId: subGroupMap["130000"],
        description: "Advances given to employees",
        allowPosting: true,
        isBank: false
      },
      {
        accountNumber: "130400",
        accountName: "Other Receivables",
        accountGroupId: subGroupMap["130000"],
        description: "Miscellaneous amounts receivable",
        allowPosting: true,
        isBank: false
      },
      {
        accountNumber: "130500",
        accountName: "Allowance for Doubtful Accounts",
        accountGroupId: subGroupMap["130000"],
        description: "Provision for bad debts (contra)",
        allowPosting: true,
        isBank: false
      },

      // ─────────────────────── INVENTORY (140000) ───────────────────────
      {
        accountNumber: "140100",
        accountName: "Raw Materials",
        accountGroupId: subGroupMap["140000"],
        description: "Materials for production",
        allowPosting: true,
        isBank: false
      },
      {
        accountNumber: "140200",
        accountName: "Work in Progress",
        accountGroupId: subGroupMap["140000"],
        description: "Partially completed goods",
        allowPosting: true,
        isBank: false
      },
      {
        accountNumber: "140300",
        accountName: "Finished Goods",
        accountGroupId: subGroupMap["140000"],
        description: "Completed goods ready for sale",
        allowPosting: true,
        isBank: false
      },
      {
        accountNumber: "140400",
        accountName: "Trading Goods",
        accountGroupId: subGroupMap["140000"],
        description: "Goods purchased for resale",
        allowPosting: true,
        isBank: false
      },
      {
        accountNumber: "140500",
        accountName: "Consumables & Supplies",
        accountGroupId: subGroupMap["140000"],
        description: "Office and operating supplies",
        allowPosting: true,
        isBank: false
      },

      // ─────────────────────── FIXED ASSETS (150000) ───────────────────────
      {
        accountNumber: "150100",
        accountName: "Land",
        accountGroupId: subGroupMap["150000"],
        description: "Land owned by the company",
        allowPosting: true,
        isBank: false
      },
      {
        accountNumber: "150200",
        accountName: "Buildings",
        accountGroupId: subGroupMap["150000"],
        description: "Buildings and structures",
        allowPosting: true,
        isBank: false
      },
      {
        accountNumber: "150300",
        accountName: "Plant & Machinery",
        accountGroupId: subGroupMap["150000"],
        description: "Production machinery and equipment",
        allowPosting: true,
        isBank: false
      },
      {
        accountNumber: "150400",
        accountName: "Furniture & Fixtures",
        accountGroupId: subGroupMap["150000"],
        description: "Office furniture and fixtures",
        allowPosting: true,
        isBank: false
      },
      {
        accountNumber: "150500",
        accountName: "Vehicles",
        accountGroupId: subGroupMap["150000"],
        description: "Company vehicles",
        allowPosting: true,
        isBank: false
      },
      {
        accountNumber: "150600",
        accountName: "Computer Equipment",
        accountGroupId: subGroupMap["150000"],
        description: "Computers and IT hardware",
        allowPosting: true,
        isBank: false
      },
      {
        accountNumber: "150700",
        accountName: "Accumulated Depreciation - Buildings",
        accountGroupId: subGroupMap["150000"],
        description: "Depreciation on buildings (contra)",
        allowPosting: true,
        isBank: false
      },
      {
        accountNumber: "150800",
        accountName: "Accumulated Depreciation - Equipment",
        accountGroupId: subGroupMap["150000"],
        description: "Depreciation on equipment (contra)",
        allowPosting: true,
        isBank: false
      },
      {
        accountNumber: "150900",
        accountName: "Accumulated Depreciation - Vehicles",
        accountGroupId: subGroupMap["150000"],
        description: "Depreciation on vehicles (contra)",
        allowPosting: true,
        isBank: false
      },

      // ─────────────────────── INTANGIBLE ASSETS (160000) ───────────────────────
      {
        accountNumber: "160100",
        accountName: "Goodwill",
        accountGroupId: subGroupMap["160000"],
        description: "Business goodwill from acquisitions",
        allowPosting: true,
        isBank: false
      },
      {
        accountNumber: "160200",
        accountName: "Patents & Trademarks",
        accountGroupId: subGroupMap["160000"],
        description: "Intellectual property rights",
        allowPosting: true,
        isBank: false
      },
      {
        accountNumber: "160300",
        accountName: "Software Licenses",
        accountGroupId: subGroupMap["160000"],
        description: "Software and license costs",
        allowPosting: true,
        isBank: false
      },

      // ─────────────────────── INVESTMENTS (170000) ───────────────────────
      {
        accountNumber: "170100",
        accountName: "Long-term Investments",
        accountGroupId: subGroupMap["170000"],
        description: "Investments in other companies",
        allowPosting: true,
        isBank: false
      },
      {
        accountNumber: "170200",
        accountName: "Investment in Securities",
        accountGroupId: subGroupMap["170000"],
        description: "Stocks and bonds",
        allowPosting: true,
        isBank: false
      },

      // ─────────────────────── CURRENT LIABILITIES (210000) ───────────────────────
      {
        accountNumber: "210100",
        accountName: "Bank Overdraft",
        accountGroupId: subGroupMap["210000"],
        description: "Overdraft facility used",
        allowPosting: true,
        isBank: false
      },
      {
        accountNumber: "210200",
        accountName: "Short-term Loans",
        accountGroupId: subGroupMap["210000"],
        description: "Loans due within one year",
        allowPosting: true,
        isBank: false
      },
      {
        accountNumber: "210300",
        accountName: "Current Portion of Long-term Debt",
        accountGroupId: subGroupMap["210000"],
        description: "Long-term debt due this year",
        allowPosting: true,
        isBank: false
      },

      // ─────────────────────── PAYABLES (220000) ───────────────────────
      {
        accountNumber: "220100",
        accountName: "Accounts Payable",
        accountGroupId: subGroupMap["220000"],
        description: "Amounts owed to suppliers",
        allowPosting: true,
        isBank: false
      },
      {
        accountNumber: "220200",
        accountName: "Notes Payable",
        accountGroupId: subGroupMap["220000"],
        description: "Formal written obligations",
        allowPosting: true,
        isBank: false
      },
      {
        accountNumber: "220300",
        accountName: "Bills Payable",
        accountGroupId: subGroupMap["220000"],
        description: "Bills of exchange payable",
        allowPosting: true,
        isBank: false
      },

      // ─────────────────────── ACCRUED LIABILITIES (230000) ───────────────────────
      {
        accountNumber: "230100",
        accountName: "Accrued Salaries",
        accountGroupId: subGroupMap["230000"],
        description: "Salaries earned but not yet paid",
        allowPosting: true,
        isBank: false
      },
      {
        accountNumber: "230200",
        accountName: "Accrued Utilities",
        accountGroupId: subGroupMap["230000"],
        description: "Utility bills not yet received",
        allowPosting: true,
        isBank: false
      },
      {
        accountNumber: "230300",
        accountName: "Accrued Interest",
        accountGroupId: subGroupMap["230000"],
        description: "Interest incurred but not paid",
        allowPosting: true,
        isBank: false
      },
      {
        accountNumber: "230400",
        accountName: "Deferred Revenue",
        accountGroupId: subGroupMap["230000"],
        description: "Advance payments from customers",
        allowPosting: true,
        isBank: false
      },

      // ─────────────────────── TAX LIABILITIES (240000) ───────────────────────
      {
        accountNumber: "240100",
        accountName: "VAT Payable",
        accountGroupId: subGroupMap["240000"],
        description: "Value Added Tax collected",
        allowPosting: true,
        isBank: false
      },
      {
        accountNumber: "240200",
        accountName: "Income Tax Payable",
        accountGroupId: subGroupMap["240000"],
        description: "Corporate income tax due",
        allowPosting: true,
        isBank: false
      },
      {
        accountNumber: "240300",
        accountName: "Withholding Tax Payable",
        accountGroupId: subGroupMap["240000"],
        description: "Tax withheld from payments",
        allowPosting: true,
        isBank: false
      },
      {
        accountNumber: "240400",
        accountName: "Payroll Tax Payable",
        accountGroupId: subGroupMap["240000"],
        description: "Employee tax deductions",
        allowPosting: true,
        isBank: false
      },

      // ─────────────────────── LONG-TERM LIABILITIES (250000) ───────────────────────
      {
        accountNumber: "250100",
        accountName: "Long-term Bank Loans",
        accountGroupId: subGroupMap["250000"],
        description: "Bank loans due after one year",
        allowPosting: true,
        isBank: false
      },
      {
        accountNumber: "250200",
        accountName: "Mortgage Payable",
        accountGroupId: subGroupMap["250000"],
        description: "Property mortgage",
        allowPosting: true,
        isBank: false
      },
      {
        accountNumber: "250300",
        accountName: "Bonds Payable",
        accountGroupId: subGroupMap["250000"],
        description: "Bonds issued by the company",
        allowPosting: true,
        isBank: false
      },
      {
        accountNumber: "250400",
        accountName: "Deferred Tax Liability",
        accountGroupId: subGroupMap["250000"],
        description: "Taxes payable in future periods",
        allowPosting: true,
        isBank: false
      },

      // ─────────────────────── PROVISIONS (260000) ───────────────────────
      {
        accountNumber: "260100",
        accountName: "Provision for Warranties",
        accountGroupId: subGroupMap["260000"],
        description: "Estimated warranty claims",
        allowPosting: true,
        isBank: false
      },
      {
        accountNumber: "260200",
        accountName: "Provision for Gratuity",
        accountGroupId: subGroupMap["260000"],
        description: "Employee end-of-service benefits",
        allowPosting: true,
        isBank: false
      },

      // ─────────────────────── SHARE CAPITAL (310000) ───────────────────────
      {
        accountNumber: "310100",
        accountName: "Ordinary Share Capital",
        accountGroupId: subGroupMap["310000"],
        description: "Common stock issued",
        allowPosting: true,
        isBank: false
      },
      {
        accountNumber: "310200",
        accountName: "Preference Share Capital",
        accountGroupId: subGroupMap["310000"],
        description: "Preferred stock issued",
        allowPosting: true,
        isBank: false
      },
      {
        accountNumber: "310300",
        accountName: "Share Premium",
        accountGroupId: subGroupMap["310000"],
        description: "Amount received above par value",
        allowPosting: true,
        isBank: false
      },

      // ─────────────────────── RESERVES (320000) ───────────────────────
      {
        accountNumber: "320100",
        accountName: "Retained Earnings",
        accountGroupId: subGroupMap["320000"],
        description: "Accumulated profits",
        allowPosting: true,
        isBank: false
      },
      {
        accountNumber: "320200",
        accountName: "General Reserve",
        accountGroupId: subGroupMap["320000"],
        description: "Appropriated retained earnings",
        allowPosting: true,
        isBank: false
      },
      {
        accountNumber: "320300",
        accountName: "Revaluation Reserve",
        accountGroupId: subGroupMap["320000"],
        description: "Asset revaluation surplus",
        allowPosting: true,
        isBank: false
      },
      {
        accountNumber: "320400",
        accountName: "Current Year Profit/Loss",
        accountGroupId: subGroupMap["320000"],
        description: "Net income for current period",
        allowPosting: true,
        isBank: false
      },

      // ─────────────────────── DRAWINGS (330000) ───────────────────────
      {
        accountNumber: "330100",
        accountName: "Owner's Drawings",
        accountGroupId: subGroupMap["330000"],
        description: "Withdrawals by proprietor",
        allowPosting: true,
        isBank: false
      },
      {
        accountNumber: "330200",
        accountName: "Dividends",
        accountGroupId: subGroupMap["330000"],
        description: "Dividends declared",
        allowPosting: true,
        isBank: false
      },

      // ─────────────────────── SALES REVENUE (410000) ───────────────────────
      {
        accountNumber: "410100",
        accountName: "Product Sales",
        accountGroupId: subGroupMap["410000"],
        description: "Revenue from product sales",
        allowPosting: true,
        isBank: false
      },
      {
        accountNumber: "410200",
        accountName: "Export Sales",
        accountGroupId: subGroupMap["410000"],
        description: "Revenue from export sales",
        allowPosting: true,
        isBank: false
      },
      {
        accountNumber: "410300",
        accountName: "Sales Returns",
        accountGroupId: subGroupMap["410000"],
        description: "Goods returned by customers (contra)",
        allowPosting: true,
        isBank: false
      },
      {
        accountNumber: "410400",
        accountName: "Sales Discounts",
        accountGroupId: subGroupMap["410000"],
        description: "Discounts given to customers (contra)",
        allowPosting: true,
        isBank: false
      },

      // ─────────────────────── SERVICE REVENUE (420000) ───────────────────────
      {
        accountNumber: "420100",
        accountName: "Service Income",
        accountGroupId: subGroupMap["420000"],
        description: "Revenue from services",
        allowPosting: true,
        isBank: false
      },
      {
        accountNumber: "420200",
        accountName: "Consulting Fees",
        accountGroupId: subGroupMap["420000"],
        description: "Consulting service revenue",
        allowPosting: true,
        isBank: false
      },
      {
        accountNumber: "420300",
        accountName: "Commission Earned",
        accountGroupId: subGroupMap["420000"],
        description: "Commission income received",
        allowPosting: true,
        isBank: false
      },

      // ─────────────────────── OTHER INCOME (430000) ───────────────────────
      {
        accountNumber: "430100",
        accountName: "Rental Income",
        accountGroupId: subGroupMap["430000"],
        description: "Income from property rental",
        allowPosting: true,
        isBank: false
      },
      {
        accountNumber: "430200",
        accountName: "Gain on Asset Disposal",
        accountGroupId: subGroupMap["430000"],
        description: "Profit from selling assets",
        allowPosting: true,
        isBank: false
      },
      {
        accountNumber: "430300",
        accountName: "Miscellaneous Income",
        accountGroupId: subGroupMap["430000"],
        description: "Other miscellaneous income",
        allowPosting: true,
        isBank: false
      },

      // ─────────────────────── FINANCIAL INCOME (440000) ───────────────────────
      {
        accountNumber: "440100",
        accountName: "Interest Income",
        accountGroupId: subGroupMap["440000"],
        description: "Interest earned on deposits",
        allowPosting: true,
        isBank: false
      },
      {
        accountNumber: "440200",
        accountName: "Dividend Income",
        accountGroupId: subGroupMap["440000"],
        description: "Dividends received from investments",
        allowPosting: true,
        isBank: false
      },
      {
        accountNumber: "440300",
        accountName: "Foreign Exchange Gain",
        accountGroupId: subGroupMap["440000"],
        description: "Gain from currency fluctuations",
        allowPosting: true,
        isBank: false
      },

      // ─────────────────────── COST OF GOODS SOLD (510000) ───────────────────────
      {
        accountNumber: "510100",
        accountName: "Purchases",
        accountGroupId: subGroupMap["510000"],
        description: "Cost of goods purchased",
        allowPosting: true,
        isBank: false
      },
      {
        accountNumber: "510200",
        accountName: "Purchase Returns",
        accountGroupId: subGroupMap["510000"],
        description: "Goods returned to suppliers (contra)",
        allowPosting: true,
        isBank: false
      },
      {
        accountNumber: "510300",
        accountName: "Purchase Discounts",
        accountGroupId: subGroupMap["510000"],
        description: "Discounts received from suppliers (contra)",
        allowPosting: true,
        isBank: false
      },
      {
        accountNumber: "510400",
        accountName: "Freight Inward",
        accountGroupId: subGroupMap["510000"],
        description: "Shipping cost on purchases",
        allowPosting: true,
        isBank: false
      },
      {
        accountNumber: "510500",
        accountName: "Import Duties",
        accountGroupId: subGroupMap["510000"],
        description: "Customs and import charges",
        allowPosting: true,
        isBank: false
      },

      // ─────────────────────── DIRECT EXPENSES (520000) ───────────────────────
      {
        accountNumber: "520100",
        accountName: "Direct Labor",
        accountGroupId: subGroupMap["520000"],
        description: "Production labor costs",
        allowPosting: true,
        isBank: false
      },
      {
        accountNumber: "520200",
        accountName: "Manufacturing Overhead",
        accountGroupId: subGroupMap["520000"],
        description: "Factory overhead costs",
        allowPosting: true,
        isBank: false
      },
      {
        accountNumber: "520300",
        accountName: "Subcontracting Costs",
        accountGroupId: subGroupMap["520000"],
        description: "Outsourced production costs",
        allowPosting: true,
        isBank: false
      },

      // ─────────────────────── PERSONNEL EXPENSES (530000) ───────────────────────
      {
        accountNumber: "530100",
        accountName: "Salaries & Wages",
        accountGroupId: subGroupMap["530000"],
        description: "Employee salaries",
        allowPosting: true,
        isBank: false
      },
      {
        accountNumber: "530200",
        accountName: "Overtime Pay",
        accountGroupId: subGroupMap["530000"],
        description: "Overtime compensation",
        allowPosting: true,
        isBank: false
      },
      {
        accountNumber: "530300",
        accountName: "Employee Benefits",
        accountGroupId: subGroupMap["530000"],
        description: "Insurance, medical, etc.",
        allowPosting: true,
        isBank: false
      },
      {
        accountNumber: "530400",
        accountName: "Employer Contributions",
        accountGroupId: subGroupMap["530000"],
        description: "Social security, pension contributions",
        allowPosting: true,
        isBank: false
      },
      {
        accountNumber: "530500",
        accountName: "Staff Welfare",
        accountGroupId: subGroupMap["530000"],
        description: "Employee meals, recreation",
        allowPosting: true,
        isBank: false
      },
      {
        accountNumber: "530600",
        accountName: "Training & Development",
        accountGroupId: subGroupMap["530000"],
        description: "Employee training costs",
        allowPosting: true,
        isBank: false
      },

      // ─────────────────────── ADMINISTRATIVE EXPENSES (540000) ───────────────────────
      {
        accountNumber: "540100",
        accountName: "Office Rent",
        accountGroupId: subGroupMap["540000"],
        description: "Office space rental",
        allowPosting: true,
        isBank: false
      },
      {
        accountNumber: "540200",
        accountName: "Office Supplies",
        accountGroupId: subGroupMap["540000"],
        description: "Stationery and supplies",
        allowPosting: true,
        isBank: false
      },
      {
        accountNumber: "540300",
        accountName: "Telephone & Internet",
        accountGroupId: subGroupMap["540000"],
        description: "Communication expenses",
        allowPosting: true,
        isBank: false
      },
      {
        accountNumber: "540400",
        accountName: "Legal & Professional Fees",
        accountGroupId: subGroupMap["540000"],
        description: "Legal, audit, consulting fees",
        allowPosting: true,
        isBank: false
      },
      {
        accountNumber: "540500",
        accountName: "Insurance Expense",
        accountGroupId: subGroupMap["540000"],
        description: "Business insurance premiums",
        allowPosting: true,
        isBank: false
      },
      {
        accountNumber: "540600",
        accountName: "License & Registration",
        accountGroupId: subGroupMap["540000"],
        description: "Business licenses and permits",
        allowPosting: true,
        isBank: false
      },

      // ─────────────────────── SELLING & MARKETING (550000) ───────────────────────
      {
        accountNumber: "550100",
        accountName: "Advertising Expense",
        accountGroupId: subGroupMap["550000"],
        description: "Advertising and promotion",
        allowPosting: true,
        isBank: false
      },
      {
        accountNumber: "550200",
        accountName: "Sales Commission",
        accountGroupId: subGroupMap["550000"],
        description: "Commission to sales staff",
        allowPosting: true,
        isBank: false
      },
      {
        accountNumber: "550300",
        accountName: "Marketing Expense",
        accountGroupId: subGroupMap["550000"],
        description: "Marketing campaigns",
        allowPosting: true,
        isBank: false
      },
      {
        accountNumber: "550400",
        accountName: "Trade Show & Events",
        accountGroupId: subGroupMap["550000"],
        description: "Exhibition and event costs",
        allowPosting: true,
        isBank: false
      },
      {
        accountNumber: "550500",
        accountName: "Freight Outward",
        accountGroupId: subGroupMap["550000"],
        description: "Delivery and shipping costs",
        allowPosting: true,
        isBank: false
      },

      // ─────────────────────── OPERATING EXPENSES (560000) ───────────────────────
      {
        accountNumber: "560100",
        accountName: "Electricity Expense",
        accountGroupId: subGroupMap["560000"],
        description: "Electricity bills",
        allowPosting: true,
        isBank: false
      },
      {
        accountNumber: "560200",
        accountName: "Water Expense",
        accountGroupId: subGroupMap["560000"],
        description: "Water utility bills",
        allowPosting: true,
        isBank: false
      },
      {
        accountNumber: "560300",
        accountName: "Fuel Expense",
        accountGroupId: subGroupMap["560000"],
        description: "Fuel and gas costs",
        allowPosting: true,
        isBank: false
      },
      {
        accountNumber: "560400",
        accountName: "Repairs & Maintenance",
        accountGroupId: subGroupMap["560000"],
        description: "Equipment and building repairs",
        allowPosting: true,
        isBank: false
      },
      {
        accountNumber: "560500",
        accountName: "Security Services",
        accountGroupId: subGroupMap["560000"],
        description: "Security and guard services",
        allowPosting: true,
        isBank: false
      },
      {
        accountNumber: "560600",
        accountName: "Cleaning & Sanitation",
        accountGroupId: subGroupMap["560000"],
        description: "Cleaning services",
        allowPosting: true,
        isBank: false
      },

      // ─────────────────────── FINANCIAL EXPENSES (570000) ───────────────────────
      {
        accountNumber: "570100",
        accountName: "Interest Expense",
        accountGroupId: subGroupMap["570000"],
        description: "Interest on loans",
        allowPosting: true,
        isBank: false
      },
      {
        accountNumber: "570200",
        accountName: "Bank Charges",
        accountGroupId: subGroupMap["570000"],
        description: "Bank fees and charges",
        allowPosting: true,
        isBank: false
      },
      {
        accountNumber: "570300",
        accountName: "Foreign Exchange Loss",
        accountGroupId: subGroupMap["570000"],
        description: "Currency exchange losses",
        allowPosting: true,
        isBank: false
      },
      {
        accountNumber: "570400",
        accountName: "Credit Card Fees",
        accountGroupId: subGroupMap["570000"],
        description: "Payment processing fees",
        allowPosting: true,
        isBank: false
      },

      // ─────────────────────── DEPRECIATION & AMORTIZATION (580000) ───────────────────────
      {
        accountNumber: "580100",
        accountName: "Depreciation - Buildings",
        accountGroupId: subGroupMap["580000"],
        description: "Depreciation on buildings",
        allowPosting: true,
        isBank: false
      },
      {
        accountNumber: "580200",
        accountName: "Depreciation - Equipment",
        accountGroupId: subGroupMap["580000"],
        description: "Depreciation on equipment",
        allowPosting: true,
        isBank: false
      },
      {
        accountNumber: "580300",
        accountName: "Depreciation - Vehicles",
        accountGroupId: subGroupMap["580000"],
        description: "Depreciation on vehicles",
        allowPosting: true,
        isBank: false
      },
      {
        accountNumber: "580400",
        accountName: "Amortization - Intangibles",
        accountGroupId: subGroupMap["580000"],
        description: "Amortization of intangible assets",
        allowPosting: true,
        isBank: false
      },

      // ─────────────────────── TAX EXPENSES (590000) ───────────────────────
      {
        accountNumber: "590100",
        accountName: "Income Tax Expense",
        accountGroupId: subGroupMap["590000"],
        description: "Corporate income tax",
        allowPosting: true,
        isBank: false
      },
      {
        accountNumber: "590200",
        accountName: "Property Tax",
        accountGroupId: subGroupMap["590000"],
        description: "Real estate and property taxes",
        allowPosting: true,
        isBank: false
      },
      {
        accountNumber: "590300",
        accountName: "Other Taxes",
        accountGroupId: subGroupMap["590000"],
        description: "Miscellaneous taxes",
        allowPosting: true,
        isBank: false
      }
    ];

    // Add default values to all accounts
    // Determine accountCategory based on account number prefix
    const getAccountCategory = (accountNumber) => {
      const prefix = accountNumber.charAt(0);
      // 1xx = Assets, 2xx = Liabilities, 3xx = Equity → BALANCE_SHEET
      // 4xx = Income, 5xx = Expenses → PROFIT_LOSS
      return ['1', '2', '3'].includes(prefix) ? 'BALANCE_SHEET' : 'PROFIT_LOSS';
    };

    const accountsWithDefaults = ledgerAccounts.map(account => ({
      ...account,
      openingBalance: 0,
      currentBalance: 0,
      isActive: true,
      allowPosting: account.allowPosting !== undefined ? account.allowPosting : true,
      accountCategory: getAccountCategory(account.accountNumber),
      isBank: account.isBank || false,
      bankName: account.bankName || "",
      accountTypeBank: account.accountTypeBank || ""
    }));

    const savedAccounts = await ChartOfAccounts.insertMany(accountsWithDefaults);
    console.log(`✓ Level 3: Created ${savedAccounts.length} Ledger Accounts`);

    // ═══════════════════════════════════════════════════════════════════
    // SUMMARY
    // ═══════════════════════════════════════════════════════════════════
    console.log("\n" + "═".repeat(60));
    console.log("✅ CORPORATE-LEVEL CHART OF ACCOUNTS CREATED SUCCESSFULLY!");
    console.log("═".repeat(60));
    console.log("\n📊 HIERARCHY STRUCTURE (6-DIGIT CODES):");
    console.log("─".repeat(40));
    console.log(`   Level 1 (Main Groups)     : ${savedMainGroups.length}  (X00000 - allowPosting: false)`);
    console.log(`   Level 2 (Sub Groups)      : ${savedSubGroups.length}  (XX0000 - allowPosting: false)`);
    console.log(`   Level 3 (Ledger Accounts) : ${savedAccounts.length}  (XXXX00 - allowPosting: true)`);
    console.log("─".repeat(40));
    console.log(`   TOTAL RECORDS             : ${savedMainGroups.length + savedSubGroups.length + savedAccounts.length}`);
    console.log("\n📁 BREAKDOWN BY TYPE:");
    console.log("   💰 ASSETS      - Sub Groups: 7  | Ledger Accounts: " + ledgerAccounts.filter(a => a.accountNumber.startsWith("1")).length);
    console.log("   📋 LIABILITIES - Sub Groups: 6  | Ledger Accounts: " + ledgerAccounts.filter(a => a.accountNumber.startsWith("2")).length);
    console.log("   🏛️  EQUITY     - Sub Groups: 3  | Ledger Accounts: " + ledgerAccounts.filter(a => a.accountNumber.startsWith("3")).length);
    console.log("   📈 INCOME      - Sub Groups: 4  | Ledger Accounts: " + ledgerAccounts.filter(a => a.accountNumber.startsWith("4")).length);
    console.log("   📉 EXPENSES    - Sub Groups: 9  | Ledger Accounts: " + ledgerAccounts.filter(a => a.accountNumber.startsWith("5")).length);
    console.log("\n");

  } catch (error) {
    console.error("❌ Error seeding chart of accounts:", error);
    throw error;
  }
};

export { seedChartOfAccounts };

// Run as standalone script
if (import.meta.url === `file://${process.argv[1]}`) {
  seedChartOfAccounts().then(() => process.exit(0)).catch(() => process.exit(1));
}
