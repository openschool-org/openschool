import type { Dispatch, SetStateAction } from "react";
import { useState } from "react";
import { Button } from "antd";
import { HomeOutlined, PlusOutlined } from "@ant-design/icons";
import TextField from "@/shared/ui/TextField";
import StepShell from "@/features/school/components/setup/StepShell";
import RepeatableRow from "@/features/school/components/setup/RepeatableRow";
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
  return (
    <StepShell icon={HomeOutlined} title="Houses" subtitle="Optional - students and staff are auto-assigned to whichever house has the fewest members.">
      {houses.map((h, i) => (
        <RepeatableRow key={i} onRemove={() => setHouses((hs) => hs.filter((_, idx) => idx !== i))}>
          <TextField
            id={`house-name-${i}`}
            label="Name"
            placeholder="e.g. Vijaya"
            value={h.name}
            onChange={(value) =>
              setHouses((hs) => hs.map((row, idx) => {
                if (idx !== i) return row;
                const generatedCode = generateHouseCode(row.name);
                const shouldGenerateCode = !row.code.trim() || row.code === generatedCode;
                return {
                  ...row,
                  name: value,
                  code: shouldGenerateCode ? generateHouseCode(value) : row.code,
                };
              }))
            }
          />
          <TextField
            id={`house-code-${i}`}
            label="Code"
            placeholder="e.g. VJ"
            helperText={h.name.trim() ? "Generated from the name; you can edit it." : "Enter a name to generate a code."}
            value={h.code}
            invalid={(validationAttempted || !!touched[i]) && !!h.name.trim() && !h.code.trim()}
            invalidText="A code is required for this house."
            onChange={(value) =>
              setHouses((hs) => hs.map((row, idx) => (idx === i ? { ...row, code: value } : row)))
            }
            onBlur={() => setTouched((fields) => ({ ...fields, [i]: true }))}
          />
          <div>
            <label htmlFor={`house-color-${i}`} className="os-field__label">
              Colour
            </label>
            <input
              id={`house-color-${i}`}
              type="color"
              value={h.color}
              onChange={(e) =>
                setHouses((hs) => hs.map((row, idx) => (idx === i ? { ...row, color: e.target.value } : row)))
              } className="os-w-2h os-h-2h os-p-0 os-border-tertiary os-pointer"
            />
          </div>
        </RepeatableRow>
      ))}
      <Button
        type="text"
        icon={<PlusOutlined />}
        onClick={() =>
          setHouses((hs) => [...hs, { name: "", code: "", color: HOUSE_COLOR_PALETTE[hs.length % HOUSE_COLOR_PALETTE.length] }])
        }
      >
        Add another house
      </Button>
    </StepShell>
  );
}
