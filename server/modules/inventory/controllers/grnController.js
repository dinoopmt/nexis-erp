import Grn from "../../../Models/Grn.js";
import GrnService from "../services/GRNService.js";
import VendorPaymentService from "../../accounting/services/VendorPaymentService.js";
import InventoryTemplate from "../../../Models/InventoryTemplate.js";
import TerminalManagement from "../../../Models/TerminalManagement.js";
import StoreSettings from "../../../Models/StoreSettings.js";
import Company from "../../../Models/Company.js";
import PdfGenerationService from "../../../services/PdfGenerationService.js";

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

    // ✅ NEW: Check for duplicate invoice/LPO within same vendor & financial year
    // Extract financial year from GRN date (e.g., "2024-03-04" → "2024-25")
    const grnDateObj = new Date(grnDate);
    const year = grnDateObj.getFullYear();
    const month = grnDateObj.getMonth(); // 0-11
    
    // Financial year: If month >= 3 (Mar), FY is current year+1 (e.g., Mar 2024 = FY 2024-25)
    // Otherwise, previous year (e.g., Feb 2024 = FY 2023-24)
    const financialYear = month >= 3 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
    
    // Check for duplicate invoice number
    if (invoiceNo && invoiceNo.trim()) {
      const duplicateInvoice = await Grn.findOne({
        vendorId,
        invoiceNo: invoiceNo.trim(),
        grnNumber: { $ne: grnNumber }, // Exclude current GRN (for editing)
        // Check if GRN is in the same financial year (extract from grnDate)
        $expr: {
          $eq: [
            // Use aggregation to extract financial year from grnDate
            {
              $dateToString: {
                format: "%Y-%m",
                date: "$grnDate"
              }
            },
            {
              $dateToString: {
                format: "%Y-%m", 
                date: new Date(grnDate)
              }
            }
          ]
        }
      });
      
      if (duplicateInvoice) {
        console.warn(`❌ Duplicate invoice number ${invoiceNo} for vendor ${vendorId} in financial year ${financialYear}`);
        return res.status(400).json({
          message: `Invoice number "${invoiceNo}" already exists for this vendor in the same financial year (GRN: ${duplicateInvoice.grnNumber})`,
          error: "DUPLICATE_INVOICE",
          duplicateGrn: duplicateInvoice.grnNumber,
          invoiceNo
        });
      }
    }

    // Check for duplicate LPO number
    if (lpoNo && lpoNo.trim()) {
      const duplicateLpo = await Grn.findOne({
        vendorId,
        lpoNo: lpoNo.trim(),
        grnNumber: { $ne: grnNumber }, // Exclude current GRN (for editing)
        // Check if GRN is in the same financial year
        $expr: {
          $eq: [
            {
              $dateToString: {
                format: "%Y-%m",
                date: "$grnDate"
              }
            },
            {
              $dateToString: {
                format: "%Y-%m", 
                date: new Date(grnDate)
              }
            }
          ]
        }
      });
      
      if (duplicateLpo) {
        console.warn(`❌ Duplicate LPO number ${lpoNo} for vendor ${vendorId} in financial year ${financialYear}`);
        return res.status(400).json({
          message: `LPO number "${lpoNo}" already exists for this vendor in the same financial year (GRN: ${duplicateLpo.grnNumber})`,
          error: "DUPLICATE_LPO",
          duplicateGrn: duplicateLpo.grnNumber,
          lpoNo
        });
      }
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

    // ✅ VALIDATION: Verify all items have valid product references
    console.log("🔍 [VALIDATE] Validating and converting product references for GRN items...");
    const mongoose = (await import("mongoose")).default;
    
    for (let i = 0; i < newGrn.items.length; i++) {
      const item = newGrn.items[i];
      
      // Check if productId exists
      if (!item.productId) {
        console.error(`❌ [VALIDATE] Item ${i + 1} missing productId!`);
        return res.status(400).json({
          message: `Item ${i + 1} (${item.itemName}) is missing product reference (productId)`,
          error: "MISSING_PRODUCT_ID",
          itemIndex: i,
          item: {
            itemName: item.itemName,
            itemCode: item.itemCode,
            productId: item.productId,
          },
        });
      }

      // ✅ Convert productId string to MongoDB ObjectId if needed
      try {
        if (typeof item.productId === 'string') {
          if (!mongoose.Types.ObjectId.isValid(item.productId)) {
            console.error(`❌ [VALIDATE] Item ${i + 1} has invalid ObjectId format for productId: "${item.productId}"`);
            return res.status(400).json({
              message: `Item ${i + 1} (${item.itemName}) has invalid product ID format: "${item.productId}"`,
              error: "INVALID_PRODUCT_ID_FORMAT",
              itemIndex: i,
              receivedProductId: item.productId,
            });
          }
          // Convert to ObjectId
          newGrn.items[i].productId = new mongoose.Types.ObjectId(item.productId);
          console.log(`✅ [VALIDATE] Item ${i + 1}: Converted productId string to ObjectId`);
        } else if (mongoose.Types.ObjectId.isValid(item.productId)) {
          console.log(`✅ [VALIDATE] Item ${i + 1}: productId already valid ObjectId`);
        } else {
          console.error(`❌ [VALIDATE] Item ${i + 1} has invalid productId type/value:`, item.productId);
          return res.status(400).json({
            message: `Item ${i + 1} (${item.itemName}) has invalid product ID`,
            error: "INVALID_PRODUCT_ID_FORMAT",
            itemIndex: i,
            receivedProductId: item.productId,
            productIdType: typeof item.productId,
          });
        }
      } catch (validateErr) {
        console.error(`❌ [VALIDATE] Error validating Item ${i + 1} productId:`, validateErr.message);
        return res.status(400).json({
          message: `Item ${i + 1}: Error validating product ID`,
          error: "PRODUCT_ID_VALIDATION_ERROR",
          itemIndex: i,
          errorDetail: validateErr.message,
        });
      }
    }

    console.log("✅ [VALIDATE] All items validated successfully - product references converted to ObjectIds");

    await newGrn.save();

    console.log(`✅ GRN created successfully: ${grnNumber}`);

    // ✅ Create vendor payment entries ONLY for "Received" status (NOT for Draft)
    let paymentEntries = null;
    if (status === "Received" || status === "received") {
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
    } else if (status === "Draft" || status === "draft") {
      console.log("📋 GRN status is Draft - skipping vendor payment creation (payments created only on POST)");
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

    // ✅ NEW: Check for duplicate invoice/LPO within same vendor & financial year (excluding current GRN)
    const grnDateObj = new Date(grnDate);
    const year = grnDateObj.getFullYear();
    const month = grnDateObj.getMonth(); // 0-11
    
    const financialYear = month >= 3 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
    
    // Check for duplicate invoice number
    if (invoiceNo && invoiceNo.trim()) {
      const duplicateInvoice = await Grn.findOne({
        _id: { $ne: id }, // Exclude current GRN
        vendorId,
        invoiceNo: invoiceNo.trim(),
        $expr: {
          $eq: [
            {
              $dateToString: {
                format: "%Y-%m",
                date: "$grnDate"
              }
            },
            {
              $dateToString: {
                format: "%Y-%m", 
                date: new Date(grnDate)
              }
            }
          ]
        }
      });
      
      if (duplicateInvoice) {
        console.warn(`❌ Duplicate invoice number ${invoiceNo} for vendor ${vendorId} in financial year ${financialYear}`);
        return res.status(400).json({
          message: `Invoice number "${invoiceNo}" already exists for this vendor in the same financial year (GRN: ${duplicateInvoice.grnNumber})`,
          error: "DUPLICATE_INVOICE",
          duplicateGrn: duplicateInvoice.grnNumber,
          invoiceNo
        });
      }
    }

    // Check for duplicate LPO number
    if (lpoNo && lpoNo.trim()) {
      const duplicateLpo = await Grn.findOne({
        _id: { $ne: id }, // Exclude current GRN
        vendorId,
        lpoNo: lpoNo.trim(),
        $expr: {
          $eq: [
            {
              $dateToString: {
                format: "%Y-%m",
                date: "$grnDate"
              }
            },
            {
              $dateToString: {
                format: "%Y-%m", 
                date: new Date(grnDate)
              }
            }
          ]
        }
      });
      
      if (duplicateLpo) {
        console.warn(`❌ Duplicate LPO number ${lpoNo} for vendor ${vendorId} in financial year ${financialYear}`);
        return res.status(400).json({
          message: `LPO number "${lpoNo}" already exists for this vendor in the same financial year (GRN: ${duplicateLpo.grnNumber})`,
          error: "DUPLICATE_LPO",
          duplicateGrn: duplicateLpo.grnNumber,
          lpoNo
        });
      }
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
    } else if (grn.status === "Received") {
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

// ============================================================================
// 💾 SAVE GRN AS DRAFT - Dedicated endpoint (NO posting, NO stock changes)
// ============================================================================
export const saveDraftGrn = async (req, res) => {
  try {
    const {
      id,
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
    } = req.body;

    console.log("📋 [DRAFT] Saving GRN as Draft:", {
      grnNumber,
      isNew: !id,
      itemCount: items?.length,
      finalTotal,
    });

    let grn;

    if (id) {
      // UPDATE existing Draft GRN
      grn = await Grn.findById(id);
      if (!grn) {
        return res.status(404).json({ message: "GRN not found" });
      }

      console.log("✏️ Updating existing Draft GRN:", id);

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
      grn.items = items;
      grn.notes = notes || "";
      grn.totalQty = parseInt(totalQty || 0);
      grn.subtotal = parseFloat(subtotal || 0);
      grn.discountAmount = parseFloat(discountAmount || 0);
      grn.discountPercent = parseFloat(discountPercent || 0);
      grn.totalExTax = parseFloat(totalExTax || 0);
      grn.taxAmount = parseFloat(taxAmount || 0);
      grn.netTotal = parseFloat(netTotal || 0);
      grn.finalTotal = parseFloat(finalTotal || 0);
      grn.totalAmount = parseFloat(finalTotal || subtotal || 0);
    } else {
      // CREATE new Draft GRN
      const existingGrn = await Grn.findOne({ grnNumber });
      if (existingGrn) {
        return res.status(400).json({
          message: "GRN number already exists",
          grnNumber,
        });
      }

      grn = new Grn({
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
        status: "Draft",
        items,
        notes: notes || "",
        totalQty: parseInt(totalQty || 0),
        subtotal: parseFloat(subtotal || 0),
        discountAmount: parseFloat(discountAmount || 0),
        discountPercent: parseFloat(discountPercent || 0),
        totalExTax: parseFloat(totalExTax || 0),
        taxAmount: parseFloat(taxAmount || 0),
        netTotal: parseFloat(netTotal || 0),
        finalTotal: parseFloat(finalTotal || 0),
        totalAmount: parseFloat(finalTotal || subtotal || 0),
        createdBy: createdBy,
      });
    }

    // ✅ Validate and convert productIds to ObjectIds
    const mongoose = (await import("mongoose")).default;
    for (let i = 0; i < grn.items.length; i++) {
      const item = grn.items[i];
      if (!item.productId) {
        return res.status(400).json({
          message: `Item ${i + 1}: Missing productId`,
          itemIndex: i,
        });
      }

      if (typeof item.productId === "string") {
        if (!mongoose.Types.ObjectId.isValid(item.productId)) {
          return res.status(400).json({
            message: `Item ${i + 1}: Invalid product ID format`,
            itemIndex: i,
            receivedProductId: item.productId,
          });
        }
        grn.items[i].productId = new mongoose.Types.ObjectId(item.productId);
      }
    }

    await grn.save();

    console.log(`✅ [DRAFT] GRN saved as Draft (NO vendor payments, NO stock updates): ${grn.grnNumber}`);

    res.status(id ? 200 : 201).json({
      message: id ? "Draft GRN updated successfully" : "Draft GRN created successfully",
      _id: grn._id,
      grnNumber: grn.grnNumber,
      status: grn.status,
      note: "Draft GRN - No stock updates or vendor payments created",
    });
  } catch (error) {
    console.error("❌ Error saving Draft GRN:", error.message);
    res.status(500).json({
      message: "Failed to save Draft GRN",
      error: error.message,
    });
  }
};

// ============================================================================
// 📤 POST GRN WITH UPDATES - Dedicated endpoint (full posting with all updates)
// ============================================================================
export const postGrnWithUpdates = async (req, res) => {
  try {
    const {
      id,
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
    } = req.body;

    console.log("📤 [POST] Posting GRN with full updates:", {
      grnNumber,
      isNew: !id,
      itemCount: items?.length,
      finalTotal,
    });

    let grn;
    const isNew = !id;

    if (id) {
      // UPDATE existing GRN to Received status
      grn = await Grn.findById(id);
      if (!grn) {
        return res.status(404).json({ message: "GRN not found" });
      }

      console.log("✏️ Updating existing GRN to Received:", id);

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
      grn.status = "Received";
      grn.items = items;
      grn.notes = notes || "";
      grn.totalQty = parseInt(totalQty || 0);
      grn.subtotal = parseFloat(subtotal || 0);
      grn.discountAmount = parseFloat(discountAmount || 0);
      grn.discountPercent = parseFloat(discountPercent || 0);
      grn.totalExTax = parseFloat(totalExTax || 0);
      grn.taxAmount = parseFloat(taxAmount || 0);
      grn.netTotal = parseFloat(netTotal || 0);
      grn.finalTotal = parseFloat(finalTotal || 0);
      grn.totalAmount = parseFloat(finalTotal || subtotal || 0);
    } else {
      // CREATE new GRN with Received status
      const existingGrn = await Grn.findOne({ grnNumber });
      if (existingGrn) {
        return res.status(400).json({
          message: "GRN number already exists",
          grnNumber,
        });
      }

      grn = new Grn({
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
        status: "Received",
        items,
        notes: notes || "",
        totalQty: parseInt(totalQty || 0),
        subtotal: parseFloat(subtotal || 0),
        discountAmount: parseFloat(discountAmount || 0),
        discountPercent: parseFloat(discountPercent || 0),
        totalExTax: parseFloat(totalExTax || 0),
        taxAmount: parseFloat(taxAmount || 0),
        netTotal: parseFloat(netTotal || 0),
        finalTotal: parseFloat(finalTotal || 0),
        totalAmount: parseFloat(finalTotal || subtotal || 0),
        createdBy: createdBy,
      });
    }

    // ✅ Validate and convert productIds to ObjectIds
    const mongoose = (await import("mongoose")).default;
    for (let i = 0; i < grn.items.length; i++) {
      const item = grn.items[i];
      if (!item.productId) {
        return res.status(400).json({
          message: `Item ${i + 1}: Missing productId`,
          itemIndex: i,
        });
      }

      if (typeof item.productId === "string") {
        if (!mongoose.Types.ObjectId.isValid(item.productId)) {
          return res.status(400).json({
            message: `Item ${i + 1}: Invalid product ID format`,
            itemIndex: i,
            receivedProductId: item.productId,
          });
        }
        grn.items[i].productId = new mongoose.Types.ObjectId(item.productId);
      }
    }

    await grn.save();
    console.log(`✅ [POST] GRN saved with status=Received: ${grn.grnNumber}`);

    // Initialize result tracking
    let journalEntry = null;
    let journalEntryShipping = null;
    let paymentEntries = null;
    let stockUpdate = null;
    const errors = [];

    // 1. CREATE JOURNAL ENTRIES
    try {
      journalEntry = await GRNJournalService.createGrnJournalEntry({
        grnNumber: grn.grnNumber,
        grnDate: grn.grnDate,
        vendorId: grn.vendorId,
        vendorName: grn.vendorName,
        netTotal: grn.netTotal,
        shippingCost: 0,
        totalQty: grn.totalQty,
        createdBy: createdBy || "System",
      });

      console.log("✅ Goods received journal entry created:", journalEntry?.voucherNumber);

      if (grn.shippingCost && grn.shippingCost > 0) {
        journalEntryShipping = await GRNJournalService.createShippingJournalEntry(
          {
            grnNumber: grn.grnNumber,
            grnDate: grn.grnDate,
            vendorId: grn.vendorId,
            vendorName: grn.vendorName,
            createdBy: createdBy || "System",
          },
          grn.shippingCost
        );

        console.log("✅ Shipping journal entry created:", journalEntryShipping?.voucherNumber);
      }
    } catch (journalError) {
      console.error("❌ Error creating journal entries:", journalError.message);
      errors.push({ type: "JOURNAL", error: journalError.message });
    }

    // 2. UPDATE STOCK & BATCHES
    try {
      stockUpdate = await GRNStockUpdateService.processGrnStockUpdate(grn, createdBy || "System");

      console.log("✅ Stock updates completed:", {
        itemsProcessed: stockUpdate.processedItems.length,
        batchesCreated: stockUpdate.createdBatches.length,
        costUpdates: stockUpdate.costUpdates.length,
      });

      if (stockUpdate.errors && stockUpdate.errors.length > 0) {
        errors.push(...stockUpdate.errors.map((e) => ({ type: "STOCK", ...e })));
      }
    } catch (stockError) {
      console.error("❌ Error updating stock:", stockError.message);
      errors.push({ type: "STOCK", error: stockError.message });
    }

    // 3. CREATE VENDOR PAYMENT ENTRIES
    try {
      paymentEntries = await VendorPaymentService.createPaymentEntriesFromGrn({
        grnId: grn._id,
        grnNumber: grn.grnNumber,
        grnDate: grn.grnDate,
        vendorId: grn.vendorId,
        vendorName: grn.vendorName,
        paymentTerms: mapPaymentTermsToEnum(grn.paymentTerms) || "NET_30",
        subtotal: grn.subtotal || 0,
        discountAmount: grn.discountAmount || 0,
        taxAmount: grn.taxAmount || 0,
        netTotal: grn.netTotal || 0,
        shippingCost: grn.shippingCost || 0,
        createdBy: createdBy || "System",
      });

      console.log("💳 Vendor payment entries created:", paymentEntries);
    } catch (paymentError) {
      console.error("⚠️ Warning: Failed to create vendor payment entries:", paymentError.message);
      errors.push({ type: "PAYMENT", error: paymentError.message });
    }

    console.log(`✅ [POST] GRN posted successfully with all updates: ${grn.grnNumber}`);

    res.status(isNew ? 201 : 200).json({
      message: isNew
        ? "GRN created & posted successfully with all updates"
        : "GRN updated & posted successfully with all updates",
      grn: {
        _id: grn._id,
        grnNumber: grn.grnNumber,
        status: grn.status,
        netTotal: grn.netTotal,
        totalItems: grn.items?.length,
      },
      accounting: {
        journals: {
          items: journalEntry || null,
          shipping: journalEntryShipping || null,
        },
        paymentEntries: paymentEntries || null,
      },
      inventory: {
        itemsProcessed: stockUpdate?.processedItems?.length || 0,
        batchesCreated: stockUpdate?.createdBatches?.length || 0,
        currentStockUpdates: stockUpdate?.currentStockUpdates?.length || 0,
        costUpdates: stockUpdate?.costUpdates?.length || 0,
      },
      errors: errors.length > 0 ? errors : null,
    });
  } catch (error) {
    console.error("❌ Error posting GRN with updates:", error.message);
    res.status(500).json({
      message: "Failed to post GRN with updates",
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

    if (grn.status === "Received") {
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

      // ✅ Extract branchId from GRN for multi-store stock tracking
      const branchIdForStock = grn.branchId || null;
      
      stockUpdate = await GRNStockUpdateService.processGrnStockUpdate(grn, createdBy || "System", branchIdForStock);
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

    // 3. CREATE VENDOR PAYMENT ENTRIES when posting
    let paymentEntries = null;
    try {
      paymentEntries = await VendorPaymentService.createPaymentEntriesFromGrn({
        grnId: grn._id,
        grnNumber: grn.grnNumber,
        grnDate: grn.grnDate,
        vendorId: grn.vendorId,
        vendorName: grn.vendorName,
        paymentTerms: mapPaymentTermsToEnum(grn.paymentTerms) || "NET_30",
        subtotal: grn.subtotal || 0,
        discountAmount: grn.discountAmount || 0,
        taxAmount: grn.taxAmount || 0,
        netTotal: grn.netTotal || 0,
        shippingCost: grn.shippingCost || 0,
        createdBy: createdBy || "System",
      });
      console.log("💳 Vendor payment entries created during posting:", paymentEntries);
    } catch (paymentError) {
      console.error("⚠️ Warning: Failed to create vendor payment entries:", paymentError.message);
      errors.push({ type: "PAYMENT", error: paymentError.message });
    }

    // 4. UPDATE GRN STATUS TO RECEIVED (triggers stock update)
    grn.status = "Received";
    grn.postedDate = new Date();
    grn.postedBy = createdBy || "System";
    await grn.save();

    console.log(`✅ GRN Posted successfully: ${grn.grnNumber}`);

    // 5. SEND COMPREHENSIVE RESPONSE
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
        },
        paymentEntries: paymentEntries
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

// ✅ NEW: Get GRN as HTML for printing/PDF (using store-mapped template)
export const getGrnHtml = async (req, res) => {
  try {
    const { id } = req.params;
    const terminalId = req.headers["terminal-id"] || req.headers.terminalId;

    console.log(`📄 [GRN HTML] Generating HTML for GRN: ${id}, terminalId: ${terminalId}`);

    // Fetch GRN
    const grn = await Grn.findById(id).populate("vendorId");
    if (!grn) {
      return res.status(404).json({ message: "GRN not found" });
    }

    // Fetch company details
    const company = await Company.findOne().select("name currencySymbol decimalPlaces");

    // ✅ Fetch store settings and template mapping
    let storeDetails = null;
    let template = null;
    let storeSettings = null;

    if (terminalId) {
      try {
        const terminal = await TerminalManagement.findOne({ terminalId });
        if (terminal?.storeId) {
          storeSettings = await StoreSettings.findById(terminal.storeId);
          storeDetails = {
            storeName: storeSettings?.storeName || company?.name || 'Store',
            storeCode: storeSettings?.storeCode || '',
            address1: storeSettings?.address1 || '',
            address2: storeSettings?.address2 || '',
            phone: storeSettings?.phone || '',
            email: storeSettings?.email || '',
            taxNumber: storeSettings?.taxNumber || '',
            logoUrl: storeSettings?.logoUrl || ''
          };

          // ✅ Get GRN template ID from store settings
          const templateId = storeSettings?.templateMappings?.grn?.templateId;
          if (templateId) {
            console.log(`📋 [GRN HTML] Fetching template ID: ${templateId}`);
            template = await InventoryTemplate.findById(templateId);
            if (template) {
              console.log(`✅ [GRN HTML] Template found: ${template.templateName}`);
            } else {
              console.warn(`⚠️ [GRN HTML] Template not found, will use default`);
            }
          } else {
            console.log(`📋 [GRN HTML] No template mapping found in store settings, using default`);
          }
        }
      } catch (err) {
        console.warn("Error fetching store details:", err.message);
      }
    }

    // ✅ If template found, use Handlebars rendering; otherwise use hardcoded HTML
    let html;
    if (template?.htmlContent) {
      console.log(`📝 [GRN HTML] Using store-mapped template: ${template.templateName}`);
      
      // Prepare GRN data for Handlebars
      const grnData = {
        grn: {
          grnNumber: grn.grnNumber || 'N/A',
          grnDate: new Date(grn.grnDate).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          }),
          vendorName: grn.vendorId?.name || grn.vendorId?.vendorName || 'N/A',
          vendorCode: grn.vendorId?.vendorCode || '',
          vendorPhone: grn.vendorId?.phone || '',
          vendorEmail: grn.vendorId?.email || '',
          invoiceNo: grn.invoiceNo || '',
          lpoNo: grn.lpoNo || '',
          deliveryDate: grn.deliveryDate ? new Date(grn.deliveryDate).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          }) : '',
          items: (grn.items || []).map((item, idx) => ({
            slNo: idx + 1,
            itemcode: item.itemCode || '',
            itemName: item.itemName || '',
            quantity: item.quantity || 0,
            unit: item.unit || 'PCS',
            unitPrice: item.unitCost || 0,
            total: (item.quantity || 0) * (item.unitCost || 0),
            batchNo: item.batchNo || '',
            expiryDate: item.expiryDate || ''
          })),
          subtotal: grn.subtotal || 0,
          discountAmount: grn.discountAmount || 0,
          taxAmount: grn.taxAmount || 0,
          totalAmount: grn.netTotal || grn.finalTotal || 0,
          notes: grn.notes || ''
        },
        store: storeDetails,
        company: {
          companyName: company?.name || 'Company',
          currencySymbol: company?.currencySymbol || '$',
          decimalPlaces: company?.decimalPlaces || 2
        }
      };

      html = PdfGenerationService.renderTemplate(template.htmlContent, template.cssContent || '', grnData);
    } else {
      console.log(`📝 [GRN HTML] Using default hardcoded template`);
      // For now, return a simple HTML if template is not available
      // In future, you may want to use a hardcoded GRN template renderer similar to LPO
      html = `<html><body><h1>GRN: ${grn.grnNumber}</h1><p>Default template - template mapping not found</p></body></html>`;
    }

    console.log(`✅ [GRN HTML] Generated HTML length: ${html?.length}`);

    res.status(200)
      .contentType("text/html; charset=utf-8")
      .send(html);
  } catch (error) {
    console.error("Error generating GRN HTML:", error);
    res.status(500).json({
      message: "Failed to generate GRN HTML",
      error: error.message
    });
  }
};
