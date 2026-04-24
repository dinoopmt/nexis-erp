# Print Functionality Implementation Patterns

## Overview
The NEXIS ERP system implements printing through multiple layers:
1. **Browser-based printing** (`window.print()`)
2. **Smart Print Service** (terminal-aware routing)
3. **Electron IPC** (silent printing to configured printers)
4. **PDF Generation** (server-side Puppeteer + client-side html2pdf)
5. **Modal components** (BarcodePrintModal, GlobalBarcodePrintModal)

---

## 1. BROWSER PRINT PATTERN

### Simple Window Print
**Location**: Multiple components (SalesInvoice, Product, SalesReturn)

```javascript
// Basic approach - opens browser print dialog
const handlePrint = useCallback(() => {
  window.print();
}, []);

// Save and print
const handleSaveAndPrint = useCallback(async () => {
  const saved = await handleSaveInvoice(() => {
    setTimeout(() => handlePrint(), 500);
  });
  return saved;
}, [handleSaveInvoice, handlePrint]);
```

**Used in**:
- `client/src/hooks/useSalesInvoiceHandlers.js` (line 220-221)
- `client/src/components/sales/SalesReturn.jsx` (line 951, 958)
- `client/src/components/product/Product.jsx` (line 2260)
- `client/src/services/SmartPrintService.js` (line 115)

---

## 2. SMART PRINT SERVICE PATTERN

### Intelligent Print Routing
**Location**: `client/src/services/SmartPrintService.js`

```javascript
/**
 * Smart Print Service
 * Handles intelligent printing decisions based on terminal configuration
 * - Auto-print if printer is configured and enabled
 * - Show dialog if no printer configured
 * - Route to specific printer on backend
 */

export function shouldAutoPrint(printerConfig) {
  return printerConfig && printerConfig.enabled && printerConfig.printerName;
}

export function getPrintJobConfig(terminalConfig, invoiceData, documentType = 'invoice') {
  if (!terminalConfig) {
    return null;
  }

  const printerConfig = terminalConfig.hardwareMapping?.invoicePrinter;
  const templateId = terminalConfig.formatMapping?.[documentType];

  return {
    autoPrint: shouldAutoPrint(printerConfig),
    printerName: printerConfig?.printerName || null,
    printerEnabled: printerConfig?.enabled || false,
    timeout: printerConfig?.timeout || 5000,
    templateId: templateId || null,
    documentType: documentType,
  };
}

export async function sendPrintJob(invoiceData, printConfig) {
  try {
    if (!printConfig || !printConfig.printerName) {
      console.warn('⚠️ No printer configured, skipping backend print');
      return { success: false, reason: 'No printer configured' };
    }

    const authToken = localStorage.getItem('token') || localStorage.getItem('authToken');
    const configRes = await fetch('/config/terminal.json');
    const { terminalId, apiBaseUrl } = await configRes.json();
    const baseUrl = apiBaseUrl || 'http://localhost:5000/api/v1';

    // Send to backend print endpoint
    const response = await fetch(`${baseUrl}/print/invoice`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'terminal-id': terminalId,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        invoiceId: invoiceData.id || invoiceData._id,
        printerName: printConfig.printerName,
        templateId: printConfig.templateId,
        autoPrint: printConfig.autoPrint,
        timeout: printConfig.timeout,
      }),
    });

    const result = await response.json();
    return { success: true, data: result };
  } catch (error) {
    console.error('❌ Error sending print job:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Handle invoice printing (main entry point)
 */
export async function printInvoice(invoiceData, terminalConfig, options = {}) {
  const { showDialog = true, documentType = 'invoice' } = options;

  try {
    const printConfig = getPrintJobConfig(terminalConfig, invoiceData, documentType);

    // If auto-print is enabled, send to backend
    if (printConfig?.autoPrint) {
      console.log('📠 Auto-printing invoice to:', printConfig.printerName);
      const result = await sendPrintJob(invoiceData, printConfig);
      if (result.success) {
        return { success: true, method: 'auto-print', data: result.data };
      }
    }

    // Fall back to browser print dialog
    if (showDialog) {
      console.log('🖨️ Showing browser print dialog');
      window.print();
      return { success: true, method: 'browser-print' };
    }

    return { success: false, reason: 'No print method available' };
  } catch (error) {
    console.error('❌ Error printing invoice:', error);
    return { success: false, error: error.message };
  }
}
```

