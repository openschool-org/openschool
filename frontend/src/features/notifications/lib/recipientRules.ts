import type { Audience, NotifyScope, RecipientRule, RecipientRuleType, SubjectAudience } from "@/features/notifications/api/notification";

export type TargetRuleType = Exclude<RecipientRuleType, "everyone">;

export const RULE_TYPES: { value: RecipientRuleType; label: string }[] = [
  { value: "everyone", label: "Everyone" },
  { value: "grade", label: "By grade" },
  { value: "class", label: "By class" },
  { value: "grade_section", label: "By grade section" },
  { value: "subject", label: "By subject" },
  { value: "society", label: "By society" },
  { value: "student", label: "Specific student" },
  { value: "guardian", label: "Specific guardian" },
  { value: "teacher", label: "Specific teacher" },
];

// Rule types the sender may use: grade, section and school-wide subject rules need grade authority.
export function allowedRuleTypes(scope: NotifyScope | undefined, canBroadcastEveryone: boolean): RecipientRuleType[] {
  if (!scope) return ["teacher"];
  if (scope.full) return RULE_TYPES.map((r) => r.value).filter((v) => v !== "everyone" || canBroadcastEveryone);
  const types: RecipientRuleType[] = [];
  if (canBroadcastEveryone) types.push("everyone");
  if (scope.grade_ids.length) types.push("grade");
  if (scope.classes.length) types.push("class");
  if (scope.grade_section_ids.length) types.push("grade_section");
  if (scope.grade_ids.length) types.push("subject");
  if (scope.societies.length) types.push("society");
  if (scope.classes.length) types.push("student", "guardian");
  types.push("teacher");
  return types;
}

export const AUDIENCE_OPTIONS: Record<"class" | "society", { value: Audience; label: string }[]> = {
  class: [
    { value: "all", label: "Everyone in the class (students, guardians, teachers)" },
    { value: "students", label: "Students only" },
    { value: "guardians", label: "Guardians only" },
  ],
  society: [
    { value: "students", label: "Members" },
    { value: "guardians", label: "Members' guardians" },
    { value: "all", label: "Members and their guardians" },
  ],
};

const AUDIENCE_SUFFIX: Record<Audience, string> = { all: "", students: " (Students)", guardians: " (Guardians)" };

// The id field each rule type sends, and the label used when the picked item is no longer loaded.
const TARGETS: Record<TargetRuleType, { field: keyof RecipientRule; fallback: string }> = {
  grade: { field: "grade_id", fallback: "Grade" },
  class: { field: "class_id", fallback: "Class" },
  grade_section: { field: "grade_section_id", fallback: "Grade section" },
  subject: { field: "subject_id", fallback: "Subject" },
  society: { field: "society_id", fallback: "Society" },
  student: { field: "student_id", fallback: "Student" },
  guardian: { field: "guardian_id", fallback: "Guardian" },
  teacher: { field: "teacher_id", fallback: "Teacher" },
};

// Builds the rule for a picked target. Subject, class and society rules also carry their audience.
export function buildRule(type: TargetRuleType, id: string, label: string | undefined, subjectAudience: SubjectAudience, audience?: Audience): RecipientRule {
  const name = label ?? TARGETS[type].fallback;
  if (type === "subject") {
    return { type, subject_id: id, subject_audience: subjectAudience, label: `${name} (${subjectAudience === "teachers" ? "Teachers" : "Students"})` };
  }
  if ((type === "class" && audience && audience !== "all") || type === "society") {
    const picked = audience ?? "students";
    const suffix = type === "society" && picked === "all" ? " (Members and guardians)" : AUDIENCE_SUFFIX[picked] || "";
    return { type, [TARGETS[type].field]: id, audience: picked, label: `${name}${suffix}` };
  }
  return { type, [TARGETS[type].field]: id, label: name };
}
