import api from "../lib/api";

export interface EnrollmentPick {
  group_id: string;
  subject_id: string;
  medium_id?: string;
}

export interface SubmitEnrollmentRequest {
  academic_year_id: string;
  level_id: string;
  picks: EnrollmentPick[];
}

export interface GroupValidationError {
  group_id: string;
  label: string;
  message: string;
}

export interface EnrollmentValidationResponse {
  valid: boolean;
  errors: GroupValidationError[] | null;
}

export interface Enrollment {
  student_id: string;
  academic_year_id: string;
  group_id: string;
  group_label: string;
  level_id: string;
  level_label: string;
  subject_id: string;
  subject_name: string;
  subject_code: string;
  subject_type: string | null;
  medium_id: string | null;
  medium_name: string | null;
  enrolled_at: string;
}

export const enrollmentApi = {
  listByStudent: (studentId: string, academicYearId: string) =>
    api
      .get<Enrollment[]>(`/students/${studentId}/enrollments`, {
        params: { academic_year_id: academicYearId },
      })
      .then((r) => r.data),

  validate: (data: SubmitEnrollmentRequest) =>
    api
      .post<EnrollmentValidationResponse>("/enrollments/validate", data)
      .then((r) => r.data),

  submit: (studentId: string, data: SubmitEnrollmentRequest) =>
    api
      .post<EnrollmentValidationResponse>(
        `/students/${studentId}/enrollments`,
        data,
      )
      .then((r) => r.data),
};