**API Endpoints**:
- `POST /api/v1/print/invoice` - Send print job to backend
- `POST /api/v1/print/test-printer` - Test printer connectivity

---

## 3. INVOICE PRINTING COMPONENT PATTERN

### Server + Client Hybrid PDF Generation
**Location**: `client/src/components/sales/salesInvoice/InvoicePrintingComponent.jsx`

```javascript
const InvoicePrintingComponent = ({ invoiceId, onClose }) => {
  const { terminalConfig, isLoading: terminalLoading, error: terminalError } = useTerminal();
  
  const [previewHtml, setPreviewHtml] = useState('');
  const [invoiceHtml, setInvoiceHtml] = useState(''); // Store invoice HTML for preview
  const [pdfBlob, setPdfBlob] = useState(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const contentRef = useRef();

  // ✅ Fetch preview whenever invoice ID or templateId changes
  const handlePreview = async () => {
    try {
      console.log(`========== HANDLE PREVIEW CALLED ==========`);
      setLoading(true);
      
      const terminalId = terminalConfig?.terminalId;
      
      try {
        // ✅ STEP 1: Fetch invoice HTML for preview - SHOW IMMEDIATELY
        console.log('📄 [Server] Fetching invoice HTML...');
        const htmlResponse = await axios.get(
          `${API_URL}/invoices/${invoiceId}/html`,
          {
            params: { templateId, terminalId }
          }
        );
        
        const invoiceHtmlContent = htmlResponse.data;
        setInvoiceHtml(invoiceHtmlContent);
        setPreviewHtml('loaded'); // Signal preview is ready
        console.log('✅ Invoice HTML fetched - Preview shown');
        
        setLoading(false);

        // ✅ STEP 2: Fetch PDF in BACKGROUND (non-blocking)
        console.log('📄 [Background] Fetching PDF from Puppeteer...');
        setPdfLoading(true);
        
        try {
          const pdfResponse = await axios.post(
            `${API_URL}/invoices/${invoiceId}/generate-pdf`,
            {},
            {
              params: { templateId, terminalId, _t: Date.now() },
              responseType: 'blob'
            }
          );

          setPdfBlob(pdfResponse.data);
          setPdfSource('server');
          console.log('✅ PDF ready (background)');
        } catch (pdfErr) {
          console.warn('⚠️ PDF generation failed:', pdfErr.message);
          // PDF generation failed, but preview is still visible
        } finally {
          setPdfLoading(false);
        }
        return;

      } catch (serverErr) {
        console.warn('⚠️ Server fetch failed:', serverErr.message);
        
        // Fallback: Show error or use simple HTML
        setInvoiceHtml(`
          <div style="padding: 40px; text-align: center; font-family: Arial, sans-serif;">
            <h1>Invoice #${invoiceId.substring(0, 8)}</h1>
            <p style="color: #666;">Generated: ${new Date().toLocaleDateString()}</p>
            <p style="margin-top: 20px; color: #999;">
              ⚠️ Could not load full invoice details.
            </p>
          </div>
        `);
        setPreviewHtml('loaded');
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || 'Failed to load invoice';
      setError(errorMsg);
      console.error('❌ Invoice error:', err);
    }
  };

  // ✅ Download PDF (already generated and stored in pdfBlob)
  const handleDownloadPdf = async () => {
    try {
      if (!pdfBlob) {
        showToast('error', 'No PDF available');
        return;
      }

      const fileName = `Invoice_${new Date().toISOString().split('T')[0]}.pdf`;
      const isElectron = window.electronAPI && typeof window.electronAPI.isElectron === 'boolean';

      if (isElectron) {
        // ✅ Electron available - use native file save dialog
        try {
          console.log('💾 Using Electron file API to save PDF...');
          const arrayBuffer = await pdfBlob.arrayBuffer();
          const result = await window.electronAPI.file.saveFile(fileName, Buffer.from(arrayBuffer));
          
          if (result.success) {
            console.log('✅ PDF saved successfully:', result.filePath);
            showToast('success', `PDF saved to: ${result.filePath}`);
          }
        } catch (electronErr) {
          console.warn('⚠️ Electron file save failed, falling back to browser download:', electronErr);
          downloadViaBlob(pdfBlob, fileName);
        }
      } else {
        // ✅ Browser environment - use standard blob download
        downloadViaBlob(pdfBlob, fileName);
      }
    } catch (err) {
      const errorMsg = err.message || 'Failed to download PDF';
      console.error('❌ Download error:', err);
    }
  };
};
```

