import api from "@/shared/api/client";


export interface AttendanceSession {
  id: string;
  class_id: string;
  taken_by: string;
  // name with initials of whoever opened the session; only on the single-session response
  taken_by_name?: string;
  date: string;
  created_at: string | null;
  // only on a class's session list
  present_count?: number;
  absent_count?: number;
  late_count?: number;
}

export interface CreateSessionRequest {
  class_id: string;
  date: string; // YYYY-MM-DD
}

export interface AttendanceRecordRow {
  id: string;
  session_id: string;
  student_id: string;
  student_name: string;
  student_index: string;
  status: "present" | "absent" | "late" | "excused";
  note: string | null;
}

// Matches db.ListAttendanceByStudentRow
export interface StudentAttendanceRow {
  id: string;
  session_id: string;
  student_id: string;
  status: "present" | "absent" | "late" | "excused";
  note: string | null;
  session_date: string;
  class_name: string;
}

export interface MarkAttendanceRequest {
  records: {
    student_id: string;
    status: "present" | "absent" | "late" | "excused";
    note?: string;
  }[];
  // students whose earlier mark was removed; the server deletes those records
  cleared?: string[];
  // Required by convention when an admin edits a session after its 24h
  // lock, recorded in the audit log.
  reason?: string;
}

export interface DailySession extends AttendanceSession {
  class_name: string;
  grade_name: string;
  teacher_name: string;
  enrolled_count: number;
  marked_count: number;
}

export const attendanceApi = {
  listSessionsByClass: (classId: string) =>
    api
      .get<AttendanceSession[]>(`/classes/${classId}/attendance/sessions`)
      .then((r) => r.data),

  listSessionsByDate: (date: string) =>
    api
      .get<DailySession[]>("/attendance/sessions", { params: { date } })
      .then((r) => r.data),

  createSession: (data: CreateSessionRequest) =>
    api.post<AttendanceSession>("/attendance/sessions", data).then((r) => r.data),

  getSession: (id: string) =>
    api.get<AttendanceSession>(`/attendance/sessions/${id}`).then((r) => r.data),

  listRecords: (sessionId: string) =>
    api
      .get<AttendanceRecordRow[]>(`/attendance/sessions/${sessionId}/records`)
      .then((r) => r.data),

  markAttendance: (sessionId: string, data: MarkAttendanceRequest) =>
    api
      .post(`/attendance/sessions/${sessionId}/records`, data)
      .then((r) => r.data),

  // cascades to every attendance record already written for the session
  deleteSession: (id: string) =>
    api.delete(`/attendance/sessions/${id}`).then((r) => r.data),

  listByStudent: (studentId: string) =>
    api.get<StudentAttendanceRow[]>(`/students/${studentId}/attendance`).then((r) => r.data),
};
