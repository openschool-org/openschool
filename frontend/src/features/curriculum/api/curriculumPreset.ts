import api from "@/shared/api/client";

// Matches services.PresetSummary
export interface CurriculumPresetSummary {
  subjects_created: number;
  levels_created: number;
  groups_created: number;
  links_created: number;
  grades_covered: number[] | null;
  grades_skipped: number[] | null;
}

export const curriculumPresetApi = {
  run: () => api.post<CurriculumPresetSummary>("/curriculum/preset").then((r) => r.data),
};
