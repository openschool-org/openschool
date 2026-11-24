import { useMemo, useState } from "react";
import { useParams } from "react-router";
import { Alert, Button, Empty } from "antd";
import { useAttendanceMarkPage } from "@/features/attendance/hooks/useAttendanceMarkPage";
import AttendanceSummaryCards from "@/features/attendance/components/AttendanceSummaryCards";
import { AttendanceMarkFooter } from "@/features/attendance/components/AttendanceMarkParts";
import PageHeader from "@/shared/ui/PageHeader";
import FilterBar from "@/shared/ui/FilterBar";
import { formatLongDate } from "@/shared/lib/date";
import { markColumns } from "@/features/attendance/components/markColumns";
import DataGrid from "@/shared/ui/DataGrid";
import LoadingSpinner from "@/shared/ui/LoadingSpinner";
import ErrorMessage from "@/shared/ui/ErrorMessage";
import TableSkeleton from "@/shared/ui/TableSkeleton";
import UnsavedChangesModal from "@/shared/ui/UnsavedChangesModal";
import ConfirmActionModal from "@/shared/ui/ConfirmActionModal";

const HEADERS = ["#", "Student", "Index No.", "Attendance", "Note"];

export default function AttendanceMark() {
  const { id = "" } = useParams();
  const page = useAttendanceMarkPage(id);
  const { marking, readOnly, filtered, unsavedGuard } = page;
  const [confirmAbsent, setConfirmAbsent] = useState(false);
  // Row number = position in the (filtered) roster, across pages.
  const position = useMemo(() => new Map(filtered.map((st, i) => [st.id, i + 1])), [filtered]);
  const unmarked = marking.summary.unmarked;

  if (page.session.isLoading) return <LoadingSpinner />;
  if (page.session.isError || !page.session.data) {
    return (
      <div className="os-page">
        <ErrorMessage message="Failed to load attendance session" />
      </div>
    );
  }

  return (
    <div className="os-page">
      <PageHeader
        back={{ label: "Back", onClick: page.leave }}
        title={`${page.cls?.name ?? "Class"} attendance`}
        subtitle={[page.gradeName, formatLongDate(page.session.data?.date), page.session.data?.taken_by_name].filter(Boolean).join(" · ")}
      />
      <div>
        {page.notClassTeacher ? (
          <Alert type="info" showIcon className="os-mb-6" title="View only" description="Only the class teacher takes attendance for this class. You can see it because you teach this class." />
        ) : (
          readOnly && <Alert type="warning" showIcon className="os-mb-6" title="This session is locked" description="More than 24 hours have passed since it was taken. Ask an administrator to edit it." />
        )}
        {page.isOverride && (
          <Alert type="info" showIcon className="os-mb-6" title="Editing a locked session" description="This session is more than 24 hours old. As an administrator you can still edit it. Note a reason below; the change is recorded in the audit log." />
        )}

        <AttendanceSummaryCards summary={marking.summary} />

        <div className="os-section">
          <div className="os-flex os-items-center os-gap-3 os-py-3h os-px-6 os-border-b os-wrap">
            <div className="os-flex-1">
              <FilterBar search={{ value: page.search, onChange: page.setSearch, placeholder: "Search by name or index number" }} />
            </div>
            {!readOnly && (
              <>
                <Button danger size="small" disabled={unmarked === 0} onClick={() => setConfirmAbsent(true)}>
                  Mark all {unmarked} not marked as absent
                </Button>
                <Button type="text" size="small" onClick={marking.clearAll}>Clear</Button>
              </>
            )}
          </div>

          {page.rosterLoading ? (
            <TableSkeleton headers={HEADERS} />
          ) : filtered.length === 0 ? (
            <Empty
              className="os-py-8"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={page.students?.length === 0 ? "No students are enrolled in this class." : `No students match "${page.search}"`}
            />
          ) : (
            <DataGrid
              rows={filtered}
              columns={markColumns(marking, readOnly, position)}
              getRowId={(st) => st.id}
              noHover
              pageSize={50}
              pageSizes={[25, 50, 100]}
              rowClassName={(st) => (marking.statuses[st.id] ? `os-attendance-row--${marking.statuses[st.id]}` : "")}
            />
          )}
        </div>

        {!readOnly && <AttendanceMarkFooter page={page} />}
      </div>

      <ConfirmActionModal
        open={confirmAbsent}
        title="Mark unmarked students as absent"
        description={`This will mark all ${unmarked} currently unmarked students as absent. Existing attendance marks will not change.`}
        confirmLabel="Mark as absent"
        danger
        onClose={() => setConfirmAbsent(false)}
        onConfirm={() => { marking.markAll("absent"); setConfirmAbsent(false); }}
      />
      <UnsavedChangesModal open={unsavedGuard.modalOpen} onStay={unsavedGuard.cancelLeave} onLeave={unsavedGuard.confirmLeave} />
    </div>
  );
}
