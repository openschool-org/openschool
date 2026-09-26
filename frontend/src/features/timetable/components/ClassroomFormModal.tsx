import { TextInput, NumberInput, Select, SelectItem } from "@carbon/react";
import { useSubjects } from "@/features/curriculum/queries/useSubjects";
import type { ClassroomType } from "@/features/timetable/api/classroom";
import FormModal from "@/shared/ui/FormModal";
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

export default function ClassroomFormModal({ editing, form, onChange, isPending, isError, error, onClose, onSubmit }: Props) {
  const { data: subjects } = useSubjects();
  const labMissingSubject = isLabMissingSubject(form);
  return (
    <FormModal open title={editing ? "Edit classroom" : "New classroom"} onClose={onClose} onSubmit={onSubmit} isPending={isPending} submitDisabled={!form.name.trim() || labMissingSubject} isError={isError} error={error} errorFallback="Failed to save classroom">
      <div className="os-grid os-gap-4">
        <TextInput id="classroom-name" labelText="Room name" placeholder="e.g. Room 8A, Science Lab 1" value={form.name} onChange={(e) => onChange({ ...form, name: e.target.value })} />
        <TextInput id="classroom-code" labelText="Code (optional)" value={form.code} onChange={(e) => onChange({ ...form, code: e.target.value })} />
        <NumberInput id="classroom-capacity" label="Capacity (optional)" min={0} value={form.capacity} onChange={(_e, { value }) => onChange({ ...form, capacity: value != null ? String(value) : "" })} />
        <Select id="classroom-type" labelText="Type" value={form.room_type} onChange={(e) => onChange({ ...form, room_type: e.target.value as ClassroomType, subject_id: e.target.value === "lab" ? form.subject_id : "" })}>
          <SelectItem value="regular" text="Regular (homeroom)" />
          <SelectItem value="lab" text="Lab" />
          <SelectItem value="eca" text="ECA (extra-curricular activities)" />
        </Select>
        {form.room_type === "lab" && (
          <Select id="classroom-subject" labelText="Subject this lab is for" helperText="The auto-generator only sends this subject's lab periods to this room." value={form.subject_id} invalid={labMissingSubject} invalidText="Required for a lab classroom." onChange={(e) => onChange({ ...form, subject_id: e.target.value })}>
            <SelectItem value="" text="Select subject…" />
            {subjects?.map((s) => <SelectItem key={s.id} value={s.id} text={s.name} />)}
          </Select>
        )}
      </div>
    </FormModal>
  );
}
