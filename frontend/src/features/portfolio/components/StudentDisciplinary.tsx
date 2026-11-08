import { SEVERITY_COLOR } from "@/shared/lib/constants/tags";
import type { DisciplinarySeverity } from "@/features/portfolio/api/studentPortfolio";
import { useState } from "react";
import { Button, Tag } from "antd";
import TextAreaField from "@/shared/ui/TextAreaField";
import SelectField from "@/shared/ui/SelectField";
import { PlusOutlined } from "@ant-design/icons";
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
import SectionCard from "@/shared/ui/SectionCard";
import ListRowSkeleton from "@/shared/ui/ListRowSkeleton";
import ErrorMessage from "@/shared/ui/ErrorMessage";
import { formatISODate } from "@/shared/lib/date";

export default function StudentDisciplinary({ studentId }: { studentId: string }) {
  const { data: currentYear } = useCurrentAcademicYear();
  const { data: records, isLoading, isError, refetch } = useDisciplinaryRecords(studentId);
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
    <SectionCard title="Disciplinary records" className="os-mt-4">
        <MutationErrorNotification
          isError={createRecord.isError}
          error={createRecord.error}
          title="Could not add record" fallback="Please try again." className="os-mb-4"
        />

        <div className="os-grid os-grid-form-10-10-1-1-auto os-gap-3 os-items-grid-end os-mb-6">
          <DateField value={date} onChange={(ymd) => {
            if (ymd) setDate(ymd);
          }} id="disciplinary-date" labelText="Date" />
          <SelectField
            id="disciplinary-severity"
            label="Severity"
            value={severity}
            onChange={(v) => setSeverity(v as DisciplinarySeverity)}
            options={[{ value: "", label: "Select…" }, ...DISCIPLINARY_SEVERITIES.map((s) => ({ value: s.value, label: s.label }))]}
          />
          <TextAreaField id="disciplinary-description" label="Description" rows={1} value={description} onChange={(v) => setDescription(v)} />
          <TextAreaField id="disciplinary-action" label="Action taken (optional)" rows={1} value={actionTaken} onChange={(v) => setActionTaken(v)} />
          <Button icon={<PlusOutlined />} type="primary" onClick={handleAdd} disabled={!description.trim() || !severity || createRecord.isPending}>Add</Button>
        </div>

        {isLoading && <ListRowSkeleton leadingWidth={null} titleWidth="35%" subtitleWidth="70%" trailingWidth="2rem" />}
        {isError && <ErrorMessage message="Could not load disciplinary records." onRetry={refetch} />}
        {!isLoading && !isError && (records?.length ?? 0) === 0 && <EmptyState title="No disciplinary records" description="Nothing on file for this student." />}

        {!isLoading && !isError && records?.map((r) => (
          <div key={r.id} className="os-list-row os-justify-between os-items-start">
            <div>
              <div className="os-flex os-items-center os-gap-2 os-mb-1">
                <Tag color={SEVERITY_COLOR[r.severity]} variant="filled">{r.severity}</Tag>
                <span className="os-text-xs os-c-tertiary">{formatISODate(r.incident_date)}</span>
              </div>
              <p className="os-m-0 os-text-md">{r.description}</p>
              {r.action_taken && <p className="os-mt-1 os-mx-0 os-mb-0 os-text-sm os-c-secondary">Action: {r.action_taken}</p>}
            </div>
            <RemoveIconButton label="Delete" onClick={() => setPendingDeleteId(r.id)} />
          </div>
        ))}
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
    </SectionCard>
  );
}
