/**
 * LPO (Local Purchase Order) Controller
 * Handles LPO creation, updates, and number generation
 */

import Lpo from "../../../Models/Lpo.js";
import LpoService from "../services/LpoService.js";
import Company from "../../../Models/Company.js";
import TerminalManagement from "../../../Models/TerminalManagement.js";
import StoreSettings from "../../../Models/StoreSettings.js";
import InventoryTemplate from "../../../Models/InventoryTemplate.js";
import { generateLpoHtml } from "../../../utils/LpoPdfRenderer.js";
import PdfGenerationService from "../../../services/PdfGenerationService.js";
import logger from "../../../config/logger.js";

// ✅ NEW: Get next LPO number using sequence table (FIFO method)
export const getNextLpoNumber = async (req, res) => {
  try {
    const { financialYear } = req.query;

    if (!financialYear) {
      return res.status(400).json({
        message: "Financial year is required",
      });
    }

    const lpoNumber = await LpoService.generateLPONumber(financialYear);

    res.status(200).json({
      lpoNumber: lpoNumber,
      financialYear: financialYear,
    });
  } catch (error) {
    logger.error("Error generating LPO number:", error);
    res.status(500).json({
      message: "Failed to generate LPO number",
      error: error.message,
    });
  }
};

// Get all LPOs
export const getAllLpos = async (req, res) => {
  try {
    const lpos = await Lpo.find()
      .populate("vendorId", "name vendorName")
      .sort({ lpoDate: -1 });

    res.status(200).json(lpos);
  } catch (error) {
    logger.error("Error fetching LPOs:", error);
    res.status(500).json({
      message: "Failed to fetch LPOs",
      error: error.message,
    });
  }
};

// Get LPO by ID
export const getLpoById = async (req, res) => {
  try {
    const { id } = req.params;
    const lpo = await Lpo.findById(id).populate("vendorId");

    if (!lpo) {
      return res.status(404).json({ message: "LPO not found" });
    }

    res.status(200).json(lpo);
  } catch (error) {
    logger.error("Error fetching LPO:", error);
    res.status(500).json({
      message: "Failed to fetch LPO",
      error: error.message,
    });
  }
};

// Create new LPO
export const createLpo = async (req, res) => {
  try {
    const lpoData = req.body;

    // ✅ Validate items
    await LpoService.validateLPOItems(lpoData.items);

    // ✅ Calculate totals
    const totals = LpoService.calculateLPOTotals(lpoData.items);

    // Create LPO with totals
    const lpo = new Lpo({
      ...lpoData,
      ...totals,
    });

    await lpo.save();

    res.status(201).json({
      message: "LPO created successfully",
      lpo,
    });
  } catch (error) {
    logger.error("Error creating LPO:", error);
    res.status(error.status || 500).json({
      message: error.message || "Failed to create LPO",
      error: error.message,
    });
  }
};

// Update LPO
export const updateLpo = async (req, res) => {
  try {
    const { id } = req.params;
    const lpoData = req.body;

    // ✅ Validate items if updating items
    if (lpoData.items) {
      await LpoService.validateLPOItems(lpoData.items);
      const totals = LpoService.calculateLPOTotals(lpoData.items);
      lpoData.totalAmount = totals.totalAmount;
      lpoData.totalTax = totals.totalTax;
      lpoData.netTotal = totals.netTotal;
    }

    const lpo = await Lpo.findByIdAndUpdate(id, lpoData, {
      new: true,
      runValidators: true,
    });

    if (!lpo) {
      return res.status(404).json({ message: "LPO not found" });
    }

    res.status(200).json({
      message: "LPO updated successfully",
      lpo,
    });
  } catch (error) {
    logger.error("Error updating LPO:", error);
    res.status(error.status || 500).json({
      message: error.message || "Failed to update LPO",
      error: error.message,
    });
  }
};

