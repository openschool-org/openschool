import { TextInput, Select, SelectItem } from "@carbon/react";
import type { useUpdateClass } from "../../../../queries/useClasses";
import type { Medium } from "../../../../services/curriculum";
import type { Classroom } from "../../../../services/timetable/classroom";
import FormModal from "../../../../components/common/FormModal";

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
        labelText="Class Name"
        value={nameEdit}
        maxLength={20}
        onChange={(e) => onNameEditChange(e.target.value)}
      />

      <Select
        id="class-medium-edit"
        labelText="Medium (optional)"
        helperText="Set this only if the section is reserved for one language of instruction — medium-designated classes carry students straight over at promotion instead of being reshuffled."
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
        labelText="Home Classroom (optional)"
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
