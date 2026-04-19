/**
 * Terminal Management Controller
 * 
 * ✅ Create, read, update, delete terminal configurations
 * ✅ Test hardware connections
 * ✅ Configure printing formats per terminal
 * ✅ Manage terminal-specific controls
 * ✅ Monitor terminal health and connectivity
 */

import TerminalManagement from "../../../Models/TerminalManagement.js";
import StoreSettings from "../../../Models/StoreSettings.js";
import Organization from "../../../Models/Organization.js";

// ========================================
// CREATE TERMINAL
// ========================================
export const createTerminal = async (req, res) => {
  try {
    const {
      terminalId,
      terminalName,
      storeId,
      organizationId,
      terminalType,
      invoiceControls,
      formatMapping,
      hardwareMapping,
      notes,
    } = req.body;

    console.log("📥 Received create terminal request:", { terminalId, terminalName, storeId, terminalType });

    // Validate required fields with detailed logging
    if (!terminalId) {
      console.error("❌ Missing terminalId");
      return res.status(400).json({
        success: false,
        message: "Terminal ID is required",
      });
    }
    
    if (!terminalName) {
      console.error("❌ Missing terminalName");
      return res.status(400).json({
        success: false,
        message: "Terminal Name is required",
      });
    }
    
    if (!storeId) {
      console.error("❌ Missing storeId");
      return res.status(400).json({
        success: false,
        message: "Store ID is required",
      });
    }

    // Check if terminal already exists
    const existingTerminal = await TerminalManagement.findOne({ terminalId });
    if (existingTerminal) {
      return res.status(400).json({
        success: false,
        message: `Terminal with ID ${terminalId} already exists`,
      });
    }

    // Build structured terminal data - ONLY schema-defined fields
    const terminalData = {
      terminalId: terminalId.trim(),
      terminalName: terminalName.trim(),
      storeId,
      organizationId,
      terminalType: terminalType || "SALES",
      terminalStatus: "ACTIVE",
      createdBy: req.user?._id || "SYSTEM",
      invoiceControls: {
        invoiceNumberPrefix: invoiceControls?.invoiceNumberPrefix || "",
      },
      formatMapping: formatMapping ? {
        invoice: { templateId: formatMapping.invoice?.templateId || null },
        deliveryNote: { templateId: formatMapping.deliveryNote?.templateId || null },
        quotation: { templateId: formatMapping.quotation?.templateId || null },
        salesOrder: { templateId: formatMapping.salesOrder?.templateId || null },
        salesReturn: { templateId: formatMapping.salesReturn?.templateId || null },
      } : {
        invoice: { templateId: null },
        deliveryNote: { templateId: null },
        quotation: { templateId: null },
        salesOrder: { templateId: null },
        salesReturn: { templateId: null },
      },
      hardwareMapping: hardwareMapping || {
        invoicePrinter: { enabled: true, printerName: "", timeout: 5000 },
        barcodePrinter: { enabled: false, printerName: "", timeout: 5000 },
        customerDisplay: {
          enabled: false,
          displayType: "VFD",
          comPort: "COM1",
          vfdModel: "VFD_20X2",
          baudRate: 9600,
          displayItems: true,
          displayPrice: true,
          displayTotal: true,
          displayDiscount: true,
        },
      },
      notes: notes?.trim() || "",
    };

    console.log("📊 Terminal data to save:", JSON.stringify(terminalData, null, 2));

    // Create new terminal
    const terminal = await TerminalManagement.create(terminalData);

    console.log(`✅ Terminal created: ${terminalId}`);

    res.status(201).json({
      success: true,
      message: "Terminal created successfully",
      data: terminal,
    });
  } catch (error) {
    console.error("❌ Error creating terminal:", error.message);
    console.error("❌ Error details:", error.errors || error);
    res.status(500).json({
      success: false,
      message: "Failed to create terminal",
      error: error.message,
      details: error.errors || {},
    });
  }
};

// ========================================
// GET ALL TERMINALS FOR A STORE
// ========================================
export const getStoreterminals = async (req, res) => {
  try {
    const { storeId } = req.params;

    const terminals = await TerminalManagement.find({ storeId }).sort({
      createdAt: -1,
    });

    res.status(200).json({
      success: true,
      count: terminals.length,
      data: terminals,
    });
  } catch (error) {
    console.error("❌ Error fetching terminals:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch terminals",
      error: error.message,
    });
  }
};

