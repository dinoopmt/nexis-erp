# PAYMENTS Module Services Guide

## Overview

The **Payments Module** provides comprehensive payment processing, bank reconciliation, and cheque management capabilities. It enables complete payment lifecycle management from creation through settlement, with support for multiple payment methods and bank integration.

**Module Location**: `server/modules/payments/services/`

**Services**: 4 services | **Methods**: 30 methods | **Code**: 1,550+ lines

---

## Services Architecture

### 1. PaymentService
**Purpose**: Create, process, and manage payments

**File**: `PaymentService.js`
**Methods**: 8

#### Core Methods

##### `createPayment(paymentData)`
- **Purpose**: Create a new payment in draft status
- **Parameters**:
  - `paymentData`: { payeeId, payeeType, amount, paymentMethod, dueDate, description, invoices, referenceNo }
  - `paymentMethod`: Cheque, BankTransfer, CreditCard, Wallet, Cash, NEFT, RTGS, IMPS
  - `payeeType`: Vendor, Customer, Employee, Creditor
- **Returns**: Payment record with paymentId and status=Draft
- **Key Features**:
  - Multiple payment methods supported
  - Invoice-level allocation support
  - Auto-generated reference number
  - Payment method validation
- **Example**:
  ```javascript
  const payment = await PaymentService.createPayment({
    payeeId: 'VEN_001',
    payeeType: 'Vendor',
    amount: 50000,
    paymentMethod: 'BankTransfer',
    dueDate: '2024-03-15',
    invoices: ['INV_001', 'INV_002'],
    description: 'Payment for Q1 supplies'
  });
  // Returns: payment with ID PAY_xxxx, status Draft
  ```

##### `processPayment(paymentId, processingData)`
- **Purpose**: Process payment from draft to processed status
- **Parameters**:
  - `paymentId`: Payment ID
  - `processingData`: { approvedBy, accountNumber, bankCode, notes }
- **Returns**: Processed payment with transaction reference
- **Key Features**:
  - Bank account selection
  - Approval tracking
  - GL journal entry creation
  - Transaction reference generation
- **Example**:
  ```javascript
  const processed = await PaymentService.processPayment('PAY_001', {
    approvedBy: 'USER_MANAGER_001',
    accountNumber: '123456789',
    bankCode: 'BANK001',
    notes: 'Approved for processing'
  });
  // Returns: payment with status Processed, GL posted
  ```

##### `allocatePaymentToInvoices(paymentId, allocations)`
- **Purpose**: Allocate payment amount to specific invoices
- **Parameters**:
  - `paymentId`: Payment ID
  - `allocations`: Array of { invoiceId, allocatedAmount }
- **Returns**: Allocation result with allocation ID
- **Validation**:
  - Total allocated cannot exceed payment amount
  - Invoice amounts validated
  - Partial allocations supported
- **Example**:
  ```javascript
  const allocation = await PaymentService.allocatePaymentToInvoices('PAY_001', [
    { invoiceId: 'INV_001', allocatedAmount: 30000 },
    { invoiceId: 'INV_002', allocatedAmount: 20000 }
  ]);
  // Returns: allocation with 2 invoices allocated
  ```

##### `getPaymentDetails(paymentId)`
- **Purpose**: Retrieve complete payment information
- **Parameters**:
  - `paymentId`: Payment ID
- **Returns**: Payment details with allocations and GL entries
- **Information Includes**:
  - Payment header info
  - Invoice allocations
  - GL journal entry reference
  - Payment transaction details
- **Example**:
  ```javascript
  const details = await PaymentService.getPaymentDetails('PAY_001');
  // Returns: complete payment with allocations and GL entry
  ```

##### `getPaymentsByStatus(status, filters)`
- **Purpose**: Retrieve payments filtered by status
- **Parameters**:
  - `status`: Draft, Processed, Cleared, Cancelled, Reversed
  - `filters`: { limit, fromDate, toDate, payeeType }
- **Returns**: Array of payments matching status and filters
- **Example**:
  ```javascript
  const pending = await PaymentService.getPaymentsByStatus('Processed', {
    payeeType: 'Vendor',
    limit: 50
  });
  // Returns: processed vendor payments
  ```

