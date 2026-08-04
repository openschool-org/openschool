import api from "../lib/api";

export interface PromotionPreviewRow {
  student_id: string;
  student_name: string;
  student_index: string;
  current_class_id: string;
  current_class_name: string;
  current_grade_id: string;
  current_grade_name: string;
  next_grade_id: string | null;
  next_grade_name: string | null;
  graduating: boolean;
  suggested_class_id: string | null;
  suggested_class_name: string | null;
  total_marks?: number;
  total_max_marks?: number;
}

export interface AssignmentEntry {
  student_id: string;
  class_id: string;
}

export interface CommitAssignmentsRequest {
  academic_year_id: string;
  assignments: AssignmentEntry[];
}

export const promotionApi = {
  preview: (params: { source_year_id: string; target_year_id: string; rank_by_term_id?: string }) =>
    api.get<PromotionPreviewRow[]>("/promotion/preview", { params }).then((r) => r.data),

  commit: (data: CommitAssignmentsRequest) =>
    api.post<{ assigned: number }>("/promotion/commit", data).then((r) => r.data),
};
