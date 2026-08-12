export type GradeSectionForm = {
  name: string;
  interval_start_time: string;
  interval_end_time: string;
  sort_order: number;
};

export const EMPTY_GRADE_SECTION_FORM: GradeSectionForm = {
  name: "",
  interval_start_time: "10:30",
  interval_end_time: "11:00",
  sort_order: 0,
};
