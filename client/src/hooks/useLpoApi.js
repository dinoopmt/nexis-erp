/**
 * useLpoApi Hook
 * Manages API calls for LPO and vendor data
 */
import { useEffect, useCallback } from "react";
import { showToast } from "../components/shared/AnimatedCenteredToast.jsx";
import axios from "axios";
import { API_URL } from "../config/config";

export const useLpoApi = (setVendors, setLpoList) => {
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
   * Fetch LPO list from API
   */
  const fetchLpos = useCallback(async () => {
    try {
      console.log("🌐 [FETCH] Requesting LPOs from API endpoint: /lpo");
      const response = await axios.get(`${API_URL}/lpo`);
      
      console.log("📦 [FETCH] API Response received:", {
        status: response.status,
        dataType: Array.isArray(response.data) ? "array" : typeof response.data,
        dataLength: Array.isArray(response.data) ? response.data.length : (response.data?.data?.length || 0),
      });

      const lpoData = Array.isArray(response.data) 
        ? response.data 
        : response.data?.data || [];
      
      console.log(`✅ [FETCH] Setting ${lpoData.length} LPOs to state`);
      setLpoList(lpoData);
      return lpoData;
    } catch (error) {
      console.error("❌ [FETCH] Error fetching LPOs:", {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
      });
      setLpoList([]);
      throw error;
    }
  }, [setLpoList]);

  /**
   * Save or update LPO
   */
  const saveLpo = useCallback(
    async (submitData, editingId) => {
      try {
        const response = await axios({
          method: editingId ? "PUT" : "POST",
          url: `${API_URL}/lpo`,
          data: editingId ? { ...submitData, _id: editingId } : submitData,
          headers: { "Content-Type": "application/json" },
        });

        if (response.status === 200 || response.status === 201) {
          showToast('success',
            editingId ? "LPO updated successfully" : "LPO created successfully",
          );
          await fetchLpos();
          return true;
        }
      } catch (error) {
        console.error("Error saving LPO:", error);
        showToast('error', "Error saving LPO");
        return false;
      }
    },
    [fetchLpos],
  );

  /**
   * Delete LPO
   */
  const deleteLpo = useCallback(
    async (id) => {
      try {
        const response = await axios.delete(`${API_URL}/lpo/${id}`);

        if (response.status === 200) {
          setLpoList((prev) => prev.filter((l) => l._id !== id));
          showToast('success', "LPO deleted successfully");
          return true;
        }
      } catch (error) {
        setLpoList((prev) => prev.filter((l) => l._id !== id));
        showToast('success', "LPO deleted (local storage)");
        console.error("Error deleting LPO:", error);
        return false;
      }
    },
    [setLpoList],
  );

  // Fetch initial data on mount - Only vendor fetch, LPO fetch handled by component
  useEffect(() => {
    console.log("🎣 [HOOK INIT] useLpoApi hook mounted");
    fetchVendors();
    // ✅ NOTE: fetchLpos is called by the component's useEffect, not here
    // This prevents circular dependencies and race conditions
  }, []); // Empty array = run ONLY once on mount

  return {
    fetchVendors,
    fetchLpos,
    saveLpo,
    deleteLpo,
  };
};
