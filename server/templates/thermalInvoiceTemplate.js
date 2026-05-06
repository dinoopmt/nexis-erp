/**
 * Thermal Invoice Template for Supermarket POS
 * 
 * Optimized for:
 * - Thermal receipt printers (58mm, 80mm width)
 * - Supermarket/retail checkout receipts
 * - Single page thermal format
 * - No logo or complex formatting
 * - Compact and fast printing
 */

export const THERMAL_INVOICE_TEMPLATE_EN_58MM = {
  templateName: 'Thermal_Receipt_58mm_EN',
  language: 'EN',
  templateType: 'INVOICE',
  includeLogo: false,
  customDesign: {
    headerColor: '#000000',
    bodyFont: 'Courier New',
    showSerialNumbers: false,
    showQrCode: true,
    showBarcode: false,
    currency: 'AED',
    pageSize: 'A5', // Thermal receipt size
    margins: { top: 2, bottom: 2, left: 2, right: 2 }
  },
  htmlContent: `
    <div class="thermal-receipt-container">
      <style>
        .thermal-receipt-container {
          width: 58mm;
          font-family: 'Courier New', monospace;
          font-size: 11px;
          line-height: 1.3;
          color: #000;
          background: #fff;
          padding: 2mm;
          margin: 0;
        }
        
        .receipt-header {
          text-align: center;
          border-bottom: 1px dashed #000;
          padding-bottom: 4mm;
          margin-bottom: 3mm;
        }
        
        .store-name {
          font-size: 13px;
          font-weight: bold;
          margin: 0 0 2mm 0;
        }
        
        .store-address {
          font-size: 9px;
          line-height: 1.2;
          margin: 1mm 0;
        }
        
        .receipt-info {
          font-size: 10px;
          margin: 1mm 0;
          text-align: center;
        }
        
        .receipt-date-time {
          font-size: 9px;
          margin: 1mm 0;
        }
        
        .items-section {
          margin: 3mm 0;
          border-bottom: 1px dashed #000;
          padding-bottom: 2mm;
        }
        
        .items-header {
          display: flex;
          justify-content: space-between;
          font-weight: bold;
          font-size: 10px;
          border-bottom: 1px solid #000;
          padding-bottom: 1mm;
          margin-bottom: 1mm;
        }
        
        .item-row {
          display: flex;
          justify-content: space-between;
          font-size: 10px;
          margin: 0.5mm 0;
          line-height: 1.2;
        }
        
        .item-name {
          flex: 1;
          word-wrap: break-word;
          word-break: break-word;
          max-width: 30mm;
        }
        
        .item-details {
          font-size: 9px;
          color: #333;
          margin-left: 1mm;
        }
        
        .item-qty-price {
          display: flex;
          justify-content: flex-end;
          gap: 2mm;
          min-width: 15mm;
          text-align: right;
        }
        
        .totals-section {
          margin: 2mm 0;
          border-top: 1px dashed #000;
          border-bottom: 1px dashed #000;
          padding: 2mm 0;
        }
        
        .total-row {
          display: flex;
          justify-content: space-between;
          font-size: 10px;
          margin: 1mm 0;
        }
        
        .total-label {
          font-weight: normal;
        }
        
        .total-value {
          text-align: right;
          min-width: 12mm;
        }
        
        .grand-total-row {
          display: flex;
          justify-content: space-between;
          font-weight: bold;
          font-size: 11px;
          margin: 1mm 0;
        }
        
        .grand-total-value {
          text-align: right;
          min-width: 12mm;
        }
        
        .payment-section {
          margin: 2mm 0;
          padding: 2mm 0;
          border-bottom: 1px dashed #000;
        }
        
        .payment-method {
          display: flex;
          justify-content: space-between;
          font-size: 10px;
          margin: 1mm 0;
        }
        
        .payment-label {
          font-weight: normal;
        }
        
        .payment-value {
          text-align: right;
        }
        
        .receipt-footer {
          text-align: center;
          margin-top: 2mm;
          font-size: 9px;
        }
        
        .receipt-message {
          font-size: 9px;
          margin: 1mm 0;
          text-align: center;
        }
        
        .qr-code-section {
          text-align: center;
          margin: 2mm 0;
          border-top: 1px dashed #000;
          padding-top: 2mm;
        }
        
        .qr-code-section img {
          width: 25mm;
          height: 25mm;
        }
        
        .transaction-id {
          font-size: 8px;
          text-align: center;
          margin-top: 1mm;
          word-wrap: break-word;
        }
        
        .divider {
          border-top: 1px dashed #000;
          margin: 1mm 0;
        }
      </style>

      <!-- RECEIPT HEADER -->
      <div class="receipt-header">
        <div class="store-name">{{@root.store.storeName}}</div>
        {{#if @root.store.address1}}
        <div class="store-address">
          {{@root.store.address1}}
          {{#if @root.store.address2}}<br/>{{@root.store.address2}}{{/if}}
        </div>
        {{/if}}
        {{#if @root.company.phone}}
        <div class="store-address">Ph: {{@root.company.phone}}</div>
        {{/if}}
        
        <div class="receipt-info">
          Receipt # {{@root.invoice.invoiceNumber}}
        </div>
        <div class="receipt-date-time">
          {{date @root.invoice.date 'DD/MM/YYYY HH:mm'}}
        </div>
      </div>

      <!-- CASHIER/TERMINAL INFO (Optional) -->
      {{#if @root.invoice.terminalName}}
      <div class="receipt-info" style="font-size: 9px;">
        Terminal: {{@root.invoice.terminalName}}
      </div>
      {{/if}}
      <div class="divider"></div>

      <!-- ITEMS TABLE -->
      <div class="items-section">
        <div class="items-header">
          <div style="flex: 1;">Item</div>
          <div style="min-width: 8mm; text-align: center;">Qty</div>
          <div style="min-width: 12mm; text-align: right;">Amount</div>
        </div>

        {{#items}}
        <div class="item-row">
          <div class="item-name">{{itemName}}</div>
          <div style="min-width: 8mm; text-align: center;">{{quantity}}</div>
          <div style="min-width: 12mm; text-align: right;">{{formatNumber total 2}}</div>
        </div>
        {{#if itemCode}}
        <div class="item-details">
          Code: {{itemCode}}{{#if unitPrice}} @ {{formatNumber unitPrice 2}}/unit{{/if}}
        </div>
        {{/if}}
        {{/items}}
      </div>

      <!-- TOTALS SECTION -->
      <div class="totals-section">
        {{#if @root.invoice.subtotal}}
        <div class="total-row">
          <div class="total-label">Subtotal:</div>
          <div class="total-value">{{formatNumber @root.invoice.subtotal 2}}</div>
        </div>
        {{/if}}

        {{#if @root.invoice.discountAmount}}
        <div class="total-row">
          <div class="total-label">Discount:</div>
          <div class="total-value">-{{formatNumber @root.invoice.discountAmount 2}}</div>
        </div>
        {{/if}}

        {{#if @root.invoice.vatAmount}}
        <div class="total-row">
          <div class="total-label">Tax ({{@root.invoice.vatPercentage}}%):</div>
          <div class="total-value">{{formatNumber @root.invoice.vatAmount 2}}</div>
        </div>
        {{/if}}

        <div class="grand-total-row">
          <div class="total-label">TOTAL:</div>
          <div class="grand-total-value">{{formatNumber @root.invoice.totalIncludeVat 2}}</div>
        </div>
      </div>

      <!-- PAYMENT METHOD -->
      <div class="payment-section">
        <div class="payment-method">
          <div class="payment-label">Payment:</div>
          <div class="payment-value">{{@root.invoice.paymentType}}</div>
        </div>
        {{#if @root.invoice.amountPaid}}
        <div class="payment-method">
          <div class="payment-label">Paid:</div>
          <div class="payment-value">{{formatNumber @root.invoice.amountPaid 2}}</div>
        </div>
        {{/if}}
        {{#if @root.invoice.changeAmount}}
        <div class="payment-method">
          <div class="payment-label">Change:</div>
          <div class="payment-value">{{formatNumber @root.invoice.changeAmount 2}}</div>
        </div>
        {{/if}}
      </div>

      <!-- CUSTOMER DISPLAY (Optional) -->
      {{#if @root.invoice.customerName}}
      <div class="receipt-info" style="font-size: 9px; border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 1mm 0;">
        Customer: {{@root.invoice.customerName}}
      </div>
      {{/if}}

      <!-- QR CODE (if enabled) -->
      {{#if @root.invoice.qrCode}}
      <div class="qr-code-section">
        <img src="data:image/png;base64,{{@root.invoice.qrCode}}" alt="QR Code">
        <div class="transaction-id">ID: {{@root.invoice.invoiceNumber}}</div>
      </div>
      {{/if}}

      <!-- FOOTER MESSAGE -->
      <div class="receipt-footer">
        <div class="receipt-message">Thank you for your purchase!</div>
        <div class="receipt-message">Please visit again</div>
      </div>
    </div>
  `,
  cssContent: `
    body {
      margin: 0;
      padding: 0;
    }
    
    .thermal-receipt-container {
      width: 58mm;
      font-family: 'Courier New', monospace;
      line-height: 1.3;
    }
  `,
  description: 'Thermal receipt template optimized for 58mm supermarket POS thermal printers. Single-page narrow format.',
  isActive: true,
  isDefault: false,
  createdBy: 'SYSTEM',
};

