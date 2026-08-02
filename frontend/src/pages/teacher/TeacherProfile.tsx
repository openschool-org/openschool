import { useQueries } from "@tanstack/react-query";
import { Tag } from "@carbon/react";
import { Book } from "@carbon/icons-react";
import { useMyTeacherProfile, useTeacherSubjects, useMyClasses } from "../../queries/useTeachers";
import { classStudentsKey } from "../../queries/useClasses";
import { classSessionsKey } from "../../queries/useAttendance";
import { attendanceApi } from "../../services/attendance";
import { studentApi } from "../../services/student";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import ErrorMessage from "../../components/common/ErrorMessage";

const ACCENT = "#406AAF";

export default function TeacherProfile() {
  const { data: profile, isLoading, isError, refetch } = useMyTeacherProfile();
  const { data: subjects } = useTeacherSubjects(profile?.id ?? "");
  const { classes: myClasses } = useMyClasses();

  const classIds = myClasses.map((c) => c.class_id);
  const studentQueries = useQueries({
    queries: classIds.map((id) => ({
      queryKey: classStudentsKey(id),
      queryFn: () => studentApi.listByClass(id),
      enabled: !!id,
    })),
  });
  const sessionQueries = useQueries({
    queries: classIds.map((id) => ({
      queryKey: classSessionsKey(id),
      queryFn: () => attendanceApi.listSessionsByClass(id),
      enabled: !!id,
    })),
  });
  const studentsTaught = new Set(studentQueries.flatMap((q) => (q.data ?? []).map((s) => s.id))).size;
  const sessionsTaken = sessionQueries.reduce((sum, q) => sum + (q.data?.length ?? 0), 0);

  if (isLoading) return <LoadingSpinner />;
  if (isError || !profile) {
    return (
      <div style={{ padding: "2rem" }}>
        <ErrorMessage message="Failed to load your profile" onRetry={refetch} />
      </div>
    );
  }

  const initials = profile.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div style={{ background: "#f4f4f4", minHeight: "calc(100vh - 3rem)" }}>
      <div className="os-profile__banner">
        <div className="os-profile__avatar">{initials}</div>
        <div style={{ flex: 1 }}>
          <p className="os-profile__name">{profile.title ? `${profile.title} ` : ""}{profile.full_name}</p>
          <p className="os-profile__meta">{profile.employee_number}</p>
        </div>
        <div className="os-profile__actions">
          <Tag type={profile.is_active ? "green" : "gray"} size="sm">{profile.is_active ? "Active" : "Inactive"}</Tag>
        </div>
      </div>

      <div style={{ padding: "1.5rem 2rem" }}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "1.5rem", alignItems: "start" }}>
          {/* Main */}
          <div>
            <div className="os-section">
              <div className="os-section__header"><h2 className="os-section__title">Personal Details</h2></div>
              <div className="os-kv-grid">
                {[
                  ["Full Name", profile.full_name],
                  ["Title", profile.title ?? "—"],
                  ["Gender", profile.gender ? profile.gender[0].toUpperCase() + profile.gender.slice(1) : "—"],
                  ["Phone", profile.phone ?? "—"],
                  ["Employee Number", profile.employee_number],
                  ["Joined Date", profile.joined_date ?? "—"],
                ].map(([label, value]) => (
                  <div key={label} className="os-kv-item">
                    <p className="os-kv-item__label">{label}</p>
                    <p className="os-kv-item__value">{value}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="os-section">
              <div className="os-section__header"><h2 className="os-section__title">Subjects</h2></div>
              <div className="os-section__body" style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                {!subjects || subjects.length === 0 ? (
                  <p style={{ color: "#8d8d8d", fontSize: "0.8125rem" }}>No subjects assigned yet.</p>
                ) : (
                  subjects.map((s) => (
                    <div key={s.id} style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.5rem 0.875rem", border: "1px solid #e0e0e0", background: "#f4f4f4" }}>
                      <Book size={14} style={{ fill: ACCENT }} />
                      <span style={{ fontSize: "0.875rem", fontWeight: 500 }}>{s.name}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div>
            <div className="os-section">
              <div className="os-section__header"><h2 className="os-section__title">Quick Info</h2></div>
              <div className="os-section__body" style={{ padding: "0.75rem 1.5rem" }}>
                {[
                  ["Employee ID", profile.employee_number],
                  ["Status", profile.is_active ? "Active" : "Inactive"],
                  ["Subjects", subjects?.length ?? 0],
                  ["Classes", myClasses.length],
                  ["Joined", profile.joined_date ?? "—"],
                ].map(([label, value]) => (
                  <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "0.5rem 0", borderBottom: "1px solid #f4f4f4", fontSize: "0.8125rem" }}>
                    <span style={{ color: "#525252" }}>{label}</span>
                    <span style={{ fontWeight: 500, color: "#161616" }}>{value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="os-section">
              <div className="os-section__header"><h2 className="os-section__title">This Year</h2></div>
              <div className="os-section__body" style={{ padding: "0.75rem 1.5rem" }}>
                {[
                  ["Sessions Taken", sessionsTaken],
                  ["Students Taught", studentsTaught],
                ].map(([label, value]) => (
                  <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "0.5rem 0", borderBottom: "1px solid #f4f4f4", fontSize: "0.8125rem" }}>
                    <span style={{ color: "#525252" }}>{label}</span>
                    <span style={{ fontWeight: 600, color: ACCENT }}>{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
