/**
 * electron/preload.js
 * Preload script for secure IPC communication
 * Exposes safe API to renderer process
 */

const { contextBridge, ipcRenderer } = require('electron');

// Expose electronAPI to window object in renderer
contextBridge.exposeInMainWorld('electronAPI', {
  // Printer operations
  invoke: (channel, args) => {
    // Whitelist of allowed channels
    const validChannels = [
      'app:print-barcode',
      'app:get-available-printers',
    ];
    
    if (validChannels.includes(channel)) {
      return ipcRenderer.invoke(channel, args);
    } else {
      console.warn(`[PRELOAD] Unauthorized channel: ${channel}`);
      return Promise.reject(new Error(`Unauthorized channel: ${channel}`));
    }
  },

  // Listen for events
  on: (channel, callback) => {
    const validChannels = [
      'printer:discovery-update',
    ];
    
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, (event, ...args) => callback(...args));
    } else {
      console.warn(`[PRELOAD] Unauthorized listener channel: ${channel}`);
    }
  },

  // Remove listeners
  removeListener: (channel) => {
    ipcRenderer.removeAllListeners(channel);
  },
});

console.log('[PRELOAD] Electron API exposed to renderer process');
