import React from 'react';

/**
 * ProductTableSkeleton - Shows loading skeleton while products are being fetched
 * Creates a shimmer effect with pseudo DOM rows to improve perceived performance
 * @param {number} rows - Number of skeleton rows to display (default: 10)
 */
export const ProductTableSkeleton = ({ rows = 10 }) => {
  return (
    <tbody>
      {Array.from({ length: rows }).map((_, idx) => (
        <tr key={idx} className="border-b hover:bg-gray-50">
          {/* ItemCode */}
          <td className="px-4 py-3">
            <div className="h-4 bg-gray-200 rounded w-20 animate-pulse"></div>
          </td>
          {/* Name */}
          <td className="px-4 py-3">
            <div className="h-4 bg-gray-200 rounded w-40 animate-pulse"></div>
          </td>
          {/* Department */}
          <td className="px-4 py-3">
            <div className="h-4 bg-gray-200 rounded w-24 animate-pulse"></div>
          </td>
          {/* Vendor */}
          <td className="px-4 py-3">
            <div className="h-4 bg-gray-200 rounded w-28 animate-pulse"></div>
          </td>
          {/* Barcode */}
          <td className="px-4 py-3">
            <div className="h-4 bg-gray-200 rounded w-32 animate-pulse"></div>
          </td>
          {/* Cost */}
          <td className="px-4 py-3 text-right">
            <div className="h-4 bg-gray-200 rounded w-16 ml-auto animate-pulse"></div>
          </td>
          {/* Price */}
          <td className="px-4 py-3 text-right">
            <div className="h-4 bg-gray-200 rounded w-16 ml-auto animate-pulse"></div>
          </td>
          {/* Stock */}
          <td className="px-4 py-3 text-right">
            <div className="h-4 bg-gray-200 rounded w-12 ml-auto animate-pulse"></div>
          </td>
          {/* Actions */}
          <td className="px-4 py-3">
            <div className="flex gap-2">
              <div className="h-8 bg-gray-200 rounded w-8 animate-pulse"></div>
              <div className="h-8 bg-gray-200 rounded w-8 animate-pulse"></div>
            </div>
          </td>
        </tr>
      ))}
    </tbody>
  );
};

/**
 * PageLoadingSkeleton - Full page loading indicator
 */
export const PageLoadingSkeleton = () => (
  <div className="space-y-4 animate-pulse p-4">
    <div className="h-10 bg-gray-200 rounded w-48"></div>
    <div className="space-y-2">
      {Array(5).fill(0).map((_, i) => (
        <div key={i} className="h-6 bg-gray-200 rounded"></div>
      ))}
    </div>
  </div>
);

export default ProductTableSkeleton;
