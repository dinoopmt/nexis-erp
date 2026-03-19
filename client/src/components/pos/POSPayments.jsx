/**
 * POS Payments Screen
 * Payment management and reconciliation
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  DollarSign,
  CreditCard,
  Banknote,
  Clock,
  ChevronLeft,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  RefreshCw
} from 'lucide-react';
import { useDecimalFormat } from '../../hooks/useDecimalFormat';

const API_URL = import.meta.env.VITE_API_URL || '/api/v1';

export const POSPayments = ({ terminalId, onBack, operatorId }) => {
  const { formatCurrency } = useDecimalFormat();

  // State management
  const [currentShift, setCurrentShift] = useState(null);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [selectedMethod, setSelectedMethod] = useState('cash');
  const [manualEntry, setManualEntry] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [showReconciliation, setShowReconciliation] = useState(false);

  // Fetch payment data
  useEffect(() => {
    fetchPaymentData();
    const interval = setInterval(fetchPaymentData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchPaymentData = async () => {
    try {
      setIsLoading(true);
      const shiftRes = await axios.get(
        `${API_URL}/api/v1/pos/shifts/current?terminalId=${terminalId}`
      );
      setCurrentShift(shiftRes.data.data);

      // Fetch payment breakdown
      if (shiftRes.data.data) {
        const paymentsRes = await axios.get(
          `${API_URL}/api/v1/pos/shifts/${shiftRes.data.data._id}/payments`
        );
        setPaymentMethods(paymentsRes.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching payment data:', error);
      setMessage({
        type: 'error',
        text: 'Failed to load payment data'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Get payment method icons
  const getPaymentIcon = (method) => {
    switch (method) {
      case 'cash':
        return <Banknote className="w-5 h-5" />;
      case 'card':
      case 'credit_card':
        return <CreditCard className="w-5 h-5" />;
      case 'online':
        return <TrendingUp className="w-5 h-5" />;
      case 'cheque':
        return <Clock className="w-5 h-5" />;
      default:
        return <DollarSign className="w-5 h-5" />;
    }
  };

  // Process manual payment entry
  const handleManualEntry = async () => {
    if (!manualEntry) {
      setMessage({ type: 'error', text: 'Enter payment amount' });
      return;
    }

    setIsProcessing(true);
    try {
      const response = await axios.post(
        `${API_URL}/api/v1/pos/payments/register`,
        {
          shiftId: currentShift._id,
          method: selectedMethod,
          amount: parseFloat(manualEntry),
          timestamp: new Date().toISOString(),
          operatorId
        }
      );

      if (response.data.success) {
        setMessage({
          type: 'success',
          text: `Payment recorded: ${formatCurrency(manualEntry)}`
        });
        setManualEntry('');
        setTimeout(() => fetchPaymentData(), 500);
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.message || 'Failed to register payment'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Process reconciliation
  const handleReconciliation = async (declaredAmount) => {
    if (!declaredAmount) {
      setMessage({ type: 'error', text: 'Enter declared cash amount' });
      return;
    }

    setIsProcessing(true);
    try {
      const response = await axios.post(
        `${API_URL}/api/v1/pos/shifts/${currentShift._id}/reconcile`,
        {
          declaredCashAmount: parseFloat(declaredAmount),
          systemCashAmount: currentShift.paymentMethods?.find(
            p => p.method === 'cash'
          )?.amount,
          terminalId,
          operatorId
        }
      );

      if (response.data.success) {
        setMessage({
          type: 'success',
          text: 'Reconciliation completed successfully'
        });
        setShowReconciliation(false);
        setTimeout(() => fetchPaymentData(), 500);
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.message || 'Reconciliation failed'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Calculate totals
  const calculateTotals = () => {
    if (!currentShift?.paymentMethods) {
      return { total: 0, breakdown: {} };
    }

    let total = 0;
    const breakdown = {};

    currentShift.paymentMethods.forEach(pm => {
      breakdown[pm.method] = pm.amount;
      total += pm.amount;
    });

    return { total, breakdown };
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
                <DollarSign className="w-6 h-6 text-green-500" />
                Payment Management
              </h1>
              <p className="text-sm text-gray-400">
                {currentShift?.status || 'No active shift'}
              </p>
            </div>
          </div>

          {currentShift && (
            <button
              onClick={() => setShowReconciliation(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-lg transition"
            >
              Reconcile
            </button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6 max-w-7xl mx-auto">
        {/* Left: Payment Methods and Entry */}
        <div className="lg:col-span-2 space-y-6">
          {/* Current Shift Info */}
          {currentShift ? (
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
              <h3 className="font-bold text-white mb-4">Current Shift</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-700 rounded-lg p-4">
                  <p className="text-xs text-gray-400 mb-1">Shift ID</p>
                  <p className="text-lg font-bold text-white">
                    {currentShift._id?.slice(-6)}
                  </p>
                </div>
                <div className="bg-slate-700 rounded-lg p-4">
                  <p className="text-xs text-gray-400 mb-1">Start Time</p>
                  <p className="text-sm font-bold text-white">
                    {new Date(currentShift.openedAt).toLocaleTimeString()}
                  </p>
                </div>
                <div className="bg-slate-700 rounded-lg p-4">
                  <p className="text-xs text-gray-400 mb-1">Status</p>
                  <p
                    className={`text-sm font-bold ${
                      currentShift.status === 'open'
                        ? 'text-green-400'
                        : 'text-gray-400'
                    }`}
                  >
                    {currentShift.status?.toUpperCase()}
                  </p>
                </div>
                <div className="bg-slate-700 rounded-lg p-4">
                  <p className="text-xs text-gray-400 mb-1">Duration</p>
                  <p className="text-sm font-bold text-white">
                    {Math.floor(
                      (Date.now() - new Date(currentShift.openedAt)) / 3600000
                    )}h
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
              <p className="text-gray-400">No active shift found</p>
            </div>
          )}

          {/* Payment Methods - Current Totals */}
          {paymentMethods.length > 0 && (
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
              <h3 className="font-bold text-white mb-4">Payment Breakdown</h3>
              <div className="space-y-3">
                {paymentMethods.map(method => (
                  <div
                    key={method._id}
                    className="bg-slate-700 rounded-lg p-4 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-slate-600 rounded-lg text-blue-500">
                        {getPaymentIcon(method.method)}
                      </div>
                      <div>
                        <p className="font-bold text-white capitalize">
                          {method.method.replace('_', ' ')}
                        </p>
                        <p className="text-sm text-gray-400">
                          {method.count} transaction{method.count !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-white">
                        {formatCurrency(method.amount)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Manual Payment Entry */}
          {currentShift?.status === 'open' && (
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
              <h3 className="font-bold text-white mb-4">Enter Payment</h3>

              <div className="space-y-4">
                {/* Payment Method Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-3">
                    Payment Method
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {['cash', 'card', 'cheque', 'online'].map(method => (
                      <button
                        key={method}
                        onClick={() => setSelectedMethod(method)}
                        className={`p-3 rounded-lg transition border-2 flex items-center justify-center gap-2 ${
                          selectedMethod === method
                            ? 'bg-blue-600 border-blue-500 text-white'
                            : 'bg-slate-700 border-slate-600 text-gray-400 hover:border-slate-500'
                        }`}
                      >
                        {getPaymentIcon(method)}
                        <span className="text-sm font-medium capitalize">
                          {method}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Amount Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Amount
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      placeholder="0.00"
                      value={manualEntry}
                      onChange={(e) => setManualEntry(e.target.value)}
                      className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 transition"
                    />
                    <button
                      onClick={handleManualEntry}
                      disabled={isProcessing}
                      className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-bold px-6 py-3 rounded-lg transition"
                    >
                      {isProcessing ? 'Recording...' : 'Record'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right: Summary Panel */}
        <div className="lg:col-span-1">
          {/* Total Summary Card */}
          <div className="bg-gradient-to-br from-green-600 to-green-700 rounded-lg p-6 text-white sticky top-24">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Total Collected
            </h3>

            <div className="mb-6">
              <p className="text-green-100 text-sm mb-1">Today's Total</p>
              <p className="text-4xl font-bold">{formatCurrency(totals.total)}</p>
            </div>

            {/* Quick Stats */}
            <div className="space-y-3 pb-4 border-b border-green-500/30">
              {Object.entries(totals.breakdown).map(([method, amount]) => (
                <div key={method} className="flex justify-between text-sm">
                  <span className="text-green-100 capitalize">{method.replace('_', ' ')}</span>
                  <span className="font-bold">{formatCurrency(amount)}</span>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-4">
              <p className="text-green-100 text-sm mb-2">Transaction Count</p>
              <p className="text-3xl font-bold">
                {paymentMethods.reduce((sum, m) => sum + (m.count || 0), 0)}
              </p>
            </div>

            {/* Refresh Button */}
            <button
              onClick={fetchPaymentData}
              disabled={isLoading}
              className="w-full bg-white text-green-600 font-bold py-2 rounded-lg hover:bg-green-50 disabled:opacity-50 transition mt-4 flex items-center justify-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
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

      {/* Reconciliation Modal */}
      {showReconciliation && currentShift && (
        <ReconciliationModal
          onClose={() => setShowReconciliation(false)}
          onReconcile={handleReconciliation}
          systemCash={
            currentShift.paymentMethods?.find(p => p.method === 'cash')?.amount || 0
          }
          isProcessing={isProcessing}
          formatCurrency={formatCurrency}
        />
      )}
    </div>
  );
};

// Reconciliation Modal Component
const ReconciliationModal = ({
  onClose,
  onReconcile,
  systemCash,
  isProcessing,
  formatCurrency
}) => {
  const [declaredAmount, setDeclaredAmount] = useState('');

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 border border-slate-700 rounded-lg max-w-md w-full p-6">
        <h3 className="text-xl font-bold text-white mb-4">Cash Reconciliation</h3>

        <div className="bg-slate-700 rounded-lg p-4 mb-4 space-y-2">
          <div className="flex justify-between">
            <span className="text-gray-400">System Records</span>
            <span className="font-bold text-white">{formatCurrency(systemCash)}</span>
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Actual Cash in Drawer
          </label>
          <input
            type="number"
            placeholder="Enter actual cash amount"
            value={declaredAmount}
            onChange={(e) => setDeclaredAmount(e.target.value)}
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
          />
        </div>

        {declaredAmount && (
          <div className="mb-4 p-3 rounded-lg bg-slate-700">
            <div
              className={`text-center ${
                parseFloat(declaredAmount) === systemCash
                  ? 'text-green-400'
                  : 'text-red-400'
              }`}
            >
              {parseFloat(declaredAmount) === systemCash ? (
                <>
                  <p className="text-sm font-bold">BALANCED</p>
                  <p className="text-xs">No discrepancy</p>
                </>
              ) : (
                <>
                  <p className="text-sm font-bold">VARIANCE</p>
                  <p className="text-xs">
                    {parseFloat(declaredAmount) > systemCash ? '+' : '-'}
                    {formatCurrency(
                      Math.abs(parseFloat(declaredAmount) - systemCash)
                    )}
                  </p>
                </>
              )}
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-bold py-2 rounded-lg transition"
          >
            Cancel
          </button>
          <button
            onClick={() => onReconcile(declaredAmount)}
            disabled={!declaredAmount || isProcessing}
            className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-bold py-2 rounded-lg transition"
          >
            {isProcessing ? 'Processing...' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default POSPayments;


