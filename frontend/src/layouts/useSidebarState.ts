import { useEffect, useState } from "react";

const RAIL_KEY = "os.sidenav.rail";

function readRail(): boolean {
  try {
    return localStorage.getItem(RAIL_KEY) === "1";
  } catch {
    return false;
  }
}

// Sidebar state for the shell. On desktop it is expanded or an icon rail, remembered across reloads.
// In drawer mode it opens over the page and closes on navigation or Escape.
export function useSidebarState(isDrawer: boolean, pathname: string) {
  const [expanded, setExpanded] = useState(() => !readRail());
  // The drawer remembers the route it was opened on, so navigating closes it.
  const [drawerOpenAt, setDrawerOpenAt] = useState<string | null>(null);
  const drawerOpen = drawerOpenAt === pathname;

  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setDrawerOpenAt(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawerOpen]);

  const toggle = () => {
    if (isDrawer) return setDrawerOpenAt(drawerOpen ? null : pathname);
    const next = !expanded;
    setExpanded(next);
    try {
      localStorage.setItem(RAIL_KEY, next ? "0" : "1");
    } catch {
      // Storage blocked: the choice just resets on reload.
    }
  };

  return {
    expanded,
    drawerOpen,
    open: isDrawer ? drawerOpen : expanded,
    rail: !isDrawer && !expanded,
    toggle,
    closeDrawer: () => setDrawerOpenAt(null),
  };
}
