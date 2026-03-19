import React from 'react';

// Lazy load all report components
// Sales Reports
const SalesInvoiceReport = React.lazy(() =>
  import('../components/reports/sales/SalesInvoiceReport')
);
const SalesOrderReport = React.lazy(() =>
  import('../components/reports/sales/SalesOrderReport')
);
const DeliveryNoteReport = React.lazy(() =>
  import('../components/reports/sales/DeliveryNoteReport')
);
const SalesSummary = React.lazy(() =>
  import('../components/reports/sales/SalesSummary')
);
const CustomerSalesReport = React.lazy(() =>
  import('../components/reports/sales/CustomerSalesReport')
);
const ProductSalesReport = React.lazy(() =>
  import('../components/reports/sales/ProductSalesReport')
);
const SalesReturnReport = React.lazy(() =>
  import('../components/reports/sales/SalesReturnReport')
);
const RefundSummary = React.lazy(() =>
  import('../components/reports/sales/RefundSummary')
);

// Inventory Reports
const StockSummary = React.lazy(() =>
  import('../components/reports/inventory/StockSummary')
);
const LowStockItems = React.lazy(() =>
  import('../components/reports/inventory/LowStockItems')
);
const StockAging = React.lazy(() =>
  import('../components/reports/inventory/StockAging')
);
const GoodsReceiptReport = React.lazy(() =>
  import('../components/reports/inventory/GoodsReceiptReport')
);
const GoodsReturnReport = React.lazy(() =>
  import('../components/reports/inventory/GoodsReturnReport')
);
const InventoryAdjustReport = React.lazy(() =>
  import('../components/reports/inventory/InventoryAdjustReport')
);
const VendorPurchaseReport = React.lazy(() =>
  import('../components/reports/inventory/VendorPurchaseReport')
);
const PurchaseAnalysis = React.lazy(() =>
  import('../components/reports/inventory/PurchaseAnalysis')
);

// Accounts Reports
const GeneralLedger = React.lazy(() =>
  import('../components/reports/accounts/GeneralLedger')
);
const SubsidiaryLedger = React.lazy(() =>
  import('../components/reports/accounts/SubsidiaryLedger')
);
const DayBook = React.lazy(() =>
  import('../components/reports/accounts/DayBook')
);
const TrialBalance = React.lazy(() =>
  import('../components/reports/accounts/TrialBalance')
);
const ProfitLoss = React.lazy(() =>
  import('../components/reports/accounts/ProfitLoss')
);
const BalanceSheet = React.lazy(() =>
  import('../components/reports/accounts/BalanceSheet')
);
const PaymentVouchersReport = React.lazy(() =>
  import('../components/reports/accounts/PaymentVouchersReport')
);
const ReceiptVouchersReport = React.lazy(() =>
  import('../components/reports/accounts/ReceiptVouchersReport')
);
const JournalEntriesReport = React.lazy(() =>
  import('../components/reports/accounts/JournalEntriesReport')
);

// Report routes configuration
export const reportRoutes = [
  // Sales Reports
  { path: 'sales-reports/sales-invoice', component: SalesInvoiceReport },
  { path: 'sales-reports/sales-order', component: SalesOrderReport },
  { path: 'sales-reports/delivery-note', component: DeliveryNoteReport },
  { path: 'sales-reports/sales-summary', component: SalesSummary },
  { path: 'sales-reports/customer-sales', component: CustomerSalesReport },
  { path: 'sales-reports/product-sales', component: ProductSalesReport },
  { path: 'sales-reports/sales-return', component: SalesReturnReport },
  { path: 'sales-reports/refund-summary', component: RefundSummary },

  // Inventory Reports
  { path: 'inventory-reports/stock-summary', component: StockSummary },
  { path: 'inventory-reports/low-stock', component: LowStockItems },
  { path: 'inventory-reports/stock-aging', component: StockAging },
  { path: 'inventory-reports/grn-report', component: GoodsReceiptReport },
  { path: 'inventory-reports/grv-report', component: GoodsReturnReport },
  { path: 'inventory-reports/inventory-adjust', component: InventoryAdjustReport },
  { path: 'inventory-reports/vendor-purchase', component: VendorPurchaseReport },
  { path: 'inventory-reports/purchase-analysis', component: PurchaseAnalysis },

  // Accounts Reports
  { path: 'accounts-reports/general-ledger', component: GeneralLedger },
  { path: 'accounts-reports/subsidiary-ledger', component: SubsidiaryLedger },
  { path: 'accounts-reports/day-book', component: DayBook },
  { path: 'accounts-reports/trial-balance', component: TrialBalance },
  { path: 'accounts-reports/profit-loss', component: ProfitLoss },
  { path: 'accounts-reports/balance-sheet', component: BalanceSheet },
  { path: 'accounts-reports/payment-vouchers', component: PaymentVouchersReport },
  { path: 'accounts-reports/receipt-vouchers', component: ReceiptVouchersReport },
  { path: 'accounts-reports/journal-entries', component: JournalEntriesReport },
];

// Map report IDs to route paths
export const reportIdToPath = {
  // Sales Reports
  'SalesInvoiceReport': 'sales-reports/sales-invoice',
  'SalesOrderReport': 'sales-reports/sales-order',
  'DeliveryNoteReport': 'sales-reports/delivery-note',
  'SalesSummary': 'sales-reports/sales-summary',
  'CustomerSalesReport': 'sales-reports/customer-sales',
  'ProductSalesReport': 'sales-reports/product-sales',
  'SalesReturnReport': 'sales-reports/sales-return',
  'RefundSummary': 'sales-reports/refund-summary',

  // Inventory Reports
  'StockSummary': 'inventory-reports/stock-summary',
  'LowStockItems': 'inventory-reports/low-stock',
  'StockAging': 'inventory-reports/stock-aging',
  'GoodsReceiptReport': 'inventory-reports/grn-report',
  'GoodsReturnReport': 'inventory-reports/grv-report',
  'InventoryAdjustReport': 'inventory-reports/inventory-adjust',
  'VendorPurchaseReport': 'inventory-reports/vendor-purchase',
  'PurchaseAnalysis': 'inventory-reports/purchase-analysis',

  // Accounts Reports
  'GeneralLedger': 'accounts-reports/general-ledger',
  'SubsidiaryLedger': 'accounts-reports/subsidiary-ledger',
  'DayBook': 'accounts-reports/day-book',
  'TrialBalance': 'accounts-reports/trial-balance',
  'ProfitLoss': 'accounts-reports/profit-loss',
  'BalanceSheet': 'accounts-reports/balance-sheet',
  'PaymentVouchersReport': 'accounts-reports/payment-vouchers',
  'ReceiptVouchersReport': 'accounts-reports/receipt-vouchers',
  'JournalEntriesReport': 'accounts-reports/journal-entries',
};


