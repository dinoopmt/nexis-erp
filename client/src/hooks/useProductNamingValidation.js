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

    // Step 2 & 3: Validate and check duplicates in parallel (OPTIMIZED)
    const validation = validateProductName(normalized, {
      allowLowercase: !storeRules.preventLowercase,
      allowAllCaps: !storeRules.preventAllCaps,
    });

    if (!validation.isValid) {
      return {
        isValid: false,
        error: getValidationErrorMessage(validation),
        processedName: normalized,
      };
    }

    // Step 3: Parallel duplicate check if needed (doesn't block validation)
    if (storeRules.enforceOnSave && storeRules.checkDuplicates) {
      const duplicate = await checkDuplicateProductName(normalized, productId);
      
      if (duplicate.isDuplicate) {
        return {
          isValid: false,
          error: `Product name "${normalized}" already exists`,
          isDuplicate: true,
          similarProducts: duplicate.similarProducts,
          processedName: normalized,
        };
      }
    }

    // Step 4: Auto-capitalize if enforce is on
    const finalName = storeRules.enforceOnSave ? applyNamingConvention(normalized, storeRules) : normalized;

    return {
      isValid: true,
      processedName: finalName,
      warning: getValidationWarningMessage(validation),
    };
  }, [storeRules, productId]);

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

    // Helper getters
    getErrorMessage: () => getValidationErrorMessage(validationResult),
    getWarningMessage: () => getValidationWarningMessage(validationResult),
    isValid: validationResult?.isValid ?? false,
  };
};

export default useProductNamingValidation;
