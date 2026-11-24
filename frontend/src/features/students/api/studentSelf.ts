import api from "@/shared/api/client";
import type { ChildAttendanceRecord } from "@/features/parent/api/parent";
import type { MarkHistoryYear } from "@/features/marks/api/termMark";

// Matches selfservice.StudentProfile
export interface MyStudentProfile {
  id: string;
  full_name: string;
  name_with_initials: string;
  calling_name: string;
  email: string | null;
  address: string | null;
  whatsapp: string | null;
  index_number: string;
  gender: string | null;
  class_name: string | null;
  grade_name: string | null;
  house_name: string | null;
  academic_year: string | null;
  form_teacher_name: string | null;
  phone: string | null;
}

export const studentSelfApi = {
  profile: () => api.get<MyStudentProfile>("/me/student").then((r) => r.data),

  attendance: () =>
    api.get<ChildAttendanceRecord[]>("/me/student/attendance").then((r) => r.data),


  markHistory: () => api.get<MarkHistoryYear[]>("/me/student/marks/history").then((r) => r.data),
};
