import { useEffect, useState } from "react";
import { flushSync } from "react-dom";

const PRINT_CLASS = "os-print-slips";

// While fresh codes are on screen, any print (the buttons, Ctrl+P or the browser menu) prints the
// code sheet instead of the page, whose summary table deliberately holds no codes.
// selected is null for every class, or the keys of the classes to print.
export function usePrintSheet() {
  const [selected, setSelected] = useState<string[] | null>(null);

  useEffect(() => {
    document.body.classList.add(PRINT_CLASS);
    const reset = () => setSelected(null);
    window.addEventListener("afterprint", reset);
    return () => {
      document.body.classList.remove(PRINT_CLASS);
      window.removeEventListener("afterprint", reset);
    };
  }, []);

  // flushSync puts the chosen classes on the sheet before the print dialog takes its snapshot.
  const print = (keys: string[] | null) => {
    flushSync(() => setSelected(keys));
    window.print();
  };

  return { selected, print };
}
