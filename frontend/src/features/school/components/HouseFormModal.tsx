import { ColorPicker } from "antd";
import { HOUSE_COLOR_PALETTE } from "@/features/school/setupConstants";
import Field from "@/shared/ui/Field";
import TextField from "@/shared/ui/TextField";
import FormModal from "@/shared/ui/FormModal";

export interface HouseForm {
  name: string;
  code: string;
  color: string;
}

interface Props {
  mode: "create" | "edit";
  form: HouseForm;
  onChange: (form: HouseForm) => void;
  nameTouched: boolean;
  onNameBlur: () => void;
  isPending: boolean;
  isError: boolean;
  error: unknown;
  onClose: () => void;
  onSubmit: () => void;
}

export default function HouseFormModal({ mode, form, onChange, nameTouched, onNameBlur, isPending, isError, error, onClose, onSubmit }: Props) {
  return (
    <FormModal
      open
      title={mode === "create" ? "Add house" : "Edit house"}
      onClose={onClose}
      onSubmit={onSubmit}
      isPending={isPending}
      submitDisabled={!form.name.trim()}
      isError={isError}
      error={error}
      errorFallback="Failed to save house"
    >
      <div className="os-stack os-gap-4">
        <TextField
          id="house-name"
          label="Name"
          placeholder="e.g. Vijaya"
          value={form.name}
          onChange={(v) => onChange({ ...form, name: v })}
          onBlur={onNameBlur}
          invalid={nameTouched && !form.name.trim()}
          invalidText="House name is required."
        />
        <TextField id="house-code" label="Short code (optional)" placeholder="e.g. VJ" value={form.code} onChange={(v) => onChange({ ...form, code: v })} />
        <Field id="house-color" label="Colour">
          <ColorPicker
            value={form.color}
            showText
            disabledAlpha
            format="hex"
            presets={[{ label: "Suggested", colors: [...HOUSE_COLOR_PALETTE] }]}
            onChange={(c) => onChange({ ...form, color: c.toHexString() })}
          />
        </Field>
      </div>
    </FormModal>
  );
}
