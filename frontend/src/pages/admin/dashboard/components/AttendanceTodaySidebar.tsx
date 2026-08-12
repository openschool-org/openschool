import { Link } from "react-router";
import { SkeletonText } from "@carbon/react";
import type { DailySession } from "../../../../services/attendance";
import { ACCENT } from "../constants";

export default function AttendanceTodaySidebar({
  sessions,
  loading,
}: {
  sessions: DailySession[] | undefined;
  loading: boolean;
}) {
  const marked = (sessions ?? []).filter((s) => s.marked_count > 0).length;
  const pending = (sessions ?? []).length - marked;
  const markedPct = sessions && sessions.length > 0 ? Math.round((marked / sessions.length) * 100) : 0;

  return (
    <div className="os-section">
      <div className="os-section__header">
        <h2 className="os-section__title">Attendance Today</h2>
        <Link to="/attendance" style={{ fontSize: "0.75rem", color: ACCENT, textDecoration: "none" }}>
          Manage →
        </Link>
      </div>
      <div className="os-section__body" style={{ padding: "1rem 1.5rem" }}>
        {loading ? (
          <SkeletonText width="70%" />
        ) : !sessions || sessions.length === 0 ? (
          <p style={{ margin: 0, fontSize: "0.8125rem", color: "#8d8d8d" }}>
            No sessions have been created for today yet.
          </p>
        ) : (
          <>
            <div style={{ marginBottom: "1rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", marginBottom: "0.35rem" }}>
                <span style={{ color: "#525252" }}>Sessions marked</span>
                <span style={{ fontWeight: 600, color: "#161616" }}>
                  {marked} / {sessions.length}
                </span>
              </div>
              <div style={{ height: "6px", background: "#e0e0e0", borderRadius: "3px" }}>
                <div style={{ width: `${markedPct}%`, height: "100%", background: ACCENT, borderRadius: "3px" }} />
              </div>
            </div>
            {[
              { label: "Marked", value: marked, color: "#24a148" },
              { label: "Pending", value: pending, color: "#f1c21b" },
            ].map(({ label, value, color }) => (
              <div
                key={label}
                style={{ display: "flex", justifyContent: "space-between", padding: "0.4rem 0", borderBottom: "1px solid #f4f4f4", fontSize: "0.8125rem" }}
              >
                <span style={{ color: "#525252" }}>{label}</span>
                <span style={{ fontWeight: 600, color }}>{value}</span>
              </div>
            ))}
            {pending > 0 && (
              <Link
                to="/attendance"
                style={{ display: "block", marginTop: "0.75rem", fontSize: "0.8125rem", color: ACCENT, textDecoration: "none", fontWeight: 500 }}
              >
                Mark remaining sessions →
              </Link>
            )}
          </>
        )}
      </div>
    </div>
  );
}
