import { useCallback, useEffect, useRef, useState } from "react";
import { useThunderID } from "@thunderid/react";
import { useNavigate } from "react-router";

// Lab and staffroom PCs are shared, so student/teacher portals default to a
// shorter idle timeout than admin (S12). Callers pass the portal-specific
// value; ProtectedRoute defaults to the shorter one.
export const IDLE_TIMEOUT_MS = 15 * 60 * 1000;
export const ADMIN_IDLE_TIMEOUT_MS = 30 * 60 * 1000;
// How long before the timeout the "still there?" warning appears.
const WARNING_BEFORE_MS = 60 * 1000;

const ACTIVITY_EVENTS = [
  "mousedown",
  "mousemove",
  "keydown",
  "touchstart",
  "scroll",
  "wheel",
] as const;
// Activity listeners fire far more often than the timer needs resetting
// (e.g. every pixel of mouse movement), throttle resets to once a second.
const RESET_THROTTLE_MS = 1000;

// Signs out after `timeoutMs` of inactivity, warning 60s beforehand so an
// idle-but-present user can stay signed in; @thunderid/react has no
// built-in idle timeout. Returns whether the warning is currently showing
// and a callback to dismiss it (resetting the timer), for the caller to
// render as a modal.
export function useIdleLogout(timeoutMs: number = IDLE_TIMEOUT_MS) {
  const { signOut, isSignedIn } = useThunderID();
  const navigate = useNavigate();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastResetRef = useRef(0);
  const [warning, setWarning] = useState(false);

  const handleIdleTimeout = useCallback(() => {
    setWarning(false);
    Promise.resolve(signOut()).finally(() => {
      navigate("/signin", { replace: true });
    });
  }, [signOut, navigate]);

  const resetTimer = useCallback(
    (force = false) => {
      const now = Date.now();
      if (!force && now - lastResetRef.current < RESET_THROTTLE_MS) return;
      lastResetRef.current = now;

      setWarning(false);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (warningRef.current) clearTimeout(warningRef.current);
      warningRef.current = setTimeout(() => setWarning(true), Math.max(timeoutMs - WARNING_BEFORE_MS, 0));
      timeoutRef.current = setTimeout(handleIdleTimeout, timeoutMs);
    },
    [handleIdleTimeout, timeoutMs],
  );

  // Activity only resets the timer while no warning is showing - once the
  // warning appears, only "Stay signed in" (staySignedIn, force=true) should
  // dismiss it, not an incidental mouse move over the modal.
  const handleActivity = useCallback(() => {
    if (!warning) resetTimer();
  }, [warning, resetTimer]);

  useEffect(() => {
    if (!isSignedIn) return;

    resetTimer(true);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (warningRef.current) clearTimeout(warningRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- resetTimer(true) should only re-run on sign-in/timeout changes, not every render
  }, [isSignedIn, timeoutMs]);

  // Registered separately from timer init, and re-registered whenever
  // handleActivity changes (i.e. whenever `warning` changes): otherwise the
  // listener keeps closing over the `warning` value from whichever render it
  // was attached in, so activity arriving right after the warning modal
  // opens would reset the timer and dismiss it without going through
  // staySignedIn.
  useEffect(() => {
    if (!isSignedIn) return;

    ACTIVITY_EVENTS.forEach((event) =>
      window.addEventListener(event, handleActivity, { passive: true }),
    );

    return () => {
      ACTIVITY_EVENTS.forEach((event) =>
        window.removeEventListener(event, handleActivity),
      );
    };
  }, [isSignedIn, handleActivity]);

  return { warning, staySignedIn: () => resetTimer(true), signOutNow: handleIdleTimeout };
}