##### `cancelPayment(paymentId, reason)`
- **Purpose**: Cancel a payment
- **Parameters**:
  - `paymentId`: Payment ID
  - `reason`: Cancellation reason
- **Returns**: Cancelled payment with reversal GL entry
- **Features**:
  - GL reversal entry auto-created
  - Reason tracking
  - Status change to Cancelled
- **Example**:
  ```javascript
  const cancelled = await PaymentService.cancelPayment('PAY_001', 'Duplicate payment created');
  // Returns: payment with status Cancelled, GL reversed
  ```

##### `getPaymentSummary(filters)`
- **Purpose**: Get aggregated payment statistics
- **Parameters**:
  - `filters`: { fromDate, toDate, payeeType, paymentMethod }
- **Returns**: Summary with counts and amounts by status/method
- **Summary Includes**:
  - Total count and amount
  - Breakdown by payment status
  - Breakdown by payment method
  - Top payees by amount
  - Average payment amount
- **Example**:
  ```javascript
  const summary = await PaymentService.getPaymentSummary({
    fromDate: '2024-01-01',
    toDate: '2024-12-31'
  });
  // Returns: 245 payments, 5.25M total, 96% clearance rate
  ```

##### `reversePayment(paymentId, reason)`
- **Purpose**: Reverse a previously processed payment
- **Parameters**:
  - `paymentId`: Original payment ID
  - `reason`: Reversal reason
- **Returns**: Reversal record with GL reversal entry
- **Features**:
  - Complete GL reversal with journal entry
  - Original payment updated to Reversed status
  - Refund initiation
  - Audit trail maintenance
- **Example**:
  ```javascript
  const reversal = await PaymentService.reversePayment('PAY_001', 'Wrong payee account');
  // Returns: reversal record with GL reversed and refund initiated
  ```

---

### 2. BankReconciliationService
**Purpose**: Reconcile bank statements with GL entries

**File**: `BankReconciliationService.js`
**Methods**: 7

#### Core Methods

##### `uploadBankStatement(statementData)`
- **Purpose**: Upload bank statement for reconciliation
- **Parameters**:
  - `statementData`: { bankAccountId, statementDate, transactions, openingBalance, closingBalance, currency }
  - `transactions`: Array of bank transactions
- **Returns**: Statement record with statementId
- **Key Features**:
  - Multi-currency support
  - Transaction parsing and validation
  - Balance verification setup
  - Automatic matching initialization
- **Example**:
  ```javascript
  const statement = await BankReconciliationService.uploadBankStatement({
    bankAccountId: 'BANK_001',
    statementDate: '2024-03-31',
    openingBalance: 100000,
    closingBalance: 150000,
    transactions: [
      { date: '2024-03-01', description: 'Deposit', amount: 50000, refNo: 'CHQ001' },
      { date: '2024-03-15', description: 'Cheque', amount: -30000, refNo: 'CHQ002' }
    ]
  });
  // Returns: statement with 2 transactions pending match
  ```

##### `matchBankTransactions(statementId, matches)`
- **Purpose**: Match bank statement transactions with GL entries
- **Parameters**:
  - `statementId`: Statement ID
  - `matches`: Array of { bankTxnId, glEntryId, amount }
- **Returns**: Matching result with matched amount and count
- **Features**:
  - Amount validation
  - GL entry reference tracking
  - Matched transaction marking
  - Remaining unmatched tracking
- **Example**:
  ```javascript
  const matching = await BankReconciliationService.matchBankTransactions(
    'STMT_001',
    [
      { bankTxnId: 'TXN_001', glEntryId: 'JE_001', amount: 50000 },
      { bankTxnId: 'TXN_002', glEntryId: 'JE_002', amount: 30000 }
    ]
  );
  // Returns: 2 transactions matched, 50K total
  ```

##### `getReconciliationDifferences(statementId)`
- **Purpose**: Identify differences between bank and GL
- **Parameters**:
  - `statementId`: Statement ID
- **Returns**: Discrepancies with categorization and analysis
- **Difference Types**:
  - BankOnly: In bank but not in GL
  - GLOnly: In GL but not in bank
  - AmountMismatch: Amounts don't match
- **Analysis Includes**:
  - Outstanding checks
  - Deposits in transit
  - Bank charges
  - Identified errors
