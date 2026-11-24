import type { Dispatch, SetStateAction } from "react";
import { useState } from "react";
import { Button, ColorPicker } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import TextField from "@/shared/ui/TextField";
import RemoveIconButton from "@/shared/ui/RemoveIconButton";
import { HOUSE_COLOR_PALETTE } from "@/features/school/setupConstants";

export interface HouseRow {
  name: string;
  code: string;
  color: string;
}

function generateHouseCode(name: string): string {
  const words = name
    .trim()
    .split(/\s+/)
    .map((word) => word.replace(/[^\p{L}\p{N}]/gu, ""))
    .filter(Boolean);
  if (words.length === 0) return "";
  if (words.length > 1) return words.map((word) => word[0]).join("").slice(0, 3).toUpperCase();
  return words[0].slice(0, 2).toUpperCase();
}

interface Props {
  houses: HouseRow[];
  setHouses: Dispatch<SetStateAction<HouseRow[]>>;
  validationAttempted: boolean;
}

export default function HousesStep({ houses, setHouses, validationAttempted }: Props) {
  const [touched, setTouched] = useState<Record<number, boolean>>({});
  const update = (index: number, patch: Partial<HouseRow>) =>
    setHouses((rows) => rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  const rename = (index: number, name: string) =>
    setHouses((rows) => rows.map((row, i) => {
      if (i !== index) return row;
      // Keep the code in step with the name until the admin edits the code themselves.
      const followsName = !row.code.trim() || row.code === generateHouseCode(row.name);
      return { ...row, name, code: followsName ? generateHouseCode(name) : row.code };
    }));
  const add = () =>
    setHouses((rows) => [...rows, { name: "", code: "", color: HOUSE_COLOR_PALETTE[rows.length % HOUSE_COLOR_PALETTE.length] }]);

  return (
    <div>
      {houses.length === 0 ? (
        <p className="os-setup-empty">No houses yet. Add one, or skip this step and add houses later in Settings.</p>
      ) : (
        <table className="os-table os-table--no-hover os-setup-table">
          <thead>
            <tr>
              <th>House name</th>
              <th className="os-setup-table__code">Code</th>
              <th className="os-setup-table__narrow">Colour</th>
              <th className="os-setup-table__action"><span className="os-sr-only">Remove</span></th>
            </tr>
          </thead>
          <tbody>
            {houses.map((house, i) => (
              <tr key={i}>
                <td>
                  <TextField id={`house-name-${i}`} label={`House ${i + 1} name`} hideLabel placeholder="e.g. Vijaya" value={house.name} onChange={(value) => rename(i, value)} />
                </td>
                <td>
                  <TextField
                    id={`house-code-${i}`}
                    label={`House ${i + 1} code`}
                    hideLabel
                    placeholder="e.g. VJ"
                    maxLength={5}
                    value={house.code}
                    invalid={(validationAttempted || !!touched[i]) && !!house.name.trim() && !house.code.trim()}
                    invalidText="Code is required."
                    onChange={(value) => update(i, { code: value })}
                    onBlur={() => setTouched((fields) => ({ ...fields, [i]: true }))}
                  />
                </td>
                <td>
                  <ColorPicker
                    value={house.color}
                    disabledAlpha
                    presets={[{ label: "Suggested", colors: HOUSE_COLOR_PALETTE }]}
                    onChange={(color) => update(i, { color: color.toHexString() })}
                    aria-label={`House ${i + 1} colour`}
                  />
                </td>
                <td>
                  <RemoveIconButton label={`Remove house ${i + 1}`} onClick={() => setHouses((rows) => rows.filter((_, idx) => idx !== i))} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <Button className="os-mt-3" icon={<PlusOutlined />} onClick={add}>Add house</Button>
      <p className="os-setup-note">The code is filled in from the name and can be changed.</p>
    </div>
  );
}
