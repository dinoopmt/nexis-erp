// Sales Return Template - English with Logo
export const SALES_RETURN_TEMPLATE_EN_WITH_LOGO = {
  templateName: 'SalesReturn_EN_with_Logo',
  language: 'EN',
  templateType: 'RTV',
  includeLogo: true,
  customDesign: {
    headerColor: '#dc2626',
    bodyFont: 'Arial',
    showSerialNumbers: true,
    showQrCode: false,
    currency: 'AED',
    pageSize: 'A4'
  },
  htmlContent: `
    <div class="sales-return-container">
      {{#withLogo}}
      <div class="header">
        <img src="{{store.logoUrl}}" alt="Logo" class="logo">
      </div>
      {{/withLogo}}

      <div class="company-info">
        <h1 class="company-name">{{company.companyName}}</h1>
        <p class="company-details">
          {{company.address}}<br>
          {{company.city}}, {{company.state}} {{company.country}}<br>
          Email: {{company.email}} | Phone: {{company.phone}}<br>
          Tax ID: {{company.taxId}}
        </p>
      </div>

      <div class="document-header">
        <div class="left">
          <h2 class="document-title">SALES RETURN</h2>
          <table class="document-details-table">
            <tr>
              <td class="label">Return Note #:</td>
              <td class="value">{{return.returnNoteNumber}}</td>
            </tr>
            <tr>
              <td class="label">Date:</td>
              <td class="value">{{date return.date 'DD/MM/YYYY'}}</td>
            </tr>
            <tr>
              <td class="label">Reference Invoice:</td>
              <td class="value">{{return.invoiceNumber}}</td>
            </tr>
            <tr>
              <td class="label">Invoice Date:</td>
              <td class="value">{{date return.invoiceDate 'DD/MM/YYYY'}}</td>
            </tr>
            <tr>
              <td class="label">Return Reason:</td>
              <td class="value">{{return.returnReason}}</td>
            </tr>
          </table>
        </div>
        <div class="right">
          <h3 class="returned-by-title">RETURNED BY:</h3>
          <p class="customer-name">{{return.customerName}}</p>
          <p class="customer-details">
            {{return.customerAddress}}<br>
            Phone: {{return.customerPhone}}<br>
            {{#return.customerTRN}}Tax ID: {{return.customerTRN}}{{/return.customerTRN}}
          </p>
        </div>
      </div>

      {{#return.paymentType}}
      <div class="return-info-box">
        <table class="return-info-table">
          <tr>
            <td class="info-label">Payment Type:</td>
            <td class="info-value">{{return.paymentType}}</td>
          </tr>
        </table>
      </div>
      {{/return.paymentType}}

      <table class="items-table">
        <thead>
          <tr class="table-header">
            <th class="col-slno">SL</th>
            <th class="col-item">Item Description</th>
            <th class="col-code">Item Code</th>
            <th class="col-uom">UOM</th>
            <th class="col-qty">Qty</th>
            <th class="col-rate">Unit Price</th>
            <th class="col-discount">Discount %</th>
            <th class="col-tax">VAT %</th>
            <th class="col-amount">Total</th>
          </tr>
        </thead>
        <tbody>
          {{#return.items}}
          <tr class="item-row">
            <td class="col-slno">{{slNo @index}}</td>
            <td class="col-item">
              <div class="item-name">{{itemName}}</div>
            </td>
            <td class="col-code">{{itemcode}}</td>
            <td class="col-uom text-center">{{unit}}</td>
            <td class="col-qty text-center">{{quantity}}</td>
            <td class="col-rate text-right">{{currency unitPrice decimals=../../company.decimalPlaces}}</td>
            <td class="col-discount text-center">{{discountPercentage}}%</td>
            <td class="col-tax text-center">{{vatPercentage}}%</td>
            <td class="col-amount text-right">{{currency total decimals=../../company.decimalPlaces}}</td>
          </tr>
          {{/return.items}}
        </tbody>
      </table>

      <div class="totals-section">
        <table class="totals-table">
          <tr>
            <td class="label">Subtotal:</td>
            <td class="value">{{currency return.subtotal decimals=company.decimalPlaces}}</td>
          </tr>
          {{#return.discountPercentage}}
          <tr>
            <td class="label">Discount ({{return.discountPercentage}}%):</td>
            <td class="value">- {{currency return.discountAmount decimals=company.decimalPlaces}}</td>
          </tr>
          {{/return.discountPercentage}}
          <tr>
            <td class="label">Total after Discount:</td>
            <td class="value">{{currency return.totalAfterDiscount decimals=company.decimalPlaces}}</td>
          </tr>
          <tr>
            <td class="label">VAT ({{return.vatPercentage}}%):</td>
            <td class="value">{{currency return.vatAmount decimals=company.decimalPlaces}}</td>
          </tr>
          <tr class="total-row">
            <td class="label">TOTAL RETURN AMOUNT:</td>
            <td class="value">{{currency return.totalIncludeVat decimals=company.decimalPlaces}}</td>
          </tr>
        </table>
      </div>

      <div class="refund-info">
        <p class="refund-label">Payment Type:</p>
        <p class="refund-details">{{return.paymentType}}</p>
        {{#return.notes}}
        <p class="refund-label">Notes:</p>
        <p class="refund-details">{{return.notes}}</p>
        {{/return.notes}}
      </div>

      <div class="signature-section">
        <table class="signature-table">
          <tr>
            <td class="sig-field">
              <p class="sig-label">Accepted By (Customer):</p>
              <div class="sig-line"></div>
              <p class="sig-date">Date: ___________</p>
            </td>
            <td class="sig-field">
              <p class="sig-label">Received By (Staff):</p>
              <div class="sig-line"></div>
              <p class="sig-name">{{return.receivedBy}}</p>
            </td>
            <td class="sig-field">
              <p class="sig-label">Authorized By:</p>
              <div class="sig-line"></div>
              <p class="sig-name">{{return.authorizedBy}}</p>
            </td>
          </tr>
        </table>
      </div>

      <div class="footer">
        <p class="footer-text">Thank you for doing business with us.</p>
        <p class="footer-text">Generated on: {{date now 'DD/MM/YYYY HH:mm:ss'}}</p>
      </div>
    </div>

    <style>
      .sales-return-container { font-family: Arial, sans-serif; padding: 20px; color: #333; }
      .header { text-align: center; margin-bottom: 15px; }
      .logo { max-width: 80px; height: auto; }
      .company-info { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #dc2626; padding-bottom: 10px; }
      .company-name { margin: 0; font-size: 18px; font-weight: bold; color: #dc2626; }
      .company-details { margin: 5px 0; font-size: 11px; color: #666; }
      .document-header { display: flex; justify-content: space-between; margin-bottom: 20px; gap: 40px; }
      .document-title { margin: 0 0 10px 0; font-size: 24px; color: #dc2626; font-weight: bold; }
      .document-details-table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
      .document-details-table tr { vertical-align: top; }
      .document-details-table .label { font-weight: bold; width: 40%; font-size: 11px; }
      .document-details-table .value { font-size: 11px; }
      .returned-by-title { margin: 0 0 8px 0; font-size: 12px; color: #dc2626; font-weight: bold; }
      .customer-name { margin: 0; font-weight: bold; font-size: 12px; }
      .customer-details { margin: 3px 0 0 0; font-size: 10px; color: #666; }
      .return-info-box { background-color: #fee2e2; border: 1px solid #fecaca; padding: 10px; margin: 15px 0; }
      .return-info-table { width: 100%; border-collapse: collapse; }
      .return-info-table tr { vertical-align: top; }
      .return-info-table .info-label { font-weight: bold; width: 30%; font-size: 10px; padding: 4px; }
      .return-info-table .info-value { font-size: 10px; padding: 4px; }
      .items-table { width: 100%; border-collapse: collapse; margin-bottom: 15px; border: 1px solid #ddd; }
      .table-header { background-color: #dc2626; color: white; }
      .table-header th { padding: 8px; text-align: left; font-size: 11px; font-weight: bold; border: 1px solid #ccc; }
      .item-row { border-bottom: 1px solid #eee; }
      .item-row td { padding: 6px; font-size: 10px; border: 1px solid #ddd; }
      .col-slno { width: 4%; text-align: center; }
      .col-item { width: 18%; }
      .col-code { width: 8%; text-align: center; }
      .col-uom { width: 6%; text-align: center; }
      .col-qty { width: 6%; text-align: center; }
      .col-rate { width: 10%; text-align: right; }
      .col-discount { width: 8%; text-align: center; }
      .col-tax { width: 8%; text-align: center; }
      .col-amount { width: 12%; text-align: right; font-weight: bold; }
      .item-name { font-weight: bold; }
      .item-note { font-size: 9px; color: #dc2626; margin-top: 2px; }
      .text-center { text-align: center; }
      .text-right { text-align: right; }
      .totals-section { margin: 20px 0; }
      .totals-table { width: 100%; border-collapse: collapse; margin-left: auto; width: 50%; }
      .totals-table tr { vertical-align: top; }
      .totals-table .label { font-size: 11px; padding: 4px 10px; text-align: right; }
      .totals-table .value { font-size: 11px; padding: 4px 10px; text-align: right; font-weight: bold; }
      .total-row { border-top: 2px solid #dc2626; background-color: #fee2e2; }
      .total-row .label, .total-row .value { font-size: 12px; font-weight: bold; color: #dc2626; }
      .refund-info { margin: 15px 0; padding: 10px; background-color: #f3f4f6; border-left: 3px solid #dc2626; }
      .refund-label { margin: 0; font-size: 11px; font-weight: bold; color: #dc2626; }
      .refund-details { margin: 5px 0 0 0; font-size: 10px; }
      .signature-section { margin-top: 30px; }
      .signature-table { width: 100%; border-collapse: collapse; }
      .sig-field { width: 33%; text-align: center; padding: 10px; border: 1px solid #ddd; }
      .sig-label { margin: 0 0 30px 0; font-size: 11px; font-weight: bold; }
      .sig-line { border-bottom: 1px solid #333; height: 30px; }
      .sig-name, .sig-date { margin: 5px 0 0 0; font-size: 10px; }
      .footer { margin-top: 30px; text-align: center; border-top: 1px solid #ddd; padding-top: 10px; }
      .footer-text { margin: 3px 0; font-size: 9px; color: #999; }
    </style>
  `,
  cssContent: ''
}

