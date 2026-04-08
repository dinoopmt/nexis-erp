import React from 'react';
import { X } from 'lucide-react';

/**
 * Modal Component
 * Reusable modal dialog for displaying content in a centered overlay
 * 
 * @prop {boolean} isOpen - Whether the modal is open
 * @prop {function} onClose - Callback when modal should close
 * @prop {string} title - Modal title
 * @prop {ReactNode} children - Modal content
 * @prop {string} width - Tailwind width class (default: max-w-md)
 * @prop {string} height - Tailwind height class (optional)
 */
const Modal = ({ isOpen, onClose, title, children, width = 'max-w-md', height }) => {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div 
          className={`bg-white rounded-lg shadow-lg pointer-events-auto ${width} ${height || 'max-h-[90vh]'} overflow-y-auto`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 sticky top-0 bg-white">
            <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition"
              aria-label="Close modal"
            >
              <X size={20} />
            </button>
          </div>

          {/* Content */}
          <div>
            {children}
          </div>
        </div>
      </div>
    </>
  );
};

export default Modal;
