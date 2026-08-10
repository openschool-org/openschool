import api from "../lib/api";

export type ActivityCategory = "club" | "sport" | "society" | "competition";
export type DisciplinarySeverity = "minor" | "major" | "severe";

export const ACTIVITY_CATEGORIES: { value: ActivityCategory; label: string }[] = [
  { value: "club", label: "Club" },
  { value: "sport", label: "Sport" },
  { value: "society", label: "Society" },
  { value: "competition", label: "Competition" },
];

export const DISCIPLINARY_SEVERITIES: { value: DisciplinarySeverity; label: string }[] = [
  { value: "minor", label: "Minor" },
  { value: "major", label: "Major" },
  { value: "severe", label: "Severe" },
];

// Matches db.ListProgressReportsByStudentRow
export interface ProgressReport {
  id: string;
  student_id: string;
  term_id: string;
  narrative: string;
  written_by: string | null;
  created_at: string | null;
  updated_at: string | null;
  term_name: string;
}

export interface CreateProgressReportRequest {
  term_id: string;
  narrative: string;
}

// Matches db.StudentActivity
export interface StudentActivity {
  id: string;
  student_id: string;
  academic_year_id: string;
  category: ActivityCategory;
  name: string;
  role: string | null;
  achievement: string | null;
  created_at: string | null;
}

export interface CreateActivityRequest {
  academic_year_id: string;
  category: ActivityCategory;
  name: string;
  role?: string;
  achievement?: string;
}

export type UpdateActivityRequest = Omit<CreateActivityRequest, "academic_year_id">;

// Matches db.StudentLeadershipRole
export interface LeadershipRole {
  id: string;
  student_id: string;
  academic_year_id: string;
  title: string;
  scope: string | null;
  created_at: string | null;
}

export interface CreateLeadershipRoleRequest {
  academic_year_id: string;
  title: string;
  scope?: string;
}

// Matches db.StudentAward
export interface StudentAward {
  id: string;
  student_id: string;
  academic_year_id: string;
  title: string;
  category: string | null;
  awarded_date: string;
  description: string | null;
  created_at: string | null;
}

export interface CreateAwardRequest {
  academic_year_id: string;
  title: string;
  category?: string;
  awarded_date: string; // RFC3339 timestamp
  description?: string;
}

// Matches db.StudentDisciplinaryRecord
export interface DisciplinaryRecord {
  id: string;
  student_id: string;
  academic_year_id: string;
  incident_date: string;
  description: string;
  action_taken: string | null;
  severity: DisciplinarySeverity;
  recorded_by: string | null;
  created_at: string | null;
}

export interface CreateDisciplinaryRecordRequest {
  academic_year_id: string;
  incident_date: string; // RFC3339 timestamp
  description: string;
  action_taken?: string;
  severity: DisciplinarySeverity;
}

// Matches db.ListPrefectAppointmentsByStudentRow
export interface PrefectAppointment {
  id: string;
  academic_year_id: string;
  rank: string;
  created_at: string | null;
  academic_year_label: string;
}

export const studentPortfolioApi = {
  listProgressReports: (studentId: string) =>
    api.get<ProgressReport[]>(`/students/${studentId}/progress-reports`).then((r) => r.data),
  createProgressReport: (studentId: string, data: CreateProgressReportRequest) =>
    api.post<ProgressReport>(`/students/${studentId}/progress-reports`, data).then((r) => r.data),
  updateProgressReport: (studentId: string, recordId: string, narrative: string) =>
    api
      .put<ProgressReport>(`/students/${studentId}/progress-reports/${recordId}`, { narrative })
      .then((r) => r.data),
  deleteProgressReport: (studentId: string, recordId: string) =>
    api.delete(`/students/${studentId}/progress-reports/${recordId}`).then((r) => r.data),

  listActivities: (studentId: string) =>
    api.get<StudentActivity[]>(`/students/${studentId}/activities`).then((r) => r.data),
  createActivity: (studentId: string, data: CreateActivityRequest) =>
    api.post<StudentActivity>(`/students/${studentId}/activities`, data).then((r) => r.data),
  deleteActivity: (studentId: string, recordId: string) =>
    api.delete(`/students/${studentId}/activities/${recordId}`).then((r) => r.data),

  listLeadershipRoles: (studentId: string) =>
    api.get<LeadershipRole[]>(`/students/${studentId}/leadership-roles`).then((r) => r.data),
  createLeadershipRole: (studentId: string, data: CreateLeadershipRoleRequest) =>
    api.post<LeadershipRole>(`/students/${studentId}/leadership-roles`, data).then((r) => r.data),
  deleteLeadershipRole: (studentId: string, recordId: string) =>
    api.delete(`/students/${studentId}/leadership-roles/${recordId}`).then((r) => r.data),

  listAwards: (studentId: string) =>
    api.get<StudentAward[]>(`/students/${studentId}/awards`).then((r) => r.data),
  createAward: (studentId: string, data: CreateAwardRequest) =>
    api.post<StudentAward>(`/students/${studentId}/awards`, data).then((r) => r.data),
  deleteAward: (studentId: string, recordId: string) =>
    api.delete(`/students/${studentId}/awards/${recordId}`).then((r) => r.data),

  listDisciplinaryRecords: (studentId: string) =>
    api.get<DisciplinaryRecord[]>(`/students/${studentId}/disciplinary-records`).then((r) => r.data),
  createDisciplinaryRecord: (studentId: string, data: CreateDisciplinaryRecordRequest) =>
    api.post<DisciplinaryRecord>(`/students/${studentId}/disciplinary-records`, data).then((r) => r.data),
  deleteDisciplinaryRecord: (studentId: string, recordId: string) =>
    api.delete(`/students/${studentId}/disciplinary-records/${recordId}`).then((r) => r.data),

  listPrefectAppointments: (studentId: string) =>
    api
      .get<PrefectAppointment[]>(`/students/${studentId}/prefect-appointments`)
      .then((r) => r.data),
};
