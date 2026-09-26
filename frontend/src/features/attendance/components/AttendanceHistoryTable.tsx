import { Tag } from "@carbon/react";
import DataGrid from "@/shared/ui/DataGrid";
import { ATTENDANCE_STATUS_TAG } from "@/shared/lib/attendanceStatus";
import { formatDate } from "@/shared/lib/date";
import { useT } from "@/shared/i18n/useT";
import { translateValue } from "@/shared/i18n/translateValue";

interface Row {
  id: string;
  session_date: string;
  class_name: string;
  status: string;
  note?: string | null;
}

// Read-only attendance history, newest first; shared by the student and parent portals.
export default function AttendanceHistoryTable({ rows }: { rows: Row[] }) {
  const { t } = useT();
  const sorted = [...rows].sort((a, b) => b.session_date.localeCompare(a.session_date));
  return (
    <DataGrid
      rows={sorted}
      getRowId={(r) => r.id}
      noHover
      columns={[
        { key: "date", header: t("table.date"), render: (r) => <span className="os-table__mono">{formatDate(r.session_date)}</span> },
        { key: "class", header: t("table.class"), render: (r) => r.class_name },
        { key: "status", header: t("table.status"), render: (r) => <Tag type={ATTENDANCE_STATUS_TAG[r.status] ?? "gray"} size="sm">{translateValue(t, "status", r.status)}</Tag> },
        { key: "note", header: t("table.note"), render: (r) => <span className="os-table__muted">{r.note || "-"}</span> },
      ]}
    />
  );
}
