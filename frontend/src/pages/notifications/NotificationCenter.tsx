import { useMemo, useState } from "react";
import { Tag, Dropdown, Button } from "@carbon/react";
import { Archive, ArrowUpRight, Search } from "@carbon/icons-react";
import {
  useMyNotifications,
  useMyArchivedNotifications,
  useMarkNotificationRead,
  useArchiveNotification,
  useUnarchiveNotification,
} from "../../queries/notifications/useNotifications";
import { CATEGORIES } from "../../services/notifications/notification";
import type { MyNotification, NotificationCategory, NotificationPriority } from "../../services/notifications/notification";
import EmptyState from "../../components/common/EmptyState";
import LoadingSpinner from "../../components/common/LoadingSpinner";

type Tab = "unread" | "read" | "archived";

const PRIORITY_TAG: Record<NotificationPriority, "gray" | "warm-gray" | "red"> = {
  normal: "gray",
  important: "warm-gray",
  urgent: "red",
};

const CATEGORY_LABEL: Record<string, string> = Object.fromEntries(CATEGORIES.map((c) => [c.value, c.label]));

function NotificationRow({ n }: { n: MyNotification }) {
  const markRead = useMarkNotificationRead();
  const archive = useArchiveNotification();
  const unarchive = useUnarchiveNotification();

  return (
    <div
      style={{
        display: "flex",
        gap: "1rem",
        padding: "0.875rem 1.5rem",
        borderBottom: "1px solid #f4f4f4",
        background: n.is_read ? "transparent" : "#edf5ff",
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
          <span style={{ fontWeight: 600, fontSize: "0.875rem", color: "#161616" }}>{n.title}</span>
          {n.priority !== "normal" && (
            <Tag type={PRIORITY_TAG[n.priority]} size="sm">
              {n.priority}
            </Tag>
          )}
          <Tag type="blue" size="sm">
            {CATEGORY_LABEL[n.category] ?? n.category}
          </Tag>
          {!n.is_read && !n.is_archived && (
            <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#0f62fe", display: "inline-block" }} />
          )}
        </div>
        <p style={{ margin: "0 0 0.375rem", fontSize: "0.8125rem", color: "#525252", lineHeight: 1.5 }}>{n.message}</p>
        <p style={{ margin: 0, fontSize: "0.75rem", color: "#8d8d8d" }}>
          {n.sender_name} &middot; {new Date(n.sent_at).toLocaleString()}
        </p>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem", alignItems: "flex-end", flexShrink: 0 }}>
        {!n.is_read && (
          <Button kind="ghost" size="sm" onClick={() => markRead.mutate(n.notification_id)}>
            Mark read
          </Button>
        )}
        {n.is_archived ? (
          <Button kind="ghost" size="sm" renderIcon={ArrowUpRight} onClick={() => unarchive.mutate(n.notification_id)}>
            Unarchive
          </Button>
        ) : (
          <Button kind="ghost" size="sm" renderIcon={Archive} onClick={() => archive.mutate(n.notification_id)}>
            Archive
          </Button>
        )}
      </div>
    </div>
  );
}

export default function NotificationCenter() {
  const { data: inbox, isLoading: inboxLoading } = useMyNotifications();
  const { data: archived, isLoading: archivedLoading } = useMyArchivedNotifications();

  const [tab, setTab] = useState<Tab>("unread");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<NotificationCategory | "">("");

  const isLoading = tab === "archived" ? archivedLoading : inboxLoading;

  const filtered = useMemo(() => {
    let list = tab === "archived" ? (archived ?? []) : (inbox ?? []);
    if (tab === "unread") list = list.filter((n) => !n.is_read);
    if (tab === "read") list = list.filter((n) => n.is_read);
    if (category) list = list.filter((n) => n.category === category);
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter((n) => n.title.toLowerCase().includes(q) || n.message.toLowerCase().includes(q));
    }
    return [...list].sort((a, b) => b.sent_at.localeCompare(a.sent_at));
  }, [inbox, archived, tab, category, query]);

  const unreadCount = (inbox ?? []).filter((n) => !n.is_read).length;
  const readCount = (inbox ?? []).filter((n) => n.is_read).length;

  return (
    <div className="os-page">
      <div className="os-page__header">
        <div className="os-page__header-left">
          <h1 className="os-page__title">Notification Center</h1>
          <p className="os-page__subtitle">Announcements and updates sent to you.</p>
        </div>
      </div>

      <div className="os-section">
        <div style={{ display: "flex", gap: "0.5rem", padding: "1rem 1.5rem 0" }}>
          {(["unread", "read", "archived"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                padding: "0.5rem 1rem",
                border: `1.5px solid ${tab === t ? "#406AAF" : "#e0e0e0"}`,
                background: tab === t ? "#eef2f9" : "#ffffff",
                color: tab === t ? "#406AAF" : "#525252",
                fontWeight: tab === t ? 600 : 400,
                fontSize: "0.8125rem",
                cursor: "pointer",
              }}
            >
              {t === "unread" ? `Unread (${unreadCount})` : t === "read" ? `Read (${readCount})` : "Archived"}
            </button>
          ))}
        </div>

        <div className="os-toolbar">
          <div className="os-search" style={{ maxWidth: "22rem" }}>
            <Search size={16} className="os-search__icon" />
            <input
              className="os-search__input"
              placeholder="Search notifications…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div style={{ width: "16rem" }}>
            <Dropdown
              id="notification-category-filter"
              titleText=""
              label="All categories"
              items={["", ...CATEGORIES.map((c) => c.value)]}
              itemToString={(item) => (item ? CATEGORY_LABEL[item as string] : "All categories")}
              selectedItem={category}
              onChange={({ selectedItem }) => setCategory((selectedItem as NotificationCategory | "") ?? "")}
            />
          </div>
        </div>

        {isLoading ? (
          <LoadingSpinner />
        ) : filtered.length === 0 ? (
          <EmptyState
            title={tab === "archived" ? "No archived notifications" : "You're all caught up"}
            description={
              tab === "unread"
                ? "New notifications will appear here."
                : tab === "archived"
                  ? "Notifications you archive will show up here."
                  : "Notifications you've read will show up here."
            }
          />
        ) : (
          <div>
            {filtered.map((n) => (
              <NotificationRow key={n.recipient_id} n={n} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