// Sales Return Template - English without Logo
export const SALES_RETURN_TEMPLATE_EN_WITHOUT_LOGO = {
  templateName: 'SalesReturn_EN_without_Logo',
  language: 'EN',
  templateType: 'RTV',
  includeLogo: false,
  customDesign: {
    headerColor: '#dc2626',
    bodyFont: 'Arial',
    showSerialNumbers: true,
    showQrCode: false,
    currency: 'AED',
    pageSize: 'A4'
  },
  htmlContent: `
    <div class="sales-return-container">
      <div class="company-info">
        <h1 class="company-name">{{company.companyName}}</h1>
        <p class="company-details">
          {{company.address}}<br>
          {{company.city}}, {{company.state}} {{company.country}}<br>
          Email: {{company.email}} | Phone: {{company.phone}}
        </p>
      </div>

      <div class="document-header">
        <div class="left">
          <h2 class="document-title">SALES RETURN</h2>
          <table class="document-details-table">
            <tr>
              <td class="label">Return Note #:</td>
              <td class="value">{{return.returnNumber}}</td>
            </tr>
            <tr>
              <td class="label">Date:</td>
              <td class="value">{{date return.date 'DD/MM/YYYY'}}</td>
            </tr>
            <tr>
              <td class="label">Reference Invoice:</td>
              <td class="value">{{return.referenceInvoice}}</td>
            </tr>
            <tr>
              <td class="label">Return Reason:</td>
              <td class="value">{{return.returnReason}}</td>
            </tr>
          </table>
        </div>
        <div class="right">
          <h3 class="returned-by-title">RETURNED BY:</h3>
          <p class="customer-name">{{return.customerName}}</p>
          <p class="customer-details">
            {{return.customerAddress}}<br>
            Phone: {{return.customerPhone}}
          </p>
        </div>
      </div>

      <table class="items-table">
        <thead>
          <tr class="table-header">
            <th class="col-slno">SL</th>
            <th class="col-item">Item Description</th>
            <th class="col-serial">Serial #</th>
            <th class="col-qty">Return Qty</th>
            <th class="col-rate">Original Price</th>
            <th class="col-condition">Condition</th>
            <th class="col-amount">Refund Amount</th>
          </tr>
        </thead>
        <tbody>
          {{#items}}
          <tr class="item-row">
            <td class="col-slno">{{slNo}}</td>
            <td class="col-item">{{itemName}}</td>
            <td class="col-serial">{{join serialNumbers ', '}}</td>
            <td class="col-qty">{{returnQuantity}}</td>
            <td class="col-rate">{{currency originalPrice decimals=company.decimalPlaces}}</td>
            <td class="col-condition">{{condition}}</td>
            <td class="col-amount">{{currency refundAmount decimals=company.decimalPlaces}}</td>
          </tr>
          {{/items}}
        </tbody>
      </table>

      <div class="totals-section">
        <table class="totals-table">
          <tr>
            <td class="label">Total Refund:</td>
            <td class="value">{{currency return.totalRefund decimals=company.decimalPlaces}}</td>
          </tr>
        </table>
      </div>

      <div class="footer">
        <p class="footer-text">Generated on: {{date now 'DD/MM/YYYY HH:mm:ss'}}</p>
      </div>
    </div>

    <style>
      .sales-return-container { font-family: Arial, sans-serif; padding: 20px; color: #333; }
      .company-info { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #dc2626; padding-bottom: 10px; }
      .company-name { margin: 0; font-size: 18px; font-weight: bold; color: #dc2626; }
      .company-details { margin: 5px 0; font-size: 11px; color: #666; }
      .document-title { margin: 0 0 10px 0; font-size: 24px; color: #dc2626; font-weight: bold; }
      .document-details-table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
      .document-details-table .label { font-weight: bold; width: 40%; font-size: 11px; }
      .returned-by-title { margin: 0 0 8px 0; font-size: 12px; color: #dc2626; font-weight: bold; }
      .customer-name { margin: 0; font-weight: bold; font-size: 12px; }
      .customer-details { margin: 3px 0 0 0; font-size: 10px; color: #666; }
      .items-table { width: 100%; border-collapse: collapse; margin-bottom: 15px; border: 1px solid #ddd; }
      .table-header { background-color: #dc2626; color: white; }
      .table-header th { padding: 8px; text-align: left; font-size: 11px; font-weight: bold; }
      .item-row td { padding: 6px; font-size: 10px; border: 1px solid #ddd; }
      .col-slno { width: 5%; text-align: center; }
      .col-item { width: 30%; }
      .col-serial { width: 15%; }
      .col-qty { width: 10%; text-align: center; }
      .col-rate { width: 12%; text-align: right; }
      .col-condition { width: 12%; text-align: center; }
      .col-amount { width: 16%; text-align: right; font-weight: bold; }
      .totals-table { width: 50%; margin-left: auto; }
      .totals-table .label { text-align: right; padding: 4px 10px; font-size: 11px; }
      .totals-table .value { text-align: right; padding: 4px 10px; font-weight: bold; }
      .footer { margin-top: 30px; text-align: center; border-top: 1px solid #ddd; padding-top: 10px; }
      .footer-text { margin: 3px 0; font-size: 9px; color: #999; }
    </style>
  `,
  cssContent: ''
}
