/**
 * useLpoGridDimensions Hook
 * Manages responsive grid sizing and layout for LPO
 */
import { useLayoutEffect, useEffect, useState, useRef } from "react";

export const useLpoGridDimensions = (showModal) => {
  const gridContainerRef = useRef(null);
  const [gridHeight, setGridHeight] = useState(350);
  const [screenHeight, setScreenHeight] = useState(window.innerHeight);
  const [containerHeight, setContainerHeight] = useState(400);

  // Dimension tracking for responsive sizing
  useEffect(() => {
    const updateDimensions = () => {
      setScreenHeight(window.innerHeight);
      setContainerHeight(Math.max(150, window.innerHeight * 0.6));
    };

    updateDimensions();
    window.addEventListener("resize", updateDimensions);

    const handleFullscreenChange = () => {
      setTimeout(updateDimensions, 350);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    document.addEventListener("mozfullscreenchange", handleFullscreenChange);

    return () => {
      window.removeEventListener("resize", updateDimensions);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
      document.removeEventListener("mozfullscreenchange", handleFullscreenChange);
    };
  }, []);

  // Measure and set explicit grid height
  useLayoutEffect(() => {
    if (!gridContainerRef.current || !showModal) return;

    const updateGridHeight = () => {
      const container = gridContainerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const availableHeight = window.innerHeight - rect.top - 100;
      const finalHeight = Math.max(300, availableHeight);

      console.log("🎯 LPO Grid Height Calculation:", {
        windowHeight: window.innerHeight,
        containerTop: rect.top,
        availableHeight,
        finalHeight,
      });

      setGridHeight(finalHeight);
    };

    const timeout = setTimeout(updateGridHeight, 100);
    window.addEventListener("resize", updateGridHeight);

    return () => {
      clearTimeout(timeout);
      window.removeEventListener("resize", updateGridHeight);
    };
  }, [showModal]);

  return {
    gridContainerRef,
    gridHeight,
    screenHeight,
    containerHeight,
  };
};
