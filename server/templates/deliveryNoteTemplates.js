// Delivery Note Template - English with Logo
export const DELIVERY_NOTE_TEMPLATE_EN_WITH_LOGO = {
  templateName: 'DeliveryNote_EN_with_Logo',
  language: 'EN',
  templateType: 'DELIVERY_NOTE',
  includeLogo: true,
  customDesign: {
    headerColor: '#059669',
    bodyFont: 'Arial',
    showSerialNumbers: true,
    showQrCode: false,
    currency: 'AED',
    pageSize: 'A4'
  },
  htmlContent: `
    <div class="delivery-note-container">
      {{#withLogo}}
      <div class="header">
        <img src="{{company.logoUrl}}" alt="Logo" class="logo">
      </div>
      {{/withLogo}}

      <div class="company-info">
        <h1 class="company-name">{{company.companyName}}</h1>
        <p class="company-details">
          {{company.address1}}<br>
          {{company.address2}}<br>
          Email: {{company.email}} | Phone: {{company.phone}}
        </p>
      </div>

      <div class="document-header">
        <div class="left">
          <h2 class="document-title">DELIVERY NOTE</h2>
          <table class="document-details-table">
            <tr>
              <td class="label">Delivery Note #:</td>
              <td class="value">{{deliveryNote.deliveryNoteNumber}}</td>
            </tr>
            <tr>
              <td class="label">Date:</td>
              <td class="value">{{date deliveryNote.date 'DD/MM/YYYY'}}</td>
            </tr>
            <tr>
              <td class="label">Reference Invoice:</td>
              <td class="value">{{deliveryNote.referenceInvoice}}</td>
            </tr>
          </table>
        </div>
        <div class="right">
          <h3 class="deliver-to-title">DELIVER TO:</h3>
          <p class="customer-name">{{deliveryNote.customerName}}</p>
          <p class="customer-details">
            {{deliveryNote.customerAddress}}<br>
            Phone: {{deliveryNote.customerPhone}}<br>
            {{#deliveryNote.customerLocation}}Location: {{deliveryNote.customerLocation}}{{/deliveryNote.customerLocation}}
          </p>
        </div>
      </div>

      <table class="items-table">
        <thead>
          <tr class="table-header">
            <th class="col-slno">SL</th>
            <th class="col-item">Item Description</th>
            <th class="col-serial">Serial #</th>
            <th class="col-qty">Qty Delivered</th>
            <th class="col-unit">Unit</th>
            <th class="col-batch">Batch/Lot #</th>
          </tr>
        </thead>
        <tbody>
          {{#items}}
          <tr class="item-row">
            <td class="col-slno">{{slNo}}</td>
            <td class="col-item">
              <div class="item-name">{{itemName}}</div>
              {{#note}}<div class="item-note">Note: {{note}}</div>{{/note}}
            </td>
            <td class="col-serial">{{join serialNumbers ', '}}</td>
            <td class="col-qty">{{quantity}}</td>
            <td class="col-unit">{{unit}}</td>
            <td class="col-batch">{{batchNumber}}</td>
          </tr>
          {{/items}}
        </tbody>
      </table>

      <div class="summary-section">
        <p class="total-items">Total Items: <strong>{{deliveryNote.totalItems}}</strong></p>
      </div>

      <div class="signature-section">
        <table class="signature-table">
          <tr>
            <td class="sig-field">
              <p class="sig-label">Prepared By:</p>
              <div class="sig-line"></div>
              <p class="sig-name">{{deliveryNote.preparedBy}}</p>
            </td>
            <td class="sig-field">
              <p class="sig-label">Approved By:</p>
              <div class="sig-line"></div>
              <p class="sig-name">{{deliveryNote.approvedBy}}</p>
            </td>
            <td class="sig-field">
              <p class="sig-label">Received By:</p>
              <div class="sig-line"></div>
              <p class="sig-date">Date: ___________</p>
            </td>
          </tr>
        </table>
      </div>

      <div class="footer">
        <p class="footer-text">This is a computer-generated document. No signature is required.</p>
        <p class="footer-text">Generated on: {{date now 'DD/MM/YYYY HH:mm:ss'}}</p>
      </div>
    </div>

    <style>
      .delivery-note-container {
        font-family: Arial, sans-serif;
        padding: 20px;
        color: #333;
      }
      .header {
        text-align: center;
        margin-bottom: 15px;
      }
      .logo {
        max-width: 200px;
        height: auto;
      }
      .company-info {
        text-align: center;
        margin-bottom: 20px;
        border-bottom: 2px solid #059669;
        padding-bottom: 10px;
      }
      .company-name {
        margin: 0;
        font-size: 18px;
        font-weight: bold;
        color: #059669;
      }
      .company-details {
        margin: 5px 0;
        font-size: 11px;
        color: #666;
      }
      .document-header {
        display: flex;
        justify-content: space-between;
        margin-bottom: 20px;
        gap: 40px;
      }
      .document-title {
        margin: 0 0 10px 0;
        font-size: 24px;
        color: #059669;
        font-weight: bold;
      }
      .document-details-table, .signature-table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 10px;
      }
      .document-details-table tr, .signature-table tr {
        vertical-align: top;
      }
      .document-details-table .label {
        font-weight: bold;
        width: 40%;
        font-size: 11px;
      }
      .document-details-table .value {
        font-size: 11px;
      }
      .deliver-to-title {
        margin: 0 0 8px 0;
        font-size: 12px;
        color: #059669;
        font-weight: bold;
      }
      .customer-name {
        margin: 0;
        font-weight: bold;
        font-size: 12px;
      }
      .customer-details {
        margin: 3px 0 0 0;
        font-size: 10px;
        color: #666;
      }
      .items-table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 15px;
        border: 1px solid #ddd;
      }
      .table-header {
        background-color: #059669;
        color: white;
      }
      .table-header th {
        padding: 8px;
        text-align: left;
        font-size: 11px;
        font-weight: bold;
        border: 1px solid #ccc;
      }
      .item-row {
        border-bottom: 1px solid #eee;
      }
      .item-row td {
        padding: 6px;
        font-size: 10px;
        border: 1px solid #ddd;
      }
      .col-slno { width: 4%; text-align: center; }
      .col-item { width: 35%; }
      .col-serial { width: 15%; }
      .col-qty { width: 10%; text-align: center; }
      .col-unit { width: 10%; text-align: center; }
      .col-batch { width: 15%; }
      .item-name { font-weight: bold; }
      .item-note { font-size: 9px; color: #666; margin-top: 2px; }
      .summary-section {
        text-align: right;
        margin-bottom: 20px;
        font-size: 11px;
      }
      .total-items {
        margin: 5px 0;
      }
      .signature-section {
        margin-top: 30px;
      }
      .sig-field {
        width: 33%;
        text-align: center;
        padding: 10px;
      }
      .sig-label {
        margin: 0 0 30px 0;
        font-size: 11px;
        font-weight: bold;
      }
      .sig-line {
        border-bottom: 1px solid #333;
        height: 30px;
      }
      .sig-name, .sig-date {
        margin: 5px 0 0 0;
        font-size: 10px;
      }
      .footer {
        margin-top: 30px;
        text-align: center;
        border-top: 1px solid #ddd;
        padding-top: 10px;
      }
      .footer-text {
        margin: 3px 0;
        font-size: 9px;
        color: #999;
      }
    </style>
  `,
  cssContent: ''
}

