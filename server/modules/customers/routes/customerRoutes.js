import express from "express";
import Customer from "../../../Models/Customer.js";
import ChartOfAccounts from "../../../Models/ChartOfAccounts.js";
import AccountGroup from "../../../Models/AccountGroup.js";

const router = express.Router();

// ================= HELPER FUNCTIONS =================

/**
 * Helper: Create ledger account for credit customer
 * @param {string} customerCode - Customer code (e.g., C001)
 * @param {string} customerName - Customer name
 * @param {string} description - Account description
 * @returns {Promise<Object>} - Created ledger account
 */
async function createCustomerLedger(customerCode, customerName, description = "") {
  try {
    console.log(`Creating ledger account for customer ${customerCode}`);
    
    // Find "RECEIVABLES" Level 2 sub-group (under ASSETS)
    // This is the proper accounting group for customer receivables
    let receivablesGroup = await AccountGroup.findOne({
      name: "RECEIVABLES",
      level: 2,
      code: "130000",
      isDeleted: false
    });

    if (!receivablesGroup) {
      console.log("⚠️  RECEIVABLES group (Level 2) not found, checking for SUNDRY DEBTORS...");
      
      // Fallback: Try to find SUNDRY DEBTORS at Level 2
      receivablesGroup = await AccountGroup.findOne({
        name: "SUNDRY DEBTORS",
        level: 2,
        isDeleted: false
      });

      if (!receivablesGroup) {
        console.log("❌ No suitable group found, creating SUNDRY DEBTORS at Level 2...");
        
        // Find main ASSETS group (Level 1)
        const assetsGroup = await AccountGroup.findOne({
          name: "ASSETS",
          level: 1,
          code: "100000",
          isDeleted: false
        });

        if (!assetsGroup) {
          throw new Error("ASSETS main group not found. Please seed chart of accounts first.");
        }

        // Create SUNDRY DEBTORS as Level 2 sub-group
        receivablesGroup = new AccountGroup({
          name: "SUNDRY DEBTORS",
          code: "130100",
          description: "Customer Receivables and Debtors",
          level: 2,
          parentGroupId: assetsGroup._id,
          type: "ASSET",
          accountCategory: "BALANCE_SHEET",
          nature: "DEBIT",
          allowPosting: false,
          isActive: true
        });
        await receivablesGroup.save();
        console.log("✓ SUNDRY DEBTORS Level 2 group created:", receivablesGroup._id);
      }
    } else {
      console.log("✓ RECEIVABLES group found:", receivablesGroup._id);
    }

    const newAccountNumber = `${receivablesGroup.code}-${customerCode}`;
    
    // Create ledger account for the customer
    const customerLedger = new ChartOfAccounts({
      accountNumber: newAccountNumber,
      accountName: `${customerName} (${customerCode})`,
      accountGroupId: receivablesGroup._id,
      description: description || `Customer Receivable Account - ${customerName}`,
      openingBalance: 0,
      currentBalance: 0,
      accountCategory: "BALANCE_SHEET",
      allowPosting: true,
      isActive: true
    });

    await customerLedger.save();
    console.log("✓ Customer ledger account created:", customerLedger._id);
    
    return customerLedger;
  } catch (error) {
    console.error("❌ Error creating customer ledger:", error);
    throw error;
  }
}

// ================= ADD CUSTOMER =================
router.post("/addcustomer", async (req, res) => {
  try {
    // Country isolation: Customer MUST have country specified (NOT international sales)
    const { country } = req.body;
    if (!country || !['AE', 'OM', 'IN'].includes(country)) {
      return res.status(400).json({ 
        message: "Customer must specify a country (AE, OM, or IN) - not international sales"
      });
    }

    const lastCustomer = await Customer.findOne()
      .sort({ customerCode: -1 });

    let newCode = "C001";

    if (lastCustomer?.customerCode) {
      const num = parseInt(lastCustomer.customerCode.replace(/\D/g, ""), 10);
      newCode = `C${String(num + 1).padStart(3, "0")}`;
    }

    const customer = new Customer({
      ...req.body,
      customerCode: newCode,
      country: country,  // Enforce country isolation
      isSupplier: req.body.isSupplier === true, // Default: false - can also sell to us
    });

    await customer.save();

    // Accounting Rule 1: If payment type is "Credit Sale", create a ledger account
    if (req.body.paymentType === "Credit Sale") {
      try {
        const customerLedger = await createCustomerLedger(
          newCode,
          customer.name,
          `Customer Receivable Account - ${customer.name}`
        );
        
        // Update customer with ledger account reference
        customer.ledgerAccountId = customerLedger._id;
        await customer.save();
        console.log("Customer updated with ledgerAccountId:", customerLedger._id);
      } catch (ledgerError) {
        console.error("Error creating ledger account for Credit Sale customer:", ledgerError);
        // Don't fail the customer creation if ledger creation fails, just log the error
      }
    } else {
      console.log(`Payment type is: "${req.body.paymentType}" - skipping ledger creation`);
    }

    res.status(201).json({
      message: "Customer added successfully",
      customer,
    });
  } catch (err) {
    console.error("Error adding customer:", err);
    res.status(500).json({
      message: "Error adding customer",
      error: err.message,
    });
  }
});

