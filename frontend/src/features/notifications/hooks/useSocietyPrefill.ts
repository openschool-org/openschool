import { useEffect, useRef } from "react";
import { useSearchParams } from "react-router";
import type { RecipientRule } from "@/features/notifications/api/notification";
import { buildRule } from "@/features/notifications/lib/recipientRules";
import { useNotifyScope } from "@/features/notifications/queries/useNotifications";

// Reached from a society's "Notify members" (?society=<id>): opens the composer with that society picked.
export function useSocietyPrefill(open: (rules: RecipientRule[]) => void) {
  const [params, setParams] = useSearchParams();
  const societyId = params.get("society");
  const { data: scope } = useNotifyScope();
  const openRef = useRef(open);
  useEffect(() => {
    openRef.current = open;
  });

  useEffect(() => {
    if (!societyId || !scope) return;
    // Only societies the sender may message are offered, the same list the backend allows.
    const society = scope.societies.find((s) => s.id === societyId);
    if (society) openRef.current([buildRule("society", society.id, society.name, "students", "students")]);
    const next = new URLSearchParams(params);
    next.delete("society");
    setParams(next, { replace: true });
  }, [societyId, scope, params, setParams]);
}
