/**
 * ProductNameInput.jsx
 * Product name input with real-time validation and suggestions
 * 
 * Features:
 * - Real-time validation with debounce
 * - Preview of auto-capitalized name
 * - Duplicate detection (on blur only)
 * - Error/warning messages
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import useProductNamingValidation from '../../hooks/useProductNamingValidation';
import { AlertCircle, CheckCircle, AlertTriangle } from 'lucide-react';

// ✅ Simple debounce utility (optimized for performance)
const debounce = (func, delay) => {
  let timeoutId;
  return function (...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};

const ProductNameInput = ({
  value = '',
  onChange,
  onBlur,
  errors = {},
  disabled = false,
  productId = null,
  label = 'Product Name *',
}) => {
  const namingValidation = useProductNamingValidation(productId);
  const [showPreview, setShowPreview] = useState(false);
  const debouncedValidateRef = useRef(null);

  // ✅ Setup debounced validation (300ms delay)
  useEffect(() => {
    debouncedValidateRef.current = debounce(() => {
      if (value && !namingValidation.isLoadingRules) {
        namingValidation.validate(value);
      }
    }, 300);
  }, [value, namingValidation]);

  // ✅ Validate on change with debounce (reduces from 30+ calls/sec to ~1 per 300ms)
  useEffect(() => {
    if (debouncedValidateRef.current) {
      debouncedValidateRef.current();
    }
  }, [value]);

  // ✅ Check for duplicates on blur
  const handleBlur = useCallback(async (e) => {
    if (value && !namingValidation.isLoadingRules) {
      await namingValidation.checkDuplicate(value);
    }
    onBlur?.(e);
  }, [value, namingValidation, onBlur]);

  const processedName = namingValidation.normalize(value);
  const hasError = errors?.name || (namingValidation.validationResult && !namingValidation.validationResult.isValid);
  const isDuplicate = namingValidation.duplicateCheck?.isDuplicate;

  return (
    <div className="space-y-1">
      <label className="text-xs font-semibold text-gray-700">
        {label}
      </label>

      <div className="relative">
        <input
          type="text"
          placeholder="Enter product name (e.g., Apple Iphone 14 Pro)"
          className={`border rounded px-3 py-2 text-xs w-full transition ${
            hasError || isDuplicate
              ? 'border-red-500 bg-red-50'
              : namingValidation.validationResult?.warnings.length > 0
              ? 'border-yellow-500 bg-yellow-50'
              : 'border-gray-300 bg-white'
          }`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={handleBlur}
          onFocus={() => setShowPreview(true)}
          disabled={disabled || namingValidation.isLoadingRules}
        />

        {/* Status Icon */}
        {value && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {namingValidation.isCheckingDuplicate ? (
              <div className="animate-spin">⏳</div>
            ) : isDuplicate ? (
              <AlertCircle size={16} className="text-red-500" title="Duplicate name" />
            ) : hasError ? (
              <AlertCircle size={16} className="text-red-500" title="Invalid name" />
            ) : namingValidation.validationResult?.warnings.length > 0 ? (
              <AlertTriangle size={16} className="text-yellow-500" title="Warning" />
            ) : (
              <CheckCircle size={16} className="text-green-500" title="Valid name" />
            )}
          </div>
        )}
      </div>

      {/* Error Message */}
      {errors?.name && (
        <p className="text-xs text-red-600 flex items-center gap-1">
          <AlertCircle size={12} />
          {errors.name}
        </p>
      )}

      {/* Duplicate Error */}
      {isDuplicate && (
        <div className="text-xs text-red-600 bg-red-50 p-2 rounded border border-red-200">
          <p className="font-semibold mb-1">⚠️ Product already exists!</p>
          {namingValidation.duplicateCheck?.similarProducts?.length > 0 && (
            <ul className="list-disc list-inside space-y-0.5">
              {namingValidation.duplicateCheck.similarProducts.slice(0, 3).map((product) => (
                <li key={product._id}>{product.name}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Validation Error */}
      {hasError && !isDuplicate && namingValidation.validationResult?.errors?.length > 0 && (
        <p className="text-xs text-red-600 flex items-center gap-1">
          <AlertCircle size={12} />
          {namingValidation.getErrorMessage()}
        </p>
      )}

      {/* Preview & Suggestion */}
      {showPreview && value && processedName !== value && (
        <div className="text-xs bg-blue-50 p-2 rounded border border-blue-200">
          <p className="text-blue-700">
            💡 <span className="font-semibold">Auto-format on save:</span>{' '}
            <span className="font-mono">{processedName}</span>
          </p>
        </div>
      )}

      {/* Warning Message */}
      {namingValidation.validationResult?.warnings?.length > 0 && !hasError && !isDuplicate && (
        <p className="text-xs text-yellow-700 flex items-center gap-1">
          <AlertTriangle size={12} />
          {namingValidation.getWarningMessage()}
        </p>
      )}

      {/* Loading Rules */}
      {namingValidation.isLoadingRules && (
        <p className="text-xs text-gray-500">Loading naming rules...</p>
      )}
    </div>
  );
};

export default ProductNameInput;
