import { DatePicker } from "antd";
import dayjs from "dayjs";
import Field from "@/shared/ui/Field";

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

const SIZE = { sm: "small", md: "middle", lg: "large" } as const;

const toDay = (ymd?: string) => (ymd ? dayjs(ymd, "YYYY-MM-DD") : undefined);

// Calendar-only date input: no free text, day-first display, ISO in and out.
export default function DateField({ id, labelText, value, onChange, hideLabel, placeholder = "dd/mm/yyyy", size = "md", invalid, invalidText, onBlur, minDate, maxDate }: Props) {
  return (
    <Field id={id} label={labelText} hideLabel={hideLabel} error={invalid ? invalidText : undefined}>
      <DatePicker
        id={id}
        format="DD/MM/YYYY"
        inputReadOnly
        size={SIZE[size]}
        placeholder={placeholder}
        status={invalid ? "error" : undefined}
        value={toDay(value) ?? null}
        minDate={toDay(minDate)}
        maxDate={toDay(maxDate)}
        onChange={(d) => onChange(d ? d.format("YYYY-MM-DD") : "")}
        onBlur={onBlur}
        aria-invalid={invalid || undefined}
        aria-describedby={invalid ? `${id}-error` : undefined}
      />
    </Field>
  );
}
