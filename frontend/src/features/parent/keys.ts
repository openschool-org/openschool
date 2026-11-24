export const parentKeys = {
  all: ["parent"] as const,
  children: () => ["parent", "children"] as const,
  summary: () => ["parent", "children", "summary"] as const,
  childAttendance: (studentId: string) => ["parent", "children", studentId, "attendance"] as const,
  childMarkHistory: (studentId: string) => ["parent", "children", studentId, "marks", "history"] as const,
};
