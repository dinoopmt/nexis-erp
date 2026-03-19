import React, { useState } from "react";
import Modal from "../../shared/Model";
import { toast } from "react-hot-toast";

/**
 * VendorModal.jsx - Separate component for vendor creation
 * Handles new vendor form and validation
 */
const VendorModal = ({
  isOpen,
  onClose,
  onVendorCreated,
  isLoading,
  onSaveVendor,
}) => {
  const [newVendor, setNewVendor] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    country: "",
    zipcode: "",
  });

  const [errors, setErrors] = useState({});

  const validateVendor = () => {
    const newErrors = {};
    if (!newVendor.name.trim()) {
      newErrors.name = "Vendor name is required";
    }
    if (!newVendor.country.trim()) {
      newErrors.country = "Country is required";
    }
    return newErrors;
  };

  const handleSave = async () => {
    const validationErrors = validateVendor();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    if (onSaveVendor) {
      await onSaveVendor(newVendor);
      handleClose();
    }
  };

  const handleClose = () => {
    setNewVendor({
      name: "",
      email: "",
      phone: "",
      address: "",
      city: "",
      state: "",
      country: "",
      zipcode: "",
    });
    setErrors({});
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      width="max-w-2xl"
      draggable={true}
    >
      <div className="p-4 flex flex-col gap-3">
        <h2 className="text-lg font-bold text-gray-800">➕ Create New Vendor</h2>

        {/* Form Grid */}
        <div className="grid grid-cols-2 gap-3">
          {/* Vendor Name */}
          <div className="flex flex-col gap-1 col-span-2">
            <label className="text-xs font-semibold text-gray-700">
              Vendor Name *
            </label>
            <input
              type="text"
              placeholder="Enter vendor name"
              className={`border rounded px-2 py-1 text-xs ${
                errors.name ? "border-red-500 bg-red-50" : "border-gray-300"
              }`}
              value={newVendor.name}
              onChange={(e) =>
                setNewVendor({ ...newVendor, name: e.target.value })
              }
              onKeyDown={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              disabled={isLoading}
            />
            {errors.name && (
              <p className="text-red-500 text-xs">{errors.name}</p>
            )}
          </div>

          {/* Email */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-700">Email</label>
            <input
              type="email"
              placeholder="vendor@example.com"
              className="border border-gray-300 rounded px-2 py-1 text-xs"
              value={newVendor.email}
              onChange={(e) =>
                setNewVendor({ ...newVendor, email: e.target.value })
              }
              onKeyDown={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              disabled={isLoading}
            />
          </div>

          {/* Phone */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-700">Phone</label>
            <input
              type="tel"
              placeholder="+1234567890"
              className="border border-gray-300 rounded px-2 py-1 text-xs"
              value={newVendor.phone}
              onChange={(e) =>
                setNewVendor({ ...newVendor, phone: e.target.value })
              }
              onKeyDown={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              disabled={isLoading}
            />
          </div>

          {/* Address */}
          <div className="flex flex-col gap-1 col-span-2">
            <label className="text-xs font-semibold text-gray-700">
              Address
            </label>
            <input
              type="text"
              placeholder="Enter street address"
              className="border border-gray-300 rounded px-2 py-1 text-xs"
              value={newVendor.address}
              onChange={(e) =>
                setNewVendor({ ...newVendor, address: e.target.value })
              }
              onKeyDown={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              disabled={isLoading}
            />
          </div>

          {/* City */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-700">City</label>
            <input
              type="text"
              placeholder="City"
              className="border border-gray-300 rounded px-2 py-1 text-xs"
              value={newVendor.city}
              onChange={(e) =>
                setNewVendor({ ...newVendor, city: e.target.value })
              }
              onKeyDown={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              disabled={isLoading}
            />
          </div>

          {/* State */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-700">State</label>
            <input
              type="text"
              placeholder="State"
              className="border border-gray-300 rounded px-2 py-1 text-xs"
              value={newVendor.state}
              onChange={(e) =>
                setNewVendor({ ...newVendor, state: e.target.value })
              }
              onKeyDown={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              disabled={isLoading}
            />
          </div>

          {/* Country */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-700">
              Country *
            </label>
            <select
              className={`border rounded px-2 py-1 text-xs ${
                errors.country ? "border-red-500 bg-red-50" : "border-gray-300"
              }`}
              value={newVendor.country}
              onChange={(e) =>
                setNewVendor({ ...newVendor, country: e.target.value })
              }
              onKeyDown={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              disabled={isLoading}
            >
              <option value="">Select Country</option>
              <option value="IN">India (IN)</option>
              <option value="AE">UAE (AE)</option>
              <option value="OM">Oman (OM)</option>
            </select>
            {errors.country && (
              <p className="text-red-500 text-xs">{errors.country}</p>
            )}
          </div>

          {/* Zipcode */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-700">
              Zipcode
            </label>
            <input
              type="text"
              placeholder="Zipcode"
              className="border border-gray-300 rounded px-2 py-1 text-xs"
              value={newVendor.zipcode}
              onChange={(e) =>
                setNewVendor({ ...newVendor, zipcode: e.target.value })
              }
              onKeyDown={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              disabled={isLoading}
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 justify-end mt-3">
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="px-3 py-1 border border-gray-300 rounded text-xs hover:bg-gray-100 transition disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isLoading}
            className="px-3 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700 transition font-medium disabled:opacity-50"
          >
            {isLoading ? "Creating..." : "Create Vendor"}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default VendorModal;


