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
import { useLpoFormData } from "../../hooks/useLpoFormData";
import { useProductSearch } from "../../hooks/useProductSearch";
import { useProductAPI } from "../../components/shared/sample/useProductAPI";
import useDecimalFormat from "../../hooks/useDecimalFormat";
import useGlobalKeyboard from "../../hooks/useGlobalKeyboard";
import { useLpoGridDimensions } from "../../hooks/useLpoGridDimensions";
import { useLpoItemManagement } from "../../hooks/useLpoItemManagement";
import { useLpoApi } from "../../hooks/useLpoApi";
import { useLpoGridConfig } from "../../hooks/useLpoGridConfig";

// Context - Global Product Form Modal
import { ProductFormContext } from "../../context/ProductFormContext";

// Utilities
import {
  calculateItemCost,
  calculateGrnTotals,
} from "../../utils/lpoCalculations";
import { clearAllCache } from "../../utils/searchCache";
import { useGlobalBarcodeScanner } from "../../hooks/useGlobalBarcodeScanner";
import { createBarcodeHandler } from "../../utils/barcodeHandler";

// Sub-Components
import LpoListTable from "./Lpo/LpoListTable";
import LpoFormHeader from "./Lpo/LpoFormHeader";
import LpoItemSearch from "./Lpo/LpoItemSearch";
import LpoBarcodeInput from "./Lpo/LpoBarcodeInput";
import LpoItemsTable from "./Lpo/LpoItemsTable";
import LpoUnitVariantSelector from "./Lpo/LpoUnitVariantSelector";
import GlobalInventoryPrintingComponent from "../shared/printing/GlobalInventoryPrintingComponent";

// Config
import { API_URL } from "../../config/config";

