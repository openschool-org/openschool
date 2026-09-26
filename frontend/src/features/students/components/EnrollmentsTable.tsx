import DataGrid from "@/shared/ui/DataGrid";
import { useT } from "@/shared/i18n/useT";
import { translateValue } from "@/shared/i18n/translateValue";

interface Row {
  subject_id: string;
  subject_name: string;
  subject_code: string;
  subject_type?: string | null;
}

export default function EnrollmentsTable({ rows }: { rows: Row[] }) {
  const { t } = useT();
  return (
    <DataGrid
      rows={rows}
      getRowId={(e) => e.subject_id}
      pagination={false}
      noHover
      columns={[
        { key: "name", header: t("table.subjectName"), render: (e) => <span className="os-fw-500">{e.subject_name}</span> },
        { key: "code", header: t("table.subjectCode"), render: (e) => <span className="os-table__mono">{e.subject_code}</span> },
        { key: "type", header: t("table.type"), render: (e) => translateValue(t, "subjectType", e.subject_type, t("subjectType.core")) },
      ]}
    />
  );
}
