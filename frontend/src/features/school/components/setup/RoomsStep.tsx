import type { Dispatch, SetStateAction } from "react";
import { Button } from "antd";
import { BankOutlined, PlusOutlined } from "@ant-design/icons";
import TextField from "@/shared/ui/TextField";
import NumberField from "@/shared/ui/NumberField";
import StepShell from "@/features/school/components/setup/StepShell";
import RepeatableRow from "@/features/school/components/setup/RepeatableRow";
import { FACILITY_GROUPS, type FacilityRoom } from "@/features/school/setupConstants";

interface Props {
  facilityRooms: FacilityRoom[];
  setFacilityRooms: Dispatch<SetStateAction<FacilityRoom[]>>;
}

export default function RoomsStep({ facilityRooms, setFacilityRooms }: Props) {
  const addFacility = (group: FacilityRoom["group"]) => {
    setFacilityRooms((rooms) => [...rooms, { id: crypto.randomUUID(), group, name: "", capacity: "" }]);
  };

  return (
    <StepShell
      icon={BankOutlined}
      title="Rooms & facilities"
      subtitle="Optional - add as many named libraries, labs, music rooms, or auditoriums as your school needs."
    >
      <div className="os-facility-groups">
        {FACILITY_GROUPS.map((group) => {
          const rooms = facilityRooms.filter((room) => room.group === group.key);
          return (
            <section key={group.key} className="os-facility-group" aria-labelledby={`facility-${group.key}`}>
              <div className="os-facility-group__header">
                <div>
                  <h3 id={`facility-${group.key}`}>{group.label}</h3>
                  <p>{group.help}</p>
                </div>
                <Button type="text" icon={<PlusOutlined />} onClick={() => addFacility(group.key)}>
                  {group.addLabel}
                </Button>
              </div>
              {rooms.map((room) => (
                <RepeatableRow key={room.id} onRemove={() => setFacilityRooms((current) => current.filter((item) => item.id !== room.id))}>
                  <TextField
                    id={`facility-${room.id}`}
                    label="Facility name"
                    placeholder={group.placeholder}
                    value={room.name}
                    onChange={(value) => setFacilityRooms((current) => current.map((item) => item.id === room.id ? { ...item, name: value } : item))}
                  />
                  <NumberField
                    id={`facility-capacity-${room.id}`}
                    label="Capacity"
                    helperText="Optional"
                    min={1}
                    max={2000}
                    value={room.capacity === "" ? null : room.capacity}
                    onChange={(value) => setFacilityRooms((current) => current.map((item) => item.id === room.id ? { ...item, capacity: value ?? "" } : item))}
                  />
                </RepeatableRow>
              ))}
            </section>
          );
        })}
      </div>
    </StepShell>
  );
}
