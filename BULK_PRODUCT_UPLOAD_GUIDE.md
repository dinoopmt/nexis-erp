# Bulk Product Upload Utility - Complete Implementation Guide

## Overview

The Bulk Product Upload Utility is a comprehensive feature that allows administrators to import multiple products into the NEXIS-ERP system via Excel (.xlsx, .xls, .csv) files. This implementation includes frontend components, backend API endpoints, validation, error handling, and progress tracking.

## Features

✅ **Excel Template Download** - Users can download a pre-formatted template with all required columns
✅ **File Upload & Preview** - Upload Excel files and preview the first 5 rows before import
✅ **Data Validation** - Client-side and server-side validation of all product fields
✅ **Error Reporting** - Detailed error messages showing specific rows and fields with issues
✅ **Progress Tracking** - Real-time upload progress bar during import
✅ **Batch Processing** - Efficient bulk insertion with transaction support
✅ **Duplicate Prevention** - Automatic checking for existing item codes and barcodes
✅ **Vendor/Category Lookup** - Automatic mapping of vendor and category names to database IDs
✅ **Results Summary** - Summary showing successful, failed, and skipped products

## File Structure

### Frontend Components

**Location:** `client/src/components/settings/general/BulkProductUpload.jsx`

The BulkProductUpload component provides:
- Template download functionality
- File upload input with validation
- Preview table showing first 5 rows
- Progress bar during upload
- Results summary with detailed error tracking
- Retry/reset functionality

### Backend Implementation

**Controller:** `server/modules/inventory/controllers/productController.js`
- New export: `bulkImportProducts` function
- Handles product import logic
- Vendor/category/unit type lookups
- Duplicate prevention
- Error tracking and reporting

**Routes:** `server/modules/inventory/routes/productRoutes.js`
- New route: `POST /api/v1/products/bulk-import`
- Accepts JSON payload with products array

### Integration

**GeneralSettings Component:** `client/src/components/settings/GeneralSettings.jsx`
- Added "Bulk Product Upload" tab with Upload icon
- Tab routing to BulkProductUpload component

## Excel Template Format

### Required Columns (Must be filled):
| Column | Type | Example | Validation |
|--------|------|---------|-----------|
| Item Code | Text | PROD001 | Unique, alphanumeric |
| Product Name | Text | White Rice 1KG | Non-empty |
| Vendor | Text | Rice Mills Inc | Must exist in system |
| Category | Text | Food Grains | Must exist as department |
| Unit Type | Text | KG | Must exist in system |
| Cost | Number | 450.00 | Positive number |
| Price | Number | 600.00 | Positive, > Cost |
| Stock Quantity | Number | 100 | Non-negative |

### Optional Columns:
| Column | Type | Example | Notes |
|--------|------|---------|-------|
| HSN Code | Text | 100630 | Optional for non-India countries |
| Tax Type | Text | GST | e.g., VAT, GST, Sales Tax |
| Tax % | Number | 5 | Default: 0 |
| Tax In Price | Text | No | Yes/No or true/false |
| Min Stock | Number | 20 | Default: 0 |
| Max Stock | Number | 500 | Default: 1000 |
| Reorder Qty | Number | 100 | Default: 100 |
| Track Expiry | Text | No | Yes/No |
| Short Name | Text | Rice | Optional |
| Local Name | Text | | Optional, for local language names |

### Sample Data:
```excel
Item Code | Product Name | HSN Code | Vendor | Category | Unit Type | Cost | Price | Tax Type | Tax % | Tax In Price | Stock Quantity | Min Stock | Max Stock | Reorder Qty | Track Expiry | Short Name | Local Name
PROD001 | White Rice 1KG | 100630 | Rice Mills Inc | Food Grains | KG | 450.00 | 600.00 | GST | 5 | No | 100 | 20 | 500 | 100 | No | Rice |
PROD002 | Wheat Flour 5KG | 110100 | Flour Mills Co | Food Grains | KG | 200.00 | 280.00 | GST | 5 | No | 50 | 10 | 200 | 50 | No | Flour |
```

## Validation Rules

