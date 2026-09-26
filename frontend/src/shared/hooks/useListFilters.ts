import { useCallback, useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { useDebounced } from "@/shared/hooks/useDebounced";

type Filters = Record<string, string>;

// Holds a page's search and filter values in the URL query string, so they survive a refresh and can be shared.
export function useListFilters<T extends Filters>(
  initial: T,
  options: { searchKey?: keyof T; debounceMs?: number } = {},
) {
  // Captured once so clear() and activeKeys compare against a stable baseline.
  const [baseline] = useState(initial);
  const [params, setParams] = useSearchParams();
  const searchKey = options.searchKey ?? ("query" as keyof T);

  const filters = useMemo(() => {
    const out = { ...baseline };
    for (const key of Object.keys(baseline) as (keyof T & string)[]) {
      const value = params.get(key);
      if (value !== null) out[key] = value as T[typeof key];
    }
    return out;
  }, [params, baseline]);

  const debouncedSearch = useDebounced(filters[searchKey] ?? "", options.debounceMs ?? 250);

  const write = useCallback(
    (patch: Partial<T>) => {
      setParams(
        (current) => {
          const next = new URLSearchParams(current);
          for (const [key, value] of Object.entries(patch)) {
            if (value === undefined || value === baseline[key]) next.delete(key);
            else next.set(key, value);
          }
          return next;
        },
        { replace: true },
      );
    },
    [setParams, baseline],
  );

  const set = useCallback(<K extends keyof T>(key: K, value: T[K]) => write({ [key]: value } as unknown as Partial<T>), [write]);

  const clear = useCallback(
    (key?: keyof T) => write(key ? ({ [key]: baseline[key] } as unknown as Partial<T>) : baseline),
    [write, baseline],
  );

  const activeKeys = useMemo(
    () => (Object.keys(filters) as (keyof T)[]).filter((k) => filters[k] !== baseline[k]),
    [filters, baseline],
  );

  return { filters, set, clear, activeKeys, hasActive: activeKeys.length > 0, debouncedSearch };
}
