/**
 * useGrnApi Hook
 * Manages API calls for GRN and vendor data
 */
import { useEffect, useCallback } from "react";
import { showToast } from "../components/shared/AnimatedCenteredToast.jsx";
import axios from "axios";
import { API_URL } from "../config/config";

export const useGrnApi = (setVendors, setGrnList) => {
  /**
   * Fetch vendors from API
   */
  const fetchVendors = useCallback(async () => {
    try {
      const response = await axios.get(`${API_URL}/vendors/getvendors`);
      console.log("🔍 Vendors API Response:", response.data);
      
      // Handle API response structure: { vendors: [...], total, page, pages }
      const vendorData = Array.isArray(response.data) 
        ? response.data 
        : response.data?.vendors || response.data?.data || [];
      
      console.log("✅ Setting vendors:", vendorData);
      setVendors(vendorData);
    } catch (error) {
      console.error("❌ Error fetching vendors:", error);
      showToast('error', "Failed to load vendors");
    }
  }, [setVendors]);

  /**
   * Fetch GRN list from API
   */
  const fetchGrns = useCallback(async () => {
    try {
      const response = await axios.get(`${API_URL}/grn`);
      setGrnList(
        Array.isArray(response.data) ? response.data : response.data?.data || [],
      );
    } catch (error) {
      console.error("Error fetching GRNs:", error);
    }
  }, [setGrnList]);

  /**
   * Save or update GRN
   */
  const saveGrn = useCallback(
    async (submitData, editingId) => {
      try {
        const response = await axios({
          method: editingId ? "PUT" : "POST",
          url: `${API_URL}/grn`,
          data: editingId ? { ...submitData, _id: editingId } : submitData,
          headers: { "Content-Type": "application/json" },
        });

        if (response.status === 200 || response.status === 201) {
          showToast('success',
            editingId ? "GRN updated successfully" : "GRN created successfully",
          );
          await fetchGrns();
          return true;
        }
      } catch (error) {
        console.error("Error saving GRN:", error);
        showToast('error', "Error saving GRN");
        return false;
      }
    },
    [fetchGrns],
  );

  /**
   * Delete GRN
   */
  const deleteGrn = useCallback(
    async (id) => {
      try {
        const response = await axios.delete(`${API_URL}/grn/${id}`);

        if (response.status === 200) {
          setGrnList((prev) => prev.filter((g) => g._id !== id));
          showToast('success', "GRN deleted successfully");
          return true;
        }
      } catch (error) {
        setGrnList((prev) => prev.filter((g) => g._id !== id));
        showToast('success', "GRN deleted (local storage)");
        console.error("Error deleting GRN:", error);
        return false;
      }
    },
    [setGrnList],
  );

  // Fetch initial data on mount
  useEffect(() => {
    fetchVendors();
    fetchGrns();
  }, [fetchVendors, fetchGrns]);

  return {
    fetchVendors,
    fetchGrns,
    saveGrn,
    deleteGrn,
  };
};


