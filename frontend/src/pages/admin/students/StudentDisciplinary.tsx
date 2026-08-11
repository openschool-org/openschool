import { useState } from "react";
import { Button, Select, SelectItem, TextArea, DatePicker, DatePickerInput, InlineNotification, Tag } from "@carbon/react";
import { Add, TrashCan } from "@carbon/icons-react";
import { useCurrentAcademicYear } from "../../../queries/useAcademicYears";
import {
  useDisciplinaryRecords,
  useCreateDisciplinaryRecord,
  useDeleteDisciplinaryRecord,
} from "../../../queries/useStudentPortfolio";
import { DISCIPLINARY_SEVERITIES } from "../../../services/studentPortfolio";
import type { DisciplinarySeverity } from "../../../services/studentPortfolio";
import { getErrorMessage } from "../../../lib/errorMessage";
import { todayISODate, toYmd } from "../../../lib/date";
import EmptyState from "../../../components/common/EmptyState";

const SEVERITY_TAG: Record<DisciplinarySeverity, "gray" | "warm-gray" | "red"> = {
  minor: "gray",
  major: "warm-gray",
  severe: "red",
};

export default function StudentDisciplinary({ studentId }: { studentId: string }) {
  const { data: currentYear } = useCurrentAcademicYear();
  const { data: records, isLoading } = useDisciplinaryRecords(studentId);
  const createRecord = useCreateDisciplinaryRecord(studentId);
  const deleteRecord = useDeleteDisciplinaryRecord(studentId);

  const [date, setDate] = useState(todayISODate());
  const [description, setDescription] = useState("");
  const [actionTaken, setActionTaken] = useState("");
  const [severity, setSeverity] = useState<DisciplinarySeverity | "">("");

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
    <div className="os-section" style={{ marginTop: "1rem" }}>
      <div className="os-section__header">
        <h2 className="os-section__title">Disciplinary Records</h2>
      </div>
      <div className="os-section__body">
        {createRecord.isError && (
          <InlineNotification kind="error" title="Error" subtitle={getErrorMessage(createRecord.error, "Failed to add record")} lowContrast hideCloseButton style={{ marginBottom: "1rem", maxWidth: "100%" }} />
        )}

        <div style={{ display: "grid", gridTemplateColumns: "10rem 10rem 1fr 1fr auto", gap: "0.75rem", alignItems: "end", marginBottom: "1.5rem" }}>
          <DatePicker datePickerType="single" dateFormat="Y-m-d" value={date} onChange={(dates) => {
            const ymd = toYmd(dates[0]);
            if (ymd) setDate(ymd);
          }}>
            <DatePickerInput id="disciplinary-date" labelText="Date" placeholder="YYYY-MM-DD" />
          </DatePicker>
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
          <div key={r.id} style={{ padding: "0.875rem 0", borderBottom: "1px solid #e0e0e0" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
                  <Tag size="sm" type={SEVERITY_TAG[r.severity]}>{r.severity}</Tag>
                  <span style={{ fontSize: "0.75rem", color: "#8d8d8d" }}>{r.incident_date}</span>
                </div>
                <p style={{ margin: 0, fontSize: "0.875rem" }}>{r.description}</p>
                {r.action_taken && <p style={{ margin: "0.25rem 0 0", fontSize: "0.8125rem", color: "#525252" }}>Action: {r.action_taken}</p>}
              </div>
              <Button hasIconOnly iconDescription="Delete" renderIcon={TrashCan} kind="ghost" size="sm" onClick={() => deleteRecord.mutate(r.id)} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
