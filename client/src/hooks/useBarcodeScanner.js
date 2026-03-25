import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Custom hook for barcode scanner functionality
 * Handles scanner state, keyboard listener, and barcode processing
 */
export const useBarcodeScanner = (onBarcodeScan, scannerActive = true) => {
  const [scannerInput, setScannerInput] = useState('');
  const [lastScanTime, setLastScanTime] = useState(0);

  const barcodeBuffer = useRef('');
  const lastKeyTime = useRef(0);

  // Global keyboard listener for barcode scanner
  useEffect(() => {
    if (!scannerActive) return;

    const handleKeyDown = (e) => {
      const now = Date.now();
      const timeDiff = now - lastKeyTime.current;

      // Reset buffer if too much time passed (>100ms between keys = manual typing)
      if (timeDiff > 100) {
        barcodeBuffer.current = '';
      }

      lastKeyTime.current = now;

      // Ignore modifier keys and special keys (except Enter)
      if (e.key === 'Enter') {
        if (barcodeBuffer.current.length >= 3) {
          e.preventDefault();
          onBarcodeScan(barcodeBuffer.current.toUpperCase());
          setLastScanTime(Date.now());
        }
        barcodeBuffer.current = '';
        return;
      }

      // Only capture alphanumeric characters
      if (e.key.length === 1 && /[a-zA-Z0-9]/.test(e.key)) {
        // Don't capture if user is typing in an input field (except in scanner input)
        const activeElement = document.activeElement;
        const isInputField =
          activeElement.tagName === 'INPUT' ||
          activeElement.tagName === 'TEXTAREA' ||
          activeElement.isContentEditable;

        if (!isInputField) {
          barcodeBuffer.current += e.key;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [scannerActive, onBarcodeScan]);

  // Handle manual barcode input submission
  const handleScannerSubmit = useCallback(
    (e) => {
      e.preventDefault();
      if (scannerInput.trim()) {
        onBarcodeScan(scannerInput.trim().toUpperCase());
        setLastScanTime(Date.now());
      }
    },
    [scannerInput, onBarcodeScan]
  );

  return {
    scannerInput,
    setScannerInput,
    lastScanTime,
    setLastScanTime,
    handleScannerSubmit,
  };
};
