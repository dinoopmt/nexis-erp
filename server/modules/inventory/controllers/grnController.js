import Grn from "../../../Models/Grn.js";
import GrnService from "../services/GRNService.js";
import VendorPaymentService from "../../accounting/services/VendorPaymentService.js";

/**
 * Map frontend payment terms format to VendorPayment enum values
 * Frontend sends: due_on_receipt, net_30, net_60, net_90
 * Backend expects: IMMEDIATE, NET_30, NET_60, NET_90
 */
const mapPaymentTermsToEnum = (termValue) => {
  const mapping = {
    'due_on_receipt': 'IMMEDIATE',
    'immediate': 'IMMEDIATE',
    'net_7': 'NET_7',
    'net_14': 'NET_14',
    'net_30': 'NET_30',
    'net_60': 'NET_60',
    'net_90': 'NET_90',
    'custom': 'CUSTOM',
  };
  return mapping[String(termValue).toLowerCase()] || 'NET_30';
};
import GRNJournalService from "../../accounting/services/GRNJournalService.js";
import GRNStockUpdateService from "../../accounting/services/GRNStockUpdateService.js";
import GRNEditManager from "../../accounting/services/GRNEditManager.js";

// ✅ NEW: Get next GRN number using sequence table (FIFO method)
export const getNextGrnNumber = async (req, res) => {
  try {
    const { financialYear } = req.query;
    
    if (!financialYear) {
      return res.status(400).json({
        message: "Financial year is required",
      });
    }

    const grnNumber = await GrnService.generateGRNNumber(financialYear);

    res.status(200).json({
      grnNo: grnNumber,
      financialYear: financialYear,
    });
  } catch (error) {
    console.error("Error generating GRN number:", error);
    res.status(500).json({
      message: "Failed to generate GRN number",
      error: error.message,
    });
  }
};

// Get all GRNs
export const getAllGrns = async (req, res) => {
  try {
    const grns = await Grn.find()
      .populate("vendorId", "vendorName")
      .sort({ createdDate: -1 });

    res.status(200).json(grns);
  } catch (error) {
    console.error("Error fetching GRNs:", error);
    res.status(500).json({
      message: "Failed to fetch GRNs",
      error: error.message,
    });
  }
};

// Get GRN by ID
export const getGrnById = async (req, res) => {
  try {
    const { id } = req.params;
    const grn = await Grn.findById(id).populate("vendorId");

    if (!grn) {
      return res.status(404).json({ message: "GRN not found" });
    }

    res.status(200).json(grn);
  } catch (error) {
    console.error("Error fetching GRN:", error);
    res.status(500).json({
      message: "Failed to fetch GRN",
      error: error.message,
    });
  }
};

