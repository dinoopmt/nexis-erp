/**
 * Context: TerminalContext
 * 
 * Provides terminal configuration to entire app
 * Manages terminal info, controls, and printer settings
 * 
 * ALL CONTROLS ARE FROM: TerminalManagement Collection (MongoDB)
 * 
 * Available Terminal Controls (from DB):
 * ─────────────────────────────────────────────────────────────
 * Sales Controls:
 *   - allowReturns (boolean)
 *   - allowDiscounts (boolean)
 *   - allowCredits (boolean)
 *   - allowExchanges (boolean)
 *   - allowPromotions (boolean)
 * 
 * Hardware Mapping:
 *   - invoicePrinter.enabled (boolean)
 *   - invoicePrinter.printerName (string)
 *   - invoicePrinter.timeout (number)
 *   - barcodePrinter.enabled (boolean)
 *   - barcodePrinter.printerName (string)
 *   - barcodePrinter.timeout (number)
 *   - customerDisplay.enabled (boolean)
 * 
 * Format Mapping:
 *   - invoice.templateId (ObjectId)
 *   - deliveryNote.templateId (ObjectId)
 *   - quotation.templateId (ObjectId)
 *   - salesOrder.templateId (ObjectId)
 *   - salesReturn.templateId (ObjectId)
 * ─────────────────────────────────────────────────────────────
 */

import React, { createContext, useContext } from 'react';
import { useTerminalConfig as useTerminalConfigHook } from '../hooks/useTerminalConfig';

const TerminalContext = createContext(null);

export function TerminalProvider({ children }) {
  const terminalData = useTerminalConfigHook();

  return (
    <TerminalContext.Provider value={terminalData}>
      {children}
    </TerminalContext.Provider>
  );
}

/**
 * Hook to use terminal context
 */
export function useTerminal() {
  const context = useContext(TerminalContext);
  if (!context) {
    console.warn('⚠️ useTerminal must be used within TerminalProvider');
    return {
      terminalConfig: null,
      isLoading: false,
      error: null,
      refetch: () => {},
    };
  }
  return context;
}

/**
 * Hook to check if feature is allowed
 * 
 * Available features (from TerminalManagement.salesControls):
 *   - allowReturns
 *   - allowDiscounts
 *   - allowCredits
 *   - allowExchanges
 *   - allowPromotions
 * 
 * ⚠️ DO NOT USE for discount amount validation
 * Discount amounts are ROLE-BASED, not terminal-based
 * 
 * @param {string} featureName - Feature name from TerminalManagement.salesControls
 * @returns {boolean} - True if feature is allowed (default: true if not found)
 */
export function useTerminalFeature(featureName) {
  const { terminalConfig } = useTerminal();
  
  // If no config or no salesControls, default to true (feature allowed)
  if (!terminalConfig?.salesControls) {
    return true;
  }

  // Get the feature value from database
  const feature = terminalConfig.salesControls[featureName];
  
  // Return true if not explicitly set to false (safer default)
  return feature !== false;
}

/**
 * Hook to get printer info
 * 
 * Available printers (from TerminalManagement.hardwareMapping):
 *   - invoicePrinter
 *   - barcodePrinter
 * 
 * Returns: { enabled: boolean, printerName: string, timeout: number }
 * 
 * @param {string} printerType - Type of printer (invoicePrinter or barcodePrinter)
 * @returns {Object|null} - Printer config or null if not available
 */
export function useTerminalPrinter(printerType = 'invoicePrinter') {
  const { terminalConfig } = useTerminal();

  if (!terminalConfig?.hardwareMapping?.[printerType]) {
    return null;
  }

  return {
    enabled: terminalConfig.hardwareMapping[printerType].enabled || false,
    printerName: terminalConfig.hardwareMapping[printerType].printerName || '',
    timeout: terminalConfig.hardwareMapping[printerType].timeout || 5000,
  };
}

/**
 * Hook to validate discount
 * 
 * ⚠️ IMPORTANT: Discount validation is ROLE-BASED, not terminal-based
 * 
 * maxDiscount and requireApprovalAbove from TerminalManagement are DEPRECATED
 * Use role-based permission checks instead:
 * 
 * const user = JSON.parse(localStorage.getItem('user'));
 * const role = user?.role?.name; // STAFF, MANAGER, ADMIN, etc.
 * const roleLimit = { STAFF: 5, MANAGER: 25, ADMIN: 100 }[role];
 * 
 * @deprecated Use role-based discount validation instead
 * @returns {Object} - Utility object with deprecation note
 */
export function useTerminalDiscount() {
  const { terminalConfig } = useTerminal();

  const validate = (discountAmount) => {
    // ⚠️ Discount validation should be based on USER ROLE, not terminal
    // See documentation for role-based implementation
    return { 
      valid: true, 
      message: 'Use role-based discount validation based on user role',
      deprecated: true,
    };
  };

  return {
    maxDiscount: null, // Not applicable - use role permissions
    requireApprovalAbove: null, // Not applicable - use role permissions
    validate,
    deprecated: true,
    note: '⚠️ IMPORTANT: Discount validation is ROLE-BASED, not terminal-based. Use user.role.name to determine discount limits.',
  };
}
