import React, { useState, useRef } from 'react';
import { Upload, Download, AlertCircle, CheckCircle, XCircle, Loader } from 'lucide-react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { showToast } from "../../shared/AnimatedCenteredToast.jsx";
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

  // ✅ NEW: File preparation progress tracking (reading/parsing stage)
  const [filePreparation, setFilePreparation] = useState({
    isProcessing: false,
    stage: null, // 'reading' | 'parsing' | 'filtering' | 'complete'
    progress: 0, // 0-100%
    message: ''
  });

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

    showToast('success', 'Template downloaded successfully!');
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

    showToast('success', 'Simple template downloaded successfully!');
  };

  // ==================== HANDLE FILE SELECTION ====================
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls') && !file.name.endsWith('.csv')) {
      showToast('error', 'Please upload an Excel (.xlsx, .xls) or CSV file');
      return;
    }

    try {
      // ✅ Show file preparation progress
      setFilePreparation({
        isProcessing: true,
        stage: 'reading',
        progress: 20,
        message: `Reading file: ${file.name}...`
      });

      console.log('📖 Stage 1: Reading file buffer...');

      // Yield to browser to ensure UI updates are rendered
      await new Promise(resolve => setTimeout(resolve, 100));

      const arrayBuffer = await file.arrayBuffer();
      
      console.log('✓ File buffer read, starting XLSX parsing...');

      setFilePreparation(prev => ({
        ...prev,
        stage: 'parsing',
        progress: 35,
        message: 'Parsing Excel workbook structure...'
      }));

      // Yield to browser to ensure parsing stage is visible
      await new Promise(resolve => setTimeout(resolve, 100));

      console.log('🔍 Parsing XLSX workbook...');
      const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      console.log('✓ Workbook parsed, converting to JSON...');

      setFilePreparation(prev => ({
        ...prev,
        progress: 50,
        message: 'Converting Excel data to JSON (this may take a moment for large files)...'
      }));

      // Yield to browser before expensive sheet_to_json
      await new Promise(resolve => setTimeout(resolve, 100));

      // ✅ sheet_to_json automatically skips the header row
      console.time('sheet_to_json conversion');
      const data = XLSX.utils.sheet_to_json(worksheet);
      console.timeEnd('sheet_to_json conversion');
      
      console.log('📊 Loaded from Excel:', data.length, 'rows (header already skipped by XLSX)');

      // Yield to browser after expensive parsing (longer delay for big files)
      await new Promise(resolve => setTimeout(resolve, 100));

      setFilePreparation(prev => ({
        ...prev,
        stage: 'filtering',
        progress: 60,
        message: `Filtering empty rows... (0/${data.length})`
      }));

      // Extra yield to ensure filtering stage shows up
      await new Promise(resolve => setTimeout(resolve, 50));

      console.log('🔄 Starting filtering of', data.length, 'rows...');

      // ✅ CRITICAL FIX: Filter in chunks to prevent UI hanging on large files (206K+)
      const CHUNK_SIZE = 5000; // Process 5000 rows at a time
      const filteredData = [];
      let processedCount = 0;
      let chunkCounter = 0;

      for (let i = 0; i < data.length; i += CHUNK_SIZE) {
        const chunkStartTime = Date.now();
        
        // Process chunk
        const chunk = data.slice(i, i + CHUNK_SIZE);
        for (const row of chunk) {
          // ✅ OPTIMIZED: Check for non-empty row without creating array (faster than Object.values().some())
          let hasContent = false;
          for (const key in row) {
            const cell = row[key];
            if (cell !== null && cell !== undefined && cell !== '') {
              hasContent = true;
              break;
            }
          }
          if (hasContent) {
            filteredData.push(row);
          }
        }
        processedCount = Math.min(i + CHUNK_SIZE, data.length);
        chunkCounter++;

        // ✅ Update UI progress EVERY chunk (not batched) for real-time feedback
        const filterProgress = Math.round((processedCount / data.length) * 20) + 60; // 60-80% range
        setFilePreparation(prev => ({
          ...prev,
          progress: filterProgress,
          message: `Filtering empty rows... (${processedCount}/${data.length})`
        }));
        
        const chunkTime = Date.now() - chunkStartTime;
        console.log(`  Chunk ${chunkCounter}: Processed ${processedCount}/${data.length} rows in ${chunkTime}ms`);

        // ✅ Yield to browser every chunk for responsiveness (10ms to allow UI to render)
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      if (filteredData.length === 0) {
        showToast('error', 'No data found in the uploaded file');
        setFilePreparation({
          isProcessing: false,
          stage: null,
          progress: 0,
          message: ''
        });
        return;
      }

      setFilePreparation(prev => ({
        ...prev,
        stage: 'complete',
        progress: 100,
        message: `✅ Successfully loaded ${filteredData.length} products!`
      }));

      await new Promise(resolve => setTimeout(resolve, 800)); // Show completion briefly

      setPreview({
        fileName: file.name,
        totalRows: filteredData.length,
        data: filteredData.slice(0, 5), // Show first 5 rows
        fullData: filteredData
      });

      setResults(null);
      
      // Hide file preparation indicator after successful load
      setFilePreparation({
        isProcessing: false,
        stage: null,
        progress: 0,
        message: ''
      });

      showToast('success', `Loaded ${filteredData.length} products for preview`);
    } catch (error) {
      showToast('error', `Error reading file: ${error.message}`);
      setFilePreparation({
        isProcessing: false,
        stage: null,
        progress: 0,
        message: ''
      });
    }
  };

  // ==================== VALIDATE SIMPLE PRODUCTS ====================
  // ==================== VALIDATE & FILTER SIMPLE PRODUCTS (ASYNC, NON-BLOCKING) ====================
  const validateSimpleProducts = async (products) => {
    const requiredFields = ['Item Code', 'Product Name', 'Department', 'Vendor', 'Unit Name', 'Cost', 'Price', 'Barcode'];
    const cleanedProducts = [];
    const skippedRows = [];
    const CHUNK_SIZE = 10000; // Process 10K products at a time

    for (let i = 0; i < products.length; i += CHUNK_SIZE) {
      const chunk = products.slice(i, i + CHUNK_SIZE);
      
      for (const product of chunk) {
        const rowNumber = (i + chunk.indexOf(product)) + 2;

        // Check required fields - CRITICAL (skip row)
        let hasCriticalError = false;
        for (const field of requiredFields) {
          if (!product[field] || String(product[field]).trim() === '') {
            skippedRows.push({
              row: rowNumber,
              reason: `Missing required field: ${field}`
            });
            hasCriticalError = true;
            break;
          }
        }
        
        if (hasCriticalError) continue;

        // Validate numeric values - SKIP ROW if invalid
        const cost = parseFloat(product['Cost']);
        const price = parseFloat(product['Price']);

        if (isNaN(cost) || cost <= 0) {
          skippedRows.push({
            row: rowNumber,
            reason: `Invalid Cost: "${product['Cost']}" (must be a positive number)`
          });
          continue;
        }

        if (isNaN(price) || price <= 0) {
          skippedRows.push({
            row: rowNumber,
            reason: `Invalid Price: "${product['Price']}" (must be a positive number)`
          });
          continue;
        }

        // Barcode validation - SKIP ROW if too short
        const barcode = String(product['Barcode']).trim();
        if (barcode.length < 3) {
          skippedRows.push({
            row: rowNumber,
            reason: `Invalid Barcode: "${barcode}" (must be at least 3 characters)`
          });
          continue;
        }

        if (price < cost) {
          skippedRows.push({
            row: rowNumber,
            reason: `Price (${price}) is less than Cost (${cost})`
          });
          continue;
        }

        // ✅ ROW IS VALID - Add to cleaned products
        cleanedProducts.push(product);
      }

      // Yield to browser after each chunk
      await new Promise(resolve => setTimeout(resolve, 0));
    }

    return { cleanedProducts, skippedRows };
  };

  // ==================== VALIDATE & FILTER PRODUCTS (ASYNC, NON-BLOCKING) ====================
  const validateProducts = async (products) => {
    const requiredFields = ['Item Code', 'Product Name', 'Vendor', 'Category', 'Unit Type', 'Cost', 'Price', 'Stock Quantity', 'Country'];
    const cleanedProducts = [];
    const skippedRows = [];
    const CHUNK_SIZE = 10000; // Process 10K products at a time

    for (let i = 0; i < products.length; i += CHUNK_SIZE) {
      const chunk = products.slice(i, i + CHUNK_SIZE);
      
      for (const product of chunk) {
        const rowNumber = (i + chunk.indexOf(product)) + 2;

        // Check required fields - CRITICAL (skip row)
        let hasCriticalError = false;
        for (const field of requiredFields) {
          if (!product[field] || String(product[field]).trim() === '') {
            skippedRows.push({
              row: rowNumber,
              reason: `Missing required field: ${field}`
            });
            hasCriticalError = true;
            break;
          }
        }

        if (hasCriticalError) continue;

        // Country-based validation
        const country = product['Country']?.toString().trim().toUpperCase();
        if (country === 'IN' && (!product['HSN Code'] || String(product['HSN Code']).trim() === '')) {
          skippedRows.push({
            row: rowNumber,
            reason: 'HSN Code is required for India (IN)'
          });
          continue;
        }

        // Validate numeric values - SKIP ROW if invalid
        const cost = parseFloat(product['Cost']);
        const price = parseFloat(product['Price']);
        const stock = parseInt(product['Stock Quantity']);

        if (isNaN(cost) || cost <= 0) {
          skippedRows.push({
            row: rowNumber,
            reason: `Invalid Cost: "${product['Cost']}" (must be a positive number)`
          });
          continue;
        }

        if (isNaN(price) || price <= 0) {
          skippedRows.push({
            row: rowNumber,
            reason: `Invalid Price: "${product['Price']}" (must be a positive number)`
          });
          continue;
        }

        if (isNaN(stock)) {
          skippedRows.push({
            row: rowNumber,
            reason: `Invalid Stock Quantity: "${product['Stock Quantity']}" (must be a number)`
          });
          continue;
        }

        // Price vs Cost check
        if (price < cost) {
          skippedRows.push({
            row: rowNumber,
            reason: `Price (${price}) is less than Cost (${cost})`
          });
          continue;
        }

        // Validate country code
        if (country && !['IN', 'AE', 'OM'].includes(country)) {
          skippedRows.push({
            row: rowNumber,
            reason: `Invalid country code: ${country} (Use: IN, AE, OM)`
          });
          continue;
        }

        // ✅ ROW IS VALID - Add to cleaned products
        cleanedProducts.push(product);
      }

      // Yield to browser after each chunk
      await new Promise(resolve => setTimeout(resolve, 0));
    }

    return { cleanedProducts, skippedRows };
  };

  // ==================== UPLOAD PRODUCTS (WITH BATCH PROCESSING) ====================
  const handleUpload = async () => {
    if (!preview?.fullData) {
      showToast('error', 'No data to upload. Please select a file first.');
      return;
    }

    // Use appropriate validation based on import mode - AWAIT async validation functions
    const validation = importMode === 'simple' 
      ? await validateSimpleProducts(preview.fullData)
      : await validateProducts(preview.fullData);

    // ✅ NEW: Show skipped rows summary
    if (validation.skippedRows.length > 0) {
      const confirmSkip = window.confirm(
        `⚠️ ${validation.skippedRows.length} row(s) will be skipped due to invalid data:\n\n${validation.skippedRows.slice(0, 5).map(s => `Row ${s.row}: ${s.reason}`).join('\n')}${validation.skippedRows.length > 5 ? `\n... and ${validation.skippedRows.length - 5} more\n` : '\n'}\nContinue uploading ${validation.cleanedProducts.length} valid products?`
      );
      if (!confirmSkip) return;
    }

    // If no cleaned products, stop
    if (validation.cleanedProducts.length === 0) {
      showToast('error', 'No valid products to upload. All rows contain errors.');
      return;
    }

    setLoading(true);
    setUploadProgress(0);
    setStageProgress({
      checking: 0,
      validating: 0,
      processing: 0,
      saving: 0,
      currentStage: 'checking'
    });
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
        ? `${API_URL}/products/bulk-import-simple`
        : `${API_URL}/products/bulk-import`;

      const startTime = Date.now();
      // ✅ Use cleaned products (errors already filtered out)
      const allProducts = validation.cleanedProducts;
      const skippedValidationRows = validation.skippedRows.length;
      
      // ✅ Adaptive batch size based on total products
      // For large imports (10k+), use bigger batches to reduce overhead
      const BATCH_SIZE = allProducts.length > 10000 ? 2000 : 500;
      const totalBatches = Math.ceil(allProducts.length / BATCH_SIZE);
      
      // ✅ Accumulate results from all batches
      let totalSuccessful = 0;
      let totalUpdated = 0;
      let totalFailed = 0;
      let totalSkipped = 0;
      let allErrors = [];
      let allCreatedProducts = [];
      let allUpdatedProducts = [];

      console.log(`📦 Processing ${allProducts.length} products in ${totalBatches} batches (${BATCH_SIZE} per batch)`);

      // ✅ Process each batch sequentially
      for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
        const batchStart = batchIndex * BATCH_SIZE;
        const batchEnd = Math.min(batchStart + BATCH_SIZE, allProducts.length);
        const batchProducts = allProducts.slice(batchStart, batchEnd);
        const batchNum = batchIndex + 1;

        console.log(`\n🔄 Sending batch ${batchNum}/${totalBatches} (items ${batchStart + 1}-${batchEnd})`);

        // Update UI - show which batch is being processed
        setStageProgress(prev => ({
          ...prev,
          checking: Math.round((batchNum / totalBatches) * 100),
          currentStage: 'checking'
        }));
        
        setItemProgress(prev => ({
          ...prev,
          processed: batchEnd,
          successful: totalSuccessful,
          updated: totalUpdated,
          failed: totalFailed,
          skipped: totalSkipped
        }));

        const batchProgress = Math.round((batchEnd / allProducts.length) * 100);
        setUploadProgress(batchProgress);

        try {
          const response = await axios.post(
            endpoint,
            {
              products: batchProducts,
              importMode: importMode,
              duplicateHandling: duplicateHandling
            },
            {
              timeout: 300000 // 5 minutes per batch (for large batches of 2000 items)
            }
          );

          // ✅ Accumulate results
          totalSuccessful += response.data.successful || 0;
          totalUpdated += response.data.updated || 0;
          totalFailed += response.data.failed || 0;
          totalSkipped += response.data.skipped || 0;
          allErrors.push(...(response.data.errors || []));
          allCreatedProducts.push(...(response.data.createdProducts || []));
          allUpdatedProducts.push(...(response.data.updatedProducts || []));

          console.log(`✅ Batch ${batchNum} complete: ${response.data.successful} created, ${response.data.updated} updated, ${response.data.failed} failed`);
          
          // Small delay between batches to avoid overwhelming the server
          if (batchIndex < totalBatches - 1) {
            await sleep(300);
          }

        } catch (batchError) {
          const errorMsg = batchError.response?.data?.message || batchError.message;
          console.error(`❌ Batch ${batchNum} failed: ${errorMsg}`);
          
          allErrors.push({
            row: `Batch ${batchNum}`,
            message: `Batch upload failed: ${errorMsg}`
          });
          
          totalFailed += batchProducts.length;

          // Continue with next batch instead of stopping
          showToast('error', `⚠️ Batch ${batchNum} failed, continuing with next batch...`);
        }
      }

      // ✅ All batches complete
      console.log(`\n✅ All batches processed!`);
      console.log(`📊 Total: ${totalSuccessful} created, ${totalUpdated} updated, ${totalSkipped} skipped, ${totalFailed} failed`);

      // Show final progress
      setStageProgress(prev => ({
        ...prev,
        checking: 100,
        validating: 100,
        processing: 100,
        saving: 100,
        currentStage: 'complete'
      }));
      setUploadProgress(100);

      // Get total product count from database
      let totalProductCount = 0;
      try {
        const countResponse = await axios.get(`${API_URL}/products/count`);
        totalProductCount = countResponse.data.totalCount || 0;
      } catch (countError) {
        console.error("Error fetching product count:", countError);
      }

      setItemProgress({
        total: allProducts.length,
        processed: allProducts.length,
        successful: totalSuccessful,
        updated: totalUpdated,
        failed: totalFailed,
        skipped: totalSkipped
      });

      setResults({
        status: 'success',
        successful: totalSuccessful,
        updated: totalUpdated,
        failed: totalFailed,
        skipped: totalSkipped,
        skippedValidation: validation.skippedRows.length, // ✅ NEW: Rows filtered out during validation
        skippedValidationRows: validation.skippedRows, // ✅ NEW: Detailed skipped rows info
        errors: allErrors,
        createdProducts: allCreatedProducts,
        updatedProducts: allUpdatedProducts,
        totalProductCount: totalProductCount,
        totalProductsInFile: preview.fullData.length, // ✅ NEW: Original file count
        totalProcessed: totalSuccessful + totalUpdated + totalFailed + totalSkipped,
        totalRequested: allProducts.length,
        duration: Date.now() - startTime
      });

      const successMsg = totalFailed === 0 
        ? `✅ Success! ${totalSuccessful + totalUpdated} products imported (${skippedValidationRows} skipped)` 
        : `⚠️ Partial Success: ${totalSuccessful + totalUpdated} imported, ${totalFailed} failed`;
      
      showToast('success', successMsg);
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
      showToast('error', `❌ Import failed: ${errorMessage}`);
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

        {/* ✅ FILE PREPARATION PROGRESS INDICATOR */}
        {filePreparation.isProcessing && (
          <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border-2 border-blue-300 rounded-lg p-4 mb-3 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Loader size={18} className="animate-spin text-blue-600" />
                <div>
                  <p className="text-sm font-semibold text-blue-900">Preparing File...</p>
                  <p className="text-xs text-blue-700 mt-0.5">{filePreparation.message}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-blue-600">{filePreparation.progress}%</p>
              </div>
            </div>

            {/* Stage Indicator */}
            <div className="flex gap-2 items-center">
              <div className="flex-1 space-y-1">
                {/* Reading Stage */}
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-semibold ${filePreparation.progress >= 20 ? 'text-green-600' : 'text-gray-400'}`}>
                    {filePreparation.progress >= 20 ? '✓' : '○'}
                  </span>
                  <span className={`text-xs font-medium ${filePreparation.progress >= 20 ? 'text-green-700' : 'text-gray-500'}`}>Reading</span>
                  {filePreparation.stage === 'reading' && <Loader size={12} className="animate-spin text-blue-600" />}
                </div>

                {/* Parsing Stage */}
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-semibold ${filePreparation.progress >= 50 ? 'text-green-600' : 'text-gray-400'}`}>
                    {filePreparation.progress >= 50 ? '✓' : '○'}
                  </span>
                  <span className={`text-xs font-medium ${filePreparation.progress >= 50 ? 'text-green-700' : 'text-gray-500'}`}>Parsing</span>
                  {filePreparation.stage === 'parsing' && <Loader size={12} className="animate-spin text-blue-600" />}
                </div>

                {/* Filtering Stage */}
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-semibold ${filePreparation.progress >= 75 ? 'text-green-600' : 'text-gray-400'}`}>
                    {filePreparation.progress >= 75 ? '✓' : '○'}
                  </span>
                  <span className={`text-xs font-medium ${filePreparation.progress >= 75 ? 'text-green-700' : 'text-gray-500'}`}>Filtering</span>
                  {filePreparation.stage === 'filtering' && <Loader size={12} className="animate-spin text-blue-600" />}
                </div>
              </div>
            </div>

            {/* Overall Progress Bar */}
            <div className="w-full h-3 bg-gray-300 rounded-full overflow-hidden border border-gray-400">
              <div
                className="h-3 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full transition-all duration-500"
                style={{ width: `${filePreparation.progress}%` }}
              />
            </div>
          </div>
        )}

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
              <div className="grid grid-cols-3 gap-3">
                {/* Items Received */}
                <div className="bg-blue-100 border-2 border-blue-400 rounded-lg p-4">
                  <p className="text-xs text-blue-600 font-semibold mb-2">📥 ITEMS RECEIVED</p>
                  <p className="text-3xl font-bold text-blue-700">{results.totalProductsInFile || preview.fullData.length}</p>
                  <p className="text-xs text-blue-600 mt-1">from your Excel file</p>
                </div>

                {/* Items Skipped (Validation) */}
                {results.skippedValidation > 0 && (
                  <div className="bg-yellow-100 border-2 border-yellow-400 rounded-lg p-4">
                    <p className="text-xs text-yellow-700 font-semibold mb-2">⏭️ SKIPPED (Invalid)</p>
                    <p className="text-3xl font-bold text-yellow-700">{results.skippedValidation}</p>
                    <p className="text-xs text-yellow-700 mt-1">rows with bad data</p>
                  </div>
                )}

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

              {/* ✅ NEW: Show Skipped Validation Rows If Any */}
              {results.skippedValidationRows && results.skippedValidationRows.length > 0 && (
                <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-3 mt-3">
                  <p className="text-sm font-semibold text-yellow-900 mb-2 flex items-center gap-2">
                    <AlertCircle size={16} /> {results.skippedValidationRows.length} Rows Skipped (Invalid Data)
                  </p>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {results.skippedValidationRows.slice(0, 10).map((row, idx) => (
                      <div key={idx} className="bg-white rounded p-2 border-l-2 border-yellow-500 text-xs">
                        <p className="text-yellow-900"><strong>Row {row.row}:</strong> {row.reason}</p>
                      </div>
                    ))}
                    {results.skippedValidationRows.length > 10 && (
                      <p className="text-xs text-yellow-700 italic mt-2">
                        ... and {results.skippedValidationRows.length - 10} more rows skipped
                      </p>
                    )}
                  </div>
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


