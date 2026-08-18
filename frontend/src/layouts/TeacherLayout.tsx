// This file renders the TeacherLayout component, which provides the sidebar navigation and page shell for teachers.

import { Link, Outlet, useLocation } from "react-router";
import { Header, SideNav, SideNavItems, SideNavLink, SideNavDivider } from "@carbon/react";
import {
  Home,
  Building,
  Table,
  Renew,
  Idea,
  EventSchedule,
  Notification,
  Settings,
  Report,
} from "@carbon/icons-react";
import { AppHeaderBrand, AppHeaderActions } from "../components/AppHeaderChrome";

const NAV_GROUPS = [
  {
    label: "Overview",
    items: [{ path: "/", label: "Overview", Icon: Home, exact: true }],
  },
  {
    label: "Academics",
    items: [
      { path: "/t/classes", label: "My Classes", Icon: Building, exact: false },
      { path: "/t/timetable", label: "My Timetable", Icon: Table, exact: true },
      { path: "/t/marks", label: "Record Marks", Icon: Report, exact: false },
      { path: "/t/timetable/review", label: "Review Timetables", Icon: Renew, exact: true },
      { path: "/t/my-society", label: "My Society", Icon: Idea, exact: true },
    ],
  },
  {
    label: "Operations",
    items: [
      { path: "/t/attendance", label: "Attendance", Icon: EventSchedule, exact: false },
    ],
  },
  {
    label: "System",
    items: [
      { path: "/t/notifications", label: "Notifications", Icon: Notification, exact: true },
      { path: "/t/profile", label: "My Profile", Icon: Settings, exact: false },
    ],
  },
];

export default function TeacherLayout() {
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
