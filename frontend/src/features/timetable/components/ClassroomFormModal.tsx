import { useSubjects } from "@/features/curriculum/queries/useSubjects";
import type { ClassroomType } from "@/features/timetable/api/classroom";
import FormModal from "@/shared/ui/FormModal";
import NumberField from "@/shared/ui/NumberField";
import SelectField from "@/shared/ui/SelectField";
import TextField from "@/shared/ui/TextField";
import { isLabMissingSubject, type ClassroomForm } from "@/features/timetable/lib/classroomForm";

interface Props {
  editing: boolean;
  form: ClassroomForm;
  onChange: (form: ClassroomForm) => void;
  isPending: boolean;
  isError: boolean;
  error: unknown;
  onClose: () => void;
  onSubmit: () => void;
}

const TYPES: { value: ClassroomType; label: string }[] = [
  { value: "regular", label: "Homeroom or classroom" },
  { value: "lab", label: "Lab" },
  { value: "eca", label: "Library, hall or other facility" },
];

export default function ClassroomFormModal({ editing, form, onChange, isPending, isError, error, onClose, onSubmit }: Props) {
  const { data: subjects } = useSubjects();
  const labMissingSubject = isLabMissingSubject(form);
  return (
    <FormModal open title={editing ? "Edit resource" : "Add resource"} onClose={onClose} onSubmit={onSubmit} isPending={isPending} submitDisabled={!form.name.trim() || labMissingSubject} isError={isError} error={error} errorFallback="Failed to save resource">
      <div className="os-stack os-gap-4">
        <TextField id="classroom-name" label="Name" placeholder="e.g. 8-A, Science Lab 1, Main hall" value={form.name} onChange={(v) => onChange({ ...form, name: v })} />
        <SelectField
          id="classroom-type"
          label="Type"
          value={form.room_type}
          onChange={(v) => onChange({ ...form, room_type: v as ClassroomType, subject_id: v === "lab" ? form.subject_id : "" })}
          options={TYPES}
        />
        {form.room_type === "lab" && (
          <SelectField
            id="classroom-subject"
            label="Subject this lab is for"
            helperText="The timetable generator only sends this subject's lab periods to this room."
            placeholder="Select subject…"
            showSearch
            value={form.subject_id}
            invalid={labMissingSubject}
            invalidText="Required for a lab."
            onChange={(v) => onChange({ ...form, subject_id: v })}
            options={(subjects ?? []).map((s) => ({ value: s.id, label: s.name }))}
          />
        )}
        <NumberField
          id="classroom-capacity"
          label="Capacity (optional)"
          min={0}
          value={form.capacity === "" ? null : Number(form.capacity)}
          onChange={(v) => onChange({ ...form, capacity: v === null ? "" : String(v) })}
        />
      </div>
    </FormModal>
  );
}
