import { useState } from "react";
import { Link } from "react-router";
import { Add } from "@carbon/icons-react";
import { Accordion, Button, InlineNotification } from "@carbon/react";
import type { Grade } from "@/features/academics/api/grade";
import type { ClassWithDetails } from "@/features/academics/api/class";
import { useGradesPage } from "@/features/academics/hooks/useGradesPage";
import GradeGroup, { GradeGroupSkeleton } from "@/features/academics/components/GradeGroup";
import GradeFormModal from "@/features/academics/components/GradeFormModal";
import ErrorMessage from "@/shared/ui/ErrorMessage";
import EmptyState from "@/shared/ui/EmptyState";
import ConfirmDeleteModal from "@/shared/ui/ConfirmDeleteModal";
import SectionHeader from "@/shared/ui/SectionHeader";
import MutationErrorNotification from "@/shared/ui/MutationErrorNotification";
import AgentFindingsBanner from "@/features/notifications/components/AgentFindingsBanner";


export default function Classes() {
  const page = useGradesPage();
  const { orderedGrades, classesByGrade, mutations, form } = page;
  const { createGrade, updateGrade, deleteGrade, reorder, deleteClass } = mutations;
  const [gradeToDelete, setGradeToDelete] = useState<Grade | null>(null);
  const [classToDelete, setClassToDelete] = useState<ClassWithDetails | null>(null);
  const [openGrades, setOpenGrades] = useState<Set<string>>(new Set());

  const toggleOpen = (id: string) =>
    setOpenGrades((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const busy = reorder.isPending;
  const isLoading = page.grades.isLoading || page.classes.isLoading;
  const isError = page.grades.isError || page.classes.isError;
  const isEdit = form.gradeModal === "edit";
  const saving = isEdit ? updateGrade : createGrade;

  return (
    <div className="os-page">
      <div className="os-page__header">
        <div className="os-page__header-left">
          <h1 className="os-page__title">Grades &amp; classes</h1>
          <p className="os-page__subtitle">Grades and their classes for the current academic year.</p>
        </div>
        <div className="os-flex os-gap-3">
          <Button renderIcon={Add} kind="secondary" size="md" onClick={page.openCreateGrade}>Add grade</Button>
          <Button renderIcon={Add} kind="primary" size="md" as={Link} to="/classes/new">Add class</Button>
        </div>
      </div>

      <AgentFindingsBanner />

      <div className="os-section">
        <SectionHeader
          title="Grades"
          meta={!isLoading && !isError && <span className="os-section__meta">{orderedGrades.length} {orderedGrades.length === 1 ? "grade" : "grades"}</span>}
        />

        {(deleteGrade.isError || deleteClass.isError || reorder.isError) && (
          <div className="os-pt-4 os-px-6 os-pb-0">
            <MutationErrorNotification isError={deleteGrade.isError} error={deleteGrade.error} title="Could not delete grade" fallback="The grade may be used by a class or curriculum level." onClose={() => deleteGrade.reset()} />
            <MutationErrorNotification isError={deleteClass.isError} error={deleteClass.error} title="Could not delete class" fallback="The class may still have students enrolled." onClose={() => deleteClass.reset()} />
            <MutationErrorNotification isError={reorder.isError} error={reorder.error} title="Could not reorder" fallback="Please try again." onClose={() => reorder.reset()} />
          </div>
        )}

        {isError && (
          <div className="os-py-5 os-px-6">
            <ErrorMessage message="Could not load grades and classes." onRetry={() => { page.grades.refetch(); page.classes.refetch(); }} />
          </div>
        )}

        {!isLoading && !isError && page.needsRenumber && orderedGrades.length > 0 && (
          <div className="os-flex os-items-center os-gap-2 os-wrap os-pt-4 os-px-6 os-pb-0">
            <InlineNotification
              kind="warning"
              title={page.duplicateCount > 0 ? `${page.duplicateCount} grades share the same position` : "Positions have gaps"}
              subtitle="Renumber them in the order shown below."
              lowContrast
              hideCloseButton
              className="os-max-w-full os-m-0 os-flex-1"
            />
            <Button kind="tertiary" size="sm" disabled={busy} onClick={() => reorder.mutate(orderedGrades)}>
              {busy ? "Fixing…" : "Fix ordering"}
            </Button>
          </div>
        )}

        {isLoading && (
          <div className="os-py-4 os-px-6">
            {Array.from({ length: 4 }).map((_, i) => <GradeGroupSkeleton key={i} />)}
          </div>
        )}

        {!isLoading && !isError && orderedGrades.length === 0 && (
          <EmptyState
            title="No grades yet"
            description="Add the grades this school runs, then create classes under each one."
            action={<Button renderIcon={Add} kind="primary" onClick={page.openCreateGrade}>Add grade</Button>}
          />
        )}

        {!isLoading && orderedGrades.length > 0 && (
          <div className={`os-py-4 os-px-6${busy ? " os-opacity-60" : ""}`}>
            <Accordion align="start">
              {orderedGrades.map((g, i) => (
                <GradeGroup
                  key={g.id}
                  grade={g}
                  index={i}
                  isLast={i === orderedGrades.length - 1}
                  from={page.range.from}
                  to={page.range.to}
                  busy={busy}
                  classes={classesByGrade.get(g.id) ?? []}
                  open={openGrades.has(g.id)}
                  onToggleOpen={() => toggleOpen(g.id)}
                  onMoveUp={() => page.move(i, -1)}
                  onMoveDown={() => page.move(i, 1)}
                  onEditGrade={() => page.openEditGrade(g)}
                  onDeleteGrade={() => setGradeToDelete(g)}
                  onDeleteClass={setClassToDelete}
                  streamName={page.streamName}
                  teacherName={page.teacherName}
                />
              ))}
            </Accordion>
          </div>
        )}
      </div>

      {form.gradeModal && (
        <GradeFormModal
          mode={form.gradeModal}
          name={form.gradeName}
          onNameChange={form.setGradeName}
          nameTouched={form.gradeNameTouched}
          onNameBlur={() => form.setGradeNameTouched(true)}
          onClose={form.closeModal}
          onSubmit={page.saveGrade}
          isPending={saving.isPending}
          isError={saving.isError}
          error={saving.error}
        />
      )}

      <ConfirmDeleteModal
        open={!!gradeToDelete}
        title="Delete grade"
        description={<>Delete <strong>{gradeToDelete?.name}</strong>? This is blocked while a class or curriculum level uses it.</>}
        subject="Grade"
        mutation={deleteGrade}
        onClose={() => setGradeToDelete(null)}
        onConfirm={() => gradeToDelete && deleteGrade.mutate(gradeToDelete.id)}
      />

      <ConfirmDeleteModal
        open={!!classToDelete}
        title="Delete class"
        description={<>Delete <strong>{classToDelete?.name}</strong>? This is blocked while students are still enrolled in it.</>}
        subject="Class"
        mutation={deleteClass}
        onClose={() => setClassToDelete(null)}
        onConfirm={() => classToDelete && deleteClass.mutate(classToDelete.id)}
      />
    </div>
  );
}
