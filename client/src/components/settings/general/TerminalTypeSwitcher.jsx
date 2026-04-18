import React, { useState, useEffect } from 'react'
import { ArrowRight, Zap, AlertCircle, CheckCircle2 } from 'lucide-react'
import axios from 'axios'
import toast from 'react-hot-toast'
import { API_URL } from '../../../config/config'

const TerminalTypeSwitcher = ({ currentConfig, onConfigUpdate }) => {
  const [isLoading, setIsLoading] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [newTerminalId, setNewTerminalId] = useState(null)
  const [generatingId, setGeneratingId] = useState(false)
  const [terminalStats, setTerminalStats] = useState({
    backofficeTerminals: 0,
    salesTerminals: 0,
  })

  useEffect(() => {
    // Load terminal statistics
    loadTerminalStats()
  }, [])

  const loadTerminalStats = async () => {
    try {
      const response = await axios.get(`${API_URL}/terminals`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        }
      })
      if (response.data.success) {
        const terminals = response.data.data || []
        setTerminalStats({
          backofficeTerminals: terminals.filter(t => t.terminalType === 'BACKOFFICE').length,
          salesTerminals: terminals.filter(t => t.terminalType === 'SALES').length,
        })
        console.log('✅ Terminal stats loaded:', { 
          total: terminals.length,
          backofficeTerminals: terminals.filter(t => t.terminalType === 'BACKOFFICE').length,
          salesTerminals: terminals.filter(t => t.terminalType === 'SALES').length,
        })
      } else {
        console.warn('⚠️ API returned success:false', response.data)
      }
    } catch (error) {
      console.error('❌ Could not load terminal stats:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
        url: `${API_URL}/terminals`,
      })
    }
  }

  const generateDeviceTerminalId = async () => {
    if (!window.electronAPI || !window.electronAPI.device) {
      toast.error('Device API not available')
      return
    }

    try {
      setGeneratingId(true)
      
      // Get device fingerprint
      const fingerprint = await window.electronAPI.device.getFingerprint()
      console.log('Device fingerprint:', fingerprint)

      // Generate Terminal ID from device fingerprint
      const terminalId = await window.electronAPI.device.generateTerminalId()
      console.log('Generated Terminal ID:', terminalId)

      setNewTerminalId(terminalId)
      toast.success(`Terminal ID generated: ${terminalId}`)
      return terminalId
    } catch (error) {
      console.error('Error generating Terminal ID:', error)
      toast.error(`Failed to generate Terminal ID: ${error.message}`)
      return null
    } finally {
      setGeneratingId(false)
    }
  }

  const handleSwitchToSales = async () => {
    if (!currentConfig || currentConfig.terminalType === 'SALES') {
      toast.info('Already running as SALES terminal')
      return
    }

    try {
      setIsLoading(true)

      // First, generate new Terminal ID from device
      const terminalId = await generateDeviceTerminalId()
      if (!terminalId) {
        toast.error('Failed to generate Terminal ID')
        return
      }

      // Validate the generated Terminal ID
      const validateResponse = await axios.post(`${API_URL}/terminals/validate-id`, {
        terminalId,
      })

      if (!validateResponse.data.success) {
        toast.error(`Terminal ID validation failed: ${validateResponse.data.message}`)
        return
      }

      // Call callback to update config
      // This should use Electron IPC to update the config file
      if (window.electronAPI && window.electronAPI.config) {
        const success = await window.electronAPI.config.updateConfig({
          terminalType: 'SALES',
          terminalId: terminalId,
          switchedAt: new Date().toISOString(),
        })

        if (success) {
          toast.success('✅ Switched to SALES terminal mode')
          toast.success(`✅ Terminal ID: ${terminalId}`)
          
          // Update local config state
          if (onConfigUpdate) {
            onConfigUpdate({
              ...currentConfig,
              terminalType: 'SALES',
              terminalId: terminalId,
            })
          }

          setShowConfirmation(false)
          setNewTerminalId(null)
        } else {
          toast.error('Failed to update configuration file')
        }
      } else {
        toast.error('Configuration API not available')
      }
    } catch (error) {
      console.error('Error switching to SALES:', error)
      toast.error(`Error: ${error.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      {/* Header */}
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-1">Terminal Type Configuration</h3>
        <p className="text-xs text-gray-600">
          Switch between BACKOFFICE (no validation) and SALES (device-based Terminal ID)
        </p>
      </div>

      {/* ✅ Handle null currentConfig */}
      {!currentConfig && (
        <div className="bg-amber-50 rounded-lg p-3 mb-4 border border-amber-200">
          <p className="text-xs text-amber-800">
            📋 No terminal configuration loaded yet. Please load a terminal configuration from the Terminal List above.
          </p>
        </div>
      )}

      {/* Current Status */}
      {currentConfig && (
      <div className="bg-gray-50 rounded-lg p-3 mb-4 border border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-600 mb-1">Current Terminal Type</p>
            <div className="flex items-center gap-2">
              <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
                currentConfig.terminalType === 'BACKOFFICE'
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-green-100 text-green-800'
              }`}>
                {currentConfig.terminalType}
              </div>
              {currentConfig.terminalType === 'BACKOFFICE' && (
                <span className="text-xs text-gray-500">No validation required</span>
              )}
              {currentConfig.terminalType === 'SALES' && (
                <span className="text-xs text-gray-500">Device-based validation</span>
              )}
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-600 mb-1">Terminal ID</p>
            <p className="text-xs font-mono text-gray-900 bg-white px-2 py-1 rounded border border-gray-200">
              {currentConfig.terminalId}
            </p>
          </div>
        </div>
      </div>
      )}

      {/* Terminal Statistics */}
      {currentConfig && (
      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="bg-blue-50 rounded-lg p-2 border border-blue-200">
          <p className="text-xs text-blue-600 font-medium">BACKOFFICE Terminals</p>
          <p className="text-lg font-bold text-blue-900">{terminalStats.backofficeTerminals}</p>
        </div>
        <div className="bg-green-50 rounded-lg p-2 border border-green-200">
          <p className="text-xs text-green-600 font-medium">SALES Terminals</p>
          <p className="text-lg font-bold text-green-900">{terminalStats.salesTerminals}</p>
        </div>
      </div>
      )}

      {/* Action Section */}
      {currentConfig && currentConfig.terminalType === 'BACKOFFICE' && !showConfirmation && (
        <div className="bg-amber-50 rounded-lg p-3 border border-amber-200 mb-4">
          <div className="flex items-start gap-2 mb-3">
            <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs font-medium text-amber-900 mb-1">Ready to enable device-based Terminal ID?</p>
              <p className="text-xs text-amber-800">
                Switching to SALES mode will generate a device-based Terminal ID that prevents terminal cloning. This Terminal ID will be permanently bound to this device.
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowConfirmation(true)}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-gray-400 text-white text-xs font-medium rounded-lg transition"
          >
            <Zap className="w-4 h-4" />
            {isLoading ? 'Switching...' : 'Switch to SALES Terminal'}
          </button>
        </div>
      )}

      {/* Confirmation Dialog */}
      {showConfirmation && (
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200 mb-4">
          <h4 className="text-xs font-semibold text-blue-900 mb-3">Confirm Switch to SALES Terminal</h4>
          
          {newTerminalId && (
            <div className="bg-white rounded-lg p-3 mb-3 border border-blue-200">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <p className="text-xs font-medium text-green-900">Device-based Terminal ID Generated</p>
              </div>
              <p className="text-xs font-mono bg-gray-100 px-2 py-1 rounded text-gray-900 mb-2">
                {newTerminalId}
              </p>
              <p className="text-xs text-gray-600">
                This Terminal ID is unique to this device and cannot be replicated on other machines.
              </p>
            </div>
          )}

          <div className="space-y-2 mb-3 text-xs text-blue-900">
            <div className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span>Terminal ID validation will be required for all future sessions</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span>Configuration will be permanently updated on this machine</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span>You can revert to BACKOFFICE mode from Settings if needed</span>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => {
                setShowConfirmation(false)
                setNewTerminalId(null)
              }}
              disabled={isLoading}
              className="flex-1 px-3 py-2 border border-gray-300 text-gray-700 text-xs font-medium rounded-lg hover:bg-gray-50 disabled:bg-gray-100 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleSwitchToSales}
              disabled={isLoading || !newTerminalId}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white text-xs font-medium rounded-lg transition"
            >
              <ArrowRight className="w-4 h-4" />
              {isLoading ? 'Finalizing...' : 'Confirm & Switch'}
            </button>
          </div>
        </div>
      )}

      {/* Info for SALES terminals */}
      {currentConfig && currentConfig.terminalType === 'SALES' && (
        <div className="bg-green-50 rounded-lg p-3 border border-green-200">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs font-medium text-green-900 mb-1">SALES Terminal Active</p>
              <p className="text-xs text-green-800">
                Device-based Terminal ID validation is enabled. Your terminal cannot be cloned or moved to other devices.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default TerminalTypeSwitcher
