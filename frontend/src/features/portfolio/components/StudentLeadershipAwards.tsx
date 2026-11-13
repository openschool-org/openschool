import { useState } from "react";
import { useCurrentAcademicYear } from "@/features/school/queries/useAcademicYears";
import {
  useLeadershipRoles,
  useCreateLeadershipRole,
  useDeleteLeadershipRole,
  useStudentAwards,
  useCreateStudentAward,
  useDeleteStudentAward,
} from "@/features/portfolio/queries/useStudentPortfolio";
import { formatDate, todayISODate } from "@/shared/lib/date";
import ConfirmDeleteModal from "@/shared/ui/ConfirmDeleteModal";
import RemoveIconButton from "@/shared/ui/RemoveIconButton";
import RecordsCard from "@/shared/ui/RecordsCard";
import FormModal from "@/shared/ui/FormModal";
import TextField from "@/shared/ui/TextField";
import DateField from "@/shared/ui/DateField";

export default function StudentLeadershipAwards({ studentId }: { studentId: string }) {
  const { data: currentYear } = useCurrentAcademicYear();

  const { data: roles, isLoading: rolesLoading } = useLeadershipRoles(studentId);
  const createRole = useCreateLeadershipRole(studentId);
  const deleteRole = useDeleteLeadershipRole(studentId);
  const [roleOpen, setRoleOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [scope, setScope] = useState("");
  const [pendingDeleteRoleId, setPendingDeleteRoleId] = useState<string | null>(null);

  const { data: awards, isLoading: awardsLoading } = useStudentAwards(studentId);
  const createAward = useCreateStudentAward(studentId);
  const deleteAward = useDeleteStudentAward(studentId);
  const [awardOpen, setAwardOpen] = useState(false);
  const [awardTitle, setAwardTitle] = useState("");
  const [awardDate, setAwardDate] = useState(todayISODate());
  const [pendingDeleteAwardId, setPendingDeleteAwardId] = useState<string | null>(null);

  const openRole = () => { createRole.reset(); setTitle(""); setScope(""); setRoleOpen(true); };
  const openAward = () => { createAward.reset(); setAwardTitle(""); setAwardDate(todayISODate()); setAwardOpen(true); };

  const addRole = () => {
    if (!title.trim() || !currentYear) return;
    createRole.mutate(
      { academic_year_id: currentYear.id, title: title.trim(), scope: scope.trim() || undefined },
      { onSuccess: () => setRoleOpen(false) },
    );
  };

  const addAward = () => {
    if (!awardTitle.trim() || !currentYear) return;
    createAward.mutate(
      { academic_year_id: currentYear.id, title: awardTitle.trim(), awarded_date: new Date(awardDate).toISOString() },
      { onSuccess: () => setAwardOpen(false) },
    );
  };

  return (
    <div className="os-flex os-col os-gap-6">
      <RecordsCard
        title="Leadership roles"
        subtitle="Roles outside the prefect board, such as club president or sports captain"
        addLabel="Add role"
        onAdd={currentYear ? openRole : undefined}
        isLoading={rolesLoading}
        rows={roles ?? []}
        getRowId={(r) => r.id}
        empty={{ title: "No leadership roles yet", description: "Add a role this student holds, like club president or sports captain." }}
        columns={[
          { key: "title", header: "Role", render: (r) => <span className="os-fw-500">{r.title}</span> },
          { key: "scope", header: "Scope", render: (r) => <span className="os-table__muted">{r.scope || "-"}</span> },
          { key: "actions", header: "", align: "end", render: (r) => <RemoveIconButton label={`Delete ${r.title}`} onClick={() => setPendingDeleteRoleId(r.id)} /> },
        ]}
      />

      <RecordsCard
        title="Awards & achievements"
        addLabel="Add award"
        onAdd={currentYear ? openAward : undefined}
        isLoading={awardsLoading}
        rows={awards ?? []}
        getRowId={(a) => a.id}
        empty={{ title: "No awards yet", description: "Add awards and achievements for this student." }}
        columns={[
          { key: "title", header: "Award", render: (a) => <span className="os-fw-500">{a.title}</span> },
          { key: "date", header: "Date", render: (a) => <span className="os-table__muted">{formatDate(a.awarded_date)}</span> },
          { key: "actions", header: "", align: "end", render: (a) => <RemoveIconButton label={`Delete ${a.title}`} onClick={() => setPendingDeleteAwardId(a.id)} /> },
        ]}
      />

      <FormModal
        open={roleOpen}
        title="Add leadership role"
        onClose={() => setRoleOpen(false)}
        onSubmit={addRole}
        isPending={createRole.isPending}
        submitDisabled={!title.trim()}
        submitLabel="Add role"
        isError={createRole.isError}
        error={createRole.error}
        errorTitle="Could not add role"
      >
        <div className="os-stack os-gap-4">
          <TextField id="leadership-title" label="Role" placeholder="e.g. Debate Club President" value={title} onChange={setTitle} />
          <TextField id="leadership-scope" label="Scope (optional)" placeholder="e.g. Senior section" value={scope} onChange={setScope} />
        </div>
      </FormModal>

      <FormModal
        open={awardOpen}
        title="Add award"
        onClose={() => setAwardOpen(false)}
        onSubmit={addAward}
        isPending={createAward.isPending}
        submitDisabled={!awardTitle.trim()}
        submitLabel="Add award"
        isError={createAward.isError}
        error={createAward.error}
        errorTitle="Could not add award"
      >
        <div className="os-stack os-gap-4">
          <TextField id="award-title" label="Award" placeholder="e.g. All-island art competition, 1st place" value={awardTitle} onChange={setAwardTitle} />
          <DateField id="award-date" labelText="Date" value={awardDate} onChange={(ymd) => ymd && setAwardDate(ymd)} />
        </div>
      </FormModal>

      <ConfirmDeleteModal
        open={pendingDeleteRoleId !== null}
        title="Delete leadership role"
        description="This will permanently remove this leadership role. This action cannot be undone."
        subject="Leadership role"
        mutation={deleteRole}
        onClose={() => setPendingDeleteRoleId(null)}
        onConfirm={() => pendingDeleteRoleId && deleteRole.mutate(pendingDeleteRoleId)}
      />
      <ConfirmDeleteModal
        open={pendingDeleteAwardId !== null}
        title="Delete award"
        description="This will permanently remove this award. This action cannot be undone."
        subject="Award"
        mutation={deleteAward}
        onClose={() => setPendingDeleteAwardId(null)}
        onConfirm={() => pendingDeleteAwardId && deleteAward.mutate(pendingDeleteAwardId)}
      />
    </div>
  );
}
