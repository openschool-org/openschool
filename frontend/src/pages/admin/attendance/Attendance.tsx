import { useState } from "react";
import { Link } from "react-router";
import { EventSchedule, CheckmarkFilled, WarningFilled } from "@carbon/icons-react";
import { Button, Tag, DatePicker, DatePickerInput, InlineNotification, SkeletonText } from "@carbon/react";
import { useDailySessions, useDeleteSession } from "../../../queries/useAttendance";
import { useRole } from "../../../hooks/useRole";
import type { DailySession } from "../../../services/attendance";
import { getErrorMessage } from "../../../lib/errorMessage";
import TableSkeleton from "../../../components/common/TableSkeleton";
import ErrorMessage from "../../../components/common/ErrorMessage";
import EmptyState from "../../../components/common/EmptyState";
import ConfirmDeleteModal from "../../../components/common/ConfirmDeleteModal";

const ATTENDANCE_TABLE_HEADERS = ["Class", "Grade", "Teacher", "Records", "Status", "Actions"];

function StatCardSkeleton() {
  return (
    <div className="os-stat-card">
      <div style={{ marginBottom: "0.5rem" }}>
        <SkeletonText width="60%" />
      </div>
      <SkeletonText width="30%" heading />
    </div>
  );
}

function toYmd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const TODAY_YMD = toYmd(new Date());

