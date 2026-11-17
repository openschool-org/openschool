import { useMemo } from "react";
import { Button, Tag } from "antd";
import { useTeacher } from "@/features/teachers/queries/useTeachers";
import type { Teacher } from "@/features/teachers/api/teacher";
import type { SectionHead } from "@/features/teachers/api/sectionHead";
import type { SectionHeadSlot } from "@/features/academics/lib/sectionHeads";
import EntityCombobox from "@/shared/ui/EntityCombobox";
import { displayName } from "@/shared/lib/name";

interface SectionHeadRowProps {
  row: SectionHeadSlot;
  head: SectionHead | undefined;
  teachers: Teacher[];
  onSearch: (term: string) => void;
  onAssign: (teacherId: string) => void;
  onRemoveClick: (head: SectionHead) => void;
  removeDisabled: boolean;
}

// One row's own component so it can fetch its own current teacher by id -
// the shared search-page `teachers` list may not contain it (no search
// typed yet, or a term that doesn't match), which would otherwise resolve
// the combobox to no selection and show an empty field for an existing
// appointment.
export default function SectionHeadRow({ row, head, teachers, onSearch, onAssign, onRemoveClick, removeDisabled }: SectionHeadRowProps) {
  const { data: currentTeacher } = useTeacher(head?.teacher_id ?? "");
  const items = useMemo(
    () => (currentTeacher && !teachers.some((t) => t.id === currentTeacher.id) ? [currentTeacher, ...teachers] : teachers),
    [teachers, currentTeacher],
  );

  return (
    <div className="os-list-row os-py-3 os-px-6">
      <div className="os-flex-1 os-min-w-0">
        <p className="os-m-0 os-text-md os-fw-500 os-c-primary">{row.gradeName}{row.streamName ? ` - ${row.streamName}` : ""}</p>
        <div className="os-flex os-items-center os-gap-2 os-mt-1">
          <Tag color={head ? "success" : undefined} variant="filled">{head ? "Assigned" : "Vacant"}</Tag>
          {head && <span className="os-text-xs os-c-secondary">{head.teacher_name}</span>}
        </div>
      </div>
      <div className="os-w-16">
        <EntityCombobox
          id={`tic-${row.key}`}
          items={items}
          selectedId={head?.teacher_id ?? ""}
          onSelect={(teacher_id) => teacher_id && onAssign(teacher_id)}
          onSearch={onSearch}
          getId={(t) => t.id}
          itemToString={(t) => `${displayName(t)} - ${t.employee_number}`}
          placeholder="Search teachers…"
        />
      </div>
      {/* Vacating a post is only possible by removing the appointment. */}
      <Button type="text" danger size="small" onClick={() => head && onRemoveClick(head)} disabled={!head || removeDisabled}>Remove</Button>
    </div>
  );
}
