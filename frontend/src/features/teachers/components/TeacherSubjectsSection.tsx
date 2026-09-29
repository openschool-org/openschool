import { useState } from "react";
import { Button, Select, SelectItem, Tag } from "@carbon/react";
import { Book } from "@carbon/icons-react";
import type { UseMutationResult } from "@tanstack/react-query";
import type { TeacherSubject } from "@/features/teachers/api/teacher";
import { useSubjects } from "@/features/curriculum/queries/useSubjects";
import SectionCard from "@/shared/ui/SectionCard";

interface Props {
  subjects: TeacherSubject[] | undefined;
  editing: boolean;
  assignSubject: UseMutationResult<unknown, unknown, string>;
  removeSubject: UseMutationResult<unknown, unknown, string>;
}

// Subjects a teacher is qualified for; editable as filter tags plus an assign picker.
export default function TeacherSubjectsSection({ subjects, editing, assignSubject, removeSubject }: Props) {
  const { data: allSubjects } = useSubjects();
  const [selectedId, setSelectedId] = useState("");
  const assignedIds = new Set(subjects?.map((s) => s.id) ?? []);
  const available = allSubjects?.filter((s) => !assignedIds.has(s.id)) ?? [];

  return (
    <SectionCard title="Subjects" meta={<span className="os-text-xs os-c-tertiary">{subjects?.length ?? 0} assigned</span>}>
        <div className={`os-flex os-gap-2 os-wrap ${editing ? "os-mb-4" : "os-mb-0"}`}>
          {subjects?.length ? (
            subjects.map((s) =>
              editing ? (
                <Tag key={s.id} type="blue" size="md" filter title="Unassign subject" onClose={() => removeSubject.mutate(s.id)} disabled={removeSubject.isPending}>
                  {s.name} ({s.code})
                </Tag>
              ) : (
                <div key={s.id} className="os-flex os-items-center os-gap-2 os-py-2 os-px-3h os-border os-bg-layer-hover">
                  <Book size={14} className="os-fill-accent" />
                  <span className="os-text-md os-fw-500">{s.name}</span>
                  <Tag type="blue" size="sm">{s.code}</Tag>
                </div>
              ),
            )
          ) : (
            <span className="os-text-md os-c-tertiary">No subjects assigned.</span>
          )}
        </div>
        {editing && (
          <div className="os-flex os-gap-3 os-items-end os-max-w-28 os-border-t os-pt-4">
            <div className="os-flex-1">
              <Select id="assign-subject-select" labelText="Assign new subject" value={selectedId} onChange={(e) => setSelectedId(e.target.value)} disabled={assignSubject.isPending}>
                <SelectItem value="" text="Choose a subject..." />
                {available.map((s) => <SelectItem key={s.id} value={s.id} text={`${s.name} (${s.code})`} />)}
              </Select>
            </div>
            <Button kind="primary" size="md" disabled={!selectedId || assignSubject.isPending} onClick={() => assignSubject.mutate(selectedId, { onSuccess: () => setSelectedId("") })}>
              {assignSubject.isPending ? "Assigning…" : "Assign"}
            </Button>
          </div>
        )}
    </SectionCard>
  );
}
