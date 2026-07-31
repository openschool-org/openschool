import { useEffect, useRef } from "react";
import { useThunderID } from "@thunderid/react";
import api from "../lib/api";

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
