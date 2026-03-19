import express from "express";
import Customer from "../../../Models/Customer.js";
import ChartOfAccounts from "../../../Models/ChartOfAccounts.js";
import AccountGroup from "../../../Models/AccountGroup.js";

const router = express.Router();

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

    // If payment type is "Credit Sale", create a ledger account
    if (req.body.paymentType === "Credit Sale") {
      try {
        console.log(`Creating ledger account for customer ${newCode} with payment type: ${req.body.paymentType}`);
        
        // Find or create "Sundry Debtors" account group
        let sundryDebtorsGroup = await AccountGroup.findOne({
          name: "SUNDRY DEBTORS",
          isDeleted: false
        });

        if (!sundryDebtorsGroup) {
          console.log("Sundry Debtors group not found, creating new one...");
          // Create Sundry Debtors group if it doesn't exist
          sundryDebtorsGroup = new AccountGroup({
            name: "SUNDRY DEBTORS",
            code: "SD",
            description: "Customer Receivables",
            level: 1,
            type: "ASSET",
            accountCategory: "BALANCE_SHEET",
            nature: "DEBIT",
            allowPosting: true,
            isActive: true
          });
          await sundryDebtorsGroup.save();
          console.log("Sundry Debtors group created:", sundryDebtorsGroup._id);
        } else {
          console.log("Sundry Debtors group found:", sundryDebtorsGroup._id);
        }

        let newAccountNumber = `SD-${newCode}`;
        
        // Create ledger account for the customer
        const customerLedger = new ChartOfAccounts({
          accountNumber: newAccountNumber,
          accountName: `${customer.name} (${newCode})`,
          accountGroupId: sundryDebtorsGroup._id,
          description: `Customer Receivable Account - ${customer.name}`,
          openingBalance: 0,
          currentBalance: 0,
          accountCategory: "BALANCE_SHEET",
          allowPosting: true,
          isActive: true
        });

        await customerLedger.save();
        console.log("Customer ledger account created:", customerLedger._id);

        // Update customer with ledger account reference
        customer.ledgerAccountId = customerLedger._id;
        await customer.save();
        console.log("Customer updated with ledgerAccountId:", customerLedger._id);
      } catch (ledgerError) {
        console.error("Error creating ledger account for Credit Sale customer:", ledgerError);
        console.error("Stack trace:", ledgerError.stack);
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

    // Check if name has changed and customer has a ledger account
    if (
      req.body.name && 
      req.body.name !== currentCustomer.name && 
      currentCustomer.ledgerAccountId
    ) {
      try {
        // Update the ledger account name
        const ledgerAccountName = `${req.body.name} (${currentCustomer.customerCode})`;
        await ChartOfAccounts.findByIdAndUpdate(
          currentCustomer.ledgerAccountId,
          {
            accountName: ledgerAccountName,
            updatedDate: new Date(),
          },
          { returnDocument: 'after' }
        );
      } catch (ledgerError) {
        console.error("Error updating ledger account name:", ledgerError);
        // Don't fail the customer update if ledger update fails
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
