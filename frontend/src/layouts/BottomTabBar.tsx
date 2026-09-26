import { Link } from "react-router";
import type { NavItem } from "@/layouts/nav/types";
import { useT } from "@/shared/i18n/useT";

interface Props {
  items: NavItem[];
  activePath: string | undefined;
}

// Thumb-reachable tabs for the most used student and parent pages on phones.
export default function BottomTabBar({ items, activePath }: Props) {
  const { t } = useT();
  return (
    <nav aria-label={t("shell.quickNav")} className="os-bottom-tabs">
      {items.map(({ path, label, Icon }) => (
        <Link key={path} to={path} className={`os-bottom-tabs__item${path === activePath ? " is-active" : ""}`} aria-current={path === activePath ? "page" : undefined}>
          <Icon size={20} />
          <span>{label}</span>
        </Link>
      ))}
    </nav>
  );
}
