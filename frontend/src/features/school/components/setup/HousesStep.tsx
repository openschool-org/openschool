import type { Dispatch, SetStateAction } from "react";
import { useState } from "react";
import { Button, TextInput } from "@carbon/react";
import { Home, Add } from "@carbon/icons-react";
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
    <StepShell icon={Home} title="Houses" subtitle="Optional - students and staff are auto-assigned to whichever house has the fewest members.">
      {houses.map((h, i) => (
        <RepeatableRow key={i} onRemove={() => setHouses((hs) => hs.filter((_, idx) => idx !== i))}>
          <TextInput
            id={`house-name-${i}`}
            labelText="Name"
            placeholder="e.g. Vijaya"
            size="md"
            value={h.name}
            onChange={(e) =>
              setHouses((hs) => hs.map((row, idx) => {
                if (idx !== i) return row;
                const generatedCode = generateHouseCode(row.name);
                const shouldGenerateCode = !row.code.trim() || row.code === generatedCode;
                return {
                  ...row,
                  name: e.target.value,
                  code: shouldGenerateCode ? generateHouseCode(e.target.value) : row.code,
                };
              }))
            }
          />
          <TextInput
            id={`house-code-${i}`}
            labelText="Code"
            placeholder="e.g. VJ"
            helperText={h.name.trim() ? "Generated from the name; you can edit it." : "Enter a name to generate a code."}
            size="md"
            value={h.code}
            invalid={(validationAttempted || !!touched[i]) && !!h.name.trim() && !h.code.trim()}
            invalidText="A code is required for this house."
            onChange={(e) =>
              setHouses((hs) => hs.map((row, idx) => (idx === i ? { ...row, code: e.target.value } : row)))
            }
            onBlur={() => setTouched((fields) => ({ ...fields, [i]: true }))}
          />
          <div>
            <label htmlFor={`house-color-${i}`} className="os-text-xs os-block os-mb-1">
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
        kind="ghost"
        size="sm"
        renderIcon={Add}
        onClick={() =>
          setHouses((hs) => [...hs, { name: "", code: "", color: HOUSE_COLOR_PALETTE[hs.length % HOUSE_COLOR_PALETTE.length] }])
        }
      >
        Add another house
      </Button>
    </StepShell>
  );
}
