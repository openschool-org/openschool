import { useMemo, useState } from "react";
import { Link } from "react-router";
import { Button } from "@carbon/react";
import { Add } from "@carbon/icons-react";
import type { useClassSessions, useCreateSession, useDeleteSession } from "@/features/attendance/queries/useAttendance";
import type { AttendanceSession } from "@/features/attendance/api/attendance";
import LoadingSpinner from "@/shared/ui/LoadingSpinner";
import DataGrid from "@/shared/ui/DataGrid";
import EmptyState from "@/shared/ui/EmptyState";
import MutationErrorNotification from "@/shared/ui/MutationErrorNotification";
import DateField from "@/shared/ui/DateField";

interface Props {
  sessions: ReturnType<typeof useClassSessions>["data"];
  sessionsLoading: boolean;
  createSession: ReturnType<typeof useCreateSession>;
  deleteSession: ReturnType<typeof useDeleteSession>;
  onOpenNewSession: () => void;
  onRequestDeleteSession: (session: AttendanceSession) => void;
}

export default function AttendanceTab({
  sessions,
  sessionsLoading,
  createSession,
  deleteSession,
  onOpenNewSession,
  onRequestDeleteSession,
}: Props) {
  const [sessionDateFilter, setSessionDateFilter] = useState("");

  const sortedSessions = useMemo(
    () =>
      [...(sessions ?? [])]
        .filter((s) => !sessionDateFilter || s.date === sessionDateFilter)
        .sort((a, b) => b.date.localeCompare(a.date)),
    [sessions, sessionDateFilter],
  );

  return (
    <div className="os-section os-mt-4">
      <div className="os-section__header os-wrap os-row-gap-3">
        <h2 className="os-section__title">Attendance sessions</h2>
        <div className="os-flex os-items-center os-gap-3 os-wrap">
          <div className="os-session-date-filter os-shrink-0">
            <DateField value={sessionDateFilter} onChange={(ymd) => {
                setSessionDateFilter(ymd);
              }} id="session-date-filter" labelText="Filter by date" hideLabel placeholder="Filter by date" size="sm" />
          </div>
          {sessionDateFilter && (
            <Button
              kind="ghost"
              size="sm"
              onClick={() => setSessionDateFilter("")}
            >
              Clear
            </Button>
          )}
          <Button renderIcon={Add} kind="ghost" size="sm" onClick={onOpenNewSession}>
            New session
          </Button>
        </div>
      </div>

      <MutationErrorNotification
        isError={createSession.isError}
        error={createSession.error}
        title="Could not create session"
        fallback="A session may already exist for this class on this date."
        onClose={() => createSession.reset()} className="os-mt-0 os-mx-6 os-mb-4"
      />
      <MutationErrorNotification
        isError={deleteSession.isError}
        error={deleteSession.error}
        title="Could not delete session"
        fallback="Please try again."
        onClose={() => deleteSession.reset()} className="os-mt-0 os-mx-6 os-mb-4"
      />

      {sessionsLoading ? (
        <LoadingSpinner />
      ) : sortedSessions.length > 0 ? (
        <DataGrid
          rows={sortedSessions}
          getRowId={(s) => s.id}
          noHover
          pageSizes={[10, 20, 30]}
          columns={[
            { key: "date", header: "Date", render: (s) => <span className="os-table__mono">{s.date}</span> },
            {
              key: "actions",
              header: "Actions",
              align: "end",
              render: (s) => (
                <div className="os-grid__actions os-nowrap-flex">
                  <Button kind="ghost" size="sm" as={Link} to={`/attendance/sessions/${s.id}/mark`} className="os-c-accent os-nowrap">Mark / view</Button>
                  <Button kind="danger--ghost" size="sm" className="os-nowrap" onClick={() => onRequestDeleteSession(s)}>Delete</Button>
                </div>
              ),
            },
          ]}
        />
      ) : (
        <EmptyState
          title={sessionDateFilter ? "No sessions on this date" : "No sessions yet"}
          description={
            sessionDateFilter
              ? "Try a different date, or clear the filter."
              : "Create a session to start taking attendance for this class."
          }
          action={
            sessionDateFilter ? undefined : (
              <Button renderIcon={Add} kind="primary" onClick={onOpenNewSession}>
                New session
              </Button>
            )
          }
        />
      )}
    </div>
  );
}
