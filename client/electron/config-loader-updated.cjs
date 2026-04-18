const fs = require("fs");
const path = require("path");

/**
 * Load terminal identification from JSON file
 * Contains: terminalId, terminalType, and apiBaseUrl
 * terminalType: "SALES" (device-based Terminal ID validation) or "BACKOFFICE" (no validation)
 * 
 * Fresh Installation Flow:
 * 1. No config found → Create BACKOFFICE default
 * 2. User logs in → No Terminal ID validation for BACKOFFICE
 * 3. User switches type to SALES → Generate device-based Terminal ID
 * 4. Config updated with new type + ID
 */
function loadConfig() {
  let configPath;

  // Determine config path based on environment
  if (process.env.NODE_ENV === "development") {
    configPath = path.join(__dirname, "../config/terminal.json");
  } else {
    configPath = path.join(process.resourcesPath || __dirname, "../config/terminal.json");
  }

  try {
    if (!fs.existsSync(configPath)) {
      console.warn(`⚠️ Config file not found at ${configPath}`);
      console.log("📝 Creating new default BACKOFFICE configuration...");
      const defaultConfig = getDefaultConfig();
      // Try to create config file for future use
      const configDir = path.dirname(configPath);
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }
      try {
        fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2));
        console.log(`✅ New BACKOFFICE config created at: ${configPath}`);
      } catch (writeErr) {
        console.warn(`⚠️ Could not persist config file: ${writeErr.message}`);
      }
      return defaultConfig;
    }

    const rawData = fs.readFileSync(configPath, "utf-8");
    const config = JSON.parse(rawData);
    
    console.log(`✅ Config loaded from: ${configPath}`);
    console.log(`   Terminal ID: ${config.terminalId}`);
    console.log(`   Terminal Type: ${config.terminalType || 'BACKOFFICE'}`);
    console.log(`   API Base: ${config.apiBaseUrl}`);
    
    return config;
  } catch (error) {
    console.error(`❌ Failed to load config: ${error.message}`);
    return getDefaultConfig();
  }
}

/**
 * Default configuration for fresh installations
 * BACKOFFICE type: No Terminal ID validation required
 * User can later switch to SALES + generate device-based Terminal ID
 */
function getDefaultConfig() {
  return {
    terminalId: "BACKOFFICE-DEFAULT",
    terminalType: "BACKOFFICE",
    apiBaseUrl: "http://localhost:5000",
    createdAt: new Date().toISOString(),
    note: "BACKOFFICE type: Terminal ID validation skipped. Switch to SALES type in Settings to enable device-based Terminal ID."
  };
}

/**
 * Update configuration file with new values
 * Used when changing terminal type or generating new Terminal ID
 * @param {object} newValues - Object with new config values to merge
 * @returns {boolean} - true if update successful
 */
function updateConfig(newValues) {
  let configPath;
  if (process.env.NODE_ENV === "development") {
    configPath = path.join(__dirname, "../config/terminal.json");
  } else {
    configPath = path.join(process.resourcesPath || __dirname, "../config/terminal.json");
  }

  try {
    // Read existing config or use default
    let config = getDefaultConfig();
    if (fs.existsSync(configPath)) {
      const rawData = fs.readFileSync(configPath, "utf-8");
      config = JSON.parse(rawData);
    }

    // Merge new values
    const updatedConfig = {
      ...config,
      ...newValues,
      updatedAt: new Date().toISOString()
    };

    // Ensure directory exists
    const configDir = path.dirname(configPath);
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }

    // Write updated config
    fs.writeFileSync(configPath, JSON.stringify(updatedConfig, null, 2));
    console.log(`✅ Config updated successfully`);
    console.log(`   Terminal Type: ${updatedConfig.terminalType}`);
    console.log(`   Terminal ID: ${updatedConfig.terminalId}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to update config: ${error.message}`);
    return false;
  }
}

/**
 * Validate configuration structure
 * Returns true if config has required fields and valid values
 */
function validateConfig(config) {
  const requiredFields = ["terminalId", "apiBaseUrl", "terminalType"];

  for (const field of requiredFields) {
    if (!config[field]) {
      console.warn(`⚠️ Missing config field: ${field}`);
      return false;
    }
  }

  // Validate terminalId is not empty
  if (typeof config.terminalId !== "string" || config.terminalId.trim() === "") {
    console.warn("⚠️ terminalId must be a non-empty string");
    return false;
  }

  // Validate terminalType is one of allowed values
  const validTypes = ["SALES", "BACKOFFICE"];
  if (!validTypes.includes(config.terminalType)) {
    console.warn(`⚠️ terminalType must be one of: ${validTypes.join(", ")}`);
    return false;
  }

  // Validate apiBaseUrl is a valid URL
  try {
    new URL(config.apiBaseUrl);
  } catch {
    console.warn(`⚠️ apiBaseUrl is not a valid URL: ${config.apiBaseUrl}`);
    return false;
  }

  return true;
}

module.exports = { loadConfig, validateConfig, updateConfig, getDefaultConfig };
