import { Link } from "react-router";
import { Tag } from "@carbon/react";
import type { AttendanceSession } from "@/features/attendance/api/attendance";
import DataGrid from "@/shared/ui/DataGrid";
import SessionCountCell from "@/features/attendance/components/SessionCountCell";
import EmptyState from "@/shared/ui/EmptyState";

type Row = { session: AttendanceSession; className: string };

export default function RecentSessions({ sessions }: { sessions: Row[] }) {
  return (
    <div className="os-section">
      <div className="os-section__header">
        <h2 className="os-section__title">Recent sessions</h2>
        <Link to="/t/attendance" className="os-text-xs os-c-accent os-no-underline">View all →</Link>
      </div>
      {sessions.length === 0 ? (
        <EmptyState title="No attendance sessions recorded yet" description="Sessions you take will appear here." />
      ) : (
        <DataGrid
          rows={sessions}
          getRowId={(r) => r.session.id}
          pagination={false}
          columns={[
            { key: "date", header: "Date", render: (r) => <span className="os-text-sm os-c-secondary">{r.session.date}</span> },
            { key: "class", header: "Class", render: (r) => <span className="os-table__link">{r.className}</span> },
            { key: "present", header: "Present", render: (r) => <SessionCountCell sessionId={r.session.id} status="present" /> },
            { key: "absent", header: "Absent", render: (r) => <SessionCountCell sessionId={r.session.id} status="absent" /> },
            { key: "status", header: "Status", render: () => <Tag type="blue" size="sm">Marked</Tag> },
          ]}
        />
      )}
    </div>
  );
}