// Create GRN
export const createGrn = async (req, res) => {
  try {
    const {
      grnNumber,
      grnDate,
      vendorId,
      vendorName,
      shipperId,
      shipperName,
      invoiceNo,
      lpoNo,
      referenceNumber,
      deliveryDate,
      shippingCost,
      status,
      items,
      notes,
      paymentTerms,
      taxType,
      totalQty,
      subtotal,
      discountAmount,
      discountPercent,
      totalExTax,
      taxAmount,
      netTotal,
      finalTotal,
      createdBy,
      batchExpiryTracking,
    } = req.body;

    console.log("📝 Creating GRN with data:", {
      grnNumber,
      grnDate,
      vendorId,
      itemCount: items?.length,
      totalQty,
      finalTotal,
    });

    // Validation
    if (!grnNumber || !grnDate || !vendorId || !items || items.length === 0) {
      console.warn("❌ Validation failed - Missing required fields");
      return res.status(400).json({
        message: "Missing required fields: grnNumber, grnDate, vendorId, items",
        received: {
          grnNumber: !!grnNumber,
          grnDate: !!grnDate,
          vendorId: !!vendorId,
          items: !!items,
          itemCount: items?.length || 0,
        },
      });
    }

    // Check if GRN number already exists
    const existingGrn = await Grn.findOne({ grnNumber });
    if (existingGrn) {
      console.warn(`❌ GRN number already exists: ${grnNumber}`);
      return res.status(400).json({
        message: "GRN number already exists",
        grnNumber,
      });
    }

    // Create GRN with all fields
    const newGrn = new Grn({
      grnNumber,
      grnDate: new Date(grnDate),
      invoiceNo: invoiceNo || "",
      lpoNo: lpoNo || "",
      vendorId,
      vendorName,
      paymentTerms: paymentTerms || "due_on_receipt",
      shipperId: shipperId || null,
      shipperName: shipperName || "",
      referenceNumber: referenceNumber || "",
      deliveryDate: deliveryDate ? new Date(deliveryDate) : null,
      shippingCost: parseFloat(shippingCost || 0),
      taxType: taxType || "exclusive",
      status: status || "Draft",
      items,
      notes: notes || "",
      // ✅ ADDED: All calculated totals
      totalQty: parseInt(totalQty || 0),
      subtotal: parseFloat(subtotal || 0),
      discountAmount: parseFloat(discountAmount || 0),
      discountPercent: parseFloat(discountPercent || 0),
      totalExTax: parseFloat(totalExTax || 0),
      taxAmount: parseFloat(taxAmount || 0),
      netTotal: parseFloat(netTotal || 0),
      finalTotal: parseFloat(finalTotal || 0),
      totalAmount: parseFloat(finalTotal || subtotal || 0),
      // ✅ ADDED: Audit fields
      createdBy: createdBy,
    });

    console.log("📋 GRN data before save:", {
      grnNumber: newGrn.grnNumber,
      vendorId: newGrn.vendorId,
      itemCount: newGrn.items?.length,
      totalQty: newGrn.totalQty,
      finalTotal: newGrn.finalTotal,
      itemsStructure: newGrn.items?.map(i => ({
        productId: i.productId,
        itemName: i.itemName,
        quantity: i.quantity,
        unitCost: i.unitCost,
        taxPercent: i.taxPercent,
        totalCost: i.totalCost,
      })),
    });

    await newGrn.save();

    console.log(`✅ GRN created successfully: ${grnNumber}`);

    // ✅ Create vendor payment entries for tracking
    let paymentEntries = null;
    try {
      paymentEntries = await VendorPaymentService.createPaymentEntriesFromGrn({
        grnId: newGrn._id,  // ✅ Pass MongoDB ObjectId for referential integrity
        grnNumber,
        grnDate,
        vendorId,
        vendorName,
        paymentTerms: mapPaymentTermsToEnum(paymentTerms) || "NET_30",  // ✅ Map to enum format
        subtotal: parseFloat(subtotal || 0),
        discountAmount: parseFloat(discountAmount || 0),
        taxAmount: parseFloat(taxAmount || 0),
        netTotal: parseFloat(netTotal || 0),
        shippingCost: parseFloat(shippingCost || 0),
        createdBy,
      });
      console.log("💳 Vendor payment entries created:", paymentEntries);
    } catch (paymentError) {
      console.error("⚠️ Warning: Failed to create vendor payment entries:", paymentError.message);
      // Don't fail GRN creation if payment entry fails - just log warning
    }

    res.status(201).json({
      message: "GRN created successfully",
      _id: newGrn._id,
      grnNumber: newGrn.grnNumber,
      paymentEntries, // Include payment tracking info in response
    });
  } catch (error) {
    console.error("❌ Error creating GRN:", {
      name: error.name,
      message: error.message,
      errors: error.errors ? Object.keys(error.errors) : null,
      path: error.path,
      value: error.value,
    });

    // Handle Mongoose validation errors
    if (error.name === "ValidationError") {
      const validationErrors = Object.entries(error.errors).map(
        ([field, err]) => `${field}: ${err.message}`
      );
      return res.status(400).json({
        message: "Validation failed",
        errors: validationErrors,
        details: error.errors,
      });
    }

    // Handle duplicate key error
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        message: `${field} already exists`,
        field,
        value: error.keyValue?.[field],
      });
    }

    res.status(500).json({
      message: "Failed to create GRN",
      error: error.message,
      type: error.name,
    });
  }
};

