/**
 * LPO PDF Renderer
 * Generates HTML for LPO printing/PDF export
 * ✅ MATCHES GRN/Invoice pattern with store-specific headers
 */

export const generateLpoHtml = (lpo, company, storeDetails) => {
  const {
    lpoNumber = 'N/A',
    lpoDate = new Date().toISOString(),
    vendorName = 'N/A',
    items = [],
    notes = '',
    status = 'Draft',
    totalAmount = 0,
    totalTax = 0,
    netTotal = 0,
  } = lpo;

  const storeName = storeDetails?.storeName || company?.name || 'Store';
  const storeAddress = [storeDetails?.address1, storeDetails?.address2]
    .filter(Boolean)
    .join(', ');
  const storePhone = storeDetails?.phone || '';
  const storeEmail = storeDetails?.email || '';
  const companyName = company?.name || 'Company';
  const currencySymbol = company?.currencySymbol || '$';
  const decimalPlaces = company?.decimalPlaces || 2;
  const logoUrl = storeDetails?.logoUrl || '';

  const formatCurrency = (value) => {
    return parseFloat(value || 0).toFixed(decimalPlaces);
  };

  const dateStr = new Date(lpoDate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  const itemsHtml = items
    .map(
      (item, index) => `
    <tr>
      <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${index + 1}</td>
      <td style="border: 1px solid #ddd; padding: 8px;">${item.itemCode || ''}</td>
      <td style="border: 1px solid #ddd; padding: 8px;">${item.productName || ''}</td>
      <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${item.qty || 0}</td>
      <td style="border: 1px solid #ddd; padding: 8px;">${item.unit || 'PC'}</td>
      <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${currencySymbol} ${formatCurrency(item.cost)}</td>
      <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${currencySymbol} ${formatCurrency(item.qty * item.cost)}</td>
      <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${item.taxPercent || 0}%</td>
      <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${currencySymbol} ${formatCurrency(item.tax || 0)}</td>
      <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${currencySymbol} ${formatCurrency(item.qty * item.cost + (item.tax || 0))}</td>
    </tr>
  `
    )
    .join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Local Purchase Order - ${lpoNumber}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      font-size: 11px;
      color: #333;
      line-height: 1.4;
    }
    .page {
      width: 210mm;
      height: 297mm;
      margin: 0 auto;
      padding: 15mm;
      background: white;
      page-break-after: always;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #000;
      padding-bottom: 10px;
      margin-bottom: 20px;
    }
    .logo {
      max-width: 120px;
      max-height: 50px;
    }
    .company-info {
      text-align: center;
      flex: 1;
    }
    .company-info h1 {
      font-size: 18px;
      font-weight: bold;
      margin-bottom: 5px;
    }
    .company-info p {
      font-size: 10px;
      margin: 2px 0;
    }
    .document-title {
      text-align: center;
      font-size: 16px;
      font-weight: bold;
      margin: 15px 0;
      color: #000;
    }
    .status-badge {
      display: inline-block;
      padding: 4px 8px;
      border-radius: 3px;
      font-size: 10px;
      font-weight: bold;
      margin-left: 10px;
    }
    .status-draft {
      background-color: #fef3c7;
      color: #92400e;
      border: 1px solid #f59e0b;
    }
    .status-confirmed {
      background-color: #dbeafe;
      color: #0c4a6e;
      border: 1px solid #0284c7;
    }
    .status-received {
      background-color: #dcfce7;
      color: #166534;
      border: 1px solid #22c55e;
    }
    .info-section {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-bottom: 20px;
      font-size: 10px;
    }
    .info-block {
      border: 1px solid #ddd;
      padding: 10px;
      border-radius: 3px;
    }
    .info-block h3 {
      font-size: 11px;
      font-weight: bold;
      margin-bottom: 5px;
      border-bottom: 1px solid #ddd;
      padding-bottom: 3px;
    }
    .info-block p {
      margin: 2px 0;
      line-height: 1.3;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 15px 0;
      font-size: 10px;
    }
    table thead {
      background-color: #f3f4f6;
      font-weight: bold;
    }
    table th {
      border: 1px solid #ddd;
      padding: 8px;
      text-align: left;
    }
    table td {
      border: 1px solid #ddd;
      padding: 8px;
    }
    .totals-section {
      display: flex;
      justify-content: flex-end;
      margin-top: 15px;
      margin-bottom: 20px;
    }
    .totals-table {
      width: 300px;
      border-collapse: collapse;
      font-size: 11px;
    }
    .totals-table td {
      border: 1px solid #ddd;
      padding: 8px;
    }
    .totals-table .label {
      background-color: #f3f4f6;
      font-weight: bold;
      text-align: right;
      width: 60%;
    }
    .totals-table .value {
      text-align: right;
      width: 40%;
    }
    .totals-table .total {
      background-color: #000;
      color: white;
      font-weight: bold;
    }
    .notes-section {
      margin-top: 15px;
      border: 1px solid #ddd;
      padding: 10px;
      border-radius: 3px;
      font-size: 10px;
      min-height: 40px;
    }
    .notes-section h3 {
      font-weight: bold;
      margin-bottom: 5px;
      font-size: 11px;
    }
    .footer {
      margin-top: 30px;
      border-top: 1px solid #ddd;
      padding-top: 10px;
      font-size: 9px;
      text-align: center;
      color: #666;
    }
    .signature-section {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 20px;
      margin-top: 30px;
      font-size: 10px;
      text-align: center;
    }
    .signature-line {
      border-top: 1px solid #000;
      padding-top: 5px;
      min-height: 40px;
      display: flex;
      align-items: flex-end;
      justify-content: center;
    }
    @media print {
      body {
        margin: 0;
        padding: 0;
      }
      .page {
        margin: 0;
        padding: 15mm;
        page-break-after: always;
        box-shadow: none;
      }
    }
  </style>
</head>
<body>
  <div class="page">
    <!-- Header -->
    <div class="header">
      ${logoUrl ? `<img src="${logoUrl}" class="logo" alt="Logo">` : '<div style="width: 120px;"></div>'}
      <div class="company-info">
        <h1>${storeName}</h1>
        <p>${companyName}</p>
        ${storeAddress ? `<p>${storeAddress}</p>` : ''}
        ${storePhone ? `<p>Phone: ${storePhone}</p>` : ''}
        ${storeEmail ? `<p>Email: ${storeEmail}</p>` : ''}
      </div>
    </div>

    <!-- Document Title -->
    <div class="document-title">
      LOCAL PURCHASE ORDER (LPO)
      <span class="status-badge status-${status.toLowerCase()}">${status}</span>
    </div>

    <!-- LPO Info -->
    <div class="info-section">
      <div class="info-block">
        <h3>LPO Details</h3>
        <p><strong>LPO Number:</strong> ${lpoNumber}</p>
        <p><strong>LPO Date:</strong> ${dateStr}</p>
        <p><strong>Status:</strong> ${status}</p>
      </div>
      <div class="info-block">
        <h3>Vendor Information</h3>
        <p><strong>Vendor:</strong> ${vendorName}</p>
        <p><strong>Contact:</strong> N/A</p>
        <p><strong>Email:</strong> N/A</p>
      </div>
    </div>

    <!-- Items Table -->
    <table>
      <thead>
        <tr>
          <th style="width: 5%;">S.No</th>
          <th style="width: 8%;">Code</th>
          <th style="width: 25%;">Product Name</th>
          <th style="width: 7%;">Qty</th>
          <th style="width: 7%;">Unit</th>
          <th style="width: 10%;">Unit Cost</th>
          <th style="width: 10%;">Line Amount</th>
          <th style="width: 7%;">Tax %</th>
          <th style="width: 10%;">Tax Amt</th>
          <th style="width: 11%;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml}
      </tbody>
    </table>

    <!-- Totals -->
    <div class="totals-section">
      <table class="totals-table">
        <tr>
          <td class="label">Subtotal:</td>
          <td class="value">${currencySymbol} ${formatCurrency(totalAmount)}</td>
        </tr>
        <tr>
          <td class="label">Tax:</td>
          <td class="value">${currencySymbol} ${formatCurrency(totalTax)}</td>
        </tr>
        <tr class="total">
          <td class="label" style="background: inherit; color: white;">Total:</td>
          <td class="value" style="color: white;">${currencySymbol} ${formatCurrency(netTotal)}</td>
        </tr>
      </table>
    </div>

    <!-- Notes -->
    ${
      notes
        ? `
    <div class="notes-section">
      <h3>Notes / Terms:</h3>
      <p>${notes.replace(/\n/g, '<br>')}</p>
    </div>
    `
        : ''
    }

    <!-- Signatures -->
    <div class="signature-section">
      <div>
        <div class="signature-line"></div>
        <strong>Prepared By</strong>
      </div>
      <div>
        <div class="signature-line"></div>
        <strong>Vendor Sign</strong>
      </div>
      <div>
        <div class="signature-line"></div>
        <strong>Approved By</strong>
      </div>
    </div>

    <!-- Footer -->
    <div class="footer">
      <p>Generated on ${new Date().toLocaleString()}</p>
      <p>This is an electronically generated document</p>
    </div>
  </div>
</body>
</html>
  `;
};

export default { generateLpoHtml };
