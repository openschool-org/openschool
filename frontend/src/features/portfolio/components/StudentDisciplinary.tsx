import { SEVERITY_TAG } from "@/shared/lib/constants/tags";
import type { DisciplinarySeverity } from "@/features/portfolio/api/studentPortfolio";
import { useState } from "react";
import { Button, Select, SelectItem, TextArea, Tag } from "@carbon/react";
import { Add } from "@carbon/icons-react";
import { useCurrentAcademicYear } from "@/features/school/queries/useAcademicYears";
import {
  useDisciplinaryRecords,
  useCreateDisciplinaryRecord,
  useDeleteDisciplinaryRecord,
} from "@/features/portfolio/queries/useStudentPortfolio";
import { DISCIPLINARY_SEVERITIES } from "@/features/portfolio/api/studentPortfolio";
import { todayISODate } from "@/shared/lib/date";
import EmptyState from "@/shared/ui/EmptyState";
import ConfirmDeleteModal from "@/shared/ui/ConfirmDeleteModal";
import RemoveIconButton from "@/shared/ui/RemoveIconButton";
import MutationErrorNotification from "@/shared/ui/MutationErrorNotification";
import DateField from "@/shared/ui/DateField";

export default function StudentDisciplinary({ studentId }: { studentId: string }) {
  const { data: currentYear } = useCurrentAcademicYear();
  const { data: records, isLoading } = useDisciplinaryRecords(studentId);
  const createRecord = useCreateDisciplinaryRecord(studentId);
  const deleteRecord = useDeleteDisciplinaryRecord(studentId);

  const [date, setDate] = useState(todayISODate());
  const [description, setDescription] = useState("");
  const [actionTaken, setActionTaken] = useState("");
  const [severity, setSeverity] = useState<DisciplinarySeverity | "">("");
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const handleAdd = () => {
    if (!description.trim() || !severity || !currentYear) return;
    createRecord.mutate(
      {
        academic_year_id: currentYear.id,
        incident_date: new Date(date).toISOString(),
        description: description.trim(),
        action_taken: actionTaken.trim() || undefined,
        severity,
      },
      { onSuccess: () => { setDescription(""); setActionTaken(""); setSeverity(""); } },
    );
  };

  return (
    <div className="os-section os-mt-4">
      <div className="os-section__header">
        <h2 className="os-section__title">Disciplinary records</h2>
      </div>
      <div className="os-section__body">
        <MutationErrorNotification
          isError={createRecord.isError}
          error={createRecord.error}
          title="Could not add record" fallback="Please try again." className="os-mb-4"
        />

        <div className="os-grid os-grid-form-10-10-1-1-auto os-gap-3 os-items-grid-end os-mb-6">
          <DateField value={date} onChange={(ymd) => {
            if (ymd) setDate(ymd);
          }} id="disciplinary-date" labelText="Date" />
          <Select id="disciplinary-severity" labelText="Severity" value={severity} onChange={(e) => setSeverity(e.target.value as DisciplinarySeverity)}>
            <SelectItem value="" text="Select…" />
            {DISCIPLINARY_SEVERITIES.map((s) => (
              <SelectItem key={s.value} value={s.value} text={s.label} />
            ))}
          </Select>
          <TextArea id="disciplinary-description" labelText="Description" rows={1} value={description} onChange={(e) => setDescription(e.target.value)} />
          <TextArea id="disciplinary-action" labelText="Action taken (optional)" rows={1} value={actionTaken} onChange={(e) => setActionTaken(e.target.value)} />
          <Button renderIcon={Add} kind="primary" size="md" onClick={handleAdd} disabled={!description.trim() || !severity || createRecord.isPending}>Add</Button>
        </div>

        {!isLoading && (records?.length ?? 0) === 0 && <EmptyState title="No disciplinary records" description="Nothing on file for this student." />}

        {records?.map((r) => (
          <div key={r.id} className="os-list-row os-justify-between os-items-start">
            <div>
              <div className="os-flex os-items-center os-gap-2 os-mb-1">
                <Tag size="sm" type={SEVERITY_TAG[r.severity]}>{r.severity}</Tag>
                <span className="os-text-xs os-c-tertiary">{r.incident_date}</span>
              </div>
              <p className="os-m-0 os-text-md">{r.description}</p>
              {r.action_taken && <p className="os-mt-1 os-mx-0 os-mb-0 os-text-sm os-c-secondary">Action: {r.action_taken}</p>}
            </div>
            <RemoveIconButton label="Delete" onClick={() => setPendingDeleteId(r.id)} />
          </div>
        ))}
      </div>

      <ConfirmDeleteModal
        open={pendingDeleteId !== null}
        title="Delete disciplinary record"
        description="This will permanently remove this record. This action cannot be undone."
        subject="Record"
        mutation={deleteRecord}
        onClose={() => setPendingDeleteId(null)}
        onConfirm={() => {
          if (pendingDeleteId) deleteRecord.mutate(pendingDeleteId);
        }}
      />
    </div>
  );
}
