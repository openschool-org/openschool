import { useState } from "react";
import FormModal from "@/shared/ui/FormModal";
import SelectField from "@/shared/ui/SelectField";
import EntityCombobox from "@/shared/ui/EntityCombobox";
import { useStudents } from "@/features/students/queries/useStudents";
import { useAssignSocietyMember } from "@/features/portfolio/queries/useSocieties";
import { SOCIETY_ROLES } from "@/features/portfolio/components/societyRoles";
import type { SocietyRole } from "@/features/portfolio/api/society";
import { displayName } from "@/shared/lib/name";

interface Props {
  societyId: string;
  memberStudentIds: Set<string>;
  open: boolean;
  onClose: () => void;
}

// Picks a student who is not yet a member and gives them a role.
export default function SocietyAddMemberModal({ societyId, memberStudentIds, open, onClose }: Props) {
  const [search, setSearch] = useState("");
  const [studentId, setStudentId] = useState("");
  const [role, setRole] = useState<SocietyRole>("member");
  const { data: studentPage } = useStudents({ limit: 25, search });
  const assign = useAssignSocietyMember(societyId);
  const available = (studentPage?.items ?? []).filter((s) => !memberStudentIds.has(s.id));

  const close = () => {
    assign.reset();
    setStudentId("");
    setRole("member");
    onClose();
  };

  return (
    <FormModal
      open={open}
      title="Add society member"
      onClose={close}
      onSubmit={() => studentId && assign.mutate({ student_id: studentId, role }, { onSuccess: close })}
      isPending={assign.isPending}
      submitDisabled={!studentId}
      submitLabel="Add"
      isError={assign.isError}
      error={assign.error}
      errorTitle="Could not add member"
      errorFallback="Please try again."
    >
      <div className="os-stack os-gap-4">
        <EntityCombobox
          id="society-member-student"
          labelText="Student"
          items={available}
          selectedId={studentId}
          onSelect={setStudentId}
          onSearch={setSearch}
          getId={(s) => s.id}
          itemToString={(s) => `${displayName(s)} - ${s.index_number}`}
          placeholder="Search students by name or index number…"
        />
        <SelectField
          id="society-member-role"
          label="Role"
          value={role}
          onChange={(v) => setRole(v as SocietyRole)}
          options={SOCIETY_ROLES.map((r) => ({ value: r.value, label: r.label }))}
        />
      </div>
    </FormModal>
  );
}
