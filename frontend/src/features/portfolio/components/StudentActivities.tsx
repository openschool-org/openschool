import { useState } from "react";
import { Tag } from "antd";
import { useCurrentAcademicYear } from "@/features/school/queries/useAcademicYears";
import {
  useStudentActivities,
  useCreateStudentActivity,
  useDeleteStudentActivity,
} from "@/features/portfolio/queries/useStudentPortfolio";
import { useStudentSocietyMemberships } from "@/features/portfolio/queries/useSocieties";
import { ACTIVITY_CATEGORIES } from "@/features/portfolio/api/studentPortfolio";
import type { ActivityCategory } from "@/features/portfolio/api/studentPortfolio";
import ConfirmDeleteModal from "@/shared/ui/ConfirmDeleteModal";
import RemoveIconButton from "@/shared/ui/RemoveIconButton";
import RecordsCard from "@/shared/ui/RecordsCard";
import FormModal from "@/shared/ui/FormModal";
import SelectField from "@/shared/ui/SelectField";
import TextField from "@/shared/ui/TextField";

const SOCIETY_ROLE_LABELS: Record<string, string> = {
  leader: "Leader",
  deputy_leader: "Deputy leader",
  secretary: "Secretary",
  treasurer: "Treasurer",
  member: "Member",
};

const categoryLabel = (c: string) => ACTIVITY_CATEGORIES.find((x) => x.value === c)?.label ?? c;

export default function StudentActivities({ studentId }: { studentId: string }) {
  const { data: currentYear } = useCurrentAcademicYear();
  const { data: activities, isLoading } = useStudentActivities(studentId);
  const memberships = useStudentSocietyMemberships(studentId);
  const createActivity = useCreateStudentActivity(studentId);
  const deleteActivity = useDeleteStudentActivity(studentId);

  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<ActivityCategory | "">("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const openAdd = () => { createActivity.reset(); setCategory(""); setName(""); setRole(""); setOpen(true); };

  const handleAdd = () => {
    if (!category || !name.trim() || !currentYear) return;
    createActivity.mutate(
      { academic_year_id: currentYear.id, category, name: name.trim(), role: role.trim() || undefined },
      { onSuccess: () => setOpen(false) },
    );
  };

  return (
    <div className="os-flex os-col os-gap-6">
      <RecordsCard
        title="Activities"
        subtitle="Clubs, sports and competitions"
        addLabel="Add activity"
        onAdd={currentYear ? openAdd : undefined}
        isLoading={isLoading}
        rows={activities ?? []}
        getRowId={(a) => a.id}
        empty={{ title: "No activities yet", description: "Add clubs, sports or competitions this student takes part in." }}
        columns={[
          { key: "category", header: "Category", render: (a) => <Tag variant="filled">{categoryLabel(a.category)}</Tag> },
          { key: "name", header: "Activity", render: (a) => <span className="os-fw-500">{a.name}</span> },
          { key: "role", header: "Role", render: (a) => <span className="os-table__muted">{a.role || "-"}</span> },
          { key: "actions", header: "", align: "end", render: (a) => <RemoveIconButton label={`Delete ${a.name}`} onClick={() => setPendingDeleteId(a.id)} /> },
        ]}
      />

      {/* Society memberships come from the Societies page, so they are listed here but not edited. */}
      <RecordsCard
        title="Society memberships"
        subtitle="Managed on the Societies page"
        isLoading={memberships.isLoading}
        isError={memberships.isError}
        errorMessage="Could not load society memberships."
        onRetry={memberships.refetch}
        rows={memberships.data ?? []}
        getRowId={(m) => m.id}
        empty={{ title: "No society memberships", description: "This student is not on any society roster." }}
        columns={[
          { key: "society", header: "Society", render: (m) => <span className="os-fw-500">{m.society_name}</span> },
          { key: "role", header: "Role", render: (m) => <Tag color="purple" variant="filled">{SOCIETY_ROLE_LABELS[m.role] ?? m.role}</Tag> },
          { key: "year", header: "Year", render: (m) => <span className="os-table__muted">{m.academic_year_label}</span> },
        ]}
      />

      <FormModal
        open={open}
        title="Add activity"
        onClose={() => setOpen(false)}
        onSubmit={handleAdd}
        isPending={createActivity.isPending}
        submitDisabled={!category || !name.trim()}
        submitLabel="Add activity"
        isError={createActivity.isError}
        error={createActivity.error}
        errorTitle="Could not add activity"
      >
        <div className="os-stack os-gap-4">
          <SelectField
            id="activity-category"
            label="Category"
            placeholder="Select…"
            value={category}
            onChange={(v) => setCategory(v as ActivityCategory)}
            options={ACTIVITY_CATEGORIES.map((c) => ({ value: c.value, label: c.label }))}
          />
          <TextField id="activity-name" label="Activity" placeholder="e.g. School cricket team" value={name} onChange={setName} />
          <TextField id="activity-role" label="Role (optional)" placeholder="e.g. Vice captain" value={role} onChange={setRole} />
        </div>
      </FormModal>

      <ConfirmDeleteModal
        open={pendingDeleteId !== null}
        title="Delete activity"
        description="This will permanently remove this activity record. This action cannot be undone."
        subject="Activity"
        mutation={deleteActivity}
        onClose={() => setPendingDeleteId(null)}
        onConfirm={() => pendingDeleteId && deleteActivity.mutate(pendingDeleteId)}
      />
    </div>
  );
}
