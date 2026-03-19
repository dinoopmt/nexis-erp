import React, { useState } from 'react';
import { toast } from 'react-hot-toast';

/**
 * MoreInfoTab Component
 * Handles barcode management for multi-level pricing
 */
const MoreInfoTab = ({
  pricingLines,
  units,
  barcodeVariants,
  getBarcodesByLevel,
  removeBarcodeVariant,
  addBarcodeForSelectedUnit,
  selectedPricingLines = new Set(),
}) => {
  // Track input values for new barcodes per level
  const [newBarcodeValues, setNewBarcodeValues] = useState({
    '0': '',
    '1': '',
    '2': '',
    '3': '',
  });

  // Handle adding a new barcode for a specific level
  const handleAddBarcode = (levelIdx) => {
    const barcodeValue = newBarcodeValues[levelIdx]?.trim();
    
    // Check maximum allowed barcodes (10 variant rows max, row 0 is main product barcode = 11 total)
    const levels = getBarcodesByLevel();
    const totalBarcodes = levels.reduce((sum, levelBarcodes) => sum + (levelBarcodes?.length || 0), 0);
    
    if (totalBarcodes > 9) {
      toast.error('Maximum 10 variant barcodes allowed (Row 0 is main product barcode = 11 total). Delete existing barcodes to add new ones', { 
        duration: 4000, 
        position: 'top-center' 
      });
      return;
    }
    
    if (!barcodeValue) {
      toast.error('Please enter a barcode value', { duration: 3000, position: 'top-center' });
      return;
    }

    // Check if barcode already exists across ALL levels (product-wide uniqueness)
    const barcodeExistsAnywhere = levels.some(levelBarcodes => 
      levelBarcodes && levelBarcodes.includes(barcodeValue)
    );
    
    if (barcodeExistsAnywhere) {
      toast.error('This barcode already exists in another unit variant. Barcodes must be unique per product', { 
        duration: 4000, 
        position: 'top-center' 
      });
      return;
    }

    // Get the unit ID for this level
    const unitId = pricingLines[levelIdx]?.unit;
    
    if (!unitId) {
      toast.error('Please select a unit for this level first', { duration: 3000, position: 'top-center' });
      return;
    }

    // Add the barcode with the unit ID
    if (addBarcodeForSelectedUnit) {
      addBarcodeForSelectedUnit(unitId, barcodeValue);
      // Clear the input field
      setNewBarcodeValues(prev => ({
        ...prev,
        [levelIdx]: ''
      }));
    }
  };

  return (
    <div className="flex-1 overflow-y-auto min-h-0 flex flex-col">
     
      

      {/* BARCODE TABLE SECTION */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <h3 className="text-sm font-bold text-gray-800 px-3 pt-3 mb-2">📦 Barcodes by Level</h3>
        <div className="flex-1 overflow-x-auto overflow-y-auto">
          <table className="w-full text-xs border-collapse table-fixed px-3">
          <thead className="bg-gray-100 text-left sticky top-0 z-10">
            <tr>
              <th className="w-24 p-1 border text-center font-semibold text-xs">
                Level 1 {pricingLines[0]?.unit ? `(${units.find(u => u._id === pricingLines[0]?.unit)?.unitName || "Unit 1"})` : ""}
              </th>
              <th className="w-24 p-1 border text-center font-semibold text-xs">
                Level 2 {pricingLines[1]?.unit ? `(${units.find(u => u._id === pricingLines[1]?.unit)?.unitName || "Unit 2"})` : ""}
              </th>
              <th className="w-24 p-1 border text-center font-semibold text-xs">
                Level 3 {pricingLines[2]?.unit ? `(${units.find(u => u._id === pricingLines[2]?.unit)?.unitName || "Unit 3"})` : ""}
              </th>
              <th className="w-24 p-1 border text-center font-semibold text-xs">
                Level 4 {pricingLines[3]?.unit ? `(${units.find(u => u._id === pricingLines[3]?.unit)?.unitName || "Unit 4"})` : ""}
              </th>
            </tr>
          </thead>
          <tbody>
            {Array.from({length: 11}).map((_, rowIndex) => {
              const levels = getBarcodesByLevel();
              return (
                <tr key={rowIndex} className={`border hover:bg-blue-50 ${rowIndex === 0 ? 'bg-yellow-50 font-semibold' : ''}`}>
                  {[0, 1, 2, 3].map((levelIdx) => (
                    <td key={levelIdx} className="p-1 border text-center text-gray-700 font-mono text-xs">
                      {/* Row 0: Show main product barcode for each unit level if available */}
                      {rowIndex === 0 ? (
                        pricingLines[levelIdx]?.barcode ? (
                          <div className="flex items-center justify-center gap-1 group bg-yellow-100/50 rounded">
                            <span className="text-base font-bold text-amber-700">{pricingLines[levelIdx].barcode}</span>
                            <span className="text-xs text-amber-600 font-semibold">(Main)</span>
                          </div>
                        ) : (
                          <span className="text-gray-300 text-xs">{pricingLines[levelIdx]?.unit ? 'No barcode' : '-'}</span>
                        )
                      ) : (
                        /* Rows 1-10: Show variant barcodes */
                        levels[levelIdx]?.[rowIndex - 1] ? (
                          <div className="flex items-center justify-center gap-1 group bg-red-500/10 rounded">
                            <span className="text-base font-bold">{levels[levelIdx][rowIndex - 1]}</span>
                            <button
                              onClick={() => {
                                const variantId = barcodeVariants.find(v => v.barcode === levels[levelIdx][rowIndex - 1] && pricingLines[levelIdx]?.unit === v.unit)?.id;
                                if (variantId) removeBarcodeVariant(variantId);
                              }}
                              className="text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition text-xs"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <span className="text-gray-300 text-xs">-</span>
                        )
                      )}
                    </td>
                  ))}
                </tr>
              );
            })}

            {/* Input Row: Add new barcodes */}
            <tr className="border bg-blue-50 font-semibold">
              {(() => {
                const levels = getBarcodesByLevel();
                const totalBarcodes = levels.reduce((sum, levelBarcodes) => sum + (levelBarcodes?.length || 0), 0);
                const isMaxReached = totalBarcodes > 9;
                
                return [0, 1, 2, 3].map((levelIdx) => {
                  const isLevelEnabled = selectedPricingLines.has(levelIdx) && pricingLines[levelIdx]?.unit && !isMaxReached;
                  
                  return (
                    <td key={levelIdx} className="p-1 border text-center">
                      <div className="flex gap-1 items-center justify-center">
                        <input
                          type="text"
                          disabled={!isLevelEnabled}
                          value={newBarcodeValues[levelIdx] || ''}
                          onChange={(e) => {
                            setNewBarcodeValues(prev => ({
                              ...prev,
                              [levelIdx]: e.target.value
                            }));
                          }}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter' && isLevelEnabled) {
                              handleAddBarcode(levelIdx);
                            }
                          }}
                          className={`w-full px-2 py-0.5 text-xs border rounded text-center focus:outline-none ${
                            isLevelEnabled
                              ? 'border-blue-400 focus:ring-1 focus:ring-blue-500 bg-white'
                              : 'border-gray-300 bg-gray-100 text-gray-400 cursor-not-allowed'
                          }`}
                          title={isMaxReached ? `Maximum 10 variant barcodes reached (${totalBarcodes}/10 variants + 1 main = 11 total)` : (!isLevelEnabled ? 'Select unit variant first' : 'Enter barcode and press Enter or click +')}
                        />
                        <button
                          onClick={() => handleAddBarcode(levelIdx)}
                          disabled={!isLevelEnabled}
                          className={`px-2 py-0.5 rounded text-xs font-semibold transition ${
                            isLevelEnabled
                              ? 'bg-green-500 hover:bg-green-600 text-white cursor-pointer'
                              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          }`}
                          title={isMaxReached ? `Maximum 10 variant barcodes reached (${totalBarcodes}/10 variants + 1 main = 11 total)` : (!isLevelEnabled ? 'Select unit variant first' : 'Add barcode')}
                        >
                          +
                        </button>
                      </div>
                    </td>
                  );
                });
              })()}
            </tr>
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
};

export default MoreInfoTab;


