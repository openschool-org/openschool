import { useState, useRef, useEffect } from "react";
import { HeaderGlobalAction } from "@carbon/react";
import { Notification as NotificationIcon } from "@carbon/icons-react";
import { useNotifications, useUnreadNotificationCount, useMarkNotificationRead } from "../../queries/notifications/useNotifications";

export default function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { data: unreadCount } = useUnreadNotificationCount();
  const { data: notifications } = useNotifications();
  const markRead = useMarkNotificationRead();

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

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
            width: "22rem",
            maxHeight: "24rem",
            overflowY: "auto",
            background: "#ffffff",
            border: "1px solid #e0e0e0",
            boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
            zIndex: 9000,
          }}
        >
          <div style={{ padding: "0.75rem 1rem", borderBottom: "1px solid #e0e0e0", fontWeight: 600, fontSize: "0.875rem" }}>
            Timetable Notifications
          </div>
          {!notifications || notifications.length === 0 ? (
            <div style={{ padding: "1.5rem 1rem", textAlign: "center", color: "#8d8d8d", fontSize: "0.8125rem" }}>
              No notifications yet
            </div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                onClick={() => !n.is_read && markRead.mutate(n.id)}
                style={{
                  padding: "0.75rem 1rem",
                  borderBottom: "1px solid #f4f4f4",
                  cursor: n.is_read ? "default" : "pointer",
                  background: n.is_read ? "transparent" : "#edf5ff",
                }}
              >
                <p style={{ margin: 0, fontSize: "0.8125rem", color: "#161616" }}>{n.message}</p>
                <p style={{ margin: "0.25rem 0 0", fontSize: "0.7rem", color: "#8d8d8d" }}>
                  {new Date(n.created_at).toLocaleString()}
                </p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
