import React, { useState } from "react";
import Modal from "../../shared/Model";

/**
 * GroupingModal.jsx - Separate component for creating departments, sub-departments, and brands
 * Handles grouping hierarchy creation
 */
const GroupingModal = ({
  isOpen,
  onClose,
  level, // "1" for Department, "2" for Sub-Dept, "3" for Brand
  parentId,
  onSaveGrouping,
  isLoading,
  levelLabel,
}) => {
  const [newGrouping, setNewGrouping] = useState({
    name: "",
    description: "",
    parentId: parentId || "",
  });

  const [errors, setErrors] = useState({});

  const validateGrouping = () => {
    const newErrors = {};
    if (!newGrouping.name.trim()) {
      newErrors.name = `${levelLabel || "Grouping"} name is required`;
    }
    return newErrors;
  };

  const handleSave = async () => {
    const validationErrors = validateGrouping();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    if (onSaveGrouping) {
      await onSaveGrouping({
        ...newGrouping,
        parentId,
        level,
      });
      handleClose();
    }
  };

  const handleClose = () => {
    setNewGrouping({
      name: "",
      description: "",
      parentId: parentId || "",
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
        <h2 className="text-lg font-bold text-gray-800">
          ➕ Create {levelLabel || "Grouping"}
        </h2>

        {/* Form */}
        <div className="space-y-3">
          {/* Name */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-700">
              {levelLabel} Name *
            </label>
            <input
              type="text"
              placeholder={`Enter ${levelLabel?.toLowerCase() || "grouping"} name`}
              className={`border rounded px-2 py-1 text-xs ${
                errors.name ? "border-red-500 bg-red-50" : "border-gray-300"
              }`}
              value={newGrouping.name}
              onChange={(e) =>
                setNewGrouping({ ...newGrouping, name: e.target.value })
              }
              onKeyDown={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              disabled={isLoading}
              autoFocus
            />
            {errors.name && (
              <p className="text-red-500 text-xs">{errors.name}</p>
            )}
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-700">
              Description
            </label>
            <textarea
              placeholder="Enter description (optional)"
              className="border border-gray-300 rounded px-2 py-1 text-xs resize-none h-20"
              value={newGrouping.description}
              onChange={(e) =>
                setNewGrouping({ ...newGrouping, description: e.target.value })
              }
              onKeyDown={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              disabled={isLoading}
            />
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded p-2">
            <p className="text-xs text-blue-700">
              ℹ️ {levelLabel} will be available for selection immediately after
              creation.
            </p>
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
            {isLoading ? "Creating..." : `Create ${levelLabel}`}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default GroupingModal;


