/**
 * POS Reports Screen
 * Sales analytics and reporting dashboard
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  BarChart3,
  ChevronLeft,
  Calendar,
  TrendingUp,
  Users,
  ShoppingCart,
  Eye,
  AlertCircle,
  CheckCircle,
  Download
} from 'lucide-react';
import { useDecimalFormat } from '../../hooks/useDecimalFormat';

const API_URL = import.meta.env.VITE_API_URL || '/api/v1';

export const POSReports = ({ terminalId, onBack }) => {
  const { formatCurrency } = useDecimalFormat();

  // State management
  const [dateRange, setDateRange] = useState('today'); // today, week, month
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [reports, setReports] = useState({
    sales: null,
    topProducts: [],
    paymentMethods: [],
    customerMetrics: null,
    hourlyTrends: []
  });
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Fetch reports data
  useEffect(() => {
    fetchReports();
  }, [dateRange, startDate, endDate]);

  const fetchReports = async () => {
    try {
      setIsLoading(true);
      setMessage({ type: '', text: '' });

      const params = {
        terminalId,
        startDate,
        endDate
      };

      const [salesRes, productsRes, paymentRes, customerRes, trendsRes] = await Promise.all([
        axios.get(`${API_URL}/api/v1/pos/reports/sales`, { params }),
        axios.get(`${API_URL}/api/v1/pos/reports/top-products`, { params }),
        axios.get(`${API_URL}/api/v1/pos/reports/payment-breakdown`, { params }),
        axios.get(`${API_URL}/api/v1/pos/reports/customer-metrics`, { params }),
        axios.get(`${API_URL}/api/v1/pos/reports/hourly-trends`, { params })
      ]);

      setReports({
        sales: salesRes.data.data,
        topProducts: productsRes.data.data || [],
        paymentMethods: paymentRes.data.data || [],
        customerMetrics: customerRes.data.data,
        hourlyTrends: trendsRes.data.data || []
      });
    } catch (error) {
      console.error('Error fetching reports:', error);
      setMessage({
        type: 'error',
        text: 'Failed to load report data'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle date range selection
  const handleDateRangeChange = (range) => {
    setDateRange(range);

    const endDate = new Date();
    let startDate = new Date();

    switch (range) {
      case 'today':
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'week':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(endDate.getMonth() - 1);
        break;
      default:
        break;
    }

    setStartDate(startDate.toISOString().split('T')[0]);
    setEndDate(endDate.toISOString().split('T')[0]);
  };

  // Export report to CSV
  const handleExport = () => {
    if (!reports.sales) return;

    const csv = generateCSV();
    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv));
    element.setAttribute('download', `pos_report_${new Date().toISOString().split('T')[0]}.csv`);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);

    setMessage({
      type: 'success',
      text: 'Report exported successfully'
    });
  };

  const generateCSV = () => {
    let csv = 'POS Reports\n';
    csv += `Terminal: ${terminalId}\n`;
    csv += `Period: ${startDate} to ${endDate}\n\n`;

    if (reports.sales) {
      csv += 'SALES SUMMARY\n';
      csv += `Total Sales: ${reports.sales.totalSales}\n`;
      csv += `Transaction Count: ${reports.sales.transactionCount}\n`;
      csv += `Average Transaction: ${reports.sales.averageTransaction}\n\n`;
    }

    csv += 'TOP PRODUCTS\n';
    csv += 'Product, Quantity, Revenue\n';
    reports.topProducts.forEach(p => {
      csv += `"${p.productName}", ${p.quantity}, ${p.revenue}\n`;
    });

    return csv;
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
                <BarChart3 className="w-6 h-6 text-purple-500" />
                Sales Reports
              </h1>
              <p className="text-sm text-gray-400">
                {startDate} to {endDate}
              </p>
            </div>
          </div>
          <button
            onClick={handleExport}
            disabled={!reports.sales}
            className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-bold px-4 py-2 rounded-lg transition flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6 max-w-7xl mx-auto">
        {/* Date Range Selection */}
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 mb-6">
          <label className="block text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Select Period
          </label>
          <div className="flex flex-wrap gap-2 mb-4">
            {['today', 'week', 'month'].map(range => (
              <button
                key={range}
                onClick={() => handleDateRangeChange(range)}
                className={`px-4 py-2 rounded-lg transition font-medium capitalize ${
                  dateRange === range
                    ? 'bg-purple-600 text-white'
                    : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                }`}
              >
                {range}
              </button>
            ))}
          </div>

          {/* Custom Date Range */}
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-xs text-gray-400 mb-1">From</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs text-gray-400 mb-1">To</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
              />
            </div>
          </div>
        </div>

        {/* Status Message */}
        {message.text && (
          <div
            className={`mb-6 rounded-lg p-4 flex items-start gap-3 ${
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
              className={`text-sm ${
                message.type === 'success' ? 'text-green-400' : 'text-red-400'
              }`}
            >
              {message.text}
            </p>
          </div>
        )}

        {isLoading ? (
          <div className="text-center py-12">
            <BarChart3 className="w-8 h-8 text-purple-500 mx-auto animate-spin mb-4" />
            <p className="text-gray-400">Loading reports...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Sales Summary Cards */}
            {reports.sales && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg p-6 text-white">
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-blue-100 text-sm font-medium">Total Sales</span>
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <p className="text-3xl font-bold">
                    {formatCurrency(reports.sales.totalSales)}
                  </p>
                </div>

                <div className="bg-gradient-to-br from-green-600 to-green-700 rounded-lg p-6 text-white">
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-green-100 text-sm font-medium">Transactions</span>
                    <ShoppingCart className="w-5 h-5" />
                  </div>
                  <p className="text-3xl font-bold">{reports.sales.transactionCount}</p>
                </div>

                <div className="bg-gradient-to-br from-orange-600 to-orange-700 rounded-lg p-6 text-white">
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-orange-100 text-sm font-medium">Avg Transaction</span>
                    <Eye className="w-5 h-5" />
                  </div>
                  <p className="text-3xl font-bold">
                    {formatCurrency(reports.sales.averageTransaction)}
                  </p>
                </div>

                <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg p-6 text-white">
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-blue-100 text-sm font-medium">Unique Customers</span>
                    <Users className="w-5 h-5" />
                  </div>
                  <p className="text-3xl font-bold">
                    {reports.customerMetrics?.uniqueCustomers || 0}
                  </p>
                </div>
              </div>
            )}

            {/* Two Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Top Products */}
              <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
                <h3 className="text-lg font-bold text-white mb-4">Top Products</h3>
                <div className="space-y-3">
                  {reports.topProducts.length > 0 ? (
                    reports.topProducts.map((product, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 bg-slate-700 rounded-lg"
                      >
                        <div>
                          <p className="font-medium text-white">{product.productName}</p>
                          <p className="text-xs text-gray-400">
                            {product.quantity} units sold
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-green-400">
                            {formatCurrency(product.revenue)}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-400 text-sm">No data available</p>
                  )}
                </div>
              </div>

              {/* Payment Methods */}
              <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
                <h3 className="text-lg font-bold text-white mb-4">Payment Methods</h3>
                <div className="space-y-3">
                  {reports.paymentMethods.length > 0 ? (
                    reports.paymentMethods.map((method, idx) => (
                      <div key={idx} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-white font-medium capitalize">
                            {method.method.replace('_', ' ')}
                          </span>
                          <span className="text-gray-400 text-sm">
                            {method.count} transaction{method.count !== 1 ? 's' : ''}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-slate-700 rounded-full h-2">
                            <div
                              className="bg-blue-500 h-2 rounded-full"
                              style={{
                                width: `${
                                  (method.amount /
                                    (reports.sales?.totalSales || 1)) *
                                  100
                                }%`
                              }}
                            ></div>
                          </div>
                          <span className="text-white font-bold text-sm">
                            {formatCurrency(method.amount)}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-400 text-sm">No data available</p>
                  )}
                </div>
              </div>
            </div>

            {/* Hourly Trends */}
            {reports.hourlyTrends.length > 0 && (
              <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
                <h3 className="text-lg font-bold text-white mb-4">Hourly Sales Trend</h3>
                <div className="space-y-3">
                  {reports.hourlyTrends.map((hour, idx) => (
                    <div key={idx} className="flex items-center gap-4">
                      <span className="text-sm text-gray-400 w-12">{hour.hour}:00</span>
                      <div className="flex-1 bg-slate-700 rounded-lg h-8 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-green-500 to-blue-500 h-full"
                          style={{
                            width: `${
                              (hour.amount /
                                (reports.sales?.totalSales || 1)) *
                              100
                            }%`
                          }}
                        ></div>
                      </div>
                      <span className="text-white font-bold text-sm">
                        {formatCurrency(hour.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default POSReports;


