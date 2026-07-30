import { useMemo, useState } from "react";

// Client-side pagination — the backend list endpoints don't support
// limit/offset today, so every page's full result set is already in memory
// and this just slices it. Page is clamped against the live item count so a
// filter/search that shrinks the list can never strand the user on an empty
// page.
export function usePagination<T>(items: T[], initialPageSize = 10) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);

  const maxPage = Math.max(1, Math.ceil(items.length / pageSize));
  const currentPage = Math.min(page, maxPage);

  const pageItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, currentPage, pageSize]);

  return {
    page: currentPage,
    pageSize,
    pageItems,
    totalItems: items.length,
    onChange: ({ page: p, pageSize: ps }: { page: number; pageSize: number }) => {
      setPage(p);
      setPageSize(ps);
    },
  };
}
