// Quotation Template - English with Logo
export const QUOTATION_TEMPLATE_EN_WITH_LOGO = {
  templateName: 'Quotation_EN_with_Logo',
  language: 'EN',
  templateType: 'QUOTATION',
  includeLogo: true,
  customDesign: {
    headerColor: '#7c3aed',
    bodyFont: 'Arial',
    showSerialNumbers: false,
    showQrCode: false,
    currency: 'AED',
    pageSize: 'A4'
  },
  htmlContent: `
    <div class="quotation-container">
      {{#withLogo}}
      <div class="header">
        <img src="{{company.logoUrl}}" alt="Logo" class="logo">
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
          <h2 class="document-title">QUOTATION</h2>
          <table class="document-details-table">
            <tr>
              <td class="label">Quotation #:</td>
              <td class="value">{{quotation.quotationNumber}}</td>
            </tr>
            <tr>
              <td class="label">Date:</td>
              <td class="value">{{date quotation.date 'DD/MM/YYYY'}}</td>
            </tr>
            <tr>
              <td class="label">Valid Until:</td>
              <td class="value">{{date quotation.validUntil 'DD/MM/YYYY'}}</td>
            </tr>
            <tr>
              <td class="label">Status:</td>
              <td class="value">{{quotation.status}}</td>
            </tr>
          </table>
        </div>
        <div class="right">
          <h3 class="quote-to-title">QUOTE FOR:</h3>
          <p class="customer-name">{{quotation.customerName}}</p>
          <p class="customer-details">
            {{quotation.customerAddress}}<br>
            Phone: {{quotation.customerPhone}}<br>
            {{#quotation.customerEmail}}Email: {{quotation.customerEmail}}{{/quotation.customerEmail}}
          </p>
        </div>
      </div>

      {{#quotation.notes}}
      <div class="customer-notes">
        <p class="notes-label">Special Requirements / Notes:</p>
        <p class="notes-content">{{quotation.notes}}</p>
      </div>
      {{/quotation.notes}}

      <table class="items-table">
        <thead>
          <tr class="table-header">
            <th class="col-slno">SL</th>
            <th class="col-item">Item Description</th>
            <th class="col-qty">Qty</th>
            <th class="col-unit">Unit</th>
            <th class="col-rate">Unit Price</th>
            <th class="col-discount">Discount</th>
            <th class="col-amount">Amount</th>
          </tr>
        </thead>
        <tbody>
          {{#items}}
          <tr class="item-row">
            <td class="col-slno">{{slNo}}</td>
            <td class="col-item">
              <div class="item-name">{{itemName}}</div>
              {{#description}}<div class="item-description">{{description}}</div>{{/description}}
            </td>
            <td class="col-qty">{{quantity}}</td>
            <td class="col-unit">{{unit}}</td>
            <td class="col-rate">{{currency unitPrice 'AED' 2}}</td>
            <td class="col-discount">{{#discountPercentage}}{{discountPercentage}}%{{/discountPercentage}}{{#discountAmount}}{{currency discountAmount 'AED' 2}}{{/discountAmount}}</td>
            <td class="col-amount">{{currency total 'AED' 2}}</td>
          </tr>
          {{/items}}
        </tbody>
      </table>

      <div class="totals-section">
        <table class="totals-table">
          <tr>
            <td class="label">Subtotal:</td>
            <td class="value">{{currency quotation.subtotal 'AED' 2}}</td>
          </tr>
          {{#quotation.discountAmount}}
          <tr>
            <td class="label">Discount ({{quotation.discountPercentage}}%):</td>
            <td class="value">- {{currency quotation.discountAmount 'AED' 2}}</td>
          </tr>
          {{/quotation.discountAmount}}
          {{#quotation.taxAmount}}
          <tr>
            <td class="label">Tax ({{quotation.taxPercentage}}%):</td>
            <td class="value">+ {{currency quotation.taxAmount 'AED' 2}}</td>
          </tr>
          {{/quotation.taxAmount}}
          <tr class="total-row">
            <td class="label">TOTAL:</td>
            <td class="value">{{currency quotation.totalAmount 'AED' 2}}</td>
          </tr>
        </table>
      </div>

      <div class="terms-section">
        <h4 class="terms-title">Terms & Conditions:</h4>
        <ul class="terms-list">
          <li>This quotation is valid until {{date quotation.validUntil 'DD/MM/YYYY'}}</li>
          <li>Payment terms: {{quotation.paymentTerms}}</li>
          <li>Delivery: {{quotation.deliveryPeriod}}</li>
          {{#quotation.additionalTerms}}
          <li>{{quotation.additionalTerms}}</li>
          {{/quotation.additionalTerms}}
        </ul>
      </div>

      <div class="footer">
        <p class="footer-text">This quotation is for information purposes and does not constitute a binding offer.</p>
        <p class="footer-text">For any queries, please contact us at {{company.email}} or {{company.phone}}</p>
        <p class="footer-text">Generated on: {{date now 'DD/MM/YYYY HH:mm:ss'}}</p>
      </div>
    </div>

    <style>
      .quotation-container { font-family: Arial, sans-serif; padding: 20px; color: #333; }
      .header { text-align: center; margin-bottom: 15px; }
      .logo { max-width: 200px; height: auto; }
      .company-info { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #7c3aed; padding-bottom: 10px; }
      .company-name { margin: 0; font-size: 18px; font-weight: bold; color: #7c3aed; }
      .company-details { margin: 5px 0; font-size: 11px; color: #666; }
      .document-header { display: flex; justify-content: space-between; margin-bottom: 20px; gap: 40px; }
      .document-title { margin: 0 0 10px 0; font-size: 24px; color: #7c3aed; font-weight: bold; }
      .document-details-table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
      .document-details-table tr { vertical-align: top; }
      .document-details-table .label { font-weight: bold; width: 40%; font-size: 11px; }
      .document-details-table .value { font-size: 11px; }
      .quote-to-title { margin: 0 0 8px 0; font-size: 12px; color: #7c3aed; font-weight: bold; }
      .customer-name { margin: 0; font-weight: bold; font-size: 12px; }
      .customer-details { margin: 3px 0 0 0; font-size: 10px; color: #666; }
      .customer-notes { background-color: #f3e8ff; border: 1px solid #ddd6fe; padding: 10px; margin: 15px 0; }
      .notes-label { margin: 0 0 5px 0; font-size: 11px; font-weight: bold; color: #7c3aed; }
      .notes-content { margin: 0; font-size: 10px; }
      .items-table { width: 100%; border-collapse: collapse; margin-bottom: 15px; border: 1px solid #ddd; }
      .table-header { background-color: #7c3aed; color: white; }
      .table-header th { padding: 8px; text-align: left; font-size: 11px; font-weight: bold; border: 1px solid #ccc; }
      .item-row { border-bottom: 1px solid #eee; }
      .item-row td { padding: 6px; font-size: 10px; border: 1px solid #ddd; }
      .col-slno { width: 4%; text-align: center; }
      .col-item { width: 30%; }
      .col-qty { width: 8%; text-align: center; }
      .col-unit { width: 8%; text-align: center; }
      .col-rate { width: 15%; text-align: right; }
      .col-discount { width: 12%; text-align: right; }
      .col-amount { width: 15%; text-align: right; font-weight: bold; }
      .item-name { font-weight: bold; }
      .item-description { font-size: 9px; color: #666; margin-top: 2px; }
      .totals-section { margin: 20px 0; }
      .totals-table { width: 100%; border-collapse: collapse; margin-left: auto; width: 50%; }
      .totals-table tr { vertical-align: top; }
      .totals-table .label { font-size: 11px; padding: 4px 10px; text-align: right; }
      .totals-table .value { font-size: 11px; padding: 4px 10px; text-align: right; font-weight: bold; }
      .total-row { border-top: 2px solid #7c3aed; background-color: #f3e8ff; }
      .total-row .label, .total-row .value { font-size: 12px; font-weight: bold; color: #7c3aed; }
      .terms-section { margin-top: 20px; padding: 10px; background-color: #f5f5f5; border-left: 3px solid #7c3aed; }
      .terms-title { margin: 0 0 8px 0; font-size: 11px; font-weight: bold; color: #7c3aed; }
      .terms-list { margin: 0; padding-left: 20px; font-size: 10px; }
      .terms-list li { margin: 3px 0; }
      .footer { margin-top: 30px; text-align: center; border-top: 1px solid #ddd; padding-top: 10px; }
      .footer-text { margin: 3px 0; font-size: 9px; color: #999; }
    </style>
  `,
  cssContent: ''
}

