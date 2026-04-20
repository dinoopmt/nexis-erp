import React, { createContext, useState, useEffect, useRef } from 'react'
import { serverHealthCheck } from '../utils/serverHealthCheck'

export const ServerReadyContext = createContext()

/**
 * Error Splash Screen - Shows when server is not available
 */
const ServerErrorSplash = ({ error, retryCount, maxRetries }) => {
  return (
    <div className="fixed inset-0 bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center z-[9999]">
      <div className="text-center px-8">
        {/* Error Icon */}
        <div className="mb-6">
          <div className="w-20 h-20 bg-red-500 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4v2m0 0v2m0-6v2" />
            </svg>
          </div>
        </div>

        {/* Error Title */}
        <h1 className="text-3xl font-bold text-white mb-3">Server Connection Failed</h1>

        {/* Error Message */}
        <p className="text-gray-300 text-lg mb-6">
          {error || 'Unable to connect to the backend server.'}
        </p>

        {/* Retry Status */}
        <div className="bg-gray-700 rounded-lg p-4 mb-6">
          <p className="text-gray-200 text-sm mb-2">
            Retrying to connect... <span className="text-yellow-400 font-semibold">{retryCount}/{maxRetries}</span>
          </p>
          {/* Progress bar */}
          <div className="w-full bg-gray-600 rounded-full h-2 overflow-hidden">
            <div 
              className="bg-yellow-400 h-full transition-all duration-500"
              style={{ width: `${(retryCount / maxRetries) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-blue-900/30 border border-blue-500 rounded-lg p-4 mb-6 text-left">
          <p className="text-blue-200 text-sm font-semibold mb-2">⚠️ What to do:</p>
          <ul className="text-blue-100 text-sm space-y-1 list-disc list-inside">
            <li>Ensure the backend server is running</li>
            <li>Check that MongoDB and Meilisearch are started</li>
            <li>Verify port 5000 is accessible</li>
            <li>The app will automatically retry every few seconds</li>
          </ul>
        </div>

        {/* Loading Spinner */}
        <div className="flex justify-center">
          <div className="animate-spin">
            <svg className="w-12 h-12 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * ServerReadyProvider
 * Ensures server is available before any data fetching occurs
 * Shows error splash if server is not available
 * Wrap this at the TOP level of your app, before all other providers
 */
export const ServerReadyProvider = ({ children }) => {
  const [serverReady, setServerReady] = useState(false)
  const [serverError, setServerError] = useState(null)
  const [retryCount, setRetryCount] = useState(0)
  const [checking, setChecking] = useState(true)
  const checkInitiated = useRef(false)

  // Check server health on mount (only once)
  useEffect(() => {
    if (checkInitiated.current) return
    checkInitiated.current = true

    const checkServer = async () => {
      try {
        const isReady = await serverHealthCheck.waitForServer((status) => {
          if (status.status === 'checking') {
            setRetryCount(status.attempt || 0)
            console.log(`⏳ Server check ${status.attempt}/${status.maxAttempts}...`)
          } else if (status.status === 'ready') {
            console.log('✅ Server is ready, enabling data loading...')
            setChecking(false)
            setServerReady(true)
          } else if (status.status === 'failed') {
            console.error('❌ Server health check failed after max retries')
            setChecking(false)
          }
        })

        if (isReady) {
          setServerReady(true)
          setChecking(false)
        } else {
          setServerError('Server did not respond after multiple retry attempts. Please ensure the backend server is running.')
          setChecking(false)
          console.error('Server failed to start after max retries')
        }
      } catch (error) {
        setServerError(error.message)
        setChecking(false)
        console.error('Server health check error:', error)
      }
    }

    checkServer()
  }, [])

  const value = {
    serverReady,
    serverError,
  }

  // Show error splash if server not ready and checking complete
  if (!serverReady && !checking) {
    return <ServerErrorSplash error={serverError} retryCount={retryCount} maxRetries={30} />
  }

  // Show loading splash while checking
  if (checking) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-blue-900 to-gray-900 flex items-center justify-center z-[9999]">
        <div className="text-center">
          <div className="mb-8">
            <div className="animate-spin">
              <svg className="w-16 h-16 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Connecting to Server...</h1>
          <p className="text-blue-200">Attempt {retryCount}/30</p>
        </div>
      </div>
    )
  }

  return (
    <ServerReadyContext.Provider value={value}>
      {children}
    </ServerReadyContext.Provider>
  )
}

/**
 * Hook to check if server is ready
 * Usage: const { serverReady, serverError } = useServerReady()
 */
export const useServerReady = () => {
  const context = React.useContext(ServerReadyContext)

  if (!context) {
    throw new Error(
      'useServerReady must be used within ServerReadyProvider. ' +
      'Wrap your app with <ServerReadyProvider> in main.jsx'
    )
  }

  return context
}
