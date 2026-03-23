/**
 * electronPrinterHandler.js
 * Handles IPC communication between Electron main process and renderer (React app)
 * Routes printer commands to local hardware via Electron
 */

import { ipcMain } from 'electron';
import net from 'net';
import { SerialPort } from 'serialport';
import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);

/**
 * =====================================================
 * IPC Handler: app:print-barcode
 * Receives print command from React app
 * Routes to printer based on connection type
 * =====================================================
 */
export const setupPrinterIPC = () => {
  ipcMain.handle('app:print-barcode', async (event, printData) => {
    try {
      const { command, printerType = 'NETWORK', printerAddress = 'localhost:9100', quantity = 1 } =
        printData;

      if (!command) {
        throw new Error('Print command is required');
      }

      console.log(`[PRINTER] Received print request: ${printerType} → ${printerAddress}`);
      console.log(`[PRINTER COMMAND]\n${command}`);

      let result;

      switch (printerType.toUpperCase()) {
        case 'NETWORK':
          result = await sendToNetworkPrinter(command, printerAddress);
          break;

        case 'SERIAL':
          result = await sendToSerialPrinter(command, printerAddress);
          break;

        case 'USB':
          result = await sendToUSBPrinter(command, printerAddress);
          break;

        case 'WINDOWS':
          result = await sendToWindowsPrinter(command, printerAddress);
          break;

        default:
          throw new Error(`Unsupported printer type: ${printerType}`);
      }

      return {
        success: true,
        message: `Print command sent successfully to ${printerType} printer`,
        data: result,
      };
    } catch (error) {
      console.error('[PRINTER ERROR]', error);
      return {
        success: false,
        message: error.message,
        error: error.toString(),
      };
    }
  });

  console.log('[ELECTRON] Printer IPC handlers registered');
};

/**
 * =====================================================
 * Network Printer Communication
 * Used for network-connected thermal printers
 * Example: 192.168.1.100:9100
 * =====================================================
 */
