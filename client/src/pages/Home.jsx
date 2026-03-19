import React, { useState, useEffect, Suspense } from "react";
import { useNavigate, Routes, Route, useLocation } from "react-router-dom";

import Dashboard from "../components/menu/DashBorad";

import Product from "../components/product/Product";
import Grouping from "../components/product/Grouping";
import Promotion from "../components/product/Promotion";
import GrnForm from "../components/inventory/GrnForm";
import RtvForm from "../components/inventory/RtvForm";
import InventoryAdjust from "../components/inventory/InventoryAdjust";
import StockTracking from "../components/inventory/StockTracking";

import GeneralSettings from "../components/settings/GeneralSettings";
import CompanySettings from "../components/settings/CompanySettings";

import Payment from "../components/accounts/Payment";

import Receipt from "../components/accounts/Receipt";
import Contra from "../components/accounts/Contra";
import Journal from "../components/accounts/Journal";
import Accountsettings from "../components/accounts/AccountSettings";
import ChartOfAccounts from "../components/accounts/ChartOfAccounts";
import VendorPayments from "../components/accounts/VendorPayments";
import CustomerReceipts from "../components/accounts/CustomerReceipts";

import SalesOrder from "../components/sales/SalesOrder";
import SalesInvoice from "../components/sales/SalesInvoice";
import DeliveryNote from "../components/sales/DeliveryNote";
import SalesReturn from "../components/sales/SalesReturn";
import Quotation from "../components/sales/Quotation";
import Customers from "../components/sales/Customers";
import Vendors from "../components/inventory/Vendors";
import Purchaseorder from "../components/inventory/PurchaseOrder";
import StockVarianceReport from "../components/reports/StockVarianceReport";

import { FaChartBar } from "react-icons/fa";
import { GiCash } from "react-icons/gi";
import Header from "../components/shared/Header";
import {
  ShoppingCart,
  Users,
  Package,
  Warehouse,
  FileText,
  Settings,
  ChevronDown,
} from "lucide-react";

import { reportRoutes } from "../config/reportsRoutes";

// Loading component
const LoadingFallback = () => (
  <div className="flex items-center justify-center h-full">
    <div className="text-center">
      <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mb-4"></div>
      <p className="text-gray-600">Loading...</p>
    </div>
  </div>
);

