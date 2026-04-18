# Comprehensive Codebase Search Findings

## 1. TERMINAL-RELATED CODE

### A. Terminal Models

#### ✅ TerminalManagement.js
**Location:** `d:\NEXIS-ERP\server\Models\TerminalManagement.js`

**Purpose:** Core terminal configuration and management model

**Key Fields:**
- `terminalId` (unique): e.g., "POS-001", "TERMINAL-001"
- `terminalName`: Friendly name (e.g., "Main Counter", "Billing Point 1")
- `storeId` (ref: Store)
- `organizationId` (ref: Organization)
- `terminalStatus`: enum: ["ACTIVE", "INACTIVE", "MAINTENANCE", "OFFLINE"]
- `invoiceControls`:
  - `invoiceNumberPrefix`: Prefix for invoice numbering
  - `invoiceFormat`: enum: ["STANDARD", "THERMAL", "THERMAL80", "A4"]
- `printingFormats`: Mixed type for flexible format configuration
- `createdBy`, `createdAt`, `updatedBy`, `updatedAt`: Audit fields
- `notes`: Additional setup notes

**Collection Name:** `terminal_management`

**Indexes:**
- `terminalId: 1`
- `storeId: 1`

---

### B. Terminal API Routes

#### ✅ terminalManagementRoutes.js
**Location:** `d:\NEXIS-ERP\server\modules\settings\routes\terminalManagementRoutes.js`

**Available Endpoints:**

1. **CRUD Operations:**
   - `POST /terminals/create` - Create new terminal
   - `GET /terminals/store/:storeId` - Get all terminals for a store
   - `GET /terminals/:terminalId` - Get specific terminal
   - `PUT /terminals/:terminalId` - Update terminal config
   - `DELETE /terminals/:terminalId` - Delete terminal

2. **Hardware Configuration:**
   - `PUT /terminals/:terminalId/hardware` - Update hardware config (printers, scanners, scales, etc.)
   - `POST /terminals/:terminalId/hardware/test-printer` - Test printer connection
   - `PUT /terminals/:terminalId/sales-controls` - Update sales controls
   - `PUT /terminals/:terminalId/invoice-controls` - Update invoice controls

3. **Health & Monitoring:**
   - `GET /terminals/:terminalId/health` - Terminal health status
   - `POST /terminals/:terminalId/hardware-faults` - Log hardware faults
   - `PUT /terminals/:terminalId/hardware-faults/:faultId` - Resolve faults
   - `PUT /terminals/:terminalId/connectivity` - Update connectivity status

4. **Invoice Management:**
   - `GET /terminals/:terminalId/next-invoice-number` - Get next invoice number

---

### C. Terminal Controllers

**Location:** `d:\NEXIS-ERP\server\modules\settings\controllers/terminalManagementController.js`

**Key Controller Functions:**
- `createTerminal()` - Create new terminal configuration
- `getStoreterminals()` - Fetch all terminals for a store
- `getTerminalById()` - Get specific terminal
- `updateTerminalConfig()` - Update entire terminal configuration
- `updateHardwareConfig()` - Update hardware configuration
- `updatePrintingFormats()` - Update printing format configuration
- `updateSalesControls()` - Update sales controls
- `updateInvoiceControls()` - Update invoice controls
- `getNextInvoiceNumber()` - Auto-generate next invoice number
- `testPrinterConnection()` - Test printer connectivity
- `updateTerminalStatus()` - Update terminal status
- `updateConnectivityStatus()` - Update connectivity status
- `getTerminalHealth()` - Get terminal health status
- `logHardwareFault()` - Log hardware faults
- `resolveHardwareFault()` - Resolve hardware faults

---

### D. Terminal Frontend Components

#### ✅ StoreSettings.jsx
**Location:** `d:\NEXIS-ERP\client\src\components\settings\general\StoreSettings.jsx`

**Functionality:**
- Terminal management UI (tabbed interface)
- Terminal list display with edit/delete options
- Printer configuration section
- Sales controls configuration
- Barcode format settings
- Invoice number format configuration
- Weight scale settings

**Key State Variables:**
- `terminals[]` - Array of terminal configurations
- `loadingTerminals` - Loading state
- `showTerminalModal` - Modal visibility
- `editingTerminal` - Currently edited terminal
- `activeTerminalIndex` - Currently active terminal

