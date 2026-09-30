const PRINT_CLASS = "os-print-slips";

// Prints only the slip sheet: the class hides the rest of the app for the print dialog.
export function printSlips() {
  document.body.classList.add(PRINT_CLASS);
  window.addEventListener("afterprint", () => document.body.classList.remove(PRINT_CLASS), { once: true });
  window.print();
}
