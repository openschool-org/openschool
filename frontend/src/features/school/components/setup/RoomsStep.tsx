import type { Dispatch, SetStateAction } from "react";
import { Button, TextInput } from "@carbon/react";
import { Add, Building } from "@carbon/icons-react";
import StepShell from "@/features/school/components/setup/StepShell";
import RepeatableRow from "@/features/school/components/setup/RepeatableRow";
import { FACILITY_GROUPS, type FacilityRoom } from "@/features/school/setupConstants";

interface Props {
  facilityRooms: FacilityRoom[];
  setFacilityRooms: Dispatch<SetStateAction<FacilityRoom[]>>;
}

export default function RoomsStep({ facilityRooms, setFacilityRooms }: Props) {
  const addFacility = (group: FacilityRoom["group"]) => {
    setFacilityRooms((rooms) => [...rooms, { id: crypto.randomUUID(), group, name: "" }]);
  };

  return (
    <StepShell
      icon={Building}
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
                <Button kind="ghost" size="sm" renderIcon={Add} onClick={() => addFacility(group.key)}>
                  {group.addLabel}
                </Button>
              </div>
              {rooms.map((room) => (
                <RepeatableRow key={room.id} onRemove={() => setFacilityRooms((current) => current.filter((item) => item.id !== room.id))}>
                  <TextInput
                    id={`facility-${room.id}`}
                    labelText="Facility name"
                    placeholder={group.placeholder}
                    size="md"
                    value={room.name}
                    onChange={(e) => setFacilityRooms((current) => current.map((item) => item.id === room.id ? { ...item, name: e.target.value } : item))}
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
