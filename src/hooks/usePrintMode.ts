/**
 * usePrintMode — Issue #171
 *
 * Detects when the browser is in print mode (beforeprint/afterprint events).
 * Chart widgets use this to switch to accessible table/bar views when printing.
 *
 * Returns true when the page is being printed or previewed for print.
 */

import { useState, useEffect } from "react";

export function usePrintMode(): boolean {
  const [isPrinting, setIsPrinting] = useState(false);

  useEffect(() => {
    const handleBeforePrint = () => setIsPrinting(true);
    const handleAfterPrint = () => setIsPrinting(false);

    // Modern browsers
    window.addEventListener("beforeprint", handleBeforePrint);
    window.addEventListener("afterprint", handleAfterPrint);

    // Fallback for older browsers / some mobile browsers
    const mediaQueryList = window.matchMedia("print");
    const handleMediaChange = (e: MediaQueryListEvent | MediaQueryList) => {
      if ("matches" in e) {
        setIsPrinting(e.matches);
      }
    };

    if (mediaQueryList.addEventListener) {
      mediaQueryList.addEventListener("change", handleMediaChange);
    }

    // Initial check
    handleMediaChange(mediaQueryList);

    return () => {
      window.removeEventListener("beforeprint", handleBeforePrint);
      window.removeEventListener("afterprint", handleAfterPrint);
      if (mediaQueryList.removeEventListener) {
        mediaQueryList.removeEventListener("change", handleMediaChange);
      }
    };
  }, []);

  return isPrinting;
}
