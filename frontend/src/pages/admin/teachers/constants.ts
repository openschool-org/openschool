import type { TeacherTitle, TeacherEmploymentStatus } from "../../../services/teacher";

export const TITLES: TeacherTitle[] = ["Mr", "Miss", "Mrs", "Ms", "Dr", "Von", "Prof"];

export const EMPLOYMENT_STATUSES: { value: TeacherEmploymentStatus; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "resigned", label: "Resigned" },
  { value: "transferred", label: "Transferred" },
];
