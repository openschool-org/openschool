import { Link } from "react-router";
import { Tag } from "@carbon/react";
import { useSessionRecords } from "../../../queries/useAttendance";
import type { AttendanceSession } from "../../../services/attendance";

const ACCENT = "#406AAF";

function RecentSessionRow({ session, className }: { session: AttendanceSession; className: string }) {
  const { data: records, isLoading } = useSessionRecords(session.id);
  const present = records?.filter((r) => r.status === "present").length ?? 0;
  const absent = records?.filter((r) => r.status === "absent").length ?? 0;

  return (
    <tr>
      <td><span style={{ fontSize: "0.8125rem", color: "#525252" }}>{session.date}</span></td>
      <td className="os-table__link">{className}</td>
      <td>
        {isLoading ? <span style={{ color: "#8d8d8d" }}>…</span> : <span style={{ color: "#24a148", fontWeight: 600 }}>{present}</span>}
      </td>
      <td>
        {isLoading ? (
          <span style={{ color: "#8d8d8d" }}>…</span>
        ) : (
          <span style={{ color: absent > 0 ? "#da1e28" : "#8d8d8d", fontWeight: absent > 0 ? 600 : 400 }}>{absent}</span>
        )}
      </td>
      <td><Tag type="blue" size="sm">Marked</Tag></td>
    </tr>
  );
}

export default function RecentSessions({
  sessions,
}: {
  sessions: { session: AttendanceSession; className: string }[];
}) {
  return (
    <div className="os-section">
      <div className="os-section__header">
        <h2 className="os-section__title">Recent Sessions</h2>
        <Link to="/t/attendance" style={{ fontSize: "0.75rem", color: ACCENT, textDecoration: "none" }}>View all →</Link>
      </div>
      <table className="os-table">
        <thead>
          <tr><th>Date</th><th>Class</th><th>Present</th><th>Absent</th><th>Status</th></tr>
        </thead>
        <tbody>
          {sessions.length === 0 ? (
            <tr><td colSpan={5} style={{ textAlign: "center", color: "#8d8d8d", padding: "2rem" }}>No attendance sessions recorded yet</td></tr>
          ) : (
            sessions.map(({ session, className }) => (
              <RecentSessionRow key={session.id} session={session} className={className} />
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