**API Endpoints**:
- `GET /invoices/{invoiceId}/html` - Fetch invoice HTML (with templateId, terminalId)
- `POST /invoices/{invoiceId}/generate-pdf` - Generate PDF from HTML

---

## 4. INVOICE PREVIEW MODAL PATTERN

### Multi-Method Print Routing
**Location**: `client/src/components/sales/salesInvoice/InvoicePreviewModal.jsx`

```javascript
export default function InvoicePreviewModal({ 
  isOpen, 
  onClose, 
  invoiceData, 
  company,
  formatCurrency,
  round 
}) {
  const printRef = useRef(null);
  const terminalPrinter = useTerminalPrinter('invoicePrinter');

  // ========================================
  // HANDLE BROWSER PRINT
  // ========================================
  const handleBrowserPrint = () => {
    printRef.current?.print?.() || window.print();
  };

  // ========================================
  // HANDLE TERMINAL PRINT
  // ========================================
  const handleTerminalPrint = async () => {
    if (!terminalPrinter?.enabled) {
      console.warn('⚠️ Terminal printer not configured');
      handleBrowserPrint();
      return;
    }

    try {
      console.log('📡 Sending to terminal printer:', terminalPrinter.printerName);
      
      // Get HTML content
      const printContent = printRef.current?.innerHTML || 
                          document.querySelector('[data-invoice-print]')?.innerHTML;
      
      if (!printContent) {
        console.error('❌ No print content found');
        handleBrowserPrint();
        return;
      }

      // Use SmartPrintService.printInvoice to send to terminal printer
      const response = await SmartPrintService.printInvoice(
        {
          id: invoiceData.invoiceNo,
          content: printContent,
        },
        terminalPrinter,
        { showDialog: false, documentType: 'invoice' }
      );

      if (response.success) {
        console.log('✅ Invoice sent to terminal printer');
      } else {
        console.warn('⚠️ Print job may not have completed:', response.reason);
        handleBrowserPrint();
      }
    } catch (error) {
      console.error('❌ Error sending to terminal printer:', error);
      handleBrowserPrint();
    }
  };

  // ========================================
  // HANDLE DOWNLOAD PDF
  // ========================================
  const handleDownloadPDF = () => {
    try {
      const element = printRef.current;
      if (!element) {
        console.error('❌ Print element not found');
        return;
      }

      const opt = {
        margin: 10,
        filename: `invoice-${invoiceData.invoiceNo}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4' },
      };

      // Dynamic import of html2pdf for PDF generation
      import('html2pdf.js').then((html2pdf) => {
        html2pdf.default().set(opt).from(element).save();
      }).catch(error => {
        console.error('❌ Error generating PDF:', error);
        handleBrowserPrint();
      });
    } catch (error) {
      console.error('❌ Error downloading PDF:', error);
      handleBrowserPrint();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Actions */}
        <div className="flex gap-2 p-4 border-b">
          <button
            onClick={handleBrowserPrint}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2"
          >
            <Printer size={16} /> Print
          </button>
          <button
            onClick={handleDownloadPDF}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-2"
          >
            <Download size={16} /> Download PDF
          </button>
        </div>

        {/* Preview */}
        <div className="flex-1 overflow-y-auto p-6">
          <div ref={printRef} className="bg-white p-8 border border-gray-300">
            {/* Invoice content here */}
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

## 5. BARCODE PRINT MODAL PATTERN

### Printer-Aware Label Printing
**Location**: `client/src/components/shared/model/BarcodePrintModal.jsx`