// Update GRN
export const updateGrn = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      grnDate,
      vendorId,
      vendorName,
      shipperId,
      shipperName,
      invoiceNo,
      lpoNo,
      referenceNumber,
      deliveryDate,
      shippingCost,
      status,
      items,
      notes,
      paymentTerms,
      taxType,
      totalQty,
      subtotal,
      discountAmount,
      discountPercent,
      totalExTax,
      taxAmount,
      netTotal,
      finalTotal,
    } = req.body;

    console.log("✏️ Updating GRN:", { id, vendorId, itemCount: items?.length, finalTotal });

    // Validation
    if (!grnDate || !vendorId || !items || items.length === 0) {
      console.warn("❌ Validation failed for update - Missing required fields");
      return res.status(400).json({
        message: "Missing required fields for update: grnDate, vendorId, items",
      });
    }

    // Fetch the GRN first
    const grn = await Grn.findById(id);
    if (!grn) {
      console.warn(`❌ GRN not found for update: ${id}`);
      return res.status(404).json({ message: "GRN not found" });
    }

    // ========================================
    // 📊 CAPTURE ORIGINAL DATA BEFORE UPDATE
    // ========================================
    const originalData = {
      totalAmount: grn.totalAmount ? parseFloat(grn.totalAmount) : 0,
      finalTotal: grn.finalTotal ? parseFloat(grn.finalTotal) : 0,
      netTotal: grn.netTotal ? parseFloat(grn.netTotal) : 0,
      items: grn.items.map(item => ({
        productId: item.productId?.toString?.() || item.productId,
        quantity: item.quantity || 0,
        unitCost: item.unitCost || 0
      }))
    };

    console.log(`📊 [CASCADE PREP] ORIGINAL data captured BEFORE update:`);
    console.log(`   Original Total: ${originalData.totalAmount}`);
    console.log(`   Original Items: ${originalData.items.length}`);
    console.log(`   Original Item Qty: ${originalData.items[0]?.quantity}`);

    // Track old status for change detection
    const oldStatus = grn.status;

    // Update all fields
    grn.grnDate = new Date(grnDate);
    grn.invoiceNo = invoiceNo || "";
    grn.lpoNo = lpoNo || "";
    grn.vendorId = vendorId;
    grn.vendorName = vendorName;
    grn.paymentTerms = paymentTerms || "due_on_receipt";
    grn.shipperId = shipperId || null;
    grn.shipperName = shipperName || "";
    grn.referenceNumber = referenceNumber || "";
    grn.deliveryDate = deliveryDate ? new Date(deliveryDate) : null;
    grn.shippingCost = parseFloat(shippingCost || 0);
    grn.taxType = taxType || "exclusive";
    grn.status = status || "Draft";
    grn.items = items;
    grn.notes = notes || "";
    
    // ✅ Update all calculated totals
    grn.totalQty = parseInt(totalQty || 0);
    grn.subtotal = parseFloat(subtotal || 0);
    grn.discountAmount = parseFloat(discountAmount || 0);
    grn.discountPercent = parseFloat(discountPercent || 0);
    grn.totalExTax = parseFloat(totalExTax || 0);
    grn.taxAmount = parseFloat(taxAmount || 0);
    grn.netTotal = parseFloat(netTotal || 0);
    grn.finalTotal = parseFloat(finalTotal || 0);
    grn.totalAmount = parseFloat(finalTotal || subtotal || 0);

    // ========================================
    // 🔄 USE TRANSACTION-BASED EDIT MANAGER
    // ========================================
    // ✅ DO NOT call grn.save() here - let the transaction manager handle persistence
    // This ensures delta calculation works correctly (finds old vs new values BEFORE update)
    
    let cascadeResult = null;

    // For Received/Draft GRN - use transaction-based edit with atomicity
    if (grn.status === "Received" || grn.status === "Draft" || grn.status === "Verified") {
      console.log(`\n✏️ [EDIT] Validating and updating: ${grn.grnNumber}`);
      console.log(`   Status: ${grn.status}`);
      console.log(`   New Total: ${grn.finalTotal || grn.totalAmount}`);
      console.log(`   New Item Qty: ${items[0]?.quantity}`);

      try {
        // Import improved edit manager (transaction-based, atomic)
        const { default: ImprovedGRNEditManager } = await import("../../../modules/accounting/services/ImprovedGRNEditManager.js");
        
        // ✅ Use transaction-based manager (handles everything atomically)
        // This fetches the original GRN, calculates deltas, and updates all collections
        cascadeResult = await ImprovedGRNEditManager.editGRN(
          id,
          {
            items: items,
            notes: notes || req.body.notes
          },
          req.body.createdBy || "System"
        );

        if (cascadeResult.success) {
          console.log(`✅ [EDIT] Completed successfully`);
          console.log(`   Items: ${cascadeResult.changes.itemsCount}`);
          console.log(`   Deltas applied: ${cascadeResult.changes.deltasApplied}`);
          console.log(`✅ GRN updated successfully: ${id}`);
        } else {
          console.error(`❌ [EDIT] Manager returned error: ${cascadeResult.error}`);
        }
      } catch (editError) {
        console.error(`⚠️ [EDIT] Error during update:`, editError.message);
        cascadeResult = {
          success: false,
          error: editError.message
        };
      }
    } else if (grn.status === "Posted") {
      console.log(`ℹ️ [EDIT] Posted GRN - no further edits allowed`);
      cascadeResult = {
        success: false,
        reason: "Cannot edit Posted GRN"
      };
    } else {
      console.log(`ℹ️ [EDIT] Status: ${grn.status} - Edit completed`);
      cascadeResult = {
        success: true,
        reason: "GRN updated"
      };
    }

    // ✅ NEW: Create accounting journal entries when GRN status changes to "Received"
    let journalEntry = null;
    let journalEntryShipping = null;
    
    if (oldStatus !== "Received" && status === "Received") {
      console.log("📚 GRN status changed to 'Received' - Creating accounting entries");
      
      try {
        // Create main journal entry for goods received
        journalEntry = await GRNJournalService.createGrnJournalEntry({
          grnNumber: grn.grnNumber,
          grnDate: grn.grnDate,
          vendorId: grn.vendorId,
          vendorName: grn.vendorName,
          netTotal: grn.netTotal,
          shippingCost: grn.shippingCost,
          totalQty: grn.totalQty,
          createdBy: req.body.createdBy || "System"
        });

        console.log("✅ Journal entry created for GRN items");
      } catch (journalError) {
        console.error("⚠️ Warning: Failed to create journal entry for items:", journalError.message);
        // Don't fail the update if journal entry creation fails
      }
    }

    res.status(200).json({
      message: "GRN updated successfully",
      grn,
      journalEntry: journalEntry || undefined,
      journalEntryShipping: journalEntryShipping || undefined,
      cascadeUpdate: cascadeResult || undefined
    });
  } catch (error) {
    console.error("❌ Error updating GRN:", error);
    res.status(500).json({
      message: "Failed to update GRN",
      error: error.message,
    });
  }
};

