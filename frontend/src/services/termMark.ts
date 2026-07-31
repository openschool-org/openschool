import api from "../lib/api";

// Matches db.ListClassMarksForTermSubjectRow — one row per enrolled
// student, with their existing mark (if any) for this term+subject.
export interface ClassMarkRow {
  student_id: string;
  student_name: string;
  index_number: string;
  term_mark_id: string | null;
  marks: number | null;
  max_marks: number | null;
}

// Matches db.ListStudentMarksByTermRow
export interface StudentMarkRow {
  id: string;
  marks: number;
  max_marks: number;
  subject_id: string;
  subject_name: string;
  subject_code: string;
}

export interface MarkEntry {
  student_id: string;
  marks: number;
  max_marks: number;
}

export interface BulkUpsertMarksRequest {
  term_id: string;
  subject_id: string;
  entries: MarkEntry[];
}

export const termMarkApi = {
  listClassMarks: (classId: string, termId: string, subjectId: string) =>
    api
      .get<ClassMarkRow[]>(`/classes/${classId}/marks`, {
        params: { term_id: termId, subject_id: subjectId },
      })
      .then((r) => r.data),

  listStudentMarks: (studentId: string, termId: string) =>
    api
      .get<StudentMarkRow[]>(`/students/${studentId}/marks`, {
        params: { term_id: termId },
      })
      .then((r) => r.data),

  bulkUpsert: (classId: string, data: BulkUpsertMarksRequest) =>
    api.put(`/classes/${classId}/marks`, data).then((r) => r.data),
};
