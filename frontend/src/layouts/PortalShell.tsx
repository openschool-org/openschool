import { Suspense, useEffect, useMemo, useState } from "react";
import { Outlet, useLocation } from "react-router";
import { Button } from "antd";
import { CloseOutlined, MenuOutlined } from "@ant-design/icons";
import SidebarToggleIcon from "@/layouts/SidebarToggleIcon";
import SidebarNav from "@/layouts/SidebarNav";
import { AppHeaderBrand, AppHeaderActions } from "@/layouts/AppHeaderChrome";
import Breadcrumbs from "@/layouts/Breadcrumbs";
import BottomTabBar from "@/layouts/BottomTabBar";
import { matchNav, leafLabel } from "@/layouts/navMatch";
import { useSidebarState } from "@/layouts/useSidebarState";
import { shellClasses } from "@/layouts/shellClasses";
import RouteErrorBoundary from "@/shared/ui/RouteErrorBoundary";
import { DelayedContentSkeleton } from "@/shared/ui/SkeletonShell";
import ToastStack from "@/shared/ui/toast/ToastStack";
import OfflineBanner from "@/shared/ui/OfflineBanner";
import { PageTitleContext } from "@/shared/hooks/usePageTitle";
import { useMediaQuery, DRAWER_QUERY, PHONE_QUERY } from "@/shared/hooks/useMediaQuery";
import type { NavGroup } from "@/layouts/nav/types";
import { useT } from "@/shared/i18n/useT";
import type { Translate } from "@/shared/i18n/i18nContext";

function translateNav(groups: NavGroup[], t: Translate): NavGroup[] {
  return groups.map((g) => ({
    ...g,
    label: g.labelKey ? t(g.labelKey) : g.label,
    items: g.items.map((i) => ({ ...i, label: i.labelKey ? t(i.labelKey) : i.label })),
  }));
}

interface Props {
  navGroups: NavGroup[];
  showSearch?: boolean;
  // Routes outside the nav mapped to the nav page that owns them.
  navAliases?: Record<string, string>;
  // Student and parent portals get a bottom tab bar on phones and a language switch.
  bottomTabs?: boolean;
  showLanguage?: boolean;
}

// Header, sidebar and content area shared by every portal.
export default function PortalShell({ navGroups: rawGroups, showSearch = false, navAliases, bottomTabs = false, showLanguage = false }: Props) {
  const { pathname } = useLocation();
  const { t } = useT();
  const navGroups = useMemo(() => translateNav(rawGroups, t), [rawGroups, t]);
  const isDrawer = useMediaQuery(DRAWER_QUERY);
  const isPhone = useMediaQuery(PHONE_QUERY);
  const sidebar = useSidebarState(isDrawer, pathname);
  const [titleOverride, setTitleOverride] = useState<string | null>(null);

  const { item: active, nested } = matchNav(pathname, navGroups, navAliases);
  const pageLabel = nested ? titleOverride ?? leafLabel(pathname, t) : titleOverride ?? active?.label;
  const { open: sidebarOpen, rail, drawerOpen } = sidebar;
  const showTabs = bottomTabs && isPhone;
  const classes = shellClasses({ isDrawer, showTabs, rail, open: sidebarOpen });

  useEffect(() => {
    document.title = pageLabel ? `${pageLabel} · OpenSchool` : "OpenSchool";
  }, [pageLabel]);

  const toggleIcon = isDrawer ? (drawerOpen ? <CloseOutlined /> : <MenuOutlined />) : <SidebarToggleIcon open={sidebar.expanded} />;

  return (
    <PageTitleContext.Provider value={setTitleOverride}>
      <a href="#main-content" className="os-skip-link">{t("shell.skip")}</a>
      <ToastStack />
      <header className="os-topbar" aria-label="OpenSchool">
        <Button
          type="text"
          shape="circle"
          className="os-sidebar-toggle"
          aria-label={sidebarOpen ? t("shell.closeMenu") : t("shell.openMenu")}
          aria-expanded={sidebarOpen}
          icon={toggleIcon}
          onClick={sidebar.toggle}
        />
        <AppHeaderBrand />
        <AppHeaderActions showSearch={showSearch} showLanguage={showLanguage} />
      </header>

      <div className={classes.layout}>
        {isDrawer && drawerOpen && <div className="os-layout__scrim" onClick={sidebar.closeDrawer} aria-hidden="true" />}
        <aside
          className={classes.sidebar}
          aria-hidden={classes.hidden}
          inert={classes.hidden}
        >
          <SidebarNav groups={navGroups} activePath={active?.path} collapsed={rail} aria-label={t("shell.sideNav")} />
        </aside>

        <main id="main-content" tabIndex={-1} className={classes.content}>
          <OfflineBanner />
          {nested && active && pageLabel && <Breadcrumbs parent={active} current={pageLabel} />}
          <RouteErrorBoundary>
            <Suspense fallback={<DelayedContentSkeleton />}>
              <Outlet />
            </Suspense>
          </RouteErrorBoundary>
        </main>
      </div>
      {showTabs && <BottomTabBar items={navGroups.flatMap((g) => g.items).slice(0, 4)} activePath={active?.path} />}
    </PageTitleContext.Provider>
  );
}
