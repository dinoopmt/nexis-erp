/**
 * GrnItemSearch Component
 * Item search input with dropdown suggestions
 */
import React from "react";
import { Search, Plus } from "lucide-react";

const GrnItemSearch = ({ itemSearch, searchResults, searchLoading, onSearch, onSelectItem, onCreateProduct }) => {
  const filteredItems = searchResults.slice(0, 10);

  return (
    <div className="relative w-full">
      <div className="relative flex items-center gap-2">
        <Search size={16} className="absolute left-3 text-gray-400" />
        <input
          type="text"
          value={itemSearch}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Search by name or code..."
          className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
        />

        {/* ✅ CREATE PRODUCT BUTTON - Open product modal without closing GRN */}
        <button
          onClick={onCreateProduct}
          title="Create new product"
          className="flex-shrink-0 p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          <Plus size={16} />
        </button>

        {searchLoading && (
          <div className="absolute right-12 top-1/2 -translate-y-1/2">
            <div className="animate-spin h-4 w-4 border-2 border-green-500 border-t-transparent rounded-full"></div>
          </div>
        )}
      </div>

      {/* Results Dropdown */}
      {filteredItems.length > 0 && !searchLoading && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-10 max-h-64 overflow-y-auto">
          {filteredItems.map((product) => {
            const displayCode = product.itemcode || product.sku || product.code || "-";
            const displayCost = product.cost || 0;
            const displayPrice = product.price || product.rate || 0;
            const displayUnit = product.unitType?.unitSymbol || product.unit || "PC";
            const displayName = product.name || product.productName || "";
            
            // Get tax percentage
            let taxPercent = 0;
            if (product.tax) {
              if (typeof product.tax === 'object') {
                taxPercent = product.tax.percent || product.tax.rate || 0;
              } else {
                taxPercent = product.tax;
              }
            } else if (product.taxPercent) {
              taxPercent = product.taxPercent;
            } else if (product.rate && typeof product.rate === "number" && product.rate > 0 && product.rate < 100) {
              taxPercent = product.rate;
            }

            return (
              <div
                key={product._id || product.id}
                onClick={() => onSelectItem(product)}
                className="px-3 py-2 hover:bg-blue-50 cursor-pointer border-b last:border-b-0"
              >
                <div className="font-semibold text-sm mb-1">{displayName}</div>

                <div className="grid grid-cols-4 gap-2 text-xs">
                  <div>
                    <span className="text-gray-500 text-[10px]">Code</span>
                    <div className="text-gray-800 font-medium">{displayCode}</div>
                  </div>
                  <div>
                    <span className="text-gray-500 text-[10px]">Cost</span>
                    <div className="text-gray-800 font-medium">{displayCost}</div>
                  </div>
                  <div>
                    <span className="text-gray-500 text-[10px]">Unit</span>
                    <div className="text-gray-800 font-medium">{displayUnit}</div>
                  </div>
                  <div>
                    <span className="text-gray-500 text-[10px]">Price</span>
                    <div className="text-gray-800 font-medium">{displayPrice}</div>
                  </div>
                </div>

                {taxPercent > 0 && (
                  <div className="text-xs mt-1 text-blue-600">
                    Tax: <span className="font-medium">{taxPercent}%</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default GrnItemSearch;


