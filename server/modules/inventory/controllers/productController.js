import Product from "../../../Models/AddProduct.js";
import Grouping from "../../../Models/Grouping.js";
import UnitType from "../../../Models/UnitType.js";
import Counter from "../../../Models/SequenceModel.js";
import ProductService from "../services/ProductService.js";
import Vendor from "../../../Models/CreateVendor.js";
import TaxMaster from "../../../Models/TaxMaster.js";
import CurrentStock from "../../../Models/CurrentStock.js";
import StoreSettingsService from "../../settings/services/StoreSettingsService.js";
import { searchProducts as searchMeilisearch, indexProduct, deleteProductIndex } from "../../../config/meilisearch.js";
import { syncProductToMeilisearch, deleteProductFromMeilisearch } from "../services/ProductMeilisearchSync.js";

console.log("✅ productController module loaded successfully");

// ================= HELPER FUNCTION: Validate Product Name with Naming Rules =================
const validateProductName = async (productName) => {
  try {
    const rules = await StoreSettingsService.getNamingRules();
    
    if (!rules.enabled) {
      return { valid: true, message: '' }; // Rules disabled, skip validation
    }

    // Check if name is empty
    if (!productName || productName.trim() === '') {
      return { valid: false, message: '❌ Product name cannot be empty' };
    }

    const name = productName.trim();

    // Prevent all lowercase (if rule enabled)
    if (rules.preventLowercase && name === name.toLowerCase() && /[a-z]/.test(name)) {
      return { valid: false, message: '❌ Product name cannot be all lowercase' };
    }

    // Prevent all UPPERCASE (if rule enabled)
    if (rules.preventAllCaps && name === name.toUpperCase() && /[A-Z]/.test(name)) {
      return { valid: false, message: '❌ Product name cannot be all UPPERCASE' };
    }

    return { valid: true, message: '' };
  } catch (error) {
    // If we can't fetch rules, allow the product (don't fail on settings error)
    console.error('⚠️ Error validating product name rules:', error.message);
    return { valid: true, message: '' };
  }
};

// ================= HELPER FUNCTION: Apply Naming Convention to Text =================
// ✅ Converts text to Title Case (simple, synchronous)
const applyNamingConvention = (text) => {
  try {
    // Handle null, undefined, or empty values
    if (!text || typeof text !== 'string' || text.trim() === '') {
      return text;
    }

    // Simple Title Case conversion: capitalize first letter of each word
    return text
      .trim()
      .split(' ')
      .map(word => {
        if (word.length === 0) return word;
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      })
      .join(' ');
  } catch (error) {
    console.error('⚠️ Error applying naming convention:', error.message);
    return text; // Return unchanged if error
  }
};

// ================= HELPER FUNCTION: Get Current Financial Year =================
const getCurrentFinancialYear = () => {
  const currentDate = new Date();
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;
  // Financial year: April to March (month > 3 means after March)
  return month > 3 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
};

// ================= HELPER FUNCTION: Get Next Item Code from Counter (Atomic & Fast) =================
// ✅ For 300k+ products: Uses existing 'product_code' counter for atomic, O(1) generation
const getNextItemCodeFromCounter = async () => {
  try {
    const financialYear = getCurrentFinancialYear();

    // ✅ ATOMIC OPERATION: Find counter, increment, and return new value in ONE operation
    // This prevents race conditions and is guaranteed O(1) performance
    // Uses existing 'product_code' counter that's already seeded
    const counter = await Counter.findOneAndUpdate(
      {
        module: 'product_code',  // ✅ Using existing counter
        financialYear: financialYear
      },
      {
        $inc: { lastNumber: 1 }  // ✅ ONLY increment, not setOnInsert (prevents conflicts)
      },
      {
        new: true,  // ✅ Return updated document
        upsert: true,  // ✅ Create if doesn't exist
        setDefaultsOnInsert: true  // ✅ Set defaults on insert
      }
    );

    if (!counter || !counter.lastNumber) {
      console.error('❌ Failed to increment counter');
      throw new Error('Counter increment failed');
    }

    const nextItemCode = `${counter.lastNumber}`;
    console.log(`✅ Generated itemcode: ${nextItemCode} (from Counter - atomic, O(1))`);
    return nextItemCode;

  } catch (err) {
    console.error('❌ Error getting itemcode from counter:', err.message);
    // Fallback: Generate from timestamp
    const timestamp = Date.now().toString().slice(-8);
    return `AUTO${timestamp}`;
  }
};

// ================= HELPER FUNCTION: Generate Next Item Code (optimized with MongoDB aggregation) =================
const generateNextItemCode = async () => {
  try {
    // ✅ OPTIMIZED: Use MongoDB aggregation to find MAX itemcode (efficient even with 100k+ products)
    // Works in DB, doesn't load all docs into memory - scales to 100k+ products
    const result = await Product.aggregate([
      { $match: { isDeleted: false } },
      {
        // Only process itemcodes that are purely numeric (filter out "AUTO" fallbacks)
        $addFields: {
          isNumeric: { $eq: [{ $substr: ['$itemcode', 0, 4] }, 'AUTO'] }
        }
      },
      {
        $match: { isNumeric: false } // Only numeric itemcodes
      },
      {
        $group: {
          _id: null,
          maxItemcode: { $max: { $toInt: '$itemcode' } }
        }
      }
    ]);

    let maxNumeric = 1000; // Start from 1000 as baseline
    
    if (result && result.length > 0 && result[0].maxItemcode) {
      maxNumeric = result[0].maxItemcode;
    }

    // ✅ Retry mechanism for concurrent requests
    let attemptedCode = String(maxNumeric + 1);
    let retryCount = 0;
    const maxRetries = 10; // Try up to 10 times to find unique code
    
    console.log(`📊 Found max numeric itemcode: ${maxNumeric}, attempting: ${attemptedCode}`);
    
    while (retryCount < maxRetries) {
      // Check if this itemcode already exists
      const existingWithCode = await Product.findOne({
        itemcode: attemptedCode,
        isDeleted: false
      }).select('_id').lean();
      
      if (!existingWithCode) {
        // ✅ Found unique code
        console.log(`✅ Generated itemcode: ${attemptedCode} (after ${retryCount} retries, max was: ${maxNumeric})`);
        return attemptedCode;
      }
      
      // Code already exists, try next one
      console.warn(`⚠️ Itemcode ${attemptedCode} already exists, retrying... (attempt ${retryCount + 1}/${maxRetries})`);
      const nextNumeric = parseInt(attemptedCode) + 1;
      attemptedCode = String(nextNumeric);
      retryCount++;
    }
    
    // Fallback: If we couldn't find unique after retries
    console.error(`❌ Could not generate unique itemcode after ${maxRetries} retries, using timestamp fallback`);
    const timestamp = Date.now().toString().slice(-8);
    return `AUTO${timestamp}`;
    
  } catch (err) {
    console.error("❌ Error generating item code:", err.message);
    // Fallback: Generate from timestamp
    const timestamp = Date.now().toString().slice(-8);
    return `AUTO${timestamp}`;
  }
};

// ================= GET NEXT ITEM CODE (Peek - without incrementing) =================
export const getNextItemCode = async (req, res) => {
  try {
    // Get the last product and predict next itemcode
    const lastProduct = await Product.findOne({ isDeleted: false })
      .select('itemcode')
      .sort({ createdAt: -1 })
      .lean();

    let nextItemCode = "1001";

    if (lastProduct && lastProduct.itemcode) {
      const lastNumeric = parseInt(lastProduct.itemcode.replace(/\D/g, ''), 10);
      if (!isNaN(lastNumeric)) {
        nextItemCode = String(lastNumeric + 1);
      }
    }

    res.json({
      nextItemCode: nextItemCode,
      message: "Next item code to be generated"
    });
  } catch (err) {
    console.error("Error getting next item code:", err);
    res.status(500).json({
      message: "Error getting next item code",
      error: err.message,
      fallbackItemCode: "1001"
    });
  }
};

