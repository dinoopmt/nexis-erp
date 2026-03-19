# Vendor Payment Tracking - Implementation Code Patterns

## Overview
Complete code patterns for implementing advance payment and partial invoice tracking in VendorPayments component.

---

## 1. ADVANCE PAYMENT CREATION & TRACKING

### Database Schema Update
```javascript
// server/Models/AdvancePayment.js (NEW)

const advancePaymentSchema = new mongoose.Schema(
  {
    voucherId: {
      type: String,
      required: true,
      unique: true
    },
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vendors',
      required: true,
      index: true
    },
    vendorName: String,
    
    // Amounts
    advanceAmount: {
      type: Number,
      required: true,
      default: 0
    },
    appliedAmount: {
      type: Number,
      required: true,
      default: 0
    },
    balanceAmount: {
      type: Number,
      required: true,
      default: 0
    },
    
    // Payment Details
    paymentDate: Date,
    paymentMethod: {
      type: String,
      enum: ['CASH', 'BANK_TRANSFER', 'CHEQUE'],
      required: true
    },
    voucherNumber: String,
    
    // Usage Tracking
    appliedToInvoices: [
      {
        invoiceId: mongoose.Schema.Types.ObjectId,
        invoiceNumber: String,
        appliedAmount: Number,
        appliedDate: Date
      }
    ],
    
    // Status
    status: {
      type: String,
      enum: ['Active', 'PartiallyUsed', 'FullyUsed', 'Reversed'],
      default: 'Active'
    },
    
    // Audit
    createdBy: String,
    notes: String
  },
  { timestamps: true }
);
```

### Backend Service Method
```javascript
// server/modules/payments/services/AdvancePaymentService.js

class AdvancePaymentService {
  // Create advance from payment
  static async createAdvanceFromPayment(paymentId, paymentData) {
    const { vendorId, vendorName, amount, paymentMethod, paymentDate, paymentNumber } = paymentData;
    
    const advance = new AdvancePayment({
      voucherId: paymentId,
      vendorId,
      vendorName,
      advanceAmount: amount,
      appliedAmount: 0,
      balanceAmount: amount,        // ← Available balance
      paymentDate,
      paymentMethod,
      voucherNumber: paymentNumber,
      status: 'Active'
    });
    
    return await advance.save();
  }
  
  // Get vendor advances
  static async getVendorAdvances(vendorId) {
    return await AdvancePayment.find({
      vendorId,
      status: { $ne: 'Reversed' }
    }).sort({ createdAt: -1 });
  }
  
  // Apply advance to invoice
  static async applyAdvanceToInvoice(advanceId, invoiceId, amountToApply) {
    const advance = await AdvancePayment.findById(advanceId);
    const invoice = await PurchaseInvoice.findById(invoiceId);
    
    if (!advance) throw new Error('Advance not found');
    if (!invoice) throw new Error('Invoice not found');
    
    // Validate
    if (amountToApply > advance.balanceAmount) {
      throw new Error('Amount exceeds available advance balance');
    }
    
    const invoiceBalance = invoice.totalAmount - invoice.amountPaid;
    if (amountToApply > invoiceBalance) {
      throw new Error('Amount exceeds invoice balance');
    }
    
    // Update advance
    advance.appliedAmount += amountToApply;
    advance.balanceAmount -= amountToApply;
    advance.appliedToInvoices.push({
      invoiceId: invoice._id,
      invoiceNumber: invoice.invoiceNumber,
      appliedAmount: amountToApply,
      appliedDate: new Date()
    });
    
    // Update status
    if (advance.balanceAmount === 0) {
      advance.status = 'FullyUsed';
    } else if (advance.appliedAmount > 0) {
      advance.status = 'PartiallyUsed';
    }
    
    // Update invoice
    invoice.amountPaid += amountToApply;
    invoice.outstandingAmount = invoice.totalAmount - invoice.amountPaid;
    invoice.paymentStatus = 
      invoice.outstandingAmount === 0 ? 'Paid' : 'Partial';
    
    // Add to invoice payment allocations
    invoice.invoicePaymentAllocations.push({
      paymentVoucherId: advance.voucherId,
      paymentDate: new Date(),
      allocatedAmount: amountToApply,
      paymentMethod: advance.paymentMethod,
      status: 'Applied',
      paymentType: 'ADVANCE_APPLICATION'
    });
    
    await advance.save();
    await invoice.save();
    
    return { advance, invoice };
  }
  
  // Reverse advance application
  static async reverseAdvanceApplication(advanceId, invoiceId) {
    const advance = await AdvancePayment.findById(advanceId);
    const invoice = await PurchaseInvoice.findById(invoiceId);
    
    // Find original application
    const appIndex = advance.appliedToInvoices.findIndex(
      app => app.invoiceId.toString() === invoiceId
    );
    
    if (appIndex === -1) throw new Error('Application not found');
    
    const application = advance.appliedToInvoices[appIndex];
    
    // Reverse advance
    advance.appliedAmount -= application.appliedAmount;
    advance.balanceAmount += application.appliedAmount;
    advance.appliedToInvoices.splice(appIndex, 1);
    
    // Update status
    if (advance.appliedAmount === 0) {
      advance.status = 'Active';
    } else if (advance.balanceAmount > 0) {
      advance.status = 'PartiallyUsed';
    }
    
    // Reverse invoice
    invoice.amountPaid -= application.appliedAmount;
    invoice.outstandingAmount = invoice.totalAmount - invoice.amountPaid;
    invoice.paymentStatus = 
      invoice.outstandingAmount === 0 ? 'Paid' : 
      invoice.amountPaid > 0 ? 'Partial' : 'Unpaid';
    
    await advance.save();
    await invoice.save();
    
    return { advance, invoice };
  }
}

module.exports = AdvancePaymentService;
```