// Delete LPO
export const deleteLpo = async (req, res) => {
  try {
    const { id } = req.params;

    const lpo = await Lpo.findByIdAndDelete(id);

    if (!lpo) {
      return res.status(404).json({ message: "LPO not found" });
    }

    res.status(200).json({
      message: "LPO deleted successfully",
      lpo,
    });
  } catch (error) {
    logger.error("Error deleting LPO:", error);
    res.status(500).json({
      message: "Failed to delete LPO",
      error: error.message,
    });
  }
};

// ✅ NEW: Get LPO as HTML for printing/PDF (using store-mapped template)
export const getLpoHtml = async (req, res) => {
  try {
    const { id } = req.params;
    const terminalId = req.headers["terminal-id"] || req.headers.terminalId;

    console.log(`📄 [LPO HTML] Generating HTML for LPO: ${id}, terminalId: ${terminalId}`);

    // Fetch LPO
    const lpo = await Lpo.findById(id).populate("vendorId");
    if (!lpo) {
      return res.status(404).json({ message: "LPO not found" });
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

          // ✅ Get LPO template ID from store settings
          const templateId = storeSettings?.templateMappings?.lpo?.templateId;
          if (templateId) {
            console.log(`📋 [LPO HTML] Fetching template ID: ${templateId}`);
            template = await InventoryTemplate.findById(templateId);
            if (template) {
              console.log(`✅ [LPO HTML] Template found: ${template.templateName}`);
            } else {
              console.warn(`⚠️ [LPO HTML] Template not found, will use default`);
            }
          } else {
            console.log(`📋 [LPO HTML] No template mapping found in store settings, using default`);
          }
        }
      } catch (err) {
        logger.warn("Error fetching store details:", err.message);
      }
    }

    // ✅ If template found, use Handlebars rendering; otherwise use hardcoded HTML
    let html;
    if (template?.htmlContent) {
      console.log(`📝 [LPO HTML] Using store-mapped template: ${template.templateName}`);
      
      // Prepare LPO data for Handlebars
      const lpoData = {
        lpo: {
          lpoNumber: lpo.lpoNumber || 'N/A',
          lpoDate: new Date(lpo.lpoDate).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          }),
          vendorName: lpo.vendorId?.name || lpo.vendorId?.vendorName || 'N/A',
          vendorCode: lpo.vendorId?.vendorCode || '',
          vendorPhone: lpo.vendorId?.phone || '',
          vendorEmail: lpo.vendorId?.email || '',
          items: (lpo.items || []).map((item, idx) => ({
            slNo: idx + 1,
            itemcode: item.itemCode || '',
            itemName: item.productName || item.itemName || '',
            quantity: item.qty || 0,
            unit: item.unit || 'PCS',
            unitPrice: item.cost || 0,
            total: (item.qty || 0) * (item.cost || 0)
          })),
          subtotal: lpo.totalAmount || 0,
          taxAmount: lpo.totalTax || 0,
          totalAmount: lpo.netTotal || lpo.totalAmount || 0,
          notes: lpo.notes || ''
        },
        store: storeDetails,
        company: {
          companyName: company?.name || 'Company',
          currencySymbol: company?.currencySymbol || '$',
          decimalPlaces: company?.decimalPlaces || 2
        }
      };

      html = PdfGenerationService.renderTemplate(template.htmlContent, template.cssContent || '', lpoData);
    } else {
      console.log(`📝 [LPO HTML] Using default hardcoded template`);
      html = generateLpoHtml(lpo.toObject(), company?.toObject(), storeDetails);
    }

    console.log(`✅ [LPO HTML] Generated HTML length: ${html?.length}`);

    res.status(200)
      .contentType("text/html; charset=utf-8")
      .send(html);
  } catch (error) {
    logger.error("Error generating LPO HTML:", error);
    res.status(500).json({
      message: "Failed to generate LPO HTML",
      error: error.message
    });
  }
};
