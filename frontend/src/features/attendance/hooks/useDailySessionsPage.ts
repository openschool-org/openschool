import { useState } from "react";
import { useSearchParams } from "react-router";
import { useDailySessions, useCreateSession } from "@/features/attendance/queries/useAttendance";
import { useCurrentClasses } from "@/features/academics/queries/useClasses";
import { useToast } from "@/shared/ui/toast/useToast";

// The attendance day: sessions (optionally one grade), classes still without a session, and creating them all.
// scopedClasses limits it to a section head's classes; the admin passes nothing and gets every class.
export function useDailySessionsPage(date: string, scopedClasses?: { id: string; name: string; grade_name: string }[]) {
  const { data: allSessions, isLoading, isError, refetch } = useDailySessions(date);
  const { data: schoolClasses } = useCurrentClasses({ enabled: !scopedClasses });
  const allClasses = scopedClasses ?? schoolClasses;
  // ?grade=<name> (from the dashboard's attendance by grade) narrows the page to one grade.
  const [params, setParams] = useSearchParams();
  const grade = params.get("grade");
  const sessions = (grade ? allSessions?.filter((s) => s.grade_name === grade) : allSessions) ?? [];
  const classes = (grade ? allClasses?.filter((c) => c.grade_name === grade) : allClasses) ?? [];
  const createSession = useCreateSession();
  const [bulkCreating, setBulkCreating] = useState(false);
  const { showToast } = useToast();

  const existingClassIds = new Set(sessions.map((s) => s.class_id));
  const missingClasses = classes.filter((c) => !existingClassIds.has(c.id));
  const marked = sessions.filter((s) => s.marked_count > 0).length;

  const createAllSessions = async () => {
    setBulkCreating(true);
    const results = await Promise.allSettled(missingClasses.map((c) => createSession.mutateAsync({ class_id: c.id, date })));
    setBulkCreating(false);
    const created = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.length - created;
    if (failed === 0) {
      showToast({ kind: "success", title: `Created ${created} session${created === 1 ? "" : "s"}` });
      return;
    }
    showToast({
      kind: failed === results.length ? "error" : "warning",
      title: `Created ${created} of ${results.length} sessions`,
      subtitle: `${failed} failed - a class may already have a session, or has no enrolled students.`,
    });
  };

  return {
    grade,
    clearGrade: () => setParams({}, { replace: true }),
    sessions,
    isLoading,
    isError,
    refetch,
    missingCount: missingClasses.length,
    marked,
    pending: sessions.length - marked,
    bulkCreating,
    createAllSessions,
  };
}
