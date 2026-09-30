const PRINT_CLASS = "os-print-slips";

// Opens the print dialog with only the slip sheet visible; "Save as PDF" there makes a PDF per class.
export function printSlips(onDone: () => void) {
  document.body.classList.add(PRINT_CLASS);
  window.addEventListener("afterprint", () => {
    document.body.classList.remove(PRINT_CLASS);
    onDone();
  }, { once: true });
  window.print();
}
