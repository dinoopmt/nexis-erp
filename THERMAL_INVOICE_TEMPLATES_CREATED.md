# Thermal Invoice Templates - Updated with 80mm Support

## Overview
Created four thermal invoice templates optimized for supermarket POS thermal receipt printers supporting both 58mm and 80mm paper widths.

## Templates Created

### 58mm Templates (Narrow Format)

#### 1. English Thermal Receipt - 58mm
- **Template Name:** `Thermal_Receipt_58mm_EN`
- **Language:** English (EN)
- **Document Type:** INVOICE
- **Paper Size:** A5 (58mm thermal paper width)
- **Status:** Active
- **Default:** No

#### 2. Arabic Thermal Receipt - 58mm
- **Template Name:** `Thermal_Receipt_58mm_AR`
- **Language:** Arabic (AR)
- **Document Type:** INVOICE
- **Paper Size:** A5 (58mm thermal paper width)
- **Status:** Active
- **Default:** No

### 80mm Templates (Wide Format)

#### 3. English Thermal Receipt - 80mm
- **Template Name:** `Thermal_Receipt_80mm_EN`
- **Language:** English (EN)
- **Document Type:** INVOICE
- **Paper Size:** A5 (80mm thermal paper width)
- **Status:** Active
- **Default:** No
- **Font Size:** Increased (12px vs 11px for 58mm)
- **Item Width:** Wider columns for more details

#### 4. Arabic Thermal Receipt - 80mm
- **Template Name:** `Thermal_Receipt_80mm_AR`
- **Language:** Arabic (AR)
- **Document Type:** INVOICE
- **Paper Size:** A5 (80mm thermal paper width)
- **Status:** Active
- **Default:** No
- **Font Size:** Increased (12px vs 11px for 58mm)
- **Layout:** RTL with wider spacing

## Comparison: 58mm vs 80mm

| Feature | 58mm | 80mm |
|---------|------|------|
| **Paper Width** | 58mm | 80mm |
| **Font Size** | 11px | 12px |
| **Max Item Width** | 30mm | 45mm |
| **Column Spacing** | Tight | Comfortable |
| **Readability** | Good | Better |
| **Item Details** | Minimal | More detailed |
| **QR Code Size** | 25mm | 30mm |
| **Use Cases** | Convenience stores, fast food | Supermarkets, retail chains |

## Template Features

### Layout Optimizations
✅ Compact single-page thermal receipt format
✅ Courier New monospace font (English) / Arial (Arabic)
✅ No logo or images (except QR code)
✅ Dashed line separators for thermal printer compatibility
✅ Right-to-left (RTL) layout for Arabic version
✅ Narrow columns optimized for 58mm paper width

### Content Sections

**Header:**
- Store name (centered)
- Store address
- Phone number
- Receipt number and date/time
- Terminal name (optional)

**Items Table:**
- Item description
- Item code
- Quantity
- Unit price (for reference)
- Line total amount

**Payment Information:**
- Subtotal
- Discount (if applicable)
- Tax/VAT with percentage
- Grand total (emphasized)
- Payment method
- Amount paid
- Change (if applicable)

**QR Code:**
- QR code section (if enabled)
- Transaction ID display

**Footer:**
- Thank you message
- Encouragement to visit again

## Database Collection

**Collection:** `invoicetemplates`

### Fields
```javascript
{
  templateName: string,              // Unique: "Thermal_Receipt_EN"
  language: enum,                    // "EN" or "AR"
  templateType: string,              // "INVOICE"
  includeLogo: boolean,              // false
  customDesign: {
    headerColor: "#000000",
    bodyFont: string,
    showQrCode: true,
    currency: "AED",
    pageSize: "A5",
    margins: { top: 2, bottom: 2, left: 2, right: 2 }
  },
  htmlContent: string,               // Handlebars template
  cssContent: string,                // CSS styling
  description: string,               // Template description
  isActive: true,
  isDefault: false,
  createdBy: "SYSTEM",
  createdAt: timestamp,
  updatedAt: timestamp
}
```

## How to Seed Templates

### Method 1: Run Main Seeding Script
```bash
node server/seedInvoiceTemplates.js
```

This will seed all templates including:
- Invoice_EN_with_Logo
- Invoice_EN_without_Logo
- Invoice_AR_with_Logo
- Invoice_AR_without_Logo
- **Thermal_Receipt_58mm_EN** (NEW)
- **Thermal_Receipt_58mm_AR** (NEW)
- **Thermal_Receipt_80mm_EN** (NEW)
- **Thermal_Receipt_80mm_AR** (NEW)

### Method 2: Run Thermal-Specific Seeder
```bash
node server/seeders/seedThermalTemplates.js
```

This will seed only the thermal templates if run independently.

## Terminal Configuration

To use thermal templates with your terminal hardware:

1. **Add Thermal Printer Mapping in Terminal Settings:**
   - Enable thermal printer checkbox
   - Select printer from detected devices
   - Set timeout (default: 5000ms)

2. **Choose Template Based on Printer:**
   
   **For 58mm Thermal Printer:**
   - English: Select `Thermal_Receipt_58mm_EN`
   - Arabic: Select `Thermal_Receipt_58mm_AR`
   
   **For 80mm Thermal Printer:**
   - English: Select `Thermal_Receipt_80mm_EN`
   - Arabic: Select `Thermal_Receipt_80mm_AR`

3. **Assign Template to Terminal:**
   - In terminal configuration
   - Select appropriate thermal template as invoice template
   - Save terminal configuration

