import { useState } from "react";
import { Select, SelectItem, NumberInput, Button, InlineNotification } from "@carbon/react";
import { Save } from "@carbon/icons-react";
import { useTerms } from "../../../queries/useTerms";
import { useSubjects } from "../../../queries/useSubjects";
import { useClassMarks, useSaveClassMarks } from "../../../queries/useTermMarks";
import { getErrorMessage } from "../../../lib/errorMessage";
import LoadingSpinner from "../../../components/common/LoadingSpinner";
import EmptyState from "../../../components/common/EmptyState";
import AgentFindingsBanner from "../../../components/common/AgentFindingsBanner";
import EntityCombobox from "../../../components/common/EntityCombobox";

export default function ClassMarks({
  classId,
  academicYearId,
}: {
  classId: string;
  academicYearId: string;
}) {
  const { data: terms } = useTerms(academicYearId);
  const { data: subjects } = useSubjects();

  const [termId, setTermId] = useState("");
  const [subjectId, setSubjectId] = useState("");

  const { data: rows, isLoading } = useClassMarks(classId, termId, subjectId);
  const saveMarks = useSaveClassMarks(classId);

  // Draft edits keyed by student_id, seeded from the fetched grid whenever
  // the term/subject selection (i.e. a fresh set of rows) changes.
  const [draft, setDraft] = useState<Record<string, { marks: number; max_marks: number }>>({});
  const [syncedFor, setSyncedFor] = useState("");
  const rowsKey = `${termId}:${subjectId}`;
  
  const currentSubject = subjects?.find((s) => s.id === subjectId);
  const defaultMaxMarks = currentSubject?.max_marks ?? 100;

  if (rows && syncedFor !== rowsKey) {
    setDraft(
      Object.fromEntries(
        rows.map((r) => [r.student_id, { marks: r.marks ?? 0, max_marks: r.max_marks ?? defaultMaxMarks }]),
      ),
    );
    setSyncedFor(rowsKey);
  }

  const handleSave = () => {
    if (!termId || !subjectId) return;
    saveMarks.mutate({
      term_id: termId,
      subject_id: subjectId,
      entries: Object.entries(draft).map(([student_id, v]) => ({ student_id, ...v })),
    });
  };

  return (
    <div>
      <AgentFindingsBanner jobNames={["term_marks_deadline_watcher"]} />
      <div className="os-section">
      <div className="os-section__header" style={{ flexWrap: "wrap", rowGap: "0.75rem" }}>
        <h2 className="os-section__title">Term Marks</h2>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <Select
            id="marks-term"
            labelText=""
            size="sm"
            value={termId}
            onChange={(e) => setTermId(e.target.value)}
          >
            <SelectItem value="" text="Choose a term…" />
            {terms?.map((t) => (
              <SelectItem key={t.id} value={t.id} text={t.name} />
            ))}
          </Select>
          <div style={{ minWidth: "12rem" }}>
            <EntityCombobox
              id="marks-subject"
              items={subjects ?? []}
              selectedId={subjectId}
              onSelect={setSubjectId}
              getId={(s) => s.id}
              itemToString={(s) => s.name}
              placeholder="Choose a subject…"
            />
          </div>
        </div>
      </div>

      {!termId || !subjectId ? (
        <EmptyState
          title="Pick a term and subject"
          description="Choose which term test and subject you're recording marks for."
        />
      ) : isLoading ? (
        <LoadingSpinner />
      ) : rows && rows.length > 0 ? (
        <>
          {saveMarks.isError && (
            <InlineNotification
              kind="error"
              title="Could not save marks"
              subtitle={getErrorMessage(saveMarks.error, "Please try again.")}
              lowContrast
              onClose={() => saveMarks.reset()}
              style={{ maxWidth: "100%", margin: "0 1.5rem 1rem" }}
            />
          )}
          {saveMarks.isSuccess && (
            <InlineNotification
              kind="success"
              title="Marks saved"
              lowContrast
              onClose={() => saveMarks.reset()}
              style={{ maxWidth: "100%", margin: "0 1.5rem 1rem" }}
            />
          )}
          <table className="os-table os-table--no-hover">
            <thead>
              <tr>
                <th>Index No.</th>
                <th>Student</th>
                <th style={{ width: "8rem" }}>Marks</th>
                <th style={{ width: "8rem" }}>Out of</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.student_id}>
                  <td className="os-table__mono">{r.index_number}</td>
                  <td>{r.student_name}</td>
                  <td>
                    <NumberInput
                      id={`marks-${r.student_id}`}
                      label=""
                      hideLabel
                      size="sm"
                      min={0}
                      max={draft[r.student_id]?.max_marks ?? 100}
                      value={draft[r.student_id]?.marks ?? 0}
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
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ padding: "1rem 1.5rem", borderTop: "1px solid #e0e0e0" }}>
            <Button
              renderIcon={Save}
              kind="primary"
              size="sm"
              onClick={handleSave}
              disabled={saveMarks.isPending}
            >
              {saveMarks.isPending ? "Saving…" : "Save Marks"}
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
