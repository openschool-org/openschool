import { useState } from "react";
import { Button, Select, SelectItem, TextInput, InlineNotification, Tag } from "@carbon/react";
import { Add, TrashCan } from "@carbon/icons-react";
import { useCurrentAcademicYear } from "../../../queries/useAcademicYears";
import {
  useStudentActivities,
  useCreateStudentActivity,
  useDeleteStudentActivity,
} from "../../../queries/useStudentPortfolio";
import { useStudentSocietyMemberships } from "../../../queries/useSocieties";
import { ACTIVITY_CATEGORIES } from "../../../services/studentPortfolio";
import type { ActivityCategory } from "../../../services/studentPortfolio";
import { getErrorMessage } from "../../../lib/errorMessage";
import EmptyState from "../../../components/common/EmptyState";

const SOCIETY_ROLE_LABELS: Record<string, string> = {
  leader: "Leader",
  deputy_leader: "Deputy Leader",
  secretary: "Secretary",
  treasurer: "Treasurer",
  member: "Member",
};

function StudentSocietyMemberships({ studentId }: { studentId: string }) {
  const { data: memberships, isLoading } = useStudentSocietyMemberships(studentId);

  if (isLoading || (memberships?.length ?? 0) === 0) return null;

  return (
    <div style={{ marginBottom: "1.5rem" }}>
      <h3 style={{ fontSize: "0.75rem", fontWeight: 600, textTransform: "uppercase", color: "#8d8d8d", margin: "0 0 0.5rem" }}>
        Society Memberships
      </h3>
      {memberships?.map((m) => (
        <div key={m.id} style={{ display: "flex", alignItems: "center", gap: "0.625rem", padding: "0.625rem 0", borderBottom: "1px solid #e0e0e0" }}>
          <Tag size="sm" type="purple">{SOCIETY_ROLE_LABELS[m.role] ?? m.role}</Tag>
          <span style={{ fontWeight: 500, fontSize: "0.875rem" }}>{m.society_name}</span>
          <span style={{ fontSize: "0.8125rem", color: "#8d8d8d" }}>{m.academic_year_label}</span>
        </div>
      ))}
    </div>
  );
}

export default function StudentActivities({ studentId }: { studentId: string }) {
  const { data: currentYear } = useCurrentAcademicYear();
  const { data: activities, isLoading } = useStudentActivities(studentId);
  const createActivity = useCreateStudentActivity(studentId);
  const deleteActivity = useDeleteStudentActivity(studentId);

  const [category, setCategory] = useState<ActivityCategory | "">("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("");

  const handleAdd = () => {
    if (!category || !name.trim() || !currentYear) return;
    createActivity.mutate(
      {
        academic_year_id: currentYear.id,
        category,
        name: name.trim(),
        role: role.trim() || undefined,
      },
      { onSuccess: () => { setName(""); setRole(""); } },
    );
  };

  return (
    <div className="os-section" style={{ marginTop: "1rem" }}>
      <div className="os-section__header">
        <h2 className="os-section__title">Activities</h2>
        <span style={{ fontSize: "0.75rem", color: "#8d8d8d" }}>Clubs, sports, societies &amp; competitions</span>
      </div>
      <div className="os-section__body">
        <StudentSocietyMemberships studentId={studentId} />

        {createActivity.isError && (
          <InlineNotification
            kind="error"
            title="Error"
            subtitle={getErrorMessage(createActivity.error, "Failed to add activity")}
            lowContrast
            hideCloseButton
            style={{ marginBottom: "1rem", maxWidth: "100%" }}
          />
        )}

        <div style={{ display: "grid", gridTemplateColumns: "10rem 1fr 10rem auto", gap: "0.75rem", alignItems: "end", marginBottom: "1.5rem" }}>
          <Select id="activity-category" labelText="Category" value={category} onChange={(e) => setCategory(e.target.value as ActivityCategory)}>
            <SelectItem value="" text="Select…" />
            {ACTIVITY_CATEGORIES.map((c) => (
              <SelectItem key={c.value} value={c.value} text={c.label} />
            ))}
          </Select>
          <TextInput id="activity-name" labelText="Name" value={name} onChange={(e) => setName(e.target.value)} />
          <TextInput id="activity-role" labelText="Role (optional)" value={role} onChange={(e) => setRole(e.target.value)} />
          <Button renderIcon={Add} kind="primary" size="md" onClick={handleAdd} disabled={!category || !name.trim() || createActivity.isPending}>
            Add
          </Button>
        </div>

        {!isLoading && (activities?.length ?? 0) === 0 && (
          <EmptyState title="No activities yet" description="Add clubs, sports, societies, or competitions this student takes part in." />
        )}

        {activities?.map((a) => (
          <div key={a.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.625rem 0", borderBottom: "1px solid #e0e0e0" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
              <Tag size="sm" type="gray">{ACTIVITY_CATEGORIES.find((c) => c.value === a.category)?.label ?? a.category}</Tag>
              <span style={{ fontWeight: 500, fontSize: "0.875rem" }}>{a.name}</span>
              {a.role && <span style={{ fontSize: "0.8125rem", color: "#8d8d8d" }}>{a.role}</span>}
            </div>
            <Button hasIconOnly iconDescription="Delete" renderIcon={TrashCan} kind="ghost" size="sm" onClick={() => deleteActivity.mutate(a.id)} />
          </div>
        ))}
      </div>
    </div>
  );
}