---

## 2. PAYMENT STATUS WORKFLOW

### Backend Controller
```javascript
// server/modules/payments/controllers/paymentController.js

class PaymentController {
  // Create payment
  static async createPayment(req, res) {
    const { 
      paymentDate, 
      payFromAccountId, 
      payToAccountId, 
      amount, 
      paymentMethod,
      referenceNumber,
      description,
      vendorId,
      vendorName,
      chequeNumber,
      chequeDate,
      bankName
    } = req.body;
    
    // Validate
    if (!payFromAccountId || !payToAccountId || !amount) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    
    try {
      // Generate payment number
      const lastPayment = await Payment.findOne().sort({ paymentNumber: -1 });
      let paymentNumber = 'PAY-001';
      if (lastPayment?.paymentNumber) {
        const num = parseInt(lastPayment.paymentNumber.split('-')[1]);
        paymentNumber = `PAY-${String(num + 1).padStart(3, '0')}`;
      }
      
      const payment = new Payment({
        paymentNumber,
        paymentDate,
        payFromAccountId,
        payToAccountId,
        amount: parseFloat(amount),
        paymentMethod,
        referenceNumber,
        description,
        vendorId,
        vendorName,
        chequeNumber,
        chequeDate,
        bankName,
        status: 'PENDING',              // ← Initial status
        createdBy: req.user?.id || 'system',
        createdAt: new Date()
      });
      
      const saved = await payment.save();
      
      res.status(201).json({
        success: true,
        message: 'Payment created successfully',
        data: saved
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
  
  // Change payment status
  static async changePaymentStatus(req, res) {
    const { id } = req.params;
    const { action } = req.query;  // approve, pay, cancel
    
    try {
      const payment = await Payment.findById(id);
      if (!payment) {
        return res.status(404).json({ message: 'Payment not found' });
      }
      
      // Validate status transitions
      if (action === 'approve') {
        if (payment.status !== 'PENDING') {
          return res.status(400).json({ message: 'Only pending payments can be approved' });
        }
        payment.status = 'APPROVED';
        payment.approvedAt = new Date();
        payment.approvedBy = req.user?.id || 'system';
      } 
      else if (action === 'pay') {
        if (payment.status !== 'APPROVED') {
          return res.status(400).json({ message: 'Only approved payments can be paid' });
        }
        payment.status = 'PAID';
        payment.paidAt = new Date();
        
        // ✅ IF PAYMENT IS FROM VENDOR AP ACCOUNT, CREATE ADVANCE
        // Get account type
        const toAccount = await ChartOfAccounts.findById(payment.payToAccountId);
        
        if (toAccount && toAccount.accountType === 'AP') {
          // Create advance record
          await AdvancePaymentService.createAdvanceFromPayment(
            payment._id,
            {
              vendorId: payment.vendorId,
              vendorName: payment.vendorName,
              amount: payment.amount,
              paymentMethod: payment.paymentMethod,
              paymentDate: payment.paymentDate,
              paymentNumber: payment.paymentNumber
            }
          );
          console.log(`✅ Advance created from payment: ${payment.paymentNumber}`);
        }
        
        // ✅ POST GL ENTRY
        // Debit: AP Account
        // Credit: Bank/Cash Account
        const journalEntry = {
          transactionDate: new Date(),
          referenceNumber: payment.paymentNumber,
          entries: [
            {
              accountId: payment.payToAccountId,
              debitAmount: payment.amount,
              creditAmount: 0,
              narration: `Payment to ${payment.vendorName}`
            },
            {
              accountId: payment.payFromAccountId,
              debitAmount: 0,
              creditAmount: payment.amount,
              narration: `Payment from ${payment.paymentMethod}`
            }
          ],
          status: 'POSTED',
          createdBy: req.user?.id || 'system'
        };
        
        await JournalEntry.create(journalEntry);
      } 
      else if (action === 'cancel') {
        if (!['PENDING', 'APPROVED'].includes(payment.status)) {
          return res.status(400).json({ message: 'Paid payments cannot be cancelled' });
        }
        payment.status = 'CANCELLED';
        payment.cancelledAt = new Date();
      }
      
      const updated = await payment.save();
      
      res.status(200).json({
        success: true,
        message: `Payment ${action}ed successfully`,
        data: updated
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
  
  // Get vendor outstanding invoices
  static async getVendorOutstandingInvoices(req, res) {
    const { vendorId } = req.params;
    
    try {
      const invoices = await PurchaseInvoice.find({
        vendorId,
        paymentStatus: { $ne: 'Paid' }
      }).select('invoiceNumber invoiceDate totalAmount amountPaid outstandingAmount paymentStatus');
      
      res.status(200).json({
        success: true,
        data: invoices
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
}

module.exports = PaymentController;
```