- **Example**:
  ```javascript
  const diffs = await BankReconciliationService.getReconciliationDifferences('STMT_001');
  // Returns: 3 differences totaling 5K variance
  ```

##### `reconcileStatement(statementId, reconcData)`
- **Purpose**: Complete reconciliation with adjustments
- **Parameters**:
  - `statementId`: Statement ID
  - `reconcData`: { adjustments, notes, approvedBy }
  - `adjustments`: Array of GL adjustments to apply
- **Returns**: Reconciliation record with zero variance
- **Features**:
  - GL adjustment entries creation
  - Completed status marking
  - Approval tracking
  - Zero variance confirmation
- **Example**:
  ```javascript
  const recon = await BankReconciliationService.reconcileStatement('STMT_001', {
    adjustments: [
      { entryType: 'Interest', amount: 1500 },
      { entryType: 'BankCharges', amount: 250 }
    ],
    approvedBy: 'USER_ACCT_001',
    notes: 'Interest and charges reconciled'
  });
  // Returns: reconciliation completed with 0 variance
  ```

##### `getUnreconciledTransactions(bankAccountId, filters)`
- **Purpose**: Get transactions not yet reconciled
- **Parameters**:
  - `bankAccountId`: Bank account ID
  - `filters`: { limit, daysOpen, minAmount }
  - `daysOpen`: Show items open for N+ days
- **Returns**: Array of unreconciled transactions
- **Transaction Info**:
  - Date and description
  - Amount and type (Check, Transfer, Deposit)
  - Days outstanding
  - Status (Outstanding, InTransit)
- **Example**:
  ```javascript
  const unreconciled = await BankReconciliationService.getUnreconciledTransactions(
    'BANK_001',
    { daysOpen: 30, minAmount: 1000 }
  );
  // Returns: items outstanding 30+ days
  ```

##### `getReconciliationHistory(bankAccountId, filters)`
- **Purpose**: Get past reconciliation records
- **Parameters**:
  - `bankAccountId`: Bank account ID
  - `filters`: { limit, fromDate, toDate }
- **Returns**: Array of past reconciliations
- **History Shows**:
  - Statement date and reconciliation date
  - Opening/closing balances
  - Transaction count
  - Variance (should be 0)
  - Reconciliation user and time
- **Example**:
  ```javascript
  const history = await BankReconciliationService.getReconciliationHistory('BANK_001', {
    limit: 12
  });
  // Returns: last 12 monthly reconciliations
  ```

##### `generateReconciliationReport(bankAccountId, filters)`
- **Purpose**: Generate comprehensive reconciliation report
- **Parameters**:
  - `bankAccountId`: Bank account ID
  - `filters`: { fromDate, toDate, includeDetails }
- **Returns**: Reconciliation report with statistics
- **Report Includes**:
  - Total statements and transactions
  - Reconciliation rate percentage
  - Monthly breakdown with amounts
  - Variance analysis
  - Time to reconcile metrics
- **Example**:
  ```javascript
  const report = await BankReconciliationService.generateReconciliationReport('BANK_001', {
    fromDate: '2024-01-01',
    toDate: '2024-12-31'
  });
  // Returns: annual reconciliation report with 98.5% rate
  ```

---

### 3. PaymentGatewayService
**Purpose**: Process payments through gateway providers

**File**: `PaymentGatewayService.js`
**Methods**: 8

#### Core Methods

##### `processCardPayment(cardData)`
- **Purpose**: Process credit/debit card payment
- **Parameters**:
  - `cardData`: { cardNumber, cvv, expiryDate, cardHolderName, amount, currency, description }
- **Returns**: Authorization result with transaction ID
- **Security Features**:
  - Luhn algorithm validation
  - Card type detection
  - CVV requirement
  - Masked card number in response
- **Card Types**: Visa, Mastercard, Amex, Discover
- **Example**:
  ```javascript
  const auth = await PaymentGatewayService.processCardPayment({
    cardNumber: '4532123456789010',
    cvv: '123',
    expiryDate: '12/25',
    cardHolderName: 'John Doe',
    amount: 5000,
    currency: 'USD'
  });
  // Returns: transaction authorized, card last4: 9010
  ```

