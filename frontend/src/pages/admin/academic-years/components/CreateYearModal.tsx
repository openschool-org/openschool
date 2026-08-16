import type { Dispatch, SetStateAction } from "react";
import { TextInput, DatePicker, DatePickerInput, Checkbox } from "@carbon/react";
import type { useCreateAcademicYear } from "../../../../queries/useAcademicYears";
import FormModal from "../../../../components/common/FormModal";
import { toYmd } from "../../../../lib/date";

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
      <div style={{ display: "grid", gap: "1rem" }}>
        <TextInput
          id="ay-label"
          labelText="Label"
          placeholder="e.g. 2026"
          value={form.label}
          onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
          onBlur={() => setTouched((t) => ({ ...t, label: true }))}
          invalid={!!touched.label && !form.label.trim()}
          invalidText="A label is required."
        />
        <DatePicker
          datePickerType="single"
          dateFormat="Y-m-d"
          value={form.start_date}
          onChange={(dates) => setForm((f) => ({ ...f, start_date: toYmd(dates[0]) }))}
        >
          <DatePickerInput
            id="ay-start"
            labelText="Start Date"
            placeholder="YYYY-MM-DD"
            onBlur={() => setTouched((t) => ({ ...t, start_date: true }))}
            invalid={!!touched.start_date && !form.start_date}
            invalidText="A start date is required."
          />
        </DatePicker>
        <DatePicker
          datePickerType="single"
          dateFormat="Y-m-d"
          value={form.end_date}
          onChange={(dates) => setForm((f) => ({ ...f, end_date: toYmd(dates[0]) }))}
        >
          <DatePickerInput
            id="ay-end"
            labelText="End Date"
            placeholder="YYYY-MM-DD"
            onBlur={() => setTouched((t) => ({ ...t, end_date: true }))}
            invalid={!!touched.end_date && (!form.end_date || dateRangeInvalid)}
            invalidText={dateRangeInvalid ? "End date must be after the start date." : "An end date is required."}
          />
        </DatePicker>
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