---

## 3. FRONTEND: ENHANCED VENDORPAYMENTS COMPONENT

### State and Hooks
```javascript
// client/src/components/accounts/VendorPayments.jsx

export default function VendorsPayments() {
  const [payments, setPayments] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [advances, setAdvances] = useState([]);     // ← NEW
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showAdvanceModal, setShowAdvanceModal] = useState(false);  // ← NEW
  const [editingId, setEditingId] = useState(null);
  
  const [formData, setFormData] = useState({
    paymentDate: new Date().toISOString().split("T")[0],
    payFromAccountId: "",
    payToAccountId: "",
    amount: "",
    paymentMethod: "CASH",
    referenceNumber: "",
    description: "",
    chequeNumber: "",
    chequeDate: "",
    bankName: "",
    vendorId: "",                 // ← NEW
    vendorName: ""                // ← NEW
  });
  
  // ✅ Fetch all data
  useEffect(() => {
    fetchPayments();
    fetchAccounts();
    fetchVendors();
  }, []);
  
  // ✅ Fetch advances when vendor selected
  useEffect(() => {
    if (formData.vendorId) {
      fetchVendorAdvances(formData.vendorId);
    }
  }, [formData.vendorId]);
  
  const fetchVendors = async () => {
    try {
      const response = await fetch(`${API_URL}/api/v1/vendors`);
      const data = await response.json();
      setVendors(Array.isArray(data) ? data : data.data || []);
    } catch (error) {
      console.error("Error fetching vendors:", error);
    }
  };
  
  const fetchVendorAdvances = async (vendorId) => {
    try {
      const response = await fetch(
        `${API_URL}/api/v1/advances/vendor/${vendorId}`
      );
      const data = await response.json();
      setAdvances(Array.isArray(data) ? data : data.data || []);
    } catch (error) {
      console.error("Error fetching advances:", error);
    }
  };
  
  // ✅ Handle vendor selection
  const handleVendorSelect = (vendorId) => {
    const vendor = vendors.find(v => v._id === vendorId);
    setFormData(prev => ({
      ...prev,
      vendorId,
      vendorName: vendor?.name || ''
    }));
  };
  
  // ... rest of component
}
```

