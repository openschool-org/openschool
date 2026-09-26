import { useState } from "react";
import { Idea, Add, Edit } from "@carbon/icons-react";
import { Button, Select, SelectItem, InlineNotification, SkeletonText } from "@carbon/react";
import { useCurrentAcademicYear, useAcademicYears } from "@/features/school/queries/useAcademicYears";
import { useSocieties, useSocietyYears, useDeleteSociety } from "@/features/portfolio/queries/useSocieties";
import EmptyState from "@/shared/ui/EmptyState";
import ErrorMessage from "@/shared/ui/ErrorMessage";
import ConfirmDeleteModal from "@/shared/ui/ConfirmDeleteModal";
import RemoveIconButton from "@/shared/ui/RemoveIconButton";
import SocietyFormModal from "@/features/portfolio/components/SocietyFormModal";
import SocietyRoster from "@/features/portfolio/components/SocietyRoster";
import type { Society } from "@/features/portfolio/api/society";
import MutationErrorNotification from "@/shared/ui/MutationErrorNotification";

export default function Societies() {
  const { data: currentYear, isLoading: yearLoading } = useCurrentAcademicYear();
  const { data: allYears } = useAcademicYears();
  const { data: pastYears } = useSocietyYears();

  const [selectedYearId, setSelectedYearId] = useState<string | null>(null);
  const viewingYearId = selectedYearId ?? currentYear?.id ?? "";
  const isArchive = !!currentYear && viewingYearId !== currentYear.id;

  const { data: societies, isLoading: societiesLoading, isError, refetch } = useSocieties(viewingYearId);
  const deleteSociety = useDeleteSociety();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [formSociety, setFormSociety] = useState<Society | null | "new">(null);
  const [deleting, setDeleting] = useState<Society | null>(null);

  const selected = (societies ?? []).find((s) => s.id === selectedId) ?? null;

  const loading = yearLoading || societiesLoading;

  // Every year with a society on record, plus the current year even when empty.
  const selectableYears = (() => {
    const byId = new Map((allYears ?? []).map((y) => [y.id, y]));
    const ids = new Set((pastYears ?? []).map((y) => y.id));
    if (currentYear) ids.add(currentYear.id);
    return Array.from(ids)
      .map((id) => byId.get(id))
      .filter((y): y is NonNullable<typeof y> => !!y)
      .sort((a, b) => (b.start_date ?? "").localeCompare(a.start_date ?? ""));
  })();

  const handleDelete = () => {
    if (!deleting) return;
    deleteSociety.mutate({ id: deleting.id, academicYearId: deleting.academic_year_id });
  };

  return (
    <div className="os-page">
      <div className="os-page__header">
        <div className="os-page__header-left">
          <h1 className="os-page__title">Societies</h1>
          <p className="os-page__subtitle">
            {isArchive
              ? `Read only. Societies for ${allYears?.find((y) => y.id === viewingYearId)?.label ?? "this year"}.`
              : `Clubs and societies for ${currentYear?.label ?? "the current year"}.`}
          </p>
        </div>
        <div className="os-flex os-items-end os-gap-3">
          <Select
            id="society-year-selector"
            labelText="Year"
            value={viewingYearId}
            onChange={(e) => setSelectedYearId(e.target.value || null)} className="os-min-w-12"
          >
            {selectableYears.map((y) => (
              <SelectItem key={y.id} value={y.id} text={y.id === currentYear?.id ? `${y.label} (current)` : y.label} />
            ))}
          </Select>
          <Button
            renderIcon={Add}
            kind="primary"
            size="md"
            onClick={() => setFormSociety("new")}
            disabled={!currentYear || isArchive}
          >
            New society
          </Button>
        </div>
      </div>

      {isArchive && (
        <InlineNotification
          kind="info"
          lowContrast
          hideCloseButton
          title="Viewing a past year"
          subtitle="This is a read-only archive. Switch to the current year to make changes." className="os-mb-6 os-max-w-full"
        />
      )}

      {!yearLoading && !currentYear && (
        <InlineNotification
          kind="info"
          lowContrast
          hideCloseButton
          title="No current academic year"
          subtitle="Set an academic year as current before creating societies." className="os-mb-6 os-max-w-full"
        />
      )}

      {isError && (
        <div className="os-mb-6">
          <ErrorMessage message="Could not load societies." onRetry={refetch} />
        </div>
      )}

      <MutationErrorNotification
        isError={deleteSociety.isError}
        error={deleteSociety.error}
        title="Could not delete society"
        fallback="Please try again."
        onClose={() => deleteSociety.reset()} className="os-mb-6"
      />

      <div className="os-grid os-grid-cols-side-20 os-gap-6 os-items-grid-start">
        <div className="os-section os-mt-0">
          {loading && (
            <div className="os-py-5 os-px-6">
              <SkeletonText width="60%" />
            </div>
          )}

          {!loading && (societies ?? []).length === 0 && (
            <EmptyState title="No societies yet" description="Create a society and assign its Teacher-in-Charge." />
          )}

          {!loading &&
            (societies ?? []).map((s) => (
              <button
                key={s.id}
                onClick={() => setSelectedId(s.id)}
                className={`${`os-list-row os-list-row--button${selected?.id === s.id ? " is-selected" : ""}`} os-block os-py-3h os-px-6`}
              >
                <div className="os-fw-600 os-text-md os-c-primary">{s.name}</div>
                <div className="os-text-xs os-c-tertiary">
                  TIC: {s.teacher_name} · {s.member_count} member{s.member_count === 1 ? "" : "s"}
                </div>
              </button>
            ))}
        </div>

        {selected ? (
          <div className="os-section os-mt-0">
            <div className="os-section__header">
              <h2 className="os-section__title os-flex os-items-center os-gap-2">
                <Idea size={16} className="os-fill-accent" /> {selected.name}
              </h2>
              {!isArchive && (
                <div className="os-flex os-gap-2">
                  <Button
                    hasIconOnly
                    kind="ghost"
                    size="sm"
                    iconDescription="Edit"
                    renderIcon={Edit}
                    onClick={() => setFormSociety(selected)}
                  />
                  <RemoveIconButton label="Delete" onClick={() => setDeleting(selected)} />
                </div>
              )}
            </div>
            <div className="os-section__body">
              <p className="os-mt-0 os-mx-0 os-mb-5 os-text-sm os-c-secondary">
                Teacher-in-Charge: {selected.teacher_name}
              </p>
              <SocietyRoster societyId={selected.id} readOnly={isArchive} />
            </div>
          </div>
        ) : (
          <div className="os-section os-mt-0">
            <EmptyState title="Select a society" description="Pick a society from the list to manage its roster." />
          </div>
        )}
      </div>

      {formSociety !== null && currentYear && (
        <SocietyFormModal
          society={formSociety === "new" ? null : formSociety}
          academicYearId={currentYear.id}
          onClose={() => setFormSociety(null)}
        />
      )}

      <ConfirmDeleteModal
        open={!!deleting}
        title="Delete society"
        description={`Delete "${deleting?.name}"? This removes its entire roster and cannot be undone.`}
        subject="Society"
        mutation={deleteSociety}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        onSuccess={() => { if (deleting && selectedId === deleting.id) setSelectedId(null); }}
      />
    </div>
  );
}
