import LpoTemplate from '../Models/LpoTemplate.js';
import GrnTemplate from '../Models/GrnTemplate.js';
import RtvTemplate from '../Models/RtvTemplate.js';

const defaultLpoHtml = `
<html>
  <head>
    <meta charset="UTF-8">
    <title>Local Purchase Order</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 20px; font-size: 12px; }
      .header { text-align: center; margin-bottom: 30px; }
      .company-name { font-size: 20px; font-weight: bold; }
      .logo { max-width: 100px; margin-bottom: 10px; }
      table { width: 100%; border-collapse: collapse; margin: 20px 0; }
      th, td { border: 1px solid #000; padding: 8px; text-align: left; }
      th { background-color: #f0f0f0; font-weight: bold; }
      .totals { margin-top: 30px; text-align: right; }
      .signature-section { margin-top: 50px; display: flex; justify-content: space-around; }
      .signature-line { border-top: 1px solid #000; width: 150px; text-align: center; margin-top: 40px; }
    </style>
  </head>
  <body>
    <div class="header">
      <div class="company-name">{{companyName}}</div>
      <div>{{storeName}}</div>
      <div style="margin-top: 10px; font-size: 14px; font-weight: bold;">LOCAL PURCHASE ORDER</div>
    </div>
    
    <table>
      <tr>
        <td><strong>LPO Number:</strong> {{lpoNumber}}</td>
        <td><strong>LPO Date:</strong> {{lpoDate}}</td>
      </tr>
      <tr>
        <td colspan="2"><strong>Vendor:</strong> {{vendorName}}</td>
      </tr>
    </table>
    
    <table>
      <thead>
        <tr>
          <th>S.No</th>
          <th>Item Code</th>
          <th>Description</th>
          <th>Qty</th>
          <th>Unit</th>
          <th>Unit Price</th>
          <th>Amount</th>
        </tr>
      </thead>
      <tbody>
        {{#items}}
        <tr>
          <td>{{@index + 1}}</td>
          <td>{{itemCode}}</td>
          <td>{{productName}}</td>
          <td>{{quantity}}</td>
          <td>{{unit}}</td>
          <td>{{unitPrice}}</td>
          <td>{{amount}}</td>
        </tr>
        {{/items}}
      </tbody>
    </table>
    
    <div class="totals">
      <div><strong>Subtotal:</strong> {{subtotal}}</div>
      <div><strong>Tax:</strong> {{tax}}</div>
      <div style="font-size: 14px; margin-top: 10px;"><strong>Total Amount:</strong> {{totalAmount}}</div>
    </div>
    
    <div class="signature-section">
      <div>
        <div class="signature-line">Authorized By</div>
      </div>
      <div>
        <div class="signature-line">Vendor Sign</div>
      </div>
    </div>
  </body>
</html>
`;

const defaultGrnHtml = `
<html>
  <head>
    <meta charset="UTF-8">
    <title>Goods Receipt Note</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 20px; font-size: 12px; }
      .header { text-align: center; margin-bottom: 30px; }
      .company-name { font-size: 20px; font-weight: bold; }
      .logo { max-width: 100px; margin-bottom: 10px; }
      table { width: 100%; border-collapse: collapse; margin: 20px 0; }
      th, td { border: 1px solid #000; padding: 8px; text-align: left; }
      th { background-color: #059669; color: white; font-weight: bold; }
      .totals { margin-top: 30px; text-align: right; }
      .signature-section { margin-top: 50px; display: flex; justify-content: space-around; }
      .signature-line { border-top: 1px solid #000; width: 150px; text-align: center; margin-top: 40px; }
    </style>
  </head>
  <body>
    <div class="header">
      <div class="company-name">{{companyName}}</div>
      <div>{{storeName}}</div>
      <div style="margin-top: 10px; font-size: 14px; font-weight: bold;">GOODS RECEIPT NOTE</div>
    </div>
    
    <table>
      <tr>
        <td><strong>GRN Number:</strong> {{grnNumber}}</td>
        <td><strong>GRN Date:</strong> {{grnDate}}</td>
      </tr>
      <tr>
        <td><strong>Vendor:</strong> {{vendorName}}</td>
        <td><strong>Invoice #:</strong> {{invoiceNumber}}</td>
      </tr>
    </table>
    
    <table>
      <thead>
        <tr>
          <th>S.No</th>
          <th>Item Code</th>
          <th>Description</th>
          <th>Qty</th>
          <th>Unit</th>
          <th>Cost/Unit</th>
          <th>Amount</th>
        </tr>
      </thead>
      <tbody>
        {{#items}}
        <tr>
          <td>{{@index + 1}}</td>
          <td>{{itemCode}}</td>
          <td>{{productName}}</td>
          <td>{{quantity}}</td>
          <td>{{unit}}</td>
          <td>{{costPerUnit}}</td>
          <td>{{amount}}</td>
        </tr>
        {{/items}}
      </tbody>
    </table>
    
    <div class="totals">
      <div><strong>Subtotal:</strong> {{subtotal}}</div>
      <div><strong>Tax:</strong> {{tax}}</div>
      <div style="font-size: 14px; margin-top: 10px;"><strong>Total Amount:</strong> {{totalAmount}}</div>
    </div>
    
    <div class="signature-section">
      <div>
        <div class="signature-line">Warehouse Officer</div>
      </div>
      <div>
        <div class="signature-line">Store Manager</div>
      </div>
    </div>
  </body>
</html>
`;

