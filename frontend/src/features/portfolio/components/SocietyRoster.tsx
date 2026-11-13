import { useState } from "react";
import { Button, Skeleton } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import FormModal from "@/shared/ui/FormModal";
import SelectField from "@/shared/ui/SelectField";
import { Link } from "react-router";
import { useStudents } from "@/features/students/queries/useStudents";
import { useSocietyMembers, useAssignSocietyMember, useRemoveSocietyMember } from "@/features/portfolio/queries/useSocieties";
import EmptyState from "@/shared/ui/EmptyState";
import ErrorMessage from "@/shared/ui/ErrorMessage";
import EntityCombobox from "@/shared/ui/EntityCombobox";
import ConfirmDeleteModal from "@/shared/ui/ConfirmDeleteModal";
import MutationErrorNotification from "@/shared/ui/MutationErrorNotification";
import RemoveIconButton from "@/shared/ui/RemoveIconButton";
import type { SocietyMember, SocietyRole } from "@/features/portfolio/api/society";
import { displayName } from "@/shared/lib/name";

const ROLES: { value: SocietyRole; label: string }[] = [
  { value: "leader", label: "Leaders" },
  { value: "deputy_leader", label: "Deputy leaders" },
  { value: "secretary", label: "Secretaries" },
  { value: "treasurer", label: "Treasurers" },
  { value: "member", label: "Members" },
];

interface Props {
  societyId: string;
  readOnly?: boolean;
}

// Roster editor shared by the admin Societies page and the teacher My Society page; the backend enforces who may mutate.
export default function SocietyRoster({ societyId, readOnly }: Props) {
  const { data: members, isLoading, isError, refetch } = useSocietyMembers(societyId);
  const [studentSearch, setStudentSearch] = useState("");
  const { data: studentPage } = useStudents({ limit: 25, search: studentSearch });
  const assignMember = useAssignSocietyMember(societyId);
  const removeMember = useRemoveSocietyMember(societyId);

  const [assignOpen, setAssignOpen] = useState(false);
  const [studentChoice, setStudentChoice] = useState("");
  const [roleChoice, setRoleChoice] = useState<SocietyRole>("member");
  const [memberToRemove, setMemberToRemove] = useState<SocietyMember | null>(null);

  const openAssign = () => {
    assignMember.reset();
    setStudentChoice("");
    setRoleChoice("member");
    setAssignOpen(true);
  };

  const handleAssign = () => {
    if (!studentChoice) return;
    assignMember.mutate(
      { student_id: studentChoice, role: roleChoice },
      { onSuccess: () => setAssignOpen(false) },
    );
  };

  const confirmRemove = () => {
    if (!memberToRemove) return;
    removeMember.mutate({ memberId: memberToRemove.id, studentId: memberToRemove.student_id });
  };

  const byRole = (role: SocietyRole) => (members ?? []).filter((m) => m.role === role);
  const memberStudentIds = new Set((members ?? []).map((m) => m.student_id));
  const availableStudents = (studentPage?.items ?? []).filter((s) => !memberStudentIds.has(s.id));

  if (isError) {
    return <ErrorMessage message="Could not load the roster." onRetry={refetch} />;
  }

  return (
    <div className="os-society-roster">
      <div className="os-flex os-justify-end os-mb-4">
        {!readOnly && (
          <Button type="primary" icon={<PlusOutlined />} onClick={openAssign}>
            Add member
          </Button>
        )}
      </div>

      <MutationErrorNotification
        isError={removeMember.isError}
        error={removeMember.error}
        title="Could not remove member"
        fallback="Please try again."
        onClose={() => removeMember.reset()}
      />

      {isLoading ? (
        <Skeleton active title={false} paragraph={{ rows: 3 }} />
      ) : (members ?? []).length === 0 ? (
        <EmptyState title="No members yet" description="Add a student to this society's roster." />
      ) : (
        ROLES.map(({ value, label }) =>
          byRole(value).length === 0 ? null : (
            <div key={value} className="os-mb-4">
              <div className="os-flex os-items-center os-gap-2 os-mb-1">
                <h3 className="os-text-sm os-fw-500 os-c-secondary os-m-0">
                  {label}
                </h3>
                <span className="os-text-xs os-c-tertiary">{byRole(value).length}</span>
              </div>
              {byRole(value).map((m) => (
                <div key={m.id} className="os-list-row os-list-row--compact os-society-member-row">
                  <div className="os-flex-1 os-min-w-0">
                    <Link to={`/students/${m.student_id}`} className="os-table__link os-text-md os-fw-500">
                      {m.student_name}
                    </Link>
                    <p className="os-mt-h os-mx-0 os-mb-0 os-text-xs os-c-secondary">
                      {[m.grade_name, m.student_index].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  {!readOnly && (
                    <RemoveIconButton disabled={removeMember.isPending} onClick={() => setMemberToRemove(m)} />
                  )}
                </div>
              ))}
            </div>
          ),
        )
      )}

      <FormModal
        open={assignOpen}
        title="Add society member"
        onClose={() => setAssignOpen(false)}
        onSubmit={handleAssign}
        isPending={assignMember.isPending}
        submitDisabled={!studentChoice}
        submitLabel="Add"
        isError={assignMember.isError}
        error={assignMember.error}
        errorTitle="Could not add member"
        errorFallback="Please try again."
      >
        <div className="os-stack os-gap-4">
          <EntityCombobox
            id="society-member-student"
            labelText="Student"
            items={availableStudents}
            selectedId={studentChoice}
            onSelect={setStudentChoice}
            onSearch={setStudentSearch}
            getId={(s) => s.id}
            itemToString={(s) => `${displayName(s)} - ${s.index_number}`}
            placeholder="Search students by name or index number…"
          />
          <SelectField
            id="society-member-role"
            label="Role"
            value={roleChoice}
            onChange={(v) => setRoleChoice(v as SocietyRole)}
            options={ROLES.map((r) => ({ value: r.value, label: r.label.replace(/s$/, "") }))}
          />
        </div>
      </FormModal>

      <ConfirmDeleteModal
        open={!!memberToRemove}
        title="Remove member"
        description={
          <>
            Remove <strong>{memberToRemove?.student_name}</strong> from this society?
          </>
        }
        confirmLabel="Remove"
        pendingLabel="Removing…"
        subject="Member"
        successVerb="removed"
        mutation={removeMember}
        onClose={() => setMemberToRemove(null)}
        onConfirm={confirmRemove}
      />
    </div>
  );
}