**API Calls:**
- `GET ${API_URL}/settings/store` - Fetch store settings
- `GET ${API_URL}/terminals/store/${storeId}` - Fetch terminals

---

#### ✅ TerminalFormModal.jsx
**Location:** `d:\NEXIS-ERP\client\src\components\settings\general\TerminalFormModal.jsx`

**Purpose:** Modal form for creating/editing terminals

**Fields:**
- `terminalId` - Unique identifier
- `terminalName` - Display name
- `invoiceNumberPrefix` - Invoice prefix
- `invoiceFormat` - Format selection (STANDARD, THERMAL, THERMAL80, A4)

**Features:**
- Responsive modal with sticky header
- Scrollable content area
- Form validation
- Height stabilization for different screen sizes

---

## 2. DOCUMENT FORMAT STRUCTURES

### A. Sales/Transaction Documents

The system supports multiple document types with dedicated models and routes:

#### ✅ Quotation
**Model Location:** `d:\NEXIS-ERP\server\Models\Sales\Quotation.js`
**Routes Location:** `d:\NEXIS-ERP\server\modules\sales\routes\quotationRoutes.js`

**Key Fields:**
- `quotationNumber` (unique)
- `financialYear`
- `date`, `expiryDate`
- `paymentType`: enum: ['Cash', 'Credit', 'Bank']
- `paymentTerms`
- **Customer Info:** customerId, customerName, customerPhone, customerTRN, customerAddress, customerContact
- **Financial Summary:**
  - `subtotal`, `discountPercentage`, `discountAmount`, `totalAfterDiscount`
  - `vatPercentage`, `vatAmount`, `totalIncludeVat`
- **Profitability Analysis:**
  - `totalCost`, `grossProfit`, `grossProfitMargin`
  - `netProfit`, `netProfitMargin`
- **Line Items:** Array with itemName, itemcode, productId, quantity, unitPrice, lineAmount, etc.
- `notes`, `terms`
- `status`: enum: ['Draft', 'Sent', 'Accepted', 'Rejected', 'Expired', 'Converted']

**API Routes:**
- `GET /nextQuotationNumber` - Get next quotation number
- `POST /createQuotation` - Create quotation
- `GET /getQuotations` - List all quotations
- `GET /getQuotationById/:id` - Get specific quotation
- `PUT /updateQuotation/:id` - Update quotation
- `PUT /updateStatus/:id` - Update status
- `DELETE /deleteQuotation/:id` - Delete quotation

**Frontend Component:** `d:\NEXIS-ERP\client\src\components\sales\Quotation.jsx`

---

#### ✅ Sales Order
**Model Location:** `d:\NEXIS-ERP\server\Models\Sales\SalesOrder.js`
**Routes Location:** `d:\NEXIS-ERP\server\modules\sales\routes\salesOrderRoutes.js`

**Key Fields:**
- `orderNumber` (unique)
- `financialYear`
- `date`, `deliveryDate`
- `paymentType`, `paymentTerms`
- **Customer Info:** Similar to Quotation
- **Financial Summary:** Same structure as Quotation
- **Profitability Analysis:** Included
- **Status:** enum: ['Draft', 'Confirmed', 'Processing', 'Shipped', 'Delivered', 'Cancelled']
- **Reference:** `quotationId` (link to quotation)
- **Line Items:** Similar structure with item details

**API Routes:**
- `GET /nextOrderNumber` - Get next order number
- `POST /createSalesOrder` - Create order
- `GET /getSalesOrders` - List all orders
- `GET /getSalesOrderById/:id` - Get specific order
- `PUT /updateSalesOrder/:id` - Update order
- `PUT /updateStatus/:id` - Update status
- `DELETE /deleteSalesOrder/:id` - Delete order

**Frontend Component:** `d:\NEXIS-ERP\client\src\components\sales\SalesOrder.jsx`

---

#### ✅ Delivery Note
**Model Location:** `d:\NEXIS-ERP\server\Models\Sales\DeliveryNote.js`
**Routes Location:** `d:\NEXIS-ERP\server\modules\sales\routes\deliveryNoteRoutes.js`

