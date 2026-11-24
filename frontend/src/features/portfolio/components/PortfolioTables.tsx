import type { PrefectAppointment } from "@/features/portfolio/api/studentPortfolio";
import DataGrid from "@/shared/ui/DataGrid";
import { useT } from "@/shared/i18n/useT";
import { translateValue } from "@/shared/i18n/translateValue";

// Prefect appointments by year, used in the admin student records rollup.
export function PrefectsTable({ rows }: { rows: PrefectAppointment[] }) {
  const { t } = useT();
  return (
    <DataGrid pagination={false} noHover rows={rows} getRowId={(p) => p.id} columns={[
      { key: "year", header: t("table.year"), render: (p) => <span className="os-fw-500">{p.academic_year_label}</span> },
      { key: "rank", header: t("table.rank"), render: (p) => translateValue(t, "prefect", p.rank) },
    ]} />
  );
}
