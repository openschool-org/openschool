import { useState } from "react";
import { Checkmark, TrashCan, Edit, Add } from "@carbon/icons-react";
import {
  Button,
  Tag,
  TextInput,
  DatePicker,
  DatePickerInput,
  InlineNotification,
  ComposedModal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  SkeletonText,
} from "@carbon/react";
import { useTerms, useCreateTerm, useUpdateTerm, useSetCurrentTerm, useDeleteTerm } from "../../../../queries/useTerms";
import type { AcademicYear } from "../../../../services/academicYear";
import type { Term } from "../../../../services/term";
import { getErrorMessage } from "../../../../lib/errorMessage";
import ConfirmDeleteModal from "../../../../components/common/ConfirmDeleteModal";
import { toYmd } from "../../../../lib/date";

function formatTermDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-LK", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// Terms come back with RFC3339 timestamps; the date pickers want Y-m-d.
function isoToYmd(iso: string | null): string {
  if (!iso) return "";
  return toYmd(new Date(iso));
}

const EMPTY_TERM_FORM = { name: "", start_date: "", end_date: "" };

export default function TermsModal({ year, onClose }: { year: AcademicYear; onClose: () => void }) {
  const { data: terms, isLoading } = useTerms(year.id);
  const createTerm = useCreateTerm(year.id);
  const updateTerm = useUpdateTerm(year.id);
  const setCurrentTerm = useSetCurrentTerm(year.id);
  const deleteTerm = useDeleteTerm(year.id);

  const [form, setForm] = useState(EMPTY_TERM_FORM);
  const [touched, setTouched] = useState<{ name?: boolean; start_date?: boolean; end_date?: boolean }>({});
  const [toDelete, setToDelete] = useState<Term | null>(null);
  // When set, the form below edits this term instead of creating a new one.
  const [editing, setEditing] = useState<Term | null>(null);

  const dateRangeInvalid = !!form.start_date && !!form.end_date && form.end_date <= form.start_date;
  const isValid = form.name.trim().length > 0 && !!form.start_date && !!form.end_date && !dateRangeInvalid;

  const resetForm = () => {
    setForm(EMPTY_TERM_FORM);
    setTouched({});
    setEditing(null);
  };

  const startEdit = (t: Term) => {
    createTerm.reset();
    updateTerm.reset();
    setForm({
      name: t.name,
      start_date: isoToYmd(t.start_date),
      end_date: isoToYmd(t.end_date),
    });
    setTouched({});
    setEditing(t);
  };

  const handleSubmit = () => {
    setTouched({ name: true, start_date: true, end_date: true });
    if (!isValid) return;
    if (editing) {
      updateTerm.mutate(
        {
          id: editing.id,
          data: {
            name: form.name.trim(),
            start_date: new Date(form.start_date).toISOString(),
            end_date: new Date(form.end_date).toISOString(),
            sort_order: editing.sort_order,
          },
        },
        { onSuccess: resetForm },
      );
      return;
    }
    createTerm.mutate(
      {
        academic_year_id: year.id,
        name: form.name.trim(),
        start_date: new Date(form.start_date).toISOString(),
        end_date: new Date(form.end_date).toISOString(),
        // Max existing + 1, not length — a gap from a deleted term (e.g.
        // orders [0, 2]) would otherwise hand out a colliding sort_order.
        sort_order: (terms ?? []).reduce((max, t) => Math.max(max, t.sort_order), -1) + 1,
      },
      { onSuccess: resetForm },
    );
  };

  const isSaving = createTerm.isPending || updateTerm.isPending;

  return (
    <>
      <ComposedModal open size="sm" onClose={onClose}>
        <ModalHeader title={`Terms — ${year.label}`} />
        <ModalBody>
          {createTerm.isError && (
            <InlineNotification
              kind="error"
              title="Error"
              subtitle={getErrorMessage(createTerm.error, "Failed to create term")}
              lowContrast
              hideCloseButton
              style={{ marginBottom: "1rem", maxWidth: "100%" }}
            />
          )}
          {updateTerm.isError && (
            <InlineNotification
              kind="error"
              title="Error"
              subtitle={getErrorMessage(updateTerm.error, "Failed to update term")}
              lowContrast
              hideCloseButton
              style={{ marginBottom: "1rem", maxWidth: "100%" }}
            />
          )}
          {deleteTerm.isError && (
            <InlineNotification
              kind="error"
              title="Error"
              subtitle={getErrorMessage(deleteTerm.error, "Failed to delete term")}
              lowContrast
              hideCloseButton
              style={{ marginBottom: "1rem", maxWidth: "100%" }}
            />
          )}

          {isLoading && <SkeletonText paragraph lineCount={3} />}

          {!isLoading && terms?.length === 0 && (
            <p style={{ fontSize: "0.875rem", color: "#8d8d8d", marginBottom: "1.25rem" }}>
              No terms yet — a school year typically has three.
            </p>
          )}

          {!isLoading && terms && terms.length > 0 && (
            <div style={{ marginBottom: "1.5rem" }}>
              {terms.map((t) => (
                <div
                  key={t.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.625rem",
                    padding: "0.625rem 0",
                    borderBottom: "1px solid #e0e0e0",
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontWeight: 500, fontSize: "0.875rem", color: "#161616" }}>{t.name}</p>
                    <p style={{ margin: 0, fontSize: "0.75rem", color: "#525252" }}>
                      {formatTermDate(t.start_date)} – {formatTermDate(t.end_date)}
                    </p>
                  </div>
                  {t.is_current ? (
                    <Tag type="teal" size="sm">
                      <Checkmark size={12} style={{ marginRight: "4px" }} />
                      Current
                    </Tag>
                  ) : (
                    <Button
                      kind="ghost"
                      size="sm"
                      onClick={() => setCurrentTerm.mutate(t.id)}
                      disabled={setCurrentTerm.isPending}
                    >
                      Set Current
                    </Button>
                  )}
                  <Button
                    hasIconOnly
                    kind="ghost"
                    size="sm"
                    iconDescription="Edit term"
                    renderIcon={Edit}
                    onClick={() => startEdit(t)}
                  />
                  <Button
                    hasIconOnly
                    kind="ghost"
                    size="sm"
                    iconDescription="Delete term"
                    renderIcon={TrashCan}
                    onClick={() => setToDelete(t)}
                  />
                </div>
              ))}
            </div>
          )}

          <div style={{ display: "grid", gap: "0.75rem" }}>
            {editing && (
              <p style={{ margin: 0, fontSize: "0.75rem", fontWeight: 600, color: "#161616" }}>
                Editing {editing.name}
              </p>
            )}
            <TextInput
              id="term-name"
              labelText="Term name"
              placeholder="e.g. Term 1"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              onBlur={() => setTouched((t) => ({ ...t, name: true }))}
              invalid={!!touched.name && !form.name.trim()}
              invalidText="A name is required."
            />
            {/* Remount the pickers when switching term, so flatpickr picks up
                the prefilled value instead of keeping the previous one. */}
            <DatePicker
              key={`start-${editing?.id ?? "new"}`}
              datePickerType="single"
              dateFormat="Y-m-d"
              value={form.start_date}
              onChange={(dates) => setForm((f) => ({ ...f, start_date: toYmd(dates[0]) }))}
            >
              <DatePickerInput
                id="term-start"
                labelText="Start Date"
                placeholder="YYYY-MM-DD"
                onBlur={() => setTouched((t) => ({ ...t, start_date: true }))}
                invalid={!!touched.start_date && !form.start_date}
                invalidText="A start date is required."
              />
            </DatePicker>
            <DatePicker
              key={`end-${editing?.id ?? "new"}`}
              datePickerType="single"
              dateFormat="Y-m-d"
              value={form.end_date}
              onChange={(dates) => setForm((f) => ({ ...f, end_date: toYmd(dates[0]) }))}
            >
              <DatePickerInput
                id="term-end"
                labelText="End Date"
                placeholder="YYYY-MM-DD"
                onBlur={() => setTouched((t) => ({ ...t, end_date: true }))}
                invalid={!!touched.end_date && (!form.end_date || dateRangeInvalid)}
                invalidText={dateRangeInvalid ? "End date must be after the start date." : "An end date is required."}
              />
            </DatePicker>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <Button
                kind="ghost"
                size="sm"
                renderIcon={editing ? Checkmark : Add}
                onClick={handleSubmit}
                disabled={isSaving}
              >
                {isSaving ? (editing ? "Saving…" : "Adding…") : editing ? "Save Changes" : "Add Term"}
              </Button>
              {editing && (
                <Button kind="ghost" size="sm" onClick={resetForm} disabled={isSaving}>
                  Cancel
                </Button>
              )}
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button kind="secondary" onClick={onClose}>
            Close
          </Button>
        </ModalFooter>
      </ComposedModal>

      <ConfirmDeleteModal
        open={!!toDelete}
        title="Delete term"
        description={
          <>
            Delete <strong>{toDelete?.name}</strong>? Every examination mark
            recorded against this term is deleted with it. To correct a name or
            date, use Edit instead — this cannot be undone.
          </>
        }
        isPending={deleteTerm.isPending}
        onClose={() => setToDelete(null)}
        onConfirm={() => {
          if (toDelete) deleteTerm.mutate(toDelete.id, { onSuccess: () => setToDelete(null) });
        }}
      />
    </>
  );
}
