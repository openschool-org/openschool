// This file renders the ParentLayout component, which provides the sidebar navigation and page shell for student guardians.

import { Link, Outlet, useLocation } from "react-router";
import { Header, SideNav, SideNavItems, SideNavLink, SideNavDivider } from "@carbon/react";
import { Home, Notification } from "@carbon/icons-react";
import { AppHeaderBrand, AppHeaderActions } from "../components/AppHeaderChrome";

const NAV_GROUPS = [
  {
    label: "Overview",
    items: [{ path: "/", label: "My Children", Icon: Home, exact: true }],
  },
  {
    label: "System",
    items: [{ path: "/notification-center", label: "Notifications", Icon: Notification, exact: false }],
  },
];

export default function ParentLayout() {
  const location = useLocation();

  return (
    <>
      <Header aria-label="OpenSchool">
        <AppHeaderBrand />
        <AppHeaderActions />
      </Header>

      <div className="os-layout">
        <aside className="os-layout__sidebar">
          <SideNav aria-label="Side navigation" isFixedNav expanded isPersistent>
            <SideNavItems>
              {NAV_GROUPS.map((group, groupIndex) => (
                <div key={group.label}>
                  {groupIndex > 0 && <SideNavDivider />}
                  <p
                    style={{
                      margin: 0,
                      padding: "0.75rem 1rem 0.25rem",
                      fontSize: "0.6875rem",
                      fontWeight: 600,
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      color: "#8d8d8d",
                    }}
                  >
                    {group.label}
                  </p>
                  {group.items.map(({ path, label, Icon, exact }) => {
                    const isActive = exact
                      ? location.pathname === path
                      : location.pathname.startsWith(path);
                    return (
                      <SideNavLink
                        key={path}
                        as={Link}
                        to={path}
                        renderIcon={Icon}
                        isActive={isActive}
                      >
                        {label}
                      </SideNavLink>
                    );
                  })}
                </div>
              ))}
            </SideNavItems>
          </SideNav>
        </aside>

        <main className="os-layout__content">
          <Outlet />
        </main>
      </div>
    </>
  );
}