**Key Fields:**
- `deliveryNoteNumber` (unique)
- `financialYear`
- `salesOrderId` (ref: SalesOrder) - Required
- `salesInvoiceId` (ref: SalesInvoice)
- `date`, `deliveryDate`
- **Delivery Details:**
  - `vehicleNumber`, `driverName`, `driverPhone`
  - `sealNumber`, `receivedBy`, `deliveredTo`
- **Items with Tracking:**
  - `orderedQuantity`, `deliveredQuantity`
  - `unitPrice`, `lineAmount`
  - `discountPercentage`, `discountAmount`
  - `batchNumber`, `expiryDate`
  - `serialNumbers[]`, `note`, `remark`
- **Financial Summary:** Similar to other documents
- **Status:** enum: ['Draft', 'Partial', 'Delivered', 'Returned', 'Cancelled']
- **Tracking:** `deliveryReference`, `courierName`, `trackingNumber`
- `notes`, `remarks`, `terms`

**Collection Name:** `delivery_notes`

**API Routes:**
- `GET /nextDeliveryNoteNumber` - Get next delivery note number
- `POST /createDeliveryNote` - Create delivery note
- `GET /getDeliveryNotes` - List all delivery notes
- `GET /getDeliveryNoteById/:id` - Get specific delivery note
- `PUT /updateDeliveryNote/:id` - Update delivery note
- `PUT /updateStatus/:id` - Update status
- `DELETE /deleteDeliveryNote/:id` - Delete delivery note

**Frontend Component:** `d:\NEXIS-ERP\client\src\components\sales\DeliveryNote.jsx`

---

#### ✅ Sales Invoice
**Routes Location:** `d:\NEXIS-ERP\server\modules\sales\routes\salesInvoiceRoutes.js`
**Frontend:** `d:\NEXIS-ERP\client\src\components\sales\SalesInvoice.jsx`

---

#### ✅ Sales Return
**Routes Location:** `d:\NEXIS-ERP\server\modules\sales\routes\salesReturnRoutes.js`
**Frontend:** `d:\NEXIS-ERP\client\src\components\sales\SalesReturn.jsx`

---

### B. Invoice Template System

#### ✅ InvoiceTemplate Model
**Location:** `d:\NEXIS-ERP\server\Models\InvoiceTemplate.js`

**Purpose:** Stores customizable invoice/document templates

**Key Fields:**
- `templateName` (unique): e.g., 'Invoice_EN_with_Logo'
- `language`: enum: ['EN', 'AR']
- `templateType`: enum: ['INVOICE', 'GRN', 'RTV', 'DELIVERY_NOTE']
- `includeLogo`: Boolean (default: true)
- **Custom Design:**
  - `headerColor` (default: '#1e40af')
  - `bodyFont` (default: 'Arial')
  - `showSerialNumbers`, `showQrCode`, `showBarcode`
  - `currency` (default: 'AED')
  - `pageSize`: enum: ['A4', 'A5', 'LETTER']
  - `margins`: { top, bottom, left, right }
- `htmlContent` (required): Template HTML with Handlebars syntax
- `cssContent`: Template CSS styling
- `companyId` (ref: CompanySettings)
- `description`
- `isActive`, `isDefault`
- Timestamps: `createdAt`, `updatedAt`, `createdBy`, `updatedBy`

**API Routes:** 
- `GET /templates` - List templates
- `POST /templates` - Create template
- `PUT /templates/:id` - Update template
- `DELETE /templates/:id` - Delete template

---

#### ✅ InvoiceTemplateForm Component
**Location:** `d:\NEXIS-ERP\client\src\components\settings\general\InvoiceTemplateForm.jsx`

**Functionality:**
- Multi-tab form interface (Basic, Design, Content)
- Preview functionality
- Template type selection (INVOICE, GRN, RTV, DELIVERY_NOTE)
- Language selection (EN, AR)
- Custom design options:
  - Header color picker
  - Font selection
  - Page size configuration
  - Margin adjustment
- HTML content editor
- CSS editor
- Logo upload support
- QR code and barcode toggle options

**Tab Organization:**
1. **Basic Tab:** Template name, type, language, description
2. **Design Tab:** Colors, fonts, page size, margins, logo, QR code, barcode
3. **Content Tab:** HTML template editor with Handlebars syntax support

