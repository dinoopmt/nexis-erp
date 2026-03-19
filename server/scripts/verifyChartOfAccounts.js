import connectDB from "./db/db.js";
import AccountGroup from "./Models/AccountGroup.js";
import ChartOfAccounts from "./Models/ChartOfAccounts.js";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, ".env") });

const verifyChartOfAccounts = async () => {
  await connectDB();

  try {
    console.log("\n" + "=".repeat(80));
    console.log("CHART OF ACCOUNTS VERIFICATION");
    console.log("=".repeat(80) + "\n");

    // Get account groups
    const groups = await AccountGroup.find().sort({ code: 1 });
    const accounts = await ChartOfAccounts.find()
      .populate("accountGroupId", "name code")
      .sort({ accountNumber: 1 });

    console.log(`📊 ACCOUNT GROUPS (${groups.length})`);
    console.log("-".repeat(80));
    groups.forEach((group) => {
      console.log(`  ${group.code.padEnd(6)} | ${group.name.padEnd(25)} | Type: ${group.type.padEnd(8)} | Nature: ${group.nature}`);
    });

    console.log("\n📋 CHART OF ACCOUNTS (${accounts.length})\n");
    
    // Group accounts by type
    const accountsByGroup = {};
    accounts.forEach((account) => {
      const groupName = account.accountGroupId?.name || "Unknown";
      if (!accountsByGroup[groupName]) {
        accountsByGroup[groupName] = [];
      }
      accountsByGroup[groupName].push(account);
    });

    // Display accounts grouped by category
    Object.keys(accountsByGroup).forEach((groupName) => {
      console.log(`\n📁 ${groupName}`);
      console.log("-".repeat(80));
      accountsByGroup[groupName].forEach((account) => {
        const bankInfo = account.isBank ? ` [BANK: ${account.bankName} - ${account.accountTypeBank}]` : "";
        const status = account.isActive ? "✓" : "✗";
        console.log(`  ${account.accountNumber.padEnd(6)} | ${account.accountName.padEnd(35)} | ${status}${bankInfo}`);
      });
    });

    console.log("\n" + "=".repeat(80));
    console.log(`\n✅ SUMMARY`);
    console.log(`   Total Account Groups: ${groups.length}`);
    console.log(`   Total Accounts: ${accounts.length}`);
    console.log(`   Bank Accounts: ${accounts.filter(a => a.isBank).length}`);
    console.log(`   Active Accounts: ${accounts.filter(a => a.isActive).length}`);
    console.log("\n" + "=".repeat(80) + "\n");

    process.exit(0);
  } catch (error) {
    console.error("Error verifying chart of accounts:", error);
    process.exit(1);
  }
};

verifyChartOfAccounts();
