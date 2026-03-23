/**
 * useRtvApi Hook
 * Handles API calls for RTV operations
 */
import axios from "axios";
import { toast } from "react-hot-toast";
import { API_URL } from "../config/config";

export const useRtvApi = () => {
  // ✅ Fetch all RTVs
  const fetchRtvList = async (filters = {}) => {
    try {
      const response = await axios.get(`${API_URL}/rtv`, { params: filters });
      return response.data?.data || response.data || [];
    } catch (error) {
      console.error("Error fetching RTV list:", error);
      toast.error("Failed to fetch RTV list");
      return [];
    }
  };

  // ✅ Fetch RTV by ID
  const fetchRtvById = async (rtvId) => {
    try {
      const response = await axios.get(`${API_URL}/rtv/${rtvId}`);
      return response.data?.data || response.data;
    } catch (error) {
      console.error("Error fetching RTV:", error);
      toast.error("Failed to fetch RTV details");
      return null;
    }
  };

  // ✅ Create RTV
  const createRtv = async (rtvData) => {
    try {
      const response = await axios.post(`${API_URL}/rtv`, rtvData);
      toast.success("RTV created successfully");
      return response.data?.data || response.data;
    } catch (error) {
      console.error("Error creating RTV:", error);
      toast.error(error.response?.data?.message || "Failed to create RTV");
      throw error;
    }
  };

  // ✅ Update RTV
  const updateRtv = async (rtvId, rtvData) => {
    try {
      const response = await axios.put(`${API_URL}/rtv/${rtvId}`, rtvData);
      toast.success("RTV updated successfully");
      return response.data?.data || response.data;
    } catch (error) {
      console.error("Error updating RTV:", error);
      toast.error(error.response?.data?.message || "Failed to update RTV");
      throw error;
    }
  };

  // ✅ Submit RTV
  const submitRtv = async (rtvId) => {
    try {
      const response = await axios.patch(
        `${API_URL}/rtv/${rtvId}/submit`,
        {}
      );
      toast.success("RTV submitted successfully");
      return response.data?.data || response.data;
    } catch (error) {
      console.error("Error submitting RTV:", error);
      toast.error(error.response?.data?.message || "Failed to submit RTV");
      throw error;
    }
  };

  // ✅ Approve RTV
  const approveRtv = async (rtvId) => {
    try {
      const response = await axios.patch(
        `${API_URL}/rtv/${rtvId}/approve`,
        {}
      );
      toast.success("RTV approved successfully");
      return response.data?.data || response.data;
    } catch (error) {
      console.error("Error approving RTV:", error);
      toast.error(error.response?.data?.message || "Failed to approve RTV");
      throw error;
    }
  };

  // ✅ Post RTV (finalize with GL entries and stock reversal)
  const postRtv = async (rtvId) => {
    try {
      const response = await axios.patch(
        `${API_URL}/rtv/${rtvId}/post`,
        {}
      );
      toast.success("RTV posted successfully - Stock and GL entries reversed");
      return response.data?.data || response.data;
    } catch (error) {
      console.error("Error posting RTV:", error);
      toast.error(error.response?.data?.message || "Failed to post RTV");
      throw error;
    }
  };

  // ✅ Cancel RTV
  const cancelRtv = async (rtvId, reason) => {
    try {
      const response = await axios.patch(
        `${API_URL}/rtv/${rtvId}/cancel`,
        { reason }
      );
      toast.success("RTV cancelled successfully");
      return response.data?.data || response.data;
    } catch (error) {
      console.error("Error cancelling RTV:", error);
      toast.error(error.response?.data?.message || "Failed to cancel RTV");
      throw error;
    }
  };

  // ✅ Delete RTV (only if draft)
  const deleteRtv = async (rtvId) => {
    try {
      await axios.delete(`${API_URL}/rtv/${rtvId}`);
      toast.success("RTV deleted successfully");
    } catch (error) {
      console.error("Error deleting RTV:", error);
      toast.error(error.response?.data?.message || "Failed to delete RTV");
      throw error;
    }
  };

  // ✅ Get next RTV number
  const fetchRtvNextNumber = async () => {
    try {
      const response = await axios.get(`${API_URL}/rtv/next-number`);
      return response.data?.rtvNo || null;
    } catch (error) {
      console.error("Error fetching RTV next number:", error);
      return null;
    }
  };

  // ✅ Get GRN list for return selection (filtered by vendorId)
  const fetchGrnList = async (vendorId) => {
    try {
      const url = vendorId 
        ? `${API_URL}/rtv/grn/list?vendorId=${vendorId}`
        : `${API_URL}/rtv/grn/list`;
      console.log("Fetching GRN list from:", url);
      const response = await axios.get(url);
      console.log("GRN list response:", response);
      
      // Handle different response formats
      let grnList = [];
      if (Array.isArray(response.data)) {
        grnList = response.data;
      } else if (response.data?.data && Array.isArray(response.data.data)) {
        grnList = response.data.data;
      } else if (response.data?.grns && Array.isArray(response.data.grns)) {
        grnList = response.data.grns;
      }
      
      console.log("Parsed GRN list:", grnList);
      if (grnList.length === 0) {
        console.warn("No GRNs found for vendor:", vendorId);
      }
      return grnList;
    } catch (error) {
      console.error("Error fetching GRN list:", error);
      toast.error("Failed to fetch GRN list: " + (error.response?.data?.message || error.message));
      return [];
    }
  };

  // ✅ Get GRN details for return selection
  const fetchGrn = async (grnNumber) => {
    try {
      const response = await axios.get(
        `${API_URL}/grn/${grnNumber}`
      );
      return response.data?.data || response.data;
    } catch (error) {
      console.error("Error fetching GRN:", error);
      toast.error("GRN not found");
      return null;
    }
  };

  // ✅ Generate credit note
  const generateCreditNote = async (rtvId) => {
    try {
      const response = await axios.post(
        `${API_URL}/rtv/${rtvId}/credit-note`,
        {}
      );
      toast.success("Credit note generated successfully");
      return response.data?.data || response.data;
    } catch (error) {
      console.error("Error generating credit note:", error);
      toast.error(error.response?.data?.message || "Failed to generate credit note");
      throw error;
    }
  };

  return {
    fetchRtvList,
    fetchRtvById,
    fetchRtvNextNumber,
    createRtv,
    updateRtv,
    submitRtv,
    approveRtv,
    postRtv,
    cancelRtv,
    deleteRtv,
    fetchGrnList,
    fetchGrn,
    generateCreditNote,
  };
};