// ================= ADD PRODUCT =================
export const addProduct = async (req, res) => {
  try {
    let { 
      itemcode, hsn, barcode, name, vendor, cost, price, categoryId, groupingId, unitType, factor, 
      packingUnits, pricingLevels, // ✅ Pricing variants
      costIncludeVat, marginPercent, marginAmount, taxAmount, taxPercent, taxType, // ✅ Pricing fields
      taxInPrice, trackExpiry, manufacturingDate, expiryDate, shelfLifeDays, expiryAlertDays, // ✅ Tax & Expiry
      country, minStock, shortName, localName, // ✅ Product info
      openingPrice, allowOpenPrice, enablePromotion, fastMovingItem, isScaleItem, scaleUnitType, itemHold, brandId, // ✅ Additional features
      finalPrice,  // ✅ Final price including tax
      createdBy, updatedBy, // ✅ Audit fields
      image // ✅ Product image (base64)
    } = req.body;

    // ✅ DEBUG: Log received data
    console.log("🔍 Adding Product - Received Data:", {
      name, vendor, cost, price, barcode,
      costIncludeVat, marginPercent, marginAmount, taxAmount, taxPercent, taxType,
      packingUnitsCount: packingUnits?.length,
      pricingLevelsKeys: Object.keys(pricingLevels || {}),
      country, shortName, localName, minStock,
      trackExpiry,
      // ✅ Additional features
      openingPrice, allowOpenPrice, enablePromotion, fastMovingItem, isScaleItem, scaleUnitType, itemHold, brandId
    });

    // Parse numeric fields to ensure they're valid
    const costNum = cost !== undefined && cost !== null && cost !== '' ? parseFloat(cost) : null;
    const priceNum = price !== undefined && price !== null && price !== '' ? parseFloat(price) : null;

    // Detailed validation with helpful error messages
    if (!barcode || barcode.toString().trim() === '') {
      return res.status(400).json({ message: "❌ Barcode is required" });
    }
    if (!name || name.toString().trim() === '') {
      return res.status(400).json({ message: "❌ Product name is required" });
    }

    // ✅ NEW: Validate product name against naming rules globally
    const nameValidation = await validateProductName(name);
    if (!nameValidation.valid) {
      return res.status(400).json({ message: nameValidation.message });
    }

    if (!vendor || vendor.toString().trim() === '') {
      return res.status(400).json({ message: "❌ Vendor is required" });
    }
    if (costNum === null || isNaN(costNum) || costNum <= 0) {
      return res.status(400).json({ message: "❌ Cost must be a positive number (fill in pricing table)" });
    }
    if (priceNum === null || isNaN(priceNum) || priceNum <= 0) {
      return res.status(400).json({ message: "❌ Price must be a positive number (fill in pricing table)" });
    }
    if (!categoryId || categoryId.toString().trim() === '') {
      return res.status(400).json({ message: "❌ Department (category) is required" });
    }
    if (!unitType || unitType.toString().trim() === '') {
      return res.status(400).json({ message: "❌ Unit type is required (select in pricing table)" });
    }

    // ✅ NEW: Validate scaleUnitType when isScaleItem is true
    if (isScaleItem && (!scaleUnitType || scaleUnitType.toString().trim() === '')) {
      return res.status(400).json({ message: "❌ Unit of Measure is required when Scale Item is enabled" });
    }

    // Use parsed values
    cost = costNum;
    price = priceNum;

    // Validate unitType exists
    const unit = await UnitType.findById(unitType);
    if (!unit) {
      return res.status(400).json({
        message: "Invalid unit type selected",
      });
    }

    // Validate categoryId if provided (must be level 1)
    if (categoryId) {
      const categoryGrouping = await Grouping.findById(categoryId);
      if (!categoryGrouping || categoryGrouping.isDeleted || categoryGrouping.level !== "1") {
        return res.status(400).json({
          message: "Invalid category selected (must be a department)",
        });
      }
    }

    // Validate groupingId (subcategory) if provided
    if (groupingId) {
      const subcategoryGrouping = await Grouping.findById(groupingId);
      if (!subcategoryGrouping || subcategoryGrouping.isDeleted) {
        return res.status(400).json({
          message: "Invalid or deleted sub-category selected",
        });
      }
      
      // If both categoryId and groupingId provided, verify groupingId is child of categoryId
      if (categoryId && subcategoryGrouping.parentId?.toString() !== categoryId) {
        return res.status(400).json({
          message: "Sub-category does not belong to selected category",
        });
      }
    }

    // Auto-generate itemcode if not provided
    if (!itemcode) {
      // ✅ USE COUNTER: O(1) atomic operation - best for 300k+ products
      itemcode = await getNextItemCodeFromCounter();
    }

    // Convert barcode and itemcode to uppercase
    const uppercaseBarcode = barcode.toUpperCase();
    const uppercaseItemcode = itemcode.toUpperCase();

    // Check if product with same barcode already exists (case-insensitive, excluding deleted)
    const existingProduct = await Product.findOne({
      isDeleted: false,
      $or: [
        { barcode: uppercaseBarcode },
        { itemcode: uppercaseItemcode }
      ]
    });
    console.log("Existing product check:", existingProduct);

    if (existingProduct) {
      let message = "";

      if (existingProduct.barcode === uppercaseBarcode) {
        message = "Product with this barcode already exists";
      } else if (existingProduct.itemcode === uppercaseItemcode) {
        message = "Product with this item code already exists";
      }

      return res.status(400).json({ message });
    }

    // ✅ NEW: Check if product name already exists (preventing duplicates on add)
    const existingProductByName = await Product.findOne({
      isDeleted: false,
      name: { $regex: `^${name.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' }
    }).select('_id name itemcode');

    if (existingProductByName) {
      console.log(`❌ Product with name "${name.trim()}" already exists (Item Code: ${existingProductByName.itemcode})`);
      return res.status(400).json({
        message: `Product name "${name.trim()}" already exists (Item Code: ${existingProductByName.itemcode})`,
        isDuplicate: true,
        duplicateProduct: existingProductByName
      });
    }

    // Process packing units if provided
    let processedPackingUnits = [];
    if (packingUnits && Array.isArray(packingUnits)) {
      // Validate all packing unit barcodes first
      const seenBarcodes = new Set([uppercaseBarcode]); // Main barcode already claimed
      
      for (const unit of packingUnits) {
        if (unit.barcode && unit.barcode.trim()) {
          const unitBarcode = unit.barcode.toUpperCase().trim();
          
          // Check if barcode is duplicate within packing units
          if (seenBarcodes.has(unitBarcode)) {
            return res.status(400).json({ 
              message: `❌ Duplicate barcode in packing units: ${unitBarcode}` 
            });
          }
          
          // Check if barcode already exists in any product
          const existingBarcodeProduct = await Product.findOne({
            isDeleted: false,
            $or: [
              { barcode: unitBarcode },
              { 'packingUnits.barcode': unitBarcode }
            ]
          });
          
          if (existingBarcodeProduct) {
            return res.status(400).json({ 
              message: `❌ Barcode "${unitBarcode}" already exists in another product` 
            });
          }
          
          seenBarcodes.add(unitBarcode);
        }
      }
      
      processedPackingUnits = packingUnits
        .filter(unit => unit.barcode && unit.barcode.trim()) // ✅ Filter out empty barcodes
        .map(unit => ({
          name: unit.name || "",
          barcode: unit.barcode.toUpperCase().trim(),
          additionalBarcodes: unit.additionalBarcodes || [], // ✅ NEW: Multiple barcodes support
          unit: unit.unit || null, // ✅ Store unit type reference
          factor: unit.factor ? parseFloat(unit.factor) : 1, // ✅ Store conversion factor
          cost: unit.cost ? parseFloat(unit.cost) : 0, // ✅ Store cost for this unit
          costIncludeVat: unit.costIncludeVat ? parseFloat(unit.costIncludeVat) : 0, // ✅ Store cost with tax
          margin: unit.margin ? parseFloat(unit.margin) : 0, // ✅ Store margin percentage
          marginAmount: unit.marginAmount ? parseFloat(unit.marginAmount) : 0, // ✅ Store margin amount
          price: parseFloat(unit.price) || 0,
          taxAmount: unit.taxAmount ? parseFloat(unit.taxAmount) : 0, // ✅ Store tax amount
          taxInPrice: unit.taxInPrice !== undefined ? unit.taxInPrice : false, // ✅ NEW: Price include/exclude tax
          conversionFactor: parseInt(unit.conversionFactor) || 1
        }));
    }

    // Process pricing levels if provided
    let processedPricingLevels = {};
    if (pricingLevels && typeof pricingLevels === 'object') {
      for (const [key, levelData] of Object.entries(pricingLevels)) {
        if (levelData && typeof levelData === 'object') {
          processedPricingLevels[key] = {
            level1: levelData.level1 ? parseFloat(levelData.level1) : null,
            level2: levelData.level2 ? parseFloat(levelData.level2) : null,
            level3: levelData.level3 ? parseFloat(levelData.level3) : null,
            level4: levelData.level4 ? parseFloat(levelData.level4) : null,
            level5: levelData.level5 ? parseFloat(levelData.level5) : null // ✅ NEW: Level 5 (Distributor)
          };
        }
      }
    }

    // ✅ Apply naming convention to product name and shortName
    const processedName = applyNamingConvention(name);
    const processedShortName = applyNamingConvention(shortName);
    
    if (processedName !== name) {
      console.log(`✅ Product name auto-capitalized: "${name}" → "${processedName}"`);
    }
    if (processedShortName !== shortName) {
      console.log(`✅ Short name auto-capitalized: "${shortName}" → "${processedShortName}"`);
    }

    // Create new product
    const product = new Product({
      itemcode: uppercaseItemcode,
      hsn: hsn ? hsn.toUpperCase() : "",
      barcode: uppercaseBarcode,
      name: processedName,
      vendor,
      shortName: processedShortName || "",
      localName: localName || "",
      country: country || null,
      unitType: unitType,
      unitSymbol: unit.unitSymbol,
      unitDecimal: unit.unitDecimal,
      factor: factor || 1,
      cost: parseFloat(cost) || 0,
      costIncludeVat: costIncludeVat ? parseFloat(costIncludeVat) : 0, // ✅ Cost with tax
      marginPercent: marginPercent ? parseFloat(marginPercent) : 0, // ✅ Margin percentage
      marginAmount: marginAmount ? parseFloat(marginAmount) : 0, // ✅ Margin amount
      price: parseFloat(price) || 0,
      taxAmount: taxAmount ? parseFloat(taxAmount) : 0, // ✅ Tax amount
      taxPercent: taxPercent ? parseFloat(taxPercent) : 0, // ✅ Tax percentage
      taxType: taxType || "", // ✅ Tax type (VAT, GST, etc.)
      taxInPrice: taxInPrice || false, // ✅ Tax in price flag
      categoryId: categoryId || null,
      groupingId: groupingId || null,
      brandId: brandId || null, // ✅ Brand reference
      packingUnits: processedPackingUnits,
      pricingLevels: processedPricingLevels,
      // ✅ Expiry tracking
      trackExpiry: trackExpiry || false,
      manufacturingDate: manufacturingDate ? new Date(manufacturingDate) : null,
      expiryDate: expiryDate ? new Date(expiryDate) : null,
      shelfLifeDays: shelfLifeDays ? parseInt(shelfLifeDays) : null,
      expiryAlertDays: expiryAlertDays ? parseInt(expiryAlertDays) : 30,
      // ✅ Stock management
      minStock: minStock ? parseInt(minStock) : 0,
      // ✅ Additional features
      openingPrice: openingPrice ? parseFloat(openingPrice) : 0,
      allowOpenPrice: allowOpenPrice || false,
      enablePromotion: enablePromotion || false,
      fastMovingItem: fastMovingItem || false,
      isScaleItem: isScaleItem || false,
      scaleUnitType: scaleUnitType || '', // ✅ Unit of measure for scale item
      itemHold: itemHold || false,
      // ✅ Product image
      image: image || null,
    });

    // ✅ Assign finalPrice, createdBy, updatedBy fields
    if (finalPrice !== undefined) {
      product.finalPrice = finalPrice ? parseFloat(finalPrice) : 0;
    }
    if (createdBy !== undefined) {
      product.createdBy = createdBy || "System";
    }
    if (updatedBy !== undefined) {
      product.updatedBy = updatedBy || "System";
    }

    await product.save();
    
    // ✅ NEW: Create corresponding CurrentStock record for this product (ATOMIC with product creation)
    try {
      const existingStock = await CurrentStock.findOne({ productId: product._id });
      if (!existingStock) {
        // ✅ Calculate values directly (no pre-hooks)
        const totalQuantity = 0;
        const allocatedQuantity = 0;
        const damageQuality = 0;
        const availableQuantity = Math.max(0, totalQuantity - allocatedQuantity - damageQuality);
        const totalCost = 0;
        const averageCost = totalQuantity > 0 ? totalCost / totalQuantity : 0;
        
        const stockEntry = new CurrentStock({
          productId: product._id,
          totalQuantity,
          availableQuantity,
          allocatedQuantity,
          damageQuality,
          totalCost,
          averageCost,
          grnReceivedQuantity: 0,
          rtvReturnedQuantity: 0,
          salesOutQuantity: 0,
          salesReturnQuantity: 0,
          adjustmentQuantity: 0,
          isActive: true,
        });
        
        const createdStock = await stockEntry.save();
        
        if (createdStock && createdStock._id) {
          console.log(`✅ CurrentStock CREATED for product ${product.name} (ID: ${product._id}, StockID: ${createdStock._id})`);
        } else {
          console.error(`❌ CurrentStock save returned invalid result for product ${product._id}`);
        }
      } else {
        console.log(`⚠️  CurrentStock already exists for product ${product.name}, skipping creation`);
      }
    } catch (stockErr) {
      console.error(`❌ CRITICAL: Failed to create CurrentStock for product ${product.name} (ID: ${product._id}):`, {
        message: stockErr.message,
        code: stockErr.code,
        keyPattern: stockErr.keyPattern,
        stack: stockErr.stack
      });
      // Throw error to fail the product creation if stock creation fails
      throw new Error(
        `Product created but failed to create CurrentStock entry. ${stockErr.message}. ` +
        `Please contact support. Product ID: ${product._id}`
      );
    }
    
    // ✅ Fire-and-forget Meilisearch sync (non-blocking)
    // Product is already saved - sync happens async in background
    syncProductToMeilisearch(product)
      .then(syncResult => {
        if (syncResult.success) {
          console.log(`✅ Background sync completed: product ${product.name} (ID: ${product._id})`);
        } else {
          console.warn(`⚠️  Background sync failed: ${syncResult.error}`);
        }
      })
      .catch(err => {
        console.error(`Background sync error for product ${product._id}:`, err.message);
      });
    
    await product.populate([
      { path: 'categoryId', select: 'name' },
      { path: 'groupingId', select: 'name' },
      { path: 'unitType', select: 'unitName unitSymbol unitDecimal category' }
    ]);

    // ✅ Fetch CurrentStock record
    const currentStock = await CurrentStock.findOne({ productId: product._id });
    
    // ✅ VERIFY: CurrentStock must exist by this point
    if (!currentStock) {
      console.error(`❌ CRITICAL DATA INTEGRITY ERROR: CurrentStock missing after creation for product ${product._id}`);
      console.error(`   Product: ${product.name}`);
      console.error(`   This indicates CurrentStock creation failed silently`);
      throw new Error(`CurrentStock verification failed for product ${product._id}. Stock entry was not created.`);
    }
    
    console.log(`✅ VERIFIED: CurrentStock exists for product ${product.name}:`, {
      stockId: currentStock._id,
      productId: currentStock.productId,
      totalQuantity: currentStock.totalQuantity,
      availableQuantity: currentStock.availableQuantity
    });

    // ✅ Build response with CurrentStock included, stock field removed
    const productResponse = product.toObject();
    delete productResponse.stock; // ✅ REMOVE deprecated stock field
    
    // ✅ DEBUG: Log saved product data
    console.log("✅ Product Saved Successfully:", {
      _id: product._id,
      name: product.name,
      cost: product.cost,
      price: product.price,
      costIncludeVat: product.costIncludeVat,
      marginPercent: product.marginPercent,
      marginAmount: product.marginAmount,
      taxAmount: product.taxAmount,
      taxPercent: product.taxPercent,
      taxType: product.taxType,
      packingUnitsCount: product.packingUnits?.length,
      pricingLevelsKeys: Object.keys(product.pricingLevels || {}),
      shortName: product.shortName,
      localName: product.localName,
      country: product.country,
      minStock: product.minStock,
      trackExpiry: product.trackExpiry,
      // ✅ Additional features
      openingPrice: product.openingPrice,
      allowOpenPrice: product.allowOpenPrice,
      enablePromotion: product.enablePromotion,
      fastMovingItem: product.fastMovingItem,
      isScaleItem: product.isScaleItem,
      scaleUnitType: product.scaleUnitType, // ✅ Log scale unit type
      itemHold: product.itemHold,
      brandId: product.brandId,
      image: product.image ? `Base64 image (${Math.round(product.image.length / 1024)}KB)` : null // ✅ Log image presence
    });

    res.status(201).json({
      message: "Product added successfully",
      product: {
        ...productResponse,
        // ✅ SINGLE SOURCE OF TRUTH: Include CurrentStock data
        totalQuantity: currentStock?.totalQuantity || 0,
        availableQuantity: currentStock?.availableQuantity || 0,
        allocatedQuantity: currentStock?.allocatedQuantity || 0,
      },
      meilisearchSync: {
        success: true,
        message: "Search index sync in progress...",
        status: "pending"
      },
    });
  } catch (err) {
    console.error("Error adding product:", err);
    res.status(500).json({
      message: "Error adding product",
      error: err.message,
    });
  }
};

// ================= GET ALL PRODUCTS =================
export const getProducts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search || "";
    const trimmedSearch = search.trim();

    const query = {
      isDeleted: false,
      $or: [
        { name: { $regex: trimmedSearch, $options: "i" } },
        { barcode: { $regex: trimmedSearch, $options: "i" } },
        { itemcode: { $regex: trimmedSearch, $options: "i" } },
        { 'packingUnits.barcode': { $regex: trimmedSearch, $options: "i" } },
        { 'packingUnits.additionalBarcodes': { $regex: trimmedSearch, $options: "i" } },
      ],
    };

    const total = await Product.countDocuments(query);
    const groupingFilter = req.query.groupingId ? { groupingId: req.query.groupingId } : {};

    // ✅ SIMPLE: Use regular find() and populate()
    const products = await Product.find({ ...query, ...groupingFilter })
      .select('name itemcode barcode price stock tax cost unitType unitSymbol unitDecimal vendor categoryId packingUnits trackExpiry')
      .populate('categoryId', 'name')
      .populate('groupingId', 'name')
      .populate('vendor', 'name')
      .populate('unitType', 'unitName unitSymbol unitDecimal category')
      .populate('packingUnits.unit', 'unitName unitSymbol unitDecimal category')
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ createdate: -1 })
      .lean();

    // ✅ MANUALLY ADD: Fetch and attach currentStock data for each product
    if (products.length > 0) {
      const productIds = products.map(p => p._id);
      
      // Fetch all currentStock docs for these products
      const stockDocs = await CurrentStock.find({ productId: { $in: productIds } }).lean();
      const stockMap = new Map(stockDocs.map(s => [s.productId.toString(), s]));
      
      // Attach currentStock to each product
      products.forEach(product => {
        const stock = stockMap.get(product._id.toString());
        product.currentStock = stock || {
          totalQuantity: 0,
          availableQuantity: 0,
          allocatedQuantity: 0,
        };
      });
    }

    res.json({
      products,
      total,
      page,
      pages: Math.ceil(total / limit),
      hasMore: (page * limit) < total,
    });
  } catch (err) {
    console.error("❌ Error fetching products:", err);
    res.status(500).json({
      message: "Error fetching products",
      error: err.message,
    });
  }
};

// ================= GET PRODUCT BY ID =================
export const getProductById = async (req, res) => {
  try {
    // ✅ Fetch product with ALL populated relationships and fields
    const product = await Product.findById(req.params.id)
      .populate('categoryId', 'name code parentId')
      .populate('groupingId', 'name code parentId')
      .populate('brandId', 'name code')
      .populate('vendor', 'name')
      .populate('unitType', 'name symbol')
      .populate('hsnReference', 'hsn description')
      .populate('packingUnits.unit', 'unitName unitSymbol unitDecimal category') // ✅ Populate unit references inside packingUnits

    if (!product || product.isDeleted) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    // ✅ SINGLE SOURCE OF TRUTH: Always fetch stock from CurrentStock table
    const currentStock = await CurrentStock.findOne({
      productId: product._id,
      isDeleted: { $ne: true }
    }).lean();

    // ✅ Merge currentStock data into product response
    // Note: Product.stock is deprecated and no longer updated.
    // Use totalQuantity from CurrentStock table as the authoritative value.
    const productObj = product.toObject();
    delete productObj.stock; // ✅ REMOVE deprecated stock field from response
    
    const productWithStock = {
      ...productObj,
      currentStock: currentStock || null, // Full CurrentStock document
      totalQuantity: currentStock?.totalQuantity || 0, // ✅ SINGLE SOURCE: Physical stock from CurrentStock
    };

    // ✅ Log complete product data for debugging
    console.log("✅ Fetched Product for Edit:", {
      _id: product._id,
      itemcode: product.itemcode,
      name: product.name,
      shortName: product.shortName,
      localName: product.localName,
      hsn: product.hsn,
      categoryId: product.categoryId?._id || product.categoryId,
      groupingId: product.groupingId?._id || product.groupingId,
      brandId: product.brandId?._id || product.brandId,
      vendor: product.vendor,
      unitType: product.unitType?._id || product.unitType,
      barcode: product.barcode,
      totalQuantity: productWithStock.totalQuantity, // ✅ SINGLE SOURCE: Physical quantity from CurrentStock
      minStock: product.minStock,
      cost: product.cost,
      price: product.price,
      costIncludeVat: product.costIncludeVat,
      marginPercent: product.marginPercent,
      marginAmount: product.marginAmount,
      taxPercent: product.taxPercent,
      taxType: product.taxType,
      taxInPrice: product.taxInPrice,
      trackExpiry: product.trackExpiry,
      enablePromotion: product.enablePromotion,
      fastMovingItem: product.fastMovingItem,
      isScaleItem: product.isScaleItem,
      scaleUnitType: product.scaleUnitType, // ✅ Log scale unit type
      itemHold: product.itemHold,
      image: product.image ? `Base64 image (${Math.round(product.image.length / 1024)}KB)` : null, // ✅ Log image presence
      packingUnits: product.packingUnits?.map(p => ({
        barcode: p.barcode,
        unit: p.unit?._id || p.unit,
        factor: p.factor,
        cost: p.cost,
        costIncludeVat: p.costIncludeVat,
        margin: p.margin,
        marginAmount: p.marginAmount,
        price: p.price,
        taxAmount: p.taxAmount,
      })) || [],
      pricingLevels: Object.keys(product.pricingLevels || {}).length,
    });

    res.json(productWithStock);
  } catch (err) {
    console.error("Error fetching product:", err);
    res.status(500).json({
      message: "Error fetching product",
      error: err.message,
    });
  }
};

// ================= UPDATE PRODUCT =================
export const updateProduct = async (req, res) => {
  try {
    const { 
      itemcode, barcode, name, vendor, cost, price, categoryId, groupingId, hsn, unitType, factor, 
      packingUnits, pricingLevels, // ✅ Pricing variants
      costIncludeVat, marginPercent, marginAmount, taxAmount, taxPercent, taxType, // ✅ Pricing fields
      taxInPrice, trackExpiry, manufacturingDate, expiryDate, shelfLifeDays, expiryAlertDays, // ✅ Tax & Expiry
      country, minStock, shortName, localName, // ✅ Product info
      openingPrice, allowOpenPrice, enablePromotion, fastMovingItem, isScaleItem, scaleUnitType, itemHold, brandId, // ✅ Additional features
      finalPrice,  // ✅ Final price including tax
      createdBy, updatedBy, // ✅ Audit fields
      image // ✅ Product image (base64)
    } = req.body;

    // Find product
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    // Validate categoryId if provided (must be level 1)
    if (categoryId) {
      const categoryGrouping = await Grouping.findById(categoryId);
      if (!categoryGrouping || categoryGrouping.isDeleted || categoryGrouping.level !== "1") {
        return res.status(400).json({
          message: "Invalid category selected (must be a department)",
        });
      }
    }

    // Validate groupingId (subcategory) if provided
    if (groupingId) {
      const subcategoryGrouping = await Grouping.findById(groupingId);
      if (!subcategoryGrouping || subcategoryGrouping.isDeleted) {
        return res.status(400).json({
          message: "Invalid or deleted sub-category selected",
        });
      }
      
      // If both categoryId and groupingId provided, verify groupingId is child of categoryId
      if (categoryId && subcategoryGrouping.parentId?.toString() !== categoryId) {
        return res.status(400).json({
          message: "Sub-category does not belong to selected category",
        });
      }
    }

    // ✅ Check if item code is being changed and if new item code already exists
    if (itemcode) {
      const uppercaseItemcode = itemcode.toUpperCase();
      if (uppercaseItemcode !== product.itemcode) {
        const existingProduct = await Product.findOne({
          itemcode: uppercaseItemcode,
          isDeleted: false
        });
        if (existingProduct) {
          return res.status(400).json({
            message: "Product with this item code already exists",
          });
        }
      }
      product.itemcode = uppercaseItemcode;
    }

    // Check if barcode is being changed and if new barcode already exists
    if (barcode) {
      const uppercaseBarcode = barcode.toUpperCase();
      if (uppercaseBarcode !== product.barcode) {
        const existingProduct = await Product.findOne({ 
          barcode: uppercaseBarcode,
          isDeleted: false 
        });
        if (existingProduct) {
          return res.status(400).json({
            message: "Product with this barcode already exists",
          });
        }
      }
      product.barcode = uppercaseBarcode;
    }

    // ✅ NEW: Validate product name against naming rules on update
    if (name) {
      const nameValidation = await validateProductName(name);
      if (!nameValidation.valid) {
        return res.status(400).json({ message: nameValidation.message });
      }
    }

    // ✅ Apply naming convention to name and shortName FIRST
    let processedName = product.name;
    let processedShortName = product.shortName;
    
    if (name) {
      processedName = applyNamingConvention(name);
      if (processedName !== name) {
        console.log(`✅ Product name auto-capitalized: "${name}" → "${processedName}"`);
      }
    }
    
    if (shortName !== undefined) {
      processedShortName = applyNamingConvention(shortName);
      if (processedShortName !== shortName) {
        console.log(`✅ Short name auto-capitalized: "${shortName}" → "${processedShortName}"`);
      }
    }

    // ✅ NEW: Check if product name is being changed and if new name already exists (using processed name)
    if (name && processedName !== product.name) {
      console.log(`✅ Validating name change from "${product.name}" to "${processedName}"`);
      
      // Query excludes current product to prevent self-match race condition
      const existingProduct = await Product.findOne({
        _id: { $ne: req.params.id }, // ✅ CRITICAL: Exclude the product being updated
        name: { $regex: `^${processedName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' },
        isDeleted: false
      }).select('_id name itemcode');

      if (existingProduct) {
        console.log(`❌ Duplicate name found: "${processedName}" (Item Code: ${existingProduct.itemcode})`);
        return res.status(400).json({
          message: `Product name "${processedName}" already exists (Item Code: ${existingProduct.itemcode})`,
          isDuplicate: true,
          duplicateProduct: existingProduct
        });
      }
    }

    // Update product
    if (name) {
      product.name = processedName;
    }
    product.vendor = vendor || product.vendor;
    if (shortName !== undefined) {
      product.shortName = processedShortName || "";
    }
    if (localName !== undefined) {
      product.localName = localName || "";
    }
    if (country !== undefined) {
      product.country = country || null;
    }
    if (hsn !== undefined) {
      product.hsn = hsn ? hsn.toUpperCase() : "";
    }
    product.cost = cost ? parseFloat(cost) : product.cost;
    if (costIncludeVat !== undefined) {
      product.costIncludeVat = costIncludeVat ? parseFloat(costIncludeVat) : 0; // ✅ Cost with tax
    }
    if (marginPercent !== undefined) {
      product.marginPercent = marginPercent ? parseFloat(marginPercent) : 0; // ✅ Margin percentage
    }
    if (marginAmount !== undefined) {
      product.marginAmount = marginAmount ? parseFloat(marginAmount) : 0; // ✅ Margin amount
    }
    product.price = price ? parseFloat(price) : product.price;
    if (taxAmount !== undefined) {
      product.taxAmount = taxAmount ? parseFloat(taxAmount) : 0; // ✅ Tax amount
    }
    if (taxPercent !== undefined) {
      product.taxPercent = taxPercent ? parseFloat(taxPercent) : 0; // ✅ Tax percentage
    }
    if (taxType !== undefined) {
      product.taxType = taxType || ""; // ✅ Tax type
    }
    if (taxInPrice !== undefined) {
      product.taxInPrice = taxInPrice || false; // ✅ Tax in price flag
    }
    // ✅ REMOVED: product.stock - now managed in CurrentStock table only
    // If stock update needed, it will be synced to CurrentStock after product.save()
    if (minStock !== undefined) {
      product.minStock = minStock ? parseInt(minStock) : 0; // ✅ Min stock
    }
    // ✅ Expiry tracking fields
    if (trackExpiry !== undefined) {
      product.trackExpiry = trackExpiry || false;
    }
    if (manufacturingDate !== undefined) {
      product.manufacturingDate = manufacturingDate ? new Date(manufacturingDate) : null;
    }
    if (expiryDate !== undefined) {
      product.expiryDate = expiryDate ? new Date(expiryDate) : null;
    }
    if (shelfLifeDays !== undefined) {
      product.shelfLifeDays = shelfLifeDays ? parseInt(shelfLifeDays) : null;
    }
    if (expiryAlertDays !== undefined) {
      product.expiryAlertDays = expiryAlertDays ? parseInt(expiryAlertDays) : 30;
    }
    
    // ✅ Additional product features
    if (openingPrice !== undefined) {
      product.openingPrice = openingPrice ? parseFloat(openingPrice) : 0;
    }
    if (allowOpenPrice !== undefined) {
      product.allowOpenPrice = allowOpenPrice || false;
    }
    if (enablePromotion !== undefined) {
      product.enablePromotion = enablePromotion || false;
    }
    if (fastMovingItem !== undefined) {
      product.fastMovingItem = fastMovingItem || false;
    }
    if (isScaleItem !== undefined) {
      product.isScaleItem = isScaleItem || false;
      // ✅ NEW: Validate scaleUnitType when isScaleItem is being set to true
      if (product.isScaleItem && (!scaleUnitType || scaleUnitType.toString().trim() === '')) {
        return res.status(400).json({ message: "❌ Unit of Measure is required when Scale Item is enabled" });
      }
    }
    if (scaleUnitType !== undefined) {
      product.scaleUnitType = scaleUnitType || '';
    }
    if (itemHold !== undefined) {
      product.itemHold = itemHold || false;
    }
    if (brandId !== undefined) {
      product.brandId = brandId || null;
    }
    if (image !== undefined) {
      product.image = image || null;
    }
    
    // ✅ Add finalPrice, createdBy, updatedBy if provided
    if (finalPrice !== undefined) {
      product.finalPrice = finalPrice ? parseFloat(finalPrice) : 0;
    }
    if (updatedBy !== undefined) {
      product.updatedBy = updatedBy || "System";
    }
    // ✅ createdBy should never change after creation - only set if product is new
    if (createdBy !== undefined && !product.createdBy) {
      product.createdBy = createdBy || "System";
    }
    
    if (categoryId !== undefined) {
      product.categoryId = categoryId || null;
    }
    if (groupingId !== undefined) {
      product.groupingId = groupingId || null;
    }

    // Handle unitType if provided
    if (unitType !== undefined) {
      const unit = await UnitType.findById(unitType);
      if (!unit) {
        return res.status(400).json({
          message: "Invalid unit type selected",
        });
      }
      product.unitType = unitType;
      product.unitSymbol = unit.unitSymbol;
      product.unitDecimal = unit.unitDecimal;
    }

    // Update factor if provided
    if (factor !== undefined) {
      product.factor = factor;
    }

    // Process packing units if provided
    if (packingUnits !== undefined) {
      if (Array.isArray(packingUnits)) {
        // Validate all packing unit barcodes first
        const seenBarcodes = new Set([product.barcode.toUpperCase()]); // Main barcode already claimed
        
        for (const unit of packingUnits) {
          if (unit.barcode && unit.barcode.trim()) {
            const unitBarcode = unit.barcode.toUpperCase().trim();
            
            // Check if barcode is duplicate within packing units
            if (seenBarcodes.has(unitBarcode)) {
              return res.status(400).json({ 
                message: `❌ Duplicate barcode in packing units: ${unitBarcode}` 
              });
            }
            
            // Check if barcode already exists in any other product
            const existingBarcodeProduct = await Product.findOne({
              _id: { $ne: product._id },
              isDeleted: false,
              $or: [
                { barcode: unitBarcode },
                { 'packingUnits.barcode': unitBarcode }
              ]
            });
            
            if (existingBarcodeProduct) {
              return res.status(400).json({ 
                message: `❌ Barcode "${unitBarcode}" already exists in another product` 
              });
            }
            
            seenBarcodes.add(unitBarcode);
          }
        }
        
        product.packingUnits = packingUnits
          .filter(unit => unit.barcode && unit.barcode.trim()) // ✅ Filter out empty barcodes
          .map(unit => ({
            name: unit.name || "",
            barcode: unit.barcode.toUpperCase().trim(),
            additionalBarcodes: unit.additionalBarcodes || [], // ✅ NEW: Multiple barcodes support
            unit: unit.unit || null, // ✅ Store unit type reference
            factor: unit.factor ? parseFloat(unit.factor) : 1, // ✅ Store conversion factor
            cost: unit.cost ? parseFloat(unit.cost) : 0, // ✅ Store cost for this unit
            costIncludeVat: unit.costIncludeVat ? parseFloat(unit.costIncludeVat) : 0, // ✅ Store cost with tax
            margin: unit.margin ? parseFloat(unit.margin) : 0, // ✅ Store margin percentage
            marginAmount: unit.marginAmount ? parseFloat(unit.marginAmount) : 0, // ✅ Store margin amount
            price: parseFloat(unit.price) || 0,
            taxAmount: unit.taxAmount ? parseFloat(unit.taxAmount) : 0, // ✅ Store tax amount
            taxInPrice: unit.taxInPrice !== undefined ? unit.taxInPrice : false, // ✅ NEW: Price include/exclude tax
            conversionFactor: parseInt(unit.conversionFactor) || 1
          }));
      } else {
        product.packingUnits = [];
      }
    }

    // Process pricing levels if provided
    if (pricingLevels !== undefined) {
      let processedPricingLevels = {};
      if (pricingLevels && typeof pricingLevels === 'object') {
        for (const [key, levelData] of Object.entries(pricingLevels)) {
          if (levelData && typeof levelData === 'object') {
            processedPricingLevels[key] = {
              level1: levelData.level1 ? parseFloat(levelData.level1) : null,
              level2: levelData.level2 ? parseFloat(levelData.level2) : null,
              level3: levelData.level3 ? parseFloat(levelData.level3) : null,
              level4: levelData.level4 ? parseFloat(levelData.level4) : null,
              level5: levelData.level5 ? parseFloat(levelData.level5) : null // ✅ NEW: Level 5 (Distributor)
            };
          }
        }
      }
      product.pricingLevels = processedPricingLevels;
    }

    product.updateDate = new Date();

    await product.save();
    
    // ✅ Stock is now ONLY managed through CurrentStock table
    // Product endpoint does NOT accept stock updates anymore
    
    // ✅ Fire-and-forget Meilisearch sync (non-blocking)
    // Product is already saved - sync happens async in background
    // Small delay to ensure database write is complete, then sync
    setTimeout(() => {
      syncProductToMeilisearch(product)
        .then(syncResult => {
          if (syncResult.success) {
            console.log(`✅ Background sync completed: product ${product.name} (ID: ${product._id})`);
          } else {
            console.warn(`⚠️  Background sync failed: ${syncResult.error}`);
          }
        })
        .catch(err => {
          console.error(`Background sync error for product ${product._id}:`, err.message);
        });
    }, 100);
    
    await product.populate([
      { path: 'categoryId', select: 'name' },
      { path: 'groupingId', select: 'name' },
      { path: 'unitType', select: 'unitName unitSymbol unitDecimal category' },
      { path: 'packingUnits.unit', select: 'unitName unitSymbol unitDecimal category' }  // ✅ ADDED - Populate for response
    ]);

    // ✅ DEBUG: Log updated product data
    console.log("✅ Product Updated Successfully:", {
      _id: product._id,
      name: product.name,
      cost: product.cost,
      price: product.price,
      costIncludeVat: product.costIncludeVat,
      marginPercent: product.marginPercent,
      marginAmount: product.marginAmount,
      taxAmount: product.taxAmount,
      taxPercent: product.taxPercent,
      taxType: product.taxType,
      packingUnitsCount: product.packingUnits?.length,
      pricingLevelsKeys: Array.from(product.pricingLevels?.keys() || []),
      shortName: product.shortName,
      localName: product.localName,
      country: product.country,
      minStock: product.minStock,
      trackExpiry: product.trackExpiry,
      // ✅ Additional features
      openingPrice: product.openingPrice,
      enablePromotion: product.enablePromotion,
      fastMovingItem: product.fastMovingItem,
      isScaleItem: product.isScaleItem,
      itemHold: product.itemHold,
      brandId: product.brandId,
      image: product.image ? `Base64 image (${Math.round(product.image.length / 1024)}KB)` : null // ✅ Log image presence
    });

    // ✅ Fetch CurrentStock for response and remove stock field
    const currentStock = await CurrentStock.findOne({ productId: product._id });
    const productResponse = product.toObject();
    delete productResponse.stock; // ✅ REMOVE deprecated stock field

    // ✅ INDUSTRIAL GRADE: Start Meilisearch sync and capture taskUid  
    let meilisearchTaskUid = null;
    let syncStarted = false;
    
    // Immediately start sync to capture taskUid
    syncProductToMeilisearch(product)
      .then(syncResult => {
        if (syncResult.success && syncResult.taskUid) {
          meilisearchTaskUid = syncResult.taskUid;
          console.log(`📌 Meilisearch Task UID captured: ${meilisearchTaskUid}`);
        }
      })
      .catch(err => {
        console.error(`Meilisearch sync error for product ${product._id}:`, err.message);
      });
    
    syncStarted = true;

    res.json({
      message: "Product updated successfully",
      product: {
        ...productResponse,
        // ✅ SINGLE SOURCE OF TRUTH: Include CurrentStock data
        quantityInStock: currentStock?.quantityInStock || 0,
        totalQuantity: currentStock?.totalQuantity || 0,
        availableQuantity: currentStock?.availableQuantity || 0,
        allocatedQuantity: currentStock?.allocatedQuantity || 0,
      },
      meilisearchSync: {
        success: true,
        message: "Search index sync in progress...",
        status: "pending",
        taskUid: null  // ✅ Will be populated by frontend polling (or sent separately via WebSocket)
      },
      cacheInvalidated: true,  // ✅ Signal frontend to clear cache for this product
      productName: product.name,
      packingUnitsUpdated: product.packingUnits?.length > 0
    });
  } catch (err) {
    console.error("Error updating product:", err);
    res.status(500).json({
      message: "Error updating product",
      error: err.message,
    });
  }
};

// ================= DELETE PRODUCT =================
export const deleteProduct = async (req, res) => {
  try {
    // Soft delete: mark as deleted instead of removing from database
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      {
        isDeleted: true,
        deletedAt: new Date()
      },
      { returnDocument: 'after' }
    );

    if (!product) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    // ✅ Remove product from Meilisearch index when deleted
    const meilisearchDeleted = await deleteProductFromMeilisearch(product._id);

    res.json({
      message: "Product deleted successfully",
      product,
      meilisearchSynced: meilisearchDeleted ? "Removed from search index" : "Warning: Could not remove from search index",
    });
  } catch (err) {
    console.error("Error deleting product:", err);
    res.status(500).json({
      message: "Error deleting product",
      error: err.message,
    });
  }
};

