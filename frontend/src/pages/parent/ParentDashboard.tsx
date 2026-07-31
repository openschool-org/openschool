import { Link } from "react-router";
import { ChevronRight } from "@carbon/icons-react";
import { useMyChildren } from "../../queries/useParent";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import ErrorMessage from "../../components/common/ErrorMessage";
import EmptyState from "../../components/common/EmptyState";

export default function ParentDashboard() {
  const { data: children, isLoading, isError, refetch } = useMyChildren();

  if (isLoading) return <LoadingSpinner />;
  if (isError) {
    return (
      <div style={{ padding: "2rem" }}>
        <ErrorMessage message="Failed to load your children" onRetry={refetch} />
      </div>
    );
  }

  return (
    <div className="os-page">
      <div className="os-page__header">
        <div className="os-page__header-left">
          <h1 className="os-page__title">My Children</h1>
          <p className="os-page__subtitle">
            Select a child to see their attendance, marks, and class details.
          </p>
        </div>
      </div>

      {children && children.length === 0 && (
        <EmptyState
          title="No children linked yet"
          description="Your school administrator hasn't linked any students to your account. Contact them if this looks wrong."
        />
      )}

      {children && children.length > 0 && (
        <div className="os-quick-grid">
          {children.map((c) => (
            <Link
              key={c.id}
              to={`/p/children/${c.id}`}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.875rem",
                padding: "1.25rem",
                background: "#ffffff",
                border: "1px solid #e0e0e0",
                textDecoration: "none",
                transition: "border-color 0.15s ease",
              }}
            >
              <div
                className="os-profile__avatar"
                style={{ width: "2.75rem", height: "2.75rem", fontSize: "0.9rem" }}
              >
                {c.full_name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: "0 0 0.2rem", fontWeight: 600, fontSize: "0.9375rem", color: "#161616" }}>
                  {c.full_name}
                </p>
                <p style={{ margin: 0, fontSize: "0.8125rem", color: "#525252" }}>
                  {c.index_number}
                  {c.class_name ? ` · ${c.class_name}` : ""}
                  {c.grade_name ? ` · ${c.grade_name}` : ""}
                </p>
              </div>
              <ChevronRight size={18} style={{ fill: "#8d8d8d", flexShrink: 0 }} />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
