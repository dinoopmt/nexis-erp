import { useContext } from "react";
import { BarcodePrintContext } from "../context/BarcodePrintContext";

/**
 * useBarcodePrint Hook - Access global barcode print modal
 * 
 * Usage:
 * const { openBarcodePrint, closeBarcodePrint } = useBarcodePrint();
 * 
 * // Open the modal
 * openBarcodePrint({
 *   barcode: "123456789",
 *   productName: "Product Name",
 *   pricingLines: pricingLinesArray,
 *   units: unitsArray
 * });
 * 
 * // Close the modal
 * closeBarcodePrint();
 */
export const useBarcodePrint = () => {
  const context = useContext(BarcodePrintContext);
  
  if (!context) {
    throw new Error(
      "useBarcodePrint must be used within BarcodePrintProvider. " +
      "Make sure your App is wrapped with <BarcodePrintProvider>"
    );
  }
  
  return context;
};
