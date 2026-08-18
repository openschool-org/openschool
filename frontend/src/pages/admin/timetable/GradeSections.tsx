import { useState } from "react";
import { Add } from "@carbon/icons-react";
import { Button, InlineNotification, SkeletonText } from "@carbon/react";
import { useCurrentAcademicYear } from "../../../queries/useAcademicYears";
import { useGrades } from "../../../queries/useGrades";
import {
  useGradeSections,
  useCreateGradeSection,
  useUpdateGradeSection,
  useDeleteGradeSection,
  useAssignGradesToSection,
} from "../../../queries/timetable/useGradeSections";
import type { GradeSection } from "../../../services/timetable/gradeSection";
import { getErrorMessage } from "../../../lib/errorMessage";
import ErrorMessage from "../../../components/common/ErrorMessage";
import EmptyState from "../../../components/common/EmptyState";
import ConfirmDeleteModal from "../../../components/common/ConfirmDeleteModal";
import { EMPTY_GRADE_SECTION_FORM, type GradeSectionForm } from "./constants";
import PeriodsEditor from "./components/PeriodsEditor";
import SectionRow from "./components/SectionRow";
import SectionFormModal from "./components/SectionFormModal";

export default function GradeSections({ inline = false }: { inline?: boolean }) {
  const { data: currentYear } = useCurrentAcademicYear();
  const yearId = currentYear?.id ?? "";
  const { data: sections, isLoading, isError, refetch } = useGradeSections(yearId);
  const { data: grades } = useGrades();
  const createSection = useCreateGradeSection();
  const updateSection = useUpdateGradeSection(yearId);
  const deleteSection = useDeleteGradeSection(yearId);
  const assignGrades = useAssignGradesToSection(yearId);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<GradeSection | null>(null);
  const [form, setForm] = useState<GradeSectionForm>(EMPTY_GRADE_SECTION_FORM);
  const [selectedGradeIds, setSelectedGradeIds] = useState<string[]>([]);
  const [toDelete, setToDelete] = useState<GradeSection | null>(null);
  const [periodsFor, setPeriodsFor] = useState<GradeSection | null>(null);

  const openCreate = () => {
    createSection.reset();
    setForm(EMPTY_GRADE_SECTION_FORM);
    setSelectedGradeIds([]);
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (s: GradeSection) => {
    updateSection.reset();
    setForm({
      name: s.name,
      interval_start_time: s.interval_start_time,
      interval_end_time: s.interval_end_time,
      sort_order: s.sort_order,
    });
    setSelectedGradeIds(s.grade_ids);
    setEditing(s);
    setModalOpen(true);
  };

  const handleSave = () => {
    if (!form.name.trim() || !yearId) return;
    if (editing) {
      updateSection.mutate(
        { id: editing.id, data: form },
        {
          onSuccess: () => {
            assignGrades.mutate({ id: editing.id, gradeIds: selectedGradeIds });
            setModalOpen(false);
          },
        },
      );
    } else {
      createSection.mutate(
        { academic_year_id: yearId, grade_ids: selectedGradeIds, ...form },
        { onSuccess: () => setModalOpen(false) },
      );
    }
  };


  const handleDelete = () => {
    if (!toDelete) return;
    deleteSection.mutate(toDelete.id, { onSettled: () => setToDelete(null) });
  };

  const pending = editing ? updateSection : createSection;
  const gradeName = (id: string) => grades?.find((g) => g.id === id)?.name ?? id;

  if (!currentYear) {
    return (
      <div className={inline ? "" : "os-page"}>
        {!inline && (
          <div className="os-page__header">
            <div className="os-page__header-left">
              <h1 className="os-page__title">Grade Sections</h1>
            </div>
          </div>
        )}
        <div className="os-section">
          <EmptyState
            title="No current academic year"
            description="Set an academic year as current before configuring grade sections."
          />
        </div>
      </div>
    );
  }

  return (
    <div className={inline ? "" : "os-page"}>
      {!inline && (
        <div className="os-page__header">
          <div className="os-page__header-left">
            <h1 className="os-page__title">Grade Sections</h1>
            <p className="os-page__subtitle">
              Group grades (Primary, Junior Secondary, Senior Secondary, A/L…) with their own interval time, period
              grid, and section head for {currentYear.label}.
            </p>
          </div>
          <Button renderIcon={Add} kind="primary" size="md" onClick={openCreate}>
            New Section
          </Button>
        </div>
      )}

      {inline && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "1rem" }}>
          <p style={{ margin: 0, fontSize: "0.875rem", color: "#525252" }}>
            Set up different interval times for different grades by grouping them into sections.
          </p>
          <Button renderIcon={Add} kind="primary" size="sm" onClick={openCreate}>
            New Section
          </Button>
        </div>
      )}

      <div className="os-section">
        {isLoading && (
          <div style={{ padding: "1.25rem 1.5rem" }}>
            <SkeletonText width="40%" />
          </div>
        )}
        {isError && <ErrorMessage message="Could not load grade sections." onRetry={refetch} />}
        {deleteSection.isError && (
          <InlineNotification
            kind="error"
            title="Could not delete section"
            subtitle={getErrorMessage(deleteSection.error)}
            lowContrast
            onClose={() => deleteSection.reset()}
            style={{ maxWidth: "100%", margin: "0 1.5rem 1rem" }}
          />
        )}

        {!isLoading && !isError && (!sections || sections.length === 0) && (
          <EmptyState
            title="No grade sections yet"
            description="e.g. Primary (Grades 1-5), Junior Secondary (6-9), Senior Secondary (10-11), Advanced Level (12-13)."
            action={
              <Button renderIcon={Add} kind="primary" onClick={openCreate}>
                New Section
              </Button>
            }
          />
        )}

        {!isLoading && sections && sections.length > 0 && (
          <div>
            {sections.map((s, i) => (
              <SectionRow
                key={s.id}
                section={s}
                isLast={i === sections.length - 1}
                gradeName={gradeName}
                onPeriods={() => setPeriodsFor(s)}
                onEdit={() => openEdit(s)}
                onDelete={() => setToDelete(s)}
              />

            ))}
          </div>
        )}
      </div>

      <SectionFormModal
        open={modalOpen}
        isEdit={!!editing}
        form={form}
        onFormChange={setForm}
        grades={grades}
        selectedGradeIds={selectedGradeIds}
        onSelectedGradeIdsChange={setSelectedGradeIds}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSave}
        isPending={pending.isPending}
        isError={pending.isError}
        error={pending.error}
      />

      {periodsFor && <PeriodsEditor section={periodsFor} onClose={() => setPeriodsFor(null)} />}

      <ConfirmDeleteModal
        open={!!toDelete}
        title="Delete grade section"
        description={<>Delete <strong>{toDelete?.name}</strong>? This cannot be undone, and is blocked while grades are still assigned.</>}
        isPending={deleteSection.isPending}
        onClose={() => setToDelete(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}