### Apply Advance to Invoice Section
```javascript
// In VendorsPayments modal

{/* Vendor Selection */}
<div>
  <label className="block text-xs font-medium text-gray-700 mb-1">
    Vendor (for advance tracking)
  </label>
  <select
    value={formData.vendorId}
    onChange={(e) => handleVendorSelect(e.target.value)}
    className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs"
  >
    <option value="">Select Vendor</option>
    {vendors.map(vendor => (
      <option key={vendor._id} value={vendor._id}>
        {vendor.name}
      </option>
    ))}
  </select>
</div>

{/* Show available advances if vendor selected */}
{formData.vendorId && advances.length > 0 && (
  <div className="bg-blue-50 border border-blue-200 rounded p-2">
    <p className="text-xs font-semibold text-blue-800 mb-1">
      Available Advances:
    </p>
    {advances.map(advance => (
      <div 
        key={advance._id} 
        className="text-xs text-blue-700 mb-1"
      >
        <span className="font-medium">{advance.voucherId}</span>
        {' - Balance: '}
        <span className="font-semibold">
          {amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </span>
        <button
          type="button"
          onClick={() => handleApplyAdvance(advance._id, advance.balanceAmount)}
          className="ml-2 text-blue-600 hover:text-blue-800 text-xs underline"
        >
          Apply
        </button>
      </div>
    ))}
  </div>
)}
```

### Apply Advance Handler
```javascript
const handleApplyAdvance = (advanceId, maxAmount) => {
  // Open dialog or form
  setShowAdvanceModal(true);
  // Store advance info
  setCurrentAdvance({ advanceId, maxAmount });
};

const submitAdvanceApplication = async () => {
  try {
    const response = await fetch(
      `${API_URL}/api/v1/advances/${currentAdvance.advanceId}/apply-to-invoice`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceId: selectedInvoiceId,
          amount: advanceApplicationAmount
        })
      }
    );
    
    const data = await response.json();
    
    if (!response.ok) {
      alert(data.message || 'Error applying advance');
      return;
    }
    
    toast.success('Advance applied successfully');
    fetchPayments();
    fetchVendorAdvances(currentAdvance.vendorId);
    setShowAdvanceModal(false);
  } catch (error) {
    console.error('Error:', error);
    alert('Error applying advance');
  }
};
```

---

## 4. PAYMENT ALLOCATION LOGIC

### Calculate payment allocation across multiple invoices
```javascript
// Utility function: allocatePaymentToInvoices

function allocatePaymentToInvoices(
  paymentAmount, 
  selectedInvoices, 
  appliedAdvanceAmount = 0
) {
  const allocations = [];
  let remainingAmount = paymentAmount + appliedAdvanceAmount;
  
  // Allocate in invoice selection order (FIFO)
  for (const invoice of selectedInvoices) {
    if (remainingAmount <= 0) break;
    
    const invoiceBalance = invoice.totalAmount - invoice.amountPaid;
    const allocatedAmount = Math.min(remainingAmount, invoiceBalance);
    
    allocations.push({
      invoiceId: invoice._id,
      invoiceNumber: invoice.invoiceNumber,
      invoiceAmount: invoice.totalAmount,
      previouslyPaid: invoice.amountPaid,
      allocatedAmount: parseFloat(allocatedAmount.toFixed(2)),
      newTotalPaid: invoiceBalance > 0 ? 
        parseFloat((invoice.amountPaid + allocatedAmount).toFixed(2)) : 
        invoice.amountPaid,
      newOutstanding: invoiceBalance - allocatedAmount,
      newPaymentStatus: 
        (invoiceBalance - allocatedAmount) === 0 ? 'Paid' :
        (invoiceBalance - allocatedAmount) > 0 ? 'Partial' : 
        invoice.paymentStatus
    });
    
    remainingAmount = parseFloat((remainingAmount - allocatedAmount).toFixed(2));
  }
  
  return {
    allocations,
    totalAllocated: paymentAmount + appliedAdvanceAmount - remainingAmount,
    remainingUnallocated: remainingAmount
  };
}
```

