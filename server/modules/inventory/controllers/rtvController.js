/**
 * RTV Controller
 * Handles Return to Vendor operations
 */
import Rtv from "../../../Models/Rtv.js";
import Grn from "../../../Models/Grn.js";
import AddProduct from "../../../Models/AddProduct.js";
import CreateVendor from "../../../Models/CreateVendor.js";
import RTVStockUpdateService from "../../accounting/services/RTVStockUpdateService.js";
import RTVJournalService from "../../accounting/services/RTVJournalService.js";

// Generate RTV Number
const generateRtvNo = async () => {
  const currentYear = new Date().getFullYear();
  const result = await Rtv.findOne()
    .sort({ _id: -1 })
    .select("rtvNumber");

  let newNumber = `RTV-FY${currentYear}-00001`;
  
  if (result?.rtvNumber) {
    const matches = result.rtvNumber.match(/RTV-FY\d+-(\d+)/);
    if (matches) {
      const lastNumber = parseInt(matches[1]) + 1;
      newNumber = `RTV-FY${currentYear}-${String(lastNumber).padStart(5, "0")}`;
    }
  }
  
  return newNumber;
};

/**
 * Get Next RTV Number
 */
export const getRtvNextNumber = async (req, res) => {
  try {
    const rtvNumber = await generateRtvNo();
    res.status(200).json({
      success: true,
      rtvNo: rtvNumber,
    });
  } catch (error) {
    console.error("Error generating RTV number:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate RTV number",
      error: error.message,
    });
  }
};

/**
 * Create RTV
 */
export const createRtv = async (req, res) => {
  try {
    const { grnId, vendorId, items } = req.body;

    // Validate required fields
    if (!vendorId || !items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Vendor and items are required",
      });
    }

    // ✅ STOCK VALIDATION: Check if we have enough available stock in GRN
    // Available = Qty Received - Qty Already Returned to Vendor (independent of sales)
    const stockValidationErrors = [];
    for (const item of items) {
      const receivedQty = item.quantity || 0; // Original received quantity
      const rtvReturnedQty = item.rtvReturnedQuantity || 0; // Already returned in previous RTVs
      const availableQty = Math.max(0, receivedQty - rtvReturnedQty);
      const requestedQty = item.returnQuantity || 0; // Qty being returned now
      
      console.log(`[RTV Stock Check] ${item.itemCode}: Received=${receivedQty}, Already RTV Returned=${rtvReturnedQty}, Available=${availableQty}, Requesting=${requestedQty}`);
      
      if (requestedQty > availableQty) {
        stockValidationErrors.push({
          itemCode: item.itemCode,
          itemName: item.itemName,
          requested: requestedQty,
          available: availableQty,
          received: receivedQty,
          alreadyRtvReturned: rtvReturnedQty,
          message: `Cannot return ${requestedQty} units. Only ${availableQty} available for RTV.`,
        });
      }
    }

    if (stockValidationErrors.length > 0) {
      console.error("❌ RTV Stock validation failed:", stockValidationErrors);
      return res.status(400).json({
        success: false,
        message: "Insufficient available stock for RTV return",
        errors: stockValidationErrors,
        hint: "Available = Received Qty - Already Returned to Vendor (not affected by sales)",
      });
    }

    // Generate RTV number
    const rtvNumber = await generateRtvNo();

    // Calculate totals
    let totalQuantity = 0;
    let totalAmount = 0;
    items.forEach(item => {
      totalQuantity += item.quantity;
      totalAmount += item.totalCost || 0;
    });

    // Create RTV
    const rtv = await Rtv.create({
      rtvNumber,
      rtvDate: new Date(),
      grnId,
      vendorId,
      vendorName: req.body.vendorName,
      items,
      totalQuantity,
      totalAmount,
      status: "Draft",
      createdBy: req.user._id,
      createdDate: new Date(),
    });

    res.status(201).json({
      success: true,
      data: rtv,
      message: "RTV created successfully",
    });
  } catch (error) {
    console.error("Create RTV Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create RTV",
      error: error.message,
    });
  }
};

/**
 * Get RTV List
 */