```javascript
const BarcodePrintModal = ({
  isOpen,
  onClose,
  barcode,
  productName,
  pricingLines = [],
  units = [],
}) => {
  const [settings, setSettings] = useState({
    format: "price-tag",
    quantity: 1,
    size: "standard",
    columns: 2,
    rows: 4,
    selectedBarcodeIndex: 0,
    printerName: "Default Printer",
    showPrice: true,
    showProductName: true,
  });

  const [availablePrinters, setAvailablePrinters] = useState([
    { name: "Default Printer", type: "thermal" },
    { name: "Zebra ZD410", type: "thermal" },
    { name: "Brother QL-710W", type: "label" },
    { name: "HP LaserJet Pro", type: "laser" },
    { name: "Canon imageFORMULA", type: "multifunction" },
  ]);

  const handlePrint = () => {
    if (!selectedBarcode_value) {
      showToast('error', "Please select a barcode to print");
      return;
    }

    const selectedPrinter = availablePrinters.find(
      (p) => p.name === settings.printerName
    );

    const printData = {
      barcode: selectedBarcode_value,
      format: settings.format,
      quantity: settings.quantity,
      size: settings.size,
      columns: settings.columns,
      rows: settings.rows,
      printer: settings.printerName,
      printerType: selectedPrinter?.type,
      unitVariant: selectedUnit?.unitName || "Base Unit",
      productName: productName,
      inclusion: {
        price: settings.showPrice,
        productName: settings.showProductName,
      },
    };

    console.log("🖨️ Printing barcode labels:", printData);
    showToast('success', `🖨️ Sending ${settings.quantity} labels to ${settings.printerName}`);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} width="max-w-4xl" draggable={true}>
      <div className="p-4 flex flex-col gap-3">
        <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
          <Printer size={20} />
          Print Barcode Labels
        </h2>
        {/* Format, Printer, and Preview UI */}
      </div>
    </Modal>
  );
};
```

**Format Options**:
- `price-tag` - Price Tag Label (includes product name, barcode & price)
- `shelf-edge` - Shelf Edge Label (compact, high-visibility)
- `barcode-only` - Barcode Only (minimal, code 128 format)
- `sticker` - Small Sticker (small format for packaging)

---

## 6. GLOBAL BARCODE PRINT MODAL PATTERN

### Global Print Context
**Location**: `client/src/components/modals/GlobalBarcodePrintModal.jsx`

```javascript
const GlobalBarcodePrintModal = ({ isOpen, onClose, products = [] }) => {
  const handlePrint = async () => {
    // Global barcode printing for multiple products
    console.log("🖨️ Printing barcode labels:", printData);
    showToast('success', `🖨️ Sending ${settings.quantity} labels to ${settings.printerName}`);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} width="max-w-4xl" draggable={true}>
      <div className="p-4 flex flex-col gap-3">
        <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
          <Printer size={20} />
          Print Global Barcodes
        </h2>
        {/* Multiple product barcode printing */}
      </div>
    </Modal>
  );
};

export default GlobalBarcodePrintModal;
```

---

## 7. ELECTRON SILENT PRINTING PATTERN

### Production-Grade Silent Print
**Location**: `client/electron/services/PdfGeneratorService.cjs`

```javascript
/**
 * ✅ BEST APPROACH: Silent print A4 invoice using HTML + Electron's webContents.print()
 * This is the production-grade approach used by ERP systems
 * 
 * @param {string} invoiceId - Invoice ID to print
 * @param {string} templateId - Template ID for rendering
 * @param {string} terminalId - Terminal ID for store-specific header
 * @param {string} printerName - Printer name from terminal settings
 * @param {string} apiUrl - API base URL
 */
static async printInvoiceA4Silent(invoiceId, templateId, terminalId, printerName, apiUrl) {
  try {
    console.log(`\n========== PRINT JOB STARTED ==========`);
    console.log(`Invoice: ${invoiceId}`);
    console.log(`Template: ${templateId}`);
    console.log(`Printer: ${printerName}`);
    
    // Create print window
    const printWindow = new BrowserWindow({
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'preload.cjs'),
      },
    });

    // Load invoice HTML
    const invoiceUrl = `${apiUrl}/invoices/${invoiceId}/html?templateId=${templateId}&terminalId=${terminalId}`;
    await printWindow.loadURL(invoiceUrl);

    // Wait for page to render
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Execute print
    printWindow.webContents.print({
      silent: true,
      printBackground: true,
      color: true,
      margins: { marginType: 'custom', top: 10, bottom: 10, left: 10, right: 10 },
      pageSize: 'A4',
      deviceName: printerName,
    });

    // Close window after print
    setTimeout(() => {
      printWindow.close();
    }, 2000);

    console.log('✅ Print job completed successfully');
    return { success: true, message: 'Print job sent to printer' };
  } catch (error) {
    console.error('❌ PDF print error:', error.message);
    return { success: false, message: error.message };
  }
}
```

