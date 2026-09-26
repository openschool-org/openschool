import DataGrid from "@/shared/ui/DataGrid";
import { useT } from "@/shared/i18n/useT";
import { translateValue } from "@/shared/i18n/translateValue";

interface Row {
  id: string;
  full_name: string;
  relationship?: string | null;
  phone?: string | null;
  is_primary_contact: boolean;
}

// Read-only guardian list for the student and parent portals.
export default function GuardiansTable({ rows }: { rows: Row[] }) {
  const { t } = useT();
  return (
    <DataGrid
      rows={rows}
      getRowId={(g) => g.id}
      pagination={false}
      noHover
      columns={[
        { key: "name", header: t("table.name"), render: (g) => <span className="os-fw-500">{g.full_name}</span> },
        { key: "rel", header: t("table.relationship"), render: (g) => translateValue(t, "relationship", g.relationship, t("relationship.guardian")) },
        { key: "phone", header: t("table.phone"), render: (g) => <span className="os-table__mono">{g.phone || "-"}</span> },
        { key: "primary", header: t("table.primaryContact"), render: (g) => (g.is_primary_contact ? <span className="os-c-success os-fw-600">{t("common.yes")}</span> : t("common.no")) },
      ]}
    />
  );
}
