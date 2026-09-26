import { DatePicker, DatePickerInput } from "@carbon/react";
import { fromYmd, toYmd } from "@/shared/lib/date";

interface Props {
  id: string;
  labelText: string;
  // YYYY-MM-DD, the format the API uses; the user sees and picks dd/mm/yyyy.
  value: string;
  onChange: (ymd: string) => void;
  hideLabel?: boolean;
  placeholder?: string;
  size?: "sm" | "md" | "lg";
  invalid?: boolean;
  invalidText?: string;
  onBlur?: () => void;
  minDate?: string;
  maxDate?: string;
}

// Calendar-only date input: no free text, day-first display, ISO in and out.
export default function DateField({ id, labelText, value, onChange, minDate, maxDate, placeholder = "dd/mm/yyyy", ...input }: Props) {
  return (
    <DatePicker
      datePickerType="single"
      dateFormat="d/m/Y"
      allowInput={false}
      value={fromYmd(value)}
      minDate={fromYmd(minDate)}
      maxDate={fromYmd(maxDate)}
      onChange={(dates) => onChange(toYmd(dates[0]))}
    >
      <DatePickerInput id={id} labelText={labelText} placeholder={placeholder} {...input} />
    </DatePicker>
  );
}
