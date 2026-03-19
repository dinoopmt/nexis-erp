import Payment from "../../../Models/Payment.js";
import ChartOfAccounts from "../../../Models/ChartOfAccounts.js";

// Create Payment
export const createPayment = async (req, res) => {
  try {
    const {
      paymentDate,
      payFromAccountId,
      payToAccountId,
      amount,
      paymentMethod,
      referenceNumber,
      description,
      chequeNumber,
      chequeDate,
      bankName,
      createdBy
    } = req.body;

    // Validation
    if (!payFromAccountId || !payToAccountId || !amount) {
      return res.status(400).json({
        message: "Pay From Account, Pay To Account, and Amount are required"
      });
    }

    if (amount <= 0) {
      return res.status(400).json({ message: "Amount must be greater than 0" });
    }

    // Verify accounts exist
    const payFromAccount = await ChartOfAccounts.findById(payFromAccountId);
    const payToAccount = await ChartOfAccounts.findById(payToAccountId);

    if (!payFromAccount || payFromAccount.isDeleted) {
      return res.status(400).json({ message: "Pay From Account not found" });
    }

    if (!payToAccount || payToAccount.isDeleted) {
      return res.status(400).json({ message: "Pay To Account not found" });
    }

    const payment = new Payment({
      paymentDate: paymentDate || new Date(),
      payFromAccountId,
      payToAccountId,
      amount: Math.round(amount * 100), // Store in fils/cents
      paymentMethod: paymentMethod || "CASH",
      referenceNumber: referenceNumber || "",
      description: description || "",
      chequeNumber: chequeNumber || "",
      chequeDate: chequeDate || null,
      bankName: bankName || "",
      createdBy: createdBy || "",
      status: "PENDING"
    });

    await payment.save();

    // Populate the saved payment
    const populatedPayment = await Payment.findById(payment._id)
      .populate('payFromAccountId', 'accountNumber accountName')
      .populate('payToAccountId', 'accountNumber accountName');

    res.status(201).json({
      message: "Payment created successfully",
      payment: populatedPayment
    });
  } catch (err) {
    console.error("Error creating payment:", err);
    res.status(500).json({
      message: "Error creating payment",
      error: err.message
    });
  }
};

// Get All Payments
export const getPayments = async (req, res) => {
  try {
    const { status, paymentMethod, startDate, endDate } = req.query;

    const filter = { isDeleted: false };

    if (status) {
      filter.status = status;
    }

    if (paymentMethod) {
      filter.paymentMethod = paymentMethod;
    }

    if (startDate || endDate) {
      filter.paymentDate = {};
      if (startDate) {
        filter.paymentDate.$gte = new Date(startDate);
      }
      if (endDate) {
        filter.paymentDate.$lte = new Date(endDate);
      }
    }

    const payments = await Payment.find(filter)
      .populate('payFromAccountId', 'accountNumber accountName')
      .populate('payToAccountId', 'accountNumber accountName')
      .sort({ paymentDate: -1, createdAt: -1 });

    res.status(200).json({
      message: "Payments fetched successfully",
      payments
    });
  } catch (err) {
    console.error("Error fetching payments:", err);
    res.status(500).json({
      message: "Error fetching payments",
      error: err.message
    });
  }
};

// Get Payment by ID
export const getPaymentById = async (req, res) => {
  try {
    const { id } = req.params;

    const payment = await Payment.findById(id)
      .populate('payFromAccountId', 'accountNumber accountName')
      .populate('payToAccountId', 'accountNumber accountName');

    if (!payment || payment.isDeleted) {
      return res.status(404).json({ message: "Payment not found" });
    }

    res.status(200).json({
      message: "Payment fetched successfully",
      payment
    });
  } catch (err) {
    console.error("Error fetching payment:", err);
    res.status(500).json({
      message: "Error fetching payment",
      error: err.message
    });
  }
};

