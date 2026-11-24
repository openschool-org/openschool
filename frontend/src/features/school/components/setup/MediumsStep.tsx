import type { Dispatch, SetStateAction } from "react";
import { Button, Checkbox } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import TextField from "@/shared/ui/TextField";
import RemoveIconButton from "@/shared/ui/RemoveIconButton";
import { SUGGESTED_MEDIUMS } from "@/features/school/setupConstants";

interface Props {
  mediumChecks: Record<string, boolean>;
  setMediumChecks: Dispatch<SetStateAction<Record<string, boolean>>>;
  customMediums: string[];
  setCustomMediums: Dispatch<SetStateAction<string[]>>;
}

export default function MediumsStep({ mediumChecks, setMediumChecks, customMediums, setCustomMediums }: Props) {
  return (
    <div className="os-setup-columns">
      <section className="os-setup-section" aria-labelledby="mediums-common-title">
        <h3 id="mediums-common-title" className="os-setup-section__title">Common mediums</h3>
        <div className="os-setup-options">
          {SUGGESTED_MEDIUMS.map((medium) => (
            <Checkbox
              key={medium}
              id={`medium-${medium}`}
              className="os-setup-option"
              checked={!!mediumChecks[medium]}
              onChange={(e) => setMediumChecks((prev) => ({ ...prev, [medium]: e.target.checked }))}
            >
              {medium}
            </Checkbox>
          ))}
        </div>
      </section>

      <section className="os-setup-section" aria-labelledby="mediums-other-title">
        <h3 id="mediums-other-title" className="os-setup-section__title">Other mediums</h3>
        {customMediums.length === 0 && <p className="os-setup-empty">None added.</p>}
        {customMediums.map((medium, i) => (
          <div key={i} className="os-setup-inline-row">
            <TextField
              id={`custom-medium-${i}`}
              label={`Other medium ${i + 1}`}
              hideLabel
              placeholder="e.g. Bilingual"
              value={medium}
              onChange={(value) => setCustomMediums((rows) => rows.map((row, idx) => (idx === i ? value : row)))}
            />
            <RemoveIconButton label={`Remove other medium ${i + 1}`} onClick={() => setCustomMediums((rows) => rows.filter((_, idx) => idx !== i))} />
          </div>
        ))}
        <Button icon={<PlusOutlined />} onClick={() => setCustomMediums((rows) => [...rows, ""])}>Add medium</Button>
      </section>
    </div>
  );
}
