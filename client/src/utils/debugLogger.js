/**
 * 🔧 Debug Logger Utility
 * Provides consistent logging for debugging and monitoring
 * Easy to toggle logs on/off globally
 */

let DEBUG_ENABLED = process.env.NODE_ENV === "development";

export const debugLogger = {
  // Info level - general information
  info: (module, message, data = null) => {
    if (DEBUG_ENABLED) {
      console.log(`ℹ️ [${module}] ${message}`, data || "");
    }
  },

  // Success level - operation completed successfully
  success: (module, message, data = null) => {
    if (DEBUG_ENABLED) {
      console.log(
        `✅ [${module}] ${message}`,
        data || "",
        { color: "color: green" }
      );
    }
  },

  // Warning level - potential issue
  warn: (module, message, data = null) => {
    if (DEBUG_ENABLED) {
      console.warn(`⚠️ [${module}] ${message}`, data || "");
    }
  },

  // Error level - operation failed
  error: (module, message, error = null) => {
    if (DEBUG_ENABLED) {
      console.error(`❌ [${module}] ${message}`, error || "");
    }
  },

  // Performance timer
  time: (timerName) => {
    if (DEBUG_ENABLED) {
      console.time(`⏱️ ${timerName}`);
    }
  },

  timeEnd: (timerName) => {
    if (DEBUG_ENABLED) {
      console.timeEnd(`⏱️ ${timerName}`);
    }
  },

  // Trace for debugging call stacks
  trace: (module, message) => {
    if (DEBUG_ENABLED) {
      console.trace(`🔍 [${module}] ${message}`);
    }
  },

  // Toggle debug mode
  setDebugMode: (enabled) => {
    DEBUG_ENABLED = enabled;
  },
};

export default debugLogger;