// Update Payment
export const updatePayment = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      paymentDate,
      payFromAccountId,
      payToAccountId,
      amount,
      paymentMethod,
      referenceNumber,
      description,
      chequeNumber,
      chequeDate,
      bankName
    } = req.body;

    const payment = await Payment.findById(id);

    if (!payment || payment.isDeleted) {
      return res.status(404).json({ message: "Payment not found" });
    }

    // Cannot update if already paid or cancelled
    if (payment.status === "PAID" || payment.status === "CANCELLED") {
      return res.status(400).json({
        message: `Cannot update payment with status: ${payment.status}`
      });
    }

    // Update fields
    if (paymentDate) payment.paymentDate = paymentDate;
    if (payFromAccountId) payment.payFromAccountId = payFromAccountId;
    if (payToAccountId) payment.payToAccountId = payToAccountId;
    if (amount) payment.amount = Math.round(amount * 100);
    if (paymentMethod) payment.paymentMethod = paymentMethod;
    if (referenceNumber !== undefined) payment.referenceNumber = referenceNumber;
    if (description !== undefined) payment.description = description;
    if (chequeNumber !== undefined) payment.chequeNumber = chequeNumber;
    if (chequeDate !== undefined) payment.chequeDate = chequeDate;
    if (bankName !== undefined) payment.bankName = bankName;

    await payment.save();

    const updatedPayment = await Payment.findById(id)
      .populate('payFromAccountId', 'accountNumber accountName')
      .populate('payToAccountId', 'accountNumber accountName');

    res.status(200).json({
      message: "Payment updated successfully",
      payment: updatedPayment
    });
  } catch (err) {
    console.error("Error updating payment:", err);
    res.status(500).json({
      message: "Error updating payment",
      error: err.message
    });
  }
};

// Approve Payment
export const approvePayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { approvedBy } = req.body;

    const payment = await Payment.findById(id);

    if (!payment || payment.isDeleted) {
      return res.status(404).json({ message: "Payment not found" });
    }

    if (payment.status !== "PENDING") {
      return res.status(400).json({
        message: `Cannot approve payment with status: ${payment.status}`
      });
    }

    payment.status = "APPROVED";
    payment.approvedBy = approvedBy || "";
    payment.approvedDate = new Date();

    await payment.save();

    res.status(200).json({
      message: "Payment approved successfully",
      payment
    });
  } catch (err) {
    console.error("Error approving payment:", err);
    res.status(500).json({
      message: "Error approving payment",
      error: err.message
    });
  }
};

// Mark Payment as Paid
export const markPaymentAsPaid = async (req, res) => {
  try {
    const { id } = req.params;

    const payment = await Payment.findById(id);

    if (!payment || payment.isDeleted) {
      return res.status(404).json({ message: "Payment not found" });
    }

    if (payment.status !== "PENDING" && payment.status !== "APPROVED") {
      return res.status(400).json({
        message: `Cannot mark as paid. Current status: ${payment.status}`
      });
    }

    payment.status = "PAID";

    await payment.save();

    res.status(200).json({
      message: "Payment marked as paid",
      payment
    });
  } catch (err) {
    console.error("Error marking payment as paid:", err);
    res.status(500).json({
      message: "Error marking payment as paid",
      error: err.message
    });
  }
};

// Cancel Payment
export const cancelPayment = async (req, res) => {
  try {
    const { id } = req.params;

    const payment = await Payment.findById(id);

    if (!payment || payment.isDeleted) {
      return res.status(404).json({ message: "Payment not found" });
    }

    if (payment.status === "PAID") {
      return res.status(400).json({
        message: "Cannot cancel a paid payment"
      });
    }

    payment.status = "CANCELLED";

    await payment.save();

    res.status(200).json({
      message: "Payment cancelled successfully",
      payment
    });
  } catch (err) {
    console.error("Error cancelling payment:", err);
    res.status(500).json({
      message: "Error cancelling payment",
      error: err.message
    });
  }
};

// Delete Payment (Soft Delete)
export const deletePayment = async (req, res) => {
  try {
    const { id } = req.params;

    const payment = await Payment.findById(id);

    if (!payment || payment.isDeleted) {
      return res.status(404).json({ message: "Payment not found" });
    }

    if (payment.status === "PAID") {
      return res.status(400).json({
        message: "Cannot delete a paid payment"
      });
    }

    payment.isDeleted = true;
    payment.deletedAt = new Date();

    await payment.save();

    res.status(200).json({
      message: "Payment deleted successfully"
    });
  } catch (err) {
    console.error("Error deleting payment:", err);
    res.status(500).json({
      message: "Error deleting payment",
      error: err.message
    });
  }
};

// Get Payment Stats
export const getPaymentStats = async (req, res) => {
  try {
    const stats = await Payment.aggregate([
      { $match: { isDeleted: false } },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          totalAmount: { $sum: "$amount" }
        }
      }
    ]);

    const formattedStats = {};
    stats.forEach(s => {
      formattedStats[s._id] = {
        count: s.count,
        totalAmount: s.totalAmount / 100
      };
    });

    res.status(200).json({
      message: "Payment stats fetched successfully",
      stats: formattedStats
    });
  } catch (err) {
    console.error("Error fetching payment stats:", err);
    res.status(500).json({
      message: "Error fetching payment stats",
      error: err.message
    });
  }
};
