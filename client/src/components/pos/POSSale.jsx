/**
 * POS Sale Screen - Complete Transaction Interface
 * Features: Product search, barcode scanning, cart management, payment processing
 */

import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import {
  Search,
  Barcode,
  Trash2,
  Plus,
  Minus,
  Eye,
  ArrowLeft,
  CreditCard,
  Power,
  Percent,
  DollarSign,
  Clock,
} from 'lucide-react';
import { useDecimalFormat } from '../../hooks';

const API_URL = import.meta.env.VITE_API_URL || '/api/v1';

export const POSSale = ({ onBack, terminalId }) => {
  const { formatCurrency, formatNumber } = useDecimalFormat();
  
  // State Management
  const [cartItems, setCartItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  
  const barcodeInputRef = useRef(null);
  const searchInputRef = useRef(null);

  // Search products by name or barcode
  const handleSearch = async (term) => {
    setSearchTerm(term);
    
    if (term.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await axios.get(`${API_URL}/api/v1/inventory/products/search`, {
        params: { query: term, limit: 10 }
      });
      setSearchResults(response.data.data || []);
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setIsSearching(false);
    }
  };

  // Add product to cart
  const addToCart = (product) => {
    const existingItem = cartItems.find(item => item._id === product._id);
    
    if (existingItem) {
      // Increase quantity
      updateCartItemQty(product._id, existingItem.quantity + 1);
    } else {
      // Add new item
      setCartItems([
        ...cartItems,
        {
          ...product,
          quantity: 1,
          lineTotal: product.price
        }
      ]);
    }

    // Clear search
    setSearchTerm('');
    setSearchResults([]);
    searchInputRef.current?.focus();
  };

  // Update cart item quantity
  const updateCartItemQty = (productId, newQty) => {
    if (newQty < 1) {
      removeFromCart(productId);
      return;
    }

    setCartItems(
      cartItems.map(item =>
        item._id === productId
          ? {
              ...item,
              quantity: newQty,
              lineTotal: item.price * newQty
            }
          : item
      )
    );
  };

  // Remove from cart
  const removeFromCart = (productId) => {
    setCartItems(cartItems.filter(item => item._id !== productId));
  };

  // Calculate totals
  const calculateTotals = () => {
    const subtotal = cartItems.reduce((sum, item) => sum + item.lineTotal, 0);
    const discount = (subtotal * discountPercent) / 100;
    const taxBase = subtotal - discount;
    const tax = taxBase * 0.05; // 5% VAT for UAE
    const total = taxBase + tax;

    return {
      subtotal,
      discountAmount: discount,
      taxBase,
      taxAmount: tax,
      total
    };
  };

  const totals = calculateTotals();

  // Process payment
  const handleCheckout = async () => {
    if (cartItems.length === 0) {
      alert('Cart is empty');
      return;
    }

    setIsProcessing(true);
    try {
      const response = await axios.post(`${API_URL}/api/v1/pos/sales/create`, {
        terminalId,
        customerId: selectedCustomer?._id || null,
        items: cartItems.map(item => ({
          productId: item._id,
          quantity: item.quantity,
          unitPrice: item.price,
          description: item.name
        })),
        subtotalAmount: totals.subtotal,
        discountPercent,
        discountAmount: totals.discountAmount,
        taxAmount: totals.taxAmount,
        totalAmount: totals.total,
        paymentMode,
        paymentReference: ''
      });

      // Show receipt
      if (response.data.success) {
        alert('Sale completed successfully!');
        printReceipt(response.data.data);
        
        // Reset cart
        setCartItems([]);
        setDiscountPercent(0);
        setSelectedCustomer(null);
        setPaymentMode('Cash');
        setShowPaymentModal(false);
      }
    } catch (err) {
      console.error('Checkout error:', err);
      alert('Error processing sale: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // Print receipt
  const printReceipt = (sale) => {
    const receiptContent = `
      ════════════════════════════════════
      RECEIPT
      ════════════════════════════════════
      Terminal: ${terminalId}
      Date: ${new Date().toLocaleString()}
      
      ITEMS:
      ${cartItems.map(item => `
      ${item.name}
      ${item.quantity} × ${formatCurrency(item.price)} = ${formatCurrency(item.lineTotal)}
      `).join('')}
      
      ────────────────────────────────────
      SUBTOTAL:        ${formatCurrency(totals.subtotal)}
      Discount:        -${formatCurrency(totals.discountAmount)}
      Tax (5%):        ${formatCurrency(totals.taxAmount)}
      TOTAL:           ${formatCurrency(totals.total)}
      
      Payment Method: ${paymentMode}
      Status: Completed
      ════════════════════════════════════
      Thank you for your purchase!
      ════════════════════════════════════
    `;

    // In real implementation, send to thermal printer
    console.log(receiptContent);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white">
      {/* Header */}
      <div className="bg-slate-950 border-b border-slate-700 p-4 flex justify-between items-center sticky top-0 z-40">
        <button
          onClick={onBack}
          className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded-lg transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Menu
        </button>
        <h1 className="text-2xl font-bold">POS SALE</h1>
        <div className="text-sm text-gray-400">
          <Clock className="w-4 h-4 inline mr-1" />
          {new Date().toLocaleTimeString()}
        </div>
      </div>

      <div className="flex h-[calc(100vh-80px)]">
        {/* Main Sale Area - Left Side (70%) */}
        <div className="flex-1 flex flex-col overflow-hidden border-r border-slate-700">
          {/* Search & Add Products */}
          <div className="bg-slate-800 border-b border-slate-700 p-4 space-y-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search products by name or scan barcode..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg py-2 pl-10 pr-4 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Barcode Input (hidden, for scanner) */}
            <input
              ref={barcodeInputRef}
              type="text"
              placeholder="Barcode"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.currentTarget.value) {
                  handleSearch(e.currentTarget.value);
                  e.currentTarget.value = '';
                }
              }}
              className="hidden"
            />

            {/* Search Results */}
            {searchTerm && (
              <div className="max-h-40 overflow-y-auto bg-slate-700 rounded-lg">
                {isSearching ? (
                  <div className="p-4 text-center text-gray-400">Searching...</div>
                ) : searchResults.length > 0 ? (
                  searchResults.map(product => (
                    <button
                      key={product._id}
                      onClick={() => addToCart(product)}
                      className="w-full text-left p-3 hover:bg-slate-600 border-b border-slate-600 last:border-b-0 transition"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">{product.name}</p>
                          <p className="text-xs text-gray-400">SKU: {product.itemCode}</p>
                        </div>
                        <p className="font-bold">{formatCurrency(product.price)}</p>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="p-4 text-center text-gray-400">No products found</div>
                )}
              </div>
            )}
          </div>

          {/* Cart Items Display */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {cartItems.length > 0 ? (
              cartItems.map(item => (
                <div
                  key={item._id}
                  className="bg-slate-800 border border-slate-700 rounded-lg p-4 hover:bg-slate-700 transition"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-bold">{item.name}</h3>
                      <p className="text-sm text-gray-400">{formatCurrency(item.price)} each</p>
                    </div>
                    <button
                      onClick={() => removeFromCart(item._id)}
                      className="text-red-500 hover:text-red-400 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Quantity Controls */}
                  <div className="flex items-center justify-between bg-slate-700 rounded-lg p-2">
                    <button
                      onClick={() => updateCartItemQty(item._id, item.quantity - 1)}
                      className="text-yellow-500 hover:text-yellow-400 transition p-1"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => updateCartItemQty(item._id, parseInt(e.target.value) || 1)}
                      className="w-12 bg-slate-600 text-center text-white border-0 rounded font-bold"
                      min="1"
                    />
                    <button
                      onClick={() => updateCartItemQty(item._id, item.quantity + 1)}
                      className="text-green-500 hover:text-green-400 transition p-1"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                    <div className="ml-auto font-bold text-lg">
                      {formatCurrency(item.lineTotal)}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center text-gray-400">
                  <Eye className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No items in cart</p>
                  <p className="text-sm">Search and add products above</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar - Summary & Payment (30%) */}
        <div className="w-80 bg-slate-800 border-l border-slate-700 flex flex-col overflow-hidden">
          {/* Customer Info */}
          <div className="border-b border-slate-700 p-4">
            <label className="text-xs text-gray-400 uppercase block mb-2">Customer</label>
            <input
              type="text"
              placeholder="Walk-in Customer"
              value={selectedCustomer?.name || ''}
              onChange={(e) => {
                // Implement customer search later
              }}
              className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Discount Section */}
          <div className="border-b border-slate-700 p-4">
            <label className="text-xs text-gray-400 uppercase block mb-2">Discount %</label>
            <div className="flex gap-2">
              <input
                type="number"
                value={discountPercent}
                onChange={(e) => setDiscountPercent(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
                className="flex-1 bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="0"
                max="100"
              />
              <div className="bg-slate-700 px-3 py-2 rounded text-yellow-500 font-bold">
                {discountPercent}%
              </div>
            </div>
          </div>

          {/* Totals Summary */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 border-b border-slate-700">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Subtotal:</span>
                <span>{formatCurrency(totals.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Discount:</span>
                <span className="text-red-400">-{formatCurrency(totals.discountAmount)}</span>
              </div>
              <div className="flex justify-between text-sm border-t border-slate-700 pt-2">
                <span className="text-gray-400">Taxable Amount:</span>
                <span>{formatCurrency(totals.taxBase)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Tax (5%):</span>
                <span className="text-blue-400">{formatCurrency(totals.taxAmount)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold border-t border-slate-700 pt-2">
                <span>TOTAL:</span>
                <span className="text-green-400">{formatCurrency(totals.total)}</span>
              </div>
            </div>
          </div>

          {/* Payment Method Selection */}
          <div className="border-b border-slate-700 p-4">
            <label className="text-xs text-gray-400 uppercase block mb-2">Payment Method</label>
            <select
              value={paymentMode}
              onChange={(e) => setPaymentMode(e.target.value)}
              className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="Cash">💵 Cash</option>
              <option value="Card">💳 Card</option>
              <option value="Cheque">✓ Cheque</option>
              <option value="Online">🌐 Online</option>
            </select>
          </div>

          {/* Action Buttons */}
          <div className="p-4 space-y-3">
            <button
              onClick={() => setShowPaymentModal(true)}
              disabled={cartItems.length === 0 || isProcessing}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:opacity-50 py-3 rounded-lg font-bold transition flex items-center justify-center gap-2"
            >
              <CreditCard className="w-5 h-5" />
              {isProcessing ? 'Processing...' : 'CHECKOUT'}
            </button>
            <button
              onClick={() => {
                setCartItems([]);
                setDiscountPercent(0);
                setSelectedCustomer(null);
              }}
              className="w-full bg-red-600 hover:bg-red-700 py-2 rounded-lg font-bold transition flex items-center justify-center gap-2"
            >
              <Power className="w-4 h-4" />
              Clear Cart
            </button>
          </div>
        </div>
      </div>

      {/* Payment Confirmation Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold mb-4">Confirm Payment</h2>
            
            <div className="bg-slate-700 rounded-lg p-4 mb-4">
              <p className="text-sm text-gray-400">Total Amount</p>
              <p className="text-3xl font-bold text-green-400">
                {formatCurrency(totals.total)}
              </p>
            </div>

            <div className="mb-4 space-y-2">
              <p className="text-sm text-gray-400">Payment Method: <span className="text-white font-bold">{paymentMode}</span></p>
              <p className="text-sm text-gray-400">Items: <span className="text-white font-bold">{cartItems.length}</span></p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowPaymentModal(false)}
                className="flex-1 bg-slate-700 hover:bg-slate-600 py-2 rounded-lg font-bold transition"
              >
                Cancel
              </button>
              <button
                onClick={handleCheckout}
                disabled={isProcessing}
                className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 py-2 rounded-lg font-bold transition"
              >
                {isProcessing ? 'Processing...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default POSSale;


