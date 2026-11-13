import { useState } from "react";
import { Alert, Button, Card, Drawer, Skeleton, Tag, Tooltip } from "antd";
import { BulbOutlined, EditOutlined, PlusOutlined, TeamOutlined } from "@ant-design/icons";
import SelectField from "@/shared/ui/SelectField";
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
        <div className="os-flex os-items-center os-gap-3">
          <SelectField
            id="society-year-selector"
            label="Year"
            hideLabel
            className="os-min-w-12"
            value={viewingYearId}
            onChange={(v) => setSelectedYearId(v || null)}
            options={selectableYears.map((y) => ({ value: y.id, label: y.id === currentYear?.id ? `${y.label} (current)` : y.label }))}
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setFormSociety("new")} disabled={!currentYear || isArchive}>
            New society
          </Button>
        </div>
      </div>

      {isArchive && <Alert type="info" showIcon className="os-mb-6" title="Viewing a past year" description="This is a read-only archive. Switch to the current year to make changes." />}
      {!yearLoading && !currentYear && <Alert type="info" showIcon className="os-mb-6" title="No current academic year" description="Set an academic year as current before creating societies." />}

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

      {/* One card per society; a card opens its roster in a side drawer. */}
      {loading ? (
        <div className="os-society-grid">
          {Array.from({ length: 3 }).map((_, i) => <Card key={i} className="os-society-card"><Skeleton active title paragraph={{ rows: 2 }} /></Card>)}
        </div>
      ) : (societies ?? []).length === 0 ? (
        <div className="os-section">
          <EmptyState title="No societies yet" description="Create a society and assign its Teacher-in-Charge." />
        </div>
      ) : (
        <div className="os-society-grid">
          {(societies ?? []).map((s) => (
            <Card
              key={s.id}
              className="os-society-card"
              role="button"
              tabIndex={0}
              aria-label={`Open ${s.name}`}
              onClick={() => setSelectedId(s.id)}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSelectedId(s.id); } }}
              title={<span className="os-flex os-items-center os-gap-2"><BulbOutlined className="os-c-accent" />{s.name}</span>}
              extra={
                !isArchive && (
                  <span className="os-flex os-gap-1" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                    <Tooltip title="Edit society">
                      <Button type="text" size="small" aria-label={`Edit ${s.name}`} icon={<EditOutlined />} onClick={() => setFormSociety(s)} />
                    </Tooltip>
                    <RemoveIconButton label={`Delete ${s.name}`} onClick={() => setDeleting(s)} />
                  </span>
                )
              }
            >
              <p className="os-society-card__label">Teacher-in-Charge</p>
              <p className="os-society-card__teacher">{s.teacher_name}</p>
              <Tag variant="filled" icon={<TeamOutlined />}>{s.member_count} {s.member_count === 1 ? "member" : "members"}</Tag>
            </Card>
          ))}
        </div>
      )}

      <Drawer
        open={!!selected}
        onClose={() => setSelectedId(null)}
        size={640}
        className="os-detail-drawer"
        destroyOnHidden
        title={selected?.name}
        extra={selected && <Tag variant="filled">{isArchive ? "Read only" : `Teacher-in-Charge: ${selected.teacher_name}`}</Tag>}
      >
        {selected && (
          <div className="os-section os-section__body">
            <SocietyRoster societyId={selected.id} readOnly={isArchive} />
          </div>
        )}
      </Drawer>

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
