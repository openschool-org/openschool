import { useQuery } from "@tanstack/react-query";
import { searchApi } from "../services/search";

export const globalSearchKey = (q: string) => ["global-search", q];

// Powers the admin header's jump-to-record search box. Only fires once the
// user has typed a couple of characters — the caller debounces the input
// itself before it reaches here.
export const useGlobalSearch = (q: string) =>
  useQuery({
    queryKey: globalSearchKey(q),
    queryFn: () => searchApi.global(q),
    enabled: q.trim().length >= 2,
  });
