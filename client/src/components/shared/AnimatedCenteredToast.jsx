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
// Auto-close on click
export const showToast = (type = 'success', message = '') => {
  const { bg, icon, color } = toastConfig[type] || toastConfig.success;

  toast.dismiss(); // Remove all previous toasts

  toast((t) => (
    <div
      onClick={() => toast.dismiss(t.id)}
      style={{ cursor: 'pointer' }}
    >
      {message}
    </div>
  ), {
    icon,
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
};