##### `processBankTransfer(transferData)`
- **Purpose**: Process bank-to-bank transfer
- **Parameters**:
  - `transferData`: { bankName, accountNumber, routingNumber, accountHolderName, amount, currency, transferType }
  - `transferType`: NEFT, RTGS, IMPS, EFT, ACH
- **Returns**: Transfer initiation record with reference
- **Features**:
  - Multiple transfer protocols
  - Routing number validation
  - Estimated delivery date
  - Bank reference tracking
- **Example**:
  ```javascript
  const transfer = await PaymentGatewayService.processBankTransfer({
    bankName: 'State Bank',
    accountNumber: '123456789012',
    routingNumber: '987654321',
    accountHolderName: 'Vendor Inc',
    amount: 50000,
    transferType: 'NEFT'
  });
  // Returns: transfer initiated, delivery in 2 days
  ```

##### `processWalletPayment(walletData)`
- **Purpose**: Process digital wallet payment
- **Parameters**:
  - `walletData`: { walletProvider, walletToken, amount, currency, metadata }
  - `walletProvider`: ApplePay, GooglePay, PayPal, Alipay, WeChat
- **Returns**: Wallet transaction result
- **Supported Wallets**:
  - Apple Pay (iOS)
  - Google Pay (Android)
  - PayPal
  - Alipay (China)
  - WeChat Pay (China)
- **Example**:
  ```javascript
  const wallet = await PaymentGatewayService.processWalletPayment({
    walletProvider: 'ApplePay',
    walletToken: 'WALLET_TOKEN_123',
    amount: 5000,
    currency: 'USD'
  });
  // Returns: completed wallet transaction
  ```

##### `getTransactionStatus(transactionId)`
- **Purpose**: Get current status of a transaction
- **Parameters**:
  - `transactionId`: Transaction ID
- **Returns**: Transaction status and details
- **Status Info**:
  - Status (Pending, Authorized, Completed, Failed)
  - Amount and currency
  - Settlement date
  - Gateway status (Settled, Processing)
- **Example**:
  ```javascript
  const status = await PaymentGatewayService.getTransactionStatus('TXN_001');
  // Returns: Completed, settled next business day
  ```

##### `refundTransaction(originalTransactionId, refundAmount, reason)`
- **Purpose**: Refund a previously processed transaction
- **Parameters**:
  - `originalTransactionId`: Original transaction ID
  - `refundAmount`: Amount to refund (null for full)
  - `reason`: Refund reason
- **Returns**: Refund initiation record
- **Features**:
  - Full or partial refunds
  - Refund reason tracking
  - Estimated completion date
  - Refund status monitoring
- **Example**:
  ```javascript
  const refund = await PaymentGatewayService.refundTransaction(
    'TXN_001',
    2500,
    'Partial return'
  );
  // Returns: refund initiated, completion in 3 days
  ```

##### `getPaymentSettlement(filters)`
- **Purpose**: Get payment settlement records
- **Parameters**:
  - `filters`: { fromDate, toDate, status, limit }
- **Returns**: Settlement records with fees and net amounts
- **Settlement Info**:
  - Settlement date
  - Total amount and transaction count
  - Processing fees
  - Net settlement amount
  - Settlement status
- **Example**:
  ```javascript
  const settlements = await PaymentGatewayService.getPaymentSettlement({
    limit: 30
  });
  // Returns: last 30 settlements with fee details
  ```

##### `validateCard(cardNumber)`
- **Purpose**: Validate card number
- **Parameters**:
  - `cardNumber`: Card number to validate
- **Returns**: Validation result with card type
- **Validation**:
  - Luhn algorithm check
  - Card type detection
  - Length validation
- **Example**:
  ```javascript
  const valid = await PaymentGatewayService.validateCard('4532123456789010');
  // Returns: valid, Visa card
  ```

---

### 4. ChequeManagementService
**Purpose**: Manage cheque lifecycle from issuance to clearing

**File**: `ChequeManagementService.js`
**Methods**: 9

#### Core Methods

##### `issueCheque(chequeData)`
- **Purpose**: Issue a new cheque
- **Parameters**:
  - `chequeData`: { bankAccountId, payeeName, amount, chequeDate, dueDate, description, issuedTo }
- **Returns**: Issued cheque record with cheque number
- **Key Features**:
  - Auto-generated cheque number from sequence
  - Status set to Issued
  - GL entry creation (Debit Bank, Credit Payables)
  - Payment tracking
