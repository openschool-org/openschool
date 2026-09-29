import { useState } from "react";
import { Button, ComposedModal, InlineNotification, ModalBody, ModalFooter, ModalHeader, Select, SelectItem, TextInput } from "@carbon/react";
import { Save } from "@carbon/icons-react";
import { useStreams } from "@/features/academics/queries/useClasses";
import { useGrades } from "@/features/academics/queries/useGrades";
import { useMediums } from "@/features/curriculum/queries/useCurriculum";
import { useTeachers } from "@/features/teachers/queries/useTeachers";
import { useCreateClassForm } from "@/features/academics/hooks/useCreateClassForm";
import InfoTip from "@/shared/ui/InfoTip";
import EntityCombobox from "@/shared/ui/EntityCombobox";

interface Props {
  open: boolean;
  gradeId?: string;
  onClose: () => void;
}

export default function ClassFormModal({ open, gradeId = "", onClose }: Props) {
  const { data: grades, isLoading: gradesLoading } = useGrades();
  const { data: streams } = useStreams();
  const { data: mediums } = useMediums();
  const [teacherSearch, setTeacherSearch] = useState("");
  const { data: teacherPage } = useTeachers({ limit: 25, search: teacherSearch });
  const f = useCreateClassForm(gradeId, onClose);
  const { form, set, touched } = f;
  const regularClassrooms = f.classrooms?.filter((classroom) => classroom.room_type === "regular");
  const roomHelp = !form.home_classroom_id && f.suggestedHomeClassroom
    ? "Suggested from the class name."
    : !form.home_classroom_id && form.name.trim()
      ? `A new room "${form.name.trim()}" will be created.`
      : "Students stay here all day; teachers move.";

  return (
    <ComposedModal open={open} size="md" onClose={onClose} aria-label="Add class">
      <ModalHeader title="Add class" />
      <ModalBody>
        <div className="os-modal-form">
          <Select id="modal-grade" labelText="Grade" value={form.grade_id} onChange={(e) => set("grade_id", e.target.value)} onBlur={() => f.markTouched("grade")} invalid={!!touched.grade && !form.grade_id} invalidText="A grade is required.">
            <SelectItem value="" text={gradesLoading ? "Loading grades…" : "Select grade…"} />
            {grades?.map((grade) => <SelectItem key={grade.id} value={grade.id} text={grade.name} />)}
          </Select>
          <TextInput id="modal-class-name" labelText="Class name" placeholder="e.g. 10-A" maxLength={20} value={form.name} onChange={(e) => set("name", e.target.value)} onBlur={() => f.markTouched("name")} invalid={!!touched.name && !form.name.trim()} invalidText="A class name is required." />
          <Select id="modal-stream" labelText="Stream (optional)" value={form.stream_id} onChange={(e) => set("stream_id", e.target.value)}>
            <SelectItem value="" text="No stream" />
            {streams?.map((stream) => <SelectItem key={stream.id} value={stream.id} text={stream.name} />)}
          </Select>
          <Select id="modal-stream-group" labelText="Sub-stream (optional)" helperText={form.stream_id ? undefined : "Choose a stream first to pick a sub-stream."} disabled={!form.stream_id} value={form.stream_group_id} onChange={(e) => set("stream_group_id", e.target.value)}>
            <SelectItem value="" text="No sub-stream" />
            {f.streamGroups?.map((group) => <SelectItem key={group.id} value={group.id} text={group.name} />)}
          </Select>
          <Select id="modal-medium" labelText={<>Medium (optional) <InfoTip>Classes tied to one medium keep their students together at promotion instead of being reshuffled.</InfoTip></>} helperText="Only for single-language classes." value={form.medium_id} onChange={(e) => set("medium_id", e.target.value)}>
            <SelectItem value="" text="No medium" />
            {mediums?.map((medium) => <SelectItem key={medium.id} value={medium.id} text={medium.name} />)}
          </Select>
          <Select id="modal-home-classroom" labelText="Home classroom (optional)" helperText={roomHelp} value={f.effectiveHomeClassroomId} onChange={(e) => set("home_classroom_id", e.target.value)}>
            <SelectItem value="" text="Auto-create to match the class name" />
            {regularClassrooms?.map((classroom) => <SelectItem key={classroom.id} value={classroom.id} text={classroom.name} />)}
          </Select>
          <EntityCombobox id="modal-class-teacher" labelText="Form teacher (optional)" items={teacherPage?.items ?? []} selectedId={form.form_teacher_id} onSelect={(id) => set("form_teacher_id", id)} onSearch={setTeacherSearch} getId={(teacher) => teacher.id} itemToString={(teacher) => `${teacher.full_name} - ${teacher.employee_number}`} placeholder="Search teachers…" />
          <Select id="modal-academic-year" labelText="Academic year" value={f.academicYearId} onChange={(e) => set("academic_year_id", e.target.value)} onBlur={() => f.markTouched("year")} invalid={!!touched.year && !f.academicYearId} invalidText="An academic year is required.">
            <SelectItem value="" text="Select academic year…" />
            {f.years?.map((year) => <SelectItem key={year.id} value={year.id} text={year.is_current ? `${year.label} (Current)` : year.label} />)}
          </Select>
          {f.error && <InlineNotification kind="error" title="Could not create class" subtitle={f.error} lowContrast onClose={f.clearError} className="os-max-w-full" />}
        </div>
      </ModalBody>
      <ModalFooter>
        <Button kind="secondary" onClick={onClose}>Cancel</Button>
        <Button kind="primary" renderIcon={Save} disabled={!f.isValid || f.isSaving} onClick={f.save}>{f.isSaving ? "Creating…" : "Create class"}</Button>
      </ModalFooter>
    </ComposedModal>
  );
}
