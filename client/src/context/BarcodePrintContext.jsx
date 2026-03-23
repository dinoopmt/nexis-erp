import React, { createContext, useState, useCallback } from "react";

/**
 * BarcodePrintContext - Global barcode printing modal
 * Allows any component in the app to trigger barcode printing
 * 
 * Usage:
 * const { openBarcodePrint } = useBarcodePrint();
 * openBarcodePrint({
 *   barcode: "123456789",
 *   productName: "Product Name",
 *   pricingLines: [...],
 *   units: [...]
 * });
 */
export const BarcodePrintContext = createContext();

export const BarcodePrintProvider = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [printData, setPrintData] = useState({
    barcode: "",
    productName: "",
    pricingLines: [],
    units: [],
  });

  // Open the barcode print modal with data
  const openBarcodePrint = useCallback((data) => {
    setPrintData({
      barcode: data.barcode || "",
      productName: data.productName || "",
      pricingLines: data.pricingLines || [],
      units: data.units || [],
    });
    setIsOpen(true);
  }, []);

  // Close the barcode print modal
  const closeBarcodePrint = useCallback(() => {
    setIsOpen(false);
  }, []);

  const value = {
    isOpen,
    printData,
    openBarcodePrint,
    closeBarcodePrint,
  };

  return (
    <BarcodePrintContext.Provider value={value}>
      {children}
    </BarcodePrintContext.Provider>
  );
};