// ✅ NEW: Post GRN and create double-entry accounting journals + stock updates
export const postGrn = async (req, res) => {
  try {
    const { id } = req.params;
    const { createdBy } = req.body;

    console.log("📚 Posting GRN for accounting & stock:", { id, createdBy });

    // Fetch the GRN with populated items
    const grn = await Grn.findById(id).populate("items.productId");
    if (!grn) {
      console.warn(`❌ GRN not found: ${id}`);
      return res.status(404).json({ message: "GRN not found" });
    }

    console.log("✅ GRN fetched from DB:", {
      grnNumber: grn.grnNumber,
      grnId: grn._id,
      status: grn.status,
      itemsCount: grn.items?.length,
      itemsIsArray: Array.isArray(grn.items),
      hasItems: !!grn.items,
      firstItemCheck: grn.items?.[0] ? {
        itemCode: grn.items[0].itemCode,
        productId: grn.items[0].productId?.toString?.() || grn.items[0].productId,
        quantity: grn.items[0].quantity
      } : "NO ITEMS"
    });

    if (grn.status === "Posted") {
      console.warn(`⚠️ GRN already posted: ${grn.grnNumber}`);
      return res.status(400).json({
        message: "GRN already posted",
        grnNumber: grn.grnNumber
      });
    }

    // Initialize response data
    let journalEntry = null;
    let journalEntryShipping = null;
    let stockUpdate = null;
    const errors = [];

    // 1. CREATE ACCOUNTING ENTRIES
    try {
      // Main journal entry for goods
      journalEntry = await GRNJournalService.createGrnJournalEntry({
        grnNumber: grn.grnNumber,
        grnDate: grn.grnDate,
        vendorId: grn.vendorId,
        vendorName: grn.vendorName,
        netTotal: grn.netTotal,
        shippingCost: 0, // Keep items and shipping separate
        totalQty: grn.totalQty,
        createdBy: createdBy || "System"
      });

      console.log("✅ GRN Items Journal Entry created:", journalEntry?.voucherNumber);

      // Separate journal entry for shipping if applicable
      if (grn.shippingCost && grn.shippingCost > 0) {
        journalEntryShipping = await GRNJournalService.createShippingJournalEntry({
          grnNumber: grn.grnNumber,
          grnDate: grn.grnDate,
          vendorId: grn.vendorId,
          vendorName: grn.vendorName,
          createdBy: createdBy || "System"
        }, grn.shippingCost);

        console.log("✅ Shipping Journal Entry created:", journalEntryShipping?.voucherNumber);
      }

    } catch (journalError) {
      console.error("❌ Error creating journal entries:", journalError.message);
      errors.push({ type: "JOURNAL", error: journalError.message });
    }

    // 2. UPDATE STOCK, BATCHES, COSTS
    try {
      console.log("🔍 GRN data before stock update:", {
        grnNumber: grn.grnNumber,
        grnId: grn._id,
        itemsCount: grn.items?.length || 0,
        itemsIsArray: Array.isArray(grn.items),
        firstItemStructure: grn.items?.[0] ? {
          productId: grn.items[0].productId,
          itemCode: grn.items[0].itemCode,
          quantity: grn.items[0].quantity,
          itemName: grn.items[0].itemName
        } : null
      });

      stockUpdate = await GRNStockUpdateService.processGrnStockUpdate(grn, createdBy || "System");
      console.log("✅ Stock updates completed:", {
        itemsProcessed: stockUpdate.processedItems.length,
        batchesCreated: stockUpdate.createdBatches.length,
        costUpdates: stockUpdate.costUpdates.length
      });

      // Include any errors from stock update
      console.log(`📊 Stock Update Result:`, {
        processedItems: stockUpdate?.processedItems?.length || 0,
        currentStockUpdates: stockUpdate?.currentStockUpdates?.length || 0,
        createdBatches: stockUpdate?.createdBatches?.length || 0,
        costUpdates: stockUpdate?.costUpdates?.length || 0,
        errors: stockUpdate?.errors?.length || 0
      });
      
      if (stockUpdate?.currentStockUpdates && stockUpdate.currentStockUpdates.length > 0) {
        console.log(`✅ Current Stock Updates Details:`, JSON.stringify(stockUpdate.currentStockUpdates, null, 2));
      } else {
        console.warn(`⚠️ NO CurrentStock updates recorded`);
      }

      if (stockUpdate.errors && stockUpdate.errors.length > 0) {
        errors.push(...stockUpdate.errors.map(e => ({ type: "STOCK", ...e })));
      }

    } catch (stockError) {
      console.error("❌ Error updating stock:", stockError.message);
      errors.push({ type: "STOCK", error: stockError.message });
    }

    // 3. UPDATE GRN STATUS TO RECEIVED (triggers stock update)
    grn.status = "Received";
    grn.postedDate = new Date();
    grn.postedBy = createdBy || "System";
    await grn.save();

    console.log(`✅ GRN Posted successfully: ${grn.grnNumber}`);

    // 4. SEND COMPREHENSIVE RESPONSE
    res.status(200).json({
      message: "GRN posted successfully with all updates",
      grn: {
        grnNumber: grn.grnNumber,
        status: grn.status,
        netTotal: grn.netTotal,
        shippingCost: grn.shippingCost,
        totalItems: grn.items?.length
      },
      accounting: {
        journals: {
          items: journalEntry,
          shipping: journalEntryShipping || null
        }
      },
      inventory: {
        itemsProcessed: stockUpdate?.processedItems?.length || 0,
        batchesCreated: stockUpdate?.createdBatches?.length || 0,
        costUpdates: stockUpdate?.costUpdates?.length || 0,
        variantUpdates: stockUpdate?.variantUpdates?.length || 0,
        currentStockUpdates: stockUpdate?.currentStockUpdates?.length || 0,
        auditLogs: stockUpdate?.logs?.length || 0,
        summary: {
          updatedProducts: stockUpdate?.updatedProducts?.length || 0,
          errors: stockUpdate?.errors?.length || 0
        },
        currentStockDetails: stockUpdate?.currentStockUpdates || []
      },
      errors: errors.length > 0 ? errors : null,
      timestamp: new Date()
    });

  } catch (error) {
    console.error("❌ Error posting GRN:", error);
    res.status(500).json({
      message: "Failed to post GRN",
      error: error.message
    });
  }
};

