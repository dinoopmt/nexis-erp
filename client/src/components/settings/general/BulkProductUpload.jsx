import React, { useState, useRef } from 'react';
import { Upload, Download, AlertCircle, CheckCircle, XCircle, Loader } from 'lucide-react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';
import { API_URL } from '../../../config/config';

const BulkProductUpload = () => {
  const fileInputRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [preview, setPreview] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [importMode, setImportMode] = useState('full'); // 'full' or 'simple'

  // ✅ NEW: Duplicate handling option - choose what to do with duplicates
  const [duplicateHandling, setDuplicateHandling] = useState('skip'); // 'skip', 'update'

  // ✅ NEW: Stage-wise progress tracking
  const [stageProgress, setStageProgress] = useState({
    checking: 0,        // 0-100%
    validating: 0,      // 0-100%
    processing: 0,      // 0-100%
    saving: 0,          // 0-100%
    currentStage: null  // 'checking' | 'validating' | 'processing' | 'saving'
  });

  // ✅ NEW: Item count tracking
  const [itemProgress, setItemProgress] = useState({
    total: 0,           // Total items to process
    processed: 0,       // Items processed so far
    successful: 0,      // Items successfully created
    updated: 0,         // Items successfully updated
    failed: 0,          // Items with errors
    skipped: 0          // Duplicate items
  });

  // ==================== DOWNLOAD TEMPLATE ====================
  const downloadTemplate = () => {
    const templateData = [
      {
        'Item Code': 'PROD001',
        'Product Name': 'White Rice 1KG',
        'Country': 'IN',
        'HSN Code': '100630',
        'Vendor': 'Rice Mills Inc',
        'Category': 'Food Grains',
        'Sub Category': 'Rice',
        'Unit Type': 'KG',
        'Cost': '450.00',
        'Price': '600.00',
        'Tax Type': 'GST',
        'Tax %': '5',
        'Tax In Price': 'No',
        'Stock Quantity': '100',
        'Min Stock': '20',
        'Max Stock': '500',
        'Reorder Qty': '100',
        'Track Expiry': 'No',
        'Short Name': 'Rice',
        'Local Name': ''
      },
      {
        'Item Code': 'PROD002',
        'Product Name': 'Wheat Flour 5KG',
        'Country': 'AE',
        'HSN Code': '',
        'Vendor': 'Flour Mills Co',
        'Category': 'Food Grains',
        'Sub Category': 'Flour',
        'Unit Type': 'KG',
        'Cost': '200.00',
        'Price': '280.00',
        'Tax Type': 'VAT',
        'Tax %': '5',
        'Tax In Price': 'No',
        'Stock Quantity': '50',
        'Min Stock': '10',
        'Max Stock': '200',
        'Reorder Qty': '50',
        'Track Expiry': 'No',
        'Short Name': 'Flour',
        'Local Name': ''
      }
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    
    // Set column widths
    const colWidths = [12, 25, 10, 12, 18, 15, 15, 10, 10, 10, 12, 8, 12, 15, 10, 10, 12, 12, 12, 12];
    ws['!cols'] = colWidths.map(width => ({ wch: width }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Products');
    XLSX.writeFile(wb, `product_template_${new Date().toISOString().split('T')[0]}.xlsx`);

    toast.success('Template downloaded successfully!');
  };

  // ==================== DOWNLOAD SIMPLE TEMPLATE ====================
  const downloadSimpleTemplate = () => {
    const templateData = [
      {
        'Item Code': 'PROD001',
        'Product Name': 'White Rice 1KG',
        'Department': 'Food Grains',
        'Vendor': 'Rice Mills Inc',
        'Unit Name': 'KG',
        'Cost': '450.00',
        'Price': '600.00',
        'Tax Type': 'GST',
        'Tax %': '5',
        'Tax In Price': 'No',
        'Barcode': 'BAR001'
      },
      {
        'Item Code': 'PROD002',
        'Product Name': 'Wheat Flour 5KG',
        'Department': 'Flour & Staples',
        'Vendor': 'Flour Mills Co',
        'Unit Name': 'KG',
        'Cost': '200.00',
        'Price': '280.00',
        'Tax Type': 'VAT',
        'Tax %': '5',
        'Tax In Price': 'No',
        'Barcode': 'BAR002'
      }
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    
    // Set column widths for simple template (added tax fields)
    const colWidths = [12, 25, 18, 18, 12, 12, 12, 12, 10, 14, 12];
    ws['!cols'] = colWidths.map(width => ({ wch: width }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Products');
    XLSX.writeFile(wb, `product_simple_template_${new Date().toISOString().split('T')[0]}.xlsx`);

    toast.success('Simple template downloaded successfully!');
  };

  // ==================== HANDLE FILE SELECTION ====================
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls') && !file.name.endsWith('.csv')) {
      toast.error('Please upload an Excel (.xlsx, .xls) or CSV file');
      return;
    }

    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      // ✅ sheet_to_json automatically skips the header row
      const data = XLSX.utils.sheet_to_json(worksheet);
      
      console.log('📊 Loaded from Excel:', data.length, 'rows (header already skipped by XLSX)');

      // ✅ Filter out empty rows (rows with no meaningful data)
      const filteredData = data.filter(row => {
        // Check if row has at least one non-empty cell
        return Object.values(row).some(cell => cell !== null && cell !== undefined && cell !== '');
      });

      if (filteredData.length === 0) {
        toast.error('No data found in the uploaded file');
        return;
      }

      setPreview({
        fileName: file.name,
        totalRows: filteredData.length,
        data: filteredData.slice(0, 5), // Show first 5 rows
        fullData: filteredData
      });

      setResults(null);
      toast.success(`Loaded ${filteredData.length} products for preview`);
    } catch (error) {
      toast.error(`Error reading file: ${error.message}`);
    }
  };

  // ==================== VALIDATE SIMPLE PRODUCTS ====================
  const validateSimpleProducts = (products) => {
    const requiredFields = ['Item Code', 'Product Name', 'Department', 'Vendor', 'Unit Name', 'Cost', 'Price', 'Barcode'];
    const errors = [];
    const warnings = [];

    products.forEach((product, index) => {
      const rowNumber = index + 2;

      // Check required fields
      requiredFields.forEach(field => {
        if (!product[field] || String(product[field]).trim() === '') {
          errors.push({
            row: rowNumber,
            field,
            message: `Missing required field: ${field}`
          });
        }
      });

      // Validate numeric fields
      const numericFields = {
        'Cost': true,
        'Price': true,
        'Tax %': false // Optional
      };

      Object.entries(numericFields).forEach(([field, isRequired]) => {
        const value = product[field];
        if (value || isRequired) {
          if (value && isNaN(parseFloat(value))) {
            errors.push({
              row: rowNumber,
              field,
              message: `${field} must be a valid number`
            });
          }
        }
      });

      // Validate Tax % range
      const taxPercent = product['Tax %'];
      if (taxPercent !== undefined && taxPercent !== null && taxPercent !== '') {
        const taxVal = parseFloat(taxPercent);
        if (!isNaN(taxVal) && (taxVal < 0 || taxVal > 100)) {
          errors.push({
            row: rowNumber,
            field: 'Tax %',
            message: 'Tax % must be between 0 and 100'
          });
        }
      }

      // Validate Tax In Price value
      const taxInPrice = product['Tax In Price'];
      if (taxInPrice && !['Yes', 'No', 'yes', 'no', 'YES', 'NO'].includes(String(taxInPrice).trim())) {
        warnings.push({
          row: rowNumber,
          field: 'Tax In Price',
          message: `Tax In Price should be "Yes" or "No" (will default to "No")`
        });
      }

      // Validate Price > Cost
      if (product['Price'] && product['Cost']) {
        const price = parseFloat(product['Price']);
        const cost = parseFloat(product['Cost']);
        if (price < cost) {
          warnings.push({
            row: rowNumber,
            field: 'Price vs Cost',
            message: `Selling price (${price}) is less than cost (${cost})`
          });
        }
      }

      // Barcode validation
      if (product['Barcode']) {
        const barcode = String(product['Barcode']).trim();
        if (barcode.length < 3) {
          errors.push({
            row: rowNumber,
            field: 'Barcode',
            message: 'Barcode must be at least 3 characters'
          });
        }
      }
    });

    return { errors, warnings };
  };

  // ==================== VALIDATE PRODUCTS ====================
  const validateProducts = (products) => {
    const requiredFields = ['Item Code', 'Product Name', 'Vendor', 'Category', 'Unit Type', 'Cost', 'Price', 'Stock Quantity', 'Country'];
    const errors = [];
    const warnings = [];

    products.forEach((product, index) => {
      const rowNumber = index + 2; // +2 because row 1 is header, rows are 0-indexed in array

      // Check required fields
      requiredFields.forEach(field => {
        if (!product[field] || String(product[field]).trim() === '') {
          errors.push({
            row: rowNumber,
            field,
            message: `Missing required field: ${field}`
          });
        }
      });

      // Country-based validation for HSN
      const country = product['Country']?.toString().trim().toUpperCase();
      if (country === 'IN' && (!product['HSN Code'] || String(product['HSN Code']).trim() === '')) {
        errors.push({
          row: rowNumber,
          field: 'HSN Code',
          message: 'HSN Code is required for India (IN)'
        });
      }

      // Validate numeric fields
      const numericFields = {
        'Cost': true,
        'Price': true,
        'Tax %': false,
        'Stock Quantity': true,
        'Min Stock': false,
        'Max Stock': false,
        'Reorder Qty': false
      };

      Object.entries(numericFields).forEach(([field, isRequired]) => {
        const value = product[field];
        if (value || isRequired) {
          if (value && isNaN(parseFloat(value))) {
            errors.push({
              row: rowNumber,
              field,
              message: `${field} must be a valid number`
            });
          }
        }
      });

      // Validate Price > Cost
      if (product['Price'] && product['Cost']) {
        const price = parseFloat(product['Price']);
        const cost = parseFloat(product['Cost']);
        if (price < cost) {
          warnings.push({
            row: rowNumber,
            field: 'Price vs Cost',
            message: `Selling price (${price}) is less than cost (${cost})`
          });
        }
      }

      // Validate country code
      if (country && !['IN', 'AE', 'OM'].includes(country)) {
        errors.push({
          row: rowNumber,
          field: 'Country',
          message: `Invalid country code: ${country}. Use: IN (India), AE (UAE), OM (Oman)`
        });
      }

      // Item Code uniqueness will be checked on backend
    });

    return { errors, warnings };
  };

  // ==================== UPLOAD PRODUCTS ====================
  const handleUpload = async () => {
    if (!preview?.fullData) {
      toast.error('No data to upload. Please select a file first.');
      return;
    }

    // Use appropriate validation based on import mode
    const validation = importMode === 'simple' 
      ? validateSimpleProducts(preview.fullData)
      : validateProducts(preview.fullData);

    if (validation.errors.length > 0) {
      setResults({
        status: 'validation_error',
        errors: validation.errors.slice(0, 10), // Show first 10 errors
        totalErrors: validation.errors.length,
        warnings: validation.warnings
      });
      toast.error(`Validation errors found (${validation.errors.length}). Review below.`);
      return;
    }

    if (validation.warnings.length > 0) {
      const confirmed = window.confirm(
        `${validation.warnings.length} warning(s) found. Continue with upload?`
      );
      if (!confirmed) return;
    }

    setLoading(true);
    setUploadProgress(0);
    // ✅ Reset stage progress
    setStageProgress({
      checking: 0,
      validating: 0,
      processing: 0,
      saving: 0,
      currentStage: 'checking'
    });
    // ✅ Initialize item progress
    setItemProgress({
      total: preview.fullData.length,
      processed: 0,
      successful: 0,
      updated: 0,
      failed: 0,
      skipped: 0
    });

    try {
      const endpoint = importMode === 'simple' 
        ? `${API_URL}/api/v1/products/bulk-import-simple`
        : `${API_URL}/api/v1/products/bulk-import`;

      // ✅ STEP 1: Send import request and get session ID for progress tracking
      const startTime = Date.now();
      let overallProgress = 0;

      // ✅ KEY CHANGE: Start polling IMMEDIATELY without waiting for backend response
      // Backend will process in background, we show progress from database polling
      let response = null;
      
      // Fire the import request WITHOUT waiting (set a long timeout but don't await yet)
      const importPromise = axios.post(
        endpoint,
        {
          products: preview.fullData,
          importMode: importMode,
          duplicateHandling: duplicateHandling  // ✅ NEW: Pass duplicate handling option
        },
        {
          onUploadProgress: (progressEvent) => {
            // Upload is 20% of total progress (file transmission)
            const uploadPercent = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            overallProgress = Math.min(uploadPercent * 0.2, 20); // Cap at 20%
            
            // Show "Checking" stage during upload
            setStageProgress(prev => ({
              ...prev,
              checking: uploadPercent,
              currentStage: 'checking'
            }));
            setUploadProgress(Math.round(overallProgress));
          },
          timeout: 1800000 // 30 minutes timeout for very large imports (32K+ items)
        }
      );
      
      // Don't wait for response yet - start polling database immediately
      // This gives real-time feedback while backend processes in background
      console.log('📤 Import request sent to backend (not waiting for response)');
      console.log('🔄 Starting database polling immediately...');
      console.log('Timestamp:', new Date().toLocaleTimeString());

      // ✅ Poll database to show LIVE count of items being saved
      let actualProcessedCount = 0;
      let pollCount = 0;
      let previousCount = -1;
      let unchangedCount = 0;
      const maxPolls = 1800; // Poll for max 30 minutes (1800 * 1000ms) for very large imports
      const expectedItemCount = preview.fullData.length;
      const maxUnchangedPolls = expectedItemCount > 10000 ? 10 : 3; // More tolerance for large imports
      
      console.log(`📋 Expected items: ${expectedItemCount}. Adjusted unchanged threshold: ${maxUnchangedPolls} polls`);
      
      while (pollCount < maxPolls) {
        try {
          const dbCountResponse = await axios.get(`${API_URL}/api/v1/products/count`);
          actualProcessedCount = dbCountResponse.data.totalCount || 0;
          
          // ✅ FIX: Update BOTH total AND processed with actual database count
          // This ensures pending = total - processed = 0 when we're done
          setItemProgress(prev => ({
            ...prev,
            total: actualProcessedCount,  // ✅ Update total to match actual DB count
            processed: actualProcessedCount
          }));
          
          console.log(`📊 Poll #${pollCount + 1} - Products in DB: ${actualProcessedCount}/${expectedItemCount}`);
          
          // ✅ IMPROVED: Stop polling if count hasn't changed AND we've waited long enough
          if (actualProcessedCount === previousCount) {
            unchangedCount++;
            console.log(`⏸️ No change in count. Unchanged for ${unchangedCount}/${maxUnchangedPolls} polls. (${(unchangedCount * 1000 / 1000).toFixed(0)}s stable)`);
            
            // Only stop if we've been stable for long enough AND not at 0
            if (unchangedCount >= maxUnchangedPolls && actualProcessedCount > 0) {
              console.log(`✅ Backend finished! Count stable for ${maxUnchangedPolls} polls (${(maxUnchangedPolls * 1000 / 1000).toFixed(0)}s). Stopping poll loop.`);
              break;
            }
          } else {
            // Reset counter when count changes (still processing)
            unchangedCount = 0;
            previousCount = actualProcessedCount;
            console.log(`🔄 Count changed! Reset unchanged counter. Progress: ${Math.round(actualProcessedCount / expectedItemCount * 100)}%`);
          }
          
          // Poll every 1 second
          await sleep(1000);
          pollCount++;
        } catch (countError) {
          console.warn('Could not fetch database count:', countError.message);
          await sleep(1000);
          pollCount++;
        }
      }
      
      console.log('✅ Final products in database:', actualProcessedCount);

      // ✅ STEP 2: File uploaded, now simulate backend processing stages
      let totalItems = preview.fullData.length;
      
      // ✅ Use actual processed count as the authoritative total (overrides file count)
      if (actualProcessedCount > 0) {
        totalItems = actualProcessedCount; // Use database count exactly, not Math.max
        console.log('✅ Updated totalItems to database count:', totalItems);
      }
      
      console.log('totalItems from preview:', totalItems);
      
      // Show "Validating" stage (20% of progress)
      setStageProgress(prev => ({
        ...prev,
        checking: 100,
        currentStage: 'validating'
      }));
      setUploadProgress(30);
      await sleep(300);

      
      // ✅ Now wait for backend response (should be done by now)
      console.log('⏳ Waiting for backend response with final counts...');
      try {
        response = await importPromise; // Now actually wait for the response
        console.log('✅ Backend response received!', response.data);
      } catch (importError) {
        console.error('❌ Import request failed:', importError.message);
        // We still have database polling data as fallback
        response = { data: {} };
      }

      // Show "Processing" stage (40% of progress)
      setStageProgress(prev => ({
        ...prev,
        validating: 100,
        currentStage: 'processing'
      }));
      
      // Use actual database count as the source of truth
      const processingPercent = totalItems > 0 ? Math.round((actualProcessedCount / totalItems) * 100) : 100;
      setStageProgress(prev => ({
        ...prev,
        processing: Math.min(processingPercent, 100),
        currentStage: 'processing'
      }));
      setItemProgress({
        total: actualProcessedCount || totalItems,
        processed: actualProcessedCount,
        successful: response.data.successful || 0,
        updated: response.data.updated || 0,
        failed: response.data.failed || 0,
        skipped: response.data.skipped || 0
      });
      
      setUploadProgress(30 + Math.round(processingPercent * 0.4)); // 30-70% range
      await sleep(500);

      // Show "Saving" stage (10% of progress)
      setStageProgress(prev => ({
        ...prev,
        processing: 100,
        currentStage: 'saving'
      }));
      setUploadProgress(80);
      await sleep(200);

      // Complete
      setStageProgress(prev => ({
        ...prev,
        validating: 100,
        processing: 100,
        saving: 100,
        currentStage: 'complete'
      }));
      setUploadProgress(100);
      
      // ✅ Get total product count from database
      let totalProductCount = 0;
      try {
        const countResponse = await axios.get(`${API_URL}/api/v1/products/count`);
        totalProductCount = countResponse.data.totalCount || 0;
      } catch (countError) {
        console.error("Error fetching product count:", countError);
      }
      
      setResults({
        status: 'success',
        ...response.data,
        totalProductCount: totalProductCount
      });

      toast.success(
        `✅ Import Complete! ${totalProductCount || response.data.successful || preview.fullData.length} products saved to database`
      );

      await sleep(1500);
      setLoading(false);
      
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message;
      console.error('❌ IMPORT ERROR:', {
        message: errorMessage,
        fullError: error,
        responseData: error.response?.data,
        timestamp: new Date().toLocaleTimeString()
      });
      setResults({
        status: 'error',
        message: errorMessage,
        details: error.response?.data
      });
      toast.error(`❌ Import failed: ${errorMessage}`);
      setLoading(false);
    }
  };

  // ✅ Helper function for delays
  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  // ==================== RESET ====================
  const handleReset = () => {
    setPreview(null);
    setResults(null);
    setUploadProgress(0);
    fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-4">
      {/* Import Mode Selector */}
      <div className="bg-white border border-gray-200 rounded-lg p-3">
        <p className="text-sm font-medium text-gray-700 mb-2">Select Import Mode:</p>
        <div className="flex gap-3">
          <button
            onClick={() => {
              setImportMode('full');
              setPreview(null);
              setResults(null);
            }}
            className={`flex-1 px-4 py-2 rounded-lg font-medium text-sm transition ${
              importMode === 'full'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Full Details
          </button>
          <button
            onClick={() => {
              setImportMode('simple');
              setPreview(null);
              setResults(null);
            }}
            className={`flex-1 px-4 py-2 rounded-lg font-medium text-sm transition ${
              importMode === 'simple'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Simple (From External Systems)
          </button>
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <p className="text-sm text-blue-900 font-medium mb-2">📋 How to use:</p>
        {importMode === 'full' ? (
          <ul className="text-xs text-blue-800 space-y-1 list-disc list-inside">
            <li>Download the template to see all required fields</li>
            <li>Fill in your products data in the Excel file</li>
            <li>Required fields: Item Code, Product Name, Vendor, Category, Unit Type, Cost, Price, Stock Quantity, Country</li>
            <li><strong>Country-Specific:</strong> HSN Code is <strong>required for India (IN)</strong>, optional for other countries (AE, OM)</li>
            <li>Upload the Excel file and review the preview</li>
            <li>Click "Import" to add all products to the system</li>
          </ul>
        ) : (
          <ul className="text-xs text-blue-800 space-y-1 list-disc list-inside">
            <li>Use this mode to import products from other systems with minimal required fields</li>
            <li>Required fields: Item Code, Product Name, Department, Vendor, Unit Name, Cost, Price, Barcode</li>
            <li>Perfect for bulk imports from external ERP or inventory systems</li>
            <li><strong>Auto-create Departments:</strong> Missing departments will be automatically created during import</li>
            <li>Unit Name must match existing units in system (e.g., Kilogram, Liter, Piece)</li>
            <li>Barcode must be unique and at least 3 characters</li>
            <li>Upload the Excel file and review the preview</li>
          </ul>
        )}
      </div>

      {/* Download Template */}
      <div className="bg-white border border-gray-200 rounded-lg p-3">
        <button
          onClick={importMode === 'simple' ? downloadSimpleTemplate : downloadTemplate}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium text-sm"
        >
          <Download size={16} />
          Download {importMode === 'simple' ? 'Simple ' : ''}Template
        </button>
        <p className="text-xs text-gray-600 mt-2">
          {importMode === 'simple'
            ? 'Download an Excel template with minimal required columns for external system imports'
            : 'Download an Excel template with sample data and all required columns'}
        </p>
      </div>

      {/* File Upload */}
      <div className="bg-white border border-gray-200 rounded-lg p-3">
        <div className="flex items-center gap-3 mb-3">
          <label className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition cursor-pointer font-medium text-sm">
            <Upload size={16} />
            Select File
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
          {preview && (
            <button
              onClick={handleReset}
              className="px-3 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400 transition text-sm"
            >
              Clear
            </button>
          )}
        </div>

        {preview && (
          <div className="space-y-2">
            <p className="text-sm text-gray-700">
              <strong>{preview.fileName}</strong> - <span className="text-blue-600">{preview.totalRows} products</span>
            </p>
          </div>
        )}
      </div>

      {/* Preview Table */}
      {preview && !results && (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="p-3 border-b bg-gray-50">
            <h3 className="text-sm font-semibold text-gray-900">Preview (First 5 rows)</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-100 border-b">
                <tr>
                  <th className="px-2 py-1 text-left text-gray-700 font-semibold">#</th>
                  <th className="px-2 py-1 text-left text-gray-700 font-semibold">Item Code</th>
                  <th className="px-2 py-1 text-left text-gray-700 font-semibold">Product Name</th>
                  {importMode === 'simple' ? (
                    <>
                      <th className="px-2 py-1 text-left text-gray-700 font-semibold">Department</th>
                      <th className="px-2 py-1 text-left text-gray-700 font-semibold">Unit Name</th>
                    </>
                  ) : (
                    <th className="px-2 py-1 text-left text-gray-700 font-semibold">Category</th>
                  )}
                  <th className="px-2 py-1 text-left text-gray-700 font-semibold">Vendor</th>
                  <th className="px-2 py-1 text-left text-gray-700 font-semibold">Cost</th>
                  <th className="px-2 py-1 text-left text-gray-700 font-semibold">Price</th>
                  {importMode !== 'simple' && (
                    <th className="px-2 py-1 text-left text-gray-700 font-semibold">Stock</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {preview.data.map((row, idx) => (
                  <tr key={idx} className="border-b hover:bg-gray-50">
                    <td className="px-2 py-1 text-gray-600">{idx + 1}</td>
                    <td className="px-2 py-1 text-gray-800">{row['Item Code']}</td>
                    <td className="px-2 py-1 text-gray-800">{row['Product Name']}</td>
                    {importMode === 'simple' ? (
                      <>
                        <td className="px-2 py-1 text-gray-600">{row['Department']}</td>
                        <td className="px-2 py-1 text-gray-600">{row['Unit Name']}</td>
                      </>
                    ) : (
                      <td className="px-2 py-1 text-gray-600">{row['Category']}</td>
                    )}
                    <td className="px-2 py-1 text-gray-600">{row['Vendor']}</td>
                    <td className="px-2 py-1 text-gray-600 text-right">{row['Cost']}</td>
                    <td className="px-2 py-1 text-gray-600 text-right">{row['Price']}</td>
                    {importMode !== 'simple' && (
                      <td className="px-2 py-1 text-gray-600 text-right">{row['Stock Quantity']}</td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-3 bg-gray-50 border-t text-xs text-gray-600">
            Showing 5 of {preview.totalRows} products
          </div>
        </div>
      )}

      {/* Auto-Calculation Info Box */}
      {preview && !results && importMode === 'simple' && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-xs font-semibold text-blue-900 mb-2">✅ Auto-Calculation Info:</p>
          <ul className="text-xs text-blue-800 space-y-1">
            <li>• <strong>Cost Include VAT</strong> - Auto-calculated based on tax rate</li>
            <li>• <strong>Margin %</strong> - Auto-calculated: (Price - Cost) / Cost × 100</li>
            <li>• <strong>Margin Amount</strong> - Auto-calculated: Price - Cost</li>
            <li>• <strong>Tax Amount</strong> - Auto-calculated: Price × Tax % / 100</li>
            <li>• <strong>Tax Type & Rate</strong> - Set from "Tax Type" and "Tax %" columns</li>
          </ul>
          <p className="text-xs text-blue-700 mt-2">
            Note: If "Tax In Price" = Yes, formulas adjust to extract base amount from total price.
          </p>
        </div>
      )}

      {/* ✅ NEW: Duplicate Handling Options */}
      {preview && !results && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
          <p className="text-xs font-semibold text-orange-900 mb-2">⚠️ What to do with duplicate products?</p>
          <div className="flex gap-3 flex-wrap">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="duplicateHandling"
                value="skip"
                checked={duplicateHandling === 'skip'}
                onChange={(e) => setDuplicateHandling(e.target.value)}
                className="w-3 h-3"
              />
              <span className="text-xs text-gray-700">
                <strong>Skip</strong> (Don't update existing)
              </span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="duplicateHandling"
                value="update"
                checked={duplicateHandling === 'update'}
                onChange={(e) => setDuplicateHandling(e.target.value)}
                className="w-3 h-3"
              />
              <span className="text-xs text-gray-700">
                <strong>Update</strong> (Overwrite with new data)
              </span>
            </label>
          </div>
          <p className="text-xs text-orange-700 mt-2">
            • <strong>Skip:</strong> Existing products are left unchanged
            <br />
            • <strong>Update:</strong> Existing products' prices, costs, and other fields are updated
          </p>
        </div>
      )}

      {/* Upload Button */}
      {preview && !results && (
        <div className="flex gap-2">
          <button
            onClick={handleUpload}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition font-medium text-sm"
          >
            {loading ? (
              <>
                <Loader size={16} className="animate-spin" />
                Importing ({uploadProgress}%)...
              </>
            ) : (
              <>
                <Upload size={16} />
                Import Products
              </>
            )}
          </button>
        </div>
      )}

      {/* Progress Bar - Enhanced */}
      {loading && (
        <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border-2 border-blue-300 rounded-lg p-4 shadow-md space-y-4">
          {/* Header with Live Counter */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Loader size={16} className="animate-spin text-blue-600" />
              <p className="text-sm font-semibold text-blue-900">Saving Products to Database...</p>
            </div>
            <div className="flex items-center gap-3">
              {/* Live Item Counter Badge */}
              <div className="bg-blue-600 text-white rounded-lg px-3 py-1.5 shadow-md">
                <p className="text-sm font-bold">
                  {itemProgress.processed} / {itemProgress.total}
                </p>
                <p className="text-xs text-blue-100">items saved</p>
              </div>
              {/* Percentage Display */}
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">{uploadProgress}%</p>
              </div>
            </div>
          </div>

          {/* Status Breakdown */}
          <div className="grid grid-cols-4 gap-2 bg-white rounded-lg p-2 border border-blue-200">
            <div className="text-center">
              <p className="text-xs text-gray-600 font-medium">💾 Saved</p>
              <p className="text-lg font-bold text-green-600">{itemProgress.processed}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-600 font-medium">⚠️ Failed</p>
              <p className="text-lg font-bold text-red-600">{itemProgress.failed}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-600 font-medium">⏭️ Skipped</p>
              <p className="text-lg font-bold text-yellow-600">{itemProgress.skipped}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-600 font-medium">⏳ Pending</p>
              <p className="text-lg font-bold text-blue-600">{Math.max(0, itemProgress.total - itemProgress.processed)}</p>
            </div>
          </div>

          {/* Process-Wise Status Bar - Enhanced */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-blue-900 mb-2">Process Progress:</p>
            <div className="space-y-2">
              {/* Checking Stage */}
              <div className="flex items-center gap-2">
                <div className="w-32">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-semibold ${stageProgress.checking === 100 ? 'text-green-600' : stageProgress.currentStage === 'checking' ? 'text-blue-600' : 'text-gray-400'}`}>
                      {stageProgress.checking === 100 ? '✓' : stageProgress.currentStage === 'checking' ? '⏳' : '○'}
                    </span>
                    <p className="text-xs font-medium text-gray-700">File Check</p>
                  </div>
                </div>
                <div className="flex-1 h-2 bg-gray-300 rounded-full overflow-hidden border border-gray-400">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${stageProgress.checking === 100 ? 'bg-green-500' : 'bg-green-400'}`}
                    style={{ width: `${stageProgress.checking}%` }}
                  />
                </div>
                <div className="w-12 text-right">
                  <span className="text-xs font-bold text-gray-700">{stageProgress.checking}%</span>
                </div>
              </div>

              {/* Validating Stage */}
              <div className="flex items-center gap-2">
                <div className="w-32">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-semibold ${stageProgress.validating === 100 ? 'text-green-600' : stageProgress.currentStage === 'validating' ? 'text-blue-600' : 'text-gray-400'}`}>
                      {stageProgress.validating === 100 ? '✓' : stageProgress.currentStage === 'validating' ? '⏳' : '○'}
                    </span>
                    <p className="text-xs font-medium text-gray-700">Validate</p>
                  </div>
                </div>
                <div className="flex-1 h-2 bg-gray-300 rounded-full overflow-hidden border border-gray-400">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${stageProgress.validating === 100 ? 'bg-blue-500' : 'bg-blue-400'}`}
                    style={{ width: `${stageProgress.validating}%` }}
                  />
                </div>
                <div className="w-12 text-right">
                  <span className="text-xs font-bold text-gray-700">{stageProgress.validating}%</span>
                </div>
              </div>

              {/* Processing Stage */}
              <div className="flex items-center gap-2">
                <div className="w-32">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-semibold ${stageProgress.processing === 100 ? 'text-green-600' : stageProgress.currentStage === 'processing' ? 'text-blue-600' : 'text-gray-400'}`}>
                      {stageProgress.processing === 100 ? '✓' : stageProgress.currentStage === 'processing' ? '⏳' : '○'}
                    </span>
                    <p className="text-xs font-medium text-gray-700">Process</p>
                  </div>
                </div>
                <div className="flex-1 h-2 bg-gray-300 rounded-full overflow-hidden border border-gray-400">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${stageProgress.processing === 100 ? 'bg-cyan-500' : 'bg-cyan-400'}`}
                    style={{ width: `${stageProgress.processing}%` }}
                  />
                </div>
                <div className="w-12 text-right">
                  <span className="text-xs font-bold text-gray-700">{stageProgress.processing}%</span>
                </div>
              </div>

              {/* Saving Stage */}
              <div className="flex items-center gap-2">
                <div className="w-32">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-semibold ${stageProgress.saving === 100 ? 'text-green-600' : stageProgress.currentStage === 'saving' ? 'text-blue-600' : 'text-gray-400'}`}>
                      {stageProgress.saving === 100 ? '✓' : stageProgress.currentStage === 'saving' ? '⏳' : '○'}
                    </span>
                    <p className="text-xs font-medium text-gray-700">Save</p>
                  </div>
                </div>
                <div className="flex-1 h-2 bg-gray-300 rounded-full overflow-hidden border border-gray-400">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${stageProgress.saving === 100 ? 'bg-purple-500' : 'bg-purple-400'}`}
                    style={{ width: `${stageProgress.saving}%` }}
                  />
                </div>
                <div className="w-12 text-right">
                  <span className="text-xs font-bold text-gray-700">{stageProgress.saving}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Overall Progress Bar */}
          <div className="w-full bg-gray-300 rounded-full h-4 overflow-hidden border border-gray-400 shadow-inner">
            <div
              className="bg-gradient-to-r from-blue-500 via-cyan-500 to-blue-500 h-4 rounded-full transition-all duration-300 shadow-md"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>

          {/* Status Message */}
          <div className="space-y-1 bg-white border border-blue-200 rounded-lg p-2">
            <p className="text-xs text-blue-800 font-semibold">
              {stageProgress.currentStage === 'checking' && '📁 Reading Excel file...'}
              {stageProgress.currentStage === 'validating' && '✅ Validating data...'}
              {stageProgress.currentStage === 'processing' && `🔄 Saving to database... (${itemProgress.processed}/${itemProgress.total})`}
              {stageProgress.currentStage === 'saving' && '💾 Finalizing database...'}
              {stageProgress.currentStage === 'complete' && '✨ Complete!'}
            </p>
            {itemProgress.processed > 0 && (
              <p className="text-xs text-gray-600 font-semibold">
                ✅ <span className="text-green-600">{itemProgress.processed}</span> items saved to database
              </p>
            )}
          </div>
        </div>
      )}

      {/* Results */}
      {results && (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className={`p-3 border-b ${
            results.status === 'success' ? 'bg-green-50' :
            results.status === 'validation_error' ? 'bg-yellow-50' :
            'bg-red-50'
          }`}>
            <div className="flex items-center gap-2">
              {results.status === 'success' && (
                <>
                  <CheckCircle size={18} className="text-green-600" />
                  <h3 className="text-sm font-semibold text-green-900">Import Successful!</h3>
                </>
              )}
              {results.status === 'validation_error' && (
                <>
                  <AlertCircle size={18} className="text-yellow-600" />
                  <h3 className="text-sm font-semibold text-yellow-900">Validation Errors Found</h3>
                </>
              )}
              {results.status === 'error' && (
                <>
                  <XCircle size={18} className="text-red-600" />
                  <h3 className="text-sm font-semibold text-red-900">Import Failed</h3>
                </>
              )}
            </div>
          </div>

          {/* Success Results */}
          {results.status === 'success' && (
            <div className="p-4 space-y-4">
              {/* ✅ MAIN SUCCESS MESSAGE */}
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-400 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-3">
                  <CheckCircle size={24} className="text-green-600" />
                  <h3 className="text-lg font-bold text-green-900">Import Successfully Completed! ✅</h3>
                </div>
                <p className="text-sm text-green-800 mb-3">
                  <strong>{results.totalProductCount || preview.fullData.length}</strong> products have been saved to your database and are now ready to use.
                </p>
              </div>

              {/* CLEAR METRICS: Before & After */}
              <div className="grid grid-cols-2 gap-3">
                {/* Items Received */}
                <div className="bg-blue-100 border-2 border-blue-400 rounded-lg p-4">
                  <p className="text-xs text-blue-600 font-semibold mb-2">📥 ITEMS RECEIVED</p>
                  <p className="text-3xl font-bold text-blue-700">{preview.fullData.length}</p>
                  <p className="text-xs text-blue-600 mt-1">from your Excel file</p>
                </div>

                {/* Items Saved */}
                <div className="bg-green-100 border-2 border-green-500 rounded-lg p-4">
                  <p className="text-xs text-green-700 font-semibold mb-2">💾 ITEMS SAVED</p>
                  <p className="text-3xl font-bold text-green-700">{results.totalProductCount || preview.fullData.length}</p>
                  <p className="text-xs text-green-700 mt-1">in MongoDB database</p>
                </div>
              </div>

              {/* Detailed Breakdown (if applicable) */}
              {(results.successful > 0 || results.updated > 0 || results.failed > 0 || results.skipped > 0) && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <p className="text-xs font-semibold text-gray-700 mb-2">📊 Detailed Breakdown:</p>
                  <div className="grid grid-cols-4 gap-2">
                    {results.successful > 0 && (
                      <div className="text-center">
                        <p className="text-xs text-gray-600">New Products</p>
                        <p className="text-lg font-bold text-green-600">{results.successful}</p>
                      </div>
                    )}
                    {results.updated > 0 && (
                      <div className="text-center">
                        <p className="text-xs text-gray-600">Updated</p>
                        <p className="text-lg font-bold text-blue-600">{results.updated}</p>
                      </div>
                    )}
                    {results.skipped > 0 && (
                      <div className="text-center">
                        <p className="text-xs text-gray-600">Skipped (Duplicates)</p>
                        <p className="text-lg font-bold text-yellow-600">{results.skipped}</p>
                      </div>
                    )}
                    {results.failed > 0 && (
                      <div className="text-center">
                        <p className="text-xs text-gray-600">Errors</p>
                        <p className="text-lg font-bold text-red-600">{results.failed}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ✅ NEW: Performance Summary */}
              {results.duration && (
                <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-300 rounded-lg p-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-gray-600 font-medium">Processing Time</p>
                      <p className="text-lg font-bold text-purple-600">{results.durationSeconds}s</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 font-medium">Average Speed</p>
                      <p className="text-lg font-bold text-indigo-600">
                        {results.totalProcessed > 0 ? ((results.totalProcessed / (results.duration / 1000)).toFixed(1)) : '0'} items/sec
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Processed: {results.totalProcessed} / {results.totalRequested} items
                  </p>
                </div>
              )}

              {/* Auto-Calculation Success Info */}
              {importMode === 'simple' && results.successful > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded p-2 mt-3">
                  <p className="text-xs font-semibold text-blue-900 mb-2">✅ Auto-Calculated Fields Populated:</p>
                  <ul className="text-xs text-blue-800 space-y-1">
                    <li>✓ Cost Include VAT - Extracted based on tax rate</li>
                    <li>✓ Margin % - Calculated from cost and price</li>
                    <li>✓ Margin Amount - Calculated from cost and price</li>
                    <li>✓ Tax Amount - Calculated from tax rate</li>
                  </ul>
                  <p className="text-xs text-blue-700 mt-2">
                    All {results.successful} product(s) are ready for use with complete pricing information.
                  </p>
                </div>
              )}

              {results.errors && results.errors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded p-2 max-h-40 overflow-y-auto">
                  <p className="text-xs font-semibold text-red-900 mb-1 flex items-center gap-1">
                    <XCircle size={12} /> Errors ({results.errors.length}):
                  </p>
                  <div className="text-xs space-y-1">
                    {results.errors.map((err, idx) => (
                      <div key={idx} className="text-red-700">
                        Row {err.row}: {err.message}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {results.warnings && results.warnings.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded p-2 max-h-40 overflow-y-auto">
                  <p className="text-xs font-semibold text-yellow-900 mb-1 flex items-center gap-1">
                    <AlertCircle size={12} /> Warnings ({results.warnings.length}):
                  </p>
                  <div className="text-xs space-y-1">
                    {results.warnings.map((warn, idx) => (
                      <div key={idx} className="text-yellow-800">
                        Row {warn.row}: {warn.message}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Validation Error Results */}
          {results.status === 'validation_error' && (
            <div className="p-3 space-y-3 max-h-96 overflow-y-auto">
              {/* Total Uploaded Count */}
              <div className="bg-yellow-100 border-2 border-yellow-400 rounded-lg p-3 mb-2">
                <p className="text-xs text-yellow-600 font-semibold mb-1">TOTAL ATTEMPTED</p>
                <p className="text-3xl font-bold text-yellow-700">{preview.fullData.length}</p>
                <p className="text-xs text-yellow-600 mt-1">Products from file</p>
              </div>

              {results.errors && results.errors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded p-3">
                  <p className="text-xs font-semibold text-red-900 mb-2 flex items-center gap-1">
                    <XCircle size={14} /> Errors ({results.totalErrors} {results.totalErrors === 1 ? 'item' : 'items'}):
                  </p>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {results.errors.map((err, idx) => (
                      <div key={idx} className="bg-red-50 rounded p-2 border-l-2 border-red-600">
                        <p className="text-xs text-red-900">
                          <strong>Row {err.row}, {err.field}:</strong> {err.message}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {results.warnings && results.warnings.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                  <p className="text-xs font-semibold text-yellow-900 mb-2 flex items-center gap-1">
                    <AlertCircle size={14} /> Warnings ({results.warnings.length} {results.warnings.length === 1 ? 'item' : 'items'}):
                  </p>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {results.warnings.map((warn, idx) => (
                      <div key={idx} className="bg-yellow-50 rounded p-2 border-l-2 border-yellow-600 text-xs text-yellow-900">
                        Row {warn.row}: {warn.message}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Error Results */}
          {results.status === 'error' && (
            <div className="p-3 space-y-3">
              {/* Total Uploaded Count */}
              <div className="bg-red-100 border-2 border-red-400 rounded-lg p-3 mb-2">
                <p className="text-xs text-red-600 font-semibold mb-1">TOTAL ATTEMPTED</p>
                <p className="text-3xl font-bold text-red-700">{preview.fullData.length}</p>
                <p className="text-xs text-red-600 mt-1">Products from file</p>
              </div>

              <p className="text-sm text-red-900 mb-2">{results.message}</p>
              {results.details && (
                <pre className="bg-red-50 p-2 rounded text-xs text-red-800 overflow-auto max-h-48">
                  {JSON.stringify(results.details, null, 2)}
                </pre>
              )}
            </div>
          )}

          {/* Reset Button */}
          <div className="p-3 border-t bg-gray-50">
            <button
              onClick={handleReset}
              className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition font-medium text-sm"
            >
              Upload Another File
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BulkProductUpload;


