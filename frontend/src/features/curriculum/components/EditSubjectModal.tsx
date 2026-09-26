import { NumberInput, TextInput } from "@carbon/react";
import FormModal from "@/shared/ui/FormModal";

export interface SubjectForm {
  name: string;
  code: string;
  type: string;
  max_marks: number;
}

interface Props {
  form: SubjectForm;
  onChange: (form: SubjectForm) => void;
  touched: { name?: boolean; code?: boolean };
  onTouch: (field: "name" | "code") => void;
  isPending: boolean;
  isError: boolean;
  error: unknown;
  onClose: () => void;
  onSubmit: () => void;
}

export default function EditSubjectModal({ form, onChange, touched, onTouch, isPending, isError, error, onClose, onSubmit }: Props) {
  return (
    <FormModal open title="Edit subject" onClose={onClose} onSubmit={onSubmit} isPending={isPending} submitDisabled={!form.name.trim() || !form.code.trim()} isError={isError} error={error} errorFallback="Failed to update subject">
      <div className="os-grid os-gap-4">
        <TextInput id="edit-subject-name" labelText="Subject name" value={form.name} onChange={(e) => onChange({ ...form, name: e.target.value })} onBlur={() => onTouch("name")} invalid={!!touched.name && !form.name.trim()} invalidText="Subject name is required." />
        <TextInput id="edit-subject-code" labelText="Subject code" value={form.code} onChange={(e) => onChange({ ...form, code: e.target.value })} onBlur={() => onTouch("code")} invalid={!!touched.code && !form.code.trim()} invalidText="Subject code is required." />
        <TextInput id="edit-subject-type" labelText="Type (optional)" helperText="A descriptive label only, e.g. core, language, aesthetic" value={form.type} onChange={(e) => onChange({ ...form, type: e.target.value })} />
        <NumberInput id="edit-subject-max-marks" label="Max marks" min={1} max={1000} value={form.max_marks} onChange={(_e, { value }) => onChange({ ...form, max_marks: Number(value ?? 100) })} helperText="The maximum marks a student can get for this subject." />
      </div>
    </FormModal>
  );
}
