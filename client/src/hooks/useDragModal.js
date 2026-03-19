/**
 * useDragModal Hook
 * 
 * Reusable hook for making any modal/container draggable
 * 
 * Usage:
 * const { isDragging, modalPosition, handleMouseDown } = useDragModal();
 * 
 * Then apply to your modal:
 * <div style={{ left: modalPosition.x, top: modalPosition.y }}>
 *   <div onMouseDown={handleMouseDown} className="drag-handle">...</div>
 * </div>
 */

import { useEffect, useRef, useState } from 'react';

export const useDragModal = () => {
  const [isDragging, setIsDragging] = useState(false);
  const [modalPosition, setModalPosition] = useState({ x: 0, y: 0 });
  
  // Store offset in ref to avoid effect dependencies
  const dragOffsetRef = useRef({ x: 0, y: 0 });

  // Handler for mouse down on drag handle
  const handleMouseDown = (e) => {
    // Support data attribute to disable drag on specific elements
    if (e.target.dataset.noDrag) return;
    
    setIsDragging(true);
    dragOffsetRef.current = {
      x: e.clientX - modalPosition.x,
      y: e.clientY - modalPosition.y,
    };
  };

  // Effect for mouse move/up events
  useEffect(() => {
    if (!isDragging) return;

    let animationFrameId;

    const handleMouseMove = (e) => {
      // Use requestAnimationFrame for smooth, performant dragging
      cancelAnimationFrame(animationFrameId);
      animationFrameId = requestAnimationFrame(() => {
        setModalPosition({
          x: e.clientX - dragOffsetRef.current.x,
          y: e.clientY - dragOffsetRef.current.y,
        });
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      cancelAnimationFrame(animationFrameId);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      cancelAnimationFrame(animationFrameId);
    };
  }, [isDragging]); // Only depends on isDragging for minimal re-renders

  // Reset position (useful when closing modal)
  const resetPosition = () => {
    setModalPosition({ x: 0, y: 0 });
  };

  // Get CSS transform for modal
  const getModalStyle = () => ({
    position: 'fixed',
    left: `calc(50% + ${modalPosition.x}px)`,
    top: `calc(50% + ${modalPosition.y}px)`,
    transform: 'translate(-50%, -50%)',
    transition: isDragging ? 'none' : 'all 0.2s ease-out',
  });

  // Get handler style for drag area
  const getDragHandleStyle = () => ({
    cursor: isDragging ? 'grabbing' : 'grab',
    userSelect: 'none',
    touchAction: 'none',
  });

  return {
    isDragging,
    modalPosition,
    handleMouseDown,
    resetPosition,
    getModalStyle,
    getDragHandleStyle,
  };
};

export default useDragModal;


