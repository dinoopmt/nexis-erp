/**
 * useGrnFormData Hook
 * Manages form state and initialization
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

export const useGrnFormData = () => {
  const initialFormData = {
    grnNo: "",
    invoiceNo: "",
    lpoNo: "",
    vendorId: "",
    vendorName: "",
    grnDate: new Date().toISOString().split("T")[0],
    taxType: "",  // ✅ Start empty - user must select
    paymentTerms: "",  // ✅ Start empty - user must select
    notes: "",
    documents: [],
    items: [],
    shippingCost: 0,
    shipperId: "",
    shipperName: "",
  };

  const [formData, setFormData] = useState(initialFormData);
  const [editingId, setEditingId] = useState(null);

  // ✅ UPDATED: Fetch next GRN number from backend using sequence table
  const fetchNextGrnNo = async () => {
    try {
      const financialYear = getCurrentFinancialYear();
      const response = await axios.get(
        `${API_URL}/api/v1/grn/next-number?financialYear=${financialYear}`
      );
      
      if (response.data?.grnNo) {
        return response.data.grnNo;
      } else {
        // Fallback if API returns empty
        console.warn("API returned empty GRN number, generating fallback");
        return `GRN-${financialYear}-${String(Date.now()).slice(-5)}`;
      }
    } catch (error) {
      console.error("Error fetching GRN number:", error);
      // Fallback: Generate using timestamp if API fails
      const financialYear = getCurrentFinancialYear();
      const fallbackGrnNo = `GRN-${financialYear}-${String(Date.now()).slice(-5)}`;
      console.warn(`Using fallback GRN number: ${fallbackGrnNo}`);
      return fallbackGrnNo;
    }
  };

  const resetForm = async () => {
    // ✅ FIXED: Don't fetch GRN number when opening form
    // GRN number will be generated only during save to prevent gaps
    setFormData({
      ...initialFormData,
      grnNo: "", // Keep empty until save
    });
    setEditingId(null);
  };

  return {
    formData,
    setFormData,
    editingId,
    setEditingId,
    resetForm,
    fetchNextGrnNo,
  };
};


