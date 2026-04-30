/**
 * Inventory Document Templates (LPO, GRN, RTV)
 * Handlebars-based HTML templates for printing inventory documents
 */

// ============================================================================
// LOCAL PURCHASE ORDER (LPO) - ENGLISH
// ============================================================================
export const LPO_TEMPLATE_EN = {
  templateName: 'LPO_Standard_EN',
  documentType: 'LPO',
  language: 'EN',
  description: 'Standard LPO template with vendor details and item listing',
  includeLogo: true,
  customDesign: {
    headerColor: '#1e40af',
    bodyFont: 'Arial',
    pageSize: 'A4',
    margins: { top: 10, bottom: 10, left: 10, right: 10 },
    showSerialNumbers: true,
    showQrCode: true,
    showBarcode: false,
    showBatchInfo: false,
    showExpiryDates: false,
    showReturnReason: false,
    showCreditNoteRef: false
  },
  htmlContent: `
    <div class="document-container">
      {{#if includeLogo}}
      <div class="header-logo">
        <img src="{{store.logoUrl}}" alt="Logo" class="company-logo">
      </div>
      {{/if}}

      <div class="document-header">
        <div class="company-section">
          <h1 class="company-name">{{store.storeName}}</h1>
          <div class="company-details">
            <p>{{store.address1}}</p>
            {{#if store.address2}}<p>{{store.address2}}</p>{{/if}}
            <p>Phone: {{store.phone}}</p>
            <p>Email: {{store.email}}</p>
            {{#if store.taxNumber}}<p>Tax ID: {{store.taxNumber}}</p>{{/if}}
          </div>
        </div>

      <div class="document-title-section">
          <h2 class="document-title">LOCAL PURCHASE ORDER</h2>
          <div class="document-info">
            <table class="doc-info-table">
              <tr>
                <td class="label">LPO #:</td>
                <td class="value">{{lpo.lpoNumber}}</td>
              </tr>
              <tr>
                <td class="label">Date:</td>
                <td class="value">{{lpo.lpoDate}}</td>
              </tr>
            </table>
          </div>
        </div>
      </div>

      <div class="party-section">
        <div class="section-column">
          <h4 class="section-title">VENDOR INFORMATION</h4>
          <div class="party-box">
            <p class="party-name"><strong>{{lpo.vendorName}}</strong></p>
            {{#if lpo.vendorCode}}<p>Vendor Code: {{lpo.vendorCode}}</p>{{/if}}
            {{#if lpo.vendorPhone}}<p>Phone: {{lpo.vendorPhone}}</p>{{/if}}
            {{#if lpo.vendorEmail}}<p>Email: {{lpo.vendorEmail}}</p>{{/if}}
          </div>
        </div>

        <div class="section-column">
          <h4 class="section-title">DELIVERY DETAILS</h4>
          <div class="party-box">
            <p><strong>Delivery Store:</strong> {{store.storeName}}</p>
            <p>{{store.address1}}</p>
            {{#if store.address2}}<p>{{store.address2}}</p>{{/if}}
            {{#if store.phone}}<p>Phone: {{store.phone}}</p>{{/if}}
          </div>
        </div>
      </div>

      <table class="items-table">
        <thead>
          <tr class="table-header">
            <th class="col-slno">SL#</th>
            <th class="col-itemcode">Item Code</th>
            <th class="col-itemname">Item Description</th>
            <th class="col-uom">UOM</th>
            <th class="col-qty">Quantity</th>
            <th class="col-unitprice">Unit Price</th>
            <th class="col-amount">Amount</th>
          </tr>
        </thead>
        <tbody>
          {{#lpo.items}}
          <tr class="item-row">
            <td class="col-slno">{{slNo @index}}</td>
            <td class="col-itemcode">{{itemcode}}</td>
            <td class="col-itemname">{{itemName}}</td>
            <td class="col-uom">{{unit}}</td>
            <td class="col-qty text-right">{{quantity}}</td>
            <td class="col-unitprice text-right">{{currency unitPrice}}</td>
            <td class="col-amount text-right">{{currency total}}</td>
          </tr>
          {{/lpo.items}}
        </tbody>
      </table>

      <div class="summary-section">
        <table class="summary-table">
          <tr>
            <td class="label">Subtotal:</td>
            <td class="amount">{{currency lpo.subtotal}}</td>
          </tr>
          {{#if lpo.discountAmount}}
          <tr>
            <td class="label">Discount:</td>
            <td class="amount">{{currency lpo.discountAmount}}</td>
          </tr>
          {{/if}}
          {{#if lpo.taxAmount}}
          <tr>
            <td class="label">Tax:</td>
            <td class="amount">{{currency lpo.taxAmount}}</td>
          </tr>
          {{/if}}
          <tr class="total-row">
            <td class="label"><strong>Total Amount:</strong></td>
            <td class="amount"><strong>{{currency lpo.totalAmount}}</strong></td>
          </tr>
        </table>
      </div>

      {{#if lpo.notes}}
      <div class="notes-section">
        <h4>Notes:</h4>
        <p>{{lpo.notes}}</p>
      </div>
      {{/if}}

      <div class="footer-section">
        <div class="footer-column">
          <p class="footer-label">Approved By:</p>
          <p class="footer-value">_________________</p>
        </div>
        <div class="footer-column">
          <p class="footer-label">Vendor Sign:</p>
          <p class="footer-value">_________________</p>
        </div>
        <div class="footer-column">
          <p class="footer-label">Date:</p>
          <p class="footer-value">_________________</p>
        </div>
      </div>
    </div>
  `,
  cssContent: `
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    .document-container {
      font-family: Arial, sans-serif;
      color: #333;
      width: 100%;
      padding: 20px;
      background-color: white;
    }

    .header-logo {
      text-align: center;
      margin-bottom: 20px;
    }

    .company-logo {
      max-width: 150px;
      height: auto;
    }

    .document-header {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-bottom: 20px;
      border-bottom: 3px solid #1e40af;
      padding-bottom: 15px;
    }

    .company-section h1 {
      font-size: 18px;
      color: #1e40af;
      margin-bottom: 10px;
    }

    .company-details {
      font-size: 11px;
      line-height: 1.4;
    }

    .document-title-section {
      text-align: right;
    }

    .document-title {
      font-size: 20px;
      color: #1e40af;
      margin-bottom: 10px;
      font-weight: bold;
    }

    .doc-info-table {
      width: 100%;
      font-size: 11px;
      border-collapse: collapse;
    }

    .doc-info-table td {
      padding: 3px 5px;
    }

    .doc-info-table .label {
      font-weight: bold;
      text-align: right;
      width: 40%;
    }

    .doc-info-table .value {
      text-align: right;
    }

    .party-section {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-bottom: 20px;
    }

    .section-title {
      font-size: 12px;
      font-weight: bold;
      color: #1e40af;
      margin-bottom: 8px;
      border-bottom: 2px solid #e5e7eb;
      padding-bottom: 5px;
    }

    .party-box {
      border: 1px solid #d1d5db;
      padding: 10px;
      border-radius: 4px;
      background-color: #f9fafb;
      font-size: 11px;
      line-height: 1.5;
    }

    .party-name {
      font-weight: bold;
      margin-bottom: 5px;
      color: #1e40af;
    }

    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
      font-size: 11px;
      table-layout: fixed;
    }

    .items-table th {
      background-color: #1e40af;
      color: white;
      padding: 6px 4px;
      text-align: left;
      font-weight: bold;
      border: 1px solid #1e40af;
      word-break: break-word;
      word-wrap: break-word;
    }

    .items-table td {
      padding: 6px 4px;
      border: 1px solid #e5e7eb;
      word-break: break-word;
      word-wrap: break-word;
      overflow: hidden;
    }

    /* Column width definitions */
    .items-table .col-slno {
      width: 4%;
      text-align: center;
    }

    .items-table .col-itemcode {
      width: 10%;
    }

    .items-table .col-itemname {
      width: 32%;
    }

    .items-table .col-uom {
      width: 8%;
      text-align: center;
    }

    .items-table .col-qty {
      width: 10%;
      text-align: right;
    }

    .items-table .col-unitprice {
      width: 18%;
      text-align: right;
    }

    .items-table .col-amount {
      width: 18%;
      text-align: right;
    }

    .items-table .text-right {
      text-align: right;
    }

    .items-table tbody tr:nth-child(even) {
      background-color: #f9fafb;
    }

    .items-table tbody tr:hover {
      background-color: #f3f4f6;
    }

    .summary-section {
      display: flex;
      justify-content: flex-end;
      margin: 20px 0;
    }

    .summary-table {
      width: 40%;
      border-collapse: collapse;
      font-size: 12px;
    }

    .summary-table tr {
      border-bottom: 1px solid #e5e7eb;
    }

    .summary-table td {
      padding: 8px;
    }

    .summary-table .label {
      text-align: left;
      font-weight: normal;
      width: 60%;
    }

    .summary-table .amount {
      text-align: right;
      width: 40%;
    }

    .summary-table .total-row {
      background-color: #f3f4f6;
      border-top: 2px solid #1e40af;
      border-bottom: 2px solid #1e40af;
    }

    .notes-section {
      margin: 20px 0;
      padding: 10px;
      border: 1px solid #e5e7eb;
      background-color: #fffbeb;
      font-size: 11px;
    }

    .notes-section h4 {
      font-weight: bold;
      margin-bottom: 5px;
      color: #92400e;
    }

    .footer-section {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 20px;
      margin-top: 30px;
      padding-top: 30px;
      border-top: 1px solid #d1d5db;
    }

    .footer-column {
      text-align: center;
      font-size: 11px;
    }

    .footer-label {
      font-weight: bold;
      margin-bottom: 30px;
    }

    .footer-value {
      border-top: 1px solid #333;
      padding-top: 5px;
    }

    @media print {
      * {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    }
  `
};

