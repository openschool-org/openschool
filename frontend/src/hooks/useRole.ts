import { useState, useEffect } from "react";
import { useThunderID } from "@thunderid/react";

type Role = "admin" | "teacher" | "student" | "parent";

function parseJwt(token: string): Record<string, unknown> | null {
  try {
    return JSON.parse(atob(token.split(".")[1]));
  } catch {
    return null;
  }
}

export function useRole(): { role: Role; loading: boolean } {
  const { getAccessToken, isSignedIn, isLoading } = useThunderID();
  const [role, setRole] = useState<Role>("admin");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isLoading) return;
    if (!isSignedIn) { setLoading(false); return; }

    getAccessToken().then(token => {
      if (token) {
        const payload = parseJwt(token);
        // ThunderID puts the role under `role` or `roles` claim
        const raw =
          (payload?.role as string) ??
          (Array.isArray(payload?.roles) ? (payload.roles as string[])[0] : null) ??
          "admin";
        setRole(raw as Role);
      }
      setLoading(false);
    });
  }, [isLoading, isSignedIn, getAccessToken]);

  return { role, loading };
}
