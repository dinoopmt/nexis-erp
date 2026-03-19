/**
 * POS Return Screen
 * Handle product returns and exchanges
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Search,
  Plus,
  Minus,
  Trash2,
  DollarSign,
  AlertCircle,
  CheckCircle,
  ChevronLeft,
  Zap,
  Package
} from 'lucide-react';
import { useDecimalFormat } from '../../hooks/useDecimalFormat';

const API_URL = import.meta.env.VITE_API_URL || '/api/v1';

export const POSReturn = ({ terminalId, onBack, operatorId }) => {
  const { formatCurrency } = useDecimalFormat();

  // State management
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [returnItems, setReturnItems] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [originalSaleId, setOriginalSaleId] = useState('');
  const [returnReason, setReturnReason] = useState('defective'); // defective, customer_request, wrong_item, damaged
  const [isProcessing, setIsProcessing] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [originalSales, setOriginalSales] = useState([]);

  // Search for original sales or products
  const handleSearch = async (value) => {
    setSearchTerm(value);
    if (value.length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      // Search both sales invoices and products
      const [salesRes, productsRes] = await Promise.all([
        axios.get(`${API_URL}/api/v1/sales/invoices/search?query=${value}`),
        axios.get(`${API_URL}/api/v1/inventory/products/search?query=${value}`)
      ]);

      setOriginalSales(salesRes.data.data || []);
      setSearchResults(productsRes.data.data?.slice(0, 10) || []);
    } catch (error) {
      console.error('Search error:', error);
      setMessage({ type: 'error', text: 'Search failed' });
    }
  };

  // Add product to return cart
  const addToReturn = (product) => {
    const existingItem = returnItems.find(item => item._id === product._id);
    if (existingItem) {
      updateReturnQty(product._id, existingItem.quantity + 1);
    } else {
      setReturnItems([
        ...returnItems,
        {
          ...product,
          quantity: 1,
          lineTotal: product.price,
          returnQty: 1
        }
      ]);
    }
    setSearchTerm('');
    setSearchResults([]);
  };

  // Update quantity
  const updateReturnQty = (productId, qty) => {
    if (qty <= 0) {
      removeFromReturn(productId);
      return;
    }

    const maxQty = returnItems.find(item => item._id === productId)?.quantity || 1;
    const actualQty = Math.min(qty, maxQty);

    setReturnItems(
      returnItems.map(item => {
        if (item._id === productId) {
          return {
            ...item,
            returnQty: actualQty,
            lineTotal: item.price * actualQty
          };
        }
        return item;
      })
    );
  };

  // Remove from return
  const removeFromReturn = (productId) => {
    setReturnItems(returnItems.filter(item => item._id !== productId));
  };

  // Calculate totals
  const calculateTotals = () => {
    const subtotal = returnItems.reduce((sum, item) => sum + item.lineTotal, 0);
    const taxRate = 0.05; // 5% VAT for UAE
    const taxAmount = subtotal * taxRate;
    const total = subtotal + taxAmount;

    return {
      subtotal,
      taxAmount,
      total,
      itemCount: returnItems.reduce((sum, item) => sum + item.returnQty, 0)
    };
  };

  // Process return
  const handleProcessReturn = async () => {
    if (returnItems.length === 0) {
      setMessage({ type: 'error', text: 'Add items to return' });
      return;
    }

    if (!returnReason) {
      setMessage({ type: 'error', text: 'Select return reason' });
      return;
    }

    setIsProcessing(true);
    try {
      const totals = calculateTotals();

      const response = await axios.post(`${API_URL}/api/v1/sales/returns/create`, {
        terminalId,
        operatorId,
        originalSaleId: originalSaleId || null,
        customerId: selectedCustomer?._id || null,
        items: returnItems.map(item => ({
          productId: item._id,
          quantity: item.returnQty,
          price: item.price,
          lineTotal: item.lineTotal
        })),
        reason: returnReason,
        subtotal: totals.subtotal,
        taxAmount: totals.taxAmount,
        total: totals.total,
        timestamp: new Date().toISOString()
      });

      if (response.data.success) {
        setMessage({
          type: 'success',
          text: `Return processed successfully. Reference: ${response.data.data.returnId}`
        });

        // Reset form
        setTimeout(() => {
          setReturnItems([]);
          setSelectedCustomer(null);
          setOriginalSaleId('');
          setReturnReason('defective');
          setMessage({ type: '', text: '' });
        }, 2000);
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.message || 'Return processing failed'
      });
    } finally {
      setIsProcessing(false);
      setShowConfirmation(false);
    }
  };

  const totals = calculateTotals();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      {/* Header */}
      <div className="bg-slate-800 border-b border-slate-700 p-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-2 hover:bg-slate-700 rounded-lg transition"
            >
              <ChevronLeft className="w-6 h-6 text-white" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                <Package className="w-6 h-6 text-orange-500" />
                Returns & Exchanges
              </h1>
              <p className="text-sm text-gray-400">Process product returns</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6 max-w-7xl mx-auto">
        {/* Left: Search and Return Items */}
        <div className="lg:col-span-2 space-y-6">
          {/* Search Section */}
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
            <label className="block text-sm font-medium text-gray-300 mb-3">
              Search Products or Original Sale
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-3 w-5 h-5 text-gray-500" />
              <input
                type="text"
                placeholder="Search by product name, code, or invoice..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg pl-10 pr-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 transition"
              />
            </div>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="mt-3 space-y-2 max-h-96 overflow-y-auto">
                {searchResults.map(product => (
                  <button
                    key={product._id}
                    onClick={() => addToReturn(product)}
                    className="w-full text-left bg-slate-700 hover:bg-slate-600 p-3 rounded-lg transition flex justify-between items-center group"
                  >
                    <div>
                      <p className="font-medium text-white">{product.name}</p>
                      <p className="text-sm text-gray-400">{product.sku}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-white">{formatCurrency(product.price)}</p>
                      <Plus className="w-4 h-4 text-green-500 opacity-0 group-hover:opacity-100 ml-auto transition" />
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Original Sales List */}
            {originalSales.length > 0 && (
              <div className="mt-4 border-t border-slate-700 pt-4">
                <p className="text-sm font-medium text-gray-300 mb-2">Original Invoices</p>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {originalSales.map(sale => (
                    <button
                      key={sale._id}
                      onClick={() => setOriginalSaleId(sale._id)}
                      className={`w-full text-left p-3 rounded-lg transition ${
                        originalSaleId === sale._id
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-700 hover:bg-slate-600 text-white'
                      }`}
                    >
                      <p className="font-medium">{sale.invoiceNumber}</p>
                      <p className="text-sm text-gray-300">
                        {new Date(sale.date).toLocaleDateString()}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Return Items List */}
          {returnItems.length > 0 && (
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
              <h3 className="font-bold text-white mb-4">Items to Return ({returnItems.length})</h3>
              <div className="space-y-3">
                {returnItems.map(item => (
                  <div
                    key={item._id}
                    className="bg-slate-700 rounded-lg p-4 flex items-center justify-between"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-white">{item.name}</p>
                      <p className="text-sm text-gray-400">{item.sku}</p>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-sm text-gray-400">Price</p>
                        <p className="font-bold text-white">{formatCurrency(item.price)}</p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateReturnQty(item._id, item.returnQty - 1)}
                          className="p-1 hover:bg-slate-600 rounded-lg transition"
                        >
                          <Minus className="w-4 h-4 text-white" />
                        </button>
                        <input
                          type="number"
                          value={item.returnQty}
                          onChange={(e) => updateReturnQty(item._id, parseInt(e.target.value))}
                          className="w-12 bg-slate-600 text-white text-center rounded py-1"
                        />
                        <button
                          onClick={() => updateReturnQty(item._id, item.returnQty + 1)}
                          className="p-1 hover:bg-slate-600 rounded-lg transition"
                        >
                          <Plus className="w-4 h-4 text-white" />
                        </button>
                      </div>

                      <div className="text-right min-w-24">
                        <p className="text-sm text-gray-400">Total</p>
                        <p className="font-bold text-white">{formatCurrency(item.lineTotal)}</p>
                      </div>

                      <button
                        onClick={() => removeFromReturn(item._id)}
                        className="p-1 hover:bg-red-600/20 rounded-lg transition"
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Return Reason Selection */}
          {returnItems.length > 0 && (
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
              <label className="block text-sm font-medium text-gray-300 mb-3">
                Return Reason
              </label>
              <select
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-orange-500 transition"
              >
                <option value="defective">Defective Product</option>
                <option value="customer_request">Customer Request</option>
                <option value="wrong_item">Wrong Item Received</option>
                <option value="damaged">Damaged in Transit</option>
              </select>
            </div>
          )}
        </div>

        {/* Right: Summary Panel */}
        <div className="lg:col-span-1">
          {/* Summary Card */}
          <div className="bg-gradient-to-br from-orange-600 to-orange-700 rounded-lg p-6 text-white sticky top-24">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Return Summary
            </h3>

            <div className="space-y-3 pb-4 border-b border-orange-500/30">
              <div className="flex justify-between">
                <span className="text-orange-100">Items to Return</span>
                <span className="font-bold">{totals.itemCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-orange-100">Subtotal</span>
                <span className="font-bold">{formatCurrency(totals.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-orange-100">Tax (5%)</span>
                <span className="font-bold">{formatCurrency(totals.taxAmount)}</span>
              </div>
            </div>

            <div className="mt-4 pt-4">
              <div className="flex justify-between MB-4">
                <span className="text-lg font-bold">Total Return</span>
                <span className="text-2xl font-bold">{formatCurrency(totals.total)}</span>
              </div>
            </div>

            {/* Process Button */}
            <button
              onClick={() => setShowConfirmation(true)}
              disabled={returnItems.length === 0 || isProcessing}
              className="w-full bg-white text-orange-600 font-bold py-3 rounded-lg hover:bg-orange-50 disabled:opacity-50 disabled:cursor-not-allowed transition mt-4"
            >
              {isProcessing ? 'Processing...' : 'Process Return'}
            </button>

            {/* Clear Button */}
            <button
              onClick={() => {
                setReturnItems([]);
                setSelectedCustomer(null);
                setOriginalSaleId('');
              }}
              className="w-full bg-orange-600/20 text-white font-bold py-2 rounded-lg hover:bg-orange-600/30 transition mt-2"
            >
              Clear All
            </button>
          </div>

          {/* Status Messages */}
          {message.text && (
            <div
              className={`mt-4 rounded-lg p-4 flex items-start gap-3 ${
                message.type === 'success'
                  ? 'bg-green-600/20 border border-green-600'
                  : 'bg-red-600/20 border border-red-600'
              }`}
            >
              {message.type === 'success' ? (
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              )}
              <p
                className={
                  message.type === 'success'
                    ? 'text-green-400 text-sm'
                    : 'text-red-400 text-sm'
                }
              >
                {message.text}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-lg max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-white mb-4">Confirm Return?</h3>
            <div className="bg-slate-700 rounded-lg p-4 mb-6 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Items</span>
                <span className="text-white font-bold">{totals.itemCount}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Total Return</span>
                <span className="text-white font-bold">{formatCurrency(totals.total)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Reason</span>
                <span className="text-white font-bold capitalize">{returnReason.replace('_', ' ')}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmation(false)}
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-bold py-2 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={handleProcessReturn}
                className="flex-1 bg-orange-600 hover:bg-orange-700 text-white font-bold py-2 rounded-lg transition"
              >
                Confirm Return
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default POSReturn;


