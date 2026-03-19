import Receipt from "../../../Models/Receipt.js";
import ChartOfAccounts from "../../../Models/ChartOfAccounts.js";

// Create Receipt
export const createReceipt = async (req, res) => {
  try {
    const {
      receiptDate,
      receiveFromAccountId,
      receiveIntoAccountId,
      amount,
      receiptMethod,
      referenceNumber,
      description,
      chequeNumber,
      chequeDate,
      bankName,
      createdBy
    } = req.body;

    // Validation
    if (!receiveFromAccountId || !receiveIntoAccountId || !amount) {
      return res.status(400).json({
        message: "Receive From Account, Receive Into Account, and Amount are required"
      });
    }

    if (amount <= 0) {
      return res.status(400).json({ message: "Amount must be greater than 0" });
    }

    // Verify accounts exist
    const receiveFromAccount = await ChartOfAccounts.findById(receiveFromAccountId);
    const receiveIntoAccount = await ChartOfAccounts.findById(receiveIntoAccountId);

    if (!receiveFromAccount || receiveFromAccount.isDeleted) {
      return res.status(400).json({ message: "Receive From Account not found" });
    }

    if (!receiveIntoAccount || receiveIntoAccount.isDeleted) {
      return res.status(400).json({ message: "Receive Into Account not found" });
    }

    const receipt = new Receipt({
      receiptDate: receiptDate || new Date(),
      receiveFromAccountId,
      receiveIntoAccountId,
      amount: Math.round(amount * 100), // Store in fils/cents
      receiptMethod: receiptMethod || "CASH",
      referenceNumber: referenceNumber || "",
      description: description || "",
      chequeNumber: chequeNumber || "",
      chequeDate: chequeDate || null,
      bankName: bankName || "",
      createdBy: createdBy || "",
      status: "PENDING"
    });

    await receipt.save();

    // Populate the saved receipt
    const populatedReceipt = await Receipt.findById(receipt._id)
      .populate('receiveFromAccountId', 'accountNumber accountName')
      .populate('receiveIntoAccountId', 'accountNumber accountName');

    res.status(201).json({
      message: "Receipt created successfully",
      receipt: populatedReceipt
    });
  } catch (err) {
    console.error("Error creating receipt:", err);
    res.status(500).json({
      message: "Error creating receipt",
      error: err.message
    });
  }
};

// Get All Receipts
export const getReceipts = async (req, res) => {
  try {
    const { status, receiptMethod, startDate, endDate } = req.query;

    const filter = { isDeleted: false };

    if (status) {
      filter.status = status;
    }

    if (receiptMethod) {
      filter.receiptMethod = receiptMethod;
    }

    if (startDate || endDate) {
      filter.receiptDate = {};
      if (startDate) {
        filter.receiptDate.$gte = new Date(startDate);
      }
      if (endDate) {
        filter.receiptDate.$lte = new Date(endDate);
      }
    }

    const receipts = await Receipt.find(filter)
      .populate('receiveFromAccountId', 'accountNumber accountName')
      .populate('receiveIntoAccountId', 'accountNumber accountName')
      .sort({ receiptDate: -1, createdAt: -1 });

    res.status(200).json({
      message: "Receipts fetched successfully",
      receipts
    });
  } catch (err) {
    console.error("Error fetching receipts:", err);
    res.status(500).json({
      message: "Error fetching receipts",
      error: err.message
    });
  }
};

// Get Receipt by ID
export const getReceiptById = async (req, res) => {
  try {
    const { id } = req.params;

    const receipt = await Receipt.findById(id)
      .populate('receiveFromAccountId', 'accountNumber accountName')
      .populate('receiveIntoAccountId', 'accountNumber accountName');

    if (!receipt || receipt.isDeleted) {
      return res.status(404).json({ message: "Receipt not found" });
    }

    res.status(200).json({
      message: "Receipt fetched successfully",
      receipt
    });
  } catch (err) {
    console.error("Error fetching receipt:", err);
    res.status(500).json({
      message: "Error fetching receipt",
      error: err.message
    });
  }
};

// Update Receipt
export const updateReceipt = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      receiptDate,
      receiveFromAccountId,
      receiveIntoAccountId,
      amount,
      receiptMethod,
      referenceNumber,
      description,
      chequeNumber,
      chequeDate,
      bankName
    } = req.body;

    const receipt = await Receipt.findById(id);

    if (!receipt || receipt.isDeleted) {
      return res.status(404).json({ message: "Receipt not found" });
    }

    // Cannot update if already received or cancelled
    if (receipt.status === "RECEIVED" || receipt.status === "CANCELLED") {
      return res.status(400).json({
        message: `Cannot update receipt with status: ${receipt.status}`
      });
    }

    // Update fields
    if (receiptDate) receipt.receiptDate = receiptDate;
    if (receiveFromAccountId) receipt.receiveFromAccountId = receiveFromAccountId;
    if (receiveIntoAccountId) receipt.receiveIntoAccountId = receiveIntoAccountId;
    if (amount) receipt.amount = Math.round(amount * 100);
    if (receiptMethod) receipt.receiptMethod = receiptMethod;
    if (referenceNumber !== undefined) receipt.referenceNumber = referenceNumber;
    if (description !== undefined) receipt.description = description;
    if (chequeNumber !== undefined) receipt.chequeNumber = chequeNumber;
    if (chequeDate !== undefined) receipt.chequeDate = chequeDate;
    if (bankName !== undefined) receipt.bankName = bankName;

    await receipt.save();

    const updatedReceipt = await Receipt.findById(id)
      .populate('receiveFromAccountId', 'accountNumber accountName')
      .populate('receiveIntoAccountId', 'accountNumber accountName');

    res.status(200).json({
      message: "Receipt updated successfully",
      receipt: updatedReceipt
    });
  } catch (err) {
    console.error("Error updating receipt:", err);
    res.status(500).json({
      message: "Error updating receipt",
      error: err.message
    });
  }
};

