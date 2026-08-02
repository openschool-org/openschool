import api from "../../lib/api";

export interface TimetableSettings {
  academic_year_id: string;
  school_start_time: string;
  school_end_time: string;
  number_of_periods: number;
  period_duration_minutes: number;
  interval_duration_minutes: number;
}

export const timetableSettingsApi = {
  getByYear: (academicYearId: string) =>
    api.get<TimetableSettings>(`/timetable-settings/${academicYearId}`).then((r) => r.data),

  upsert: (data: TimetableSettings) =>
    api.put<TimetableSettings>("/timetable-settings", data).then((r) => r.data),
};
