import { Suspense, useEffect, useMemo, useState } from "react";
import { Link, Outlet, useLocation } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Header, HeaderMenuButton, SideNav, SideNavItems, SideNavLink, SideNavDivider } from "@carbon/react";
import { AppHeaderBrand, AppHeaderActions } from "@/layouts/AppHeaderChrome";
import Breadcrumbs from "@/layouts/Breadcrumbs";
import BottomTabBar from "@/layouts/BottomTabBar";
import { matchNav, leafLabel } from "@/layouts/navMatch";
import RouteErrorBoundary from "@/shared/ui/RouteErrorBoundary";
import { ContentSkeleton } from "@/shared/ui/SkeletonShell";
import ToastStack from "@/shared/ui/toast/ToastStack";
import OfflineBanner from "@/shared/ui/OfflineBanner";
import { PageTitleContext } from "@/shared/hooks/usePageTitle";
import { useMediaQuery, DRAWER_QUERY, PHONE_QUERY } from "@/shared/hooks/useMediaQuery";
import { prefetchForPath } from "@/layouts/prefetchOnHover";
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
  const queryClient = useQueryClient();
  const isDrawer = useMediaQuery(DRAWER_QUERY);
  const isPhone = useMediaQuery(PHONE_QUERY);
  const [expanded, setExpanded] = useState(true);
  // The drawer remembers the route it was opened on, so navigating closes it.
  const [drawerOpenAt, setDrawerOpenAt] = useState<string | null>(null);
  const drawerOpen = drawerOpenAt === pathname;
  const setDrawerOpen = (open: boolean) => setDrawerOpenAt(open ? pathname : null);
  const [titleOverride, setTitleOverride] = useState<string | null>(null);

  const { item: active, nested } = matchNav(pathname, navGroups, navAliases);
  const pageLabel = nested ? titleOverride ?? leafLabel(pathname, t) : titleOverride ?? active?.label;
  const sidebarOpen = isDrawer ? drawerOpen : expanded;
  const showTabs = bottomTabs && isPhone;

  useEffect(() => {
    document.title = pageLabel ? `${pageLabel} · OpenSchool` : "OpenSchool";
  }, [pageLabel]);

  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setDrawerOpenAt(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawerOpen]);

  const toggle = () => (isDrawer ? setDrawerOpen(!drawerOpen) : setExpanded((v) => !v));

  return (
    <PageTitleContext.Provider value={setTitleOverride}>
      <a href="#main-content" className="os-skip-link">{t("shell.skip")}</a>
      <ToastStack />
      <Header aria-label="OpenSchool">
        <HeaderMenuButton
          aria-label={sidebarOpen ? t("shell.closeMenu") : t("shell.openMenu")}
          onClick={toggle}
          isActive={sidebarOpen}
          aria-expanded={sidebarOpen}
          isCollapsible
        />
        <AppHeaderBrand />
        <AppHeaderActions showSearch={showSearch} showLanguage={showLanguage} />
      </Header>

      <div className={`os-layout${isDrawer ? " is-drawer" : ""}${showTabs ? " has-bottom-tabs" : ""}`}>
        {isDrawer && drawerOpen && <div className="os-layout__scrim" onClick={() => setDrawerOpen(false)} aria-hidden="true" />}
        <aside className={`os-layout__sidebar${sidebarOpen ? "" : " is-collapsed"}`} aria-hidden={!sidebarOpen || undefined} inert={!sidebarOpen || undefined}>
          <SideNav aria-label={t("shell.sideNav")} isFixedNav expanded={sidebarOpen} isPersistent>
            <SideNavItems>
              {navGroups.map((group, i) => (
                <div key={group.label}>
                  {i > 0 && <SideNavDivider />}
                  <p className="os-nav-group__label">{group.label}</p>
                  {group.items.map(({ path, label, Icon }) => (
                    <SideNavLink
                      key={path}
                      as={Link}
                      to={path}
                      renderIcon={Icon}
                      isActive={active?.path === path}
                      onMouseEnter={() => prefetchForPath(queryClient, path)}
                    >
                      {label}
                    </SideNavLink>
                  ))}
                </div>
              ))}
            </SideNavItems>
          </SideNav>
        </aside>

        <main id="main-content" tabIndex={-1} className={`os-layout__content${sidebarOpen && !isDrawer ? "" : " is-expanded"}`}>
          <OfflineBanner />
          {nested && active && pageLabel && <Breadcrumbs parent={active} current={pageLabel} />}
          <RouteErrorBoundary>
            <Suspense fallback={<ContentSkeleton />}>
              <Outlet />
            </Suspense>
          </RouteErrorBoundary>
        </main>
      </div>
      {showTabs && <BottomTabBar items={navGroups.flatMap((g) => g.items).slice(0, 4)} activePath={active?.path} />}
    </PageTitleContext.Provider>
  );
}
