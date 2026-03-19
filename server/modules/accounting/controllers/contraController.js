import Contra from "../../../Models/Contra.js";
import ChartOfAccounts from "../../../Models/ChartOfAccounts.js";

// Create Contra
export const createContra = async (req, res) => {
  try {
    const {
      contraDate,
      fromAccountId,
      toAccountId,
      amount,
      transferType,
      referenceNumber,
      description,
      chequeNumber,
      chequeDate,
      createdBy
    } = req.body;

    // Validation
    if (!fromAccountId || !toAccountId || !amount || !transferType) {
      return res.status(400).json({
        message: "From Account, To Account, Amount, and Transfer Type are required"
      });
    }

    if (fromAccountId === toAccountId) {
      return res.status(400).json({
        message: "From and To accounts cannot be the same"
      });
    }

    if (amount <= 0) {
      return res.status(400).json({ message: "Amount must be greater than 0" });
    }

    // Verify accounts exist and are cash/bank accounts
    const fromAccount = await ChartOfAccounts.findById(fromAccountId).populate('accountGroupId');
    const toAccount = await ChartOfAccounts.findById(toAccountId).populate('accountGroupId');

    if (!fromAccount || fromAccount.isDeleted) {
      return res.status(400).json({ message: "From Account not found" });
    }

    if (!toAccount || toAccount.isDeleted) {
      return res.status(400).json({ message: "To Account not found" });
    }

    // Validate transfer type matches account types
    const isCashAccount = (acc) => 
      acc.accountGroupId?.name?.toLowerCase().includes("cash") || 
      acc.accountGroupId?.name?.toLowerCase().includes("current assets");
    
    const isBankAccount = (acc) => acc.isBank;

    if (transferType === "CASH_TO_BANK") {
      if (!isCashAccount(fromAccount) || !isBankAccount(toAccount)) {
        return res.status(400).json({
          message: "For Cash to Bank transfer, From must be Cash and To must be Bank"
        });
      }
    } else if (transferType === "BANK_TO_CASH") {
      if (!isBankAccount(fromAccount) || !isCashAccount(toAccount)) {
        return res.status(400).json({
          message: "For Bank to Cash transfer, From must be Bank and To must be Cash"
        });
      }
    } else if (transferType === "BANK_TO_BANK") {
      if (!isBankAccount(fromAccount) || !isBankAccount(toAccount)) {
        return res.status(400).json({
          message: "For Bank to Bank transfer, both accounts must be Bank accounts"
        });
      }
    }

    const contra = new Contra({
      contraDate: contraDate || new Date(),
      fromAccountId,
      toAccountId,
      amount: Math.round(amount * 100),
      transferType,
      referenceNumber: referenceNumber || "",
      description: description || "",
      chequeNumber: chequeNumber || "",
      chequeDate: chequeDate || null,
      createdBy: createdBy || "",
      status: "PENDING"
    });

    await contra.save();

    const populatedContra = await Contra.findById(contra._id)
      .populate('fromAccountId', 'accountNumber accountName')
      .populate('toAccountId', 'accountNumber accountName');

    res.status(201).json({
      message: "Contra voucher created successfully",
      contra: populatedContra
    });
  } catch (err) {
    console.error("Error creating contra:", err);
    res.status(500).json({
      message: "Error creating contra voucher",
      error: err.message
    });
  }
};

// Get All Contras
export const getContras = async (req, res) => {
  try {
    const { status, transferType, startDate, endDate } = req.query;

    const filter = { isDeleted: false };

    if (status) {
      filter.status = status;
    }

    if (transferType) {
      filter.transferType = transferType;
    }

    if (startDate || endDate) {
      filter.contraDate = {};
      if (startDate) {
        filter.contraDate.$gte = new Date(startDate);
      }
      if (endDate) {
        filter.contraDate.$lte = new Date(endDate);
      }
    }

    const contras = await Contra.find(filter)
      .populate('fromAccountId', 'accountNumber accountName')
      .populate('toAccountId', 'accountNumber accountName')
      .sort({ contraDate: -1, createdAt: -1 });

    res.status(200).json({
      message: "Contras fetched successfully",
      contras
    });
  } catch (err) {
    console.error("Error fetching contras:", err);
    res.status(500).json({
      message: "Error fetching contras",
      error: err.message
    });
  }
};

// Get Contra by ID
export const getContraById = async (req, res) => {
  try {
    const { id } = req.params;

    const contra = await Contra.findById(id)
      .populate('fromAccountId', 'accountNumber accountName')
      .populate('toAccountId', 'accountNumber accountName');

    if (!contra || contra.isDeleted) {
      return res.status(404).json({ message: "Contra voucher not found" });
    }

    res.status(200).json({
      message: "Contra fetched successfully",
      contra
    });
  } catch (err) {
    console.error("Error fetching contra:", err);
    res.status(500).json({
      message: "Error fetching contra",
      error: err.message
    });
  }
};

