import { useMyLedClasses } from "@/features/positions/queries/usePositions";
import { useLocation } from "react-router";
import { useState } from "react";
import { Button, Tag } from "antd";
import { PlusCircleOutlined } from "@ant-design/icons";
import LinkButton from "@/shared/ui/LinkButton";
import { useDeleteSession } from "@/features/attendance/queries/useAttendance";
import { useDailySessionsPage } from "@/features/attendance/hooks/useDailySessionsPage";
import { sessionColumns } from "@/features/attendance/components/sessionColumns";
import { useRole } from "@/shared/auth/useRole";
import type { DailySession } from "@/features/attendance/api/attendance";
import { todayISODate, formatLongDate } from "@/shared/lib/date";
import TableSkeleton from "@/shared/ui/TableSkeleton";
import DataGrid from "@/shared/ui/DataGrid";
import SectionHeader from "@/shared/ui/SectionHeader";
import ErrorMessage from "@/shared/ui/ErrorMessage";
import EmptyState from "@/shared/ui/EmptyState";
import ConfirmDeleteModal from "@/shared/ui/ConfirmDeleteModal";
import AgentFindingsBanner from "@/features/notifications/components/AgentFindingsBanner";
import MutationErrorNotification from "@/shared/ui/MutationErrorNotification";
import DateField from "@/shared/ui/DateField";
import PageHeader from "@/shared/ui/PageHeader";

const HEADERS = ["Class", "Grade", "Teacher", "Records", "Status", "Actions"];

export default function Attendance() {
  // The same page serves a section head at /t/section-attendance, scoped to the classes they lead.
  const isSectionView = useLocation().pathname.startsWith("/t/");
  const [date, setDate] = useState(todayISODate());
  const { data: ledClasses } = useMyLedClasses(isSectionView);
  const day = useDailySessionsPage(date, isSectionView ? (ledClasses ?? []) : undefined);
  const deleteSession = useDeleteSession();
  const { role } = useRole();
  const [toDelete, setToDelete] = useState<DailySession | null>(null);
  const { sessions } = day;

  return (
    <div className="os-page">
      <PageHeader title={isSectionView ? "Section attendance" : "Attendance"} subtitle={<>{isSectionView ? "Classes you lead · " : ""}{formatLongDate(`${date}T00:00:00`)}</>}>
        <div className="os-min-w-12">
          <DateField value={date} onChange={(ymd) => ymd && setDate(ymd)} id="attendance-date" labelText="Attendance date" hideLabel />
        </div>
      </PageHeader>

      <AgentFindingsBanner />

      {day.grade && (
        <div className="os-mb-4">
          <Tag color="processing" closable onClose={(e) => { e.preventDefault(); day.clearGrade(); }}>Grade: {day.grade}</Tag>
        </div>
      )}

      {date !== todayISODate() && (
        <div className="os-mb-4">
          <Button type="link" size="small" className="os-p-0" onClick={() => setDate(todayISODate())}>
            Jump to today
          </Button>
        </div>
      )}

      {day.isLoading ? (
        <div className="os-section">
          <SectionHeader title="Sessions" />
          <TableSkeleton headers={HEADERS} />
        </div>
      ) : day.isError ? (
        <ErrorMessage message="Could not load sessions for this date." onRetry={day.refetch} />
      ) : (
        <div className="os-section">
          <SectionHeader
            title="Sessions"
            meta={
              day.missingCount > 0 && (
                <Button type="primary" icon={<PlusCircleOutlined />} onClick={day.createAllSessions} loading={day.bulkCreating}>
                  {day.bulkCreating ? "Creating…" : `Create all sessions (${day.missingCount})`}
                </Button>
              )
            }
          />
          {sessions.length > 0 && (
            <div className="os-att-summary">
              <div className="os-att-summary__stats">
                <span className="os-att-stat"><span className="os-att-stat__dot" aria-hidden="true" />Sessions<strong>{sessions.length}</strong></span>
                <span className="os-att-stat"><span className="os-att-stat__dot is-present" aria-hidden="true" />Marked<strong>{day.marked}</strong></span>
                <span className="os-att-stat"><span className="os-att-stat__dot is-late" aria-hidden="true" />Pending<strong>{day.pending}</strong></span>
              </div>
            </div>
          )}

          <MutationErrorNotification
            isError={deleteSession.isError}
            error={deleteSession.error}
            title="Could not delete session"
            fallback="Please try again."
            onClose={() => deleteSession.reset()} className="os-mt-0 os-mx-6 os-mb-4"
          />

          {sessions.length === 0 ? (
            <EmptyState
              title="No sessions for this date"
              description={
                day.missingCount > 0
                  ? "Create sessions for every class at once above, or go to a class's Attendance tab to start one."
                  : "Sessions are created from a class's Attendance tab - go to a class to start one."
              }
              action={isSectionView ? undefined : <LinkButton to="/classes" type="primary">Go to Classes</LinkButton>}
            />
          ) : (
            <DataGrid rows={sessions} columns={sessionColumns(role === "admin", setToDelete, !isSectionView)} getRowId={(s) => s.id} noHover pageSize={20} />
          )}
        </div>
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
        subject="Session"
        mutation={deleteSession}
        onClose={() => setToDelete(null)}
        onConfirm={() => toDelete && deleteSession.mutate(toDelete.id)}
      />
    </div>
  );
}