**Preload API**:
```javascript
const pdfAPI = {
  printInvoiceA4Silent: (invoiceId, templateId, terminalId, printerName, apiUrl) =>
    ipcRenderer.invoke('pdf:printInvoiceA4Silent', invoiceId, templateId, terminalId, printerName, apiUrl),
};
```

---

## 8. INVOICE VIEW MODAL PATTERN

### Read-Only Invoice Display
**Location**: `client/src/components/sales/salesInvoice/InvoiceViewModal.jsx`

```javascript
const InvoiceViewModal = ({ viewedInvoice, setViewedInvoice, config, formatNumber }) => {
  if (!viewedInvoice) return null;

  return (
    <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Close Button */}
        <div className="flex justify-end p-4 border-b">
          <button
            onClick={() => setViewedInvoice(null)}
            className="text-white bg-gray-600 hover:bg-gray-700 w-8 h-8 flex items-center justify-center rounded transition-colors text-sm"
          >
            ✕
          </button>
        </div>

        {/* Invoice Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-8 bg-white">
          {/* Invoice Header, Items, Totals */}
        </div>
      </div>
    </div>
  );
};
```

---

## 9. SERVICE LAYER PATTERN

### SalesInvoiceService
**Location**: `client/src/services/SalesInvoiceService.js`

```javascript
static async printInvoice(invoiceId) {
  try {
    const response = await axios.get(
      `${API_URL}/sales-invoices/printInvoice/${invoiceId}`,
      { responseType: "blob" }
    );
    return response.data;
  } catch (error) {
    console.error("Error printing invoice:", error);
    throw error;
  }
}
```

---

## 10. PACKAGES & LIBRARIES

**HTML to PDF**:
```javascript
"html2pdf.js": "^0.14.0"  // Client-side HTML to PDF conversion
"jspdf": "^4.0.0"          // PDF generation library
```

**PDF Viewer**:
```javascript
"pdfjs-dist": "^5.6.205"   // PDF.js for viewing
"react-pdf": "^10.4.1"     // React PDF viewer component
```

**Print**:
```javascript
"react-to-print": "^2.14.x" // React printing utilities
```

---

## PRINTING DECISION FLOW

```
User clicks Print
  ↓
Check if running in Electron?
  ├─ YES → Use Electron silent print (webContents.print)
  └─ NO → Check terminal printer config
         ├─ Printer configured + enabled?
         │  ├─ YES → Send to backend print endpoint
         │  └─ NO → Show browser print dialog
         └─ Browser Print Dialog (window.print())
```

---

## KEY COMPONENTS SUMMARY

| Component | Purpose | Pattern |
|-----------|---------|---------|
| `InvoicePrintingComponent` | Full invoice preview + PDF generation | Server HTML + background PDF |
| `InvoicePreviewModal` | Quick print options | Browser print + Smart routing |
| `BarcodePrintModal` | Barcode label printing | Printer selection + format options |
| `GlobalBarcodePrintModal` | Batch barcode printing | Global context + multiple products |
| `SmartPrintService` | Intelligent print routing | Config-aware + fallback chain |
| `PdfGeneratorService` (Electron) | Silent A4 printing | webContents.print + IPC |

---

## API ENDPOINTS USED

```
GET  /invoices/{invoiceId}/html               - Fetch invoice HTML
POST /invoices/{invoiceId}/generate-pdf       - Generate PDF
GET  /sales-invoices/printInvoice/{invoiceId} - Legacy print endpoint
POST /api/v1/print/invoice                    - Backend print job
POST /api/v1/print/test-printer               - Test printer connectivity
```

---

## PRINTING FLOW BY DOCUMENT TYPE

### Sales Invoice
1. User clicks Print button
2. Opens `InvoicePrintingComponent` modal
3. Fetches HTML from `/invoices/{id}/html`
4. Shows preview immediately
5. Generates PDF in background
6. User can: Print (browser), Download PDF, or send to terminal printer

### Barcode Labels
1. User clicks Print Barcode
2. Opens `BarcodePrintModal`
3. Selects format, quantity, printer
4. Sends print job to IPC handler (if Electron) or backend
5. Thermal/label printer handles output

### Quotations & GRN
- Uses `window.print()` for browser print dialog
- No dedicated print modals currently implemented
- Falls back to browser's print-to-PDF capability
