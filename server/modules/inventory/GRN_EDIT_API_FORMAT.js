/**
 * GRN Edit API Format Guide
 * 
 * THIS DOCUMENT EXPLAINS THE CORRECT FORMAT FOR EDITING GRNs
 */

/**
 * ✅ CORRECT FORMAT FOR EDITING A GRN
 * 
 * IMPORTANT: You MUST include the items array with complete item details
 */

// Example: Edit a GRN to change quantities and costs
const correctEditRequest = {
  // 1. Which GRN to edit
  id: "69bfd33c0ffa7142df8680ce",  // GRN MongoDB ID
  
  // 2. NEW items (REQUIRED) - Specify ALL items with their NEW values
  items: [
    {
      productId: "69beef0d228dfd0cc59b9fcc",  // Product ObjectId
      itemName: "I phone 6 s pluse",
      itemCode: "1001",
      quantity: 2,                             // NEW quantity
      unitCost: 10.5,                          // Cost per unit
      totalCost: 21,                           // quantity × unitCost (before tax)
      taxPercent: 5,
      taxAmount: 1.05,
      batchNumber: "BATCH-001",
      expiryDate: "2026-06-22T00:00:00.000Z"
    }
    // Add more items if needed
  ],
  
  // 3. Optional: Add notes about the changes
  notes: "Updated quantity from 1 to 2 units",
  
  // 4. Who made this change
  createdBy: "69beee6a4083203fc968ae78"  // User ObjectId
};

/**
 * ❌ WRONG FORMATS - These will fail
 */

// WRONG #1: Missing items array
const wrongRequest1 = {
  id: "69bfd33c0ffa7142df8680ce",
  finalTotal: 21  // ❌ Only this - system doesn't know new quantities!
};

// WRONG #2: Empty items array
const wrongRequest2 = {
  id: "69bfd33c0ffa7142df8680ce",
  items: []      // ❌ Empty - needs at least one item
};

// WRONG #3: Incomplete item details
const wrongRequest3 = {
  id: "69bfd33c0ffa7142df8680ce",
  items: [
    {
      productId: "69beef0d228dfd0cc59b9fcc"
      // ❌ Missing: itemName, quantity, unitCost, totalCost
    }
  ]
};

/**
 * STEP-BY-STEP: How to GET GRN details BEFORE editing
 */

// Step 1: Fetch the GRN to see current values
const fetchGrn = async () => {
  const response = await fetch(
    'http://localhost:5000/api/v1/grn/69bfd33c0ffa7142df8680ce'
  );
  const grn = await response.json();
  
  // grn.items looks like:
  // [
  //   {
  //     productId: ObjectId(...),
  //     itemName: "I phone 6 s pluse",
  //     itemCode: "1001",
  //     quantity: 1,
  //     unitCost: 10.5,
  //     totalCost: 10.5,
  //     taxPercent: 5,
  //     batchNumber: "BATCH-001",
  //     expiryDate: ISODate(...),
  //     ...
  //   }
  // ]
};

// Step 2: Modify the items as needed
const editGrn = async (grnId, newItems) => {
  const response = await fetch(
    `http://localhost:5000/api/v1/grn/${grnId}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: newItems,  // Your modified items
        notes: "Updated quantity",
        createdBy: "USER_ID_HERE"
      })
    }
  );
  
  const result = await response.json();
  
  // Response will show:
  // {
  //   success: true,
  //   message: "GRN updated successfully...",
  //   cascadeUpdate: {
  //     success: true,
  //     ...details of transaction
  //   }
  // }
};

/**
 * VALIDATION: What happens during edit?
 * 
 * 1. ✅ Pre-validation checks:
 *    - GRN exists
 *    - Items array is provided (REQUIRED!)
 *    - Can edit by transaction status
 *    - No confirmed payments
 *    - Sufficient stock to reverse
 *    - No concurrent edits (lock available)
 *    - Quantities are positive/non-zero
 * 
 * 2. ✅ Edit Lock acquired:
 *    - Prevents other users from editing simultaneously
 *    - Auto-expires after 30 minutes
 * 
 * 3. ✅ MongoDB Transaction started:
 *    - Phase 0: Reverse old stock movements
 *    - Phase 1: Apply new changes
 *    - Phase 2: Update vendor payments (PENDING only)
 *    - Phase 3: Update stock totals
 * 
 * 4. ✅ Commit or Rollback:
 *    - ALL changes succeed together OR
 *    - NONE of them succeed (atomic guarantee)
 * 
 * 5. ✅ Lock released + Recovery logged if failed
 */

/**
 * CURL EXAMPLES
 */

// Get current GRN details
const curlFetch = `
curl -X GET http://localhost:5000/api/v1/grn/69bfd33c0ffa7142df8680ce \\
  -H "Content-Type: application/json"
`;

// Edit GRN with items array
const curlEdit = `
curl -X PUT http://localhost:5000/api/v1/grn/69bfd33c0ffa7142df8680ce \\
  -H "Content-Type: application/json" \\
  -d '{
    "items": [
      {
        "productId": "69beef0d228dfd0cc59b9fcc",
        "itemName": "I phone 6 s pluse",
        "itemCode": "1001",
        "quantity": 2,
        "unitCost": 10.5,
        "totalCost": 21,
        "taxPercent": 5,
        "batchNumber": "BATCH-001"
      }
    ],
    "notes": "Updated quantity",
    "createdBy": "69beee6a4083203fc968ae78"
  }'
`;

export { correctEditRequest, wrongRequest1, wrongRequest2, wrongRequest3 };
