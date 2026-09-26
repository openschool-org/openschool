import { NOTIFICATION_PRIORITY_TAG as PRIORITY_TAG } from "@/shared/lib/constants/tags";
import { useState } from "react";
import { Tag, Dropdown, Button, Pagination } from "@carbon/react";
import { Archive, ArrowUpRight, Search } from "@carbon/icons-react";
import { formatDateTime } from "@/shared/lib/date";
import {
  useInbox,
  useMarkNotificationRead,
  useArchiveNotification,
  useUnarchiveNotification,
} from "@/features/notifications/queries/useNotifications";
import { CATEGORIES } from "@/features/notifications/api/notification";
import type { MyNotification, NotificationCategory } from "@/features/notifications/api/notification";
import EmptyState from "@/shared/ui/EmptyState";
import LoadingSpinner from "@/shared/ui/LoadingSpinner";
import { usePageTitle } from "@/shared/hooks/usePageTitle";
import { useDebounced } from "@/shared/hooks/useDebounced";
import { useT } from "@/shared/i18n/useT";
import { translateValue } from "@/shared/i18n/translateValue";

type Tab = "unread" | "read" | "archived";


function NotificationRow({ n }: { n: MyNotification }) {
  const { t } = useT();
  const markRead = useMarkNotificationRead();
  const archive = useArchiveNotification();
  const unarchive = useUnarchiveNotification();

  return (
    <div
      className={`${`os-list-row${!n.is_read ? " is-selected" : ""}`} os-gap-4 os-py-3h os-px-6`}
    >
      <div className="os-flex-1 os-min-w-0">
        <div className="os-flex os-items-center os-gap-2 os-mb-1">
          <span className="os-fw-600 os-text-md os-c-primary">{n.title}</span>
          {n.priority !== "normal" && (
            <Tag type={PRIORITY_TAG[n.priority]} size="sm">
              {translateValue(t, "priority", n.priority)}
            </Tag>
          )}
          <Tag type="blue" size="sm">
            {translateValue(t, "category", n.category)}
          </Tag>
          {!n.is_read && !n.is_archived && (
            <span className="os-w-px-8 os-h-px-8 os-rounded-full os-bg-accent os-inline-block" aria-hidden="true" />
          )}
          {!n.is_read && !n.is_archived && (
            <span className="os-sr-only">{t("bell.unread")}</span>
          )}
        </div>
        <p className="os-mt-0 os-mx-0 os-mb-1h os-text-sm os-c-secondary os-lh-normal">{n.message}</p>
        <p className="os-m-0 os-text-xs os-c-tertiary">
          {n.sender_name} &middot; {formatDateTime(n.sent_at)}
        </p>
      </div>
      <div className="os-flex os-col os-gap-1h os-items-end os-shrink-0">
        {!n.is_read && (
          <Button kind="ghost" size="sm" onClick={() => markRead.mutate(n.notification_id)}>
            {t("notif.markRead")}
          </Button>
        )}
        {n.is_archived ? (
          <Button kind="ghost" size="sm" renderIcon={ArrowUpRight} onClick={() => unarchive.mutate(n.notification_id)}>
            {t("notif.unarchive")}
          </Button>
        ) : (
          <Button kind="ghost" size="sm" renderIcon={Archive} onClick={() => archive.mutate(n.notification_id)}>
            {t("notif.archive")}
          </Button>
        )}
      </div>
    </div>
  );
}

export default function NotificationCenter() {
  const { t } = useT();
  usePageTitle(t("nav.notifications"));

  const [tab, setTabState] = useState<Tab>("unread");
  const [query, setQueryState] = useState("");
  const [category, setCategoryState] = useState<NotificationCategory | "">("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const search = useDebounced(query, 250);

  // Search, box and paging run on the server, so a long inbox never loads in one go.
  const { data, isLoading } = useInbox({ box: tab, search, category, limit: pageSize, offset: (page - 1) * pageSize });
  const filtered = data?.items ?? [];
  const unreadCount = data?.counts.unread ?? 0;
  const readCount = data?.counts.read ?? 0;

  const setTab = (next: Tab) => {
    setTabState(next);
    setPage(1);
  };
  const setQuery = (next: string) => {
    setQueryState(next);
    setPage(1);
  };
  const setCategory = (next: NotificationCategory | "") => {
    setCategoryState(next);
    setPage(1);
  };

  return (
    <div className="os-page">
      <div className="os-page__header">
        <div className="os-page__header-left">
          <h1 className="os-page__title">{t("notif.title")}</h1>
          <p className="os-page__subtitle">{t("notif.subtitle")}</p>
        </div>
      </div>

      <div className="os-section">
        <div className="os-flex os-gap-2 os-pt-4 os-px-6 os-pb-0" role="group" aria-label={t("notif.filters")}>
          {(["unread", "read", "archived"] as Tab[]).map((key) => (
            <button
              type="button"
              key={key}
              onClick={() => setTab(key)} className={`os-pill os-px-4${tab === key ? " is-active" : ""}`}
              aria-pressed={tab === key}
            >
              {key === "unread" ? t("notif.tabUnread", { count: unreadCount }) : key === "read" ? t("notif.tabRead", { count: readCount }) : t("notif.tabArchived")}
            </button>
          ))}
        </div>

        <div className="os-toolbar">
          <div className="os-search os-max-w-22">
            <Search size={16} className="os-search__icon" />
            <input
              className="os-search__input"
              placeholder={t("notif.search")}
              aria-label={t("notif.search")}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="os-w-16">
            <Dropdown
              id="notification-category-filter"
              titleText={t("notif.category")}
              hideLabel
              label={t("notif.allCategories")}
              items={["", ...CATEGORIES.map((c) => c.value)]}
              itemToString={(item) => (item ? translateValue(t, "category", item as string) : t("notif.allCategories"))}
              selectedItem={category}
              onChange={({ selectedItem }) => setCategory((selectedItem as NotificationCategory | "") ?? "")}
            />
          </div>
        </div>

        {isLoading ? (
          <LoadingSpinner />
        ) : filtered.length === 0 ? (
          <EmptyState
            title={tab === "archived" ? t("notif.archivedEmpty") : t("notif.caughtUp")}
            description={
              tab === "unread" ? t("notif.unreadEmptyDesc") : tab === "archived" ? t("notif.archivedEmptyDesc") : t("notif.readEmptyDesc")
            }
          />
        ) : (
          <div>
            {filtered.map((n) => (
              <NotificationRow key={n.recipient_id} n={n} />
            ))}
            {(data?.total ?? 0) > pageSize && (
              <Pagination
                totalItems={data?.total ?? 0}
                page={page}
                pageSize={pageSize}
                pageSizes={[25, 50, 100]}
                onChange={({ page: p, pageSize: ps }) => {
                  setPage(ps === pageSize ? p : 1);
                  setPageSize(ps);
                }}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