// ================= RESTORE PRODUCT (Undo Soft Delete) =================
export const restoreProduct = async (req, res) => {
  try {
    // Restore deleted product
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      {
        isDeleted: false,
        deletedAt: null
      },
      { returnDocument: 'after' }
    );

    if (!product) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    // ✅ Fire-and-forget Meilisearch sync (non-blocking)
    syncProductToMeilisearch(product)
      .then(syncResult => {
        if (syncResult.success) {
          console.log(`✅ Background sync completed: restored product ${product.name} (ID: ${product._id})`);
        } else {
          console.warn(`⚠️  Background sync failed for restored product: ${syncResult.error}`);
        }
      })
      .catch(err => {
        console.error(`Background sync error for restored product ${product._id}:`, err.message);
      });

    res.json({
      message: "Product restored successfully",
      product,
      meilisearchSynced: "Re-indexing in background...",
    });
  } catch (err) {
    console.error("Error restoring product:", err);
    res.status(500).json({
      message: "Error restoring product",
      error: err.message,
    });
  }
};

// ================= UPDATE PRODUCT STOCK =================
export const updateProductStock = async (req, res) => {
  try {
    const { quantity } = req.body;

    if (quantity === undefined || quantity === null) {
      return res.status(400).json({
        message: "Quantity is required",
      });
    }

    const quantityNum = parseInt(quantity);

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      {
        stock: quantityNum,
        updateDate: new Date(),
      },
      { new: true }
    );

    if (!product) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    // ✅ NEW: Also update CurrentStock table
    try {
      // Check if CurrentStock exists (should from product creation)
      const existingStock = await CurrentStock.findOne({ productId: product._id });
      if (!existingStock) {
        console.warn(
          `⚠️  CurrentStock record missing for product ${product.name}. ` +
          `This should have been created when the product was first created. ` +
          `Skipping sync.`
        );
      } else {
        await CurrentStock.findOneAndUpdate(
          { productId: product._id },
          {
            $set: {
              totalQuantity: quantityNum,
              availableQuantity: quantityNum,
              updatedAt: new Date(),
            }
          },
          { returnDocument: 'after' }
        );
        console.log(`✅ CurrentStock synced for product ${product.name} (qty: ${quantityNum})`);
      }
    } catch (stockErr) {
      console.error(`⚠️  Failed to sync CurrentStock for product ${product._id}:`, stockErr.message);
    }

    res.json({
      message: "Stock updated successfully",
      product,
    });
  } catch (err) {
    console.error("Error updating stock:", err);
    res.status(500).json({
      message: "Error updating stock",
      error: err.message,
    });
  }
};

