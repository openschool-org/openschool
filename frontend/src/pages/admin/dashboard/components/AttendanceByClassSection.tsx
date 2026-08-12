import { Link } from "react-router";
import { WarningFilled, CheckmarkFilled, EventSchedule } from "@carbon/icons-react";
import { SkeletonText } from "@carbon/react";
import type { ClassWithDetails } from "../../../../services/class";
import type { DailySession } from "../../../../services/attendance";
import EmptyState from "../../../../components/common/EmptyState";
import { ACCENT } from "../constants";

function ClassAttendanceBox({ cls, session }: { cls: ClassWithDetails; session: DailySession | undefined }) {
  const hasSession = !!session;
  const isMarked = !!session && session.marked_count > 0;

  return (
    <Link
      to={`/classes/${cls.id}`}
      state={{ tab: "attendance" }}
      style={{
        display: "block",
        textDecoration: "none",
        background: "#ffffff",
        border: "1px solid #e0e0e0",
        borderTop: `3px solid ${hasSession ? (isMarked ? "#24a148" : "#f1c21b") : "#c6c6c6"}`,
        padding: "1rem 1.125rem",
        transition: "border-color 0.2s ease",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "0.75rem" }}>
        <div style={{ minWidth: 0 }}>
          <p style={{ margin: "0 0 0.15rem", fontSize: "0.9375rem", fontWeight: 600, color: "#161616" }}>{cls.name}</p>
          <p style={{ margin: 0, fontSize: "0.75rem", color: "#8d8d8d" }}>{cls.grade_name}</p>
        </div>
        {hasSession ? (
          isMarked ? (
            <CheckmarkFilled size={18} style={{ fill: "#24a148", flexShrink: 0 }} />
          ) : (
            <WarningFilled size={18} style={{ fill: "#f1c21b", flexShrink: 0 }} />
          )
        ) : (
          <EventSchedule size={18} style={{ fill: "#c6c6c6", flexShrink: 0 }} />
        )}
      </div>

      {hasSession ? (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", marginBottom: "0.35rem" }}>
            <span style={{ color: "#525252" }}>{isMarked ? "Marked today" : "Pending today"}</span>
            <span style={{ fontWeight: 600, color: "#161616" }}>
              {session.marked_count} / {session.enrolled_count}
            </span>
          </div>
          <div style={{ height: "5px", background: "#e0e0e0", borderRadius: "3px" }}>
            <div
              style={{
                width: `${session.enrolled_count > 0 ? Math.round((session.marked_count / session.enrolled_count) * 100) : 0}%`,
                height: "100%",
                background: isMarked ? "#24a148" : "#f1c21b",
                borderRadius: "3px",
              }}
            />
          </div>
        </>
      ) : (
        <p style={{ margin: 0, fontSize: "0.75rem", color: "#8d8d8d" }}>No session today</p>
      )}
    </Link>
  );
}

export default function AttendanceByClassSection({
  classes,
  loading,
  sessionByClassId,
}: {
  classes: ClassWithDetails[] | undefined;
  loading: boolean;
  sessionByClassId: Map<string, DailySession>;
}) {
  return (
    <div className="os-section">
      <div className="os-section__header">
        <h2 className="os-section__title">Attendance by Class</h2>
        <Link to="/attendance" style={{ fontSize: "0.75rem", color: ACCENT, textDecoration: "none" }}>
          Manage →
        </Link>
      </div>
      {loading ? (
        <div
          style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "1rem", padding: "1.25rem 1.5rem" }}
        >
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} style={{ border: "1px solid #e0e0e0", padding: "1rem 1.125rem" }}>
              <SkeletonText width="70%" />
              <SkeletonText width="40%" />
            </div>
          ))}
        </div>
      ) : !classes || classes.length === 0 ? (
        <EmptyState
          title="No classes yet"
          description="Add a class to start taking attendance."
          action={
            <Link to="/classes/new" style={{ fontSize: "0.8125rem", color: ACCENT, fontWeight: 500 }}>
              Add a class →
            </Link>
          }
        />
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
            gap: "1rem",
            padding: "1.25rem 1.5rem",
          }}
        >
          {classes.map((c) => (
            <ClassAttendanceBox key={c.id} cls={c} session={sessionByClassId.get(c.id)} />
          ))}
        </div>
      )}
    </div>
  );
}
