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
      // Flat surfaces (cards, buttons). Popups keep antd's default shadow (boxShadowSecondary)
      // so dropdown menus stand out from the card behind them.
      boxShadow: "none",
      controlHeight: 36,
      controlHeightLG: 40,
    },
    components: {
      // Flat buttons: no drop shadow under primary / default / danger.
      // Sidebar: white rail, dark filled pill on the active page.
      Menu: {
        itemBg: "transparent",
        itemColor: token("--os-text-secondary", "currentColor"),
        // Hover is plain CSS :hover in _layout.scss (.os-sidenav). antd's own hover colours also
        // paint the last-hovered item while the menu has focus after a click, which left a grey
        // highlight behind, so they are neutralised here.
        itemHoverColor: token("--os-text-secondary", "currentColor"),
        itemHoverBg: "transparent",
        itemActiveBg: token("--os-canvas", "transparent"),
        motionDurationFast: "0s",
        motionDurationMid: "0s",
        motionDurationSlow: "0s",
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
      // Tables sit inside rounded section cards, so the header needs no radius of its own.
      Table: {
        headerBg: token("--os-layer-hover", "transparent"),
        headerColor: token("--os-text-primary", "currentColor"),
        headerSplitColor: "transparent",
        headerBorderRadius: 0,
        rowHoverBg: token("--os-layer-hover", "transparent"),
        bodySortBg: "transparent",
        headerSortActiveBg: token("--os-layer-hover", "transparent"),
        headerSortHoverBg: token("--os-layer-hover", "transparent"),
        cellPaddingInline: 24,
        cellPaddingBlock: 12,
      },
      Card: { headerFontSize: 16 },
      // Select menus: all neutral greys, no teal. Hover is a light grey; the selected option is a
      // slightly darker grey (also while it is the highlighted one, which antd otherwise paints a
      // darker teal) plus bold text. No open/close animation.
      Select: {
        optionActiveBg: token("--os-layer-hover", "transparent"),
        optionSelectedBg: token("--os-nav-selected", "transparent"),
        controlItemBgActiveHover: token("--os-nav-selected", "transparent"),
        optionSelectedColor: token("--os-text-primary", "currentColor"),
        motionDurationFast: "0s",
        motionDurationMid: "0s",
        motionDurationSlow: "0s",
      },
      Tabs: { horizontalMargin: "0 0 16px 0" },
    },
  };
}
