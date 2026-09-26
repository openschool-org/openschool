import { useCallback, useSyncExternalStore } from "react";
import { useQueryClient, type Query } from "@tanstack/react-query";

function isStale(q: Query) {
  return q.state.status === "error" && q.state.data !== undefined;
}

// Oldest `dataUpdatedAt` among queries whose refetch failed but still show cached data; 0 when none.
export function useStaleData() {
  const queryClient = useQueryClient();
  const cache = queryClient.getQueryCache();

  const savedAt = useSyncExternalStore(
    (onChange) => cache.subscribe(onChange),
    () => {
      const times = cache.getAll().filter(isStale).map((q) => q.state.dataUpdatedAt);
      return times.length ? Math.min(...times) : 0;
    },
  );

  const retry = useCallback(() => queryClient.refetchQueries({ predicate: isStale }), [queryClient]);
  return { savedAt, retry };
}
