import type { ComponentType } from "react";
import type { MessageKey } from "@/shared/i18n/messages/en";

export interface NavItem {
  path: string;
  label: string;
  // Set on portals that are translated; the label stays as the English fallback.
  labelKey?: MessageKey;
  Icon: ComponentType<{ className?: string }>;
  // Match the path exactly instead of by prefix ("/" always matches exactly).
  exact?: boolean;
}

export interface NavGroup {
  label: string;
  labelKey?: MessageKey;
  // Shown on the section header when the group has more than one item.
  Icon?: ComponentType<{ className?: string }>;
  items: NavItem[];
}
