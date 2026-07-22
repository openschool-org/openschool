import api from "../lib/api";

export interface ClassWithDetails {
  id: string;
  grade_id: string;
  academic_year_id: string;
  form_teacher_id: string | null;
  stream_id: string | null;
  stream_group_id: string | null;
  name: string;
  created_at: string | null;
  grade_name: string;
  academic_year_label: string;
}

export interface ClassRow {
  id: string;
  grade_id: string;
  academic_year_id: string;
  form_teacher_id: string | null;
  stream_id: string | null;
  stream_group_id: string | null;
  name: string;
  created_at: string | null;
}

export interface UpdateClassRequest {
  name: string;
  form_teacher_id?: string | null;
}

export interface CreateClassRequest {
  grade_id: string;
  academic_year_id: string;
  name: string;
  form_teacher_id?: string | null;
  stream_id?: string | null;
  stream_group_id?: string | null;
}

export interface SubjectTeacher {
  subject_id: string;
  subject_name: string;
  subject_code: string;
  teacher_id: string;
  teacher_name: string;
}

export const classApi = {
  listCurrent: () =>
    api.get<ClassWithDetails[]>("/classes/current").then((r) => r.data),

  listByAcademicYear: (academicYearId: string) =>
    api
      .get<ClassWithDetails[]>(`/academic-years/${academicYearId}/classes`)
      .then((r) => r.data),

  get: (id: string) => api.get<ClassRow>(`/classes/${id}`).then((r) => r.data),

  create: (data: CreateClassRequest) =>
    api.post<ClassWithDetails>("/classes", data).then((r) => r.data),

  update: (id: string, data: UpdateClassRequest) =>
    api.put<ClassRow>(`/classes/${id}`, data).then((r) => r.data),

  remove: (id: string) => api.delete(`/classes/${id}`).then((r) => r.data),

  assignFormTeacher: (id: string, teacherId: string) =>
    api
      .put<ClassRow>(`/classes/${id}/form-teacher`, { teacher_id: teacherId })
      .then((r) => r.data),

  listSubjectTeachers: (id: string) =>
    api.get<SubjectTeacher[]>(`/classes/${id}/subject-teachers`).then((r) => r.data),

  enrollStudent: (id: string, studentId: string) =>
    api.post(`/classes/${id}/students/${studentId}/enroll`).then((r) => r.data),

  unenrollStudent: (id: string, studentId: string) =>
    api.delete(`/classes/${id}/students/${studentId}/unenroll`).then((r) => r.data),
};
