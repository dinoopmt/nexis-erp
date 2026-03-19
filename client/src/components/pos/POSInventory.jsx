/**
 * POS Inventory Screen
 * Product stock management and availability
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Package,
  ChevronLeft,
  Search,
  AlertCircle,
  TrendingDown,
  CheckCircle,
  RefreshCw,
  Zap
} from 'lucide-react';
import { useDecimalFormat } from '../../hooks/useDecimalFormat';

const API_URL = import.meta.env.VITE_API_URL || '/api/v1';

export const POSInventory = ({ terminalId, onBack }) => {
  const { formatCurrency } = useDecimalFormat();

  // State management
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasLowStock, setHasLowStock] = useState([]);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Fetch inventory data
  useEffect(() => {
    fetchInventoryData();
  }, []);

  // Filter products when search term or category changes
  useEffect(() => {
    let filtered = [...products];

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(p => p.category === selectedCategory);
    }

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        p =>
          p.name.toLowerCase().includes(term) ||
          p.sku.toLowerCase().includes(term) ||
          (p.barcode && p.barcode.includes(term))
      );
    }

    setFilteredProducts(filtered);
  }, [searchTerm, selectedCategory, products]);

  const fetchInventoryData = async () => {
    try {
      setIsLoading(true);
      setMessage({ type: '', text: '' });

      // Fetch products
      const productsRes = await axios.get(
        `${API_URL}/api/v1/inventory/products?terminal=${terminalId}&includeStock=true`
      );
      setProducts(productsRes.data.data || []);

      // Fetch categories
      const categoriesRes = await axios.get(`${API_URL}/api/v1/inventory/categories`);
      setCategories(categoriesRes.data.data || []);

      // Identify low stock items
      const low = productsRes.data.data?.filter(
        p => p.stock && p.stock.available < p.minimumStock
      ) || [];
      setHasLowStock(low);

      if (low.length > 0) {
        setMessage({
          type: 'warning',
          text: `${low.length} product(s) have low stock levels`
        });
      }
    } catch (error) {
      console.error('Error fetching inventory:', error);
      setMessage({
        type: 'error',
        text: 'Failed to load inventory data'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Get stock status color
  const getStockStatus = (product) => {
    if (!product.stock) return { color: 'text-gray-400', label: 'Unknown' };

    const available = product.stock.available;
    const minimum = product.minimumStock || 10;

    if (available === 0) {
      return { color: 'text-red-500', label: 'Out of Stock' };
    } else if (available < minimum) {
      return { color: 'text-yellow-500', label: 'Low Stock' };
    } else if (available < minimum * 2) {
      return { color: 'text-orange-500', label: 'Running Low' };
    } else {
      return { color: 'text-green-500', label: 'In Stock' };
    }
  };

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
                <Package className="w-6 h-6 text-blue-500" />
                Inventory Management
              </h1>
              <p className="text-sm text-gray-400">
                {products.length} product{products.length !== 1 ? 's' : ''} available
              </p>
            </div>
          </div>
          <button
            onClick={fetchInventoryData}
            disabled={isLoading}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold px-4 py-2 rounded-lg transition flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Sync
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6 max-w-7xl mx-auto">
        {/* Filters Bar */}
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 mb-6 space-y-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Search Products
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-3 w-5 h-5 text-gray-500" />
              <input
                type="text"
                placeholder="Search by name, SKU, or barcode..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg pl-10 pr-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              />
            </div>
          </div>

          {/* Category Filter */}
          {categories.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Category
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedCategory('all')}
                  className={`px-4 py-2 rounded-lg transition font-medium ${
                    selectedCategory === 'all'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                  }`}
                >
                  All
                </button>
                {categories.map(cat => (
                  <button
                    key={cat._id}
                    onClick={() => setSelectedCategory(cat._id)}
                    className={`px-4 py-2 rounded-lg transition font-medium ${
                      selectedCategory === cat._id
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Status Message */}
        {message.text && (
          <div
            className={`mb-6 rounded-lg p-4 flex items-start gap-3 ${
              message.type === 'error'
                ? 'bg-red-600/20 border border-red-600'
                : message.type === 'warning'
                ? 'bg-yellow-600/20 border border-yellow-600'
                : 'bg-green-600/20 border border-green-600'
            }`}
          >
            {message.type === 'error' ? (
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            ) : message.type === 'warning' ? (
              <TrendingDown className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
            ) : (
              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
            )}
            <p
              className={`text-sm ${
                message.type === 'error'
                  ? 'text-red-400'
                  : message.type === 'warning'
                  ? 'text-yellow-400'
                  : 'text-green-400'
              }`}
            >
              {message.text}
            </p>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-12">
            <Zap className="w-8 h-8 text-blue-500 mx-auto animate-spin mb-4" />
            <p className="text-gray-400">Loading inventory...</p>
          </div>
        )}

        {/* Products Grid */}
        {!isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredProducts.length > 0 ? (
              filteredProducts.map(product => {
                const status = getStockStatus(product);
                const isLow = hasLowStock.some(p => p._id === product._id);

                return (
                  <div
                    key={product._id}
                    className={`bg-slate-800 border rounded-lg p-4 hover:border-blue-500 transition ${
                      isLow ? 'border-yellow-500' : 'border-slate-700'
                    }`}
                  >
                    {/* Product Image */}
                    {product.image && (
                      <div className="mb-4 bg-slate-700 rounded-lg h-32 overflow-hidden">
                        <img
                          src={product.image}
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}

                    {/* Product Info */}
                    <div className="space-y-2">
                      <div>
                        <h3 className="font-bold text-white truncate">{product.name}</h3>
                        <p className="text-xs text-gray-400">{product.sku}</p>
                      </div>

                      {/* Price */}
                      <div className="flex justify-between items-center pt-2 border-t border-slate-700">
                        <span className="text-sm text-gray-400">Price</span>
                        <span className="font-bold text-white">
                          {formatCurrency(product.price)}
                        </span>
                      </div>

                      {/* Stock Status */}
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-400">Stock</span>
                        <div className="text-right">
                          <p className={`font-bold text-sm ${status.color}`}>
                            {product.stock?.available || 0}
                          </p>
                          <p className="text-xs text-gray-400">
                            {status.label}
                          </p>
                        </div>
                      </div>

                      {/* Additional Info */}
                      {product.stock && (
                        <div className="text-xs text-gray-400 space-y-1 pt-2 border-t border-slate-700">
                          <div className="flex justify-between">
                            <span>Reserved:</span>
                            <span>{product.stock.reserved || 0}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>In Transit:</span>
                            <span>{product.stock.inTransit || 0}</span>
                          </div>
                        </div>
                      )}

                      {/* Low Stock Alert */}
                      {isLow && (
                        <div className="mt-3 bg-yellow-600/20 border border-yellow-600 rounded-lg p-2 flex items-center gap-2">
                          <TrendingDown className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                          <p className="text-xs text-yellow-400 font-medium">
                            Low stock - Consider reordering
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="col-span-full text-center py-12">
                <Package className="w-8 h-8 text-gray-500 mx-auto mb-4" />
                <p className="text-gray-400">No products found</p>
              </div>
            )}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && products.length === 0 && (
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-12 text-center">
            <Package className="w-12 h-12 text-gray-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">No Inventory Found</h3>
            <p className="text-gray-400 mb-4">Sync inventory to load products</p>
            <button
              onClick={fetchInventoryData}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-2 rounded-lg transition"
            >
              Sync Inventory
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default POSInventory;


