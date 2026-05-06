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
    <div class="invoice-container preview-mode">
      <!-- DYNAMIC PAGINATION - Each page is complete A4 -->
      {{#pages}}
      <div class="page-wrapper">

        <!-- ========== PAGE HEADER (REPEATS) ========== -->
        <header class="page-header">
          <!-- Logo and Company Info (Always Show) -->
          <div class="header-section">
            {{#if @root.store.logoUrl}}
            <img src="{{@root.store.logoUrl}}" alt="Logo" class="company-logo">
            {{/if}}
            <div class="company-header-info">
              <h1 class="company-title">{{@root.store.storeName}}</h1>
              <p class="company-subtitle">{{@root.store.address1}}{{#if @root.store.address2}} | {{@root.store.address2}}{{/if}}</p>
              {{#if @root.company.email}}<p class="company-contact">Email: {{@root.company.email}}</p>{{/if}}
              {{#if @root.company.phone}}<p class="company-contact">Phone: {{@root.company.phone}}</p>{{/if}}
              {{#if @root.company.taxId}}<p class="company-contact">Tax ID: {{@root.company.taxId}}</p>{{/if}}
            </div>
          </div>

          <div class="document-header">
            <h2 class="document-type">TAX INVOICE</h2>
            <div class="document-ref">
              <span class="invoice-no">Invoice # {{@root.invoice.invoiceNumber}}</span>
              <span class="invoice-date">Date: {{date @root.invoice.date 'DD/MM/YYYY'}}</span>
            </div>
          </div>

          <!-- Address Section -->
          <div class="address-section">
            <div class="bill-to-box">
              <h4 class="box-title">BILL TO:</h4>
              <p class="party-name">{{@root.invoice.customerName}}</p>
              <p class="party-address">{{#if @root.invoice.customerAddress}}{{@root.invoice.customerAddress}}{{/if}}</p>
              {{#if @root.invoice.customerTRN}}
              <p class="party-trn">TRN/GST: {{@root.invoice.customerTRN}}</p>
              {{/if}}
              {{#if @root.invoice.customerPhone}}
              <p class="party-contact">Phone: {{@root.invoice.customerPhone}}</p>
              {{/if}}
            </div>

            <div class="ship-to-box">
              <h4 class="box-title">SHIP TO:</h4>
              <p class="party-name">{{@root.invoice.customerName}}</p>
              <p class="party-address">{{#if @root.invoice.customerAddress}}{{@root.invoice.customerAddress}}{{/if}}</p>
            </div>

            <div class="inv-terms-box">
              <table class="terms-table">
                <tr>
                  <td class="term-label">Payment Terms:</td>
                  <td class="term-value">{{@root.invoice.paymentType}}</td>
                </tr>
                <tr>
                  <td class="term-label">Due Date:</td>
                  <td class="term-value">{{#if @root.invoice.dueDate}}{{date @root.invoice.dueDate 'DD/MM/YYYY'}}{{else}}As per terms{{/if}}</td>
                </tr>
              </table>
            </div>
          </div>
        </header>

        <!-- ========== PAGE BODY (FLEX CONTAINER) ========== -->
        <main class="page-body">
          <!-- Items Table -->
          <table class="items-table">
            <thead>
              <tr class="table-header">
                <th class="col-sl">Sl</th>
                <th class="col-item-desc">Item Description</th>
                <th class="col-hsn">HSN/SAC</th>
                <th class="col-qty">Qty</th>
                <th class="col-unit">Unit</th>
                <th class="col-rate">Rate</th>
                <th class="col-per">%</th>
                <th class="col-amount">Amount</th>
              </tr>

              <!-- BROUGHT FORWARD (on non-first pages) -->
              {{#unless isFirstPage}}
              <tr class="brought-forward-row">
                <td colspan="7" style="text-align: right; font-weight: bold; padding: 6px 4px;">Brought Forward:</td>
                <td class="col-amount" style="font-weight: bold; background: #f5f5f5;">{{formatNumber broughtForward 2}}</td>
              </tr>
              {{/unless}}
            </thead>

            <tbody>
              {{#items}}
              <tr class="item-row">
                <td class="col-sl">{{this.slNo}}</td>
                <td class="col-item-desc">
                  <div class="item-description">{{itemName}}</div>
                  {{#if serialNumbers}}<div class="item-meta">S/N: {{join serialNumbers ', '}}</div>{{/if}}
                </td>
                <td class="col-hsn">{{#if itemCode}}{{itemCode}}{{else}}-{{/if}}</td>
                <td class="col-qty">{{quantity}}</td>
                <td class="col-unit">{{unit}}</td>
                <td class="col-rate">{{formatNumber unitPrice 2}}</td>
                <td class="col-per">{{#if discountPercentage}}{{discountPercentage}}%{{else}}-{{/if}}</td>
                <td class="col-amount">{{formatNumber total 2}}</td>
              </tr>
              {{/items}}
            </tbody>

            <tfoot>
              <!-- CARRY FORWARD (on non-last pages) -->
              {{#unless isLastPage}}
              <tr class="carry-forward-row">
                <td colspan="7" style="text-align: right; font-weight: bold; padding: 6px 4px;">Carry Forward:</td>
                <td class="col-amount" style="font-weight: bold; background: #f5f5f5;">{{formatNumber carryForward 2}}</td>
              </tr>
              {{/unless}}

              <!-- FINAL TOTAL (on last page only) -->
              {{#if isLastPage}}
              <tr class="final-total-row">
                <td colspan="7" style="text-align: right; font-weight: bold; padding: 8px 4px; border-top: 2px solid #000;">TOTAL:</td>
                <td class="col-amount" style="font-weight: bold; background: #f0f0f0; border-top: 2px solid #000; border-bottom: 2px solid #000; padding: 8px 4px;">{{formatNumber @root.invoice.totalIncludeVat 2}}</td>
              </tr>
              {{/if}}
            </tfoot>
          </table>

          <!-- SUMMARY (LAST PAGE ONLY) -->
          {{#if isLastPage}}
          <section class="summary-section">
            <div class="summary-left">
              {{#if @root.invoice.notes}}
              <div class="notes-box">
                <h4 class="box-title">Notes:</h4>
                <p class="notes-content">{{@root.invoice.notes}}</p>
              </div>
              {{/if}}

              <div class="terms-box">
                <h4 class="box-title">Terms & Conditions:</h4>
                <ol class="terms-list">
                  <li>Payment should be made within due date</li>
                  <li>Goods sold are not returnable unless defective</li>
                  <li>Subject to jurisdiction of our state only</li>
                </ol>
              </div>
            </div>

            <div class="summary-right">
              <table class="totals-table">
                <tbody>
                  {{#if @root.invoice.subtotal}}
                  <tr class="subtotal-row">
                    <td class="total-label">Subtotal:</td>
                    <td class="total-value">{{formatNumber @root.invoice.subtotal 2}}</td>
                  </tr>
                  {{/if}}

                  {{#if @root.invoice.discountAmount}}
                  <tr class="discount-row">
                    <td class="total-label">Discount:</td>
                    <td class="total-value">-{{formatNumber @root.invoice.discountAmount 2}}</td>
                  </tr>
                  {{/if}}

                  {{#if @root.invoice.vatAmount}}
                  <tr class="tax-row">
                    <td class="total-label">Tax ({{@root.invoice.vatPercentage}}%):</td>
                    <td class="total-value">{{formatNumber @root.invoice.vatAmount 2}}</td>
                  </tr>
                  {{/if}}

                  {{#if @root.invoice.totalIncludeVat}}
                  <tr class="final-total">
                    <td class="total-label">TOTAL:</td>
                    <td class="total-value">{{formatNumber @root.invoice.totalIncludeVat 2}}</td>
                  </tr>
                  {{/if}}
                </tbody>
              </table>
            </div>
          </section>
          {{/if}}
        </main>

        <!-- ========== PAGE FOOTER (REPEATS) ========== -->
        <footer class="page-footer">
          <div class="footer-content">
            <div class="footer-left">
              <h5 class="footer-title">Authorized By:</h5>
              <div class="signature-box">
                <p class="signature-line">_______________</p>
                <p class="signature-name">Name & Signature</p>
              </div>
            </div>

            <div class="footer-center">
            </div>

            <div class="footer-right">
              <h5 class="footer-title">Company Seal</h5>
              <div class="seal-box">
                <p class="seal-placeholder">[Seal]</p>
              </div>
            </div>
          </div>

          <div class="page-break-marker">
            <p class="page-note">{{#if pageNumber}}Page {{pageNumber}} of {{totalPages}}{{else}}Page of{{/if}} | This is a computer-generated invoice. No signature required.</p>
          </div>
        </footer>

      </div>
      {{/pages}}
    </div>
  `,
  cssContent: `
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    @page {
      size: A4;
      margin: 10mm;
    }

    html, body {
      width: 100%;
      margin: 0;
      padding: 0;
      font-family: 'Segoe UI', Arial, sans-serif;
    }

    body {
      font-size: 10px;
      color: #333;
      line-height: 1.3;
      background: white;
    }

    .invoice-container {
      width: 100%;
      background: white;
      display: block;
    }

    /* ========== PERFECT A4 FLEX LAYOUT ========== */
    .page-wrapper {
      min-height: 277mm;
      height: auto;
      display: flex;
      flex-direction: column;
      margin: 10px auto;
      page-break-after: always;
      page-break-inside: avoid;
    }

    .page-wrapper:last-child {
      page-break-after: auto;
    }

    /* ========== PAGE HEADER (No Shrink) ========== */
    .page-header {
      flex: 0 0 auto;
      padding-bottom: 10px;
      page-break-inside: avoid;
    }

    .header-section {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 8px;
      gap: 20px;
    }

    .company-logo {
      max-width: 80px;
      height: auto;
    }

    .company-header-info {
      flex: 1;
      text-align: center;
    }

    .company-title {
      font-size: 16px;
      font-weight: bold;
      color: #000;
      margin: 0 0 3px 0;
    }

    .company-subtitle {
      font-size: 9px;
      color: #000;
      margin: 0;
    }

    .company-contact {
      font-size: 8px;
      color: #000;
      margin: 2px 0 0 0;
    }

    .document-header {
      text-align: center;
      margin: 8px 0;
    }

    .document-type {
      font-size: 18px;
      font-weight: bold;
      color: #000;
      margin: 0 0 4px 0;
      letter-spacing: 1px;
    }

    .document-ref {
      display: flex;
      justify-content: center;
      gap: 30px;
      font-size: 9px;
      color: #050505;
    }

    .invoice-no, .invoice-date {
      font-weight: 600;
    }

    /* ========== ADDRESS SECTION ========== */
    .address-section {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 12px;
      margin-bottom: 12px;
      page-break-inside: avoid;
    }

    .bill-to-box,
    .ship-to-box,
    .inv-terms-box {
      border: 1px solid #000;
      padding: 8px;
      font-size: 9px;
    }

    .box-title {
      font-weight: bold;
      font-size: 9px;
      margin: 0 0 4px 0;
      border-bottom: 1px solid #000;
      padding-bottom: 3px;
      color: #000;
    }

    .party-name {
      font-weight: bold;
      font-size: 10px;
      margin: 2px 0;
    }

    .party-address {
      font-size: 8px;
      color: #070707;
      margin: 2px 0;
      line-height: 1.2;
    }

    .party-trn,
    .party-contact {
      font-size: 8px;
      margin: 2px 0;
      color: #080808;
    }

    .terms-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 9px;
    }

    .terms-table tr {
      border: none;
    }

    .terms-table td {
      padding: 2px 4px;
      border: none;
    }

    .term-label {
      font-weight: bold;
      width: 50%;
      border-bottom: 1px solid #e0e0e0;
    }

    /* ========== PAGE BODY (Flex: 1 = TAKES ALL SPACE) ========== */
    .page-body {
      flex: 1 1 auto;
      display: flex;
      flex-direction: column;
      overflow: visible;
    }

    /* ========== ITEMS TABLE (EXPANDS TO FILL AVAILABLE SPACE) ========== */
    .items-table {
      width: 100%;
      border-collapse: collapse;
      border: 1px solid #000;
      flex: 1 1 auto;  /* Expands to fill available space in flex container */
      table-layout: fixed;
      display: table;  /* Keep as table, not flex */
    }

    /* Table header stays fixed */
    .items-table thead {
      display: table-header-group;
      page-break-after: avoid;
    }

    /* Table body rows stretch to fill available space */
    .items-table tbody {
      display: table-row-group;
    }

    /* Make body rows expand to fill table height */
    .items-table tbody tr {
      page-break-inside: avoid;
      height: auto;  /* Rows take natural height, but expand if needed */
    }

    /* Table footer stays at natural height */
    .items-table tfoot {
      display: table-footer-group;
    }

    .items-table th {
      background-color: #f5f5f5;
      border: 1px solid #000;
      padding: 6px 4px;
      text-align: center;
      font-weight: bold;
      font-size: 9px;
      color: #000;
      vertical-align: middle;
    }

    .items-table td {
      border: 1px solid #e0e0e0;
      padding: 6px 4px;
      font-size: 9px;
      vertical-align: top;
    }

    .items-table tr {
      page-break-inside: avoid;
    }

    .col-sl { width: 4%; text-align: center; }
    .col-item-desc { width: 30%; text-align: left; word-break: break-word; white-space: normal; }
    .col-hsn { width: 8%; text-align: center; }
    .col-qty { width: 7%; text-align: center; }
    .col-unit { width: 8%; text-align: center; }
    .col-rate { width: 10%; text-align: right; }
    .col-per { width: 5%; text-align: center; }
    .col-amount { width: 12%; text-align: right; font-weight: bold; }

    /* Header-specific alignment overrides */
    .items-table th.col-item-desc { text-align: left; }
    .items-table th.col-rate { text-align: right; }
    .items-table th.col-amount { text-align: right; }

    .item-row {
      page-break-inside: avoid;
    }

    .item-description {
      font-weight: 500;
      color: #000;
    }

    .item-meta {
      font-size: 8px;
      color: #999;
      margin-top: 2px;
    }

    /* ========== PAGINATION ROWS ========== */
    .brought-forward-row td,
    .carry-forward-row td {
      font-weight: bold;
      background-color: #f5f5f5;
      padding: 8px 4px !important;
      border: 1px solid #e0e0e0;
    }

    .final-total-row td {
      font-weight: bold;
      background-color: #f0f0f0;
      padding: 8px 4px !important;
      border: 1px solid #000;
    }

    /* ========== SUMMARY SECTION (NATURAL HEIGHT, PUSHED DOWN BY TABLE) ========== */
    .summary-section {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 15px;
      margin: 12px 0;
      page-break-inside: avoid;
      flex: 0 0 auto;  /* Natural height, doesn't expand */
    }

    .summary-left {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .notes-box,
    .terms-box {
      border: 1px solid #e0e0e0;
      padding: 8px;
      background-color: #f9f9f9;
    }

    .notes-content {
      font-size: 9px;
      color: #333;
      line-height: 1.3;
      margin: 0;
    }

    .terms-list {
      font-size: 8px;
      color: #666;
      padding-left: 18px;
      margin: 4px 0 0 0;
    }

    .terms-list li {
      margin-bottom: 3px;
    }

    .summary-right {
      display: flex;
      justify-content: flex-end;
    }

    .totals-table {
      width: 280px;
      border-collapse: collapse;
      border: 1px solid #000;
    }

    .totals-table tbody tr {
      border-bottom: 1px solid #e0e0e0;
    }

    .subtotal-row td,
    .discount-row td,
    .tax-row td {
      padding: 6px 10px;
      font-size: 9px;
    }

    .total-label {
      text-align: right;
      width: 60%;
      font-weight: 600;
    }

    .total-value {
      text-align: right;
      width: 40%;
      font-weight: 600;
      padding-right: 8px;
    }

    .final-total {
      background-color: #f0f0f0;
      font-weight: bold;
      font-size: 10px;
      border-top: 2px solid #000;
      border-bottom: 2px solid #000;
    }

    .final-total td {
      padding: 8px 10px;
    }

    /* ========== PAGE FOOTER (No Shrink) ========== */
    .page-footer {
      flex: 0 0 auto;
      padding-top: 10px;
      border-top: 2px solid #000;
      page-break-inside: avoid;
      display: block;
    }

    .footer-content {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 15px;
      margin-bottom: 10px;
      font-size: 9px;
    }

    .footer-left,
    .footer-center,
    .footer-right {
      text-align: center;
    }

    .footer-title {
      font-weight: bold;
      font-size: 9px;
      margin-bottom: 8px;
    }

    .signature-box {
      border: 1px solid #000;
      padding: 30px 8px 8px 8px;
      min-height: 50px;
    }

    .signature-line {
      border-top: 1px solid #000;
      padding-top: 3px;
      margin: 0;
      font-size: 8px;
    }

    .signature-name {
      font-size: 8px;
      margin-top: 2px;
    }

    .footer-text {
      font-size: 8px;
      margin: 2px 0;
      color: #666;
    }

    .seal-box {
      border: 1px solid #000;
      padding: 20px 8px;
      min-height: 50px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .seal-placeholder {
      font-size: 8px;
      color: #999;
      margin: 0;
    }

    .page-break-marker {
      text-align: center;
      padding-top: 10px;
      border-top: 1px solid #e0e0e0;
      font-size: 8px;
      color: #999;
    }

    .page-note {
      margin: 0;
      font-style: italic;
    }

    /* ========== PRINT MEDIA ========== */
    @media print {
      body {
        margin: 0;
        padding: 0;
        background: white;
      }

      html {
        margin: 0;
        padding: 0;
        height: auto;
      }

      .invoice-container {
        margin: 0;
        padding: 0;
        page-break-before: avoid;
      }

      .page-wrapper {
        page-break-after: always;
        page-break-inside: avoid;
      }

      .page-wrapper:last-child {
        page-break-after: auto;
      }

      .items-table {
        page-break-inside: auto;
      }

      .items-table tr {
        page-break-inside: avoid;
        page-break-after: auto;
      }
    }

    /* ========== PRINT MODE (STRICT PDF LAYOUT) ========== */
    @media print {
      .page-wrapper {
        height: 277mm;
        min-height: auto;
        margin: 0;
        page-break-after: always;
      }

      .page-body {
        overflow: hidden;
      }

      .items-table {
        flex: 1 1 auto;
      }
    }
  `
};

// Tally Prime Style Invoice Template - Arabic (RTL)
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
    <div class="invoice-container-ar preview-mode preview-mode">
      <!-- ========== MAIN LAYOUT TABLE (WRAPPER) - RTL ========== -->
      <table class="main-layout-ar">
        <!-- ========== PAGE HEADER (REPEATS EVERY PAGE) - RTL ========== -->
        <thead>
          <tr>
            <td>
              <div class="page-header-ar">
                {{#withLogo}}
                <div class="header-section-ar">
                  <div class="company-header-info-ar">
                    <h1 class="company-title-ar">{{store.storeName}}</h1>
                    <p class="company-subtitle-ar">{{store.address1}}{{#if store.address2}} | {{store.address2}}{{/if}}</p>
                  </div>
                  <img src="{{store.logoUrl}}" alt="Logo" class="company-logo-ar">
                </div>
                {{/withLogo}}

                <div class="document-header-ar">
                  <h2 class="document-type-ar">فاتورة ضريبية</h2>
                  <div class="document-ref-ar">
                    <span class="invoice-date-ar">التاريخ: {{date invoice.date 'DD/MM/YYYY'}}</span>
                    <span class="invoice-no-ar">الفاتورة # {{invoice.invoiceNumber}}</span>
                  </div>
                </div>

                <!-- Address Section -->
                <div class="address-section-ar">
                  <div class="inv-terms-box-ar">
                    <table class="terms-table-ar">
                      <tr>
                        <td class="term-label-ar">شروط الدفع:</td>
                        <td class="term-value-ar">{{invoice.paymentType}}</td>
                      </tr>
                      <tr>
                        <td class="term-label-ar">تاريخ الاستحقاق:</td>
                        <td class="term-value-ar">{{#if invoice.dueDate}}{{date invoice.dueDate 'DD/MM/YYYY'}}{{else}}كما هو متفق{{/if}}</td>
                      </tr>
                    </table>
                  </div>

                  <div class="ship-to-box-ar">
                    <h4 class="box-title-ar">التسليم إلى:</h4>
                    <p class="party-name-ar">{{invoice.customerName}}</p>
                    <p class="party-address-ar">{{#if invoice.customerAddress}}{{invoice.customerAddress}}{{/if}}</p>
                  </div>

                  <div class="bill-to-box-ar">
                    <h4 class="box-title-ar">الفاتورة إلى:</h4>
                    <p class="party-name-ar">{{invoice.customerName}}</p>
                    <p class="party-address-ar">{{#if invoice.customerAddress}}{{invoice.customerAddress}}{{/if}}</p>
                    {{#if invoice.customerTRN}}
                    <p class="party-trn-ar">الرقم الضريبي: {{invoice.customerTRN}}</p>
                    {{/if}}
                    {{#if invoice.customerPhone}}
                    <p class="party-contact-ar">الهاتف: {{invoice.customerPhone}}</p>
                    {{/if}}
                  </div>
                </div>
              </div>
            </td>
          </tr>
        </thead>

        <!-- ========== MAIN CONTENT BODY - RTL ========== -->
        <tbody>
          <tr>
            <td>
              <!-- Dynamic Pagination - Each page has own item set + Brought/Carry Forward (RTL) -->
              {{#pages}}
              <section class="items-section-ar page-section-ar">
                <table class="items-table-ar">
                  <thead>
                    <!-- COLUMN HEADERS ROW (RTL) -->
                    <tr class="table-header-ar">
                      <th class="col-sl-ar">م</th>
                      <th class="col-item-desc-ar">وصف المنتج</th>
                      <th class="col-hsn-ar">كود المنتج</th>
                      <th class="col-qty-ar">الكمية</th>
                      <th class="col-unit-ar">الوحدة</th>
                      <th class="col-rate-ar">السعر</th>
                      <th class="col-per-ar">%</th>
                      <th class="col-amount-ar">المبلغ</th>
                    </tr>

                    <!-- BROUGHT FORWARD (on non-first pages) - RTL -->
                    {{#unless isFirstPage}}
                    <tr class="brought-forward-row-ar">
                      <td colspan="7" style="text-align: left; font-weight: bold; padding: 6px 4px;">الرصيد المنقول من الصفحة السابقة:</td>
                      <td class="col-amount-ar" style="font-weight: bold; background: #f5f5f5;">{{formatNumber broughtForward 2}}</td>
                    </tr>
                    {{/unless}}
                  </thead>

                  <tbody>
                    {{#items}}
                    <tr class="item-row-ar">
                      <td class="col-sl-ar">{{this.slNo}}</td>
                      <td class="col-item-desc-ar">
                        <div class="item-description-ar">{{itemName}}</div>
                        {{#if serialNumbers}}<div class="item-meta-ar">الرقم التسلسلي: {{join serialNumbers ', '}}</div>{{/if}}
                      </td>
                      <td class="col-hsn-ar">{{#if itemCode}}{{itemCode}}{{else}}-{{/if}}</td>
                      <td class="col-qty-ar">{{quantity}}</td>
                      <td class="col-unit-ar">{{unit}}</td>
                      <td class="col-rate-ar">{{formatNumber unitPrice 2}}</td>
                      <td class="col-per-ar">{{#if discountPercentage}}{{discountPercentage}}%{{else}}-{{/if}}</td>
                      <td class="col-amount-ar">{{formatNumber total 2}}</td>
                    </tr>
                    {{/items}}
                  </tbody>

                  <tfoot>
                    <!-- CARRY FORWARD (on non-last pages) - RTL -->
                    {{#unless isLastPage}}
                    <tr class="carry-forward-row-ar">
                      <td colspan="7" style="text-align: left; font-weight: bold; padding: 6px 4px;">الرصيد المنقول للصفحة التالية:</td>
                      <td class="col-amount-ar" style="font-weight: bold; background: #f5f5f5;">{{formatNumber carryForward 2}}</td>
                    </tr>
                    {{/unless}}

                    <!-- FINAL TOTAL (on last page only) - RTL -->
                    {{#if isLastPage}}
                    <tr class="final-total-row-ar">
                      <td colspan="7" style="text-align: left; font-weight: bold; padding: 8px 4px; border-top: 2px solid #000;">الإجمالي:</td>
                      <td class="col-amount-ar" style="font-weight: bold; background: #f0f0f0; border-top: 2px solid #000; border-bottom: 2px solid #000; padding: 8px 4px;">{{formatNumber ../invoice.totalIncludeVat 2}}</td>
                    </tr>
                    {{/if}}
                  </tfoot>
                </table>
              </section>

              <!-- PAGE BREAK BETWEEN PAGES - RTL -->
              {{#unless isLastPage}}
              <div class="page-break-spacer-ar"></div>
              {{/unless}}
              {{/pages}}

      <!-- ========== TOTALS & NOTES SECTION (LAST PAGE ONLY) - RTL ========== -->
      {{#if pages}}
      {{#each pages}}
      {{#if isLastPage}}
      <section class="summary-section-ar">
        <div class="summary-left-ar">
          <table class="totals-table-ar">
            <tbody>
              {{#if ../invoice.subtotal}}
              <tr class="subtotal-row-ar">
                <td class="total-label-ar">الإجمالي الفرعي:</td>
                <td class="total-value-ar">{{formatNumber ../invoice.subtotal 2}}</td>
              </tr>
              {{/if}}

              {{#if ../invoice.discountAmount}}
              <tr class="discount-row-ar">
                <td class="total-label-ar">الخصم:</td>
                <td class="total-value-ar">-{{formatNumber ../invoice.discountAmount 2}}</td>
              </tr>
              {{/if}}

              {{#if ../invoice.vatAmount}}
              <tr class="tax-row-ar">
                <td class="total-label-ar">الضريبة ({{../invoice.vatPercentage}}%):</td>
                <td class="total-value-ar">{{formatNumber ../invoice.vatAmount 2}}</td>
              </tr>
              {{/if}}

              {{#if ../invoice.totalIncludeVat}}
              <tr class="final-total-ar">
                <td class="total-label-ar">الإجمالي:</td>
                <td class="total-value-ar">{{formatNumber ../invoice.totalIncludeVat 2}}</td>
              </tr>
              {{/if}}
            </tbody>
          </table>
        </div>

        <div class="summary-right-ar">
          {{#if ../invoice.notes}}
          <div class="notes-box-ar">
            <h4 class="box-title-ar">ملاحظات:</h4>
            <p class="notes-content-ar">{{../invoice.notes}}</p>
          </div>
          {{/if}}

          <div class="terms-box-ar">
            <h4 class="box-title-ar">الشروط والأحكام:</h4>
            <ol class="terms-list-ar">
              <li>يجب تسديد الدفع ضمن تاريخ الاستحقاق</li>
              <li>البضائع المباعة غير قابلة للإرجاع إلا إذا كانت معيبة</li>
              <li>خاضع لاختصاص محاكم دولتنا فقط</li>
            </ol>
          </div>
        </div>
              </section>
      {{/if}}
      {{/each}}
      {{/if}}
            </td>
          </tr>
        </tbody>

        <!-- ========== PAGE FOOTER (REPEATS EVERY PAGE) - RTL ========== -->
        <tfoot>
          <tr>
            <td>
              <div class="page-footer-ar">
                <div class="footer-content-ar">
                  <div class="footer-right-ar">
                    <h5 class="footer-title-ar">التوقيع والاعتماد</h5>
                    <div class="signature-box-ar">
                      <p class="signature-line-ar">_______________</p>
                      <p class="signature-name-ar">الاسم والتوقيع</p>
                    </div>
                  </div>

                  <div class="footer-center-ar">
                    <p class="footer-text-ar">{{#if company.email}}البريد الإلكتروني: {{company.email}}{{/if}}</p>
                    <p class="footer-text-ar">{{#if company.phone}}الهاتف: {{company.phone}}{{/if}}</p>
                    {{#if company.taxId}}
                    <p class="footer-text-ar">الرقم الضريبي: {{company.taxId}}</p>
                    {{/if}}
                  </div>

                  <div class="footer-left-ar">
                    <h5 class="footer-title-ar">الختم</h5>
                    <div class="seal-box-ar">
                      <p class="seal-placeholder-ar">[الختم]</p>
                    </div>
                  </div>
                </div>

                <div class="page-break-marker-ar">
                  <p class="page-note-ar">الصفحة {{pageNumber}} من {{totalPages}} | هذه فاتورة مُنشأة بواسطة الكمبيوتر. لا يلزم توقيع.</p>
                </div>
              </div>
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  `,
  cssContent: `
    /* RTL Styles for Arabic Invoice */
    .invoice-container-ar {
      direction: rtl;
      text-align: right;
      width: 100%;
      background: white;
      display: block;
    }

    /* ============================================
       MAIN LAYOUT TABLE - RTL
       ============================================ */
    .main-layout-ar {
      width: 100%;
      border-collapse: collapse;
      margin: 0;
      padding: 0;
      display: table;
    }

    .main-layout-ar thead {
      display: table-header-group;
    }

    .main-layout-ar tfoot {
      display: table-footer-group;
    }

    .main-layout-ar tr {
      page-break-inside: avoid;
    }

    .main-layout-ar td {
      padding: 0;
      border: none;
      vertical-align: top;
    }

    /* ========== PAGE HEADER (Repeats every page) - RTL ========== */
    .page-header-ar {
      padding-bottom: 10px;
      page-break-inside: avoid;
    }

    .header-section-ar {
      display: flex;
      flex-direction: row-reverse;
      align-items: center;
      gap: 15px;
      margin-bottom: 10px;
    }

    .company-logo-ar {
      max-width: 80px;
      height: auto;
      flex-shrink: 0;
    }

    .company-header-info-ar {
      flex: 1;
      text-align: right;
    }

    .company-title-ar {
      font-size: 16px;
      font-weight: bold;
      color: #1e40af;
      margin-bottom: 4px;
      margin: 0 0 4px 0;
    }

    .company-subtitle-ar {
      font-size: 9px;
      color: #666;
      margin: 0;
      line-height: 1.3;
    }

    .document-header-ar {
      margin-top: 8px;
      padding-top: 8px;
      border-top: 1px solid #d0d0d0;
      text-align: center;
    }

    .document-type-ar {
      font-size: 20px;
      font-weight: bold;
      color: #1e40af;
      margin: 0 0 3px 0;
    }

    .document-ref-ar {
      font-size: 9px;
      color: #666;
      display: flex;
      flex-direction: row-reverse;
      justify-content: center;
      gap: 20px;
    }

    .invoice-no-ar, .invoice-date-ar {
      margin: 0;
    }

    /* ============================================
       ADDRESS SECTION - RTL
       ============================================ */
    .address-section-ar {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 15px;
      margin-bottom: 20px;
      page-break-inside: avoid;
    }

    .bill-to-box-ar, .ship-to-box-ar, .inv-terms-box-ar {
      border: 1px solid #000;
      padding: 10px;
      background-color: #fafafa;
      page-break-inside: avoid;
    }

    .box-title-ar {
      font-weight: bold;
      font-size: 10px;
      margin-bottom: 8px;
      padding-bottom: 6px;
      border-bottom: 1px solid #d0d0d0;
      color: #1e40af;
      margin: 0 0 8px 0;
    }

    .party-name-ar {
      font-weight: bold;
      font-size: 10px;
      margin-bottom: 3px;
      margin: 0 0 3px 0;
    }

    .party-address-ar {
      font-size: 9px;
      color: #666;
      line-height: 1.4;
      margin: 0 0 3px 0;
    }

    .party-trn-ar, .party-contact-ar {
      font-size: 9px;
      color: #666;
      margin: 0 0 2px 0;
    }

    .terms-table-ar {
      width: 100%;
      border-collapse: collapse;
      font-size: 9px;
    }

    .terms-table-ar tr {
      height: 16px;
    }

    .terms-table-ar td {
      padding: 3px 6px;
      border: none;
      border-bottom: 1px solid #e0e0e0;
    }

    .term-label-ar {
      font-weight: bold;
      text-align: right;
      width: 50%;
    }

    .term-value-ar {
      text-align: right;
      width: 50%;
    }

    /* ============================================
       PAGINATION STYLES - RTL
       ============================================ */
    .page-section-ar {
      page-break-after: always;
    }

    .brought-forward-row-ar td,
    .carry-forward-row-ar td {
      font-weight: bold;
      background-color: #f5f5f5;
      padding: 8px 4px !important;
      border: 1px solid #e0e0e0;
    }

    .final-total-row-ar td {
      font-weight: bold;
      background-color: #f0f0f0;
      padding: 8px 4px !important;
      border: 1px solid #000;
    }

    .page-break-spacer-ar {
      page-break-after: always;
    }

    /* ============================================
       ITEMS TABLE - RTL
       ============================================ */
    .items-section-ar {
      margin: 0;
      display: block;
    }

    .items-table-ar {
      width: 100%;
      border-collapse: collapse;
      page-break-inside: auto;
    }

    /* Header rows (company + address + column headers) */
    .items-table-ar thead {
      display: table-header-group;
      page-break-after: avoid;
    }

    .header-company-row-ar td {
      border: none;
      padding: 0;
      background-color: white;
    }

    .header-company-row-ar {
      page-break-inside: avoid;
    }

    .combined-header-ar {
      padding: 10px 0;
      display: block;
      direction: rtl;
    }

    .address-row-ar td {
      border: none;
      padding: 0;
      background-color: white;
    }

    .address-row-ar {
      page-break-inside: avoid;
    }

    .address-section-ar {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 10px;
      padding: 0;
      margin: 8px 0;
      font-size: 9px;
      direction: rtl;
    }

    .bill-to-box-ar,
    .ship-to-box-ar,
    .inv-terms-box-ar {
      border: 1px solid #000;
      padding: 6px;
    }

    .box-title-ar {
      font-weight: bold;
      font-size: 9px;
      margin: 0 0 4px 0;
      text-decoration: underline;
    }

    .party-name-ar {
      font-weight: 600;
      margin: 0 0 2px 0;
    }

    .party-address-ar {
      font-size: 8px;
      margin: 0;
    }

    .party-trn-ar {
      font-size: 8px;
      margin: 2px 0 0 0;
    }

    .party-contact-ar {
      font-size: 8px;
      margin: 2px 0 0 0;
    }

    /* Column header row styling */
    .table-header-ar {
      border: none;
    }

    .items-table-ar th {
      padding: 8px 6px;
      text-align: center;
      font-weight: bold;
      border: none;
      border-bottom: 2px solid #1e40af;
      background-color: #1e40af;
      color: white;
      font-size: 10px;
    }

    .items-table-ar tbody {
      display: table-row-group;
    }

    .items-table-ar tr {
      page-break-inside: avoid;
    }

    .items-table-ar tbody tr {
      page-break-inside: avoid;
    }

    .items-table-ar td {
      padding: 8px 6px;
      border: none;
      border-bottom: 1px solid #e0e0e0;
      font-size: 10px;
      text-align: right;
    }

    .col-sl-ar { 
      width: 5%; 
      text-align: center; 
    }

    .col-item-desc-ar { 
      width: 30%; 
      text-align: right; 
      word-break: break-word; 
      white-space: normal; 
    }

    .col-hsn-ar { 
      width: 10%; 
      text-align: center; 
    }

    .col-qty-ar { 
      width: 8%; 
      text-align: center; 
    }

    .col-unit-ar { 
      width: 10%; 
      text-align: center; 
    }

    .col-rate-ar { 
      width: 10%; 
      text-align: right; 
    }

    .col-per-ar { 
      width: 8%; 
      text-align: center; 
    }

    .col-amount-ar { 
      width: 12%; 
      text-align: right; 
      font-weight: bold; 
    }

    /* Header-specific alignment overrides for Arabic */
    .items-table-ar th.col-item-desc-ar { text-align: right; }
    .items-table-ar th.col-rate-ar { text-align: right; }
    .items-table-ar th.col-amount-ar { text-align: right; }

    .item-description-ar {
      font-weight: 500;
      text-align: right;
      color: #333;
    }

    .item-meta-ar {
      font-size: 9px;
      color: #666;
      text-align: right;
      margin-top: 2px;
    }

    .terms-table-ar {
      width: 100%;
      border-collapse: collapse;
      border: none;
      font-size: 8px;
      direction: rtl;
    }

    .term-label-ar {
      font-weight: 600;
      border-bottom: 1px solid #e0e0e0;
      padding: 2px;
    }

    .term-value-ar {
      border-bottom: 1px solid #e0e0e0;
      text-align: left;
      padding: 2px;
    }

    /* ============================================
       SUMMARY SECTION - RTL
       ============================================ */
    .summary-section-ar {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-bottom: 15px;
      page-break-inside: avoid;
    }

    .summary-left-ar {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .summary-right-ar {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .totals-table-ar {
      width: 100%;
      border-collapse: collapse;
    }

    .totals-table-ar tr {
      height: 20px;
      border: none;
    }

    .totals-table-ar td {
      padding: 5px 10px;
      font-size: 10px;
      border: none;
      border-bottom: 1px solid #e0e0e0;
      text-align: right;
    }

    .total-label-ar {
      font-weight: 600;
      text-align: right;
      width: 55%;
    }

    .total-value-ar {
      font-weight: bold;
      text-align: right;
      width: 45%;
    }

    .subtotal-row-ar, .discount-row-ar, .tax-row-ar {
      background-color: #f5f5f5;
      font-size: 11px;
    }

    .final-total-ar {
      background-color: #f5f5f5;
      font-size: 11px;
      border-top: 2px solid #1e40af !important;
      border-bottom: 2px solid #1e40af !important;
      font-weight: bold;
    }

    .notes-box-ar, .terms-box-ar {
      background-color: #f9f9f9;
      padding: 10px;
      border-right: 4px solid #1e40af;
      page-break-inside: avoid;
    }

    .notes-content-ar {
      font-size: 9px;
      color: #333;
      line-height: 1.4;
      margin: 0;
    }

    .terms-list-ar {
      font-size: 9px;
      color: #333;
      line-height: 1.4;
      margin: 5px 0 0 20px;
      padding: 0;
    }

    .terms-list-ar li {
      margin-bottom: 3px;
    }

    /* ========== PAGE FOOTER (Repeats every page) - RTL ========== */
    .page-footer-ar {
      padding-top: 10px;
      border-top: 2px solid #1e40af;
      page-break-inside: avoid;
      display: block;
    }

    .footer-content-ar {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 15px;
      margin-bottom: 10px;
    }

    .footer-left-ar, .footer-center-ar, .footer-right-ar {
      text-align: right;
    }

    .footer-title-ar {
      font-weight: bold;
      font-size: 9px;
      color: #1e40af;
      margin-bottom: 5px;
      margin: 0 0 5px 0;
    }

    .footer-text-ar {
      font-size: 8px;
      margin: 2px 0;
      color: #666;
    }

    .signature-box-ar {
      border: 1px solid #000;
      padding: 30px 10px 5px 10px;
      text-align: center;
      min-height: 50px;
      display: flex;
      flex-direction: column;
      justify-content: flex-end;
    }

    .signature-line-ar {
      border-top: 1px solid #000;
      margin: 0;
      padding-top: 5px;
      font-size: 8px;
    }

    .signature-name-ar {
      font-size: 8px;
      margin: 2px 0 0 0;
    }

    .seal-box-ar {
      border: 1px solid #000;
      padding: 20px 10px;
      text-align: center;
      min-height: 60px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .seal-placeholder-ar {
      font-size: 12px;
      color: #999;
      margin: 0;
    }

    .page-break-marker-ar {
      text-align: center;
      padding: 10px 0;
      border-top: 1px solid #d0d0d0;
      page-break-inside: avoid;
    }

    .page-note-ar {
      font-size: 9px;
      color: #888;
      margin: 0;
    }

    /* ============================================
       PRINT MEDIA QUERIES
       ============================================ */
    @media print {
      body {
        margin: 0;
        padding: 0;
        background: white;
      }
      
      html {
        margin: 0;
        padding: 0;
        height: auto;
      }
      
      .invoice-container-ar {
        padding: 0;
        margin: 0;
        display: flex;
        flex-direction: column;
        min-height: auto;
        page-break-after: always;
        width: 100%;
      }

      /* Main layout table structure */
      .main-layout-ar {
        width: 100%;
        min-height: auto;
      }

      .main-layout-ar thead {
        display: table-header-group;
        page-break-inside: avoid;
      }

      .main-layout-ar tbody {
        display: table-row-group;
      }

      .main-layout-ar tfoot {
        display: table-footer-group;
        page-break-inside: avoid;
        page-break-after: auto;
      }

      .page-header-ar {
        page-break-inside: avoid;
      }

      .page-footer-ar {
        display: block;
        page-break-inside: avoid;
        page-break-after: auto;
      }

      /* Ensure items table header repeats on every page */
      .items-table-ar thead {
        display: table-header-group;
        page-break-after: avoid;
      }

      .items-table-ar tbody tr {
        page-break-inside: avoid;
      }

      /* Avoid orphans */
      .summary-section-ar {
        page-break-inside: avoid;
      }
    }
  `
};
