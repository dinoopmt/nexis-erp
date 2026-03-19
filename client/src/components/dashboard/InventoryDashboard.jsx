import React, { useState, useEffect, useContext } from "react";
import axios from "axios";
import { CompanyContext } from "../../context/CompanyContext";
import {
  Package,
  AlertCircle,
  DollarSign,
  TrendingDown,
  Clock,
  AlertTriangle,
} from "lucide-react";

const InventoryDashboard = () => {
  const { company } = useContext(CompanyContext);
  const [stats, setStats] = useState({
    totalProducts: 0,
    lowStockItems: 0,
    criticalItems: 0,
    totalInventoryValue: 0,
    recentMovements: 0,
    expiringBatches: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lowStockProducts, setLowStockProducts] = useState([]);

  useEffect(() => {
    fetchInventoryStats();
  }, [company?.id]);

  const fetchInventoryStats = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!company?.id) return;

      // Get all products for this company
      const productsRes = await axios.get("/api/v1/products", {
        params: { country: company.country },
      });
      const products = productsRes.data || [];

      // Calculate stats
      let lowStock = 0;
      let critical = 0;
      let totalValue = 0;
      const lowStockList = [];

      // Get current stock for each product
      for (const product of products) {
        try {
          const stockRes = await axios.get(`/api/v1/stock/product/${product._id}`);
          const currentStock = stockRes.data?.currentStock || 0;
          const unitCost = product.cost || 0;
          const productValue = currentStock * unitCost;

          totalValue += productValue;

          // Check stock levels
          const minStock = product.minStock || 0;
          const maxStock = product.maxStock || 0;

          if (currentStock === 0) {
            critical++;
            lowStockList.push({
              name: product.itemname,
              code: product.itemcode,
              current: currentStock,
              min: minStock,
              status: "CRITICAL",
            });
          } else if (currentStock <= minStock) {
            lowStock++;
            lowStockList.push({
              name: product.itemname,
              code: product.itemcode,
              current: currentStock,
              min: minStock,
              status: "LOW",
            });
          }
        } catch (e) {
          // Skip products without stock data
        }
      }

      // Get recent movements count
      let recentCount = 0;
      try {
        const movementsRes = await axios.get("/api/v1/stock-movement", {
          params: { country: company.country, limit: 100 },
        });
        recentCount = (movementsRes.data || []).length;
      } catch (e) {
        // Skip if endpoint not available
      }

      // Get expiring batches
      let expiringCount = 0;
      try {
        const today = new Date();
        const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

        const batchesRes = await axios.get("/api/v1/inventory-batch", {
          params: { country: company.country },
        });
        const batches = batchesRes.data || [];
        expiringCount = batches.filter((b) => {
          if (!b.expiryDate) return false;
          const expiryDate = new Date(b.expiryDate);
          return expiryDate <= thirtyDaysFromNow && expiryDate >= today;
        }).length;
      } catch (e) {
        // Skip if endpoint not available
      }

      setStats({
        totalProducts: products.length,
        lowStockItems: lowStock,
        criticalItems: critical,
        totalInventoryValue: totalValue,
        recentMovements: recentCount,
        expiringBatches: expiringCount,
      });

      // Sort low stock items and take top 5
      setLowStockProducts(
        lowStockList.sort((a, b) => a.current - b.current).slice(0, 5)
      );
    } catch (err) {
      console.error("Error fetching inventory stats:", err);
      setError("Failed to load inventory statistics");
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ icon: Icon, title, value, subtitle, bgColor, textColor }) => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600 font-medium">{title}</p>
          <p className={`text-2xl font-bold ${textColor}`}>{value}</p>
          {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
        </div>
        <div className={`${bgColor} p-3 rounded-lg`}>
          <Icon className="text-white w-6 h-6" />
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 animate-pulse"
          >
            <div className="h-4 bg-gray-200 rounded w-24 mb-3"></div>
            <div className="h-8 bg-gray-200 rounded w-16"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          icon={Package}
          title="Total Products"
          value={stats.totalProducts}
          bgColor="bg-blue-500"
          textColor="text-blue-600"
          subtitle="Across all categories"
        />

        <StatCard
          icon={AlertTriangle}
          title="Critical Items"
          value={stats.criticalItems}
          bgColor="bg-red-500"
          textColor="text-red-600"
          subtitle="Out of stock items"
        />

        <StatCard
          icon={AlertCircle}
          title="Low Stock Items"
          value={stats.lowStockItems}
          bgColor="bg-yellow-500"
          textColor="text-yellow-600"
          subtitle="Below minimum level"
        />

        <StatCard
          icon={DollarSign}
          title="Inventory Value"
          value={`${company?.currency || "USD"} ${(
            stats.totalInventoryValue / (10 ** (company?.decimalPlaces || 2))
          ).toLocaleString("en-US", {
            minimumFractionDigits: company?.decimalPlaces || 2,
            maximumFractionDigits: company?.decimalPlaces || 2,
          })}`}
          bgColor="bg-green-500"
          textColor="text-green-600"
          subtitle="Total stock value at cost"
        />

        <StatCard
          icon={Clock}
          title="Recent Movements"
          value={stats.recentMovements}
          bgColor="bg-purple-500"
          textColor="text-purple-600"
          subtitle="Last 100 transactions"
        />

        <StatCard
          icon={TrendingDown}
          title="Expiring Soon"
          value={stats.expiringBatches}
          bgColor="bg-orange-500"
          textColor="text-orange-600"
          subtitle="Within 30 days"
        />
      </div>

      {/* Low Stock Products Table */}
      {lowStockProducts.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="w-5 h-5 text-yellow-600" />
            <h3 className="font-semibold text-gray-800">
              Low Stock Items ({lowStockProducts.length})
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-200 bg-gray-50">
                <tr>
                  <th className="text-left py-2 px-3 font-medium text-gray-700">
                    Code
                  </th>
                  <th className="text-left py-2 px-3 font-medium text-gray-700">
                    Product Name
                  </th>
                  <th className="text-center py-2 px-3 font-medium text-gray-700">
                    Current
                  </th>
                  <th className="text-center py-2 px-3 font-medium text-gray-700">
                    Minimum
                  </th>
                  <th className="text-center py-2 px-3 font-medium text-gray-700">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {lowStockProducts.map((product, idx) => (
                  <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-2 px-3 font-mono text-xs text-gray-600">
                      {product.code}
                    </td>
                    <td className="py-2 px-3 text-gray-800 truncate max-w-xs">
                      {product.name}
                    </td>
                    <td className="py-2 px-3 text-center number-column text-gray-700">
                      {product.current}
                    </td>
                    <td className="py-2 px-3 text-center number-column text-gray-700">
                      {product.min}
                    </td>
                    <td className="py-2 px-3 text-center">
                      {product.status === "CRITICAL" ? (
                        <span className="inline-block px-2 py-1 text-xs font-medium bg-red-100 text-red-700 rounded-full">
                          Critical
                        </span>
                      ) : (
                        <span className="inline-block px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-700 rounded-full">
                          Low
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
          {error}
        </div>
      )}
    </div>
  );
};

export default InventoryDashboard;