- **Example**:
  ```javascript
  const cheque = await ChequeManagementService.issueCheque({
    bankAccountId: 'BANK_001',
    payeeName: 'Vendor A',
    amount: 50000,
    chequeDate: '2024-03-15',
    dueDate: '2024-03-20',
    description: 'Payment for goods received'
  });
  // Returns: cheque with number CHQ_123456, status Issued
  ```

##### `clearCheque(chequeId, clearingData)`
- **Purpose**: Record cheque clearing through bank
- **Parameters**:
  - `chequeId`: Cheque ID
  - `clearingData`: { clearedDate, clearingAmount, bankRef, depositAccount }
- **Returns**: Cleared cheque record
- **Features**:
  - Clearing date and amount tracking
  - Bank reference recording
  - GL entry update (reconciliation)
  - Status change to Cleared
- **Example**:
  ```javascript
  const cleared = await ChequeManagementService.clearCheque('CHEQUE_001', {
    clearedDate: '2024-03-20',
    clearingAmount: 50000,
    bankRef: 'CLR_20240320_001'
  });
  // Returns: cheque with status Cleared
  ```

##### `recordChequeBounce(chequeId, bounceData)`
- **Purpose**: Record cheque bounce
- **Parameters**:
  - `chequeId`: Cheque ID
  - `bounceData`: { bounceDate, bounceReason, bounceCharges, noticeDate }
  - `bounceReason`: InsufficientFunds, ClosedAccount, InvalidSignature, etc
- **Returns**: Bounce record with reversal entries
- **Features**:
  - Bounce reason tracking
  - Bank charges capture
  - GL reversal entries
  - Bounce charge journal entry
- **Example**:
  ```javascript
  const bounce = await ChequeManagementService.recordChequeBounce('CHEQUE_001', {
    bounceDate: '2024-03-22',
    bounceReason: 'InsufficientFunds',
    bounceCharges: 500,
    noticeDate: '2024-03-23'
  });
  // Returns: bounce record with GL reversals and charges
  ```

##### `getChequeStatus(chequeId)`
- **Purpose**: Get current cheque status
- **Parameters**:
  - `chequeId`: Cheque ID
- **Returns**: Current cheque status and details
- **Status Info**:
  - Current status (Issued, Cleared, Bounced)
  - Payee and amount
  - Dates (issue, clear, bounce)
  - Days outstanding
- **Example**:
  ```javascript
  const status = await ChequeManagementService.getChequeStatus('CHEQUE_001');
  // Returns: cheque status Cleared, 5 days outstanding
  ```

##### `getOutstandingCheques(bankAccountId, filters)`
- **Purpose**: Get cheques not yet cleared
- **Parameters**:
  - `bankAccountId`: Bank account ID
  - `filters`: { limit, daysOutstanding, minAmount }
- **Returns**: Array of outstanding cheques
- **Includes**:
  - Cheque number and amount
  - Payee name
  - Issue date and days outstanding
  - Current status
- **Example**:
  ```javascript
  const outstanding = await ChequeManagementService.getOutstandingCheques(
    'BANK_001',
    { daysOutstanding: 30 }
  );
  // Returns: cheques outstanding 30+ days
  ```

##### `getChequeHistory(bankAccountId, filters)`
- **Purpose**: Get cheque history for account
- **Parameters**:
  - `bankAccountId`: Bank account ID
  - `filters`: { limit, fromDate, toDate, status }
  - `status`: Issued, Cleared, Bounced
- **Returns**: Array of cheque records
- **Example**:
  ```javascript
  const history = await ChequeManagementService.getChequeHistory('BANK_001', {
    status: 'Cleared',
    limit: 100
  });
  // Returns: last 100 cleared cheques
  ```

##### `getBouncedCheques(filters)`
- **Purpose**: Get all bounced cheques
- **Parameters**:
  - `filters`: { limit, fromDate, toDate, bankAccountId }
- **Returns**: Array of bounced cheques with bounce details
- **Bounce Info**:
  - Bounce date and reason
  - Bounce charges
  - Original and bounce amounts
  - Bounce status
