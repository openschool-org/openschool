import type { RecipientRule, RecipientRuleType, SubjectAudience } from "@/features/notifications/api/notification";

export type TargetRuleType = Exclude<RecipientRuleType, "everyone">;

export const RULE_TYPES: { value: RecipientRuleType; label: string }[] = [
  { value: "everyone", label: "Everyone" },
  { value: "grade", label: "By grade" },
  { value: "class", label: "By class" },
  { value: "grade_section", label: "By grade section" },
  { value: "subject", label: "By subject" },
  { value: "student", label: "Specific student" },
  { value: "guardian", label: "Specific guardian" },
  { value: "teacher", label: "Specific teacher" },
];

// The id field each rule type sends, and the label used when the picked item is no longer loaded.
const TARGETS: Record<TargetRuleType, { field: keyof RecipientRule; fallback: string }> = {
  grade: { field: "grade_id", fallback: "Grade" },
  class: { field: "class_id", fallback: "Class" },
  grade_section: { field: "grade_section_id", fallback: "Grade section" },
  subject: { field: "subject_id", fallback: "Subject" },
  student: { field: "student_id", fallback: "Student" },
  guardian: { field: "guardian_id", fallback: "Guardian" },
  teacher: { field: "teacher_id", fallback: "Teacher" },
};

// Builds the rule for a picked target. A subject rule also says whether it reaches students or teachers.
export function buildRule(type: TargetRuleType, id: string, label: string | undefined, audience: SubjectAudience): RecipientRule {
  const name = label ?? TARGETS[type].fallback;
  if (type === "subject") {
    return { type, subject_id: id, subject_audience: audience, label: `${name} (${audience === "teachers" ? "Teachers" : "Students"})` };
  }
  return { type, [TARGETS[type].field]: id, label: name };
}
