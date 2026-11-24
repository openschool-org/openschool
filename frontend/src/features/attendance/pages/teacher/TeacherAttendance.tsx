import { useState } from "react";
import { Link } from "react-router";
import { Alert } from "antd";
import { useQueries } from "@tanstack/react-query";
import { CalendarOutlined, CheckCircleOutlined, ClockCircleOutlined } from "@ant-design/icons";
import { useMyClasses } from "@/features/teachers/queries/useTeachers";
import { classSessionsOptions } from "@/features/attendance/queries/useAttendance";
import StartSessionButton from "@/features/attendance/components/StartSessionButton";
import SessionCountCell from "@/features/attendance/components/SessionCountCell";
import SessionStateBadge from "@/features/attendance/components/SessionStateBadge";
import StatCard from "@/features/reports/components/dashboard/StatCard";
import DataGrid from "@/shared/ui/DataGrid";
import EmptyState from "@/shared/ui/EmptyState";
import LoadingSpinner from "@/shared/ui/LoadingSpinner";
import ErrorMessage from "@/shared/ui/ErrorMessage";
import { formatDayMonthYear, formatLongDate, todayISODate } from "@/shared/lib/date";
import FilterBar from "@/shared/ui/FilterBar";
import SectionCard from "@/shared/ui/SectionCard";
import { classLabel } from "@/shared/lib/classLabel";
import PageHeader from "@/shared/ui/PageHeader";

export default function TeacherAttendance() {
  const { classes: myClasses, isLoading, isError, refetch } = useMyClasses();
  const [query, setQuery] = useState("");

  const classIds = myClasses.map((c) => c.class_id);
  const sessionQueries = useQueries({ queries: classIds.map((id) => classSessionsOptions(id)) });

  const today = todayISODate();
  const todayClassIds = new Set(classIds.filter((_id, i) => (sessionQueries[i]?.data ?? []).some((s) => s.date === today)));

  // Only the class teacher takes attendance; other classes are listed to view.
  const formClasses = myClasses.filter((c) => c.isFormTeacher);
  const pendingToday = formClasses.filter((c) => !todayClassIds.has(c.class_id));

  const allSessions = classIds
    .flatMap((id, i) => {
      const cls = myClasses.find((c) => c.class_id === id);
      return (sessionQueries[i]?.data ?? []).map((s) => ({ session: s, className: cls?.class_name ?? "" }));
    })
    .sort((a, b) => b.session.date.localeCompare(a.session.date));

  const visible = allSessions.filter(
    ({ className, session }) =>
      [className, session.date, formatLongDate(session.date)].join(" ").toLowerCase().includes(query.toLowerCase())
  );

  if (isLoading) return <LoadingSpinner />;
  if (isError) {
    return (
      <div className="os-page">
        <ErrorMessage message="Failed to load your classes" onRetry={refetch} />
      </div>
    );
  }

  return (
    <div className="os-page">
      <PageHeader title="Class attendance" subtitle="Take attendance for the class you lead, and view it for the classes you teach." />

      {pendingToday.length > 0 && (
        <Alert
          type="warning"
          showIcon
          className="os-mb-6"
          title={`${pendingToday.length} ${pendingToday.length > 1 ? "classes" : "class"} not marked today`}
          description="Start today's session for a class."
          action={
            <div className="os-flex os-gap-2 os-wrap">
              {pendingToday.map((c) => (
                <StartSessionButton key={c.class_id} classId={c.class_id} size="small">{classLabel(c.grade_name, c.class_name)}</StartSessionButton>
              ))}
            </div>
          }
        />
      )}

      <div className="os-stat-grid os-stat-grid--three">
        <StatCard label="Total sessions" value={allSessions.length} loading={false} Icon={CalendarOutlined} />
        <StatCard label="Marked today" value={formClasses.filter((c) => todayClassIds.has(c.class_id)).length} meta={formClasses.length ? `of ${formClasses.length} ${formClasses.length === 1 ? "class" : "classes"} you lead` : "You are not a class teacher"} loading={false} Icon={CheckCircleOutlined} />
        <StatCard
          label="Pending today"
          value={pendingToday.length}
          meta={pendingToday.length ? "Start the session above" : "All classes marked"}
          loading={false}
          Icon={ClockCircleOutlined}
        />
      </div>

      <SectionCard title="Sessions" meta={<span className="os-text-sm os-c-tertiary">{allSessions.length} recorded</span>} flush>
        <div className="os-section__body">
          <FilterBar search={{ value: query, onChange: setQuery, placeholder: "Search by class or date" }} />
        </div>
        {visible.length === 0 ? (
          <EmptyState title="No sessions found" description="Sessions you record will appear here." />
        ) : (
          <DataGrid
            rows={visible}
            getRowId={(r) => r.session.id}
            columns={[
              { key: "date", header: "Date", render: (r) => formatDayMonthYear(r.session.date) },
              { key: "class", header: "Class", render: (r) => r.className },
              { key: "present", header: "Present", render: (r) => <SessionCountCell count={r.session.present_count} /> },
              { key: "absent", header: "Absent", render: (r) => <SessionCountCell count={r.session.absent_count} /> },
            { key: "late", header: "Late", render: (r) => <SessionCountCell count={r.session.late_count} /> },
              { key: "status", header: "Status", render: () => <SessionStateBadge state="marked" /> },
              { key: "action", header: "Action", align: "end", render: (r) => <Link to={`/attendance/sessions/${r.session.id}/mark`} className="os-c-tertiary os-no-underline os-text-sm">View</Link> },
            ]}
          />
        )}
      </SectionCard>
    </div>
  );
}
