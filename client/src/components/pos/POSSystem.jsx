/**
 * POS System - Main Container
 * Routes between different POS screens
 */

import React, { useState, useEffect } from 'react';
import POSMainMenu from './POSMainMenu';
import POSSale from './POSSale';
import POSLogin from './POSLogin';
import POSReturn from './POSReturn';
import POSPayments from './POSPayments';
import POSInventory from './POSInventory';
import POSReports from './POSReports';
import POSSettings from './POSSettings';
import POSShiftStart from './POSShiftStart';

export const POSSystem = () => {
  const [currentScreen, setCurrentScreen] = useState('menu');
  const [terminalId, setTerminalId] = useState(null);
  const [operatorId, setOperatorId] = useState(null);
  const [shiftId, setShiftId] = useState(null);
  const [shiftOpen, setShiftOpen] = useState(false);

  // Initialize from localStorage
  useEffect(() => {
    const savedTerminalId = localStorage.getItem('posTerminalId');
    const savedOperatorId = localStorage.getItem('posOperatorId');

    if (savedTerminalId && savedOperatorId) {
      setTerminalId(savedTerminalId);
      setOperatorId(savedOperatorId);
      setCurrentScreen('menu');
    } else {
      setCurrentScreen('login');
    }
  }, []);

  const handleNavigate = (screen) => {
    setCurrentScreen(screen);
  };

  const handleLogin = (terminal, operator) => {
    setTerminalId(terminal);
    setOperatorId(operator);
    localStorage.setItem('posTerminalId', terminal);
    localStorage.setItem('posOperatorId', operator);
    setCurrentScreen('shift-start'); // Changed from 'menu' to 'shift-start'
  };

  const handleShiftOpened = (shiftData) => {
    setShiftId(shiftData._id);
    setShiftOpen(true);
    localStorage.setItem('posShiftId', shiftData._id);
    setCurrentScreen('menu');
  };

  const handleLogout = () => {
    localStorage.removeItem('posTerminalId');
    localStorage.removeItem('posOperatorId');
    localStorage.removeItem('posShiftId');
    setTerminalId(null);
    setOperatorId(null);
    setShiftId(null);
    setShiftOpen(false);
    setCurrentScreen('login');
  };

  // Render screens
  if (!terminalId || !operatorId) {
    return <POSLogin onLogin={handleLogin} />;
  }

  // If shift is not open, show shift start screen
  if (!shiftOpen && currentScreen !== 'login') {
    return (
      <POSShiftStart
        terminalId={terminalId}
        operatorId={operatorId}
        onShiftOpened={handleShiftOpened}
      />
    );
  }

  switch (currentScreen) {
    case 'menu':
      return (
        <POSMainMenu
          onNavigate={handleNavigate}
          terminalId={terminalId}
          operatorId={operatorId}
          shiftId={shiftId}
          onLogout={handleLogout}
        />
      );
    case 'sale':
      return (
        <POSSale
          onBack={() => handleNavigate('menu')}
          terminalId={terminalId}
          operatorId={operatorId}
        />
      );
    case 'return':
      return (
        <POSReturn
          onBack={() => handleNavigate('menu')}
          terminalId={terminalId}
          operatorId={operatorId}
        />
      );
    case 'refunds':
      return <div className="p-8 text-white">Refunds Module (Coming Soon)</div>;
    case 'customers':
      return <div className="p-8 text-white">Customers Module (Coming Soon)</div>;
    case 'inventory':
      return (
        <POSInventory
          onBack={() => handleNavigate('menu')}
          terminalId={terminalId}
        />
      );
    case 'reports':
      return (
        <POSReports
          onBack={() => handleNavigate('menu')}
          terminalId={terminalId}
        />
      );
    case 'payments':
      return (
        <POSPayments
          onBack={() => handleNavigate('menu')}
          terminalId={terminalId}
          operatorId={operatorId}
        />
      );
    case 'settings':
      return (
        <POSSettings
          onBack={() => handleNavigate('menu')}
          terminalId={terminalId}
        />
      );
    default:
      return <POSMainMenu onNavigate={handleNavigate} />;
  }
};

export default POSSystem;