// ================= GET CUSTOMERS =================
// Pagination + Search
router.get("/getcustomers", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || "";
    const country = req.query.country || req.body.country;

    // Country isolation: Filter by company's country (NOT international sales)
    const query = { isDeleted: false };
    
    // Add country filter if provided - MANDATORY for data isolation
    if (country) {
      if (!['AE', 'OM', 'IN'].includes(country)) {
        return res.status(400).json({ message: "Invalid country specified" });
      }
      query.country = country;
    }

    if (search) {
      query.$or = [
        { customerCode: { $regex: search, $options: "i" } },
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
      ];
    }

    const totalCustomers = await Customer.countDocuments(query);
    const customers = await Customer.find(query)
      .sort({ createdDate: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.status(200).json({
      message: "Customers fetched successfully",
      customers,
      total: totalCustomers,
      page,
      pages: Math.ceil(totalCustomers / limit),
    });
  } catch (err) {
    console.error("Error fetching customers:", err);
    res.status(500).json({
      message: "Error fetching customers",
      error: err.message,
    });
  }
});

// ================= GET CUSTOMER BY ID =================
router.get("/getcustomer/:id", async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);

    if (!customer || customer.isDeleted) {
      return res.status(404).json({
        message: "Customer not found",
      });
    }

    res.status(200).json({
      message: "Customer fetched successfully",
      customer,
    });
  } catch (err) {
    console.error("Error fetching customer:", err);
    res.status(500).json({
      message: "Error fetching customer",
      error: err.message,
    });
  }
});

// ================= UPDATE CUSTOMER =================
router.put("/updatecustomer/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get current customer data before update
    const currentCustomer = await Customer.findById(id);
    if (!currentCustomer) {
      return res.status(404).json({
        message: "Customer not found",
      });
    }

    const updateData = {
      ...req.body,
      updatedDate: new Date(),
    };
    
    // Explicitly handle isSupplier field
    if (req.body.isSupplier !== undefined) {
      updateData.isSupplier = req.body.isSupplier === true;
    }

    // ========== ACCOUNTING RULE 2: Customer name changed -> Update ledger name ==========
    if (
      req.body.name && 
      req.body.name !== currentCustomer.name && 
      currentCustomer.ledgerAccountId
    ) {
      try {
        const ledgerAccountName = `${req.body.name} (${currentCustomer.customerCode})`;
        await ChartOfAccounts.findByIdAndUpdate(
          currentCustomer.ledgerAccountId,
          {
            accountName: ledgerAccountName,
            description: `Customer Receivable Account - ${req.body.name}`,
            updatedDate: new Date(),
          },
          { returnDocument: 'after' }
        );
        console.log("Ledger account name updated for customer:", currentCustomer.customerCode);
      } catch (ledgerError) {
        console.error("Error updating ledger account name:", ledgerError);
        // Don't fail the customer update if ledger update fails
      }
    }

    // ========== ACCOUNTING RULE 3: Payment type changed to Credit -> Create ledger if not exists ==========
    const currentPaymentType = currentCustomer.paymentType;
    const newPaymentType = req.body.paymentType;
    
    if (newPaymentType === "Credit Sale" && currentPaymentType !== "Credit Sale") {
      // Customer changed from non-credit to credit
      if (!currentCustomer.ledgerAccountId) {
        try {
          console.log(`Creating ledger for customer changing to Credit Sale: ${currentCustomer.customerCode}`);
          const customerLedger = await createCustomerLedger(
            currentCustomer.customerCode,
            req.body.name || currentCustomer.name,
            `Customer Receivable Account - ${req.body.name || currentCustomer.name}`
          );
          updateData.ledgerAccountId = customerLedger._id;
          console.log("Ledger created and customer updated for payment type change");
        } catch (ledgerError) {
          console.error("Error creating ledger when changing to Credit Sale:", ledgerError);
        }
      }
    }

    // ========== ACCOUNTING RULE 4: Credit customer with no ledger -> Create ledger ==========
    if (
      newPaymentType === "Credit Sale" && 
      !currentCustomer.ledgerAccountId && 
      !updateData.ledgerAccountId // If not already created above
    ) {
      try {
        console.log(`Creating missing ledger for existing credit customer: ${currentCustomer.customerCode}`);
        const customerLedger = await createCustomerLedger(
          currentCustomer.customerCode,
          req.body.name || currentCustomer.name,
          `Customer Receivable Account - ${req.body.name || currentCustomer.name}`
        );
        updateData.ledgerAccountId = customerLedger._id;
        console.log("Missing ledger created for credit customer");
      } catch (ledgerError) {
        console.error("Error creating missing ledger for credit customer:", ledgerError);
      }
    }

    const customer = await Customer.findByIdAndUpdate(id, updateData, {
      returnDocument: 'after',
      runValidators: true,
    });

    res.status(200).json({
      message: "Customer updated successfully",
      customer,
    });
  } catch (err) {
    console.error("Error updating customer:", err);
    res.status(500).json({
      message: "Error updating customer",
      error: err.message,
    });
  }
});

// ================= DELETE CUSTOMER (Soft Delete) =================
router.delete("/deletecustomer/:id", async (req, res) => {
  try {
    const customer = await Customer.findByIdAndUpdate(
      req.params.id,
      {
        isDeleted: true,
        deletedAt: new Date(),
        updatedDate: new Date(),
      },
      { returnDocument: 'after' }
    );

    if (!customer) {
      return res.status(404).json({
        message: "Customer not found",
      });
    }

    res.status(200).json({
      message: "Customer deleted successfully",
      customer,
    });
  } catch (err) {
    console.error("Error deleting customer:", err);
    res.status(500).json({
      message: "Error deleting customer",
      error: err.message,
    });
  }
});

export default router;