---

## 5. PAYMENT STATUS BADGE COMPONENT

```javascript
// client/src/components/shared/PaymentStatusBadge.jsx

export function PaymentStatusBadge({ status, size = 'sm' }) {
  const statusConfig = {
    'PENDING': {
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      text: 'text-yellow-800',
      icon: '⏳'
    },
    'APPROVED': {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      text: 'text-blue-800',
      icon: '✓'
    },
    'PAID': {
      bg: 'bg-green-50',
      border: 'border-green-200',
      text: 'text-green-800',
      icon: '✓✓'
    },
    'CANCELLED': {
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-800',
      icon: '✗'
    }
  };
  
  const config = statusConfig[status] || statusConfig['PENDING'];
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm';
  
  return (
    <span className={`inline-flex items-center gap-1 rounded border ${config.bg} ${config.border} ${config.text} ${sizeClasses} font-medium`}>
      <span>{config.icon}</span>
      {status}
    </span>
  );
}
```

---

## 6. API ROUTES SETUP

```javascript
// server/modules/payments/routes/paymentRoutes.js

const router = require('express').Router();
const PaymentController = require('../controllers/paymentController');
const AdvancePaymentController = require('../controllers/advancePaymentController');

// Payment routes
router.post('/api/v1/payments', PaymentController.createPayment);
router.get('/api/v1/payments', PaymentController.listPayments);
router.get('/api/v1/payments/:id', PaymentController.getPayment);
router.put('/api/v1/payments/:id', PaymentController.updatePayment);
router.patch('/api/v1/payments/:id/status', PaymentController.changePaymentStatus);
router.delete('/api/v1/payments/:id', PaymentController.deletePayment);

// Advance routes
router.get('/api/v1/advances/vendor/:vendorId', AdvancePaymentController.getVendorAdvances);
router.get('/api/v1/advances/:id', AdvancePaymentController.getAdvance);
router.post('/api/v1/advances/:id/apply-to-invoice', AdvancePaymentController.applyAdvance);
router.post('/api/v1/advances/:id/reverse', AdvancePaymentController.reverseAdvance);

// Invoice endpoints
router.get('/api/v1/purchase-invoices/vendor/:vendorId/outstanding', 
  PaymentController.getVendorOutstandingInvoices);

module.exports = router;
```

---

## Summary

**This implementation provides:**

1. ✅ Advance payment creation from payments
2. ✅ Track advance balance (available, applied, used)
3. ✅ Apply advance to invoices
4. ✅ Reverse advance applications
5. ✅ Payment status workflow (PENDING→APPROVED→PAID)
6. ✅ Invoice payment status updates
7. ✅ GL entry posting
8. ✅ Vendor advance tracking
9. ✅ Multi-invoice allocation
10. ✅ Audit trail per transaction

**Files to create/update:**
- `server/Models/AdvancePayment.js` (NEW)
- `server/modules/payments/services/AdvancePaymentService.js` (NEW)
- `server/modules/payments/controllers/advancePaymentController.js` (NEW)
- `client/src/components/accounts/VendorPayments.jsx` (UPDATE)
- `server/modules/payments/routes/paymentRoutes.js` (UPDATE)
