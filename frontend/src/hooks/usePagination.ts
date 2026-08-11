import { useMemo, useState } from "react";

export function usePagination<T>(items: T[], initialPageSize = 10) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);

  const maxPage = Math.max(1, Math.ceil(items.length / pageSize));

  // Clamped during render (React's supported pattern for this, same as
  // SchoolSetup.tsx's syncedRange) rather than in an effect, so the stored
  // `page` itself gets corrected in the same pass. Clamping only a derived
  // `currentPage` for display would let a shrink-then-grow of `items` snap
  // back to the old, stale page number — e.g. paging to 3, searching
  // (clamps display to 1), then clearing the search restores the full list
  // and jumps back to page 3 instead of staying at 1.
  if (page > maxPage) {
    setPage(maxPage);
  }
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
