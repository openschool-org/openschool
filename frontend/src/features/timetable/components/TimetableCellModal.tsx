import { Button, ComposedModal, ModalHeader, ModalBody, ModalFooter } from "@carbon/react";
import type { Subject } from "@/features/curriculum/api/subject";
import type { Teacher } from "@/features/teachers/api/teacher";
import type { Classroom } from "@/features/timetable/api/classroom";
import EntityCombobox from "@/shared/ui/EntityCombobox";
import MutationErrorNotification from "@/shared/ui/MutationErrorNotification";
import { WEEKDAYS } from "@/shared/lib/timetable";

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
    <ComposedModal open={!!cell} size="sm" onClose={onClose} aria-label={title}>
      <ModalHeader title={title} />
      <ModalBody>
        <MutationErrorNotification isError={save.isError} error={save.error} title="Could not save" />
        <MutationErrorNotification isError={clear.isError} error={clear.error} title="Could not clear" />
        <div className="os-grid os-gap-4">
          <EntityCombobox id="cell-subject" items={subjects} selectedId={form.subjectId} onSelect={(subjectId) => onFormChange({ ...form, subjectId })} getId={(s) => s.id} itemToString={(s) => s.name} labelText="Subject" placeholder="Search subjects…" />
          <EntityCombobox id="cell-teacher" items={teachers} selectedId={form.teacherId} onSelect={(teacherId) => onFormChange({ ...form, teacherId })} onSearch={onTeacherSearch} getId={(t) => t.id} itemToString={(t) => `${t.full_name} - ${t.employee_number}`} labelText="Teacher" placeholder="Search teachers…" />
          <EntityCombobox id="cell-classroom" items={classrooms} selectedId={form.classroomId} onSelect={(classroomId) => onFormChange({ ...form, classroomId })} getId={(c) => c.id} itemToString={(c) => c.name} labelText="Classroom (optional)" placeholder="Search classrooms…" />
        </div>
      </ModalBody>
      <ModalFooter>
        <Button kind="danger--ghost" onClick={onClear} disabled={clear.isPending || !canClear}>Clear</Button>
        <Button kind="secondary" onClick={onClose}>Cancel</Button>
        <Button kind="primary" onClick={onSave} disabled={save.isPending}>{save.isPending ? "Saving…" : "Save"}</Button>
      </ModalFooter>
    </ComposedModal>
  );
}
