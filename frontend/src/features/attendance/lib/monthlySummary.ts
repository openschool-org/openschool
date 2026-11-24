export type AttendanceStatus = "present" | "absent" | "late" | "excused";

export interface AttendanceLike {
  session_date: string;
  status: string;
}

export interface MonthSummary {
  // YYYY-MM
  month: string;
  days: number;
  present: number;
  late: number;
  absent: number;
  excused: number;
  // Present or late, as a 0-100 share of recorded days; null when nothing is recorded.
  rate: number | null;
}

// Groups records by calendar month, newest month first.
export function summariseByMonth(rows: AttendanceLike[]): MonthSummary[] {
  const byMonth = new Map<string, MonthSummary>();
  for (const row of rows) {
    const month = row.session_date.slice(0, 7);
    let summary = byMonth.get(month);
    if (!summary) {
      summary = { month, days: 0, present: 0, late: 0, absent: 0, excused: 0, rate: null };
      byMonth.set(month, summary);
    }
    summary.days += 1;
    if (row.status === "present" || row.status === "late" || row.status === "absent" || row.status === "excused") {
      summary[row.status] += 1;
    }
  }
  return [...byMonth.values()]
    .map((s) => ({ ...s, rate: s.days ? Math.round(((s.present + s.late) / s.days) * 100) : null }))
    .sort((a, b) => b.month.localeCompare(a.month));
}
