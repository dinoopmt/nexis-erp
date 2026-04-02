import { useCallback, useContext, useState, useRef } from "react";
import { showToast } from "../components/shared/AnimatedCenteredToast.jsx";
import { ProductFormContext } from "../context/ProductFormContext";
import { useProductAPI } from "../components/shared/sample/useProductAPI";
import { clearQueryCache, clearAllCache } from "../utils/searchCache";
import { requestCache } from "../utils/requestCache";
import {
  buildPricingLinesFromProduct,
  prepareProductForEdit,
  buildProductForSave,
} from "../utils/productCreateEditUtils";

/**
 * ✅ MASTER HOOK: Complete product create/edit/save logic
 * Uses the proven code from Product.jsx, now in shared utilities
 * 
 * Used by: Product.jsx (calls openProductForm to open modal)
 * 
 * This hook handles the product management workflow:
 * - handleEdit: Load a product for editing
 * - handleSaveProduct: Save product data to API
 * - handleNewProduct: Initialize create mode
 */
export const useProductCreateUpdate = ({
  onProductSaved, // Callback after successful save
  products = [],
  filteredProducts = [],
  round,
  activeCountryCode = "AE",
}) => {
  const { openProductForm } = useContext(ProductFormContext);
  const productAPI = useProductAPI();
  const lastSavedProductRef = useRef(null);

  // ✅ Handle Edit Product
  const handleEdit = useCallback(
    async (prod) => {
      try {
        // Fetch complete product data
        const completeProduct = await productAPI.fetchProductById(prod._id);
        if (!completeProduct) {
          throw new Error("Failed to fetch product");
        }

        // Prepare with defaults
        const productToEdit = prepareProductForEdit(completeProduct, activeCountryCode);

        // Build pricing lines
        const { pricingLines, selectedLines } = buildPricingLinesFromProduct(productToEdit);

        // Callback for when product is saved
        const handleProductSaved = async (savedProduct) => {
          if (onProductSaved) {
            await onProductSaved(savedProduct);
          }
          
          // 🔴 P1: Clear ALL search cache variations
          clearQueryCache(savedProduct.name);           // Clear by name
          clearQueryCache(savedProduct.itemcode);       // Clear by item code
          clearQueryCache(savedProduct.code);           // Clear by product code
          clearQueryCache(savedProduct.sku);            // Clear by SKU
          clearAllCache();                              // Clear entire search cache
          
          // 🔴 P1: Invalidate request cache
          requestCache.clear();
          
          // 🔴 P2: Broadcast product update event
          window.dispatchEvent(
            new CustomEvent('productUpdated', {
              detail: {
                product: savedProduct,
                timestamp: Date.now(),
              },
            })
          );
          
          console.log('✅ Product updated - caches cleared and event dispatched:', savedProduct.name);
          const updated = await productAPI.fetchProducts();
        };

        // Open modal in edit mode
        const editIdx = Array.isArray(filteredProducts) 
          ? filteredProducts.findIndex((p) => p._id === productToEdit._id)
          : -1;
        openProductForm({
          mode: "edit",
          product: productToEdit,
          products: products,
          filteredProducts: Array.isArray(filteredProducts) ? filteredProducts : [],
          editIndex: editIdx >= 0 ? editIdx : 0,
          onSave: handleProductSaved,
        });

        console.log("✅ Product loaded for editing");
      } catch (error) {
        console.error("❌ Edit error:", error);
        showToast('error', error.message || "Failed to load product");
      }
    },
    [productAPI, openProductForm, products, filteredProducts, onProductSaved, activeCountryCode]
  );

  // ✅ Handle Save Product
  const handleSaveProduct = useCallback(
    async (productData, isEditMode = false, productId = null) => {
      try {
        const userData = localStorage.getItem("user");
        const currentUser = userData ? JSON.parse(userData) : null;
        const currentUsername = currentUser?.username || "Unknown User";

        // Build final product for API
        const finalData = buildProductForSave(productData, productData.pricingLines || [], productData.selectedPricingLines || new Set([0]), {
          round,
          isEditMode,
          currentUsername,
        });

        // Save to API (returns { product, meilisearchSync, message })
        const saveResult = await productAPI.saveProduct(
          finalData,
          isEditMode ? productId : null
        );

        if (saveResult?.product) {
          const savedProduct = saveResult.product;
          
          if (lastSavedProductRef.current !== savedProduct._id) {
            showToast('success', `Product saved successfully`);
            lastSavedProductRef.current = savedProduct._id;
          }

          // ✅ Auto-retry Meilisearch sync if update failed
          if (isEditMode && saveResult.meilisearchSync && !saveResult.meilisearchSync.success) {
            console.warn('⚠️  Meilisearch sync failed on update, attempting auto-retry...');
            showToast('info', 'Retrying search index update...');
            
            // Wait a moment for any pending operations to complete
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Attempt re-sync
            const resyncResult = await productAPI.resyncProductToMeilisearch(productId);
            
            if (resyncResult.success) {
              console.log(`✅ Auto-retry successful for product ${productId}`);
            } else {
              console.warn(`⚠️  Auto-retry failed: ${resyncResult.error}`);
            }
          }

          return savedProduct;
        }
      } catch (error) {
        console.error("❌ Save error:", error);
        showToast('error', error.message || "Failed to save product");
        throw error;
      }
    },
    [productAPI, round]
  );

  // ✅ Handle New Product (Create Mode)
  const handleNewProduct = useCallback(async () => {
    const handleProductSaved = async (savedProduct) => {
      if (onProductSaved) {
        await onProductSaved(savedProduct);
      }
      
      // 🔴 P1: Clear ALL search cache variations
      clearQueryCache(savedProduct.name);           // Clear by name
      clearQueryCache(savedProduct.itemcode);       // Clear by item code
      clearQueryCache(savedProduct.code);           // Clear by product code
      clearQueryCache(savedProduct.sku);            // Clear by SKU
      clearAllCache();                              // Clear entire search cache
      
      // 🔴 P1: Invalidate request cache
      requestCache.clear();
      
      // 🔴 P2: Broadcast product update event
      window.dispatchEvent(
        new CustomEvent('productUpdated', {
          detail: {
            product: savedProduct,
            timestamp: Date.now(),
          },
        })
      );
      
      console.log('✅ Product saved - caches cleared and event dispatched:', savedProduct.name);
      const updated = await productAPI.fetchProducts();
    };

    openProductForm({
      mode: "create",
      product: null,  // ✅ CRITICAL: Explicitly clear old product data from context
      products: products,
      filteredProducts: filteredProducts,
      editIndex: -1,
      onSave: handleProductSaved,
    });
  }, [productAPI, openProductForm, products, filteredProducts, onProductSaved]);

  return {
    handleEdit,
    handleSaveProduct,
    handleNewProduct,
  };
};


