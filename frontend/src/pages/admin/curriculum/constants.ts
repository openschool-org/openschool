export interface LevelForm {
  label: string;
  grade_id: string;
  sort_order: number;
}

export const EMPTY_LEVEL_FORM: LevelForm = { label: "", grade_id: "", sort_order: 0 };
