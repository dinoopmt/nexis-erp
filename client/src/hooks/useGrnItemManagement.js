/**
 * useGrnItemManagement Hook
 * Manages item CRUD operations and calculations
 */
import { useCallback } from "react";
import { showToast } from "../components/shared/AnimatedCenteredToast.jsx";
import { calculateItemCost, mapProductToGrnItem } from "../utils/grnCalculations";

export const useGrnItemManagement = (formData, setFormData, unitTypesMap = null) => {
  /**
   * Add item to GRN with optional unit variant
   * ✅ If same product already exists, increase quantity instead of adding duplicate
   */
  const addItemToGrn = useCallback(
    (product, selectedUnit = null) => {
      console.log("🛒 Adding item to GRN:", {
        productId: product._id,
        name: product.name,
        cost: product.cost,
        unitType: product.unitType,
        trackExpiry: product.trackExpiry,
        selectedUnit: selectedUnit,
      });

      const newItem = mapProductToGrnItem(product, formData.taxType, selectedUnit, unitTypesMap);

      console.log("✅ Item prepared for GRN:", {
        id: newItem.id,
        productName: newItem.productName,
        qty: newItem.qty,
        cost: newItem.cost,
        finalCost: newItem.finalCost,
        unitType: newItem.unitType,
        trackExpiry: newItem.trackExpiry,
      });

      setFormData((prev) => {
        // ✅ Check if product already exists in items (with same unit if applicable)
        const existingItemIndex = prev.items.findIndex(
          (item) => item.productId === newItem.productId && item.unitType === newItem.unitType
        );

        let updatedItems;
        let message;

        if (existingItemIndex !== -1) {
          // ✅ Product exists - increase quantity instead of adding duplicate
          updatedItems = prev.items.map((item, index) => {
            if (index === existingItemIndex) {
              const updatedItem = {
                ...item,
                qty: item.qty + newItem.qty,
              };
              // ✅ Skip FOC calculation during entry (will be calculated at posting)
              calculateItemCost(updatedItem, true);
              return updatedItem;
            }
            return item;
          });
          message = `Quantity increased for ${newItem.productName}`;
          console.log("📈 Quantity increased for existing item:", newItem.productName);
        } else {
          // ✅ New product - add as new line
          updatedItems = [...prev.items, newItem];
          message = `${newItem.productName} added to GRN`;
          console.log("✨ New item added to GRN:", newItem.productName);
        }

        console.log("📊 GRN items updated - Total items:", updatedItems.length);
        showToast('success', message);
        
        return {
          ...prev,
          items: updatedItems,
        };
      });
    },
    [formData.taxType, setFormData, unitTypesMap],
  );

  /**
   * Update item and recalculate totals
   * ✅ UPDATED: Skip FOC calculation during entry (skipFocCalculation=true)
   *             FOC will be calculated only during posting
   */
  const updateItem = useCallback(
    (itemId, field, value) => {
      setFormData((prev) => {
        const updatedItems = prev.items.map((item) => {
          if (item.id === itemId) {
            const updatedItem = { ...item, [field]: value };
            // ✅ Skip FOC calculation during entry - only calculate final amounts at posting time
            calculateItemCost(updatedItem, true);
            return updatedItem;
          }
          return item;
        });
        return { ...prev, items: updatedItems };
      });
    },
    [setFormData],
  );

  /**
   * Remove item from GRN
   */
  const removeItemFromGrn = useCallback(
    (itemId) => {
      setFormData((prev) => {
        const updatedItems = prev.items.filter((item) => item.id !== itemId);
        console.log("🗑️ Item removed. Remaining items:", updatedItems.length);
        return { ...prev, items: updatedItems };
      });
      showToast('success', "Item removed from GRN");
    },
    [setFormData],
  );

  return {
    addItemToGrn,
    updateItem,
    removeItemFromGrn,
  };
};


