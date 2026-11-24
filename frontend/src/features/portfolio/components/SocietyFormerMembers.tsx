import { Button } from "antd";
import Pill from "@/shared/ui/Pill";
import { UndoOutlined } from "@ant-design/icons";
import { useAssignSocietyMember } from "@/features/portfolio/queries/useSocieties";
import { roleInfo } from "@/features/portfolio/components/societyRoles";
import type { SocietyMember } from "@/features/portfolio/api/society";
import DataGrid from "@/shared/ui/DataGrid";
import MutationErrorNotification from "@/shared/ui/MutationErrorNotification";
import { formatDayMonthYear } from "@/shared/lib/date";

interface Props {
  societyId: string;
  members: SocietyMember[];
  readOnly?: boolean;
}

// Members who left this year, with when and why; a former member can be made active again.
export default function SocietyFormerMembers({ societyId, members, readOnly }: Props) {
  const reactivate = useAssignSocietyMember(societyId);
  if (members.length === 0) return null;
  return (
    <div className="os-grid os-gap-2">
      <h3 className="os-m-0 os-text-md os-fw-600">Former members ({members.length})</h3>
      <MutationErrorNotification isError={reactivate.isError} error={reactivate.error} title="Could not reactivate member" fallback="Please try again." onClose={() => reactivate.reset()} />
      <DataGrid
        rows={members}
        getRowId={(m) => m.id}
        pagination={false}
        noHover
        columns={[
          {
            key: "student",
            header: "Student",
            render: (m) => (
              <>
                <span className="os-fw-500 os-c-secondary">{m.student_name}</span>
                <span className="os-table__muted os-text-sm os-block">{m.student_index}</span>
              </>
            ),
          },
          { key: "role", header: "Role held", render: (m) => <Pill>{roleInfo(m.role).label}</Pill> },
          { key: "joined", header: "Joined", render: (m) => formatDayMonthYear(m.created_at) },
          { key: "left", header: "Left", render: (m) => formatDayMonthYear(m.left_at) },
          { key: "reason", header: "Reason", render: (m) => <span className="os-table__muted">{m.left_reason || "-"}</span> },
          ...(readOnly
            ? []
            : [{
                key: "reactivate",
                header: "",
                align: "end" as const,
                render: (m: SocietyMember) => (
                  <Button size="small" icon={<UndoOutlined />} loading={reactivate.isPending && reactivate.variables?.student_id === m.student_id}
                    onClick={() => reactivate.mutate({ student_id: m.student_id, role: m.role })}>
                    Reactivate
                  </Button>
                ),
              }]),
        ]}
      />
    </div>
  );
}
