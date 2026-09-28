import { useState } from "react";
import { Calendar, Checkmark, Edit } from "@carbon/icons-react";
import { Button, Tag, ComposedModal, ModalHeader, ModalBody, ModalFooter, SkeletonText } from "@carbon/react";
import { useTerms, useCreateTerm, useUpdateTerm, useSetCurrentTerm, useDeleteTerm } from "@/features/school/queries/useTerms";
import type { AcademicYear } from "@/features/school/api/academicYear";
import type { Term } from "@/features/school/api/term";
import TermForm from "@/features/school/components/academic-years/TermForm";
import { isTermFormValid, type TermFormValues, type TermTouched } from "@/features/school/lib/termForm";
import ConfirmDeleteModal from "@/shared/ui/ConfirmDeleteModal";
import MutationErrorNotification from "@/shared/ui/MutationErrorNotification";
import RemoveIconButton from "@/shared/ui/RemoveIconButton";
import { toYmd, formatDayMonthYear } from "@/shared/lib/date";

const isoToYmd = (iso: string | null) => (iso ? toYmd(new Date(iso)) : "");
const EMPTY: TermFormValues = { name: "", start_date: "", end_date: "" };

export default function TermsModal({ year, onClose }: { year: AcademicYear; onClose: () => void }) {
  const { data: terms, isLoading } = useTerms(year.id);
  const createTerm = useCreateTerm();
  const updateTerm = useUpdateTerm();
  const setCurrentTerm = useSetCurrentTerm();
  const deleteTerm = useDeleteTerm();

  const [form, setForm] = useState(EMPTY);
  const [touched, setTouched] = useState<TermTouched>({});
  const [toDelete, setToDelete] = useState<Term | null>(null);
  const [editing, setEditing] = useState<Term | null>(null);

  const resetForm = () => {
    setForm(EMPTY);
    setTouched({});
    setEditing(null);
  };

  const startEdit = (t: Term) => {
    createTerm.reset();
    updateTerm.reset();
    setForm({ name: t.name, start_date: isoToYmd(t.start_date), end_date: isoToYmd(t.end_date) });
    setTouched({});
    setEditing(t);
  };

  const submit = () => {
    setTouched({ name: true, start_date: true, end_date: true });
    if (!isTermFormValid(form)) return;
    const dates = { name: form.name.trim(), start_date: new Date(form.start_date).toISOString(), end_date: new Date(form.end_date).toISOString() };
    if (editing) {
      updateTerm.mutate({ id: editing.id, data: { ...dates, sort_order: editing.sort_order } }, { onSuccess: resetForm });
      return;
    }
    // Max existing + 1 so a gap left by a deleted term never collides.
    const sort_order = (terms ?? []).reduce((max, t) => Math.max(max, t.sort_order), -1) + 1;
    createTerm.mutate({ academic_year_id: year.id, ...dates, sort_order }, { onSuccess: resetForm });
  };

  return (
    <>
      <ComposedModal open size="md" onClose={onClose} aria-label={`Terms - ${year.label}`}>
        <ModalHeader title={`Terms - ${year.label}`} />
        <ModalBody>
          <div className="os-terms-modal-intro">
            <Calendar size={20} className="os-fill-accent" />
            <p className="os-m-0 os-text-sm os-c-secondary">Organise this academic year into terms. Set one term as current for attendance, marks, and reports.</p>
          </div>
          <MutationErrorNotification isError={createTerm.isError} error={createTerm.error} title="Could not create term" fallback="Please try again." />
          <MutationErrorNotification isError={updateTerm.isError} error={updateTerm.error} title="Could not update term" fallback="Please try again." />
          <MutationErrorNotification isError={deleteTerm.isError} error={deleteTerm.error} title="Could not delete term" fallback="Please try again." />

          {isLoading && <SkeletonText paragraph lineCount={3} />}
          {!isLoading && terms?.length === 0 && <p className="os-terms-empty os-text-md os-c-tertiary os-mb-5">No terms yet. Add the first term below to get started.</p>}
          {!!terms?.length && (
            <div className="os-term-list os-mb-6">
              {terms.map((t) => (
                <div key={t.id} className={`os-term-card${t.is_current ? " is-current" : ""}`}>
                  <div className="os-term-card__marker" aria-hidden="true"><Calendar size={16} /></div>
                  <div className="os-flex-1 os-min-w-0">
                    <p className="os-m-0 os-fw-500 os-text-md os-c-primary">{t.name}</p>
                    <p className="os-m-0 os-text-xs os-c-secondary">{formatDayMonthYear(t.start_date)} – {formatDayMonthYear(t.end_date)}</p>
                  </div>
                  <div className="os-term-card__actions">
                    {t.is_current ? (
                      <Tag type="teal" size="sm"><Checkmark size={12} className="os-mr-1" />Current</Tag>
                    ) : (
                      <Button kind="ghost" size="sm" onClick={() => setCurrentTerm.mutate(t.id)} disabled={setCurrentTerm.isPending}>Set current</Button>
                    )}
                    <Button hasIconOnly kind="ghost" size="sm" iconDescription="Edit term" renderIcon={Edit} onClick={() => startEdit(t)} />
                    <RemoveIconButton label="Delete term" onClick={() => setToDelete(t)} />
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="os-term-form-panel">
            <div className="os-term-form-panel__heading">
              <h3 className="os-m-0 os-text-sm os-fw-600">{editing ? `Edit ${editing.name}` : "Add a term"}</h3>
              {!editing && <span className="os-text-xs os-c-tertiary">Use clear dates so staff know the active period.</span>}
            </div>
            <TermForm form={form} onChange={setForm} touched={touched} onTouch={(f) => setTouched((t) => ({ ...t, [f]: true }))} editing={editing} isSaving={createTerm.isPending || updateTerm.isPending} onSubmit={submit} onCancelEdit={resetForm} />
          </div>
        </ModalBody>
        <ModalFooter>
          <Button kind="secondary" onClick={onClose}>Close</Button>
        </ModalFooter>
      </ComposedModal>

      <ConfirmDeleteModal
        open={!!toDelete}
        title="Delete term"
        description={<>Delete <strong>{toDelete?.name}</strong>? Every examination mark recorded against this term is deleted with it. To correct a name or date, use Edit instead. This cannot be undone.</>}
        subject="Term"
        mutation={deleteTerm}
        onClose={() => setToDelete(null)}
        onConfirm={() => toDelete && deleteTerm.mutate(toDelete.id)}
      />
    </>
  );
}
