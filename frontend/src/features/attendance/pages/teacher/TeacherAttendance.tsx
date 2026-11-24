import { useState } from "react";
import { Link } from "react-router";
import { Input } from "antd";
import { useQueries } from "@tanstack/react-query";
import { CalendarOutlined, CheckCircleOutlined, ClockCircleOutlined, SearchOutlined } from "@ant-design/icons";
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
import { todayISODate } from "@/shared/lib/date";
import { classLabel } from "@/shared/lib/classLabel";
import PageHeader from "@/shared/ui/PageHeader";

export default function TeacherAttendance() {
  const { classes: myClasses, isLoading, isError, refetch } = useMyClasses();
  const [query, setQuery] = useState("");

  const classIds = myClasses.map((c) => c.class_id);
  const sessionQueries = useQueries({ queries: classIds.map((id) => classSessionsOptions(id)) });

  const today = todayISODate();
  const todayClassIds = new Set(classIds.filter((_id, i) => (sessionQueries[i]?.data ?? []).some((s) => s.date === today)));

  const pendingToday = myClasses.filter((c) => !todayClassIds.has(c.class_id));

  const allSessions = classIds
    .flatMap((id, i) => {
      const cls = myClasses.find((c) => c.class_id === id);
      return (sessionQueries[i]?.data ?? []).map((s) => ({ session: s, className: cls?.class_name ?? "" }));
    })
    .sort((a, b) => b.session.date.localeCompare(a.session.date));

  const visible = allSessions.filter(
    ({ className, session }) =>
      className.toLowerCase().includes(query.toLowerCase()) || session.date.includes(query)
  );

  if (isLoading) return <LoadingSpinner />;
  if (isError) {
    return (
      <div className="os-p-8">
        <ErrorMessage message="Failed to load your classes" onRetry={refetch} />
      </div>
    );
  }

  return (
    <div className="os-page">
      <PageHeader title="Attendance" subtitle="Every session you've recorded, across your classes" />

      {pendingToday.length > 0 && (
        <div className="os-bg-status-late os-border-warning os-py-3h os-px-5 os-mb-6 os-flex os-items-center os-gap-4 os-wrap">
          <ClockCircleOutlined className="os-c-warning os-shrink-0 os-text-lg" />
          <div className="os-flex-1">
            <p className="os-mt-0 os-mx-0 os-mb-h os-fw-600 os-text-md os-c-warning-text">
              {pendingToday.length} class{pendingToday.length > 1 ? "es" : ""} not marked today
            </p>
            <p className="os-m-0 os-text-xs os-c-warning-text">Start today's session for a class.</p>
          </div>
          {pendingToday.map((c) => (
            <StartSessionButton key={c.class_id} classId={c.class_id}>{classLabel(c.grade_name, c.class_name)}</StartSessionButton>
          ))}
        </div>
      )}

      <div className="os-stat-grid os-stat-grid--three">
        <StatCard label="Total sessions" value={allSessions.length} loading={false} Icon={CalendarOutlined} />
        <StatCard label="Marked today" value={todayClassIds.size} meta={`of ${myClasses.length} classes`} loading={false} Icon={CheckCircleOutlined} />
        <StatCard
          label="Pending today"
          value={pendingToday.length}
          meta={pendingToday.length ? "Start the session above" : "All classes marked"}
          loading={false}
          Icon={ClockCircleOutlined}
        />
      </div>

      <div className="os-section">
        <div className="os-toolbar">
          <Input
            className="os-max-w-22"
            allowClear
            prefix={<SearchOutlined />}
            aria-label="Search sessions"
            placeholder="Search by class or date…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        {visible.length === 0 ? (
          <EmptyState title="No sessions found" description="Sessions you record will appear here." />
        ) : (
          <DataGrid
            rows={visible}
            getRowId={(r) => r.session.id}
            columns={[
              { key: "date", header: "Date", render: (r) => <span className="os-table__mono os-text-xs">{r.session.date}</span> },
              { key: "class", header: "Class", render: (r) => <span className="os-fw-600">{r.className}</span> },
              { key: "present", header: "Present", render: (r) => <SessionCountCell count={r.session.present_count} /> },
              { key: "absent", header: "Absent", render: (r) => <SessionCountCell count={r.session.absent_count} /> },
            { key: "late", header: "Late", render: (r) => <SessionCountCell count={r.session.late_count} /> },
              { key: "status", header: "Status", render: () => <SessionStateBadge state="marked" /> },
              { key: "action", header: "Action", align: "end", render: (r) => <Link to={`/attendance/sessions/${r.session.id}/mark`} className="os-c-tertiary os-no-underline os-text-sm">View</Link> },
            ]}
          />
        )}
      </div>
    </div>
  );
}
