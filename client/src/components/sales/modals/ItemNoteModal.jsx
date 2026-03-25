import React from "react";
import { Edit2, X } from "lucide-react";

export default function ItemNoteModal({
  show,
  selectedItemNote,
  itemNotes,
  onNoteChange,
  onClose,
}) {
  if (!show || !selectedItemNote) return null;

  return (
    <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md flex flex-col">
        <div className="flex justify-between items-center px-6 py-4 border-b bg-gray-50">
          <h2 className="text-sm font-bold text-gray-800 flex items-center gap-2">
            <Edit2 size={18} className="text-blue-600" />
            Item Note
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={18} />
          </button>
        </div>
        <div className="px-6 py-4 flex-1">
          <textarea
            value={itemNotes[selectedItemNote] || ""}
            onChange={(e) =>
              onNoteChange({
                itemId: selectedItemNote,
                value: e.target.value,
              })
            }
            placeholder="Enter note for this item..."
            className="w-full h-32 p-3 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
          />
        </div>
        <div className="px-6 py-3 border-t bg-gray-50 flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition"
          >
            Cancel
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition"
          >
            Save Note
          </button>
        </div>
      </div>
    </div>
  );
}
