import Vendor from "../../../Models/CreateVendor.js";
import ChartOfAccounts from "../../../Models/ChartOfAccounts.js";
import AccountGroup from "../../../Models/AccountGroup.js";

// ================= ADD VENDOR =================
export const addVendor = async (req, res) => {
  try {
    const { 
      name, email, phone, address, city, country, 
      taxNumber, gstNumber, vatId, taxType, taxGroupId,
      paymentTerms, paymentType, creditDays, status, bankName, accountNumber, accountHolder,
      isSupplier, isShipper, isCustomer
    } = req.body;

    // Validation
    if (!name || !name.trim()) {
      return res.status(400).json({ message: "Vendor name is required" });
    }
    if (!country) {
      return res.status(400).json({ message: "Country is required" });
    }
    // Email and phone are optional - can be added later

    // ✅ AUTO CREATE VENDOR LEDGER ACCOUNT UNDER SUNDRY CREDITORS
    let vendorAccountId = null;
    try {
      // Find Sundry Creditors group (220000)
      const payablesGroup = await AccountGroup.findOne({ 
        code: "220000",
        isDeleted: false
      });

      if (payablesGroup) {
        // Get the last account under Sundry Creditors (220100+)
        const lastAccount = await ChartOfAccounts.findOne({
          accountNumber: { $regex: "^220" },
          isDeleted: false
        }).sort({ accountNumber: -1 });

        let nextAccountNumber = "220100";
        if (lastAccount?.accountNumber) {
          const nextNum = parseInt(lastAccount.accountNumber) + 1;
          nextAccountNumber = String(nextNum).padStart(6, "0");
        }

        // Create individual vendor ledger account under Sundry Creditors
        const vendorLedger = new ChartOfAccounts({
          accountNumber: nextAccountNumber,
          accountName: name.trim(), // Vendor name as account name
          accountGroupId: payablesGroup._id,
          description: `Vendor Account - ${name.trim()}`,
          openingBalance: 0,
          currentBalance: 0,
          allowPosting: true,
          accountCategory: "BALANCE_SHEET",
          isBank: false,
          isActive: true,
          isDeleted: false
        });

        await vendorLedger.save();
        vendorAccountId = vendorLedger._id;
        console.log(`✓ Created vendor ledger: ${nextAccountNumber} - ${name.trim()}`);
      } else {
        console.warn("⚠️ Sundry Creditors group not found - vendor created without ledger account");
      }
    } catch (ledgerErr) {
      console.error("Warning: Failed to create vendor ledger account:", ledgerErr.message);
      // Continue vendor creation even if ledger fails
    }

    // ✅ AUTO CREATE DUAL-ROLE ACCOUNT IF VENDOR IS ALSO A CUSTOMER
    let dualRoleAccountId = null;
    if (isCustomer === true) {
      try {
        // Find Related Parties account group (should exist for dual-role tracking)
        const relatedPartiesGroup = await AccountGroup.findOne({ 
          name: /related|dual/i,
          isDeleted: false
        });

        if (relatedPartiesGroup) {
          // Check if Related Parties - Payable account exists (2250)
          let relatedPartiesAccount = await ChartOfAccounts.findOne({
            accountNumber: "2250",
            isDeleted: false
          });

          if (!relatedPartiesAccount) {
            // Create Related Parties - Payable account
            relatedPartiesAccount = new ChartOfAccounts({
              accountNumber: "2250",
              accountName: "Related Parties - Payable",
              accountGroupId: relatedPartiesGroup._id,
              description: "Unified account for vendors who are also customers",
              openingBalance: 0,
              currentBalance: 0,
              allowPosting: true,
              accountCategory: "BALANCE_SHEET",
              isBank: false,
              isActive: true,
              isDeleted: false
            });
            await relatedPartiesAccount.save();
            console.log(`✓ Created Related Parties account: 2250`);
          }
          dualRoleAccountId = relatedPartiesAccount._id;
          console.log(`✓ Vendor ${name.trim()} linked to dual-role account`);
        } else {
          console.warn("⚠️ Related Parties group not found - create it in Chart of Accounts setup");
        }
      } catch (dualErr) {
        console.error("Warning: Failed to setup dual-role account:", dualErr.message);
        // Continue vendor creation even if dual-role account fails
      }
    }

    // AUTO GENERATE VENDOR CODE
    const lastVendor = await Vendor.findOne().sort({ vendorCode: -1 });

    let newCode = "V001";

    if (lastVendor?.vendorCode) {
      const num = parseInt(lastVendor.vendorCode.replace(/\D/g, ""), 10);
      newCode = `V${String(num + 1).padStart(3, "0")}`;
    }

    const vendor = new Vendor({
      vendorCode: newCode,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      address: address?.trim() || "",
      city: city?.trim() || "",
      country: country,
      taxNumber: taxNumber?.trim().toUpperCase() || "",
      gstNumber: gstNumber?.trim().toUpperCase() || "",
      vatId: vatId?.trim().toUpperCase() || "",
      taxType: taxType || null,
      taxGroupId: taxGroupId || null,
      paymentType: paymentType || "Credit",
      paymentTerms: (paymentType === "Cash") ? null : (paymentTerms?.trim() || "NET 30"),
      creditDays: (paymentType === "Cash") ? 0 : (creditDays || 30),
      status: status || "Active",
      bankName: bankName?.trim() || "",
      accountNumber: accountNumber?.trim() || "",
      accountHolder: accountHolder?.trim() || "",
      accountPayableId: vendorAccountId, // Auto-created ledger account
      dualRoleAccountId: dualRoleAccountId, // Related Parties account if also a customer
      isSupplier: isSupplier !== false, // Default: true
      isShipper: isShipper === true, // Default: false
      isCustomer: isCustomer === true, // Default: false - can also buy from this vendor
      isActive: true,
      isDeleted: false,
    });

    await vendor.save();

    res.status(201).json({
      message: "Vendor added successfully with auto-created ledger account",
      vendor: vendor,
    });
  } catch (err) {
    console.error("Failed to add vendor:", err);
    res.status(500).json({
      message: "Error adding vendor",
      error: err.message,
    });
  }
};