function displayDate(ymd: string) {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-LK", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function Attendance() {
  const [date, setDate] = useState(TODAY_YMD);
  const { data: sessions, isLoading, isError, refetch } = useDailySessions(date);
  const deleteSession = useDeleteSession();
  const { role } = useRole();
  const isAdmin = role === "admin";
  const [toDelete, setToDelete] = useState<DailySession | null>(null);

  const handleDelete = () => {
    if (!toDelete) return;
    deleteSession.mutate(toDelete.id, { onSettled: () => setToDelete(null) });
  };

  const marked = (sessions ?? []).filter((s) => s.marked_count > 0).length;
  const pending = (sessions ?? []).length - marked;
  const isToday = date === TODAY_YMD;

  return (
    <div className="os-page">
      <div className="os-page__header">
        <div className="os-page__header-left">
          <h1 className="os-page__title">Attendance</h1>
          <p className="os-page__subtitle">{displayDate(date)}</p>
        </div>
        <div style={{ minWidth: "12rem" }}>
          <DatePicker
            datePickerType="single"
            dateFormat="Y-m-d"
            value={date}
            onChange={(dates) => {
              if (dates[0]) setDate(toYmd(dates[0]));
            }}
          >
            <DatePickerInput id="attendance-date" labelText="" placeholder="YYYY-MM-DD" size="lg" />
          </DatePicker>
        </div>
      </div>

      {!isToday && (
        <div style={{ marginBottom: "1rem" }}>
          <Button kind="ghost" size="sm" onClick={() => setDate(TODAY_YMD)}>
            Jump to today
          </Button>
        </div>
      )}

      {isLoading ? (
        <>
          <div className="os-stat-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
            {Array.from({ length: 3 }).map((_, i) => (
              <StatCardSkeleton key={i} />
            ))}
          </div>
          <div className="os-section">
            <div className="os-section__header">
              <h2 className="os-section__title">Sessions</h2>
            </div>
            <TableSkeleton headers={ATTENDANCE_TABLE_HEADERS} />
          </div>
        </>
      ) : isError ? (
        <ErrorMessage message="Could not load sessions for this date." onRetry={refetch} />
      ) : (
        <>
          {/* Summary strip */}
          <div className="os-stat-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
            <div className="os-stat-card">
              <p className="os-stat-card__label">
                <EventSchedule size={14} style={{ fill: "#406AAF" }} /> Sessions
              </p>
              <p className="os-stat-card__value">{sessions?.length ?? 0}</p>
              <p className="os-stat-card__meta">Created for this date</p>
            </div>
            <div className="os-stat-card" style={{ borderTopColor: "#24a148" }}>
              <p className="os-stat-card__label">
                <CheckmarkFilled size={14} style={{ fill: "#24a148" }} /> Marked
              </p>
              <p className="os-stat-card__value">{marked}</p>
              <p className="os-stat-card__meta">At least one record</p>
            </div>
            <div className="os-stat-card" style={{ borderTopColor: "#f1c21b" }}>
              <p className="os-stat-card__label">
                <WarningFilled size={14} style={{ fill: "#f1c21b" }} /> Pending
              </p>
              <p className="os-stat-card__value">{pending}</p>
              <p className="os-stat-card__meta">No records yet</p>
            </div>
          </div>

          <div className="os-section">
            <div className="os-section__header">
              <h2 className="os-section__title">Sessions</h2>
            </div>

            {deleteSession.isError && (
              <InlineNotification
                kind="error"
                title="Could not delete session"
                subtitle={getErrorMessage(deleteSession.error, "Please try again.")}
                lowContrast
                onClose={() => deleteSession.reset()}
                style={{ maxWidth: "100%", margin: "0 1.5rem 1rem" }}
              />
            )}

            {!sessions || sessions.length === 0 ? (
              <EmptyState
                title="No sessions for this date"
                description="Sessions are created from a class's Attendance tab — go to a class to start one."
                action={
                  <Button kind="primary" as={Link} to="/classes">
                    Go to Classes
                  </Button>
                }
              />
            ) : (
              <table className="os-table os-table--no-hover">
                <thead>
                  <tr>
                    <th>Class</th>
                    <th>Grade</th>
                    <th>Teacher</th>
                    <th>Records</th>
                    <th>Status</th>
                    <th style={{ width: "13rem", textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((s) => {
                    const isMarked = s.marked_count > 0;
                    const isLocked = !!s.created_at && new Date().getTime() - new Date(s.created_at).getTime() > 24 * 60 * 60 * 1000;
                    return (
                      <tr key={s.id}>
                        <td style={{ fontWeight: 600 }}>{s.class_name}</td>
                        <td className="os-table__muted">{s.grade_name}</td>
                        <td className="os-table__muted">{s.teacher_name}</td>
                        <td className="os-table__muted">
                          {s.marked_count} / {s.enrolled_count}
                        </td>
                        <td>
                          <div style={{ display: "flex", gap: "0.375rem", flexWrap: "wrap" }}>
                            <Tag type={isMarked ? "blue" : "gray"} size="sm">
                              {isMarked ? (
                                <CheckmarkFilled size={12} style={{ marginRight: "4px", verticalAlign: "middle" }} />
                              ) : (
                                <WarningFilled size={12} style={{ marginRight: "4px", verticalAlign: "middle" }} />
                              )}
                              {isMarked ? "Marked" : "Pending"}
                            </Tag>
                            {isLocked && (
                              <Tag type="magenta" size="sm">
                                Locked
                              </Tag>
                            )}
                          </div>
                        </td>
                        <td>
                          <div
                            style={{
                              display: "flex",
                              flexWrap: "nowrap",
                              gap: "0.25rem",
                              justifyContent: "flex-end",
                            }}
                          >
                            {(() => {
                              // Teachers lose mark access once a session is
                              // locked; admins can always mark/edit.
                              const rowReadOnly = isLocked && !isAdmin;
                              return (
                                <Button
                                  kind={isMarked || rowReadOnly ? "ghost" : "primary"}
                                  size="sm"
                                  as={Link}
                                  to={`/attendance/sessions/${s.id}/mark`}
                                  style={{
                                    whiteSpace: "nowrap",
                                    ...(isMarked || rowReadOnly ? { color: "#406AAF" } : {}),
                                  }}
                                >
                                  {rowReadOnly ? "View" : isMarked ? "View" : "Mark"}
                                </Button>
                              );
                            })()}
                            <Button
                              kind="danger--ghost"
                              size="sm"
                              style={{ whiteSpace: "nowrap" }}
                              onClick={() => setToDelete(s)}
                            >
                              Delete
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      <ConfirmDeleteModal
        open={!!toDelete}
        title="Delete attendance session"
        description={
          <>
            Delete the session for <strong>{toDelete?.class_name}</strong> on{" "}
            <strong>{toDelete?.date}</strong>? Every attendance record already
            marked for it is deleted too.
          </>
        }
        isPending={deleteSession.isPending}
        onClose={() => setToDelete(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}
