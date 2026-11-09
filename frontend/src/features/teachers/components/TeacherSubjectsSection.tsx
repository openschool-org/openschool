import { useState } from "react";
import { Button, Tag } from "antd";
import { BookOutlined } from "@ant-design/icons";
import SelectField from "@/shared/ui/SelectField";
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
                <Tag
                  key={s.id}
                  color="blue"
                  variant="filled"
                  closable={!removeSubject.isPending}
                  closeIcon={<span aria-label={`Unassign ${s.name}`}>×</span>}
                  onClose={(e) => { e.preventDefault(); removeSubject.mutate(s.id); }}
                >
                  {s.name} ({s.code})
                </Tag>
              ) : (
                <div key={s.id} className="os-flex os-items-center os-gap-2 os-py-2 os-px-3h os-border os-bg-layer-hover">
                  <BookOutlined className="os-c-accent" />
                  <span className="os-text-md os-fw-500">{s.name}</span>
                  <Tag color="blue" variant="filled">{s.code}</Tag>
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
              <SelectField
                id="assign-subject-select"
                label="Assign new subject"
                placeholder="Choose a subject..."
                showSearch
                value={selectedId}
                onChange={setSelectedId}
                disabled={assignSubject.isPending}
                options={available.map((s) => ({ value: s.id, label: `${s.name} (${s.code})` }))}
              />
            </div>
            <Button type="primary" disabled={!selectedId} loading={assignSubject.isPending} onClick={() => assignSubject.mutate(selectedId, { onSuccess: () => setSelectedId("") })}>
              Assign
            </Button>
          </div>
        )}
    </SectionCard>
  );
}
