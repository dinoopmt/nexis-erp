// Central export point for all components
// This enables cleaner imports throughout the application

// Shared Components
export { default as Header } from './shared/Header';
export { default as Footer } from './shared/Footer';

// Dashboard Components
export { default as InventoryDashboard } from './dashboard/InventoryDashboard';

// Sales Components
export { default as SalesInvoice } from './sales/SalesInvoice';
export { default as SalesOrder } from './sales/SalesOrder';
export { default as SalesReturn } from './sales/SalesReturn';
export { default as DeliveryNote } from './sales/DeliveryNote';
export { default as Quotation } from './sales/Quotation';
export { default as Customers } from './sales/Customers';

// Inventory Components
export { default as GrnForm } from './inventory/GrnForm';
export { default as GrvForm } from './inventory/GrvForm';
export { default as InventoryAdjust } from './inventory/InventoryAdjust';
export { default as StockTracking } from './inventory/StockTracking';
export { default as Vendors } from './inventory/Vendors';

// Product Components
export { default as Product } from './product/Product';
export { default as Grouping } from './product/Grouping';
export { default as Promotion } from './product/Promotion';

// Accounts Components
export { default as ChartOfAccounts } from './accounts/ChartOfAccounts';
export { default as Journal } from './accounts/Journal';
export { default as Payment } from './accounts/Payment';
export { default as Receipt } from './accounts/Receipt';
export { default as Contra } from './accounts/Contra';
export { default as VendorPayments } from './accounts/VendorPayments';
export { default as CustomerReceipts } from './accounts/CustomerReceipts';
export { default as AccountSettings } from './accounts/AccountSettings';

// Reports Components
export { default as StockVarianceReport } from './reports/StockVarianceReport';

// Settings Components
export { default as GeneralSettings } from './settings/GeneralSettings';
export { default as CompanySettings } from './settings/CompanySettings';

// Menu Components
export { default as Dashboard } from './menu/DashBorad';


