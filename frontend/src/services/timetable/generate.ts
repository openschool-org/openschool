import api from "../../lib/api";

export interface GenerationGap {
  subject_name: string;
  teacher_name?: string;
  reason: string;
}

export interface ClassGenerationResult {
  class_id: string;
  class_name: string;
  timetable_id?: string;
  placed: number;
  required: number;
  gaps: GenerationGap[];
  skipped: boolean;
  skip_reason?: string;
}

export interface GenerationResult {
  classes: ClassGenerationResult[];
}

export interface GenerateTimetablesRequest {
  grade_section_id: string;
  academic_year_id: string;
}

export const generateApi = {
  generate: (data: GenerateTimetablesRequest) =>
    api.post<GenerationResult>("/timetables/generate", data).then((r) => r.data),
};
