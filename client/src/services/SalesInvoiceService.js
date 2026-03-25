/**
 * SalesInvoiceService
 * All API calls and backend communication for sales invoices
 */

import axios from "axios";
import { API_URL } from "../config/config";

export class SalesInvoiceService {
  /**
   * Fetch all sales invoices
   * @returns {Promise<Array>} - Array of invoices
   */
  static async fetchInvoices() {
    try {
      const response = await axios.get(
        `${API_URL}/sales-invoices/getSalesInvoices`
      );
      return response.data;
    } catch (error) {
      console.error("Error fetching invoices:", error);
      throw error;
    }
  }

  /**
   * Get next invoice number for given financial year
   * @param {String} financialYear - Financial year (e.g., "2025-26")
   * @returns {Promise<Object>} - Next invoice number data
   */
  static async getNextInvoiceNumber(financialYear) {
    try {
      const response = await axios.get(
        `${API_URL}/sales-invoices/nextInvoiceNumber?financialYear=${financialYear}`
      );
      return response.data.sequence || response.data.invoiceNumber;
    } catch (error) {
      console.error("Error fetching next invoice number:", error);
      throw error;
    }
  }

  /**
   * Create new sales invoice
   * @param {Object} invoiceData - Invoice data to save
   * @returns {Promise<Object>} - Created invoice
   */
  static async createInvoice(invoiceData) {
    try {
      const response = await axios.post(
        `${API_URL}/sales-invoices/createSalesInvoice`,
        invoiceData
      );
      return response.data;
    } catch (error) {
      console.error("Error creating invoice:", error);
      throw error;
    }
  }

  /**
   * Update existing sales invoice
   * @param {String} invoiceId - Invoice ID
   * @param {Object} invoiceData - Updated invoice data
   * @returns {Promise<Object>} - Updated invoice
   */
  static async updateInvoice(invoiceId, invoiceData) {
    try {
      const response = await axios.put(
        `${API_URL}/sales-invoices/updateSalesInvoice/${invoiceId}`,
        invoiceData
      );
      return response.data;
    } catch (error) {
      console.error("Error updating invoice:", error);
      throw error;
    }
  }

  /**
   * Delete sales invoice
   * @param {String} invoiceId - Invoice ID
   * @returns {Promise<Object>} - Delete response
   */
  static async deleteInvoice(invoiceId) {
    try {
      const response = await axios.delete(
        `${API_URL}/sales-invoices/deleteSalesInvoice/${invoiceId}`
      );
      return response.data;
    } catch (error) {
      console.error("Error deleting invoice:", error);
      throw error;
    }
  }

  /**
   * Fetch product by barcode
   * @param {String} barcode - Product barcode
   * @returns {Promise<Object>} - Product data
   */
  static async fetchProductByBarcode(barcode) {
    try {
      const response = await axios.get(
        `${API_URL}/products/getProductByBarcode?barcode=${barcode}`
      );
      return response.data;
    } catch (error) {
      console.error("Error fetching product by barcode:", error);
      throw error;
    }
  }

  /**
   * Search products with pagination
   * @param {String} searchTerm - Search term
   * @param {Object} options - Additional options (limit, page, etc.)
   * @returns {Promise<Object>} - Search results
   */
  static async searchProducts(searchTerm, options = {}) {
    try {
      const params = new URLSearchParams({
        search: searchTerm,
        limit: options.limit || 10,
        page: options.page || 1,
        ...options,
      });
      const response = await axios.get(
        `${API_URL}/products/search?${params.toString()}`
      );
      return response.data;
    } catch (error) {
      console.error("Error searching products:", error);
      throw error;
    }
  }

  /**
   * Fetch all customers
   * @returns {Promise<Array>} - Array of customers
   */
  static async fetchCustomers() {
    try {
      const response = await axios.get(
        `${API_URL}/customers/getCustomers`
      );
      return response.data || [];
    } catch (error) {
      console.error("Error fetching customers:", error);
      throw error;
    }
  }

  /**
   * Fetch customer by ID
   * @param {String} customerId - Customer ID
   * @returns {Promise<Object>} - Customer data
   */
  static async fetchCustomer(customerId) {
    try {
      const response = await axios.get(
        `${API_URL}/customers/getCustomer/${customerId}`
      );
      return response.data;
    } catch (error) {
      console.error("Error fetching customer:", error);
      throw error;
    }
  }

  /**
   * Fetch single invoice
   * @param {String} invoiceId - Invoice ID
   * @returns {Promise<Object>} - Invoice data
   */
  static async fetchInvoiceById(invoiceId) {
    try {
      const response = await axios.get(
        `${API_URL}/sales-invoices/getInvoice/${invoiceId}`
      );
      return response.data;
    } catch (error) {
      console.error("Error fetching invoice:", error);
      throw error;
    }
  }

  /**
   * Print invoice
   * @param {String} invoiceId - Invoice ID
   * @returns {Promise<Blob>} - PDF blob
   */
  static async printInvoice(invoiceId) {
    try {
      const response = await axios.get(
        `${API_URL}/sales-invoices/printInvoice/${invoiceId}`,
        { responseType: "blob" }
      );
      return response.data;
    } catch (error) {
      console.error("Error printing invoice:", error);
      throw error;
    }
  }

  /**
   * Fetch all products (for bulk lookup)
   * @param {Object} options - Query options (limit, page, etc.)
   * @returns {Promise<Array>} - Array of products
   */
  static async fetchAllProducts(options = {}) {
    try {
      const params = new URLSearchParams({
        limit: options.limit || 50000,
        ...options,
      });
      const response = await axios.get(
        `${API_URL}/products/getproducts?${params.toString()}`
      );
      return response.data.products || response.data;
    } catch (error) {
      console.error("Error fetching all products:", error);
      throw error;
    }
  }
}

export default SalesInvoiceService;
