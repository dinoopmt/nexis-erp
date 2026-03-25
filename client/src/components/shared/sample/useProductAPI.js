/**
 * useProductAPI.js - Custom hook for all product-related API calls
 * Centralizes interactions with backend endpoints for products, vendors, units, groupings, and taxes
 * Includes request deduplication to prevent duplicate API calls and memory issues
 */

import { useCallback } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { requestCache } from "../../../utils/requestCache";

const API_URL = import.meta.env.VITE_API_URL || "/api/v1";
const REQUEST_CACHE_KEY = {
  PRODUCTS: "products",
  UNITS: "units",
  GROUPINGS: "groupings",
  VENDORS: "vendors",
  TAXES: "taxes",
  HSN_CODES: "hsnCodes",
};

/**
 * Custom hook for handling all product and related API operations
 * @returns {Object} Object containing all API methods
 */
export const useProductAPI = () => {
  // ========================================
  // PRODUCT OPERATIONS
  // ========================================

  /**
   * Fetch products with pagination (server-side) for better performance with large datasets
   * @param {number} page - Page number (1-indexed, default: 1)
   * @param {number} limit - Items per page (default: 100)
   * @param {string} selectedGroupingFilter - Optional grouping ID to filter by
   * @returns {Promise<Object>} { products, total, page, limit, hasMore }
   */
  const fetchProducts = useCallback(async (page = 1, limit = 100, selectedGroupingFilter = "") => {
    try {
      const cacheKey = `${REQUEST_CACHE_KEY.PRODUCTS}:p${page}:l${limit}:${selectedGroupingFilter}`;

      // Check cache first (cache individual pages)
      const cached = requestCache.get(cacheKey);
      if (cached) {
        return cached;
      }

      // Check if request is already pending
      const pending = requestCache.getPending(cacheKey);
      if (pending) {
        return pending;
      }

      let url = `${API_URL}/products/getproducts?page=${page}&limit=${limit}`;
      if (selectedGroupingFilter) {
        url += `&groupingId=${selectedGroupingFilter}`;
      }

      const promise = axios.get(url).then((response) => {
        const data = response.data;
        const fetchedProducts = data.products || data;
        const total = data.total || (Array.isArray(fetchedProducts) ? fetchedProducts.length : 0);
        
        // hasMore: Check if we got a full page (means there's likely more)
        // If we got less than limit items, we've reached the end
        const hasMore = fetchedProducts.length === limit;
        
        const result = {
          products: Array.isArray(fetchedProducts) ? fetchedProducts : [],
          total,
          page,
          limit,
          hasMore,
        };

        console.log(`✅ fetchProducts API Response:
          - page: ${page}, limit: ${limit}
          - returned: ${fetchedProducts.length} items
          - total: ${total}
          - hasMore: ${hasMore}
          - URL: ${url}`);
        
        requestCache.set(cacheKey, result);
        return result;
      });

      return requestCache.setPending(cacheKey, promise);
    } catch (err) {
      console.error("❌ Error fetching products:", err.message);
      toast.error("Failed to fetch products. Please try again.", {
        duration: 5000,
        position: "top-center",
      });
      return { products: [], total: 0, page: 1, limit: 100, hasMore: false };
    }
  }, []);

  /**
   * Fetch single product by ID with COMPLETE data including all fields
   * @param {string} productId - Product ID to fetch
   * @returns {Promise<Object|null>} Complete product object with all fields or null if not found
   */
  const fetchProductById = useCallback(async (productId) => {
    try {
      const response = await axios.get(
        `${API_URL}/products/getproduct/${productId}`
      );

      const product = response.data;

      if (!product || Object.keys(product).length === 0) {
        return null;
      }

      // ✅ Return COMPLETE product object with all fields from backend
      // The backend returns all fields, so we pass them through as-is
      return product;
    } catch (err) {
      console.error("Error fetching product by ID:", err);
      return null;
    }
  }, []);

  /**
   * Check if barcode already exists in database
   * @param {string} barcode - Barcode to check
   * @param {string} currentProductId - Current product ID (for edit scenarios)
   * @returns {Promise<boolean>} True if barcode exists, false otherwise
   */
  const checkBarcodeExists = useCallback(async (barcode, currentProductId = null) => {
    try {
      const response = await axios.post(
        `${API_URL}/products/checkbarcode`,
        { barcode, currentProductId }
      );
      return response.data.exists || false;
    } catch (err) {
      // ...removed error log...
      return false;
    }
  }, []);

  /**
   * Check if item code already exists in database
   * @param {string} itemcode - Item code to check
   * @param {string} currentProductId - Current product ID (for edit scenarios)
   * @returns {Promise<boolean>} True if item code exists, false otherwise
   */
  const checkItemcodeExists = useCallback(async (itemcode, currentProductId = null) => {
    try {
      const response = await axios.post(
        `${API_URL}/products/checkitemcode`,
        { itemcode, currentProductId }
      );
      return response.data.exists || false;
    } catch (err) {
      // ...removed error log...
      return false;
    }
  }, []);

  /**
   * Get next item code from server (peek without incrementing)
   * Useful for multi-user data entry - shows actual next code from server
   * @returns {Promise<string>} Next item code to be generated
   */
  const fetchNextItemCode = useCallback(async () => {
    try {
      const response = await axios.get(
        `${API_URL}/products/nexitemcode`
      );
      return response.data?.nextItemCode || "1001";
    } catch (err) {
      console.error("Error fetching next item code:", err);
      return "1001"; // Fallback
    }
  }, []);

  /**
   * Generate unique barcode with duplicate checking
   * @param {string} baseBarcode - Base barcode to start with
   * @param {number} lineIndex - Line index for variant generation
   * @returns {Promise<string>} Unique barcode
   */
  const generateUniqueBarcode = useCallback(
    async (baseBarcode, lineIndex) => {
      const cleanBarcode = String(baseBarcode)
        .replace(/[^0-9]/g, "")
        .padStart(10, "0")
        .slice(0, 10);

      let barcode = cleanBarcode;
      let counter = 0;
      const maxAttempts = 100;

      while (counter < maxAttempts) {
        const exists = await checkBarcodeExists(barcode);
        if (!exists) {
          return barcode;
        }
        counter++;
        const lastTwoDigits = String(counter).padStart(2, "0");
        barcode = (cleanBarcode.slice(0, 8) + lastTwoDigits).slice(0, 10);
      }

      return barcode;
    },
    [checkBarcodeExists]
  );

  /**
   * Save product to database (create or update)
   * @param {Object} productData - Product data to save
   * @param {string} editId - Product ID if updating, null if creating
   * @returns {Promise<Object|null>} Saved product object with meilisearchSync info, or null if failed
   */
  const saveProduct = useCallback(async (productData, editId = null) => {
    try {
      const url = editId
        ? `${API_URL}/products/updateproduct/${editId}`
        : `${API_URL}/products/addproduct`;
      
      const response = editId
        ? await axios.put(url, productData)
        : await axios.post(url, productData);
      
      // ✅ Return both product and meilisearchSync status
      const result = {
        product: response.data.product,
        meilisearchSync: response.data.meilisearchSync || { success: false, error: 'No sync info' },
        message: response.data.message,
      };

      // ⚠️ If Meilisearch sync failed, log warning but don't fail the product save
      if (!result.meilisearchSync.success) {
        console.warn('⚠️  Meilisearch sync warning:', result.meilisearchSync.error);
      }

      return result;
    } catch (err) {
      // ...error handling remains the same...

      const errorMsg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        (editId ? "Failed to update product" : "Failed to add product");

      // Show error only if it's not a field validation error (those are handled by client validation)
      if (!errorMsg.includes("❌")) {
        toast.error(errorMsg, {
          duration: 5000,
          position: "top-center",
        });
      }

      return null;
    }
  }, []);

  /**
   * Re-sync a single product to Meilisearch (for fixing stale search data)
   * @param {string} productId - Product ID to sync
   * @returns {Promise<Object>} Sync result { success, synced, error }
   */
  const resyncProductToMeilisearch = useCallback(async (productId) => {
    try {
      console.log(`🔄 Re-syncing product ${productId} to Meilisearch...`);
      
      const response = await axios.post(
        `${API_URL}/products/sync-product-meilisearch/${productId}`
      );
      
      const result = {
        success: response.data.success,
        synced: response.data.synced,
        productName: response.data.productName,
        error: response.data.syncError,
      };

      if (result.success) {
        console.log(`✅ Product re-synced to Meilisearch:`, result.productName);
        toast.success(`Product search index updated for ${result.productName}`, {
          duration: 2000,
          position: "top-right",
        });
      } else {
        console.warn(`⚠️  Re-sync failed:`, result.error);
        toast.error(`Failed to update search index: ${result.error}`, {
          duration: 3000,
          position: "top-right",
        });
      }

      return result;
    } catch (err) {
      console.error('❌ Error re-syncing product:', err);
      toast.error('Failed to re-sync product to search index', {
        duration: 3000,
        position: "top-right",
      });
      return { success: false, error: err.message };
    }
  }, []);

  /**
   * Delete product from database
   * @param {string} id - Product ID to delete
   * @returns {Promise<boolean>} True if successful, false otherwise
   */
  const deleteProduct = useCallback(async (id) => {
    try {
      await axios.delete(`${API_URL}/products/deleteproduct/${id}`);
      toast.success("Product deleted successfully!", {
        duration: 3000,
        position: "top-center",
      });
      return true;
    } catch (err) {
      const errorMsg =
        err.response?.data?.message || "Failed to delete product";
      toast.error(errorMsg, {
        duration: 5000,
        position: "top-center",
      });
      console.error(err);
      return false;
    }
  }, []);

  // ========================================
  // VENDOR OPERATIONS
  // ========================================

  /**
   * Fetch all vendors
   * @returns {Promise<Array>} Array of vendors
   */
  const fetchVendors = useCallback(async () => {
    try {
      const response = await axios.get(`${API_URL}/vendors/getvendors`);
      return response.data.vendors || response.data || [];
    } catch (err) {
      console.error("Error fetching vendors:", err);
      return [];
    }
  }, []);

  /**
   * Create new vendor
   * @param {Object} vendorData - Vendor data to save
   * @returns {Promise<Object|null>} Created vendor object or null if failed
   */
  const createVendor = useCallback(async (vendorData) => {
    try {
      const response = await axios.post(
        `${API_URL}/vendors/addvendor`,
        vendorData
      );
      toast.success("Vendor created successfully!", {
        duration: 3000,
        position: "top-center",
      });
      return response.data.vendor;
    } catch (err) {
      const errorMsg = err.response?.data?.message || "Failed to create vendor";
      toast.error(errorMsg, {
        duration: 5000,
        position: "top-center",
      });
      console.error("Error creating vendor:", err);
      return null;
    }
  }, []);

  // ========================================
  // UNIT OPERATIONS
  // ========================================

  /**
   * Fetch all units (with request deduplication)
   * @returns {Promise<Array>} Array of units
   */
  const fetchUnits = useCallback(async () => {
    try {
      // Check cache first
      const cached = requestCache.get(REQUEST_CACHE_KEY.UNITS);
      if (cached) {
        
        return cached;
      }

      // Check if request is already pending
      const pending = requestCache.getPending(REQUEST_CACHE_KEY.UNITS);
      if (pending) {
        
        return pending;
      }

     
      const promise = axios.get(`${API_URL}/unit-types`).then((response) => {
        const units = response.data?.data || response.data?.units || response.data || [];
        
        return units;
      });

      return requestCache.setPending(REQUEST_CACHE_KEY.UNITS, promise);
    } catch (err) {
      console.error("❌ Error fetching units:", err.message);
      toast.error("Failed to load units", { duration: 3000 });
      return [];
    }
  }, []);

  // ========================================
  // GROUPING OPERATIONS
  // ========================================

  /**
   * Fetch all groupings (departments, sub-departments, brands) with request deduplication
   * @returns {Promise<Array>} Array of groupings
   */
  const fetchGroupings = useCallback(async () => {
    try {
      // Check cache first
      const cached = requestCache.get(REQUEST_CACHE_KEY.GROUPINGS);
      if (cached) {
        
        return cached;
      }

      // Check if request is already pending
      const pending = requestCache.getPending(REQUEST_CACHE_KEY.GROUPINGS);
      if (pending) {
       
        return pending;
      }

     
      const promise = axios.get(`${API_URL}/groupings/getgroupings`).then((response) => {
        const groupings = response.data?.groupings || response.data || [];
       
        return groupings;
      });

      return requestCache.setPending(REQUEST_CACHE_KEY.GROUPINGS, promise);
    } catch (err) {
      console.error("❌ Error fetching groupings:", err.message);
      toast.error("Failed to load departments/groupings", { duration: 3000 });
      return [];
    }
  }, []);

  /**
   * Create new grouping at specific level
   * @param {Object} groupingData - Grouping data to save
   * @returns {Promise<Object|null>} Created grouping object or null if failed
   */
  const createGrouping = useCallback(async (groupingData) => {
    try {
      const response = await axios.post(
        `${API_URL}/groupings/addgrouping`,
        groupingData
      );

      const createdGrouping = response.data.grouping;
      
      return createdGrouping;
    } catch (err) {
      const errorMsg =
        err.response?.data?.message || "Failed to create grouping";
      toast.error(errorMsg, {
        duration: 5000,
        position: "top-center",
      });
      console.error("Error creating grouping:", err);
      return null;
    }
  }, []);

  // ========================================
  // TAX OPERATIONS
  // ========================================

  /**
   * Fetch all tax masters
   * @returns {Promise<Array>} Array of taxes
   */
  /**
   * Fetch all tax masters (client will filter by country)
   * Server endpoint might not support country filtering, so fetch all and let client filter
   * @returns {Promise<Array>} Array of all taxes (filtering done on client side)
   */
  const fetchTaxes = useCallback(async () => {
    try {
      const cacheKey = REQUEST_CACHE_KEY.TAXES;

      // Check cache first
      const cached = requestCache.get(cacheKey);
      if (cached) {
      
        return cached;
      }

      // Check if request is already pending
      const pending = requestCache.getPending(cacheKey);
      if (pending) {
       
        return pending;
      }

    
      const url = `${API_URL}/tax-masters`;
      
      const promise = axios.get(url).then((response) => {
       

        // Handle different response structures
        if (response.data?.data && Array.isArray(response.data.data)) {
          
          return response.data.data;
        }

        if (response.data?.taxes && Array.isArray(response.data.taxes)) {
          
          return response.data.taxes;
        }

        if (Array.isArray(response.data)) {
         
          return response.data;
        }

        console.warn("⚠️ Unexpected tax response structure:", response.data);
        return [];
      });

      return requestCache.setPending(cacheKey, promise);
    } catch (err) {
      console.error("❌ Error fetching all tax masters:", err.message);
      toast.error("Failed to load tax rates", { duration: 3000 });
      return [];
    }
  }, []);

  // ========================================
  // HSN CODE OPERATIONS
  // ========================================

  /**
   * Fetch HSN codes
   * @returns {Promise<Array>} Array of HSN codes
   */
  const fetchHSNCodes = useCallback(async () => {
    try {
      const response = await axios.get(
        `${API_URL}/hsn/list?limit=1000`
      );

     

      if (response.data && Array.isArray(response.data)) {
        return response.data;
      } else if (response.data?.data && Array.isArray(response.data.data)) {
        return response.data.data;
      }

      return [];
    } catch (err) {
      console.error("🔴 Error fetching HSN codes:", err.response?.data || err);
      return [];
    }
  }, []);

  /**
   * Generate barcode on server with FIFO queue and duplicate prevention
   * Supports multi-system data entry
   * @param {string} baseBarcode - Base barcode (e.g., item code + dept code + row index)
   * @param {string} itemCode - Product item code
   * @param {string} departmentId - Department ID
   * @param {string} systemId - System/terminal identifier (optional)
   * @returns {Promise<Object>} - { barcode, queueId, suffix, status }
   */
  const generateBarcodeOnServer = useCallback(async (
    baseBarcode,
    itemCode,
    departmentId,
    systemId = 'system-default'
  ) => {
    try {
      console.log("📤 Generating barcode on server...", {
        baseBarcode,
        itemCode,
        departmentId,
        systemId
      });

      const response = await axios.post(
        `${API_URL}/products/generatebarcode`,
        {
          baseBarcode,
          itemCode,
          departmentId,
          systemId
        }
      );

      if (response.data?.success && response.data?.data) {
        console.log("✅ Server barcode generated:", response.data.data);
        return response.data.data; // { barcode, queueId, suffix, baseBarcode, status }
      }

      throw new Error(response.data?.message || "Failed to generate barcode");
    } catch (err) {
      console.error("🔴 Error generating barcode on server:", err.response?.data || err);
      const errorMessage = err.response?.data?.message || "Failed to generate barcode on server";
      toast.error(errorMessage, { duration: 4000 });
      throw err;
    }
  }, []);

  /**
   * Assign generated barcode to product (mark queue entry as assigned)
   * @param {string} queueId - Barcode queue ID
   * @param {string} productId - Product ID
   * @returns {Promise<Object>} - Updated queue entry
   */
  const assignBarcodeToProduct = useCallback(async (queueId, productId) => {
    try {
      console.log("📤 Assigning barcode to product...", { queueId, productId });

      const response = await axios.post(
        `${API_URL}/products/assignbarcode`,
        { queueId, productId }
      );

      if (response.data?.success) {
        console.log("✅ Barcode assigned to product:", response.data.data);
        return response.data.data;
      }

      throw new Error(response.data?.message || "Failed to assign barcode");
    } catch (err) {
      console.error("🔴 Error assigning barcode:", err.response?.data || err);
      throw err;
    }
  }, []);

  // Return all API methods
  return {
    // Product operations
    fetchProducts,
    fetchProductById,
    checkBarcodeExists,
    checkItemcodeExists,
    fetchNextItemCode,
    generateUniqueBarcode,
    generateBarcodeOnServer,
    assignBarcodeToProduct,
    saveProduct,
    deleteProduct,
    resyncProductToMeilisearch,  // ✅ NEW: Re-sync product to search index

    // Vendor operations
    fetchVendors,
    createVendor,

    // Unit operations
    fetchUnits,

    // Grouping operations
    fetchGroupings,
    createGrouping,

    // Tax operations
    fetchTaxes,

    // HSN operations
    fetchHSNCodes,
  };
};


