import Icon from "@ant-design/icons";

// Outline "window with a left panel" (antd ships no sidebar icon). The panel is filled while the
// sidebar is open and empty while it is collapsed. Inherits the button's colour via currentColor.
function PanelSvg({ open }: { open: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="1.375em" height="1.375em" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="4" width="18" height="16" rx="3" />
      <path d="M9 4v16" />
      {open && <rect x="4.6" y="5.6" width="3.2" height="12.8" rx="1.4" fill="currentColor" stroke="none" opacity={0.28} />}
    </svg>
  );
}

export default function SidebarToggleIcon({ open }: { open: boolean }) {
  return <Icon component={() => <PanelSvg open={open} />} />;
}
