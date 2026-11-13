import { useState } from "react";
import { Alert, Button, Checkbox, InputNumber, Tag } from "antd";
import { SaveOutlined } from "@ant-design/icons";
import type { ClassMarkRow } from "@/features/marks/api/termMark";
import DataGrid, { type GridColumn } from "@/shared/ui/DataGrid";
import SelectField from "@/shared/ui/SelectField";
import { useTerms, useCurrentTerm } from "@/features/school/queries/useTerms";
import { useSubjects } from "@/features/curriculum/queries/useSubjects";
import { useClassSubjectTeachers } from "@/features/academics/queries/useClasses";
import { useClassMarks, useSaveClassMarks } from "@/features/marks/queries/useTermMarks";
import LoadingSpinner from "@/shared/ui/LoadingSpinner";
import EmptyState from "@/shared/ui/EmptyState";
import AgentFindingsBanner from "@/features/notifications/components/AgentFindingsBanner";
import EntityCombobox from "@/shared/ui/EntityCombobox";
import MutationErrorNotification from "@/shared/ui/MutationErrorNotification";
import SectionHeader from "@/shared/ui/SectionHeader";

export default function ClassMarks({
  classId,
  academicYearId,
}: {
  classId: string;
  academicYearId: string;
}) {
  const { data: terms } = useTerms(academicYearId);
  const { data: currentTerm } = useCurrentTerm();
  const { data: subjects } = useSubjects();
  // Scoped to subjects actually assigned to this class, not every subject in the school.
  const { data: classSubjectTeachers } = useClassSubjectTeachers(classId);

  const [termId, setTermId] = useState("");
  const [termTouched, setTermTouched] = useState(false);
  const [subjectId, setSubjectId] = useState("");

  // Auto-selects the current term once it loads, unless the admin already picked one (e.g. a past term).
  const effectiveTermId = termTouched ? termId : termId || currentTerm?.id || "";

  const { data: rows, isLoading } = useClassMarks(classId, effectiveTermId, subjectId);
  const saveMarks = useSaveClassMarks(classId);

  // Draft edits keyed by student_id, reseeded whenever the term/subject selection changes.
  const [draft, setDraft] = useState<Record<string, { marks: number; max_marks: number; is_absent: boolean }>>({});
  const [syncedFor, setSyncedFor] = useState("");
  const rowsKey = `${effectiveTermId}:${subjectId}`;

  const classSubjects = classSubjectTeachers?.map((st) => ({ id: st.subject_id, name: st.subject_name })) ?? [];
  const currentSubject = subjects?.find((s) => s.id === subjectId);
  const defaultMaxMarks = currentSubject?.max_marks ?? 100;

  if (rows && syncedFor !== rowsKey) {
    setDraft(
      Object.fromEntries(
        rows.map((r) => [
          r.student_id,
          { marks: r.marks ?? 0, max_marks: r.max_marks ?? defaultMaxMarks, is_absent: r.is_absent ?? false },
        ]),
      ),
    );
    setSyncedFor(rowsKey);
  }

  type Entry = { marks: number; max_marks: number; is_absent: boolean };
  const update = (studentId: string, patch: Partial<Entry>) => setDraft((d) => ({ ...d, [studentId]: { ...d[studentId], ...patch } }));

  const columns: GridColumn<ClassMarkRow>[] = [
    { key: "index", header: "Index no.", render: (r) => <span className="os-table__mono">{r.index_number}</span> },
    {
      key: "student",
      header: "Student",
      render: (r) => <>{r.student_name}{draft[r.student_id]?.is_absent && <Tag color="error" variant="filled" className="os-ml-2">AB</Tag>}</>,
    },
    {
      key: "marks",
      header: "Marks",
      render: (r) => (
        <InputNumber
          id={`marks-${r.student_id}`}
          aria-label={`Marks for ${r.student_name}`}
          size="small"
          className="os-w-8"
          min={0}
          max={draft[r.student_id]?.max_marks ?? 100}
          value={draft[r.student_id]?.marks ?? 0}
          disabled={draft[r.student_id]?.is_absent ?? false}
          onChange={(v) => update(r.student_id, { marks: typeof v === "number" ? v : 0 })}
        />
      ),
    },
    {
      key: "max",
      header: "Out of",
      render: (r) => (
        <InputNumber
          id={`max-marks-${r.student_id}`}
          aria-label={`Maximum marks for ${r.student_name}`}
          size="small"
          className="os-w-8"
          min={1}
          value={draft[r.student_id]?.max_marks ?? 100}
          onChange={(v) => update(r.student_id, { max_marks: typeof v === "number" ? v : 100 })}
        />
      ),
    },
    {
      key: "absent",
      header: "Absent",
      render: (r) => (
        <Checkbox
          id={`absent-${r.student_id}`}
          checked={draft[r.student_id]?.is_absent ?? false}
          onChange={(e) => update(r.student_id, { is_absent: e.target.checked, marks: e.target.checked ? 0 : draft[r.student_id]?.marks ?? 0 })}
        >
          AB
        </Checkbox>
      ),
    },
  ];

  const handleSave = () => {
    if (!effectiveTermId || !subjectId) return;
    saveMarks.mutate({
      term_id: effectiveTermId,
      subject_id: subjectId,
      entries: Object.entries(draft).map(([student_id, v]) => ({ student_id, ...v })),
    });
  };

  return (
    <div>
      <AgentFindingsBanner />
      <div className="os-section">
        <SectionHeader
          title="Term marks"
          className="os-wrap os-gap-3"
          meta={
            <div className="os-flex os-gap-3 os-wrap">
              <SelectField
                id="marks-term"
                label="Term"
                hideLabel
                placeholder="Choose a term…"
                className="os-min-w-12"
                value={effectiveTermId}
                onChange={(v) => { setTermId(v); setTermTouched(true); }}
                options={(terms ?? []).map((t) => ({ value: t.id, label: t.is_current ? `${t.name} (current)` : t.name }))}
              />
              <div className="os-min-w-12">
                <EntityCombobox
                  id="marks-subject"
                  items={classSubjects}
                  selectedId={subjectId}
                  onSelect={setSubjectId}
                  getId={(s) => s.id}
                  itemToString={(s) => s.name}
                  placeholder="Choose a subject…"
                />
              </div>
            </div>
          }
        />

        {!effectiveTermId || !subjectId ? (
          <EmptyState
            title="Pick a term and subject"
            description="Choose which term test and subject you're recording marks for."
          />
        ) : isLoading ? (
          <LoadingSpinner />
        ) : rows && rows.length > 0 ? (
          <>
            <MutationErrorNotification
              isError={saveMarks.isError}
              error={saveMarks.error}
              title="Could not save marks"
              fallback="Please try again."
              onClose={() => saveMarks.reset()} className="os-mt-0 os-mx-6 os-mb-4"
            />
            {saveMarks.isSuccess && (
              <Alert type="success" showIcon closable onClose={() => saveMarks.reset()} className="os-mt-0 os-mx-6 os-mb-4" title="Marks saved" />
            )}
            <DataGrid rows={rows} columns={columns} getRowId={(r) => r.student_id} pagination={false} noHover />
            <div className="os-py-4 os-px-6 os-border-t">
              <Button type="primary" icon={<SaveOutlined />} onClick={handleSave} loading={saveMarks.isPending}>
                {saveMarks.isPending ? "Saving…" : "Save marks"}
              </Button>
            </div>
          </>
        ) : (
          <EmptyState
            title="No students enrolled"
            description="Enrol students into this class before recording marks."
          />
        )}
      </div>
    </div>
  );
}
