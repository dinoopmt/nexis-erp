import React from "react";
import { Package, X } from "lucide-react";

export default function ProductLookupModal({
  show,
  onClose,
  itemSearch,
  onSearchChange,
  filteredProducts,
  onAddProduct,
  config,
  formatNumber,
}) {
  if (!show) return null;

  return (
    <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-96 flex flex-col">
        <div className="flex justify-between items-center px-6 py-4 border-b bg-gray-50">
          <h2 className="text-sm font-bold text-gray-800 flex items-center gap-2">
            <Package size={18} className="text-blue-600" />
            Product Lookup
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={18} />
          </button>
        </div>
        <div className="px-6 py-2 border-b bg-white">
          <input
            type="text"
            placeholder="Search products by name, code, or barcode..."
            value={itemSearch}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full px-4 py-1.5 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {filteredProducts.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              {itemSearch.trim()
                ? "No products found"
                : "Search for products"}
            </p>
          ) : (
            <div className="space-y-2">
              {filteredProducts.map((product) => (
                <button
                  key={product._id}
                  onClick={() => {
                    onAddProduct(product);
                    onClose();
                  }}
                  className="w-full text-left p-2 hover:bg-blue-50 border border-gray-200 rounded-lg transition"
                >
                  <div className="flex justify-between items-start gap-3">
                    <div className="flex-1">
                      <p className="font-semibold text-gray-800">
                        {product.name}
                      </p>
                      <div className="flex gap-4 text-xs text-gray-600 mt-1">
                        <span>Code: {product.itemcode}</span>
                        <span>Barcode: {product.barcode}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex flex-col gap-1">
                        <div className="flex gap-3 text-xs">
                          <div>
                            <p className="text-gray-500">Cost</p>
                            <p className="font-semibold text-gray-800">
                              {config.currency || 'AED'} {formatNumber(product.cost) || "0.00"}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-500">Price</p>
                            <p className="font-semibold text-gray-800">
                              {config.currency || 'AED'} {formatNumber(product.price) || "0.00"}
                            </p>
                          </div>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">
                          VAT: {product.tax}%
                        </p>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