// Quotation Template - English without Logo
export const QUOTATION_TEMPLATE_EN_WITHOUT_LOGO = {
  templateName: 'Quotation_EN_without_Logo',
  language: 'EN',
  templateType: 'QUOTATION',
  includeLogo: false,
  customDesign: {
    headerColor: '#7c3aed',
    bodyFont: 'Arial',
    showSerialNumbers: false,
    showQrCode: false,
    currency: 'AED',
    pageSize: 'A4'
  },
  htmlContent: `
    <div class="quotation-container">
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
          <h2 class="document-title">QUOTATION</h2>
          <table class="document-details-table">
            <tr>
              <td class="label">Quotation #:</td>
              <td class="value">{{quotation.quotationNumber}}</td>
            </tr>
            <tr>
              <td class="label">Date:</td>
              <td class="value">{{date quotation.date 'DD/MM/YYYY'}}</td>
            </tr>
            <tr>
              <td class="label">Valid Until:</td>
              <td class="value">{{date quotation.validUntil 'DD/MM/YYYY'}}</td>
            </tr>
          </table>
        </div>
        <div class="right">
          <h3 class="quote-to-title">QUOTE FOR:</h3>
          <p class="customer-name">{{quotation.customerName}}</p>
          <p class="customer-details">{{quotation.customerAddress}}<br>Phone: {{quotation.customerPhone}}</p>
        </div>
      </div>

      <table class="items-table">
        <thead>
          <tr class="table-header">
            <th class="col-slno">SL</th>
            <th class="col-item">Item Description</th>
            <th class="col-qty">Qty</th>
            <th class="col-rate">Unit Price</th>
            <th class="col-discount">Discount</th>
            <th class="col-amount">Amount</th>
          </tr>
        </thead>
        <tbody>
          {{#items}}
          <tr class="item-row">
            <td class="col-slno">{{slNo}}</td>
            <td class="col-item">{{itemName}}</td>
            <td class="col-qty">{{quantity}}</td>
            <td class="col-rate">{{currency unitPrice 'AED' 2}}</td>
            <td class="col-discount">{{#discountPercentage}}{{discountPercentage}}%{{/discountPercentage}}</td>
            <td class="col-amount">{{currency total 'AED' 2}}</td>
          </tr>
          {{/items}}
        </tbody>
      </table>

      <div class="totals-section">
        <table class="totals-table">
          <tr>
            <td class="label">Subtotal:</td>
            <td class="value">{{currency quotation.subtotal 'AED' 2}}</td>
          </tr>
          <tr class="total-row">
            <td class="label">TOTAL:</td>
            <td class="value">{{currency quotation.totalAmount 'AED' 2}}</td>
          </tr>
        </table>
      </div>

      <div class="footer">
        <p class="footer-text">Valid until: {{date quotation.validUntil 'DD/MM/YYYY'}}</p>
      </div>
    </div>

    <style>
      .quotation-container { font-family: Arial, sans-serif; padding: 20px; color: #333; }
      .company-info { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #7c3aed; padding-bottom: 10px; }
      .company-name { margin: 0; font-size: 18px; font-weight: bold; color: #7c3aed; }
      .company-details { margin: 5px 0; font-size: 11px; color: #666; }
      .document-title { margin: 0 0 10px 0; font-size: 24px; color: #7c3aed; font-weight: bold; }
      .document-details-table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
      .document-details-table .label { font-weight: bold; width: 40%; font-size: 11px; }
      .items-table { width: 100%; border-collapse: collapse; margin-bottom: 15px; border: 1px solid #ddd; }
      .table-header { background-color: #7c3aed; color: white; }
      .table-header th { padding: 8px; text-align: left; font-size: 11px; font-weight: bold; }
      .item-row td { padding: 6px; font-size: 10px; border: 1px solid #ddd; }
      .col-slno { width: 5%; text-align: center; }
      .col-item { width: 35%; }
      .col-qty { width: 10%; text-align: center; }
      .col-rate { width: 15%; text-align: right; }
      .col-discount { width: 12%; text-align: right; }
      .col-amount { width: 18%; text-align: right; font-weight: bold; }
      .totals-table { width: 50%; margin-left: auto; }
      .totals-table .label { text-align: right; padding: 4px 10px; font-size: 11px; }
      .totals-table .value { text-align: right; padding: 4px 10px; font-weight: bold; }
      .total-row { border-top: 2px solid #7c3aed; background-color: #f3e8ff; }
    </style>
  `,
  cssContent: ''
}
