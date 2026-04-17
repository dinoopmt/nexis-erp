const fs = require("fs");
const path = require("path");

/**
 * Load terminal identification from JSON file
 * Contains only: terminalId and apiBaseUrl
 * All other config (hardware, ui, features) comes from backend database
 * 
 * In production: config is bundled inside resources/
 * In development: config is read from client/config/
 */
function loadConfig() {
  let configPath;

  // Determine config path based on environment
  // In production: app.asar/config/terminal.json
  // In development: ../config/terminal.json (relative to electron folder)
  
  if (process.env.NODE_ENV === "development") {
    // Development: reads from project root config folder
    configPath = path.join(__dirname, "../config/terminal.json");
  } else {
    // Production: reads from resources after electron-builder packages it
    configPath = path.join(process.resourcesPath || __dirname, "../config/terminal.json");
  }

  try {
    if (!fs.existsSync(configPath)) {
      console.warn(`⚠️ Config file not found at ${configPath}`);
      return getDefaultConfig();
    }

    const rawData = fs.readFileSync(configPath, "utf-8");
    const config = JSON.parse(rawData);
    
    console.log(`✅ Config loaded from: ${configPath}`);
    console.log(`   Terminal ID: ${config.terminalId}`);
    console.log(`   API Base: ${config.apiBaseUrl}`);
    
    return config;
  } catch (error) {
    console.error(`❌ Failed to load config: ${error.message}`);
    return getDefaultConfig();
  }
}

/**
 * Fallback configuration if file cannot be read
 * Minimal config: just terminal ID and API URL
 */
function getDefaultConfig() {
  return {
    terminalId: "TERM-DEV-001",
    apiBaseUrl: "http://localhost:5000"
  };
}

/**
 * Validate configuration structure
 * Returns true if config has required fields
 */
function validateConfig(config) {
  const requiredFields = ["terminalId", "apiBaseUrl"];

  for (const field of requiredFields) {
    if (!config[field]) {
      console.warn(`⚠️ Missing config field: ${field}`);
      return false;
    }
  }

  // Validate terminalId is not empty and is a string
  if (typeof config.terminalId !== "string" || config.terminalId.trim() === "") {
    console.warn("⚠️ terminalId must be a non-empty string");
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

module.exports = { loadConfig, validateConfig };

