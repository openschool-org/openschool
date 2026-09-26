export const attendanceKeys = {
  all: ["attendance"] as const,
  classSessions: (classId: string) => ["attendance", "sessions", "by-class", classId] as const,
  dailySessions: (date: string) => ["attendance", "sessions", "by-date", date] as const,
  session: (id: string) => ["attendance", "sessions", "detail", id] as const,
  sessionRecords: (id: string) => ["attendance", "sessions", "detail", id, "records"] as const,
  byStudent: (studentId: string) => ["attendance", "by-student", studentId] as const,
};

export const staffAttendanceKeys = {
  all: ["staff-attendance"] as const,
  byDate: (date: string) => ["staff-attendance", "by-date", date] as const,
  roster: (date: string, params: object) => ["staff-attendance", "roster", date, params] as const,
  monthly: (year: number, month: number, params: object) => ["staff-attendance", "monthly", year, month, params] as const,
  myHistory: (year: number, month: number) => ["staff-attendance", "me", year, month] as const,
};
