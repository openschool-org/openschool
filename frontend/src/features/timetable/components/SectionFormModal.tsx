import { Select } from "antd";
import type { Grade } from "@/features/academics/api/grade";
import type { GradeSectionForm } from "@/features/timetable/constants";
import Field from "@/shared/ui/Field";
import FormModal from "@/shared/ui/FormModal";
import TextField from "@/shared/ui/TextField";

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
    <FormModal
      open={open}
      title={isEdit ? "Edit grade section" : "New grade section"}
      size="md"
      onClose={onClose}
      onSubmit={onSubmit}
      isPending={isPending}
      submitDisabled={!form.name.trim()}
      isError={isError}
      error={error}
    >
      <div className="os-stack os-gap-4">
        <TextField id="section-name" label="Section name" placeholder="e.g. Junior Secondary" value={form.name} onChange={(v) => onFormChange({ ...form, name: v })} />
        <div className="os-grid os-grid-cols-2 os-gap-4">
          <TextField id="section-interval-start" label="Interval start" type="time" value={form.interval_start_time} onChange={(v) => onFormChange({ ...form, interval_start_time: v })} />
          <TextField id="section-interval-end" label="Interval end" type="time" value={form.interval_end_time} onChange={(v) => onFormChange({ ...form, interval_end_time: v })} />
        </div>
        <Field id="section-grades" label="Grades in this section">
          <Select
            id="section-grades"
            mode="multiple"
            className="os-w-full"
            placeholder="Select grades…"
            optionFilterProp="label"
            value={selectedGradeIds}
            onChange={onSelectedGradeIdsChange}
            options={(grades ?? []).map((g) => ({ value: g.id, label: g.name }))}
          />
        </Field>
      </div>
    </FormModal>
  );
}
