import { useQueries } from "@tanstack/react-query";
import { timetableApi } from "@/features/timetable/api/timetable";
import { timetableKeys } from "@/features/timetable/keys";
import { sharedBells } from "@/features/timetable/lib/sharedBells";
import type { TeacherScheduleEntry } from "@/features/timetable/api/timetable";

// Bell times for a teacher's week, read from her classes' published timetables (same cache as the class view).
export function useTeacherBells(schedule: TeacherScheduleEntry[] | undefined, academicYearId: string) {
  const classIds = [...new Set((schedule ?? []).map((e) => e.class_id))];
  const results = useQueries({
    queries: classIds.map((classId) => ({
      queryKey: timetableKeys.publishedForClass(classId, academicYearId),
      queryFn: () => timetableApi.publishedForClass(classId, academicYearId),
      enabled: !!academicYearId,
      retry: false,
    })),
  });
  return sharedBells(results.map((r) => r.data?.periods));
}
