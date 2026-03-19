
import React from 'react';
import { Rnd } from 'react-rnd';

const Modal = ({ isOpen, onClose, children, title, width = "max-w-md lg:max-w-lg", draggable = false, isSubModal = false, zIndex = 50 }) => {
  if (!isOpen) return null;

  // Width mapping for Tailwind classes
  const widthMap = {
    "max-w-md": 448,
    "max-w-lg": 512,
    "max-w-2xl": 672,
    "max-w-4xl": 896,
    "max-w-5xl": 1024,
    "max-w-6xl": 1152,
  };

  const getDefaultWidth = () => {
    const widthClasses = width.split(" ");
    for (let cls of widthClasses) {
      if (widthMap[cls]) return widthMap[cls];
    }
    return 500;
  };

  const defaultWidth = getDefaultWidth();


  // ✅ Sub-modals should NOT be draggable (use simple centered layout instead)
  if (isSubModal) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-40 flex items-start justify-center p-4" style={{ ...{ paddingTop: '200px' }, zIndex: zIndex + 10 }}>
        <div className={`bg-white rounded-lg ${width} p-6 relative shadow-2xl`}>
          <button
            className="absolute top-4 right-4 bg-gray-600 hover:bg-gray-700 text-white w-8 h-8 flex items-center justify-center rounded transition-colors text-sm z-10"
            onClick={onClose}
            title="Close"
          >
            ✕
          </button>
          {title && <h2 className="text-xl font-bold text-gray-800 mb-4">{title}</h2>}
          {children}
        </div>
      </div>
    );
  }

  // Draggable parent modals
  if (!draggable) {
    return (
      <div className="fixed inset-0 flex items-start justify-center p-4 pt-20 bg-black bg-opacity-50 overflow-y-auto" style={{ zIndex }}>
        <div className={`bg-white rounded-lg ${width} p-6 relative shadow-2xl my-auto`}>
          <button
            className="absolute top-4 right-4 bg-gray-600 hover:bg-gray-700 text-white w-8 h-8 flex items-center justify-center rounded transition-colors text-sm z-10"
            onClick={onClose}
            title="Close"
          >
            ✕
          </button>
          {title && <h2 className="text-xl font-bold text-gray-800 mb-4">{title}</h2>}
          <div className="max-h-[calc(100vh-200px)] overflow-y-auto">
            {children}
          </div>
        </div>
      </div>
    );
  }

  const centerX = typeof window !== 'undefined' ? Math.max(0, (window.innerWidth - defaultWidth) / 2) : 100;
  const centerY = typeof window !== 'undefined' ? Math.max(40, isSubModal ? (window.innerHeight - 400) / 2 : 100) : 100;

  return (
    <div 
      className={`fixed inset-0 flex ${isSubModal ? 'items-center' : 'items-start'} justify-center pointer-events-none bg-black ${isSubModal ? 'bg-opacity-40' : 'bg-opacity-50'}`}
      style={{ zIndex: isSubModal ? zIndex + 10 : zIndex }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          // Allow pointer events only on the overlay itself
        }
      }}
    >
      <Rnd
        default={{
          x: centerX,
          y: centerY,
          width: defaultWidth,
          height: 'auto',
        }}
        minWidth={300}
        minHeight={200}
        onDragStop={(e, d) => {
          e.stopPropagation?.();
        }}
        onClick={(e) => e.stopPropagation()}
        dragHandleClassName="modal-drag-handle"
        className="rnd-modal pointer-events-auto"
      >
        <div className="bg-white rounded-lg p-6 relative shadow-lg w-full h-full flex flex-col">
          {/* Header with Drag Handle */}
          <div className="modal-drag-handle mb-4 cursor-move select-none flex-shrink-0">
            <button
              className="absolute top-4 right-4 bg-gray-600 hover:bg-gray-700 text-white w-8 h-8 flex items-center justify-center rounded transition-colors z-10 text-sm cursor-pointer"
              onClick={onClose}
              title="Close"
            >
              ✕
            </button>
            {title && (
              <h2 className="text-xl font-bold text-gray-800 mb-0">
                {title}
              </h2>
            )}
          </div>

          {/* Content Area - Scrollable */}
          <div className="flex-1 overflow-y-auto min-h-0">
            {children}
          </div>
        </div>
      </Rnd>
    </div>
  );
};

export default Modal;


