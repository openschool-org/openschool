import type { Dispatch, SetStateAction } from "react";
import { Button, Input, InputNumber, Select } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import RemoveIconButton from "@/shared/ui/RemoveIconButton";
import { FACILITY_GROUPS, facilityTypeLabel, type FacilityGroupKey, type FacilityRoom } from "@/features/school/setupConstants";

interface Props {
  facilityRooms: FacilityRoom[];
  setFacilityRooms: Dispatch<SetStateAction<FacilityRoom[]>>;
}

const TYPE_OPTIONS = FACILITY_GROUPS.map((g) => ({ value: g.key, label: facilityTypeLabel(g.key) }));
const placeholderFor = (group: FacilityGroupKey) => FACILITY_GROUPS.find((g) => g.key === group)?.placeholder ?? "";

export default function RoomsStep({ facilityRooms, setFacilityRooms }: Props) {
  const update = (id: string, patch: Partial<FacilityRoom>) =>
    setFacilityRooms((rooms) => rooms.map((room) => (room.id === id ? { ...room, ...patch } : room)));
  const add = () =>
    setFacilityRooms((rooms) => [...rooms, { id: crypto.randomUUID(), group: rooms.at(-1)?.group ?? "library", name: "", capacity: "" }]);

  return (
    <div>
      {facilityRooms.length === 0 ? (
        <p className="os-setup-empty">No rooms added. Class homerooms are created with the classes; add shared rooms such as the library, labs or the main hall here, or later under Resources.</p>
      ) : (
        <table className="os-table os-table--no-hover os-setup-table">
          <thead>
            <tr>
              <th className="os-setup-table__type">Type</th>
              <th>Name</th>
              <th className="os-setup-table__narrow">Capacity</th>
              <th className="os-setup-table__action"><span className="os-sr-only">Remove</span></th>
            </tr>
          </thead>
          <tbody>
            {facilityRooms.map((room, i) => (
              <tr key={room.id}>
                <td>
                  <Select
                    id={`facility-type-${room.id}`}
                    aria-label={`Room ${i + 1} type`}
                    className="os-w-full"
                    value={room.group}
                    options={TYPE_OPTIONS}
                    onChange={(group: FacilityGroupKey) => update(room.id, { group })}
                  />
                </td>
                <td>
                  <Input
                    id={`facility-${room.id}`}
                    aria-label={`Room ${i + 1} name`}
                    placeholder={placeholderFor(room.group)}
                    value={room.name}
                    onChange={(e) => update(room.id, { name: e.target.value })}
                  />
                </td>
                <td>
                  <InputNumber
                    id={`facility-capacity-${room.id}`}
                    aria-label={`Room ${i + 1} capacity`}
                    placeholder="Optional"
                    min={1}
                    max={2000}
                    className="os-setup-table__number"
                    value={room.capacity === "" ? null : room.capacity}
                    onChange={(value) => update(room.id, { capacity: typeof value === "number" ? value : "" })}
                  />
                </td>
                <td>
                  <RemoveIconButton label={`Remove room ${i + 1}`} onClick={() => setFacilityRooms((rooms) => rooms.filter((r) => r.id !== room.id))} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <Button className="os-mt-3" icon={<PlusOutlined />} onClick={add}>Add room</Button>
    </div>
  );
}
