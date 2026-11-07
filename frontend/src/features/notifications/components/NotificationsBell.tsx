import { useState } from "react";
import { Link } from "react-router";
import { Badge, Button, Empty, Popover, Tag } from "antd";
import { BellOutlined } from "@ant-design/icons";
import { formatDayGroup, formatTime } from "@/shared/lib/date";
import {
  useMyNotifications,
  useUnreadNotificationCount,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from "@/features/notifications/queries/useNotifications";
import type { MyNotification } from "@/features/notifications/api/notification";
import { useT } from "@/shared/i18n/useT";

function groupByDay(items: MyNotification[], words: { today: string; yesterday: string }) {
  const groups = new Map<string, MyNotification[]>();
  for (const n of items) {
    const day = formatDayGroup(n.sent_at, words);
    groups.set(day, [...(groups.get(day) ?? []), n]);
  }
  return [...groups.entries()];
}

export default function NotificationsBell() {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const { data: unreadCount } = useUnreadNotificationCount();
  const { data: notifications } = useMyNotifications({ enabled: open });
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const groups = groupByDay((notifications ?? []).slice(0, 8), { today: t("day.today"), yesterday: t("day.yesterday") });
  const label = unreadCount ? t("bell.unreadLabel", { count: unreadCount }) : t("bell.title");

  const content = (
    <div className="os-bell">
      <div className="os-bell__head">
        <span className="os-bell__title">{t("bell.title")}</span>
        {!!unreadCount && (
          <Button type="link" size="small" onClick={() => markAllRead.mutate()} disabled={markAllRead.isPending}>
            {t("bell.markAll")}
          </Button>
        )}
      </div>
      <div className="os-bell__list">
        {groups.length === 0 ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t("bell.empty")} />
        ) : (
          groups.map(([day, items]) => (
            <section key={day} aria-label={day}>
              <p className="os-bell__day">{day}</p>
              {items.map((n) => (
                <button
                  type="button"
                  key={n.recipient_id}
                  onClick={() => !n.is_read && markRead.mutate(n.notification_id)}
                  className={`os-bell__item${n.is_read ? "" : " is-unread"}`}
                >
                  <span className="os-bell__item-head">
                    <span className="os-bell__item-title">{n.title}</span>
                    {!n.is_read && <span className="os-sr-only">{t("bell.unread")}</span>}
                    {n.priority !== "normal" && (
                      <Tag color={n.priority === "urgent" ? "error" : "warning"} variant="filled">
                        {t(`priority.${n.priority as "important" | "urgent"}`)}
                      </Tag>
                    )}
                  </span>
                  <span className="os-bell__item-msg">{n.message}</span>
                  <span className="os-bell__item-meta">{n.sender_name} &middot; {formatTime(n.sent_at)}</span>
                </button>
              ))}
            </section>
          ))
        )}
      </div>
      <Link to="/notification-center" onClick={() => setOpen(false)} className="os-bell__all">{t("bell.viewAll")}</Link>
    </div>
  );

  return (
    <Popover open={open} onOpenChange={setOpen} trigger="click" placement="bottomRight" arrow={false} content={content} classNames={{ root: "os-bell-pop" }}>
      <Badge dot={!!unreadCount} offset={[-6, 6]}>
        <Button type="text" shape="circle" aria-label={label} aria-expanded={open} icon={<BellOutlined />} />
      </Badge>
    </Popover>
  );
}