// ================= GET VENDORS =================
export const getVendors = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || "";

    // Build search query
    const query = {
      isDeleted: false,
      $or: [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { vendorCode: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
      ],
    };

    // Get total count
    const total = await Vendor.countDocuments(query);

    // Get vendors with pagination
    const vendors = await Vendor.find(query)
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ createdAt: -1 });

    res.json({
      vendors,
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error("Failed to fetch vendors:", err);
    res.status(500).json({
      message: "Error fetching vendors",
      error: err.message,
    });
  }
};

// ================= GET SINGLE VENDOR =================
export const getVendorById = async (req, res) => {
  try {
    const { id } = req.params;

    const vendor = await Vendor.findOne({
      _id: id,
      isDeleted: false,
    });

    if (!vendor) {
      return res.status(404).json({ message: "Vendor not found" });
    }

    res.json(vendor);
  } catch (err) {
    console.error("Failed to fetch vendor:", err);
    res.status(500).json({
      message: "Error fetching vendor",
      error: err.message,
    });
  }
};

// ================= UPDATE VENDOR =================
export const updateVendor = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      name, email, phone, address, city, country,
      taxNumber, gstNumber, vatId, taxType, taxGroupId,
      paymentTerms, paymentType, creditDays, status, bankName, accountNumber, accountHolder,
      isSupplier, isShipper, isCustomer
    } = req.body;

    // Validation
    if (name && !name.trim()) {
      return res.status(400).json({ message: "Vendor name cannot be empty" });
    }
    if (email && !email.trim()) {
      return res.status(400).json({ message: "Email cannot be empty" });
    }
    if (phone && !phone.trim()) {
      return res.status(400).json({ message: "Phone cannot be empty" });
    }
    // Only validate paymentTerms if it's a string (not null for Cash payments)
    if (paymentTerms && typeof paymentTerms === 'string' && !paymentTerms.trim()) {
      return res.status(400).json({ message: "Payment Terms cannot be empty" });
    }

    // Get current vendor to check if name changed
    const currentVendor = await Vendor.findById(id);
    if (!currentVendor) {
      return res.status(404).json({ message: "Vendor not found" });
    }

    // Build update object
    const updateData = {};
    if (name !== undefined && name) updateData.name = name.trim();
    if (email !== undefined && email) updateData.email = email.trim().toLowerCase();
    if (phone !== undefined && phone) updateData.phone = phone.trim();
    if (address !== undefined && address) updateData.address = address.trim();
    if (city !== undefined && city) updateData.city = city.trim();
    if (country !== undefined && country) updateData.country = country;
    if (taxNumber !== undefined && taxNumber) updateData.taxNumber = taxNumber.trim().toUpperCase();
    if (gstNumber !== undefined && gstNumber) updateData.gstNumber = gstNumber.trim().toUpperCase();
    if (vatId !== undefined && vatId) updateData.vatId = vatId.trim().toUpperCase();
    if (taxType !== undefined) updateData.taxType = taxType || null;
    if (taxGroupId !== undefined) updateData.taxGroupId = taxGroupId || null;
    
    // Payment Type handling - must come BEFORE other field updates to avoid conflicts
    if (paymentType !== undefined) {
      updateData.paymentType = paymentType;
      // If switching to Cash, explicitly set paymentTerms to null and creditDays to 0
      if (paymentType === "Cash") {
        updateData.paymentTerms = null;
        updateData.creditDays = 0;
      } else if (paymentType === "Credit") {
        // For Credit, update paymentTerms if provided
        if (paymentTerms !== undefined && paymentTerms !== null) {
          updateData.paymentTerms = typeof paymentTerms === 'string' ? paymentTerms.trim() : paymentTerms;
        }
        // Update creditDays for Credit payments
        if (creditDays !== undefined && creditDays !== null) {
          updateData.creditDays = creditDays;
        }
      }
    } else if (paymentTerms !== undefined) {
      // Update paymentTerms independently if paymentType not being changed
      if (paymentTerms === null) {
        updateData.paymentTerms = null;
      } else if (typeof paymentTerms === 'string') {
        updateData.paymentTerms = paymentTerms.trim();
      }
    }
    if (status !== undefined && status) updateData.status = status;
    if (bankName !== undefined && bankName) updateData.bankName = bankName.trim();
    if (accountNumber !== undefined && accountNumber) updateData.accountNumber = accountNumber.trim();
    if (accountHolder !== undefined && accountHolder) updateData.accountHolder = accountHolder.trim();
    if (isSupplier !== undefined) updateData.isSupplier = isSupplier !== false;
    if (isShipper !== undefined) updateData.isShipper = isShipper === true;
    if (isCustomer !== undefined) updateData.isCustomer = isCustomer === true;

    // ✅ SYNC LEDGER ACCOUNT IF VENDOR NAME CHANGED
    if (name && name.trim() !== currentVendor.name && currentVendor.accountPayableId) {
      try {
        await ChartOfAccounts.findByIdAndUpdate(
          currentVendor.accountPayableId,
          { 
            accountName: name.trim(),
            description: `Vendor Account - ${name.trim()}`
          },
          { returnDocument: 'after' }
        );
      } catch (ledgerErr) {
        console.warn("Warning: Failed to sync ledger account name:", ledgerErr.message);
        // Continue with vendor update even if ledger sync fails
      }
    }

    // ✅ HANDLE DUAL-ROLE ACCOUNT ASSIGNMENT
    if (isCustomer !== undefined) {
      // If becoming a dual-role vendor, link to Related Parties account
      if (isCustomer === true && !currentVendor.dualRoleAccountId) {
        try {
          let relatedPartiesAccount = await ChartOfAccounts.findOne({
            accountNumber: "2250",
            isDeleted: false
          });

          if (!relatedPartiesAccount) {
            const relatedPartiesGroup = await AccountGroup.findOne({ 
              name: /related|dual/i,
              isDeleted: false
            });

            if (relatedPartiesGroup) {
              relatedPartiesAccount = new ChartOfAccounts({
                accountNumber: "2250",
                accountName: "Related Parties - Payable",
                accountGroupId: relatedPartiesGroup._id,
                description: "Unified account for vendors who are also customers",
                openingBalance: 0,
                currentBalance: 0,
                allowPosting: true,
                accountCategory: "BALANCE_SHEET",
                isBank: false,
                isActive: true,
                isDeleted: false
              });
              await relatedPartiesAccount.save();
            }
          }

          if (relatedPartiesAccount) {
            updateData.dualRoleAccountId = relatedPartiesAccount._id;
            console.log(`✓ Vendor ${currentVendor.name} linked to dual-role account`);
          }
        } catch (dualErr) {
          console.warn("Warning: Failed to link dual-role account:", dualErr.message);
        }
      }

      // If no longer a dual-role vendor, clear the account
      if (isCustomer === false && currentVendor.dualRoleAccountId) {
        updateData.dualRoleAccountId = null;
        console.log(`✓ Vendor ${currentVendor.name} removed from dual-role`);
      }
    }

    const vendor = await Vendor.findByIdAndUpdate(id, updateData, {
      returnDocument: 'after',
      runValidators: true,
    });

    if (!vendor) {
      return res.status(404).json({ message: "Vendor not found after update" });
    }

    res.json({
      message: "Vendor updated successfully",
      vendor,
    });
  } catch (err) {
    console.error("Failed to update vendor:", err);
    res.status(500).json({
      message: "Error updating vendor",
      error: err.message,
    });
  }
};