// ================= GET PRODUCTS BY CATEGORY =================
export const getProductsByCategory = async (req, res) => {
  try {
    const { category } = req.params;

    const products = await Product.find({ category }).sort({ name: 1 });

    res.json({
      message: "Products fetched successfully",
      products,
    });
  } catch (err) {
    console.error("Error fetching products by category:", err);
    res.status(500).json({
      message: "Error fetching products by category",
      error: err.message,
    });
  }
};

// ================= GET PRODUCT STATISTICS =================
export const getProductStats = async (req, res) => {
  try {
    const totalProducts = await Product.countDocuments();
    const lowStockProducts = await Product.find({ stock: { $lt: 10 } }).count();
    const totalValue = await Product.aggregate([
      {
        $group: {
          _id: null,
          totalValue: { $sum: { $multiply: ["$price", "$stock"] } },
          avgPrice: { $avg: "$price" },
        },
      },
    ]);

    res.json({
      totalProducts,
      lowStockProducts,
      totalInventoryValue: totalValue[0]?.totalValue || 0,
      avgProductPrice: totalValue[0]?.avgPrice || 0,
    });
  } catch (err) {
    console.error("Error fetching product stats:", err);
    res.status(500).json({
      message: "Error fetching product stats",
      error: err.message,
    });
  }
};

