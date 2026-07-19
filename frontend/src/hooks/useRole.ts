import { useState, useEffect, useRef } from "react";
import { useAsgardeo } from "@asgardeo/react";

type Role = "admin" | "teacher" | "student" | "parent";

function parseJwt(token: string): Record<string, unknown> | null {
  try {
    return JSON.parse(atob(token.split(".")[1]));
  } catch {
    return null;
  }
}

export function useRole(): { role: Role | null; loading: boolean } {
  const { getAccessToken, isSignedIn, isLoading } = useAsgardeo();
  const getAccessTokenRef = useRef(getAccessToken);
  // Start with no privilege. Never default to "admin" — an unresolved or
  // unrecognized role must never be treated as an authorized role.
  const [role, setRole] = useState<Role | null>(null);
  const [roleResolved, setRoleResolved] = useState(false);

  useEffect(() => {
    getAccessTokenRef.current = getAccessToken;
  });

  useEffect(() => {
    if (isLoading) return;

    if (!isSignedIn) {
      return;
    }

    let cancelled = false;

    getAccessTokenRef.current().then((token) => {
      if (cancelled) return;

      if (token) {
        const payload = parseJwt(token);
        const rawRoles = payload?.roles;
        const roles = Array.isArray(rawRoles)
          ? (rawRoles as string[])
          : typeof rawRoles === "string"
            ? [rawRoles]
            : [];

        const priority: Role[] = ["admin", "teacher", "student", "parent"];
        const resolved = priority.find((r) => roles.includes(r)) ?? null;
        setRole(resolved);
      }

      setRoleResolved(true);
    });

    return () => {
      cancelled = true;
    };
  }, [isLoading, isSignedIn]);

  return { role, loading: isLoading || (isSignedIn && !roleResolved) };
}
