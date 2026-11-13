import { Button, Modal } from "antd";
import { MODAL_WIDTH } from "@/shared/ui/modalWidth";
import type { Subject } from "@/features/curriculum/api/subject";
import type { Teacher } from "@/features/teachers/api/teacher";
import type { Classroom } from "@/features/timetable/api/classroom";
import EntityCombobox from "@/shared/ui/EntityCombobox";
import MutationErrorNotification from "@/shared/ui/MutationErrorNotification";
import { WEEKDAYS } from "@/shared/lib/timetable";
import { displayName } from "@/shared/lib/name";

interface MutationState {
  isError: boolean;
  error: unknown;
  isPending: boolean;
}

export interface CellForm {
  subjectId: string;
  teacherId: string;
  classroomId: string;
}

interface Props {
  cell: { day: number; period: number } | null;
  form: CellForm;
  onFormChange: (form: CellForm) => void;
  subjects: Subject[];
  teachers: Teacher[];
  onTeacherSearch: (term: string) => void;
  classrooms: Classroom[];
  canClear: boolean;
  save: MutationState;
  clear: MutationState;
  onSave: () => void;
  onClear: () => void;
  onClose: () => void;
}

export default function TimetableCellModal({ cell, form, onFormChange, subjects, teachers, onTeacherSearch, classrooms, canClear, save, clear, onSave, onClear, onClose }: Props) {
  const title = cell ? `${WEEKDAYS.find((d) => d.value === cell.day)?.label} - Period ${cell.period}` : "";
  return (
    <Modal
      open={!!cell}
      title={title}
      width={MODAL_WIDTH.sm}
      onCancel={onClose}
      footer={
        <>
          <Button danger className="os-mr-auto" onClick={onClear} disabled={!canClear} loading={clear.isPending}>Clear</Button>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="primary" onClick={onSave} loading={save.isPending}>{save.isPending ? "Saving…" : "Save"}</Button>
        </>
      }
    >
        <MutationErrorNotification isError={save.isError} error={save.error} title="Could not save" />
        <MutationErrorNotification isError={clear.isError} error={clear.error} title="Could not clear" />
        <div className="os-stack os-gap-4">
          <EntityCombobox id="cell-subject" items={subjects} selectedId={form.subjectId} onSelect={(subjectId) => onFormChange({ ...form, subjectId })} getId={(s) => s.id} itemToString={(s) => s.name} labelText="Subject" placeholder="Search subjects…" />
          <EntityCombobox id="cell-teacher" items={teachers} selectedId={form.teacherId} onSelect={(teacherId) => onFormChange({ ...form, teacherId })} onSearch={onTeacherSearch} getId={(t) => t.id} itemToString={(t) => `${displayName(t)} - ${t.employee_number}`} labelText="Teacher" placeholder="Search teachers…" />
          <EntityCombobox id="cell-classroom" items={classrooms} selectedId={form.classroomId} onSelect={(classroomId) => onFormChange({ ...form, classroomId })} getId={(c) => c.id} itemToString={(c) => c.name} labelText="Classroom (optional)" placeholder="Search classrooms…" />
        </div>
    </Modal>
  );
}