---

## 3. HARDWARE/PRINTER CONFIGURATIONS

### A. Printer Configuration Model

#### ✅ PrinterConfiguration.js
**Location:** `d:\NEXIS-ERP\server\Models\PrinterConfiguration.js`

**Purpose:** Store printer configurations for different printer models

**Key Fields:**
- `name` (unique): e.g., 'TSC_50MM_PRICE_TAG'
- `configTxt` (required): Raw printer command template with placeholders like {ITEM_NAME}, {BARCODE}, {PRICE}
- `legends` (required): Display name for UI
- `description`: Human-readable description
- `printerModel`: enum: ['TSC', 'ZEBRA', 'BROTHER', 'DYMO', 'EPSON', 'CUSTOM']
- `labelWidth` (default: 38): Width in MM
- `labelHeight` (default: 25): Height in MM
- `variables[]`: Array of placeholder variables used in template (e.g., ['ITEM_NAME', 'BARCODE', 'DECIMAL_ITEM_PRICE', 'LABEL_QUANTITY'])
- `isActive` (default: true)
- `companyId` (ref: Company)
- `deleted` (default: false)
- `createdBy`, `updatedBy`
- Timestamps: `createdAt`, `updatedAt`

**Collection Name:** `printer_configurations`

**Indexes:**
- `{ name: 1, deleted: 0 }`
- `{ isActive: 1, deleted: 0 }`
- `{ companyId: 1, deleted: 0 }`

**Sample Configurations Include:**
- TSC Printer: 38x25mm Labels
- ZEBRA Printer: 100x50mm Labels
- BROTHER Printer: Standard labels

---

### B. Printer Configuration Management UI

#### ✅ PrinterConfigurationManagement.jsx
**Location:** `d:\NEXIS-ERP\client\src\components\settings\general\PrinterConfigurationManagement.jsx`

**Functionality:**
- Display list of printer configurations
- Add new printer configuration
- Edit existing configurations
- Delete configurations (with confirmation)
- Toggle printer configuration active/inactive status
- Fetch configurations on component mount

**API Endpoints Used:**
- `GET ${API_URL}/settings/printer-configurations` - List all configurations
- `POST ${API_URL}/settings/printer-configurations` - Create configuration
- `PUT ${API_URL}/api/v1/settings/printer-configurations/:id` - Update configuration
- `DELETE ${API_URL}/settings/printer-configurations/:id` - Delete configuration

**UI Components:**
- Configuration table with columns: Name, Model, Label Size, Status, Actions
- Add button with Plus icon
- Edit button with Edit2 icon
- Delete button with Trash2 icon
- Copy button with Copy icon
- Power toggle for active/inactive status

---

#### ✅ PrinterConfigurationForm Component
**Location:** `d:\NEXIS-ERP\client\src\components\settings\general\PrinterConfigurationForm.jsx`

**Fields:**
- Configuration name
- Printer model selection
- Label dimensions (width, height)
- Template command text (raw printer commands)
- Variable placeholders
- Status toggle (active/inactive)

---

### C. Store-Level Hardware Configuration

#### ✅ StoreSettings.jsx - Hardware Section
**Location:** `d:\NEXIS-ERP\client\src\components\settings\general\StoreSettings.jsx`

**Hardware Configuration Fields:**

1. **Printer Configuration:**
   - Printer model selection
   - Printer port selection (default: COM1)
   - Barcode format selection (EAN13, etc.)

2. **Weight Scale Settings:**
   - Scale prefix (default: '2')
   - Enable/disable weight scale
   - Default weight unit (KG)
   - Pricing model (weight-based)
   - Barcode measurement configuration:
     - Enable weight embedding
     - Max/min weight
     - Precision decimal places
     - Weight position in barcode
     - Weight digit count
   - Scale device configuration:
     - Device type selection (manual, serial, USB, network)
     - Serial port settings (port, baud rate)
     - USB configuration (vendor ID, product ID)
     - Network settings (address, port)
   - Auto-sync weight toggle
   - Scale alerts toggle

**API Integration:**
- All hardware settings are part of the Store Settings API
- `GET /settings/store` - Fetch store including hardware settings
- `POST /settings/store` - Update store including hardware settings

