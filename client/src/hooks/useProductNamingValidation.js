/**
 * useProductNamingValidation.js
 * Custom hook for product name validation and auto-capitalization
 * 
 * Features:
 * - Real-time validation
 * - Duplicate detection
 * - Auto-capitalization on save
 * - Store settings integration
 */

import { useState, useCallback, useEffect } from 'react';
import {
  validateProductName,
  normalizeProductName,
  checkDuplicateProductName,
  getStoreNamingRules,
  applyNamingConvention,
  getValidationErrorMessage,
  getValidationWarningMessage,
} from '../utils/productNamingConvention';

export const useProductNamingValidation = (productId = null) => {
  const [storeRules, setStoreRules] = useState(null);
  const [validationResult, setValidationResult] = useState(null);
  const [duplicateCheck, setDuplicateCheck] = useState({ isDuplicate: false, similarProducts: [] });
  const [isCheckingDuplicate, setIsCheckingDuplicate] = useState(false);
  const [isLoadingRules, setIsLoadingRules] = useState(true);
  
  // ✅ NEW: Track last validated name to prevent re-validation on non-name field changes
  const [lastValidatedName, setLastValidatedName] = useState(null);
  const [validationCache, setValidationCache] = useState({});

  // ✅ Load store naming rules on mount
  useEffect(() => {
    const loadRules = async () => {
      try {
        const rules = await getStoreNamingRules();
        setStoreRules(rules);
      } catch (error) {
        console.error('Failed to load naming rules:', error);
      } finally {
        setIsLoadingRules(false);
      }
    };

    loadRules();
  }, []);

  // ✅ Validate product name
  const validate = useCallback((name) => {
    if (!storeRules) return null;

    const result = validateProductName(name, {
      allowLowercase: !storeRules.preventLowercase,
      allowAllCaps: !storeRules.preventAllCaps,
    });

    setValidationResult(result);
    return result;
  }, [storeRules]);

  // ✅ Check for duplicate product name
  const checkDuplicate = useCallback(async (name) => {
    if (!storeRules?.checkDuplicates || !name.trim()) {
      setDuplicateCheck({ isDuplicate: false, similarProducts: [] });
      return { isDuplicate: false, similarProducts: [] };
    }

    setIsCheckingDuplicate(true);
    try {
      const result = await checkDuplicateProductName(name, productId);
      setDuplicateCheck(result);
      return result;
    } catch (error) {
      console.error('Error checking duplicates:', error);
      setDuplicateCheck({ isDuplicate: false, similarProducts: [], error: error.message });
      return { isDuplicate: false, similarProducts: [] };
    } finally {
      setIsCheckingDuplicate(false);
    }
  }, [storeRules, productId]);

  // ✅ Normalize name (trim and capitalize)
  const normalize = useCallback((name) => {
    if (!storeRules) return name;
    return normalizeProductName(name);
  }, [storeRules]);

  // ✅ Apply naming convention
  const applyConvention = useCallback((name) => {
    if (!storeRules) return name;
    return applyNamingConvention(name, storeRules);
  }, [storeRules]);

  // ✅ Full validation and preparation for save
  const validateAndPrepareForSave = useCallback(async (name) => {
    if (!storeRules) return { isValid: false, error: 'Rules not loaded' };

    // Step 1: Normalize
    const normalized = normalizeProductName(name);

    // ✅ NEW: Check validation cache - skip if this exact name was just validated
    if (validationCache[normalized] && lastValidatedName === normalized) {
      console.log('✅ Using cached validation result for name:', normalized);
      return validationCache[normalized];
    }

    console.log('🔄 Validating name:', normalized);

    // Step 2 & 3: Validate and check duplicates in parallel (OPTIMIZED)
    const validation = validateProductName(normalized, {
      allowLowercase: !storeRules.preventLowercase,
      allowAllCaps: !storeRules.preventAllCaps,
    });

    if (!validation.isValid) {
      const result = {
        isValid: false,
        error: getValidationErrorMessage(validation),
        processedName: normalized,
      };
      // Cache invalid result
      setValidationCache(prev => ({ ...prev, [normalized]: result }));
      setLastValidatedName(normalized);
      return result;
    }

    // Step 3: Parallel duplicate check if needed (doesn't block validation)
    if (storeRules.enforceOnSave && storeRules.checkDuplicates) {
      try {
        const duplicate = await checkDuplicateProductName(normalized, productId);
        
        if (duplicate.isDuplicate) {
          const result = {
            isValid: false,
            error: `Product name "${normalized}" already exists`,
            isDuplicate: true,
            similarProducts: duplicate.similarProducts,
            processedName: normalized,
          };
          // Cache duplicate error
          setValidationCache(prev => ({ ...prev, [normalized]: result }));
          setLastValidatedName(normalized);
          return result;
        }
      } catch (error) {
        console.error('❌ Duplicate check error (continuing with validation):', error.message);
        // Don't fail - allow save even if duplicate check fails
      }
    }

    // Step 4: Auto-capitalize if enforce is on
    const finalName = storeRules.enforceOnSave ? applyNamingConvention(normalized, storeRules) : normalized;

    const result = {
      isValid: true,
      processedName: finalName,
      warning: getValidationWarningMessage(validation),
    };

    // ✅ Cache successful validation result
    setValidationCache(prev => ({ ...prev, [normalized]: result }));
    setLastValidatedName(normalized);

    return result;
  }, [storeRules, productId, validationCache, lastValidatedName]);

  return {
    // State
    storeRules,
    validationResult,
    duplicateCheck,
    isCheckingDuplicate,
    isLoadingRules,

    // Functions
    validate,
    checkDuplicate,
    normalize,
    applyConvention,
    validateAndPrepareForSave,

    // ✅ NEW: Clear cache when modal reopens or form resets
    clearCache: useCallback(() => {
      setValidationCache({});
      setLastValidatedName(null);
      setDuplicateCheck({ isDuplicate: false, similarProducts: [] });
    }, []),

    // Helper getters
    getErrorMessage: () => getValidationErrorMessage(validationResult),
    getWarningMessage: () => getValidationWarningMessage(validationResult),
    isValid: validationResult?.isValid ?? false,
  };
};

export default useProductNamingValidation;
