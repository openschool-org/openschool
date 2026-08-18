// This file renders the StudentLayout component, which provides the sidebar navigation and page shell for student users.

import { Link, Outlet, useLocation } from "react-router";
import { Header, SideNav, SideNavItems, SideNavLink, SideNavDivider } from "@carbon/react";
import { Home, Notification, EventSchedule, Report, Table, UserMultiple, Document, Idea } from "@carbon/icons-react";
import { AppHeaderBrand, AppHeaderActions } from "../components/AppHeaderChrome";

const NAV_GROUPS = [
  {
    label: "Overview",
    items: [{ path: "/", label: "Dashboard", Icon: Home, exact: true }],
  },
  {
    label: "Academics",
    items: [
      { path: "/s/attendance", label: "Attendance", Icon: EventSchedule, exact: false },
      { path: "/s/marks", label: "Marks", Icon: Report, exact: false },
      { path: "/s/timetable", label: "Timetable", Icon: Table, exact: false },
      { path: "/s/enrollment", label: "Subject Enrollment", Icon: Document, exact: false },
    ],
  },
  {
    label: "Portfolio",
    items: [
      { path: "/s/progress", label: "Progress Reports", Icon: Report, exact: false },
      { path: "/s/portfolio", label: "Activities & Leadership", Icon: Idea, exact: false },
      { path: "/s/guardians", label: "My Guardians", Icon: UserMultiple, exact: false },
    ],
  },
  {
    label: "System",
    items: [{ path: "/notification-center", label: "Notifications", Icon: Notification, exact: false }],
  },
];

export default function StudentLayout() {
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
