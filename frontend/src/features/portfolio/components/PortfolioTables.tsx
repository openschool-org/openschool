import { Tag } from "@carbon/react";
import type { PrefectAppointment, StudentActivity, LeadershipRole, StudentAward, DisciplinaryRecord } from "@/features/portfolio/api/studentPortfolio";
import type { SocietyMembership } from "@/features/portfolio/api/society";
import DataGrid from "@/shared/ui/DataGrid";
import { SEVERITY_TAG } from "@/shared/lib/constants/tags";
import { capitalize } from "@/shared/lib/text";
import { formatDate } from "@/shared/lib/date";
import { useT } from "@/shared/i18n/useT";
import { translateValue } from "@/shared/i18n/translateValue";

// Read-only portfolio tables shared by the admin, student and parent portals.
const grid = { pagination: false, noHover: true } as const;

export function PrefectsTable({ rows }: { rows: PrefectAppointment[] }) {
  const { t } = useT();
  return (
    <DataGrid {...grid} rows={rows} getRowId={(p) => p.id} columns={[
      { key: "year", header: t("table.year"), render: (p) => <span className="os-fw-500">{p.academic_year_label}</span> },
      { key: "rank", header: t("table.rank"), render: (p) => p.rank },
    ]} />
  );
}

export function SocietiesTable({ rows }: { rows: SocietyMembership[] }) {
  const { t } = useT();
  return (
    <DataGrid {...grid} rows={rows} getRowId={(s) => s.id} columns={[
      { key: "society", header: t("table.society"), render: (s) => <span className="os-fw-500">{s.society_name}</span> },
      { key: "role", header: t("table.role"), render: (s) => capitalize(s.role, t("table.member")) },
      { key: "joined", header: t("table.joined"), render: (s) => <span className="os-table__mono">{formatDate(s.created_at)}</span> },
    ]} />
  );
}

export function ActivitiesTable({ rows }: { rows: StudentActivity[] }) {
  const { t } = useT();
  return (
    <DataGrid {...grid} rows={rows} getRowId={(a) => a.id} columns={[
      { key: "name", header: t("table.activity"), render: (a) => <span className="os-fw-500">{a.name}</span> },
      { key: "category", header: t("table.category"), render: (a) => capitalize(a.category) },
      { key: "role", header: t("table.role"), render: (a) => a.role || t("table.participant") },
      { key: "achievement", header: t("table.achievement"), render: (a) => a.achievement || "-" },
    ]} />
  );
}

export function LeadershipTable({ rows, className }: { rows: LeadershipRole[]; className?: string }) {
  const { t } = useT();
  return (
    <DataGrid {...grid} className={className} rows={rows} getRowId={(l) => l.id} columns={[
      { key: "title", header: t("table.leadershipRole"), render: (l) => <span className="os-fw-500">{l.title}</span> },
      { key: "scope", header: t("table.scope"), render: (l) => l.scope || t("table.school") },
      { key: "assigned", header: t("table.assigned"), render: (l) => <span className="os-table__mono">{formatDate(l.created_at)}</span> },
    ]} />
  );
}

export function AwardsTable({ rows }: { rows: StudentAward[] }) {
  const { t } = useT();
  return (
    <DataGrid {...grid} rows={rows} getRowId={(a) => a.id} columns={[
      { key: "title", header: t("table.award"), render: (a) => <span className="os-fw-500">{a.title}</span> },
      { key: "category", header: t("table.category"), render: (a) => a.category || "-" },
      { key: "date", header: t("table.date"), render: (a) => <span className="os-table__mono">{formatDate(a.awarded_date)}</span> },
      { key: "description", header: t("table.description"), render: (a) => a.description || "-" },
    ]} />
  );
}

export function DisciplineTable({ rows }: { rows: DisciplinaryRecord[] }) {
  const { t } = useT();
  return (
    <DataGrid {...grid} rows={rows} getRowId={(d) => d.id} columns={[
      { key: "date", header: t("table.date"), render: (d) => <span className="os-table__mono">{formatDate(d.incident_date)}</span> },
      { key: "incident", header: t("table.incident"), render: (d) => <span className="os-fw-500">{d.description}</span> },
      { key: "severity", header: t("table.severity"), render: (d) => <Tag type={SEVERITY_TAG[d.severity] ?? "gray"} size="sm">{translateValue(t, "severity", d.severity, t("severity.minor"))}</Tag> },
      { key: "action", header: t("table.actionTaken"), render: (d) => d.action_taken || "-" },
    ]} />
  );
}