---

### D. Terminal Hardware Integration

**Terminal Hardware Fields (via TerminalManagement):**
- Hardware testing endpoints for printers
- Hardware fault logging and resolution
- Connectivity status monitoring
- Support for multiple hardware device types

---

## 4. SETTINGS/TERMINAL MANAGEMENT PAGES STRUCTURE

### A. Settings Component Architecture

#### ✅ Main Settings Page Route
**Location:** `d:\NEXIS-ERP\client\src\components/settings/general/`

**Available Settings Modules:**
1. **StoreSettings.jsx** - Store information, printer, hardware, sales controls
2. **InvoiceTemplateForm.jsx** - Invoice template configuration
3. **PrinterConfigurationManagement.jsx** - Printer configuration management
4. **TerminalFormModal.jsx** - Terminal creation/editing
5. **BarcodeTemplateForm.jsx** - Barcode template configuration
6. **ProductNamingSettings.jsx** - Product naming conventions
7. **UnitTypeManagement.jsx** - Unit type configuration
8. **RoleManagement.jsx** - Role and permission management
9. **UserManagement.jsx** - User management
10. **ActivityLog.jsx** - Activity logging and audit trails

---

### B. Terminal Management UI Flow

**Tab Structure in StoreSettings:**

```
Active Tab: activeTab = 'store-details' | 'terminals' | 'pricing' | 'other'
```

**Terminal Tab:**
1. **List View:**
   - Table showing all terminals for store
   - Columns: Terminal ID, Terminal Name, Status, Invoice Format, Actions
   - Edit button opens TerminalFormModal
   - Delete button with confirmation

2. **Add Terminal:**
   - Plus button opens TerminalFormModal
   - Modal for form entry

3. **Terminal Modal (TerminalFormModal):**
   - Terminal Information section:
     - Terminal ID (required)
     - Terminal Name (required)
   - Invoice Configuration:
     - Invoice Number Prefix
     - Invoice Format (STANDARD, THERMAL, THERMAL80, A4)
   - Additional fields as needed

---

### C. Settings API Routes Structure

#### ✅ API Routes Organization
**Base Path:** `/api/v1/settings` or `/settings`

**Terminal Management Routes:**
```
/terminals
  POST /create
  GET /store/:storeId
  GET /:terminalId
  PUT /:terminalId
  DELETE /:terminalId
  PUT /:terminalId/hardware
  POST /:terminalId/hardware/test-printer
  PUT /:terminalId/sales-controls
  PUT /:terminalId/invoice-controls
  GET /:terminalId/health
  POST /:terminalId/hardware-faults
  PUT /:terminalId/hardware-faults/:faultId
  PUT /:terminalId/connectivity
```

**Printer Configuration Routes:**
```
/settings/printer-configurations
  GET /
  POST /
  PUT /:id
  DELETE /:id
```

**Store Settings Routes:**
```
/settings/store
  GET /
  POST /
```

**Invoice Template Routes:**
```
/api/v1/invoice-templates
  GET /
  POST /
  PUT /:id
  DELETE /:id
```

---

### D. Data Flow Architecture

```
React Component (Frontend)
    ↓
State Management (useState, useEffect)
    ↓
API Call (axios)
    ↓
API Route (Express Router)
    ↓
Controller Function
    ↓
Mongoose Model
    ↓
MongoDB Collection
    ↓
Response (JSON)
    ↓
Frontend State Update
    ↓
Component Re-render
```

---

## 5. KEY INTEGRATION POINTS

### A. Terminal-to-Invoice Flow
1. Store creates terminal via StoreSettings
2. Terminal configured with invoice format (STANDARD, THERMAL, THERMAL80, A4)
3. Terminal gets invoice number prefix
4. When sales invoice is created, it uses terminal's invoice format
5. Printer uses PrinterConfiguration based on terminal settings

### B. Document Type System
```
Quotation → Sales Order → Delivery Note → Sales Invoice
```

Each document:
- Has auto-generated numbering (stored in SequenceModel)
- Tracks financial data (subtotal, discount, VAT, totals)
- Can be customized via templates
- Links to customers and products
- Supports status workflows

