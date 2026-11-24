import type { StudentListParams } from "@/features/students/api/student";

// Query keys for the students feature. Everything nests under one root so prefix invalidation is safe.
export const studentKeys = {
  all: ["students"] as const,
  // params in the key: a different page/search/filter combo is a different cache entry.
  list: (params: StudentListParams = {}) => ["students", "list", params] as const,
  detail: (id: string) => ["students", "detail", id] as const,
  withClass: (id: string) => ["students", "detail", id, "class"] as const,
  enrollments: (id: string, yearId: string) => ["students", "detail", id, "enrollments", yearId] as const,
  byClass: (classId: string) => ["students", "by-class", classId] as const,
  me: {
    profile: () => ["students", "me", "profile"] as const,
    attendance: () => ["students", "me", "attendance"] as const,
    markHistory: () => ["students", "me", "marks", "history"] as const,
  },
};
