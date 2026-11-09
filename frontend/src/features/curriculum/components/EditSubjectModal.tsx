import FormModal from "@/shared/ui/FormModal";
import NumberField from "@/shared/ui/NumberField";
import TextField from "@/shared/ui/TextField";

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
        <TextField id="edit-subject-name" label="Subject name" value={form.name} onChange={(v) => onChange({ ...form, name: v })} onBlur={() => onTouch("name")} invalid={!!touched.name && !form.name.trim()} invalidText="Subject name is required." />
        <TextField id="edit-subject-code" label="Subject code" value={form.code} onChange={(v) => onChange({ ...form, code: v })} onBlur={() => onTouch("code")} invalid={!!touched.code && !form.code.trim()} invalidText="Subject code is required." />
        <TextField id="edit-subject-type" label="Type (optional)" helperText="A descriptive label only, e.g. core, language, aesthetic" value={form.type} onChange={(v) => onChange({ ...form, type: v })} />
        <NumberField id="edit-subject-max-marks" label="Max marks" min={1} max={1000} value={form.max_marks} onChange={(value) => onChange({ ...form, max_marks: Number(value ?? 100) })} helperText="The maximum marks a student can get for this subject." />
      </div>
    </FormModal>
  );
}