export const getRtvList = async (req, res) => {
  try {
    const { vendorId, status, page = 1, limit = 20 } = req.query;
    let query = {};

    if (vendorId) query.vendorId = vendorId;
    if (status) query.status = status;

    const skip = (page - 1) * limit;
    const rtvs = await Rtv.find(query)
      .sort({ createdDate: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await Rtv.countDocuments(query);

    res.json({
      success: true,
      data: rtvs,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get RTV List Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch RTV list",
      error: error.message,
    });
  }
};

/**
 * Get RTV by ID
 */
export const getRtvById = async (req, res) => {
  try {
    const { rtvId } = req.params;
    const rtv = await Rtv.findById(rtvId);

    if (!rtv) {
      return res.status(404).json({
        success: false,
        message: "RTV not found",
      });
    }

    res.json({
      success: true,
      data: rtv,
    });
  } catch (error) {
    console.error("Get RTV Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch RTV",
      error: error.message,
    });
  }
};

/**
 * Update RTV (Draft only)
 */
export const updateRtv = async (req, res) => {
  try {
    const { rtvId } = req.params;
    const rtv = await Rtv.findById(rtvId);

    if (!rtv) {
      return res.status(404).json({
        success: false,
        message: "RTV not found",
      });
    }

    if (rtv.status !== "Draft") {
      return res.status(400).json({
        success: false,
        message: "Only draft RTVs can be updated",
      });
    }

    // Update allowed fields
    const { items, vendorId, vendorName } = req.body;
    
    if (items) {
      rtv.items = items;
      let totalQuantity = 0;
      let totalAmount = 0;
      items.forEach(item => {
        totalQuantity += item.quantity;
        totalAmount += item.totalCost || 0;
      });
      rtv.totalQuantity = totalQuantity;
      rtv.totalAmount = totalAmount;
    }

    if (vendorId) rtv.vendorId = vendorId;
    if (vendorName) rtv.vendorName = vendorName;

    await rtv.save();

    res.json({
      success: true,
      data: rtv,
      message: "RTV updated successfully",
    });
  } catch (error) {
    console.error("Update RTV Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update RTV",
      error: error.message,
    });
  }
};

/**
 * Delete RTV (Draft only)
 */
export const deleteRtv = async (req, res) => {
  try {
    const { rtvId } = req.params;
    const rtv = await Rtv.findById(rtvId);

    if (!rtv) {
      return res.status(404).json({
        success: false,
        message: "RTV not found",
      });
    }

    if (rtv.status !== "Draft") {
      return res.status(400).json({
        success: false,
        message: "Only draft RTVs can be deleted",
      });
    }

    await Rtv.findByIdAndDelete(rtvId);

    res.json({
      success: true,
      message: "RTV deleted successfully",
    });
  } catch (error) {
    console.error("Delete RTV Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete RTV",
      error: error.message,
    });
  }
};

/**
 * Submit RTV (Draft → Submitted)
 */
export const submitRtv = async (req, res) => {
  try {
    const { rtvId } = req.params;
    const rtv = await Rtv.findById(rtvId);

    if (!rtv) {
      return res.status(404).json({
        success: false,
        message: "RTV not found",
      });
    }

    if (rtv.status !== "Draft") {
      return res.status(400).json({
        success: false,
        message: "Only draft RTVs can be submitted",
      });
    }

    rtv.status = "Submitted";
    rtv.submittedBy = req.user._id;
    rtv.submittedDate = new Date();

    await rtv.save();

    res.json({
      success: true,
      data: rtv,
      message: "RTV submitted successfully",
    });
  } catch (error) {
    console.error("Submit RTV Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to submit RTV",
      error: error.message,
    });
  }
};

/**
 * Approve RTV (Submitted → Approved)
 */
export const approveRtv = async (req, res) => {
  try {
    const { rtvId } = req.params;
    const rtv = await Rtv.findById(rtvId);

    if (!rtv) {
      return res.status(404).json({
        success: false,
        message: "RTV not found",
      });
    }

    if (rtv.status !== "Submitted") {
      return res.status(400).json({
        success: false,
        message: "Only submitted RTVs can be approved",
      });
    }

    rtv.status = "Approved";
    rtv.approvedBy = req.user._id;
    rtv.approvedDate = new Date();

    await rtv.save();

    res.json({
      success: true,
      data: rtv,
      message: "RTV approved successfully",
    });
  } catch (error) {
    console.error("Approve RTV Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to approve RTV",
      error: error.message,
    });
  }
};

/**
 * Post RTV (Approved → Posted)
 * Triggers stock reversal and GL reversal
 */
/**
 * ✅ Check Batch Expiry Status
 */
