
import React, { useEffect, useState, useRef, useCallback, useContext } from "react";
import toast from "react-hot-toast"; // ✅ Import to dismiss toasts on modal close
import Modal from "./Model";
import { showToast } from "./AnimatedCenteredToast.jsx";
import useDecimalFormat from "../../hooks/useDecimalFormat";
import { useTaxMaster } from "../../hooks/useTaxMaster";
import useProductNamingValidation from "../../hooks/useProductNamingValidation";
import { clearQueryCache } from "../../utils/searchCache";  // ✅ ADDED - Auto-clear search cache on product update
import {
  buildPricingLinesFromProduct as sharedBuildPricingLines,
  prepareProductForEdit,
  buildProductForSave,
} from "../../utils/productCreateEditUtils";

// Context
import { ProductFormContext } from "../../context/ProductFormContext";

// Custom Hooks
import { useProductForm } from "./sample/useProductForm";
import { useProductAPI } from "./sample/useProductAPI";

// Tab Components
import BasicInfoTab from "./tabs/BasicInfoTab";
import MoreInfoTab from "./tabs/MoreInfoTab";
import ImageTab from "./tabs/ImageTab";
import StockBatchManagement from "./StockBatchManagement";
import HistoryTab from "./tabs/HistoryTab";

// Modal Dialogs
import BarcodePrintModal from "./model/BarcodePrintModal";
import VendorForm from "../forms/VendorForm";
import GroupingModal from "./model/GroupingModal";

