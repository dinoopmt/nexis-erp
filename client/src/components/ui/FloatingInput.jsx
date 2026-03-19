/**
 * FloatingInput Component
 * Input field with floating/overlapping label
 */
import React from "react";

const FloatingInput = ({
  label,
  type = "text",
  value = "",
  onChange,
  onBlur,
  disabled = false,
  required = false,
  placeholder = " ",
  className = "",
  inputClassName = "",
  ...props
}) => {
  const hasValue = value && value.toString().trim() !== "";

  return (
    <div className={`relative ${className}`}>
      <input
        type={type}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        disabled={disabled}
        placeholder={placeholder}
        className={`
          w-full px-3 py-2 border border-gray-300 rounded text-sm
          transition-all duration-200
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
          disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed
          peer
          ${inputClassName}
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
              : "top-1/2 -translate-y-1/2 scale-100 text-gray-600"
          }
          peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:scale-90 peer-focus:text-blue-600
          group-has-[input:not(:placeholder-shown)]:top-0
          group-has-[input:not(:placeholder-shown)]:-translate-y-1/2
          group-has-[input:not(:placeholder-shown)]:scale-90
        `}
      >
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
    </div>
  );
};

export default FloatingInput;


