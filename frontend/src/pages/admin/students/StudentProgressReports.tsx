import { useState } from "react";
import { Button, Select, SelectItem, TextArea, InlineNotification } from "@carbon/react";
import { Add, TrashCan } from "@carbon/icons-react";
import { useCurrentAcademicYear } from "../../../queries/useAcademicYears";
import { useTerms } from "../../../queries/useTerms";
import {
  useProgressReports,
  useCreateProgressReport,
  useDeleteProgressReport,
} from "../../../queries/useStudentPortfolio";
import { getErrorMessage } from "../../../lib/errorMessage";
import EmptyState from "../../../components/common/EmptyState";

export default function StudentProgressReports({ studentId }: { studentId: string }) {
  const { data: currentYear } = useCurrentAcademicYear();
  const { data: terms } = useTerms(currentYear?.id);
  const { data: reports, isLoading } = useProgressReports(studentId);
  const createReport = useCreateProgressReport(studentId);
  const deleteReport = useDeleteProgressReport(studentId);

  const [termId, setTermId] = useState("");
  const [narrative, setNarrative] = useState("");

  const handleAdd = () => {
    if (!termId || !narrative.trim()) return;
    createReport.mutate(
      { term_id: termId, narrative: narrative.trim() },
      { onSuccess: () => setNarrative("") },
    );
  };

  return (
    <div className="os-section" style={{ marginTop: "1rem" }}>
      <div className="os-section__header">
        <h2 className="os-section__title">Progress Reports</h2>
      </div>
      <div className="os-section__body">
        {createReport.isError && (
          <InlineNotification
            kind="error"
            title="Error"
            subtitle={getErrorMessage(createReport.error, "Failed to add report")}
            lowContrast
            hideCloseButton
            style={{ marginBottom: "1rem", maxWidth: "100%" }}
          />
        )}

        <div style={{ display: "grid", gridTemplateColumns: "12rem 1fr auto", gap: "0.75rem", alignItems: "end", marginBottom: "1.5rem" }}>
          <Select id="progress-report-term" labelText="Term" value={termId} onChange={(e) => setTermId(e.target.value)}>
            <SelectItem value="" text="Select term…" />
            {terms?.map((t) => (
              <SelectItem key={t.id} value={t.id} text={t.name} />
            ))}
          </Select>
          <TextArea
            id="progress-report-narrative"
            labelText="Narrative"
            rows={2}
            value={narrative}
            onChange={(e) => setNarrative(e.target.value)}
          />
          <Button
            renderIcon={Add}
            kind="primary"
            size="md"
            onClick={handleAdd}
            disabled={!termId || !narrative.trim() || createReport.isPending}
          >
            Add
          </Button>
        </div>

        {!isLoading && (reports?.length ?? 0) === 0 && (
          <EmptyState title="No progress reports yet" description="Add a term-by-term narrative report for this student." />
        )}

        {reports?.map((r) => (
          <div key={r.id} style={{ padding: "0.875rem 0", borderBottom: "1px solid #e0e0e0" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <span style={{ fontWeight: 600, fontSize: "0.8125rem" }}>{r.term_name}</span>
                <p style={{ margin: "0.375rem 0 0", fontSize: "0.875rem", color: "#525252" }}>{r.narrative}</p>
              </div>
              <Button
                hasIconOnly
                iconDescription="Delete"
                renderIcon={TrashCan}
                kind="ghost"
                size="sm"
                onClick={() => deleteReport.mutate(r.id)}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
