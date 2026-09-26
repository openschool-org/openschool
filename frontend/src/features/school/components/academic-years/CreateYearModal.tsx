import type { Dispatch, SetStateAction } from "react";
import { TextInput, Checkbox } from "@carbon/react";
import type { useCreateAcademicYear } from "@/features/school/queries/useAcademicYears";
import FormModal from "@/shared/ui/FormModal";
import DateField from "@/shared/ui/DateField";

export interface YearForm {
  label: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
}

export interface YearFormTouched {
  label?: boolean;
  start_date?: boolean;
  end_date?: boolean;
}

interface Props {
  open: boolean;
  form: YearForm;
  setForm: Dispatch<SetStateAction<YearForm>>;
  touched: YearFormTouched;
  setTouched: Dispatch<SetStateAction<YearFormTouched>>;
  dateRangeInvalid: boolean;
  isValid: boolean;
  createYear: ReturnType<typeof useCreateAcademicYear>;
  onClose: () => void;
  onCreate: () => void;
}

export default function CreateYearModal({
  open,
  form,
  setForm,
  touched,
  setTouched,
  dateRangeInvalid,
  isValid,
  createYear,
  onClose,
  onCreate,
}: Props) {
  return (
    <FormModal
      open={open}
      title="New academic year"
      onClose={onClose}
      onSubmit={onCreate}
      isPending={createYear.isPending}
      submitDisabled={!isValid}
      submitLabel="Create"
      pendingLabel="Creating…"
      isError={createYear.isError}
      error={createYear.error}
      errorFallback="Failed to create academic year"
    >
      <div className="os-grid os-gap-4">
        <TextInput
          id="ay-label"
          labelText="Label"
          placeholder="e.g. 2027"
          value={form.label}
          onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
          onBlur={() => setTouched((t) => ({ ...t, label: true }))}
          invalid={!!touched.label && !form.label.trim()}
          invalidText="A label is required."
        />
        <DateField value={form.start_date} onChange={(ymd) => setForm((f) => ({ ...f, start_date: ymd }))} id="ay-start"
            labelText="Start date"
            onBlur={() => setTouched((t) => ({ ...t, start_date: true }))}
            invalid={!!touched.start_date && !form.start_date}
            invalidText="A start date is required." />
        <DateField value={form.end_date} onChange={(ymd) => setForm((f) => ({ ...f, end_date: ymd }))} id="ay-end"
            labelText="End date"
            onBlur={() => setTouched((t) => ({ ...t, end_date: true }))}
            invalid={!!touched.end_date && (!form.end_date || dateRangeInvalid)}
            invalidText={dateRangeInvalid ? "End date must be after the start date." : "An end date is required."} />
        <Checkbox
          id="ay-current"
          labelText="Set as current academic year"
          checked={form.is_current}
          onChange={(_e, { checked }) => setForm((f) => ({ ...f, is_current: checked }))}
        />
      </div>
    </FormModal>
  );
}
