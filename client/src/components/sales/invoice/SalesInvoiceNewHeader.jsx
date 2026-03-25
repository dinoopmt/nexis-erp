/**
 * SalesInvoiceNewHeader Component
 * Header section: Invoice info, History/Lookup buttons, Customer selection, Save/Print buttons
 */

import React, { useRef, useEffect } from "react";
import { Clock, Package, User, Save, Printer } from "lucide-react";

const SalesInvoiceNewHeader = ({
  invoiceData,
  selectedCustomerDetails,
  customers,
  customerSearch,
  showCustomerDropdown,
  loading,
  onCustomerSearchChange,
  onCustomerDropdownToggle,
  onSelectCustomer,
  onHistoryClick,
  onLookupClick,
  onSave,
  onPrint,
}) => {
  const customerDropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (customerDropdownRef.current && !customerDropdownRef.current.contains(event.target)) {
        onCustomerDropdownToggle(false);
      }
    };

    if (showCustomerDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showCustomerDropdown, onCustomerDropdownToggle]);

  const filteredCustomers = customers.filter(
    (c) =>
      c.name?.toLowerCase().includes(customerSearch.toLowerCase()) ||
      c.vendorName?.toLowerCase().includes(customerSearch.toLowerCase()) ||
      c.phone?.toLowerCase().includes(customerSearch.toLowerCase()) ||
      c.vendorPhone?.toLowerCase().includes(customerSearch.toLowerCase()) ||
      c.vendorTRN?.toLowerCase().includes(customerSearch.toLowerCase())
  );

  return (
    <div className="flex-shrink-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 shadow-lg z-10">
      <div className="flex justify-between gap-6">
        {/* Left: Invoice Info */}
        <div className="flex items-start gap-3">
          <div>
            <h1 className="text-lg font-bold">Sales Invoice</h1>
            <div className="bg-white/20 px-3 py-1.5 rounded-lg mt-2 inline-block">
              <span className="text-xs text-blue-200">Invoice #</span>
              <p className="font-bold text-xs">{invoiceData.invoiceNo}</p>
              <p className="font-bold text-xs text-blue-100">
                {invoiceData.invoiceDate}
              </p>
            </div>
          </div>
        </div>

        {/* Middle: Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={onHistoryClick}
            className="flex items-center gap-1.5 px-3 py-1 bg-white/10 hover:bg-white/20 border border-blue-400/50 rounded-lg text-white font-medium text-xs transition"
          >
            <Clock size={16} />
            History
          </button>
          <button
            onClick={onLookupClick}
            className="flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 border border-blue-400/50 rounded-lg text-white font-medium text-xs transition"
          >
            <Package size={16} />
            Lookup Product
          </button>
        </div>

        {/* Right: Customer & Save/Print */}
        <div className="flex items-start gap-6 flex-1 justify-end">
          <div className="flex flex-col gap-2 w-72">
            <div ref={customerDropdownRef} className="relative w-full h-10">
              <User
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-300 z-10"
              />
              <input
                type="text"
                placeholder="Select Party"
                value={
                  selectedCustomerDetails
                    ? selectedCustomerDetails.name || selectedCustomerDetails.vendorName
                    : customerSearch
                }
                onChange={(e) => {
                  onCustomerSearchChange(e.target.value);
                  onCustomerDropdownToggle(true);
                }}
                onFocus={() => {
                  if (!selectedCustomerDetails) {
                    onCustomerDropdownToggle(true);
                  }
                }}
                className="w-full h-full pl-10 pr-3 py-2 bg-white/10 border border-blue-400/50 rounded-lg text-white placeholder-blue-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
              {showCustomerDropdown && filteredCustomers.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white text-gray-800 rounded-lg shadow-lg z-20 max-h-48 overflow-y-auto">
                  {filteredCustomers.map((customer) => (
                    <div
                      key={customer._id}
                      onMouseDown={() => onSelectCustomer(customer._id)}
                      className="px-4 py-2.5 hover:bg-blue-50 cursor-pointer border-b last:border-b-0 text-xs"
                    >
                      <p className="font-medium text-gray-900">
                        {customer.name || customer.vendorName}
                      </p>
                      <p className="text-gray-500 text-xs">
                        {customer.phone || customer.vendorPhone}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              className="flex items-center gap-1.5 bg-green-600 text-white px-4 py-2.5 rounded text-xs font-semibold hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={onSave}
              disabled={loading}
            >
              <Save size={14} /> {loading ? "Saving..." : "Save"}
            </button>
            <button
              onClick={onPrint}
              disabled={loading}
              className="flex items-center gap-1.5 bg-purple-600 text-white px-3 py-2.5 rounded text-xs font-medium hover:bg-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Printer size={14} />
              {loading ? "Saving..." : "Save & Print"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SalesInvoiceNewHeader;
