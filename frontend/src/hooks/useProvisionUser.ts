import { useEffect, useRef } from "react";
import { useThunderID } from "@thunderid/react";
import api from "../lib/api";

// GET /me is what makes the backend auto-provision a Postgres row for the
// signed-in user (see routes.go) — without ever calling it, someone can be
// fully signed in and using the app by role, yet never exist in Postgres,
// which silently breaks anything keyed on users.id (needs_setup counts,
// attendance taken_by, etc). Fire it once per sign-in so every authenticated
// visitor gets provisioned, not just the ones who go through /setup/admin
// or an explicit Create Student/Teacher flow.
export function useProvisionUser() {
  const { isSignedIn, isLoading } = useThunderID();
  const provisionedRef = useRef(false);

  useEffect(() => {
    if (isLoading || !isSignedIn || provisionedRef.current) return;
    provisionedRef.current = true;
    api.get("/me").catch(() => {
      // Best-effort — a failure here shouldn't block the app from loading.
      provisionedRef.current = false;
    });
  }, [isLoading, isSignedIn]);
}