const GlobalProductFormModal = () => {
  // Context
  const {
    isOpen,
    mode,
    productData,
    closeProductForm,
    updateMode,
    hasOnSaveCallback,
    onSaveCallback, // ✅ Callback function to call directly
    products = [], // ✅ Optional: products list from Product.jsx
    filteredProducts = [], // ✅ Optional: filtered products from Product.jsx
    editIndex = -1, // ✅ Optional: current product index from Product.jsx
    setEditIndex, // ✅ Optional: function to update index
  } = useContext(ProductFormContext);

  // Form State
  const { newProduct, setNewProduct, pricingLines, setPricingLines, selectedPricingLines, setSelectedPricingLines, resetForm } =
    useProductForm(productData);

  // Get company info to determine region (matches Product.jsx pattern)
  const { company, taxes: allTaxes, loading: loadingTaxes } = useTaxMaster();
  
  // ✅ Product naming validation hook
  const namingValidation = useProductNamingValidation(productData?._id);
  
  // Determine country from company - same logic as Product.jsx
  const activeCountryCode = company?.countryCode || "AE";
  
  const { round, formatNumber } = useDecimalFormat(activeCountryCode);
  const productAPI = useProductAPI();

  // Modal UI Control
  const [activeTab, setActiveTab] = useState("basic");
  const [loading, setLoading] = useState(false);
  const [loadingReferenceData, setLoadingReferenceData] = useState(false); // ✅ Track reference data loading state
  const [errors, setErrors] = useState({});
  
  // ✅ Track last saved product to prevent duplicate messages
  const lastSavedProductRef = useRef(null);
  
  // ✅ Track if we just saved and switched to edit mode (prevent useEffect from overwriting fetched data)
  const [skipProductDataRestore, setSkipProductDataRestore] = useState(false);

  // Reference Data
  const [departments, setDepartments] = useState([]);
  const [subdepartments, setSubdepartments] = useState([]);
  const [brands, setBrands] = useState([]);
  const [groupings, setGroupings] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [units, setUnits] = useState([]);
  const [hsnCodes, setHsnCodes] = useState([]);
  const [availableTaxes, setAvailableTaxes] = useState([]);

  // Modal Dialogs
  const [isVendorModalOpen, setIsVendorModalOpen] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [isGroupingModalOpen, setIsGroupingModalOpen] = useState(false);
  const [groupingModalLevel, setGroupingModalLevel] = useState("1");
  const [groupingModalParentId, setGroupingModalParentId] = useState(null);
  const [showBarcodePrintPopup, setShowBarcodePrintPopup] = useState(false);
  const [isCustomerPricingModalOpen, setIsCustomerPricingModalOpen] = useState(false);
  const [selectedUnitForCustomerPricing, setSelectedUnitForCustomerPricing] = useState(null);
  const [pricingLevels, setPricingLevels] = useState({
    level1: "",
    level2: "",
    level3: "",
    level4: "",
    level5: "",
  });
  const [focusedPricingLevel, setFocusedPricingLevel] = useState(null);
  const [barcodeVariants, setBarcodeVariants] = useState([]);

  // ✅ Modal Search/Navigation State (Product.jsx integration)
  const [modalSearchQuery, setModalSearchQuery] = useState("");
  const [modalSearchResults, setModalSearchResults] = useState([]);
  const [showModalSearchResults, setShowModalSearchResults] = useState(false);
  const modalSearchDebounceRef = useRef(null);

  // Refs
  const basicInfoTabRef = useRef(null);
  const tabContentRef = useRef(null);
  const searchInputRef = useRef(null);

  // ✅ Close search dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchInputRef.current && !searchInputRef.current.contains(e.target)) {
        setShowModalSearchResults(false);
      }
    };

    if (showModalSearchResults) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showModalSearchResults]);

  // ✅ Wrapper function to close modal and dismiss all toasts
  const handleCloseModal = useCallback(() => {
    toast.dismiss(); // Clear all validation error toasts
    closeProductForm(); // Close the modal
  }, [closeProductForm]);

  // Country Detection
  const isIndiaCompany = activeCountryCode === "IN";

  // Filter taxes by country
  const filteredTaxes = availableTaxes.filter((tax) => {
    if (tax.country || tax.countryCode) {
      return tax.country === activeCountryCode || tax.countryCode === activeCountryCode;
    }
    return true;
  });

  // Load reference data on mount
  useEffect(() => {
    const loadReferenceData = async () => {
      setLoadingReferenceData(true); // ✅ Show loading state while fetching
      try {
        const [fetchedGroupings, fetchedVendors, fetchedUnits, fetchedTaxes, fetchedHSNCodes] = 
          await Promise.all([
            productAPI.fetchGroupings(),
            productAPI.fetchVendors(),
            productAPI.fetchUnits(),
            productAPI.fetchTaxes(),
            isIndiaCompany ? productAPI.fetchHSNCodes() : Promise.resolve([]),
          ]);

        // Filter departments (level 1 groupings)
        const depts = fetchedGroupings.filter(
          (g) => g.level === "1" || g.level === 1 || !g.parentId
        );

        setDepartments(depts || []);
        setVendors(fetchedVendors || []);
        setUnits(fetchedUnits || []);
        setGroupings(fetchedGroupings || []);
        setAvailableTaxes(fetchedTaxes || []);
        setHsnCodes(fetchedHSNCodes || []);

        // Auto-set itemcode to "Auto-generated" placeholder for create mode
        // Server will auto-increment when saving (empty string sent to server)
        if (mode === "create") {
          setNewProduct((prev) => ({
            ...prev,
            itemcode: "Auto-generated",
          }));
        }
      } catch (error) {
        showToast('error', "Failed to load reference data");
        console.error("Error loading data:", error);
      } finally {
        setLoadingReferenceData(false); // ✅ Hide loading state after fetch completes
      }
    };

    if (isOpen) {
      loadReferenceData();
    }
  }, [isOpen, isIndiaCompany, mode]);

  // ✅ Reset lastSavedProductRef and skipProductDataRestore when modal opens for fresh state
  useEffect(() => {
    if (isOpen) {
      lastSavedProductRef.current = null;
      setSkipProductDataRestore(false); // Reset flag for new open
      setErrors({}); // ✅ Clear all validation errors when modal opens
    } else {
      lastSavedProductRef.current = null;
      setSkipProductDataRestore(false); // Reset flag when closing
      setErrors({}); // ✅ Clear all validation errors when modal closes
    }
  }, [isOpen]);

  // ✅ Helper function to rebuild pricing lines from product data (using shared utility)
  // Used both after saving and when loading product data in EDIT mode
  const buildPricingLinesFromProduct = useCallback((product) => {
    if (!product) return;
    
    // Use shared utility to build pricing lines
    const { pricingLines, selectedLines } = sharedBuildPricingLines(product);
    
    setPricingLines(pricingLines);
    setSelectedPricingLines(selectedLines);
    
    console.log(`✅ Loaded pricing lines from product:`, pricingLines.map((l, i) => ({ idx: i, unit: l.unit, price: l.price, cost: l.cost })));
  }, [setPricingLines, setSelectedPricingLines]);
  
  // ✅ Reset form when opening for CREATE mode (ensure blank form, not last created product)
  // Using ref to track initial load to prevent re-triggering on flag changes
  const formResetTrackerRef = useRef({ lastMode: null, lastIsOpen: false, lastProductId: null });
  
  useEffect(() => {
    const modeChanged = formResetTrackerRef.current.lastMode !== mode;
    const isOpenChanged = formResetTrackerRef.current.lastIsOpen !== isOpen;
    const productIdChanged = formResetTrackerRef.current.lastProductId !== productData?._id;
    
    if (isOpen && mode === 'create' && (modeChanged || isOpenChanged)) {
      // ✅ CREATE MODE: Always reset form, ignore any lingering productData
      formResetTrackerRef.current = { lastMode: mode, lastIsOpen: isOpen, lastProductId: null };
      console.log("📝 CREATE MODE: Resetting form to blank state");
      resetForm(); // Reset to initial state with empty fields
      
      // ✅ Clear all search filters in BasicInfoTab
      if (basicInfoTabRef.current) {
        basicInfoTabRef.current.clearDepartmentSearch();
        basicInfoTabRef.current.clearSubdepartmentSearch();
        basicInfoTabRef.current.clearBrandSearch();
        basicInfoTabRef.current.clearVendorSearch();
      }
    } else if (isOpen && mode === 'edit' && productData && !skipProductDataRestore && (modeChanged || isOpenChanged || productIdChanged)) {
      // ✅ EDIT MODE: Load product data AND rebuild pricing lines when product changes or mode changes
      // productIdChanged ensures form updates when clicking edit on DIFFERENT products
      formResetTrackerRef.current = { lastMode: mode, lastIsOpen: isOpen, lastProductId: productData._id };
      console.log("✏️ EDIT MODE: Loading product data:", productData.name, "- Product ID:", productData._id);
      
      // ✅ Clear all search filters when loading a different product
      if (basicInfoTabRef.current) {
        basicInfoTabRef.current.clearDepartmentSearch();
        basicInfoTabRef.current.clearSubdepartmentSearch();
        basicInfoTabRef.current.clearBrandSearch();
        basicInfoTabRef.current.clearVendorSearch();
      }
      
      setNewProduct(productData);
      buildPricingLinesFromProduct(productData); // ✅ Rebuild pricing lines from product data
    } else if (!isOpen) {
      // ✅ Modal closed: Update ref so next open will trigger reset
      formResetTrackerRef.current = { lastMode: mode, lastIsOpen: isOpen, lastProductId: null };
    }
  }, [isOpen, mode, productData, skipProductDataRestore, buildPricingLinesFromProduct, resetForm]);

  // Calculate Pricing Fields - EXACT copy from Product.jsx (fully tested)
  const calculatePricingFields = useCallback((index, changedField, changedValue) => {
    const updated = [...pricingLines];
    
    // ✅ Ensure the line object exists before accessing it
    if (!updated[index]) {
      updated[index] = {
        unit: '',
        factor: '',
        price: '',
        barcode: '',
        cost: '',
        costIncludetax: '',
        margin: '',
        marginAmount: '',
        taxAmount: '',
      };
    }
    
    const line = updated[index];

    // Get tax settings first - needed for early calculations
    const taxPercent = parseFloat(newProduct.taxPercent) || 0;
    const includeTaxInPrice = newProduct.taxInPrice || false;
    const taxMultiplier = 1 + taxPercent / 100;

    // Handle empty value - user cleared the field
    if (
      changedValue === "" ||
      changedValue === undefined ||
      changedValue === null
    ) {
      line[changedField] = "";
      setPricingLines(updated);

      // Also update newProduct unitVariants
      const updatedVariants = Array.isArray(newProduct.unitVariants) ? [...newProduct.unitVariants] : [];
      if (!updatedVariants[index]) {
        updatedVariants[index] = {
          unit: "",
          factor: "",
          cost: "",
          margin: "",
          marginAmount: "",
          price: "",
          barcode: "",
          action: "",
        };
      }
      updatedVariants[index][changedField] = "";
      setNewProduct({
        ...newProduct,
        unitVariants: updatedVariants,
      });
      return;
    }

    // Current values - gets existing value if field not changed, otherwise uses new value
    const cost =
      changedField === "cost"
        ? parseFloat(changedValue) || 0
        : parseFloat(line.cost) || 0;
    const marginPercent =
      changedField === "margin"
        ? parseFloat(changedValue) || 0
        : parseFloat(line.margin) || 0;
    const marginAmount =
      changedField === "marginAmount"
        ? parseFloat(changedValue) || 0
        : parseFloat(line.marginAmount) || 0;
    const price =
      changedField === "price"
        ? parseFloat(changedValue) || 0
        : parseFloat(line.price) || 0;

    // Check if fields have been explicitly filled (including 0)
    const hasCost =
      line.cost !== "" && line.cost !== undefined && line.cost !== null;
    const hasPrice =
      line.price !== "" && line.price !== undefined && line.price !== null;

    // CASE: Unit changed
    if (changedField === "unit") {
      line.unit = changedValue;
      setPricingLines(updated);
      // Also update newProduct unitVariants
      const updatedVariants = Array.isArray(newProduct.unitVariants) ? [...newProduct.unitVariants] : [];
      if (!updatedVariants[index]) {
        updatedVariants[index] = {
          unit: "",
          factor: "",
          cost: "",
          margin: "",
          marginAmount: "",
          price: "",
          barcode: "",
          action: "",
        };
      }
      updatedVariants[index].unit = changedValue;
      setNewProduct({
        ...newProduct,
        unitVariants: updatedVariants,
      });
      return;
    }
    // CASE 1 & 4: Selling Price entered → Reverse calculate Margin Amount & Margin %
    if (changedField === "price") {
      // Calculate tax from price first (before any returns)
      if (price > 0 && taxPercent > 0) {
        const calculatedTaxOnPrice = includeTaxInPrice
          ? ((price * taxPercent) / (100 + taxPercent))
          : (price * taxPercent / 100);
        line.taxAmount = round(calculatedTaxOnPrice).toString();
      }

      // Validate: Cost field must be filled (can be 0)
      if (!hasCost) {
        showToast('error', "Please enter Cost first before setting Selling Price");
        line.price = price;
        setPricingLines(updated);

        // Also update newProduct unitVariants with tax
        const updatedVariants = Array.isArray(newProduct.unitVariants) ? [...newProduct.unitVariants] : [];
        if (!updatedVariants[index]) {
          updatedVariants[index] = {
            unit: "",
            factor: "",
            cost: "",
            margin: "",
            marginAmount: "",
            taxAmount: "",
            price: "",
            barcode: "",
            action: "",
          };
        }
        updatedVariants[index] = { ...line };
        setNewProduct({
          ...newProduct,
          unitVariants: updatedVariants,
        });
        return;
      }

      // If taxInPrice is true, price includes tax - remove tax to get base price
      let basePriceForMargin = price;
      if (includeTaxInPrice && taxPercent > 0) {
        basePriceForMargin = price / taxMultiplier;
      }

      const calculatedMarginAmount = basePriceForMargin - cost;
      const calculatedMarginPercent =
        cost > 0 ? (calculatedMarginAmount / cost) * 100 : 0;
      const calculatedTaxAmount = cost * (taxPercent / 100);
      const calculatedCostIncludetax = cost + calculatedTaxAmount;

      line.cost = cost;
      // Store original changedValue to preserve decimals
      line.price = changedValue.toString();
      // ✅ FIX: Always recalculate margin percentage when price changes
      // This ensures reverse calculation is complete (both marginAmount and margin % updated)
      line.margin = formatNumber(round(calculatedMarginPercent));
      line.marginAmount = formatNumber(round(calculatedMarginAmount));
      line.taxAmount = formatNumber(round(calculatedTaxAmount));
      line.costIncludetax = formatNumber(round(calculatedCostIncludetax));
    }
    // CASE 2: Cost + Margin % entered → Calculate Margin Amount, Selling Price, Tax Amount, Cost+Tax
    else if (changedField === "margin") {
      const calculatedMarginAmount = cost * (marginPercent / 100);
      let calculatedPrice = cost + calculatedMarginAmount;
      const calculatedTaxAmount = cost * (taxPercent / 100);
      const calculatedCostIncludetax = cost + calculatedTaxAmount;

      // If taxInPrice is true, add tax to final price
      if (includeTaxInPrice && taxPercent > 0) {
        calculatedPrice = calculatedPrice * taxMultiplier;
      }

      line.cost = cost;
      // Store original changedValue to preserve decimals
      line.margin = changedValue.toString();
      line.marginAmount = formatNumber(round(calculatedMarginAmount));
      line.price = formatNumber(round(calculatedPrice));
      line.taxAmount = formatNumber(round(calculatedTaxAmount));
      line.costIncludetax = formatNumber(round(calculatedCostIncludetax));
    }
    // CASE 3: Cost + Margin Amount entered → Calculate Margin %, Selling Price, Tax Amount, Cost+Tax
    else if (changedField === "marginAmount") {
      const calculatedMarginPercent =
        cost > 0 ? (marginAmount / cost) * 100 : 0;
      let calculatedPrice = cost + marginAmount;
      const calculatedTaxAmount = cost * (taxPercent / 100);
      const calculatedCostIncludetax = cost + calculatedTaxAmount;

      // If taxInPrice is true, add tax to final price
      if (includeTaxInPrice && taxPercent > 0) {
        calculatedPrice = calculatedPrice * taxMultiplier;
      }

      line.cost = cost;
      // Store original changedValue to preserve decimals
      line.marginAmount = changedValue.toString();
      // Always recalculate margin % when marginAmount changes
      line.margin = formatNumber(round(calculatedMarginPercent));
      line.price = formatNumber(round(calculatedPrice));
      line.taxAmount = formatNumber(round(calculatedTaxAmount));
      line.costIncludetax = formatNumber(round(calculatedCostIncludetax));
    }
    // CASE 5: Cost Including Tax entered → Calculate Cost, keep price unchanged, recalculate margins
    else if (changedField === "costIncludetax") {
      // Reverse calculate cost from costIncludetax
      const calculatedCost =
        taxPercent > 0
          ? parseFloat(changedValue) / taxMultiplier
          : parseFloat(changedValue);
      const calculatedTaxAmount = calculatedCost * (taxPercent / 100);

      line.cost = formatNumber(round(calculatedCost));
      // Store original changedValue to preserve decimals
      line.costIncludetax = changedValue.toString();
      line.taxAmount = formatNumber(round(calculatedTaxAmount));

      // ✅ IMPORTANT: Keep current price unchanged, recalculate margins based on price
      const currentPrice = parseFloat(line.price) || 0;
      
      if (currentPrice > 0 && calculatedCost > 0) {
        // Calculate margin amount = price - cost
        const marginAmountFromPrice = currentPrice - calculatedCost;
        // Calculate margin % = (margin amount / cost) × 100
        const marginPercentFromPrice = (marginAmountFromPrice / calculatedCost) * 100;
        
        line.marginAmount = formatNumber(round(marginAmountFromPrice));
        line.margin = formatNumber(round(marginPercentFromPrice));
      }
    }
    // DEFAULT: Cost changed → Recalculate cost+tax, keep price unchanged, recalculate both margin % and margin amount
    else if (changedField === "cost") {
      const calculatedTaxAmount = cost * (taxPercent / 100);
      const calculatedCostIncludetax = cost + calculatedTaxAmount;

      // Store the original changedValue to preserve decimals (e.g., "10.50")
      line.cost = changedValue.toString();
      line.taxAmount = round(calculatedTaxAmount).toString();
      line.costIncludetax = round(calculatedCostIncludetax).toString();

      // ✅ IMPORTANT: Keep current price unchanged, recalculate margins based on price
      // When cost changes, margins adjust based on the existing selling price
      const currentPrice = parseFloat(line.price) || 0;
      
      if (currentPrice > 0 && cost > 0) {
        // Calculate margin amount = price - cost
        const calculatedMarginAmount = currentPrice - cost;
        // Calculate margin % = (margin amount / cost) × 100
        const calculatedMarginPercent = (calculatedMarginAmount / cost) * 100;
        
        line.marginAmount = formatNumber(round(calculatedMarginAmount));
        line.margin = formatNumber(round(calculatedMarginPercent));
      }
      
      // If this is base unit cost change (index 0), update all variant unit costs and recalculate their margins
      if (index === 0) {
        for (let i = 1; i < 4; i++) {
          const variantFactor = parseFloat(updated[i]?.factor) || 1;
          const variantCost = cost * variantFactor;
          const variantTaxAmount = variantCost * (taxPercent / 100);
          const variantCostIncludeTax = variantCost + variantTaxAmount;
          
          updated[i].cost = formatNumber(round(variantCost));
          updated[i].costIncludetax = formatNumber(round(variantCostIncludeTax));
          
          // Recalculate variant margins based on variant price and new variant cost
          const variantPrice = parseFloat(updated[i]?.price) || 0;
          if (variantPrice > 0 && variantCost > 0) {
            const variantMarginAmount = variantPrice - variantCost;
            const variantMarginPercent = (variantMarginAmount / variantCost) * 100;
            
            updated[i].marginAmount = formatNumber(round(variantMarginAmount));
            updated[i].margin = formatNumber(round(variantMarginPercent));
          }
        }
      }
    }
    // CASE: Factor changed - conversion factor for variant units
    else if (changedField === "factor") {
      line.factor = changedValue;
      
      // Update variant unit costs when factor changes
      if (index > 0) {
        const baseCost = parseFloat(updated[0]?.cost) || 0;
        const baseCostIncludeTax = parseFloat(updated[0]?.costIncludetax) || 0;
        const factor = parseFloat(changedValue) || 1;
        
        const variantCost = baseCost * factor;
        const variantCostIncludeTax = baseCostIncludeTax * factor;
        
        line.cost = formatNumber(round(variantCost));
        line.costIncludetax = formatNumber(round(variantCostIncludeTax));
        
        // Recalculate variant margins based on price and new cost - keep price unchanged
        const variantPrice = parseFloat(line.price) || 0;
        
        if (variantPrice > 0 && variantCost > 0) {
          // Calculate margin amount = price - cost
          const variantMarginAmount = variantPrice - variantCost;
          // Calculate margin % = (margin amount / cost) × 100
          const variantMarginPercent = (variantMarginAmount / variantCost) * 100;
          
          line.marginAmount = formatNumber(round(variantMarginAmount));
          line.margin = formatNumber(round(variantMarginPercent));
        }
      }
    }
    // Simple field updates - barcode and taxAmount (no complex calculations)
    else if (changedField === "barcode") {
      line.barcode = changedValue;
    } else if (changedField === "taxAmount") {
      line.taxAmount = changedValue;
    }

    // Always recalculate and update taxAmount based on final price (after all other calculations)
    const finalPrice = parseFloat(line.price) || 0;
    if (finalPrice > 0 && taxPercent > 0) {
      const calculatedTaxOnPrice = includeTaxInPrice
        ? ((finalPrice * taxPercent) / (100 + taxPercent))
        : (finalPrice * taxPercent / 100);
      line.taxAmount = round(calculatedTaxOnPrice).toString();
    } else if (finalPrice === 0 || taxPercent === 0) {
      line.taxAmount = "0";
    }

    setPricingLines(updated);

    // Also update newProduct unitVariants
    // ✅ FIX: Guard check for unitVariants - initialize if not an array
    const updatedVariants = Array.isArray(newProduct.unitVariants) 
      ? [...newProduct.unitVariants] 
      : [{}, {}, {}, {}]; // Initialize with 4 empty objects for base + 3 variants
    if (!updatedVariants[index]) {
      updatedVariants[index] = {
        unit: "",
        factor: "",
        cost: "",
        margin: "",
        marginAmount: "",
        taxAmount: "",
        price: "",
        barcode: "",
        action: "",
      };
    }
    updatedVariants[index] = { ...line };
    
    // If base unit cost was updated, also sync all variant costs and recalculated margins
    // ✅ NOTE: Price is NOT synced because we keep price unchanged when cost changes
    if (index === 0 && changedField === "cost") {
      for (let i = 1; i < 4; i++) {
        if (!updatedVariants[i]) {
          updatedVariants[i] = {};
        }
        updatedVariants[i].cost = updated[i].cost;
        updatedVariants[i].costIncludetax = updated[i].costIncludetax;
        updatedVariants[i].marginAmount = updated[i].marginAmount;
        updatedVariants[i].margin = updated[i].margin;
        // ❌ Price NOT synced - we keep selling prices unchanged when cost changes
      }
    }
    
    // If variant factor was updated, also sync cost and margin changes
    // ✅ NOTE: Price is NOT synced because we keep price unchanged when factor changes
    if (index > 0 && changedField === "factor") {
      if (!updatedVariants[index]) {
        updatedVariants[index] = {};
      }
      updatedVariants[index].cost = updated[index].cost;
      updatedVariants[index].costIncludetax = updated[index].costIncludetax;
      updatedVariants[index].margin = updated[index].margin;
      updatedVariants[index].marginAmount = updated[index].marginAmount;
      // ❌ Price NOT synced - we keep selling prices unchanged when factor changes
    }
    
    setNewProduct({
      ...newProduct,
      unitVariants: updatedVariants,
    });
  }, [pricingLines, newProduct, round, formatNumber]);

  // Handle Tax Selection
  const handleTaxSelectionAndRecalculation = useCallback((taxId, newTaxPercent) => {
    const selectedTax = filteredTaxes.find((t) => t._id === taxId);
    if (!selectedTax) {
      showToast('error', "Tax not found");
      return;
    }

    const updatedProduct = {
      ...newProduct,
      taxType: taxId,
      taxTypeName: selectedTax.taxName || "",
      taxPercent: newTaxPercent,
    };

    const taxPercent = parseFloat(newTaxPercent) || 0;
    const includeTaxInPrice = updatedProduct.taxInPrice || false;

    const updatedLines = pricingLines.map((line) => {
      const updatedLine = { ...line };
      const price = parseFloat(line.price) || 0;
      const cost = parseFloat(line.cost) || 0;

      let basePriceForMargin = price;
      if (includeTaxInPrice && taxPercent > 0) {
        const taxMultiplier = 1 + taxPercent / 100;
        basePriceForMargin = price / taxMultiplier;
      }

      const calculatedMarginAmount = basePriceForMargin - cost;
      const calculatedMarginPercent = cost > 0 ? (calculatedMarginAmount / cost) * 100 : 0;

      let calculatedTaxAmount = 0;
      if (taxPercent > 0 && price > 0) {
        if (includeTaxInPrice) {
          calculatedTaxAmount = round((price * taxPercent) / (100 + taxPercent));
        } else {
          calculatedTaxAmount = round(price * (taxPercent / 100));
        }
      }

      const costTaxAmount = cost > 0 && taxPercent > 0 ? round(cost * (taxPercent / 100)) : 0;
      const costIncludetax = cost > 0 ? round(cost + costTaxAmount) : 0;

      updatedLine.margin = round(calculatedMarginPercent).toString();
      updatedLine.marginAmount = round(calculatedMarginAmount).toString();
      updatedLine.taxAmount = calculatedTaxAmount.toString();
      updatedLine.costIncludetax = costIncludetax.toString();

      return updatedLine;
    });

    setPricingLines(updatedLines);
    setNewProduct(updatedProduct);
  }, [pricingLines, newProduct, filteredTaxes, round]);

  // Generate Barcode on Server
  const handleGenerateBarcodeOnServer = useCallback(async (index) => {
    try {
      const deptId = newProduct.categoryId && typeof newProduct.categoryId === "object" && newProduct.categoryId !== null
        ? newProduct.categoryId._id
        : newProduct.categoryId;
      
      if (!deptId) {
        showToast('error', "Select department before generating barcode");
        return;
      }

      const deptIndex = departments.findIndex((d) => d._id === deptId);
      const deptCode = String(Math.max(deptIndex + 1, 1)).padStart(2, "0");
      const pricingLevelIndex = String(index).padStart(1, "0").slice(0, 1);
      const randomDigits = String(Math.floor(Math.random() * 10000000)).padStart(7, "0");
      const baseBarcode = (deptCode + pricingLevelIndex + randomDigits).slice(0, 10).padEnd(10, "0").replace(/[^0-9]/g, "");

      const result = await productAPI.generateBarcodeOnServer(
        baseBarcode,
        "",
        deptId,
        `system-${navigator.userAgent.slice(0, 20)}`
      );

      const queueId = result.queueId;
      const generatedBarcode = result.barcode;

      setNewProduct({ ...newProduct, barcode: generatedBarcode, barcodeQueueId: queueId });
      setPricingLines((prev) => {
        const updated = [...prev];
        if (updated[index]) {
          updated[index].barcode = generatedBarcode;
        }
        return updated;
      });

      showToast('success', `Barcode generated: ${generatedBarcode}`);
    } catch (error) {
      showToast('error', error.response?.data?.message || "Failed to generate barcode on server");
    }
  }, [newProduct, departments, pricingLines, productAPI]);

  // Handle Bar code Print
  const handleBarcodePrint = useCallback(() => {
    // Check both main product barcode and pricing lines barcodes
    const hasBarcodeInProduct = !!newProduct.barcode;
    const hasBarcodeInPricingLines = pricingLines.some((line) => line?.barcode);
    
    if (!hasBarcodeInProduct && !hasBarcodeInPricingLines) {
      showToast('error', "Please enter or generate a barcode first");
      return;
    }
    setShowBarcodePrintPopup(true);
  }, [newProduct.barcode, pricingLines]);

  // Handle Category Change
  const handleCategoryChange = useCallback((categoryId) => {
    setNewProduct({
      ...newProduct,
      categoryId,
      groupingId: "",
      brandId: "",
    });

    if (categoryId) {
      const subs = groupings.filter((g) => g.parentId?._id === categoryId);
      setSubdepartments(subs);
    } else {
      setSubdepartments([]);
    }
    setBrands([]);
  }, [newProduct, groupings]);

  // Handle Sub-Department Change
  const handleSubdepartmentChange = useCallback((groupingId) => {
    setNewProduct({
      ...newProduct,
      groupingId,
      brandId: "",
    });

    if (groupingId) {
      const filteredBrands = groupings.filter((g) => g.parentId?._id === groupingId);
      setBrands(filteredBrands);
    } else {
      setBrands([]);
    }
  }, [newProduct, groupings]);

  // Get barcodes organized by pricing line level
  const getBarcodesByLevel = () => {
    const levels = [[], [], [], []];
    barcodeVariants.forEach((variant) => {
      pricingLines.forEach((line, index) => {
        if (line.unit === variant.unit && index < 4) {
          levels[index].push(variant.barcode);
        }
      });
    });
    return levels;
  };

  // Remove barcode variant
  const removeBarcodeVariant = (id) => {
    setBarcodeVariants(barcodeVariants.filter((v) => v.id !== id));
  };

  // Add barcode for selected unit
  const addBarcodeForSelectedUnit = (unitId, barcode) => {
    if (!barcode.trim()) {
      showToast('error', "Please enter a barcode");
      return;
    }

    const barcodeExists = barcodeVariants.some(v => v.barcode.trim() === barcode.trim());
    if (barcodeExists) {
      showToast('error', "This barcode already exists in another unit variant. Barcodes must be unique per product");
      return;
    }

    const newVariant = {
      id: Date.now(),
      unit: unitId,
      barcode: barcode.trim(),
    };

    setBarcodeVariants([...barcodeVariants, newVariant]);
    showToast('success', "Barcode added successfully");
  };

  // Handle HSN Selection (India-specific)
  const handleHSNSelection = useCallback((hsnCode) => {
    const selectedHSN = hsnCodes.find((hsn) => hsn.code === hsnCode);

    let updatedProduct = {
      ...newProduct,
      hsn: hsnCode,
    };

    if (selectedHSN && isIndiaCompany) {
      const gstRate = selectedHSN.gstRate || 0;
      updatedProduct = {
        ...updatedProduct,
        taxType: `GST ${gstRate}%`,
        taxPercent: gstRate,
      };

      if (updatedProduct.cost) {
        const taxAmount = (parseFloat(updatedProduct.cost) * gstRate) / 100;
        updatedProduct.taxAmount = round(taxAmount).toString();
      }
    }

    setNewProduct(updatedProduct);
  }, [newProduct, hsnCodes, isIndiaCompany, round]);

  // Open Grouping Modal for creating Department/SubDept/Brand
  const openGroupingModal = (level, parentId = null) => {
    setGroupingModalLevel(level);
    setGroupingModalParentId(parentId || "");
    setIsGroupingModalOpen(true);
  };

  // Close Grouping Modal
  const closeGroupingModal = () => {
    setIsGroupingModalOpen(false);
    setGroupingModalLevel("");
    setGroupingModalParentId("");
  };

  // Handle Grouping Save
  const handleSaveGrouping = async (groupingData) => {
    setLoading(true);
    try {
      const createdGrouping = await productAPI.createGrouping(groupingData);

      if (createdGrouping) {
        setGroupings([...groupings, createdGrouping]);

        if (groupingModalLevel === "1") {
          setDepartments([...departments, createdGrouping]);
          
          // Auto-select the newly created department
          setNewProduct((prev) => ({
            ...prev,
            categoryId: createdGrouping._id,
            groupingId: "", // Clear subdepartment when department changes
          }));
          
          if (basicInfoTabRef.current) {
            basicInfoTabRef.current.setDepartmentSearchValue(createdGrouping.name);
          }
          
          setBrands([]);
        } else if (groupingModalLevel === "2") {
          // Auto-select the newly created subdepartment
          setNewProduct((prev) => ({
            ...prev,
            groupingId: createdGrouping._id,
          }));
          
          if (basicInfoTabRef.current) {
            basicInfoTabRef.current.setSubdepartmentSearchValue(createdGrouping.name);
          }
          
          // ✅ Update subdepartments list with the newly created subdepartment
          setSubdepartments((prev) => [...prev, createdGrouping]);
          
          const parentId = createdGrouping.parentId?._id;
          const filteredBrands = groupings.filter((g) => g.parentId?._id === parentId);
          setBrands(filteredBrands);
        } else if (groupingModalLevel === "3") {
          if (basicInfoTabRef.current) {
            basicInfoTabRef.current.setBrandSearchValue(createdGrouping.name);
          }
          
          const parentId = createdGrouping.parentId?._id;
          const filteredBrands = groupings.filter((g) => g.parentId?._id === parentId);
          setBrands([...filteredBrands, createdGrouping]);

          setNewProduct((prev) => ({
            ...prev,
            brandId: createdGrouping._id,
          }));
        }

        closeGroupingModal();
      }
    } catch (err) {
      console.error("Error saving grouping:", err);
    } finally {
      setLoading(false);
    }
  };

  // Open Vendor Modal
  const openVendorModal = () => {
    setSelectedVendor(null); // Create new vendor
    setIsVendorModalOpen(true);
  };

  // Close Vendor Modal
  const closeVendorModal = () => {
    setIsVendorModalOpen(false);
    setSelectedVendor(null);
  };

  // Handle Vendor Form Success (create or update)
  const handleVendorFormSuccess = async () => {
    // Refresh vendors list
    const updatedVendors = await productAPI.fetchVendors();
    setVendors(updatedVendors);

    // Clear vendor search to refresh dropdown
    if (basicInfoTabRef.current) {
      basicInfoTabRef.current.clearVendorSearch();
    }

    closeVendorModal();
  };

  // Sync checked rows from BasicInfoTab to selectedPricingLines
  const handleCheckedRowsChange = useCallback((checkedRows) => {
    const selected = new Set();
    selected.add(0);
    for (let i = 1; i < checkedRows.length; i++) {
      if (checkedRows[i]) {
        selected.add(i);
      }
    }
    setSelectedPricingLines(selected);
  }, [setSelectedPricingLines]);

  // Open Pricing Levels Modal
  const openPricingLevelModal = (index) => {
    const selectedUnit = pricingLines[index];
    if (!selectedUnit || !selectedUnit.unit) {
      showToast('error', "Please select a unit first");
      return;
    }

    const unitObj = units.find((u) => String(u._id) === String(selectedUnit.unit));
    if (!unitObj) {
      showToast('error', "Unit not found");
      return;
    }

    const levelData = newProduct.pricingLevels && String(index) in newProduct.pricingLevels 
      ? newProduct.pricingLevels[index]
      : newProduct.pricingLevels && index in newProduct.pricingLevels
        ? newProduct.pricingLevels[index]
        : null;

    if (levelData && typeof levelData === 'object') {
      setPricingLevels({
        level1: levelData.level1 !== null && levelData.level1 !== undefined ? levelData.level1 : "",
        level2: levelData.level2 !== null && levelData.level2 !== undefined ? levelData.level2 : "",
        level3: levelData.level3 !== null && levelData.level3 !== undefined ? levelData.level3 : "",
        level4: levelData.level4 !== null && levelData.level4 !== undefined ? levelData.level4 : "",
        level5: levelData.level5 !== null && levelData.level5 !== undefined ? levelData.level5 : "",
      });
    } else {
      setPricingLevels({
        level1: "",
        level2: "",
        level3: "",
        level4: "",
        level5: "",
      });
    }

    setSelectedUnitForCustomerPricing({
      unit: selectedUnit.unit,
      index,
      unitName: unitObj.unitName,
    });
    setIsCustomerPricingModalOpen(true);
  };

  // ✅ COMPLETE VALIDATION - Matches Product.jsx exactly
  const validateProduct = () => {
    const newErrors = {};

    // Check barcode from pricingLines (base row at index 0)
    const baseBarcode = pricingLines[0]?.barcode;
    const baseCost = pricingLines[0]?.cost;
    const basePrice = pricingLines[0]?.price;
    const baseUnit = pricingLines[0]?.unit; // ✅ Check unit is selected
    const baseFactor = pricingLines[0]?.factor; // Base unit factor (always 1, defaults if empty)
    
    // For base unit (index 0), factor should be 1 or empty (we treat empty as 1)
    const isBaseFactorValid =
      !baseFactor ||
      baseFactor === 1 ||
      (baseFactor &&
        !isNaN(parseFloat(baseFactor)) &&
        parseFloat(baseFactor) === 1);

    // ✅ All pricing table fields are required
    if (!baseUnit)
      newErrors.unit = "Unit type is required (select in pricing table)";
    if (!isBaseFactorValid)
      newErrors.factor =
        "Base unit factor must be 1 (or leave empty - will default to 1)";
    if (!baseBarcode?.toString().trim())
      newErrors.barcode = "Barcode is required (from pricing table)";
    if (!newProduct.name?.trim()) newErrors.name = "Product name is required";
    if (!newProduct.vendor) newErrors.vendor = "Vendor is required";
    if (!baseCost || isNaN(parseFloat(baseCost)) || parseFloat(baseCost) <= 0)
      newErrors.cost = "Valid cost is required (in pricing table)";
    if (
      !basePrice ||
      isNaN(parseFloat(basePrice)) ||
      parseFloat(basePrice) <= 0
    )
      newErrors.price = "Valid price is required (in pricing table)";

    // Check categoryId - can be string or object with _id (REQUIRED)
    const categoryIdValue =
      typeof newProduct.categoryId === "object"
        ? newProduct.categoryId?._id
        : newProduct.categoryId;
    if (!categoryIdValue) newErrors.categoryId = "Department is required";

    // ✅ NEW: Validate scaleUnitType when isScaleItem is true
    if (newProduct.isScaleItem && !newProduct.scaleUnitType) {
      newErrors.scaleUnitType = 'Unit of measure is required when Scale Item is enabled';
    }
    
    return newErrors;
  };

  // Complete Save Handler - EXACT REPLICA from Product.jsx
  const handleSaveProduct = async () => {
    // Prevent multiple simultaneous save attempts
    if (loading) {
      return;
    }

    const validationErrors = validateProduct();

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      // Show error in centered modal dialog
      const errorList = Object.entries(validationErrors)
        .map(([field, msg]) => `• ${msg}`)
        .join("\n");
      showToast('error', errorList);
      return;
    }

    setLoading(true);

    try {
      
      // ✅ PRODUCT NAME VALIDATION & AUTO-CAPITALIZATION
      const nameValidationResult = await namingValidation.validateAndPrepareForSave(newProduct.name);
      
      if (!nameValidationResult.isValid) {
        setErrors((prev) => ({ ...prev, name: nameValidationResult.error }));
        showToast('error', nameValidationResult.error);
        setLoading(false);
        return;
      }

      // ✅ Show warning if exists (but still proceed)
      if (nameValidationResult.warning) {
        console.warn('⚠️ Name warning:', nameValidationResult.warning);
      }

      // ✅ Update product name with processed version (auto-capitalized)
      const processedProduct = {
        ...newProduct,
        name: nameValidationResult.processedName,
      };
      
      // ✅ Backend handles all uniqueness validation (itemcode + barcodes in single query)
      // Frontend only does basic structural validation (done in validateProduct())
      
      // Get selected variants for save
      const selectedVariants = pricingLines.filter(
        (_, index) => index === 0 || selectedPricingLines.has(index),
      );

      // Build selected pricing variants (only checked rows)
      let selectedVariantsForSave = [...selectedVariants];

      // Ensure all variants have a factor (default to 1 for base, required for variants)
      selectedVariantsForSave = selectedVariantsForSave.map((variant, idx) => {
        const factor = idx === 0 ? variant.factor || 1 : variant.factor;
        return {
          ...variant,
          factor:
            factor && factor !== "" ? parseFloat(factor) : idx === 0 ? 1 : "", // Convert to number if present
        };
      });

      // Apply tax logic based on taxInPrice checkbox
      const taxPercent = parseFloat(newProduct.taxPercent) || 0;

      if (!newProduct.taxInPrice && taxPercent > 0) {
        // If price does NOT include tax, add tax to the price when saving
        selectedVariantsForSave = selectedVariantsForSave.map((variant) => ({
          ...variant,
          price:
            variant.price !== undefined &&
            variant.price !== null &&
            variant.price !== ""
              ? round(
                  parseFloat(variant.price) * (1 + taxPercent / 100),
                ).toString()
              : variant.price,
        }));
      }

      // ✅ Get user info for createdBy/updatedBy
      const userData = localStorage.getItem("user");
      const currentUser = userData ? JSON.parse(userData) : null;
      const currentUsername = currentUser?.username || "Unknown User";

      // ✅ Build product data using shared utility
      const productData = buildProductForSave(
        processedProduct,
        pricingLines,
        selectedPricingLines,
        {
          round,
          isEditMode: mode === "edit",
          currentUsername,
        }
      );

      const saveResult = await productAPI.saveProduct(
        productData,
        mode === "edit" ? productData._id : null,
      );

      // ✅ Handle new response format: { product, meilisearchSync, message } or null if failed
      if (!saveResult) {
        // API call failed and already showed error toast, just return
        setLoading(false);
        return;
      }

      const savedProduct = saveResult.product;
      const meilisearchSync = saveResult.meilisearchSync;

      if (!savedProduct) {
        // Something went wrong with the save
        showToast('error', "Product save failed: No data returned from server");
        setLoading(false);
        return;
      }

      // ✅ PRODUCT SAVED SUCCESSFULLY - Continue with post-save handling
      const syncStartTime = performance.now();
        
      // ✅ IMMEDIATE: DISPATCH PRODUCT UPDATED EVENT FIRST - Non-blocking, highest priority
      // Include productId and meilisearchSync status for subscribers
      const event = new CustomEvent('productUpdated', {
        detail: { 
          product: savedProduct,
          productId: savedProduct._id,
          meilisearchSync: meilisearchSync
        }
      });
      window.dispatchEvent(event);
        
      // ✅ ASYNC NON-BLOCKING: Clear search cache in background (doesn't block UI)
      if (savedProduct.name) {
        Promise.resolve().then(() => {
          clearQueryCache(savedProduct.name);
        });
      }
        
      // ✅ Auto-retry Meilisearch sync if update failed (only for edit mode)
      if (mode === 'edit' && meilisearchSync && !meilisearchSync.success) {
        console.warn('⚠️  Meilisearch sync failed on update, attempting auto-retry...');
        
        // Wait a moment for any pending operations to complete
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Attempt re-sync
        const resyncResult = await productAPI.resyncProductToMeilisearch(savedProduct._id);
        
        if (resyncResult.success) {
          console.log(`✅ Auto-retry successful for product ${savedProduct._id}`);
        } else {
          console.warn(`⚠️  Auto-retry failed: ${resyncResult.error}`);
        }
      }
        
      // Prevent duplicate success messages by checking if we just saved this product
      if (lastSavedProductRef.current !== savedProduct._id) {
        lastSavedProductRef.current = savedProduct._id;
          
        // ✅ IMPROVED SAVE BEHAVIOR:
        // CREATE mode: Save → Fetch complete data from DB → Switch to EDIT → Keep modal OPEN
        // EDIT mode: Save → Refresh list in background → Close modal
          
        if (mode === 'create') {
          // ✅ CREATE MODE: Fetch complete product data same as EDIT mode
          try {
              // Small delay to ensure database is fully updated with auto-generated itemcode
              await new Promise(resolve => setTimeout(resolve, 500));
              
              // Fetch complete product from API (same as handleEdit in Product.jsx)
              const completeProduct = await productAPI.fetchProductById(savedProduct._id);
              
              if (!completeProduct) {
                throw new Error("Failed to fetch saved product data");
              }

              // ✅ DEBUG: Log what we got back from API
             

              showToast('success', "Product created successfully .");
              
              // ✅ Build complete product data with all fields and defaults (EXACT same as handleEdit)
              const productToEdit = {
                _id: completeProduct._id || "",
                itemcode: (completeProduct.itemcode && completeProduct.itemcode !== "Auto-generated") 
                  ? completeProduct.itemcode 
                  : (savedProduct.itemcode || ""),  // Prefer fetched itemcode, fallback to saved response
                name: completeProduct.name || "",
                shortName: completeProduct.shortName || "",
                localName: completeProduct.localName || "",
                hsn: completeProduct.hsn || "",
                categoryId: completeProduct.categoryId || "",
                groupingId: completeProduct.groupingId || "",
                brandId: completeProduct.brandId || "",
                vendor: completeProduct.vendor || "",
                unitType: completeProduct.unitType || "",
                factor: completeProduct.factor !== undefined ? completeProduct.factor : 1,
                barcode: completeProduct.barcode || "",
                stock: completeProduct.stock !== undefined ? completeProduct.stock : "",
                minStock: completeProduct.minStock || 0,
                maxStock: completeProduct.maxStock || 1000,
                reorderQuantity: completeProduct.reorderQuantity || 100,
                cost: completeProduct.cost || "",
                price: completeProduct.price || "",
                costIncludeVat: completeProduct.costIncludeVat || completeProduct.costIncludeVat || "",
                marginPercent: completeProduct.marginPercent || "",
                marginAmount: completeProduct.marginAmount || "",
                taxAmount: completeProduct.taxAmount || "",
                taxType: completeProduct.taxType || "",
                taxPercent: completeProduct.taxPercent || 0,
                gstRate: completeProduct.gstRate || 0,
                taxInPrice: completeProduct.taxInPrice !== undefined ? completeProduct.taxInPrice : false,
                trackExpiry: completeProduct.trackExpiry !== undefined ? completeProduct.trackExpiry : false,
                enablePromotion: completeProduct.enablePromotion !== undefined ? completeProduct.enablePromotion : false,
                fastMovingItem: completeProduct.fastMovingItem !== undefined ? completeProduct.fastMovingItem : false,
                isScaleItem: completeProduct.isScaleItem !== undefined ? completeProduct.isScaleItem : false,
                scaleUnitType: completeProduct.scaleUnitType || '',
                itemHold: completeProduct.itemHold !== undefined ? completeProduct.itemHold : false,
                manufacturingDate: completeProduct.manufacturingDate || null,
                expiryDate: completeProduct.expiryDate || null,
                shelfLifeDays: completeProduct.shelfLifeDays || null,
                expiryAlertDays: completeProduct.expiryAlertDays || 30,
                country: completeProduct.country || activeCountryCode,
                openingPrice: completeProduct.openingPrice || 0,
                allowOpenPrice: completeProduct.allowOpenPrice !== undefined ? completeProduct.allowOpenPrice : false,
                image: completeProduct.image || null,
                createdBy: completeProduct.createdBy || "",
                updatedBy: completeProduct.updatedBy || "",
                packingUnits: Array.isArray(completeProduct.packingUnits) ? completeProduct.packingUnits : [],
                unitVariants: Array.isArray(completeProduct.unitVariants) ? completeProduct.unitVariants : [],
                pricingLevels: completeProduct.pricingLevels && typeof completeProduct.pricingLevels === 'object' ? completeProduct.pricingLevels : {},
              };

              // Update form with complete data
              setNewProduct(productToEdit);
              
              // ✅ CRITICAL: Explicitly set itemcode to ensure UI updates (not "Auto-generated")
              // Must happen after setNewProduct to override any cached "Auto-generated" text
              await new Promise(resolve => setTimeout(resolve, 100));
              setNewProduct(prev => ({
                ...prev,
                itemcode: completeProduct.itemcode || "",  // Actual itemcode from DB
              }));
              
              // ✅ Load and rebuild pricing lines using helper function
              buildPricingLinesFromProduct(productToEdit);

              // ✅ Switch to EDIT mode so next save will update this product
              // ✅ Set flag to prevent useEffect from overwriting the data we just fetched
              setSkipProductDataRestore(true);
              updateMode('edit');
              
              // ✅ Call callback in background to refresh list (if exists)
              if (hasOnSaveCallback && onSaveCallback) {
                onSaveCallback(savedProduct);
              }
              
              // Keep modal OPEN - user can continue editing
              await new Promise(resolve => setTimeout(resolve, 500));
              lastSavedProductRef.current = null;
          } catch (fetchErr) {
              console.error("Error fetching complete product data after save:", fetchErr);
              showToast('error', "Product created but failed to reload complete data. Please refresh.");
              // Still switch to edit mode with what we have
              updateMode('edit');
          }
        } else {
          // ✅ EDIT MODE: Keep modal OPEN after save (user will close manually)
            showToast('success', "Product updated successfully!");
            
            // Update form with latest data but keep modal open
            setNewProduct(savedProduct);
            
            // Call callback directly WITHOUT closing modal
            // (notifyProductSaved closes modal, but we want to keep it open in EDIT mode)
          if (hasOnSaveCallback) {
            onSaveCallback(savedProduct);
          }
          
          // ✅ CRITICAL: Reset ref so next save attempt is properly processed
          lastSavedProductRef.current = null;
        }
      } else {
        // Product already saved, silently update state
        setNewProduct(savedProduct);
      }
    } catch (err) {
      console.error("Error saving product:", err);
      showToast('error',
        err.response?.data?.message || "Failed to save product. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  // Simple Delete Handler
  const handleDeleteProduct = () => {
    setLoading(true);
    try {
      showToast('success', "Product deleted successfully!");
      handleCloseModal();
    } catch (error) {
      showToast('error', "Failed to delete product");
    } finally {
      setLoading(false);
    }
  };

  // Handle New Product - Reset form and set Auto-generated placeholder
  const handleNewProduct = async () => {
    try {
      // ✅ NUCLEAR OPTION: Clear ALL state directly before changing mode
      // This ensures there's no lingering old data when we switch to create mode
      
      // 1. Clear form fields immediately
      setErrors({});
      setNewProduct({
        _id: "",
        itemcode: "Auto-generated",
        name: "",
        shortName: "",
        localName: "",
        hsn: "",
        categoryId: "",
        groupingId: "",
        brandId: "",
        vendor: "",
        unitType: "",
        factor: 1,
        barcode: "",
        stock: "",
        minStock: 0,
        maxStock: 1000,
        reorderQuantity: 100,
        cost: "",
        price: "",
        costIncludeVat: "",
        marginPercent: "",
        marginAmount: "",
        taxAmount: "",
        taxType: "",
        taxPercent: 0,
        gstRate: 0,
        taxInPrice: false,
        trackExpiry: false,
        enablePromotion: false,
        fastMovingItem: false,
        isScaleItem: false,
        scaleUnitType: "",
        itemHold: false,
        manufacturingDate: null,
        expiryDate: null,
        shelfLifeDays: null,
        expiryAlertDays: 30,
        country: activeCountryCode,
        openingPrice: 0,
        allowOpenPrice: false,
        image: null,
        createdBy: "",
        updatedBy: "",
        packingUnits: [],
        unitVariants: [],
        pricingLevels: {},
      });

      // 2. Reset pricing lines
      setPricingLines([
        {
          unit: "",
          factor: 1,
          cost: "",
          price: "",
          barcode: "",
          margin: "",
          marginAmount: "",
          taxAmount: "",
          costIncludetax: "",
        },
      ]);

      // 3. Reset selected pricing lines
      setSelectedPricingLines(new Set([0]));

      // 4. Reset barcode variants
      setBarcodeVariants([]);

      // 5. Reset modal-specific state
      setActiveTab("basic");
      setModalSearchQuery("");
      setModalSearchResults([]);
      setShowModalSearchResults(false);

      // 6. Reset refs to ensure no stale data
      lastSavedProductRef.current = null;
      formResetTrackerRef.current = { lastMode: null, lastIsOpen: false }; // Force reset tracker
      
      // ✅ Clear all search filters in BasicInfoTab
      if (basicInfoTabRef.current) {
        basicInfoTabRef.current.clearDepartmentSearch();
        basicInfoTabRef.current.clearSubdepartmentSearch();
        basicInfoTabRef.current.clearBrandSearch();
        basicInfoTabRef.current.clearVendorSearch();
      }
      
      // 7. Switch to CREATE mode AFTER all state is cleared
      updateMode('create');
      
      // ✅ DEBUG: Log what we're doing
      console.log("🧹 Cleared all form state for new product");
      
      showToast('success', "Ready to create new product");
    } catch (err) {
      console.error("Error preparing new product form:", err);
      showToast('error', "Failed to prepare new product form");
    }
  };

  // ✅ Search Product by Barcode or Item Code in Modal (Product.jsx integration)
  // Uses debounced search to prevent UI freeze during rapid typing
  const handleModalSearch = (query) => {
    setModalSearchQuery(query);
    setShowModalSearchResults(true); // Show dropdown immediately

    if (query.trim() === "") {
      setModalSearchResults([]);
      setShowModalSearchResults(false);
      return;
    }

    // Clear previous timer
    if (modalSearchDebounceRef.current) {
      clearTimeout(modalSearchDebounceRef.current);
    }

    // Debounce modal search (150ms for faster response)
    modalSearchDebounceRef.current = setTimeout(async () => {
      // Try local search first - ensure arrays exist
      const filteredArray = Array.isArray(filteredProducts) ? filteredProducts : [];
      const productsArray = Array.isArray(products) ? products : [];
      const searchList = filteredArray.length > 0 ? filteredArray : productsArray;
      const lowerQuery = query.toLowerCase();
      
      let results = [];
      if (Array.isArray(searchList) && searchList.length > 0) {
        results = searchList.filter(
          (prod) =>
            prod?.name?.toLowerCase().includes(lowerQuery) ||
            prod?.barcode?.toLowerCase().includes(lowerQuery) ||
            prod?.itemcode?.toLowerCase().includes(lowerQuery)
        );
      }

      console.log(`🔍 Search Results (local): ${results.length} items from searchList(${searchList.length})`);

      // If no local results and no products loaded, try API search
      if (results.length === 0 && searchList.length === 0) {
        try {
          console.log(`🔍 No local results, fetching from API...`);
          const response = await productAPI.fetchProducts(1, 100);
          if (response && response.products && Array.isArray(response.products) && response.products.length > 0) {
            results = response.products.filter(
              (prod) =>
                prod?.name?.toLowerCase().includes(lowerQuery) ||
                prod?.barcode?.toLowerCase().includes(lowerQuery) ||
                prod?.itemcode?.toLowerCase().includes(lowerQuery)
            );
            console.log(`🔍 Search Results (API): ${results.length} items`);
          }
        } catch (err) {
          console.error("❌ Search API error:", err);
        }
      }

      setModalSearchResults(results);
    }, 150);
  };

  // ✅ Populate Modal Form with Selected Product
  const handleSelectProductFromSearch = async (prod) => {
    setLoading(true);
    try {
      // Fetch complete product data (search results may have partial data)
      const completeProduct = await productAPI.fetchProductById(prod._id);
      
      if (!completeProduct) {
        showToast('error', "Failed to load product details");
        setLoading(false);
        return;
      }

      // Clear any previous validation errors
      setErrors({});
      
      // Reset to basic info tab
      setActiveTab("basic");
      
      // Set the complete product data
      setNewProduct(completeProduct);
      
      // Build pricing lines from complete product
      buildPricingLinesFromProduct(completeProduct);
      
      setModalSearchQuery("");
      setModalSearchResults([]);
      setShowModalSearchResults(false);
      updateMode('edit');
      
      // Find and set the index of the selected product
      const filteredArray = Array.isArray(filteredProducts) ? filteredProducts : [];
      const productsArray = Array.isArray(products) ? products : [];
      const productsList = filteredArray.length > 0 ? filteredArray : productsArray;
      
      if (Array.isArray(productsList) && productsList.length > 0) {
        const foundIndex = productsList.findIndex(p => p._id === prod._id);
        if (foundIndex >= 0 && setEditIndex) {
          setEditIndex(foundIndex);
        }
      }
      
      console.log(`✅ Selected product from search: ${completeProduct.name}`);
    } catch (err) {
      console.error("❌ Error selecting product:", err);
      showToast('error', "Failed to load product");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Navigate to Next Product in Modal (Product.jsx integration)
  const handleNextProduct = () => {
    const filteredArray = Array.isArray(filteredProducts) ? filteredProducts : [];
    const productsArray = Array.isArray(products) ? products : [];
    const productsList = filteredArray.length > 0 ? filteredArray : productsArray;
    
    if (!Array.isArray(productsList) || productsList.length === 0) return;
    
    if (editIndex >= 0 && editIndex < productsList.length - 1) {
      const nextProd = productsList[editIndex + 1];
      setNewProduct(nextProd);
      if (setEditIndex) {
        setEditIndex(editIndex + 1);
      }
    } else if (editIndex === productsList.length - 1) {
      // If at last product, reset to create mode for new product
      handleNewProduct();
    }
  };

  // ✅ Navigate to Previous Product in Modal (Product.jsx integration)
  const handlePrevProduct = () => {
    const filteredArray = Array.isArray(filteredProducts) ? filteredProducts : [];
    const productsArray = Array.isArray(products) ? products : [];
    const productsList = filteredArray.length > 0 ? filteredArray : productsArray;
    
    if (!Array.isArray(productsList) || productsList.length === 0) return;
    
    if (editIndex > 0) {
      const prevProd = productsList[editIndex - 1];
      setNewProduct(prevProd);
      if (setEditIndex) {
        setEditIndex(editIndex - 1);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleCloseModal}
      width="max-w-5xl lg:max-w-6xl"
      draggable={true}
      zIndex={60}
    >
      {/* ✅ Loading Overlay while Reference Data is Fetching */}
      {loadingReferenceData && (
        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center rounded-lg z-50">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
            <p className="text-gray-700 font-semibold">Loading tax & vendor data...</p>
          </div>
        </div>
      )}
      <div className="bg-white w-full h-[610px] rounded-lg flex flex-col overflow-hidden" style={{ opacity: loadingReferenceData ? 0.5 : 1, pointerEvents: loadingReferenceData ? 'none' : 'auto' }}>
        {/* ✅ Complete Header with Title, Search & Navigation in Drag Handle */}
        <div className="modal-drag-handle flex items-center gap-2 pb-2 border-b border-gray-200 pr-10 cursor-move select-none flex-shrink-0">
          {/* Left: Title */}
          <h2 className="text-base lg:text-lg font-semibold whitespace-nowrap flex-shrink-0">
            {mode === "edit" ? "✏️ Update Product" : "➕ Add New Product"}
          </h2>

          {/* Spacer */}
          <div className="flex-1"></div>

          {/* Right: Quick Search */}
          <div className="relative pt-1  w-72 flex-shrink-0 pointer-events-auto" ref={searchInputRef}>
            <input
              type="text"
              placeholder="🔍 Name, Code or Barcode..."
              className="w-full border  border-blue-300 p-1.5 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-blue-50"
              value={modalSearchQuery}
              onChange={(e) => handleModalSearch(e.target.value)}
              onFocus={() => setShowModalSearchResults(true)}
              onMouseDown={(e) => e.stopPropagation()}
            />

            {/* Search Results Dropdown */}
            {showModalSearchResults && modalSearchQuery && (
              <div
                className="absolute top-full left-0 right-0 mt-1 border border-gray-300 bg-white rounded shadow-lg z-50 max-h-40 overflow-y-auto pointer-events-auto"
                onMouseDown={(e) => e.stopPropagation()}
              >
                {modalSearchResults.length > 0 ? (
                  modalSearchResults.map((prod) => (
                    <button
                      key={prod._id}
                      onClick={() => handleSelectProductFromSearch(prod)}
                      className="w-full text-left px-3 py-2 hover:bg-blue-50 border-b last:border-b-0 text-xs"
                      onMouseDown={(e) => e.stopPropagation()}
                    >
                      <div className="font-semibold text-gray-800">{prod.name}</div>
                      <div className="text-gray-600 text-xs">
                        Code: {prod.itemcode} | Barcode: {prod.barcode}
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="px-3 py-2 text-xs text-gray-500 text-center">No products found</div>
                )}
              </div>
            )}
          </div>

          {/* Right: Navigation Buttons - Always show */}
          <div className="flex gap-1 items-center border-l border-gray-300 pl-2 flex-shrink-0 pointer-events-auto bg-gray-50 rounded">
            <button
              onClick={handlePrevProduct}
              className={`px-2 py-0.5 border rounded text-xs cursor-pointer font-medium ${
                editIndex <= 0
                  ? "bg-gray-200 text-gray-400 border-gray-300"
                  : "bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200"
              }`}
              onMouseDown={(e) => e.stopPropagation()}
              disabled={editIndex <= 0}
              title="Previous product"
            >
              ← Prev
            </button>

            {(() => {
              const filteredArray = Array.isArray(filteredProducts) ? filteredProducts : [];
              const productsArray = Array.isArray(products) ? products : [];
              const productsList = filteredArray.length > 0 ? filteredArray : productsArray;
              const totalCount = Array.isArray(productsList) ? productsList.length : 0;
              return (
                <span className="text-xs text-gray-700 px-2 py-0.5 bg-gray-200 rounded whitespace-nowrap">
                  {editIndex >= 0 ? editIndex + 1 : 0} / {totalCount}
                </span>
              );
            })()}

            <button
              onClick={handleNextProduct}
              className={`px-2 py-0.5 border rounded text-xs cursor-pointer font-medium ${
                (() => {
                  const filteredArray = Array.isArray(filteredProducts) ? filteredProducts : [];
                  const productsArray = Array.isArray(products) ? products : [];
                  const productsList = filteredArray.length > 0 ? filteredArray : productsArray;
                  return editIndex >= (Array.isArray(productsList) ? productsList.length - 1 : 0);
                })()
                  ? "bg-gray-200 text-gray-400 border-gray-300"
                  : "bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200"
              }`}
              onMouseDown={(e) => e.stopPropagation()}
              disabled={(() => {
                const filteredArray = Array.isArray(filteredProducts) ? filteredProducts : [];
                const productsArray = Array.isArray(products) ? products : [];
                const productsList = filteredArray.length > 0 ? filteredArray : productsArray;
                return editIndex >= (Array.isArray(productsList) ? productsList.length - 1 : 0);
              })()}
              title="Next product"
            >
              Next →
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-gray-300 bg-white overflow-x-auto flex-shrink-0">
          <button
            onClick={() => setActiveTab("basic")}
            className={`px-3 py-1 text-xs font-medium border-b-2 transition cursor-pointer whitespace-nowrap ${
              activeTab === "basic"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-600 hover:text-gray-800"
            }`}
          >
            Basic Info
          </button>
          <button
            onClick={() => setActiveTab("moreInfo")}
            className={`px-3 py-1 text-xs font-medium border-b-2 transition cursor-pointer whitespace-nowrap ${
              activeTab === "moreInfo"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-600 hover:text-gray-800"
            }`}
          >
            More Info
          </button>
          <button
            onClick={() => setActiveTab("image")}
            className={`px-3 py-1 text-xs font-medium border-b-2 transition cursor-pointer whitespace-nowrap ${
              activeTab === "image"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-600 hover:text-gray-800"
            }`}
          >
            Image
          </button>
          <button
            onClick={() => setActiveTab("batch")}
            className={`px-3 py-1 text-xs font-medium border-b-2 transition cursor-pointer whitespace-nowrap ${
              activeTab === "batch"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-600 hover:text-gray-800"
            }`}
          >
            Stock Batch
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`px-3 py-1 text-xs font-medium border-b-2 transition cursor-pointer whitespace-nowrap ${
              activeTab === "history"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-600 hover:text-gray-800"
            }`}
          >
            History
          </button>
        </div>

        {/* Tab Content */}
        <div ref={tabContentRef} className="flex-1 overflow-auto">
          {activeTab === "basic" && (
            <BasicInfoTab
              ref={basicInfoTabRef}
              newProduct={newProduct}
              setNewProduct={setNewProduct}
              errors={errors}
              setErrors={setErrors}
              loading={loading}
              isIndiaCompany={isIndiaCompany}
              hsnCodes={hsnCodes}
              loadingHsn={false}
              departments={departments}
              subdepartments={subdepartments}
              brands={brands}
              vendors={vendors}
              units={units}
              filteredTaxes={filteredTaxes}
              loadingTaxes={loadingTaxes}
              activeCountryCode={activeCountryCode}
              pricingLines={pricingLines}
              onHSNSelection={handleHSNSelection}
              onCategoryChange={handleCategoryChange}
              onSubdepartmentChange={handleSubdepartmentChange}
              onOpenGroupingModal={openGroupingModal}
              onOpenVendorModal={openVendorModal}
              onOpenPricingLevelModal={openPricingLevelModal}
              onPricingFieldChange={calculatePricingFields}
              onGenerateBarcode={handleGenerateBarcodeOnServer}
              handleTaxSelectionAndRecalculation={handleTaxSelectionAndRecalculation}
              onCheckedRowsChange={handleCheckedRowsChange}
              round={round}
              formatNumber={formatNumber}
            />
          )}

          {activeTab === "moreInfo" && (
            <MoreInfoTab 
              pricingLines={pricingLines} 
              units={units}
              barcodeVariants={barcodeVariants}
              getBarcodesByLevel={getBarcodesByLevel}
              removeBarcodeVariant={removeBarcodeVariant}
              addBarcodeForSelectedUnit={addBarcodeForSelectedUnit}
              selectedPricingLines={selectedPricingLines}
            />
          )}

          {activeTab === "image" && (
            <ImageTab loading={loading} newProduct={newProduct} setNewProduct={setNewProduct} />
          )}

          {activeTab === "batch" && (
            <StockBatchManagement
              productId={newProduct._id || ""}
              productName={newProduct.name}
            />
          )}

          {activeTab === "history" && <HistoryTab product={newProduct} />}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-1 border-t border-gray-300 flex-wrap justify-between items-center flex-shrink-0">
          <button
            onClick={handleDeleteProduct}
            className="flex items-center gap-1 bg-red-600 text-white px-2 py-1 rounded text-xs hover:bg-red-700 transition font-medium"
          >
            Delete
          </button>

          <div className="flex gap-2 flex-wrap justify-end">
            <button
              onClick={handleBarcodePrint}
              className="flex items-center gap-1 bg-purple-600 text-white px-2 py-1 rounded text-xs hover:bg-purple-700 transition font-medium"
            >
              🖨️ Print Barcode
            </button>

            <button
              onClick={handleSaveProduct}
              disabled={loading}
              className="flex items-center gap-1 bg-green-600 text-white px-2 py-1 rounded text-xs hover:bg-green-700 transition font-medium"
            >
              {loading ? "Processing..." : mode === "edit" ? "Update Product" : "Save Product"}
            </button>

            <button
              onClick={handleNewProduct}
              disabled={loading}
              className="flex items-center gap-1 bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 text-xs disabled:opacity-50 font-medium"
            >
              ➕ New Product
            </button>
          </div>
        </div>
      </div>

      {/* Modal Dialogs */}
      <BarcodePrintModal
        isOpen={showBarcodePrintPopup}
        onClose={() => setShowBarcodePrintPopup(false)}
        barcode={newProduct.barcode || ""}
        productName={newProduct.name || ""}
        pricingLines={pricingLines}
        units={units}
      />

      <VendorForm
        isOpen={isVendorModalOpen}
        onClose={closeVendorModal}
        onSuccess={handleVendorFormSuccess}
        initialData={selectedVendor}
      />

      <GroupingModal
        isOpen={isGroupingModalOpen}
        onClose={closeGroupingModal}
        level={groupingModalLevel}
        parentId={groupingModalParentId}
        onSaveGrouping={handleSaveGrouping}
        isLoading={loading}
        levelLabel={
          groupingModalLevel === "1"
            ? "Department"
            : groupingModalLevel === "2"
            ? "Sub-Department"
            : "Brand"
        }
      />

      {/* ✅ PRICING LEVELS MODAL (Level 2, 3, 4, 5) - DRAGGABLE */}
      <Modal
        isOpen={isCustomerPricingModalOpen}
        onClose={() => {
          setIsCustomerPricingModalOpen(false);
          setSelectedUnitForCustomerPricing(null);
        }}
        title={`⚙️ Pricing Levels - ${selectedUnitForCustomerPricing?.unitName || "Unit"}`}
        width="max-w-2xl"
        draggable={true}
        zIndex={70}
      >
        <div className="space-y-3">
          {/* Pricing Levels Grid - Level 2, 3, 4, 5 only */}
          <div className="grid grid-cols-2 gap-3">
            {/* Level 2 */}
            <div className="border-2 border-green-300 rounded-lg p-3 bg-green-50 hover:shadow-md transition">
              <div className="flex items-center gap-2 mb-2">
                <span className="bg-green-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">
                  2
                </span>
                <label className="text-xs font-bold text-gray-800">
                  Level 2
                </label>
              </div>
              <input
                type="text"
                placeholder="e.g., 95"
                className="w-full border-2 border-green-300 rounded px-2 h-8 text-xs font-semibold focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-200"
                value={(() => {
                  const val = pricingLevels.level2;
                  if (focusedPricingLevel === "level2") return val ?? "";
                  return val && !isNaN(parseFloat(val)) ? formatNumber(parseFloat(val)) : (val ?? "");
                })()}
                onFocus={() => setFocusedPricingLevel("level2")}
                onChange={(e) =>
                  setPricingLevels({
                    ...pricingLevels,
                    level2: e.target.value,
                  })
                }
                onBlur={(e) => {
                  setFocusedPricingLevel(null);
                  const value = parseFloat(e.target.value);
                  if (!isNaN(value) && value !== "") {
                    const formattedValue = formatNumber(value);
                    setPricingLevels({
                      ...pricingLevels,
                      level2: formattedValue,
                    });
                  }
                }}
              />
              <p className="text-xs text-gray-600 mt-1">🏭 Wholesale A</p>
            </div>

            {/* Level 3 */}
            <div className="border-2 border-yellow-300 rounded-lg p-3 bg-yellow-50 hover:shadow-md transition">
              <div className="flex items-center gap-2 mb-2">
                <span className="bg-yellow-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">
                  3
                </span>
                <label className="text-xs font-bold text-gray-800">
                  Level 3
                </label>
              </div>
              <input
                type="text"
                placeholder="e.g., 90"
                className="w-full border-2 border-yellow-300 rounded px-2 h-8 text-xs font-semibold focus:outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200"
                value={(() => {
                  const val = pricingLevels.level3;
                  if (focusedPricingLevel === "level3") return val ?? "";
                  return val && !isNaN(parseFloat(val)) ? formatNumber(parseFloat(val)) : (val ?? "");
                })()}
                onFocus={() => setFocusedPricingLevel("level3")}
                onChange={(e) =>
                  setPricingLevels({
                    ...pricingLevels,
                    level3: e.target.value,
                  })
                }
                onBlur={(e) => {
                  setFocusedPricingLevel(null);
                  const value = parseFloat(e.target.value);
                  if (!isNaN(value) && value !== "") {
                    const formattedValue = formatNumber(value);
                    setPricingLevels({
                      ...pricingLevels,
                      level3: formattedValue,
                    });
                  }
                }}
              />
              <p className="text-xs text-gray-600 mt-1">🏢 Wholesale B</p>
            </div>

            {/* Level 4 */}
            <div className="border-2 border-purple-300 rounded-lg p-3 bg-purple-50 hover:shadow-md transition">
              <div className="flex items-center gap-2 mb-2">
                <span className="bg-purple-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">
                  4
                </span>
                <label className="text-xs font-bold text-gray-800">
                  Level 4
                </label>
              </div>
              <input
                type="text"
                placeholder="e.g., 85"
                className="w-full border-2 border-purple-300 rounded px-2 h-8 text-xs font-semibold focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200"
                value={(() => {
                  const val = pricingLevels.level4;
                  if (focusedPricingLevel === "level4") return val ?? "";
                  return val && !isNaN(parseFloat(val)) ? formatNumber(parseFloat(val)) : (val ?? "");
                })()}
                onFocus={() => setFocusedPricingLevel("level4")}
                onChange={(e) =>
                  setPricingLevels({
                    ...pricingLevels,
                    level4: e.target.value,
                  })
                }
                onBlur={(e) => {
                  setFocusedPricingLevel(null);
                  const value = parseFloat(e.target.value);
                  if (!isNaN(value) && value !== "") {
                    const formattedValue = formatNumber(value);
                    setPricingLevels({
                      ...pricingLevels,
                      level4: formattedValue,
                    });
                  }
                }}
              />
              <p className="text-xs text-gray-600 mt-1">🏛️ Corporate</p>
            </div>

            {/* Level 5 */}
            <div className="border-2 border-red-300 rounded-lg p-3 bg-red-50 hover:shadow-md transition">
              <div className="flex items-center gap-2 mb-2">
                <span className="bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">
                  5
                </span>
                <label className="text-xs font-bold text-gray-800">
                  Level 5
                </label>
              </div>
              <input
                type="text"
                placeholder="e.g., 75"
                className="w-full border-2 border-red-300 rounded px-2 h-8 text-xs font-semibold focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-200"
                value={(() => {
                  const val = pricingLevels.level5;
                  if (focusedPricingLevel === "level5") return val ?? "";
                  return val && !isNaN(parseFloat(val)) ? formatNumber(parseFloat(val)) : (val ?? "");
                })()}
                onFocus={() => setFocusedPricingLevel("level5")}
                onChange={(e) =>
                  setPricingLevels({
                    ...pricingLevels,
                    level5: e.target.value,
                  })
                }
                onBlur={(e) => {
                  setFocusedPricingLevel(null);
                  const value = parseFloat(e.target.value);
                  if (!isNaN(value) && value !== "") {
                    const formattedValue = formatNumber(value);
                    setPricingLevels({
                      ...pricingLevels,
                      level5: formattedValue,
                    });
                  }
                }}
              />
              <p className="text-xs text-gray-600 mt-1">🚚 Distributor</p>
            </div>
          </div>

          {/* Price Summary */}
          {(pricingLevels.level2 ||
            pricingLevels.level3 ||
            pricingLevels.level4 ||
            pricingLevels.level5) && (
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 border-2 border-gray-300 rounded-lg p-3 mt-3">
              <h4 className="text-xs font-bold text-gray-800 mb-2">
                💰 Price Summary
              </h4>
              <div className="grid grid-cols-4 gap-2">
                {pricingLevels.level2 && (
                  <div className="bg-green-100 border border-green-300 rounded p-2 text-center">
                    <p className="text-xs text-gray-600">Level 2</p>
                    <p className="font-bold text-xs text-green-700">
                      {formatNumber(parseFloat(pricingLevels.level2)) || pricingLevels.level2}
                    </p>
                  </div>
                )}
                {pricingLevels.level3 && (
                  <div className="bg-yellow-100 border border-yellow-300 rounded p-2 text-center">
                    <p className="text-xs text-gray-600">Level 3</p>
                    <p className="font-bold text-xs text-yellow-700">
                      {formatNumber(parseFloat(pricingLevels.level3)) || pricingLevels.level3}
                    </p>
                  </div>
                )}
                {pricingLevels.level4 && (
                  <div className="bg-purple-100 border border-purple-300 rounded p-2 text-center">
                    <p className="text-xs text-gray-600">Level 4</p>
                    <p className="font-bold text-xs text-purple-700">
                      {formatNumber(parseFloat(pricingLevels.level4)) || pricingLevels.level4}
                    </p>
                  </div>
                )}
                {pricingLevels.level5 && (
                  <div className="bg-red-100 border border-red-300 rounded p-2 text-center">
                    <p className="text-xs text-gray-600">Level 5</p>
                    <p className="font-bold text-xs text-red-700">
                      {formatNumber(parseFloat(pricingLevels.level5)) || pricingLevels.level5}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Unit Wise Price Details */}
          <div className="bg-gray-50 border-2 border-gray-300 rounded-lg p-3 mt-3">
            <h4 className="text-xs font-bold text-gray-800 mb-3">
              📦 Unit Wise Price Details
            </h4>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {pricingLines && pricingLines.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-xs">
                    <thead>
                      <tr className="bg-gray-200 border border-gray-300">
                        <th className="border border-gray-300 px-2 py-1 text-left font-bold">Unit</th>
                        <th className="border border-gray-300 px-2 py-1 text-center font-bold">📦 Barcode</th>
                        <th className="border border-gray-300 px-2 py-1 text-center font-bold">Price</th>
                        <th className="border border-gray-300 px-2 py-1 text-center font-bold">Cost</th>
                        <th className="border border-gray-300 px-2 py-1 text-center font-bold">Lv2</th>
                        <th className="border border-gray-300 px-2 py-1 text-center font-bold">Lv3</th>
                        <th className="border border-gray-300 px-2 py-1 text-center font-bold">Lv4</th>
                        <th className="border border-gray-300 px-2 py-1 text-center font-bold">Lv5</th>
                        <th className="border border-gray-300 px-2 py-1 text-center font-bold">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pricingLines.map((line, idx) => {
                        const unitPricingLevels = newProduct.pricingLevels?.[idx] || {};
                        const hasLevels = unitPricingLevels.level2 || unitPricingLevels.level3 || unitPricingLevels.level4 || unitPricingLevels.level5;
                        
                        return (
                          <tr
                            key={idx}
                            className={`border border-gray-300 ${
                              idx === selectedUnitForCustomerPricing?.index
                                ? "bg-blue-100 border-blue-400"
                                : idx % 2 === 0
                                ? "bg-white"
                                : "bg-gray-100"
                            }`}
                          >
                            <td className="border border-gray-300 px-2 py-1 font-semibold text-gray-800">
                              {units?.find(u => String(u._id) === String(line.unit))?.unitName || line.unit}
                              {idx === selectedUnitForCustomerPricing?.index && (
                                <span className="ml-1 bg-blue-600 text-white px-1 rounded text-xs">●</span>
                              )}
                            </td>
                            <td className="border border-gray-300 px-2 py-1 text-center bg-blue-50">
                              <span className="font-mono text-blue-700 font-bold text-xs">
                                {line.barcode ? (
                                  <>
                                    {line.barcode.substring(0, 14)}
                                    {line.barcode.length > 14 && (
                                      <div className="text-xs text-gray-600">
                                        {line.barcode.substring(14)}
                                      </div>
                                    )}
                                  </>
                                ) : (
                                  <span className="text-gray-400">—</span>
                                )}
                              </span>
                            </td>
                            <td className="border border-gray-300 px-2 py-1 text-center text-blue-700 font-bold">
                              {line.price ? formatNumber(parseFloat(line.price)) : "—"}
                            </td>
                            <td className="border border-gray-300 px-2 py-1 text-center text-gray-700">
                              {line.cost ? formatNumber(parseFloat(line.cost)) : "—"}
                            </td>
                            <td className="border border-gray-300 px-2 py-1 text-center bg-green-50">
                              {unitPricingLevels.level2 ? (
                                <span className="font-semibold text-green-700">{formatNumber(parseFloat(unitPricingLevels.level2))}</span>
                              ) : (
                                <span className="text-gray-400">—</span>
                              )}
                            </td>
                            <td className="border border-gray-300 px-2 py-1 text-center bg-yellow-50">
                              {unitPricingLevels.level3 ? (
                                <span className="font-semibold text-yellow-700">{formatNumber(parseFloat(unitPricingLevels.level3))}</span>
                              ) : (
                                <span className="text-gray-400">—</span>
                              )}
                            </td>
                            <td className="border border-gray-300 px-2 py-1 text-center bg-purple-50">
                              {unitPricingLevels.level4 ? (
                                <span className="font-semibold text-purple-700">{formatNumber(parseFloat(unitPricingLevels.level4))}</span>
                              ) : (
                                <span className="text-gray-400">—</span>
                              )}
                            </td>
                            <td className="border border-gray-300 px-2 py-1 text-center bg-red-50">
                              {unitPricingLevels.level5 ? (
                                <span className="font-semibold text-red-700">{formatNumber(parseFloat(unitPricingLevels.level5))}</span>
                              ) : (
                                <span className="text-gray-400">—</span>
                              )}
                            </td>
                            <td className="border border-gray-300 px-2 py-1 text-center">
                              {hasLevels ? (
                                <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs font-semibold">
                                  ✓
                                </span>
                              ) : (
                                <span className="bg-gray-200 text-gray-600 px-2 py-0.5 rounded text-xs font-semibold">
                                  ○
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-500 text-center py-2">
                  No pricing lines available
                </p>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Lv2=Wholesale A | Lv3=Wholesale B | Lv4=Corporate | Lv5=Distributor 
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 mt-4 pt-3 border-t">
            <button
              onClick={() => {
                // Validate at least one level is filled (Level 2-5)
                if (
                  !pricingLevels.level2 &&
                  !pricingLevels.level3 &&
                  !pricingLevels.level4 &&
                  !pricingLevels.level5
                ) {
                  showToast('error', "Please enter at least one pricing level");
                  return;
                }

                // Save pricing levels to newProduct
                const updated = { ...newProduct };
                if (!updated.pricingLevels) {
                  updated.pricingLevels = {};
                }
                if (selectedUnitForCustomerPricing) {
                  updated.pricingLevels[selectedUnitForCustomerPricing.index] =
                    pricingLevels;
                  console.log(`✅ Saved pricing levels for unit ${selectedUnitForCustomerPricing.index}:`, pricingLevels);
                }
                setNewProduct(updated);
                setIsCustomerPricingModalOpen(false);
                setSelectedUnitForCustomerPricing(null);
                // ✅ Reset pricing levels state after saving
                setPricingLevels({
                  level1: "",
                  level2: "",
                  level3: "",
                  level4: "",
                  level5: "",
                });
                showToast('success', "Pricing levels saved");
              }}
              className="flex-1 bg-gradient-to-r from-green-600 to-green-700 text-white px-3 py-2 rounded-lg hover:from-green-700 hover:to-green-800 font-semibold text-xs shadow-lg hover:shadow-xl transition"
            >
              ✓ Save
            </button>
            <button
              onClick={() => {
                setIsCustomerPricingModalOpen(false);
                setSelectedUnitForCustomerPricing(null);
                // ✅ Reset pricing levels state when canceling
                setPricingLevels({
                  level1: "",
                  level2: "",
                  level3: "",
                  level4: "",
                  level5: "",
                });
              }}
              className="flex-1 bg-gray-300 text-gray-800 px-3 py-2 rounded-lg hover:bg-gray-400 font-semibold text-xs transition"
            >
              ✕ Cancel
            </button>
          </div>
        </div>
      </Modal>
    </Modal>
  );
};

export default GlobalProductFormModal;


