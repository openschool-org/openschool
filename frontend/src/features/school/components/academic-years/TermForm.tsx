import { Button } from "antd";
import { CheckOutlined, PlusOutlined } from "@ant-design/icons";
import TextField from "@/shared/ui/TextField";
import type { Term } from "@/features/school/api/term";
import { isDateRangeInvalid } from "@/shared/lib/date";
import type { TermFormValues, TermTouched } from "@/features/school/lib/termForm";
import DateField from "@/shared/ui/DateField";

interface Props {
  form: TermFormValues;
  onChange: (form: TermFormValues) => void;
  touched: TermTouched;
  onTouch: (field: keyof TermFormValues) => void;
  editing: Term | null;
  isSaving: boolean;
  onSubmit: () => void;
  onCancelEdit: () => void;
}

// Inline add / edit form under the term list.
export default function TermForm({ form, onChange, touched, onTouch, editing, isSaving, onSubmit, onCancelEdit }: Props) {
  const rangeInvalid = isDateRangeInvalid(form.start_date, form.end_date);
  // Remounting the pickers on term switch makes flatpickr pick up the prefilled value.
  const pickerKey = editing?.id ?? "new";
  return (
    <div className="os-stack os-gap-4">
      <div className="os-term-form-grid">
      <TextField
        id="term-name"
        label="Term name"
        placeholder="e.g. Term 1"
        value={form.name}
        onChange={(v) => onChange({ ...form, name: v })}
        onBlur={() => onTouch("name")}
        invalid={!!touched.name && !form.name.trim()}
        invalidText="A name is required."
      />
      <DateField key={`start-${pickerKey}`} value={form.start_date} onChange={(ymd) => onChange({ ...form, start_date: ymd })} id="term-start" labelText="Start date" onBlur={() => onTouch("start_date")} invalid={!!touched.start_date && !form.start_date} invalidText="A start date is required." />
      <DateField key={`end-${pickerKey}`} value={form.end_date} onChange={(ymd) => onChange({ ...form, end_date: ymd })} id="term-end"
          labelText="End date"
          onBlur={() => onTouch("end_date")}
          invalid={!!touched.end_date && (!form.end_date || rangeInvalid)}
          invalidText={rangeInvalid ? "End date must be after the start date." : "An end date is required."} />
      </div>
      <div className="os-flex os-gap-2 os-justify-end">
        {editing && <Button onClick={onCancelEdit} disabled={isSaving}>Cancel</Button>}
        <Button type="primary" icon={editing ? <CheckOutlined /> : <PlusOutlined />} onClick={onSubmit} loading={isSaving}>
          {isSaving ? (editing ? "Saving…" : "Adding…") : editing ? "Save changes" : "Add term"}
        </Button>
      </div>
    </div>
  );
}
