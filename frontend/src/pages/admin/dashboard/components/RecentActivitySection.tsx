import { Link } from "react-router";
import { UserFollow } from "@carbon/icons-react";
import { Tag, SkeletonText } from "@carbon/react";
import EmptyState from "../../../../components/common/EmptyState";
import { ACCENT } from "../constants";

export type RecentActivityItem = {
  key: string;
  text: string;
  sub: string;
  time: string;
  path: string;
  kind: "student" | "teacher";
};

export default function RecentActivitySection({
  items,
  loading,
}: {
  items: RecentActivityItem[];
  loading: boolean;
}) {
  return (
    <div className="os-section">
      <div className="os-section__header">
        <h2 className="os-section__title">Recent Activity</h2>
        <Link to="/students" style={{ fontSize: "0.75rem", color: ACCENT, textDecoration: "none" }}>
          View all →
        </Link>
      </div>
      {loading ? (
        <div style={{ padding: "1.25rem 1.5rem" }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} style={{ marginBottom: "0.75rem" }}>
              <SkeletonText width="60%" />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          title="Nothing here yet"
          description="Enrol students and add teachers to see recent activity."
          action={
            <Link to="/students/new" style={{ fontSize: "0.8125rem", color: ACCENT, fontWeight: 500 }}>
              Enrol a student →
            </Link>
          }
        />
      ) : (
        <div>
          {items.map((item, i) => (
            <Link
              key={item.key}
              to={item.path}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "0.875rem",
                padding: "0.875rem 1.5rem",
                borderBottom: i < items.length - 1 ? "1px solid #f4f4f4" : "none",
                textDecoration: "none",
              }}
            >
              <div style={{ marginTop: "2px", flexShrink: 0 }}>
                <UserFollow size={16} style={{ fill: item.kind === "teacher" ? "#8a3ffc" : ACCENT }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: "0 0 0.15rem", fontSize: "0.875rem", fontWeight: 500, color: "#161616" }}>
                  {item.text}
                </p>
                {item.sub && <p style={{ margin: 0, fontSize: "0.75rem", color: "#525252" }}>{item.sub}</p>}
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.25rem", flexShrink: 0 }}>
                <Tag type={item.kind === "teacher" ? "purple" : "blue"} size="sm">
                  {item.kind === "teacher" ? "Teacher" : "Student"}
                </Tag>
                <span style={{ fontSize: "0.6875rem", color: "#8d8d8d" }}>
                  {new Date(item.time).toLocaleDateString("en-LK", { month: "short", day: "numeric" })}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
