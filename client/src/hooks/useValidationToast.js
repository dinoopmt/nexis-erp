import { showToast } from '../components/shared/AnimatedCenteredToast.jsx';
import { getValidationErrorMessage } from '@/utils/validationUtils';

/**
 * Hook for consistent validation error notifications
 * 
 * Usage:
 * const { showValidationError, showApiError, showSuccess } = useValidationToast();
 * 
 * // Validate and show errors
 * const result = validateProductBasicInfo(formData);
 * if (!showValidationError(result)) return; // Will show toast if invalid
 * 
 * // API errors
 * try {
 *   await saveProduct();
 * } catch (error) {
 *   showApiError(error);
 * }
 */
export const useValidationToast = () => {
  /**
   * Show validation error from validator result
   * @param {object} result - Result from validation function
   * @returns {boolean} True if valid, false if invalid
   */
  const showValidationError = (result) => {
    if (!result || result.isValid) {
      return true;
    }

    const message = getValidationErrorMessage(result);
    
    showToast('error', message);

    return false;
  };

  /**
   * Show API error
   * @param {Error} error - Error object from API call
   */
  const showApiError = (error) => {
    const message = 
      error?.response?.data?.message || 
      error?.response?.data?.error ||
      error?.message || 
      'Operation failed';

    showToast('error', message);
  };

  /**
   * Show success message
   * @param {string} message - Success message
   */
  const showSuccess = (message = 'Success!') => {
    showToast('success', message);
  };

  /**
   * Show warning message
   * @param {string} message - Warning message
   */
  const showWarning = (message) => {
    showToast('warning', message);
  };

  /**
   * Show info message
   * @param {string} message - Info message
   */
  const showInfo = (message) => {
    showToast('info', message);
  };

  /**
   * Clear all toasts
   */
  const clearAll = () => {
    // Toast cleanup handled by react-hot-toast internally
  };

  return {
    showValidationError,
    showApiError,
    showSuccess,
    showWarning,
    showInfo,
    clearAll
  };
};

export default useValidationToast;
