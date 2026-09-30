import { useEffect, useRef, useState } from "react";

// Guards explicit in-page exits (Cancel/Back buttons) and browser close/refresh.
// Pair it with react-router's useBlocker to also catch sidebar links and history back/forward.
export function useUnsavedChangesGuard(hasUnsaved: boolean) {
  const [pending, setPending] = useState(false);
  const pendingActionRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!hasUnsaved) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [hasUnsaved]);

  const guard = (action: () => void) => {
    if (hasUnsaved) {
      pendingActionRef.current = action;
      setPending(true);
    } else {
      action();
    }
  };

  const confirmLeave = () => {
    setPending(false);
    pendingActionRef.current?.();
    pendingActionRef.current = null;
  };

  const cancelLeave = () => {
    setPending(false);
    pendingActionRef.current = null;
  };

  return { guard, modalOpen: pending, confirmLeave, cancelLeave };
}