export const THERMAL_INVOICE_TEMPLATE_AR_58MM = {
  templateName: 'Thermal_Receipt_58mm_AR',
  language: 'AR',
  templateType: 'INVOICE',
  includeLogo: false,
  customDesign: {
    headerColor: '#000000',
    bodyFont: 'Arial',
    showSerialNumbers: false,
    showQrCode: true,
    showBarcode: false,
    currency: 'AED',
    pageSize: 'A5',
    margins: { top: 2, bottom: 2, left: 2, right: 2 }
  },
  htmlContent: `
    <div class="thermal-receipt-container" dir="rtl">
      <style>
        .thermal-receipt-container {
          width: 58mm;
          font-family: Arial, sans-serif;
          font-size: 11px;
          line-height: 1.3;
          color: #000;
          background: #fff;
          padding: 2mm;
          margin: 0;
          text-align: right;
        }
        
        .receipt-header {
          text-align: center;
          border-bottom: 1px dashed #000;
          padding-bottom: 4mm;
          margin-bottom: 3mm;
        }
        
        .store-name {
          font-size: 13px;
          font-weight: bold;
          margin: 0 0 2mm 0;
        }
        
        .store-address {
          font-size: 9px;
          line-height: 1.2;
          margin: 1mm 0;
        }
        
        .receipt-info {
          font-size: 10px;
          margin: 1mm 0;
          text-align: center;
        }
        
        .items-section {
          margin: 3mm 0;
          border-bottom: 1px dashed #000;
          padding-bottom: 2mm;
        }
        
        .items-header {
          display: flex;
          justify-content: space-between;
          font-weight: bold;
          font-size: 10px;
          border-bottom: 1px solid #000;
          padding-bottom: 1mm;
          margin-bottom: 1mm;
        }
        
        .item-row {
          display: flex;
          justify-content: space-between;
          font-size: 10px;
          margin: 0.5mm 0;
          line-height: 1.2;
        }
        
        .item-name {
          flex: 1;
          word-wrap: break-word;
          word-break: break-word;
          max-width: 30mm;
        }
        
        .totals-section {
          margin: 2mm 0;
          border-top: 1px dashed #000;
          border-bottom: 1px dashed #000;
          padding: 2mm 0;
        }
        
        .total-row {
          display: flex;
          justify-content: space-between;
          font-size: 10px;
          margin: 1mm 0;
        }
        
        .grand-total-row {
          display: flex;
          justify-content: space-between;
          font-weight: bold;
          font-size: 11px;
          margin: 1mm 0;
        }
        
        .receipt-footer {
          text-align: center;
          margin-top: 2mm;
          font-size: 9px;
        }
        
        .divider {
          border-top: 1px dashed #000;
          margin: 1mm 0;
        }
      </style>

      <!-- RECEIPT HEADER -->
      <div class="receipt-header">
        <div class="store-name">{{@root.store.storeName}}</div>
        {{#if @root.store.address1}}
        <div class="store-address">
          {{@root.store.address1}}
          {{#if @root.store.address2}}<br/>{{@root.store.address2}}{{/if}}
        </div>
        {{/if}}
        
        <div class="receipt-info">
          الإيصال # {{@root.invoice.invoiceNumber}}
        </div>
        <div class="receipt-info" style="font-size: 9px;">
          {{date @root.invoice.date 'DD/MM/YYYY HH:mm'}}
        </div>
      </div>

      <div class="divider"></div>

      <!-- ITEMS TABLE -->
      <div class="items-section">
        <div class="items-header">
          <div style="min-width: 12mm; text-align: left;">المبلغ</div>
          <div style="min-width: 8mm; text-align: center;">الكمية</div>
          <div style="flex: 1;">الصنف</div>
        </div>

        {{#items}}
        <div class="item-row">
          <div style="min-width: 12mm; text-align: left;">{{formatNumber total 2}}</div>
          <div style="min-width: 8mm; text-align: center;">{{quantity}}</div>
          <div class="item-name">{{itemName}}</div>
        </div>
        {{/items}}
      </div>

      <!-- TOTALS SECTION -->
      <div class="totals-section">
        {{#if @root.invoice.subtotal}}
        <div class="total-row">
          <div>{{formatNumber @root.invoice.subtotal 2}}</div>
          <div>الإجمالي الجزئي:</div>
        </div>
        {{/if}}

        {{#if @root.invoice.discountAmount}}
        <div class="total-row">
          <div>-{{formatNumber @root.invoice.discountAmount 2}}</div>
          <div>الخصم:</div>
        </div>
        {{/if}}

        {{#if @root.invoice.vatAmount}}
        <div class="total-row">
          <div>{{formatNumber @root.invoice.vatAmount 2}}</div>
          <div>الضريبة ({{@root.invoice.vatPercentage}}%):</div>
        </div>
        {{/if}}

        <div class="grand-total-row">
          <div style="text-align: left;">{{formatNumber @root.invoice.totalIncludeVat 2}}</div>
          <div>الإجمالي:</div>
        </div>
      </div>

      <!-- PAYMENT METHOD -->
      <div class="totals-section" style="border-bottom: 1px dashed #000;">
        <div class="total-row">
          <div>{{@root.invoice.paymentType}}</div>
          <div>طريقة الدفع:</div>
        </div>
      </div>

      <!-- FOOTER MESSAGE -->
      <div class="receipt-footer">
        <div>شكراً لتسوقك معنا</div>
        <div>يرجى زيارتنا مرة أخرى</div>
      </div>
    </div>
  `,
  cssContent: `
    body {
      margin: 0;
      padding: 0;
    }
    
    .thermal-receipt-container {
      width: 58mm;
      font-family: Arial, sans-serif;
      line-height: 1.3;
    }
  `,
  description: 'قالب إيصال حراري مُحسّن لطابعات POS الحرارية الخاصة بالمتاجر الكبرى (58 ملم). صيغة ضيقة لورقة حرارية.',
  isActive: true,
  isDefault: false,
  createdBy: 'SYSTEM',
};