const getExpiryStatus = (expiryDate) => {
  if (!expiryDate) return { status: "NO_BATCH", label: "No Batch" };
  
  const today = new Date();
  const expiry = new Date(expiryDate);
  const daysLeft = Math.floor((expiry - today) / (1000 * 60 * 60 * 24));
  
  if (daysLeft < 0) return { status: "EXPIRED", label: "EXPIRED", daysLeft };
  if (daysLeft <= 7) return { status: "EXPIRING_SOON", label: "Expiring Soon", daysLeft };
  return { status: "ACTIVE", label: "Active", daysLeft };
};

export const postRtv = async (req, res) => {
  try {
    const { rtvId } = req.params;
    const rtv = await Rtv.findById(rtvId);

    if (!rtv) {
      return res.status(404).json({
        success: false,
        message: "RTV not found",
      });
    }

    if (rtv.status !== "Approved") {
      return res.status(400).json({
        success: false,
        message: "Only approved RTVs can be posted",
      });
    }

    // ✅ Validate batch expiry status before posting
    const expiredItems = [];
    const expiringItems = [];
    
    rtv.items.forEach(item => {
      if (item.originalExpiryDate) {
        const status = getExpiryStatus(item.originalExpiryDate);
        if (status.status === "EXPIRED") {
          expiredItems.push({
            itemName: item.itemName,
            batchNumber: item.originalBatchNumber,
            expiryDate: item.originalExpiryDate,
            daysExpired: Math.abs(status.daysLeft),
          });
        } else if (status.status === "EXPIRING_SOON") {
          expiringItems.push({
            itemName: item.itemName,
            batchNumber: item.originalBatchNumber,
            expiryDate: item.originalExpiryDate,
            daysLeft: status.daysLeft,
          });
        }
      }
    });

    // Log warnings
    if (expiredItems.length > 0) {
      console.warn("⚠️ RTV contains EXPIRED items:", {
        rtvNo: rtv.rtvNumber,
        count: expiredItems.length,
        items: expiredItems,
      });
    }
    
    if (expiringItems.length > 0) {
      console.warn("⚠️ RTV contains EXPIRING_SOON items:", {
        rtvNo: rtv.rtvNumber,
        count: expiringItems.length,
        items: expiringItems,
      });
    }

    // ✅ CRITICAL FIX: Extract branchId for multi-store stock isolation
    const branchIdForStock = rtv.branchId || null;
    
    // Process stock reversal
    const stockResult = await RTVStockUpdateService.processRtvStockReversal(rtv, req.user?._id, branchIdForStock);
    if (!stockResult.success) {
      return res.status(400).json({
        success: false,
        message: stockResult.message,
      });
    }

    // ✅ UPDATE GRN ITEMS: Track RTV returned quantities (independent of sales)
    if (rtv.grnId) {
      const grn = await Grn.findById(rtv.grnId);
      
      if (grn && grn.items) {
        rtv.items.forEach(rtvItem => {
          // Find matching GRN item by product and batch
          const grnItem = grn.items.find(gi => 
            gi.productId.toString() === rtvItem.productId?.toString() && 
            (gi.batchNumber || "") === (rtvItem.originalBatchNumber || "")
          );
          
          if (grnItem) {
            const prevRtvReturned = grnItem.rtvReturnedQuantity || 0;
            grnItem.rtvReturnedQuantity = prevRtvReturned + (rtvItem.quantity || 0);
            
            const availableNow = Math.max(0, grnItem.quantity - grnItem.rtvReturnedQuantity);
            console.log(`✅ Updated ${rtvItem.itemCode}: rtvReturned ${prevRtvReturned} → ${grnItem.rtvReturnedQuantity} (available now: ${availableNow}/${grnItem.quantity})`);
          }
        });
        await grn.save();
      }
    }

    // Process GL reversal
    const journalResult = await RTVJournalService.createRtvJournalEntry(rtv);
    if (!journalResult.success) {
      return res.status(400).json({
        success: false,
        message: journalResult.message,
      });
    }

    // Generate credit note entry
    const creditNoteResult = await RTVJournalService.createCreditNoteJournalEntry(rtv);
    if (!creditNoteResult.success) {
      return res.status(400).json({
        success: false,
        message: creditNoteResult.message,
      });
    }

    // Update RTV status
    rtv.status = "Posted";
    rtv.postedBy = req.user._id;
    rtv.postedDate = new Date();
    rtv.stockReversalDate = new Date();
    rtv.stockReversalBy = req.user._id;
    rtv.journalEntryId = journalResult.data._id;
    rtv.creditNoteJournalEntryId = creditNoteResult.data._id;
    rtv.creditNoteNo = creditNoteResult.data.voucherNo;
    rtv.creditNoteStatus = "Generated";
    
    // ✅ Store expiry warnings in RTV record
    rtv.expiryWarnings = {
      expiredItems,
      expiringItems,
      checkedAt: new Date(),
    };

    await rtv.save();

    res.json({
      success: true,
      data: rtv,
      message: "RTV posted successfully - Stock and GL reversed",
      warnings: {
        expiredCount: expiredItems.length,
        expiringCount: expiringItems.length,
      },
    });
  } catch (error) {
    console.error("Post RTV Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to post RTV",
      error: error.message,
    });
  }
};

