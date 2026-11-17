// Class names for the shell layout. Drawer mode overlays the sidebar; on desktop it is expanded or a rail.
export function shellClasses({ isDrawer, showTabs, rail, open }: { isDrawer: boolean; showTabs: boolean; rail: boolean; open: boolean }) {
  const hidden = !open && !rail;
  return {
    layout: ["os-layout", isDrawer && "is-drawer", showTabs && "has-bottom-tabs"].filter(Boolean).join(" "),
    sidebar: ["os-layout__sidebar", rail ? "is-rail" : open ? "" : "is-collapsed"].filter(Boolean).join(" "),
    content: ["os-layout__content", rail ? "is-rail" : open && !isDrawer ? "" : "is-expanded"].filter(Boolean).join(" "),
    // A closed sidebar is hidden from screen readers and keyboard focus.
    hidden: hidden || undefined,
  };
}