- **Example**:
  ```javascript
  const bounced = await ChequeManagementService.getBouncedCheques({
    fromDate: '2024-01-01',
    toDate: '2024-12-31'
  });
  // Returns: all bounced cheques in period
  ```

##### `getChequeStatistics(bankAccountId, filters)`
- **Purpose**: Get cheque statistics
- **Parameters**:
  - `bankAccountId`: Bank account ID
  - `filters`: { fromDate, toDate }
- **Returns**: Statistical analysis of cheques
- **Statistics Include**:
  - Total, issued, cleared, bounced counts
  - Total amounts by status
  - Bounce rate and charges
  - Average clearing time
  - Clearance rate
- **Example**:
  ```javascript
  const stats = await ChequeManagementService.getChequeStatistics('BANK_001', {
    fromDate: '2024-01-01',
    toDate: '2024-12-31'
  });
  // Returns: 150 total, 2% bounce rate, 7.2 day avg clearing
  ```

##### `reissueBouncedCheque(originalChequeId, reissueData)`
- **Purpose**: Reissue a bounced cheque
- **Parameters**:
  - `originalChequeId`: Original bounced cheque ID
  - `reissueData`: { newAmount, description }
- **Returns**: New cheque record linked to original
- **Features**:
  - Original cheque marked as bounced
  - New cheque issued with new amount
  - GL reversal for original + new entry
  - Linked audit trail
- **Example**:
  ```javascript
  const reissued = await ChequeManagementService.reissueBouncedCheque(
    'CHEQUE_001',
    { newAmount: 50000, description: 'Reissued due to bounce' }
  );
  // Returns: new cheque with GL entries for both reversal and new issue
  ```

---

## Complete Usage Example

### Scenario: Complete Payment Processing Workflow

```javascript
import {
  PaymentService,
  BankReconciliationService,
  PaymentGatewayService,
  ChequeManagementService
} from './services/index.js';

// 1. Create payment to vendor
const payment = await PaymentService.createPayment({
  payeeId: 'VEN_001',
  payeeType: 'Vendor',
  amount: 50000,
  paymentMethod: 'BankTransfer',
  invoices: ['INV_001', 'INV_002']
});

// 2. Allocate payment to invoices
await PaymentService.allocatePaymentToInvoices(payment.paymentId, [
  { invoiceId: 'INV_001', allocatedAmount: 30000 },
  { invoiceId: 'INV_002', allocatedAmount: 20000 }
]);

// 3. Process payment through gateway
const transfer = await PaymentGatewayService.processBankTransfer({
  bankName: 'State Bank',
  accountNumber: '123456789',
  accountHolderName: 'Vendor Inc',
  amount: 50000,
  transferType: 'NEFT'
});

// 4. Process payment in system
await PaymentService.processPayment(payment.paymentId, {
  approvedBy: 'USER_MANAGER_001',
  accountNumber: '123456789',
  bankCode: 'BANK001'
});

// 5. Later - Upload bank statement for reconciliation
const statement = await BankReconciliationService.uploadBankStatement({
  bankAccountId: 'BANK_001',
  statementDate: '2024-03-31',
  openingBalance: 100000,
  closingBalance: 150000,
  transactions: [
    { date: '2024-03-15', description: 'NEFT Transfer', amount: 50000 }
  ]
});

// 6. Match transactions
await BankReconciliationService.matchBankTransactions(statement.statementId, [
  { bankTxnId: 'TXN_001', glEntryId: 'JE_001', amount: 50000 }
]);

// 7. Get any differences
const diffs = await BankReconciliationService.getReconciliationDifferences(statement.statementId);

// 8. Reconcile statement
await BankReconciliationService.reconcileStatement(statement.statementId, {
  approvedBy: 'USER_ACCT_001',
  notes: 'Monthly reconciliation completed'
});

// 9. Alternative - Issue cheque
const cheque = await ChequeManagementService.issueCheque({
  bankAccountId: 'BANK_002',
  payeeName: 'Vendor B',
  amount: 25000,
  chequeDate: '2024-03-15'
});

// 10. Track cheque clearing
await ChequeManagementService.clearCheque(cheque.chequeId, {
  clearedDate: '2024-03-20',
  clearingAmount: 25000,
  bankRef: 'CLR_20240320_001'
});

// 11. Handle cheque bounce if needed
await ChequeManagementService.recordChequeBounce(cheque.chequeId, {
  bounceDate: '2024-03-22',
  bounceReason: 'InsufficientFunds',
  bounceCharges: 500
});

// 12. Reissue cheque
const reissued = await ChequeManagementService.reissueBouncedCheque(
  cheque.chequeId,
  { newAmount: 25000 }
);

// 13. Get payment summary
const summary = await PaymentService.getPaymentSummary({
  fromDate: '2024-03-01',
  toDate: '2024-03-31'
});

// 14. Get reconciliation report
const report = await BankReconciliationService.generateReconciliationReport(
  'BANK_001',
  { fromDate: '2024-03-01', toDate: '2024-03-31' }
);

// 15. Get cheque statistics
const stats = await ChequeManagementService.getChequeStatistics('BANK_001', {
  fromDate: '2024-03-01',
  toDate: '2024-03-31'
});
```