// ============================================
// 80MM THERMAL INVOICE TEMPLATES
// ============================================

export const THERMAL_INVOICE_TEMPLATE_EN_80MM = {
  templateName: 'Thermal_Receipt_80mm_EN',
  language: 'EN',
  templateType: 'INVOICE',
  includeLogo: false,
  customDesign: {
    headerColor: '#000000',
    bodyFont: 'Courier New',
    showSerialNumbers: false,
    showQrCode: true,
    showBarcode: false,
    currency: 'AED',
    pageSize: 'A5',
    margins: { top: 2, bottom: 2, left: 2, right: 2 }
  },
  htmlContent: `
    <div class="thermal-receipt-container">
      <style>
        .thermal-receipt-container {
          width: 80mm;
          font-family: 'Courier New', monospace;
          font-size: 12px;
          line-height: 1.3;
          color: #000;
          background: #fff;
          padding: 3mm;
          margin: 0;
        }
        
        .receipt-header {
          text-align: center;
          border-bottom: 1px dashed #000;
          padding-bottom: 4mm;
          margin-bottom: 3mm;
        }
        
        .store-name {
          font-size: 14px;
          font-weight: bold;
          margin: 0 0 2mm 0;
        }
        
        .store-address {
          font-size: 10px;
          line-height: 1.2;
          margin: 1mm 0;
        }
        
        .receipt-info {
          font-size: 11px;
          margin: 1mm 0;
          text-align: center;
        }
        
        .items-section {
          margin: 3mm 0;
          border-bottom: 1px dashed #000;
          padding-bottom: 2mm;
        }
        
        .items-header {
          display: flex;
          justify-content: space-between;
          font-weight: bold;
          font-size: 11px;
          border-bottom: 1px solid #000;
          padding-bottom: 1mm;
          margin-bottom: 1mm;
        }
        
        .item-row {
          display: flex;
          justify-content: space-between;
          font-size: 11px;
          margin: 0.5mm 0;
          line-height: 1.2;
        }
        
        .item-name {
          flex: 1;
          word-wrap: break-word;
          word-break: break-word;
          max-width: 45mm;
        }
        
        .totals-section {
          margin: 2mm 0;
          border-top: 1px dashed #000;
          border-bottom: 1px dashed #000;
          padding: 2mm 0;
        }
        
        .total-row {
          display: flex;
          justify-content: space-between;
          font-size: 11px;
          margin: 1mm 0;
        }
        
        .grand-total-row {
          display: flex;
          justify-content: space-between;
          font-weight: bold;
          font-size: 12px;
          margin: 1mm 0;
        }
        
        .payment-section {
          margin: 2mm 0;
          padding: 2mm 0;
          border-bottom: 1px dashed #000;
        }
        
        .payment-method {
          display: flex;
          justify-content: space-between;
          font-size: 11px;
          margin: 1mm 0;
        }
        
        .receipt-footer {
          text-align: center;
          margin-top: 2mm;
          font-size: 10px;
        }
        
        .receipt-message {
          font-size: 10px;
          margin: 1mm 0;
          text-align: center;
        }
        
        .qr-code-section {
          text-align: center;
          margin: 2mm 0;
          border-top: 1px dashed #000;
          padding-top: 2mm;
        }
        
        .qr-code-section img {
          width: 30mm;
          height: 30mm;
        }
        
        .transaction-id {
          font-size: 9px;
          text-align: center;
          margin-top: 1mm;
          word-wrap: break-word;
        }
        
        .divider {
          border-top: 1px dashed #000;
          margin: 1mm 0;
        }
      </style>

      <!-- RECEIPT HEADER -->
      <div class="receipt-header">
        <div class="store-name">{{@root.store.storeName}}</div>
        {{#if @root.store.address1}}
        <div class="store-address">
          {{@root.store.address1}}
          {{#if @root.store.address2}}<br/>{{@root.store.address2}}{{/if}}
        </div>
        {{/if}}
        {{#if @root.company.phone}}
        <div class="store-address">Ph: {{@root.company.phone}}</div>
        {{/if}}
        
        <div class="receipt-info">
          Receipt # {{@root.invoice.invoiceNumber}}
        </div>
        <div class="receipt-info" style="font-size: 10px;">
          {{date @root.invoice.date 'DD/MM/YYYY HH:mm'}}
        </div>
      </div>

      <!-- CASHIER/TERMINAL INFO (Optional) -->
      {{#if @root.invoice.terminalName}}
      <div class="receipt-info" style="font-size: 10px;">
        Terminal: {{@root.invoice.terminalName}}
      </div>
      {{/if}}
      <div class="divider"></div>

      <!-- ITEMS TABLE -->
      <div class="items-section">
        <div class="items-header">
          <div style="flex: 1;">Item</div>
          <div style="min-width: 10mm; text-align: center;">Qty</div>
          <div style="min-width: 15mm; text-align: right;">Amount</div>
        </div>

        {{#items}}
        <div class="item-row">
          <div class="item-name">{{itemName}}</div>
          <div style="min-width: 10mm; text-align: center;">{{quantity}}</div>
          <div style="min-width: 15mm; text-align: right;">{{formatNumber total 2}}</div>
        </div>
        {{#if itemCode}}
        <div style="font-size: 10px; color: #333; margin-left: 1mm;">
          Code: {{itemCode}}{{#if unitPrice}} @ {{formatNumber unitPrice 2}}/unit{{/if}}
        </div>
        {{/if}}
        {{/items}}
      </div>

      <!-- TOTALS SECTION -->
      <div class="totals-section">
        {{#if @root.invoice.subtotal}}
        <div class="total-row">
          <div>Subtotal:</div>
          <div style="min-width: 15mm; text-align: right;">{{formatNumber @root.invoice.subtotal 2}}</div>
        </div>
        {{/if}}

        {{#if @root.invoice.discountAmount}}
        <div class="total-row">
          <div>Discount:</div>
          <div style="min-width: 15mm; text-align: right;">-{{formatNumber @root.invoice.discountAmount 2}}</div>
        </div>
        {{/if}}

        {{#if @root.invoice.vatAmount}}
        <div class="total-row">
          <div>Tax ({{@root.invoice.vatPercentage}}%):</div>
          <div style="min-width: 15mm; text-align: right;">{{formatNumber @root.invoice.vatAmount 2}}</div>
        </div>
        {{/if}}

        <div class="grand-total-row">
          <div>TOTAL:</div>
          <div style="min-width: 15mm; text-align: right;">{{formatNumber @root.invoice.totalIncludeVat 2}}</div>
        </div>
      </div>

      <!-- PAYMENT METHOD -->
      <div class="payment-section">
        <div class="payment-method">
          <div>Payment:</div>
          <div>{{@root.invoice.paymentType}}</div>
        </div>
        {{#if @root.invoice.amountPaid}}
        <div class="payment-method">
          <div>Paid:</div>
          <div>{{formatNumber @root.invoice.amountPaid 2}}</div>
        </div>
        {{/if}}
        {{#if @root.invoice.changeAmount}}
        <div class="payment-method">
          <div>Change:</div>
          <div>{{formatNumber @root.invoice.changeAmount 2}}</div>
        </div>
        {{/if}}
      </div>

      <!-- CUSTOMER DISPLAY (Optional) -->
      {{#if @root.invoice.customerName}}
      <div class="receipt-info" style="font-size: 10px; border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 1mm 0;">
        Customer: {{@root.invoice.customerName}}
      </div>
      {{/if}}

      <!-- QR CODE (if enabled) -->
      {{#if @root.invoice.qrCode}}
      <div class="qr-code-section">
        <img src="data:image/png;base64,{{@root.invoice.qrCode}}" alt="QR Code">
        <div class="transaction-id">ID: {{@root.invoice.invoiceNumber}}</div>
      </div>
      {{/if}}

      <!-- FOOTER MESSAGE -->
      <div class="receipt-footer">
        <div class="receipt-message">Thank you for your purchase!</div>
        <div class="receipt-message">Please visit again</div>
      </div>
    </div>
  `,
  cssContent: `
    body {
      margin: 0;
      padding: 0;
    }
    
    .thermal-receipt-container {
      width: 80mm;
      font-family: 'Courier New', monospace;
      line-height: 1.3;
    }
  `,
  description: 'Thermal receipt template optimized for 80mm supermarket POS thermal printers. Single-page wider format.',
  isActive: true,
  isDefault: false,
  createdBy: 'SYSTEM',
};

