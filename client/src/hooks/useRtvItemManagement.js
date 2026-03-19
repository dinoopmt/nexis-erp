/**
 * useRtvItemManagement Hook
 * Manages RTV item operations (add, update, remove, calculate totals)
 */
import { useState, useCallback } from "react";
import { toast } from "react-hot-toast";

export const useRtvItemManagement = (formData, setFormData) => {
  // ✅ Add item to RTV (user selects from GRN items)
  const addItem = useCallback((item) => {
    if (!item.productId) {
      toast.error("Product ID is required");
      return;
    }

    // Check if item already added
    if (formData.items.some(i => i.productId === item.productId)) {
      toast.error("Item already added to return");
      return;
    }

    setFormData(prev => ({
      ...prev,
      items: [...prev.items, {
        ...item,
        id: `${item.productId}-${Date.now()}`,
        quantity: 0,
        returnReason: "OTHER",
        returnReasonNotes: "",
      }]
    }));

    toast.success("Item added to return");
  }, [formData.items, setFormData]);

  // ✅ Update item quantity
  const updateItemQuantity = useCallback((itemId, quantity) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map(item => 
        item.id === itemId 
          ? { ...item, quantity: Math.max(0, quantity), totalCost: quantity * item.unitCost }
          : item
      )
    }));
  }, [setFormData]);

  // ✅ Update item return reason
  const updateItemReturnReason = useCallback((itemId, returnReason, notes = "") => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map(item =>
        item.id === itemId
          ? { ...item, returnReason, returnReasonNotes: notes }
          : item
      )
    }));
  }, [setFormData]);

  // ✅ Remove item from RTV
  const removeItem = useCallback((itemId) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter(item => item.id !== itemId)
    }));
    toast.success("Item removed from return");
  }, [setFormData]);

  // ✅ Calculate RTV totals
  const calculateTotals = useCallback(() => {
    const items = formData.items || [];
    
    const subtotal = items.reduce((sum, item) => 
      sum + (item.quantity * item.unitCost), 0
    );

    // ✅ Calculate total tax
    const totalTax = items.reduce((sum, item) => {
      const itemTax = item.taxAmount || (item.quantity * item.unitCost * (item.taxPercent || 0) / 100);
      return sum + itemTax;
    }, 0);

    const total = Math.round((subtotal + totalTax) * 100) / 100;

    return {
      subtotal: Math.round(subtotal * 100) / 100,
      totalQty: items.reduce((sum, item) => sum + item.quantity, 0),
      itemCount: items.length,
      totalTax: Math.round(totalTax * 100) / 100,
      total: total,
    };
  }, [formData.items]);

  return {
    addItem,
    updateItemQuantity,
    updateItemReturnReason,
    removeItem,
    calculateTotals,
  };
};


