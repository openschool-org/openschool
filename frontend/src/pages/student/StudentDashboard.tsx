// This file renders the StudentDashboard page, presenting the student's profile information, house association, and academic metadata.

import { Tag } from "@carbon/react";
import { useMyStudentProfile } from "../../queries/useStudentSelf";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import ErrorMessage from "../../components/common/ErrorMessage";

export default function StudentDashboard() {
  const { data: profile, isLoading, isError, refetch } = useMyStudentProfile();

  if (isLoading) return <LoadingSpinner />;
  if (isError || !profile) {
    return (
      <div style={{ padding: "2rem" }}>
        <ErrorMessage message="Failed to load your profile" onRetry={refetch} />
      </div>
    );
  }

  return (
    <div style={{ background: "#f4f4f4", minHeight: "calc(100vh - 3rem)" }}>
      <div className="os-profile__banner">
        <div className="os-profile__avatar">
          {profile.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
        </div>
        <div style={{ flex: 1 }}>
          <p className="os-profile__name">{profile.full_name}</p>
          <p className="os-profile__meta">
            {profile.index_number}
            {profile.class_name ? ` · ${profile.class_name}` : ""}
            {profile.grade_name ? ` · ${profile.grade_name}` : ""}
          </p>
        </div>
        {profile.house_name && (
          <div className="os-profile__actions">
            <Tag type="blue" size="sm">
              {profile.house_name} House
            </Tag>
          </div>
        )}
      </div>

      <div style={{ padding: "1.5rem 2rem" }}>
        <div className="os-section">
          <div className="os-section__header">
            <h2 className="os-section__title">Student Details</h2>
          </div>
          <div className="os-section__body" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "1rem" }}>
            <div className="os-kv-item" style={{ border: "1px solid #e0e0e0", background: "#ffffff", padding: "1rem" }}>
              <p className="os-kv-item__label">Full Name</p>
              <p className="os-kv-item__value">{profile.full_name}</p>
            </div>
            <div className="os-kv-item" style={{ border: "1px solid #e0e0e0", background: "#ffffff", padding: "1rem" }}>
              <p className="os-kv-item__label">Index Number</p>
              <p className="os-kv-item__value">{profile.index_number}</p>
            </div>
            <div className="os-kv-item" style={{ border: "1px solid #e0e0e0", background: "#ffffff", padding: "1rem" }}>
              <p className="os-kv-item__label">Class</p>
              <p className="os-kv-item__value">{profile.class_name || "—"}</p>
            </div>
            <div className="os-kv-item" style={{ border: "1px solid #e0e0e0", background: "#ffffff", padding: "1rem" }}>
              <p className="os-kv-item__label">Grade</p>
              <p className="os-kv-item__value">{profile.grade_name || "—"}</p>
            </div>
            <div className="os-kv-item" style={{ border: "1px solid #e0e0e0", background: "#ffffff", padding: "1rem" }}>
              <p className="os-kv-item__label">House</p>
              <p className="os-kv-item__value">{profile.house_name || "—"}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
