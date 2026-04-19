import { showToast } from '../components/shared/AnimatedCenteredToast.jsx';

/**
 * Hook for consistent validation error notifications
 * 
 * Usage:
 * const { showApiError, showSuccess } = useValidationToast();
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
    showApiError,
    showSuccess,
    showWarning,
    showInfo,
    clearAll
  };
};

export default useValidationToast;
