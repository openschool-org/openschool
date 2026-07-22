import { useState } from "react";
import {
  Button,
  Select,
  SelectItem,
  Checkbox,
  Tag,
  InlineNotification,
  InlineLoading,
} from "@carbon/react";
import { Save } from "@carbon/icons-react";
import { AxiosError } from "axios";
import { useCurrentAcademicYear } from "../../../queries/useAcademicYears";
import { useLevels, useLevelTree } from "../../../queries/useCurriculum";
import { useStudentWithClass } from "../../../queries/useStudents";
import { useGrades } from "../../../queries/useGrades";
import {
  useStudentEnrollments,
  useSubmitEnrollments,
} from "../../../queries/useEnrollments";

function pickRuleLabel(min: number, max: number) {
  if (min === max) return `Pick exactly ${min}`;
  return `Pick ${min}–${max}`;
}

function isCompulsory(g: {
  min_select: number;
  max_select: number;
  subjects: unknown[];
}) {
  return (
    g.subjects.length > 0 &&
    g.min_select === g.subjects.length &&
    g.max_select === g.subjects.length
  );
}

export default function SubjectEnrollment({ studentId }: { studentId: string }) {
  const { data: currentYear } = useCurrentAcademicYear();
  const academicYearId = currentYear?.id ?? "";

  const { data: levels } = useLevels();
  const { data: student } = useStudentWithClass(studentId);
  const { data: grades } = useGrades();
  const { data: enrollments } = useStudentEnrollments(
    studentId,
    academicYearId,
  );

  const [selectedLevel, setSelectedLevel] = useState("");
  const [presetDone, setPresetDone] = useState(false);
  const [syncedFor, setSyncedFor] = useState<string | null>(null);
  const [selected, setSelected] = useState<Record<string, string[]>>({});

  const { data: tree, isLoading: treeLoading } = useLevelTree(selectedLevel);
  const submit = useSubmitEnrollments(studentId, academicYearId);

  const studentGradeId = grades?.find((g) => g.name === student?.grade_name)?.id;
  const autoLevelId = studentGradeId
    ? levels?.find((l) => l.grade_id === studentGradeId)?.id
    : undefined;

  // Preselect the level once: an existing enrollment wins; otherwise fall back
  // to the level tied to the student's own class grade.
  if (!presetDone && enrollments) {
    if (enrollments.length > 0) {
      setSelectedLevel(enrollments[0].level_id);
      setPresetDone(true);
    } else if (levels && grades && student) {
      if (autoLevelId) setSelectedLevel(autoLevelId);
      setPresetDone(true);
    }
  }

  if (
    enrollments &&
    tree &&
    tree.level.id === selectedLevel &&
    syncedFor !== selectedLevel
  ) {
    const map: Record<string, string[]> = {};
    for (const e of enrollments) {
      if (e.level_id !== selectedLevel) continue;
      (map[e.group_id] ??= []).push(e.subject_id);
    }
    for (const g of tree.groups) {
      if (isCompulsory(g) && !map[g.id]?.length) {
        map[g.id] = g.subjects.map((s) => s.subject_id);
      }
    }
    setSelected(map);
    setSyncedFor(selectedLevel);
  }

  const changeLevel = (id: string) => {
    submit.reset();
    setSyncedFor(null);
    setSelectedLevel(id);
    if (!id) setSelected({});
  };

  const toggle = (groupId: string, subjectId: string, checked: boolean) =>
    setSelected((prev) => {
      const cur = prev[groupId] ?? [];
      const next = checked
        ? [...cur, subjectId]
        : cur.filter((s) => s !== subjectId);
      return { ...prev, [groupId]: next };
    });

  const handleSave = () => {
    if (!tree) return;
    const picks = tree.groups.flatMap((g) =>
      (selected[g.id] ?? []).map((subjectId) => {
        const subj = g.subjects.find((s) => s.subject_id === subjectId);
        return {
          group_id: g.id,
          subject_id: subjectId,
          medium_id: subj?.medium_id ?? undefined,
        };
      }),
    );
    submit.mutate({
      academic_year_id: academicYearId,
      level_id: selectedLevel,
      picks,
    });
  };

  const validationErrors =
    submit.data && !submit.data.valid ? submit.data.errors ?? [] : [];
  const saved = submit.data?.valid === true;
  const saveError = submit.isError
    ? (submit.error as AxiosError<{ error: string }>).response?.data?.error ??
      "Failed to save enrollment"
    : null;

  return (
    <div className="os-section">
      <div className="os-section__header">
        <h2 className="os-section__title">Subject Enrollment</h2>
      </div>
      <div className="os-section__body">
        {!academicYearId ? (
          <InlineNotification
            kind="info"
            title="No current academic year"
            subtitle="Set a current academic year before assigning subjects."
            lowContrast
            hideCloseButton
            style={{ maxWidth: "100%" }}
          />
        ) : (
          <>
            <div style={{ marginBottom: "1rem" }}>
              <Tag type="cool-gray" size="sm">
                {currentYear?.label}
              </Tag>
            </div>

            <Select
              id="enrollment-level"
              labelText="Curriculum Level"
              value={selectedLevel}
              onChange={(e) => changeLevel(e.target.value)}
            >
              <SelectItem value="" text="Select level…" />
              {levels?.map((l) => (
                <SelectItem key={l.id} value={l.id} text={l.label} />
              ))}
            </Select>

            {selectedLevel && treeLoading && (
              <InlineLoading description="Loading subjects…" />
            )}

            {selectedLevel && tree && (
              <div style={{ marginTop: "1.25rem" }}>
                {tree.groups.map((g) => {
                  const count = (selected[g.id] ?? []).length;
                  const atMax = count >= g.max_select;
                  const compulsory = isCompulsory(g);
                  return (
                    <div key={g.id} style={{ marginBottom: "1.5rem" }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                          marginBottom: "0.5rem",
                        }}
                      >
                        <strong>{g.label}</strong>
                        <Tag type={compulsory ? "blue" : "gray"} size="sm">
                          {compulsory
                            ? "Compulsory"
                            : pickRuleLabel(g.min_select, g.max_select)}
                        </Tag>
                        <span style={{ fontSize: "0.75rem", color: "#8d8d8d" }}>
                          {count} selected
                        </span>
                      </div>
                      {g.subjects.map((s) => {
                        const checked = (selected[g.id] ?? []).includes(
                          s.subject_id,
                        );
                        return (
                          <Checkbox
                            key={s.subject_id}
                            id={`${g.id}-${s.subject_id}`}
                            labelText={
                              s.medium_name
                                ? `${s.subject_name} (${s.medium_name})`
                                : s.subject_name
                            }
                            checked={checked || compulsory}
                            disabled={compulsory || (!checked && atMax)}
                            onChange={(_e, { checked: c }) =>
                              toggle(g.id, s.subject_id, c)
                            }
                          />
                        );
                      })}
                    </div>
                  );
                })}

                {validationErrors.length > 0 && (
                  <InlineNotification
                    kind="error"
                    title="Some groups need attention"
                    subtitle={validationErrors
                      .map((e) => `${e.label}: ${e.message}`)
                      .join(" · ")}
                    lowContrast
                    hideCloseButton
                    style={{ marginBottom: "1rem", maxWidth: "100%" }}
                  />
                )}

                {saveError && (
                  <InlineNotification
                    kind="error"
                    title="Error"
                    subtitle={saveError}
                    lowContrast
                    hideCloseButton
                    style={{ marginBottom: "1rem", maxWidth: "100%" }}
                  />
                )}

                {saved && (
                  <InlineNotification
                    kind="success"
                    title="Saved"
                    subtitle="Subject enrollment updated."
                    lowContrast
                    hideCloseButton
                    style={{ marginBottom: "1rem", maxWidth: "100%" }}
                  />
                )}

                <Button
                  renderIcon={Save}
                  kind="primary"
                  size="sm"
                  onClick={handleSave}
                  disabled={submit.isPending}
                >
                  {submit.isPending ? "Saving…" : "Save Enrollment"}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
