import { useState } from "react";
import { Link } from "react-router";
import { Alert, Button } from "antd";
import { PlusOutlined, TrophyOutlined } from "@ant-design/icons";
import SelectField from "@/shared/ui/SelectField";
import { useArchiveYear } from "@/features/portfolio/hooks/useArchiveYear";
import { usePrefects, useRemovePrefect, usePrefectYears } from "@/features/portfolio/queries/usePrefects";
import AppointPrefectModal from "@/features/portfolio/components/AppointPrefectModal";
import { PREFECT_RANKS } from "@/features/portfolio/constants";
import type { Prefect } from "@/features/portfolio/api/prefect";
import EmptyState from "@/shared/ui/EmptyState";
import ErrorMessage from "@/shared/ui/ErrorMessage";
import ConfirmDeleteModal from "@/shared/ui/ConfirmDeleteModal";
import MutationErrorNotification from "@/shared/ui/MutationErrorNotification";
import RemoveIconButton from "@/shared/ui/RemoveIconButton";
import SectionCard from "@/shared/ui/SectionCard";
import ListRowSkeleton from "@/shared/ui/ListRowSkeleton";
import PageHeader from "@/shared/ui/PageHeader";

export default function Prefects() {
  const { data: pastYears } = usePrefectYears();
  const { currentYear, yearLoading, viewingYearId, viewingLabel, isArchive, yearOptions, selectYear } = useArchiveYear(pastYears);

  const { data: prefects, isLoading: prefectsLoading, isError, refetch } = usePrefects(viewingYearId);
  const removePrefect = useRemovePrefect();
  const [assignOpen, setAssignOpen] = useState(false);
  const [toRemove, setToRemove] = useState<Prefect | null>(null);
  const loading = yearLoading || prefectsLoading;

  return (
    <div className="os-page">
      <PageHeader title="School prefects" subtitle={<>{isArchive ? `Read only. Past board for ${viewingLabel ?? "this year"}.` : `Prefects and house captains for ${currentYear?.label ?? "the current year"}.`}</>}>
        <div className="os-flex os-items-center os-gap-3">
          <SelectField
            id="prefect-year-selector"
            label="Year"
            hideLabel
            className="os-min-w-12"
            value={viewingYearId}
            onChange={selectYear}
            options={yearOptions}
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setAssignOpen(true)} disabled={!currentYear || isArchive}>Appoint prefect</Button>
        </div>
      </PageHeader>

      {isArchive && <Alert type="info" showIcon className="os-mb-6" title="Viewing a past board" description="This is a read-only archive. Switch to the current year to make changes." />}
      {!yearLoading && !currentYear && <Alert type="info" showIcon className="os-mb-6" title="No current academic year" description="Set an academic year as current before appointing prefects." />}
      {isError && <div className="os-mb-6"><ErrorMessage message="Could not load prefects." onRetry={refetch} /></div>}
      <MutationErrorNotification isError={removePrefect.isError} error={removePrefect.error} title="Could not remove appointment" fallback="Please try again." onClose={() => removePrefect.reset()} />

      {!isError && PREFECT_RANKS.map(({ value, label }) => {
        const rows = (prefects ?? []).filter((p) => p.rank === value);
        return (
        <SectionCard
          key={value}
          title={<span className="os-flex os-items-center os-gap-2"><TrophyOutlined className="os-c-accent" /> {label}</span>}
          meta={<span className="os-section__meta">{rows.length}</span>}
          flush
        >
            {loading ? (
              <ListRowSkeleton leadingWidth="2.25rem" titleWidth="45%" subtitleWidth="30%" trailingWidth={null} />
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
        </SectionCard>
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
