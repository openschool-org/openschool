import { useMemo } from "react";
import { Link } from "react-router";
import { Alert, Button, Card } from "antd";
import { BellOutlined, FileDoneOutlined, ScheduleOutlined } from "@ant-design/icons";
import { useMyChildren, useChildrenSummary } from "@/features/parent/queries/useParent";
import { useMyNotifications, useUnreadNotificationCount } from "@/features/notifications/queries/useNotifications";
import ChildCard from "@/features/parent/components/ChildCard";
import StatCard from "@/features/reports/components/dashboard/StatCard";
import LoadingSpinner from "@/shared/ui/LoadingSpinner";
import ErrorMessage from "@/shared/ui/ErrorMessage";
import EmptyState from "@/shared/ui/EmptyState";
import DashboardHero from "@/shared/ui/DashboardHero";
import SchoolLogo from "@/features/school/components/SchoolLogo";
import { useYearTermItems } from "@/features/school/hooks/useYearTermItems";
import ContextStrip from "@/shared/ui/ContextStrip";
import Pill from "@/shared/ui/Pill";
import { formatDateTime } from "@/shared/lib/date";
import { formatPercent } from "@/shared/lib/number";
import { displayName } from "@/shared/lib/name";
import { useT } from "@/shared/i18n/useT";

const RECENT_NOTICES = 4;

export default function ParentDashboard() {
  const { t } = useT();
  const { data: children, isLoading, isError, refetch } = useMyChildren();
  const summary = useChildrenSummary();
  const unread = useUnreadNotificationCount();
  const notices = useMyNotifications();
  const summaryById = useMemo(() => new Map((summary.data ?? []).map((s) => [s.student_id, s])), [summary.data]);

  // One figure for the family: days attended over sessions held, across every child this month.
  const sessions = (summary.data ?? []).reduce((n, s) => n + s.sessions_this_month, 0);
  const attended = (summary.data ?? []).reduce((n, s) => n + s.attended_this_month, 0);
  const recent = (notices.data ?? []).filter((n) => !n.is_archived).slice(0, RECENT_NOTICES);
  // Mean of each child's latest term average, for children who have marks.
  const averages = (summary.data ?? []).filter((s) => s.has_marks).map((s) => s.latest_average_percent);
  const familyAverage = averages.length ? averages.reduce((a, b) => a + b, 0) / averages.length : null;
  const yearTerm = useYearTermItems();

  if (isLoading) return <LoadingSpinner />;
  if (isError) {
    return (
      <div className="os-page">
        <ErrorMessage message={t("parent.loadFailed")} onRetry={refetch} />
      </div>
    );
  }

  return (
    <div className="os-page">
      <DashboardHero title={t("parent.title")} subtitle={t("parent.subtitle")} aside={<SchoolLogo />} />

      <ContextStrip
        label={t("student.currentTerm")}
        items={[
          ...yearTerm,
          { key: "children", label: t("parent.statChildren"), value: children?.length ?? 0, meta: (children ?? []).map((c) => displayName(c)).join(", ") || undefined },
        ]}
      />

      <div className="os-stat-grid os-stat-grid--three">
        <StatCard
          label={t("student.attendanceThisMonth")}
          value={sessions > 0 ? formatPercent((attended / sessions) * 100) : t("parent.noData")}
          meta={sessions > 0 ? t("student.daysAttended", { attended, days: sessions }) : undefined}
          loading={summary.isLoading}
          error={summary.isError}
          Icon={ScheduleOutlined}
        />
        <StatCard
          label={t("parent.latestAverage")}
          value={familyAverage === null ? t("parent.noData") : formatPercent(familyAverage)}
          loading={summary.isLoading}
          error={summary.isError}
          Icon={FileDoneOutlined}
        />
        <StatCard label={t("student.unreadNotices")} value={unread.data ?? 0} loading={unread.isLoading} error={unread.isError} Icon={BellOutlined} path="/notification-center" />
      </div>

      {children && children.length === 0 ? (
        <EmptyState title={t("parent.emptyTitle")} description={t("parent.emptyDesc")} />
      ) : (
        <div className="os-dash-lower">
          <div>
            {summary.isError && (
              <Alert className="os-mb-4" type="warning" showIcon title={t("parent.summaryFailed")} action={<Button size="small" onClick={() => void summary.refetch()}>{t("common.retry")}</Button>} />
            )}
            <div className="os-quick-grid">
              {children?.map((c) => (
                <ChildCard key={c.id} child={c} summary={summaryById.get(c.id)} summaryLoading={summary.isLoading} />
              ))}
            </div>
          </div>

          <Card className="os-dash-card is-flush" title={t("parent.recentNotices")} extra={<Link to="/notification-center">{t("bell.viewAll")}</Link>}>
            {notices.isError ? (
              <div className="os-dash-empty"><ErrorMessage message={t("parent.noticesFailed")} onRetry={() => notices.refetch()} /></div>
            ) : recent.length === 0 ? (
              <EmptyState title={t("parent.noNotices")} description={t("notif.subtitle")} />
            ) : (
              recent.map((n) => (
                <Link key={n.recipient_id} to="/notification-center" className={`os-dash-item${n.is_read ? "" : " is-unread"}`}>
                  <div className="os-dash-item__body">
                    <p className="os-dash-item__title">
                      <span className="os-truncate">{n.title}</span>
                      {!n.is_read && <Pill tone="info">{t("bell.unread")}</Pill>}
                    </p>
                    <p className="os-dash-item__sub">{n.sender_name} · {formatDateTime(n.sent_at)}</p>
                  </div>
                </Link>
              ))
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
