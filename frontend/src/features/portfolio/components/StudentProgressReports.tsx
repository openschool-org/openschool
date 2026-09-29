import { useState } from "react";
import { Button, Select, SelectItem, TextArea } from "@carbon/react";
import { Add } from "@carbon/icons-react";
import { useCurrentAcademicYear } from "@/features/school/queries/useAcademicYears";
import { useCurrentTerm } from "@/features/school/queries/useTerms";
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
import SectionCard from "@/shared/ui/SectionCard";
import ListRowSkeleton from "@/shared/ui/ListRowSkeleton";
import ErrorMessage from "@/shared/ui/ErrorMessage";
import { formatISODate } from "@/shared/lib/date";

export default function StudentProgressReports({ studentId }: { studentId: string }) {
  const { data: currentYear } = useCurrentAcademicYear();
  const { data: currentTerm } = useCurrentTerm();
  const { data: terms } = useTerms(currentYear?.id);
  const { data: reports, isLoading, isError, refetch } = useProgressReports(studentId);
  const createReport = useCreateProgressReport(studentId);
  const deleteReport = useDeleteProgressReport(studentId);

  const [termId, setTermId] = useState("");
  const [narrative, setNarrative] = useState("");
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const selectedTermId = termId || currentTerm?.id || "";
  const orderedReports = reports
    ? [...reports].sort((a, b) => Number(b.term_id === currentTerm?.id) - Number(a.term_id === currentTerm?.id))
    : [];

  const handleAdd = () => {
    if (!selectedTermId || !narrative.trim()) return;
    createReport.mutate(
      { term_id: selectedTermId, narrative: narrative.trim() },
      { onSuccess: () => setNarrative("") },
    );
  };

  return (
    <SectionCard title="Progress reports" className="os-mt-4">
        <MutationErrorNotification
          isError={createReport.isError}
          error={createReport.error}
          title="Could not add report" fallback="Please try again." className="os-mb-4"
        />

        <div className="os-grid os-grid-form-12-1-auto os-gap-3 os-items-grid-end os-mb-6">
          <Select id="progress-report-term" labelText="Term" value={selectedTermId} onChange={(e) => setTermId(e.target.value)}>
            <SelectItem value="" text="Select term…" />
            {terms?.map((t) => (
              <SelectItem key={t.id} value={t.id} text={t.id === currentTerm?.id ? `${t.name} (current)` : t.name} />
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
            disabled={!selectedTermId || !narrative.trim() || createReport.isPending}
          >
            Add
          </Button>
        </div>

        {isLoading && <ListRowSkeleton leadingWidth={null} titleWidth="35%" subtitleWidth="70%" trailingWidth="2rem" />}
        {isError && <ErrorMessage message="Could not load progress reports." onRetry={refetch} />}
        {!isLoading && !isError && orderedReports.length === 0 && (
          <EmptyState title="No progress reports yet" description="Add a term-by-term narrative report for this student." />
        )}

        {!isLoading && !isError && orderedReports.map((r) => (
          <div key={r.id} className="os-list-row os-justify-between os-items-start">
            <div>
              <div className="os-flex os-items-center os-gap-2">
                <span className="os-fw-600 os-text-sm">{r.term_name}</span>
                {r.term_id === currentTerm?.id && <span className="os-text-xs os-c-accent os-fw-600">Current term</span>}
              </div>
              <p className="os-mt-1h os-mx-0 os-mb-0 os-text-md os-c-secondary">{r.narrative}</p>
              <span className="os-text-xs os-c-tertiary">Updated {formatISODate(r.updated_at ?? r.created_at)}</span>
            </div>
            <RemoveIconButton label="Delete" onClick={() => setPendingDeleteId(r.id)} />
          </div>
        ))}
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
    </SectionCard>
  );
}
