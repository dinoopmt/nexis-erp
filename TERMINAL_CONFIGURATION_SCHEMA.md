/**
 * Terminal Configuration Structure & Device Mapping
 * JSON Schema for terminals.json
 */

{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "NEXIS ERP - Terminal Configuration",
  "description": "Device-based terminal configuration with clone prevention",
  "type": "object",
  "properties": {
    "metadata": {
      "type": "object",
      "description": "Configuration metadata",
      "properties": {
        "version": {
          "type": "string",
          "description": "Configuration version",
          "example": "1.0.0"
        },
        "lastUpdated": {
          "type": "string",
          "format": "date-time",
          "description": "Last update timestamp"
        },
        "environment": {
          "type": "string",
          "enum": ["development", "staging", "production"],
          "example": "development"
        }
      }
    },
    "device": {
      "type": "object",
      "description": "Device information",
      "properties": {
        "fingerprint": {
          "type": "string",
          "description": "Unique device fingerprint (SHA256 hash)",
          "example": "DEVICE-A1B2C3D4E5F6"
        },
        "hostname": {
          "type": "string",
          "description": "Device hostname",
          "example": "SALES-PC-01"
        },
        "platform": {
          "type": "string",
          "description": "Operating system platform",
          "example": "win32"
        },
        "architecture": {
          "type": "string",
          "description": "System architecture",
          "example": "x64"
        },
        "registeredAt": {
          "type": "string",
          "format": "date-time",
          "description": "Device registration timestamp"
        }
      },
      "required": ["fingerprint"]
    },
    "terminals": {
      "type": "array",
      "description": "Array of configured terminals",
      "items": {
        "type": "object",
        "properties": {
          "terminalId": {
            "type": "string",
            "description": "Unique Terminal ID (Device-based)",
            "pattern": "^TERM-[A-F0-9]{12}-\\d{3}$",
            "example": "TERM-A1B2C3D4E5F6-001"
          },
          "terminalName": {
            "type": "string",
            "description": "User-friendly terminal name",
            "example": "Counter 1"
          },
          "terminalType": {
            "type": "string",
            "enum": ["SALES", "BACKOFFICE"],
            "description": "Terminal purpose type",
            "example": "SALES"
          },
          "invoiceControls": {
            "type": "object",
            "properties": {
              "invoiceNumberPrefix": {
                "type": "string",
                "description": "Invoice number prefix for this terminal",
                "example": "C1"
              }
            }
          },
          "formatMapping": {
            "type": "object",
            "description": "Document template mapping",
            "properties": {
              "invoice": {
                "type": "object",
                "properties": {
                  "templateId": {
                    "type": ["string", "null"],
                    "description": "Template ObjectId"
                  }
                }
              },
              "deliveryNote": {
                "type": "object",
                "properties": {
                  "templateId": {
                    "type": ["string", "null"]
                  }
                }
              },
              "quotation": {
                "type": "object",
                "properties": {
                  "templateId": {
                    "type": ["string", "null"]
                  }
                }
              },
              "salesOrder": {
                "type": "object",
                "properties": {
                  "templateId": {
                    "type": ["string", "null"]
                  }
                }
              },
              "salesReturn": {
                "type": "object",
                "properties": {
                  "templateId": {
                    "type": ["string", "null"]
                  }
                }
              }
            }
          },
          "hardwareMapping": {
            "type": "object",
            "description": "Hardware device mapping",
            "properties": {
              "invoicePrinter": {
                "type": "object",
                "properties": {
                  "enabled": { "type": "boolean" },
                  "printerName": { "type": "string" },
                  "timeout": { "type": "integer", "minimum": 1000 }
                }
              },
              "barcodePrinter": {
                "type": "object",
                "properties": {
                  "enabled": { "type": "boolean" },
                  "printerName": { "type": "string" },
                  "timeout": { "type": "integer", "minimum": 1000 }
                }
              },
              "customerDisplay": {
                "type": "object",
                "properties": {
                  "enabled": { "type": "boolean" },
                  "displayType": { 
                    "type": "string",
                    "enum": ["VFD", "SECONDARY_MONITOR"]
                  },
                  "comPort": { "type": "string" },
                  "vfdModel": { "type": "string" },
                  "baudRate": { "type": "integer" },
                  "displayItems": { "type": "boolean" },
                  "displayPrice": { "type": "boolean" },
                  "displayTotal": { "type": "boolean" },
                  "displayDiscount": { "type": "boolean" }
                }
              }
            }
          },
          "createdAt": {
            "type": "string",
            "format": "date-time"
          },
          "updatedAt": {
            "type": "string",
            "format": "date-time"
          }
        },
        "required": [
          "terminalId",
          "terminalName",
          "terminalType"
        ]
      }
    }
  },
  "required": ["device", "terminals"],
  "examples": [
    {
      "metadata": {
        "version": "1.0.0",
        "lastUpdated": "2026-04-18T10:30:00Z",
        "environment": "development"
      },
      "device": {
        "fingerprint": "DEVICE-A1B2C3D4E5F6",
        "hostname": "SALES-PC-01",
        "platform": "win32",
        "architecture": "x64",
        "registeredAt": "2026-04-18T09:00:00Z"
      },
      "terminals": [
        {
          "terminalId": "TERM-A1B2C3D4E5F6-001",
          "terminalName": "Counter 1",
          "terminalType": "SALES",
          "invoiceControls": {
            "invoiceNumberPrefix": "C1"
          },
          "formatMapping": {
            "invoice": {
              "templateId": "ObjectId"
            },
            "deliveryNote": {
              "templateId": "ObjectId"
            },
            "quotation": {
              "templateId": null
            },
            "salesOrder": {
              "templateId": null
            },
            "salesReturn": {
              "templateId": null
            }
          },
          "hardwareMapping": {
            "invoicePrinter": {
              "enabled": true,
              "printerName": "EPSON TM-T88V Receipt Printer",
              "timeout": 5000
            },
            "barcodePrinter": {
              "enabled": false,
              "printerName": "",
              "timeout": 5000
            },
            "customerDisplay": {
              "enabled": false,
              "displayType": "VFD",
              "comPort": "COM1",
              "vfdModel": "VFD_20X2",
              "baudRate": 9600,
              "displayItems": true,
              "displayPrice": true,
              "displayTotal": true,
              "displayDiscount": true
            }
          },
          "createdAt": "2026-04-18T10:00:00Z",
          "updatedAt": "2026-04-18T10:30:00Z"
        },
        {
          "terminalId": "TERM-A1B2C3D4E5F6-002",
          "terminalName": "Counter 2",
          "terminalType": "SALES",
          "invoiceControls": {
            "invoiceNumberPrefix": "C2"
          },
          "formatMapping": {
            "invoice": {
              "templateId": "ObjectId"
            },
            "deliveryNote": {
              "templateId": "ObjectId"
            },
            "quotation": {
              "templateId": null
            },
            "salesOrder": {
              "templateId": null
            },
            "salesReturn": {
              "templateId": null
            }
          },
          "hardwareMapping": {
            "invoicePrinter": {
              "enabled": true,
              "printerName": "STAR TSP100II",
              "timeout": 5000
            },
            "barcodePrinter": {
              "enabled": true,
              "printerName": "Zebra GK420d",
              "timeout": 5000
            },
            "customerDisplay": {
              "enabled": true,
              "displayType": "VFD",
              "comPort": "COM2",
              "vfdModel": "VFD_20X4",
              "baudRate": 9600,
              "displayItems": true,
              "displayPrice": true,
              "displayTotal": true,
              "displayDiscount": true
            }
          },
          "createdAt": "2026-04-18T10:15:00Z",
          "updatedAt": "2026-04-18T10:30:00Z"
        }
      ]
    }
  ]
}