const defaultRtvHtml = `
<html>
  <head>
    <meta charset="UTF-8">
    <title>Return to Vendor</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 20px; font-size: 12px; }
      .header { text-align: center; margin-bottom: 30px; }
      .company-name { font-size: 20px; font-weight: bold; }
      .logo { max-width: 100px; margin-bottom: 10px; }
      table { width: 100%; border-collapse: collapse; margin: 20px 0; }
      th, td { border: 1px solid #000; padding: 8px; text-align: left; }
      th { background-color: #dc2626; color: white; font-weight: bold; }
      .totals { margin-top: 30px; text-align: right; }
      .signature-section { margin-top: 50px; display: flex; justify-content: space-around; }
      .signature-line { border-top: 1px solid #000; width: 150px; text-align: center; margin-top: 40px; }
    </style>
  </head>
  <body>
    <div class="header">
      <div class="company-name">{{companyName}}</div>
      <div>{{storeName}}</div>
      <div style="margin-top: 10px; font-size: 14px; font-weight: bold;">RETURN TO VENDOR</div>
    </div>
    
    <table>
      <tr>
        <td><strong>RTV Number:</strong> {{rtvNumber}}</td>
        <td><strong>RTV Date:</strong> {{rtvDate}}</td>
      </tr>
      <tr>
        <td><strong>Vendor:</strong> {{vendorName}}</td>
        <td><strong>Ref GRN #:</strong> {{refGrnNumber}}</td>
      </tr>
    </table>
    
    <table>
      <thead>
        <tr>
          <th>S.No</th>
          <th>Item Code</th>
          <th>Description</th>
          <th>Qty Returned</th>
          <th>Unit</th>
          <th>Unit Price</th>
          <th>Amount</th>
        </tr>
      </thead>
      <tbody>
        {{#items}}
        <tr>
          <td>{{@index + 1}}</td>
          <td>{{itemCode}}</td>
          <td>{{productName}}</td>
          <td>{{quantity}}</td>
          <td>{{unit}}</td>
          <td>{{unitPrice}}</td>
          <td>{{amount}}</td>
        </tr>
        {{/items}}
      </tbody>
    </table>
    
    <div class="totals">
      <div><strong>Subtotal:</strong> {{subtotal}}</div>
      <div><strong>Tax:</strong> {{tax}}</div>
      <div style="font-size: 14px; margin-top: 10px;"><strong>Total Return Amount:</strong> {{totalAmount}}</div>
    </div>
    
    <div class="signature-section">
      <div>
        <div class="signature-line">Warehouse Officer</div>
      </div>
      <div>
        <div class="signature-line">Vendor Representative</div>
      </div>
    </div>
  </body>
</html>
`;

export const seedDocumentTemplates = async () => {
  try {
    // Seed default LPO template
    const existingLpo = await LpoTemplate.findOne({ templateName: 'LPO_Standard_EN' });
    if (!existingLpo) {
      await LpoTemplate.create({
        templateName: 'LPO_Standard_EN',
        language: 'EN',
        templateType: 'LPO',
        includeLogo: true,
        customDesign: {
          headerColor: '#1e40af',
          bodyFont: 'Arial',
          pageSize: 'A4',
          margins: { top: 10, bottom: 10, left: 10, right: 10 }
        },
        htmlContent: defaultLpoHtml,
        cssContent: '',
        isActive: true,
        createdBy: 'system'
      });
      console.log('✅ Default LPO template created');
    }

    // Seed default GRN template
    const existingGrn = await GrnTemplate.findOne({ templateName: 'GRN_Standard_EN' });
    if (!existingGrn) {
      await GrnTemplate.create({
        templateName: 'GRN_Standard_EN',
        language: 'EN',
        templateType: 'GRN',
        includeLogo: true,
        customDesign: {
          headerColor: '#059669',
          bodyFont: 'Arial',
          showSerialNumbers: true,
          showBatchInfo: true,
          pageSize: 'A4',
          margins: { top: 10, bottom: 10, left: 10, right: 10 }
        },
        htmlContent: defaultGrnHtml,
        cssContent: '',
        isActive: true,
        createdBy: 'system'
      });
      console.log('✅ Default GRN template created');
    }

    // Seed default RTV template
    const existingRtv = await RtvTemplate.findOne({ templateName: 'RTV_Standard_EN' });
    if (!existingRtv) {
      await RtvTemplate.create({
        templateName: 'RTV_Standard_EN',
        language: 'EN',
        templateType: 'RTV',
        includeLogo: true,
        customDesign: {
          headerColor: '#dc2626',
          bodyFont: 'Arial',
          showSerialNumbers: true,
          showReturnReason: true,
          pageSize: 'A4',
          margins: { top: 10, bottom: 10, left: 10, right: 10 }
        },
        htmlContent: defaultRtvHtml,
        cssContent: '',
        isActive: true,
        createdBy: 'system'
      });
      console.log('✅ Default RTV template created');
    }
  } catch (error) {
    console.error('❌ Error seeding document templates:', error.message);
    throw error;
  }
};
