/**
 * useGlobalKeyboard.js
 * Custom hook for using global keyboard shortcuts
 * 
 * Usage:
 * const { registerShortcut } = useGlobalKeyboard();
 * 
 * useEffect(() => {
 *   const unregister = registerShortcut('Ctrl+N', () => {
 *     console.log('New item created');
 *   }, {
 *     description: 'Create new product',
 *     category: 'Product',
 *   });
 *   
 *   return unregister; // Cleanup
 * }, [registerShortcut]);
 */

import { useContext, useCallback } from 'react';
import { GlobalKeyboardContext } from '../context/GlobalKeyboardContext';

export const useGlobalKeyboard = () => {
  const context = useContext(GlobalKeyboardContext);

  if (!context) {
    throw new Error('useGlobalKeyboard must be used within GlobalKeyboardProvider');
  }

  return context;
};

export default useGlobalKeyboard;
