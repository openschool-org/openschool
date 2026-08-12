import { useState } from "react";
import { Button, Dropdown } from "@carbon/react";
import { Add } from "@carbon/icons-react";
import { useCurrentAcademicYear } from "../../../queries/useAcademicYears";
import { useGrades } from "../../../queries/useGrades";
import { useCurrentClasses } from "../../../queries/useClasses";
import { useGradeSections } from "../../../queries/timetable/useGradeSections";
import { useSubjects } from "../../../queries/useSubjects";
import { useStudents } from "../../../queries/useStudents";
import { useGuardians } from "../../../queries/useGuardians";
import { useTeachers } from "../../../queries/useTeachers";
import EntityCombobox from "../../../components/common/EntityCombobox";
import type { RecipientRule, RecipientRuleType } from "../../../services/notifications/notification";

const RULE_TYPES: { value: RecipientRuleType; label: string }[] = [
  { value: "everyone", label: "Everyone" },
  { value: "grade", label: "By Grade" },
  { value: "class", label: "By Class" },
  { value: "grade_section", label: "By Grade Section" },
  { value: "subject", label: "By Subject" },
  { value: "student", label: "Specific Student" },
  { value: "guardian", label: "Specific Guardian" },
  { value: "teacher", label: "Specific Teacher" },
];

