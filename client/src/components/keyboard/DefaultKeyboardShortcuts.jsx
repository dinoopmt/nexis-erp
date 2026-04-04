/**
 * DefaultKeyboardShortcuts.jsx
 * Registers default global keyboard shortcuts for the app
 * 
 * Shortcuts:
 * - Ctrl+N: New Product
 * - Ctrl+S: Save (in active form)
 * - Ctrl+F: Search/Filter
 * - Ctrl+?: Show keyboard help
 * - Escape: Close modals/dropdowns
 * - And more...
 */

import { useContext, useEffect } from 'react';
import { GlobalKeyboardContext } from '../../context/GlobalKeyboardContext';
import { ProductFormContext } from '../../context/ProductFormContext';

export const DefaultKeyboardShortcuts = () => {
  const { registerShortcut } = useContext(GlobalKeyboardContext);
  const { openProductForm } = useContext(ProductFormContext);

  useEffect(() => {
    const unregisterFunctions = [];

    // ✅ Ctrl+N: New Product
    unregisterFunctions.push(
      registerShortcut('Ctrl+N', () => {
        openProductForm({ mode: 'create', product: null });
      }, {
        description: 'Create new product',
        category: 'Product',
        global: true,
      })
    );

    // ✅ Ctrl+?: Show keyboard help
    unregisterFunctions.push(
      registerShortcut('?', () => {
        const event = new CustomEvent('openKeyboardHelp');
        window.dispatchEvent(event);
      }, {
        description: 'Show keyboard shortcuts help',
        category: 'General',
        global: true,
      })
    );

    // ✅ Ctrl+Shift+?: Also show help
    unregisterFunctions.push(
      registerShortcut('Ctrl+?', () => {
        const event = new CustomEvent('openKeyboardHelp');
        window.dispatchEvent(event);
      }, {
        description: 'Show keyboard shortcuts help (alternate)',
        category: 'General',
        global: true,
      })
    );

    // ✅ Ctrl+F: Open search/filter (dispatches custom event to components)
    unregisterFunctions.push(
      registerShortcut('Ctrl+F', (e) => {
        e.preventDefault(); // Prevent browser find
        const event = new CustomEvent('openGlobalSearch');
        window.dispatchEvent(event);
      }, {
        description: 'Open search',
        category: 'Search',
        global: true,
      })
    );

    // ✅ Ctrl+K: Command palette (quick search/navigation)
    unregisterFunctions.push(
      registerShortcut('Ctrl+K', () => {
        const event = new CustomEvent('openCommandPalette');
        window.dispatchEvent(event);
      }, {
        description: 'Open command palette / quick search',
        category: 'Navigation',
        global: true,
      })
    );

    // ✅ Ctrl+Home: Go to dashboard / home
    unregisterFunctions.push(
      registerShortcut('Ctrl+Home', () => {
        window.location.href = '/';
      }, {
        description: 'Go to home / dashboard',
        category: 'Navigation',
        global: true,
      })
    );

    // ✅ Ctrl+E: Toggle theme / expand mode
    unregisterFunctions.push(
      registerShortcut('Ctrl+E', () => {
        const event = new CustomEvent('toggleExpandMode');
        window.dispatchEvent(event);
      }, {
        description: 'Toggle expand/collapse mode',
        category: 'General',
        global: true,
      })
    );

    // ✅ Ctrl+,: Open settings
    unregisterFunctions.push(
      registerShortcut('Ctrl+,', () => {
        const event = new CustomEvent('openSettings');
        window.dispatchEvent(event);
      }, {
        description: 'Open settings',
        category: 'General',
        global: true,
      })
    );

    // ✅ Ctrl+L: Focus search bar / quick search
    unregisterFunctions.push(
      registerShortcut('Ctrl+L', () => {
        const event = new CustomEvent('focusSearchBar');
        window.dispatchEvent(event);
      }, {
        description: 'Focus search bar',
        category: 'Search',
        global: true,
      })
    );

    // ✅ Alt+1: Navigate to Products
    unregisterFunctions.push(
      registerShortcut('Alt+1', () => {
        window.location.href = '/products';
      }, {
        description: 'Navigate to Products',
        category: 'Navigation',
        global: true,
      })
    );

    // ✅ Alt+2: Navigate to GRN
    unregisterFunctions.push(
      registerShortcut('Alt+2', () => {
        window.location.href = '/grn';
      }, {
        description: 'Navigate to GRN',
        category: 'Navigation',
        global: true,
      })
    );

    // ✅ Alt+3: Navigate to Sales
    unregisterFunctions.push(
      registerShortcut('Alt+3', () => {
        window.location.href = '/sales';
      }, {
        description: 'Navigate to Sales',
        category: 'Navigation',
        global: true,
      })
    );

    // ✅ Alt+4: Navigate to Reports
    unregisterFunctions.push(
      registerShortcut('Alt+4', () => {
        window.location.href = '/reports';
      }, {
        description: 'Navigate to Reports',
        category: 'Navigation',
        global: true,
      })
    );

    // Return cleanup function that unregisters all shortcuts
    return () => {
      unregisterFunctions.forEach(fn => fn?.());
    };
  }, [registerShortcut, openProductForm]);

  return null; // No UI render needed
};

export default DefaultKeyboardShortcuts;