// Update Contra
export const updateContra = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      contraDate,
      fromAccountId,
      toAccountId,
      amount,
      transferType,
      referenceNumber,
      description,
      chequeNumber,
      chequeDate
    } = req.body;

    const contra = await Contra.findById(id);

    if (!contra || contra.isDeleted) {
      return res.status(404).json({ message: "Contra voucher not found" });
    }

    if (contra.status === "COMPLETED" || contra.status === "CANCELLED") {
      return res.status(400).json({
        message: `Cannot update contra with status: ${contra.status}`
      });
    }

    // Update fields
    if (contraDate) contra.contraDate = contraDate;
    if (fromAccountId) contra.fromAccountId = fromAccountId;
    if (toAccountId) contra.toAccountId = toAccountId;
    if (amount) contra.amount = Math.round(amount * 100);
    if (transferType) contra.transferType = transferType;
    if (referenceNumber !== undefined) contra.referenceNumber = referenceNumber;
    if (description !== undefined) contra.description = description;
    if (chequeNumber !== undefined) contra.chequeNumber = chequeNumber;
    if (chequeDate !== undefined) contra.chequeDate = chequeDate;

    await contra.save();

    const updatedContra = await Contra.findById(id)
      .populate('fromAccountId', 'accountNumber accountName')
      .populate('toAccountId', 'accountNumber accountName');

    res.status(200).json({
      message: "Contra updated successfully",
      contra: updatedContra
    });
  } catch (err) {
    console.error("Error updating contra:", err);
    res.status(500).json({
      message: "Error updating contra",
      error: err.message
    });
  }
};

// Approve Contra
export const approveContra = async (req, res) => {
  try {
    const { id } = req.params;
    const { approvedBy } = req.body;

    const contra = await Contra.findById(id);

    if (!contra || contra.isDeleted) {
      return res.status(404).json({ message: "Contra voucher not found" });
    }

    if (contra.status !== "PENDING") {
      return res.status(400).json({
        message: `Cannot approve contra with status: ${contra.status}`
      });
    }

    contra.status = "APPROVED";
    contra.approvedBy = approvedBy || "System";
    contra.approvedDate = new Date();

    await contra.save();

    res.status(200).json({
      message: "Contra approved successfully",
      contra
    });
  } catch (err) {
    console.error("Error approving contra:", err);
    res.status(500).json({
      message: "Error approving contra",
      error: err.message
    });
  }
};

// Complete Contra (execute the transfer)
export const completeContra = async (req, res) => {
  try {
    const { id } = req.params;

    const contra = await Contra.findById(id);

    if (!contra || contra.isDeleted) {
      return res.status(404).json({ message: "Contra voucher not found" });
    }

    if (contra.status !== "APPROVED") {
      return res.status(400).json({
        message: "Contra must be approved before completing"
      });
    }

    contra.status = "COMPLETED";
    // TODO: Create journal entry here
    // Debit: toAccountId (receiving account)
    // Credit: fromAccountId (sending account)

    await contra.save();

    res.status(200).json({
      message: "Contra completed successfully",
      contra
    });
  } catch (err) {
    console.error("Error completing contra:", err);
    res.status(500).json({
      message: "Error completing contra",
      error: err.message
    });
  }
};

// Cancel Contra
export const cancelContra = async (req, res) => {
  try {
    const { id } = req.params;

    const contra = await Contra.findById(id);

    if (!contra || contra.isDeleted) {
      return res.status(404).json({ message: "Contra voucher not found" });
    }

    if (contra.status === "COMPLETED") {
      return res.status(400).json({
        message: "Cannot cancel a completed contra. Please reverse the journal entry first."
      });
    }

    contra.status = "CANCELLED";
    await contra.save();

    res.status(200).json({
      message: "Contra cancelled successfully",
      contra
    });
  } catch (err) {
    console.error("Error cancelling contra:", err);
    res.status(500).json({
      message: "Error cancelling contra",
      error: err.message
    });
  }
};

// Delete Contra (soft delete)
export const deleteContra = async (req, res) => {
  try {
    const { id } = req.params;

    const contra = await Contra.findById(id);

    if (!contra || contra.isDeleted) {
      return res.status(404).json({ message: "Contra voucher not found" });
    }

    if (contra.status === "COMPLETED") {
      return res.status(400).json({
        message: "Cannot delete a completed contra"
      });
    }

    contra.isDeleted = true;
    contra.deletedAt = new Date();
    await contra.save();

    res.status(200).json({
      message: "Contra deleted successfully"
    });
  } catch (err) {
    console.error("Error deleting contra:", err);
    res.status(500).json({
      message: "Error deleting contra",
      error: err.message
    });
  }
};

// Get Contra Stats
export const getContraStats = async (req, res) => {
  try {
    const stats = await Contra.aggregate([
      { $match: { isDeleted: false } },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          totalAmount: { $sum: "$amount" }
        }
      }
    ]);

    const formattedStats = stats.reduce((acc, stat) => {
      acc[stat._id] = {
        count: stat.count,
        totalAmount: stat.totalAmount / 100
      };
      return acc;
    }, {});

    res.status(200).json({
      message: "Contra stats fetched successfully",
      stats: formattedStats
    });
  } catch (err) {
    console.error("Error fetching contra stats:", err);
    res.status(500).json({
      message: "Error fetching contra stats",
      error: err.message
    });
  }
};
