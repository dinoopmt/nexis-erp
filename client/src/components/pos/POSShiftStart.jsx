/**
 * POS Shift Start Screen
 * Opening shift with initial balance declaration
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Sun,
  DollarSign,
  AlertCircle,
  CheckCircle,
  Zap,
  ChevronRight
} from 'lucide-react';
import { useDecimalFormat } from '../../hooks/useDecimalFormat';

const API_URL = import.meta.env.VITE_API_URL || '/api/v1';

export const POSShiftStart = ({ terminalId, operatorId, onShiftOpened }) => {
  const { formatCurrency } = useDecimalFormat();

  // State management
  const [openingBalance, setOpeningBalance] = useState('');
  const [previousShiftData, setPreviousShiftData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [acknowledged, setAcknowledged] = useState(false);

  // Fetch previous shift summary
  useEffect(() => {
    fetchPreviousShiftData();
  }, []);

  const fetchPreviousShiftData = async () => {
    try {
      setIsLoading(true);
      setMessage({ type: '', text: '' });

      const response = await axios.get(
        `${API_URL}/api/v1/pos/terminals/${terminalId}/previous-shift-summary`
      );

      setPreviousShiftData(response.data.data);
    } catch (error) {
      console.error('Error fetching previous shift data:', error);
      // Don't show error if no previous shift (first shift of day)
      if (error.response?.status !== 404) {
        setMessage({
          type: 'warning',
          text: 'Could not load previous shift data (optional)'
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Open shift
  const handleOpenShift = async () => {
    if (!openingBalance) {
      setMessage({ type: 'error', text: 'Enter opening balance' });
      return;
    }

    if (parseFloat(openingBalance) < 0) {
      setMessage({ type: 'error', text: 'Opening balance cannot be negative' });
      return;
    }

    setIsProcessing(true);
    try {
      const response = await axios.post(
        `${API_URL}/api/v1/pos/shifts/open`,
        {
          terminalId,
          operatorId,
          openingBalance: parseFloat(openingBalance),
          timestamp: new Date().toISOString()
        }
      );

      if (response.data.success) {
        setMessage({
          type: 'success',
          text: 'Shift opened successfully'
        });

        // Callback to parent with shift data
        setTimeout(() => {
          onShiftOpened(response.data.data);
        }, 1000);
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.message || 'Failed to open shift'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
      {/* Main Card */}
      <div className="max-w-lg w-full space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-yellow-600 p-4 rounded-full animate-pulse">
              <Sun className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Start Your Shift</h1>
          <p className="text-gray-400">
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric'
            })}
          </p>
        </div>

        {/* Previous Shift Summary Card */}
        {previousShiftData && !isLoading && (
          <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
            <div className="bg-gradient-to-r from-slate-700 to-slate-800 px-6 py-3 border-b border-slate-700">
              <h3 className="font-bold text-white flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                Previous Shift Summary
              </h3>
            </div>

            <div className="p-6 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Closing Balance</span>
                <span className="font-bold text-white text-lg">
                  {formatCurrency(previousShiftData.closingBalance)}
                </span>
              </div>

              <div className="border-t border-slate-700 pt-3 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Total Sales</span>
                  <span className="text-green-400">
                    +{formatCurrency(previousShiftData.totalSales)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Transactions</span>
                  <span className="text-white">{previousShiftData.transactionCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Variance</span>
                  <span
                    className={
                      previousShiftData.variance === 0
                        ? 'text-green-400'
                        : previousShiftData.variance > 0
                        ? 'text-blue-400'
                        : 'text-red-400'
                    }
                  >
                    {previousShiftData.variance >= 0 ? '+' : ''}
                    {formatCurrency(previousShiftData.variance)}
                  </span>
                </div>
              </div>

              <div className="bg-slate-700/50 rounded-lg p-3 mt-4">
                <p className="text-xs text-gray-400 mb-1">Expected Opening Balance</p>
                <p className="text-xl font-bold text-white">
                  {formatCurrency(previousShiftData.closingBalance)}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  This should match your actual cash drawer amount
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Opening Balance Input Card */}
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
          <label className="block mb-4">
            <span className="block text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-yellow-500" />
              Opening Balance
            </span>
            <div className="relative">
              <span className="absolute left-4 top-3 text-gray-400">AED</span>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={openingBalance}
                onChange={(e) => {
                  setOpeningBalance(e.target.value);
                  setMessage({ type: '', text: '' });
                }}
                disabled={isProcessing}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg pl-12 pr-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500 transition disabled:opacity-50"
              />
            </div>
            <p className="text-xs text-gray-400 mt-2">
              Enter the actual cash amount in your drawer
            </p>
          </label>

          {/* Variance Notice */}
          {previousShiftData && openingBalance && (
            <div className="mt-4 p-3 rounded-lg bg-slate-700/50">
              <p className="text-xs text-gray-400 mb-1">Expected vs. Actual</p>
              <div className="flex justify-between items-center">
                <span className="text-sm">
                  Expected: {formatCurrency(previousShiftData.closingBalance)}
                </span>
                <span className="text-sm">
                  Actual: {formatCurrency(parseFloat(openingBalance) || 0)}
                </span>
              </div>
              {parseFloat(openingBalance) === previousShiftData.closingBalance ? (
                <p className="text-xs text-green-400 mt-2 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  Perfect match!
                </p>
              ) : (
                <p
                  className={`text-xs mt-2 ${
                    parseFloat(openingBalance) > previousShiftData.closingBalance
                      ? 'text-blue-400'
                      : 'text-orange-400'
                  }`}
                >
                  Difference: {formatCurrency(
                    (parseFloat(openingBalance) || 0) - previousShiftData.closingBalance
                  )}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Acknowledgment Checkbox */}
        <label className="flex items-start gap-3 p-4 bg-slate-800 border border-slate-700 rounded-lg cursor-pointer hover:bg-slate-700/50 transition">
          <input
            type="checkbox"
            checked={acknowledged}
            onChange={(e) => setAcknowledged(e.target.checked)}
            disabled={isProcessing || !openingBalance}
            className="w-5 h-5 mt-1"
          />
          <div>
            <p className="text-sm font-medium text-white">
              I confirm the opening balance is correct
            </p>
            <p className="text-xs text-gray-400 mt-1">
              I have verified the cash in the drawer matches the declared amount
            </p>
          </div>
        </label>

        {/* Status Message */}
        {message.text && (
          <div
            className={`rounded-lg p-4 flex items-start gap-3 ${
              message.type === 'success'
                ? 'bg-green-600/20 border border-green-600'
                : message.type === 'error'
                ? 'bg-red-600/20 border border-red-600'
                : 'bg-yellow-600/20 border border-yellow-600'
            }`}
          >
            {message.type === 'success' ? (
              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            )}
            <p
              className={`text-sm ${
                message.type === 'success'
                  ? 'text-green-400'
                  : message.type === 'error'
                  ? 'text-red-400'
                  : 'text-yellow-400'
              }`}
            >
              {message.text}
            </p>
          </div>
        )}

        {/* Open Shift Button */}
        <button
          onClick={handleOpenShift}
          disabled={!openingBalance || !acknowledged || isProcessing || isLoading}
          className="w-full bg-gradient-to-r from-yellow-600 to-yellow-700 hover:from-yellow-700 hover:to-yellow-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-lg transition flex items-center justify-center gap-2 text-lg"
        >
          {isProcessing ? (
            <>
              <Zap className="w-5 h-5 animate-spin" />
              Opening Shift...
            </>
          ) : (
            <>
              Open Shift
              <ChevronRight className="w-5 h-5" />
            </>
          )}
        </button>

        {/* Info Box */}
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-white mb-1">Before You Start</p>
              <ul className="text-gray-400 space-y-1 text-xs">
                <li>• Count the cash in your drawer</li>
                <li>• Note any discrepancies from yesterday</li>
                <li>• Verify the terminal is functioning properly</li>
                <li>• Check that printer is connected</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default POSShiftStart;


