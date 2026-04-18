/**
 * Barcode Template API - Test Examples
 * Base URL: http://localhost:5000/api/v1/barcode-templates
 */

// ============ EXAMPLE 1: GET ALL TEMPLATES ============
// GET /api/v1/barcode-templates

fetch('http://localhost:5000/api/v1/barcode-templates')
  .then(res => res.json())
  .then(data => console.log(data))
  .catch(err => console.error(err));

// Response:
// {
//   "success": true,
//   "data": [
//     {
//       "_id": "...",
//       "templateName": "BARCODE_DEFAULT_WITHOUT_PRICE",
//       "configTxt": "SIZE 38 mm, 25 mm\nDIRECTION 1\n...",
//       "customDesign": { ... },
//       "isActive": true,
//       "isDefault": true,
//       "deleted": false
//     }
//   ]
// }


// ============ EXAMPLE 2: CREATE NEW BARCODE TEMPLATE ============
// POST /api/v1/barcode-templates

const newTemplate = {
  templateName: "BARCODE_CUSTOM_TEST",
  configTxt: `SIZE 40 mm, 30 mm
DIRECTION 1
REFERENCE 0,0
OFFSET 0 mm
SET PEEL OFF
SET TEAR ON
CLS
TEXT 10,50,"1",0,1,1,"{ITEM_NAME}"
BARCODE 50,120,"128",50,2,0,2,2,"{BARCODE}"
PRINT 1,{LABEL_QUANTITY}`,
  
  customDesign: {
    format: "CODE128",
    pageSize: "CUSTOM",
    width: 40,
    height: 30,
    includeProductCode: true,
    includeProductName: true,
    includePrice: false,
    dpi: 203,
    marginTop: 0,
    marginBottom: 0,
    marginLeft: 0,
    marginRight: 0
  },
  
  description: "Custom 40x30mm barcode label for testing",
  isActive: true,
  isDefault: false
};

fetch('http://localhost:5000/api/v1/barcode-templates', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(newTemplate)
})
  .then(res => res.json())
  .then(data => console.log(data))
  .catch(err => console.error(err));


// ============ EXAMPLE 3: GET TEMPLATE BY ID ============
// GET /api/v1/barcode-templates/:id

const templateId = "507f1f77bcf86cd799439011";

fetch(`http://localhost:5000/api/v1/barcode-templates/${templateId}`)
  .then(res => res.json())
  .then(data => console.log(data))
  .catch(err => console.error(err));


// ============ EXAMPLE 4: GET DEFAULT TEMPLATE ============
// GET /api/v1/barcode-templates/default/template

fetch('http://localhost:5000/api/v1/barcode-templates/default/template')
  .then(res => res.json())
  .then(data => console.log(data))
  .catch(err => console.error(err));


// ============ EXAMPLE 5: GET TEMPLATE BY FORMAT ============
// GET /api/v1/barcode-templates/format/CODE128

fetch('http://localhost:5000/api/v1/barcode-templates/format/CODE128')
  .then(res => res.json())
  .then(data => console.log(data))
  .catch(err => console.error(err));


// ============ EXAMPLE 6: UPDATE TEMPLATE ============
// PUT /api/v1/barcode-templates/:id

const updateData = {
  description: "Updated description for barcode template",
  customDesign: {
    format: "CODE128",
    pageSize: "4x6",
    width: 38,
    height: 25,
    includePrice: true, // Changed to include price
    dpi: 203
  },
  isActive: true
};

fetch(`http://localhost:5000/api/v1/barcode-templates/${templateId}`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(updateData)
})
  .then(res => res.json())
  .then(data => console.log(data))
  .catch(err => console.error(err));


// ============ EXAMPLE 7: SET AS DEFAULT ============
// PUT /api/v1/barcode-templates/:id/set-default

fetch(`http://localhost:5000/api/v1/barcode-templates/${templateId}/set-default`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({})
})
  .then(res => res.json())
  .then(data => console.log(data))
  .catch(err => console.error(err));


// ============ EXAMPLE 8: CLONE TEMPLATE ============
// POST /api/v1/barcode-templates/:id/clone

const cloneData = {
  newName: "BARCODE_CLONED_COPY"
};

fetch(`http://localhost:5000/api/v1/barcode-templates/${templateId}/clone`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(cloneData)
})
  .then(res => res.json())
  .then(data => console.log(data))
  .catch(err => console.error(err));


// ============ EXAMPLE 9: GET BY PAGE SIZE ============
// GET /api/v1/barcode-templates/size/4x6

fetch('http://localhost:5000/api/v1/barcode-templates/size/4x6')
  .then(res => res.json())
  .then(data => console.log(data))
  .catch(err => console.error(err));


// ============ EXAMPLE 10: DELETE TEMPLATE ============
// DELETE /api/v1/barcode-templates/:id

fetch(`http://localhost:5000/api/v1/barcode-templates/${templateId}`, {
  method: 'DELETE'
})
  .then(res => res.json())
  .then(data => console.log(data))
  .catch(err => console.error(err));


// ============ TEMPLATE VARIABLES FOR CONFIG TEXT ============
/**
 * Available variables to use in configTxt (printer commands):
 * 
 * {BARCODE}           - Product barcode/SKU
 * {ITEM_NAME}         - Product name
 * {ITEM_CODE}         - Product item code
 * {PRICE}             - Product selling price
 * {COST_PRICE}        - Product cost price
 * {QUANTITY}          - Quantity (from transaction)
 * {LABEL_QUANTITY}    - Number of labels to print
 * {EXPIRY_DATE}       - Product expiry date
 * {BATCH_NUMBER}      - Batch/Lot number
 * {DATE}              - Current date
 * {TIME}              - Current time
 * {UNIT}              - Unit of measurement
 * {CURRENCY}          - Currency symbol
 * 
 * Example Config:
 * ```
 * TEXT 10,50,"1",0,1,1,"{ITEM_NAME} - {PRICE} {CURRENCY}"
 * BARCODE 50,120,"128",50,2,0,2,2,"{BARCODE}"
 * TEXT 10,200,"1",0,1,1,"Exp: {EXPIRY_DATE}"
 * ```
 */


// ============ SEEDED TEMPLATES (On Server Startup) ============
/**
 * 1. BARCODE_DEFAULT_WITHOUT_PRICE
 *    - 38x25mm label
 *    - Shows: Product Name + Barcode
 *    - Format: CODE128
 *    - Default: Yes
 * 
 * 2. BARCODE_WITH_PRICE
 *    - 38x25mm label
 *    - Shows: Product Name + Price + Barcode
 *    - Format: CODE128
 *    - Default: No
 * 
 * 3. BARCODE_SMALL_30x20
 *    - 30x20mm label
 *    - Shows: Barcode only (compact)
 *    - Format: CODE128
 *    - Default: No
 * 
 * 4. BARCODE_LARGE_50x40
 *    - 50x40mm label
 *    - Shows: Product Name + SKU + Barcode
 *    - Format: CODE128
 *    - Default: No
 */