### Client-Side Validation:
1. **File Type Check** - Only .xlsx, .xls, or .csv files accepted
2. **Required Fields** - Checks for all 8 required fields
3. **Numeric Validation** - Cost, Price, Stock, etc. are valid numbers
4. **Price vs Cost** - Warning if selling price < cost (allows proceed)
5. **Preview Display** - Shows first 5 rows before upload

### Server-Side Validation:
1. **Duplicate Item Codes** - Prevents duplicate item codes in database
2. **Duplicate Barcodes** - Auto-generated barcodes checked for uniqueness
3. **Numeric Validation** - Cost and Price must be > 0
4. **Vendor Lookup** - Vendor name must exist in system
5. **Category Lookup** - Category name must exist as a department (level 1)
6. **Unit Type Lookup** - Unit type symbol must exist in system
7. **Price > Cost** - Selling price must be >= cost

## API Endpoint

### POST /api/v1/products/bulk-import

**Request Body:**
```json
{
  "products": [
    {
      "Item Code": "PROD001",
      "Product Name": "White Rice 1KG",
      "HSN Code": "100630",
      "Vendor": "Rice Mills Inc",
      "Category": "Food Grains",
      "Unit Type": "KG",
      "Cost": "450.00",
      "Price": "600.00",
      "Tax Type": "GST",
      "Tax %": "5",
      "Tax In Price": "No",
      "Stock Quantity": "100",
      "Min Stock": "20",
      "Max Stock": "500",
      "Reorder Qty": "100",
      "Track Expiry": "No",
      "Short Name": "Rice",
      "Local Name": ""
    }
  ]
}
```

**Response:**
```json
{
  "message": "Bulk import completed. 2 successful, 0 failed, 0 skipped.",
  "successful": 2,
  "failed": 0,
  "skipped": 0,
  "errors": [],
  "createdProducts": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "itemcode": "PROD001",
      "name": "White Rice 1KG"
    },
    {
      "_id": "507f1f77bcf86cd799439012",
      "itemcode": "PROD002",
      "name": "Wheat Flour 5KG"
    }
  ]
}
```

## How to Use

### Step 1: Download Template
1. Navigate to General Settings → Bulk Product Upload
2. Click "Download Template" button
3. Open the downloaded Excel file in your spreadsheet application

### Step 2: Fill Product Data
1. Keep the header row intact
2. Add your products starting from row 2
3. Fill all required columns (* marked)
4. Leave optional columns blank if not needed
5. Save the file

### Step 3: Upload File
1. Click "Select File" button
2. Choose your prepared Excel file
3. Review the preview showing first 5 rows
4. Check data accuracy before proceeding

### Step 4: Import Products
1. Click "Import Products" button
2. Monitor progress bar during upload
3. Wait for completion

### Step 5: Review Results
1. Check the results summary:
   - **✅ Successful** - Products created successfully
   - **⚠️ Skipped** - Products with duplicate item codes (already exist)
   - **❌ Failed** - Products with validation errors
2. Review error details if any failures
3. Click "Upload Another File" to import more products

## Error Handling & Messages

### Common Errors:

| Error | Meaning | Solution |
|-------|---------|---------|
| Missing required field | A required column value is empty | Fill in all required columns |
| Invalid number | Cost/Price/Stock is not a valid number | Use numeric format (no text) |
| Selling price < cost | Price is less than cost | Set price higher than cost |
| Vendor not found | Vendor name doesn't exist | Create vendor first or check spelling |
| Category not found | Department doesn't exist | Create category first or check spelling |
| Unit Type not found | Unit symbol is invalid | Check available unit types in system |
| Item Code already exists | Duplicate item code | Change item code or delete existing product |
| Barcode collision | Generated barcode exists | Try again (regenerates random barcode) |

## Data Mapping & Lookups

The system performs the following lookups:

### Vendor Lookup
- **Field:** "Vendor" (from Excel)
- **Looks Up:** Vendor name in database (case-insensitive)
- **Creates:** Reference to Vendor._id
- **Error:** If vendor not found