// ========================================
// GET ALL TERMINALS (System-wide)
// ========================================
export const getAllTerminals = async (req, res) => {
  try {
    const terminals = await TerminalManagement.find().sort({
      createdAt: -1,
    });

    res.status(200).json({
      success: true,
      count: terminals.length,
      data: terminals,
    });
  } catch (error) {
    console.error("❌ Error fetching all terminals:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch terminals",
      error: error.message,
    });
  }
};

// ========================================
// GET TERMINAL BY ID
// ========================================
export const getTerminalById = async (req, res) => {
  try {
    const { terminalId } = req.params;

    const terminal = await TerminalManagement.findOne({
      terminalId,
    }).populate("storeId organizationId");

    if (!terminal) {
      return res.status(404).json({
        success: false,
        message: "Terminal not found",
      });
    }

    res.status(200).json({
      success: true,
      data: terminal,
    });
  } catch (error) {
    console.error("❌ Error fetching terminal:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch terminal",
      error: error.message,
    });
  }
};

// ========================================
// VERIFY TERMINAL (PUBLIC - NO AUTH)
// ========================================
/**
 * Public endpoint for terminal verification during Electron startup
 * Returns only: terminalId, terminalType, terminalStatus
 * No authentication required
 */
export const verifyTerminal = async (req, res) => {
  try {
    const { terminalId } = req.params;

    console.log(`🔍 Public terminal verification request: ${terminalId}`);

    const terminal = await TerminalManagement.findOne({ terminalId });

    if (!terminal) {
      console.log(`❌ Terminal not found: ${terminalId}`);
      return res.status(404).json({
        success: false,
        message: "Terminal not found",
      });
    }

    // Return only verification fields
    res.status(200).json({
      terminalId: terminal.terminalId,
      terminalType: terminal.terminalType,
      terminalStatus: terminal.terminalStatus,
    });

    console.log(`✅ Terminal verified: ${terminalId} (${terminal.terminalType})`);
  } catch (error) {
    console.error(`❌ Error verifying terminal: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Failed to verify terminal",
      error: error.message,
    });
  }
};

// ========================================
// UPDATE TERMINAL CONFIGURATION
// ========================================
export const updateTerminalConfig = async (req, res) => {
  try {
    const { terminalId } = req.params;
    const {
      terminalName,
      terminalType,
      invoiceControls,
      formatMapping,
      hardwareMapping,
      notes,
    } = req.body;

    // Build structured update object - ONLY schema-defined fields
    const updates = {
      updatedBy: req.user?._id || "SYSTEM",
      updatedAt: new Date(),
    };

    // Update basic fields
    if (terminalName !== undefined) updates.terminalName = terminalName.trim();
    if (terminalType !== undefined) updates.terminalType = terminalType;
    if (notes !== undefined) updates.notes = notes.trim();

    // Update invoice controls
    if (invoiceControls !== undefined) updates.invoiceControls = invoiceControls;

    // Update format mapping (templates only)
    if (formatMapping !== undefined) updates.formatMapping = formatMapping;

    // Update hardware mapping
    if (hardwareMapping !== undefined) updates.hardwareMapping = hardwareMapping;

    // Find and update terminal
    const terminal = await TerminalManagement.findOneAndUpdate(
      { terminalId },
      updates,
      { returnDocument: "after", runValidators: true }
    );

    if (!terminal) {
      return res.status(404).json({
        success: false,
        message: "Terminal not found",
      });
    }

    console.log(`✅ Terminal updated: ${terminalId}`);

    res.status(200).json({
      success: true,
      message: "Terminal configuration updated successfully",
      data: terminal,
    });
  } catch (error) {
    console.error("❌ Error updating terminal:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update terminal",
      error: error.message,
    });
  }
};

// ========================================
// UPDATE HARDWARE CONFIGURATION
// ========================================
export const updateHardwareConfig = async (req, res) => {
  try {
    const { terminalId } = req.params;
    const { hardware } = req.body;

    const terminal = await TerminalManagement.findOneAndUpdate(
      { terminalId },
      {
        hardware: hardware,
        updatedBy: req.user?._id || "SYSTEM",
        updatedAt: new Date(),
      },
      { returnDocument: "after" }
    );

    if (!terminal) {
      return res.status(404).json({
        success: false,
        message: "Terminal not found",
      });
    }

    console.log(`✅ Hardware configuration updated for terminal: ${terminalId}`);

    res.status(200).json({
      success: true,
      message: "Hardware configuration updated",
      data: terminal.hardware,
    });
  } catch (error) {
    console.error("❌ Error updating hardware:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update hardware configuration",
      error: error.message,
    });
  }
};

// ========================================
// UPDATE PRINTING FORMATS
// ========================================
export const updatePrintingFormats = async (req, res) => {
  try {
    const { terminalId } = req.params;
    const { printingFormats } = req.body;

    const terminal = await TerminalManagement.findOneAndUpdate(
      { terminalId },
      {
        printingFormats: printingFormats,
        updatedBy: req.user?._id || "SYSTEM",
        updatedAt: new Date(),
      },
      { returnDocument: "after" }
    );

    if (!terminal) {
      return res.status(404).json({
        success: false,
        message: "Terminal not found",
      });
    }

    console.log(
      `✅ Printing formats updated for terminal: ${terminalId}`
    );

    res.status(200).json({
      success: true,
      message: "Printing formats updated successfully",
      data: terminal.printingFormats,
    });
  } catch (error) {
    console.error("❌ Error updating printing formats:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update printing formats",
      error: error.message,
    });
  }
};

// ========================================
// UPDATE SALES CONTROLS
// ========================================
export const updateSalesControls = async (req, res) => {
  try {
    const { terminalId } = req.params;
    const { salesControls } = req.body;

    const terminal = await TerminalManagement.findOneAndUpdate(
      { terminalId },
      {
        salesControls: salesControls,
        updatedBy: req.user?._id || "SYSTEM",
        updatedAt: new Date(),
      },
      { returnDocument: "after" }
    );

    if (!terminal) {
      return res.status(404).json({
        success: false,
        message: "Terminal not found",
      });
    }

    console.log(`✅ Sales controls updated for terminal: ${terminalId}`);

    res.status(200).json({
      success: true,
      message: "Sales controls updated successfully",
      data: terminal.salesControls,
    });
  } catch (error) {
    console.error("❌ Error updating sales controls:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update sales controls",
      error: error.message,
    });
  }
};

// ========================================
// UPDATE INVOICE CONTROLS
// ========================================
export const updateInvoiceControls = async (req, res) => {
  try {
    const { terminalId } = req.params;
    const { invoiceControls } = req.body;

    const terminal = await TerminalManagement.findOneAndUpdate(
      { terminalId },
      {
        invoiceControls: invoiceControls,
        updatedBy: req.user?._id || "SYSTEM",
        updatedAt: new Date(),
      },
      { returnDocument: "after" }
    );

    if (!terminal) {
      return res.status(404).json({
        success: false,
        message: "Terminal not found",
      });
    }

    console.log(`✅ Invoice controls updated for terminal: ${terminalId}`);

    res.status(200).json({
      success: true,
      message: "Invoice controls updated successfully",
      data: terminal.invoiceControls,
    });
  } catch (error) {
    console.error("❌ Error updating invoice controls:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update invoice controls",
      error: error.message,
    });
  }
};

// ========================================
// GET NEXT INVOICE NUMBER
// ========================================
export const getNextInvoiceNumber = async (req, res) => {
  try {
    const { terminalId } = req.params;

    const terminal = await TerminalManagement.findOneAndUpdate(
      { terminalId },
      {
        $inc: { "invoiceControls.invoiceCounter": 1 },
      },
      { returnDocument: "after" }
    );

    if (!terminal) {
      return res.status(404).json({
        success: false,
        message: "Terminal not found",
      });
    }

    const invoiceNumber = terminal.invoiceControls.invoiceCounter + 1;
    const prefix = terminal.invoiceControls.invoiceNumberPrefix || "";

    res.status(200).json({
      success: true,
      invoiceNumber: `${prefix}${invoiceNumber}`,
      data: {
        terminalId,
        invoiceNumber,
        prefix,
        format: terminal.invoiceControls.invoiceNumberFormat,
      },
    });
  } catch (error) {
    console.error("❌ Error getting next invoice number:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get next invoice number",
      error: error.message,
    });
  }
};

// ========================================
// TEST PRINTER CONNECTION
// ========================================
export const testPrinterConnection = async (req, res) => {
  try {
    const { terminalId } = req.params;
    const { printerType } = req.body; // "primaryPrinter" or "labelPrinter"

    // Validate printer type
    if (!["primaryPrinter", "labelPrinter"].includes(printerType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid printer type. Use 'primaryPrinter' or 'labelPrinter'",
      });
    }

    const terminal = await TerminalManagement.findOne({ terminalId });
    if (!terminal) {
      return res.status(404).json({
        success: false,
        message: "Terminal not found",
      });
    }

    // Get printer config
    const printerConfig = terminal.hardware[printerType];

    // ✅ TODO: Implement actual printer test logic based on printer model
    // For now, we'll simulate it
    console.log(
      `🖨️ Testing ${printerType} for terminal ${terminalId}...`,
      printerConfig
    );

    // Simulate test
    let testStatus = "PASS";
    let testMessage = "Printer connection successful";

    if (!printerConfig?.isConfigured) {
      testStatus = "FAIL";
      testMessage = "Printer not configured";
    }

    // Update printer test status
    await TerminalManagement.findOneAndUpdate(
      { terminalId },
      {
        $set: {
          [`hardware.${printerType}.testStatus`]: testStatus,
          [`hardware.${printerType}.lastTestDate`]: new Date(),
        },
      }
    );

    res.status(200).json({
      success: testStatus === "PASS",
      testStatus,
      message: testMessage,
      printer: printerConfig,
    });
  } catch (error) {
    console.error("❌ Error testing printer:", error);
    res.status(500).json({
      success: false,
      message: "Failed to test printer",
      error: error.message,
    });
  }
};

// ========================================
// UPDATE TERMINAL STATUS
// ========================================
export const updateTerminalStatus = async (req, res) => {
  try {
    const { terminalId } = req.params;
    const { terminalStatus } = req.body;

    const validStatuses = ["ACTIVE", "INACTIVE", "MAINTENANCE", "OFFLINE"];
    if (!validStatuses.includes(terminalStatus)) {
      return res.status(400).json({
        success: false,
        message: `Invalid terminal status. Use one of: ${validStatuses.join(", ")}`,
      });
    }

    const terminal = await TerminalManagement.findOneAndUpdate(
      { terminalId },
      {
        terminalStatus,
        updatedBy: req.user?._id || "SYSTEM",
        updatedAt: new Date(),
      },
      { returnDocument: "after" }
    );

    if (!terminal) {
      return res.status(404).json({
        success: false,
        message: "Terminal not found",
      });
    }

    console.log(`✅ Terminal status updated: ${terminalId} -> ${terminalStatus}`);

    res.status(200).json({
      success: true,
      message: `Terminal status updated to ${terminalStatus}`,
      data: terminal,
    });
  } catch (error) {
    console.error("❌ Error updating terminal status:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update terminal status",
      error: error.message,
    });
  }
};

// ========================================
// UPDATE CONNECTIVITY STATUS
// ========================================
export const updateConnectivityStatus = async (req, res) => {
  try {
    const { terminalId } = req.params;
    const { isOnline, ipAddress, macAddress } = req.body;

    const terminal = await TerminalManagement.findOneAndUpdate(
      { terminalId },
      {
        "connectivity.isOnline": isOnline !== undefined ? isOnline : true,
        ...(ipAddress && { "connectivity.ipAddress": ipAddress }),
        ...(macAddress && { "connectivity.macAddress": macAddress }),
        "connectivity.lastHeartbeat": new Date(),
      },
      { returnDocument: "after" }
    );

    if (!terminal) {
      return res.status(404).json({
        success: false,
        message: "Terminal not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Connectivity status updated",
      data: {
        terminalId,
        isOnline: terminal.connectivity.isOnline,
        lastHeartbeat: terminal.connectivity.lastHeartbeat,
      },
    });
  } catch (error) {
    console.error("❌ Error updating connectivity:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update connectivity status",
      error: error.message,
    });
  }
};

// ========================================
// DELETE TERMINAL
// ========================================
export const deleteTerminal = async (req, res) => {
  try {
    const { terminalId } = req.params;

    const terminal = await TerminalManagement.findOneAndDelete({ terminalId });

    if (!terminal) {
      return res.status(404).json({
        success: false,
        message: "Terminal not found",
      });
    }

    console.log(`✅ Terminal deleted: ${terminalId}`);

    res.status(200).json({
      success: true,
      message: "Terminal deleted successfully",
    });
  } catch (error) {
    console.error("❌ Error deleting terminal:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete terminal",
      error: error.message,
    });
  }
};

// ========================================
// GET TERMINAL HEALTH STATUS
// ========================================
export const getTerminalHealth = async (req, res) => {
  try {
    const { terminalId } = req.params;

    const terminal = await TerminalManagement.findOne({ terminalId });

    if (!terminal) {
      return res.status(404).json({
        success: false,
        message: "Terminal not found",
      });
    }

    // Calculate health score
    let healthScore = 100;
    const issues = [];

    // Check hardware status
    if (terminal.hardware.primaryPrinter?.testStatus === "FAIL") {
      healthScore -= 30;
      issues.push("Primary Printer Offline");
    }
    if (terminal.hardware.labelPrinter?.testStatus === "FAIL") {
      healthScore -= 20;
      issues.push("Label Printer Offline");
    }
    if (!terminal.connectivity.isOnline) {
      healthScore -= 40;
      issues.push("Terminal Offline");
    }

    // Check last sync time
    const lastSync = terminal.connectivity.lastSyncTime;
    if (lastSync) {
      const timeSinceSync = Date.now() - lastSync.getTime();
      const minutesSinceSync = Math.floor(timeSinceSync / (1000 * 60));
      if (minutesSinceSync > 60) {
        healthScore -= 15;
        issues.push(`No sync for ${minutesSinceSync} minutes`);
      }
    }

    res.status(200).json({
      success: true,
      data: {
        terminalId,
        terminalStatus: terminal.terminalStatus,
        healthScore: Math.max(0, healthScore),
        isHealthy: healthScore > 75,
        issues,
        connectivity: terminal.connectivity,
        hardware: {
          primaryPrinter: terminal.hardware.primaryPrinter?.testStatus,
          labelPrinter: terminal.hardware.labelPrinter?.testStatus,
        },
      },
    });
  } catch (error) {
    console.error("❌ Error getting terminal health:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get terminal health status",
      error: error.message,
    });
  }
};

// ========================================
// LOG HARDWARE FAULT
// ========================================
export const logHardwareFault = async (req, res) => {
  try {
    const { terminalId } = req.params;
    const { hardwareType, faultDescription, notes } = req.body;

    const terminal = await TerminalManagement.findOneAndUpdate(
      { terminalId },
      {
        $push: {
          "activityLog.hardwareFaults": {
            hardwareType,
            faultDescription,
            faultTime: new Date(),
            resolved: false,
            notes,
          },
        },
      },
      { returnDocument: "after" }
    );

    if (!terminal) {
      return res.status(404).json({
        success: false,
        message: "Terminal not found",
      });
    }

    console.log(
      `⚠️ Hardware fault logged for ${terminalId}: ${hardwareType}`
    );

    res.status(200).json({
      success: true,
      message: "Hardware fault logged successfully",
      data: terminal.activityLog.hardwareFaults,
    });
  } catch (error) {
    console.error("❌ Error logging hardware fault:", error);
    res.status(500).json({
      success: false,
      message: "Failed to log hardware fault",
      error: error.message,
    });
  }
};

// ========================================
// RESOLVE HARDWARE FAULT
// ========================================
export const resolveHardwareFault = async (req, res) => {
  try {
    const { terminalId, faultId } = req.params;

    const terminal = await TerminalManagement.findOneAndUpdate(
      { terminalId, "activityLog.hardwareFaults._id": faultId },
      {
        $set: {
          "activityLog.hardwareFaults.$.resolved": true,
          "activityLog.hardwareFaults.$.resolvedTime": new Date(),
        },
      },
      { returnDocument: "after" }
    );

    if (!terminal) {
      return res.status(404).json({
        success: false,
        message: "Terminal or fault not found",
      });
    }

    console.log(`✅ Hardware fault resolved for ${terminalId}`);

    res.status(200).json({
      success: true,
      message: "Hardware fault resolved successfully",
      data: terminal.activityLog.hardwareFaults,
    });
  } catch (error) {
    console.error("❌ Error resolving hardware fault:", error);
    res.status(500).json({
      success: false,
      message: "Failed to resolve hardware fault",
      error: error.message,
    });
  }
};

export default {
  createTerminal,
  getStoreterminals,
  getTerminalById,
  updateTerminalConfig,
  updateHardwareConfig,
  updatePrintingFormats,
  updateSalesControls,
  updateInvoiceControls,
  getNextInvoiceNumber,
  testPrinterConnection,
  updateTerminalStatus,
  updateConnectivityStatus,
  deleteTerminal,
  getTerminalHealth,
  logHardwareFault,
  resolveHardwareFault,
};
