import React, {
  useState,
  useRef,
  useCallback,
  useEffect,
  useContext,
  useMemo,
} from "react";
import { useLocation } from "react-router-dom";
import { Plus, X, Search } from "lucide-react";
import { showToast } from "../shared/AnimatedCenteredToast.jsx";
import axios from "axios";

// Custom Hooks
import { useGrnFormData } from "../../hooks/useGrnFormData";
import { useGrnItemManagement } from "../../hooks/useGrnItemManagement";
import { useGrnApi } from "../../hooks/useGrnApi";
import { useGrnGridConfig } from "../../hooks/useGrnGridConfig";
import { useGrnGridDimensions } from "../../hooks/useGrnGridDimensions";
import { useProductSearch } from "../../hooks/useProductSearch";
import { useProductAPI } from "../../components/shared/sample/useProductAPI";
import useDecimalFormat from "../../hooks/useDecimalFormat";
import useGlobalKeyboard from "../../hooks/useGlobalKeyboard";

// Context - Global Product Form Modal
import { ProductFormContext } from "../../context/ProductFormContext";

// Utilities
import {
  calculateGrnTotals,
  calculateItemCost,
  calculateFocOnPost,
} from "../../utils/grnCalculations";
import { clearAllCache } from "../../utils/searchCache";
import { useGlobalBarcodeScanner } from "../../hooks/useGlobalBarcodeScanner";
import { normalizeBarcode } from "../../utils/barcodeUtils";
import { createBarcodeHandler } from "../../utils/barcodeHandler";

// Sub-Components
import GrnListTable from "./grn/GrnListTable";
import GrnFormHeader from "./grn/GrnFormHeader";
import GrnItemSearch from "./grn/GrnItemSearch";
import GrnBarcodeInput from "./grn/GrnBarcodeInput";
import GrnItemsTable from "./grn/GrnItemsTable";
import GrnUnitVariantSelector from "./grn/GrnUnitVariantSelector";
import BatchExpiryModal from "./grn/BatchExpiryModal";

// Config
import { API_URL } from "../../config/config";