### C. Hardware Integration Flow
1. Terminal configured with hardware settings
2. PrinterConfiguration stores printer-specific commands
3. BarcodeTemplate uses PrinterConfiguration for label printing
4. Weight scale configuration supports barcode embedding

---

## 6. EXISTING CONTROLLERS & SERVICES

### A. Terminal Management Controller
**Location:** `d:\NEXIS-ERP\server\modules\settings\controllers/terminalManagementController.js`

**15+ functions** covering:
- Terminal CRUD operations
- Hardware configuration management
- Printing format management
- Sales control updates
- Invoice control updates
- Next invoice number generation
- Printer connection testing
- Terminal health monitoring
- Hardware fault logging and resolution
- Connectivity status updates

### B. Quotation Controller
**Location:** `d:\NEXIS-ERP\server\modules\sales\controllers/quotationController.js`

**Functions:**
- Auto-generate quotation numbers
- Create quotations
- List and filter quotations
- Get specific quotation with populated references
- Update quotations
- Soft delete quotations
- Update quotation status with validation

### C. Sales Order Controller
**Location:** `d:\NEXIS-ERP\server\modules\sales\controllers/salesOrderController.js`

**Similar structure to quotation controller**

---

## 7. FRONTEND HOOKS & UTILITIES

### A. Product Search Hook
**Location:** `d:\NEXIS-ERP\client\src\hooks/useProductSearch.js`

- Centralized product search with Meilisearch
- Fallback to database search
- Configurable debounce and pagination

### B. Tax Master Hook
**Location:** `d:\NEXIS-ERP\client\src\hooks/useTaxMaster.js`

- Access to company data
- Country-based filtering support

### C. Decimal Format Hook
**Location:** `d:\NEXIS-ERP\client\src\hooks/useDecimalFormat.js`

- Decimal formatting utilities
- Country-specific decimal handling

---

## 8. SUGGESTED DOCUMENT FORMAT ARCHITECTURE

Based on existing patterns, here's the recommended structure for document format customization:

```
DocumentFormat
├── FormatTemplate
│   ├── Base Template (HTML/CSS)
│   ├── Variables (mappings)
│   └── Styling (colors, fonts, margins)
├── PrinterIntegration
│   ├── Select Printer Configuration
│   ├── Select Label Size
│   └── Preview
└── TerminalBinding
    ├── Assign to Terminal
    └── Set as Default
```

---

## SUMMARY TABLE

| Component | Type | Location | Purpose |
|-----------|------|----------|---------|
| TerminalManagement | Model | server/Models/ | Terminal configuration storage |
| PrinterConfiguration | Model | server/Models/ | Printer command templates |
| InvoiceTemplate | Model | server/Models/ | Document templates |
| Quotation | Model | server/Models/Sales/ | Quotation documents |
| SalesOrder | Model | server/Models/Sales/ | Sales order documents |
| DeliveryNote | Model | server/Models/Sales/ | Delivery note documents |
| terminalManagementRoutes | Routes | server/modules/settings/routes/ | Terminal API endpoints |
| StoreSettings | Component | client/src/components/settings/ | Store configuration UI |
| TerminalFormModal | Component | client/src/components/settings/ | Terminal form modal |
| PrinterConfigurationManagement | Component | client/src/components/settings/ | Printer config UI |
| InvoiceTemplateForm | Component | client/src/components/settings/ | Template configuration UI |
| Quotation | Component | client/src/components/sales/ | Quotation entry UI |
| SalesOrder | Component | client/src/components/sales/ | Sales order entry UI |
| DeliveryNote | Component | client/src/components/sales/ | Delivery note entry UI |

---

## KEY OBSERVATIONS

✅ **Strengths:**
1. Terminal management already has comprehensive structure
2. Printer configurations system is extensible
3. Document types (Quotation, SalesOrder, DeliveryNote) follow consistent patterns
4. Template system supports multiple document types
5. Hardware integration framework exists
6. Country isolation and decimal formatting support built-in

⚠️ **Areas for Enhancement:**
1. Document format customization per terminal needs expansion
2. Hardware device variety support can be extended
3. Print format templates could be more flexible
4. Terminal health monitoring could include more metrics

---

**Document Generated:** April 18, 2026
**Status:** Comprehensive search complete
**Total Files Analyzed:** 50+ files across models, routes, controllers, and components