/**
 * Cancel RTV
 * Reverses posted entries if applicable
 */
export const cancelRtv = async (req, res) => {
  try {
    const { rtvId } = req.params;
    const rtv = await Rtv.findById(rtvId);

    if (!rtv) {
      return res.status(404).json({
        success: false,
        message: "RTV not found",
      });
    }

    if (!["Draft", "Submitted", "Approved", "Posted"].includes(rtv.status)) {
      return res.status(400).json({
        success: false,
        message: "This RTV cannot be cancelled",
      });
    }

    // If posted, reverse the journal entries
    if (rtv.status === "Posted" && rtv.journalEntryId) {
      const reverseResult = await RTVJournalService.reverseJournalEntry(rtv.journalEntryId);
      if (!reverseResult.success) {
        return res.status(400).json({
          success: false,
          message: reverseResult.message,
        });
      }
    }

    rtv.status = "Cancelled";
    rtv.cancelledBy = req.user._id;
    rtv.cancelledDate = new Date();

    await rtv.save();

    res.json({
      success: true,
      data: rtv,
      message: "RTV cancelled successfully",
    });
  } catch (error) {
    console.error("Cancel RTV Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to cancel RTV",
      error: error.message,
    });
  }
};

/**
 * Get GRN List for selection
 */
export const getGrnList = async (req, res) => {
  try {
    const { vendorId } = req.query;
    // Allow returns from verified or received GRNs
    let query = { status: { $in: ["Received", "Verified"] } };

    if (vendorId) query.vendorId = vendorId;

    const grns = await Grn.find(query)
      .sort({ grnDate: -1 })
      .limit(100);

    console.log("GRN List query:", query);
    console.log("GRNs found:", grns.length);

    res.json({
      success: true,
      data: grns,
    });
  } catch (error) {
    console.error("Get GRN List Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch GRN list",
      error: error.message,
    });
  }
};

/**
 * Generate Credit Note
 */
export const generateCreditNote = async (req, res) => {
  try {
    const { rtvId } = req.params;
    const rtv = await Rtv.findById(rtvId);

    if (!rtv) {
      return errorHandler(res, "RTV not found", 404);
    }

    if (rtv.status !== "Posted") {
      return errorHandler(res, "Only posted RTVs can generate credit notes", 400);
    }

    if (rtv.creditNoteNo) {
      return errorHandler(res, "Credit note already generated", 400);
    }

    // Generate credit note via accounting service
    const result = await RTVJournalService.createCreditNoteJournalEntry(rtv);
    
    if (!result.success) {
      return errorHandler(res, result.message, 400);
    }

    rtv.creditNoteNo = result.data.voucherNo;
    rtv.creditNoteJournalEntryId = result.data._id;
    rtv.creditNoteStatus = "Generated";
    await rtv.save();

    res.json({
      success: true,
      data: rtv,
      message: "Credit note generated successfully",
    });
  } catch (error) {
    console.error("Generate Credit Note Error:", error);
    return errorHandler(res, error.message, 500);
  }
};

/**
 * ✅ Get GRN with Stock Tracking Info
 * Returns GRN items with original quantities and returned quantities
 */
