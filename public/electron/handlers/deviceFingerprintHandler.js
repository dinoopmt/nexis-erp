/**
 * Electron IPC Handler - Device Fingerprinting
 * Exposes device ID generation to frontend
 */

import { ipcMain } from 'electron'
import { generateDeviceFingerprint, generateTerminalId, parseTerminalId } from '../utils/deviceFingerprint.js'
import Store from 'electron-store'

// Persistent store for device configuration
const store = new Store({
  name: 'device-config',
})

/**
 * Register Device Fingerprinting IPC Handlers
 */
export const registerDeviceFingerprintHandlers = () => {
  /**
   * Get or create device fingerprint
   * Stored locally to ensure consistency
   */
  ipcMain.handle('device:getFingerprint', () => {
    try {
      let fingerprint = store.get('deviceFingerprint')
      
      if (!fingerprint) {
        fingerprint = generateDeviceFingerprint()
        store.set('deviceFingerprint', fingerprint)
        console.log('✅ New device fingerprint generated:', fingerprint)
      } else {
        console.log('✅ Device fingerprint retrieved:', fingerprint)
      }
      
      return fingerprint
    } catch (error) {
      console.error('❌ Error getting device fingerprint:', error)
      return null
    }
  })

  /**
   * Generate Terminal ID for new terminal
   * Prevents accidental duplicate IDs across devices
   */
  ipcMain.handle('device:generateTerminalId', (event, terminalNumber = 1) => {
    try {
      const terminalId = generateTerminalId(terminalNumber)
      console.log('✅ Terminal ID generated:', terminalId)
      return terminalId
    } catch (error) {
      console.error('❌ Error generating terminal ID:', error)
      return null
    }
  })

  /**
   * Validate Terminal ID belongs to this device
   */
  ipcMain.handle('device:validateTerminalId', (event, terminalId) => {
    try {
      const parsed = parseTerminalId(terminalId)
      if (!parsed) return false

      const currentFingerprint = store.get('deviceFingerprint')
      if (!currentFingerprint) {
        // Generate and store if not exists
        const newFingerprint = generateDeviceFingerprint()
        store.set('deviceFingerprint', newFingerprint)
        return parsed.deviceFingerprint === newFingerprint
      }

      return parsed.deviceFingerprint === currentFingerprint
    } catch (error) {
      console.error('❌ Error validating terminal ID:', error)
      return false
    }
  })

  /**
   * Get device configuration
   */
  ipcMain.handle('device:getConfig', () => {
    try {
      const fingerprint = store.get('deviceFingerprint')
      if (!fingerprint) {
        const newFingerprint = generateDeviceFingerprint()
        store.set('deviceFingerprint', newFingerprint)
      }

      return {
        deviceFingerprint: store.get('deviceFingerprint'),
        lastUpdated: store.get('lastUpdated'),
        terminalCount: store.get('terminalCount', 0),
      }
    } catch (error) {
      console.error('❌ Error getting device config:', error)
      return null
    }
  })

  console.log('✅ Device fingerprinting IPC handlers registered')
}

export default {
  registerDeviceFingerprintHandlers,
}
