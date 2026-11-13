import { useState } from "react";
import { Tag } from "antd";
import { SEVERITY_COLOR } from "@/shared/lib/constants/tags";
import type { DisciplinarySeverity } from "@/features/portfolio/api/studentPortfolio";
import { DISCIPLINARY_SEVERITIES } from "@/features/portfolio/api/studentPortfolio";
import { useCurrentAcademicYear } from "@/features/school/queries/useAcademicYears";
import {
  useDisciplinaryRecords,
  useCreateDisciplinaryRecord,
  useDeleteDisciplinaryRecord,
} from "@/features/portfolio/queries/useStudentPortfolio";
import { formatISODate, todayISODate } from "@/shared/lib/date";
import ConfirmDeleteModal from "@/shared/ui/ConfirmDeleteModal";
import RemoveIconButton from "@/shared/ui/RemoveIconButton";
import RecordsCard from "@/shared/ui/RecordsCard";
import FormModal from "@/shared/ui/FormModal";
import DateField from "@/shared/ui/DateField";
import SelectField from "@/shared/ui/SelectField";
import TextAreaField from "@/shared/ui/TextAreaField";

export default function StudentDisciplinary({ studentId }: { studentId: string }) {
  const { data: currentYear } = useCurrentAcademicYear();
  const { data: records, isLoading, isError, refetch } = useDisciplinaryRecords(studentId);
  const createRecord = useCreateDisciplinaryRecord(studentId);
  const deleteRecord = useDeleteDisciplinaryRecord(studentId);

  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(todayISODate());
  const [description, setDescription] = useState("");
  const [actionTaken, setActionTaken] = useState("");
  const [severity, setSeverity] = useState<DisciplinarySeverity | "">("");
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const openAdd = () => {
    createRecord.reset();
    setDate(todayISODate());
    setDescription("");
    setActionTaken("");
    setSeverity("");
    setOpen(true);
  };

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
      { onSuccess: () => setOpen(false) },
    );
  };

  return (
    <>
      <RecordsCard
        title="Disciplinary records"
        addLabel="Add record"
        onAdd={currentYear ? openAdd : undefined}
        isLoading={isLoading}
        isError={isError}
        errorMessage="Could not load disciplinary records."
        onRetry={refetch}
        rows={records ?? []}
        getRowId={(r) => r.id}
        empty={{ title: "No disciplinary records", description: "Nothing on file for this student." }}
        columns={[
          { key: "date", header: "Date", render: (r) => <span className="os-nowrap os-table__muted">{formatISODate(r.incident_date)}</span> },
          { key: "severity", header: "Severity", render: (r) => <Tag color={SEVERITY_COLOR[r.severity]} variant="filled">{r.severity}</Tag> },
          { key: "description", header: "What happened", render: (r) => r.description },
          { key: "action", header: "Action taken", render: (r) => <span className="os-table__muted">{r.action_taken || "-"}</span> },
          { key: "actions", header: "", align: "end", render: (r) => <RemoveIconButton label="Delete record" onClick={() => setPendingDeleteId(r.id)} /> },
        ]}
      />

      <FormModal
        open={open}
        title="Add disciplinary record"
        size="md"
        onClose={() => setOpen(false)}
        onSubmit={handleAdd}
        isPending={createRecord.isPending}
        submitDisabled={!description.trim() || !severity}
        submitLabel="Add record"
        isError={createRecord.isError}
        error={createRecord.error}
        errorTitle="Could not add record"
      >
        <div className="os-modal-form">
          <DateField id="disciplinary-date" labelText="Date" value={date} onChange={(ymd) => ymd && setDate(ymd)} />
          <SelectField
            id="disciplinary-severity"
            label="Severity"
            placeholder="Select…"
            value={severity}
            onChange={(v) => setSeverity(v as DisciplinarySeverity)}
            options={DISCIPLINARY_SEVERITIES.map((s) => ({ value: s.value, label: s.label }))}
          />
          <div className="os-col-span-full">
            <TextAreaField id="disciplinary-description" label="What happened" rows={3} value={description} onChange={setDescription} />
          </div>
          <div className="os-col-span-full">
            <TextAreaField id="disciplinary-action" label="Action taken (optional)" rows={2} value={actionTaken} onChange={setActionTaken} />
          </div>
        </div>
      </FormModal>

      <ConfirmDeleteModal
        open={pendingDeleteId !== null}
        title="Delete disciplinary record"
        description="This will permanently remove this record. This action cannot be undone."
        subject="Record"
        mutation={deleteRecord}
        onClose={() => setPendingDeleteId(null)}
        onConfirm={() => pendingDeleteId && deleteRecord.mutate(pendingDeleteId)}
      />
    </>
  );
}
