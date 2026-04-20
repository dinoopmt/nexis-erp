import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import AuthContext from './context/AuthContext.jsx'
import { CompanyProvider } from './context/CompanyContext.jsx'
import { CostingProvider } from './context/CostingContext.jsx'
import { ServerReadyProvider } from './context/ServerReadyContext.jsx'

// ✅ Global error handlers to catch unhandled Promise rejections & errors
// Helps diagnose issues with async operations, especially from browser extensions
window.addEventListener('unhandledrejection', (event) => {
  const errorMessage = event.reason?.message || '';
  
  // Suppress Chrome extension listener errors (common with many extensions)
  if (errorMessage.includes('listener') || errorMessage.includes('message channel')) {
    event.preventDefault(); // Prevent error from appearing in console
    return;
  }
  
  // Log but don't block - prevents extension conflicts
  console.warn('⚠️ Unhandled Promise rejection:', {
    reason: event.reason,
    promise: event.promise,
    message: errorMessage,
  });
});

// Catch global errors (but don't interfere with extension errors)
window.addEventListener('error', (event) => {
  const errorMessage = event.error?.message || '';
  
  // Suppress Chrome extension listener errors silently
  if (errorMessage.includes('listener') || errorMessage.includes('message channel')) {
    return true; // Handled
  }
  
  console.error('🔴 Global error:', event.error);
  return false; // Let error propagate normally
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ServerReadyProvider>
      <AuthContext>
        <CompanyProvider>
          <CostingProvider>
            <App />
          </CostingProvider>
        </CompanyProvider>
      </AuthContext>
    </ServerReadyProvider>
  </StrictMode>
)


