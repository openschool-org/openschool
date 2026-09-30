import { useMemo } from "react";
import { Link } from "react-router";
import { Tag } from "@carbon/react";
import { EventSchedule, Notification, UserMultiple } from "@carbon/icons-react";
import { useMyChildren, useChildrenSummary } from "@/features/parent/queries/useParent";
import { useMyNotifications, useUnreadNotificationCount } from "@/features/notifications/queries/useNotifications";
import ChildCard from "@/features/parent/components/ChildCard";
import StatCard from "@/features/reports/components/dashboard/StatCard";
import LoadingSpinner from "@/shared/ui/LoadingSpinner";
import ErrorMessage from "@/shared/ui/ErrorMessage";
import EmptyState from "@/shared/ui/EmptyState";
import { formatDateTime } from "@/shared/lib/date";
import { formatPercent } from "@/shared/lib/number";
import { useT } from "@/shared/i18n/useT";

const RECENT_NOTICES = 4;

export default function ParentDashboard() {
  const { t } = useT();
  const { data: children, isLoading, isError, refetch } = useMyChildren();
  const { data: summaries, isLoading: summaryLoading } = useChildrenSummary();
  const { data: unread, isLoading: unreadLoading } = useUnreadNotificationCount();
  const { data: notices } = useMyNotifications();
  const summaryById = useMemo(() => new Map((summaries ?? []).map((s) => [s.student_id, s])), [summaries]);

  // One figure for the family: days attended over sessions held, across every child this month.
  const sessions = (summaries ?? []).reduce((n, s) => n + s.sessions_this_month, 0);
  const attended = (summaries ?? []).reduce((n, s) => n + s.attended_this_month, 0);
  const recent = (notices ?? []).filter((n) => !n.is_archived).slice(0, RECENT_NOTICES);

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
      <div className="os-dashboard-hero">
        <div className="os-dashboard-hero__copy">
          <p className="os-eyebrow">{t("parent.eyebrow")}</p>
          <h1 className="os-page__title">{t("parent.title")}</h1>
          <p className="os-page__subtitle">{t("parent.subtitle")}</p>
        </div>
      </div>

      <div className="os-stat-grid">
        <StatCard label={t("parent.statChildren")} value={children?.length ?? 0} loading={false} Icon={UserMultiple} path="/" />
        <StatCard
          label={t("student.attendanceThisMonth")}
          value={sessions > 0 ? formatPercent((attended / sessions) * 100) : t("parent.noData")}
          loading={summaryLoading}
          Icon={EventSchedule}
          path="/"
        />
        <StatCard label={t("student.unreadNotices")} value={unread ?? 0} loading={unreadLoading} Icon={Notification} path="/notification-center" />
      </div>

      {children && children.length === 0 ? (
        <EmptyState title={t("parent.emptyTitle")} description={t("parent.emptyDesc")} />
      ) : (
        <div className="os-grid os-grid-cols-2-1 os-gap-6 os-items-grid-start">
          <div className="os-quick-grid">
            {children?.map((c) => (
              <ChildCard key={c.id} child={c} summary={summaryById.get(c.id)} summaryLoading={summaryLoading} />
            ))}
          </div>

          <div className="os-section os-mt-0">
            <div className="os-section__header">
              <h2 className="os-section__title">{t("parent.recentNotices")}</h2>
              <Link to="/notification-center" className="os-text-xs os-c-accent os-no-underline">{t("bell.viewAll")}</Link>
            </div>
            {recent.length === 0 ? (
              <p className="os-p-6 os-m-0 os-text-sm os-c-tertiary">{t("parent.noNotices")}</p>
            ) : (
              recent.map((n) => (
                <Link key={n.recipient_id} to="/notification-center" className="os-list-item os-block os-no-underline">
                  <div className="os-flex os-items-center os-gap-2 os-mb-h">
                    <span className={`os-text-sm os-c-primary os-truncate ${n.is_read ? "os-fw-500" : "os-fw-700"}`}>{n.title}</span>
                    {!n.is_read && <Tag type="blue" size="sm">{t("bell.unread")}</Tag>}
                  </div>
                  <p className="os-m-0 os-text-xs os-c-tertiary">{n.sender_name} · {formatDateTime(n.sent_at)}</p>
                </Link>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