### Category Lookup
- **Field:** "Category" (from Excel)
- **Looks Up:** Grouping with level="1" and matching name
- **Creates:** Reference to categoryId
- **Requirement:** Must be a Department (level 1), not subcategory

### Unit Type Lookup
- **Field:** "Unit Type" (from Excel)
- **Looks Up:** UnitType by unitSymbol (case-insensitive)
- **Creates:** Reference to unitType._id
- **Also Copies:** unitSymbol and unitDecimal to product

## Database Changes

Products created via bulk import have these characteristics:

```javascript
{
  _id: ObjectId,
  itemcode: "PROD001",        // From Excel
  name: "White Rice 1KG",     // From Excel
  barcode: "PROD001XXXX",     // Auto-generated (itemcode + random)
  vendor: ObjectId,            // From vendor lookup
  categoryId: ObjectId,        // From category lookup
  unitType: ObjectId,          // From unit type lookup
  cost: 450,
  price: 600,
  stock: 100,
  hsn: "100630",              // Optional
  taxType: "GST",
  taxPercent: 5,
  taxInPrice: false,
  minStock: 20,
  maxStock: 500,
  reorderQuantity: 100,
  trackExpiry: false,
  shortName: "Rice",
  localName: "",
  isDeleted: false,
  createdAt: ISODate,
  updateDate: ISODate
}
```

## Performance Considerations

- **Batch Size:** Products can be imported in batches
- **Database Lookups:** Vendors, categories, and unit types are fetched once at start
- **Duplicate Checking:** Item codes and barcodes are checked against database
- **Estimated Time:**
  - 10 products: ~2-3 seconds
  - 100 products: ~10-15 seconds
  - 1000 products: ~60-90 seconds

## Limitations & Future Enhancements

### Current Limitations:
- Does not support packing units import
- Does not support pricing levels import
- Does not support product images
- Barcodes are auto-generated (not from Excel)
- No partial imports (all-or-nothing per product)

### Future Enhancements:
- Support for packing units via separate sheets
- Support for pricing levels
- Barcode input from Excel file
- Batch/lot number support
- SKU field support
- Brand field selection
- Grouping (subcategory) support
- Preview & mapping confirmation UI
- Scheduled bulk imports
- Import history tracking
- Excel file template customization

## Dependencies

### Frontend:
- **xlsx** (v0.18.5) - Excel parsing in browser
- **react-hot-toast** - Toast notifications
- **axios** - API requests
- **lucide-react** - Icons

### Backend:
- **mongoose** - Database queries
- **express** - API routing
- Models: Product, Vendor, Grouping, UnitType

## Troubleshooting

### Issue: "No data found in the uploaded file"
- **Cause:** Empty Excel sheet or no rows with data
- **Solution:** Add product data starting from row 2

### Issue: "Validation errors found"
- **Cause:** Missing or invalid data in required columns
- **Solution:** Review error messages and correct data before re-upload

### Issue: "Vendor not found"
- **Cause:** Vendor name doesn't match exactly in system
- **Solution:** Create vendor or ensure exact name match (case-insensitive)

### Issue: "Upload takes too long"
- **Cause:** Large number of products or slow connection
- **Solution:** Try splitting into smaller files (max ~500 products per file)

## Code Examples

### Frontend Usage

```javascript
import BulkProductUpload from '@/components/settings/general/BulkProductUpload';

function SettingsPage() {
  return (
    <div>
      <BulkProductUpload />
    </div>
  );
}
```

### API Integration

```javascript
const uploadProducts = async (productsArray) => {
  try {
    const response = await axios.post(
      `${API_URL}/api/v1/products/bulk-import`,
      { products: productsArray }
    );
    
    console.log(`Imported: ${response.data.successful} products`);
    console.log(`Failed: ${response.data.failed} products`);
    console.log(`Errors:`, response.data.errors);
    
    return response.data;
  } catch (error) {
    console.error('Import failed:', error);
    throw error;
  }
};
```

## Support & Feedback

For issues, feature requests, or feedback on the Bulk Product Upload utility, please contact the development team.

---

**Last Updated:** March 12, 2026
**Version:** 1.0.0
**Status:** Production Ready
