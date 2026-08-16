import { useState } from "react";
import { TextInput } from "@carbon/react";
import { useTeachers } from "../../queries/useTeachers";
import { useCreateSociety, useUpdateSociety } from "../../queries/useSocieties";
import FormModal from "../common/FormModal";
import EntityCombobox from "../common/EntityCombobox";
import type { Society } from "../../services/society";

interface Props {
  society: Society | null;
  academicYearId: string;
  onClose: () => void;
}

// Create-or-edit form for a society — null `society` means create. Following
// the list+modal-form convention (StaffFormModal.tsx is the closest
// precedent): one modal, one mutation branch on whether we're editing.
export default function SocietyFormModal({ society, academicYearId, onClose }: Props) {
  const isEditing = !!society;
  const { data: teachers } = useTeachers();
  const createSociety = useCreateSociety();
  const updateSociety = useUpdateSociety();

  const [name, setName] = useState(society?.name ?? "");
  const [teacherChoice, setTeacherChoice] = useState(society?.teacher_in_charge_id ?? "");

  const mutation = isEditing ? updateSociety : createSociety;
  const canSave = name.trim().length > 0 && !!teacherChoice;

  const handleSave = () => {
    if (!canSave) return;
    if (isEditing) {
      updateSociety.mutate(
        { id: society.id, data: { name: name.trim(), teacher_in_charge_id: teacherChoice } },
        { onSuccess: onClose },
      );
    } else {
      createSociety.mutate(
        { name: name.trim(), teacher_in_charge_id: teacherChoice, academic_year_id: academicYearId },
        { onSuccess: onClose },
      );
    }
  };

  return (
    <FormModal
      open
      size="md"
      title={isEditing ? "Edit society" : "New society"}
      onClose={onClose}
      onSubmit={handleSave}
      isPending={mutation.isPending}
      submitDisabled={!canSave}
      isError={mutation.isError}
      error={mutation.error}
      errorFallback="Failed to save society"
    >
      <div style={{ display: "grid", gap: "1rem" }}>
        <TextInput
          id="society-name"
          labelText="Society name"
          placeholder="e.g. Science Society"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <EntityCombobox
          id="society-tic"
          labelText="Teacher-in-Charge"
          items={teachers ?? []}
          selectedId={teacherChoice}
          onSelect={setTeacherChoice}
          getId={(t) => t.id}
          itemToString={(t) => `${t.full_name} — ${t.employee_number}`}
          placeholder="Search teachers by name or employee number…"
        />
      </div>
    </FormModal>
  );
}
