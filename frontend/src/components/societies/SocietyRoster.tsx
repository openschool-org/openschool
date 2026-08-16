import { useState } from "react";
import { Add, TrashCan } from "@carbon/icons-react";
import {
  Button,
  Select,
  SelectItem,
  InlineNotification,
  ComposedModal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  SkeletonText,
} from "@carbon/react";
import { Link } from "react-router";
import { useStudents } from "../../queries/useStudents";
import { useSocietyMembers, useAssignSocietyMember, useRemoveSocietyMember } from "../../queries/useSocieties";
import { getErrorMessage } from "../../lib/errorMessage";
import EmptyState from "../common/EmptyState";
import ErrorMessage from "../common/ErrorMessage";
import EntityCombobox from "../common/EntityCombobox";
import type { SocietyMember, SocietyRole } from "../../services/society";

const ROLES: { value: SocietyRole; label: string }[] = [
  { value: "leader", label: "Leaders" },
  { value: "deputy_leader", label: "Deputy Leaders" },
  { value: "secretary", label: "Secretaries" },
  { value: "treasurer", label: "Treasurers" },
  { value: "member", label: "Members" },
];

interface Props {
  societyId: string;
  readOnly?: boolean;
}

// A society's roster: add/remove students and assign one of the five roles.
// Shared by the admin Societies page (managing any society) and the
// teacher-portal My Society page (managing only the caller's own) — the
// backend enforces who's allowed to call the mutations either way.
export default function SocietyRoster({ societyId, readOnly }: Props) {
  const { data: members, isLoading, isError, refetch } = useSocietyMembers(societyId);
  const { data: students } = useStudents();
  const assignMember = useAssignSocietyMember(societyId);
  const removeMember = useRemoveSocietyMember(societyId);

  const [assignOpen, setAssignOpen] = useState(false);
  const [studentChoice, setStudentChoice] = useState("");
  const [roleChoice, setRoleChoice] = useState<SocietyRole>("member");

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

  const handleRemove = (m: SocietyMember) => {
    removeMember.mutate({ memberId: m.id, studentId: m.student_id });
  };

  const byRole = (role: SocietyRole) => (members ?? []).filter((m) => m.role === role);
  const memberStudentIds = new Set((members ?? []).map((m) => m.student_id));
  const availableStudents = (students ?? []).filter((s) => !memberStudentIds.has(s.id));

  if (isError) {
    return <ErrorMessage message="Could not load the roster." onRetry={refetch} />;
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "1rem" }}>
        {!readOnly && (
          <Button renderIcon={Add} kind="primary" size="sm" onClick={openAssign}>
            Add Member
          </Button>
        )}
      </div>

      {removeMember.isError && (
        <InlineNotification
          kind="error"
          lowContrast
          title="Could not remove member"
          subtitle={getErrorMessage(removeMember.error, "Please try again.")}
          onClose={() => removeMember.reset()}
          style={{ marginBottom: "1rem", maxWidth: "100%" }}
        />
      )}

      {isLoading ? (
        <SkeletonText width="40%" />
      ) : (members ?? []).length === 0 ? (
        <EmptyState title="No members yet" description="Add a student to this society's roster." />
      ) : (
        ROLES.map(({ value, label }) =>
          byRole(value).length === 0 ? null : (
            <div key={value} style={{ marginBottom: "1rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
                <h3 style={{ fontSize: "0.75rem", fontWeight: 600, textTransform: "uppercase", color: "#8d8d8d", margin: 0 }}>
                  {label}
                </h3>
                <span style={{ fontSize: "0.75rem", color: "#8d8d8d" }}>{byRole(value).length}</span>
              </div>
              {byRole(value).map((m, i) => (
                <div
                  key={m.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "1rem",
                    padding: "0.625rem 0",
                    borderBottom: i < byRole(value).length - 1 ? "1px solid #f4f4f4" : "none",
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Link to={`/students/${m.student_id}`} className="os-table__link" style={{ fontSize: "0.875rem", fontWeight: 500 }}>
                      {m.student_name}
                    </Link>
                    <p style={{ margin: "0.1rem 0 0", fontSize: "0.75rem", color: "#525252" }}>
                      {[m.grade_name, m.student_index].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  {!readOnly && (
                    <Button
                      hasIconOnly
                      kind="ghost"
                      size="sm"
                      iconDescription="Remove"
                      renderIcon={TrashCan}
                      disabled={removeMember.isPending}
                      onClick={() => handleRemove(m)}
                    />
                  )}
                </div>
              ))}
            </div>
          ),
        )
      )}

      <ComposedModal open={assignOpen} size="sm" onClose={() => setAssignOpen(false)}>
        <ModalHeader title="Add society member" />
        <ModalBody>
          {assignMember.isError && (
            <InlineNotification
              kind="error"
              title="Error"
              subtitle={getErrorMessage(assignMember.error, "Failed to add member")}
              lowContrast
              hideCloseButton
              style={{ marginBottom: "1rem", maxWidth: "100%" }}
            />
          )}
          <div style={{ display: "grid", gap: "1rem" }}>
            <EntityCombobox
              id="society-member-student"
              labelText="Student"
              items={availableStudents}
              selectedId={studentChoice}
              onSelect={setStudentChoice}
              getId={(s) => s.id}
              itemToString={(s) => `${s.full_name} — ${s.index_number}`}
              placeholder="Search students by name or index number…"
            />
            <Select
              id="society-member-role"
              labelText="Role"
              value={roleChoice}
              onChange={(e) => setRoleChoice(e.target.value as SocietyRole)}
            >
              {ROLES.map((r) => (
                <SelectItem key={r.value} value={r.value} text={r.label.replace(/s$/, "")} />
              ))}
            </Select>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button kind="secondary" onClick={() => setAssignOpen(false)}>
            Cancel
          </Button>
          <Button kind="primary" onClick={handleAssign} disabled={!studentChoice || assignMember.isPending}>
            {assignMember.isPending ? "Saving…" : "Add"}
          </Button>
        </ModalFooter>
      </ComposedModal>
    </div>
  );
}
