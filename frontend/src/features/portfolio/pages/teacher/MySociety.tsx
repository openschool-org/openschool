import { CrownOutlined, NotificationOutlined, TeamOutlined, ApartmentOutlined, CalendarOutlined } from "@ant-design/icons";
import LoadingSpinner from "@/shared/ui/LoadingSpinner";
import LinkButton from "@/shared/ui/LinkButton";
import { useMySociety, useSocietyMembers } from "@/features/portfolio/queries/useSocieties";
import { roleInfo, roleRank } from "@/features/portfolio/components/societyRoles";
import SocietyRoster from "@/features/portfolio/components/SocietyRoster";
import StatCard from "@/features/reports/components/dashboard/StatCard";
import { useCurrentAcademicYear } from "@/features/school/queries/useAcademicYears";
import { isNotFoundError } from "@/shared/api/errors";
import EmptyState from "@/shared/ui/EmptyState";
import ErrorMessage from "@/shared/ui/ErrorMessage";
import PageHeader from "@/shared/ui/PageHeader";
import SectionCard from "@/shared/ui/SectionCard";

// Shows data only for the teacher in charge of a society this year.
export default function MySociety() {
  const { data: society, isLoading, isError, error, refetch } = useMySociety();
  const { data: members, isLoading: membersLoading } = useSocietyMembers(society?.id ?? "");
  const { data: year } = useCurrentAcademicYear();
  const notTic = isNotFoundError(error);

  const all = (members ?? []).filter((m) => !m.left_at);
  const bearers = all.filter((m) => m.role !== "member").sort((a, b) => roleRank(a.role) - roleRank(b.role));
  const grades = new Set(all.map((m) => m.grade_name).filter(Boolean));

  return (
    <div className="os-page">
      <PageHeader title="My society" subtitle={society ? `${society.name}: roster, office bearers and member roles.` : "Your society's roster, office bearers and member roles."} />

      {isLoading && <LoadingSpinner />}
      {isError && !notTic && <ErrorMessage message="Could not load your society." onRetry={refetch} />}
      {notTic && <EmptyState title="Not a teacher in charge" description="You aren't the Teacher-in-Charge of any society this academic year." />}

      {society && (
        <>
          <div className="os-stat-grid">
            <StatCard label="Members" value={all.length} loading={membersLoading} Icon={TeamOutlined} />
            <StatCard label="Office bearers" value={bearers.length} meta="Leader, deputy, secretary, treasurer" loading={membersLoading} Icon={CrownOutlined} />
            <StatCard label="Grades represented" value={grades.size} meta={[...grades].join(", ") || undefined} loading={membersLoading} Icon={ApartmentOutlined} />
            <StatCard label="Academic year" value={year?.label ?? "-"} meta="Membership is recorded per year" loading={false} Icon={CalendarOutlined} />
          </div>

          {bearers.length > 0 && (
            <SectionCard title="Office bearers" className="os-mb-6">
              <div className="os-bearers">
                {bearers.map((m) => (
                  <div key={m.id} className={`os-bearer is-${m.role}`}>
                    <span className="os-bearer__avatar" aria-hidden="true">{m.student_name.split(/\s+/).filter(Boolean).slice(-2).map((w) => w[0]).join("")}</span>
                    <div className="os-min-w-0">
                      <p className="os-bearer__role">{roleInfo(m.role).label}</p>
                      <p className="os-bearer__name">{m.student_name}</p>
                      <p className="os-bearer__meta">{[m.grade_name, m.student_index].filter(Boolean).join(" · ")}</p>
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>
          )}

          <SectionCard
            title="Members"
            meta={<LinkButton to={`/t/notifications?society=${society.id}`} icon={<NotificationOutlined />}>Notify members</LinkButton>}
          >
            <SocietyRoster societyId={society.id} linkStudents={false} />
          </SectionCard>
        </>
      )}
    </div>
  );
}
