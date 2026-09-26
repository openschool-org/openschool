import { useCallback, useRef, useState } from "react";
import { flushSync } from "react-dom";

export interface FieldError {
  id: string;
  label: string;
  message: string;
}

const INVALID = 'input[data-invalid="true"], select[data-invalid="true"], textarea[data-invalid="true"], [aria-invalid="true"]';

// Reads Carbon's invalid fields from the DOM, so any form gets a summary without restating its rules.
function scan(root: HTMLElement | null): FieldError[] {
  if (!root) return [];
  const seen = new Set<string>();
  return [...root.querySelectorAll<HTMLElement>(INVALID)]
    .filter((el) => el.id && !seen.has(el.id) && seen.add(el.id))
    .map((el) => {
      const label = root.querySelector(`label[for="${CSS.escape(el.id)}"]`)?.textContent?.trim() ?? el.getAttribute("aria-label") ?? "";
      const describedBy = (el.getAttribute("aria-describedby") ?? "").split(" ").filter(Boolean);
      const message = describedBy.map((id) => document.getElementById(id)?.textContent?.trim()).find(Boolean) ?? "Check this field.";
      return { id: el.id, label, message };
    });
}

export function useErrorSummary<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T>(null);
  const [errors, setErrors] = useState<FieldError[]>([]);

  // Marks fields touched, then lists what is wrong and moves focus to the first problem.
  const reveal = useCallback((markTouched: () => void): boolean => {
    flushSync(markTouched);
    const found = scan(ref.current);
    setErrors(found);
    if (found.length) document.getElementById(found[0].id)?.focus();
    return found.length === 0;
  }, []);

  // Re-checks after edits so fixed fields drop off the summary.
  const recheck = useCallback(() => {
    setTimeout(() => setErrors((current) => (current.length ? scan(ref.current) : current)), 0);
  }, []);

  const reset = useCallback(() => setErrors([]), []);

  return { ref, errors, reveal, recheck, reset };
}