export const THERMAL_INVOICE_TEMPLATE_AR_80MM = {
  templateName: 'Thermal_Receipt_80mm_AR',
  language: 'AR',
  templateType: 'INVOICE',
  includeLogo: false,
  customDesign: {
    headerColor: '#000000',
    bodyFont: 'Arial',
    showSerialNumbers: false,
    showQrCode: true,
    showBarcode: false,
    currency: 'AED',
    pageSize: 'A5',
    margins: { top: 2, bottom: 2, left: 2, right: 2 }
  },
  htmlContent: `
    <div class="thermal-receipt-container" dir="rtl">
      <style>
        .thermal-receipt-container {
          width: 80mm;
          font-family: Arial, sans-serif;
          font-size: 12px;
          line-height: 1.3;
          color: #000;
          background: #fff;
          padding: 3mm;
          margin: 0;
          text-align: right;
        }
        
        .receipt-header {
          text-align: center;
          border-bottom: 1px dashed #000;
          padding-bottom: 4mm;
          margin-bottom: 3mm;
        }
        
        .store-name {
          font-size: 14px;
          font-weight: bold;
          margin: 0 0 2mm 0;
        }
        
        .store-address {
          font-size: 10px;
          line-height: 1.2;
          margin: 1mm 0;
        }
        
        .receipt-info {
          font-size: 11px;
          margin: 1mm 0;
          text-align: center;
        }
        
        .items-section {
          margin: 3mm 0;
          border-bottom: 1px dashed #000;
          padding-bottom: 2mm;
        }
        
        .items-header {
          display: flex;
          justify-content: space-between;
          font-weight: bold;
          font-size: 11px;
          border-bottom: 1px solid #000;
          padding-bottom: 1mm;
          margin-bottom: 1mm;
        }
        
        .item-row {
          display: flex;
          justify-content: space-between;
          font-size: 11px;
          margin: 0.5mm 0;
          line-height: 1.2;
        }
        
        .item-name {
          flex: 1;
          word-wrap: break-word;
          word-break: break-word;
          max-width: 45mm;
        }
        
        .totals-section {
          margin: 2mm 0;
          border-top: 1px dashed #000;
          border-bottom: 1px dashed #000;
          padding: 2mm 0;
        }
        
        .total-row {
          display: flex;
          justify-content: space-between;
          font-size: 11px;
          margin: 1mm 0;
        }
        
        .grand-total-row {
          display: flex;
          justify-content: space-between;
          font-weight: bold;
          font-size: 12px;
          margin: 1mm 0;
        }
        
        .receipt-footer {
          text-align: center;
          margin-top: 2mm;
          font-size: 10px;
        }
        
        .divider {
          border-top: 1px dashed #000;
          margin: 1mm 0;
        }
      </style>

      <!-- RECEIPT HEADER -->
      <div class="receipt-header">
        <div class="store-name">{{@root.store.storeName}}</div>
        {{#if @root.store.address1}}
        <div class="store-address">
          {{@root.store.address1}}
          {{#if @root.store.address2}}<br/>{{@root.store.address2}}{{/if}}
        </div>
        {{/if}}
        
        <div class="receipt-info">
          الإيصال # {{@root.invoice.invoiceNumber}}
        </div>
        <div class="receipt-info" style="font-size: 10px;">
          {{date @root.invoice.date 'DD/MM/YYYY HH:mm'}}
        </div>
      </div>

      <div class="divider"></div>

      <!-- ITEMS TABLE -->
      <div class="items-section">
        <div class="items-header">
          <div style="min-width: 15mm; text-align: left;">المبلغ</div>
          <div style="min-width: 10mm; text-align: center;">الكمية</div>
          <div style="flex: 1;">الصنف</div>
        </div>

        {{#items}}
        <div class="item-row">
          <div style="min-width: 15mm; text-align: left;">{{formatNumber total 2}}</div>
          <div style="min-width: 10mm; text-align: center;">{{quantity}}</div>
          <div class="item-name">{{itemName}}</div>
        </div>
        {{/items}}
      </div>

      <!-- TOTALS SECTION -->
      <div class="totals-section">
        {{#if @root.invoice.subtotal}}
        <div class="total-row">
          <div>{{formatNumber @root.invoice.subtotal 2}}</div>
          <div>الإجمالي الجزئي:</div>
        </div>
        {{/if}}

        {{#if @root.invoice.discountAmount}}
        <div class="total-row">
          <div>-{{formatNumber @root.invoice.discountAmount 2}}</div>
          <div>الخصم:</div>
        </div>
        {{/if}}

        {{#if @root.invoice.vatAmount}}
        <div class="total-row">
          <div>{{formatNumber @root.invoice.vatAmount 2}}</div>
          <div>الضريبة ({{@root.invoice.vatPercentage}}%):</div>
        </div>
        {{/if}}

        <div class="grand-total-row">
          <div style="text-align: left;">{{formatNumber @root.invoice.totalIncludeVat 2}}</div>
          <div>الإجمالي:</div>
        </div>
      </div>

      <!-- PAYMENT METHOD -->
      <div class="totals-section" style="border-bottom: 1px dashed #000;">
        <div class="total-row">
          <div>{{@root.invoice.paymentType}}</div>
          <div>طريقة الدفع:</div>
        </div>
      </div>

      <!-- FOOTER MESSAGE -->
      <div class="receipt-footer">
        <div>شكراً لتسوقك معنا</div>
        <div>يرجى زيارتنا مرة أخرى</div>
      </div>
    </div>
  `,
  cssContent: `
    body {
      margin: 0;
      padding: 0;
    }
    
    .thermal-receipt-container {
      width: 80mm;
      font-family: Arial, sans-serif;
      line-height: 1.3;
    }
  `,
  description: 'قالب إيصال حراري مُحسّن لطابعات POS الحرارية الخاصة بالمتاجر الكبرى (80 ملم). صيغة أوسع لورقة حرارية.',
  isActive: true,
  isDefault: false,
  createdBy: 'SYSTEM',
}
