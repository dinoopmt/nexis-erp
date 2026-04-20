// Sales Order Template - English with Logo
export const SALES_ORDER_TEMPLATE_EN_WITH_LOGO = {
  templateName: 'SalesOrder_EN_with_Logo',
  language: 'EN',
  templateType: 'SALES_ORDER',
  includeLogo: true,
  customDesign: {
    headerColor: '#f59e0b',
    bodyFont: 'Arial',
    showSerialNumbers: false,
    showQrCode: false,
    currency: 'AED',
    pageSize: 'A4'
  },
  htmlContent: `
    <div class="sales-order-container">
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
          <h2 class="document-title">SALES ORDER</h2>
          <table class="document-details-table">
            <tr>
              <td class="label">Order #:</td>
              <td class="value">{{order.orderNumber}}</td>
            </tr>
            <tr>
              <td class="label">Date:</td>
              <td class="value">{{date order.date 'DD/MM/YYYY'}}</td>
            </tr>
            <tr>
              <td class="label">Required Delivery Date:</td>
              <td class="value">{{date order.requiredDeliveryDate 'DD/MM/YYYY'}}</td>
            </tr>
            <tr>
              <td class="label">Order Status:</td>
              <td class="value">{{order.status}}</td>
            </tr>
          </table>
        </div>
        <div class="right">
          <h3 class="order-for-title">ORDER FOR:</h3>
          <p class="customer-name">{{order.customerName}}</p>
          <p class="customer-details">
            {{order.customerAddress}}<br>
            Phone: {{order.customerPhone}}<br>
            {{#order.customerEmail}}Email: {{order.customerEmail}}{{/order.customerEmail}}
          </p>
        </div>
      </div>

      {{#order.shippingAddress}}
      <div class="shipping-box">
        <h4 class="shipping-title">SHIP TO:</h4>
        <p class="shipping-address">
          {{order.shippingAddress.name}}<br>
          {{order.shippingAddress.address}}<br>
          {{order.shippingAddress.city}}, {{order.shippingAddress.state}}<br>
          Phone: {{order.shippingAddress.phone}}
        </p>
      </div>
      {{/order.shippingAddress}}

      {{#order.specialInstructions}}
      <div class="special-instructions">
        <p class="instructions-label">Special Instructions:</p>
        <p class="instructions-content">{{order.specialInstructions}}</p>
      </div>
      {{/order.specialInstructions}}

      <table class="items-table">
        <thead>
          <tr class="table-header">
            <th class="col-slno">SL</th>
            <th class="col-item">Item Description</th>
            <th class="col-qty">Quantity</th>
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
            <td class="value">{{currency order.subtotal 'AED' 2}}</td>
          </tr>
          {{#order.discountAmount}}
          <tr>
            <td class="label">Discount ({{order.discountPercentage}}%):</td>
            <td class="value">- {{currency order.discountAmount 'AED' 2}}</td>
          </tr>
          {{/order.discountAmount}}
          {{#order.taxAmount}}
          <tr>
            <td class="label">Tax ({{order.taxPercentage}}%):</td>
            <td class="value">+ {{currency order.taxAmount 'AED' 2}}</td>
          </tr>
          {{/order.taxAmount}}
          {{#order.shippingCharges}}
          <tr>
            <td class="label">Shipping Charges:</td>
            <td class="value">+ {{currency order.shippingCharges 'AED' 2}}</td>
          </tr>
          {{/order.shippingCharges}}
          <tr class="total-row">
            <td class="label">ORDER TOTAL:</td>
            <td class="value">{{currency order.totalAmount 'AED' 2}}</td>
          </tr>
        </table>
      </div>

      <div class="payment-section">
        <table class="payment-table">
          <tr>
            <td class="payment-label">Payment Terms:</td>
            <td class="payment-value">{{order.paymentTerms}}</td>
          </tr>
          <tr>
            <td class="payment-label">Delivery Method:</td>
            <td class="payment-value">{{order.deliveryMethod}}</td>
          </tr>
          {{#order.leadTime}}
          <tr>
            <td class="payment-label">Lead Time:</td>
            <td class="payment-value">{{order.leadTime}} days</td>
          </tr>
          {{/order.leadTime}}
        </table>
      </div>

      <div class="terms-section">
        <h4 class="terms-title">Terms & Conditions:</h4>
        <ul class="terms-list">
          <li>This is a sales order confirmation for the items listed above</li>
          <li>Prices are valid as per the date mentioned</li>
          <li>Delivery will be as per mutually agreed schedule</li>
          <li>Payment must be made as per the payment terms</li>
          {{#order.additionalTerms}}
          <li>{{order.additionalTerms}}</li>
          {{/order.additionalTerms}}
        </ul>
      </div>

      <div class="signature-section">
        <table class="signature-table">
          <tr>
            <td class="sig-field">
              <p class="sig-label">Authorized By:</p>
              <div class="sig-line"></div>
              <p class="sig-name">{{order.authorizedBy}}</p>
            </td>
            <td class="sig-field">
              <p class="sig-label">Date:</p>
              <div class="sig-line"></div>
              <p class="sig-date">{{date now 'DD/MM/YYYY'}}</p>
            </td>
            <td class="sig-field">
              <p class="sig-label">Customer Signature:</p>
              <div class="sig-line"></div>
            </td>
          </tr>
        </table>
      </div>

      <div class="footer">
        <p class="footer-text">Thank you for your order!</p>
        <p class="footer-text">For any queries, please contact: {{company.email}} | {{company.phone}}</p>
        <p class="footer-text">Generated on: {{date now 'DD/MM/YYYY HH:mm:ss'}}</p>
      </div>
    </div>

    <style>
      .sales-order-container { font-family: Arial, sans-serif; padding: 20px; color: #333; }
      .header { text-align: center; margin-bottom: 15px; }
      .logo { max-width: 200px; height: auto; }
      .company-info { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #f59e0b; padding-bottom: 10px; }
      .company-name { margin: 0; font-size: 18px; font-weight: bold; color: #f59e0b; }
      .company-details { margin: 5px 0; font-size: 11px; color: #666; }
      .document-header { display: flex; justify-content: space-between; margin-bottom: 20px; gap: 40px; }
      .document-title { margin: 0 0 10px 0; font-size: 24px; color: #f59e0b; font-weight: bold; }
      .document-details-table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
      .document-details-table tr { vertical-align: top; }
      .document-details-table .label { font-weight: bold; width: 40%; font-size: 11px; }
      .document-details-table .value { font-size: 11px; }
      .order-for-title { margin: 0 0 8px 0; font-size: 12px; color: #f59e0b; font-weight: bold; }
      .customer-name { margin: 0; font-weight: bold; font-size: 12px; }
      .customer-details { margin: 3px 0 0 0; font-size: 10px; color: #666; }
      .shipping-box { background-color: #fef3c7; border: 1px solid #fde68a; padding: 10px; margin: 15px 0; }
      .shipping-title { margin: 0 0 5px 0; font-size: 11px; font-weight: bold; color: #f59e0b; }
      .shipping-address { margin: 0; font-size: 10px; }
      .special-instructions { background-color: #fef3c7; border-left: 3px solid #f59e0b; padding: 10px; margin: 15px 0; }
      .instructions-label { margin: 0 0 5px 0; font-size: 11px; font-weight: bold; color: #f59e0b; }
      .instructions-content { margin: 0; font-size: 10px; }
      .items-table { width: 100%; border-collapse: collapse; margin-bottom: 15px; border: 1px solid #ddd; }
      .table-header { background-color: #f59e0b; color: white; }
      .table-header th { padding: 8px; text-align: left; font-size: 11px; font-weight: bold; border: 1px solid #ccc; }
      .item-row { border-bottom: 1px solid #eee; }
      .item-row td { padding: 6px; font-size: 10px; border: 1px solid #ddd; }
      .col-slno { width: 4%; text-align: center; }
      .col-item { width: 30%; }
      .col-qty { width: 8%; text-align: center; }
      .col-unit { width: 8%; text-align: center; }
      .col-rate { width: 12%; text-align: right; }
      .col-discount { width: 12%; text-align: right; }
      .col-amount { width: 14%; text-align: right; font-weight: bold; }
      .item-name { font-weight: bold; }
      .item-description { font-size: 9px; color: #666; margin-top: 2px; }
      .totals-section { margin: 20px 0; }
      .totals-table { width: 100%; border-collapse: collapse; margin-left: auto; width: 50%; }
      .totals-table tr { vertical-align: top; }
      .totals-table .label { font-size: 11px; padding: 4px 10px; text-align: right; }
      .totals-table .value { font-size: 11px; padding: 4px 10px; text-align: right; font-weight: bold; }
      .total-row { border-top: 2px solid #f59e0b; background-color: #fef3c7; }
      .total-row .label, .total-row .value { font-size: 12px; font-weight: bold; color: #f59e0b; }
      .payment-section { margin: 15px 0; padding: 10px; background-color: #f5f5f5; border: 1px solid #ddd; }
      .payment-table { width: 100%; border-collapse: collapse; }
      .payment-table tr { vertical-align: top; }
      .payment-label { font-weight: bold; width: 30%; font-size: 10px; padding: 4px; }
      .payment-value { font-size: 10px; padding: 4px; }
      .terms-section { margin-top: 20px; padding: 10px; background-color: #f5f5f5; border-left: 3px solid #f59e0b; }
      .terms-title { margin: 0 0 8px 0; font-size: 11px; font-weight: bold; color: #f59e0b; }
      .terms-list { margin: 0; padding-left: 20px; font-size: 10px; }
      .terms-list li { margin: 3px 0; }
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

// Sales Order Template - English without Logo
export const SALES_ORDER_TEMPLATE_EN_WITHOUT_LOGO = {
  templateName: 'SalesOrder_EN_without_Logo',
  language: 'EN',
  templateType: 'SALES_ORDER',
  includeLogo: false,
  customDesign: {
    headerColor: '#f59e0b',
    bodyFont: 'Arial',
    showSerialNumbers: false,
    showQrCode: false,
    currency: 'AED',
    pageSize: 'A4'
  },
  htmlContent: `
    <div class="sales-order-container">
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
          <h2 class="document-title">SALES ORDER</h2>
          <table class="document-details-table">
            <tr>
              <td class="label">Order #:</td>
              <td class="value">{{order.orderNumber}}</td>
            </tr>
            <tr>
              <td class="label">Date:</td>
              <td class="value">{{date order.date 'DD/MM/YYYY'}}</td>
            </tr>
            <tr>
              <td class="label">Required Delivery Date:</td>
              <td class="value">{{date order.requiredDeliveryDate 'DD/MM/YYYY'}}</td>
            </tr>
            <tr>
              <td class="label">Status:</td>
              <td class="value">{{order.status}}</td>
            </tr>
          </table>
        </div>
        <div class="right">
          <h3 class="order-for-title">ORDER FOR:</h3>
          <p class="customer-name">{{order.customerName}}</p>
          <p class="customer-details">
            {{order.customerAddress}}<br>
            Phone: {{order.customerPhone}}
          </p>
        </div>
      </div>

      <table class="items-table">
        <thead>
          <tr class="table-header">
            <th class="col-slno">SL</th>
            <th class="col-item">Item Description</th>
            <th class="col-qty">Quantity</th>
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
            <td class="col-item">{{itemName}}</td>
            <td class="col-qty">{{quantity}}</td>
            <td class="col-unit">{{unit}}</td>
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
            <td class="value">{{currency order.subtotal 'AED' 2}}</td>
          </tr>
          {{#order.discountAmount}}
          <tr>
            <td class="label">Discount ({{order.discountPercentage}}%):</td>
            <td class="value">- {{currency order.discountAmount 'AED' 2}}</td>
          </tr>
          {{/order.discountAmount}}
          {{#order.taxAmount}}
          <tr>
            <td class="label">Tax ({{order.taxPercentage}}%):</td>
            <td class="value">+ {{currency order.taxAmount 'AED' 2}}</td>
          </tr>
          {{/order.taxAmount}}
          <tr class="total-row">
            <td class="label">ORDER TOTAL:</td>
            <td class="value">{{currency order.totalAmount 'AED' 2}}</td>
          </tr>
        </table>
      </div>

      <div class="payment-section">
        <p class="payment-label">Payment Terms: <strong>{{order.paymentTerms}}</strong></p>
        <p class="payment-label">Delivery Method: <strong>{{order.deliveryMethod}}</strong></p>
      </div>

      <div class="footer">
        <p class="footer-text">Thank you for your order!</p>
        <p class="footer-text">Generated on: {{date now 'DD/MM/YYYY HH:mm:ss'}}</p>
      </div>
    </div>

    <style>
      .sales-order-container { font-family: Arial, sans-serif; padding: 20px; color: #333; }
      .company-info { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #f59e0b; padding-bottom: 10px; }
      .company-name { margin: 0; font-size: 18px; font-weight: bold; color: #f59e0b; }
      .company-details { margin: 5px 0; font-size: 11px; color: #666; }
      .document-header { display: flex; justify-content: space-between; margin-bottom: 20px; gap: 40px; }
      .document-title { margin: 0 0 10px 0; font-size: 24px; color: #f59e0b; font-weight: bold; }
      .document-details-table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
      .document-details-table .label { font-weight: bold; width: 40%; font-size: 11px; }
      .order-for-title { margin: 0 0 8px 0; font-size: 12px; color: #f59e0b; font-weight: bold; }
      .customer-name { margin: 0; font-weight: bold; font-size: 12px; }
      .customer-details { margin: 3px 0 0 0; font-size: 10px; color: #666; }
      .items-table { width: 100%; border-collapse: collapse; margin-bottom: 15px; border: 1px solid #ddd; }
      .table-header { background-color: #f59e0b; color: white; }
      .table-header th { padding: 8px; text-align: left; font-size: 11px; font-weight: bold; }
      .item-row td { padding: 6px; font-size: 10px; border: 1px solid #ddd; }
      .col-slno { width: 5%; text-align: center; }
      .col-item { width: 32%; }
      .col-qty { width: 10%; text-align: center; }
      .col-unit { width: 10%; text-align: center; }
      .col-rate { width: 12%; text-align: right; }
      .col-discount { width: 10%; text-align: right; }
      .col-amount { width: 16%; text-align: right; font-weight: bold; }
      .totals-section { margin: 20px 0; }
      .totals-table { width: 50%; margin-left: auto; }
      .totals-table .label { text-align: right; padding: 4px 10px; font-size: 11px; }
      .totals-table .value { text-align: right; padding: 4px 10px; font-weight: bold; }
      .total-row { border-top: 2px solid #f59e0b; background-color: #fef3c7; }
      .total-row .label, .total-row .value { font-size: 12px; font-weight: bold; color: #f59e0b; }
      .payment-section { margin: 15px 0; padding: 10px; background-color: #f5f5f5; }
      .payment-label { margin: 4px 0; font-size: 10px; }
      .footer { margin-top: 30px; text-align: center; border-top: 1px solid #ddd; padding-top: 10px; }
      .footer-text { margin: 3px 0; font-size: 9px; color: #999; }
    </style>
  `,
  cssContent: ''
}
