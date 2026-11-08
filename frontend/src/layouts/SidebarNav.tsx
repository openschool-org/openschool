import { useMemo } from "react";
import { Link } from "react-router";
import { Menu } from "antd";
import type { MenuProps } from "antd";
import { useQueryClient } from "@tanstack/react-query";
import { prefetchForPath } from "@/layouts/prefetchOnHover";
import type { NavGroup } from "@/layouts/nav/types";

interface Props {
  groups: NavGroup[];
  activePath?: string;
  "aria-label": string;
}

// Sidebar navigation for every portal: grouped links, the active page highlighted.
export default function SidebarNav({ groups, activePath, "aria-label": ariaLabel }: Props) {
  const queryClient = useQueryClient();

  const items = useMemo<MenuProps["items"]>(() => groups.map((group) => {
    const children = group.items.map(({ path, label, Icon }) => ({
      key: path,
      icon: <Icon size={18} />,
      label: <Link to={path} onMouseEnter={() => prefetchForPath(queryClient, path)}>{label}</Link>,
    }));
    // A group holding one item of the same name (Overview) needs no heading.
    const redundant = group.items.length === 1 && group.items[0].label === group.label;
    return redundant ? children[0] : { type: "group" as const, key: group.label, label: group.label, children };
  }), [groups, queryClient]);

  return (
    <nav aria-label={ariaLabel} className="os-sidenav">
      <Menu mode="inline" items={items} selectedKeys={activePath ? [activePath] : []} />
    </nav>
  );
}
