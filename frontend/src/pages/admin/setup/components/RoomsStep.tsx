import type { Dispatch, SetStateAction } from "react";
import { Button, Checkbox, TextInput } from "@carbon/react";
import { Building, Add } from "@carbon/icons-react";
import StepShell from "./StepShell";
import RepeatableRow from "./RepeatableRow";
import { SUGGESTED_ROOMS } from "../constants";

interface Props {
  roomChecks: Record<string, boolean>;
  setRoomChecks: Dispatch<SetStateAction<Record<string, boolean>>>;
  customRooms: string[];
  setCustomRooms: Dispatch<SetStateAction<string[]>>;
}

export default function RoomsStep({ roomChecks, setRoomChecks, customRooms, setCustomRooms }: Props) {
  return (
    <StepShell
      icon={Building}
      title="Rooms & Facilities"
      subtitle="Optional - special-purpose rooms beyond regular classrooms (a class's own homeroom is set later, per class). You can re-type any of these as a subject-tagged Lab afterward, once subjects are set up."
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1rem" }}>
        {SUGGESTED_ROOMS.map((r) => (
          <Checkbox
            key={r}
            id={`room-${r}`}
            labelText={r}
            checked={!!roomChecks[r]}
            onChange={(_e, { checked }) => setRoomChecks((prev) => ({ ...prev, [r]: checked }))}
          />
        ))}
      </div>
      {customRooms.map((r, i) => (
        <RepeatableRow key={i} onRemove={() => setCustomRooms((rs) => rs.filter((_, idx) => idx !== i))}>
          <TextInput
            id={`custom-room-${i}`}
            labelText="Room name"
            size="md"
            value={r}
            onChange={(e) => setCustomRooms((rs) => rs.map((row, idx) => (idx === i ? e.target.value : row)))}
          />
        </RepeatableRow>
      ))}
      <Button kind="ghost" size="sm" renderIcon={Add} onClick={() => setCustomRooms((rs) => [...rs, ""])}>
        Add another room
      </Button>
    </StepShell>
  );
}
