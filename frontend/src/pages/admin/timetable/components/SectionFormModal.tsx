import { Button, TextInput, MultiSelect, InlineNotification, ComposedModal, ModalHeader, ModalBody, ModalFooter } from "@carbon/react";
import { getErrorMessage } from "../../../../lib/errorMessage";
import type { Grade } from "../../../../services/grade";
import type { GradeSectionForm } from "../constants";

export default function SectionFormModal({
  open,
  isEdit,
  form,
  onFormChange,
  grades,
  selectedGradeIds,
  onSelectedGradeIdsChange,
  onClose,
  onSubmit,
  isPending,
  isError,
  error,
}: {
  open: boolean;
  isEdit: boolean;
  form: GradeSectionForm;
  onFormChange: (form: GradeSectionForm) => void;
  grades: Grade[] | undefined;
  selectedGradeIds: string[];
  onSelectedGradeIdsChange: (ids: string[]) => void;
  onClose: () => void;
  onSubmit: () => void;
  isPending: boolean;
  isError: boolean;
  error: unknown;
}) {
  return (
    <ComposedModal open={open} size="md" onClose={onClose}>
      <ModalHeader title={isEdit ? "Edit grade section" : "New grade section"} />
      <ModalBody>
        {isError && (
          <InlineNotification
            kind="error"
            title="Error"
            subtitle={getErrorMessage(error)}
            lowContrast
            style={{ marginBottom: "1rem", maxWidth: "100%" }}
          />
        )}
        <div style={{ display: "grid", gap: "1rem" }}>
          <TextInput
            id="section-name"
            labelText="Section name"
            placeholder="e.g. Junior Secondary"
            value={form.name}
            onChange={(e) => onFormChange({ ...form, name: e.target.value })}
          />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <TextInput
              id="section-interval-start"
              labelText="Interval start"
              type="time"
              value={form.interval_start_time}
              onChange={(e) => onFormChange({ ...form, interval_start_time: e.target.value })}
            />
            <TextInput
              id="section-interval-end"
              labelText="Interval end"
              type="time"
              value={form.interval_end_time}
              onChange={(e) => onFormChange({ ...form, interval_end_time: e.target.value })}
            />
          </div>
          <MultiSelect
            id="section-grades"
            titleText="Grades in this section"
            label="Select grades…"
            items={grades ?? []}
            itemToString={(g) => g?.name ?? ""}
            selectedItems={(grades ?? []).filter((g) => selectedGradeIds.includes(g.id))}
            onChange={({ selectedItems }) => onSelectedGradeIdsChange((selectedItems ?? []).map((g) => g.id))}
          />
        </div>
      </ModalBody>
      <ModalFooter>
        <Button kind="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button kind="primary" onClick={onSubmit} disabled={!form.name.trim() || isPending}>
          {isPending ? "Saving…" : "Save"}
        </Button>
      </ModalFooter>
    </ComposedModal>
  );
}