export default function RecipientPicker({
  onAdd,
  canBroadcastEveryone,
}: {
  onAdd: (rule: RecipientRule) => void;
  canBroadcastEveryone: boolean;
}) {
  const { data: currentYear } = useCurrentAcademicYear();
  const { data: grades } = useGrades();
  const { data: classes } = useCurrentClasses();
  const { data: gradeSections } = useGradeSections(currentYear?.id ?? "");
  const { data: subjects } = useSubjects();
  const { data: students } = useStudents();
  const { data: guardians } = useGuardians();
  const { data: teachers } = useTeachers();

  const [ruleType, setRuleType] = useState<RecipientRuleType>("grade");
  const [selectedId, setSelectedId] = useState("");
  const [subjectAudience, setSubjectAudience] = useState<"students" | "teachers">("students");

  const reset = () => setSelectedId("");

  const availableRuleTypes = canBroadcastEveryone ? RULE_TYPES : RULE_TYPES.filter((r) => r.value !== "everyone");

  const handleAdd = () => {
    if (ruleType === "everyone") {
      onAdd({ type: "everyone", label: "Everyone" });
      return;
    }
    if (!selectedId) return;

    if (ruleType === "grade") {
      const grade = grades?.find((g) => g.id === selectedId);
      onAdd({ type: "grade", grade_id: selectedId, label: grade?.name ?? "Grade" });
    } else if (ruleType === "class") {
      const cls = classes?.find((c) => c.id === selectedId);
      onAdd({ type: "class", class_id: selectedId, label: cls ? `${cls.grade_name} - ${cls.name}` : "Class" });
    } else if (ruleType === "grade_section") {
      const section = gradeSections?.find((s) => s.id === selectedId);
      onAdd({ type: "grade_section", grade_section_id: selectedId, label: section?.name ?? "Grade Section" });
    } else if (ruleType === "subject") {
      const subject = subjects?.find((s) => s.id === selectedId);
      onAdd({
        type: "subject",
        subject_id: selectedId,
        subject_audience: subjectAudience,
        label: `${subject?.name ?? "Subject"} (${subjectAudience === "teachers" ? "Teachers" : "Students"})`,
      });
    } else if (ruleType === "student") {
      const student = students?.find((s) => s.id === selectedId);
      onAdd({ type: "student", student_id: selectedId, label: student?.full_name ?? "Student" });
    } else if (ruleType === "guardian") {
      const guardian = guardians?.find((g) => g.id === selectedId);
      onAdd({ type: "guardian", guardian_id: selectedId, label: guardian?.full_name ?? "Guardian" });
    } else if (ruleType === "teacher") {
      const teacher = teachers?.find((t) => t.id === selectedId);
      onAdd({ type: "teacher", teacher_id: selectedId, label: teacher?.full_name ?? "Teacher" });
    }
    reset();
  };

  return (
    <div style={{ display: "grid", gap: "0.75rem" }}>
      <Dropdown
        id="recipient-rule-type"
        titleText="Recipient type"
        label="Choose…"
        items={availableRuleTypes}
        itemToString={(item) => (item as (typeof RULE_TYPES)[number])?.label ?? ""}
        selectedItem={availableRuleTypes.find((r) => r.value === ruleType)}
        onChange={({ selectedItem }) => {
          setRuleType((selectedItem as (typeof RULE_TYPES)[number] | null)?.value ?? ruleType);
          reset();
        }}
      />

      {ruleType === "grade" && (
        <EntityCombobox
          id="rule-grade"
          labelText="Grade"
          items={grades ?? []}
          selectedId={selectedId}
          onSelect={setSelectedId}
          getId={(g) => g.id}
          itemToString={(g) => g.name}
          placeholder="Search grades…"
        />
      )}
      {ruleType === "class" && (
        <EntityCombobox
          id="rule-class"
          labelText="Class"
          items={classes ?? []}
          selectedId={selectedId}
          onSelect={setSelectedId}
          getId={(c) => c.id}
          itemToString={(c) => `${c.grade_name} - ${c.name}`}
          placeholder="Search classes…"
        />
      )}
      {ruleType === "grade_section" && (
        <EntityCombobox
          id="rule-grade-section"
          labelText="Grade section"
          items={gradeSections ?? []}
          selectedId={selectedId}
          onSelect={setSelectedId}
          getId={(s) => s.id}
          itemToString={(s) => s.name}
          placeholder="Search grade sections…"
        />
      )}
      {ruleType === "subject" && (
        <>
          <EntityCombobox
            id="rule-subject"
            labelText="Subject"
            items={subjects ?? []}
            selectedId={selectedId}
            onSelect={setSelectedId}
            getId={(s) => s.id}
            itemToString={(s) => s.name}
            placeholder="Search subjects…"
          />
          <Dropdown
            id="rule-subject-audience"
            titleText="Audience"
            label=""
            items={["students", "teachers"]}
            itemToString={(item) => (item === "teachers" ? "Teachers of this subject" : "Students taking this subject")}
            selectedItem={subjectAudience}
            onChange={({ selectedItem }) => setSubjectAudience((selectedItem as "students" | "teachers") ?? "students")}
          />
        </>
      )}
      {ruleType === "student" && (
        <EntityCombobox
          id="rule-student"
          labelText="Student"
          items={students ?? []}
          selectedId={selectedId}
          onSelect={setSelectedId}
          getId={(s) => s.id}
          itemToString={(s) => `${s.full_name} — ${s.index_number}`}
          placeholder="Search students…"
        />
      )}
      {ruleType === "guardian" && (
        <EntityCombobox
          id="rule-guardian"
          labelText="Guardian"
          items={guardians ?? []}
          selectedId={selectedId}
          onSelect={setSelectedId}
          getId={(g) => g.id}
          itemToString={(g) => `${g.full_name} — ${g.phone}`}
          placeholder="Search guardians…"
        />
      )}
      {ruleType === "teacher" && (
        <EntityCombobox
          id="rule-teacher"
          labelText="Teacher"
          items={teachers ?? []}
          selectedId={selectedId}
          onSelect={setSelectedId}
          getId={(t) => t.id}
          itemToString={(t) => `${t.full_name} — ${t.employee_number}`}
          placeholder="Search teachers…"
        />
      )}

      <Button kind="ghost" size="sm" renderIcon={Add} onClick={handleAdd} disabled={ruleType !== "everyone" && !selectedId}>
        Add recipient
      </Button>
    </div>
  );
}
