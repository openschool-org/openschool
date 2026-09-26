import { useState } from "react";
import { Select, SelectItem, NumberInput, Button, InlineNotification, Checkbox, Tag } from "@carbon/react";
import { Save } from "@carbon/icons-react";
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
              <Select
                id="marks-term"
                labelText="Term"
                hideLabel
                size="sm"
                value={effectiveTermId}
                onChange={(e) => {
                  setTermId(e.target.value);
                  setTermTouched(true);
                }}
              >
                <SelectItem value="" text="Choose a term…" />
                {terms?.map((t) => (
                  <SelectItem key={t.id} value={t.id} text={t.is_current ? `${t.name} (current)` : t.name} />
                ))}
              </Select>
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
              <InlineNotification
                kind="success"
                title="Marks saved"
                lowContrast
                onClose={() => saveMarks.reset()} className="os-max-w-full os-mt-0 os-mx-6 os-mb-4"
              />
            )}
            <table className="os-table os-table--no-hover">
              <thead>
                <tr>
                  <th>Index no.</th>
                  <th>Student</th>
                  <th className="os-w-8">Marks</th>
                  <th className="os-w-8">Out of</th>
                  <th className="os-w-5">Absent</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const isAbsent = draft[r.student_id]?.is_absent ?? false;
                  return (
                  <tr key={r.student_id}>
                    <td className="os-table__mono">{r.index_number}</td>
                    <td>{r.student_name}{isAbsent && <Tag type="red" size="sm" className="os-ml-2">AB</Tag>}</td>
                    <td>
                      <NumberInput
                        id={`marks-${r.student_id}`}
                        label=""
                        hideLabel
                        size="sm"
                        min={0}
                        max={draft[r.student_id]?.max_marks ?? 100}
                        value={draft[r.student_id]?.marks ?? 0}
                        disabled={isAbsent}
                        onChange={(_e, { value }) =>
                          setDraft((d) => ({
                            ...d,
                            [r.student_id]: {
                              ...d[r.student_id],
                              marks: value === "" ? 0 : Number(value),
                            },
                          }))
                        }
                      />
                    </td>
                    <td>
                      <NumberInput
                        id={`max-marks-${r.student_id}`}
                        label=""
                        hideLabel
                        size="sm"
                        min={1}
                        value={draft[r.student_id]?.max_marks ?? 100}
                        onChange={(_e, { value }) =>
                          setDraft((d) => ({
                            ...d,
                            [r.student_id]: {
                              ...d[r.student_id],
                              max_marks: value === "" ? 100 : Number(value),
                            },
                          }))
                        }
                      />
                    </td>
                    <td>
                      <Checkbox
                        id={`absent-${r.student_id}`}
                        labelText="AB"
                        checked={isAbsent}
                        onChange={(_e, { checked }) =>
                          setDraft((d) => ({
                            ...d,
                            [r.student_id]: {
                              ...d[r.student_id],
                              marks: checked ? 0 : d[r.student_id]?.marks ?? 0,
                              is_absent: checked,
                            },
                          }))
                        }
                      />
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="os-py-4 os-px-6 os-border-t">
              <Button
                renderIcon={Save}
                kind="primary"
                size="sm"
                onClick={handleSave}
                disabled={saveMarks.isPending}
              >
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
