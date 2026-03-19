/**
 * FloatingTextarea Component
 * Textarea field with floating/overlapping label
 */
import React from "react";

const FloatingTextarea = ({
  label,
  value = "",
  onChange,
  onBlur,
  disabled = false,
  required = false,
  placeholder = " ",
  rows = 3,
  className = "",
  ...props
}) => {
  const hasValue = value && value.toString().trim() !== "";

  return (
    <div className={`relative ${className}`}>
      <textarea
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        disabled={disabled}
        placeholder={placeholder}
        rows={rows}
        className={`
          w-full px-3 py-2 border border-gray-300 rounded text-sm
          transition-all duration-200
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
          disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed
          peer resize-none
        `}
        {...props}
      />
      <label
        className={`
          absolute left-3 px-1 bg-white text-xs font-semibold text-gray-700
          transition-all duration-200 pointer-events-none
          ${
            hasValue || document.activeElement?.value
              ? "top-0 -translate-y-1/2 scale-90 text-blue-600 bg-white"
              : "top-2 scale-100 text-gray-600"
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

export default FloatingTextarea;


