import ChartOfAccounts from "../../../Models/ChartOfAccounts.js";
import AccountGroup from "../../../Models/AccountGroup.js";

// Add Chart of Account
export const addChartOfAccount = async (req, res) => {
  try {
    const { accountNumber, accountName, accountGroupId, description, openingBalance, isBank, bankName, accountTypeBank } = req.body;

    if (!accountNumber || !accountName || !accountGroupId) {
      return res.status(400).json({
        message: "Account Number, Name, and Group are required"
      });
    }

    // Verify account group exists
    const accountGroup = await AccountGroup.findById(accountGroupId);
    if (!accountGroup || accountGroup.isDeleted) {
      return res.status(400).json({ message: "Invalid account group" });
    }

    // Check if account already exists
    const existingAccount = await ChartOfAccounts.findOne({
      accountNumber: accountNumber.toUpperCase(),
      isDeleted: false
    });

    if (existingAccount) {
      return res.status(400).json({ message: "Account number already exists" });
    }

    const chartAccount = new ChartOfAccounts({
      accountNumber: accountNumber.toUpperCase(),
      accountName,
      accountGroupId,
      description,
      openingBalance: openingBalance ? Math.round(parseFloat(openingBalance) * 100) : 0,
      currentBalance: openingBalance ? Math.round(parseFloat(openingBalance) * 100) : 0,
      isBank: isBank || false,
      bankName: bankName || "",
      accountTypeBank: accountTypeBank || ""
    });

    await chartAccount.save();
    await chartAccount.populate("accountGroupId", "name code type");

    res.status(201).json({
      message: "Chart of account added successfully",
      chartAccount
    });
  } catch (err) {
    console.error("Error adding chart of account:", err);
    res.status(500).json({
      message: "Error adding chart of account",
      error: err.message
    });
  }
};

// Get All Chart of Accounts
export const getChartOfAccounts = async (req, res) => {
  try {
    const { groupId, isBank } = req.query;

    let query = { isDeleted: false };
    if (groupId) query.accountGroupId = groupId;
    if (isBank === "true") query.isBank = true;

    const accounts = await ChartOfAccounts.find(query)
      .populate("accountGroupId", "name code type")
      .sort({ accountNumber: 1 });

    res.status(200).json({
      message: "Chart of accounts fetched successfully",
      chartOfAccounts: accounts
    });
  } catch (err) {
    console.error("Error fetching chart of accounts:", err);
    res.status(500).json({
      message: "Error fetching chart of accounts",
      error: err.message
    });
    
  }
};

// Get Chart of Account by ID
export const getChartOfAccountById = async (req, res) => {
  try {
    const { id } = req.params;

    const account = await ChartOfAccounts.findById(id)
      .populate("accountGroupId", "name code type");

    if (!account || account.isDeleted) {
      return res.status(404).json({ message: "Account not found" });
    }

    res.status(200).json({
      message: "Chart of account fetched successfully",
      chartOfAccount: account
    });
  } catch (err) {
    console.error("Error fetching chart of account:", err);
    res.status(500).json({
      message: "Error fetching chart of account",
      error: err.message
    });
  }
};

// Update Chart of Account
export const updateChartOfAccount = async (req, res) => {
  try {
    const { id } = req.params;
    const { accountName, accountGroupId, description, isActive, isBank, bankName, accountTypeBank } = req.body;

    const account = await ChartOfAccounts.findById(id);

    if (!account || account.isDeleted) {
      return res.status(404).json({ message: "Account not found" });
    }

    if (accountName) account.accountName = accountName;
    if (accountGroupId) {
      const accountGroup = await AccountGroup.findById(accountGroupId);
      if (!accountGroup || accountGroup.isDeleted) {
        return res.status(400).json({ message: "Invalid account group" });
      }
      account.accountGroupId = accountGroupId;
    }
    if (description) account.description = description;
    if (isActive !== undefined) account.isActive = isActive;
    if (isBank !== undefined) account.isBank = isBank;
    if (bankName) account.bankName = bankName;
    if (accountTypeBank) account.accountTypeBank = accountTypeBank;

    account.updatedDate = Date.now();
    await account.save();
    await account.populate("accountGroupId", "name code type");

    res.status(200).json({
      message: "Chart of account updated successfully",
      chartOfAccount: account
    });
  } catch (err) {
    console.error("Error updating chart of account:", err);
    res.status(500).json({
      message: "Error updating chart of account",
      error: err.message
    });
  }
};

// Delete Chart of Account (Soft Delete)
export const deleteChartOfAccount = async (req, res) => {
  try {
    const { id } = req.params;

    const account = await ChartOfAccounts.findById(id);

    if (!account || account.isDeleted) {
      return res.status(404).json({ message: "Account not found" });
    }

    account.isDeleted = true;
    account.deletedAt = Date.now();
    await account.save();

    res.status(200).json({
      message: "Chart of account deleted successfully"
    });
  } catch (err) {
    console.error("Error deleting chart of account:", err);
    res.status(500).json({
      message: "Error deleting chart of account",
      error: err.message
    });
  }
};

// Get Bank Accounts
export const getBankAccounts = async (req, res) => {
  try {
    const accounts = await ChartOfAccounts.find({ isBank: true, isDeleted: false })
      .populate("accountGroupId", "name code type")
      .sort({ accountNumber: 1 });

    res.status(200).json({
      message: "Bank accounts fetched successfully",
      bankAccounts: accounts
    });
  } catch (err) {
    console.error("Error fetching bank accounts:", err);
    res.status(500).json({
      message: "Error fetching bank accounts",
      error: err.message
    });
  }
};

// Update Account Balance
export const updateAccountBalance = async (req, res) => {
  try {
    const { id } = req.params;
    const { amountChange } = req.body;

    const account = await ChartOfAccounts.findById(id);

    if (!account || account.isDeleted) {
      return res.status(404).json({ message: "Account not found" });
    }

    const amountChangeInFilas = Math.round(parseFloat(amountChange) * 100);
    account.currentBalance = (account.currentBalance || 0) + amountChangeInFilas;
    account.updatedDate = Date.now();

    await account.save();

    res.status(200).json({
      message: "Account balance updated successfully",
      chartOfAccount: account
    });
  } catch (err) {
    console.error("Error updating account balance:", err);
    res.status(500).json({
      message: "Error updating account balance",
      error: err.message
    });
  }
};
