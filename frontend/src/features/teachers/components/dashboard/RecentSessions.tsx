import { Link } from "react-router";
import { Card } from "antd";
import type { AttendanceSession } from "@/features/attendance/api/attendance";
import DataGrid from "@/shared/ui/DataGrid";
import SessionCountCell from "@/features/attendance/components/SessionCountCell";
import EmptyState from "@/shared/ui/EmptyState";
import { formatDayMonthYear } from "@/shared/lib/date";

type Row = { session: AttendanceSession; className: string };

export default function RecentSessions({ sessions }: { sessions: Row[] }) {
  return (
    <Card className="os-dash-card is-flush" title="Recent sessions" extra={<Link to="/t/attendance">View all</Link>}>
      {sessions.length === 0 ? (
        <EmptyState title="No attendance sessions recorded yet" description="Sessions you take will appear here." />
      ) : (
        <DataGrid
          rows={sessions}
          getRowId={(r) => r.session.id}
          pagination={false}
          columns={[
            { key: "date", header: "Date", render: (r) => <span className="os-text-sm os-c-secondary">{formatDayMonthYear(r.session.date)}</span> },
            { key: "class", header: "Class", render: (r) => <Link to={`/attendance/sessions/${r.session.id}/mark`} className="os-table__link">{r.className}</Link> },
            { key: "present", header: "Present", render: (r) => <SessionCountCell count={r.session.present_count} /> },
            { key: "absent", header: "Absent", render: (r) => <SessionCountCell count={r.session.absent_count} /> },
            { key: "late", header: "Late", render: (r) => <SessionCountCell count={r.session.late_count} /> },
          ]}
        />
      )}
    </Card>
  );
}
