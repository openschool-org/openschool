import { NOTIFICATION_PRIORITY_TAG as PRIORITY_TAG } from "@/shared/lib/constants/tags";
import { useState, useRef, useEffect } from "react";
import { Link } from "react-router";
import { Button, HeaderGlobalAction, Tag } from "@carbon/react";
import { Notification as NotificationIcon } from "@carbon/icons-react";
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
  const ref = useRef<HTMLDivElement>(null);
  const { data: unreadCount } = useUnreadNotificationCount();
  const { data: notifications } = useMyNotifications({ enabled: open });
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", handler);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const groups = groupByDay((notifications ?? []).slice(0, 8), { today: t("day.today"), yesterday: t("day.yesterday") });
  const label = unreadCount ? t("bell.unreadLabel", { count: unreadCount }) : t("bell.title");

  return (
    <div ref={ref} className="os-relative">
      <HeaderGlobalAction aria-label={label} onClick={() => setOpen((o) => !o)} isActive={open}>
        <span className="os-relative os-inline-flex">
          <NotificationIcon size={20} className="os-header-icon" />
          {!!unreadCount && <span className="os-bell__dot os-absolute os-w-px-8 os-h-px-8 os-rounded-full" />}
        </span>
      </HeaderGlobalAction>

      {open && (
        <div className="os-bell__popover os-absolute os-right-0 os-w-24 os-flex os-col os-bg-layer os-border os-shadow-sm os-z-top">
          <div className="os-py-2 os-px-4 os-border-b os-flex os-items-center os-justify-between">
            <span className="os-fw-600 os-text-md">{t("bell.title")}</span>
            {!!unreadCount && (
              <Button kind="ghost" size="sm" onClick={() => markAllRead.mutate()} disabled={markAllRead.isPending}>
                {t("bell.markAll")}
              </Button>
            )}
          </div>
          <div className="os-overflow-y-auto os-flex-1">
            {groups.length === 0 ? (
              <div className="os-py-6 os-px-4 os-text-center os-c-tertiary os-text-sm">{t("bell.empty")}</div>
            ) : (
              groups.map(([day, items]) => (
                <section key={day} aria-label={day}>
                  <p className="os-bell__day os-m-0 os-pt-2 os-px-4 os-pb-1 os-text-xs os-fw-600 os-c-tertiary">{day}</p>
                  {items.map((n) => (
                    <button
                      type="button"
                      key={n.recipient_id}
                      onClick={() => !n.is_read && markRead.mutate(n.notification_id)}
                      className={`os-bell__item os-py-3 os-px-4 os-border-layer-hover-b ${n.is_read ? "os-cursor-default os-bg-transparent" : "os-pointer os-bg-accent-light"}`}
                    >
                      <span className="os-flex os-items-center os-gap-1h os-mb-1">
                        <span className="os-text-sm os-fw-600 os-c-primary os-flex-1">{n.title}</span>
                        {!n.is_read && <span className="os-sr-only">{t("bell.unread")}</span>}
                        {n.priority !== "normal" && <Tag type={PRIORITY_TAG[n.priority]} size="sm">{t(`priority.${n.priority as "important" | "urgent"}`)}</Tag>}
                      </span>
                      <span className="os-block os-text-sm os-c-secondary os-overflow-hidden os-truncate os-clamp-2">{n.message}</span>
                      <span className="os-block os-mt-1 os-text-xs os-c-tertiary">
                        {n.sender_name} &middot; {formatTime(n.sent_at)}
                      </span>
                    </button>
                  ))}
                </section>
              ))
            )}
          </div>
          <Link to="/notification-center" onClick={() => setOpen(false)} className="os-block os-text-center os-p-2h os-border-t os-text-sm os-fw-500 os-c-accent-dark os-no-underline">
            {t("bell.viewAll")}
          </Link>
        </div>
      )}
    </div>
  );
}
