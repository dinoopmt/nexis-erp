import React, { useState } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import useDecimalFormat from "../../hooks/useDecimalFormat";
import InventoryDashboard from "../dashboard/InventoryDashboard";

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState("sales");
  const { formatNumber, currency } = useDecimalFormat();
  // 10 Days of Data Analysis
  const tenDaysData = [
    { day: "Day 1", sales: 12000, purchase: 8000, stock: 45000, items: 150 },
    { day: "Day 2", sales: 15000, purchase: 10000, stock: 47000, items: 155 },
    { day: "Day 3", sales: 18000, purchase: 12000, stock: 49000, items: 162 },
    { day: "Day 4", sales: 14000, purchase: 9500, stock: 51000, items: 168 },
    { day: "Day 5", sales: 20000, purchase: 14000, stock: 53000, items: 175 },
    { day: "Day 6", sales: 22000, purchase: 15000, stock: 55000, items: 182 },
    { day: "Day 7", sales: 25000, purchase: 16000, stock: 57000, items: 189 },
    { day: "Day 8", sales: 19000, purchase: 13000, stock: 59000, items: 195 },
    { day: "Day 9", sales: 23000, purchase: 17000, stock: 61000, items: 202 },
    { day: "Day 10", sales: 28000, purchase: 19000, stock: 63000, items: 210 },
  ];

  // Calculate Summary Stats
  const totalSales = tenDaysData.reduce((sum, d) => sum + d.sales, 0);
  const totalPurchase = tenDaysData.reduce((sum, d) => sum + d.purchase, 0);
  const avgDailySales = (totalSales / tenDaysData.length).toFixed(0);
  const avgDailyPurchase = (totalPurchase / tenDaysData.length).toFixed(0);
  const currentStock = tenDaysData[tenDaysData.length - 1].stock;
  const maxStock = Math.max(...tenDaysData.map(d => d.stock));
  const profit = totalSales - totalPurchase;
  const profitMargin = ((profit / totalSales) * 100).toFixed(1);

  // Stock Category Distribution
  const stockDistribution = [
    { name: "Electronics", value: 35, color: "#3b82f6" },
    { name: "Clothing", value: 28, color: "#10b981" },
    { name: "Home", value: 22, color: "#f59e0b" },
    { name: "Others", value: 15, color: "#8b5cf6" },
  ];

  return (
    <div className="p-3 bg-gray-100 min-h-screen">
      {/* Tab Navigation */}
      <div className="mb-4 flex gap-2 border-b border-gray-300">
        <button
          onClick={() => setActiveTab("sales")}
          className={`px-4 py-2 font-medium text-sm transition-colors ${
            activeTab === "sales"
              ? "text-blue-600 border-b-2 border-blue-600"
              : "text-gray-600 hover:text-gray-800"
          }`}
        >
          Sales Dashboard
        </button>
        <button
          onClick={() => setActiveTab("inventory")}
          className={`px-4 py-2 font-medium text-sm transition-colors ${
            activeTab === "inventory"
              ? "text-blue-600 border-b-2 border-blue-600"
              : "text-gray-600 hover:text-gray-800"
          }`}
        >
          Inventory Dashboard
        </button>
      </div>

      {/* Sales Dashboard Tab */}
      {activeTab === "sales" && (
        <>
          {/* Header */}
          <div className="mb-4">
            <h1 className="text-xl font-bold text-gray-800">Sales & Purchase Dashboard</h1>
            <p className="text-gray-600 text-xs mt-0.5">Last 10 Days Analysis</p>
          </div>

          {/* Summary Cards - Row 1 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-3 rounded-lg shadow-lg">
              <p className="text-xs opacity-90">Total Sales (10 Days)</p>
              <p className="text-2xl font-bold mt-1">{currency} {formatNumber((totalSales / 100000))}L</p>
              <p className="text-xs opacity-75 mt-0.5">Avg: {currency}{formatNumber(avgDailySales)}</p>
            </div>

            <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-3 rounded-lg shadow-lg">
              <p className="text-xs opacity-90">Total Purchase (10 Days)</p>
              <p className="text-2xl font-bold mt-1">{currency} {formatNumber((totalPurchase / 100000))}L</p>
              <p className="text-xs opacity-75 mt-0.5">Avg: {currency}{formatNumber(avgDailyPurchase)}</p>
            </div>

            <div className="bg-gradient-to-br from-green-500 to-green-600 text-white p-3 rounded-lg shadow-lg">
              <p className="text-xs opacity-90">Total Profit</p>
              <p className="text-2xl font-bold mt-1">{currency} {formatNumber((profit / 100000))}L</p>
              <p className="text-xs opacity-75 mt-0.5">Margin: {profitMargin}%</p>
            </div>

            <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white p-3 rounded-lg shadow-lg">
              <p className="text-xs opacity-90">Current Stock</p>
              <p className="text-2xl font-bold mt-1">{currency} {formatNumber((currentStock / 100000))}L</p>
              <p className="text-xs opacity-75 mt-0.5">Max: {currency}{formatNumber((maxStock / 100000))}L</p>
            </div>
          </div>

          {/* Charts - Row 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-4">
            {/* Sales & Purchase Trend */}
            <div className="bg-white p-3 rounded-lg shadow-md">
              <h3 className="text-sm font-semibold text-gray-800 mb-2">Sales & Purchase Trend</h3>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={tenDaysData}>
                  <defs>
                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1} />
                    </linearGradient>
                    <linearGradient id="colorPurchase" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#a855f7" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#a855f7" stopOpacity={0.1} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="day" stroke="#6b7280" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#6b7280" tick={{ fontSize: 11 }} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151", borderRadius: "8px", color: "#fff", fontSize: "12px" }}
                    formatter={(value) => `₹${value.toLocaleString()}`}
                  />
                  <Legend wrapperStyle={{ fontSize: "12px" }} />
                  <Area type="monotone" dataKey="sales" stroke="#3b82f6" fillOpacity={1} fill="url(#colorSales)" />
                  <Area type="monotone" dataKey="purchase" stroke="#a855f7" fillOpacity={1} fill="url(#colorPurchase)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Stock Level Trend */}
            <div className="bg-white p-3 rounded-lg shadow-md">
              <h3 className="text-sm font-semibold text-gray-800 mb-2">Stock Level Trend</h3>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={tenDaysData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="day" stroke="#6b7280" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#6b7280" tick={{ fontSize: 11 }} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151", borderRadius: "8px", color: "#fff", fontSize: "12px" }}
                    formatter={(value) => `₹${value.toLocaleString()}`}
                  />
                  <Legend wrapperStyle={{ fontSize: "12px" }} />
                  <Line type="monotone" dataKey="stock" stroke="#10b981" strokeWidth={2} dot={{ fill: "#10b981", r: 3 }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Charts - Row 2 */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            {/* Daily Sales vs Purchase Bar Chart */}
            <div className="lg:col-span-2 bg-white p-3 rounded-lg shadow-md">
              <h3 className="text-sm font-semibold text-gray-800 mb-2">Daily Sales vs Purchase</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={tenDaysData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="day" stroke="#6b7280" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#6b7280" tick={{ fontSize: 11 }} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151", borderRadius: "8px", color: "#fff", fontSize: "12px" }}
                    formatter={(value) => `₹${value.toLocaleString()}`}
                  />
                  <Legend wrapperStyle={{ fontSize: "12px" }} />
                  <Bar dataKey="sales" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="purchase" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Stock Category Distribution Pie */}
            <div className="bg-white p-3 rounded-lg shadow-md">
              <h3 className="text-sm font-semibold text-gray-800 mb-2">Stock by Category</h3>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={stockDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name} ${value}%`}
                    outerRadius={60}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {stockDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `${value}%`} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Summary Statistics */}
          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
            <div className="bg-white p-3 rounded-lg shadow-md border-l-4 border-blue-500">
              <p className="text-gray-600 text-xs font-semibold">AVG DAILY SALES</p>
              <p className="text-xl font-bold text-gray-800 mt-1">{currency} {formatNumber((avgDailySales / 1000))}K</p>
              <p className="text-xs text-gray-500 mt-0.5">per day</p>
            </div>

            <div className="bg-white p-3 rounded-lg shadow-md border-l-4 border-purple-500">
              <p className="text-gray-600 text-xs font-semibold">AVG DAILY PURCHASE</p>
              <p className="text-xl font-bold text-gray-800 mt-1">{currency} {formatNumber((avgDailyPurchase / 1000))}K</p>
              <p className="text-xs text-gray-500 mt-0.5">per day</p>
            </div>

            <div className="bg-white p-3 rounded-lg shadow-md border-l-4 border-green-500">
              <p className="text-gray-600 text-xs font-semibold">PROFIT MARGIN</p>
              <p className="text-xl font-bold text-gray-800 mt-1">{profitMargin}%</p>
              <p className="text-xs text-gray-500 mt-0.5">margin ratio</p>
            </div>

            <div className="bg-white p-3 rounded-lg shadow-md border-l-4 border-orange-500">
              <p className="text-gray-600 text-xs font-semibold">STOCK ITEMS</p>
              <p className="text-xl font-bold text-gray-800 mt-1">{tenDaysData[tenDaysData.length - 1].items}</p>
              <p className="text-xs text-gray-500 mt-0.5">total items</p>
            </div>
          </div>
        </>
      )}

      {/* Inventory Dashboard Tab */}
      {activeTab === "inventory" && (
        <InventoryDashboard />
      )}
    </div>
  );
};

export default Dashboard;