// ================= DELETE VENDOR =================
export const deleteVendor = async (req, res) => {
  try {
    const { id } = req.params;

    const vendor = await Vendor.findByIdAndUpdate(
      id,
      {
        isDeleted: true,
        deletedAt: new Date(),
        isActive: false,
      },
      { returnDocument: 'after' }
    );

    if (!vendor) {
      return res.status(404).json({ message: "Vendor not found" });
    }

    res.json({
      message: "Vendor deleted successfully",
      vendor,
    });
  } catch (err) {
    console.error("Failed to delete vendor:", err);
    res.status(500).json({
      message: "Error deleting vendor",
      error: err.message,
    });
  }
};

// ================= GET VENDOR BY CODE =================
export const getVendorByCode = async (req, res) => {
  try {
    const { code } = req.params;

    const vendor = await Vendor.findOne({
      vendorCode: code,
      isDeleted: false,
    });

    if (!vendor) {
      return res.status(404).json({ message: "Vendor not found" });
    }

    res.json(vendor);
  } catch (err) {
    console.error("Failed to fetch vendor by code:", err);
    res.status(500).json({
      message: "Error fetching vendor",
      error: err.message,
    });
  }
};

// ================= GET ACTIVE VENDORS =================
export const getActiveVendors = async (req, res) => {
  try {
    const vendors = await Vendor.find({
      isActive: true,
      isDeleted: false,
      status: "Active",
    }).sort({ name: 1 });

    res.json(vendors);
  } catch (err) {
    console.error("Failed to fetch active vendors:", err);
    res.status(500).json({
      message: "Error fetching active vendors",
      error: err.message,
    });
  }
};

// ================= BULK UPDATE STATUS =================
export const bulkUpdateStatus = async (req, res) => {
  try {
    const { vendorIds, status } = req.body;

    if (!vendorIds || !Array.isArray(vendorIds) || vendorIds.length === 0) {
      return res.status(400).json({ message: "Vendor IDs are required" });
    }

    if (!status) {
      return res.status(400).json({ message: "Status is required" });
    }

    const result = await Vendor.updateMany(
      { _id: { $in: vendorIds }, isDeleted: false },
      { status, isActive: status === "Active" }
    );

    res.json({
      message: "Vendors updated successfully",
      modifiedCount: result.modifiedCount,
    });
  } catch (err) {
    console.error("Failed to update vendors:", err);
    res.status(500).json({
      message: "Error updating vendors",
      error: err.message,
    });
  }
};
