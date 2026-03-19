import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import AuthContext from './context/AuthContext.jsx'
import { CompanyProvider } from './context/CompanyContext.jsx'
import { CostingProvider } from './context/CostingContext.jsx'

// ✅ Global error handlers to catch unhandled Promise rejections & errors
// Helps diagnose issues with async operations, especially from browser extensions
window.addEventListener('unhandledrejection', (event) => {
  // Log but don't block - prevents extension conflicts
  console.warn('⚠️ Unhandled Promise rejection:', {
    reason: event.reason,
    promise: event.promise,
    message: event.reason?.message || 'Unknown error',
  });
  
  // Only prevent default if it's our error, not from extensions
  if (event.reason?.message?.includes('listener')) {
    // This is likely a browser extension issue - don't prevent default
    return;
  }
});

// Catch global errors (but don't interfere with extension errors)
window.addEventListener('error', (event) => {
  if (!event.error?.message?.includes('listener')) {
    console.error('🔴 Global error:', event.error);
  }
  // Return false to let the error propagate normally
  return false;
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthContext>
      <CompanyProvider>
        <CostingProvider>
          <App />
        </CostingProvider>
      </CompanyProvider>
    </AuthContext>
  </StrictMode>
)