4. **Database Structure:**
   Terminal document will contain:
   ```javascript
   {
     hardwareMapping: {
       thermalPrinter: {
         enabled: true,
         printerName: "Thermal_Printer_Name",
         timeout: 5000
       }
     },
     formatMapping: {
       invoice: {
         templateId: ObjectId // References Thermal_Receipt_58mm_EN or 80mm variant
       }
     }
   }
   ```

## Handlebars Variables Available

### Store Information
- `{{@root.store.storeName}}` - Store name
- `{{@root.store.address1}}` - Primary address
- `{{@root.store.address2}}` - Secondary address
- `{{@root.company.phone}}` - Phone number
- `{{@root.company.email}}` - Email

### Invoice Data
- `{{@root.invoice.invoiceNumber}}` - Receipt number
- `{{@root.invoice.date}}` - Transaction date/time
- `{{@root.invoice.customerName}}` - Customer name
- `{{@root.invoice.terminalName}}` - Terminal identifier

### Line Items
- `{{itemName}}` - Product name
- `{{itemCode}}` - Product code/SKU
- `{{quantity}}` - Quantity
- `{{unitPrice}}` - Unit price
- `{{total}}` - Line total

### Totals
- `{{@root.invoice.subtotal}}` - Subtotal amount
- `{{@root.invoice.discountAmount}}` - Total discount
- `{{@root.invoice.vatAmount}}` - Tax amount
- `{{@root.invoice.vatPercentage}}` - Tax percentage
- `{{@root.invoice.totalIncludeVat}}` - Final total
- `{{@root.invoice.paymentType}}` - Payment method
- `{{@root.invoice.amountPaid}}` - Amount paid
- `{{@root.invoice.changeAmount}}` - Change given

### QR Code
- `{{@root.invoice.qrCode}}` - Base64 encoded QR code image

### Helpers
- `{{formatNumber value 2}}` - Format number with decimals
- `{{date value 'DD/MM/YYYY HH:mm'}}` - Format date/time

## CSS Styling Features

- Monospace font for thermal alignment
- Dashed line separators for tear-off points
- Optimized column widths for 58mm paper
- Right-to-left text alignment for Arabic
- No background colors (thermal optimization)
- Bold text for important totals

## Supermarket Use Cases

✅ Quick checkout receipts
✅ Supermarket POS systems
✅ Retail chain stores
✅ Fast food restaurants
✅ Convenience stores
✅ Petrol stations
✅ Ticket/receipt generation

## Performance Optimization

- Single-page rendering (no pagination)
- No complex styling or images
- Minimal HTML structure
- Fast print job execution
- Reduced paper waste

## Files Created

1. **[server/templates/thermalInvoiceTemplate.js](server/templates/thermalInvoiceTemplate.js)**
   - Template definitions (English & Arabic)
   - Complete HTML/CSS content
   - Configuration structure

2. **[server/seeders/seedThermalTemplates.js](server/seeders/seedThermalTemplates.js)**
   - Standalone thermal template seeder
   - Verification logic
   - Success/failure reporting

3. **Updated [server/seedInvoiceTemplates.js](server/seedInvoiceTemplates.js)**
   - Added thermal templates to main seeding process
   - Imports thermal template definitions
   - Includes thermal templates in batch upsert

## Next Steps

1. Run seeding script: `node server/seedInvoiceTemplates.js`
2. Verify templates in MongoDB: `db.invoicetemplates.find({templateName: /Thermal/})`
3. Configure terminal with thermal printer hardware mapping
4. Assign thermal template to terminal invoice format
5. Test printing thermal receipt

## Troubleshooting

### Templates not appearing in dropdown?
- Ensure seeding script ran successfully
- Check `isActive: true` in database
- Verify `templateType: 'INVOICE'` matches
- All 4 templates should be available: 58mm_EN, 58mm_AR, 80mm_EN, 80mm_AR

### Template not rendering?
- Check Handlebars syntax in htmlContent
- Verify invoice data object structure
- Check browser console for template errors
- Ensure you selected the correct width (58mm vs 80mm) for your printer

### Wrong paper width selected?
- **58mm template on 80mm printer:** Text will be off-center, too much white space
- **80mm template on 58mm printer:** Text will be cut off, items wrapping incorrectly
- Solution: Verify printer width (check printer specifications) and select matching template

### Printer not receiving data?
- Verify thermal printer enabled in terminal settings
- Check `hardwareMapping.thermalPrinter.enabled: true`
- Verify printer name matches installed device
- Check timeout value (increase if needed)
- Verify correct template width is selected for your printer hardware

## Reference Links

- [Terminal Hardware Mapping](server/Models/TerminalManagement.js)
- [Template Schema](server/Models/InvoiceTemplate.js)
- [PDF Generation Service](server/services/PdfGenerationService.js)
- [Terminal Configuration UI](client/src/components/settings/general/TerminalFormModal.jsx)

---

## Quick Selection Guide

### Which thermal template should I use?

**Check your thermal printer specifications:**

1. **Open printer settings or specifications**
2. **Look for "Paper Width"**
3. **Match with template:**

| Printer Width | English Template | Arabic Template |
|---|---|---|
| 58mm | `Thermal_Receipt_58mm_EN` | `Thermal_Receipt_58mm_AR` |
| 80mm | `Thermal_Receipt_80mm_EN` | `Thermal_Receipt_80mm_AR` |

**If unsure:** Most supermarkets use 80mm. Convenience stores often use 58mm.

### Template Dimensions

**58mm Format:**
- Paper: 58mm wide
- Font size: 11px
- Item code column: ~30mm
- Best for: Quick receipts, fast transactions

**80mm Format:**
- Paper: 80mm wide
- Font size: 12px (larger, easier to read)
- Item code column: ~45mm
- Best for: Detailed receipts, better readability
