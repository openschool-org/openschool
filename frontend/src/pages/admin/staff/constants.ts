import { NON_ACADEMIC_DESIGNATIONS } from "../../../services/nonAcademicStaff";
import type { NonAcademicEmploymentStatus } from "../../../services/nonAcademicStaff";

export const EMPLOYMENT_STATUSES: { value: NonAcademicEmploymentStatus; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "resigned", label: "Resigned" },
  { value: "transferred", label: "Transferred" },
];

export function designationLabel(value: string) {
  return NON_ACADEMIC_DESIGNATIONS.find((d) => d.value === value)?.label ?? value;
}