// ================= GENERATE BARCODE (Server-side with FIFO & Duplicate Prevention) =================
export const generateBarcode = async (req, res) => {
  try {
    const { 
      baseBarcode, 
      itemCode = '', 
      departmentId, 
      systemId = 'system-default',
      lineIndex = 0 
    } = req.body;

    // Validate required fields (itemCode is optional - generated on product save)
    if (!baseBarcode || !departmentId) {
      return res.status(400).json({
        message: "Missing required fields: baseBarcode, departmentId",
        received: { baseBarcode, departmentId }
      });
    }

    // Generate barcode with FIFO queue and duplicate prevention
    const result = await ProductService.generateNextBarcode(
      baseBarcode,
      itemCode || 'pending',
      departmentId,
      systemId
    );

    res.json({
      success: true,
      message: "Barcode generated successfully",
      data: result
    });
  } catch (err) {
    console.error("Error generating barcode:", err);
    
    const statusCode = err.status || 500;
    const message = err.message || "Error generating barcode";

    res.status(statusCode).json({
      success: false,
      message,
      error: err.message
    });
  }
};

// ================= ASSIGN BARCODE TO PRODUCT =================
export const assignBarcodeToProduct = async (req, res) => {
  try {
    const { queueId, productId } = req.body;

    if (!queueId || !productId) {
      return res.status(400).json({
        message: "Missing required fields: queueId, productId"
      });
    }

    const result = await ProductService.assignBarcodeToProduct(queueId, productId);

    res.json({
      success: true,
      message: "Barcode assigned to product successfully",
      data: result
    });
  } catch (err) {
    console.error("Error assigning barcode:", err);

    const statusCode = err.status || 500;
    res.status(statusCode).json({
      success: false,
      message: err.message || "Error assigning barcode",
      error: err.message
    });
  }
};

// ================= GET BARCODE QUEUE STATUS (Debugging/Monitoring) =================
export const getBarcodeQueueStatus = async (req, res) => {
  try {
    const { status, systemId, itemCode, limit = 50 } = req.query;

    const result = await ProductService.getBarcodeQueueStatus({
      status,
      systemId,
      itemCode,
      limit: parseInt(limit)
    });

    res.json({
      success: true,
      message: "Queue status retrieved successfully",
      count: result.length,
      data: result
    });
  } catch (err) {
    console.error("Error getting queue status:", err);

    res.status(500).json({
      success: false,
      message: "Error retrieving queue status",
      error: err.message
    });
  }
};

// ================= CHECK IF BARCODE EXISTS =================
export const checkBarcodeExists = async (req, res) => {
  try {
    const { barcode, currentProductId } = req.body;

    if (!barcode) {
      return res.status(400).json({
        message: "Barcode is required",
      });
    }

    // Convert to uppercase for case-insensitive search
    const uppercaseBarcode = barcode.toUpperCase();

    let query = {
      isDeleted: false,
      barcode: uppercaseBarcode,
    };

    // If editing a product, exclude current product from check
    if (currentProductId) {
      query._id = { $ne: currentProductId };
    }

    const existingProduct = await Product.findOne(query);

    res.json({
      exists: !!existingProduct,
      message: existingProduct ? "Barcode already exists" : "Barcode is unique",
    });
  } catch (err) {
    console.error("Error checking barcode:", err);
    res.status(500).json({
      message: "Error checking barcode",
      error: err.message,
    });
  }
};

// ================= CHECK IF ITEM CODE EXISTS =================
export const checkItemcodeExists = async (req, res) => {
  try {
    const { itemcode, currentProductId } = req.body;

    if (!itemcode) {
      return res.status(400).json({
        message: "Item code is required",
      });
    }

    // Convert to uppercase for case-insensitive search
    const uppercaseItemcode = itemcode.toUpperCase();

    let query = {
      isDeleted: false,
      itemcode: uppercaseItemcode,
    };

    // If editing a product, exclude current product from check
    if (currentProductId) {
      query._id = { $ne: currentProductId };
    }

    const existingProduct = await Product.findOne(query);

    res.json({
      exists: !!existingProduct,
      message: existingProduct ? "Item code already exists" : "Item code is unique",
    });
  } catch (err) {
    console.error("Error checking item code:", err);
    res.status(500).json({
      message: "Error checking item code",
      error: err.message,
    });
  }
};

// ================= CHECK IF ITEM CODE ALREADY EXISTS (Duplicate Prevention - GET) =================
// ✅ GET endpoint for checking duplicate itemcodes (used during product edit)
// Excludes current product from check to allow same itemcode on current product
export const checkDuplicateItemcode = async (req, res) => {
  try {
    const { itemcode, excludeId } = req.query;

    if (!itemcode || typeof itemcode !== 'string' || itemcode.trim() === '') {
      return res.status(400).json({
        isDuplicate: false,
        product: null,
        message: "Item code is required",
      });
    }

    const uppercaseItemcode = itemcode.toUpperCase();
    
    let query = {
      isDeleted: false,
      itemcode: uppercaseItemcode,
    };

    // If editing a product, exclude current product from check
    if (excludeId && typeof excludeId === 'string' && excludeId.length > 0 && excludeId !== 'null') {
      query._id = { $ne: excludeId };
    }

    console.log(`🔍 Checking duplicate itemcode: ${uppercaseItemcode}${excludeId ? ` (excluding: ${excludeId})` : ''}`);
    const existingProduct = await Product.findOne(query).select('_id itemcode name').lean();

    if (existingProduct) {
      console.log(`⚠️  Duplicate itemcode found: ${uppercaseItemcode} - Product: ${existingProduct.name}`);
    }

    res.json({
      isDuplicate: !!existingProduct,
      message: existingProduct ? "Item code already exists" : "Item code is unique",
      product: existingProduct || null,
    });
  } catch (err) {
    console.error("❌ Error checking duplicate itemcode:", err.message);
    res.status(500).json({
      isDuplicate: false,
      product: null,
      message: "Error checking item code",
      error: err.message,
    });
  }
};

