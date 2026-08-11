import { useMemo } from "react";
import { Link } from "react-router";
import {
  UserMultiple,
  Education,
  Building,
  Book,
  UserFollow,
  WarningFilled,
  CheckmarkFilled,
  EventSchedule,
} from "@carbon/icons-react";
import { Tag, SkeletonText } from "@carbon/react";
import { useSchool } from "../../../queries/useSchool";
import { useStudents } from "../../../queries/useStudents";
import { useTeachers } from "../../../queries/useTeachers";
import { useCurrentClasses } from "../../../queries/useClasses";
import { useSubjects } from "../../../queries/useSubjects";
import { useAcademicYears } from "../../../queries/useAcademicYears";
import { useDailySessions } from "../../../queries/useAttendance";
import type { ClassWithDetails } from "../../../services/class";
import type { DailySession } from "../../../services/attendance";
import EmptyState from "../../../components/common/EmptyState";
import AnalyticsSection from "./AnalyticsSection";
import { todayISODate } from "../../../lib/date";

const ACCENT = "#406AAF";

function StatCard({
  label,
  value,
  loading,
  Icon,
  path,
}: {
  label: string;
  value: number;
  loading: boolean;
  Icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>;
  path: string;
}) {
  return (
    <Link to={path} style={{ textDecoration: "none" }}>
      <div className="os-stat-card" style={{ cursor: "pointer" }}>
        <p className="os-stat-card__label">
          <Icon size={14} style={{ fill: ACCENT }} />
          {label}
        </p>
        {loading ? <SkeletonText width="40%" heading /> : <p className="os-stat-card__value">{value}</p>}
      </div>
    </Link>
  );
}

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

