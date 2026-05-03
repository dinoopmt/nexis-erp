/**
 * useLpoFormData Hook
 * Manages LPO form state and initialization
 * Similar to useGrnFormData but simplified for LPO needs
 */
import { useState } from "react";
import axios from "axios";
import { API_URL } from "../config/config";

// ✅ Helper function to get current financial year (Apr-Mar)
const getCurrentFinancialYear = () => {
  const today = new Date();
  const month = today.getMonth() + 1; // 1-12
  const year = today.getFullYear();

  // Financial year starts April (month 4)
  if (month >= 4) {
    return `${year}-${year + 1}`;
  } else {
    return `${year - 1}-${year}`;
  }
};

export const useLpoFormData = () => {
  const initialFormData = {
    lpoNo: "",
    vendorId: "",
    vendorName: "",
    lpoDate: new Date().toISOString().split("T")[0],
    taxType: "exclusive", // ✅ Always Exclusive for LPO - No manual selection needed
    paymentTerms: "", // ✅ Start empty - user must select
    notes: "",
    items: [],
    status: "", // ✅ Status - will be set to Draft, Requested, etc.
  };

  const [formData, setFormData] = useState(initialFormData);
  const [editingId, setEditingId] = useState(null);

  // ✅ Fetch next LPO number from backend
  const fetchNextLpoNo = async () => {
    try {
      const financialYear = getCurrentFinancialYear();
      const response = await axios.get(
        `${API_URL}/lpo/next-number?financialYear=${financialYear}`
      );

      if (response.data?.lpoNo) {
        return response.data.lpoNo;
      } else {
        // Fallback if API returns empty
        console.warn("API returned empty LPO number, generating fallback");
        return `LPO-${financialYear}-${String(Date.now()).slice(-5)}`;
      }
    } catch (error) {
      console.error("Error fetching LPO number:", error);
      // Fallback: Generate using timestamp if API fails
      const financialYear = getCurrentFinancialYear();
      const fallbackLpoNo = `LPO-${financialYear}-${String(Date.now()).slice(-5)}`;
      console.warn(`Using fallback LPO number: ${fallbackLpoNo}`);
      return fallbackLpoNo;
    }
  };

  const resetForm = async () => {
    // ✅ Don't fetch LPO number when opening form
    // LPO number will be generated only during save to prevent gaps
    setFormData({
      ...initialFormData,
      lpoNo: "", // Keep empty until save
    });
    setEditingId(null);
  };

  return {
    formData,
    setFormData,
    editingId,
    setEditingId,
    resetForm,
    fetchNextLpoNo,
  };
};
