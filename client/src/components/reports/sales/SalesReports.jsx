import React, { useState } from 'react'
import { Trash2, Plus, FileText } from 'lucide-react'

const SalesReports = () => {
  const [reportType, setReportType] = useState('sales-invoice')
  const [filters, setFilters] = useState([{ field: 'date', operator: 'equals', value: '' }])
  const [preview, setPreview] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const reportTypes = [
    { value: 'sales-invoice', label: 'Sales Invoice Report' },
    { value: 'sales-order', label: 'Sales Order Report' },
    { value: 'delivery-note', label: 'Delivery Note Report' },
    { value: 'sales-return', label: 'Sales Return Report' },
    { value: 'customer-payment', label: 'Customer Payment Report' },
  ]

  const filterFields = [
    { value: 'date', label: 'Date' },
    { value: 'customer', label: 'Customer' },
    { value: 'amount', label: 'Amount' },
    { value: 'status', label: 'Status' },
    { value: 'reference', label: 'Reference Number' },
  ]

  const operators = [
    { value: 'equals', label: 'Equals' },
    { value: 'contains', label: 'Contains' },
    { value: 'greater-than', label: 'Greater Than' },
    { value: 'less-than', label: 'Less Than' },
    { value: 'between', label: 'Between' },
  ]

  const addFilter = () => {
    setFilters([...filters, { field: 'date', operator: 'equals', value: '' }])
  }

  const removeFilter = (index) => {
    setFilters(filters.filter((_, i) => i !== index))
  }

  const updateFilter = (index, key, value) => {
    const updatedFilters = [...filters]
    updatedFilters[index][key] = value
    setFilters(updatedFilters)
  }

  // Sample data for different report types
  const generateSampleData = () => {
    const sampleDataByType = {
      'sales-invoice': {
        stats: {
          'Total Invoices': '24',
          'Total Amount': '$125,450.00',
          'Average Invoice': '$5,227.08',
          'Pending': '8',
        },
        data: [
          { 'Invoice #': 'INV-001', 'Customer': 'Acme Corp', 'Date': '2025-01-15', 'Amount': '$8,500.00', 'Status': 'Paid', 'Payment Date': '2025-01-20' },
          { 'Invoice #': 'INV-002', 'Customer': 'Tech Solutions', 'Date': '2025-01-16', 'Amount': '$4,250.50', 'Status': 'Pending', 'Payment Date': '-' },
          { 'Invoice #': 'INV-003', 'Customer': 'Global Trade Inc', 'Date': '2025-01-17', 'Amount': '$6,750.25', 'Status': 'Paid', 'Payment Date': '2025-01-25' },
          { 'Invoice #': 'INV-004', 'Customer': 'Business Partners Ltd', 'Date': '2025-01-18', 'Amount': '$5,100.00', 'Status': 'Pending', 'Payment Date': '-' },
          { 'Invoice #': 'INV-005', 'Customer': 'Industrial Co', 'Date': '2025-01-19', 'Amount': '$3,800.75', 'Status': 'Paid', 'Payment Date': '2025-01-28' },
          { 'Invoice #': 'INV-006', 'Customer': 'Digital Solutions', 'Date': '2025-01-20', 'Amount': '$7,200.00', 'Status': 'Pending', 'Payment Date': '-' },
        ],
      },
      'sales-order': {
        stats: {
          'Total Orders': '18',
          'Total Value': '$89,300.00',
          'Average Order': '$4,961.11',
          'Delivered': '14',
        },
        data: [
          { 'Order #': 'SO-001', 'Customer': 'Acme Corp', 'Date': '2025-01-10', 'Value': '$8,500.00', 'Status': 'Delivered', 'Delivery Date': '2025-01-15' },
          { 'Order #': 'SO-002', 'Customer': 'Tech Solutions', 'Date': '2025-01-11', 'Value': '$5,200.00', 'Status': 'In Transit', 'Delivery Date': '2025-01-22' },
          { 'Order #': 'SO-003', 'Customer': 'Global Trade Inc', 'Date': '2025-01-12', 'Value': '$6,500.00', 'Status': 'Delivered', 'Delivery Date': '2025-01-17' },
          { 'Order #': 'SO-004', 'Customer': 'Business Partners Ltd', 'Date': '2025-01-13', 'Value': '$4,800.00', 'Status': 'Pending', 'Delivery Date': '2025-01-25' },
          { 'Order #': 'SO-005', 'Customer': 'Industrial Co', 'Date': '2025-01-14', 'Value': '$7,100.00', 'Status': 'Delivered', 'Delivery Date': '2025-01-19' },
        ],
      },
      'delivery-note': {
        stats: {
          'Total Deliveries': '15',
          'Completed': '15',
          'Pending': '0',
          'Total Items': '127',
        },
        data: [
          { 'Delivery #': 'DN-001', 'Customer': 'Acme Corp', 'Date': '2025-01-15', 'Items': '8', 'Status': 'Completed', 'Signed By': 'John Smith' },
          { 'Delivery #': 'DN-002', 'Customer': 'Tech Solutions', 'Date': '2025-01-16', 'Items': '5', 'Status': 'Completed', 'Signed By': 'Jane Doe' },
          { 'Delivery #': 'DN-003', 'Customer': 'Global Trade Inc', 'Date': '2025-01-17', 'Items': '12', 'Status': 'Completed', 'Signed By': 'Mike Johnson' },
          { 'Delivery #': 'DN-004', 'Customer': 'Business Partners Ltd', 'Date': '2025-01-18', 'Items': '9', 'Status': 'Completed', 'Signed By': 'Sarah Wilson' },
          { 'Delivery #': 'DN-005', 'Customer': 'Industrial Co', 'Date': '2025-01-19', 'Items': '11', 'Status': 'Completed', 'Signed By': 'Robert Brown' },
        ],
      },
      'sales-return': {
        stats: {
          'Total Returns': '4',
          'Total Amount': '$12,450.00',
          'Average Return': '$3,112.50',
          'Pending Approval': '1',
        },
        data: [
          { 'Return #': 'RET-001', 'Customer': 'Acme Corp', 'Date': '2025-01-20', 'Amount': '$2,500.00', 'Reason': 'Defective Item', 'Status': 'Approved' },
          { 'Return #': 'RET-002', 'Customer': 'Tech Solutions', 'Date': '2025-01-21', 'Amount': '$3,800.00', 'Reason': 'Wrong Item', 'Status': 'Approved' },
          { 'Return #': 'RET-003', 'Customer': 'Global Trade Inc', 'Date': '2025-01-22', 'Amount': '$2,150.00', 'Reason': 'Damaged', 'Status': 'Pending' },
          { 'Return #': 'RET-004', 'Customer': 'Business Partners Ltd', 'Date': '2025-01-23', 'Amount': '$4,000.00', 'Reason': 'Quality Issue', 'Status': 'Approved' },
        ],
      },
      'customer-payment': {
        stats: {
          'Total Payments': '12',
          'Total Collected': '$98,750.00',
          'Average Payment': '$8,229.17',
          'Pending': '3',
        },
        data: [
          { 'Payment #': 'PAY-001', 'Customer': 'Acme Corp', 'Date': '2025-01-20', 'Amount': '$8,500.00', 'Method': 'Bank Transfer', 'Reference': 'TXN-12345' },
          { 'Payment #': 'PAY-002', 'Customer': 'Tech Solutions', 'Date': '2025-01-21', 'Amount': '$4,200.00', 'Method': 'Cheque', 'Reference': 'CHQ-789' },
          { 'Payment #': 'PAY-003', 'Customer': 'Global Trade Inc', 'Date': '2025-01-22', 'Amount': '$6,750.00', 'Method': 'Bank Transfer', 'Reference': 'TXN-12346' },
          { 'Payment #': 'PAY-004', 'Customer': 'Industrial Co', 'Date': '2025-01-23', 'Amount': '$7,650.00', 'Method': 'Credit Card', 'Reference': 'CC-001' },
          { 'Payment #': 'PAY-005', 'Customer': 'Digital Solutions', 'Date': '2025-01-24', 'Amount': '$5,200.00', 'Method': 'Bank Transfer', 'Reference': 'TXN-12347' },
        ],
      },
    }
    return sampleDataByType[reportType]
  }

  const generateReport = async () => {
    setLoading(true)
    setError('')
    try {
      // Simulate a short delay for better UX
      await new Promise(resolve => setTimeout(resolve, 800))
      
      const data = generateSampleData()
      if (data) {
        setPreview(data)
      } else {
        throw new Error('No data available for selected report type')
      }
    } catch (err) {
      setError(err.message || 'Error generating report')
      setPreview(null)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-3">
      {/* Header */}
      

      {/* Report Generator Card */}
      <div className="sticky top-6 z-40 bg-white rounded-lg shadow-md p-4 mb-4">
        {/* Report Type Selection */}
        <div className="mb-3">
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Report Type
          </label>
          <select
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
            className="w-full px-3 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {reportTypes.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        {/* Filter Conditions */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-xs font-medium text-gray-700">
              Filter Conditions
            </label>
            <button
              onClick={addFilter}
              className="flex items-center gap-1 px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition"
            >
              <Plus size={16} /> Add Filter
            </button>
          </div>

          <div className="space-y-2">
            {filters.map((filter, index) => (
              <div key={index} className="flex gap-2 items-end">
                {/* Field */}
                <select
                  value={filter.field}
                  onChange={(e) => updateFilter(index, 'field', e.target.value)}
                  className="flex-1 px-2 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs"
                >
                  {filterFields.map((field) => (
                    <option key={field.value} value={field.value}>
                      {field.label}
                    </option>
                  ))}
                </select>

                {/* Operator */}
                <select
                  value={filter.operator}
                  onChange={(e) => updateFilter(index, 'operator', e.target.value)}
                  className="flex-1 px-2 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs"
                >
                  {operators.map((op) => (
                    <option key={op.value} value={op.value}>
                      {op.label}
                    </option>
                  ))}
                </select>

                {/* Value */}
                <input
                  type="text"
                  value={filter.value}
                  onChange={(e) => updateFilter(index, 'value', e.target.value)}
                  placeholder="Filter value"
                  className="flex-1 px-2 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs"
                />

                {/* Remove Button */}
                {filters.length > 1 && (
                  <button
                    onClick={() => removeFilter(index)}
                    className="px-2 py-1 text-red-600 hover:bg-red-50 rounded-lg transition"
                  >
                    <Trash2 size={18} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Generate Button */}
        <div className="flex justify-end gap-2">
          <button
            onClick={() => {
              setPreview(null)
              setFilters([{ field: 'date', operator: 'equals', value: '' }])
            }}
            className="px-4 py-1 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium"
          >
            Reset
          </button>
          <button
            onClick={generateReport}
            disabled={loading}
            className="flex items-center gap-1 px-4 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FileText size={18} />
            {loading ? 'Generating...' : 'Generate Report'}
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-2 text-sm bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* Report Preview */}
      {preview && (
        <div className="bg-white rounded-lg shadow-md p-4">
          <h3 className="text-lg font-bold text-gray-900 mb-2">Report Preview</h3>
          
          {/* Preview Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-4">
            {preview.stats && Object.entries(preview.stats).map(([key, value]) => (
              <div key={key} className="bg-gray-50 rounded-lg p-2">
                <p className="text-gray-600 text-xs font-medium capitalize">{key}</p>
                <p className="text-lg font-bold text-gray-900 mt-0.5">{value}</p>
              </div>
            ))}
          </div>

          {/* Preview Table */}
          {preview.data && preview.data.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-gray-100 border-y border-gray-200">
                  <tr>
                    {Object.keys(preview.data[0]).map((key) => (
                      <th key={key} className="px-2 py-1 text-left font-semibold text-gray-700 capitalize">
                        {key}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {preview.data.map((row, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      {Object.values(row).map((value, cellIdx) => (
                        <td key={cellIdx} className="px-2 py-1 text-gray-700">
                          {value}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-4 text-sm text-gray-500">
              No data available for the selected filters
            </div>
          )}

          {/* Export Options */}
          <div className="mt-3 flex gap-2 justify-end">
            <button className="px-3 py-1 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium">
              Export PDF
            </button>
            <button className="px-3 py-1 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium">
              Export Excel
            </button>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!preview && !loading && (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <FileText size={40} className="mx-auto text-gray-400 mb-2" />
          <p className="text-gray-600 text-sm">Select report type and filters, then click "Generate Report" to view the preview</p>
        </div>
      )}
    </div>
  )
}

export default SalesReports


