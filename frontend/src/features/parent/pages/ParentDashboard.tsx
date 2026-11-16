import { useMemo } from "react";
import { Link } from "react-router";
import { Alert, Button, Card, Tag } from "antd";
import { BellOutlined, ScheduleOutlined, TeamOutlined } from "@ant-design/icons";
import { useMyChildren, useChildrenSummary } from "@/features/parent/queries/useParent";
import { useMyNotifications, useUnreadNotificationCount } from "@/features/notifications/queries/useNotifications";
import ChildCard from "@/features/parent/components/ChildCard";
import StatCard from "@/features/reports/components/dashboard/StatCard";
import LoadingSpinner from "@/shared/ui/LoadingSpinner";
import ErrorMessage from "@/shared/ui/ErrorMessage";
import EmptyState from "@/shared/ui/EmptyState";
import DashboardHero from "@/shared/ui/DashboardHero";
import SchoolLogo from "@/features/school/components/SchoolLogo";
import { formatDateTime } from "@/shared/lib/date";
import { formatPercent } from "@/shared/lib/number";
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

  if (isLoading) return <LoadingSpinner />;
  if (isError) {
    return (
      <div className="os-p-8">
        <ErrorMessage message={t("parent.loadFailed")} onRetry={refetch} />
      </div>
    );
  }

  return (
    <div className="os-page">
      <DashboardHero title={t("parent.title")} subtitle={t("parent.subtitle")} aside={<SchoolLogo />} />

      <div className="os-stat-grid">
        <StatCard label={t("parent.statChildren")} value={children?.length ?? 0} loading={false} Icon={TeamOutlined} />
        <StatCard
          label={t("student.attendanceThisMonth")}
          value={sessions > 0 ? formatPercent((attended / sessions) * 100) : t("parent.noData")}
          loading={summary.isLoading}
          error={summary.isError}
          Icon={ScheduleOutlined}
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
              <p className="os-p-6 os-m-0 os-text-sm os-c-tertiary">{t("parent.noNotices")}</p>
            ) : (
              recent.map((n) => (
                <Link key={n.recipient_id} to="/notification-center" className={`os-dash-item${n.is_read ? "" : " is-unread"}`}>
                  <div className="os-dash-item__body">
                    <p className="os-dash-item__title">
                      <span className="os-truncate">{n.title}</span>
                      {!n.is_read && <Tag color="processing" variant="filled">{t("bell.unread")}</Tag>}
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
