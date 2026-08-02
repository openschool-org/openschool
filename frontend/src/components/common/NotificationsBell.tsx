import { useState, useRef, useEffect } from "react";
import { Link } from "react-router";
import { HeaderGlobalAction, Tag } from "@carbon/react";
import { Notification as NotificationIcon } from "@carbon/icons-react";
import {
  useMyNotifications,
  useUnreadNotificationCount,
  useMarkNotificationRead,
} from "../../queries/notifications/useNotifications";
import type { NotificationPriority } from "../../services/notifications/notification";

const PRIORITY_TAG: Record<NotificationPriority, "gray" | "warm-gray" | "red"> = {
  normal: "gray",
  important: "warm-gray",
  urgent: "red",
};

export default function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { data: unreadCount } = useUnreadNotificationCount();
  const { data: notifications } = useMyNotifications();
  const markRead = useMarkNotificationRead();

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const preview = (notifications ?? []).slice(0, 8);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <HeaderGlobalAction aria-label="Notifications" onClick={() => setOpen((o) => !o)}>
        <span style={{ position: "relative", display: "inline-flex" }}>
          <NotificationIcon size={20} className="os-header-icon" />
          {!!unreadCount && (
            <span
              style={{
                position: "absolute",
                top: -2,
                right: -2,
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                background: "#da1e28",
              }}
            />
          )}
        </span>
      </HeaderGlobalAction>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "3rem",
            right: 0,
            width: "24rem",
            maxHeight: "28rem",
            display: "flex",
            flexDirection: "column",
            background: "#ffffff",
            border: "1px solid #e0e0e0",
            boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
            zIndex: 9000,
          }}
        >
          <div style={{ padding: "0.75rem 1rem", borderBottom: "1px solid #e0e0e0", fontWeight: 600, fontSize: "0.875rem" }}>
            Notifications
          </div>
          <div style={{ overflowY: "auto", flex: 1 }}>
            {preview.length === 0 ? (
              <div style={{ padding: "1.5rem 1rem", textAlign: "center", color: "#8d8d8d", fontSize: "0.8125rem" }}>
                No notifications yet
              </div>
            ) : (
              preview.map((n) => (
                <div
                  key={n.recipient_id}
                  onClick={() => !n.is_read && markRead.mutate(n.notification_id)}
                  style={{
                    padding: "0.75rem 1rem",
                    borderBottom: "1px solid #f4f4f4",
                    cursor: n.is_read ? "default" : "pointer",
                    background: n.is_read ? "transparent" : "#edf5ff",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", marginBottom: "0.25rem" }}>
                    <span style={{ fontSize: "0.8125rem", fontWeight: 600, color: "#161616", flex: 1 }}>{n.title}</span>
                    {n.priority !== "normal" && (
                      <Tag type={PRIORITY_TAG[n.priority]} size="sm">
                        {n.priority}
                      </Tag>
                    )}
                  </div>
                  <p style={{ margin: 0, fontSize: "0.8125rem", color: "#525252", overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                    {n.message}
                  </p>
                  <p style={{ margin: "0.25rem 0 0", fontSize: "0.7rem", color: "#8d8d8d" }}>
                    {n.sender_name} &middot; {new Date(n.sent_at).toLocaleString()}
                  </p>
                </div>
              ))
            )}
          </div>
          <Link
            to="/notification-center"
            onClick={() => setOpen(false)}
            style={{
              display: "block",
              textAlign: "center",
              padding: "0.625rem",
              borderTop: "1px solid #e0e0e0",
              fontSize: "0.8125rem",
              fontWeight: 500,
              color: "#406AAF",
              textDecoration: "none",
            }}
          >
            View all
          </Link>
        </div>
      )}
    </div>
  );
}
