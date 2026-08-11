import { useCallback, useEffect, useRef } from "react";
import { useThunderID } from "@thunderid/react";
import { useNavigate } from "react-router";

// 30 minutes of inactivity triggers an auto sign-out (docs/plan.md Phase 1).
const IDLE_TIMEOUT_MS = 30 * 60 * 1000;
const ACTIVITY_EVENTS = [
  "mousedown",
  "mousemove",
  "keydown",
  "touchstart",
  "scroll",
  "wheel",
] as const;
// Activity listeners fire far more often than the timer needs resetting
// (e.g. every pixel of mouse movement) — throttle resets to once a second.
const RESET_THROTTLE_MS = 1000;

// Mounted once, inside ProtectedRoute, for the lifetime of an authenticated
// session — resets a 30-minute timer on any pointer/keyboard/scroll
// activity and force-signs-out on expiry. @thunderid/react has no built-in
// idle/timeout option (checked ThunderIDReactConfig/ThunderIDContextProps),
// so this is hand-rolled.
export function useIdleLogout() {
  const { signOut, isSignedIn } = useThunderID();
  const navigate = useNavigate();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastResetRef = useRef(0);

  const handleIdleTimeout = useCallback(() => {
    Promise.resolve(signOut()).finally(() => {
      navigate("/signin", { replace: true });
    });
  }, [signOut, navigate]);

  const resetTimer = useCallback(() => {
    const now = Date.now();
    if (now - lastResetRef.current < RESET_THROTTLE_MS) return;
    lastResetRef.current = now;

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(handleIdleTimeout, IDLE_TIMEOUT_MS);
  }, [handleIdleTimeout]);

  useEffect(() => {
    if (!isSignedIn) return;

    resetTimer();
    ACTIVITY_EVENTS.forEach((event) =>
      window.addEventListener(event, resetTimer, { passive: true }),
    );

    return () => {
      ACTIVITY_EVENTS.forEach((event) =>
        window.removeEventListener(event, resetTimer),
      );
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [isSignedIn, resetTimer]);
}
