import { useState } from "react";
import { useCurrentAcademicYear } from "@/features/school/queries/useAcademicYears";
import { useGrades } from "@/features/academics/queries/useGrades";
import { useCurrentClasses } from "@/features/academics/queries/useClasses";
import { useGradeSections } from "@/features/timetable/queries/useGradeSections";
import { useSubjects } from "@/features/curriculum/queries/useSubjects";
import { useStudents } from "@/features/students/queries/useStudents";
import { useGuardians } from "@/features/guardians/queries/useGuardians";
import { useTeachers } from "@/features/teachers/queries/useTeachers";
import type { TargetRuleType } from "@/features/notifications/lib/recipientRules";
import type { NotifyScope } from "@/features/notifications/api/notification";
import { displayName } from "@/shared/lib/name";

// One pickable target: `text` is shown in the search box, `label` names the rule once added.
export interface RecipientTarget {
  id: string;
  text: string;
  label: string;
}

export interface TargetSource {
  name: string;
  items: RecipientTarget[];
  // People lists are searched on the server; the rest filter what is loaded.
  onSearch?: (q: string) => void;
}

// Everything the recipient picker can target, limited to the sender's scope, normalised so one combobox serves every rule type.
export function useRecipientTargets(scope: NotifyScope | undefined): Record<TargetRuleType, TargetSource> {
  const { data: currentYear } = useCurrentAcademicYear();
  const { data: grades } = useGrades();
  const { data: classes } = useCurrentClasses();
  const { data: gradeSections } = useGradeSections(currentYear?.id ?? "");
  const { data: subjects } = useSubjects();
  const [studentSearch, setStudentSearch] = useState("");
  const { data: students } = useStudents({ limit: 25, search: studentSearch });
  const [guardianSearch, setGuardianSearch] = useState("");
  const { data: guardians } = useGuardians({ limit: 25, search: guardianSearch });
  const [teacherSearch, setTeacherSearch] = useState("");
  const { data: teachers } = useTeachers({ limit: 25, search: teacherSearch });

  const named = (rows: { id: string; name: string }[] | undefined) => (rows ?? []).map((r) => ({ id: r.id, text: r.name, label: r.name }));
  const full = !!scope?.full;
  // A teacher only sees the grades, sections and classes they may message.
  const within = <T extends { id: string }>(rows: T[] | undefined, ids: string[] | undefined) => (full ? rows : (rows ?? []).filter((r) => ids?.includes(r.id)));
  const classItems = full
    ? (classes ?? []).map((c) => ({ id: c.id, text: `${c.grade_name} - ${c.name}`, label: `${c.grade_name} - ${c.name}` }))
    : (scope?.classes ?? []).map((c) => ({
        id: c.id,
        text: `${c.grade_name} - ${c.name}${c.is_form_class ? " (my class)" : ""}`,
        label: `${c.grade_name} - ${c.name}`,
      }));

  return {
    grade: { name: "grades", items: named(within(grades, scope?.grade_ids)) },
    class: { name: "classes", items: classItems },
    grade_section: { name: "grade sections", items: named(within(gradeSections, scope?.grade_section_ids)) },
    society: { name: "societies", items: named(scope?.societies) },
    subject: { name: "subjects", items: named(subjects) },
    student: {
      name: "students",
      items: (students?.items ?? []).map((s) => ({ id: s.id, text: `${displayName(s)} - ${s.index_number}`, label: displayName(s) })),
      onSearch: setStudentSearch,
    },
    guardian: {
      name: "guardians",
      items: (guardians?.items ?? []).map((g) => ({ id: g.id, text: `${displayName(g)} - ${g.phone}`, label: displayName(g) })),
      onSearch: setGuardianSearch,
    },
    teacher: {
      name: "teachers",
      items: (teachers?.items ?? []).map((t) => ({ id: t.id, text: `${displayName(t)} - ${t.employee_number}`, label: displayName(t) })),
      onSearch: setTeacherSearch,
    },
  };
}
