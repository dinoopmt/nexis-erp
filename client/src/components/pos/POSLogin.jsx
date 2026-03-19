/**
 * POS Login Screen
 * Terminal and Operator Selection
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { LogIn, AlertCircle, Zap, User, Monitor } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || '/api/v1';

export const POSLogin = ({ onLogin }) => {
  const [terminals, setTerminals] = useState([]);
  const [operators, setOperators] = useState([]);
  const [selectedTerminal, setSelectedTerminal] = useState('');
  const [selectedOperator, setSelectedOperator] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Fetch terminals and operators on mount
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError('');

      const [terminalsRes, operatorsRes] = await Promise.all([
        axios.get(`${API_URL}/api/v1/pos/terminals`),
        axios.get(`${API_URL}/api/v1/auth/users?role=cashier`)
      ]);

      setTerminals(terminalsRes.data.data || []);
      setOperators(operatorsRes.data.data || []);

      if (terminalsRes.data.data?.length === 0) {
        setError('No POS terminals configured');
      }
      if (operatorsRes.data.data?.length === 0) {
        setError('No operators available');
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load terminals or operators. Check connection.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!selectedTerminal || !selectedOperator) {
      setError('Please select both terminal and operator');
      return;
    }

    try {
      // Verify operator credentials (simplified - in real app, ask for PIN/password)
      const response = await axios.post(`${API_URL}/api/v1/pos/sessions/start`, {
        terminalId: selectedTerminal,
        operatorId: selectedOperator,
        timestamp: new Date().toISOString()
      });

      if (response.data.success) {
        onLogin(selectedTerminal, selectedOperator);
      }
    } catch (err) {
      setError('Login failed: ' + (err.response?.data?.message || err.message));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white flex items-center justify-center p-4">
      {/* Main Card */}
      <div className="max-w-md w-full bg-slate-800 border border-slate-700 rounded-2xl p-8 shadow-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="bg-blue-600 p-4 rounded-full">
              <Zap className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold mb-2">POS System</h1>
          <p className="text-gray-400">Point of Sale Terminal</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-500/20 border border-red-500 rounded-lg p-3 mb-6 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-400">{error}</p>
            </div>
          </div>
        )}

        {isLoading ? (
          /* Loading State */
          <div className="text-center py-8">
            <div className="inline-block animate-spin mb-3">
              <Zap className="w-6 h-6 text-blue-500" />
            </div>
            <p className="text-gray-400">Loading terminals...</p>
          </div>
        ) : (
          /* Form Content */
          <div className="space-y-5">
            {/* Terminal Selection */}
            <div>
              <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                <Monitor className="w-4 h-4 text-blue-500" />
                Select Terminal
              </label>
              <select
                value={selectedTerminal}
                onChange={(e) => setSelectedTerminal(e.target.value)}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              >
                <option value="">Choose a terminal...</option>
                {terminals.map(terminal => (
                  <option key={terminal._id} value={terminal._id}>
                    {terminal.terminalName} - {terminal.status}
                  </option>
                ))}
              </select>

              {/* Terminal Details */}
              {selectedTerminal && (
                <div className="mt-3 bg-slate-700/50 rounded-lg p-3 text-sm">
                  {terminals
                    .filter(t => t._id === selectedTerminal)
                    .map(t => (
                      <div key={t._id}>
                        <p className="text-gray-400">
                          <span className="font-medium">IP:</span> {t.ipAddress || 'Not configured'}
                        </p>
                        <p className="text-gray-400">
                          <span className="font-medium">Status:</span>{' '}
                          <span
                            className={
                              t.status === 'Active'
                                ? 'text-green-400'
                                : 'text-red-400'
                            }
                          >
                            {t.status}
                          </span>
                        </p>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* Operator Selection */}
            <div>
              <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                <User className="w-4 h-4 text-green-500" />
                Select Operator
              </label>
              <select
                value={selectedOperator}
                onChange={(e) => setSelectedOperator(e.target.value)}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              >
                <option value="">Choose an operator...</option>
                {operators.map(operator => (
                  <option key={operator._id} value={operator._id}>
                    {operator.name} ({operator.email})
                  </option>
                ))}
              </select>

              {/* Operator Details */}
              {selectedOperator && (
                <div className="mt-3 bg-slate-700/50 rounded-lg p-3 text-sm">
                  {operators
                    .filter(op => op._id === selectedOperator)
                    .map(op => (
                      <div key={op._id}>
                        <p className="text-gray-400">
                          <span className="font-medium">Name:</span> {op.name}
                        </p>
                        <p className="text-gray-400">
                          <span className="font-medium">Email:</span> {op.email}
                        </p>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* Login Button */}
            <button
              onClick={handleLogin}
              disabled={!selectedTerminal || !selectedOperator}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:opacity-50 py-3 rounded-lg font-bold transition flex items-center justify-center gap-2 mt-6"
            >
              <LogIn className="w-5 h-5" />
              Start Shift
            </button>

            {/* Retry Button */}
            <button
              onClick={fetchData}
              className="w-full bg-slate-700 hover:bg-slate-600 py-2 rounded-lg text-sm transition"
            >
              Reload
            </button>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-slate-700 text-center">
          <p className="text-xs text-gray-400">
            System Status:{' '}
            <span className="text-green-400 font-medium">● Online</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default POSLogin;


