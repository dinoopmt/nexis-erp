import React from 'react';
import { toast, Toaster } from 'react-hot-toast';

// ✅ Simple Centered Toaster - Let Toaster handle positioning
export const AnimatedCenteredToast = () => {
  return (
    <Toaster
      position="top-center"
      containerStyle={{
        top: '55%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
      }}
      toastOptions={{
        duration: 3000,
      }}
    />
  );
};

// ✅ Config with colors included
const toastConfig = {
  success: { bg: '#e4f1e5', icon: '✅', color: '#060606' },
  error: { bg: '#f44336', icon: '❌', color: '#fff' },
  warning: { bg: '#ff9800', icon: '⚠️', color: '#fff' },
  info: { bg: '#2196f3', icon: 'ℹ️', color: '#fff' },
};

// ✅ Clean showToast - No position conflicts
// Only show ONE toast at a time (replace previous)
// Close on: click on toast, keyboard (Escape/Enter/Space), click anywhere else, or timeout
export const showToast = (type = 'success', message = '', duration = 3000) => {
  const { bg, icon, color } = toastConfig[type] || toastConfig.success;

  // ✅ ALWAYS dismiss all previous toasts first
  // This prevents overlapping/blinking when same type appears again
  toast.dismiss();

  const handleDismiss = (toastId) => {
    toast.dismiss(toastId);
    document.removeEventListener('click', handleFormClick);
  };

  const handleKeyDown = (e, toastId) => {
    if (e.key === 'Escape' || e.key === 'Enter' || e.code === 'Space') {
      e.preventDefault();
      handleDismiss(toastId);
    }
  };

  const handleFormClick = (e) => {
    // Don't dismiss if clicking on the toast itself
    const toastElement = document.querySelector('[role="button"][aria-label="Close notification"]');
    if (toastElement && toastElement.contains(e.target)) {
      return;
    }
    // Dismiss on any other click
    toast.dismiss();
    document.removeEventListener('click', handleFormClick);
  };

  toast((t) => (
    <div
      onClick={() => handleDismiss(t.id)}
      onKeyDown={(e) => handleKeyDown(e, t.id)}
      onMouseEnter={(e) => {
        e.currentTarget.style.opacity = '0.85';
        e.currentTarget.style.transform = 'scale(1.02)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.opacity = '1';
        e.currentTarget.style.transform = 'scale(1)';
      }}
      tabIndex={0}
      role="button"
      aria-label="Close notification"
      style={{
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        userSelect: 'none',
        outline: 'none',
      }}
    >
      {message}
    </div>
  ), {
    icon,
    duration: duration, // Support custom duration
    style: {
      background: bg,
      color: color,
      minWidth: '280px',
      padding: '14px 20px',
      borderRadius: '10px',
      fontWeight: 'bold',
      fontSize: '14px',
      boxShadow: '0 5px 15px rgba(0,0,0,0.3)',
      textAlign: 'center',
    },
  });

  // Add global click listener to dismiss when clicking elsewhere
  setTimeout(() => {
    document.addEventListener('click', handleFormClick);
  }, 100);
};

