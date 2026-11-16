import { useMemo, useState } from "react";
import { Link } from "react-router";
import { Menu } from "antd";
import type { MenuProps } from "antd";
import { AppstoreOutlined } from "@ant-design/icons";
import { useQueryClient } from "@tanstack/react-query";
import { prefetchForPath } from "@/layouts/prefetchOnHover";
import type { NavGroup } from "@/layouts/nav/types";

interface Props {
  groups: NavGroup[];
  activePath?: string;
  // Icon-only rail: section pages open in a flyout and labels show as tooltips.
  collapsed?: boolean;
  "aria-label": string;
}

const STORAGE_KEY = "os.sidenav.open";
const groupKey = (label: string) => `group:${label}`;

function readStored(): string[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as string[]) : null;
  } catch {
    return null;
  }
}

function store(keys: string[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(keys));
  } catch {
    // Storage blocked (private window): open sections just reset on reload.
  }
}

// Sidebar for every portal, following antd's inline menu pattern: one-page groups are plain links,
// larger groups are collapsible sections with an icon; pages inside a section have no icon.
export default function SidebarNav({ groups, activePath, collapsed = false, "aria-label": ariaLabel }: Props) {
  const queryClient = useQueryClient();

  const activeGroup = useMemo(
    () => groups.find((g) => g.items.length > 1 && g.items.some((i) => i.path === activePath))?.label,
    [groups, activePath],
  );

  // First visit opens only the section holding the current page; after that the reader's choices are kept.
  const [openKeys, setOpenKeys] = useState<string[]>(() => readStored() ?? (activeGroup ? [groupKey(activeGroup)] : []));
  const [seenGroup, setSeenGroup] = useState(activeGroup);
  if (activeGroup !== seenGroup) {
    setSeenGroup(activeGroup);
    // Navigating into a closed section opens it, so the current page is always visible.
    if (activeGroup && !openKeys.includes(groupKey(activeGroup))) setOpenKeys([...openKeys, groupKey(activeGroup)]);
  }
  const onOpenChange = (keys: string[]) => {
    setOpenKeys(keys);
    store(keys);
  };

  const items = useMemo<MenuProps["items"]>(() => groups.map((group) => {
    const link = (path: string, label: string) => <Link to={path} onMouseEnter={() => prefetchForPath(queryClient, path)}>{label}</Link>;
    if (group.items.length === 1) {
      const { path, label, Icon } = group.items[0];
      return { key: path, icon: <Icon />, label: link(path, label) };
    }
    const GroupIcon = group.Icon ?? AppstoreOutlined;
    return {
      key: groupKey(group.label),
      icon: <GroupIcon />,
      label: group.label,
      children: group.items.map(({ path, label }) => ({ key: path, label: link(path, label) })),
    };
  }), [groups, queryClient]);

  return (
    <nav aria-label={ariaLabel} className="os-sidenav">
      {collapsed ? (
        <Menu mode="inline" inlineCollapsed items={items} selectedKeys={activePath ? [activePath] : []} />
      ) : (
        <Menu mode="inline" items={items} selectedKeys={activePath ? [activePath] : []} openKeys={openKeys} onOpenChange={onOpenChange} />
      )}
    </nav>
  );
}