export default function Dashboard() {
  const { data: school } = useSchool();
  const { data: students, isLoading: studentsLoading } = useStudents();
  const { data: teachers, isLoading: teachersLoading } = useTeachers();
  const { data: classes, isLoading: classesLoading } = useCurrentClasses();
  const { data: subjects, isLoading: subjectsLoading } = useSubjects();
  const { data: years, isLoading: yearsLoading } = useAcademicYears();
  const { data: todaySessions, isLoading: sessionsLoading } = useDailySessions(todayISODate());

  const title = school?.name ? `${school.name} - Admin Dashboard` : "Admin Dashboard";
  const currentYear = years?.find((y) => y.is_current) ?? null;

  const marked = (todaySessions ?? []).filter((s) => s.marked_count > 0).length;
  const pending = (todaySessions ?? []).length - marked;
  const markedPct = todaySessions && todaySessions.length > 0 ? Math.round((marked / todaySessions.length) * 100) : 0;

  const recentActivity = useMemo(() => {
    type Item = { key: string; text: string; sub: string; time: string; path: string; kind: "student" | "teacher" };
    const items: Item[] = [];
    for (const s of students ?? []) {
      if (!s.created_at) continue;
      items.push({
        key: `student-${s.id}`,
        text: `${s.full_name} enrolled`,
        sub: [s.grade_name, s.class_name, s.index_number].filter(Boolean).join(" · "),
        time: s.created_at,
        path: `/students/${s.id}`,
        kind: "student",
      });
    }
    for (const t of teachers ?? []) {
      if (!t.created_at) continue;
      items.push({
        key: `teacher-${t.id}`,
        text: `${t.full_name} added as a teacher`,
        sub: t.employee_number,
        time: t.created_at,
        path: `/teachers/${t.id}`,
        kind: "teacher",
      });
    }
    return items.sort((a, b) => b.time.localeCompare(a.time)).slice(0, 6);
  }, [students, teachers]);

  const dashboardLoading = studentsLoading || teachersLoading;

  const sessionByClassId = useMemo(() => {
    const map = new Map<string, DailySession>();
    for (const s of todaySessions ?? []) map.set(s.class_id, s);
    return map;
  }, [todaySessions]);

  const classAttendanceLoading = classesLoading || sessionsLoading;

  return (
    <div className="os-page">
      <div className="os-page__header">
        <div className="os-page__header-left">
          <h1 className="os-page__title">{title}</h1>
        </div>
        {school?.logo_url && (
          <img
            src={school.logo_url}
            alt={school.name ?? "School logo"}
            style={{ width: "3rem", height: "3rem", objectFit: "contain", flexShrink: 0 }}
          />
        )}
      </div>

      {/* Stat cards */}
      <div className="os-stat-grid">
        <StatCard label="Total Students" value={students?.length ?? 0} loading={studentsLoading} Icon={UserMultiple} path="/students" />
        <StatCard label="Teachers" value={teachers?.length ?? 0} loading={teachersLoading} Icon={Education} path="/teachers" />
        <StatCard label="Classes" value={classes?.length ?? 0} loading={classesLoading} Icon={Building} path="/classes" />
        <StatCard label="Subjects" value={subjects?.length ?? 0} loading={subjectsLoading} Icon={Book} path="/subjects" />
      </div>

      {/* Class-wise attendance */}
      <div className="os-section">
        <div className="os-section__header">
          <h2 className="os-section__title">Attendance by Class</h2>
          <Link to="/attendance" style={{ fontSize: "0.75rem", color: ACCENT, textDecoration: "none" }}>
            Manage →
          </Link>
        </div>
        {classAttendanceLoading ? (
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

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "1.5rem", alignItems: "start" }}>
        <div>
          {/* Recent Activity */}
          <div className="os-section">
            <div className="os-section__header">
              <h2 className="os-section__title">Recent Activity</h2>
              <Link to="/students" style={{ fontSize: "0.75rem", color: ACCENT, textDecoration: "none" }}>
                View all →
              </Link>
            </div>
            {dashboardLoading ? (
              <div style={{ padding: "1.25rem 1.5rem" }}>
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} style={{ marginBottom: "0.75rem" }}>
                    <SkeletonText width="60%" />
                  </div>
                ))}
              </div>
            ) : recentActivity.length === 0 ? (
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
                {recentActivity.map((item, i) => (
                  <Link
                    key={item.key}
                    to={item.path}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "0.875rem",
                      padding: "0.875rem 1.5rem",
                      borderBottom: i < recentActivity.length - 1 ? "1px solid #f4f4f4" : "none",
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
        </div>

        {/* Right sidebar */}
        <div>
          {/* Today's Attendance progress */}
          <div className="os-section">
            <div className="os-section__header">
              <h2 className="os-section__title">Attendance Today</h2>
              <Link to="/attendance" style={{ fontSize: "0.75rem", color: ACCENT, textDecoration: "none" }}>
                Manage →
              </Link>
            </div>
            <div className="os-section__body" style={{ padding: "1rem 1.5rem" }}>
              {sessionsLoading ? (
                <SkeletonText width="70%" />
              ) : !todaySessions || todaySessions.length === 0 ? (
                <p style={{ margin: 0, fontSize: "0.8125rem", color: "#8d8d8d" }}>
                  No sessions have been created for today yet.
                </p>
              ) : (
                <>
                  <div style={{ marginBottom: "1rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", marginBottom: "0.35rem" }}>
                      <span style={{ color: "#525252" }}>Sessions marked</span>
                      <span style={{ fontWeight: 600, color: "#161616" }}>
                        {marked} / {todaySessions.length}
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

          {/* Academic year */}
          <div className="os-section">
            <div className="os-section__header">
              <h2 className="os-section__title">Academic Year</h2>
              <Link to="/academic-years" style={{ fontSize: "0.75rem", color: ACCENT, textDecoration: "none" }}>
                Manage →
              </Link>
            </div>
            <div className="os-section__body" style={{ padding: "1rem 1.5rem" }}>
              {yearsLoading ? (
                <SkeletonText width="60%" />
              ) : !currentYear ? (
                <p style={{ margin: 0, fontSize: "0.8125rem", color: "#8d8d8d" }}>
                  No academic year is marked current yet.
                </p>
              ) : (
                [
                  ["Current Year", currentYear.label],
                  [
                    "Period",
                    currentYear.start_date && currentYear.end_date
                      ? `${new Date(currentYear.start_date).toLocaleDateString("en-LK", { month: "short", year: "numeric" })} – ${new Date(currentYear.end_date).toLocaleDateString("en-LK", { month: "short", year: "numeric" })}`
                      : "-",
                  ],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    style={{ display: "flex", justifyContent: "space-between", padding: "0.4rem 0", borderBottom: "1px solid #f4f4f4", fontSize: "0.8125rem" }}
                  >
                    <span style={{ color: "#525252" }}>{label}</span>
                    <span style={{ fontWeight: 500, color: "#161616" }}>{value}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <AnalyticsSection />
    </div>
  );
}
