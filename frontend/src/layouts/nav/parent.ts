import { BellOutlined, HomeOutlined } from "@ant-design/icons";
import type { NavGroup } from "@/layouts/nav/types";

export const PARENT_NAV: NavGroup[] = [
  { label: "Overview", labelKey: "nav.group.overview", items: [{ path: "/", label: "My children", labelKey: "nav.myChildren", Icon: HomeOutlined }] },
  {
    label: "Account",
    labelKey: "nav.group.account",
    items: [{ path: "/notification-center", label: "Notifications", labelKey: "nav.notifications", Icon: BellOutlined }],
  },
];

export const PARENT_ALIASES: Record<string, string> = { "/p/children": "/" };