const PurchaseOrderForm = () => {
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
    fetchNextLpoNo,
  } = useLpoFormData();

  // ✅ Global Product Form Context (with fallback for safety)
  const productFormContext = useContext(ProductFormContext);
  const { openProductForm, isOpen: isProductFormOpen } =
    productFormContext || {};

  // Search & Selection States
  const [showNewLpoModal, setShowNewLpoModal] = useState(false);
  const [isViewMode, setIsViewMode] = useState(false); // ✅ Read-only view mode
  const [itemSearch, setItemSearch] = useState("");
  const [barcodeValue, setBarcodeValue] = useState("");
  const [showUnitSelector, setShowUnitSelector] = useState(false);
  const [productForUnitSelection, setProductForUnitSelection] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0); // ✅ Force grid refresh when products update
  const [highlightedItemId, setHighlightedItemId] = useState(null); // ✅ Track newly added item for highlight
  const [editTargetItemId, setEditTargetItemId] = useState(null); // ✅ Open qty editor for duplicate scan target

  // ✅ LPO Editability Check States
  const [showEditabilityWarning, setShowEditabilityWarning] = useState(false); // Show warning modal for non-editable LPO
  const [editabilityWarning, setEditabilityWarning] = useState(null); // { canEdit, reason, lpoData }
  const [isLoadingLpoList, setIsLoadingLpoList] = useState(true); // ✅ Track LPO list loading state

  // ✅ Print Modal States
  const [showPrintModal, setShowPrintModal] = useState(false); // Show print modal
  const [lpoToPrint, setLpoToPrint] = useState(null); // LPO data to print
  const [isPrintAfterCreate, setIsPrintAfterCreate] = useState(false); // Flag to print after create

  // ✅ Track last added item for quantity increment support
  const lastAddedItemRef = useRef(null); // { productId, barcode, itemId }

  // Search State
  const [lpoSearch, setLpoSearch] = useState("");
  const [lpoStatusFilter, setLpoStatusFilter] = useState("Draft"); // Default to Draft
  const lpoListSearchInputRef = useRef(null);
  const modalRef = useRef(null);
  const modalHasInitialFocusRef = useRef(false);

  // Master Data States
  const [lpoList, setLpoList] = useState([]);
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
    useLpoGridDimensions(showNewLpoModal);

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
    addItemToLpo: addItemToLpoBase,
    updateItem,
    removeItemFromLpo: removeItemFromLpoBase,
  } = useLpoItemManagement(formData, setFormData, unitTypesMap);

  // ✅ WRAPPER: Remove item AND clear lastAddedItemRef if it's the same item
  const removeItemFromLpo = useCallback(
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
      removeItemFromLpoBase(itemId);
    },
    [formData.items, removeItemFromLpoBase],
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
  const islpoRoute = location.pathname === "/lpo-form";
  const isGlobalLpoContextActive =
    islpoRoute && showNewLpoModal && !isViewMode && !showUnitSelector;

  // 🔍 DEBUG: Log context activation
  useEffect(() => {
    if (isGlobalLpoContextActive) {
    }
  }, [isGlobalLpoContextActive]);

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
  const addItemToLpo = useCallback(
    (product, selectedUnit = null) => {
      if (!product) {
        console.error("❌ [ADD] No product provided to addItemToLpo!");
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

        addItemToLpoBase(product, selectedUnit);
      } catch (error) {
        console.error("❌ [ADD] ERROR in addItemToLpo:", error);
      }
    },
    [addItemToLpoBase, formData.items],
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
        addItemToLpo(product);
      }
      setItemSearch("");
    },
    [addItemToLpo],
  );

  /**
   * Handle unit variant selection
   */
  const handleUnitVariantSelected = useCallback(
    (selectedUnit) => {
      if (productForUnitSelection) {
        addItemToLpo(productForUnitSelection, selectedUnit);
        setShowUnitSelector(false);
        setProductForUnitSelection(null);
      }
    },
    [productForUnitSelection, addItemToLpo],
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

      addItemToLpo(product, selectedUnit);

      setBarcodeValue("");
    },
    [addItemToLpo, formData.items, setBarcodeValue, showToast],
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
      console.log("🔴 [PRODUCT] Calling addItemToLpo NOW");
      addItemToLpo(product);
      console.log("🔴 [PRODUCT] addItemToLpo call completed");
      console.log(`✅ [PRODUCT] Added ${product.name}`);

      setBarcodeValue("");
    },
    [
      addItemToLpo,
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
    enabled: isGlobalLpoContextActive,
  });

  // 🔍 CONTEXT-AWARE SCANNING: Pause scanner when modals are open
  useEffect(() => {
    if (showUnitSelector || isProductFormOpen) {
      barcodeScannerControls?.pause();
    } else {
      barcodeScannerControls?.resume();
    }
  }, [showUnitSelector, isProductFormOpen, barcodeScannerControls]);

  // API Management
  const { fetchVendors, fetchLpos, saveLpo, deleteLpo } = useLpoApi(
    setVendors,
    setLpoList,
  );
  const productAPI = useProductAPI();

  // ✅ Load LPO list on component mount
  useEffect(() => {
    let isMounted = true;
    
    const loadLpoList = async () => {
      try {
        console.log("📋 [INIT] Loading LPO list from database...");
        setIsLoadingLpoList(true);
        
        const lpoData = await fetchLpos();
        
        if (isMounted) {
          console.log(`✅ [INIT] LPO list loaded successfully (${lpoData?.length || 0} items)`);
          setIsLoadingLpoList(false);
        }
      } catch (error) {
        console.error("❌ [INIT] Error loading LPO list:", error);
        if (isMounted) {
          showToast('error', "Failed to load LPO list");
          setIsLoadingLpoList(false);
        }
      }
    };
    
    loadLpoList();
    
    return () => {
      isMounted = false; // Cleanup on unmount
    };
  }, []); // Empty array = run ONLY once on mount

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
            // LpoForm already listens to productUpdated event
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

  const { columns, gridConfig } = useLpoGridConfig(
    removeItemFromLpo,
    handleEditProduct,
  );

  // ✅ Memoize LPO totals calculation (called 10+ times per render - prevent recalculation)
  const lpoTotals = useMemo(
    () => calculateGrnTotals(formData.items, 0),
    [formData.items],
  );

  // ✅ Helper functions for summary calculations
  // ✅ SIMPLIFIED: No discount or FOC calculations for LPO
  const getTotalExTax = () => {
    // Simply return subtotal (no discount, no FOC)
    return lpoTotals.totalSubtotal;
  };

  const getNetTotal = () => {
    // Simply subtotal + tax
    return getTotalExTax() + lpoTotals.totalTaxAmount;
  };

  const getFinalTotal = () => {
    return getNetTotal();
  };

  const openNewLpoModal = useCallback(async () => {
    setIsViewMode(false);
    setEditingId(null);
    setItemSearch(""); // ✅ Reset product search
    setBarcodeValue(""); // ✅ Reset barcode input
    await resetForm();
    setShowNewLpoModal(true);
  }, [resetForm, setEditingId]);

  const closeLpoModal = useCallback(async () => {
    setShowNewLpoModal(false);
    setIsViewMode(false);
    setItemSearch(""); // ✅ Reset product search
    setBarcodeValue(""); // ✅ Reset barcode input
    setLpoSearch(""); // ✅ Reset LPO list search
    await resetForm();
  }, [resetForm]);

  const validateBeforeSubmit = useCallback(() => {
    const vendorId = formData.vendorId?.toString().trim() || "";
    const itemsCount = formData.items?.length || 0;

    // ✅ REQUIRED FIELDS FOR LPO
    if (!vendorId) {
      showToast("error", "Please select a vendor");
      return false;
    }

    if (itemsCount === 0) {
      showToast("error", "Please add at least one item");
      return false;
    }

    // ✅ Validate item costs (cannot be 0)
    const itemsWithZeroCost = formData.items.filter(
      (item) => item.cost === 0,
    );
    if (itemsWithZeroCost.length > 0) {
      const itemNames = itemsWithZeroCost
        .map((item) => item.productName)
        .join(", ");
      showToast("error", `Item cost cannot be 0: ${itemNames}`);
      return false;
    }

    return true;
  }, [formData, showToast]);

  // ============================================================================
  // 🔨 PAYLOAD BUILDER - Ultra simplified (no calculations, just save items)
  // ============================================================================
  const buildLpoPayload = async () => {
    // ✅ Basic validation only
    if (!formData.vendorId || !formData.vendorName) {
      showToast("error", "Please select a vendor");
      return null;
    }

    if (!formData.items || formData.items.length === 0) {
      showToast("error", "Please add at least one item");
      return null;
    }

    let lpoNumber;
    try {
      lpoNumber = await fetchNextLpoNo();
      setFormData((prev) => ({ ...prev, lpoNo: lpoNumber }));
    } catch (error) {
      console.error("Error generating LPO number:", error);
      showToast("error", "Failed to generate LPO number");
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
      // ✅ DEBUG: Log all items before transformation
      console.log("📦 [DEBUG] Items before transformation:", formData.items.map((item, idx) => ({
        index: idx,
        productName: item.productName || item.itemName,
        qty: item.qty,
        quantity: item.quantity,
        cost: item.cost,
        unitCost: item.unitCost,
      })));

      // ✅ ULTRA SIMPLE: Take items as-is, no complex transformation
      const transformedItems = formData.items.map((item, index) => {
        const qty = parseFloat(item.qty || item.quantity || 0);
        const cost = parseFloat(item.cost || item.unitCost || 0);

        console.log(`📝 [DEBUG] Item ${index + 1} transformation:`, {
          raw_qty: item.qty,
          raw_quantity: item.quantity,
          parsed_qty: qty,
          raw_cost: item.cost,
          raw_unitCost: item.unitCost,
          parsed_cost: cost,
        });

        // ✅ Basic validation: qty must be > 0
        if (qty <= 0) {
          throw new Error(`Line ${index + 1}: Quantity must be greater than 0`);
        }

        return {
          productId: item.productId,
          productName: item.itemName || item.productName || "",
          itemCode: item.itemCode || "",
          qty: qty,
          cost: cost,
          unit: item.unitType || "PC",
          taxType: formData.taxType || "exclusive",
          taxPercent: parseFloat(item.taxPercent || 0),
          tax: parseFloat(item.taxAmount || 0),
        };
      });

      // ✅ Simple payload - just essential fields
      const payload = {
        lpoNumber,
        lpoNo: formData.lpoNo || "",
        lpoDate: formData.lpoDate || new Date().toISOString().split("T")[0],
        vendorId: formData.vendorId,
        vendorName: formData.vendorName,
        paymentTerms: formData.paymentTerms || "due_on_receipt",
        notes: formData.notes || "",
        status: "Draft",
        createdBy: currentUserId,
        items: transformedItems,
      };

      console.log("📋 LPO Payload to send:", {
        lpoNumber: payload.lpoNumber,
        lpoDate: payload.lpoDate,
        vendorId: payload.vendorId,
        vendorName: payload.vendorName,
        status: payload.status,
        itemCount: payload.items.length,
        firstItem: payload.items[0] || null,
      });
      return payload;
    } catch (error) {
      console.error("❌ Error building payload:", error.message);
      showToast("error", error.message);
      return null;
    }
  };

  // ============================================================================
  // 💾 SAVE AS DRAFT - NO posting, NO stock updates
  // ============================================================================
  const handleSaveDraft = async () => {
    console.log("📋 [DRAFT] Starting save draft process - No stock updates...");

    const payload = await buildLpoPayload();
    if (!payload) return;

    try {
      const draftPayload = {
        ...payload,
        status: "Draft",
      };

      console.log("📤 Submitting DRAFT LPO:", {
        lpoNumber: draftPayload.lpoNumber,
        status: draftPayload.status,
        isEdit: !!editingId,
        endpoint: editingId ? `PUT /lpo/${editingId}` : "POST /lpo",
        note: "Only saved as Draft - No stock or accounting entries updated",
      });

      const response = await axios({
        method: editingId ? "PUT" : "POST",
        url: editingId ? `${API_URL}/lpo/${editingId}` : `${API_URL}/lpo`,
        data: draftPayload,
        headers: { "Content-Type": "application/json" },
      });

      if (response.status === 200 || response.status === 201) {
        console.log("✅ Draft LPO saved successfully (NO stock updates)");

        clearAllCache();
        const listResponse = await axios.get(`${API_URL}/lpo`);
        setLpoList(
          Array.isArray(listResponse.data)
            ? listResponse.data
            : listResponse.data?.data || [],
        );

        // 🔑 If this is a NEW LPO (no editingId yet), set it now so user can Create LPO or Create & Print
        if (!editingId) {
          console.log("✅ New Draft created - Setting editingId to enable Create LPO options");
          const newLpo = response.data.lpo;
          const newLpoId = newLpo._id || newLpo.id;
          
          // Update formData with the response data (includes new ID and all fields)
          setFormData((prev) => ({
            ...prev,
            _id: newLpoId,
            lpoNo: newLpo.lpoNumber || newLpo.lpoNo,
            status: newLpo.status,
          }));
          
          setEditingId(newLpoId);
          // Keep modal open and show three buttons
          showToast("success", "✅ LPO saved as Draft - Now you can Create LPO or Create & Print");
        } else {
          // If updating existing Draft, close and reset
          showToast("success", "✅ LPO saved as Draft");
          setItemSearch("");
          setBarcodeValue("");
          setLpoSearch("");
          await resetForm();
          setShowNewLpoModal(false);
        }
      }
    } catch (error) {
      const errorMsg =
        error.response?.data?.message ||
        error.message ||
        "Failed to save draft";
      showToast("error", errorMsg);
      console.error("❌ Draft Save Error:", error);
    }
  };

  // ============================================================================
  // 📤 POST LPO - Changes status to Received (no auto stock updates)
  // ============================================================================
  const handlePostLpo = async () => {
    console.log("✓ [POST] Starting post LPO process...");

    const payload = await buildLpoPayload();
    if (!payload) return;

    try {
      const postPayload = {
        ...payload,
        status: "Received",
      };

      console.log("📤 Submitting POST LPO:", {
        lpoNumber: postPayload.lpoNumber,
        status: postPayload.status,
        isEdit: !!editingId,
        endpoint: editingId ? `PUT /lpo/${editingId}` : "POST /lpo",
        note: "Status changed to Received - No auto stock updates",
      });

      const response = await axios({
        method: editingId ? "PUT" : "POST",
        url: editingId ? `${API_URL}/lpo/${editingId}` : `${API_URL}/lpo`,
        data: postPayload,
        headers: { "Content-Type": "application/json" },
      });

      if (response.status === 200 || response.status === 201) {
        const isNewLpo = !editingId;

        console.log(`✅ LPO Posted successfully (status changed to Received)`);

        const toastMessage = isNewLpo
          ? `✅ LPO created & posted - Status: Received`
          : `✅ LPO updated - Status: Received`;

        showToast("success", toastMessage);

        clearAllCache();
        const listResponse = await axios.get(`${API_URL}/lpo`);
        setLpoList(
          Array.isArray(listResponse.data)
            ? listResponse.data
            : listResponse.data?.data || [],
        );

        setItemSearch("");
        setBarcodeValue("");
        setLpoSearch("");
        await resetForm();
        setShowNewLpoModal(false);
      }
    } catch (error) {
      const errorMsg =
        error.response?.data?.message || error.message || "Failed to post LPO";
      showToast("error", errorMsg);
      console.error("❌ Post LPO Error:", error);
    }
  };

  // ============================================================================
  // 🔵 CREATE LPO - Status = Requested (Locked for editing)
  // ============================================================================
  const handleCreateLpo = async () => {
    console.log("🔵 [CREATE] Starting create LPO process - Status: Requested...");

    const payload = await buildLpoPayload();
    if (!payload) return;

    try {
      const createPayload = {
        ...payload,
        status: "Requested",
      };

      console.log("📤 Submitting CREATE LPO:", {
        lpoNumber: createPayload.lpoNumber,
        status: createPayload.status,
        note: "Status set to Requested - LPO locked for editing",
      });

      const response = await axios({
        method: editingId ? "PUT" : "POST",
        url: editingId ? `${API_URL}/lpo/${editingId}` : `${API_URL}/lpo`,
        data: createPayload,
        headers: { "Content-Type": "application/json" },
      });

      if (response.status === 200 || response.status === 201) {
        console.log(`✅ LPO Created successfully (Status: Requested - Locked)`);

        showToast("success", "✅ LPO Created - Status: Requested (Locked for editing)");

        clearAllCache();
        const listResponse = await axios.get(`${API_URL}/lpo`);
        setLpoList(
          Array.isArray(listResponse.data)
            ? listResponse.data
            : listResponse.data?.data || [],
        );

        setItemSearch("");
        setBarcodeValue("");
        setLpoSearch("");
        await resetForm();
        setShowNewLpoModal(false);
      }
    } catch (error) {
      const errorMsg =
        error.response?.data?.message || error.message || "Failed to create LPO";
      showToast("error", errorMsg);
      console.error("❌ Create LPO Error:", error);
    }
  };

  // ============================================================================
  // 🔵 CREATE & PRINT LPO - Status = Requested + Print
  // ============================================================================
  const handleCreateAndPrintLpo = async () => {
    console.log("🔵 [CREATE & PRINT] Starting create & print LPO process...");

    const payload = await buildLpoPayload();
    if (!payload) return;

    try {
      const createPayload = {
        ...payload,
        status: "Requested",
      };

      console.log("📤 Submitting CREATE & PRINT LPO:", {
        lpoNumber: createPayload.lpoNumber,
        status: createPayload.status,
        note: "Status set to Requested - Will print after save",
      });

      const response = await axios({
        method: editingId ? "PUT" : "POST",
        url: editingId ? `${API_URL}/lpo/${editingId}` : `${API_URL}/lpo`,
        data: createPayload,
        headers: { "Content-Type": "application/json" },
      });

      if (response.status === 200 || response.status === 201) {
        console.log(`✅ LPO Created successfully - Opening print modal...`);

        showToast("success", "✅ LPO Created - Opening Print...");

        // Set the LPO to print and show print modal
        setLpoToPrint(response.data.lpo);
        setShowPrintModal(true);
        setIsPrintAfterCreate(true);

        clearAllCache();
        const listResponse = await axios.get(`${API_URL}/lpo`);
        setLpoList(
          Array.isArray(listResponse.data)
            ? listResponse.data
            : listResponse.data?.data || [],
        );

        setItemSearch("");
        setBarcodeValue("");
        setLpoSearch("");
        await resetForm();
        setShowNewLpoModal(false);
      }
    } catch (error) {
      const errorMsg =
        error.response?.data?.message || error.message || "Failed to create LPO";
      showToast("error", errorMsg);
      console.error("❌ Create & Print LPO Error:", error);
    }
  };

  const handleDraftSubmit = useCallback(() => {
    if (!validateBeforeSubmit()) {
      return;
    }

    handleSaveDraft();
  }, [validateBeforeSubmit, handleSaveDraft]);

  const handleCreateLpoSubmit = useCallback(() => {
    if (!validateBeforeSubmit()) {
      return;
    }

    handleCreateLpo();
  }, [validateBeforeSubmit, handleCreateLpo]);

  const handleCreateAndPrintSubmit = useCallback(() => {
    if (!validateBeforeSubmit()) {
      return;
    }

    handleCreateAndPrintLpo();
  }, [validateBeforeSubmit, handleCreateAndPrintLpo]);

  const handlePostSubmit = useCallback(() => {
    if (!validateBeforeSubmit()) {
      return;
    }

    handlePostLpo();
  }, [validateBeforeSubmit, handlePostLpo]);

  const focusItemSearchInput = useCallback(() => {
    if (!islpoRoute) {
      return;
    }

    if (showNewLpoModal && !isViewMode) {
      itemSearchInputRef.current?.focus();
      return;
    }

    lpoListSearchInputRef.current?.focus();
  }, [islpoRoute, isViewMode, showNewLpoModal]);

  useEffect(() => {
    if (!showNewLpoModal || isViewMode || showUnitSelector) {
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
  }, [showNewLpoModal, isViewMode, showUnitSelector]);

  useEffect(() => {
    openShortcutHandlerRef.current = openNewLpoModal;
    closeShortcutHandlerRef.current = closeLpoModal;
    draftShortcutHandlerRef.current = handleDraftSubmit;
    postShortcutHandlerRef.current = handlePostSubmit;
    focusSearchShortcutHandlerRef.current = focusItemSearchInput;
  }, [
    openNewLpoModal,
    closeLpoModal,
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
        id: "lpo-form-open",
        description: "Open new LPO",
        category: "LPO",
        global: true,
      },
    );

    return () => {
      unregisterOpen?.();
    };
  }, [registerShortcut]);

  useEffect(() => {
    if (!islpoRoute) {
      return undefined;
    }

    const unregisterSave = registerShortcut(
      "Ctrl+S",
      (event) => {
        event.preventDefault();
        if (isGlobalLpoContextActive) {
          draftShortcutHandlerRef.current?.();
        }
      },
      {
        id: "lpo-form-save",
        description: "Save LPO as draft",
        category: "LPO",
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
        id: "lpo-form-search",
        description: "Focus LPO search",
        category: "LPO",
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
        id: "lpo-form-close",
        description: "Close LPO form",
        category: "LPO",
        global: true,
        allowInInput: true,
      },
    );

    const unregisterPost = registerShortcut(
      "Ctrl+Enter",
      (event) => {
        event.preventDefault();
        if (isGlobalLpoContextActive) {
          postShortcutHandlerRef.current?.();
        }
      },
      {
        id: "lpo-form-post",
        description: "Post LPO",
        category: "LPO",
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
  }, [isGlobalLpoContextActive, islpoRoute, registerShortcut]);

  return (
    <div className="absolute inset-0 flex flex-col bg-gray-50 overflow-hidden">
      {/* HEADER - Fixed at top */}
      <div className="flex-shrink-0 bg-white text-gray-900 px-3 py-2 shadow-md z-10">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-lg font-bold text-gray-900">
              📦 Local Purchase Order (LPO)
            </h1>
            <p className="text-xs text-gray-600 mt-0.5">
              Manage purchase orders, track deliveries, and maintain supplier
              relationships with ease.
            </p>
          </div>
          <button
            onClick={openNewLpoModal}
            className="flex items-center gap-1 bg-green-600 text-white px-2 py-1 rounded text-sm hover:bg-green-700 transition font-medium"
          >
            <Plus size={12} /> New LPO
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
              ref={lpoListSearchInputRef}
              type="text"
              placeholder="Search LPO, vendor..."
              className="border-0 p-0 outline-none w-full text-xs"
              value={lpoSearch}
              onChange={(e) => setLpoSearch(e.target.value)}
            />
            {lpoSearch && (
              <button
                onClick={() => setLpoSearch("")}
                className="text-gray-500 hover:text-gray-700 text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Status Filter */}
          <select
            className="border border-gray-300 rounded px-2 text-xs bg-white flex-shrink-0 h-7"
            value={lpoStatusFilter}
            onChange={(e) => setLpoStatusFilter(e.target.value)}
          >
            <option value="Draft">Draft</option>
            <option value="Requested">Requested</option>
            <option value="Received">Received</option>
            <option value="">All Status</option>
          </select>
        </div>

        {/* ✅ Loading indicator */}
        {isLoadingLpoList && (
          <div className="flex items-center justify-center h-32 bg-white rounded-lg shadow-sm border">
            <div className="flex flex-col items-center gap-2">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="text-sm text-gray-600">Loading LPO list...</p>
            </div>
          </div>
        )}

        {!isLoadingLpoList && (
          <LpoListTable
            lpoList={lpoList.filter(
              (lpo) =>
                (lpo.lpoNumber?.toLowerCase().includes(lpoSearch.toLowerCase()) ||
                  lpo.vendorName
                    ?.toLowerCase()
                    .includes(lpoSearch.toLowerCase())) &&
                (lpoStatusFilter === "" || lpo.status === lpoStatusFilter),
            )}
            onView={(lpo) => {
            // ✅ Map backend LPO data to frontend form format (VIEW MODE - SIMPLIFIED)
            const mappedItems = (lpo.items || []).map((item) => ({
              id: item._id || Math.random().toString(36),
              productId: item.productId,
              productName: item.productName || item.itemName || "",
              itemCode: item.itemCode || "",
              qty: item.qty || item.quantity || 0,
              cost: item.cost || item.unitCost || 0,
              unitType: item.unit || item.unitType || "PC",
              taxType: item.taxType || lpo.taxType || "exclusive",
              taxPercent: item.taxPercent || 0,
              tax: item.tax || item.taxAmount || 0,
              notes: item.notes || "",
            }));

            const mappedLpo = {
              lpoNo: lpo.lpoNo || lpo.lpoNumber || "",
              vendorId: lpo.vendorId,
              vendorName: lpo.vendorName,
              lpoDate: lpo.lpoDate
                ? new Date(lpo.lpoDate).toISOString().split("T")[0]
                : new Date().toISOString().split("T")[0],
              taxType: lpo.taxType || "exclusive",
              notes: lpo.notes || "",
              paymentTerms: lpo.paymentTerms || "due_on_receipt",
              items: mappedItems,
            };

            setFormData(mappedLpo);
            setEditingId(lpo._id);
            setItemSearch(""); // ✅ Reset product search
            setBarcodeValue(""); // ✅ Reset barcode input
            setIsViewMode(true); // ✅ Enable view mode
            setShowNewLpoModal(true);
          }}
          onEdit={async (lpo) => {
            // ✅ Map backend LPO data to frontend form format (EDIT MODE - SIMPLIFIED)
            const mappedItems = (lpo.items || []).map((item) => ({
              id: item._id || Math.random().toString(36),
              productId: item.productId,
              productName: item.productName || item.itemName || "",
              itemCode: item.itemCode || "",
              qty: item.qty || item.quantity || 0,
              cost: item.cost || item.unitCost || 0,
              unitType: item.unit || item.unitType || "PC",
              taxType: item.taxType || lpo.taxType || "exclusive",
              taxPercent: item.taxPercent || 0,
              tax: item.tax || item.taxAmount || 0,
              notes: item.notes || "",
            }));

            const mappedLpo = {
              lpoNo: lpo.lpoNo || lpo.lpoNumber || "",
              vendorId: lpo.vendorId,
              vendorName: lpo.vendorName,
              lpoDate: lpo.lpoDate
                ? new Date(lpo.lpoDate).toISOString().split("T")[0]
                : new Date().toISOString().split("T")[0],
              taxType: lpo.taxType || "exclusive",
              notes: lpo.notes || "",
              paymentTerms: lpo.paymentTerms || "due_on_receipt",
              items: mappedItems,
            };

            console.log("📝 Loading LPO for edit:", {
              originalLpoNumber: lpo.lpoNumber,
              mappedLpoNo: mappedLpo.lpoNo,
              vendorName: mappedLpo.vendorName,
              itemCount: mappedLpo.items.length,
              firstItem: mappedLpo.items[0],
            });

            // ✅ Proceed with loading form
            setFormData(mappedLpo);
            setEditingId(lpo._id);
            setItemSearch(""); // ✅ Reset product search
            setBarcodeValue(""); // ✅ Reset barcode input
            setIsViewMode(false); // ✅ Enable edit mode
            setShowNewLpoModal(true);
          }}
          onDelete={async (id) => {
            if (!window.confirm("Are you sure you want to delete this LPO?"))
              return;
            try {
              console.log("🗑️ [DELETE] Deleting LPO:", id);
              const response = await axios.delete(`${API_URL}/lpo/${id}`);
              if (response.status === 200) {
                setLpoList((prev) => prev.filter((l) => l._id !== id));
                showToast("success", "LPO deleted successfully");
                console.log("✅ [DELETE] LPO deleted successfully");
              }
            } catch (error) {
              const errorMsg = error.response?.data?.message || error.message || "Failed to delete LPO";
              showToast("error", errorMsg);
              console.error("❌ [DELETE] Error deleting LPO:", error);
            }
          }}
        />
        )}
      </div>

      {/* New/Edit LPO Modal */}
      {showNewLpoModal && (
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
                    ? "📖 View Purchase Order"
                    : editingId
                      ? "Edit Purchase Order"
                      : "New Purchase Order"}
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
                onClick={closeLpoModal}
                className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-black-200 rounded-full transition-colors"
                title="Close"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-2 flex-1 overflow-y-auto flex flex-col gap-2 w-full">
              {/* Form Header */}
              <LpoFormHeader
                formData={formData}
                vendors={vendors}
                isViewMode={isViewMode} // ✅ Pass view mode
                isLocked={formData?.status === "Requested"} // 🔒 Lock when status is Requested
                onFormChange={
                  (field, value) =>
                    !isViewMode &&
                    formData?.status !== "Requested" &&
                    setFormData((prev) => ({ ...prev, [field]: value })) // Disable changes in view mode or when locked
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

              {/* Item Search & Barcode Section - Hidden in View Mode or When Locked */}
              {!isViewMode && formData?.status !== "Requested" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 flex-shrink-0 pb-1.5">
                  {/* Item Search */}
                  <div>
                    <LpoItemSearch
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
                  <LpoBarcodeInput
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
              <LpoItemsTable
                key={`lpo-table-${refreshTrigger}`} // ✅ Force re-render when products update
                items={formData.items || []}
                columns={columns}
                gridConfig={gridConfig}
                gridHeight={gridHeight}
                gridContainerRef={gridContainerRef}
                isViewMode={isViewMode} // ✅ Pass view mode to disable editing
                isLocked={formData?.status === "Requested"} // 🔒 Lock when status is Requested
                highlightedItemId={highlightedItemId}
                editTargetItemId={editTargetItemId}
                onEditTargetHandled={() => setEditTargetItemId(null)}
                onCellValueChanged={(event) => {
                  // 🔒 Prevent edits when LPO is locked or in view mode
                  if (isViewMode || formData?.status === "Requested") return;
                  const { data, colDef } = event;
                  if (data && colDef.field) {
                    let newValue = event.newValue;
                    // ✅ SIMPLIFIED: Parse only qty, cost, taxPercent (no FOC or discount)
                    if (
                      [
                        "qty",
                        "cost",
                        "taxPercent",
                      ].includes(colDef.field)
                    ) {
                      newValue = parseFloat(newValue) || 0;
                    }
                    console.log(
                      `📝 Cell edited: ${colDef.field} = ${newValue}`,
                    );

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
                    {lpoTotals.totalQty}
                  </span>
                </div>
                
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
                    {formatNumber(lpoTotals.totalTaxAmount || 0)}
                  </span>
                </div>
                {/* 7. Final Total */}
                <div className="flex items-center justify-between w-48 gap-0.5 bg-yellow-100 px-1.5 py-0.5 rounded border border-yellow-300">
                  <span className="font-semibold">Final Total :</span>
                  <span className="font-bold text-yellow-700">
                    {formatNumber(getFinalTotal())}
                  </span>
                </div>
              </div>

              {/* Action Buttons Row - Hidden in View Mode */}
              {!isViewMode && (
                <div className="flex gap-2 justify-end pr-2 pb-1">
                  {/* DEBUG: Log status */}
                  {console.log("🔍 Button visibility - formData.status:", formData?.status)}
                  {/* Always show three buttons - User can choose independently */}
                  {formData?.status !== "Requested" && (
                    <>
                      <button
                        onClick={handleDraftSubmit}
                        className="px-2 py-1 bg-yellow-600 text-white rounded text-xs hover:bg-yellow-700 font-semibold transition"
                        title="Save LPO as Draft (editable)"
                      >
                        💾 Save as Draft
                      </button>
                      <button
                        onClick={handleCreateLpoSubmit}
                        className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 font-semibold transition"
                        title="Create LPO - Status will be set to Requested (Locked)"
                      >
                        📋 Create LPO
                      </button>
                      <button
                        onClick={handleCreateAndPrintSubmit}
                        className="px-2 py-1 bg-purple-600 text-white rounded text-xs hover:bg-purple-700 font-semibold transition"
                        title="Create LPO and Print - Status will be set to Requested (Locked)"
                      >
                        🖨️ Create & Print
                      </button>
                    </>
                  )}

                  {/* LPO with Requested status: Locked - No edit buttons shown */}
                  {formData?.status === "Requested" && (
                    <>
                      <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs font-semibold">
                        🔒 Locked - Status: Requested
                      </span>
                    </>
                  )}
                </div>
              )}

              {/* View Mode Info */}
              {isViewMode && (
                <div className="flex gap-1.5 justify-end pr-2 pb-1">
                  <div className="px-2 py-1 bg-blue-50 border border-blue-300 rounded text-xs text-blue-700 font-medium">
                    📖 View Mode
                  </div>
                  <button
                    onClick={closeLpoModal}
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
      <LpoUnitVariantSelector
        product={productForUnitSelection}
        isOpen={showUnitSelector}
        onSelect={handleUnitVariantSelected}
        onClose={() => {
          setShowUnitSelector(false);
          setProductForUnitSelection(null);
        }}
      />

      {/* ✅ LPO Editability Warning Modal */}
      {showEditabilityWarning && editabilityWarning && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            {/* Header */}
            <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-3 rounded-t-lg">
              <h2 className="text-lg font-bold text-yellow-900 flex items-center gap-2">
                <span className="text-2xl">⚠️</span>
                LPO Cannot Be Edited
              </h2>
            </div>

            {/* Body */}
            <div className="p-4 space-y-3">
              <p className="text-sm text-gray-700">
                <strong>LPO {editabilityWarning.Data?.lpoNo || "—"}:</strong>{" "}
                This LPO cannot be edited because:
              </p>
              <div className="bg-red-50 border border-red-200 rounded p-3">
                <p className="text-sm text-red-800 font-medium">
                  {editabilityWarning.reason}
                </p>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded p-3">
                <p className="text-xs text-blue-700">
                  <strong>💡 Next Steps:</strong> If you need to modify this
                  receipt, please cancel the transaction that is blocking the
                  edit, or create a new LPO with the updated quantities.
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

      {/* 🖨️ PRINT MODAL */}
      {showPrintModal && lpoToPrint && (
        <GlobalInventoryPrintingComponent
          documentType="lpo"
          documentId={lpoToPrint._id || lpoToPrint.id}
          onClose={() => {
            setShowPrintModal(false);
            setLpoToPrint(null);
            setIsPrintAfterCreate(false);
          }}
          title={`Print LPO - ${lpoToPrint.lpoNumber}`}
        />
      )}
    </div>
  );
};

export default PurchaseOrderForm;
