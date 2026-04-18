/**
 * Electron Preload - Expose Device APIs to Frontend
 * Add this to your existing preload.js
 */

import { contextBridge, ipcRenderer } from 'electron'

// Existing exports...
contextBridge.exposeInMainWorld('electronAPI', {
  // ... existing APIs ...

  // Device Fingerprinting APIs
  device: {
    /**
     * Get unique device fingerprint (cached)
     * @returns {Promise<string>} Device fingerprint (e.g., DEVICE-ABC123DEF456)
     */
    getFingerprint: () => ipcRenderer.invoke('device:getFingerprint'),

    /**
     * Generate Terminal ID based on device + terminal number
     * @param {number} terminalNumber - Terminal number (1, 2, 3...)
     * @returns {Promise<string>} Terminal ID (e.g., TERM-ABC123DEF456-001)
     */
    generateTerminalId: (terminalNumber = 1) =>
      ipcRenderer.invoke('device:generateTerminalId', terminalNumber),

    /**
     * Validate if Terminal ID belongs to this device
     * @param {string} terminalId - Terminal ID to validate
     * @returns {Promise<boolean>} True if belongs to this device
     */
    validateTerminalId: (terminalId) =>
      ipcRenderer.invoke('device:validateTerminalId', terminalId),

    /**
     * Get device configuration
     * @returns {Promise<object>} Device config with fingerprint, terminal count, etc
     */
    getConfig: () => ipcRenderer.invoke('device:getConfig'),
  },
})