async function sendToNetworkPrinter(command, address) {
  return new Promise((resolve, reject) => {
    try {
      const [host, port] = address.split(':');
      const printerPort = parseInt(port) || 9100;

      console.log(`[NETWORK PRINTER] Connecting to ${host}:${printerPort}`);

      const socket = net.createConnection(printerPort, host);

      socket.on('connect', () => {
        console.log(`[NETWORK PRINTER] Connected to ${host}:${printerPort}`);

        // Send the command
        socket.write(command, 'utf8', (err) => {
          if (err) {
            socket.destroy();
            reject(new Error(`Failed to send data: ${err.message}`));
          } else {
            console.log('[NETWORK PRINTER] Command sent successfully');
            socket.end();
            resolve({
              type: 'NETWORK',
              address,
              status: 'sent',
              timestamp: new Date().toISOString(),
            });
          }
        });
      });

      socket.on('error', (err) => {
        reject(new Error(`Network error: ${err.message}`));
      });

      socket.on('timeout', () => {
        socket.destroy();
        reject(new Error('Connection timeout'));
      });

      socket.setTimeout(5000); // 5 second timeout
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * =====================================================
 * Serial Printer Communication
 * Used for serial port printers (COM1, COM2, etc.)
 * =====================================================
 */
async function sendToSerialPrinter(command, serialPort) {
  return new Promise((resolve, reject) => {
    try {
      console.log(`[SERIAL PRINTER] Opening port: ${serialPort}`);

      const port = new SerialPort({
        path: serialPort,
        baudRate: 9600,
        dataBits: 8,
        stopBits: 1,
        parity: 'none',
      });

      port.on('open', () => {
        console.log(`[SERIAL PRINTER] Port opened: ${serialPort}`);

        // Send command
        port.write(command, 'utf8', (err) => {
          if (err) {
            port.close();
            reject(new Error(`Failed to write to serial port: ${err.message}`));
          } else {
            console.log('[SERIAL PRINTER] Command sent successfully');

            // Close after short delay
            setTimeout(() => {
              port.close();
              resolve({
                type: 'SERIAL',
                port: serialPort,
                status: 'sent',
                timestamp: new Date().toISOString(),
              });
            }, 500);
          }
        });
      });

      port.on('error', (err) => {
        reject(new Error(`Serial port error: ${err.message}`));
      });
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * =====================================================
 * USB Printer Communication
 * For USB-connected printers
 * =====================================================
 */
async function sendToUSBPrinter(command, devicePath) {
  return new Promise((resolve, reject) => {
    try {
      console.log(`[USB PRINTER] Attempting connection to: ${devicePath}`);

      // USB on Windows is typically accessed via LPT or device paths
      // This is a simplified implementation
      const socket = net.createConnection(9100, 'localhost');

      socket.on('connect', () => {
        console.log('[USB PRINTER] Connected');

        socket.write(command, 'utf8', (err) => {
          if (err) {
            socket.destroy();
            reject(new Error(`USB write failed: ${err.message}`));
          } else {
            socket.end();
            resolve({
              type: 'USB',
              device: devicePath,
              status: 'sent',
              timestamp: new Date().toISOString(),
            });
          }
        });
      });

      socket.on('error', (err) => {
        reject(new Error(`USB connection error: ${err.message}`));
      });

      socket.setTimeout(5000);
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * =====================================================
 * Windows Printer Communication
 * Uses Windows Print Spooler via command line
 * Example: `Print to Zebra GK420d`
 * =====================================================
 */
async function sendToWindowsPrinter(command, printerName) {
  return new Promise((resolve, reject) => {
    try {
      console.log(`[WINDOWS PRINTER] Sending to: ${printerName}`);

      // Create temporary file with print command
      const fs = require('fs');
      const path = require('path');
      const tempDir = require('os').tmpdir();
      const tempFile = path.join(tempDir, `print_${Date.now()}.txt`);

      fs.writeFileSync(tempFile, command, 'utf8');

      // Use Windows print command
      const printCmd = `print /D:${printerName} "${tempFile}"`;

      exec(printCmd, (error, stdout, stderr) => {
        // Clean up temp file
        fs.unlinkSync(tempFile);

        if (error) {
          reject(new Error(`Windows print error: ${error.message}`));
        } else {
          console.log('[WINDOWS PRINTER] Command sent successfully');
          resolve({
            type: 'WINDOWS',
            printer: printerName,
            status: 'sent',
            timestamp: new Date().toISOString(),
          });
        }
      });
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * =====================================================
 * Available Printers Discovery
 * IPC Handler: app:get-available-printers
 * =====================================================
 */
export const setupPrinterDiscovery = () => {
  ipcMain.handle('app:get-available-printers', async (event) => {
    try {
      const printers = [];

      // List serial ports
      try {
        const ports = await SerialPort.list();
        printers.push(
          ...ports.map((port) => ({
            name: port.path,
            type: 'SERIAL',
            path: port.path,
            description: port.description || 'Serial Printer',
          }))
        );
      } catch (error) {
        console.warn('[DISCOVERY] Could not list serial ports:', error.message);
      }

      // Add common network addresses
      printers.push({
        name: 'Network Printer (Default)',
        type: 'NETWORK',
        address: 'localhost:9100',
        description: 'Local network printer on port 9100',
      });

      console.log(`[DISCOVERY] Found ${printers.length} available printers`);

      return {
        success: true,
        data: printers,
      };
    } catch (error) {
      console.error('[DISCOVERY ERROR]', error);
      return {
        success: false,
        message: error.message,
      };
    }
  });

  console.log('[ELECTRON] Printer discovery handlers registered');
};

/**
 * Initialize all printer-related IPC handlers
 */
export const initializePrinterHandlers = () => {
  setupPrinterIPC();
  setupPrinterDiscovery();
  console.log('[ELECTRON] All printer handlers initialized');
};
