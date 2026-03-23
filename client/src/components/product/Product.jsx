import React, { useEffect, useState, useRef, useCallback, useContext } from "react";
import { toast, Toaster } from "react-hot-toast";

import Modal from "../shared/Model";
import {
  Search,
  Plus,
  AlertCircle,
  Download,
  Printer,
  Filter,
  X,
  Edit,
} from "lucide-react";
import VirtualizedProductTable from "../shared/ui/VirtualizedProductTable";
import { useInfiniteScroll } from "../../hooks/useInfiniteScroll";
import { ProductFormContext } from "../../context/ProductFormContext";
import axios from "axios";
import { API_URL } from "../../config/config";
import useDecimalFormat from "../../hooks/useDecimalFormat";
import { useTaxMaster } from "../../hooks/useTaxMaster";
import StockBatchManagement from "./StockBatchManagement";

// ✅ Custom hooks for refactored component structure
import { useProductForm } from "../shared/sample/useProductForm";
import { useProductFilters } from "../shared/sample/useProductFilters";
import { useProductAPI } from "../shared/sample/useProductAPI";
import { useProductSearch } from "../../hooks/useProductSearch";
import { useProductCreateUpdate } from "../../hooks/useProductCreateUpdate";

// ✅ Extracted Modal Components (from shared folder - not local)
import GlobalBarcodePrintModal from "../modals/GlobalBarcodePrintModal";
import VendorForm from "../forms/VendorForm";
import GroupingModal from "../shared/model/GroupingModal";

// ✅ Extracted Tab Components (from shared folder - not local)
import BasicInfoTab from "../shared/tabs/BasicInfoTab";
import MoreInfoTab from "../shared/tabs/MoreInfoTab";
import ImageTab from "../shared/tabs/ImageTab";
import HistoryTab from "../shared/tabs/HistoryTab";

// ✅ Utility Functions (Industrial Standard - Easy Debugging & Performance)
import { debugLogger } from "../../utils/debugLogger";
import {
  generateBarcode,
} from "../../utils/barcodeUtils";
import {
  createEmptyPricingLine,
} from "../../utils/pricingUtils";