// Approve Receipt
export const approveReceipt = async (req, res) => {
  try {
    const { id } = req.params;
    const { approvedBy } = req.body;

    const receipt = await Receipt.findById(id);

    if (!receipt || receipt.isDeleted) {
      return res.status(404).json({ message: "Receipt not found" });
    }

    if (receipt.status !== "PENDING") {
      return res.status(400).json({
        message: `Cannot approve receipt with status: ${receipt.status}`
      });
    }

    receipt.status = "APPROVED";
    receipt.approvedBy = approvedBy || "System";
    receipt.approvedDate = new Date();

    await receipt.save();

    res.status(200).json({
      message: "Receipt approved successfully",
      receipt
    });
  } catch (err) {
    console.error("Error approving receipt:", err);
    res.status(500).json({
      message: "Error approving receipt",
      error: err.message
    });
  }
};

// Mark Receipt as Received
export const markReceiptAsReceived = async (req, res) => {
  try {
    const { id } = req.params;

    const receipt = await Receipt.findById(id);

    if (!receipt || receipt.isDeleted) {
      return res.status(404).json({ message: "Receipt not found" });
    }

    if (receipt.status !== "APPROVED") {
      return res.status(400).json({
        message: "Receipt must be approved before marking as received"
      });
    }

    receipt.status = "RECEIVED";
    // TODO: Create journal entry here
    // Debit: Cash/Bank (receiveIntoAccountId)
    // Credit: Income/Debtor (receiveFromAccountId)

    await receipt.save();

    res.status(200).json({
      message: "Receipt marked as received",
      receipt
    });
  } catch (err) {
    console.error("Error marking receipt as received:", err);
    res.status(500).json({
      message: "Error marking receipt as received",
      error: err.message
    });
  }
};

// Cancel Receipt
export const cancelReceipt = async (req, res) => {
  try {
    const { id } = req.params;

    const receipt = await Receipt.findById(id);

    if (!receipt || receipt.isDeleted) {
      return res.status(404).json({ message: "Receipt not found" });
    }

    if (receipt.status === "RECEIVED") {
      return res.status(400).json({
        message: "Cannot cancel a received receipt. Please reverse the journal entry first."
      });
    }

    receipt.status = "CANCELLED";
    await receipt.save();

    res.status(200).json({
      message: "Receipt cancelled successfully",
      receipt
    });
  } catch (err) {
    console.error("Error cancelling receipt:", err);
    res.status(500).json({
      message: "Error cancelling receipt",
      error: err.message
    });
  }
};

// Mark Receipt as Bounced
export const markReceiptAsBounced = async (req, res) => {
  try {
    const { id } = req.params;

    const receipt = await Receipt.findById(id);

    if (!receipt || receipt.isDeleted) {
      return res.status(404).json({ message: "Receipt not found" });
    }

    if (receipt.receiptMethod !== "CHEQUE") {
      return res.status(400).json({
        message: "Only cheque receipts can be marked as bounced"
      });
    }

    receipt.status = "BOUNCED";
    // TODO: Reverse journal entry if it was already received
    
    await receipt.save();

    res.status(200).json({
      message: "Receipt marked as bounced",
      receipt
    });
  } catch (err) {
    console.error("Error marking receipt as bounced:", err);
    res.status(500).json({
      message: "Error marking receipt as bounced",
      error: err.message
    });
  }
};

// Delete Receipt (soft delete)
export const deleteReceipt = async (req, res) => {
  try {
    const { id } = req.params;

    const receipt = await Receipt.findById(id);

    if (!receipt || receipt.isDeleted) {
      return res.status(404).json({ message: "Receipt not found" });
    }

    if (receipt.status === "RECEIVED") {
      return res.status(400).json({
        message: "Cannot delete a received receipt"
      });
    }

    receipt.isDeleted = true;
    receipt.deletedAt = new Date();
    await receipt.save();

    res.status(200).json({
      message: "Receipt deleted successfully"
    });
  } catch (err) {
    console.error("Error deleting receipt:", err);
    res.status(500).json({
      message: "Error deleting receipt",
      error: err.message
    });
  }
};

// Get Receipt Stats
export const getReceiptStats = async (req, res) => {
  try {
    const stats = await Receipt.aggregate([
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
        totalAmount: stat.totalAmount / 100 // Convert back from cents
      };
      return acc;
    }, {});

    res.status(200).json({
      message: "Receipt stats fetched successfully",
      stats: formattedStats
    });
  } catch (err) {
    console.error("Error fetching receipt stats:", err);
    res.status(500).json({
      message: "Error fetching receipt stats",
      error: err.message
    });
  }
};
