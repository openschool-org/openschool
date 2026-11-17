import { Button, Tag } from "antd";
import { ArrowLeftOutlined, SaveOutlined, WarningOutlined } from "@ant-design/icons";
import { getErrorMessage } from "@/shared/api/errors";
import TextField from "@/shared/ui/TextField";
import type { AttendanceMarkPage } from "@/features/attendance/hooks/useAttendanceMarkPage";

// Class, grade, teacher and date above the marking roster.
export function AttendanceMarkHeader({ page }: { page: AttendanceMarkPage }) {
  const teacherName = page.session.data?.taken_by_name;
  return (
    <div className="os-py-5 os-px-8 os-flex os-items-center os-gap-6 os-wrap os-border-b">
      <div className="os-flex-1">
        <div className="os-flex os-items-center os-gap-2 os-mb-1">
          <span className="os-text-lg os-fw-600 os-c-primary">Class {page.cls?.name ?? "…"}</span>
          {page.gradeName && <Tag color="blue" variant="filled">{page.gradeName}</Tag>}
        </div>
        <div className="os-flex os-gap-6 os-wrap">
          {teacherName && <span className="os-text-sm os-c-secondary">{teacherName}</span>}
          <span className="os-text-sm os-c-secondary">{page.session.data?.date}</span>
        </div>
      </div>
      <Button type="text" icon={<ArrowLeftOutlined />} onClick={page.leave}>Back</Button>
    </div>
  );
}

// Override reason, unmarked warning, save error and the save and cancel buttons.
export function AttendanceMarkFooter({ page }: { page: AttendanceMarkPage }) {
  const { markAttendance } = page;
  const unmarked = page.marking.summary.unmarked;
  return (
    <div className="os-flex os-col os-gap-3 os-py-4 os-attendance-sticky-actions">
      {page.isOverride && (
        <div className="os-max-w-28">
          <TextField id="attendance-override-reason" label="Reason for editing this locked session" placeholder="e.g. Corrected after guardian phone call" value={page.reason} onChange={page.setReason} />
        </div>
      )}
      <div className="os-flex os-items-center os-gap-4 os-wrap">
        {unmarked > 0 && (
          <div className="os-flex os-items-center os-gap-1h os-text-sm os-c-status-late">
            <WarningOutlined className="os-c-warning" />
            {unmarked} student{unmarked !== 1 ? "s" : ""} not yet marked
          </div>
        )}
        {markAttendance.isError && <span className="os-text-sm os-c-danger">{getErrorMessage(markAttendance.error, "Failed to save attendance")}</span>}
        <div className="os-flex-1" />
        <Button size="large" onClick={page.leave}>Cancel</Button>
        <Button size="large" type="primary" icon={<SaveOutlined />} onClick={page.save} loading={markAttendance.isPending}>
          {markAttendance.isPending ? "Saving…" : "Save attendance"}
        </Button>
      </div>
    </div>
  );
}
