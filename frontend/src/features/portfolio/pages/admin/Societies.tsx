import { useState } from "react";
import { Alert, Button, Drawer, Tag } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import SelectField from "@/shared/ui/SelectField";
import { useArchiveYear } from "@/features/portfolio/hooks/useArchiveYear";
import { useSocieties, useSocietyYears, useDeleteSociety } from "@/features/portfolio/queries/useSocieties";
import ErrorMessage from "@/shared/ui/ErrorMessage";
import ConfirmDeleteModal from "@/shared/ui/ConfirmDeleteModal";
import SocietyFormModal from "@/features/portfolio/components/SocietyFormModal";
import SocietyRoster from "@/features/portfolio/components/SocietyRoster";
import SocietyCards from "@/features/portfolio/components/SocietyCards";
import type { Society } from "@/features/portfolio/api/society";
import MutationErrorNotification from "@/shared/ui/MutationErrorNotification";
import PageHeader from "@/shared/ui/PageHeader";

export default function Societies() {
  const { data: pastYears } = useSocietyYears();
  const { currentYear, yearLoading, viewingYearId, viewingLabel, isArchive, yearOptions, selectYear } = useArchiveYear(pastYears);

  const { data: societies, isLoading: societiesLoading, isError, refetch } = useSocieties(viewingYearId);
  const deleteSociety = useDeleteSociety();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [formSociety, setFormSociety] = useState<Society | null | "new">(null);
  const [deleting, setDeleting] = useState<Society | null>(null);

  const selected = (societies ?? []).find((s) => s.id === selectedId) ?? null;

  const handleDelete = () => {
    if (!deleting) return;
    deleteSociety.mutate({ id: deleting.id, academicYearId: deleting.academic_year_id });
  };

  return (
    <div className="os-page">
      <PageHeader title="Societies" subtitle={<>{isArchive ? `Read only. Societies for ${viewingLabel ?? "this year"}.` : `Clubs and societies for ${currentYear?.label ?? "the current year"}.`}</>}>
        <div className="os-flex os-items-center os-gap-3">
          <SelectField
            id="society-year-selector"
            label="Year"
            hideLabel
            className="os-min-w-12"
            value={viewingYearId}
            onChange={selectYear}
            options={yearOptions}
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setFormSociety("new")} disabled={!currentYear || isArchive}>
            New society
          </Button>
        </div>
      </PageHeader>

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

      <SocietyCards
        loading={yearLoading || societiesLoading}
        societies={societies ?? []}
        readOnly={isArchive}
        onOpen={setSelectedId}
        onEdit={setFormSociety}
        onDelete={setDeleting}
      />

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
