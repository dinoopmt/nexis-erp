/**
 * useLpoItemManagement Hook
 * Manages item CRUD operations and calculations for LPO
 * ✅ LPO-specific: No FOC, no batch expiry tracking
 */
import { useCallback } from "react";
import { calculateItemCost, mapProductToLpoItem } from "../utils/lpoCalculations";

export const useLpoItemManagement = (formData, setFormData, unitTypesMap = null) => {
  /**
   * Add item to LPO with optional unit variant
   * ✅ If same product already exists, increase quantity instead of adding duplicate
   */
  const addItemToLpo = useCallback(
    (product, selectedUnit = null) => {
      console.log("🛒 Adding item to LPO:", {
        productId: product._id,
        name: product.name,
        cost: product.cost,
        unitType: product.unitType,
        selectedUnit: selectedUnit,
      });

      const newItem = mapProductToLpoItem(product, formData.taxType, selectedUnit, unitTypesMap);

      console.log("✅ Item prepared for LPO:", {
        id: newItem.id,
        productName: newItem.productName,
        qty: newItem.qty,
        cost: newItem.cost,
        finalCost: newItem.finalCost,
        unitType: newItem.unitType,
      });

      setFormData((prev) => {
        // ✅ Check if product already exists in items (with same unit if applicable)
        const existingItemIndex = prev.items.findIndex(
          (item) => item.productId === newItem.productId && item.unitType === newItem.unitType
        );

        let updatedItems;

        if (existingItemIndex !== -1) {
          // ✅ Product exists - increase quantity instead of adding duplicate
          updatedItems = prev.items.map((item, index) => {
            if (index === existingItemIndex) {
              const updatedItem = {
                ...item,
                qty: item.qty + newItem.qty,
              };
              calculateItemCost(updatedItem);
              return updatedItem;
            }
            return item;
          });
          console.log("📈 Quantity increased for existing item:", newItem.productName);
        } else {
          // ✅ New product - add as new line
          updatedItems = [...prev.items, newItem];
          console.log("✨ New item added to LPO:", newItem.productName);
        }

        console.log("📊 LPO items updated - Total items:", updatedItems.length);
        
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
   */
  const updateItem = useCallback(
    (itemId, field, value) => {
      setFormData((prev) => {
        const updatedItems = prev.items.map((item) => {
          if (item.id === itemId) {
            const updatedItem = { ...item, [field]: value };
            calculateItemCost(updatedItem);
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
   * Remove item from LPO
   */
  const removeItemFromLpo = useCallback(
    (itemId) => {
      setFormData((prev) => {
        const updatedItems = prev.items.filter((item) => item.id !== itemId);
        console.log("🗑️ Item removed. Remaining items:", updatedItems.length);
        return { ...prev, items: updatedItems };
      });
    },
    [setFormData],
  );

  return {
    addItemToLpo,
    updateItem,
    removeItemFromLpo,
  };
};
