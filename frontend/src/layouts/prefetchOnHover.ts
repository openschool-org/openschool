import type { QueryClient } from "@tanstack/react-query";
import { studentsPageOptions } from "@/features/students/queries/useStudents";
import { teachersPageOptions } from "@/features/teachers/queries/useTeachers";
import { guardiansPageOptions } from "@/features/guardians/queries/useGuardians";

// Sidebar links feel instant when the next page's first data request has
// already started by the time the user clicks
// (docs/SECURITY_AND_PERFORMANCE_PLAYBOOK.md section 5). Keyed by route
// path rather than threaded through the nav config data, so adding an
// entry here doesn't touch every portal's nav file. Only the highest-
// traffic paginated list pages are covered - extend this map as more
// pages get their own server-paginated query.
// Each entry's params must match the target page's *initial* query exactly
// (query keys are compared by value) - prefetching with different defaults
// (e.g. `{}`) populates a cache entry the page never reads, so it still
// issues its own request on mount and the prefetch is wasted.
const PREFETCHERS: Record<string, (queryClient: QueryClient) => void> = {
  "/students": (queryClient) => void queryClient.prefetchQuery(
    studentsPageOptions({ limit: 25, offset: 0, search: "", grade: "", class: "", gender: "", house: "" }),
  ),
  "/teachers": (queryClient) => void queryClient.prefetchQuery(
    teachersPageOptions({ limit: 25, offset: 0, search: "", status: "" }),
  ),
  "/guardians": (queryClient) => void queryClient.prefetchQuery(
    guardiansPageOptions({ limit: 10, offset: 0, search: "", orphansOnly: false }),
  ),
};

export function prefetchForPath(queryClient: QueryClient, path: string) {
  PREFETCHERS[path]?.(queryClient);
}
