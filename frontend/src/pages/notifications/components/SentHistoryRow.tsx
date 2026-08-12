import { useState } from "react";
import { Tag, SkeletonText } from "@carbon/react";
import { useNotificationStats } from "../../../queries/notifications/useNotifications";
import type { Notification } from "../../../services/notifications/notification";

export default function SentHistoryRow({ notification }: { notification: Notification }) {
  const [expanded, setExpanded] = useState(false);
  const { data: stats } = useNotificationStats(expanded ? notification.id : "");

  return (
    <div
      role="button"
      tabIndex={0}
      aria-expanded={expanded}
      style={{ padding: "0.875rem 1.5rem", borderBottom: "1px solid #f4f4f4", cursor: "pointer" }}
      onClick={() => setExpanded((e) => !e)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setExpanded((v) => !v);
        }
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
        <Tag type="blue" size="sm">
          {notification.category}
        </Tag>
        <span style={{ fontWeight: 500, fontSize: "0.8125rem" }}>{notification.title}</span>
        <span style={{ marginLeft: "auto", fontSize: "0.75rem", color: "#8d8d8d" }}>
          {notification.sent_at ? new Date(notification.sent_at).toLocaleString() : ""}
        </span>
      </div>
      <p
        style={{
          margin: 0,
          fontSize: "0.75rem",
          color: "#525252",
          lineHeight: 1.5,
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}
      >
        {notification.message}
      </p>
      {expanded && (
        <div style={{ marginTop: "0.5rem", fontSize: "0.75rem", color: "#161616" }}>
          {stats ? (
            <span>
              Recipients: <strong>{stats.total}</strong> &middot; Read: <strong>{stats.read}</strong> &middot; Unread: <strong>{stats.unread}</strong>
            </span>
          ) : (
            <SkeletonText width="40%" />
          )}
        </div>
      )}
    </div>
  );
}