export const getGrnStockTracking = async (req, res) => {
  try {
    const { grnId } = req.params;
    const grn = await Grn.findById(grnId);

    if (!grn) {
      return res.status(404).json({
        success: false,
        message: "GRN not found",
      });
    }

    // ✅ Calculate availability using: Available = Received - RTV Returned (independent of sales)
    const enhancedItems = grn.items.map(item => {
      const receivedQty = item.quantity || 0;
      const rtvReturnedQty = item.rtvReturnedQuantity || 0;
      const availableForRtvQty = Math.max(0, receivedQty - rtvReturnedQty);
      const returnPercentage = receivedQty > 0 ? (rtvReturnedQty / receivedQty) * 100 : 0;

      return {
        ...item.toObject?.() || item,
        receivedQuantity: receivedQty,
        rtvReturnedQuantity: rtvReturnedQty,
        availableForRtvQuantity: availableForRtvQty,
        returnPercentage: Math.round(returnPercentage),
        status: availableForRtvQty === 0 ? "EXHAUSTED" : availableForRtvQty < receivedQty * 0.5 ? "PARTIAL" : "FULL_STOCK",
      };
    });

    console.log(`[GRN Stock] ${grn.grnNumber}:`, {
      totalItems: enhancedItems.length,
      itemDetails: enhancedItems.map(i => ({
        code: i.itemCode,
        formula: `${i.receivedQuantity} - ${i.rtvReturnedQuantity}`,
        available: i.availableForRtvQuantity
      }))
    });

    res.json({
      success: true,
      data: {
        ...grn.toObject(),
        items: enhancedItems,
      },
      summary: {
        totalItems: enhancedItems.length,
        fullyAvailable: enhancedItems.filter(i => i.availableForRtvQuantity === i.receivedQuantity).length,
        partial: enhancedItems.filter(i => i.status === "PARTIAL").length,
        exhausted: enhancedItems.filter(i => i.status === "EXHAUSTED").length,
        totalAvailableForRtv: enhancedItems.reduce((sum, i) => sum + i.availableForRtvQuantity, 0),
      },
    });
  } catch (error) {
    console.error("Get GRN Stock Tracking Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch GRN stock tracking",
      error: error.message,
    });
  }
};

/**
 * Get Available Stock for RTV by Vendor
 * Returns all GRNs with items available for return (Simple Formula: Received - RTV Returned)
 */
export const getAvailableRtvStock = async (req, res) => {
  try {
    const { vendorId } = req.query;

    if (!vendorId) {
      return res.status(400).json({
        success: false,
        message: "Vendor ID is required",
      });
    }

    // Get all posted GRNs for this vendor
    const grns = await Grn.find({
      vendorId,
      status: { $in: ["Posted"] }
    }).sort({ grnDate: -1 });

    if (!grns || grns.length === 0) {
      return res.json({
        success: true,
        data: [],
        summary: {
          totalGrns: 0,
          totalAvailableForRtv: 0,
        }
      });
    }

    // Build list of items available for RTV
    const availableItems = [];
    let totalAvailable = 0;

    grns.forEach(grn => {
      if (!grn.items) return;

      grn.items.forEach(item => {
        const receivedQty = item.quantity || 0;
        const rtvReturnedQty = item.rtvReturnedQuantity || 0;
        const availableForRtvQty = Math.max(0, receivedQty - rtvReturnedQty);

        if (availableForRtvQty > 0) {
          availableItems.push({
            grnId: grn._id,
            grnNumber: grn.grnNumber,
            grnDate: grn.grnDate,
            vendorName: grn.vendorName,
            costMethod: grn.costMethod || "FIFO",
            
            itemId: item._id || item.productId,
            productId: item.productId,
            itemCode: item.itemCode,
            itemName: item.itemName,
            
            received: receivedQty,
            rtvReturned: rtvReturnedQty,
            availableForRtv: availableForRtvQty,
            
            unitCost: item.unitCost || 0,
            totalValue: (availableForRtvQty * (item.unitCost || 0)),
            
            batchNumber: item.batchNumber || null,
            expiryDate: item.expiryDate || null,
            
            returnPercentage: receivedQty > 0 ? Math.round((rtvReturnedQty / receivedQty) * 100) : 0,
            status: availableForRtvQty === receivedQty ? "FULL" : "PARTIAL",
          });
          
          totalAvailable += availableForRtvQty;
        }
      });
    });

    console.log(`[RTV Available Stock] Vendor: ${vendorId}`, {
      totalGrns: grns.length,
      itemsAvailable: availableItems.length,
      totalQtyAvailable: totalAvailable
    });

    res.json({
      success: true,
      data: availableItems,
      summary: {
        totalGrns: grns.length,
        itemsWithStock: availableItems.length,
        totalAvailableForRtv: totalAvailable,
        totalValue: availableItems.reduce((sum, i) => sum + i.totalValue, 0),
      }
    });
  } catch (error) {
    console.error("Get Available RTV Stock Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch available RTV stock",
      error: error.message,
    });
  }
};