---

## Integration Points

### With Other Modules

**Accounting Module**:
- GL entries for payments, reversals, and adjustments
- Journal entries for bank reconciliation
- Financial statement impact

**Purchasing Module**:
- Payment against purchase invoices
- Vendor payment tracking
- PO-to-payment workflow

**Sales Module**:
- Customer payment receipts
- Deposit applications
- Refund processing

**Customers Module**:
- Customer payment allocation
- Credit adjustment

**Masters Module**:
- Bank master data
- Payment method configuration
- Tax calculation for charges

**Activity Module**:
- Payment audit trail
- Cancellation/reversal history
- Reconciliation changes tracking

---

## Payment Methods Supported

### Direct Payments
- **Bank Transfer**: NEFT, RTGS, IMPS, ACH, EFT
- **Cheques**: Physical cheques with clearing tracking
- **Cards**: Visa, Mastercard, Amex
- **Digital Wallets**: ApplePay, GooglePay, PayPal

### Features by Method
| Method | Authorization | Settlement | Reversal | Status Tracking |
|--------|---|---|---|---|
| Bank Transfer | Instant | 1-2 days | Yes | Automatic |
| Cheque | On Issue | 3-7 days | On Bounce | Manual |
| Card | Instant | Next day | Refund | Real-time |
| Wallet | Instant | Instant | Refund | Real-time |

---

## Reconciliation Process

### Monthly Reconciliation Workflow
1. **Upload** bank statement
2. **Match** transactions against GL entries
3. **Identify** differences (outstanding checks, deposits in transit)
4. **Analyze** variances (errors, timing issues)
5. **Apply** adjustments (interest, charges)
6. **Reconcile** with zero variance
7. **Report** completion status

---

## Configuration

### Payment Thresholds
- Maximum single payment amount
- Minimum payment amount
- Approval authority by amount
- Currency limitations

### Bank Accounts
- Multiple account support
- Account-specific payment methods
- Currency per account
- Reconciliation frequency rules

### Cheque Management
- Cheque number sequence
- Clearing time expectations
- Bounce handling procedures
- Reissue policies

---

## Error Handling

All services implement standardized error handling:

```javascript
try {
  const payment = await PaymentService.processPayment('PAY_001', processingData);
} catch (error) {
  // Status codes: 400 (bad request), 404 (not found), 500 (server error)
  // All errors logged with context
}
```

---

## Security Considerations

- **Card Data**: PCI DSS compliance (never store full card data)
- **Bank Details**: Encrypted storage and transmission
- **Payment Authorization**: Multi-level approval workflow
- **Audit Trail**: Complete payment lifecycle tracking
- **Reconciliation**: User accountability on all adjustments
- **Refunds**: Audit trail of reversals with approvals

---

## Next Steps

1. **Implement Controllers**: REST endpoints for payment operations
2. **Add Validators**: Parameter validation and business rule checks
3. **Create Middleware**: Authentication and authorization
4. **Setup Routes**: Define payment API endpoints
5. **Integrate Gateways**: Connect to actual payment processors
6. **Bank Integration**: Connect to bank statement feeds
7. **Add Testing**: Unit and integration tests
8. **Create Dashboards**: Payment and reconciliation dashboards
9. **Schedule Jobs**: Automated reconciliation and bank fetching
10. **Setup Alerts**: Bounce notifications and outstanding alerts
