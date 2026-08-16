import { useMemo, useState } from "react";
import { Link } from "react-router";
import { Button, DatePicker, DatePickerInput, Pagination, InlineNotification } from "@carbon/react";
import { Add } from "@carbon/icons-react";
import type { useClassSessions, useCreateSession, useDeleteSession } from "../../../../queries/useAttendance";
import type { AttendanceSession } from "../../../../services/attendance";
import { getErrorMessage as apiError } from "../../../../lib/errorMessage";
import { toYmd } from "../../../../lib/date";
import LoadingSpinner from "../../../../components/common/LoadingSpinner";
import EmptyState from "../../../../components/common/EmptyState";

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
  const [sessionPage, setSessionPage] = useState(1);
  const [sessionPageSize, setSessionPageSize] = useState(10);

  const sortedSessions = useMemo(
    () =>
      [...(sessions ?? [])]
        .filter((s) => !sessionDateFilter || s.date === sessionDateFilter)
        .sort((a, b) => b.date.localeCompare(a.date)),
    [sessions, sessionDateFilter],
  );
  const currentSessionPage = Math.min(sessionPage, Math.max(1, Math.ceil(sortedSessions.length / sessionPageSize)));
  const pagedSessions = useMemo(
    () => sortedSessions.slice((currentSessionPage - 1) * sessionPageSize, currentSessionPage * sessionPageSize),
    [sortedSessions, currentSessionPage, sessionPageSize],
  );

  return (
    <div className="os-section" style={{ marginTop: "1rem" }}>
      <div className="os-section__header" style={{ flexWrap: "wrap", rowGap: "0.75rem" }}>
        <h2 className="os-section__title">Attendance Sessions</h2>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
          <div className="os-session-date-filter" style={{ flexShrink: 0 }}>
            <DatePicker
              datePickerType="single"
              dateFormat="Y-m-d"
              value={sessionDateFilter}
              onChange={(dates) => {
                setSessionDateFilter(dates[0] ? toYmd(dates[0]) : "");
                setSessionPage(1);
              }}
            >
              <DatePickerInput
                id="session-date-filter"
                labelText=""
                placeholder="Filter by date"
                size="sm"
              />
            </DatePicker>
          </div>
          {sessionDateFilter && (
            <Button
              kind="ghost"
              size="sm"
              onClick={() => {
                setSessionDateFilter("");
                setSessionPage(1);
              }}
            >
              Clear
            </Button>
          )}
          <Button renderIcon={Add} kind="ghost" size="sm" onClick={onOpenNewSession}>
            New Session
          </Button>
        </div>
      </div>

      {createSession.isError && (
        <InlineNotification
          kind="error"
          title="Could not create session"
          subtitle={apiError(
            createSession.error,
            "A session may already exist for this class on this date.",
          )}
          lowContrast
          onClose={() => createSession.reset()}
          style={{ maxWidth: "100%", margin: "0 1.5rem 1rem" }}
        />
      )}
      {deleteSession.isError && (
        <InlineNotification
          kind="error"
          title="Could not delete session"
          subtitle={apiError(deleteSession.error, "Please try again.")}
          lowContrast
          onClose={() => deleteSession.reset()}
          style={{ maxWidth: "100%", margin: "0 1.5rem 1rem" }}
        />
      )}

      {sessionsLoading ? (
        <LoadingSpinner />
      ) : sortedSessions.length > 0 ? (
        <>
          <table className="os-table os-table--no-hover">
            <thead>
              <tr>
                <th>Date</th>
                <th style={{ width: "13rem", textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pagedSessions.map((s) => (
                <tr key={s.id}>
                  <td className="os-table__mono">{s.date}</td>
                  <td>
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "nowrap",
                        gap: "0.25rem",
                        justifyContent: "flex-end",
                      }}
                    >
                      <Button
                        kind="ghost"
                        size="sm"
                        as={Link}
                        to={`/attendance/sessions/${s.id}/mark`}
                        style={{ color: "#406AAF", whiteSpace: "nowrap" }}
                      >
                        Mark / View
                      </Button>
                      <Button
                        kind="danger--ghost"
                        size="sm"
                        style={{ whiteSpace: "nowrap" }}
                        onClick={() => onRequestDeleteSession(s)}
                      >
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination
            totalItems={sortedSessions.length}
            page={currentSessionPage}
            pageSize={sessionPageSize}
            pageSizes={[10, 20, 30]}
            onChange={({ page, pageSize }) => {
              setSessionPage(page);
              setSessionPageSize(pageSize);
            }}
          />
        </>
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
                New Session
              </Button>
            )
          }
        />
      )}
    </div>
  );
}
