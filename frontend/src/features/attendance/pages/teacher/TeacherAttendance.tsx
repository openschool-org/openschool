import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { Tag } from "@carbon/react";
import { useQueries } from "@tanstack/react-query";
import { EventSchedule, Search, Time } from "@carbon/icons-react";
import { useMyClasses } from "@/features/teachers/queries/useTeachers";
import { useCreateSession, classSessionsOptions } from "@/features/attendance/queries/useAttendance";
import SessionCountCell from "@/features/attendance/components/SessionCountCell";
import DataGrid from "@/shared/ui/DataGrid";
import EmptyState from "@/shared/ui/EmptyState";
import LoadingSpinner from "@/shared/ui/LoadingSpinner";
import ErrorMessage from "@/shared/ui/ErrorMessage";
import { todayISODate } from "@/shared/lib/date";

function PendingClassAction({ classId, className, gradeName }: { classId: string; className: string; gradeName: string }) {
  const navigate = useNavigate();
  const createSession = useCreateSession();

  const handleClick = () => {
    createSession.mutate(
      { class_id: classId, date: todayISODate() },
      { onSuccess: (session) => navigate(`/attendance/sessions/${session.id}/mark`) }
    );
  };

  return (
    <button
      onClick={handleClick}
      disabled={createSession.isPending} className="os-py-2 os-px-4 os-bg-accent os-c-layer os-border-none os-pointer os-text-sm os-fw-500 os-nowrap os-flex os-items-center os-gap-1h"
    >
      <EventSchedule size={14} /> {createSession.isPending ? "Starting…" : `${gradeName} - ${className}`}
    </button>
  );
}

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
      <div className="os-page__header">
        <div className="os-page__header-left">
          <h1 className="os-page__title">Attendance</h1>
          <p className="os-page__subtitle">Every session you've recorded, across your classes</p>
        </div>
      </div>

      {pendingToday.length > 0 && (
        <div className="os-bg-status-late os-border-warning os-py-3h os-px-5 os-mb-6 os-flex os-items-center os-gap-4 os-wrap">
          <Time size={18} className="os-fill-warning os-shrink-0" />
          <div className="os-flex-1">
            <p className="os-mt-0 os-mx-0 os-mb-h os-fw-600 os-text-md os-c-warning-text">
              {pendingToday.length} class{pendingToday.length > 1 ? "es" : ""} not marked today
            </p>
            <p className="os-m-0 os-text-xs os-c-warning-text">Start today's session for a class.</p>
          </div>
          {pendingToday.map((c) => (
            <PendingClassAction key={c.class_id} classId={c.class_id} className={c.class_name} gradeName={c.grade_name} />
          ))}
        </div>
      )}

      <div className="os-grid os-grid-cols-3 os-gap-4 os-mb-6">
        {[
          { label: "Total sessions", value: allSessions.length, borderColor: "var(--os-accent)", valueColor: "var(--os-text-primary)" },
          { label: "Marked today", value: todayClassIds.size, borderColor: "var(--os-success)", valueColor: "var(--os-success)" },
          {
            label: "Pending today",
            value: pendingToday.length,
            borderColor: pendingToday.length > 0 ? "var(--os-danger)" : "var(--os-text-tertiary)",
            valueColor: pendingToday.length > 0 ? "var(--os-danger)" : "var(--os-text-tertiary)",
          },
        ].map(({ label, value, borderColor, valueColor }) => (
          <div key={label} className="os-stat-card" style={{ borderTop: `3px solid ${borderColor}` }}>
            <p className="os-stat-card__label">{label}</p>
            <p className="os-stat-card__value" style={{ color: valueColor }}>{value}</p>
          </div>
        ))}
      </div>

      <div className="os-section">
        <div className="os-toolbar">
          <div className="os-search os-max-w-22">
            <Search size={16} className="os-search__icon" />
            <input
              className="os-search__input"
              placeholder="Search by class or date…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
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
              { key: "present", header: "Present", render: (r) => <SessionCountCell sessionId={r.session.id} status="present" /> },
              { key: "absent", header: "Absent", render: (r) => <SessionCountCell sessionId={r.session.id} status="absent" /> },
              { key: "status", header: "Status", render: () => <Tag type="blue" size="sm">Marked</Tag> },
              { key: "action", header: "Action", align: "end", render: (r) => <Link to={`/attendance/sessions/${r.session.id}/mark`} className="os-c-tertiary os-no-underline os-text-sm">View</Link> },
            ]}
          />
        )}
      </div>
    </div>
  );
}
