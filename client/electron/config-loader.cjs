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
    console.log(`   Terminal Type: ${config.terminalType || 'BACKOFFICE'}`);
    console.log(`   API Base: ${config.apiBaseUrl}`);
    
    return config;
  } catch (error) {
    console.error(`❌ Failed to load config: ${error.message}`);
    return getDefaultConfig();
  }
}

/**
 * Fallback configuration if file cannot be read
 * Default: BACKOFFICE type for fresh installations (no validation needed)
 * Later user can switch to SALES type + generate device-based Terminal ID
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
 * Validate configuration structure - STRICT MODE
 * Returns object with { isValid: boolean, error: string | null }
 * If validation fails, returns error message to show on splash screen
 */
function validateConfig(config) {
  const requiredFields = ["terminalId", "apiBaseUrl", "terminalType"];

  for (const field of requiredFields) {
    if (!config[field]) {
      return {
        isValid: false,
        error: `❌ CONFIG ERROR\n\nMissing required field: ${field}`
      };
    }
  }

  // Validate terminalId is not empty
  if (typeof config.terminalId !== "string" || config.terminalId.trim() === "") {
    return {
      isValid: false,
      error: `❌ CONFIG ERROR\n\nterminalId must be a non-empty string`
    };
  }

  // Validate terminalType is one of allowed values - STRICT
  const validTypes = ["SALES", "BACKOFFICE"];
  if (!validTypes.includes(config.terminalType)) {
    return {
      isValid: false,
      error: `❌ CONFIG ERROR\n\nterminalType must be one of: ${validTypes.join(", ")}\n\nFound: "${config.terminalType}"\n\nPlease fix the configuration file.`
    };
  }

  // Validate apiBaseUrl is a valid URL
  try {
    new URL(config.apiBaseUrl);
  } catch {
    return {
      isValid: false,
      error: `❌ CONFIG ERROR\n\napiBaseUrl is not a valid URL:\n${config.apiBaseUrl}`
    };
  }

  return { isValid: true, error: null };
}

/**
 * Verify terminal exists in backend database AND check type match
 * Makes HTTP request to check if terminalId is registered and type matches
 * @param {string} terminalId - Terminal ID to verify
 * @param {string} terminalType - Expected terminal type (SALES or BACKOFFICE)
 * @param {string} apiBaseUrl - Base URL for API calls
 * @returns {Promise<{valid: boolean, error: string | null, terminal: object | null}>}
 */
async function verifyTerminalExists(terminalId, terminalType, apiBaseUrl) {
  try {
    const http = require("http");
    const https = require("https");
    
    // Remove /api/v1 suffix if present, we'll add the endpoint ourselves
    let baseUrl = apiBaseUrl.replace(/\/api\/v\d+\/?$/, "");
    const url = `${baseUrl}/api/v1/terminals/verify/${terminalId}`;
    
    console.log(`🔍 Verifying terminal: ${terminalId} (Type: ${terminalType})`);
    
    return new Promise((resolve) => {
      const client = url.startsWith("https") ? https : http;
      
      const req = client.get(url, { timeout: 5000 }, (res) => {
        let data = "";
        
        res.on("data", chunk => {
          data += chunk;
        });
        
        res.on("end", () => {
          if (res.statusCode === 200) {
            try {
              const terminal = JSON.parse(data);
              
              // Check if terminal type matches
              if (terminal.terminalType !== terminalType) {
                console.error(`❌ Terminal type mismatch!`);
                console.error(`   Config says: ${terminalType}`);
                console.error(`   Database has: ${terminal.terminalType}`);
                
                return resolve({
                  valid: false,
                  error: `❌ TERMINAL TYPE MISMATCH\n\nTerminal ID: ${terminalId}\n\nConfig Type: ${terminalType}\nDatabase Type: ${terminal.terminalType}\n\nPlease correct the configuration or contact administrator.`,
                  terminal: null
                });
              }
              
              console.log(`✅ Terminal verified: ${terminalId} (${terminal.terminalType})`);
              resolve({ 
                valid: true, 
                error: null,
                terminal: terminal
              });
            } catch (parseError) {
              console.error(`❌ Failed to parse terminal response: ${parseError.message}`);
              resolve({
                valid: false,
                error: `❌ TERMINAL VERIFICATION ERROR\n\nFailed to parse server response.`,
                terminal: null
              });
            }
          } else if (res.statusCode === 404) {
            console.error(`❌ Terminal not found in database: ${terminalId}`);
            resolve({
              valid: false,
              error: `❌ TERMINAL NOT AVAILABLE\n\nTerminal ID: ${terminalId}\n\nThis terminal is not registered in the system.\n\nPlease configure the terminal in Settings first.`,
              terminal: null
            });
          } else {
            console.error(`❌ Terminal verification failed (Status: ${res.statusCode})`);
            resolve({
              valid: false,
              error: `❌ TERMINAL VERIFICATION ERROR\n\nServer returned status: ${res.statusCode}\n\nPlease try again or contact administrator.`,
              terminal: null
            });
          }
        });
      });
      
      req.on("error", (error) => {
        // If API is down, allow startup with warning
        console.warn(`⚠️ Could not verify terminal (API unavailable): ${error.message}`);
        console.warn(`⚠️ Allowing startup - please ensure terminal is configured correctly`);
        resolve({ 
          valid: true, 
          error: null,
          terminal: null
        }); // Allow startup if network issue
      });
      
      req.on("timeout", () => {
        req.destroy();
        console.warn(`⚠️ Terminal verification timeout (API slow)`);
        resolve({ 
          valid: true, 
          error: null,
          terminal: null
        }); // Allow startup if timeout
      });
    });
  } catch (error) {
    console.error(`❌ Terminal verification failed: ${error.message}`);
    // On error, allow startup but log it
    return { 
      valid: true, 
      error: null,
      terminal: null
    };
  }
}

module.exports = { loadConfig, validateConfig, updateConfig, getDefaultConfig, verifyTerminalExists };

