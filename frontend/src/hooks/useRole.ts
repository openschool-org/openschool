import { useState, useEffect, useRef } from "react";
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
  const getAccessTokenRef = useRef(getAccessToken);
  const [role, setRole] = useState<Role>("admin");
  const [roleResolved, setRoleResolved] = useState(false);

  useEffect(() => {
    getAccessTokenRef.current = getAccessToken;
  });

  useEffect(() => {
    if (isLoading) return;

    if (!isSignedIn) {
      setRoleResolved(true);
      return;
    }

    let cancelled = false;

    getAccessTokenRef.current().then((token) => {
      if (cancelled) return;

      if (token) {
        const payload = parseJwt(token);
        const raw =
          (Array.isArray(payload?.roles)
            ? (payload.roles as string[]).find((r) =>
                ["admin", "teacher", "student", "parent"].includes(r),
              )
            : null) ?? "admin";
        setRole(raw as Role);
      }

      setRoleResolved(true);
    });

    return () => {
      cancelled = true;
    };
  }, [isLoading, isSignedIn]);

  return { role, loading: isLoading || !roleResolved };
}
