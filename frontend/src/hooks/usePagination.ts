import { useMemo, useState } from "react";

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
