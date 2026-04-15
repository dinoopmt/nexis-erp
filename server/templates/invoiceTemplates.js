// English Invoice Template with Logo
export const INVOICE_TEMPLATE_EN_WITH_LOGO = {
  templateName: 'Invoice_EN_with_Logo',
  language: 'EN',
  templateType: 'INVOICE',
  includeLogo: true,
  customDesign: {
    headerColor: '#1e40af',
    bodyFont: 'Arial',
    showSerialNumbers: true,
    showQrCode: false,
    currency: 'AED',
    pageSize: 'A4'
  },
  htmlContent: `
    <div class="invoice-container">
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

      <div class="invoice-header">
        <div class="left">
          <h2 class="invoice-title">INVOICE</h2>
          <table class="invoice-details-table">
            <tr>
              <td class="label">Invoice #:</td>
              <td class="value">{{invoice.invoiceNumber}}</td>
            </tr>
            <tr>
              <td class="label">Date:</td>
              <td class="value">{{date invoice.date 'DD/MM/YYYY'}}</td>
            </tr>
            <tr>
              <td class="label">Payment Type:</td>
              <td class="value">{{invoice.paymentType}}</td>
            </tr>
          </table>
        </div>
        <div class="right">
          <h3 class="bill-to-title">BILL TO:</h3>
          <p class="customer-name">{{invoice.customerName}}</p>
          <p class="customer-details">
            {{invoice.customerAddress}}<br>
            Phone: {{invoice.customerPhone}}<br>
            {{#invoice.customerTRN}}Tax ID: {{invoice.customerTRN}}{{/invoice.customerTRN}}
          </p>
        </div>
      </div>

      <table class="items-table">
        <thead>
          <tr class="table-header">
            <th class="col-slno">SL</th>
            <th class="col-item">Item Description</th>
            <th class="col-serial">Serial #</th>
            <th class="col-qty">Qty</th>
            <th class="col-rate">Rate</th>
            <th class="col-discount">Disc %</th>
            <th class="col-amount">Amount</th>
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
            <td class="col-rate">{{unitPrice}}</td>
            <td class="col-discount">{{discountPercentage}}%</td>
            <td class="col-amount">{{total}}</td>
          </tr>
          {{/items}}
        </tbody>
      </table>

      <div class="totals-section">
        <table class="totals-table">
          <tr>
            <td class="label">Subtotal:</td>
            <td class="value">{{invoice.subtotal}}</td>
          </tr>
          <tr>
            <td class="label">Discount ({{invoice.discountPercentage}}%):</td>
            <td class="value">- {{invoice.discountAmount}}</td>
          </tr>
          <tr>
            <td class="label">Total After Discount:</td>
            <td class="value">{{invoice.totalAfterDiscount}}</td>
          </tr>
          <tr>
            <td class="label">VAT ({{invoice.vatPercentage}}%):</td>
            <td class="value">{{invoice.vatAmount}}</td>
          </tr>
          <tr class="total-row">
            <td class="label">TOTAL:</td>
            <td class="value">{{invoice.totalIncludeVat}}</td>
          </tr>
        </table>
      </div>

      {{#invoice.notes}}
      <div class="notes-section">
        <h4>Notes:</h4>
        <p>{{invoice.notes}}</p>
      </div>
      {{/invoice.notes}}

      <div class="footer">
        <p>Thank you for your business!</p>
      </div>
    </div>
  `,
  cssContent: `
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: Arial, sans-serif;
      font-size: 11px;
      color: #333;
      line-height: 1.4;
    }

    .invoice-container {
      width: 100%;
      padding: 20px;
      background: white;
    }

    .header {
      text-align: center;
      margin-bottom: 20px;
    }

    .logo {
      max-width: 120px;
      height: auto;
    }

    .company-info {
      text-align: center;
      margin-bottom: 20px;
      border-bottom: 2px solid #1e40af;
      padding-bottom: 15px;
    }

    .company-name {
      font-size: 18px;
      font-weight: bold;
      color: #1e40af;
      margin-bottom: 5px;
    }

    .company-details {
      font-size: 10px;
      color: #666;
    }

    .invoice-header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 30px;
      gap: 40px;
    }

    .invoice-title {
      font-size: 24px;
      font-weight: bold;
      color: #1e40af;
      margin-bottom: 10px;
    }

    .invoice-details-table {
      width: 100%;
      border-collapse: collapse;
    }

    .invoice-details-table td.label {
      font-weight: bold;
      width: 40%;
    }

    .bill-to-title {
      font-weight: bold;
      margin-bottom: 5px;
      font-size: 12px;
    }

    .customer-name {
      font-weight: bold;
      margin-bottom: 5px;
    }

    .customer-details {
      font-size: 10px;
      color: #666;
    }

    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }

    .table-header {
      background-color: #1e40af;
      color: white;
    }

    .items-table th {
      padding: 8px;
      text-align: left;
      font-weight: bold;
      border-bottom: 1px solid #1e40af;
    }

    .items-table td {
      padding: 8px;
      border-bottom: 1px solid #ddd;
    }

    .col-slno { width: 5%; }
    .col-item { width: 25%; }
    .col-serial { width: 15%; }
    .col-qty { width: 8%; text-align: center; }
    .col-rate { width: 12%; text-align: right; }
    .col-discount { width: 10%; text-align: center; }
    .col-amount { width: 12%; text-align: right; font-weight: bold; }

    .item-note {
      font-size: 9px;
      color: #ff6b6b;
      font-style: italic;
      margin-top: 3px;
    }

    .totals-section {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 30px;
    }

    .totals-table {
      width: 300px;
      border-collapse: collapse;
    }

    .totals-table tr {
      border-bottom: 1px solid #ddd;
    }

    .totals-table td.label {
      padding: 8px;
      text-align: left;
      font-weight: bold;
      width: 60%;
    }

    .totals-table td.value {
      padding: 8px;
      text-align: right;
      font-weight: bold;
    }

    .total-row {
      background-color: #f0f0f0;
      font-size: 13px;
      border-top: 2px solid #1e40af;
    }

    .notes-section {
      background-color: #f9f9f9;
      padding: 10px;
      border-left: 3px solid #1e40af;
      margin-bottom: 20px;
    }

    .notes-section h4 {
      font-weight: bold;
      margin-bottom: 5px;
    }

    .footer {
      text-align: center;
      padding-top: 20px;
      border-top: 1px solid #ddd;
      font-size: 10px;
      color: #888;
    }

    @media print {
      body {
        margin: 0;
        padding: 0;
      }
      .invoice-container {
        padding: 0;
      }
    }
  `
};

