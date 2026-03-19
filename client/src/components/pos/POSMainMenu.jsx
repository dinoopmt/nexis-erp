/**
 * POS Main Menu - Complete UX
 * Dashboard for all POS operations
 * Features: Quick access, terminal status, daily summary, analytics
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  ShoppingCart,
  RotateCcw,
  DollarSign,
  Users,
  TrendingUp,
  Settings,
  LogOut,
  Clock,
  AlertCircle,
  RefreshCw,
  FileText,
  Zap,
  Package,
  CreditCard,
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || '/api/v1';

export const POSMainMenu = ({ onNavigate, terminalId, operatorId, shiftId, onLogout }) => {
  const [terminalStatus, setTerminalStatus] = useState({});
  const [dailySummary, setDailySummary] = useState({});
  const [currentShift, setCurrentShift] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [clockTime, setClockTime] = useState(new Date());
  const [showCloseShiftModal, setShowCloseShiftModal] = useState(false);

  // Real-time clock
  useEffect(() => {
    const timer = setInterval(() => setClockTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch terminal data
  useEffect(() => {
    fetchTerminalData();
    const interval = setInterval(fetchTerminalData, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, [terminalId]);

  const fetchTerminalData = async () => {
    try {
      setIsLoading(true);
      const [terminalRes, summaryRes, shiftRes] = await Promise.all([
        axios.get(`${API_URL}/api/v1/pos/terminals/${terminalId}/status`),
        axios.get(`${API_URL}/api/v1/pos/terminals/${terminalId}/daily-sales`),
        axios.get(`${API_URL}/api/v1/pos/terminals/${terminalId}/current-shift`),
      ]);

      setTerminalStatus(terminalRes.data.data);
      setDailySummary(summaryRes.data.data);
      setCurrentShift(shiftRes.data.data);

      // Check for alerts
      if (terminalRes.data.data.status !== 'Active') {
        setNotifications([...notifications, {
          type: 'warning',
          message: `Terminal status: ${terminalRes.data.data.status}`
        }]);
      }
    } catch (err) {
      console.error('Error fetching terminal data:', err);
      setNotifications([{
        type: 'error',
        message: 'Failed to sync with server'
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    if (window.confirm('End your shift?')) {
      try {
        // Close the shift
        if (shiftId || currentShift?._id) {
          await axios.post(`${API_URL}/api/v1/pos/shifts/${shiftId || currentShift?._id}/close`, {
            closingBalance: dailySummary.totalCash || 0,
            timestamp: new Date().toISOString()
          });
        }
        // Clear session and call parent logout
        onLogout();
      } catch (err) {
        console.error('Error closing shift:', err);
        alert('Error closing shift: ' + (err.response?.data?.message || err.message));
      }
    }
  };

  const menuItems = [
    {
      id: 'new-sale',
      label: 'New Sale',
      icon: ShoppingCart,
      color: 'bg-blue-500',
      action: () => onNavigate('sale'),
      hotkey: 'F2',
      description: 'Create new POS transaction'
    },
    {
      id: 'return',
      label: 'Return',
      icon: RotateCcw,
      color: 'bg-orange-500',
      action: () => onNavigate('return'),
      hotkey: 'F3',
      description: 'Process customer return'
    },
    {
      id: 'refunds',
      label: 'Refunds',
      icon: DollarSign,
      color: 'bg-red-500',
      action: () => onNavigate('refunds'),
      hotkey: 'F4',
      description: 'View and process refunds'
    },
    {
      id: 'customers',
      label: 'Customers',
      icon: Users,
      color: 'bg-green-500',
      action: () => onNavigate('customers'),
      hotkey: 'F5',
      description: 'Customer management'
    },
    {
      id: 'inventory',
      label: 'Inventory',
      icon: Package,
      color: 'bg-purple-500',
      action: () => onNavigate('inventory'),
      hotkey: 'F6',
      description: 'Check stock levels'
    },
    {
      id: 'reports',
      label: 'Reports',
      icon: FileText,
      color: 'bg-indigo-500',
      action: () => onNavigate('reports'),
      hotkey: 'F7',
      description: 'Daily reports & analytics'
    },
    {
      id: 'payments',
      label: 'Payments',
      icon: CreditCard,
      color: 'bg-pink-500',
      action: () => onNavigate('payments'),
      hotkey: 'F8',
      description: 'Payment methods & reconciliation'
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: Settings,
      color: 'bg-gray-600',
      action: () => onNavigate('settings'),
      hotkey: 'F9',
      description: 'Terminal & user settings'
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white font-sans">
      {/* Header */}
      <header className="bg-slate-950 border-b border-slate-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 p-3 rounded-lg">
                <Zap className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">POS System</h1>
                <p className="text-xs text-gray-400">Terminal {terminalId}</p>
              </div>
            </div>
            
            {/* Digital Clock */}
            <div className="text-right">
              <div className="text-3xl font-mono font-bold">
                {clockTime.toLocaleTimeString()}
              </div>
              <div className="text-xs text-gray-400">
                {clockTime.toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  month: 'short', 
                  day: 'numeric' 
                })}
              </div>
            </div>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Alerts/Notifications */}
      {notifications.length > 0 && (
        <div className="bg-slate-950 border-b border-slate-700 px-6 py-3">
          {notifications.map((notif, idx) => (
            <div
              key={idx}
              className={`flex items-center gap-2 mb-2 last:mb-0 p-3 rounded-lg ${
                notif.type === 'error'
                  ? 'bg-red-500/20 border border-red-500'
                  : 'bg-yellow-500/20 border border-yellow-500'
              }`}
            >
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">{notif.message}</span>
            </div>
          ))}
        </div>
      )}

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {/* Terminal Status */}
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-400 uppercase tracking-wide">Terminal</span>
              <div
                className={`w-3 h-3 rounded-full ${
                  terminalStatus.status === 'Active' ? 'bg-green-500' : 'bg-red-500'
                }`}
              />
            </div>
            <h3 className="text-xl font-bold">{terminalStatus.terminalName}</h3>
            <p className="text-sm text-gray-400 mt-1">
              {terminalStatus.status || 'Loading...'}
            </p>
          </div>

          {/* Today's Sales */}
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-400 uppercase tracking-wide">Today's Sales</span>
              <TrendingUp className="w-4 h-4 text-green-500" />
            </div>
            <h3 className="text-xl font-bold">
              {dailySummary.totalAmount?.toLocaleString('en-AE', {
                style: 'currency',
                currency: 'AED'
              }) || 'AED 0'}
            </h3>
            <p className="text-sm text-gray-400 mt-1">
              {dailySummary.transactionCount || 0} transactions
            </p>
          </div>

          {/* Cash Balance */}
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-400 uppercase tracking-wide">Cash Balance</span>
              <DollarSign className="w-4 h-4 text-blue-500" />
            </div>
            <h3 className="text-xl font-bold">
              {dailySummary.totalCash?.toLocaleString('en-AE', {
                style: 'currency',
                currency: 'AED'
              }) || 'AED 0'}
            </h3>
            <p className="text-sm text-gray-400 mt-1">In drawer</p>
          </div>

          {/* Shift Status */}
          <div className={`rounded-lg p-4 border ${shiftId ? 'bg-green-900/30 border-green-600' : 'bg-yellow-900/30 border-yellow-600'}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-400 uppercase tracking-wide">Shift</span>
              <Clock className="w-4 h-4 text-yellow-500" />
            </div>
            <h3 className="text-xl font-bold">
              {shiftId ? 'OPEN' : 'NO SHIFT'}
            </h3>
            <p className="text-sm text-gray-400 mt-1">
              {shiftId ? shiftId.slice(-6) : 'Start shift to begin'}
            </p>
          </div>
          </div>
        </div>

        {/* Main Menu Grid */}
        <div className="mb-8">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-500" />
            Quick Actions
          </h2>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
              <span className="ml-3">Loading terminal data...</span>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {menuItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={item.action}
                    className="group relative bg-slate-800 border border-slate-700 hover:border-slate-600 rounded-lg p-6 transition-all duration-300 hover:scale-105 hover:shadow-lg"
                  >
                    {/* Background Glow Effect */}
                    <div
                      className={`absolute inset-0 rounded-lg opacity-0 group-hover:opacity-20 blur-xl transition-opacity ${item.color}`}
                    />

                    {/* Content */}
                    <div className="relative">
                      <div
                        className={`${item.color} w-12 h-12 rounded-lg flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}
                      >
                        <Icon className="w-6 h-6 text-white" />
                      </div>

                      <h3 className="font-bold text-left mb-1">{item.label}</h3>
                      <p className="text-xs text-gray-400 text-left mb-2">
                        {item.description}
                      </p>

                      <div className="flex justify-between items-center">
                        <span className="text-xs bg-slate-700/50 px-2 py-1 rounded">
                          {item.hotkey}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Detailed Summary Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Payment Methods Breakdown */}
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
            <h3 className="font-bold mb-4 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-pink-500" />
              Payment Methods
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center py-2 border-b border-slate-700">
                <span className="text-sm text-gray-400">Cash</span>
                <span className="font-bold">
                  {dailySummary.paymentBreakdown?.cash?.toLocaleString('en-AE', {
                    style: 'currency',
                    currency: 'AED'
                  }) || 'AED 0'}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-700">
                <span className="text-sm text-gray-400">Card</span>
                <span className="font-bold">
                  {dailySummary.paymentBreakdown?.card?.toLocaleString('en-AE', {
                    style: 'currency',
                    currency: 'AED'
                  }) || 'AED 0'}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-700">
                <span className="text-sm text-gray-400">Cheque</span>
                <span className="font-bold">
                  {dailySummary.paymentBreakdown?.cheque?.toLocaleString('en-AE', {
                    style: 'currency',
                    currency: 'AED'
                  }) || 'AED 0'}
                </span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-gray-400">Online</span>
                <span className="font-bold">
                  {dailySummary.paymentBreakdown?.online?.toLocaleString('en-AE', {
                    style: 'currency',
                    currency: 'AED'
                  }) || 'AED 0'}
                </span>
              </div>
            </div>
          </div>

          {/* Top Products */}
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
            <h3 className="font-bold mb-4 flex items-center gap-2">
              <Package className="w-5 h-5 text-purple-500" />
              Top Products
            </h3>
            <div className="space-y-3">
              {dailySummary.topProducts?.slice(0, 5).map((product, idx) => (
                <div key={idx} className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium">{product.name}</p>
                    <p className="text-xs text-gray-400">{product.quantity} units</p>
                  </div>
                  <span className="font-bold">
                    {product.total?.toLocaleString('en-AE', {
                      style: 'currency',
                      currency: 'AED'
                    })}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Daily Statistics */}
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
            <h3 className="font-bold mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-500" />
              Daily Statistics
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-slate-700">
                <span className="text-sm text-gray-400">Transactions</span>
                <span className="font-bold text-lg">{dailySummary.transactionCount || 0}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-700">
                <span className="text-sm text-gray-400">Avg Transaction</span>
                <span className="font-bold">
                  {(dailySummary.totalAmount / (dailySummary.transactionCount || 1))?.toLocaleString('en-AE', {
                    style: 'currency',
                    currency: 'AED'
                  })}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-700">
                <span className="text-sm text-gray-400">Items Sold</span>
                <span className="font-bold text-lg">{dailySummary.itemsSold || 0}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-gray-400">Returns</span>
                <span className="font-bold text-lg">{dailySummary.returnCount || 0}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Help & Support Footer */}
        <footer className="bg-slate-800 border border-slate-700 rounded-lg p-4 text-center">
          <p className="text-sm text-gray-400">
            Need help? Press <kbd className="bg-slate-700 px-2 py-1 rounded text-xs">F1</kbd> or contact support
          </p>
        </footer>
      </div>
    </div>
  );
};

export default POSMainMenu;


