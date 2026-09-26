import { Home, Notification } from "@carbon/icons-react";
import type { NavGroup } from "@/layouts/nav/types";

export const PARENT_NAV: NavGroup[] = [
  { label: "Overview", labelKey: "nav.group.overview", items: [{ path: "/", label: "My Children", labelKey: "nav.myChildren", Icon: Home }] },
  {
    label: "System",
    labelKey: "nav.group.system",
    items: [{ path: "/notification-center", label: "Notifications", labelKey: "nav.notifications", Icon: Notification }],
  },
];

export const PARENT_ALIASES: Record<string, string> = { "/p/children": "/" };