// Delete GRN
export const deleteGrn = async (req, res) => {
  try {
    const { id } = req.params;

    const grn = await Grn.findByIdAndDelete(id);

    if (!grn) {
      return res.status(404).json({ message: "GRN not found" });
    }

    res.status(200).json({
      message: "GRN deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting GRN:", error);
    res.status(500).json({
      message: "Failed to delete GRN",
      error: error.message,
    });
  }
};

// Get GRN report with statistics
export const getGrnReport = async (req, res) => {
  try {
    const { startDate, endDate, vendorId } = req.query;

    let filter = {};

    if (startDate && endDate) {
      filter.grnDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    if (vendorId) {
      filter.vendorId = vendorId;
    }

    const grns = await Grn.find(filter)
      .populate("vendorId", "vendorName")
      .sort({ grnDate: -1 });

    const summary = {
      totalGrns: grns.length,
      totalAmount: grns.reduce((sum, grn) => sum + grn.totalAmount, 0),
      totalItems: grns.reduce(
        (sum, grn) => sum + grn.items.reduce((itemSum, item) => itemSum + item.quantity, 0),
        0
      ),
      byStatus: {
        draft: grns.filter((g) => g.status === "Draft").length,
        received: grns.filter((g) => g.status === "Received").length,
        verified: grns.filter((g) => g.status === "Verified").length,
        rejected: grns.filter((g) => g.status === "Rejected").length,
      },
    };

    res.status(200).json({
      grns,
      summary,
    });
  } catch (error) {
    console.error("Error fetching GRN report:", error);
    res.status(500).json({
      message: "Failed to fetch GRN report",
      error: error.message,
    });
  }
};