const Product = () => {
  // ✅ Get GlobalProductFormModal context
  const { openProductForm } = useContext(ProductFormContext);

  // Get form state management (newProduct, setPricingLines, errors, validation methods)
  const productAPI = useProductAPI();
  const productForm = useProductForm();
  const productFilters = useProductFilters();

  // Destructure form methods for easy access
  const {
    newProduct,
    setNewProduct,
    pricingLines,
    setPricingLines,
    barcodeVariants,
    setBarcodeVariants,
    selectedPricingLines,
    setSelectedPricingLines,
    errors,
    setErrors,
    error,
    loading: formLoading,
    resetForm: resetFormHook,
    validateProduct: validateProductHook,
  } = productForm;

  // Get search and filter controls (search text, current page, advanced filters)
  const {
    search,
    setSearch,
    currentPage,
    setCurrentPage,
    advancedFilters,
    setAdvancedFilters,
    showAdvancedSearch,
    setShowAdvancedSearch,
    selectedForPrint,
    setSelectedForPrint,
  } = productFilters;

  // Get company info to determine region and apply region-specific tax/decimal rules
  const { company } = useTaxMaster();

  // Determine country: If company not loaded, default to AE (United Arab Emirates)
  // Used for: HSN availability, tax rules, decimal formatting
  const activeCountryCode = company?.countryCode || "AE";
  const isIndiaCompany = activeCountryCode === "IN";

  // Get decimal formatting rules based on country (e.g., India uses 2 decimals, some use 4)
  // All calculations must use round() to respect country-specific decimal places
  const { round, formatNumber } = useDecimalFormat(activeCountryCode);

  // ✅ Items per page for pagination - 50 items for infinite scroll
  const itemsPerPage = 50;

  // UI State: Modal dialogs, loading, form modes (edit vs create)
  const [products, setProducts] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editIndex, setEditIndex] = useState(-1);
  const [loading, setLoading] = useState(false);
  // Removed: suggestedItemCode - Item code is now generated on server side during product save
  // HSN codes list (India-specific tax classification codes)
  const [hsnCodes, setHsnCodes] = useState([]);
  const [loadingHsn, setLoadingHsn] = useState(false);

  // Grouping/Category hierarchy: Tracks selected category levels for department/subdept/brand
  const [groupings, setGroupings] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [subdepartments, setSubdepartments] = useState([]);
  const [brands, setBrands] = useState([]);
  const [selectedGroupingFilter, setSelectedGroupingFilter] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState("");

  // ✅ Track previous filter to detect changes (for reset logic)
  const prevFilterRef = useRef(selectedGroupingFilter);

  // ✅ Memoize fetchFunction so it doesn't get recreated on every render
  // This prevents the useInfiniteScroll hook from resetting state
  const fetchProductsCallback = useCallback(
    (page, limit) => productAPI.fetchProducts(page, limit, selectedGroupingFilter),
    [selectedGroupingFilter]
  );

  // ✅ INFINITE SCROLL HOOK - Manages fetching + accumulating products
  // Fetches 50 items at a time, accumulates into sparse map
  // VirtualizedProductTable renders only visible items
  const {
    productsMap: infiniteProductsMap,
    currentPage: infiniteCurrentPage,
    isLoading: isLoadingInfinite,
    totalProducts: totalInfiniteProducts,
    hasMore: hasMoreInfinite,
    fetchNextPage: fetchNextPageInfinite,
    fetchPage: fetchPageDirect,
    reset: resetInfiniteScroll,
  } = useInfiniteScroll(
    fetchProductsCallback,
    itemsPerPage
  );

  // ✅ Reset infinite scroll ONLY when filter actually changes
  // Use ref to track previous value - prevents infinite loop from dependency changes
  useEffect(() => {
    if (prevFilterRef.current !== selectedGroupingFilter) {
      console.log(`🔄 Filter changed: "${prevFilterRef.current}" → "${selectedGroupingFilter}", resetting infinite scroll`);
      prevFilterRef.current = selectedGroupingFilter;
      resetInfiniteScroll();
    }
  }, [selectedGroupingFilter]); // Only depend on the actual filter, not the reset function

  // Modal controls for adding/managing hierarchical data (departments, brands, etc.)
  const [isGroupingModalOpen, setIsGroupingModalOpen] = useState(false);
  const [groupingModalLevel, setGroupingModalLevel] = useState(""); // "1", "2", or "3"
  const [groupingModalParentId, setGroupingModalParentId] = useState("");

  // Vendor modal state
  const [isVendorModalOpen, setIsVendorModalOpen] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState(null);

  // Barcode print dialog state
  const [showBarcodePrintPopup, setShowBarcodePrintPopup] = useState(false);

  // ✅ Product Search Hook - Centralized search logic with Meilisearch + fallback
  const {
    results: apiSearchResults,
    loading: searchLoading,
    error: searchError,
    metadata: searchMetadata,
  } = useProductSearch(search, 300, currentPage, 100, true);

  // ✅ Use the master create/edit/save hook (extracted from Product.jsx, now shared)
  // Note: Hook will use openProductForm to open the modal
  const { handleEdit: _hookEdit, handleNewProduct: _hookNew } = useProductCreateUpdate({
    onProductSaved: async (savedProduct) => {
      // ✅ AUTO-REFRESH: Reset infinite scroll after ANY product save (create or update)
      // This refetches from page 1 and shows the updated/new product immediately
      console.log(`✅ Product saved: ${savedProduct.name}, auto-refreshing table...`);
      
      try {
        // Reset infinite scroll state (clears sparse map, sets currentPage=1)
        console.log(`🔄 Clearing infinite scroll state...`);
        resetInfiniteScroll();
        
        // ✅ CRITICAL FIX: Use fetchPage directly instead of fetchNextPageInfinite
        // Reason: After reset, currentPage=1, so fetchNextPageInfinite(1) skips fetch
        // since it checks: if (newPage !== currentPage) → if (1 !== 1) → false
        // fetchPage bypasses this check and always fetches
        setTimeout(() => {
          console.log(`📥 Direct fetch of page 1 after reset...`);
          fetchPageDirect(1);
        }, 50);
        
      } catch (error) {
        console.error(`❌ Error during table refresh:`, error);
      }
    },
    products: products || [],
    filteredProducts: products || [], // Initially empty, will be computed later in render
    round,
    activeCountryCode,
  });

  // ✅ Debounced modal search (for product lookup in modal)
  const modalSearchDebounceRef = useRef(null);
  const [debouncedModalSearch, setDebouncedModalSearch] = useState("");

  // Validation error modal state
  const [validationErrorModal, setValidationErrorModal] = useState(false);
  const [validationErrorList, setValidationErrorList] = useState("");

  // Track last saved product to prevent duplicate success messages
  const lastSavedProductRef = useRef(null);

  // ✅ NEW: Ref to BasicInfoTab for clearing search filters after creating items
  const basicInfoTabRef = useRef(null);

  // Modal Tabs
  const [activeTab, setActiveTab] = useState("basic");
  
  // ✅ FIX: Use fixed height for modal - large enough to fit any tab content
  // No dynamic measurement - just use a fixed value to prevent jumping
  const tabContentRef = useRef(null);

  // Product Lookup in Modal
  const [modalSearchQuery, setModalSearchQuery] = useState("");
  const [modalSearchResults, setModalSearchResults] = useState([]);
  const [showModalSearchResults, setShowModalSearchResults] = useState(false);

  // Vendor Lookup
  const [vendors, setVendors] = useState([]);

  // Unit Types
  const [units, setUnits] = useState([]);
  const [loadingUnits, setLoadingUnits] = useState(false);

  // Tax master data: All available taxes, filtered by country in filteredTaxes computed state
  const [availableTaxes, setAvailableTaxes] = useState([]);
  const [loadingTaxes, setLoadingTaxes] = useState(false);

  // Filter taxes by the current company's country (handles multi-country scenarios)
  // Example: India shows GST taxes, UAE shows VAT, etc.
  const filteredTaxes = availableTaxes.filter((tax) => {
    // If tax has a country field, filter by it
    if (tax.country || tax.countryCode) {
      return (
        tax.country === activeCountryCode ||
        tax.countryCode === activeCountryCode
      );
    }

    // If no country field, show all (for backward compatibility)
    return true;
  });

  // ✅ Pricing Levels Modal Management (Level 1-4 per unit)
  const [isCustomerPricingModalOpen, setIsCustomerPricingModalOpen] =
    useState(false);
  const [selectedUnitForCustomerPricing, setSelectedUnitForCustomerPricing] =
    useState(null); // {unit, index, unitName}
  const [pricingLevels, setPricingLevels] = useState({
    level1: "",
    level2: "",
    level3: "",
    level4: "",
    level5: "",
  });

  // Track which pricing level field is focused (for formatting: show formatted when not editing, raw when editing)
  const [focusedPricingLevel, setFocusedPricingLevel] = useState(null);

  // Track previous taxInPrice to detect when checkbox is toggled
  const prevTaxInPriceRef = useRef(false);

  // ✅ Helper function to get category/department name from categoryId
  // Handles both populated objects and ID strings from search results
  const getCategoryName = (categoryId) => {
    if (!categoryId) return "-";
    
    // If categoryId is already an object with name property
    if (typeof categoryId === 'object' && categoryId.name) {
      return categoryId.name;
    }
    
    // If categoryId is just an ID string, lookup in departments array
    const categoryId_str = String(categoryId);
    const category = departments.find(d => String(d._id) === categoryId_str);
    return category?.name || "-";
  };

  // ✅ Track if initial data has been loaded (prevents duplicate API calls)
  const dataInitializedRef = useRef(false);

  // Barcode Generation Algorithm:
  // Format: [ItemCode-4digits][DeptCode-2digits][RowIndex-2digits][UnitCode-3digits][Padding-1digit] = 11 total digits
  // Example: \"1234\" + \"01\" + \"00\" + \"001\" + \"0\" = \"12340100010\"
  // This ensures barcodes are unique per unit variant and traceable
  // Row 0 = base unit, Rows 1-3 = variants
  // Prerequisites: Department and unit must be selected
  const handleGenerateBarcode = useCallback(
    (index) => {
      try {
        // Validate department and unit
        const deptId =
          newProduct.categoryId && typeof newProduct.categoryId === "object" && newProduct.categoryId !== null
            ? newProduct.categoryId._id
            : newProduct.categoryId;
        const unit = pricingLines[index]?.unit;
        if (!deptId || !unit) {
          toast.error("Select department and unit before generating barcode");
          return;
        }
        // Generate barcode using itemcode, department, unit, and row index (11 digits)
        const itemCodeStr = newProduct.itemcode || "0000";
        const numericItemCode = String(itemCodeStr).replace(/[^0-9]/g, "");
        const itemDigits = numericItemCode.slice(0, 4).padStart(4, "0");
        const deptIndex = departments.findIndex((d) => d._id === deptId);
        const deptCode = String(Math.max(deptIndex + 1, 1)).padStart(2, "0");
        const rowIndex = String(index).padStart(2, "0");
        const unitDigits = String(unit)
          .replace(/[^0-9]/g, "")
          .slice(0, 3)
          .padStart(3, "0");
        const padding = "0";
        // 4 (item) + 2 (dept) + 2 (row) + 3 (unit) = 11 digits
        let barcode = (itemDigits + deptCode + rowIndex + unitDigits + padding)
          .slice(0, 11)
          .padEnd(11, "0")
          .replace(/[^0-9]/g, "");
        setNewProduct({ ...newProduct, barcode });
        setPricingLines((prev) => {
          const updated = [...prev];
          if (updated[index]) {
            updated[index].barcode = barcode;
          }

          return updated;
        });
        debugLogger.success("Product", "Barcode generated", { barcode });
      } catch (error) {
        debugLogger.error("Product", "Failed to generate barcode", error);
        toast.error("Failed to generate barcode");
      }
    },
    [newProduct, departments, pricingLines],
  );

  // ✅ Generate Barcode on Server (Department + Pricing Level + Random - No Item Code Required)
  const handleGenerateBarcodeOnServer = useCallback(
    async (index) => {
      try {
        // Close validation error modal if open (so it doesn't block interactions)
        setValidationErrorModal(false);
        
        // Validate department (item code NOT required anymore)
        const deptId =
          newProduct.categoryId && typeof newProduct.categoryId === "object" && newProduct.categoryId !== null
            ? newProduct.categoryId._id
            : newProduct.categoryId;
        
        if (!deptId) {
          toast.error("Select department before generating barcode");
          return;
        }

        // Get department code (2 digits)
        const deptIndex = departments.findIndex((d) => d._id === deptId);
        const deptCode = String(Math.max(deptIndex + 1, 1)).padStart(2, "0");
        
        // Get pricing level index (1 digit: 0=base, 1=level1, 2=level2, etc.)
        const pricingLevelIndex = String(index).padStart(1, "0").slice(0, 1);
        
        // Generate 7 random digits for uniqueness
        const randomDigits = String(Math.floor(Math.random() * 10000000)).padStart(7, "0");
        
        // Build base barcode: [DeptCode:2] + [PricingLevel:1] + [Random:7] = 10 digits
        const baseBarcode = (deptCode + pricingLevelIndex + randomDigits)
          .slice(0, 10)
          .padEnd(10, "0")
          .replace(/[^0-9]/g, "");

        debugLogger.info("Product", "Requesting barcode generation", {
          baseBarcode,
          deptCode,
          pricingLevelIndex,
          departmentId: deptId,
        });

        // Call server endpoint for barcode generation (with FIFO & duplicate prevention)
        const result = await productAPI.generateBarcodeOnServer(
          baseBarcode,
          "", // No item code needed
          deptId,
          `system-${navigator.userAgent.slice(0, 20)}` // Use browser info as system ID
        );

        // Store queue ID for later assignment after product creation
        const queueId = result.queueId;
        const generatedBarcode = result.barcode;

        // Update UI with generated barcode
        setNewProduct({ ...newProduct, barcode: generatedBarcode, barcodeQueueId: queueId });
        setPricingLines((prev) => {
          const updated = [...prev];
          if (updated[index]) {
            updated[index].barcode = generatedBarcode;
          }
          return updated;
        });

        debugLogger.success("Product", "Barcode generated on server", {
          barcode: generatedBarcode,
          queueId,
          deptCode,
          pricingLevelIndex,
        });

        toast.success(`Barcode generated: ${generatedBarcode}`, { duration: 3000 });
      } catch (error) {
        debugLogger.error("Product", "Failed to generate barcode on server", error);
        toast.error(error.response?.data?.message || "Failed to generate barcode on server");
      }
    },
    [newProduct, departments, pricingLines, productAPI],
  );

  // ✅ Open Barcode Print Modal
  const handleBarcodePrint = useCallback(() => {
    if (!newProduct.barcode) {
      toast.error("Please enter or generate a barcode first", {
        duration: 3000,
        position: "top-center",
      });
      return;
    }
    setShowBarcodePrintPopup(true);
  }, [newProduct.barcode]);

  // ✅ Add New Price Line
  const handleAddPriceLine = useCallback(() => {
    try {
      const newLine = createEmptyPricingLine();
      setPricingLines([...pricingLines, newLine]);
      setNewProduct({
        ...newProduct,
        unitVariants: [...newProduct.unitVariants, newLine],
      });
      debugLogger.success("Product", "Pricing line added");
    } catch (error) {
      debugLogger.error("Product", "Failed to add pricing line", error);
      toast.error("Failed to add pricing line");
    }
  }, [pricingLines, newProduct]);

  // ✅ Update Price Line
  const updatePriceLine = (index, field, value) => {
    const updated = [...pricingLines];
    updated[index][field] = value;
    setPricingLines(updated);
    
   
    // Also update newProduct unitVariants
    const updatedVariants = Array.isArray(newProduct.unitVariants) ? [...newProduct.unitVariants] : [];
    if (!updatedVariants[index]) {
      updatedVariants[index] = {
        unit: "",
        factor: index === 0 ? 1 : "",
        cost: "",
        costIncludetax: "",
        margin: "",
        marginAmount: "",
        taxAmount: "",
        price: "",
        barcode: "",
        action: "",
      };
    }
    updatedVariants[index][field] = value;
    setNewProduct({
      ...newProduct,
      unitVariants: updatedVariants,
    });
  };

  // Core Pricing Engine: Handles all cost-to-price calculations with tax awareness
  // Supports 5 calculation modes based on which field user enters:
  // 1. Cost + Price → calculates Margin% and MarginAmount
  // 2. Cost + Margin% → calculates MarginAmount and Price
  // 3. Cost + MarginAmount → calculates Margin% and Price
  // 4. Price only (with existing Cost) → calculates MarginAmount and Margin%
  // 5. CostIncludeTax → reverse-calculates Cost, then forward-calculates Price
  //
  // Tax Handling:
  // - If taxInPrice=true: Price INCLUDES tax (user pays tax in the final price)
  // - If taxInPrice=false: Price EXCLUDES tax (tax is added at checkout)
  // All calculations respect country-specific decimal rules via round() function
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
    const hasMarginPercent =
      line.margin !== "" && line.margin !== undefined && line.margin !== null;
    const hasMarginAmount =
      line.marginAmount !== "" &&
      line.marginAmount !== undefined &&
      line.marginAmount !== null;
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
        toast.error("⚠️ Please enter Cost first before setting Selling Price", {
          duration: 3000,
          position: "top-center",
        });
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
  }, [pricingLines, newProduct, round]);

  // ✅ Generate Unit-Specific Barcode (Variant Barcode)
  // Format: [ItemCode:4 digits] + [DepartmentCode:2 digits] + [RowIndex:2 digits] + [Padding:2 digits] = 10 digits
  const generateUnitBarcode = (lineIndex) => {
    const line = pricingLines[lineIndex];
    if (!line.unit) {
      toast.error("Please select a unit first", {
        duration: 3000,
        position: "top-center",
      });
      return;
    }

    // Get department code/index
    const deptId =
      newProduct.categoryId && typeof newProduct.categoryId === "object" && newProduct.categoryId !== null
        ? newProduct.categoryId._id
        : newProduct.categoryId;

    const itemCode = newProduct.itemcode || "0000";
    const numericItemCode = String(itemCode).replace(/[^0-9]/g, "");
    const itemDigits = numericItemCode.slice(0, 4).padStart(4, "0");

    const deptIndex = departments.findIndex((d) => d._id === deptId);
    const deptCode = String(deptIndex + 1).padStart(2, "0");

    // Row index for this row - 2 digits
    const rowIndex = String(lineIndex).padStart(2, "0");
    const padding = "00";

    // Create 10-digit variant barcode: item + dept + rowindex + padding (only numbers)
    let variantBarcode = (itemDigits + deptCode + rowIndex + padding)
      .slice(0, 10)
      .padEnd(10, "0");

    // Extra safety: ensure only numbers
    variantBarcode = variantBarcode
      .replace(/[^0-9]/g, "")
      .padStart(10, "0")
      .slice(0, 10);

    updatePriceLine(lineIndex, "barcode", variantBarcode);
  };

  // ✅ Recalculate Margin When Tax-In-Price is Toggled (Keep Price Same)
  const recalculateMarginOnTaxInPriceToggle = (wasIncludingTax) => {
    const taxPercent = parseFloat(newProduct.taxPercent) || 0;
    const taxMultiplier = 1 + taxPercent / 100;

    const recalculatedLines = pricingLines.map((line) => {
      const cost = parseFloat(line.cost) || 0;
      const price = parseFloat(line.price) || 0;

      // Keep price same, recalculate margin based on new interpretation
      let basePrice = price;

      if (wasIncludingTax && taxPercent > 0) {
        // Was TRUE (price included tax), now FALSE (price excludes tax)
        // The price value stays the same, but interpret it as excluding tax now
        // Base price for margin calculation = price as-is (since it now excludes tax)
        basePrice = price;
      } else if (!wasIncludingTax && taxPercent > 0) {
        // Was FALSE (price excluded tax), now TRUE (price includes tax)
        // The price value stays the same, but interpret it as including tax now
        // Extract the base price by dividing by tax multiplier
        basePrice = price / taxMultiplier;
      }

      const calculatedMarginAmount = basePrice - cost;
      const calculatedMarginPercent =
        cost > 0 ? (calculatedMarginAmount / cost) * 100 : 0;
      const taxAmount = cost * (taxPercent / 100);
      const costIncludeTax = cost + taxAmount;

      return {
        ...line,
        price: price.toString(), // Keep original price
        margin: round(calculatedMarginPercent).toString(),
        marginAmount: round(calculatedMarginAmount).toString(),
        taxAmount: round(taxAmount).toString(),
        costIncludetax: round(costIncludeTax).toString(),
      };
    });

    setPricingLines(recalculatedLines);

    // Also update newProduct unitVariants
    const updatedVariants = recalculatedLines.map((line) => ({
      ...line,
    }));
    setNewProduct({
      ...newProduct,
      unitVariants: updatedVariants,
    });
  };

  // Handle Tax Percent Change: Recalculate all pricing lines when tax rate changes
  // Uses REVERSE calculation: Keeps selling price constant, recalculates margins based on new tax
  // Example: If price is 100 and tax changes from 5% to 10%, the margin shifts but price stays 100
  const recalculatePricingOnTaxChange = () => {
    const taxPercent = parseFloat(newProduct.taxPercent) || 0;
    const includeTaxInPrice = newProduct.taxInPrice || false;
    const taxMultiplier = 1 + taxPercent / 100;

    const recalculatedLines = pricingLines.map((line) => {
      const cost = parseFloat(line.cost) || 0;
      const price = parseFloat(line.price) || 0;

      // Recalculate tax amount and cost + tax based on new tax percent
      const taxAmount = cost * (taxPercent / 100);
      const costIncludeTax = cost + taxAmount;

      // Always do REVERSE calculation: Keep price same, recalculate margin
      // If taxInPrice is true, price includes tax - remove tax to get base price for margin calc
      let basePriceForMargin = price;
      if (includeTaxInPrice && taxPercent > 0) {
        basePriceForMargin = price / taxMultiplier;
      }

      const calculatedMarginAmount = basePriceForMargin - cost;
      const calculatedMarginPercent =
        cost > 0 ? (calculatedMarginAmount / cost) * 100 : 0;

      return {
        ...line,
        taxAmount: round(taxAmount).toString(),
        costIncludetax: round(costIncludeTax).toString(),
        price: round(price).toString(), // Keep original price ALWAYS
        margin: round(calculatedMarginPercent).toString(),
        marginAmount: round(calculatedMarginAmount).toString(),
      };
    });

    setPricingLines(recalculatedLines);

    // Also update newProduct unitVariants
    const updatedVariants = recalculatedLines.map((line) => ({
      ...line,
    }));
    setNewProduct({
      ...newProduct,
      unitVariants: updatedVariants,
    });
  };

  // ✅ FIX: No dynamic height measurement needed - let CSS handle it with max-height
  // The tab content container will use max-height with smooth transitions
  // This prevents modal jumping while switching tabs

  // ✅ Watch for tax percent changes and recalculate pricing table
  useEffect(() => {
    if (isModalOpen && pricingLines.length > 0 && pricingLines[0].cost) {
      // Check if only taxInPrice changed (toggle case)
      const taxInPriceChanged =
        prevTaxInPriceRef.current !== newProduct.taxInPrice;

      if (taxInPriceChanged || newProduct.taxPercent) {
        // When taxInPrice or taxPercent changes, recalculate price based on margins
        // This keeps margins the same and adjusts price to include/exclude tax
        recalculatePricingOnTaxChange();
      }
    }

    // Update the ref with current value
    prevTaxInPriceRef.current = newProduct.taxInPrice;
  }, [newProduct.taxPercent, newProduct.taxInPrice]);

  // ✅ Reset page to 1 on component mount
  useEffect(() => {
    setCurrentPage(1);
  }, [setCurrentPage]);

  // ✅ Initialize data on mount (only once)
  useEffect(() => {
    // Prevent multiple initializations
    if (dataInitializedRef.current) {
      return;
    }
    dataInitializedRef.current = true;

    const initializeData = async () => {
      // Load all reference data needed for product form:
      // - Groupings: Department/SubDept/Brand hierarchy (3 levels)
      // - Vendors: Supplier list for vendor selection
      // - Units: Measurement units (PCS, KG, BOX, etc.)
      // - Products: Loaded on-demand via infinite scroll hook (NOT here)
      // - HSN Codes: India-specific tax classification (if India company)
      // - Taxes: Available tax rates for non-India countries (filtered by country on client)
      setLoading(true);
      try {
        const [
          fetchedGroupings,
          fetchedVendors,
          fetchedUnits,
          fetchedHSNCodes,
          fetchedTaxes,
        ] = await Promise.all([
          productAPI.fetchGroupings(),
          productAPI.fetchVendors(),
          productAPI.fetchUnits(),
          isIndiaCompany ? productAPI.fetchHSNCodes() : Promise.resolve([]),
          // Fetch all taxes - client-side filtering by country will handle it
          isIndiaCompany ? Promise.resolve([]) : productAPI.fetchTaxes(),
        ]);

        // Process groupings into hierarchy
        const allGroupings = fetchedGroupings;
        const depts = allGroupings.filter(
          (g) => g.level === "1" || g.level === 1,
        );
        setGroupings(allGroupings);
        setDepartments(depts);

        setVendors(fetchedVendors);
        setUnits(fetchedUnits);
        
        // ✅ Products are now loaded by useInfiniteScroll hook automatically
        // No need to set them here anymore
        
        setHsnCodes(fetchedHSNCodes);
        setAvailableTaxes(fetchedTaxes);

        // Item code will be auto-generated by server when product is saved
      } catch (err) {
        console.error("❌ Error initializing data:", err);
        toast.error("Failed to load product data");
      } finally {
        setLoading(false);
      }
    };

    initializeData();
  }, []); // Empty dependency - run only once on mount

  // ✅ Fetch taxes on country change
  useEffect(() => {
    const fetchCountryTaxes = async () => {
      try {
        if (activeCountryCode === "IN") {
          // India uses HSN codes for taxes

          setAvailableTaxes([]);
        } else {
          // Fetch all taxes - filtering by country happens in filteredTaxes computed state
          const taxes = await productAPI.fetchTaxes();
          setAvailableTaxes(taxes || []);
        }
      } catch (err) {
        console.error("❌ Error fetching taxes:", err);
        toast.error("Failed to load tax rates");
        setAvailableTaxes([]);
      }
    };

    // Fetch taxes after initialization is complete
    if (dataInitializedRef.current) {
      fetchCountryTaxes();
    }
  }, [activeCountryCode]); // Only activeCountryCode - productAPI functions are stable via useCallback

  // ✅ NEW: AUTO-CONVERT STRING TAXTYPES TO TAX IDS
  // When loading a product from database, taxType might be a string (from old imports)
  // This effect converts string taxTypes to proper tax IDs for dropdown selection
  useEffect(() => {
    if (newProduct.taxType && typeof newProduct.taxType === 'string' && 
        newProduct.taxType.length !== 24 && // Not already a MongoDB ID
        filteredTaxes?.length > 0 &&
        isEdit) {
      // Try to find matching tax by taxPercent
      const matchingTax = filteredTaxes.find(t => t.totalRate === newProduct.taxPercent);
      if (matchingTax && matchingTax._id !== newProduct.taxType) {
        setNewProduct(prev => ({
          ...prev,
          taxType: matchingTax._id
        }));
        console.log(`✅ Converted string taxType "${newProduct.taxType}" to tax ID: ${matchingTax._id}`);
      }
    }
  }, [isEdit, filteredTaxes, newProduct.taxPercent]); // Re-run when edit mode or taxes change

  // No measurement needed - modal has fixed height of 650px for all tabs
  // This prevents jumping when switching between Basic Info, More Info, Image, Batch, History tabs

  // ✅ Handle HSN Code Selection - Auto-update tax type based on GST rate
  // India-specific tax: Auto-fill GST rate based on HSN code
  // HSN codes are linked to GST categories in India's tax system
  // When user selects HSN → Look up GST rate → Auto-set taxType and taxPercent
  const handleHSNSelection = useCallback((hsnCode) => {
    const selectedHSN = hsnCodes.find((hsn) => hsn.code === hsnCode);

    let updatedProduct = {
      ...newProduct,
      hsn: hsnCode,
    };

    // India: Extract GST rate from HSN and update tax fields
    if (selectedHSN && isIndiaCompany) {
      const gstRate = selectedHSN.gstRate || 0;
      updatedProduct = {
        ...updatedProduct,
        taxType: `GST ${gstRate}%`, // e.g., "GST 5%", "GST 18%" - for display
        taxPercent: gstRate, // Numeric rate used in calculations
      };

      // Pre-calculate tax amount for cost if it's already entered
      if (updatedProduct.cost) {
        const taxAmount = (parseFloat(updatedProduct.cost) * gstRate) / 100;
        updatedProduct.taxAmount = round(taxAmount).toString();
      }
    }

    setNewProduct(updatedProduct);
  }, [newProduct, hsnCodes, isIndiaCompany, round]);

  // Non-India: User selects applicable tax from master list
  // Finds tax details by ID and updates product state
  // The useEffect watcher (line ~773) detects taxPercent change and recalculates pricing
  const handleTaxSelectionAndRecalculation = useCallback((taxId, newTaxPercent) => {
    // Validate: Tax must exist in filtered taxes before accepting selection
    const selectedTax = filteredTaxes.find((t) => t._id === taxId);

    if (!selectedTax) {
      toast.error("Tax not found");
      return;
    }

    // Update product with tax information
    const updatedProduct = {
      ...newProduct,
      taxType: taxId,
      taxTypeName: selectedTax.taxName || "",
      taxPercent: newTaxPercent,
    };

    // ✅ When tax rate changes: Keep price constant and reverse-calculate margin
    // Price is fixed (already on store) → recalculate margin % and margin amount
    const taxPercent = parseFloat(newTaxPercent) || 0;
    const includeTaxInPrice = updatedProduct.taxInPrice || false;

    // Create updated lines
    const updatedLines = pricingLines.map((line) => {
      // START with pristine copy - all fields exactly as-is
      const updatedLine = { ...line };
      
      const price = parseFloat(line.price) || 0;
      const cost = parseFloat(line.cost) || 0;

      // Get the base price (excluding tax)
      let basePriceForMargin = price;
      if (includeTaxInPrice && taxPercent > 0) {
        const taxMultiplier = 1 + taxPercent / 100;
        basePriceForMargin = price / taxMultiplier;
      }

      // Reverse-calculate margin amount and percentage
      const calculatedMarginAmount = basePriceForMargin - cost;
      const calculatedMarginPercent = cost > 0 
        ? (calculatedMarginAmount / cost) * 100 
        : 0;

      // Calculate tax amount from the CURRENT PRICE
      let calculatedTaxAmount = 0;
      if (taxPercent > 0 && price > 0) {
        if (includeTaxInPrice) {
          // Price includes tax: extract tax from price
          calculatedTaxAmount = round((price * taxPercent) / (100 + taxPercent));
        } else {
          // Price excludes tax: calculate tax on price
          calculatedTaxAmount = round(price * (taxPercent / 100));
        }
      }

      // Calculate cost + tax based on cost
      const costTaxAmount = cost > 0 && taxPercent > 0
        ? round(cost * (taxPercent / 100))
        : 0;
      const costIncludetax = cost > 0 
        ? round(cost + costTaxAmount)
        : 0;

      // Update margin %, margin amount, tax amount, and cost+tax
      // Price stays EXACTLY the same - no change
      updatedLine.margin = round(calculatedMarginPercent).toString();
      updatedLine.marginAmount = round(calculatedMarginAmount).toString();
      updatedLine.taxAmount = calculatedTaxAmount.toString();
      updatedLine.costIncludetax = costIncludetax.toString();

      return updatedLine;
    });

    // Update pricingLines with recalculated margins and tax
    setPricingLines(updatedLines);

    // Update newProduct tax info
    setNewProduct(updatedProduct);
  }, [pricingLines, newProduct, filteredTaxes, round]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      let url = `${API_URL}/products/getproducts?limit=1000`;  // ✅ Fetch up to 1000 products at once
      if (selectedGroupingFilter) {
        url += `&groupingId=${selectedGroupingFilter}`;
      }
      const response = await axios.get(url);
      const fetchedProducts = response.data.products || response.data;

      console.log(`✅ Loaded ${fetchedProducts.length} products from database`);
      setProducts(fetchedProducts);
    } catch (err) {
      toast.error("Failed to fetch products. Please try again.", {
        duration: 5000,
        position: "top-center",
      });
      console.error("❌ Error fetching products:", err);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Fetch Single Product by ID (for edit - gets complete data with unitVariants)
  const fetchProductById = async (productId) => {
    try {
      const response = await axios.get(
        `${API_URL}/products/getproduct/${productId}`,
      );

      // The endpoint returns the product directly in response.data, not wrapped in .product
      const product = response.data;

      if (!product || Object.keys(product).length === 0) {
        console.warn("⚠️ Product response is empty:", product);
        return null;
      }

      
      return product;
    } catch (err) {
      console.error("❌ Error fetching product details:");
      console.error("   Status:", err.response?.status);
      console.error("   Message:", err.response?.data?.message);
      console.error("   Full error:", err);
      return null;
    }
  };

  // NOTE: checkBarcodeExists and checkItemcodeExists are now in useProductAPI hook - use productAPI.checkBarcodeExists() and productAPI.checkItemcodeExists()

  // ✅ Generate Unique Barcode (Check for duplicates)
  const generateUniqueBarcode = async (baseBarcode, lineIndex) => {
    // Ensure barcode only contains numbers
    const cleanBarcode = String(baseBarcode)
      .replace(/[^0-9]/g, "")
      .padStart(10, "0")
      .slice(0, 10);

    let barcode = cleanBarcode;
    let counter = 0;
    const maxAttempts = 100;

    while (counter < maxAttempts) {
      const exists = await productAPI.checkBarcodeExists(
        barcode,
        isEdit ? editId : null,
      );
      if (!exists) {
        return barcode; // Found unique barcode
      }
      // Increment last digits to create variation
      counter++;
      const lastTwoDigits = String(counter).padStart(2, "0");
      barcode = (cleanBarcode.slice(0, 8) + lastTwoDigits).slice(0, 10);
    }

    return barcode; // Return even if couldn't find unique after max attempts
  };

  // ✅ Auto-generate Barcode for Specific Pricing Row (or all if lineIndex not provided)
  // Format: [ItemCode:4 digits] + [DepartmentCode:2 digits] + [RowIndex:2 digits] + [Padding:2 digits] = 10 digits
  const autoGenerateAllPricingBarcodes = async (
    categoryId,
    lineIndexToGenerate = null,
  ) => {
    if (!categoryId || !pricingLines.length) return;

    const itemCode = newProduct.itemcode || "0000";
    const deptId = categoryId && typeof categoryId === "object" && categoryId !== null ? categoryId._id : categoryId;

    // Check if item code already exists
    const itemcodeExists = await productAPI.checkItemcodeExists(
      itemCode,
      isEdit ? editId : null,
    );
    if (itemcodeExists && !isEdit) {
      console.warn(`Item code "${itemCode}" already exists in database`);
      // Don't block the flow, just warn the user on save
    }

    // Extract only numbers from item code (skip alphabets) - 4 digits
    const numericItemCode = String(itemCode).replace(/[^0-9]/g, "");
    const itemDigits = numericItemCode.slice(0, 4).padStart(4, "0");

    // Get department code/index - 2 digits
    const deptIndex = departments.findIndex((d) => d._id === deptId);
    const deptCode = String(deptIndex + 1).padStart(2, "0");

    const updatedPricingLines = [...pricingLines];

    // Determine which rows to generate barcodes for
    const rowsToGenerate =
      lineIndexToGenerate !== null
        ? [lineIndexToGenerate]
        : Array.from({ length: pricingLines.length }, (_, i) => i);

    // Generate barcodes for selected rows
    // Format: [itemCode:4] + [deptCode:2] + [rowIndex:2] + [padding:2] = 10 digits
    for (const i of rowsToGenerate) {
      const line = pricingLines[i];

      // Row index for barcode - 2 digits (00, 01, 02, 03, etc.)
      const rowIndex = String(i).padStart(2, "0");
      const padding = "00";

      // Create barcode: item + dept + rowindex + padding
      let variantBarcode = (itemDigits + deptCode + rowIndex + padding)
        .slice(0, 10)
        .padEnd(10, "0");

      // Ensure barcode only contains numbers (extra safety check)
      const cleanBarcode = variantBarcode
        .replace(/[^0-9]/g, "")
        .padStart(10, "0")
        .slice(0, 10);

      // Check for duplicate and generate unique if needed
      const uniqueBarcode = await generateUniqueBarcode(cleanBarcode, i);
      updatedPricingLines[i] = {
        ...line,
        barcode: uniqueBarcode,
      };
    }

    setPricingLines(updatedPricingLines);

    // Also update newProduct unitVariants
    setNewProduct({
      ...newProduct,
      unitVariants: updatedPricingLines,
    });
  };

  // ✅ Add Barcode for Unit
  // ✅ Remove Barcode Variant
  const removeBarcodeVariant = (id) => {
    setBarcodeVariants(barcodeVariants.filter((v) => v.id !== id));
  };

  // ✅ Get variants for selected unit
  const getVariantsForUnit = (unit) => {
    return barcodeVariants.filter((v) => v.unit === unit);
  };

  // ✅ Get selected units from pricing lines
  const getSelectedUnits = () => {
    const selectedIndices = Array.from(selectedPricingLines);
    return selectedIndices
      .map((index) => ({
        index,
        unitId: pricingLines[index]?.unit,
        unitName:
          units.find((u) => u._id === pricingLines[index]?.unit)?.name ||
          "Unknown Unit",
      }))
      .filter((item) => item.unitId); // Only include lines that have a unit selected
  };

  // ✅ Add barcode for specific unit from pricing line
  const addBarcodeForSelectedUnit = (unitId, barcode) => {
    if (!barcode.trim()) {
      toast.error("Please enter a barcode", {
        duration: 3000,
        position: "top-center",
      });
      return;
    }

    // Check if this barcode already exists in any unit variant (product-wide uniqueness)
    const barcodeExists = barcodeVariants.some(v => v.barcode.trim() === barcode.trim());
    if (barcodeExists) {
      toast.error("This barcode already exists in another unit variant. Barcodes must be unique per product", {
        duration: 4000,
        position: "top-center",
      });
      return;
    }

    const newVariant = {
      id: Date.now(),
      unit: unitId,
      barcode: barcode.trim(),
    };

    setBarcodeVariants([...barcodeVariants, newVariant]);
    toast.success("Barcode added successfully", { 
      duration: 2000, 
      position: "top-center" 
    });
  };

  // ✅ Get barcodes organized by pricing line level (for table display)
  const getBarcodesByLevel = () => {
    const levels = [
      [], // Level 1 (index 0 - base unit)
      [], // Level 2 (index 1)
      [], // Level 3 (index 2)
      [], // Level 4 (index 3)
    ];

    barcodeVariants.forEach((variant) => {
      // Find which pricing line this unit belongs to
      pricingLines.forEach((line, index) => {
        if (line.unit === variant.unit && index < 4) {
          levels[index].push(variant.barcode);
        }
      });
    });

    return levels;
  };

  // ✅ Handle Category Change (in modal)
  const handleCategoryChange = useCallback((categoryId) => {
    
    const selectedDept = departments.find((d) => d._id === categoryId);
  
    
    

    setNewProduct({
      ...newProduct,
      categoryId,
      groupingId: "", // Reset subcategory when category changes
      brandId: "", // Reset brand when category changes
    });
    setSelectedCategoryId(categoryId);

    // Filter subdepartments for selected category
    if (categoryId) {
      const subs = groupings.filter((g) => g.parentId?._id === categoryId);
      
      setSubdepartments(subs);
    } else {
      setSubdepartments([]);
    }
    setBrands([]); // Reset brands
  }, [newProduct, groupings, departments]);

  // ✅ Handle Sub-Department Change (in modal)
  const handleSubdepartmentChange = useCallback((groupingId) => {
    setNewProduct({
      ...newProduct,
      groupingId,
      brandId: "", // Reset brand when sub-department changes
    });

    // Filter brands for selected sub-department
    if (groupingId) {
      const filteredBrands = groupings.filter(
        (g) => g.parentId?._id === groupingId,
      );
      setBrands(filteredBrands);
    } else {
      setBrands([]);
    }
  }, [newProduct, groupings]);

  // ✅ Open Grouping Creation Modal
  const openGroupingModal = (level, parentId = null) => {
    setGroupingModalLevel(level);
    setGroupingModalParentId(parentId || "");
    setIsGroupingModalOpen(true);
  };

  // ✅ Close Grouping Modal
  const closeGroupingModal = () => {
    setIsGroupingModalOpen(false);
    setGroupingModalLevel("");
    setGroupingModalParentId("");
  };

  // ✅ Handle Grouping Save
  const handleSaveGrouping = async (groupingData) => {
    setLoading(true);
    try {
      const createdGrouping = await productAPI.createGrouping(groupingData);

      if (createdGrouping) {
        // Immediately update local state with new grouping
        setGroupings([...groupings, createdGrouping]);

        // Auto-select the newly created grouping based on level
        if (groupingModalLevel === "1") {
          // Department level - auto-select and trigger category change
          setDepartments([...departments, createdGrouping]);
          
          // ✅ NEW: Clear department search filter so newly created item appears in dropdown
          if (basicInfoTabRef.current) {
            basicInfoTabRef.current.setDepartmentSearchValue(createdGrouping.name);
          }
          
          // Barcode generation logic must be outside setNewProduct callback
          try {
            const deptId =
              newProduct.categoryId && typeof newProduct.categoryId === "object" && newProduct.categoryId !== null
                ? newProduct.categoryId._id
                : newProduct.categoryId;

            const barcode = generateBarcode(
              newProduct.itemcode,
              deptId,
              departments,
            );
            
            setNewProduct({ ...newProduct, barcode });
            // Use functional update to ensure latest pricingLines
            setPricingLines((prev) => {
              const updated = [...prev];
              if (updated[0]) {
                updated[0].barcode = barcode;
              }
              return updated;
            });
            debugLogger.success("Product", "Barcode generated", { barcode });
          } catch (error) {
            debugLogger.error("Product", "Failed to generate barcode", error);
            toast.error("Failed to generate barcode");
          }

          // Clear brands when sub-department changes
          setBrands([]);
        } else if (groupingModalLevel === "2") {
          // Sub-department level - auto-select and update brands
          // ✅ NEW: Clear subdepartment search filter
          if (basicInfoTabRef.current) {
            basicInfoTabRef.current.setSubdepartmentSearchValue(createdGrouping.name);
          }
          
          const parentId = createdGrouping.parentId?._id;
          const filteredBrands = groupings.filter(
            (g) => g.parentId?._id === parentId,
          );
          setBrands(filteredBrands);
        } else if (groupingModalLevel === "3") {
          // Brand level - auto-select
          
          // ✅ NEW: Clear brand search filter  
          if (basicInfoTabRef.current) {
            basicInfoTabRef.current.setBrandSearchValue(createdGrouping.name);
          }
          
          const parentId = createdGrouping.parentId?._id;
          const filteredBrands = groupings.filter(
            (g) => g.parentId?._id === parentId,
          );
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

  // ✅ Open/Close Vendor Modal
  const openVendorModal = () => {
    setSelectedVendor(null); // Create new vendor
    setIsVendorModalOpen(true);
  };

  const closeVendorModal = () => {
    setIsVendorModalOpen(false);
    setSelectedVendor(null);
  };

  // ✅ NEW: Sync checked rows from BasicInfoTab to selectedPricingLines in context
  const handleCheckedRowsChange = useCallback((checkedRows) => {
    const selected = new Set();
    // Always include row 0 (base unit)
    selected.add(0);
    // Include other rows that are checked
    for (let i = 1; i < checkedRows.length; i++) {
      if (checkedRows[i]) {
        selected.add(i);
      }
    }
    setSelectedPricingLines(selected);
  }, []);

  // ✅ Handle Vendor Form Success (create or update)
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

  // ✅ Open Pricing Level Modal for a specific unit
  const openPricingLevelModal = (index) => {
    // Get the unit for the selected pricing line
    const selectedUnit = pricingLines[index];
    if (!selectedUnit || !selectedUnit.unit) {
      toast.error("Please select a unit first", { duration: 3000 });
      return;
    }

    // Find the unit object from the units array to get unitName
    const unitObj = units.find((u) => String(u._id) === String(selectedUnit.unit));
    if (!unitObj) {
      toast.error("Unit not found", { duration: 3000 });
      return;
    }

    // ✅ Debug: Log what we have
    console.log(`📊 Opening Pricing Level Modal for unit index ${index}`);
    console.log(`newProduct.pricingLevels:`, newProduct.pricingLevels);
    console.log(`newProduct.pricingLevels[${index}]:`, newProduct.pricingLevels?.[index]);

    // ✅ Load existing pricing levels for this unit from newProduct.pricingLevels
    // Check if object exists (even if values are null)
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
      console.log(`✅ Successfully loaded pricing levels for unit ${index}:`, levelData);
    } else {
      // No existing levels, reset to empty
      setPricingLevels({
        level1: "",
        level2: "",
        level3: "",
        level4: "",
        level5: "",
      });
      console.log(`ℹ️ No pricing level data found for unit ${index}, starting fresh`);
    }

    // Set the selected unit and open modal
    setSelectedUnitForCustomerPricing({
      unit: selectedUnit.unit,
      index,
      unitName: unitObj.unitName,
    });
    setIsCustomerPricingModalOpen(true);
  };

  // ✅ SUB-MODAL HANDLERS (Nested Modal inside Product Modal)
  const closeSubModal = () => {
    setIsSubModalOpen(false);
    setSubModalType("");
  };

  // ✅ Handle Group Filterings Edit Pricechange
  useEffect(() => {
    const loadProducts = async () => {
      const fetchedProducts = await productAPI.fetchProducts(
        selectedGroupingFilter,
      );
      setProducts(fetchedProducts);
    };
    loadProducts();
  }, [selectedGroupingFilter]); // Only selectedGroupingFilter - productAPI.fetchProducts is stable via useCallback

  // ✅ Validate Product
  const validateProduct = () => {
    const newErrors = {};

    // Check barcode from pricingLines (base row at index 0)
    const baseBarcode = pricingLines[0]?.barcode;
    const baseCost = pricingLines[0]?.cost;
    const basePrice = pricingLines[0]?.price;
    const baseUnit = pricingLines[0]?.unit; // ✅ Check unit is selected
    const baseFactor = pricingLines[0]?.factor; // Base unit factor (always 1, defaults if empty)
    
    // 🔍 DEBUG: Log exact factor value
    console.log("🔍 DEBUG baseFactor value:", {
      value: baseFactor,
      type: typeof baseFactor,
      isUndefined: baseFactor === undefined,
      isNull: baseFactor === null,
      isEmpty: baseFactor === "",
      isZero: baseFactor === 0,
      isOne: baseFactor === 1,
      parseFloatValue: parseFloat(baseFactor),
      pricingLinesRow0: pricingLines[0],
    });

    // For base unit (index 0), factor should be 1 or empty (we treat empty as 1)
    const isBaseFactorValid =
      !baseFactor ||
      baseFactor === 1 ||
      (baseFactor &&
        !isNaN(parseFloat(baseFactor)) &&
        parseFloat(baseFactor) === 1);

    // itemcode is optional - will be auto-generated if not provided
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
    // Stock can be 0 (default), only validate if provided
    if (newProduct.stock !== '' && newProduct.stock !== null && newProduct.stock !== undefined) {
      const stockNum = parseInt(newProduct.stock);
      if (isNaN(stockNum) || stockNum < 0) {
        newErrors.stock = "Stock must be a valid number >= 0";
      }
    }

    // Check categoryId - can be string or object with _id (REQUIRED)
    const categoryIdValue =
      typeof newProduct.categoryId === "object"
        ? newProduct.categoryId?._id
        : newProduct.categoryId;
    if (!categoryIdValue) newErrors.categoryId = "Department is required";

    // Check groupingId - can be string or object with _id (OPTIONAL - not all products need sub-dept)
    // No validation needed - user can leave it empty

    // ✅ NEW: Validate scaleUnitType when isScaleItem is true
    if (newProduct.isScaleItem && !newProduct.scaleUnitType) {
      newErrors.scaleUnitType = 'Unit of measure is required when Scale Item is enabled';
    }
    
    return newErrors;
  };

  // ✅ Enrich search results with category names (populates categoryId.name from departments array)
  // NOTE: Meilisearch stores categoryId as DEPARTMENT NAME (string), not ObjectId
  const enrichedApiSearchResults = (Array.isArray(apiSearchResults) ? apiSearchResults : []).map((prod) => {
    let enrichedCategoryId = prod.categoryId;
    
    if (prod.categoryId) {
      // Meilisearch returns categoryId as a string (typically the department name like "COSMECTICS")
      const categoryIdStr = String(prod.categoryId);
      
      // Try to find by NAME first (Meilisearch stores the name)
      let category = departments.find(d => d.name === categoryIdStr);
      
      // If not found by name, try by ObjectId
      if (!category) {
        category = departments.find(d => String(d._id) === categoryIdStr);
      }
      
      // If found, enrich with full department object. Otherwise keep as-is with '-' fallback
      if (category) {
        enrichedCategoryId = { _id: category._id, name: category.name };
      } else {
        enrichedCategoryId = { _id: categoryIdStr, name: '-' };
      }
    }
    
    return {
      ...prod,
      categoryId: enrichedCategoryId
    };
  });

  // ✅ Advanced Search Filter - Define BEFORE using it
  const applyAdvancedFilters = (products = []) => {
    // Ensure products is an array
    const productArray = Array.isArray(products) ? products : [];
    
    return productArray.filter((prod) => {
      if (
        advancedFilters.vendor &&
        !prod.vendor
          .toLowerCase()
          .includes(advancedFilters.vendor.toLowerCase())
      )
        return false;
      if (
        advancedFilters.minCost &&
        parseFloat(prod.cost) < parseFloat(advancedFilters.minCost)
      )
        return false;
      if (
        advancedFilters.maxCost &&
        parseFloat(prod.cost) > parseFloat(advancedFilters.maxCost)
      )
        return false;
      if (
        advancedFilters.minPrice &&
        parseFloat(prod.price) < parseFloat(advancedFilters.minPrice)
      )
        return false;
      if (
        advancedFilters.maxPrice &&
        parseFloat(prod.price) > parseFloat(advancedFilters.maxPrice)
      )
        return false;
      if (
        advancedFilters.minStock &&
        parseInt(prod.stock) < parseInt(advancedFilters.minStock)
      )
        return false;
      if (
        advancedFilters.maxStock &&
        parseInt(prod.stock) > parseInt(advancedFilters.maxStock)
      )
        return false;
      if (
        advancedFilters.category &&
        prod.categoryId?._id !== advancedFilters.category
      )
        return false;
      if (
        advancedFilters.subCategory &&
        prod.groupingId?._id !== advancedFilters.subCategory
      )
        return false;
      return true;
    });
  };

  // ✅ Use API search results if search is active, otherwise use infinite scroll products
  // Convert infinite products sparse map to array for filtering
  const infiniteProductsArray = Object.values(infiniteProductsMap).filter(p => p);
  let filteredProducts = search.trim() ? enrichedApiSearchResults : infiniteProductsArray;
  
  // Ensure filteredProducts is always an array
  if (!Array.isArray(filteredProducts)) {
    filteredProducts = [];
  }

  // Apply advanced filters if any are set
  if (Object.keys(advancedFilters).some((key) => advancedFilters[key])) {
    filteredProducts = applyAdvancedFilters(filteredProducts);
  }

  // ✅ NOTE: Pagination is now handled by VirtualizedProductTable + useInfiniteScroll hook
  // When using infinite scroll: VirtualizedProductTable renders only visible items
  // When using search/filters: Show filtered results (no pagination needed)

  // ✅ Open Add Modal - Now uses the master hook (extracted from Product.jsx)
  const openAddModal = () => {
    // Call hook's new product handler with current state
    _hookNew();
  };

  // ✅ Close Modal
  const closeModal = () => {
    setIsModalOpen(false);
    setIsEdit(false);
    setEditId(null);
    setErrors({});
    setModalSearchQuery("");
    setModalSearchResults([]);
    setShowModalSearchResults(false);
    setActiveTab("basic"); // Reset to basic tab
    lastSavedProductRef.current = null; // ✅ Reset ref when closing
    setNewProduct({
      itemcode: "",
      hsn: "",
      name: "",
      shortName: "",
      localName: "",
      categoryId: "",
      groupingId: "",
      brandId: "",
      vendor: "",
      unitType: "",
      factor: "",
      cost: "",
      costIncludeVat: "",
      marginPercent: "",
      marginAmount: "",
      taxType: "",
      taxPercent: "",
      taxAmount: "",
      taxInPrice: false,
      price: "",
      barcode: "",
      stock: "",
      packingUnits: [],
      unitVariants: [],
    });
    setPricingLines([
      {
        unit: "",
        factor: "",

        barcode: "",
        cost: "",
        costIncludetax: "",
        margin: "",
        marginAmount: "",
        taxAmount: "",
        price: "",
      },
      {
        unit: "",
        factor: "",

        barcode: "",
        cost: "",
        costIncludetax: "",
        margin: "",
        marginAmount: "",
        taxAmount: "",
        price: "",
      },
      {
        unit: "",
        factor: "",

        barcode: "",
        cost: "",
        costIncludetax: "",
        margin: "",
        marginAmount: "",
        taxAmount: "",
        price: "",
      },
      {
        unit: "",
        factor: "",

        barcode: "",
        cost: "",
        costIncludetax: "",
        margin: "",
        marginAmount: "",
        taxAmount: "",
        price: "",
      },
    ]);
    setSelectedPricingLines(new Set()); // Clear selected pricing lines
    prevTaxInPriceRef.current = false; // Reset tax tracking
    setSelectedCategoryId("");
    setSubdepartments([]);
    setBrands([]);
    setBarcodeVariants([]); // Reset barcode variants
  };

  // ✅ Reset Form for Creating New Product (keeps modal open)
  const resetForm = () => {
    setIsEdit(false);
    setEditId(null);
    setErrors({});
    setModalSearchQuery("");
    setModalSearchResults([]);
    setShowModalSearchResults(false);
    setActiveTab("basic"); // Reset to basic tab
    lastSavedProductRef.current = null; // ✅ Reset ref for next product
    
    // ✅ Show "Auto" in itemcode for next product
    // Server handles generation in FIFO order (first request gets next code)
    
    setNewProduct({
      itemcode: "Auto", // ✅ Indicates automatic generation (user can override)
      hsn: "",
      name: "",
      shortName: "",
      localName: "",
      categoryId: "",
      groupingId: "",
      brandId: "",
      vendor: "",
      unitType: "",
      factor: "",
      cost: "",
      costIncludeVat: "",
      marginPercent: "",
      marginAmount: "",
      taxType: "",
      taxPercent: "",
      taxAmount: "",
      taxInPrice: false,
      price: "",
      barcode: "",
      stock: "",
      packingUnits: [],
      unitVariants: [],
      image: null, // ✅ Reset product image
    });
    setPricingLines([
      {
        unit: "",
        factor: 1, // Base unit always has factor 1
        price: "",
        barcode: "",
        cost: "",
        costIncludetax: "",
        margin: "",
        marginAmount: "",
        taxAmount: "",
      },
      {
        unit: "",
        factor: "",
        price: "",
        barcode: "",
        cost: "",
        costIncludetax: "",
        margin: "",
        marginAmount: "",
        taxAmount: "",
      },
      {
        unit: "",
        factor: "",
        price: "",
        barcode: "",
        cost: "",
        costIncludetax: "",
        margin: "",
        marginAmount: "",
        taxAmount: "",
      },
      {
        unit: "",
        factor: "",
        price: "",
        barcode: "",
        cost: "",
        costIncludetax: "",
        margin: "",
        marginAmount: "",
        taxAmount: "",
      },
    ]);
    setSelectedPricingLines(new Set()); // Clear selected pricing lines
    prevTaxInPriceRef.current = false; // Reset tax tracking
    setSelectedCategoryId("");
    setSubdepartments([]);
    setBrands([]);
    setBarcodeVariants([]); // Reset barcode variants
    // Modal stays open - user can start creating new product
  };

  // Product Create/Edit Logic:
  // Step 1: Validate all fields (required fields, format, etc.)
  // Step 2: If creating new product, check if item code already exists
  // Step 3: Validate all barcodes are unique across database
  // ✅ Save Product - Now uses the master hook (extracted from Product.jsx)
  // The hook's handleSaveProduct is invoked directly from GlobalProductFormModal
  // This wrapper is kept for reference but no longer called from Product.jsx
  const handleSaveProduct = async () => {
    console.warn("⚠️ handleSaveProduct in Product.jsx is deprecated - use GlobalProductFormModal instead");
  };

  // ✅ Edit - Now uses the master hook (extracted from Product.jsx)
  const handleEdit = async (prod) => {
    // Call hook's edit handler with current products/filteredProducts state
    await _hookEdit(prod);
  };

  // ✅ Navigate to Next Product in Modal
  const handleNextProduct = () => {
    if (editIndex >= 0 && editIndex < filteredProducts.length - 1) {
      const nextProd = filteredProducts[editIndex + 1];
      handleEdit(nextProd);
    } else if (editIndex === filteredProducts.length - 1) {
      // If at last product, create new product with next item code
      const currentItemCode = parseInt(newProduct.itemcode.replace(/\D/g, ""));
      const nextItemCode = String(currentItemCode + 1);
      setIsEdit(false);
      setEditId(null);
      setEditIndex(-1);
      setNewProduct({
        itemcode: "", // Auto-generated by server
        hsn: "",
        barcode: "",
        name: "",
        vendor: "",
        cost: "",
        price: "",
        stock: "",
        categoryId: "",
        groupingId: "",
        packingUnits: [],
      });
      setErrors({});
    }
  };

  // ✅ Navigate to Previous Product in Modal
  const handlePrevProduct = () => {
    if (editIndex > 0) {
      const prevProd = filteredProducts[editIndex - 1];
      handleEdit(prevProd);
    }
  };

  // ✅ Search Product by Barcode or Item Code in Modal
  // Uses debounced search to prevent UI freeze during rapid typing
  const handleModalSearch = (query) => {
    setModalSearchQuery(query);

    if (query.trim() === "") {
      setModalSearchResults([]);
      setShowModalSearchResults(false);
      return;
    }

    // Debounce search to prevent rapid API calls
    if (modalSearchDebounceRef.current) {
      clearTimeout(modalSearchDebounceRef.current);
    }

    modalSearchDebounceRef.current = setTimeout(() => {
      const results = products.filter(
        (p) =>
          p.barcode?.toString().includes(query) ||
          p.itemcode?.toString().includes(query) ||
          p.name?.toLowerCase().includes(query.toLowerCase()),
      );

      setModalSearchResults(results);
      setShowModalSearchResults(true);
    }, 300); // Debounce for 300ms
  };

  // ✅ Populate Modal Form with Selected Product
  const handleSelectProductFromSearch = (prod) => {
    setNewProduct({
      ...prod,
      categoryId: (prod.categoryId?._id || prod.categoryId)
        ? { _id: typeof prod.categoryId === 'object' ? prod.categoryId._id : prod.categoryId, name: getCategoryName(prod.categoryId) }
        : "",
      groupingId: (prod.groupingId?._id || prod.groupingId)
        ? { _id: prod.groupingId?._id, name: prod.groupingId?.name }
        : "",
    });
    setModalSearchQuery("");
    setModalSearchResults([]);
    setShowModalSearchResults(false);

    // Load subdepartments for the product's category
    if (prod.categoryId?._id) {
      setSelectedCategoryId(prod.categoryId._id);
      const subs = groupings.filter(
        (g) => g.parentId?._id === prod.categoryId._id,
      );
      setSubdepartments(subs);
    }
  };

  // ✅ Delete
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this product?"))
      return;

    setLoading(true);

    try {
      const success = await productAPI.deleteProduct(id);
      if (success) {
        setProducts(products.filter((p) => p._id !== id));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };





  // ✅ Export Products to CSV
  const exportToCSV = () => {
    const baseData = search.trim() ? enrichedApiSearchResults : infiniteProductsArray;
    const dataToExport = Object.keys(advancedFilters).some(
      (key) => advancedFilters[key],
    )
      ? applyAdvancedFilters(baseData)
      : baseData;

    if (dataToExport.length === 0) {
      toast.error("No products to export", {
        duration: 3000,
        position: "top-center",
      });
      return;
    }

    const headers = [
      "Item Code",
      "HSN Code",
      "Barcode",
      "Name",
      "Department",
      "Sub-Department",
      "Vendor",
      "Cost",
      "Price",
      "Stock",
    ];
    const rows = dataToExport.map((prod) => [
      prod.itemcode,
      prod.hsn || "-",
      prod.barcode,
      prod.name,
      getCategoryName(prod.categoryId),
      prod.groupingId?.name || "-",
      prod.vendor,
      prod.cost,
      prod.price,
      prod.stock,
    ]);

    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `products_${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  // ✅ Print Barcode Labels - Batch printing implementation
  const printBarcodeLabels = () => {
    const productsToPrint =
      selectedForPrint.length > 0
        ? infiniteProductsArray.filter((p) => selectedForPrint.includes(p._id))
        : filteredProducts;

    if (productsToPrint.length === 0) {
      toast.error("No products selected for printing", {
        duration: 3000,
        position: "top-center",
      });
      return;
    }

    const printWindow = window.open("", "", "width=800,height=600");
    const barcodeHTML = `
      <html>
        <head>
          <title>Barcode Labels</title>
          <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
          <style>
            body { font-family: Arial, sans-serif; margin: 10px; }
            .barcode-label { 
              display: inline-block; 
              margin: 10px; 
              padding: 10px; 
              border: 1px solid #ccc;
              width: 280px;
              text-align: center;
              page-break-inside: avoid;
            }
            .label-name { font-weight: bold; font-size: 12px; margin: 5px 0; }
            .label-code { font-size: 10px; color: #666; margin: 5px 0; }
            .label-price { font-weight: bold; font-size: 14px; margin: 5px 0; }
            svg { max-width: 100%; }
            @media print {
              body { margin: 0; }
              .barcode-label { page-break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          ${productsToPrint
            .map(
              (prod) => `
            <div class="barcode-label">
              <div class="label-name">${prod.name}</div>
              <div class="label-code">${prod.itemcode}</div>
              <svg id="barcode-${prod._id}"></svg>
              <div class="label-price">PKR ${round(parseFloat(prod.price))}</div>
            </div>
          `,
            )
            .join("")}
          <script>
            ${productsToPrint
              .map(
                (prod) => `
              JsBarcode("#barcode-${prod._id}", "${prod.barcode || prod.itemcode}", {
                format: "CODE128",
                width: 2,
                height: 50,
                displayValue: true
              });
            `,
              )
              .join("")}
            window.print();
          </script>
        </body>
      </html>
    `;
    printWindow.document.write(barcodeHTML);
    printWindow.document.close();
  };

  // ✅ Print Barcodes - Global Barcode Print Modal
  // Opens the barcode print modal with enhanced formatting options
  const printBarcodesGlobal = () => {
    const productsToPrint =
      selectedForPrint.length > 0
        ? infiniteProductsArray.filter((p) => selectedForPrint.includes(p._id))
        : filteredProducts;

    if (productsToPrint.length === 0) {
      toast.error("No products selected for printing", {
        duration: 3000,
        position: "top-center",
      });
      return;
    }

    // If single product, open modal with that product
    if (productsToPrint.length === 1) {
      const product = productsToPrint[0];
      setNewProduct({
        ...newProduct,
        barcode: product.barcode || product.itemcode,
        name: product.name,
      });
      setShowBarcodePrintPopup(true);
    } else {
      // Multiple products - use batch print
      console.log(`🖨️ Opening barcode print for ${productsToPrint.length} product(s)`);
      printBarcodeLabels();
    }
  };

  // ✅ Reset Advanced filters
  const resetAdvancedFilters = () => {
    setAdvancedFilters({
      vendor: "",
      minCost: "",
      maxCost: "",
      minPrice: "",
      maxPrice: "",
      minStock: "",
      maxStock: "",
      category: "",
      subCategory: "",
    });
    setCurrentPage(1);
  };

  return (
    <div className="absolute inset-0 flex flex-col bg-gray-100 overflow-hidden">
      {/* HEADER - Fixed at top */}
      <div className="flex-shrink-0 bg-white to-gray- text-white px-6 py-4 shadow-lg z-10">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800">📦 Products</h1>
          <div className="flex items-center gap-1 bg-white px-3 py-2 rounded-lg">
            <button
              onClick={exportToCSV}
              className="flex items-center gap-1 bg-green-600 text-white px-2 py-1 rounded-lg hover:bg-green-700 transition text-xs"
            >
              <Download size={14} /> Export CSV
              {filteredProducts.length > 0 && (
                <span className="ml-1 text-xs">
                  ({filteredProducts.length})
                </span>
              )}
            </button>
            <button
              onClick={() => setShowAdvancedSearch(!showAdvancedSearch)}
              className="flex items-center gap-1 bg-blue-600 text-white px-2 py-1 rounded-lg hover:bg-blue-700 transition text-xs relative"
            >
              <Filter size={14} /> Advanced Search
              {Object.values(advancedFilters).some((v) => v) && (
                <span className="ml-2 bg-blue-800 px-1.5 py-0.5 rounded text-xs font-semibold">
                  {Object.values(advancedFilters).filter((v) => v).length}
                </span>
              )}
            </button>
            <button
              onClick={() => setShowBarcodePrintPopup(true)}
              className="flex items-center gap-1 bg-purple-600 text-white px-2 py-1 rounded-lg hover:bg-purple-700 transition text-xs"
            >
              <Printer size={14} /> Print Barcodes
              {selectedForPrint.length > 0 && (
                <span className="ml-1 bg-purple-800 px-1.5 py-0.5 rounded text-xs font-semibold">
                  {selectedForPrint.length} selected
                </span>
              )}
            </button>
            <button
              onClick={openAddModal}
              disabled={loading}
              className="flex items-center gap-1 bg-gray-900 text-white px-2 py-1 rounded-lg hover:bg-gray-800 transition text-xs disabled:opacity-50"
            >
              <Plus size={14} /> Add Product
            </button>
          </div>
        </div>
      </div>

      {/* DETAILS - Content Section - Scrollable */}
      <div className="flex-1 flex flex-col p-4 min-h-0 overflow-hidden">
        {/* Search & Filters - Fixed */}
        <div className="flex-shrink-0 mb-2">
          {/* Advanced Search Panel */}
          {showAdvancedSearch && (
            <div className="mb-1 p-1.5 pb-2.5 bg-cyan-50 border border-cyan-300 rounded-lg w-full">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-semibold text-gray-800 text-xs">Filters</h3>
                <button
                  onClick={() => setShowAdvancedSearch(false)}
                  className="text-gray-600 hover:text-gray-800"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Row 1: Categories & Reset Button */}
              <div className="flex gap-2 text-xs items-center w-full justify-between mb-2 pt-1">
                {/* Vendor */}
                <div className="flex items-center gap-1 flex-1">
                  <label className="text-gray-600 font-semibold whitespace-nowrap">
                    Vendor:
                  </label>
                  <input
                    type="text"
                    placeholder="Vendor"
                    value={advancedFilters.vendor}
                    onChange={(e) =>
                      setAdvancedFilters({
                        ...advancedFilters,
                        vendor: e.target.value,
                      })
                    }
                    className="border rounded px-1.5 py-0.5 text-xs flex-1"
                  />
                </div>

                {/* Department */}
                <div className="flex items-center gap-1 flex-1">
                  <label className="text-gray-600 font-semibold whitespace-nowrap">
                    Dept:
                  </label>
                  <select
                    value={advancedFilters.category}
                    onChange={(e) =>
                      setAdvancedFilters({
                        ...advancedFilters,
                        category: e.target.value,
                      })
                    }
                    className="border rounded px-1.5 py-0.5 text-xs flex-1"
                  >
                    <option value="">All</option>
                    {departments.map((dept) => (
                      <option key={dept._id} value={dept._id}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Sub-Department */}
                <div className="flex items-center gap-1 flex-1">
                  <label className="text-gray-600 font-semibold whitespace-nowrap">
                    Sub:
                  </label>
                  <select
                    value={advancedFilters.subCategory}
                    onChange={(e) =>
                      setAdvancedFilters({
                        ...advancedFilters,
                        subCategory: e.target.value,
                      })
                    }
                    className="border rounded px-1.5 py-0.5 text-xs flex-1"
                  >
                    <option value="">All</option>
                    {groupings.map((g) => (
                      <option key={g._id} value={g._id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Reset Button */}
                <button
                  onClick={resetAdvancedFilters}
                  className="px-1.5 py-0.5 bg-gray-600 text-white rounded hover:bg-gray-700 transition text-xs font-semibold whitespace-nowrap flex-shrink-0"
                >
                  Reset
                </button>
              </div>

              {/* Row 2: Price Ranges & Apply Button */}
              <div className="flex gap-2 text-xs items-center w-full justify-between pt-1">
                {/* Cost Range */}
                <div className="flex items-center gap-1 flex-1 min-w-0">
                  <label className="text-gray-600 font-semibold whitespace-nowrap">
                    Cost:
                  </label>
                  <input
                    type="number"
                    placeholder="Min"
                    value={advancedFilters.minCost}
                    onChange={(e) =>
                      setAdvancedFilters({
                        ...advancedFilters,
                        minCost: e.target.value,
                      })
                    }
                    className="border rounded px-1 py-0.5 text-xs flex-1 min-w-0"
                  />
                  <input
                    type="number"
                    placeholder="Max"
                    value={advancedFilters.maxCost}
                    onChange={(e) =>
                      setAdvancedFilters({
                        ...advancedFilters,
                        maxCost: e.target.value,
                      })
                    }
                    className="border rounded px-1 py-0.5 text-xs flex-1 min-w-0"
                  />
                </div>

                {/* Price Range */}
                <div className="flex items-center gap-1 flex-1 min-w-0">
                  <label className="text-gray-600 font-semibold whitespace-nowrap">
                    Price:
                  </label>
                  <input
                    type="number"
                    placeholder="Min"
                    value={advancedFilters.minPrice}
                    onChange={(e) =>
                      setAdvancedFilters({
                        ...advancedFilters,
                        minPrice: e.target.value,
                      })
                    }
                    className="border rounded px-1 py-0.5 text-xs flex-1 min-w-0"
                  />
                  <input
                    type="number"
                    placeholder="Max"
                    value={advancedFilters.maxPrice}
                    onChange={(e) =>
                      setAdvancedFilters({
                        ...advancedFilters,
                        maxPrice: e.target.value,
                      })
                    }
                    className="border rounded px-1 py-0.5 text-xs flex-1 min-w-0"
                  />
                </div>

                {/* Stock Range */}
                <div className="flex items-center gap-1 flex-1 min-w-0">
                  <label className="text-gray-600 font-semibold whitespace-nowrap">
                    Stock:
                  </label>
                  <input
                    type="number"
                    placeholder="Min"
                    value={advancedFilters.minStock}
                    onChange={(e) =>
                      setAdvancedFilters({
                        ...advancedFilters,
                        minStock: e.target.value,
                      })
                    }
                    className="border rounded px-1 py-0.5 text-xs flex-1 min-w-0"
                  />
                  <input
                    type="number"
                    placeholder="Max"
                    value={advancedFilters.maxStock}
                    onChange={(e) =>
                      setAdvancedFilters({
                        ...advancedFilters,
                        maxStock: e.target.value,
                      })
                    }
                    className="border rounded px-1 py-0.5 text-xs flex-1 min-w-0"
                  />
                </div>

                {/* Apply Button */}
                <button
                  onClick={() => setCurrentPage(1)}
                  className="px-1.5 py-0.5 bg-blue-600 text-white rounded hover:bg-blue-700 transition text-xs font-semibold whitespace-nowrap flex-shrink-0"
                >
                  Apply
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Search and Grouping Filter */}
        <div className="flex-shrink-0 flex flex-col lg:flex-row gap-2 mb-2 items-stretch lg:items-center">
          <div className="flex items-center gap-2 border border-gray-300 rounded-lg px-3 bg-white flex-grow h-9">
            {searchLoading ? (
              <div className="flex-shrink-0 text-gray-500">
                <div className="animate-spin inline-block w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full"></div>
              </div>
            ) : (
              <Search size={16} className="flex-shrink-0 text-gray-500" />
            )}
            <input
              type="text"
              placeholder="Search product name, barcode, or item code..."
              className={`border-0 p-0 outline-none w-full text-xs ${searchError ? 'ring-1 ring-red-500' : ''}`}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                // Page reset happens in debounce effect after 300ms
              }}
            />
            {searchError && (
              <span className="text-red-500 text-xs flex-shrink-0" title={searchError}>⚠</span>
            )}
          </div>
          <select
            className="border border-gray-300 rounded-lg px-3 text-xs bg-white flex-shrink-0 h-9"
            value={selectedGroupingFilter}
            onChange={(e) => {
              setSelectedGroupingFilter(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="">All Categories</option>
            {groupings.map((g) => (
              <option key={g._id} value={g._id}>
                {g.name}
              </option>
            ))}
          </select>
        </div>

        {/* ✅ VIRTUALIZED INFINITE SCROLL TABLE */}
        {loading && Object.keys(infiniteProductsMap).length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <div className="flex flex-col items-center gap-2">
              <div className="animate-spin w-6 h-6 border-3 border-blue-500 border-t-transparent rounded-full"></div>
              <p className="text-gray-500 text-sm">Loading products...</p>
            </div>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <p className="text-gray-500 text-sm">No products found</p>
          </div>
        ) : (
          <div className="flex-1 bg-white rounded-lg shadow-sm border flex flex-col min-h-0 overflow-hidden">
            <div className="flex-1 overflow-hidden">
              <VirtualizedProductTable
                productsMap={infiniteProductsMap}
                totalProducts={totalInfiniteProducts}
                isLoading={isLoadingInfinite}
                onPageChange={fetchNextPageInfinite}
                onEdit={(product) => handleEdit(product)}
                onDelete={(productId) => handleDelete(productId)}
                onDownload={(product) => console.log('Download:', product)}
                itemsPerPage={itemsPerPage}
                rowHeight={36}
                containerHeight={window.innerHeight - 320}
              />
            </div>
            {/* Footer - Total Product Count */}
            <div className="flex-shrink-0 bg-gradient-to-r from-blue-50 to-blue-100 border-t-2 border-blue-300 px-4 py-2 flex items-center justify-end shadow-md gap-4">
              <div className="text-xs">
                <span className="font-semibold text-blue-900">Total Products:</span> <span className="font-bold text-blue-600">{totalInfiniteProducts.toLocaleString()}</span>
              </div>
              <div className="text-xs text-blue-500">
                {isLoadingInfinite && <span className="font-semibold">Loading...</span>}
              </div>
            </div>
          </div>
        )}

        {/* ✅ FOOTER - Total Product Count Info */}
        {/* Displays at the bottom of the product table */}
      </div>

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        width="max-w-5xl lg:max-w-6xl"
        draggable={true}
      >
        <div className="bg-white w-full h-[630px] rounded-lg flex flex-col overflow-hidden">
          {/* Header */}
          <div className="modal-drag-handle  flex items-center gap-1 pb-1 border-b border-gray-200 pr-10 cursor-move select-none flex-shrink-0">
            {/* Left: Title */}
            <h2 className="text-base lg:text-lg font-semibold whitespace-nowrap flex-shrink-0">
              {isEdit ? "Update Product" : "Add New Product"}
            </h2>

            {/* Spacer */}
            <div className="flex-1"></div>

            {/* Right: Quick Search */}
            <div className="relative w-48 flex-shrink-0 pointer-events-auto">
              <input
                type="text"
                placeholder="🔍 Barcode or Item Code..."
                className="w-full border border-blue-300 p-1.5 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-blue-50"
                value={modalSearchQuery}
                onChange={(e) => handleModalSearch(e.target.value)}
                onMouseDown={(e) => e.stopPropagation()}
              />

              {/* Search Results Dropdown */}
              {showModalSearchResults && modalSearchResults.length > 0 && (
                <div
                  className="absolute top-full left-0 right-0 mt-1 border border-gray-300 bg-white rounded shadow-lg z-50 max-h-40 overflow-y-auto pointer-events-auto"
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  {modalSearchResults.map((prod) => (
                    <button
                      key={prod._id}
                      onClick={() => handleSelectProductFromSearch(prod)}
                      className="w-full text-left px-3 py-2 hover:bg-blue-50 border-b last:border-b-0 text-xs"
                      onMouseDown={(e) => e.stopPropagation()}
                    >
                      <div className="font-semibold text-gray-800">
                        {prod.name}
                      </div>
                      <div className="text-gray-600 text-xs">
                        Code: {prod.itemcode} | Barcode: {prod.barcode}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Right: Navigation */}
            {filteredProducts.length > 0 && (
              <div className="flex gap-1 items-center border-l border-gray-300 pl-2 flex-shrink-0 pointer-events-auto bg-gray-50 rounded">
                <button
                  onClick={handlePrevProduct}
                  className={`px-2 py-0.5 border rounded text-xs cursor-pointer
        ${
          editIndex <= 0
            ? "bg-gray-200 text-gray-400 border-gray-300"
            : "bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200"
        }`}
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  ← Prev
                </button>

                <span className="text-xs text-gray-700 px-2 py-0.5 bg-gray-200 rounded whitespace-nowrap">
                  {editIndex >= 0 ? editIndex + 1 : 0} /{" "}
                  {filteredProducts.length}
                </span>

                <button
                  onClick={handleNextProduct}
                  className={`px-2 py-0.5 border rounded text-xs cursor-pointer
        ${
          editIndex >= filteredProducts.length - 1
            ? "bg-gray-200 text-gray-400 border-gray-300"
            : "bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200"
        }`}
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  Next →
                </button>
              </div>
            )}
          </div>

          {/* Tab Navigation */}
          <div className="flex gap-1 border-b border-gray-300 bg-white pointer-events-auto overflow-x-auto flex-shrink-0">
            <button
              onClick={() => setActiveTab("basic")}
              onMouseDown={(e) => e.stopPropagation()}
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
              onMouseDown={(e) => e.stopPropagation()}
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
              onMouseDown={(e) => e.stopPropagation()}
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
              onMouseDown={(e) => e.stopPropagation()}
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
              onMouseDown={(e) => e.stopPropagation()}
              className={`px-3 py-1 text-xs font-medium border-b-2 transition cursor-pointer whitespace-nowrap ${
                activeTab === "history"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-600 hover:text-gray-800"
              }`}
            >
              History
            </button>
          </div>

          {/* Tab Content - Scrollable Container */}
          {/* ✅ FIX: Tab content fills available space with flex-1 */}
          <div 
            ref={tabContentRef}
            className="flex-1 overflow-auto"
          >
            {/* BASIC INFO TAB */}
            {activeTab === "basic" && (
              <BasicInfoTab
                ref={basicInfoTabRef}
                newProduct={newProduct}
                setNewProduct={setNewProduct}
                errors={errors}
                loading={loading}
                isIndiaCompany={isIndiaCompany}
                hsnCodes={hsnCodes}
                loadingHsn={loadingHsn}
                departments={departments}
                subdepartments={subdepartments}
                brands={brands}
                vendors={vendors}
                units={units}
                filteredTaxes={filteredTaxes}
                loadingTaxes={loadingTaxes}
                activeCountryCode={activeCountryCode}
                onHSNSelection={handleHSNSelection}
                onCategoryChange={handleCategoryChange}
                onSubdepartmentChange={handleSubdepartmentChange}
                onOpenGroupingModal={openGroupingModal}
                onOpenVendorModal={openVendorModal}
                onOpenPricingLevelModal={openPricingLevelModal}
                pricingLines={pricingLines}
                onPricingFieldChange={calculatePricingFields}
                onGenerateBarcode={handleGenerateBarcodeOnServer}
                handleTaxSelectionAndRecalculation={handleTaxSelectionAndRecalculation}
                onCheckedRowsChange={handleCheckedRowsChange} // ✅ NEW: Sync checked rows from BasicInfoTab
                round={round}
                formatNumber={formatNumber}
              />
            )}

            {/* MORE INFO TAB */}
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

            {/* IMAGE TAB */}
            {activeTab === 'image' && (
              <ImageTab loading={loading} newProduct={newProduct} setNewProduct={setNewProduct} />
            )}

            {/* STOCK BATCH TAB */}
            {activeTab === "batch" && (
              <StockBatchManagement
                productId={newProduct._id || ""}
                productName={newProduct.name}
              />
            )}

            {/* HISTORY TAB */}
            {activeTab === "history" && <HistoryTab product={newProduct} />}
          </div>

          {/* Action Buttons - Fixed at Bottom */}
          <div className="flex gap-2 pt-1 border-t border-gray-300 flex-wrap justify-between items-center flex-shrink-0">
            {/* Delete Button - Left Aligned */}
            <button
              onClick={() => {
                handleDelete(editId);
                closeModal();
              }}
              className="flex items-center gap-1 bg-red-600 text-white px-2 py-1 rounded text-xs hover:bg-red-700 transition font-medium flex-shrink-0"
            >
              Delete
            </button>

            {/* Right Aligned Buttons */}
            <div className="flex gap-2 flex-wrap justify-end">
              {/* ✅ SUB-MODAL TRIGGER BUTTONS (Examples) */}

              {/* Barocde Print Button - Visible only when editing existing product */}

              <button
                onClick={handleBarcodePrint}
                className="flex items-center gap-1 bg-purple-600 text-white px-2 py-1 rounded text-xs hover:bg-purple-700 transition font-medium flex-shrink-0"
                title="Print barcode labels in various formats"
              >
                🖨️ Print Barcode
              </button>

              <button
                onClick={handleSaveProduct}
                disabled={loading}
                className="flex items-center gap-1 bg-green-600 text-white px-2 py-1 rounded text-xs hover:bg-green-700 transition font-medium flex-shrink-0"
              >
                {loading
                  ? "Processing..."
                  : isEdit
                    ? "Update Product"
                    : "Save Product"}
              </button>
              <button
                onClick={resetForm}
                disabled={loading}
                className="flex items-center gap-1 bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 text-xs disabled:opacity-50 font-medium flex-shrink-0"
              >
                ➕ New Product
              </button>
            </div>
          </div>
        </div>
      </Modal>

      {/* ✅ PRICING LEVELS MODAL (Level 1, 2, 3, 4, 5) - DRAGGABLE */}
      <Modal
        isOpen={isCustomerPricingModalOpen}
        onClose={() => {
          setIsCustomerPricingModalOpen(false);
          setSelectedUnitForCustomerPricing(null);
        }}
        title={`⚙️ Pricing Levels - ${selectedUnitForCustomerPricing?.unitName || "Unit"}`}
        width="max-w-2xl"
        draggable={true}
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
                  // Show formatted if not focused (initial load), raw if focused (user editing)
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
                  // Show formatted if not focused (initial load), raw if focused (user editing)
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
                  // Show formatted if not focused (initial load), raw if focused (user editing)
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
                  // Show formatted if not focused (initial load), raw if focused (user editing)
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
                                    {line.barcode.substring(0, 10)}
                                    {line.barcode.length > 10 && (
                                      <div className="text-xs text-gray-600">
                                        {line.barcode.substring(10)}
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
                  toast.error("Please enter at least one pricing level", {
                    duration: 3000,
                    position: "top-center",
                  });
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
                toast.success("Pricing levels saved", { duration: 2000 });
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

      {/* ✅ EXTRACTED MODAL COMPONENTS */}
      <GlobalBarcodePrintModal
        isOpen={showBarcodePrintPopup}
        onClose={() => setShowBarcodePrintPopup(false)}
        products={newProduct.id ? [newProduct] : []}
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
              : groupingModalLevel === "3"
                ? "Brand"
                : "Grouping"
        }
      />

      {/* Validation Error Modal - Centered on Screen */}
      {validationErrorModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setValidationErrorModal(false)}
        >
          <div 
            className="bg-white rounded-lg p-6 max-w-md w-96 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3 mb-4">
              <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <h2 className="text-lg font-bold text-gray-900">⚠️ Validation Error</h2>
                <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">{validationErrorList}</p>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4 border-t">
              <button
                onClick={() => setValidationErrorModal(false)}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      <Toaster position="top-right" />
    </div>
  );
};

export default Product;


