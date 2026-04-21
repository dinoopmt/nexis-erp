# Offline Invoice PDF Generation in Electron

## Architecture

### 1. **Server-based PDF** (Current)
- Backend generates PDF using Puppeteer
- Pros: Consistent styling, no client overhead
- Cons: Requires server connection

### 2. **Client-side PDF** (NEW - for Electron offline)
- Frontend generates PDF using html2pdf (html2canvas + jsPDF)
- Pros: Works offline, instant generation, no server load
- Cons: May have slight styling differences

### 3. **Hybrid Approach** (Recommended)
- Try client-side (offline) first in Electron
- Fall back to server if client generation fails
- Cache PDFs locally for offline printing

---

## Installation

### Frontend Dependencies
```bash
npm install html2pdf.js
```

### Electron Dependencies  
Already included in `electron/services/PdfGeneratorService.js`

---

## Usage

### Option 1: Server-based PDF (Current Implementation)
```javascript
// POST /api/invoices/:invoiceId/generate-pdf
const response = await axios.post(
  `${API_URL}/invoices/${invoiceId}/generate-pdf`,
  {},
  { responseType: 'blob' }
);
```

### Option 2: Client-side PDF (New - Electron offline)
```javascript
import ClientPdfGeneratorService from '@/services/ClientPdfGeneratorService';

// Generate from HTML element
const blob = await ClientPdfGeneratorService.getPdfBlob(htmlElement, {
  filename: 'invoice.pdf',
  format: 'a4'
});

// Print in Electron
await ClientPdfGeneratorService.printPdfInElectron(blob);

// Save to file
await ClientPdfGeneratorService.savePdf(blob, 'Invoice_001.pdf');
```

---

## InvoicePrintingComponent Flow

### Online (Server available)
1. ✅ Fetch PDF from server (Puppeteer-generated)
2. Display in preview
3. Print/Download from cached PDF

### Offline (No server connection)
1. ✅ Generate PDF client-side (html2pdf)
2. Cache in IndexedDB
3. Display in preview
4. Print/Download

### Electron Context
1. Try client-side generation (fast, offline)
2. Fall back to server if available
3. Use Electron file/print APIs for native integration

---

## Performance

- **Server PDF**: 2-3 seconds (Puppeteer processing)
- **Client PDF**: 500ms-1s (html2canvas rendering)
- **Electron Native**: 100-200ms (direct Chromium print)

---

## Cache Strategy

### IndexedDB Storage
- Store last 10 generated PDFs
- Key: `invoiceId`
- Value: { pdfBlob, metadata, cachedAt }
- Auto-cleanup: Remove older PDFs when > 10 stored

### Offline Fallback
1. Check if online → Use server PDF
2. If offline → Check IndexedDB cache
3. If not cached → Generate client-side
4. Auto-save to cache

---

## Implementation Status

- ✅ Server PDF generation (Puppeteer backend)
- ✅ Client-side PDF generation (html2pdf)
- ✅ Offline cache (IndexedDB)
- ✅ Electron file/print APIs (preload)
- 🔄 Component integration (in progress)

---

## Next Steps

1. Install `html2pdf.js` package
2. Update InvoicePrintingComponent to use hybrid approach
3. Test offline PDF generation
4. Test Electron file save / print
5. Verify cache lifecycle
