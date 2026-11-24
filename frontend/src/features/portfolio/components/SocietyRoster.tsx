import { useMemo, useState } from "react";
import { Button, Select, Skeleton } from "antd";
import Pill from "@/shared/ui/Pill";
import { PlusOutlined, UserDeleteOutlined } from "@ant-design/icons";
import { Link } from "react-router";
import { useSocietyMembers } from "@/features/portfolio/queries/useSocieties";
import SocietyAddMemberModal from "@/features/portfolio/components/SocietyAddMemberModal";
import SocietyDeactivateModal from "@/features/portfolio/components/SocietyDeactivateModal";
import SocietyFormerMembers from "@/features/portfolio/components/SocietyFormerMembers";
import { SOCIETY_ROLES, roleInfo, roleRank } from "@/features/portfolio/components/societyRoles";
import type { SocietyMember } from "@/features/portfolio/api/society";
import DataGrid from "@/shared/ui/DataGrid";
import FilterBar from "@/shared/ui/FilterBar";
import EmptyState from "@/shared/ui/EmptyState";
import ErrorMessage from "@/shared/ui/ErrorMessage";
import { formatDayMonthYear } from "@/shared/lib/date";

interface Props {
  societyId: string;
  readOnly?: boolean;
  // Teachers have no student detail page, so names stay plain text for them.
  linkStudents?: boolean;
}

// Searchable roster shared by the admin Societies page and the teacher My Society page; the backend enforces who may change it.
export default function SocietyRoster({ societyId, readOnly, linkStudents = true }: Props) {
  const { data: members, isLoading, isError, refetch } = useSocietyMembers(societyId);
  const [addOpen, setAddOpen] = useState(false);
  const [memberToDeactivate, setMemberToDeactivate] = useState<SocietyMember | null>(null);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");

  const sorted = useMemo(
    () => (members ?? []).filter((m) => !m.left_at).sort((a, b) => roleRank(a.role) - roleRank(b.role) || a.student_name.localeCompare(b.student_name)),
    [members],
  );
  const former = useMemo(() => (members ?? []).filter((m) => m.left_at), [members]);
  const rows = useMemo(() => {
    const words = search.trim().toLowerCase();
    return sorted.filter(
      (m) => (!role || m.role === role) && (!words || [m.student_name, m.student_index, m.grade_name ?? ""].join(" ").toLowerCase().includes(words)),
    );
  }, [sorted, search, role]);

  if (isError) return <ErrorMessage message="Could not load the roster." onRetry={refetch} />;

  return (
    <div className="os-grid os-gap-4">
      <div className="os-flex os-items-center os-gap-3 os-wrap">
        <div className="os-flex-1">
          <FilterBar
            search={{ value: search, onChange: setSearch, placeholder: "Search members by name, index number or grade" }}
            controls={[
              {
                label: "Role",
                node: (
                  <Select
                    className="os-min-w-12"
                    value={role}
                    onChange={setRole}
                    options={[{ value: "", label: "All roles" }, ...SOCIETY_ROLES.map((r) => ({ value: r.value, label: r.label }))]}
                  />
                ),
              },
            ]}
          />
        </div>
        {!readOnly && (
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setAddOpen(true)}>
            Add member
          </Button>
        )}
      </div>

      {isLoading ? (
        <Skeleton active title={false} paragraph={{ rows: 3 }} />
      ) : sorted.length === 0 ? (
        <EmptyState title="No active members" description="Add a student to this society's roster." />
      ) : rows.length === 0 ? (
        <EmptyState title="No matching members" description="Try a different name, index number or role." />
      ) : (
        <DataGrid
          rows={rows}
          getRowId={(m) => m.id}
          pagination={false}
          columns={[
            {
              key: "student",
              header: "Student",
              render: (m) => (
                <>
                  {linkStudents ? (
                    <Link to={`/students/${m.student_id}`} className="os-table__link os-fw-500">{m.student_name}</Link>
                  ) : (
                    <span className="os-fw-500">{m.student_name}</span>
                  )}
                  <span className="os-table__muted os-text-sm os-block">{m.student_index}</span>
                </>
              ),
            },
            { key: "grade", header: "Grade", render: (m) => m.grade_name ?? "-" },
            { key: "role", header: "Role", render: (m) => <Pill tone={roleInfo(m.role).tone}>{roleInfo(m.role).label}</Pill> },
            { key: "joined", header: "Joined", render: (m) => formatDayMonthYear(m.created_at) },
            ...(readOnly
              ? []
              : [{
                  key: "deactivate",
                  header: "",
                  align: "end" as const,
                  render: (m: SocietyMember) => (
                    <Button size="small" icon={<UserDeleteOutlined />} onClick={() => setMemberToDeactivate(m)}>Deactivate</Button>
                  ),
                }]),
          ]}
        />
      )}

      <SocietyFormerMembers societyId={societyId} members={former} readOnly={readOnly} />

      {!readOnly && (
        <>
          {/* Former members are excluded, so adding one again reactivates their row. */}
          <SocietyAddMemberModal societyId={societyId} memberStudentIds={new Set(sorted.map((m) => m.student_id))} open={addOpen} onClose={() => setAddOpen(false)} />
          <SocietyDeactivateModal societyId={societyId} member={memberToDeactivate} onClose={() => setMemberToDeactivate(null)} />
        </>
      )}
    </div>
  );
}
