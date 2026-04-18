/**
 * Device Fingerprinting for Electron
 * CommonJS version for main.cjs
 */

const os = require('os');
const crypto = require('crypto');

/**
 * Generate unique device fingerprint
 * @returns {string} Device fingerprint hash (DEVICE-ABC123DEF456)
 */
function generateDeviceFingerprint() {
  try {
    // Get system information
    const hostname = os.hostname();
    const cpuCount = os.cpus().length;
    const totalMemory = os.totalmem();
    const platform = os.platform();
    const arch = os.arch();
    
    // Combine into fingerprint data
    const fingerprintData = `${hostname}-${cpuCount}-${totalMemory}-${platform}-${arch}`;
    
    // Generate SHA256 hash
    const hash = crypto.createHash('sha256').update(fingerprintData).digest('hex');
    
    // Return first 12 characters + prefix
    return `DEVICE-${hash.substring(0, 12).toUpperCase()}`;
  } catch (error) {
    console.error('❌ Error generating device fingerprint:', error);
    // Fallback to random ID
    return `DEVICE-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
  }
}

/**
 * Generate Terminal ID from device fingerprint and terminal number
 * @param {number} terminalNumber - Terminal number at this device (1, 2, 3...)
 * @returns {string} Terminal ID (e.g., TERM-ABC123DEF456-001)
 */
function generateTerminalId(terminalNumber = 1) {
  const deviceFingerprint = generateDeviceFingerprint();
  const terminalNum = String(terminalNumber).padStart(3, '0');
  return `TERM-${deviceFingerprint.substring(7)}-${terminalNum}`; // Extract hex part from DEVICE-ABC...
}

/**
 * Parse Terminal ID to extract components
 * @param {string} terminalId - Terminal ID to parse (TERM-ABC123DEF456-001)
 * @returns {object|null} { deviceFingerprint, terminalNumber } or null if invalid
 */
function parseTerminalId(terminalId) {
  const parts = terminalId.split('-');
  if (parts.length !== 3 || parts[0] !== 'TERM') return null;
  
  return {
    deviceFingerprint: `DEVICE-${parts[1]}`,
    terminalNumber: parseInt(parts[2]),
  };
}

module.exports = {
  generateDeviceFingerprint,
  generateTerminalId,
  parseTerminalId,
};