const GrnForm = () => {
  // ✅ Country-based Decimal Format Hook
  const {
    formatCurrency,
    formatNumber,
    round,
    sum,
    parseInput,
    isValidDecimal,
  } = useDecimalFormat();
  const { registerShortcut } = useGlobalKeyboard();
  const location = useLocation();

  // Form State & Management
  const {
    formData,
    setFormData,
    editingId,
    setEditingId,
    resetForm,
    fetchNextGrnNo,
  } = useGrnFormData();

  // ✅ Global Product Form Context (with fallback for safety)
  const productFormContext = useContext(ProductFormContext);
  const { openProductForm, isOpen: isProductFormOpen } =
    productFormContext || {};

  // Search & Selection States
  const [showNewGrnModal, setShowNewGrnModal] = useState(false);
  const [isViewMode, setIsViewMode] = useState(false); // ✅ Read-only view mode
  const [itemSearch, setItemSearch] = useState("");
  const [barcodeValue, setBarcodeValue] = useState("");
  const [showUnitSelector, setShowUnitSelector] = useState(false);
  const [productForUnitSelection, setProductForUnitSelection] = useState(null);
  const [showBatchExpiryModal, setShowBatchExpiryModal] = useState(false);
  const [selectedBatchItem, setSelectedBatchItem] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0); // ✅ Force grid refresh when products update
  const [highlightedItemId, setHighlightedItemId] = useState(null); // ✅ Track newly added item for highlight
  const [editTargetItemId, setEditTargetItemId] = useState(null); // ✅ Open qty editor for duplicate scan target
  const [isAutoSearching, setIsAutoSearching] = useState(false); // Track if this is auto-search after product update
  const [isProcessing, setIsProcessing] = useState(false); // 🔴 Prevent double scan race condition

  // ✅ GRN Editability Check States
  const [showEditabilityWarning, setShowEditabilityWarning] = useState(false); // Show warning modal for non-editable GRN
  const [editabilityWarning, setEditabilityWarning] = useState(null); // { canEdit, reason, grnData }
  const [isCheckingEditability, setIsCheckingEditability] = useState(false); // Loading state during check
  const [grnPendingLoad, setGrnPendingLoad] = useState(null); // Store GRN data pending editability check
  const [editingGrnStatus, setEditingGrnStatus] = useState(null); // Track status of GRN being edited (for delta vs normal post)

  // ✅ Track last added item for quantity increment support
  const lastAddedItemRef = useRef(null); // { productId, barcode, itemId }

  // Search State
  const [grnSearch, setGrnSearch] = useState("");
  const [grnStatusFilter, setGrnStatusFilter] = useState("Draft"); // Default to Draft
  const grnListSearchInputRef = useRef(null);
  const modalRef = useRef(null);
  const modalHasInitialFocusRef = useRef(false);

  // Master Data States
  const [grnList, setGrnList] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [unitTypes, setUnitTypes] = useState([]);
  const [unitTypesMap, setUnitTypesMap] = useState(null);

  // Fallback: Manually fetch vendors if hook doesn't auto-populate
  useEffect(() => {
    if (vendors.length === 0) {
      fetchVendors();
    }
  }, []);

  // Grid Management
  const barcodeInputRef = useRef(null);
  const itemSearchInputRef = useRef(null);
  const { gridContainerRef, gridHeight } =
    useGrnGridDimensions(showNewGrnModal);

  // Product Search Hook - Centralized with Meilisearch + fallback
  // Product Search Hook - Centralized with Meilisearch + fallback
  const {
    results: searchResults,
    loading: searchLoading,
    error: searchError,
    clearCache,
  } = useProductSearch(itemSearch, 150, 1, 50, true);

  // ✅ PRODUCTION: Use React Query instead of manual merge map
  // This is the CORRECT approach for 300K products
  // - Automatic cache invalidation
  // - No memory leaks
  // - Server is source of truth
  // - Direct O(1) product updates

  // When product updated, ONLY update that specific product in dropdown
  const [updatedProductCache, setUpdatedProductCache] = useState({});

  // ✅ DEBUG: Log cache changes
  useEffect(() => {
    if (Object.keys(updatedProductCache).length > 0) {
      console.log("💾 [CACHE] Updated products in cache:", {
        count: Object.keys(updatedProductCache).length,
        products: Object.entries(updatedProductCache).map(([id, p]) => ({
          id: id.substring(0, 8),
          name: p.name,
          price: p.price,
        })),
      });
    }
  }, [updatedProductCache]);

  // Merge is now O(1) - only check if product is in our small update cache
  const mergedSearchResults = searchResults.map((item) => {
    // Only merge if this specific product was just updated
    // Prevents O(n) iteration on every render
    if (updatedProductCache[item._id]) {
      const merged = { ...item, ...updatedProductCache[item._id] };

      return merged;
    }
    return item;
  });

  // Log merge summary to understand if results are being searched
  if (Object.keys(updatedProductCache).length > 0) {
  }

  // ✅ PRODUCTION HYBRID APPROACH: Optimistic UI + Background Meilisearch Sync
  // Track indexing status for user feedback
  const [indexingStatus, setIndexingStatus] = useState(null); // 'indexing', 'complete', null

  // ✅ UPDATE STRATEGY: Hybrid Approach (Best for 300K products + Meilisearch)
  // 1. Update UI immediately (optimistic)
  // 2. Wait for Meilisearch indexing in background
  // 3. Refresh dropdown after indexing complete
  useEffect(() => {
    const handleProductUpdatedHybrid = (event) => {
      const { product, meilisearchSync } = event.detail || {};

      if (!product?._id) {
        return;
      }

      // Wait for Meilisearch to fully index the product update (3.5s)

      setTimeout(() => {
        // Now clear the cache so next search gets fresh data with updated price

        clearAllCache();
      }, 3500);
    };

    window.addEventListener("productUpdated", handleProductUpdatedHybrid);
    return () =>
      window.removeEventListener("productUpdated", handleProductUpdatedHybrid);
  }, [itemSearch]);

  // 🔴 P3: Listen for product updates from Product modal and refresh search results AND items in form
  useEffect(() => {
    const handleProductUpdated = (event) => {
      const syncStartTime = performance.now();
      const { product } = event.detail || {};

      if (!product?._id) {
        return;
      }

      // ✅ IMMEDIATE: Update items if any match this product
      if (formData.items && formData.items.length > 0) {
        // Check which items match
        const matchingItems = formData.items.filter((item) => {
          return item.productId === product._id;
        });

        if (matchingItems.length > 0) {
          setFormData((prev) => {
            const updatedItems = prev.items.map((item) => {
              if (item.productId === product._id) {
                const newTrackExpiry =
                  product.trackExpiry !== undefined
                    ? product.trackExpiry
                    : item.trackExpiry;
                return { ...item, trackExpiry: newTrackExpiry };
              }
              return item;
            });

            const hasChanged = updatedItems.some(
              (item, idx) => item.trackExpiry !== prev.items[idx]?.trackExpiry,
            );
            if (hasChanged) {
              setRefreshTrigger((t) => t + 1);
            }

            return { ...prev, items: updatedItems };
          });
        } else {
          console.warn(
            `⚠️ [NO-MATCH] No items found matching productId: ${product._id}`,
          );
        }
      } else {
        console.warn(`⚠️ [EMPTY] formData.items is empty or undefined`);
      }

      // ✅ SYNC: Only update form items, don't mess with search refresh
      // (search dropdown is handled by the first listener via merge)
      // Just log for debugging
      if (itemSearch && itemSearch.trim()) {
      }
    };

    window.addEventListener("productUpdated", handleProductUpdated);
    return () =>
      window.removeEventListener("productUpdated", handleProductUpdated);
  }, [itemSearch, clearCache]);

  // ✅ Auto-clear indexing status after 3 seconds
  useEffect(() => {
    if (indexingStatus) {
      const timer = setTimeout(() => {
        setIndexingStatus(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [indexingStatus]);

  // Item Management
  const {
    addItemToGrn: addItemToGrnBase,
    updateItem,
    removeItemFromGrn: removeItemFromGrnBase,
  } = useGrnItemManagement(formData, setFormData, unitTypesMap);

  // ✅ WRAPPER: Remove item AND clear lastAddedItemRef if it's the same item
  const removeItemFromGrn = useCallback(
    (itemId) => {
      // Find the item being removed
      const removedItem = formData.items?.find((item) => item.id === itemId);

      // ✅ If this is the last added item, clear the reference
      if (
        removedItem &&
        lastAddedItemRef.current &&
        lastAddedItemRef.current.productId === removedItem.productId
      ) {
        lastAddedItemRef.current = null;
      }

      // Call the base remove function
      removeItemFromGrnBase(itemId);
    },
    [formData.items, removeItemFromGrnBase],
  );

  // ✅ Track timeout ID for clearing highlight
  const highlightTimeoutRef = useRef(null);
  const prevItemsRef = useRef([]);
  const scanQueueRef = useRef(Promise.resolve());
  const openShortcutHandlerRef = useRef(null);
  const closeShortcutHandlerRef = useRef(null);
  const draftShortcutHandlerRef = useRef(null);
  const postShortcutHandlerRef = useRef(null);
  const focusSearchShortcutHandlerRef = useRef(null);
  const isGrnRoute = location.pathname === "/grn-form";
  const isGlobalGrnContextActive =
    isGrnRoute &&
    showNewGrnModal &&
    !isViewMode &&
    !showBatchExpiryModal &&
    !showUnitSelector;

  // 🔍 DEBUG: Log context activation
  useEffect(() => {
    if (isGlobalGrnContextActive) {
    }
  }, [isGlobalGrnContextActive]);

  const highlightExistingItem = useCallback((itemId, options = {}) => {
    if (!itemId) {
      return;
    }

    const { startEdit = false } = options;

    if (highlightTimeoutRef.current) {
      clearTimeout(highlightTimeoutRef.current);
    }

    // Reset first so scanning the same duplicate item can retrigger the highlight.
    setHighlightedItemId(null);
    setEditTargetItemId(null);

    setTimeout(() => {
      setHighlightedItemId(itemId);

      if (startEdit) {
        setEditTargetItemId(itemId);
      }

      highlightTimeoutRef.current = setTimeout(() => {
        setHighlightedItemId((current) =>
          current === itemId ? null : current,
        );
      }, 2500);
    }, 0);
  }, []);

  // ✅ Wrapper to highlight newly added items
  const addItemToGrn = useCallback(
    (product, selectedUnit = null) => {
      if (!product) {
        console.error("❌ [ADD] No product provided to addItemToGrn!");
        return;
      }

      try {
        lastAddedItemRef.current = {
          productId: product._id,
          barcode: product.barcode,
          unitBarcode: selectedUnit?.barcode,
          productName: product.name,
          timestamp: Date.now(),
        };

        addItemToGrnBase(product, selectedUnit);
      } catch (error) {
        console.error("❌ [ADD] ERROR in addItemToGrn:", error);
      }
    },
    [addItemToGrnBase, formData.items],
  );

  // ✅ Detect which item was added/updated and highlight it
  // Works for both new items AND duplicate items (qty increase anywhere in list)
  useEffect(() => {
    const currentItems = formData.items || [];
    const prevItems = prevItemsRef.current || [];

    let highlightId = null;

    if (currentItems.length > prevItems.length) {
      const newItem = currentItems[currentItems.length - 1];
      highlightId = newItem?.id;
    } else if (
      currentItems.length === prevItems.length &&
      currentItems.length > 0
    ) {
      for (let i = 0; i < currentItems.length; i++) {
        const currentItem = currentItems[i];
        const prevItem = prevItems[i];

        if (
          prevItem &&
          currentItem?.id === prevItem.id &&
          currentItem?.qty > prevItem.qty
        ) {
          highlightId = currentItem.id;
          break;
        }
      }
    }

    if (highlightId) {
      setHighlightedItemId(highlightId);
    }

    prevItemsRef.current = currentItems.map((item) => ({
      id: item.id,
      qty: item.qty,
    }));
  }, [formData.items]);

  // ✅ Debug: Track when highlight changes
  useEffect(() => {
    if (highlightedItemId) {
      console.log("� Highlight is ACTIVE:", highlightedItemId);
    } else {
      console.log("📍 Highlight is INACTIVE (no item highlighted)");
    }
  }, [highlightedItemId]);

  useEffect(() => {
    return () => {
      if (highlightTimeoutRef.current) {
        clearTimeout(highlightTimeoutRef.current);
      }
    };
  }, []);

  // ✅ When header tax type changes, recalculate all items with new tax type
  // Skip FOC calculation during entry (will be recalculated at posting)
  useEffect(() => {
    if (formData.items && formData.items.length > 0) {
      setFormData((prev) => {
        const updatedItems = prev.items.map((item) => {
          const updatedItem = { ...item, taxType: prev.taxType };
          // ✅ Skip FOC calculation during entry
          calculateItemCost(updatedItem, true);
          return updatedItem;
        });

        return { ...prev, items: updatedItems };
      });
    }
  }, [formData.taxType]); // Only monitor taxType changes

  /**
   * 🔴 NORMALIZE BARCODE - Production-grade barcode handling
   * Handles multiple scanner formats and input methods
   * - Trim whitespace
   * - Remove internal spaces
   * - Lowercase for alphanumeric codes
   */
  const normalizeBarcode = useCallback((barcode) => {
    if (!barcode) return "";

    // Trim, remove all spaces (hidden characters too), and lowercase
    return barcode
      .trim()
      .replace(/\s+/g, "") // Remove all whitespace (visible and hidden)
      .toLowerCase(); // Case-insensitive matching
  }, []);

  /**
   * 🔴 CHECK & HANDLE VARIANT BARCODE
   * - Matches barcode to unit variant barcodes
   * - Detects duplicate barcodes (warning if found)
   * - Adds directly without modal if matched
   * - Uses normalized barcode comparison
   */
  const checkAndHandleVariantBarcode = useCallback(
    (product, barcode) => {
      if (!product?.packingUnits || !Array.isArray(product.packingUnits)) {
        return false;
      }

      const normalizedBarcode = normalizeBarcode(barcode);
      if (!normalizedBarcode) {
        return false;
      }

      console.log("🔍 [BARCODE] Checking variant barcodes:", {
        scannedBarcode: normalizedBarcode,
        variantCount: product.packingUnits.length,
        variantBarcodes: product.packingUnits.map((pu) => ({
          barcode: normalizeBarcode(pu.barcode),
          unitName: pu.unit?.unitName,
        })),
      });

      // 🔴 Find ALL matches (detect duplicates)
      const matchedVariants = product.packingUnits
        .map((pu, idx) => ({
          variant: pu,
          index: idx,
          normalizedBarcode: normalizeBarcode(pu.barcode),
        }))
        .filter((item) => item.normalizedBarcode === normalizedBarcode);

      if (matchedVariants.length === 0) {
        return false;
      }

      if (matchedVariants.length > 1) {
        console.warn(
          `⚠️ [BARCODE] ⚠️ DUPLICATE BARCODE DETECTED! ${matchedVariants.length} variants have the same barcode:`,
          matchedVariants.map((m) => ({
            variant: m.variant.unit?.unitName,
            barcode: m.normalizedBarcode,
          })),
        );
        showToast(
          "warning",
          `⚠️ Duplicate variant barcode! Using first match: ${matchedVariants[0].variant.unit?.unitName}`,
        );
      }

      // Use first match
      const matchedItem = matchedVariants[0];
      const matchedVariant = matchedItem.variant;

      console.log(
        `✅ [BARCODE] ✨ FOUND VARIANT BARCODE MATCH: ${matchedVariant.unit?.unitName || "Variant"}`,
      );

      // Build the selected unit object
      const selectedUnit = {
        id: `variant-${matchedItem.index}`,
        name: matchedVariant.unit?.unitName || "Unit",
        barcode: matchedVariant.barcode || "",
        unit:
          matchedVariant.unit?.unitSymbol || matchedVariant.unitSymbol || "PC",
        factor: matchedVariant.factor || 1,
        cost: matchedVariant.cost || product?.cost || 0,
        price: matchedVariant.price || product?.price || 0,
      };

      // Add directly with the matched variant (bypass modal)
      addItemToGrn(product, selectedUnit);
      return true;
    },
    [normalizeBarcode, addItemToGrn],
  );

  /**
   * Handle item selection with unit variant support
   */
  const handleItemSelected = useCallback(
    (product) => {
      console.log("🔍 Product selected - checking for packingUnits:", {
        productName: product?.name,
        hasPackingUnits: !!product?.packingUnits,
        packingUnitsLength: product?.packingUnits?.length || 0,
        packingUnits: product?.packingUnits,
        taxPercent: product?.taxPercent,
        taxType: product?.taxType,
        tax: product?.tax,
        fullProduct: product,
      });

      // Check if product has packing units (unit variants)
      if (product?.packingUnits && product.packingUnits.length > 0) {
        // Show unit selector modal
        setProductForUnitSelection(product);
        setShowUnitSelector(true);
      } else {
        // Add directly with base unit
        addItemToGrn(product);
      }
      setItemSearch("");
    },
    [addItemToGrn],
  );

  /**
   * Handle unit variant selection
   */
  const handleUnitVariantSelected = useCallback(
    (selectedUnit) => {
      if (productForUnitSelection) {
        addItemToGrn(productForUnitSelection, selectedUnit);
        setShowUnitSelector(false);
        setProductForUnitSelection(null);
      }
    },
    [productForUnitSelection, addItemToGrn],
  );

  /**
   * ✅ Handle product creation - Use global product form modal
   */
  const handleCreateProduct = useCallback(() => {
    if (!openProductForm) {
      showToast(
        "error",
        "Product form not available. Please refresh the page.",
      );
      return;
    }
    openProductForm({
      mode: "create",
      onSave: (newProduct) => {
        // Auto-select the newly created product
        handleItemSelected(newProduct);
      },
    });
  }, [openProductForm, handleItemSelected]);

  /**
   * 🔴 HANDLER: Variant Barcode Found
   * Auto-add item with specific variant (no modal)
   */
  const handleVariantFound = useCallback(
    (product, variant, matchedBarcode = null, meta = {}) => {
      const existingItem = (formData.items || []).find(
        (item) => item.productId === (product._id || product.id),
      );

      if (existingItem) {
        console.warn(
          `🚫 [VARIANT] Item already in table, blocking duplicate variant scan for ${product.name}`,
        );
        showToast("error", "Item already added");
        setBarcodeValue("");
        return;
      }

      console.log(
        `✅ [VARIANT] Adding ${product.name} as ${variant.unit?.unitName}`,
      );

      const selectedUnit = {
        id: `variant-${product.packingUnits.indexOf(variant)}`,
        name: variant.unit?.unitName || "Unit",
        barcode: matchedBarcode || variant.barcode || "",
        unit: variant.unit?.unitSymbol || variant.unitSymbol || "PC",
        factor: variant.factor || 1,
        cost: variant.cost || product?.cost || 0,
        price: variant.price || product?.price || 0,
      };

      addItemToGrn(product, selectedUnit);

      setBarcodeValue("");
    },
    [addItemToGrn, formData.items, setBarcodeValue, showToast],
  );

  const handleDuplicateScan = useCallback(
    (_barcode, item, meta = {}) => {
      highlightExistingItem(item.id, { startEdit: true });
      showToast("error", "Item already added");
      setBarcodeValue("");
    },
    [highlightExistingItem, setBarcodeValue, showToast],
  );

  /**
   * 🔴 HANDLER: Product Barcode Found
   * ✅ IMPORTANT: Add directly without modal for instant barcode scanning
   * - Scanning a product barcode = add with base unit (no modal)
   * - Scanning a variant barcode = add with that variant (handled earlier)
   * This ensures zero modal interruptions during fast scanning
   */
  const handleProductFound = useCallback(
    (product, meta = {}) => {
      const existingItem = (formData.items || []).find(
        (item) => item.productId === (product._id || product.id),
      );

      if (existingItem) {
        console.warn(
          `🚫 [PRODUCT] Item already in table, blocking duplicate product scan for ${product.name}`,
        );
        highlightExistingItem(existingItem.id, { startEdit: true });
        showToast("error", "Item already added");
        setBarcodeValue("");
        return;
      }

      // Add directly with base unit - no modal interruption!
      // (Variant-specific barcodes are handled in handleVariantFound)
      console.log("🔴 [PRODUCT] Calling addItemToGrn NOW");
      addItemToGrn(product);
      console.log("🔴 [PRODUCT] addItemToGrn call completed");
      console.log(`✅ [PRODUCT] Added ${product.name}`);

      setBarcodeValue("");
    },
    [
      addItemToGrn,
      formData.items,
      highlightExistingItem,
      setBarcodeValue,
      showToast,
    ],
  );

  /**
   * 🔴 HANDLER: Barcode Not Found
   */
  const handleBarcodeNotFound = useCallback(
    (barcode) => {
      console.warn(`❌ [NOT FOUND] No product found for: ${barcode}`);

      // ✅ Clear lastAddedItemRef so we don't try to increment non-existent items
      if (lastAddedItemRef.current) {
        console.warn(`⚠️  [NOT FOUND] Clearing stale lastAddedItemRef`);
        lastAddedItemRef.current = null;
      }

      // ✅ Show error toast so user knows product wasn't found
      showToast("error", `Product not found: ${barcode}`);
      setBarcodeValue("");
    },
    [setBarcodeValue, showToast],
  );

  /**
   * 🔴 HANDLER: Increment Quantity if Same Item Scanned Again
   * Uses tracking to increment the last-added item when same barcode is scanned again
   * ✅ FIXED: Verify item exists in formData FIRST
   *          If item not in formData but in lastAddedItem refs, ADD it instead
   */
  const handleIncrementQty = useCallback(
    (barcode) => {
      console.log(`🔄 [QTY] Incrementing quantity for repeat scan: ${barcode}`);

      const normalizedBarcode = normalizeBarcode(barcode);

      // Check if this matches the last added item
      if (!lastAddedItemRef.current) {
        console.warn(`❌ [QTY] No last added item to increment`);
        return;
      }

      const lastItem = lastAddedItemRef.current;
      const lastBarcode = normalizeBarcode(lastItem.barcode);
      const lastUnitBarcode = normalizeBarcode(lastItem.unitBarcode);

      console.log(`📍 [QTY] Last added item:`, lastItem);
      console.log(
        `🔍 [QTY] Checking: ${normalizedBarcode} vs ${lastBarcode} or ${lastUnitBarcode}`,
      );

      // Match against main barcode or unit barcode
      if (
        normalizedBarcode !== lastBarcode &&
        normalizedBarcode !== lastUnitBarcode
      ) {
        console.warn(
          `❌ [QTY] Barcode doesn't match last item. Expected ${lastBarcode} or ${lastUnitBarcode}, got ${normalizedBarcode}`,
        );
        return;
      }

      console.log(
        `✅ [QTY] Barcode matched! Incrementing quantity for: ${lastItem.productName}`,
      );

      // ✅ FIXED: Check if item ACTUALLY exists in formData
      setFormData((prev) => {
        console.log(
          `🔎 [QTY] Current formData.items in setFormData callback:`,
          prev.items?.length || 0,
          "items",
        );
        console.log(
          `📋 [QTY] Items in formData:`,
          prev.items?.map((i) => ({
            name: i.productName,
            productId: i.productId,
          })) || [],
        );

        // Find the item in the current state (guaranteed to be fresh)
        const itemIndex = prev.items?.findIndex(
          (item) => item.productId === lastItem.productId,
        );

        if (itemIndex !== undefined && itemIndex >= 0) {
          // ✅ Item EXISTS in table - increment its quantity
          const itemToIncrement = prev.items[itemIndex];
          const newQty = (itemToIncrement.qty || 1) + 1;
          console.log(
            `✅ [QTY] Item FOUND! Incrementing qty: ${itemToIncrement.qty} → ${newQty}`,
          );

          // Create updated items array with incremented quantity
          const updatedItems = prev.items.map((item, idx) => {
            if (idx === itemIndex) {
              return { ...item, qty: newQty };
            }
            return item;
          });

          // ✅ REMOVED: Toast notification during scanning
          // Just log to console, don't show toast
          console.log(
            `📊 [QTY] Quantity updated: ${lastItem.productName} qty: ${newQty}`,
          );

          return {
            ...prev,
            items: updatedItems,
          };
        } else {
          // ❌ Item NOT in formData but in lastAddedItemRef
          // This means: item appeared somewhere but wasn't added to formData
          // Don't force add here - let user add from search to ensure proper data
          console.error(`❌ [QTY] Item missing from formData!`);
          console.error(`🔍 [QTY] Expected productId: ${lastItem.productId}`);
          console.error(
            `📋 [QTY] Available in formData:`,
            prev.items?.map((i) => i.productId) || [],
          );

          // ✅ REMOVED: Toast notification, just log to console
          console.warn(`⚠️  [QTY] Item not in table - treating as new scan`);

          // Reset tracking so next scan will try to add fresh
          lastAddedItemRef.current = null;

          return prev;
        }
      });
    },
    [setFormData, normalizeBarcode],
  );

  /**
   * 🔴 API SEARCH FUNCTION for barcode handler
   */
  const apiSearchProduct = useCallback(async (barcode) => {
    try {
      const searchUrl = `${API_URL}/products/search?q=${encodeURIComponent(barcode)}&limit=50`;
      console.log(`🌐 [API] Searching for: ${barcode}`);
      const response = await axios.get(searchUrl);

      if (response.data?.products && response.data.products.length > 0) {
        console.log(`🌐 [API] Found ${response.data.products.length} products`);
        return response.data.products[0]; // Return first match
      }

      console.warn(`🌐 [API] No products found`);
      return null;
    } catch (err) {
      console.error(`❌ [API] Search failed:`, err.message);
      return null;
    }
  }, []);

  /**
   * 🚀 OPTIMIZED BARCODE HANDLER - Factory Pattern
   * Variant-first matching, auto-increment, no modal blocking
   * ✅ FIXED: Pass currentItems so handler can verify item exists before incrementing
   */
  const barcodeHandler = useCallback(
    createBarcodeHandler({
      products: searchResults,
      apiSearch: apiSearchProduct,
      onVariantFound: handleVariantFound,
      onDuplicateScan: handleDuplicateScan,
      onProductFound: handleProductFound,
      onNotFound: handleBarcodeNotFound,
      currentItems: formData.items || [], // ✅ Pass current items for verification
    }),
    [
      searchResults,
      apiSearchProduct,
      handleVariantFound,
      handleDuplicateScan,
      handleProductFound,
      handleBarcodeNotFound,
      formData.items, // ✅ Add to dependencies
    ],
  );

  /**
   * 🔬 GLOBAL BARCODE SCANNER - Uses Factory Handler
   * Delegates to optimized handler for processing
   */
  const handleBarcodeScanned = useCallback(
    async (barcode, meta = {}) => {
      if (!barcode || barcode.trim().length === 0) {
        return;
      }

      scanQueueRef.current = scanQueueRef.current
        .catch(() => undefined)
        .then(async () => {
          await barcodeHandler(barcode, meta);
        });

      await scanQueueRef.current;
    },
    [barcodeHandler],
  );

  /**
   * 🔬 GLOBAL BARCODE LISTENER - Works anywhere in the form
   * Captures barcode scans from scanner even without input focus
   */
  const barcodeScannerControls = useGlobalBarcodeScanner(handleBarcodeScanned, {
    minLength: 3,
    maxTypingSpeed: 100,
    debounceTime: 500,
    enableSound: false, // Set to true if you want beep on scan
    ignoreInputFields: false, // Allow scanning while typing in other inputs
    debugMode: false, // Set to true for console logs
    allowDuplicateScan: true,
    preventDefaultOnScan: true,
    enabled: isGlobalGrnContextActive,
  });

  // 🔍 CONTEXT-AWARE SCANNING: Pause scanner when modals are open
  useEffect(() => {
    if (showUnitSelector || showBatchExpiryModal || isProductFormOpen) {
      barcodeScannerControls?.pause();
    } else {
      barcodeScannerControls?.resume();
    }
  }, [
    showUnitSelector,
    showBatchExpiryModal,
    isProductFormOpen,
    barcodeScannerControls,
  ]);

  /**
   * ✅ Handle batch/expiry button click
   */
  const handleBatchExpiryClick = useCallback((item) => {
    console.log("🔓 Opening batch/expiry modal for:", item.productName);
    setSelectedBatchItem(item);
    setShowBatchExpiryModal(true);
  }, []);

  /**
   * ✅ Handle batch/expiry modal save
   */
  const handleBatchExpirySave = useCallback(
    (data) => {
      const { itemId, batchNumber, expiryDate } = data;
      console.log("💾 Saving batch/expiry:", {
        itemId,
        batchNumber,
        expiryDate,
      });

      setFormData((prev) => {
        const updatedItems = prev.items.map((item) => {
          if (item.id === itemId) {
            return {
              ...item,
              batchNumber: batchNumber,
              expiryDate: new Date(expiryDate).toISOString(),
            };
          }
          return item;
        });
        return { ...prev, items: updatedItems };
      });

      showToast("success", "Batch & expiry details saved");
    },
    [setFormData],
  );

  // API Management
  const { fetchVendors, fetchGrns, saveGrn, deleteGrn } = useGrnApi(
    setVendors,
    setGrnList,
  );
  const productAPI = useProductAPI();

  // Fetch Unit Types - Only once on component mount
  useEffect(() => {
    let isMounted = true;

    const loadUnitTypes = async () => {
      try {
        const units = await productAPI.fetchUnits();

        if (!isMounted) return; // Prevent state update if unmounted

        setUnitTypes(units);

        // Create a map of unit ID -> unit data for quick lookups
        const map = {};
        units.forEach((unit) => {
          map[unit._id] = unit;
          // Also map by name/symbol for additional lookups
          map[unit.unitSymbol] = unit;
        });
        setUnitTypesMap(map);
        console.log("✅ Unit types loaded and mapped:", map);
      } catch (err) {
        console.error("❌ Error loading unit types:", err);
      }
    };

    loadUnitTypes();

    return () => {
      isMounted = false; // Cleanup on unmount
    };
  }, []); // Empty array = run only once on mount

  // Grid Configuration
  const handleEditProduct = useCallback(
    async (productId) => {
      try {
        // Fetch product details
        const response = await axios.get(
          `${API_URL}/products/getproduct/${productId}`,
        );
        const product = response.data;

        if (!openProductForm) {
          showToast("error", "Product form not available");
          return;
        }

        // Open product modal in edit mode
        openProductForm({
          mode: "edit",
          product: product,
          onSave: (updatedProduct) => {
            // After saving, the product is updated and event is dispatched
            // GrnForm already listens to productUpdated event
            showToast("success", "Product updated successfully");
          },
        });
      } catch (error) {
        console.error("Error fetching product:", error);
        showToast("error", "Failed to load product for editing");
      }
    },
    [openProductForm],
  );

  const { columns, gridConfig } = useGrnGridConfig(
    removeItemFromGrn,
    formData.taxType,
    handleEditProduct,
  );

  // ✅ Memoize GRN totals calculation (called 10+ times per render - prevent recalculation)
  const grnTotals = useMemo(
    () => calculateGrnTotals(formData.items, formData.shippingCost),
    [formData.items, formData.shippingCost],
  );

  // ✅ Helper functions for summary calculations
  const getDiscountAmount = () => {
    if (formData.manualDiscountPercent) {
      return round(
        (grnTotals.totalSubtotal * formData.manualDiscountPercent) / 100,
      );
    }
    return formData.manualDiscountAmount || grnTotals.totalDiscount;
  };

  const getTotalExTax = () => {
    // ✅ FIXED: For summary, totalSubtotal already has tax extracted for inclusive tax items
    // So we just subtract discount from the already-corrected subtotal
    return grnTotals.totalSubtotal - getDiscountAmount();
  };

  const getNetTotal = () => {
    // ✅ FIXED: getTotalExTax() now shows ACTUAL ex-tax amount
    // Adding tax gives the final payable amount
    return getTotalExTax() + grnTotals.totalTaxAmount;
  };

  const getFinalTotal = () => {
    return getNetTotal() + (formData.shippingCost || 0);
  };

  // ✅ FOC (Free Of Charge) Calculations
  const getTotalFocQty = () => {
    return formData.items.reduce(
      (sum, item) => sum + (parseFloat(item.focQty) || 0),
      0,
    );
  };

  const getTotalFocItems = () => {
    return formData.items.filter((item) => item.foc || item.focQty > 0).length;
  };

  const getRegularQty = () => {
    return grnTotals.totalQty - getTotalFocQty();
  };

  const openNewGrnModal = useCallback(async () => {
    setIsViewMode(false);
    setEditingId(null);
    setItemSearch(""); // ✅ Reset product search
    setBarcodeValue(""); // ✅ Reset barcode input
    await resetForm();
    setShowNewGrnModal(true);
  }, [resetForm, setEditingId]);

  const closeGrnModal = useCallback(async () => {
    setShowNewGrnModal(false);
    setIsViewMode(false);
    setItemSearch(""); // ✅ Reset product search
    setBarcodeValue(""); // ✅ Reset barcode input
    setGrnSearch(""); // ✅ Reset GRN list search
    setEditingGrnStatus(null); // ✅ Reset status when closing
    await resetForm();
  }, [resetForm]);

  const validateBeforeSubmit = useCallback(() => {
    const vendorId = formData.vendorId?.toString().trim() || "";
    const invoiceNo = formData.invoiceNo?.toString().trim() || "";
    const taxType = formData.taxType?.toString().trim() || "";
    const itemsCount = formData.items?.length || 0;

    if (!vendorId) {
      showToast("error", "Please select a vendor");
      return false;
    }

    if (!invoiceNo) {
      showToast("error", "Please enter invoice number");
      return false;
    }

    if (!taxType) {
      showToast(
        "error",
        "Please select a tax type (Exclusive, Inclusive, or No Tax)",
      );
      return false;
    }

    if (itemsCount === 0) {
      showToast("error", "Please add at least one item");
      return false;
    }

    const itemsWithZeroCost = formData.items.filter(
      (item) => item.cost === 0 && !item.foc,
    );
    if (itemsWithZeroCost.length > 0) {
      const itemNames = itemsWithZeroCost
        .map((item) => item.productName)
        .join(", ");
      showToast("error", `Cost cannot be 0 for non-FOC items: ${itemNames}`);
      return false;
    }

    return true;
  }, [formData, showToast]);

  // ============================================================================
  // 🔨 PAYLOAD BUILDER - Shared logic for both draft and post flows
  // ============================================================================
  const buildGrnPayload = async () => {
    let grnNumber;
    try {
      grnNumber = await fetchNextGrnNo();
      setFormData((prev) => ({ ...prev, grnNo: grnNumber }));
      console.log("✅ Fresh GRN number generated:", grnNumber);
    } catch (error) {
      console.error("Error generating GRN number:", error);
      showToast("error", "Failed to generate GRN number");
      return null;
    }

    const userData = localStorage.getItem("user");
    const currentUser = userData ? JSON.parse(userData) : null;
    const currentUserId = currentUser?._id || null;

    if (!currentUserId) {
      showToast("error", "User information not found. Please login again.");
      return null;
    }

    try {
      const itemsWithFocCalculated = formData.items.map((item) => {
        const processedItem = { ...item };
        calculateFocOnPost(processedItem);
        return processedItem;
      });

      console.log("🎯 FOC calculations applied:", {
        itemCount: itemsWithFocCalculated.length,
        focItems: itemsWithFocCalculated.filter((i) => i.foc || i.focQty > 0)
          .length,
      });

      const transformedItems = itemsWithFocCalculated.map((item, index) => {
        try {
          const productId = item.productId;
          const productName = item.productName || item.itemName;
          const itemCode = item.itemCode;
          const qty = parseFloat(item.qty || item.quantity || 0) || 0;
          const cost = parseFloat(item.cost || item.unitCost || 0) || 0;
          const finalCost =
            parseFloat(item.finalCost || item.totalCost || qty * cost) || 0;

          if (!productId) throw new Error(`Item ${index + 1}: Missing productId`);
          if (!productName || !productName.trim()) throw new Error(`Item ${index + 1}: Missing itemName`);
          if (!itemCode || !itemCode.trim()) throw new Error(`Item ${index + 1}: Missing itemCode`);
          if (!qty || qty <= 0) throw new Error(`Item ${index + 1}: Invalid quantity`);
          if (typeof cost !== "number" || cost < 0) throw new Error(`Item ${index + 1}: Invalid cost`);
          if (cost === 0 && !item.foc) throw new Error(`Item ${index + 1}: Cost cannot be 0 for non-FOC items`);

          const totalCost = finalCost || qty * cost;
          if (typeof totalCost !== "number" || totalCost < 0) throw new Error(`Item ${index + 1}: Invalid total cost`);

          let batchDetails = {
            batchNumber: (item.batchNumber || "").trim(),
            expiryDate: item.expiryDate || null,
            daysToExpiry: null,
            batchStatus: "ACTIVE",
            expiryStatus: "FRESH",
            hasExpirtTracking: false,
          };

          if (item.expiryDate) {
            batchDetails.hasExpirtTracking = true;
            const today = new Date();
            const expiry = new Date(item.expiryDate);
            const daysRemaining = Math.floor((expiry - today) / (1000 * 60 * 60 * 24));
            batchDetails.daysToExpiry = daysRemaining;

            if (daysRemaining < 0) {
              batchDetails.batchStatus = "EXPIRED";
              batchDetails.expiryStatus = "EXPIRED";
            } else if (daysRemaining <= 30) {
              batchDetails.batchStatus = "EXPIRING_SOON";
              batchDetails.expiryStatus = "EXPIRING_SOON";
            }
          }

          const quantity = parseFloat(qty);
          const unitCost = parseFloat(cost);
          const totalCostValue = parseFloat(totalCost);
          const discount = parseFloat(item.discount || 0);
          const discountPercent = parseFloat(item.discountPercent || 0);
          const taxPercent = parseFloat(item.taxPercent || 0);
          const taxAmount = parseFloat(item.taxAmount || 0);

          if (isNaN(quantity)) throw new Error(`Item ${index + 1}: Invalid quantity`);
          if (isNaN(unitCost)) throw new Error(`Item ${index + 1}: Invalid unitCost`);
          if (isNaN(totalCostValue)) throw new Error(`Item ${index + 1}: Invalid totalCost`);
          if (discount < 0 || discountPercent < 0 || taxPercent < 0 || taxAmount < 0) throw new Error(`Item ${index + 1}: Negative values not allowed`);

          return {
            productId,
            itemName: productName.trim(),
            itemCode: itemCode.trim(),
            quantity,
            unitType: item.unitType || "PC",
            foc: item.foc || false,
            focQty: Math.max(0, parseFloat(item.focQty || 0)),
            unitCost,
            itemDiscount: discount,
            itemDiscountPercent: discountPercent,
            netCost: Math.max(0, quantity * unitCost - discount),
            focCost: item.focCost || Math.max(0, parseFloat(item.focQty || 0)) * unitCost,
            paidAmount: item.focCost ? Math.max(0, quantity * unitCost - discount - item.focCost) : Math.max(0, quantity * unitCost - discount),
            taxType: item.taxType || formData.taxType || "exclusive",
            taxPercent,
            taxAmount,
            totalCost: totalCostValue,
            batchDetails,
            batchNumber: batchDetails.batchNumber,
            expiryDate: batchDetails.expiryDate,
            daysToExpiry: batchDetails.daysToExpiry,
            batchStatus: batchDetails.batchStatus,
            expiryStatus: batchDetails.expiryStatus,
            hasExpirtTracking: batchDetails.hasExpirtTracking,
            notes: (item.notes || "").trim(),
          };
        } catch (itemError) {
          console.error(`❌ Error transforming item ${index + 1}:`, itemError.message);
          throw itemError;
        }
      });

      const shippingCost = Math.max(0, parseFloat(formData.shippingCost || 0));
      if (shippingCost < 0) throw new Error("Shipping cost cannot be negative");

      const grnTotals = calculateGrnTotals(formData.items, shippingCost);
      const totalDiscountAmount = Math.max(0, grnTotals.totalDiscount || 0);
      const totalDiscountPercent = grnTotals.totalSubtotal > 0 ? round((totalDiscountAmount / grnTotals.totalSubtotal) * 100) : 0;
      const totalExTax = grnTotals.totalSubtotal - totalDiscountAmount;
      const finalTotal = grnTotals.netTotal + shippingCost;

      const batchExpiryTracking = {
        itemsWithBatchTracking: transformedItems.filter((i) => i.batchNumber && i.batchNumber.trim()).length,
        itemsWithExpiryTracking: transformedItems.filter((i) => i.hasExpirtTracking).length,
        expiringItems: transformedItems.filter((i) => i.batchStatus === "EXPIRING_SOON").length,
        expiredItems: transformedItems.filter((i) => i.batchStatus === "EXPIRED").length,
        earliestExpiryDate: transformedItems.filter((i) => i.expiryDate).map((i) => new Date(i.expiryDate)).reduce((earliest, date) => (date < earliest ? date : earliest), new Date("2099-12-31")).toISOString().split("T")[0],
        expiryTrackingEnabled: transformedItems.some((i) => i.hasExpirtTracking),
      };

      const payload = {
        grnNumber,
        grnDate: formData.grnDate,
        invoiceNo: formData.invoiceNo || "",
        lpoNo: formData.lpoNo || "",
        vendorId: formData.vendorId,
        vendorName: formData.vendorName,
        paymentTerms: formData.paymentTerms || "due_on_receipt",
        shipperId: formData.shipperId || null,
        shipperName: formData.shipperName || "",
        shippingCost: parseFloat(formData.shippingCost || 0),
        taxType: formData.taxType || "exclusive",
        totalQty: grnTotals.totalQty || 0,
        subtotal: parseFloat(grnTotals.totalSubtotal || 0),
        discountAmount: parseFloat(totalDiscountAmount),
        discountPercent: parseFloat(totalDiscountPercent),
        totalExTax: parseFloat(totalExTax),
        taxAmount: parseFloat(grnTotals.totalTaxAmount || 0),
        netTotal: parseFloat(grnTotals.netTotal || 0),
        finalTotal: parseFloat(finalTotal),
        batchExpiryTracking,
        focTracking: {
          totalFocQty: getTotalFocQty(),
          focItems: getTotalFocItems(),
          regularQty: getRegularQty(),
          hasFoc: getTotalFocQty() > 0,
        },
        deliveryDate: new Date().toISOString().split("T")[0],
        referenceNumber: formData.lpoNo || "",
        notes: formData.notes || "",
        createdBy: currentUserId,
        items: transformedItems,
      };

      console.log("📋 Payload built successfully:", { grnNumber: payload.grnNumber, totalQty: payload.totalQty, itemCount: payload.items.length });
      return payload;
    } catch (error) {
      console.error("❌ Error building payload:", error.message);
      showToast("error", error.message);
      return null;
    }
  };

  // ============================================================================
  // ✅ CHECK GRN EDITABILITY - Validate batch availability before allowing edits
  // ============================================================================
  const checkGrnEditability = async (grnId, grnData) => {
    setIsCheckingEditability(true);
    try {
      const response = await axios.post(`${API_URL}/grn/${grnId}/can-edit`);
      console.log("✅ Editability check result:", response.data);

      const { canEdit, reason } = response.data;

      if (!canEdit) {
        // ❌ GRN not editable - show warning
        console.warn("❌ GRN not editable:", reason);
        setEditabilityWarning({
          canEdit: false,
          reason: reason || "This GRN cannot be edited. Please check transaction dependencies.",
          grnData,
          grnId,
        });
        setShowEditabilityWarning(true);
        return false;
      }

      // ✅ GRN editable - proceed with loading
      console.log("✅ GRN is editable, loading form...");
      return true;
    } catch (error) {
      console.error("❌ Error checking editability:", error);
      const errorMsg = error.response?.data?.message || error.message || "Failed to check edit eligibility";
      showToast("error", "Error: " + errorMsg);
      return false;
    } finally {
      setIsCheckingEditability(false);
    }
  };

  // ============================================================================
  // 💾 SAVE AS DRAFT - Dedicated function (NO posting, NO stock updates)
  // ============================================================================
  const handleSaveDraft = async () => {
    console.log("📋 [DRAFT] Starting save draft process...");

    // ✅ NEW: If editing a POSTED/Received GRN, use delta-based edit instead (even for draft save)
    if (editingId && (editingGrnStatus === "POSTED" || editingGrnStatus === "Received")) {
      console.log("ℹ️ Editing POSTED GRN - using delta-based edit endpoint (not draft save)");
      return handleApplyPostedGrnEdit();
    }

    const payload = await buildGrnPayload();
    if (!payload) return;

    try {
      const draftPayload = { ...payload, status: "Draft", id: editingId || null };

      console.log("📤 Submitting DRAFT GRN:", { grnNumber: draftPayload.grnNumber, status: draftPayload.status, endpoint: "/grn/save-draft" });

      const response = await axios({
        method: "POST",
        url: `${API_URL}/grn/save-draft`,
        data: draftPayload,
        headers: { "Content-Type": "application/json" },
      });

      if (response.status === 200 || response.status === 201) {
        console.log("✅ Draft GRN saved successfully (NO auto-posting)");

        if (editingId) {
          showToast("success", "✅ GRN updated as Draft (no stock updates)");
        } else {
          showToast("success", "✅ GRN saved as DRAFT - Status: Draft");
        }

        clearAllCache();
        const listResponse = await axios.get(`${API_URL}/grn`);
        setGrnList(Array.isArray(listResponse.data) ? listResponse.data : listResponse.data?.data || []);

        setItemSearch("");
        setBarcodeValue("");
        setGrnSearch("");
        await resetForm();
        setShowNewGrnModal(false);
      }
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message || "Failed to save draft";
      showToast("error", errorMsg);
      console.error("❌ Draft Save Error:", error);
    }
  };

  // ============================================================================
  // ✅ APPLY DELTA-BASED EDIT TO POSTED GRN - Strict batch validation
  // ============================================================================
  const handleApplyPostedGrnEdit = async () => {
    console.log("✏️ [EDIT POSTED] Starting delta-based edit for posted GRN...");

    // ✅ Extract current user ID from localStorage
    const userData = localStorage.getItem("user");
    const currentUser = userData ? JSON.parse(userData) : null;
    const currentUserId = currentUser?._id || null;

    if (!currentUserId) {
      showToast("error", "User information not found. Please login again.");
      return;
    }
    
    // Transform items to match backend format
    const editItems = formData.items.map((item) => ({
      productId: item.productId,
      itemName: item.productName,
      itemCode: item.itemCode,
      quantity: parseFloat(item.qty) || 0,
      unitCost: parseFloat(item.cost) || 0,
      totalCost: parseFloat(item.finalCost || item.qty * item.cost) || 0,
      unitType: item.unitType || "PC",
      foc: item.foc || false,
      focQty: parseFloat(item.focQty) || 0,
      itemDiscount: parseFloat(item.discount) || 0,
      itemDiscountPercent: parseFloat(item.discountPercent) || 0,
      taxType: item.taxType || "exclusive",
      taxPercent: parseFloat(item.taxPercent) || 0,
      netCost: parseFloat(item.netCost) || 0,
      trackExpiry: item.trackExpiry || false,
      batchNumber: item.batchNumber || "",
      expiryDate: item.expiryDate || null,
    }));

    try {
      console.log("📤 Submitting POSTED GRN EDIT (delta-based):", {
        grnId: editingId,
        itemCount: editItems.length,
        endpoint: `/grn/${editingId}/apply-edit`
      });

      const response = await axios({
        method: "PATCH",
        url: `${API_URL}/grn/${editingId}/apply-edit`,
        data: {
          items: editItems,
          createdBy: currentUserId,
        },
        headers: { "Content-Type": "application/json" },
      });

      if (response.status === 200) {
        console.log("✅ Posted GRN edited successfully with delta calculations");
        showToast("success", "✅ GRN updated successfully - Stock adjusted by delta amounts");

        clearAllCache();
        const listResponse = await axios.get(`${API_URL}/grn`);
        setGrnList(Array.isArray(listResponse.data) ? listResponse.data : listResponse.data?.data || []);

        setItemSearch("");
        setBarcodeValue("");
        setGrnSearch("");
        await resetForm();
        setShowNewGrnModal(false);
      }
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message || "Failed to apply edit";
      showToast("error", "❌ " + errorMsg);
      console.error("❌ Posted GRN Edit Error:", error);
    }
  };

  // ============================================================================
  // 📤 POST GRN - Dedicated function (auto-posts, updates stock & vendor payments)
  // ============================================================================
  const handlePostGrn = async () => {
    console.log("✓ [POST] Starting post GRN process...");

    // ✅ NEW: If editing a POSTED/Received GRN, use delta-based edit instead
    if (editingId && (editingGrnStatus === "POSTED" || editingGrnStatus === "Received")) {
      console.log("ℹ️ Editing POSTED GRN - using delta-based edit endpoint");
      return handleApplyPostedGrnEdit();
    }

    const payload = await buildGrnPayload();
    if (!payload) return;

    try {
      const postPayload = { ...payload, status: "Received", id: editingId || null };

      console.log("📤 Submitting POST GRN:", { grnNumber: postPayload.grnNumber, status: postPayload.status, endpoint: "/grn/post-with-updates" });

      const response = await axios({
        method: "POST",
        url: `${API_URL}/grn/post-with-updates`,
        data: postPayload,
        headers: { "Content-Type": "application/json" },
      });

      if (response.status === 200 || response.status === 201) {
        const isNewGrn = !editingId;
        const inventoryData = response.data?.inventory;

        console.log(`✅ GRN Posted successfully with all updates`);

        const toastMessage = isNewGrn
          ? `✅ GRN created & posted - Stock updated (${inventoryData?.currentStockUpdates || 0} entries, ${inventoryData?.costUpdates || 0} costs)`
          : `✅ GRN updated & posted - Stock updated`;

        showToast("success", toastMessage);

        clearAllCache();
        const listResponse = await axios.get(`${API_URL}/grn`);
        setGrnList(Array.isArray(listResponse.data) ? listResponse.data : listResponse.data?.data || []);

        setItemSearch("");
        setBarcodeValue("");
        setGrnSearch("");
        await resetForm();
        setShowNewGrnModal(false);
      }
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message || "Failed to post GRN";
      showToast("error", errorMsg);
      console.error("❌ Post GRN Error:", error);
    }
  };

  const handleDraftSubmit = useCallback(() => {
    if (!validateBeforeSubmit()) {
      return;
    }

    handleSaveDraft();
  }, [validateBeforeSubmit, handleSaveDraft]);

  const handlePostSubmit = useCallback(() => {
    if (!validateBeforeSubmit()) {
      return;
    }

    handlePostGrn();
  }, [validateBeforeSubmit, handlePostGrn]);

  const focusBarcodeInput = useCallback(() => {
    if (!isGlobalGrnContextActive) {
      return;
    }

    barcodeInputRef.current?.focus();
  }, [isGlobalGrnContextActive]);

  const focusItemSearchInput = useCallback(() => {
    if (!isGrnRoute) {
      return;
    }

    if (showNewGrnModal && !isViewMode) {
      itemSearchInputRef.current?.focus();
      return;
    }

    grnListSearchInputRef.current?.focus();
  }, [isGrnRoute, isViewMode, showNewGrnModal]);

  useEffect(() => {
    if (
      !showNewGrnModal ||
      isViewMode ||
      showBatchExpiryModal ||
      showUnitSelector
    ) {
      modalHasInitialFocusRef.current = false;
      return undefined;
    }

    if (modalHasInitialFocusRef.current) {
      return undefined;
    }

    modalHasInitialFocusRef.current = true;

    const timer = window.setTimeout(() => {
      itemSearchInputRef.current?.focus();
    }, 100);

    return () => {
      window.clearTimeout(timer);
    };
  }, [showNewGrnModal, isViewMode, showBatchExpiryModal, showUnitSelector]);

  useEffect(() => {
    openShortcutHandlerRef.current = openNewGrnModal;
    closeShortcutHandlerRef.current = closeGrnModal;
    draftShortcutHandlerRef.current = handleDraftSubmit;
    postShortcutHandlerRef.current = handlePostSubmit;
    focusSearchShortcutHandlerRef.current = focusItemSearchInput;
  }, [
    openNewGrnModal,
    closeGrnModal,
    handleDraftSubmit,
    handlePostSubmit,
    focusItemSearchInput,
  ]);

  useEffect(() => {
    const unregisterOpen = registerShortcut(
      "Alt+N",
      (event) => {
        event.preventDefault();
        openShortcutHandlerRef.current?.();
      },
      {
        id: "grn-form-open",
        description: "Open new GRN",
        category: "GRN",
        global: true,
      },
    );

    return () => {
      unregisterOpen?.();
    };
  }, [registerShortcut]);

  useEffect(() => {
    if (!isGrnRoute) {
      return undefined;
    }

    const unregisterSave = registerShortcut(
      "Ctrl+S",
      (event) => {
        event.preventDefault();
        if (isGlobalGrnContextActive) {
          draftShortcutHandlerRef.current?.();
        }
      },
      {
        id: "grn-form-save",
        description: "Save GRN as draft",
        category: "GRN",
        global: true,
        allowInInput: true,
      },
    );

    const unregisterSearch = registerShortcut(
      "Ctrl+F",
      (event) => {
        event.preventDefault();
        focusSearchShortcutHandlerRef.current?.();
      },
      {
        id: "grn-form-search",
        description: "Focus GRN search",
        category: "GRN",
        global: true,
        allowInInput: true,
      },
    );

    const unregisterClose = registerShortcut(
      "Escape",
      (event) => {
        event.preventDefault();
        closeShortcutHandlerRef.current?.();
      },
      {
        id: "grn-form-close",
        description: "Close GRN form",
        category: "GRN",
        global: true,
        allowInInput: true,
      },
    );

    const unregisterPost = registerShortcut(
      "Ctrl+Enter",
      (event) => {
        event.preventDefault();
        if (isGlobalGrnContextActive) {
          postShortcutHandlerRef.current?.();
        }
      },
      {
        id: "grn-form-post",
        description: "Post GRN",
        category: "GRN",
        global: true,
        allowInInput: true,
      },
    );

    return () => {
      unregisterSave?.();
      unregisterSearch?.();
      unregisterClose?.();
      unregisterPost?.();
    };
  }, [isGlobalGrnContextActive, isGrnRoute, registerShortcut]);

  return (
    <div className="absolute inset-0 flex flex-col bg-gray-50 overflow-hidden">
      {/* HEADER - Fixed at top */}
      <div className="flex-shrink-0 bg-white text-gray-900 px-3 py-2 shadow-md z-10">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-lg font-bold text-gray-900">
              📦 Good Receipt Note (GRN)
            </h1>
            <p className="text-xs text-gray-600 mt-0.5">
              Manage purchase receipts and inventory inbound
            </p>
          </div>
          <button
            onClick={openNewGrnModal}
            className="flex items-center gap-1 bg-green-600 text-white px-2 py-1 rounded text-sm hover:bg-green-700 transition font-medium"
          >
            <Plus size={12} /> New GRN
          </button>
        </div>
      </div>

      {/* CONTENT - Scrollable */}
      <div className="flex-1 flex flex-col p-2 min-h-0 overflow-hidden">
        {/* Search & Filters Bar */}
        <div className="flex-shrink-0 flex flex-col lg:flex-row gap-1.5 mb-1.5 items-stretch lg:items-center lg:justify-between">
          {/* Search Input */}
          <div className="flex items-center gap-1 border border-gray-300 rounded px-1.5 bg-white h-7 w-64">
            <Search size={12} className="flex-shrink-0 text-gray-500" />
            <input
              ref={grnListSearchInputRef}
              type="text"
              placeholder="Search GRN, invoice, vendor..."
              className="border-0 p-0 outline-none w-full text-xs"
              value={grnSearch}
              onChange={(e) => setGrnSearch(e.target.value)}
            />
            {grnSearch && (
              <button
                onClick={() => setGrnSearch("")}
                className="text-gray-500 hover:text-gray-700 text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Status Filter */}
          <select
            className="border border-gray-300 rounded px-2 text-xs bg-white flex-shrink-0 h-7"
            value={grnStatusFilter}
            onChange={(e) => setGrnStatusFilter(e.target.value)}
          >
            <option value="Draft">Draft</option>
            <option value="Received">Received</option>
            <option value="">All Status</option>
          </select>
        </div>

        <GrnListTable
          grnList={grnList.filter(
            (grn) =>
              (grn.grnNumber?.toLowerCase().includes(grnSearch.toLowerCase()) ||
                grn.invoiceNo
                  ?.toLowerCase()
                  .includes(grnSearch.toLowerCase()) ||
                grn.vendorName
                  ?.toLowerCase()
                  .includes(grnSearch.toLowerCase())) &&
              (grnStatusFilter === "" || grn.status === grnStatusFilter),
          )}
          onView={(grn) => {
            // ✅ Map backend GRN data to frontend form format (VIEW MODE)
            const mappedItems = (grn.items || []).map((item) => ({
              id: item._id || Math.random().toString(36),
              productId: item.productId,
              productName: item.itemName,
              itemCode: item.itemCode,
              qty: item.quantity,
              cost: item.unitCost,
              netCost:
                item.netCost ||
                item.quantity * item.unitCost - (item.itemDiscount || 0),
              netCostWithoutTax: item.netCostWithoutTax || 0,
              finalCost: item.totalCost || 0,
              unitType: item.unitType || "PC",
              foc: item.foc || false,
              focQty: item.focQty || 0,
              discount: item.itemDiscount || 0,
              discountPercent: item.itemDiscountPercent || 0,
              taxType: item.taxType || grn.taxType || "exclusive",
              taxPercent: item.taxPercent || 0,
              taxAmount: item.taxAmount || 0,
              trackExpiry: item.trackExpiry || false,
              batchNumber: item.batchNumber || "",
              expiryDate: item.expiryDate || null,
              notes: item.notes || "",
            }));

            const recalculatedItems = mappedItems.map((item) => {
              const itemToCalculate = { ...item };
              calculateItemCost(itemToCalculate, true);
              return itemToCalculate;
            });

            const mappedGrn = {
              grnNo: grn.grnNumber,
              invoiceNo: grn.invoiceNo || "",
              lpoNo: grn.lpoNo || "",
              vendorId: grn.vendorId,
              vendorName: grn.vendorName,
              grnDate: grn.grnDate
                ? new Date(grn.grnDate).toISOString().split("T")[0]
                : new Date().toISOString().split("T")[0],
              taxType: grn.taxType || "exclusive",
              notes: grn.notes || "",
              documents: grn.documents || [],
              paymentTerms: grn.paymentTerms || "due_on_receipt",
              shippingCost: grn.shippingCost || 0,
              shipperId: grn.shipperId || "",
              shipperName: grn.shipperName || "",
              items: recalculatedItems,
            };

            setFormData(mappedGrn);
            setEditingId(grn._id);
            setItemSearch(""); // ✅ Reset product search
            setBarcodeValue(""); // ✅ Reset barcode input
            setIsViewMode(true); // ✅ Enable view mode
            setShowNewGrnModal(true);
          }}
          onEdit={async (grn) => {
            // ✅ Map backend GRN data to frontend form format
            const mappedItems = (grn.items || []).map((item) => ({
              id: item._id || Math.random().toString(36), // ✅ NEW: Ensure item has ID for tracking
              productId: item.productId,
              productName: item.itemName, // Backend: itemName → Frontend: productName
              itemCode: item.itemCode,
              qty: item.quantity, // Backend: quantity → Frontend: qty
              cost: item.unitCost, // Backend: unitCost → Frontend: cost

              // ✅ NEW: Map all calculated fields from backend
              netCost:
                item.netCost ||
                item.quantity * item.unitCost - (item.itemDiscount || 0),
              netCostWithoutTax: item.netCostWithoutTax || 0,
              finalCost: item.totalCost || 0,

              // ✅ FOC Fields
              unitType: item.unitType || "PC",
              foc: item.foc || false,
              focQty: item.focQty || 0,
              discount: item.itemDiscount || 0,
              discountPercent: item.itemDiscountPercent || 0,

              // Tax Fields
              taxType: item.taxType || grn.taxType || "exclusive",
              taxPercent: item.taxPercent || 0,
              taxAmount: item.taxAmount || 0,

              // Batch/Expiry Fields
              trackExpiry: item.trackExpiry || false,
              batchNumber: item.batchNumber || "",
              expiryDate: item.expiryDate || null,
              notes: item.notes || "",
            }));

            // ✅ NEW: Recalculate all items using entry-phase flag
            // This ensures UI values are correct (without FOC deduction in display)
            const recalculatedItems = mappedItems.map((item) => {
              const itemToCalculate = { ...item };
              // Use skipFocCalculation=true so UI displays entry-state values
              calculateItemCost(itemToCalculate, true);
              return itemToCalculate;
            });

            const mappedGrn = {
              grnNo: grn.grnNumber, // Backend: grnNumber → Frontend: grnNo
              invoiceNo: grn.invoiceNo || "",
              lpoNo: grn.lpoNo || "",
              vendorId: grn.vendorId,
              vendorName: grn.vendorName,
              grnDate: grn.grnDate
                ? new Date(grn.grnDate).toISOString().split("T")[0]
                : new Date().toISOString().split("T")[0],
              taxType: grn.taxType || "exclusive",
              notes: grn.notes || "",
              documents: grn.documents || [],
              paymentTerms: grn.paymentTerms || "due_on_receipt",
              shippingCost: grn.shippingCost || 0,
              shipperId: grn.shipperId || "",
              shipperName: grn.shipperName || "",
              items: recalculatedItems, // ✅ Use recalculated items
            };

            console.log("📝 Loading GRN for edit:", {
              originalGrnNumber: grn.grnNumber,
              mappedGrnNo: mappedGrn.grnNo,
              vendorName: mappedGrn.vendorName,
              itemCount: mappedGrn.items.length,
              firstItem: mappedGrn.items[0],
              focItems: mappedGrn.items.filter((i) => i.foc || i.focQty > 0)
                .length,
            });

            // ✅ NEW: Check GRN editability before allowing edit
            console.log("🔍 Checking GRN editability...");
            const canEdit = await checkGrnEditability(grn._id, mappedGrn);

            if (!canEdit) {
              // ❌ Not editable - warning modal is shown by checkGrnEditability
              console.warn("❌ GRN edit blocked - not eligible for editing");
              return;
            }

            // ✅ Editable - proceed with loading form
            setFormData(mappedGrn);
            setEditingId(grn._id);
            setEditingGrnStatus(grn.status); // ✅ Store the status for edit routing
            setItemSearch(""); // ✅ Reset product search
            setBarcodeValue(""); // ✅ Reset barcode input
            setIsViewMode(false); // ✅ Enable edit mode
            setShowNewGrnModal(true);
          }}
          onDelete={async (id) => {
            if (!window.confirm("Are you sure you want to delete this GRN?"))
              return;
            try {
              const response = await fetch(`${API_URL}/grn/${id}`, {
                method: "DELETE",
              });
              if (response.ok) {
                setGrnList((prev) => prev.filter((g) => g._id !== id));
                showToast("success", "GRN deleted successfully");
              }
            } catch (error) {
              console.error("Error deleting GRN:", error);
            }
          }}
        />
      </div>

      {/* New/Edit GRN Modal */}
      {showNewGrnModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div
            ref={modalRef}
            className="bg-white shadow-xl rounded-lg w-full max-w-none mx-auto flex flex-col max-h-[95vh]"
            style={{ width: "90vw" }}
          >
            {/* Modal Header */}
            <div className="sticky top-0 flex rounded-t-lg justify-between items-center gap-3 p-2 border-b bg-gray-50 flex-shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <h2 className="text-lg font-bold text-gray-900 whitespace-nowrap">
                  {isViewMode
                    ? "📖 View Purchase Entry"
                    : editingId
                      ? "Edit Purchase Entry"
                      : "New Purchase Entry"}
                </h2>
                {!isViewMode && (
                  <div className="hidden xl:flex items-center gap-1 text-[11px] text-gray-600 flex-wrap">
                    <span className="px-1.5 py-0.5 bg-white border border-gray-300 rounded">
                      Ctrl+F Search
                    </span>
                    <span className="px-1.5 py-0.5 bg-white border border-gray-300 rounded">
                      Ctrl+S Draft
                    </span>
                    <span className="px-1.5 py-0.5 bg-white border border-gray-300 rounded">
                      Ctrl+Enter Post
                    </span>
                    <span className="px-1.5 py-0.5 bg-white border border-gray-300 rounded">
                      Esc Close
                    </span>
                  </div>
                )}
              </div>
              <button
                onClick={closeGrnModal}
                className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-black-200 rounded-full transition-colors"
                title="Close"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-2 flex-1 overflow-y-auto flex flex-col gap-2 w-full">
              {/* Form Header */}
              <GrnFormHeader
                formData={formData}
                vendors={vendors}
                isViewMode={isViewMode} // ✅ Pass view mode
                onFormChange={
                  (field, value) =>
                    !isViewMode &&
                    setFormData((prev) => ({ ...prev, [field]: value })) // Disable changes in view mode
                }
                onVendorChange={(e) => {
                  const vendorId = e.target?.value || "";
                  const vendorName = e.vendorName || "";
                  setFormData((prev) => ({
                    ...prev,
                    vendorId,
                    vendorName,
                  }));
                }}
                onFileUpload={(e) => {
                  const files = Array.from(e.target.files);
                  setFormData((prev) => ({
                    ...prev,
                    documents: [
                      ...prev.documents,
                      ...files.map((f) => ({ name: f.name, file: f })),
                    ],
                  }));
                }}
                onDocumentRemove={(index) => {
                  setFormData((prev) => ({
                    ...prev,
                    documents: prev.documents.filter((_, i) => i !== index),
                  }));
                }}
              />

              {/* Item Search & Barcode Section - Hidden in View Mode */}
              {!isViewMode && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 flex-shrink-0 pb-1.5">
                  {/* Item Search */}
                  <div>
                    <GrnItemSearch
                      ref={itemSearchInputRef}
                      itemSearch={itemSearch}
                      searchResults={mergedSearchResults}
                      searchLoading={searchLoading}
                      onSearch={setItemSearch}
                      onSelectItem={handleItemSelected}
                      onCreateProduct={handleCreateProduct}
                    />

                    {/* ✅ PRODUCTION: Show indexing status to user */}
                    {indexingStatus && (
                      <div
                        className={`mt-1 text-xs px-2 py-1 rounded ${
                          indexingStatus === "indexing"
                            ? "bg-blue-50 text-blue-600 flex items-center gap-1"
                            : "bg-green-50 text-green-600"
                        }`}
                      >
                        {indexingStatus === "indexing" && (
                          <>
                            <div className="animate-spin h-3 w-3 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                            Updating search index...
                          </>
                        )}
                        {indexingStatus === "complete" && "✅ Search updated"}
                      </div>
                    )}
                  </div>

                  {/* Barcode Input */}
                  <GrnBarcodeInput
                    ref={barcodeInputRef}
                    barcodeValue={barcodeValue}
                    onChange={(e) => setBarcodeValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleBarcodeScanned(barcodeValue);
                      }
                    }}
                  />
                </div>
              )}

              {/* Items Table */}
              <GrnItemsTable
                key={`grn-table-${refreshTrigger}`} // ✅ Force re-render when products update
                items={formData.items || []}
                columns={columns}
                gridConfig={gridConfig}
                gridHeight={gridHeight}
                gridContainerRef={gridContainerRef}
                isViewMode={isViewMode} // ✅ Pass view mode to disable editing
                gridContext={{ onBatchExpiryClick: handleBatchExpiryClick }}
                highlightedItemId={highlightedItemId}
                editTargetItemId={editTargetItemId}
                onEditTargetHandled={() => setEditTargetItemId(null)}
                onCellValueChanged={(event) => {
                  const { data, colDef } = event;
                  if (data && colDef.field) {
                    let newValue = event.newValue;
                    if (
                      [
                        "qty",
                        "cost",
                        "discount",
                        "taxPercent",
                        "focQty",
                      ].includes(colDef.field)
                    ) {
                      newValue = parseFloat(newValue) || 0;
                    }
                    console.log(
                      `📝 Cell edited: ${colDef.field} = ${newValue}`,
                    );

                    // ✅ If FOC checkbox is unchecked, clear focQty to 0
                    if (colDef.field === "foc" && newValue === false) {
                      console.log(`💙 FOC unchecked - clearing focQty to 0`);
                      updateItem(data.id, "focQty", 0);
                    }

                    updateItem(data.id, colDef.field, newValue);
                  }
                }}
              />
            </div>

            {/* Footer - Fixed at Bottom */}
            <div className="flex flex-col gap-0.5 p-1.5 border-t bg-gray-50 flex-shrink-0">
              {/* Summary Row 1 - Qty through Net Total */}
              <div className="flex items-center justify-between pr-2 gap-2 text-xs">
                {/* 1. Total Qty */}
                <div className="flex items-center justify-between gap-0.5 w-24 bg-white px-1 py-0.5 rounded border border-gray-200">
                  <span className="font-semibold text-xs">Qty:</span>
                  <span className="font-bold text-blue-600 text-xs">
                    {grnTotals.totalQty}
                  </span>
                </div>

                {/* 2. Sub Total */}
                <div className="flex items-center justify-between w-32 gap-0.5 bg-white px-1 py-0.5 rounded border border-gray-200 text-xs">
                  <span className="font-semibold">Subtotal:</span>
                  <span className="font-bold text-blue-600">
                    {formatNumber(grnTotals.totalSubtotal || 0)}
                  </span>
                </div>

                {/* 3. Discount Amount */}
                <div className="flex items-center w-56 justify-between gap-0.5 bg-white px-1 py-0.5 rounded border border-gray-200 text-xs">
                  <span className="font-semibold">Disc Amt :</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.manualDiscountAmount || ""}
                    onChange={(e) => {
                      const amount = parseInput(e.target.value) || 0;
                      const percent =
                        grnTotals.totalSubtotal > 0
                          ? round((amount / grnTotals.totalSubtotal) * 100)
                          : 0;
                      setFormData((prev) => ({
                        ...prev,
                        manualDiscountAmount: amount,
                        manualDiscountPercent: percent,
                      }));
                    }}
                    placeholder="0.00"
                    className="w-16 px-0.5 py-0.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-right"
                  />
                </div>

                {/* 4. Discount Percentage */}
                <div className="flex items-center w-32 justify-between gap-0.5 bg-white px-1 py-0.5 rounded border border-gray-200 text-xs">
                  <span className="font-semibold">Disc % :</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.manualDiscountPercent || ""}
                    onChange={(e) => {
                      const percent = parseInput(e.target.value) || 0;
                      const amount = round(
                        (grnTotals.totalSubtotal * percent) / 100,
                      );
                      setFormData((prev) => ({
                        ...prev,
                        manualDiscountPercent: percent,
                        manualDiscountAmount: amount,
                      }));
                    }}
                    placeholder="0.00"
                    className="w-20 px-0.5 py-0.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-right"
                  />
                </div>

                {/* 5. Total After Discount */}
                <div className="flex items-center justify-between w-60  gap-0.5 bg-white px-1.5 py-0.5 rounded border border-gray-200">
                  <span className="font-semibold">Total Ex.Tax:</span>
                  <span className="font-bold text-blue-600">
                    {formatNumber(getTotalExTax())}
                  </span>
                </div>

                {/* 6. Total Tax */}
                <div className="flex items-center justify-between w-32 gap-0.5 bg-white px-1.5 py-0.5 rounded border border-gray-200">
                  <span className="font-semibold">Tax :</span>
                  <span className="font-bold text-blue-600">
                    {formatNumber(grnTotals.totalTaxAmount || 0)}
                  </span>
                </div>

                {/* 7. Net Total (before shipping) */}
                <div className="flex items-center justify-between w-48 gap-0.5 bg-yellow-100 px-1.5 py-0.5 rounded border border-yellow-300">
                  <span className="font-semibold">Net Total :</span>
                  <span className="font-bold text-yellow-700">
                    {formatNumber(getNetTotal())}
                  </span>
                </div>
              </div>

              {/* Shipper Selection - Right Aligned */}

              {/* Summary Row 2 - Shipping, FOC Items, Final Total */}
              <div className="grid grid-cols-[35%_40%_24%] items-center gap-2 pr-2 text-xs">
                <div className="flex items-center gap-2 bg  justify-between gap-0.5  ">
                  {/* 1. Shipper Selection */}
                  {vendors && vendors.length > 0 && (
                    <div className="flex items-center gap-1">
                      <select
                        value={formData?.shipperId || ""}
                        onChange={(e) => {
                          const selectedShipper = vendors.find(
                            (v) => v._id === e.target.value,
                          );
                          setFormData((prev) => ({
                            ...prev,
                            shipperId: e.target.value,
                            shipperName: selectedShipper?.name || "",
                          }));
                        }}
                        className="h-6 px-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">📦 Shipper</option>
                        {vendors
                          .filter((v) => v.isShipper === true)
                          .map((vendor) => (
                            <option key={vendor._id} value={vendor._id}>
                              {vendor.name}
                            </option>
                          ))}
                      </select>
                      {formData.shipperName && (
                        <span className="text-xs bg-blue-100 px-1 py-0.5 rounded font-semibold">
                          ✓ {formData.shipperName}
                        </span>
                      )}
                    </div>
                  )}

                  {/* 2. Shipping Cost */}
                  <div className="flex items-center w-40 justify-between gap-0.5 bg-white px-1 py-0.5 rounded border border-gray-200 text-xs">
                    <span className="font-semibold">Shipping:</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.shippingCost}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          shippingCost: parseFloat(e.target.value) || 0,
                        }))
                      }
                      className="w-16 px-0.5 py-0.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-right"
                    />
                  </div>
                </div>

                <div className="flex items-center  gap-2 justify-end  ">
                  {/* 3. FOC Items Count Badge */}
                  {getTotalFocItems() > 0 && (
                    <div className="flex items-center  gap-1 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200 text-xs">
                      <span className="font-semibold text-blue-700">
                        💙 {getTotalFocItems()} FOC Items
                      </span>
                    </div>
                  )}

                  <div className="bg-yellow-100 text-yellow-800 p-2 rounded text-xs font-semibold">
                    ⚠️ Ensure the Net total matches the invoice total .
                  </div>
                </div>

                <div className="flex items-end justify-end  gap-2">
                  {/* 4. Final Total (Grand Total) */}

                  <div className="flex items-center justify-between w-48 gap-0.5 bg-yellow-100 px-1.5 py-0.5 rounded border border-green-300">
                    <span className="font-semibold">Final Total:</span>
                    <span className="font-bold text-green-700 text-sm">
                      {formatNumber(getFinalTotal())}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons Row - Hidden in View Mode */}
              {!isViewMode && (
                <div className="flex gap-2 justify-end pr-2 pb-1">
                  <button
                    onClick={handleDraftSubmit}
                    className="px-2 py-1 bg-yellow-600 text-white rounded text-xs hover:bg-yellow-700 font-semibold transition"
                  >
                    💾 Draft
                  </button>
                  <button
                    onClick={handlePostSubmit}
                    className="px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700 font-semibold transition"
                  >
                    ✓ Post
                  </button>
                </div>
              )}

              {/* View Mode Info */}
              {isViewMode && (
                <div className="flex gap-1.5 justify-end pr-2 pb-1">
                  <div className="px-2 py-1 bg-blue-50 border border-blue-300 rounded text-xs text-blue-700 font-medium">
                    📖 View Mode
                  </div>
                  <button
                    onClick={closeGrnModal}
                    className="px-2 py-1 bg-gray-500 text-white rounded text-xs hover:bg-gray-600 font-semibold transition"
                  >
                    Close
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Unit Variant Selector Modal */}
      <GrnUnitVariantSelector
        product={productForUnitSelection}
        isOpen={showUnitSelector}
        onSelect={handleUnitVariantSelected}
        onClose={() => {
          setShowUnitSelector(false);
          setProductForUnitSelection(null);
        }}
      />

      {/* ✅ Batch & Expiry Modal */}
      <BatchExpiryModal
        isOpen={showBatchExpiryModal}
        item={selectedBatchItem}
        onClose={() => {
          setShowBatchExpiryModal(false);
          setSelectedBatchItem(null);
        }}
        onSave={handleBatchExpirySave}
      />

      {/* ✅ GRN Editability Warning Modal */}
      {showEditabilityWarning && editabilityWarning && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            {/* Header */}
            <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-3 rounded-t-lg">
              <h2 className="text-lg font-bold text-yellow-900 flex items-center gap-2">
                <span className="text-2xl">⚠️</span>
                GRN Cannot Be Edited
              </h2>
            </div>

            {/* Body */}
            <div className="p-4 space-y-3">
              <p className="text-sm text-gray-700">
                <strong>GRN {editabilityWarning.grnData?.grnNo || "—"}:</strong> This GRN cannot be edited because:
              </p>
              <div className="bg-red-50 border border-red-200 rounded p-3">
                <p className="text-sm text-red-800 font-medium">
                  {editabilityWarning.reason}
                </p>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded p-3">
                <p className="text-xs text-blue-700">
                  <strong>💡 Next Steps:</strong> If you need to modify this receipt, please cancel the transaction that is blocking the edit, or create a new GRN with the updated quantities.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-2 px-4 py-3 border-t bg-gray-50 rounded-b-lg">
              <button
                onClick={() => {
                  setShowEditabilityWarning(false);
                  setEditabilityWarning(null);
                }}
                className="px-4 py-2 bg-gray-600 text-white rounded font-medium hover:bg-gray-700 transition"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GrnForm;
