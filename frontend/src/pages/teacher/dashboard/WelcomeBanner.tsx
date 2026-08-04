import { Time } from "@carbon/icons-react";
import RoleBadge from "./RoleBadge";
import type { PositionRankLabel } from "../../../services/position";
import type { Teacher } from "../../../services/teacher";

const ACCENT = "#406AAF";

export default function WelcomeBanner({
  profile,
  subjectSummary,
  currentYearLabel,
  currentTermName,
  pendingCount,
  rankLabel,
}: {
  profile: Teacher;
  subjectSummary: string;
  currentYearLabel?: string;
  currentTermName?: string;
  pendingCount: number;
  rankLabel: PositionRankLabel;
}) {
  const initials = profile.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div
      style={{
        background: "#ffffff",
        border: "1px solid #e0e0e0",
        borderTop: `3px solid ${ACCENT}`,
        padding: "1.25rem 1.5rem",
        marginBottom: "1.5rem",
        display: "flex",
        alignItems: "center",
        gap: "1rem",
        flexWrap: "wrap",
      }}
    >
      <div
        style={{
          width: "2.75rem",
          height: "2.75rem",
          borderRadius: "50%",
          background: ACCENT,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#fff",
          fontWeight: 700,
          fontSize: "1rem",
          flexShrink: 0,
        }}
      >
        {initials}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.15rem", flexWrap: "wrap" }}>
          <p style={{ margin: 0, fontSize: "1.1rem", fontWeight: 500, color: "#161616" }}>
            {greeting}, {profile.title ? `${profile.title} ` : ""}{profile.full_name}
          </p>
          <RoleBadge rankLabel={rankLabel} />
        </div>
        <p style={{ margin: 0, fontSize: "0.8125rem", color: "#525252" }}>
          {subjectSummary} · {profile.employee_number}
          {currentYearLabel ? ` · ${currentYearLabel}` : ""}
          {currentTermName ? ` ${currentTermName}` : ""}
        </p>
      </div>
      {pendingCount > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.5rem 0.875rem", background: "#fff8e1", border: "1px solid #f1c21b", fontSize: "0.8125rem", color: "#6b4c00" }}>
          <Time size={14} style={{ fill: "#f1c21b" }} />
          {pendingCount} session{pendingCount > 1 ? "s" : ""} pending today
        </div>
      )}
    </div>
  );
}