// Arabic Invoice Template with Logo
export const INVOICE_TEMPLATE_AR_WITH_LOGO = {
  templateName: 'Invoice_AR_with_Logo',
  language: 'AR',
  templateType: 'INVOICE',
  includeLogo: true,
  customDesign: {
    headerColor: '#1e40af',
    bodyFont: 'Arial',
    showSerialNumbers: true,
    showQrCode: false,
    currency: 'د.إ',
    pageSize: 'A4'
  },
  htmlContent: `
    <div class="invoice-container" style="direction: rtl; text-align: right;">
      {{#withLogo}}
      <div class="header">
        <img src="{{company.logoUrl}}" alt="الشعار" class="logo">
      </div>
      {{/withLogo}}

      <div class="company-info">
        <h1 class="company-name">{{company.companyName}}</h1>
        <p class="company-details">
          {{company.address}}<br>
          {{company.city}}, {{company.state}} {{company.country}}<br>
          البريد الإلكتروني: {{company.email}} | الهاتف: {{company.phone}}<br>
          معرف الضريبة: {{company.taxId}}
        </p>
      </div>

      <div class="invoice-header">
        <div class="right">
          <h2 class="invoice-title">الفاتورة</h2>
          <table class="invoice-details-table">
            <tr>
              <td class="label">رقم الفاتورة:</td>
              <td class="value">{{invoice.invoiceNumber}}</td>
            </tr>
            <tr>
              <td class="label">التاريخ:</td>
              <td class="value">{{date invoice.date 'DD/MM/YYYY'}}</td>
            </tr>
            <tr>
              <td class="label">نوع الدفع:</td>
              <td class="value">{{invoice.paymentType}}</td>
            </tr>
          </table>
        </div>
        <div class="left">
          <h3 class="bill-to-title">الفاتورة إلى:</h3>
          <p class="customer-name">{{invoice.customerName}}</p>
          <p class="customer-details">
            {{invoice.customerAddress}}<br>
            الهاتف: {{invoice.customerPhone}}<br>
            {{#invoice.customerTRN}}معرف الضريبة: {{invoice.customerTRN}}{{/invoice.customerTRN}}
          </p>
        </div>
      </div>

      <table class="items-table">
        <thead>
          <tr class="table-header">
            <th class="col-slno">م</th>
            <th class="col-item">وصف المنتج</th>
            <th class="col-serial">رقم الدفعة</th>
            <th class="col-qty">الكمية</th>
            <th class="col-rate">السعر</th>
            <th class="col-discount">خصم %</th>
            <th class="col-amount">المبلغ</th>
          </tr>
        </thead>
        <tbody>
          {{#items}}
          <tr class="item-row">
            <td class="col-slno">{{slNo}}</td>
            <td class="col-item">
              <div class="item-name">{{itemName}}</div>
              {{#note}}<div class="item-note">ملاحظة: {{note}}</div>{{/note}}
            </td>
            <td class="col-serial">{{join serialNumbers ', '}}</td>
            <td class="col-qty">{{quantity}}</td>
            <td class="col-rate">{{unitPrice}}</td>
            <td class="col-discount">{{discountPercentage}}%</td>
            <td class="col-amount">{{total}}</td>
          </tr>
          {{/items}}
        </tbody>
      </table>

      <div class="totals-section">
        <table class="totals-table">
          <tr>
            <td class="label">الإجمالي الفرعي:</td>
            <td class="value">{{invoice.subtotal}}</td>
          </tr>
          <tr>
            <td class="label">الخصم ({{invoice.discountPercentage}}%):</td>
            <td class="value">- {{invoice.discountAmount}}</td>
          </tr>
          <tr>
            <td class="label">الإجمالي بعد الخصم:</td>
            <td class="value">{{invoice.totalAfterDiscount}}</td>
          </tr>
          <tr>
            <td class="label">الضريبة ({{invoice.vatPercentage}}%):</td>
            <td class="value">{{invoice.vatAmount}}</td>
          </tr>
          <tr class="total-row">
            <td class="label">الإجمالي:</td>
            <td class="value">{{invoice.totalIncludeVat}}</td>
          </tr>
        </table>
      </div>

      {{#invoice.notes}}
      <div class="notes-section">
        <h4>الملاحظات:</h4>
        <p>{{invoice.notes}}</p>
      </div>
      {{/invoice.notes}}

      <div class="footer">
        <p>شكراً لك على تعاملك معنا!</p>
      </div>
    </div>
  `,
  cssContent: `
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: Arial, sans-serif;
      font-size: 11px;
      color: #333;
      line-height: 1.4;
    }

    .invoice-container {
      width: 100%;
      padding: 20px;
      background: white;
    }

    .header {
      text-align: center;
      margin-bottom: 20px;
    }

    .logo {
      max-width: 120px;
      height: auto;
    }

    .company-info {
      text-align: center;
      margin-bottom: 20px;
      border-bottom: 2px solid #1e40af;
      padding-bottom: 15px;
    }

    .company-name {
      font-size: 18px;
      font-weight: bold;
      color: #1e40af;
      margin-bottom: 5px;
    }

    .company-details {
      font-size: 10px;
      color: #666;
    }

    .invoice-header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 30px;
      gap: 40px;
    }

    .invoice-title {
      font-size: 24px;
      font-weight: bold;
      color: #1e40af;
      margin-bottom: 10px;
    }

    .invoice-details-table {
      width: 100%;
      border-collapse: collapse;
    }

    .invoice-details-table td.label {
      font-weight: bold;
      width: 40%;
    }

    .bill-to-title {
      font-weight: bold;
      margin-bottom: 5px;
      font-size: 12px;
    }

    .customer-name {
      font-weight: bold;
      margin-bottom: 5px;
    }

    .customer-details {
      font-size: 10px;
      color: #666;
    }

    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }

    .table-header {
      background-color: #1e40af;
      color: white;
    }

    .items-table th {
      padding: 8px;
      text-align: right;
      font-weight: bold;
      border-bottom: 1px solid #1e40af;
    }

    .items-table td {
      padding: 8px;
      border-bottom: 1px solid #ddd;
      text-align: right;
    }

    .col-slno { width: 5%; }
    .col-item { width: 25%; }
    .col-serial { width: 15%; }
    .col-qty { width: 8%; }
    .col-rate { width: 12%; }
    .col-discount { width: 10%; }
    .col-amount { width: 12%; font-weight: bold; }

    .item-note {
      font-size: 9px;
      color: #ff6b6b;
      font-style: italic;
      margin-top: 3px;
    }

    .totals-section {
      display: flex;
      justify-content: flex-start;
      margin-bottom: 30px;
    }

    .totals-table {
      width: 300px;
      border-collapse: collapse;
    }

    .totals-table tr {
      border-bottom: 1px solid #ddd;
    }

    .totals-table td.label {
      padding: 8px;
      text-align: right;
      font-weight: bold;
      width: 60%;
    }

    .totals-table td.value {
      padding: 8px;
      text-align: left;
      font-weight: bold;
    }

    .total-row {
      background-color: #f0f0f0;
      font-size: 13px;
      border-top: 2px solid #1e40af;
    }

    .notes-section {
      background-color: #f9f9f9;
      padding: 10px;
      border-right: 3px solid #1e40af;
      margin-bottom: 20px;
    }

    .notes-section h4 {
      font-weight: bold;
      margin-bottom: 5px;
    }

    .footer {
      text-align: center;
      padding-top: 20px;
      border-top: 1px solid #ddd;
      font-size: 10px;
      color: #888;
    }

    @media print {
      body {
        margin: 0;
        padding: 0;
      }
      .invoice-container {
        padding: 0;
      }
    }
  `
};
