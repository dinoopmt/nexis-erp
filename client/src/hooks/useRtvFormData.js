/**
 * useRtvFormData Hook
 * Manages RTV form state and initialization
 * Similar to useGrnFormData but for returns
 */
import { useState } from "react";
import axios from "axios";
import { API_URL } from "../config/config";

const getCurrentFinancialYear = () => {
  const today = new Date();
  const month = today.getMonth() + 1;
  const year = today.getFullYear();

  if (month >= 4) {
    return `${year}-${year + 1}`;
  } else {
    return `${year - 1}-${year}`;
  }
};

export const useRtvFormData = () => {
  const initialFormData = {
    rtvNo: "",
    rtvDate: new Date().toISOString().split("T")[0],
    vendorId: "",
    vendorName: "",
    grnNumber: "",  // ✅ Link to source GRN
    grnId: "",
    creditNoteNo: "",
    returnAuthNo: "",
    items: [],
    notes: "",
    documents: [],
    returnReasonNotes: "",
  };

  const [formData, setFormData] = useState(initialFormData);
  const [editingId, setEditingId] = useState(null);

  // ✅ Fetch next RTV number
  const fetchNextRtvNo = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/v1/rtv/next-number`);
      
      if (response.data?.rtvNo) {
        return response.data.rtvNo;
      } else {
        console.warn("API returned empty RTV number, generating fallback");
        const financialYear = getCurrentFinancialYear();
        return `RTV-${financialYear}-${String(Date.now()).slice(-5)}`;
      }
    } catch (error) {
      console.error("Error fetching RTV number:", error);
      const financialYear = getCurrentFinancialYear();
      const fallbackRtvNo = `RTV-${financialYear}-${String(Date.now()).slice(-5)}`;
      console.warn(`Using fallback RTV number: ${fallbackRtvNo}`);
      return fallbackRtvNo;
    }
  };

  // ✅ Load GRN details when selecting a GRN for return
  const loadGrnDetails = async (grnNumber) => {
    try {
      const response = await axios.get(
        `${API_URL}/api/v1/grn/${grnNumber}`
      );
      
      const grn = response.data?.data || response.data;
      
      if (grn) {
        setFormData(prev => ({
          ...prev,
          grnId: grn._id,
          grnNumber: grn.grnNumber,
          vendorId: grn.vendorId,
          vendorName: grn.vendorName,
          // ✅ Pre-populate items from GRN (users can select which to return)
          items: grn.items.map(item => ({
            ...item,
            originalQuantity: item.quantity,
            quantity: 0, // User will specify return quantity
            returnReason: "OTHER",
            returnReasonNotes: "",
            originalBatchNumber: item.batchNumber || "",
          }))
        }));
      }
    } catch (error) {
      console.error("Error loading GRN details:", error);
    }
  };

  const resetForm = async () => {
    setFormData({
      ...initialFormData,
      rtvNo: "",
    });
    setEditingId(null);
  };

  return {
    formData,
    setFormData,
    editingId,
    setEditingId,
    resetForm,
    fetchNextRtvNo,
    loadGrnDetails,
  };
};


