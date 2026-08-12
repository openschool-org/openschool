import type { RecipientRule } from "../../services/notifications/notification";

// Rules have no id of their own (they're filter descriptors, not entities),
// but the id field each type actually sets is enough to build a stable key
// — needed since this list is removable mid-list via each chip's close
// button, where an index key would cause React to reuse/misattribute DOM
// nodes after a removal.
export function ruleKey(rule: RecipientRule): string {
  return [
    rule.type,
    rule.grade_id,
    rule.class_id,
    rule.grade_section_id,
    rule.subject_id,
    rule.subject_audience,
    rule.student_id,
    rule.guardian_id,
    rule.teacher_id,
  ]
    .filter(Boolean)
    .join(":");
}
