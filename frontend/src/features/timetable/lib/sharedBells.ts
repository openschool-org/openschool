import type { TimetablePeriod } from "@/features/timetable/api/gradeSection";

const signature = (periods: TimetablePeriod[]) =>
  [...periods].sort((a, b) => a.sort_order - b.sort_order).map((p) => `${p.slot_type}:${p.period_number ?? "-"}:${p.start_time}-${p.end_time}`).join("|");

// The bell schedule every listed class shares, or undefined when they differ or none is known,
// so a teacher's week only shows times that are true for all of her classes.
export function sharedBells(schedules: (TimetablePeriod[] | undefined)[]): TimetablePeriod[] | undefined {
  const known = schedules.filter((s): s is TimetablePeriod[] => !!s && s.length > 0);
  if (known.length === 0 || known.length !== schedules.length) return undefined;
  const first = signature(known[0]);
  return known.every((s) => signature(s) === first) ? known[0] : undefined;
}
