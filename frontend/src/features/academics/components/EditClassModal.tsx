import { TextInput, Select, SelectItem } from "@carbon/react";
import type { useUpdateClass } from "@/features/academics/queries/useClasses";
import type { Medium } from "@/features/curriculum/api/curriculum";
import type { Classroom } from "@/features/timetable/api/classroom";
import FormModal from "@/shared/ui/FormModal";
import InfoTip from "@/shared/ui/InfoTip";

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
      <TextInput
        id="class-name-edit"
        labelText="Class name"
        value={nameEdit}
        maxLength={20}
        onChange={(e) => onNameEditChange(e.target.value)}
      />

      <Select
        id="class-medium-edit"
        labelText={<>Medium (optional) <InfoTip>Classes tied to one medium keep their students together at promotion instead of being reshuffled.</InfoTip></>}
        helperText="Only for single-language classes."
        value={mediumEdit}
        onChange={(e) => onMediumEditChange(e.target.value)}
      >
        <SelectItem value="" text="No medium" />
        {mediums?.map((m) => (
          <SelectItem key={m.id} value={m.id} text={m.name} />
        ))}
      </Select>

      <Select
        id="class-home-classroom-edit"
        labelText="Home classroom (optional)"
        helperText="Students stay in this room all day; teachers rotate in."
        value={homeClassroomEdit}
        onChange={(e) => onHomeClassroomEditChange(e.target.value)}
      >
        <SelectItem value="" text="No home classroom" />
        {regularClassrooms?.map((c) => (
          <SelectItem key={c.id} value={c.id} text={c.name} />
        ))}
      </Select>
    </FormModal>
  );
}
