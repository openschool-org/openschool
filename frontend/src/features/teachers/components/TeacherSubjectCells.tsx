import { useState } from "react";
import { Button, Tag, Tooltip } from "antd";
import { CloseOutlined, PlusOutlined } from "@ant-design/icons";
import { useTeacherSubjects, useAssignTeacherSubject, useRemoveTeacherSubject } from "@/features/teachers/queries/useTeachers";
import type { Teacher, TeacherSubject } from "@/features/teachers/api/teacher";
import type { Subject } from "@/features/curriculum/api/subject";
import ConfirmDeleteModal from "@/shared/ui/ConfirmDeleteModal";
import AssignTeacherSubjectModal from "@/features/teachers/components/AssignTeacherSubjectModal";
import { SkeletonText } from "@/shared/ui/Skeleton";
import { displayName } from "@/shared/lib/name";

// Cells for one teacher's row on the Teacher subjects page. Each cell loads the teacher's
// subjects itself (react-query shares the request), so the page can stay a plain DataGrid.

export function AssignedSubjectsCell({ teacher }: { teacher: Teacher }) {
  const { data: assigned, isLoading, isError } = useTeacherSubjects(teacher.id);
  const removeMutation = useRemoveTeacherSubject(teacher.id);
  const [toRemove, setToRemove] = useState<TeacherSubject | null>(null);

  return (
    <>
      {isLoading ? (
        <SkeletonText width="6rem" />
      ) : isError ? (
        <span className="os-c-danger os-text-md">Error loading subjects</span>
      ) : !assigned || assigned.length === 0 ? (
        <span className="os-text-md os-c-tertiary">No subjects assigned</span>
      ) : (
        <div className="os-flex os-items-center os-wrap os-gap-2">
          {assigned.map((s) => (
            <div key={s.id} className="os-flex os-items-center os-gap-1">
              <Tag color="blue" variant="filled">{s.name}</Tag>
              <Tooltip title={`Remove ${s.name}`}>
                <Button type="text" size="small" aria-label={`Remove ${s.name}`} icon={<CloseOutlined />} onClick={() => setToRemove(s)} />
              </Tooltip>
            </div>
          ))}
        </div>
      )}
      {removeMutation.isError && <div className="os-c-danger os-text-xs os-mt-1">Failed to remove</div>}
      <ConfirmDeleteModal
        open={!!toRemove}
        title="Remove subject"
        description={<>Remove <strong>{toRemove?.name}</strong> from {displayName(teacher)}&apos;s assigned subjects?</>}
        confirmLabel="Remove"
        pendingLabel="Removing…"
        subject="Subject"
        successVerb="removed"
        mutation={removeMutation}
        onClose={() => setToRemove(null)}
        onConfirm={() => toRemove && removeMutation.mutate(toRemove.id)}
      />
    </>
  );
}

export function AssignSubjectCell({ teacher, allSubjects }: { teacher: Teacher; allSubjects: Subject[] }) {
  const { data: assigned, isLoading, isError } = useTeacherSubjects(teacher.id);
  const assignMutation = useAssignTeacherSubject(teacher.id);
  const [open, setOpen] = useState(false);
  const assignedIds = new Set(assigned?.map((s) => s.id) ?? []);
  const assignable = allSubjects.filter((s) => !assignedIds.has(s.id));

  return (
    <>
      <Button type="text" size="small" icon={<PlusOutlined />} onClick={() => setOpen(true)} disabled={assignable.length === 0}>
        Assign subject
      </Button>
      {assignable.length === 0 && !isLoading && !isError && (
        <p role="status" className="os-m-0 os-mt-1 os-text-xs os-c-tertiary">All subjects assigned</p>
      )}
      {assignMutation.isError && <div className="os-c-danger os-text-xs os-mt-1">Failed to assign</div>}
      <AssignTeacherSubjectModal open={open} teacher={teacher} subjects={assignable} mutation={assignMutation} onClose={() => setOpen(false)} />
    </>
  );
}
