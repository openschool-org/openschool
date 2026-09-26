import DataGrid from "@/shared/ui/DataGrid";
import { formatDate } from "@/shared/lib/date";
import { useT } from "@/shared/i18n/useT";

interface Row {
  id: string;
  term_name?: string | null;
  narrative: string;
  created_at?: string | null;
}

export default function ProgressReportsTable({ rows }: { rows: Row[] }) {
  const { t } = useT();
  return (
    <DataGrid
      rows={rows}
      getRowId={(r) => r.id}
      pagination={false}
      noHover
      columns={[
        { key: "term", header: t("table.term"), render: (r) => <span className="os-fw-500">{r.term_name || "-"}</span> },
        { key: "narrative", header: t("table.remarks"), render: (r) => <span className="os-pre-wrap">{r.narrative}</span> },
        { key: "created", header: t("table.date"), render: (r) => <span className="os-table__mono os-text-xs">{formatDate(r.created_at)}</span> },
      ]}
    />
  );
}