const menus = [
  {
    name: "Dashboard",
    icon: FaChartBar,
    type: "item",
    path: "/",
  },
  {
    name: "Sales & Distribution",
    icon: ShoppingCart,
    type: "group",
    children: [
      { name: "Quotation", id: "Quotation", path: "/quotation" },
      { name: "Sales Order", id: "SalesOrder", path: "/sales-order" },
      { name: "Sales Invoice", id: "SalesInvoice", path: "/sales-invoice" },
      { name: "Delivery Note", id: "DeliveryNote", path: "/delivery-note" },
      { name: "Sales Return", id: "SalesReturn", path: "/sales-return" },
      { name: "Customers", id: "Customers", path: "/customers" },
    ],
  },

  {
    name: "Item Master",
    icon: Package,
    type: "group",
    children: [
      { name: "Product", id: "Product", path: "/product" },
      { name: "Grouping", id: "Grouping", path: "/grouping" },
      { name: "Promotion", id: "Promotion", path: "/promotion" },
    ],
  },
  {
    name: "Inventory",
    icon: Warehouse,
    type: "group",
    children: [
      { name: "Vendors", id: "Vendors", path: "/vendors" },
      { name: "Purchase Order", id: "PurchaseOrder", path: "/purchase-order" },
      
      { name: "Goods Receipt ", id: "GrnForm", path: "/grn-form" },
      { name: "Goods Return ", id: "RtvForm", path: "/rtv-form" },
      {
        name: "Inventory Adjustments",
        id: "InventoryAdjust",
        path: "/inventory-adjust",
      },
      { name: "Stock Tracking", id: "StockTracking", path: "/stock-tracking" },
      { name: "Stock Variance Report", id: "StockVarianceReport", path: "/stock-variance" },
    ],
  },
  {
    name: "Accounts",
    icon: GiCash,
    type: "group",
    children: [
      { name: "Payment Vouchers", id: "Payment", path: "/payment" },
      { name: "Receipt Vouchers", id: "Receipt", path: "/receipt" },
      {
        name: "Vendor Payments",
        id: "VendorPayments",
        path: "/vendor-payments",
      },
      {
        name: "Customer Receipts",
        id: "CustomerReceipts",
        path: "/customer-receipts",
      },
      { name: "Contra Entries", id: "Contra", path: "/contra" },
      { name: "Journal Entries", id: "Journal", path: "/journal" },
      {
        name: "Chart of Accounts",
        id: "ChartOfAccounts",
        path: "/chart-of-accounts",
      },
      {
        name: "Accounts Settings",
        id: "AccountSettings",
        path: "/account-settings",
      },
    ],
  },

  {
    name: "Reports",
    icon: FileText,
    type: "group",
    children: [
      {
        name: "Sales Reports",
        type: "submenu",
        children: [
          {
            name: "Daily Reports",
            children: [
              {
                name: "Sales Invoice",
                id: "SalesInvoiceReport",
                path: "/reports/sales-reports/sales-invoice",
              },
              {
                name: "Sales Order",
                id: "SalesOrderReport",
                path: "/reports/sales-reports/sales-order",
              },
              {
                name: "Delivery Note",
                id: "DeliveryNoteReport",
                path: "/reports/sales-reports/delivery-note",
              },
            ],
          },
          {
            name: "Monthly Reports",
            children: [
              {
                name: "Sales Summary",
                id: "SalesSummary",
                path: "/reports/sales-reports/sales-summary",
              },
              {
                name: "Customer-wise Sales",
                id: "CustomerSalesReport",
                path: "/reports/sales-reports/customer-sales",
              },
              {
                name: "Product-wise Sales",
                id: "ProductSalesReport",
                path: "/reports/sales-reports/product-sales",
              },
            ],
          },
          {
            name: "Return & Refunds",
            children: [
              {
                name: "Sales Return ",
                id: "SalesReturnReport",
                path: "/reports/sales-reports/sales-return",
              },
              {
                name: "Refund Summary",
                id: "RefundSummary",
                path: "/reports/sales-reports/refund-summary",
              },
            ],
          },
        ],
      },
      {
        name: "Inventory Reports",
        type: "submenu",
        children: [
          {
            name: "Stock Reports",
            children: [
              {
                name: "Stock Summary",
                id: "StockSummary",
                path: "/reports/inventory-reports/stock-summary",
              },
              {
                name: "Low Stock Items",
                id: "LowStockItems",
                path: "/reports/inventory-reports/low-stock",
              },
              {
                name: "Stock Aging",
                id: "StockAging",
                path: "/reports/inventory-reports/stock-aging",
              },
            ],
          },
          {
            name: "Movement Reports",
            children: [
              {
                name: "Goods Receipt ",
                id: "GoodsReceiptReport",
                path: "/reports/inventory-reports/grn-report",
              },
              {
                name: "Goods Return ",
                id: "GoodsReturnReport",
                path: "/reports/inventory-reports/grv-report",
              },
              {
                name: "Inventory Adjustments",
                id: "InventoryAdjustReport",
                path: "/reports/inventory-reports/inventory-adjust",
              },
            ],
          },
          {
            name: "Supplier Reports",
            children: [
              {
                name: "Vendor-wise Purchases",
                id: "VendorPurchaseReport",
                path: "/reports/inventory-reports/vendor-purchase",
              },
              {
                name: "Purchase Analysis",
                id: "PurchaseAnalysis",
                path: "/reports/inventory-reports/purchase-analysis",
              },
            ],
          },
        ],
      },
      {
        name: "Accounts Reports",
        type: "submenu",
        children: [
          {
            name: "Ledger Reports",
            children: [
              {
                name: "General Ledger",
                id: "GeneralLedger",
                path: "/reports/accounts-reports/general-ledger",
              },
              {
                name: "Subsidiary Ledger",
                id: "SubsidiaryLedger",
                path: "/reports/accounts-reports/subsidiary-ledger",
              },
              {
                name: "Day Book",
                id: "DayBook",
                path: "/reports/accounts-reports/day-book",
              },
            ],
          },
          {
            name: "Financial Reports",
            children: [
              {
                name: "Trial Balance",
                id: "TrialBalance",
                path: "/reports/accounts-reports/trial-balance",
              },
              {
                name: "Profit & Loss",
                id: "ProfitLoss",
                path: "/reports/accounts-reports/profit-loss",
              },
              {
                name: "Balance Sheet",
                id: "BalanceSheet",
                path: "/reports/accounts-reports/balance-sheet",
              },
            ],
          },
          {
            name: "Voucher Reports",
            children: [
              {
                name: "Payment Vouchers",
                id: "PaymentVouchersReport",
                path: "/reports/accounts-reports/payment-vouchers",
              },
              {
                name: "Receipt Vouchers",
                id: "ReceiptVouchersReport",
                path: "/reports/accounts-reports/receipt-vouchers",
              },
              {
                name: "Journal Entries",
                id: "JournalEntriesReport",
                path: "/reports/accounts-reports/journal-entries",
              },
            ],
          },
        ],
      },
    ],
  },

  {
    name: "Settings",
    icon: Settings,
    type: "group",
    children: [
      {
        name: "General Settings",
        id: "GeneralSettings",
        path: "/general-settings",
      },
      {
        name: "Company Settings",
        id: "CompanySettings",
        path: "/company-settings",
      },
    ],
  },
];

