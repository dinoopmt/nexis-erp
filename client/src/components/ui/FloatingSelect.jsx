/**
 * FloatingSelect Component
 * Select field with floating/overlapping label
 */
import React from "react";

const FloatingSelect = ({
  label,
  value = "",
  onChange,
  disabled = false,
  required = false,
  options = [],
  className = "",
  ...props
}) => {
  const hasValue = value && value.toString().trim() !== "";

  return (
    <div className={`relative ${className}`}>
      <select
        value={value}
        onChange={onChange}
        disabled={disabled}
        className={`
          w-full px-3 py-2 border border-gray-300 rounded text-sm appearance-none
          transition-all duration-200
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
          disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed
          peer
        `}
        {...props}
      >
        <option value="" disabled hidden> </option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <label
        className={`
          absolute left-3 px-1 bg-white text-xs font-semibold text-gray-700
          transition-all duration-200 pointer-events-none
          ${
            hasValue
              ? "top-0 -translate-y-1/2 scale-90 text-blue-600 bg-white"
              : "top-1/2 -translate-y-1/2 scale-100 text-gray-600"
          }
          peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:scale-90 peer-focus:text-blue-600
        `}
      >
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
    </div>
  );
};

export default FloatingSelect;


