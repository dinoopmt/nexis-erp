/**
 * ============================================================================
 * UI ENHANCEMENT HOOKS FOR PRODUCT FORM
 * ============================================================================
 * 
 * Custom React hooks for improved user experience:
 * - useFormProgress: Track multi-step form completion
 * - useAutoSave: Auto-save drafts to localStorage
 * - useValidationFeedback: Real-time validation with visual feedback
 * - useBulkOperation: Handle bulk product operations
 * 
 * ============================================================================
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { createValidator } from './productValidator';

/**
 * Hook: Track form completion progress
 * Returns percentage of required fields completed
 */
export const useFormProgress = (formData, requiredFields = []) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (requiredFields.length === 0) {
      setProgress(0);
      return;
    }

    let completedCount = 0;
    
    requiredFields.forEach(field => {
      const value = formData[field];
      
      // Check if field has meaningful value
      if (value !== null && value !== undefined && value !== '' && value !== 'Auto-generated') {
        completedCount++;
      }
    });

    const percentComplete = Math.round((completedCount / requiredFields.length) * 100);
    setProgress(Math.min(percentComplete, 100));
  }, [formData, requiredFields]);

  return progress;
};

/**
 * Hook: Auto-save form data to localStorage
 * Allows users to resume if page is accidentally closed
 */
export const useAutoSave = (formData, storageKey = 'product_form_draft', shouldSave = true) => {
  const autoSaveTimer = useRef(null);
  const [lastSaved, setLastSaved] = useState(null);
  const [hasDraft, setHasDraft] = useState(false);

  // Auto-save after user stops typing (debounced)
  useEffect(() => {
    if (!shouldSave) return;

    // Clear existing timer
    if (autoSaveTimer.current) {
      clearTimeout(autoSaveTimer.current);
    }

    // Set new timer
    autoSaveTimer.current = setTimeout(() => {
      try {
        localStorage.setItem(storageKey, JSON.stringify(formData));
        setLastSaved(new Date());
        console.log('📝 Form auto-saved to draft');
      } catch (err) {
        console.warn('Failed to save draft:', err);
      }
    }, 5000); // Save after 5 seconds of inactivity

    return () => {
      if (autoSaveTimer.current) {
        clearTimeout(autoSaveTimer.current);
      }
    };
  }, [formData, storageKey, shouldSave]);

  // Load draft on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        setHasDraft(true);
      }
    } catch (err) {
      console.warn('Failed to check for draft:', err);
    }
  }, [storageKey]);

  // Load draft function
  const loadDraft = useCallback(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (err) {
      console.error('Failed to load draft:', err);
    }
    return null;
  }, [storageKey]);

  // Clear draft function
  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(storageKey);
      setHasDraft(false);
      console.log('Draft cleared');
    } catch (err) {
      console.warn('Failed to clear draft:', err);
    }
  }, [storageKey]);

  return {
    lastSaved,
    hasDraft,
    loadDraft,
    clearDraft
  };
};

/**
 * Hook: Real-time validation with field-level feedback
 */
export const useValidationFeedback = (formData, validationRules = []) => {
  const [fieldErrors, setFieldErrors] = useState({});
  const [fieldWarnings, setFieldWarnings] = useState({});
  const validatorRef = useRef(new createValidator());

  // Validate on form data change
  useEffect(() => {
    const validator = validatorRef.current;
    const result = validator.validateProduct(formData);

    setFieldErrors(result.fieldErrors);

    // Separate warnings by field
    const warnings = {};
    result.warnings.forEach(warn => {
      if (!warnings[warn.field]) {
        warnings[warn.field] = [];
      }
      warnings[warn.field].push(warn.message);
    });
    setFieldWarnings(warnings);
  }, [formData]);

  // Get error for specific field
  const getFieldError = useCallback((field) => {
    return fieldErrors[field]?.[0] || null;
  }, [fieldErrors]);

  // Get warning for specific field
  const getFieldWarning = useCallback((field) => {
    return fieldWarnings[field]?.[0] || null;
  }, [fieldWarnings]);

  // Check if field has error
  const hasError = useCallback((field) => {
    return !!fieldErrors[field]?.length;
  }, [fieldErrors]);

  // Check if field has warning
  const hasWarning = useCallback((field) => {
    return !!fieldWarnings[field]?.length;
  }, [fieldWarnings]);

  // Get all errors
  const getErrors = useCallback(() => {
    return Object.entries(fieldErrors).reduce((acc, [field, errors]) => {
      return [...acc, ...errors.map(msg => ({ field, message: msg }))];
    }, []);
  }, [fieldErrors]);

  return {
    fieldErrors,
    fieldWarnings,
    getFieldError,
    getFieldWarning,
    hasError,
    hasWarning,
    getErrors,
    isValid: Object.keys(fieldErrors).length === 0
  };
};

