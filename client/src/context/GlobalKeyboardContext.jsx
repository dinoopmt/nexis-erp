/**
 * GlobalKeyboardContext.jsx
 * Global keyboard shortcuts management system
 * 
 * Features:
 * - Global keyboard shortcuts accessible anywhere in the app
 * - Prevent conflicts with form inputs
 * - Customizable shortcuts per component
 * - Help dialog showing all available shortcuts
 * 
 * Usage:
 * const { registerShortcut, showKeyboardHelp } = useContext(GlobalKeyboardContext);
 * registerShortcut('Ctrl+N', () => console.log('New item'));
 */

import React, { createContext, useState, useCallback, useEffect, useRef } from 'react';

export const GlobalKeyboardContext = createContext();

export const GlobalKeyboardProvider = ({ children }) => {
  const [shortcuts, setShortcuts] = useState({});
  const [showHelp, setShowHelp] = useState(false);
  const [focusedInput, setFocusedInput] = useState(null);
  const shortcutsRef = useRef({});

  // ✅ Track if focus is on input/textarea/contenteditable
  useEffect(() => {
    const handleFocus = (e) => {
      const isFormElement = 
        e.target.matches('input, textarea, [contenteditable="true"]') ||
        e.target.closest('input, textarea, [contenteditable="true"]');
      setFocusedInput(isFormElement ? e.target : null);
    };

    const handleBlur = () => {
      setFocusedInput(null);
    };

    document.addEventListener('focus', handleFocus, true);
    document.addEventListener('blur', handleBlur, true);

    return () => {
      document.removeEventListener('focus', handleFocus, true);
      document.removeEventListener('blur', handleBlur, true);
    };
  }, []);

  // ✅ Normalize keyboard shortcut format (Ctrl+N, Shift+Ctrl+S, etc.)
  const normalizeShortcut = useCallback((shortcut) => {
    return shortcut
      .split('+')
      .map(key => key.trim().toLowerCase())
      .sort()
      .join('+');
  }, []);

  // ✅ Convert keyboard event to shortcut string
  const eventToShortcut = useCallback((e) => {
    const keys = [];
    if (e.ctrlKey) keys.push('ctrl');
    if (e.shiftKey) keys.push('shift');
    if (e.altKey) keys.push('alt');
    if (e.metaKey) keys.push('meta');
    
    const key = e.key.toLowerCase();
    if (!['control', 'shift', 'alt', 'meta'].includes(key)) {
      keys.push(key);
    }
    
    return keys.length > 0 ? keys.sort().join('+') : null;
  }, []);

  // ✅ Register a keyboard shortcut
  const registerShortcut = useCallback((shortcut, handler, options = {}) => {
    const normalized = normalizeShortcut(shortcut);
    const id = options.id || `${normalized}-${Date.now()}`;
    
    shortcutsRef.current[id] = {
      normalized,
      handler,
      global: options.global !== false, // Default to global (skip on form input)
      allowInInput: options.allowInInput === true,
      description: options.description || '',
      category: options.category || 'General',
    };

    setShortcuts({ ...shortcutsRef.current });
    
    // Return unregister function
    return () => {
      delete shortcutsRef.current[id];
      setShortcuts({ ...shortcutsRef.current });
    };
  }, [normalizeShortcut]);

  // ✅ Unregister a specific shortcut by ID
  const unregisterShortcut = useCallback((id) => {
    delete shortcutsRef.current[id];
    setShortcuts({ ...shortcutsRef.current });
  }, []);

  // ✅ Global keyboard event listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      // 🔍 IMPORTANT: Skip native browser navigation keys
      // These should NEVER be intercepted by our shortcuts system
      // (Tab, Arrow keys, etc. need to work naturally in forms)
      const nativeNavKeys = [
        'Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
        'Enter', 'Space', 'Home', 'End', 'PageUp', 'PageDown',
        'Backspace', 'Delete'
        // NOTE: Escape is NOT in this list - we handle it as a shortcut to close GRN modal
      ];
      
      if (nativeNavKeys.includes(e.key)) {
        // ✅ Let browser handle these keys natively (no preventDefault, no shortcut processing)
        return;
      }

      const eventShortcut = eventToShortcut(e);
      if (!eventShortcut) {
        return;
      }

      // ✅ Skip if user is typing in an input/textarea
      const isFormInput = 
        focusedInput && 
        (focusedInput.tagName === 'INPUT' || 
         focusedInput.tagName === 'TEXTAREA' ||
         focusedInput.contentEditable === 'true');

      // Find matching shortcuts
      Object.values(shortcutsRef.current).forEach((shortcut) => {
        if (shortcut.normalized === eventShortcut) {
          // Skip global shortcuts if user is in form input
          if (isFormInput && shortcut.global && !shortcut.allowInInput) {
            return;
          }

          // Execute handler if not a form input, or if it's a local (non-global) shortcut
          e.preventDefault();
          shortcut.handler(e);
        }
      });
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [focusedInput, eventToShortcut]);

  // ✅ Get all shortcuts grouped by category
  const getShortcutsByCategory = useCallback(() => {
    const categories = {};
    
    Object.values(shortcutsRef.current).forEach((shortcut) => {
      if (!categories[shortcut.category]) {
        categories[shortcut.category] = [];
      }
      categories[shortcut.category].push(shortcut);
    });

    return categories;
  }, []);

  // ✅ Get all shortcuts as flat array
  const getAllShortcuts = useCallback(() => {
    return Object.values(shortcutsRef.current);
  }, []);

  // ✅ Clear all shortcuts (for cleanup)
  const clearAllShortcuts = useCallback(() => {
    shortcutsRef.current = {};
    setShortcuts({});
  }, []);

  const value = {
    registerShortcut,
    unregisterShortcut,
    clearAllShortcuts,
    getShortcutsByCategory,
    getAllShortcuts,
    showHelp,
    setShowHelp,
    focusedInput,
  };

  return (
    <GlobalKeyboardContext.Provider value={value}>
      {children}
    </GlobalKeyboardContext.Provider>
  );
};
