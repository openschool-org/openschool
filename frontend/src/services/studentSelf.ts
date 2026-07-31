import api from "../lib/api";
import type { ChildAttendanceRecord, ChildMark } from "./parent";

// Matches db.GetStudentWithClassRow
export interface MyStudentProfile {
  id: string;
  full_name: string;
  index_number: string;
  gender: string | null;
  class_name: string | null;
  grade_name: string | null;
  house_name: string | null;
  academic_year: string | null;
}

export const studentSelfApi = {
  profile: () => api.get<MyStudentProfile>("/me/student").then((r) => r.data),

  attendance: () =>
    api.get<ChildAttendanceRecord[]>("/me/student/attendance").then((r) => r.data),

  marks: (termId: string) =>
    api
      .get<ChildMark[]>("/me/student/marks", { params: { term_id: termId } })
      .then((r) => r.data),
};
