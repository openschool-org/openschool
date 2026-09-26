import { useState } from "react";
import { Link } from "react-router";
import { Trophy, Add } from "@carbon/icons-react";
import { Button, Select, SelectItem, InlineNotification, SkeletonText } from "@carbon/react";
import { useCurrentAcademicYear, useAcademicYears } from "@/features/school/queries/useAcademicYears";
import { usePrefects, useRemovePrefect, usePrefectYears } from "@/features/portfolio/queries/usePrefects";
import AppointPrefectModal from "@/features/portfolio/components/AppointPrefectModal";
import { PREFECT_RANKS } from "@/features/portfolio/constants";
import type { Prefect } from "@/features/portfolio/api/prefect";
import EmptyState from "@/shared/ui/EmptyState";
import ErrorMessage from "@/shared/ui/ErrorMessage";
import ConfirmDeleteModal from "@/shared/ui/ConfirmDeleteModal";
import MutationErrorNotification from "@/shared/ui/MutationErrorNotification";
import RemoveIconButton from "@/shared/ui/RemoveIconButton";
import SectionHeader from "@/shared/ui/SectionHeader";

export default function Prefects() {
  const { data: currentYear, isLoading: yearLoading } = useCurrentAcademicYear();
  const { data: allYears } = useAcademicYears();
  const { data: pastYears } = usePrefectYears();
  const [selectedYearId, setSelectedYearId] = useState<string | null>(null);
  const viewingYearId = selectedYearId ?? currentYear?.id ?? "";
  const isArchive = !!currentYear && viewingYearId !== currentYear.id;

  const { data: prefects, isLoading: prefectsLoading, isError, refetch } = usePrefects(viewingYearId);
  const removePrefect = useRemovePrefect();
  const [assignOpen, setAssignOpen] = useState(false);
  const [toRemove, setToRemove] = useState<Prefect | null>(null);
  const loading = yearLoading || prefectsLoading;

  // Years with a board on record, plus the current year even when empty.
  const yearById = new Map((allYears ?? []).map((y) => [y.id, y]));
  const yearIds = new Set((pastYears ?? []).map((y) => y.id));
  if (currentYear) yearIds.add(currentYear.id);
  const selectableYears = [...yearIds].map((id) => yearById.get(id)).filter((y) => !!y).sort((a, b) => (b.start_date ?? "").localeCompare(a.start_date ?? ""));

  return (
    <div className="os-page">
      <div className="os-page__header">
        <div className="os-page__header-left">
          <h1 className="os-page__title">School prefects</h1>
          <p className="os-page__subtitle">
            {isArchive
              ? `Read only. Past board for ${yearById.get(viewingYearId)?.label ?? "this year"}.`
              : `Prefects and house captains for ${currentYear?.label ?? "the current year"}.`}
          </p>
        </div>
        <div className="os-flex os-items-end os-gap-3">
          <Select id="prefect-year-selector" labelText="Year" value={viewingYearId} onChange={(e) => setSelectedYearId(e.target.value || null)} className="os-min-w-12">
            {selectableYears.map((y) => <SelectItem key={y.id} value={y.id} text={y.id === currentYear?.id ? `${y.label} (current)` : y.label} />)}
          </Select>
          <Button renderIcon={Add} kind="primary" size="md" onClick={() => setAssignOpen(true)} disabled={!currentYear || isArchive}>Appoint prefect</Button>
        </div>
      </div>

      {isArchive && <InlineNotification kind="info" lowContrast hideCloseButton title="Viewing a past board" subtitle="This is a read-only archive. Switch to the current year to make changes." className="os-mb-6 os-max-w-full" />}
      {!yearLoading && !currentYear && <InlineNotification kind="info" lowContrast hideCloseButton title="No current academic year" subtitle="Set an academic year as current before appointing prefects." className="os-mb-6 os-max-w-full" />}
      {isError && <div className="os-mb-6"><ErrorMessage message="Could not load prefects." onRetry={refetch} /></div>}
      <MutationErrorNotification isError={removePrefect.isError} error={removePrefect.error} title="Could not remove appointment" fallback="Please try again." onClose={() => removePrefect.reset()} />

      {PREFECT_RANKS.map(({ value, label }) => {
        const rows = (prefects ?? []).filter((p) => p.rank === value);
        return (
          <div className="os-section" key={value}>
            <SectionHeader
              title={<span className="os-flex os-items-center os-gap-2"><Trophy size={16} className="os-fill-accent" /> {label}</span>}
              meta={<span className="os-section__meta">{rows.length}</span>}
            />
            {loading ? (
              <div className="os-py-5 os-px-6"><SkeletonText width="40%" /></div>
            ) : rows.length === 0 ? (
              <EmptyState title={`No ${label.toLowerCase()} yet`} description="Appoint a student to this rank." />
            ) : (
              rows.map((p) => (
                <div key={p.id} className="os-list-row os-py-3 os-px-6">
                  <div className="os-flex-1 os-min-w-0">
                    <Link to={`/students/${p.student_id}`} className="os-table__link os-text-md os-fw-500">{p.student_name}</Link>
                    <p className="os-mt-h os-mx-0 os-mb-0 os-text-xs os-c-secondary">{[p.grade_name, p.student_index].filter(Boolean).join(" · ")}</p>
                  </div>
                  {!isArchive && <RemoveIconButton disabled={removePrefect.isPending} onClick={() => setToRemove(p)} />}
                </div>
              ))
            )}
          </div>
        );
      })}

      {assignOpen && currentYear && (
        <AppointPrefectModal academicYearId={currentYear.id} assignedStudentIds={new Set((prefects ?? []).map((p) => p.student_id))} onClose={() => setAssignOpen(false)} />
      )}

      <ConfirmDeleteModal
        open={!!toRemove}
        title="Remove prefect"
        description={<>Remove <strong>{toRemove?.student_name}</strong> from this board?</>}
        confirmLabel="Remove"
        pendingLabel="Removing…"
        subject="Prefect"
        successVerb="removed"
        mutation={removePrefect}
        onClose={() => setToRemove(null)}
        onConfirm={() => toRemove && currentYear && removePrefect.mutate({ id: toRemove.id, academicYearId: currentYear.id })}
      />
    </div>
  );
}