/**
 * Hook: Handle bulk product operations
 * Manages batching and progress tracking for multiple products
 */
export const useBulkOperation = () => {
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);
  const [bulkProgress, setBulkProgress] = useState(0);
  const [bulkStatus, setBulkStatus] = useState('idle'); // idle, processing, completed, error
  const [bulkResults, setBulkResults] = useState({
    successful: [],
    failed: [],
    skipped: []
  });

  // Process items in batches
  const processBatch = useCallback(async (items, batchFn, batchSize = 10) => {
    setIsBulkProcessing(true);
    setBulkStatus('processing');
    setBulkProgress(0);
    setBulkResults({ successful: [], failed: [], skipped: [] });

    const results = { successful: [], failed: [], skipped: [] };
    const batches = [];

    // Create batches
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }

    // Process each batch
    for (let batchIdx = 0; batchIdx < batches.length; batchIdx++) {
      const batch = batches[batchIdx];

      try {
        const batchResults = await Promise.allSettled(
          batch.map(item => batchFn(item))
        );

        batchResults.forEach((result, itemIdx) => {
          if (result.status === 'fulfilled') {
            results.successful.push(batch[itemIdx]);
          } else {
            results.failed.push({
              item: batch[itemIdx],
              error: result.reason?.message || 'Unknown error'
            });
          }
        });
      } catch (err) {
        results.failed.push({
          batch: batchIdx,
          error: err.message
        });
      }

      // Update progress
      const processed = (batchIdx + 1) * batchSize;
      setBulkProgress(Math.min(Math.round((processed / items.length) * 100), 100));
      setBulkResults({ ...results });
    }

    setIsBulkProcessing(false);
    setBulkStatus('completed');

    return results;
  }, []);

  // Reset state
  const reset = useCallback(() => {
    setIsBulkProcessing(false);
    setBulkProgress(0);
    setBulkStatus('idle');
    setBulkResults({ successful: [], failed: [], skipped: [] });
  }, []);

  return {
    isBulkProcessing,
    bulkProgress,
    bulkStatus,
    bulkResults,
    processBatch,
    reset
  };
};

/**
 * Hook: Debounced search
 * Reduces API calls during search/filter operations
 */
export const useDebounce = (value, delay = 500) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
};

/**
 * Hook: Keyboard shortcut handling
 * Improve data entry speed with keyboard shortcuts
 */
export const useKeyboardShortcuts = (shortcuts = {}) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Skip if typing in textarea/input (unless specifically allowed)
      const target = e.target;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';

      // Check for matching shortcuts
      Object.entries(shortcuts).forEach(([key, handler]) => {
        const [keys, options] = typeof key === 'string' ? [key, {}] : [key[0], key[1]];
        
        // Parse key combination (e.g., "ctrl+s", "shift+alt+n")
        const [primaryKey, ...modifiers] = keys.toLowerCase().split('+');
        const eventKey = e.key.toLowerCase();

        const isCtrl = modifiers.includes('ctrl') ? (e.ctrlKey || e.metaKey) : !e.ctrlKey && !e.metaKey;
        const isShift = modifiers.includes('shift') ? e.shiftKey : !e.shiftKey;
        const isAlt = modifiers.includes('alt') ? e.altKey : !e.altKey;

        if (eventKey === primaryKey && isCtrl && isShift && isAlt) {
          if (!isInput || options.allowInInput) {
            e.preventDefault();
            handler();
          }
        }
      });
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]);
};

/**
 * Hook: Request deduplication
 * Prevent duplicate API calls when user double-clicks submit
 */
export const useRequestDedup = () => {
  const pendingRequests = useRef(new Map());

  const makeRequest = useCallback(async (key, requestFn) => {
    // If request is already pending, return the pending promise
    if (pendingRequests.current.has(key)) {
      console.log(`Request ${key} is already pending, returning existing promise`);
      return pendingRequests.current.get(key);
    }

    // Create new request promise
    const requestPromise = requestFn()
      .then(result => {
        pendingRequests.current.delete(key);
        return result;
      })
      .catch(error => {
        pendingRequests.current.delete(key);
        throw error;
      });

    pendingRequests.current.set(key, requestPromise);
    return requestPromise;
  }, []);

  const clearPending = useCallback((key) => {
    pendingRequests.current.delete(key);
  }, []);

  return {
    makeRequest,
    clearPending,
    hasPendingRequest: (key) => pendingRequests.current.has(key),
    getPendingCount: () => pendingRequests.current.size
  };
};

export default {
  useFormProgress,
  useAutoSave,
  useValidationFeedback,
  useBulkOperation,
  useDebounce,
  useKeyboardShortcuts,
  useRequestDedup
};