// ============================================================================
// GOODS RECEIPT NOTE (GRN) - ENGLISH
// ============================================================================
export const GRN_TEMPLATE_EN = {
  templateName: 'GRN_Standard_EN',
  documentType: 'GRN',
  language: 'EN',
  description: 'Standard GRN template with batch and expiry tracking',
  includeLogo: true,
  customDesign: {
    headerColor: '#059669',
    bodyFont: 'Arial',
    pageSize: 'A4',
    margins: { top: 10, bottom: 10, left: 10, right: 10 },
    showSerialNumbers: true,
    showQrCode: true,
    showBarcode: false,
    showBatchInfo: true,
    showExpiryDates: true,
    showReturnReason: false,
    showCreditNoteRef: false
  },
  htmlContent: `
    <div class="document-container">
      {{#if includeLogo}}
      <div class="header-logo">
        <img src="{{store.logoUrl}}" alt="Logo" class="company-logo">
      </div>
      {{/if}}

      <div class="document-header">
        <div class="company-section">
          <h1 class="company-name">{{store.storeName}}</h1>
          <div class="company-details">
            <p>{{store.address1}}</p>
            {{#if store.address2}}<p>{{store.address2}}</p>{{/if}}
            <p>Phone: {{store.phone}}</p>
            <p>Email: {{store.email}}</p>
            {{#if store.taxNumber}}<p>Tax ID: {{store.taxNumber}}</p>{{/if}}
          </div>
        </div>

        <div class="document-title-section">
          <h2 class="document-title">GOODS RECEIPT NOTE</h2>
          <div class="document-info">
            <table class="doc-info-table">
              <tr>
                <td class="label">GRN #:</td>
                <td class="value">{{grn.grnNumber}}</td>
              </tr>
              <tr>
                <td class="label">Date:</td>
                <td class="value">{{grn.grnDate}}</td>
              </tr>
              <tr>
                <td class="label">LPO #:</td>
                <td class="value">{{grn.lpoNumber}}</td>
              </tr>
              <tr>
                <td class="label">Invoice #:</td>
                <td class="value">{{grn.invoiceNumber}}</td>
              </tr>
            </table>
          </div>
        </div>
      </div>

      <div class="party-section">
        <div class="section-column">
          <h4 class="section-title">VENDOR INFORMATION</h4>
          <div class="party-box">
            <p class="party-name"><strong>{{grn.vendorName}}</strong></p>
            {{#if grn.vendorCode}}<p>Vendor Code: {{grn.vendorCode}}</p>{{/if}}
            {{#if grn.vendorPhone}}<p>Phone: {{grn.vendorPhone}}</p>{{/if}}
          </div>
        </div>

        <div class="section-column">
          <h4 class="section-title">RECEIVING DETAILS</h4>
          <div class="party-box">
            <p><strong>Received At:</strong> {{store.storeName}}</p>
            {{#if grn.receivedBy}}<p><strong>Received By:</strong> {{grn.receivedBy}}</p>{{/if}}
            {{#if grn.condition}}<p><strong>Condition:</strong> {{grn.condition}}</p>{{/if}}
          </div>
        </div>
      </div>

      <table class="items-table">
        <thead>
          <tr class="table-header">
            <th class="col-slno">SL#</th>
            <th class="col-itemcode">Item Code</th>
            <th class="col-itemname">Item Description</th>
            <th class="col-qty">Quantity Received</th>
            <th class="col-uom">UOM</th>
            {{#showBatchInfo}}<th class="col-batch">Batch #</th>{{/showBatchInfo}}
            {{#showExpiryDates}}<th class="col-expiry">Expiry Date</th>{{/showExpiryDates}}
            <th class="col-unitcost">Unit Cost</th>
            <th class="col-totalcost">Total Cost</th>
          </tr>
        </thead>
        <tbody>
          {{#grn.items}}
          <tr class="item-row">
            <td class="col-slno">{{slNo @index}}</td>
            <td class="col-itemcode">{{itemcode}}</td>
            <td class="col-itemname">{{itemName}}</td>
            <td class="col-qty text-right">{{quantity}}</td>
            <td class="col-uom">{{unit}}</td>
            {{#../customDesign.showBatchInfo}}<td class="col-batch">{{batchNo}}</td>{{/../customDesign.showBatchInfo}}
            {{#../customDesign.showExpiryDates}}<td class="col-expiry">{{expiryDate}}</td>{{/../customDesign.showExpiryDates}}
            <td class="col-unitcost text-right">{{currency unitPrice}}</td>
            <td class="col-totalcost text-right">{{currency total}}</td>
          </tr>
          {{/grn.items}}
        </tbody>
      </table>

      <div class="summary-section">
        <table class="summary-table">
          <tr>
            <td class="label">Subtotal:</td>
            <td class="amount">{{currency grn.subtotal}}</td>
          </tr>
          {{#if grn.taxAmount}}
          <tr>
            <td class="label">Tax:</td>
            <td class="amount">{{currency grn.taxAmount}}</td>
          </tr>
          {{/if}}
          <tr class="total-row">
            <td class="label"><strong>Total Cost:</strong></td>
            <td class="amount"><strong>{{currency grn.totalAmount}}</strong></td>
          </tr>
        </table>
      </div>

      {{#if grn.notes}}
      <div class="notes-section">
        <h4>Notes:</h4>
        <p>{{grn.notes}}</p>
      </div>
      {{/if}}

      <div class="footer-section">
        <div class="footer-column">
          <p class="footer-label">Received By:</p>
          <p class="footer-value">_________________</p>
        </div>
        <div class="footer-column">
          <p class="footer-label">Verified By:</p>
          <p class="footer-value">_________________</p>
        </div>
        <div class="footer-column">
          <p class="footer-label">Approved By:</p>
          <p class="footer-value">_________________</p>
        </div>
      </div>
    </div>
  `,
  cssContent: `
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    .document-container {
      font-family: Arial, sans-serif;
      color: #333;
      width: 100%;
      padding: 20px;
      background-color: white;
    }

    .header-logo {
      text-align: center;
      margin-bottom: 20px;
    }

    .company-logo {
      max-width: 150px;
      height: auto;
    }

    .document-header {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-bottom: 20px;
      border-bottom: 3px solid #059669;
      padding-bottom: 15px;
    }

    .company-section h1 {
      font-size: 18px;
      color: #059669;
      margin-bottom: 10px;
    }

    .company-details {
      font-size: 11px;
      line-height: 1.4;
    }

    .document-title-section {
      text-align: right;
    }

    .document-title {
      font-size: 20px;
      color: #059669;
      margin-bottom: 10px;
      font-weight: bold;
    }

    .doc-info-table {
      width: 100%;
      font-size: 11px;
      border-collapse: collapse;
    }

    .doc-info-table td {
      padding: 3px 5px;
    }

    .doc-info-table .label {
      font-weight: bold;
      text-align: right;
      width: 40%;
    }

    .doc-info-table .value {
      text-align: right;
    }

    .party-section {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-bottom: 20px;
    }

    .section-title {
      font-size: 12px;
      font-weight: bold;
      color: #059669;
      margin-bottom: 8px;
      border-bottom: 2px solid #e5e7eb;
      padding-bottom: 5px;
    }

    .party-box {
      border: 1px solid #d1d5db;
      padding: 10px;
      border-radius: 4px;
      background-color: #f9fafb;
      font-size: 11px;
      line-height: 1.5;
    }

    .party-name {
      font-weight: bold;
      margin-bottom: 5px;
      color: #059669;
    }

    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
      font-size: 10px;
    }

    .items-table th {
      background-color: #059669;
      color: white;
      padding: 8px;
      text-align: left;
      font-weight: bold;
      border: 1px solid #059669;
    }

    .items-table td {
      padding: 6px;
      border: 1px solid #e5e7eb;
    }

    .items-table .text-right {
      text-align: right;
    }

    .items-table tbody tr:nth-child(even) {
      background-color: #f9fafb;
    }

    .summary-section {
      display: flex;
      justify-content: flex-end;
      margin: 20px 0;
    }

    .summary-table {
      width: 40%;
      border-collapse: collapse;
      font-size: 12px;
    }

    .summary-table tr {
      border-bottom: 1px solid #e5e7eb;
    }

    .summary-table td {
      padding: 8px;
    }

    .summary-table .label {
      text-align: left;
      font-weight: normal;
      width: 60%;
    }

    .summary-table .amount {
      text-align: right;
      width: 40%;
    }

    .summary-table .total-row {
      background-color: #ecfdf5;
      border-top: 2px solid #059669;
      border-bottom: 2px solid #059669;
    }

    .notes-section {
      margin: 20px 0;
      padding: 10px;
      border: 1px solid #e5e7eb;
      background-color: #f0fdf4;
      font-size: 11px;
    }

    .footer-section {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 20px;
      margin-top: 30px;
      padding-top: 30px;
      border-top: 1px solid #d1d5db;
    }

    .footer-column {
      text-align: center;
      font-size: 11px;
    }

    .footer-label {
      font-weight: bold;
      margin-bottom: 30px;
    }

    .footer-value {
      border-top: 1px solid #333;
      padding-top: 5px;
    }

    @media print {
      * {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    }
  `
};

