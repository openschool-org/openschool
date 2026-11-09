import { useState } from "react";
import { Alert, Button, Modal } from "antd";
import { SaveOutlined } from "@ant-design/icons";
import { useStreams } from "@/features/academics/queries/useClasses";
import { useGrades } from "@/features/academics/queries/useGrades";
import { useMediums } from "@/features/curriculum/queries/useCurriculum";
import { useTeachers } from "@/features/teachers/queries/useTeachers";
import { useCreateClassForm } from "@/features/academics/hooks/useCreateClassForm";
import InfoTip from "@/shared/ui/InfoTip";
import EntityCombobox from "@/shared/ui/EntityCombobox";
import { displayName } from "@/shared/lib/name";
import { MODAL_WIDTH } from "@/shared/ui/modalWidth";
import NumberField from "@/shared/ui/NumberField";
import SelectField from "@/shared/ui/SelectField";
import TextField from "@/shared/ui/TextField";

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
    <Modal
      open={open}
      title="Add class"
      width={MODAL_WIDTH.md}
      onCancel={onClose}
      destroyOnHidden
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="primary" icon={<SaveOutlined />} disabled={!f.isValid} loading={f.isSaving} onClick={f.save}>
            {f.isSaving ? "Creating…" : "Create class"}
          </Button>
        </>
      }
    >
      {f.error && <Alert type="error" showIcon closable onClose={f.clearError} className="os-mb-4" title="Could not create class" description={f.error} />}
      <div className="os-modal-form">
        <SelectField
          id="modal-grade"
          label="Grade"
          placeholder={gradesLoading ? "Loading grades…" : "Select grade…"}
          value={form.grade_id}
          onChange={(v) => { set("grade_id", v); f.markTouched("grade"); }}
          invalid={!!touched.grade && !form.grade_id}
          invalidText="A grade is required."
          options={(grades ?? []).map((grade) => ({ value: grade.id, label: grade.name }))}
        />
        <TextField
          id="modal-class-name"
          label="Class name"
          placeholder="e.g. 10-A"
          maxLength={20}
          value={form.name}
          onChange={(v) => set("name", v)}
          onBlur={() => f.markTouched("name")}
          invalid={!!touched.name && !form.name.trim()}
          invalidText="A class name is required."
        />
        <NumberField
          id="modal-class-capacity"
          label="Capacity"
          helperText="Maximum students for this class."
          min={1}
          max={200}
          invalid={!f.capacityValid}
          invalidText="Enter a whole number from 1 to 200."
          value={form.capacity === "" ? null : Number(form.capacity)}
          onChange={(v) => set("capacity", v === null ? "" : String(v))}
        />
        <SelectField
          id="modal-stream"
          label="Stream (optional)"
          value={form.stream_id}
          onChange={(v) => set("stream_id", v)}
          options={[{ value: "", label: "No stream" }, ...(streams ?? []).map((stream) => ({ value: stream.id, label: stream.name }))]}
        />
        <SelectField
          id="modal-stream-group"
          label="Sub-stream (optional)"
          helperText={form.stream_id ? undefined : "Choose a stream first to pick a sub-stream."}
          disabled={!form.stream_id}
          value={form.stream_group_id}
          onChange={(v) => set("stream_group_id", v)}
          options={[{ value: "", label: "No sub-stream" }, ...(f.streamGroups ?? []).map((group) => ({ value: group.id, label: group.name }))]}
        />
        <SelectField
          id="modal-medium"
          label={<>Medium (optional) <InfoTip>Classes tied to one medium keep their students together at promotion instead of being reshuffled.</InfoTip></>}
          helperText="Only for single-language classes."
          value={form.medium_id}
          onChange={(v) => set("medium_id", v)}
          options={[{ value: "", label: "No medium" }, ...(mediums ?? []).map((medium) => ({ value: medium.id, label: medium.name }))]}
        />
        <SelectField
          id="modal-home-classroom"
          label="Home classroom (optional)"
          helperText={roomHelp}
          value={f.effectiveHomeClassroomId}
          onChange={(v) => set("home_classroom_id", v)}
          options={[{ value: "", label: "Auto-create to match the class name" }, ...(regularClassrooms ?? []).map((classroom) => ({ value: classroom.id, label: classroom.name }))]}
        />
        <EntityCombobox
          id="modal-class-teacher"
          labelText="Form teacher (optional)"
          items={teacherPage?.items ?? []}
          selectedId={form.form_teacher_id}
          onSelect={(id) => set("form_teacher_id", id)}
          onSearch={setTeacherSearch}
          getId={(teacher) => teacher.id}
          itemToString={(teacher) => `${displayName(teacher)} - ${teacher.employee_number}`}
          placeholder="Search teachers…"
        />
        <SelectField
          id="modal-academic-year"
          label="Academic year"
          placeholder="Select academic year…"
          value={f.academicYearId}
          onChange={(v) => { set("academic_year_id", v); f.markTouched("year"); }}
          invalid={!!touched.year && !f.academicYearId}
          invalidText="An academic year is required."
          options={(f.years ?? []).map((year) => ({ value: year.id, label: year.is_current ? `${year.label} (Current)` : year.label }))}
        />
      </div>
    </Modal>
  );
}
