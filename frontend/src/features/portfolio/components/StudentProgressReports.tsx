import { useState } from "react";
import { Tag } from "antd";
import { useCurrentAcademicYear } from "@/features/school/queries/useAcademicYears";
import { useCurrentTerm, useTerms } from "@/features/school/queries/useTerms";
import {
  useProgressReports,
  useCreateProgressReport,
  useDeleteProgressReport,
} from "@/features/portfolio/queries/useStudentPortfolio";
import { formatISODate } from "@/shared/lib/date";
import ConfirmDeleteModal from "@/shared/ui/ConfirmDeleteModal";
import RemoveIconButton from "@/shared/ui/RemoveIconButton";
import RecordsCard from "@/shared/ui/RecordsCard";
import FormModal from "@/shared/ui/FormModal";
import SelectField from "@/shared/ui/SelectField";
import TextAreaField from "@/shared/ui/TextAreaField";

export default function StudentProgressReports({ studentId }: { studentId: string }) {
  const { data: currentYear } = useCurrentAcademicYear();
  const { data: currentTerm } = useCurrentTerm();
  const { data: terms } = useTerms(currentYear?.id);
  const { data: reports, isLoading, isError, refetch } = useProgressReports(studentId);
  const createReport = useCreateProgressReport(studentId);
  const deleteReport = useDeleteProgressReport(studentId);

  const [open, setOpen] = useState(false);
  const [termId, setTermId] = useState("");
  const [narrative, setNarrative] = useState("");
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const selectedTermId = termId || currentTerm?.id || "";
  // The current term's report comes first.
  const orderedReports = reports
    ? [...reports].sort((a, b) => Number(b.term_id === currentTerm?.id) - Number(a.term_id === currentTerm?.id))
    : [];

  const openAdd = () => { createReport.reset(); setTermId(""); setNarrative(""); setOpen(true); };

  const handleAdd = () => {
    if (!selectedTermId || !narrative.trim()) return;
    createReport.mutate(
      { term_id: selectedTermId, narrative: narrative.trim() },
      { onSuccess: () => setOpen(false) },
    );
  };

  return (
    <>
      <RecordsCard
        title="Progress reports"
        subtitle="A narrative report for each term"
        addLabel="Add report"
        onAdd={openAdd}
        isLoading={isLoading}
        isError={isError}
        errorMessage="Could not load progress reports."
        onRetry={refetch}
        rows={orderedReports}
        getRowId={(r) => r.id}
        empty={{ title: "No progress reports yet", description: "Add a term-by-term narrative report for this student." }}
        columns={[
          {
            key: "term",
            header: "Term",
            render: (r) => (
              <span className="os-flex os-items-center os-gap-2 os-nowrap">
                <span className="os-fw-500">{r.term_name}</span>
                {r.term_id === currentTerm?.id && <Tag color="processing" variant="filled">Current</Tag>}
              </span>
            ),
          },
          { key: "narrative", header: "Report", render: (r) => <span className="os-c-secondary">{r.narrative}</span> },
          { key: "updated", header: "Updated", render: (r) => <span className="os-nowrap os-table__muted">{formatISODate(r.updated_at ?? r.created_at)}</span> },
          { key: "actions", header: "", align: "end", render: (r) => <RemoveIconButton label={`Delete ${r.term_name} report`} onClick={() => setPendingDeleteId(r.id)} /> },
        ]}
      />

      <FormModal
        open={open}
        title="Add progress report"
        size="md"
        onClose={() => setOpen(false)}
        onSubmit={handleAdd}
        isPending={createReport.isPending}
        submitDisabled={!selectedTermId || !narrative.trim()}
        submitLabel="Add report"
        isError={createReport.isError}
        error={createReport.error}
        errorTitle="Could not add report"
      >
        <div className="os-stack os-gap-4">
          <SelectField
            id="progress-report-term"
            label="Term"
            placeholder="Select term…"
            value={selectedTermId}
            onChange={setTermId}
            options={(terms ?? []).map((t) => ({ value: t.id, label: t.id === currentTerm?.id ? `${t.name} (current)` : t.name }))}
          />
          <TextAreaField id="progress-report-narrative" label="Report" rows={6} value={narrative} onChange={setNarrative} />
        </div>
      </FormModal>

      <ConfirmDeleteModal
        open={pendingDeleteId !== null}
        title="Delete progress report"
        description="This will permanently remove this progress report. This action cannot be undone."
        subject="Progress report"
        mutation={deleteReport}
        onClose={() => setPendingDeleteId(null)}
        onConfirm={() => pendingDeleteId && deleteReport.mutate(pendingDeleteId)}
      />
    </>
  );
}