// ============================================================================
// RETURN TO VENDOR (RTV) - ENGLISH
// ============================================================================
export const RTV_TEMPLATE_EN = {
  templateName: 'RTV_Standard_EN',
  documentType: 'RTV',
  language: 'EN',
  description: 'Standard RTV template with return reasons and credit note reference',
  includeLogo: true,
  customDesign: {
    headerColor: '#dc2626',
    bodyFont: 'Arial',
    pageSize: 'A4',
    margins: { top: 10, bottom: 10, left: 10, right: 10 },
    showSerialNumbers: true,
    showQrCode: false,
    showBarcode: false,
    showBatchInfo: false,
    showExpiryDates: false,
    showReturnReason: true,
    showCreditNoteRef: true
  },
  htmlContent: `
    <div class="document-container">
      {{#if includeLogo}}
      <div class="header-logo">
        <img src="{{store.logoUrl}}" alt="Logo" class="company-logo">
      </div>
      {{/if}}

      <div class="document-header">
        <div class="company-section">
          <h1 class="company-name">{{store.storeName}}</h1>
          <div class="company-details">
            <p>{{store.address1}}</p>
            {{#if store.address2}}<p>{{store.address2}}</p>{{/if}}
            <p>Phone: {{store.phone}}</p>
            <p>Email: {{store.email}}</p>
            {{#if store.taxNumber}}<p>Tax ID: {{store.taxNumber}}</p>{{/if}}
          </div>
        </div>

        <div class="document-title-section">
          <h2 class="document-title">RETURN TO VENDOR</h2>
          <div class="document-info">
            <table class="doc-info-table">
              <tr>
                <td class="label">RTV #:</td>
                <td class="value">{{rtv.rtvNumber}}</td>
              </tr>
              <tr>
                <td class="label">Date:</td>
                <td class="value">{{rtv.rtvDate}}</td>
              </tr>
              <tr>
                <td class="label">GRN #:</td>
                <td class="value">{{rtv.grnNumber}}</td>
              </tr>
              {{#if rtv.creditNoteNumber}}
              <tr>
                <td class="label">Credit Note #:</td>
                <td class="value">{{rtv.creditNoteNumber}}</td>
              </tr>
              {{/if}}
            </table>
          </div>
        </div>
      </div>

      <div class="party-section">
        <div class="section-column">
          <h4 class="section-title">VENDOR INFORMATION</h4>
          <div class="party-box">
            <p class="party-name"><strong>{{rtv.vendorName}}</strong></p>
            {{#if rtv.vendorCode}}<p>Vendor Code: {{rtv.vendorCode}}</p>{{/if}}
            {{#if rtv.vendorPhone}}<p>Phone: {{rtv.vendorPhone}}</p>{{/if}}
          </div>
        </div>

        <div class="section-column">
          <h4 class="section-title">RETURN AUTHORIZATION</h4>
          <div class="party-box">
            {{#if rtv.authorizedBy}}<p><strong>Authorized By:</strong> {{rtv.authorizedBy}}</p>{{/if}}
            {{#if rtv.returnReason}}<p><strong>Reason for Return:</strong> {{rtv.returnReason}}</p>{{/if}}
          </div>
        </div>
      </div>

      <table class="items-table">
        <thead>
          <tr class="table-header">
            <th class="col-slno">SL#</th>
            <th class="col-itemcode">Item Code</th>
            <th class="col-itemname">Item Description</th>
            <th class="col-qty">Return Quantity</th>
            <th class="col-uom">UOM</th>
            {{#showReturnReason}}<th class="col-reason">Return Reason</th>{{/showReturnReason}}
            <th class="col-unitprice">Unit Price</th>
            <th class="col-amount">Return Amount</th>
          </tr>
        </thead>
        <tbody>
          {{#rtv.items}}
          <tr class="item-row">
            <td class="col-slno">{{slNo @index}}</td>
            <td class="col-itemcode">{{itemcode}}</td>
            <td class="col-itemname">{{itemName}}</td>
            <td class="col-qty text-right">{{quantity}}</td>
            <td class="col-uom">{{unit}}</td>
            {{#../customDesign.showReturnReason}}<td class="col-reason">{{returnReason}}</td>{{/../customDesign.showReturnReason}}
            <td class="col-unitprice text-right">{{currency unitPrice}}</td>
            <td class="col-amount text-right">{{currency total}}</td>
          </tr>
          {{/rtv.items}}
        </tbody>
      </table>

      <div class="summary-section">
        <table class="summary-table">
          <tr>
            <td class="label">Subtotal:</td>
            <td class="amount">{{currency rtv.subtotal}}</td>
          </tr>
          {{#if rtv.restockingFee}}
          <tr>
            <td class="label">Restocking Fee:</td>
            <td class="amount">{{currency rtv.restockingFee}}</td>
          </tr>
          {{/if}}
          <tr class="total-row">
            <td class="label"><strong>Total Return Amount:</strong></td>
            <td class="amount"><strong>{{currency rtv.totalAmount}}</strong></td>
          </tr>
        </table>
      </div>

      {{#if rtv.notes}}
      <div class="notes-section">
        <h4>Notes / Condition:</h4>
        <p>{{rtv.notes}}</p>
      </div>
      {{/if}}

      <div class="footer-section">
        <div class="footer-column">
          <p class="footer-label">Initiated By:</p>
          <p class="footer-value">_________________</p>
        </div>
        <div class="footer-column">
          <p class="footer-label">Vendor Acceptance:</p>
          <p class="footer-value">_________________</p>
        </div>
        <div class="footer-column">
          <p class="footer-label">Date:</p>
          <p class="footer-value">_________________</p>
        </div>
      </div>
    </div>
  `,
  cssContent: `
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    .document-container {
      font-family: Arial, sans-serif;
      color: #333;
      width: 100%;
      padding: 20px;
      background-color: white;
    }

    .header-logo {
      text-align: center;
      margin-bottom: 20px;
    }

    .company-logo {
      max-width: 150px;
      height: auto;
    }

    .document-header {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-bottom: 20px;
      border-bottom: 3px solid #dc2626;
      padding-bottom: 15px;
    }

    .company-section h1 {
      font-size: 18px;
      color: #dc2626;
      margin-bottom: 10px;
    }

    .company-details {
      font-size: 11px;
      line-height: 1.4;
    }

    .document-title-section {
      text-align: right;
    }

    .document-title {
      font-size: 20px;
      color: #dc2626;
      margin-bottom: 10px;
      font-weight: bold;
    }

    .doc-info-table {
      width: 100%;
      font-size: 11px;
      border-collapse: collapse;
    }

    .doc-info-table td {
      padding: 3px 5px;
    }

    .doc-info-table .label {
      font-weight: bold;
      text-align: right;
      width: 40%;
    }

    .doc-info-table .value {
      text-align: right;
    }

    .party-section {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-bottom: 20px;
    }

    .section-title {
      font-size: 12px;
      font-weight: bold;
      color: #dc2626;
      margin-bottom: 8px;
      border-bottom: 2px solid #e5e7eb;
      padding-bottom: 5px;
    }

    .party-box {
      border: 1px solid #d1d5db;
      padding: 10px;
      border-radius: 4px;
      background-color: #f9fafb;
      font-size: 11px;
      line-height: 1.5;
    }

    .party-name {
      font-weight: bold;
      margin-bottom: 5px;
      color: #dc2626;
    }

    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
      font-size: 10px;
    }

    .items-table th {
      background-color: #dc2626;
      color: white;
      padding: 8px;
      text-align: left;
      font-weight: bold;
      border: 1px solid #dc2626;
    }

    .items-table td {
      padding: 6px;
      border: 1px solid #e5e7eb;
    }

    .items-table .text-right {
      text-align: right;
    }

    .items-table tbody tr:nth-child(even) {
      background-color: #f9fafb;
    }

    .summary-section {
      display: flex;
      justify-content: flex-end;
      margin: 20px 0;
    }

    .summary-table {
      width: 40%;
      border-collapse: collapse;
      font-size: 12px;
    }

    .summary-table tr {
      border-bottom: 1px solid #e5e7eb;
    }

    .summary-table td {
      padding: 8px;
    }

    .summary-table .label {
      text-align: left;
      font-weight: normal;
      width: 60%;
    }

    .summary-table .amount {
      text-align: right;
      width: 40%;
    }

    .summary-table .total-row {
      background-color: #fee2e2;
      border-top: 2px solid #dc2626;
      border-bottom: 2px solid #dc2626;
    }

    .notes-section {
      margin: 20px 0;
      padding: 10px;
      border: 1px solid #e5e7eb;
      background-color: #fef2f2;
      font-size: 11px;
    }

    .footer-section {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 20px;
      margin-top: 30px;
      padding-top: 30px;
      border-top: 1px solid #d1d5db;
    }

    .footer-column {
      text-align: center;
      font-size: 11px;
    }

    .footer-label {
      font-weight: bold;
      margin-bottom: 30px;
    }

    .footer-value {
      border-top: 1px solid #333;
      padding-top: 5px;
    }

    @media print {
      * {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    }
  `
};