// Delivery Note Template - English without Logo
export const DELIVERY_NOTE_TEMPLATE_EN_WITHOUT_LOGO = {
  templateName: 'DeliveryNote_EN_without_Logo',
  language: 'EN',
  templateType: 'DELIVERY_NOTE',
  includeLogo: false,
  customDesign: {
    headerColor: '#059669',
    bodyFont: 'Arial',
    showSerialNumbers: true,
    showQrCode: false,
    currency: 'AED',
    pageSize: 'A4'
  },
  htmlContent: `
    <div class="delivery-note-container">
      <div class="company-info">
        <h1 class="company-name">{{company.companyName}}</h1>
        <p class="company-details">
          {{company.address1}}<br>
          {{company.address2}}<br>
          Email: {{company.email}} | Phone: {{company.phone}}
        </p>
      </div>

      <div class="document-header">
        <div class="left">
          <h2 class="document-title">DELIVERY NOTE</h2>
          <table class="document-details-table">
            <tr>
              <td class="label">Delivery Note #:</td>
              <td class="value">{{deliveryNote.deliveryNoteNumber}}</td>
            </tr>
            <tr>
              <td class="label">Date:</td>
              <td class="value">{{date deliveryNote.date 'DD/MM/YYYY'}}</td>
            </tr>
            <tr>
              <td class="label">Reference Invoice:</td>
              <td class="value">{{deliveryNote.referenceInvoice}}</td>
            </tr>
          </table>
        </div>
        <div class="right">
          <h3 class="deliver-to-title">DELIVER TO:</h3>
          <p class="customer-name">{{deliveryNote.customerName}}</p>
          <p class="customer-details">
            {{deliveryNote.customerAddress}}<br>
            Phone: {{deliveryNote.customerPhone}}
          </p>
        </div>
      </div>

      <table class="items-table">
        <thead>
          <tr class="table-header">
            <th class="col-slno">SL</th>
            <th class="col-item">Item Description</th>
            <th class="col-serial">Serial #</th>
            <th class="col-qty">Qty Delivered</th>
            <th class="col-unit">Unit</th>
            <th class="col-batch">Batch/Lot #</th>
          </tr>
        </thead>
        <tbody>
          {{#items}}
          <tr class="item-row">
            <td class="col-slno">{{slNo}}</td>
            <td class="col-item">{{itemName}}</td>
            <td class="col-serial">{{join serialNumbers ', '}}</td>
            <td class="col-qty">{{quantity}}</td>
            <td class="col-unit">{{unit}}</td>
            <td class="col-batch">{{batchNumber}}</td>
          </tr>
          {{/items}}
        </tbody>
      </table>

      <div class="footer">
        <p class="footer-text">Generated on: {{date now 'DD/MM/YYYY HH:mm:ss'}}</p>
      </div>
    </div>

    <style>
      .delivery-note-container { font-family: Arial, sans-serif; padding: 20px; color: #333; }
      .company-info { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #059669; padding-bottom: 10px; }
      .company-name { margin: 0; font-size: 18px; font-weight: bold; color: #059669; }
      .company-details { margin: 5px 0; font-size: 11px; color: #666; }
      .document-title { margin: 0 0 10px 0; font-size: 24px; color: #059669; font-weight: bold; }
      .document-details-table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
      .document-details-table .label { font-weight: bold; width: 40%; font-size: 11px; }
      .items-table { width: 100%; border-collapse: collapse; margin-bottom: 15px; border: 1px solid #ddd; }
      .table-header { background-color: #059669; color: white; }
      .table-header th { padding: 8px; text-align: left; font-size: 11px; font-weight: bold; border: 1px solid #ccc; }
      .item-row td { padding: 6px; font-size: 10px; border: 1px solid #ddd; }
      .col-slno { width: 4%; text-align: center; }
      .col-item { width: 40%; }
      .col-serial { width: 15%; }
      .col-qty { width: 10%; text-align: center; }
      .col-unit { width: 10%; text-align: center; }
      .col-batch { width: 15%; }
    </style>
  `,
  cssContent: ''
}
