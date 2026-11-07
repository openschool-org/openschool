import type { ThemeConfig } from "antd";

// Ant Design needs concrete colour strings (it derives hover/active shades
// from them), but colours are only ever defined in _tokens.scss. So read the
// --os-* custom properties that file publishes on :root instead of repeating
// hex values here.
function token(name: string, fallback: string): string {
  if (typeof document === "undefined") return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

export function buildAntdTheme(): ThemeConfig {
  return {
    cssVar: { key: "os" },
    token: {
      colorPrimary: token("--os-accent", "currentColor"),
      colorSuccess: token("--os-success", "currentColor"),
      colorWarning: token("--os-warning", "currentColor"),
      colorError: token("--os-danger", "currentColor"),
      colorInfo: token("--os-accent", "currentColor"),
      colorTextBase: token("--os-text-primary", "currentColor"),
      colorBgLayout: token("--os-canvas", "transparent"),
      colorBgContainer: token("--os-layer", "transparent"),
      colorBorder: token("--os-border-strong", "currentColor"),
      colorBorderSecondary: token("--os-border-subtle", "currentColor"),
      fontFamily: "inherit",
      // Popups (dropdowns, popovers, modals) must sit above the fixed top bar (z-index 8000) and
      // below the toast stack (9500).
      zIndexPopupBase: 9000,
      // Keep motion, but short and subtle.
      motionDurationFast: "0.08s",
      motionDurationMid: "0.12s",
      motionDurationSlow: "0.16s",
      // Focus shows the coloured border ring only, no glow around it.
      controlOutline: "transparent",
      controlOutlineWidth: 0,
      fontSize: 14,
      fontWeightStrong: 500,
      borderRadius: 8,
      boxShadow: "none",
      boxShadowSecondary: "none",
      controlHeightLG: 40,
    },
    components: {
      // Flat buttons: no drop shadow under primary / default / danger.
      // Sidebar: white rail, dark filled pill on the active page.
      Menu: {
        itemBg: "transparent",
        itemColor: token("--os-text-secondary", "currentColor"),
        itemHoverColor: token("--os-text-primary", "currentColor"),
        itemHoverBg: token("--os-canvas", "transparent"),
        itemSelectedColor: token("--os-layer", "currentColor"),
        itemSelectedBg: token("--os-accent-deeper", "transparent"),
        groupTitleColor: token("--os-text-tertiary", "currentColor"),
        groupTitleFontSize: 12,
        itemHeight: 38,
        itemMarginInline: 12,
        itemBorderRadius: 8,
        iconSize: 18,
        fontSize: 14,
        activeBarBorderWidth: 0,
      },
      Button: { primaryShadow: "none", defaultShadow: "none", dangerShadow: "none", fontWeight: 500 },
    },
  };
}