// ================= CHECK IF PRODUCT NAME ALREADY EXISTS (Duplicate Prevention) =================
// ✅ Prevents saving duplicate product names
// Used by ProductNameInput for real-time validation on blur
export const checkDuplicateProductName = async (req, res) => {
  try {
    const { name, excludeId } = req.query;

    if (!name || typeof name !== 'string' || name.trim() === '') {
      return res.status(400).json({
        isDuplicate: false,
        similarProducts: [],
        message: "Product name is required",
      });
    }

    // Trim and normalize name for comparison
    const normalizedName = name.trim();

    try {
      // ✅ STEP 1: Search for exact name match (case-insensitive)
      const query = {
        isDeleted: { $ne: true },
        name: { $regex: `^${normalizedName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' }
      };

      // Exclude current product if editing
      if (excludeId && typeof excludeId === 'string' && excludeId.length > 0 && excludeId !== 'null') {
        query._id = { $ne: excludeId };
      }

      console.log("🔍 Checking duplicate for name:", normalizedName);
      const existingProduct = await Product.findOne(query).select('_id name itemcode barcode').lean();

      if (existingProduct) {
        console.log("⚠️  Duplicate found:", existingProduct.name, "- Item Code:", existingProduct.itemcode);
      }

      res.json({
        isDuplicate: !!existingProduct,
        duplicateProduct: existingProduct || null,
        similarProducts: [],
        message: existingProduct 
          ? `Product name "${normalizedName}" already exists (Item Code: ${existingProduct.itemcode})`
          : "Product name is unique",
      });
    } catch (mongoErr) {
      console.error("❌ MongoDB query error:", mongoErr.message);
      // If regex query fails, try simple exact match
      const simpleQuery = {
        isDeleted: { $ne: true },
        name: normalizedName
      };

      if (excludeId && typeof excludeId === 'string' && excludeId.length > 0 && excludeId !== 'null') {
        simpleQuery._id = { $ne: excludeId };
      }

      const existingProduct = await Product.findOne(simpleQuery).select('_id name itemcode barcode').lean();

      res.json({
        isDuplicate: !!existingProduct,
        duplicateProduct: existingProduct || null,
        similarProducts: [],
        message: existingProduct 
          ? `Product name "${normalizedName}" already exists (Item Code: ${existingProduct.itemcode})`
          : "Product name is unique",
      });
    }
  } catch (err) {
    console.error("❌ Unexpected error in checkDuplicateProductName:", err.message, err.stack);
    res.status(500).json({
      isDuplicate: false,
      similarProducts: [],
      message: "Error checking product name: " + err.message,
      error: err.message,
    });
  }
};

// ================= BULK IMPORT PRODUCTS FROM EXCEL =================
export const bulkImportProducts = async (req, res) => {
  const startTime = Date.now(); // ✅ Track import duration
  console.log(`\n🚀 BULK IMPORT STARTED - Processing ${req.body.products?.length || 0} products...`);
  
  try {
    const { products, duplicateHandling = 'skip' } = req.body; // ✅ NEW: Get duplicate handling option

    if (!Array.isArray(products) || products.length === 0) {
      return res.status(400).json({
        message: "Products array is required and must not be empty"
      });
    }

    const results = {
      successful: 0,
      failed: 0,
      skipped: 0,
      updated: 0,  // ✅ NEW: Track updated products
      errors: [],
      createdProducts: [],
      updatedProducts: []  // ✅ NEW: Track which products were updated
    };

    // Get all vendors, categories, and unit types once for efficiency
    const vendors = await Vendor.find({ isDeleted: false });
    const categories = await Grouping.find({ level: "1", isDeleted: false });
    const unitTypes = await UnitType.find({ isDeleted: false });
    const taxMasters = await TaxMaster.find({ isActive: true });

    // ✅ OPTIMIZATION: Pre-load all existing item codes and barcodes (avoid 1 query per item!)
    const existingProducts = await Product.find({ isDeleted: false }, 'itemcode barcode');
    const existingItemCodeMap = new Map(existingProducts.map(p => [p.itemcode?.toUpperCase(), p]));
    const existingBarcodeMap = new Map(existingProducts.map(p => [p.barcode?.toUpperCase(), p]));
    console.log(`⚡ Pre-loaded ${existingProducts.length} existing products for fast duplicate checking`);

    // Create maps for faster lookups
    const vendorMap = new Map(vendors.map(v => [v.name?.toLowerCase(), v._id]));
    const categoryMap = new Map(categories.map(c => [c.name?.toLowerCase(), c._id]));
    const unitTypeMap = new Map(unitTypes.map(u => [u.unitSymbol?.toLowerCase(), u._id]));
    // ✅ Create tax lookup map: match tax name (case-insensitive) to tax ID
    const taxNameMap = new Map(taxMasters.map(t => [t.taxName?.toLowerCase(), t._id]));

    // ✅ NEW: Batch insert optimization - collect products to insert together
    const productsToInsert = [];
    const productsToUpdate = [];

    // Process each product
    for (let index = 0; index < products.length; index++) {
      const productData = products[index];
      const rowNumber = index + 2; // +2 because row 1 is header

      try {
        // ✅ Log progress every 1000 items
        if (index % 1000 === 0 && index > 0) {
          console.log(`📊 Bulk Import Progress: ${index}/${products.length} items processed (${Math.round(index/products.length*100)}%)`);
        }

        // Extract and normalize fields
        const itemCode = productData['Item Code']?.toString().trim().toUpperCase();
        const productName = productData['Product Name']?.toString().trim();
        const country = productData['Country']?.toString().trim().toUpperCase();
        const vendorName = productData['Vendor']?.toString().trim();
        const categoryName = productData['Category']?.toString().trim();
        const unitTypeSymbol = productData['Unit Type']?.toString().trim().toUpperCase();
        const cost = parseFloat(productData['Cost']);
        const price = parseFloat(productData['Price']);
        const stock = parseInt(productData['Stock Quantity']) || 0;
        
        // Optional fields
        const hsn = productData['HSN Code']?.toString().trim().toUpperCase();
        const taxType = productData['Tax Type']?.toString().trim();
        const taxPercent = parseFloat(productData['Tax %']) || 0;
        const taxInPrice = productData['Tax In Price']?.toString().toLowerCase() === 'yes' || false;
        const minStock = parseInt(productData['Min Stock']) || 0;
        const maxStock = parseInt(productData['Max Stock']) || 1000;
        const reorderQty = parseInt(productData['Reorder Qty']) || 100;
        const trackExpiry = productData['Track Expiry']?.toString().toLowerCase() === 'yes' || false;
        const shortName = productData['Short Name']?.toString().trim() || '';
        const localName = productData['Local Name']?.toString().trim() || '';

        // Validate required fields
        if (!itemCode || !productName || !vendorName || !categoryName || !unitTypeSymbol || isNaN(cost) || isNaN(price)) {
          results.errors.push({
            row: rowNumber,
            message: 'Missing required fields: Item Code, Product Name, Vendor, Category, Unit Type, Cost, Price'
          });
          results.failed++;
          continue;
        }

        // Validate country code
        if (country && !['IN', 'AE', 'OM'].includes(country)) {
          results.errors.push({
            row: rowNumber,
            message: `Invalid country code: ${country}. Use: IN (India), AE (UAE), OM (Oman)`
          });
          results.failed++;
          continue;
        }

        // Validate HSN Code - required only for India (IN)
        if (country === 'IN' && (!hsn || hsn.trim() === '')) {
          results.errors.push({
            row: rowNumber,
            message: 'HSN Code is required for India (IN)'
          });
          results.failed++;
          continue;
        }

        // Validate numeric values
        if (cost <= 0 || price <= 0) {
          results.errors.push({
            row: rowNumber,
            message: 'Cost and Price must be positive numbers'
          });
          results.failed++;
          continue;
        }

        if (price < cost) {
          results.errors.push({
            row: rowNumber,
            message: `Selling price (${price}) is less than cost (${cost})`
          });
          results.failed++;
          continue;
        }

        // ✅ OPTIMIZATION: Check if item code already exists (using pre-loaded map, not DB query!)
        const existingByItemCode = existingItemCodeMap.get(itemCode);

        if (existingByItemCode) {
          // ✅ NEW: Handle duplicates based on option
          if (duplicateHandling === 'update') {
            // ✅ UPDATE MODE: Update the existing product with new data
            try {
              // Update the existing product
              existingByItemCode.name = productName;
              existingByItemCode.cost = cost;
              existingByItemCode.price = price;
              existingByItemCode.stock = stock;
              existingByItemCode.taxType = taxType || '';
              existingByItemCode.taxPercent = taxPercent;
              existingByItemCode.taxInPrice = taxInPrice;
              existingByItemCode.minStock = minStock;
              existingByItemCode.maxStock = maxStock;
              existingByItemCode.reorderQuantity = reorderQty;
              existingByItemCode.trackExpiry = trackExpiry;
              existingByItemCode.shortName = shortName;
              existingByItemCode.localName = localName;
              
              // Try to look up and update tax ID if possible
              if (taxType && taxPercent > 0) {
                const fullTaxName = `${taxType} ${taxPercent}%`.toLowerCase();
                const taxId = taxNameMap.get(fullTaxName);
                if (taxId) {
                  existingByItemCode.taxType = taxId;
                }
              }

              await existingByItemCode.save();
              results.updated++;
              results.updatedProducts.push({
                _id: existingByItemCode._id,
                itemcode: existingByItemCode.itemcode,
                name: existingByItemCode.name,
                status: 'updated'
              });
            } catch (updateError) {
              results.errors.push({
                row: rowNumber,
                message: `Failed to update existing product: ${updateError.message}`
              });
              results.failed++;
            }
            continue;
          } else {
            // ✅ SKIP MODE (default): Skip duplicate
            results.skipped++;
            continue;
          }
        }

        // Look up vendor by name
        const vendorId = vendorMap.get(vendorName.toLowerCase());
        if (!vendorId) {
          results.errors.push({
            row: rowNumber,
            message: `Vendor "${vendorName}" not found in system`
          });
          results.failed++;
          continue;
        }

        // Look up category by name
        const categoryId = categoryMap.get(categoryName.toLowerCase());
        if (!categoryId) {
          results.errors.push({
            row: rowNumber,
            message: `Category/Department "${categoryName}" not found in system`
          });
          results.failed++;
          continue;
        }

        // Look up unit type by symbol
        const unitTypeId = unitTypeMap.get(unitTypeSymbol.toLowerCase());
        if (!unitTypeId) {
          results.errors.push({
            row: rowNumber,
            message: `Unit Type "${unitTypeSymbol}" not found in system`
          });
          results.failed++;
          continue;
        }

        const unitType = unitTypes.find(u => u._id.toString() === unitTypeId.toString());

        // Generate barcode (use item code + random number for uniqueness)
        // ✅ OPTIMIZATION: Retry until we find a unique barcode that's not in our pre-loaded map
        let barcode = null;
        let barcodeFound = false;
        for (let attempt = 0; attempt < 10; attempt++) {
          const testBarcode = `${itemCode}${Math.floor(Math.random() * 10000)}`.toUpperCase();
          if (!existingBarcodeMap.has(testBarcode)) {
            barcode = testBarcode;
            barcodeFound = true;
            break;
          }
        }

        if (!barcodeFound) {
          results.errors.push({
            row: rowNumber,
            message: `Could not generate unique barcode for item code "${itemCode}". Try again.`
          });
          results.failed++;
          continue;
        }

        // ✅ NEW: Look up tax ID by matching taxType + taxPercent to TaxMaster
        // Construct full tax name (e.g., "VAT 5%" from "VAT" + "5")
        let taxId = null;
        if (taxType && taxPercent > 0) {
          const fullTaxName = `${taxType} ${taxPercent}%`.toLowerCase();
          taxId = taxNameMap.get(fullTaxName);
          
          if (!taxId) {
            // Warn but don't fail - tax will be set as string for manual selection
            results.errors.push({
              row: rowNumber,
              message: `Warning: Tax "${taxType} ${taxPercent}%" not found in system. Tax must be selected manually.`
            });
          }
        }

        // Create product object (don't save yet - batch later)
        const newProduct = {
          itemcode: itemCode,
          name: productName,
          hsn: hsn || '',
          barcode,
          vendor: vendorId,
          categoryId,
          unitType: unitTypeId,
          unitSymbol: unitType.unitSymbol,
          unitDecimal: unitType.unitDecimal,
          cost,
          price,
          stock,
          taxType: taxId ? taxId : (taxType || ''),
          taxPercent,
          taxInPrice,
          minStock,
          maxStock,
          reorderQuantity: reorderQty,
          trackExpiry,
          shortName,
          localName,
          factor: 1
        };

        if (existingByItemCode) {
          // Queue for update instead of immediate save
          if (duplicateHandling === 'update') {
            productsToUpdate.push({
              _id: existingByItemCode._id,
              updates: newProduct,
              itemcode: existingByItemCode.itemcode,
              name: existingByItemCode.name
            });
          } else {
            results.skipped++;
          }
        } else {
          // Queue for insert instead of immediate save
          productsToInsert.push(newProduct);
        }

      } catch (itemError) {
        results.errors.push({
          row: rowNumber,
          message: itemError.message || 'Error processing product'
        });
        results.failed++;
      }
    }

    // ✅ PERFORMANCE: Use batch insert instead of individual saves
    if (productsToInsert.length > 0) {
      try {
        console.log(`📦 Batch inserting ${productsToInsert.length} products...`);
        const insertedProducts = await Product.insertMany(productsToInsert, { ordered: false });
        results.successful += insertedProducts.length;
        results.createdProducts.push(
          ...insertedProducts.map(p => ({
            _id: p._id,
            itemcode: p.itemcode,
            name: p.name
          }))
        );
        console.log(`✅ Batch insert complete: ${insertedProducts.length} products inserted`);
      } catch (batchError) {
        console.error('Batch insert error:', batchError.message);
        // Some products might have been inserted despite the error
        results.errors.push({
          row: 'batch-insert',
          message: `Batch insert partial error: ${batchError.message}`
        });
      }
    }

    // ✅ PERFORMANCE: Batch update existing products
    if (productsToUpdate.length > 0) {
      try {
        console.log(`📦 Batch updating ${productsToUpdate.length} products...`);
        for (const updateItem of productsToUpdate) {
          await Product.findByIdAndUpdate(updateItem._id, updateItem.updates);
          results.updated++;
          results.updatedProducts.push({
            _id: updateItem._id,
            itemcode: updateItem.itemcode,
            name: updateItem.name,
            status: 'updated'
          });
        }
        console.log(`✅ Batch update complete: ${productsToUpdate.length} products updated`);
      } catch (updateError) {
        console.error('Batch update error:', updateError.message);
        results.errors.push({
          row: 'batch-update',
          message: `Batch update error: ${updateError.message}`
        });
      }
    }

    const totalDuration = Date.now() - startTime;
    console.log(`✅ BULK IMPORT COMPLETED in ${(totalDuration / 1000).toFixed(2)}s`);
    console.log(`   ✓ Successful: ${results.successful}, Updated: ${results.updated}, Failed: ${results.failed}, Skipped: ${results.skipped}`);

    res.json({
      message: `Bulk import completed. ${results.successful} successful, ${results.updated} updated, ${results.failed} failed, ${results.skipped} skipped.`,
      successful: results.successful,
      updated: results.updated,  // ✅ NEW: Include updated count
      failed: results.failed,
      skipped: results.skipped,
      errors: results.errors,
      createdProducts: results.createdProducts,
      updatedProducts: results.updatedProducts,  // ✅ NEW: Include updated products
      totalProcessed: results.successful + results.updated + results.failed + results.skipped,
      totalRequested: products.length,
      duration: totalDuration, // ✅ Add duration in ms
      durationSeconds: (totalDuration / 1000).toFixed(2) // ✅ Duration in seconds
    });

  } catch (err) {
    console.error("Error during bulk import:", err);
    res.status(500).json({
      message: "Error during bulk import",
      error: err.message,
      duration: Date.now() - startTime
    });
  }
};

// ================= BULK IMPORT SIMPLE PRODUCTS (From External Systems) =================
export const bulkImportSimpleProducts = async (req, res) => {
  const startTime = Date.now(); // ✅ Track import duration
  try {
    const { products, duplicateHandling = 'skip' } = req.body; // ✅ NEW: Get duplicate handling option

    if (!Array.isArray(products) || products.length === 0) {
      return res.status(400).json({
        message: "Products array is required and must not be empty"
      });
    }

    const results = {
      successful: 0,
      failed: 0,
      skipped: 0,
      updated: 0,  // ✅ NEW: Track updated products
      errors: [],
      createdProducts: [],
      updatedProducts: []  // ✅ NEW: Track which products were updated
    };

    // Get all vendors, categories, and unit types once for efficiency
    const vendors = await Vendor.find({ isDeleted: false });
    const categories = await Grouping.find({ level: "1", isDeleted: false });
    const unitTypes = await UnitType.find({}); // Get all units (including potentially inactive ones)
    const taxMasters = await TaxMaster.find({ isActive: true }); // ✅ Get all active tax masters

    // ✅ OPTIMIZATION: Pre-load all existing item codes and barcodes (avoid 1 query per item!)
    const existingProducts = await Product.find({ isDeleted: false }, 'itemcode barcode');
    const existingItemCodeMap = new Map(existingProducts.map(p => [p.itemcode?.toUpperCase(), p]));
    const existingBarcodeMap = new Map(existingProducts.map(p => [p.barcode?.toUpperCase(), p]));
    console.log(`⚡ Pre-loaded ${existingProducts.length} existing products for fast duplicate checking`);

    // Create maps for faster lookups
    const vendorMap = new Map(vendors.map(v => [v.name?.toLowerCase(), v._id]));
    const categoryMap = new Map(categories.map(c => [c.name?.toLowerCase(), c._id]));
    const unitTypeMap = new Map(unitTypes.map(u => [u.unitSymbol?.toLowerCase(), u._id]));
    const unitTypeByNameMap = new Map(unitTypes.map(u => [u.unitName?.toLowerCase(), u])); // Map by unitName for simple imports
    // ✅ Create tax lookup map: match tax name (case-insensitive) to tax ID
    const taxNameMap = new Map(taxMasters.map(t => [t.taxName?.toLowerCase(), t._id]));

    // ✅ NEW: Batch insert optimization - collect products to insert together
    const productsToInsert = [];
    const productsToUpdate = [];

    // Process each product
    for (let index = 0; index < products.length; index++) {
      const productData = products[index];
      const rowNumber = index + 2; // +2 because row 1 is header

      try {
        // ✅ Log progress every 1000 items (Simple Import)
        if (index % 1000 === 0 && index > 0) {
          console.log(`📊 Simple Bulk Import Progress: ${index}/${products.length} items processed (${Math.round(index/products.length*100)}%)`);
        }

        // Extract and normalize fields from simple format
        const itemCode = productData['Item Code']?.toString().trim().toUpperCase();
        const productName = productData['Product Name']?.toString().trim();
        const department = productData['Department']?.toString().trim(); // will be matched to category
        const vendorName = productData['Vendor']?.toString().trim();
        const unitName = productData['Unit Name']?.toString().trim(); // Unit type name (e.g., "Kilogram")
        const cost = parseFloat(productData['Cost']);
        const price = parseFloat(productData['Price']);
        const barcode = productData['Barcode']?.toString().trim();
        
        // ✅ NEW: Tax fields (optional)
        const taxType = productData['Tax Type']?.toString().trim() || '';
        const taxPercent = parseFloat(productData['Tax %']) || 0;
        const taxInPrice = productData['Tax In Price']?.toString().toLowerCase() === 'yes' || false;

        // Validate required fields
        if (!itemCode || !productName || !department || !vendorName || !unitName || isNaN(cost) || isNaN(price) || !barcode) {
          results.errors.push({
            row: rowNumber,
            message: 'Missing required fields: Item Code, Product Name, Department, Vendor, Unit Name, Cost, Price, Barcode'
          });
          results.failed++;
          continue;
        }

        // Validate numeric values
        if (cost <= 0 || price <= 0) {
          results.errors.push({
            row: rowNumber,
            message: 'Cost and Price must be positive numbers'
          });
          results.failed++;
          continue;
        }

        if (price < cost) {
          results.errors.push({
            row: rowNumber,
            message: `Selling price (${price}) is less than cost (${cost})`
          });
          results.failed++;
          continue;
        }

        // ✅ Validate tax percent
        if (taxPercent < 0 || taxPercent > 100) {
          results.errors.push({
            row: rowNumber,
            message: `Tax % must be between 0 and 100 (provided: ${taxPercent})`
          });
          results.failed++;
          continue;
        }

        // Validate barcode length
        if (barcode.length < 3) {
          results.errors.push({
            row: rowNumber,
            message: `Barcode must be at least 3 characters (provided: ${barcode})`
          });
          results.failed++;
          continue;
        }

        // ✅ AUTO-CALCULATE PRICING FIELDS
        let costIncludeVat = cost;
        let marginPercent = 0;
        let marginAmount = 0;
        let taxAmount = 0;

        if (taxInPrice) {
          // Tax is included in price: extract base amount
          const basePrice = price / (1 + taxPercent / 100);
          costIncludeVat = cost / (1 + taxPercent / 100); // Cost base without tax
          taxAmount = price - basePrice;
          marginAmount = basePrice - cost;
          marginPercent = cost > 0 ? (marginAmount / cost) * 100 : 0;
        } else {
          // Tax is separate from price: price is already base amount
          costIncludeVat = cost;
          taxAmount = price * (taxPercent / 100); // Tax on selling price
          marginAmount = price - cost;
          marginPercent = cost > 0 ? (marginAmount / cost) * 100 : 0;
        }

        // ✅ OPTIMIZATION: Check if item code already exists (using pre-loaded map, not DB query!)
        const existingByItemCode = existingItemCodeMap.get(itemCode);

        if (existingByItemCode) {
          // ✅ Handle duplicate based on user preference
          if (duplicateHandling === 'update') {
            // Queue for batch update instead of immediate save
            try {
              let taxId = null;
              if (taxType && taxPercent > 0) {
                const fullTaxName = `${taxType} ${taxPercent}%`.toLowerCase();
                taxId = taxNameMap.get(fullTaxName);
              }

              const updateData = {
                name: productName,
                cost: cost,
                price: price,
                taxType: taxId ? taxId : (taxType || ''),
                taxPercent: taxPercent,
                taxInPrice: taxInPrice,
                minStock: 0,
                maxStock: 1000,
                reorderQuantity: 100,
                costIncludeVat: Math.round(costIncludeVat * 100) / 100,
                marginPercent: Math.round(marginPercent * 100) / 100,
                marginAmount: Math.round(marginAmount * 100) / 100,
                taxAmount: Math.round(taxAmount * 100) / 100
              };

              productsToUpdate.push({
                _id: existingByItemCode._id,
                updates: updateData,
                itemcode: existingByItemCode.itemcode,
                name: existingByItemCode.name,
                barcode: existingByItemCode.barcode
              });
              results.updated++;
            } catch (updateError) {
              results.errors.push({
                row: rowNumber,
                message: `Failed to queue update for existing product "${itemCode}": ${updateError.message}`
              });
              results.failed++;
            }
          } else {
            // Skip duplicate (default behavior)
            results.skipped++;
          }
          continue;
        }

        // ✅ OPTIMIZATION: Check if barcode already exists (using pre-loaded map, not DB query!)
        if (existingBarcodeMap.has(barcode?.toUpperCase())) {
          results.errors.push({
            row: rowNumber,
            message: `Barcode "${barcode}" already exists in system`
          });
          results.failed++;
          continue;
        }

        // Look up vendor by name
        const vendorId = vendorMap.get(vendorName.toLowerCase());
        if (!vendorId) {
          results.errors.push({
            row: rowNumber,
            message: `Vendor "${vendorName}" not found in system`
          });
          results.failed++;
          continue;
        }

        // Look up or auto-create category by department name
        let categoryId = categoryMap.get(department.toLowerCase());
        if (!categoryId) {
          // Auto-create missing department as Level 1 grouping
          try {
            const newGrouping = new Grouping({
              name: department.toUpperCase(),
              level: "1",
              description: `Auto-created from bulk import`,
              isActive: true
            });
            const savedGrouping = await newGrouping.save();
            categoryId = savedGrouping._id;
            categoryMap.set(department.toLowerCase(), categoryId); // Add to map for future lookups
          } catch (groupingError) {
            results.errors.push({
              row: rowNumber,
              message: `Failed to create department "${department}": ${groupingError.message}`
            });
            results.failed++;
            continue;
          }
        }

        // Look up unit type by name
        const unitTypeObj = unitTypeByNameMap.get(unitName.toLowerCase());
        if (!unitTypeObj) {
          const availableUnits = Array.from(unitTypeByNameMap.keys()).map(u => 
            unitTypeByNameMap.get(u).unitName
          ).join(', ');
          results.errors.push({
            row: rowNumber,
            message: `Unit Name "${unitName}" not found in system. Available units: ${availableUnits || 'None found in database'}`
          });
          results.failed++;
          continue;
        }

        // ✅ NEW: Look up tax ID by matching taxType + taxPercent to TaxMaster
        // Construct full tax name (e.g., "VAT 5%" from "VAT" + "5")
        let taxId = null;
        if (taxType && taxPercent > 0) {
          const fullTaxName = `${taxType} ${taxPercent}%`.toLowerCase();
          taxId = taxNameMap.get(fullTaxName);
          
          if (!taxId) {
            // Warn but don't fail - tax will be set as string for manual selection
            results.errors.push({
              row: rowNumber,
              message: `Warning: Tax "${taxType} ${taxPercent}%" not found in system. Tax must be selected manually.`
            });
          }
        }

        // Create product with simple import data + auto-calculated fields (don't save yet - batch later)
        const newProduct = {
          itemcode: itemCode,
          name: productName,
          barcode,
          vendor: vendorId,
          categoryId,
          unitType: unitTypeObj._id,
          unitSymbol: unitTypeObj.unitSymbol,
          unitDecimal: unitTypeObj.unitDecimal,
          cost,
          price,
          costIncludeVat: Math.round(costIncludeVat * 100) / 100,
          marginPercent: Math.round(marginPercent * 100) / 100,
          marginAmount: Math.round(marginAmount * 100) / 100,
          taxAmount: Math.round(taxAmount * 100) / 100,
          stock: 0,
          taxType: taxId ? taxId : (taxType || ''),
          taxPercent: taxPercent,
          taxInPrice: taxInPrice,
          minStock: 0,
          maxStock: 1000,
          reorderQuantity: 100,
          trackExpiry: false,
          shortName: productName.substring(0, 20),
          localName: '',
          factor: 1
        };

        productsToInsert.push(newProduct);

      } catch (itemError) {
        results.errors.push({
          row: rowNumber,
          message: itemError.message || 'Error processing product'
        });
        results.failed++;
      }
    }

    // ✅ PERFORMANCE: Use batch insert instead of individual saves (Simple Import)
    if (productsToInsert.length > 0) {
      try {
        console.log(`📦 Batch inserting ${productsToInsert.length} products (Simple Import)...`);
        const insertedProducts = await Product.insertMany(productsToInsert, { ordered: false });
        results.successful += insertedProducts.length;
        results.createdProducts.push(
          ...insertedProducts.map(p => ({
            _id: p._id,
            itemcode: p.itemcode,
            name: p.name,
            barcode: p.barcode
          }))
        );
        console.log(`✅ Batch insert complete: ${insertedProducts.length} products inserted (Simple Import)`);
      } catch (batchError) {
        console.error('Batch insert error (Simple Import):', batchError.message);
        results.errors.push({
          row: 'batch-insert',
          message: `Batch insert partial error: ${batchError.message}`
        });
      }
    }

    // ✅ PERFORMANCE: Batch update existing products (Simple Import)
    if (productsToUpdate.length > 0) {
      try {
        console.log(`📦 Batch updating ${productsToUpdate.length} products (Simple Import)...`);
        for (const updateItem of productsToUpdate) {
          await Product.findByIdAndUpdate(updateItem._id, updateItem.updates);
          results.updated++;
          results.updatedProducts.push({
            _id: updateItem._id,
            itemcode: updateItem.itemcode,
            name: updateItem.name,
            barcode: updateItem.barcode
          });
        }
        console.log(`✅ Batch update complete: ${productsToUpdate.length} products updated (Simple Import)`);
      } catch (updateError) {
        console.error('Batch update error (Simple Import):', updateError.message);
        results.errors.push({
          row: 'batch-update',
          message: `Batch update error: ${updateError.message}`
        });
      }
    }

    const totalDuration = Date.now() - startTime;
    console.log(`✅ SIMPLE BULK IMPORT COMPLETED in ${(totalDuration / 1000).toFixed(2)}s`);
    console.log(`   ✓ Created: ${results.successful}, Updated: ${results.updated}, Failed: ${results.failed}, Skipped: ${results.skipped}`);

    res.json({
      message: `Simple bulk import completed. ${results.successful} created, ${results.updated} updated, ${results.failed} failed, ${results.skipped} skipped.`,
      successful: results.successful,
      updated: results.updated,
      failed: results.failed,
      skipped: results.skipped,
      errors: results.errors,
      createdProducts: results.createdProducts,
      updatedProducts: results.updatedProducts,
      totalProcessed: results.successful + results.updated + results.failed + results.skipped,
      totalRequested: products.length,
      duration: totalDuration, // ✅ Add duration in ms
      durationSeconds: (totalDuration / 1000).toFixed(2) // ✅ Duration in seconds
    });

  } catch (err) {
    console.error("Error during simple bulk import:", err);
    res.status(500).json({
      message: "Error during simple bulk import",
      error: err.message,
      duration: Date.now() - startTime
    });
  }
};

// ✅ NEW: Get total product count from database
export const getProductCount = async (req, res) => {
  try {
    const totalCount = await Product.countDocuments({ isDeleted: false });
    res.json({
      totalCount: totalCount,
      message: `Total products in database: ${totalCount}`
    });
  } catch (err) {
    console.error("Error getting product count:", err);
    res.status(500).json({
      message: "Error getting product count",
      error: err.message
    });
  }
};

// ✅ NEW: Bulk sync all products to Meilisearch index
// Purpose: Index existing products or re-index after maintenance
export const bulkSyncToMeilisearch = async (req, res) => {
  try {
    console.log('🔄 Starting bulk sync of products to Meilisearch...');

    // Import the sync function
    const { syncAllProductsToMeilisearch } = await import("../services/ProductMeilisearchSync.js");

    // Execute bulk sync
    const result = await syncAllProductsToMeilisearch();

    res.json({
      message: result.message,
      indexed: result.indexed,
      failed: result.failed,
      success: result.success,
      error: result.error || null,
    });
  } catch (err) {
    console.error("Error in bulk sync:", err);
    res.status(500).json({
      message: "Error syncing products to Meilisearch",
      error: err.message,
    });
  }
};

// ✅ NEW: Complete reset and fresh sync of Meilisearch
// Purpose: Clear all old/deleted data and rebuild index from scratch
// Use when search shows stale/deleted products
export const resetAndSyncMeilisearch = async (req, res) => {
  try {
    console.log('🔄 Starting complete Meilisearch reset and sync...');

    // Import required functions
    const { resetMeilisearchIndex } = await import("../../../config/meilisearch.js");
    const { syncAllProductsToMeilisearch } = await import("../services/ProductMeilisearchSync.js");

    // 1. Reset the index (delete and recreate)
    const resetSuccess = await resetMeilisearchIndex();
    if (!resetSuccess) {
      return res.status(500).json({
        message: "Failed to reset Meilisearch index",
        success: false,
      });
    }

    // 2. Re-sync all active products
    const syncResult = await syncAllProductsToMeilisearch();

    res.json({
      message: `✅ Index reset and synced successfully. ${syncResult.message}`,
      indexed: syncResult.indexed,
      failed: syncResult.failed,
      success: syncResult.success,
      error: syncResult.error || null,
    });
  } catch (err) {
    console.error("Error in reset and sync:", err);
    res.status(500).json({
      message: "Error resetting and syncing Meilisearch",
      error: err.message,
      success: false,
    });
  }
};

// ✅ NEW: Cleanup orphaned products from Meilisearch
// Purpose: Remove products that were hard-deleted from DB but still in Meilisearch index
// Use when search shows items that don't exist in database
export const cleanupMeilisearchOrphans = async (req, res) => {
  try {
    console.log('🧹 Starting Meilisearch orphan cleanup...');

    const { cleanupOrphanedMeilisearchProducts } = await import("../services/ProductMeilisearchSync.js");

    // Run cleanup
    const result = await cleanupOrphanedMeilisearchProducts();

    res.json({
      message: result.message,
      cleaned: result.cleaned,
      orphaned: result.orphaned,
      success: result.success,
      error: result.error || null,
    });
  } catch (err) {
    console.error("Error in cleanup:", err);
    res.status(500).json({
      message: "Error cleaning up orphaned products",
      error: err.message,
      success: false,
    });
  }
};

// ✅ NEW: Meilisearch-powered server-side search
// Purpose: Fast full-text search for 100k+ products with typo tolerance
// Returns: Top results with pagination
export const searchProducts = async (req, res) => {
  try {
    const { q = "", page = 1, limit = 100 } = req.query;
    
    // If query is empty, return empty results
    if (!q || q.trim().length === 0) {
      return res.json({
        products: [],
        totalCount: 0,
        page: 1,
        pageSize: limit,
        totalPages: 0,
        message: "No search query provided"
      });
    }

    const searchQuery = q.trim();
    const exactBarcodeQuery = searchQuery.toUpperCase();
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(parseInt(limit) || 100, 100);

    // ✅ Try Meilisearch first with a 5-second timeout
    let results = null;
    let usedFallback = false;
    let meilisearchError = null;

    try {
      // Create a promise that rejects after 5 seconds
      const meilisearchPromise = searchMeilisearch(searchQuery, {
        page: pageNum,
        limit: limitNum,
      });

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Meilisearch timeout (5s)')), 5000)
      );

      results = await Promise.race([meilisearchPromise, timeoutPromise]);

      if (!results?.products?.length) {
        const exactBarcodeProducts = await Product.find({
          isDeleted: false,
          $or: [
            { barcode: exactBarcodeQuery },
            { itemcode: exactBarcodeQuery },
            { 'packingUnits.barcode': exactBarcodeQuery },
            { 'packingUnits.additionalBarcodes': exactBarcodeQuery },
          ],
        })
          .select('_id name itemcode barcode price cost stock tax taxPercent taxType taxAmount taxInPrice vendor categoryId unitType unitSymbol unitDecimal packingUnits trackExpiry')
          .populate('vendor', 'name')
          .populate('categoryId', 'name')
          .populate('unitType', 'unitName unitSymbol unitDecimal category')
          .populate('packingUnits.unit', 'unitName unitSymbol unitDecimal category')
          .limit(limitNum)
          .lean();

        if (exactBarcodeProducts.length > 0) {
          results = {
            products: exactBarcodeProducts,
            totalCount: exactBarcodeProducts.length,
            page: pageNum,
            pageSize: limitNum,
            totalPages: 1,
            resultCount: exactBarcodeProducts.length,
            hasNextPage: false,
            hasPrevPage: false,
          };

          usedFallback = true;
        }
      }
    } catch (meilisearchErr) {
      meilisearchError = meilisearchErr.message;
      console.warn(`⚠️  Meilisearch search failed/timeout: ${meilisearchErr.message}. Falling back to MongoDB...`);
      
      // ✅ FALLBACK: Use MongoDB regex search
      try {
        const searchLower = searchQuery.toLowerCase();
        const mongoQuery = {
          isDeleted: false,
          $or: [
            { name: { $regex: searchLower, $options: 'i' } },
            { barcode: { $regex: searchLower, $options: 'i' } },
            { itemcode: { $regex: searchLower, $options: 'i' } },
            { 'packingUnits.barcode': { $regex: searchLower, $options: 'i' } },
            { 'packingUnits.additionalBarcodes': { $regex: searchLower, $options: 'i' } },
          ]
        };

        const totalCount = await Product.countDocuments(mongoQuery);
        const skip = (pageNum - 1) * limitNum;

        const products = await Product.find(mongoQuery)
          .select('_id name itemcode barcode price cost stock tax taxPercent taxType taxAmount taxInPrice vendor categoryId unitType unitSymbol unitDecimal packingUnits trackExpiry')  // ✅ Added tax fields (taxPercent, taxType, taxAmount, taxInPrice)
          .populate('vendor', 'name')
          .populate('categoryId', 'name')
          .populate('unitType', 'unitName unitSymbol unitDecimal category')
          .populate('packingUnits.unit', 'unitName unitSymbol unitDecimal category')
          .skip(skip)
          .limit(limitNum)
          .sort({ createdate: -1 })
          .lean();

        const totalPages = Math.ceil(totalCount / limitNum);

        results = {
          products,
          totalCount,
          page: pageNum,
          pageSize: limitNum,
          totalPages,
          resultCount: products.length,
          hasNextPage: pageNum < totalPages,
          hasPrevPage: pageNum > 1,
        };

        usedFallback = true;
      } catch (mongoErr) {
        console.error('❌ MongoDB fallback also failed:', mongoErr.message);
        throw mongoErr;
      }
    }

    // ✅ Return results with metadata about search source
    res.json({
      products: results.products,
      totalCount: results.totalCount,
      page: results.page,
      pageSize: results.pageSize,
      totalPages: results.totalPages,
      resultCount: results.resultCount,
      hasNextPage: results.hasNextPage,
      hasPrevPage: results.hasPrevPage,
      message: `Found ${results.totalCount} matching products`,
      searchSource: usedFallback ? 'MongoDB (Meilisearch fallback)' : 'Meilisearch',
      meilisearchError: meilisearchError ? `Meilisearch unavailable: ${meilisearchError}` : null,
    });

  } catch (err) {
    console.error("❌ Final search error:", err.message);
    
    res.status(500).json({
      message: "Error searching products",
      error: err.message,
      products: [],
      totalCount: 0,
      page: 1,
      pageSize: 100,
      totalPages: 0,
      searchSource: 'Error'
    });
  }
};
