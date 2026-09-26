import { useState } from "react";
import { Button, Select, SelectItem, TextArea } from "@carbon/react";
import { Add } from "@carbon/icons-react";
import { useCurrentAcademicYear } from "@/features/school/queries/useAcademicYears";
import { useTerms } from "@/features/school/queries/useTerms";
import {
  useProgressReports,
  useCreateProgressReport,
  useDeleteProgressReport,
} from "@/features/portfolio/queries/useStudentPortfolio";
import EmptyState from "@/shared/ui/EmptyState";
import ConfirmDeleteModal from "@/shared/ui/ConfirmDeleteModal";
import RemoveIconButton from "@/shared/ui/RemoveIconButton";
import MutationErrorNotification from "@/shared/ui/MutationErrorNotification";

export default function StudentProgressReports({ studentId }: { studentId: string }) {
  const { data: currentYear } = useCurrentAcademicYear();
  const { data: terms } = useTerms(currentYear?.id);
  const { data: reports, isLoading } = useProgressReports(studentId);
  const createReport = useCreateProgressReport(studentId);
  const deleteReport = useDeleteProgressReport(studentId);

  const [termId, setTermId] = useState("");
  const [narrative, setNarrative] = useState("");
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const handleAdd = () => {
    if (!termId || !narrative.trim()) return;
    createReport.mutate(
      { term_id: termId, narrative: narrative.trim() },
      { onSuccess: () => setNarrative("") },
    );
  };

  return (
    <div className="os-section os-mt-4">
      <div className="os-section__header">
        <h2 className="os-section__title">Progress reports</h2>
      </div>
      <div className="os-section__body">
        <MutationErrorNotification
          isError={createReport.isError}
          error={createReport.error}
          title="Could not add report" fallback="Please try again." className="os-mb-4"
        />

        <div className="os-grid os-grid-form-12-1-auto os-gap-3 os-items-grid-end os-mb-6">
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
          <div key={r.id} className="os-list-row os-justify-between os-items-start">
            <div>
              <span className="os-fw-600 os-text-sm">{r.term_name}</span>
              <p className="os-mt-1h os-mx-0 os-mb-0 os-text-md os-c-secondary">{r.narrative}</p>
            </div>
            <RemoveIconButton label="Delete" onClick={() => setPendingDeleteId(r.id)} />
          </div>
        ))}
      </div>

      <ConfirmDeleteModal
        open={pendingDeleteId !== null}
        title="Delete progress report"
        description="This will permanently remove this progress report. This action cannot be undone."
        subject="Progress report"
        mutation={deleteReport}
        onClose={() => setPendingDeleteId(null)}
        onConfirm={() => {
          if (pendingDeleteId) deleteReport.mutate(pendingDeleteId);
        }}
      />
    </div>
  );
}