function Home() {
  const navigate = useNavigate();
  const location = useLocation();
  const [expandedMenus, setExpandedMenus] = useState({});
  const [expandedSubmenus, setExpandedSubmenus] = useState({});
  const [availableHeight, setAvailableHeight] = useState(
    window.innerHeight - 80,
  );

  const toggleExpand = (menuName) => {
    setExpandedMenus((prev) => ({
      ...prev,
      [menuName]: !prev[menuName],
    }));
  };

  const toggleExpandSubmenu = (submenuName) => {
    setExpandedSubmenus((prev) => ({
      ...prev,
      [submenuName]: !prev[submenuName],
    }));
  };

  useEffect(() => {
    // Check if user is authenticated
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
    }
  }, [navigate]);

  useEffect(() => {
    // Calculate available height based on screen resolution
    const calculateHeight = () => {
      const headerHeight = 80;
      const calculatedHeight = window.innerHeight - headerHeight;
      setAvailableHeight(calculatedHeight);
    };

    calculateHeight();
    window.addEventListener("resize", calculateHeight);
    return () => window.removeEventListener("resize", calculateHeight);
  }, []);

  // Determine active menu based on current location
  const getActiveMenuFromPath = () => {
    const path = location.pathname;
    if (path === "/") return "Dashboard";

    // Search through all menus to find matching item
    for (const menu of menus) {
      if (menu.type === "group" && menu.children) {
        for (const child of menu.children) {
          if (child.path === path) {
            return child.name;
          }
          // Check nested children for reports
          if (child.children && Array.isArray(child.children)) {
            for (const grandchild of child.children) {
              if (grandchild.children && Array.isArray(grandchild.children)) {
                for (const item of grandchild.children) {
                  if (item.path === path) {
                    return item.name;
                  }
                }
              }
            }
          }
        }
      }
    }
    return "Dashboard";
  };

  const activeMenu = getActiveMenuFromPath();
  // ui Section Code Starts here
  return (
    <>
      <Header />

      <section
        className="bg-white flex overflow-hidden"
        style={{ height: `${availableHeight}px` }}
      >
        {/* LEFT SIDEBAR */}
        <div className="w-48 lg:w-60 bg-gray-900 text-white flex flex-col overflow-hidden">
          {/* Menu Section */}
          <div className="flex-1 p-2 space-y-1 overflow-y-auto">
            {menus.map((menu) => {
              const Icon = menu.icon;
              const isExpanded = expandedMenus[menu.name];
              const isGroup = menu.type === "group";

              return (
                <div key={menu.name}>
                  <button
                    onClick={() => {
                      if (isGroup) {
                        toggleExpand(menu.name);
                      } else if (menu.path) {
                        navigate(menu.path);
                      }
                    }}
                    className={`
                      w-full flex items-center gap-3 px-4 py-3 rounded-lg transition text-xs lg:text-sm
                      ${
                        activeMenu === menu.name && !isGroup
                          ? "bg-green-600"
                          : "hover:bg-gray-800"
                      }
                    `}
                  >
                    <Icon size={20} className="flex-shrink-0" />
                    <span className="font-medium hidden lg:inline flex-1 text-left">
                      {menu.name}
                    </span>
                    {isGroup && (
                      <ChevronDown
                        size={18}
                        className={`flex-shrink-0 transition-transform ${
                          isExpanded ? "rotate-180" : ""
                        }`}
                      />
                    )}
                  </button>

                  {/* Submenu Items */}
                  {isGroup && isExpanded && menu.children && (
                    <div className="ml-6 space-y-1 mt-1">
                      {menu.children.map((child) => {
                        const isSubmenu = child.type === "submenu";
                        const submenuKey = `${menu.name}-${child.name}`;
                        const isSubmenuExpanded = expandedSubmenus[submenuKey];

                        return (
                          <div key={submenuKey}>
                            {/* Level 2: Subgroup */}
                            <button
                              onClick={() => {
                                if (isSubmenu) {
                                  toggleExpandSubmenu(submenuKey);
                                } else if (child.path) {
                                  navigate(child.path);
                                }
                              }}
                              className={`
                                w-full text-left flex items-center gap-2 px-3 py-2 rounded text-xs transition
                                ${
                                  activeMenu === child.name && !isSubmenu
                                    ? "bg-green-600 text-white"
                                    : "text-gray-300 hover:bg-gray-800"
                                }
                              `}
                            >
                              <span>▸ {child.name}</span>
                              {isSubmenu && (
                                <ChevronDown
                                  size={14}
                                  className={`ml-auto flex-shrink-0 transition-transform ${
                                    isSubmenuExpanded ? "rotate-180" : ""
                                  }`}
                                />
                              )}
                            </button>

                            {/* Level 3: Children */}
                            {isSubmenu &&
                              isSubmenuExpanded &&
                              child.children && (
                                <div className="ml-6 space-y-1 mt-1">
                                  {child.children.map((grandchild) => (
                                    <div key={grandchild.name}>
                                      {/* Category header */}
                                      <p className="px-3 py-1 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                                        {grandchild.name}
                                      </p>
                                      {/* Items under category */}
                                      {grandchild.children && (
                                        <div className="space-y-0.5">
                                          {grandchild.children.map((item) => (
                                            <button
                                              key={item.id}
                                              onClick={() => {
                                                if (item.path) {
                                                  navigate(item.path);
                                                }
                                              }}
                                              className={`
                                              w-full text-left px-4 py-1.5 rounded text-xs transition
                                              ${
                                                activeMenu === item.name
                                                  ? "bg-green-600 text-white"
                                                  : "text-gray-400 hover:bg-gray-800 hover:text-gray-200"
                                              }
                                            `}
                                            >
                                              └─ {item.name}
                                            </button>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Support Section - Bottom */}
          <div className="flex-shrink-0 border-t border-gray-700 p-3 space-y-2 flex flex-col justify-end">
            <div>
              <h3 className="text-center text-sm font-semibold text-blue-400">
                alarabcomputersllc.com
              </h3>

              <p className="text-center text-xs text-blue-300 font-medium">
                Support +971 55 450 7149
              </p>
            </div>
          </div>
        </div>

        {/* RIGHT CONTENT */}
        <div className="flex-1 bg-gray-100 overflow-y-auto relative">
          <Routes>
            {/* Dashboard */}
            <Route path="/" element={<Dashboard />} />

            {/* Sales & Distribution */}
            <Route path="/quotation" element={<Quotation />} />
            <Route path="/sales-order" element={<SalesOrder />} />
            <Route path="/sales-invoice" element={<SalesInvoice />} />
            <Route path="/delivery-note" element={<DeliveryNote />} />
            <Route path="/sales-return" element={<SalesReturn />} />
            <Route path="/customers" element={<Customers />} />

            {/* Item Master */}
            <Route path="/product" element={<Product />} />
            <Route path="/grouping" element={<Grouping />} />
            <Route path="/promotion" element={<Promotion />} />

            {/* Inventory */}
            <Route path="/purchase-order" element={<Purchaseorder />} />
            <Route path="/vendors" element={<Vendors />} />
            <Route path="/grn-form" element={<GrnForm />} />
            <Route path="/rtv-form" element={<RtvForm />} />
            <Route path="/inventory-adjust" element={<InventoryAdjust />} />
            <Route path="/stock-tracking" element={<StockTracking />} />
            <Route path="/stock-variance" element={<StockVarianceReport />} />

            {/* Accounts */}
            <Route path="/payment" element={<Payment />} />
            <Route path="/receipt" element={<Receipt />} />
            <Route path="/vendor-payments" element={<VendorPayments />} />
            <Route path="/customer-receipts" element={<CustomerReceipts />} />
            <Route path="/contra" element={<Contra />} />
            <Route path="/journal" element={<Journal />} />
            <Route path="/chart-of-accounts" element={<ChartOfAccounts />} />
            <Route path="/account-settings" element={<Accountsettings />} />

            {/* Settings */}
            <Route path="/general-settings" element={<GeneralSettings />} />
            <Route path="/company-settings" element={<CompanySettings />} />

            {/* Report routes - lazy loaded */}
            {reportRoutes.map((route) => (
              <Route
                key={route.path}
                path={`/reports/${route.path}`}
                element={
                  <Suspense fallback={<LoadingFallback />}>
                    <route.component />
                  </Suspense>
                }
              />
            ))}
          </Routes>
        </div>
      </section>
    </>
  );
}

export default Home;


