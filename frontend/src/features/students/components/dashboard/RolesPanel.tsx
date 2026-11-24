import { Link } from "react-router";
import { Tag } from "antd";
import { CrownOutlined, TeamOutlined, TrophyOutlined, StarOutlined } from "@ant-design/icons";
import { usePrefectAppointmentsByStudent, useLeadershipRoles, useStudentAwards } from "@/features/portfolio/queries/useStudentPortfolio";
import { useStudentSocietyMemberships } from "@/features/portfolio/queries/useSocieties";
import SectionCard from "@/shared/ui/SectionCard";
import LoadingSpinner from "@/shared/ui/LoadingSpinner";
import { capitalize } from "@/shared/lib/text";
import { useT } from "@/shared/i18n/useT";
import { translateValue } from "@/shared/i18n/translateValue";

// This year's prefect rank, societies, leadership roles and awards at a glance.
export default function RolesPanel({ studentId, yearId }: { studentId: string; yearId: string | undefined }) {
  const { t } = useT();
  const prefects = usePrefectAppointmentsByStudent(studentId);
  const societies = useStudentSocietyMemberships(studentId);
  const leadership = useLeadershipRoles(studentId);
  const awards = useStudentAwards(studentId);
  const thisYear = <T extends { academic_year_id: string }>(rows: T[] | undefined) => (rows ?? []).filter((r) => r.academic_year_id === yearId);

  const loading = [prefects, societies, leadership, awards].some((q) => q.isLoading);
  const items = [
    ...thisYear(prefects.data).map((p) => ({
      key: p.id, Icon: CrownOutlined, color: "gold",
      label: t("student.prefectYear", { rank: translateValue(t, "prefect", p.rank), year: p.academic_year_label }),
    })),
    ...thisYear(leadership.data)
      .filter((l) => !(prefects.data ?? []).some((p) => translateValue(t, "prefect", p.rank) === l.title))
      .map((l) => ({ key: l.id, Icon: StarOutlined, color: "blue", label: l.scope ? `${l.title} (${l.scope})` : l.title })),
    ...thisYear(societies.data).filter((s) => !s.left_at).map((s) => ({
      key: s.id, Icon: TeamOutlined, color: "cyan",
      label: t("student.societyRole", { role: capitalize(s.role, t("table.member")), society: s.society_name }),
    })),
    ...thisYear(awards.data).map((a) => ({ key: a.id, Icon: TrophyOutlined, color: "purple", label: a.title })),
  ];

  return (
    <SectionCard title={t("student.rolesTitle")} meta={<Link to="/s/portfolio">{t("student.viewAll")}</Link>} flush>
      {loading ? (
        <LoadingSpinner />
      ) : items.length === 0 ? (
        <p className="os-dash-list__sub os-p-6">{t("student.noRoles")}</p>
      ) : (
        <div className="os-dash-badges">
          {items.map(({ key, Icon, color, label }) => (
            <Tag key={key} color={color} icon={<Icon />} variant="solid">
              {label}
            </Tag>
          ))}
        </div>
      )}
    </SectionCard>
  );
}
