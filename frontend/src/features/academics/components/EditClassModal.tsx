import type { useUpdateClass } from "@/features/academics/queries/useClasses";
import type { Medium } from "@/features/curriculum/api/curriculum";
import type { Classroom } from "@/features/timetable/api/classroom";
import FormModal from "@/shared/ui/FormModal";
import InfoTip from "@/shared/ui/InfoTip";
import SelectField from "@/shared/ui/SelectField";
import TextField from "@/shared/ui/TextField";

interface Props {
  open: boolean;
  nameEdit: string;
  onNameEditChange: (name: string) => void;
  mediumEdit: string;
  onMediumEditChange: (mediumId: string) => void;
  mediums: Medium[] | undefined;
  homeClassroomEdit: string;
  onHomeClassroomEditChange: (classroomId: string) => void;
  classrooms: Classroom[] | undefined;
  updateClass: ReturnType<typeof useUpdateClass>;
  onClose: () => void;
  onSave: () => void;
}

export default function EditClassModal({
  open,
  nameEdit,
  onNameEditChange,
  mediumEdit,
  onMediumEditChange,
  mediums,
  homeClassroomEdit,
  onHomeClassroomEditChange,
  classrooms,
  updateClass,
  onClose,
  onSave,
}: Props) {
  const regularClassrooms = classrooms?.filter((c) => c.room_type === "regular");
  return (
    <FormModal
      open={open}
      title="Edit class"
      onClose={onClose}
      onSubmit={onSave}
      isPending={updateClass.isPending}
      submitDisabled={!nameEdit.trim()}
      isError={updateClass.isError}
      error={updateClass.error}
      errorFallback="Failed to update class"
    >
      <div className="os-stack os-gap-4">
        <TextField
          id="class-name-edit"
          label="Class name"
          value={nameEdit}
          maxLength={20}
          onChange={onNameEditChange}
        />
        <SelectField
          id="class-medium-edit"
          label={<>Medium (optional) <InfoTip>Classes tied to one medium keep their students together at promotion instead of being reshuffled.</InfoTip></>}
          helperText="Only for single-language classes."
          value={mediumEdit}
          onChange={onMediumEditChange}
          options={[{ value: "", label: "No medium" }, ...(mediums ?? []).map((m) => ({ value: m.id, label: m.name }))]}
        />
        <SelectField
          id="class-home-classroom-edit"
          label="Home classroom (optional)"
          helperText="Students stay in this room all day; teachers rotate in."
          value={homeClassroomEdit}
          onChange={onHomeClassroomEditChange}
          options={[{ value: "", label: "No home classroom" }, ...(regularClassrooms ?? []).map((c) => ({ value: c.id, label: c.name }))]}
        />
      </div>
    </FormModal>
  );
}
