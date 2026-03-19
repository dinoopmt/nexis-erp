import React, { useState, useRef, useCallback, useEffect, useContext, useMemo } from "react";
import { Plus, X, Search } from "lucide-react";
import { toast } from "react-hot-toast";
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

// Context - Global Product Form Modal
import { ProductFormContext } from "../../context/ProductFormContext";

// Utilities
import { calculateGrnTotals, calculateItemCost } from "../../utils/grnCalculations";

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
  const { formatCurrency, formatNumber, round, sum, parseInput, isValidDecimal } = useDecimalFormat();

  // Form State & Management
  const { formData, setFormData, editingId, setEditingId, resetForm, fetchNextGrnNo } =
    useGrnFormData();

  // ✅ Global Product Form Context (with fallback for safety)
  const productFormContext = useContext(ProductFormContext);
  const { openProductForm } = productFormContext || {};

  // Search & Selection States
  const [showNewGrnModal, setShowNewGrnModal] = useState(false);
  const [itemSearch, setItemSearch] = useState("");
  const [barcodeValue, setBarcodeValue] = useState("");
  const [showUnitSelector, setShowUnitSelector] = useState(false);
  const [productForUnitSelection, setProductForUnitSelection] = useState(null);
  const [showBatchExpiryModal, setShowBatchExpiryModal] = useState(false);
  const [selectedBatchItem, setSelectedBatchItem] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0); // ✅ Force grid refresh when products update

  // Search State
  const [grnSearch, setGrnSearch] = useState("");
  const [grnStatusFilter, setGrnStatusFilter] = useState("Draft"); // Default to Draft

  // Master Data States
  const [grnList, setGrnList] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [unitTypes, setUnitTypes] = useState([]);
  const [unitTypesMap, setUnitTypesMap] = useState(null);

  // Debug vendors state
  useEffect(() => {
    console.log("📦 GrnForm vendors state:", vendors);
  }, [vendors]);

  // Fallback: Manually fetch vendors if hook doesn't auto-populate
  useEffect(() => {
    console.log("🚀 GrnForm mounted, triggering vendor fetch");
    if (vendors.length === 0) {
      console.log("📥 No vendors yet, calling fetchVendors manually");
      fetchVendors();
    }
  }, []);

  // Grid Management
  const barcodeInputRef = useRef(null);
  const { gridContainerRef, gridHeight } = useGrnGridDimensions(showNewGrnModal);

  // Product Search Hook - Centralized with Meilisearch + fallback
  const {
    results: searchResults,
    loading: searchLoading,
    error: searchError,
    clearCache,
  } = useProductSearch(itemSearch, 150, 1, 50, true);

  // 🔴 P3: Listen for product updates from Product modal and refresh search results AND items in form
  useEffect(() => {
    const handleProductUpdated = (event) => {
      const syncStartTime = performance.now();
      const { product } = event.detail || {};
      
      if (!product?._id) {
        console.warn('⚠️ [SYNC] No product ID in event data');
        return;
      }
      
      // ✅ IMMEDIATE: Update items if any match this product
      if (formData.items && formData.items.length > 0) {
        
        // Check which items match
        const matchingItems = formData.items.filter(item => {
          return item.productId === product._id;
        });
        
        if (matchingItems.length > 0) {
          
          setFormData((prev) => {
            const updatedItems = prev.items.map((item) => {
              if (item.productId === product._id) {
                const newTrackExpiry = product.trackExpiry !== undefined ? product.trackExpiry : item.trackExpiry;
                return { ...item, trackExpiry: newTrackExpiry };
              }
              return item;
            });
            
            const hasChanged = updatedItems.some((item, idx) => item.trackExpiry !== prev.items[idx]?.trackExpiry);
            if (hasChanged) {
              setRefreshTrigger(t => t + 1);
            }
            
            return { ...prev, items: updatedItems };
          });
        } else {
          console.warn(`⚠️ [NO-MATCH] No items found matching productId: ${product._id}`);
          console.log(`📋 [DEBUG] Current items:`, formData.items.map(i => ({ name: i.productName, id: i.id, productId: i.productId, trackExpiry: i.trackExpiry })));
        }
      } else {
        console.warn(`⚠️ [EMPTY] formData.items is empty or undefined`);
      }
      
      // ✅ ASYNC: Clear search cache in background (non-blocking)
      if (itemSearch && itemSearch.trim()) {
        Promise.resolve().then(() => {
          clearCache();
          const elapsed = (performance.now() - syncStartTime).toFixed(1);
          console.log(`🔄 [SYNC-BG] Cache cleared in ${elapsed}ms`);
        });
      }
    };

    window.addEventListener('productUpdated', handleProductUpdated);
    return () => window.removeEventListener('productUpdated', handleProductUpdated);
  }, [itemSearch, clearCache]);

  // Item Management
  const { addItemToGrn, updateItem, removeItemFromGrn } =
    useGrnItemManagement(formData, setFormData, unitTypesMap);

  // ✅ When header tax type changes, recalculate all items with new tax type
  useEffect(() => {
    if (formData.items && formData.items.length > 0) {
      setFormData((prev) => {
        const updatedItems = prev.items.map((item) => {
          const updatedItem = { ...item, taxType: prev.taxType };
          calculateItemCost(updatedItem);
          return updatedItem;
        });

        console.log("♻️ Tax type changed to:", prev.taxType, "- Recalculated all items");
        return { ...prev, items: updatedItems };
      });
    }
  }, [formData.taxType]); // Only monitor taxType changes

  /**
   * Handle item selection with unit variant support
   */
  const handleItemSelected = useCallback((product) => {
    console.log("🔍 Product selected - checking for packingUnits:", {
      productName: product?.name,
      hasPackingUnits: !!product?.packingUnits,
      packingUnitsLength: product?.packingUnits?.length || 0,
      packingUnits: product?.packingUnits,
    });

    // Check if product has packing units (unit variants)
    if (product?.packingUnits && product.packingUnits.length > 0) {
      console.log("✅ Product has unit variants - showing selector modal");
      // Show unit selector modal
      setProductForUnitSelection(product);
      setShowUnitSelector(true);
    } else {
      console.log("ℹ️ No unit variants - adding with base unit");
      // Add directly with base unit
      addItemToGrn(product);
    }
    setItemSearch("");
  }, [addItemToGrn]);

  /**
   * Handle unit variant selection
   */
  const handleUnitVariantSelected = useCallback((selectedUnit) => {
    if (productForUnitSelection) {
      addItemToGrn(productForUnitSelection, selectedUnit);
      setShowUnitSelector(false);
      setProductForUnitSelection(null);
    }
  }, [productForUnitSelection, addItemToGrn]);

  /**
   * ✅ Handle product creation - Use global product form modal
   */
  const handleCreateProduct = useCallback(() => {
    if (!openProductForm) {
      toast.error('Product form not available. Please refresh the page.');
      return;
    }
    openProductForm({
      mode: 'create',
      onSave: (newProduct) => {
        // Auto-select the newly created product
        handleItemSelected(newProduct);
        console.log("✅ Product created and selected for GRN:", newProduct.name);
      },
    });
  }, [openProductForm, handleItemSelected]);

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
  const handleBatchExpirySave = useCallback((data) => {
    const { itemId, batchNumber, expiryDate } = data;
    console.log("💾 Saving batch/expiry:", { itemId, batchNumber, expiryDate });
    
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

    toast.success("Batch & expiry details saved");
  }, [setFormData]);

  // API Management
  const { fetchVendors, fetchGrns, saveGrn, deleteGrn } = useGrnApi(setVendors, setGrnList);
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
        units.forEach(unit => {
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
  const handleEditProduct = useCallback(async (productId) => {
    try {
      // Fetch product details
      const response = await axios.get(`${API_URL}/api/v1/products/getproduct/${productId}`);
      const product = response.data;
      
      if (!openProductForm) {
        toast.error('Product form not available');
        return;
      }
      
      // Open product modal in edit mode
      openProductForm({
        mode: 'edit',
        product: product,
        onSave: (updatedProduct) => {
          // After saving, the product is updated and event is dispatched
          // GrnForm already listens to productUpdated event
          toast.success('Product updated successfully');
        },
      });
    } catch (error) {
      console.error('Error fetching product:', error);
      toast.error('Failed to load product for editing');
    }
  }, [openProductForm]);

  const { columns, gridConfig } = useGrnGridConfig(removeItemFromGrn, formData.taxType, handleEditProduct);

  // ✅ Memoize GRN totals calculation (called 10+ times per render - prevent recalculation)
  const grnTotals = useMemo(
    () => calculateGrnTotals(formData.items, formData.shippingCost),
    [formData.items, formData.shippingCost]
  );

  // ✅ Helper functions for summary calculations
  const getDiscountAmount = () => {
    if (formData.manualDiscountPercent) {
      return round((grnTotals.totalSubtotal * formData.manualDiscountPercent) / 100);
    }
    return formData.manualDiscountAmount || grnTotals.totalDiscount;
  };

  const getTotalExTax = () => {
    return grnTotals.totalSubtotal - getDiscountAmount();
  };

  const getNetTotal = () => {
    return getTotalExTax() + grnTotals.totalTaxAmount;
  };

  const getFinalTotal = () => {
    return getNetTotal() + (formData.shippingCost || 0);
  };

  // ✅ FOC (Free Of Charge) Calculations
  const getTotalFocQty = () => {
    return formData.items.reduce((sum, item) => sum + (parseFloat(item.focQty) || 0), 0);
  };

  const getTotalFocItems = () => {
    return formData.items.filter(item => item.foc || item.focQty > 0).length;
  };

  const getRegularQty = () => {
    return grnTotals.totalQty - getTotalFocQty();
  };

  // Submit GRN
  const handleSubmit = async (action) => {
    // ✅ FIXED: Generate GRN number ONLY when saving (prevents gaps)
    let grnNumber = formData.grnNo;
    if (!grnNumber) {
      try {
        grnNumber = await fetchNextGrnNo();
        setFormData(prev => ({ ...prev, grnNo: grnNumber }));
        toast.success("GRN number assigned", { duration: 1000 });
      } catch (error) {
        console.error("Error generating GRN number:", error);
        toast.error("Failed to generate GRN number");
        return;
      }
    }

    try {
      // ✅ Get user info for createdBy field
      const userData = localStorage.getItem("user");
      const currentUser = userData ? JSON.parse(userData) : null;
      const currentUserId = currentUser?._id || null;
      
      if (!currentUserId) {
        toast.error("User information not found. Please login again.");
        return;
      }

      // ✅ Transform items to match backend schema with validation
      const transformedItems = formData.items.map((item, index) => {
        try {
          // ✅ Handle both frontend and backend field names (for edit mode)
          const productId = item.productId;
          const productName = item.productName || item.itemName;
          const itemCode = item.itemCode;
          const qty = parseFloat(item.qty || item.quantity || 0) || 0;
          const cost = parseFloat(item.cost || item.unitCost || 0) || 0;
          const finalCost = parseFloat(item.finalCost || item.totalCost || (qty * cost)) || 0;
          
          // Validate required fields
          if (!productId) {
            throw new Error(`Item ${index + 1}: Missing productId`);
          }
          if (!productName || !productName.trim()) {
            throw new Error(`Item ${index + 1}: Missing itemName`);
          }
          if (!itemCode || !itemCode.trim()) {
            throw new Error(`Item ${index + 1}: Missing itemCode`);
          }
          if (!qty || qty <= 0) {
            throw new Error(`Item ${index + 1}: Invalid quantity (${qty})`);
          }
          if (typeof cost !== 'number' || cost < 0) {
            throw new Error(`Item ${index + 1}: Invalid unit cost (${cost})`);
          }
          // ✅ Check for 0 cost on non-FOC items
          if (cost === 0 && !item.foc) {
            throw new Error(`Item ${index + 1}: Cost cannot be 0 for non-FOC items`);
          }

          const totalCost = finalCost || (qty * cost);
          if (typeof totalCost !== 'number' || totalCost < 0) {
            throw new Error(`Item ${index + 1}: Invalid total cost (${totalCost})`);
          }

        // ✅ Calculate batch & expiry details
        let batchDetails = {
          batchNumber: (item.batchNumber || "").trim(),
          expiryDate: item.expiryDate || null,
          daysToExpiry: null,
          batchStatus: "ACTIVE",
          expiryStatus: "FRESH",
          hasExpirtTracking: false,
        };

        // ✅ Calculate days to expiry if expiry date provided
        if (item.expiryDate) {
          batchDetails.hasExpirtTracking = true;
          const today = new Date();
          const expiry = new Date(item.expiryDate);
          const daysRemaining = Math.floor((expiry - today) / (1000 * 60 * 60 * 24));
          batchDetails.daysToExpiry = daysRemaining;

          // Determine batch status and expiry status
          if (daysRemaining < 0) {
            batchDetails.batchStatus = "EXPIRED";
            batchDetails.expiryStatus = "EXPIRED";
          } else if (daysRemaining <= 30) {
            batchDetails.batchStatus = "EXPIRING_SOON";
            batchDetails.expiryStatus = "EXPIRING_SOON";
          } else {
            batchDetails.batchStatus = "ACTIVE";
            batchDetails.expiryStatus = "FRESH";
          }
        }

        // ✅ Enhanced item details including tax, discount, and batch info
        const quantity = parseFloat(qty);
        const unitCost = parseFloat(cost);
        const totalCostValue = parseFloat(totalCost);
        const discount = parseFloat(item.discount || 0);
        const discountPercent = parseFloat(item.discountPercent || 0);
        const taxPercent = parseFloat(item.taxPercent || 0);
        const taxAmount = parseFloat(item.taxAmount || 0);
        
        // ✅ Validate numeric fields are not NaN
        if (isNaN(quantity)) {
          throw new Error(`Item ${index + 1}: quantity is not a valid number (${qty})`);
        }
        if (isNaN(unitCost)) {
          throw new Error(`Item ${index + 1}: unitCost is not a valid number (${cost})`);
        }
        if (isNaN(totalCostValue)) {
          throw new Error(`Item ${index + 1}: totalCost is not a valid number (${totalCost})`);
        }

        // ✅ Validate no negative values
        if (discount < 0) {
          throw new Error(`Item ${index + 1}: Discount cannot be negative (${discount})`);
        }
        if (discountPercent < 0) {
          throw new Error(`Item ${index + 1}: Discount percentage cannot be negative (${discountPercent}%)`);
        }
        if (taxPercent < 0) {
          throw new Error(`Item ${index + 1}: Tax percentage cannot be negative (${taxPercent}%)`);
        }
        if (taxAmount < 0) {
          throw new Error(`Item ${index + 1}: Tax amount cannot be negative (${taxAmount})`);
        }
        
        const transformedItem = {
          productId: productId,
          itemName: productName.trim(),
          itemCode: itemCode.trim(),
          quantity: quantity,
          unitType: item.unitType || "PC",
          foc: item.foc || false,
          focQty: Math.max(0, parseFloat(item.focQty || 0)),
          unitCost: unitCost,
          itemDiscount: discount,
          itemDiscountPercent: discountPercent,
          netCost: Math.max(0, parseFloat((quantity * unitCost - discount) || 0)),
          taxType: item.taxType || formData.taxType || "exclusive",
          taxPercent: taxPercent,
          taxAmount: taxAmount,
          totalCost: totalCostValue,
          // Batch & Expiry Details
          batchDetails: batchDetails,
          batchNumber: batchDetails.batchNumber,
          expiryDate: batchDetails.expiryDate,
          daysToExpiry: batchDetails.daysToExpiry,
          batchStatus: batchDetails.batchStatus,
          expiryStatus: batchDetails.expiryStatus,
          hasExpirtTracking: batchDetails.hasExpirtTracking,
          notes: (item.notes || "").trim(),
        };

        console.log(`✅ Item ${index + 1} validated:`, transformedItem);
        return transformedItem;
        } catch (itemError) {
          console.error(`❌ Error transforming item ${index + 1}:`, itemError.message);
          throw itemError;
        }
      });

      // ✅ Calculate all GRN totals with country-based decimal control
      const shippingCost = Math.max(0, parseFloat(formData.shippingCost || 0));
      
      // ✅ Validate header-level numeric fields
      if (shippingCost < 0) {
        throw new Error("Shipping cost cannot be negative");
      }
      
      const grnTotals = calculateGrnTotals(formData.items, shippingCost);
      
      // Calculate discount totals with proper decimal handling
      const totalDiscountAmount = Math.max(0, grnTotals.totalDiscount || 0);
      const totalDiscountPercent = grnTotals.totalSubtotal > 0 
        ? round((totalDiscountAmount / grnTotals.totalSubtotal * 100))
        : 0;

      const totalExTax = grnTotals.totalSubtotal - totalDiscountAmount;
      const finalTotal = grnTotals.netTotal + shippingCost;

      // ✅ Calculate batch & expiry tracking summary
      const batchExpiryTracking = {
        itemsWithBatchTracking: transformedItems.filter(i => i.batchNumber && i.batchNumber.trim()).length,
        itemsWithExpiryTracking: transformedItems.filter(i => i.hasExpirtTracking).length,
        expiringItems: transformedItems.filter(i => i.batchStatus === "EXPIRING_SOON").length,
        expiredItems: transformedItems.filter(i => i.batchStatus === "EXPIRED").length,
        earliestExpiryDate: transformedItems
          .filter(i => i.expiryDate)
          .map(i => new Date(i.expiryDate))
          .reduce((earliest, date) => date < earliest ? date : earliest, new Date("2099-12-31"))
          .toISOString()
          .split("T")[0],
        expiryTrackingEnabled: transformedItems.some(i => i.hasExpirtTracking),
      };

      // ✅ Enhanced GRN Payload with all details
      const submitData = {
        // GRN Header
        grnNumber: grnNumber,
        grnDate: formData.grnDate,
        invoiceNo: formData.invoiceNo || "",
        lpoNo: formData.lpoNo || "",
        
        // Vendor Details
        vendorId: formData.vendorId,
        vendorName: formData.vendorName,
        paymentTerms: formData.paymentTerms || "due_on_receipt",
        
        // Shipper Details
        shipperId: formData.shipperId || null,
        shipperName: formData.shipperName || "",
        shippingCost: parseFloat(formData.shippingCost || 0),
        
        // Tax & Discount Info
        taxType: formData.taxType || "exclusive",
        
        // GRN Level Totals
        totalQty: grnTotals.totalQty || 0,
        subtotal: parseFloat(grnTotals.totalSubtotal || 0),
        discountAmount: parseFloat(totalDiscountAmount),
        discountPercent: parseFloat(totalDiscountPercent),
        totalExTax: parseFloat(totalExTax),
        taxAmount: parseFloat(grnTotals.totalTaxAmount || 0),
        netTotal: parseFloat(grnTotals.netTotal || 0),
        finalTotal: parseFloat(finalTotal),
        
        // Batch & Expiry Tracking Summary
        batchExpiryTracking: batchExpiryTracking,

        // ✅ FOC (Free Of Charge) Summary
        focTracking: {
          totalFocQty: getTotalFocQty(),
          focItems: getTotalFocItems(),
          regularQty: getRegularQty(),
          hasFoc: getTotalFocQty() > 0,
        },
        
        // Metadata
        status: action === "draft" ? "Draft" : "Received",
        deliveryDate: new Date().toISOString().split("T")[0],
        referenceNumber: formData.lpoNo || "",
        notes: formData.notes || "",
        createdBy: currentUserId,
        
        // Items with full details
        items: transformedItems,
      };

      console.log("📤 Submitting GRN to backend:", {
        grnNumber: submitData.grnNumber,
        totalQty: submitData.totalQty,
        subtotal: submitData.subtotal,
        discountAmount: submitData.discountAmount,
        taxAmount: submitData.taxAmount,
        finalTotal: submitData.finalTotal,
        itemCount: submitData.items.length,
        foc: {
          totalFocQty: getTotalFocQty(),
          focItems: getTotalFocItems(),
          regularQty: getRegularQty(),
        },
      });
      
      // ✅ Log each item for debugging
      submitData.items.forEach((item, idx) => {
        console.log(`📦 Item ${idx + 1}:`, {
          productId: item.productId,
          productIdType: typeof item.productId,
          itemName: item.itemName,
          itemCode: item.itemCode,
          quantity: item.quantity,
          quantityType: typeof item.quantity,
          unitCost: item.unitCost,
          unitCostType: typeof item.unitCost,
          totalCost: item.totalCost,
          totalCostType: typeof item.totalCost,
        });
      });
      
      console.log("📋 Full submitData:", submitData);
      console.log("✅ Submitting with createdBy:", {
        currentUserId,
        submitDataCreatedBy: submitData.createdBy,
        userData: localStorage.getItem("user"),
      });

      const response = await axios({
        method: editingId ? "PUT" : "POST",
        url: `${API_URL}/api/v1/grn${editingId ? `/${editingId}` : ""}`,
        data: submitData,
        headers: { "Content-Type": "application/json" },
      });

      if (response.status === 200 || response.status === 201) {
        toast.success(
          editingId ? "GRN updated successfully" : "GRN created successfully",
        );

        // Refresh list
        const listResponse = await axios.get(`${API_URL}/api/v1/grn`);
        setGrnList(
          Array.isArray(listResponse.data)
            ? listResponse.data
            : listResponse.data?.data || [],
        );

        await resetForm();
        setShowNewGrnModal(false);
      }
    } catch (error) {
      // Parse sent data for logging
      let sentData = {};
      try {
        sentData = JSON.parse(error.config?.data || "{}");
      } catch {
        sentData = error.config?.data;
      }

      // Check if it's an API error or JavaScript error
      if (error.response) {
        // API error
        console.error("❌ GRN Submission Error Summary:", {
          status: error.response?.status,
          statusText: error.response?.statusText,
          errorMessage: error.response?.data?.message,
          errorDetails: error.response?.data?.error,
          validationErrors: error.response?.data?.errors,
          details: error.response?.data?.details,
        });
        console.error("📤 SENT DATA:", sentData);
        console.error("📥 FULL RESPONSE DATA:", JSON.stringify(error.response?.data, null, 2));
      } else {
        // JavaScript error (during transformation or data building)
        console.error("❌ GRN Processing Error (before API call):", {
          name: error.name,
          message: error.message,
          stack: error.stack,
        });
      }
      
      // Extract detailed error message
      let errorMessage = error.response?.data?.message || error.message || "Error saving GRN";
      
      // If there are validation errors, include them in the message
      if (error.response?.data?.errors && Array.isArray(error.response.data.errors)) {
        errorMessage = error.response.data.errors.join(" | ");
      }
      
      toast.error(errorMessage);
    }
  };

  return (
    <div className="absolute inset-0 flex flex-col bg-gray-50 overflow-hidden">
      {/* HEADER - Fixed at top */}
      <div className="flex-shrink-0 bg-white text-gray-900 px-6 py-4 shadow-lg z-10">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              📦 Good Receipt Note (GRN)
            </h1>
            <p className="text-sm text-gray-600 mt-0.5">
              Manage purchase receipts and inventory inbound
            </p>
          </div>
          <button
            onClick={() => {
              resetForm();
              setShowNewGrnModal(true);
            }}
            className="flex items-center gap-1 bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 transition font-medium text-sm"
          >
            <Plus size={16} /> New GRN
          </button>
        </div>
      </div>

      {/* CONTENT - Scrollable */}
      <div className="flex-1 flex flex-col p-4 min-h-0 overflow-hidden">
        {/* Search & Filters Bar */}
        <div className="flex-shrink-0 flex flex-col lg:flex-row gap-2 mb-2 items-stretch lg:items-center lg:justify-between">
          {/* Search Input */}
          <div className="flex items-center gap-2 border border-gray-300 rounded-lg px-2 bg-white h-8 w-64">
            <Search size={14} className="flex-shrink-0 text-gray-500" />
            <input
              type="text"
              placeholder="Search GRN, invoice, vendor..."
              className="border-0 p-0 outline-none w-full text-xs"
              value={grnSearch}
              onChange={(e) => setGrnSearch(e.target.value)}
            />
            {grnSearch && (
              <button
                onClick={() => setGrnSearch("")}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            )}
          </div>

          {/* Status Filter */}
          <select
            className="border border-gray-300 rounded-lg px-3 text-xs bg-white flex-shrink-0 h-9"
            value={grnStatusFilter}
            onChange={(e) => setGrnStatusFilter(e.target.value)}
          >
            <option value="Draft">Draft</option>
            <option value="Received">Received</option>
            <option value="">All Status</option>
          </select>
        </div>

          <GrnListTable
            grnList={grnList.filter(grn =>
              (grn.grnNumber?.toLowerCase().includes(grnSearch.toLowerCase()) ||
              grn.invoiceNo?.toLowerCase().includes(grnSearch.toLowerCase()) ||
              grn.vendorName?.toLowerCase().includes(grnSearch.toLowerCase())) &&
              (grnStatusFilter === "" || grn.status === grnStatusFilter)
            )}
          onEdit={(grn) => {
            // ✅ Map backend GRN data to frontend form format
            const mappedGrn = {
              grnNo: grn.grnNumber,  // Backend: grnNumber → Frontend: grnNo
              invoiceNo: grn.invoiceNo || "",
              lpoNo: grn.lpoNo || "",
              vendorId: grn.vendorId,
              vendorName: grn.vendorName,
              grnDate: grn.grnDate ? new Date(grn.grnDate).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
              taxType: grn.taxType || "exclusive",
              notes: grn.notes || "",
              documents: grn.documents || [],
              paymentTerms: grn.paymentTerms || "due_on_receipt",
              shippingCost: grn.shippingCost || 0,
              shipperId: grn.shipperId || "",
              shipperName: grn.shipperName || "",
              // ✅ Map items from backend format to frontend format
              items: (grn.items || []).map(item => ({
                productId: item.productId,
                productName: item.itemName,  // Backend: itemName → Frontend: productName
                itemCode: item.itemCode,
                qty: item.quantity,  // Backend: quantity → Frontend: qty
                cost: item.unitCost,  // Backend: unitCost → Frontend: cost
                finalCost: item.totalCost,
                unitType: item.unitType || "PC",
                foc: item.foc || false,
                focQty: item.focQty || 0,
                discount: item.itemDiscount || 0,
                discountPercent: item.itemDiscountPercent || 0,
                taxType: item.taxType || grn.taxType || "exclusive",
                taxPercent: item.taxPercent || 0,
                taxAmount: item.taxAmount || 0,
                trackExpiry: item.trackExpiry || false,  // ✅ FIXED: Include trackExpiry flag
                batchNumber: item.batchNumber || "",
                expiryDate: item.expiryDate || null,
                notes: item.notes || "",
              })),
            };
            
            console.log("📝 Loading GRN for edit:", {
              originalGrnNumber: grn.grnNumber,
              mappedGrnNo: mappedGrn.grnNo,
              vendorName: mappedGrn.vendorName,
              itemCount: mappedGrn.items.length,
              firstItem: mappedGrn.items[0],
            });
            
            setFormData(mappedGrn);
            setEditingId(grn._id);
            setShowNewGrnModal(true);
          }}
          onDelete={async (id) => {
            if (!window.confirm("Are you sure you want to delete this GRN?"))
              return;
            try {
              const response = await fetch(`${API_URL}/api/v1/grn/${id}`, {
                method: "DELETE",
              });
              if (response.ok) {
                setGrnList((prev) => prev.filter((g) => g._id !== id));
                toast.success("GRN deleted successfully");
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
            className="bg-white shadow-xl rounded-lg w-full max-w-none mx-auto flex flex-col max-h-[95vh]"
            style={{ width: "90vw" }}
          >
            {/* Modal Header */}
            <div className="sticky top-0 flex rounded-t-lg justify-between items-center p-2 border-b bg-gray-50 flex-shrink-0">
              <h2 className="text-lg font-bold text-gray-900">
                {editingId ? "Edit Purchase Entry" : "New Purchase Entry"}
              </h2>
              <button
                onClick={async () => {
                  setShowNewGrnModal(false);
                  await resetForm();
                }}
                className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-black-200 rounded-full transition-colors"
                title="Close"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-2 flex-1 overflow-hidden flex flex-col gap-2 w-full">
              {/* Form Header */}
              <GrnFormHeader
                formData={formData}
                vendors={vendors}
                onFormChange={(field, value) =>
                  setFormData((prev) => ({ ...prev, [field]: value }))
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

              {/* Item Search & Barcode Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 flex-shrink-0 pb-2">
                {/* Item Search */}
                <GrnItemSearch
                  itemSearch={itemSearch}
                  searchResults={searchResults}
                  searchLoading={searchLoading}
                  onSearch={setItemSearch}
                  onSelectItem={handleItemSelected}
                  onCreateProduct={handleCreateProduct}
                />

                {/* Barcode Input */}
                <GrnBarcodeInput
                  ref={barcodeInputRef}
                  barcodeValue={barcodeValue}
                  onChange={(e) => setBarcodeValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const barcode = barcodeValue.trim();
                      const product = searchResults.find(
                        (p) =>
                          (p.barcode || "").toString().includes(barcode) ||
                          (p.sku || "").toString().includes(barcode),
                      );
                      if (product) {
                        handleItemSelected(product);
                        setBarcodeValue("");
                        barcodeInputRef.current?.focus();
                      } else {
                        toast.error(`Product not found for barcode: ${barcode}`);
                        setBarcodeValue("");
                        barcodeInputRef.current?.select();
                      }
                    }
                  }}
                />
              </div>

              {/* Items Table */}
              <GrnItemsTable
                key={`grn-table-${refreshTrigger}`} // ✅ Force re-render when products update
                items={formData.items || []}
                columns={columns}
                gridConfig={gridConfig}
                gridHeight={gridHeight}
                gridContainerRef={gridContainerRef}
                gridContext={{ onBatchExpiryClick: handleBatchExpiryClick }}
                onCellValueChanged={(event) => {
                  const { data, colDef } = event;
                  if (data && colDef.field) {
                    let newValue = event.newValue;
                    if (["qty", "cost", "discount", "taxPercent", "focQty"].includes(
                      colDef.field,
                    )) {
                      newValue = parseFloat(newValue) || 0;
                    }
                    console.log(`📝 Cell edited: ${colDef.field} = ${newValue}`);
                    
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
            <div className="flex flex-col gap-1 p-2 border-t bg-gray-50 flex-shrink-0">
              {/* Summary Row 1 - Qty through Net Total */}
              <div className="flex items-center justify-between pr-3 gap-5 text-sm">
                {/* 1. Total Qty */}
                <div className="flex items-center justify-between gap-0.5 w-32 bg-white px-1.5 py-0.5 rounded border border-gray-200">
                  <span className="font-semibold">Qty:</span>
                  <span className="font-bold text-blue-600 ">{grnTotals.totalQty}</span>
                </div>

                {/* 2. Sub Total */}
                <div className="flex items-center justify-between w-40  gap-0.5 bg-white px-1.5 py-0.5 rounded border border-gray-200">
                  <span className="font-semibold">Subtotal:</span>
                  <span className="font-bold text-blue-600">{formatNumber(grnTotals.totalSubtotal || 0)}</span>
                </div>

                {/* 3. Discount Amount */}
                <div className="flex items-center w-64 justify-between gap-0.5 bg-white px-1.5 py-0.5 rounded border border-gray-200">
                  <span className="font-semibold">Disc Amt :</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.manualDiscountAmount || ""}
                    onChange={(e) => {
                      const amount = parseInput(e.target.value) || 0;
                      const percent = grnTotals.totalSubtotal > 0 ? round((amount / grnTotals.totalSubtotal) * 100) : 0;
                      setFormData((prev) => ({
                        ...prev,
                        manualDiscountAmount: amount,
                        manualDiscountPercent: percent,
                      }));
                    }}
                    placeholder="0.00"
                    className="w-20 px-0.5 py-0.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-right"
                  />
                </div>

                {/* 4. Discount Percentage */}
                <div className="flex items-center w-40 justify-between gap-0.5 bg-white px-1.5 py-0.5 rounded border border-gray-200">
                  <span className="font-semibold">Disc % :</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.manualDiscountPercent || ""}
                    onChange={(e) => {
                      const percent = parseInput(e.target.value) || 0;
                      const amount = round((grnTotals.totalSubtotal * percent) / 100);
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
                  <span className="font-bold text-blue-600">{formatNumber(getTotalExTax())}</span>
                </div>

                {/* 6. Total Tax */}
                <div className="flex items-center justify-between w-32 gap-0.5 bg-white px-1.5 py-0.5 rounded border border-gray-200">
                  <span className="font-semibold">Tax :</span>
                  <span className="font-bold text-blue-600">{formatNumber(grnTotals.totalTaxAmount || 0)}</span>
                </div>

                {/* 7. Net Total (before shipping) */}
                <div className="flex items-center justify-between w-48 gap-0.5 bg-yellow-100 px-1.5 py-0.5 rounded border border-yellow-300">
                  <span className="font-semibold">Net Total :</span>
                  <span className="font-bold text-yellow-700">{formatNumber(getNetTotal())}</span>
                </div>
              </div>


              {/* Shipper Selection - Right Aligned */}

              {/* Summary Row 2 - Shipping, Final Total, Shipper Selection */}
              <div className="flex  grid grid-cols-3 gap-1.5 text-sm">


                <div>



                   {vendors && vendors.length > 0 && (
                  <div className="flex items-center gap-1 ml-auto">
                    <select
                      value={formData?.shipperId || ""}
                      onChange={(e) => {
                        const selectedShipper = vendors.find(v => v._id === e.target.value);
                        setFormData((prev) => ({
                          ...prev,
                          shipperId: e.target.value,
                          shipperName: selectedShipper?.name || ""
                        }));
                      }}
                      className="px-1 py-0.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">📦 Shipper</option>
                      {vendors.filter(v => v.isShipper === true).map(vendor => (
                        <option key={vendor._id} value={vendor._id}>{vendor.name}</option>
                      ))}
                    </select>
                    {formData.shipperName && (
                      <span className="text-sm bg-blue-100 px-1.5 py-0.5 rounded font-semibold">✓ {formData.shipperName}</span>
                    )}
                  </div>
                )}



                </div>
        


                 


                   <div  className="flex justify-between gap-1.5    ">






                    {/* 8. Shipping Amount */}
                <div className="flex items-center   justify-between gap-0.5 bg-white px-1.5 py-0.5 rounded border border-gray-200">
                 <div>
 <span className="font-semibold">Shipping Cost :</span>
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
                    className="w-20 px-0.5 py-0.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-right"
                  />

                 </div>
                  <div>

{/* FOC Items Count Badge */}
                  {getTotalFocItems() > 0 && (
                    <div className="flex items-center gap-1 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                      <span className="text-xs font-semibold text-blue-700">💙 {getTotalFocItems()} FOC Items</span>
                    </div>
                  )}

                  </div>
                </div>

                







                   </div>






                <div className="flex  gap-1.5 justify-end items-center">
                  

                  <div className="flex  gap-1.5 justify-end pr-3">
                    {/* 9. Final Total (Grand Total) */}
                    <div className="flex items-center w-48 justify-between gap-0.5 bg-green-200 px-2 py-0.5 rounded border border-green-400">
                      <span className="font-semibold">Final Total:</span>
                      <span className="font-bold text-green-700 text-sm">{formatNumber(getFinalTotal())}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Action Buttons Row */}
              <div className="flex gap-3 justify-end pr-3">
                
                <button
                  onClick={() => {
                    // Validation for Save Draft - with detailed checks
                    const vendorId = formData.vendorId?.toString().trim() || '';
                    const invoiceNo = formData.invoiceNo?.toString().trim() || '';
                    const taxType = formData.taxType?.toString().trim() || '';
                    const itemsCount = formData.items?.length || 0;

                    console.log("📋 Save Draft Validation:", { vendorId, invoiceNo, taxType, itemsCount });

                    if (!vendorId) {
                      toast.error("Please select a vendor");
                      return;
                    }
                    if (!invoiceNo) {
                      toast.error("Please enter invoice number");
                      return;
                    }
                    if (!taxType) {
                      toast.error("Please select a tax type (Exclusive, Inclusive, or No Tax)");
                      return;
                    }
                    if (itemsCount === 0) {
                      toast.error("Please add at least one item");
                      return;
                    }

                    // ✅ Check for 0 cost on non-FOC items
                    const itemsWithZeroCost = formData.items.filter(item => 
                      item.cost === 0 && !item.foc
                    );
                    if (itemsWithZeroCost.length > 0) {
                      const itemNames = itemsWithZeroCost.map(i => i.productName).join(", ");
                      toast.error(`Cost cannot be 0 for non-FOC items: ${itemNames}`);
                      return;
                    }

                    console.log("✅ All Save Draft validations passed");
                    handleSubmit("draft");
                  }}
                  className="px-2 py-1 bg-yellow-600 text-white rounded text-xs hover:bg-yellow-700 font-semibold transition"
                >
                  💾   Save Draft 
                </button>
                <button
                  onClick={() => {
                    // Validation for Post - same as Draft
                    const vendorId = formData.vendorId?.toString().trim() || '';
                    const invoiceNo = formData.invoiceNo?.toString().trim() || '';
                    const taxType = formData.taxType?.toString().trim() || '';
                    const itemsCount = formData.items?.length || 0;

                    console.log("📋 Post GRN Validation:", { vendorId, invoiceNo, taxType, itemsCount });

                    if (!vendorId) {
                      toast.error("Please select a vendor");
                      return;
                    }
                    if (!invoiceNo) {
                      toast.error("Please enter invoice number");
                      return;
                    }
                    if (!taxType) {
                      toast.error("Please select a tax type (Exclusive, Inclusive, or No Tax)");
                      return;
                    }
                    if (itemsCount === 0) {
                      toast.error("Please add at least one item");
                      return;
                    }

                    // ✅ Check for 0 cost on non-FOC items
                    const itemsWithZeroCost = formData.items.filter(item => 
                      item.cost === 0 && !item.foc
                    );
                    if (itemsWithZeroCost.length > 0) {
                      const itemNames = itemsWithZeroCost.map(i => i.productName).join(", ");
                      toast.error(`Cost cannot be 0 for non-FOC items: ${itemNames}`);
                      return;
                    }

                    console.log("✅ All Post GRN validations passed");
                    handleSubmit("post");
                  }}
                  className="px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700 font-semibold transition"
                >
                  ✓ Post GRN
                </button>
              </div>
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
    </div>
  );
};

export default GrnForm;


