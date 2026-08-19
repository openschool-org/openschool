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
  ChartLine,
} from "@carbon/icons-react";
import { AppHeaderBrand, AppHeaderActions } from "../components/AppHeaderChrome";
import { useMyPosition } from "../queries/usePositions";

type NavItem = { path: string; label: string; Icon: typeof Home; exact: boolean };
type NavGroup = { label: string; items: NavItem[] };

// `includeReview` adds "Review Timetables" — only a Section Head can act on
// that queue (authorization is tied to the section_heads/grade_sections
// tables), so a Class or Subject Teacher just sees a permanently empty page
// and shouldn't get the nav item at all.
function teachingNavGroups(includeReview: boolean): NavGroup[] {
  return [
    {
      label: "Academics",
      items: [
        { path: "/t/classes", label: "My Classes", Icon: Building, exact: false },
        { path: "/t/timetable", label: "My Timetable", Icon: Table, exact: true },
        { path: "/t/marks", label: "Record Marks", Icon: Report, exact: false },
        ...(includeReview ? [{ path: "/t/timetable/review", label: "Review Timetables", Icon: Renew, exact: true }] : []),
        { path: "/t/my-society", label: "My Society", Icon: Idea, exact: true },
      ],
    },
    {
      label: "Operations",
      items: [{ path: "/t/attendance", label: "Attendance", Icon: EventSchedule, exact: false }],
    },
  ];
}

// Principal/Vice Principal are whole-school monitors, not classroom
// teachers (ADR 0002) — they get Analytics and every class's timetable
// instead of the teaching-specific nav above.
const LEADERSHIP_NAV_GROUPS: NavGroup[] = [
  {
    label: "School",
    items: [
      { path: "/t/analytics", label: "Analytics", Icon: ChartLine, exact: true },
      { path: "/t/all-timetables", label: "All Timetables", Icon: Table, exact: true },
    ],
  },
];

const SYSTEM_NAV_GROUP: NavGroup = {
  label: "System",
  items: [
    { path: "/t/notifications", label: "Notifications", Icon: Notification, exact: true },
    { path: "/t/profile", label: "My Profile", Icon: Settings, exact: false },
  ],
};

// Principal=1, Vice Principal=2, Section Head=3 — matches backend's
// PositionRank ordinal (see LEADERSHIP_RANK_CUTOFF in TeacherDashboard.tsx
// for the broader Section-Head-and-above cutoff used there).
const LEADERSHIP_TOP_RANK_CUTOFF = 2;
const RANK_SECTION_HEAD = 3;

export default function TeacherLayout() {
  const location = useLocation();
  const { data: position } = useMyPosition();
  const isLeadership = !!position && position.rank <= LEADERSHIP_TOP_RANK_CUTOFF;
  const isSectionHead = position?.rank === RANK_SECTION_HEAD;

  const navGroups: NavGroup[] = [
    { label: "Overview", items: [{ path: "/", label: "Overview", Icon: Home, exact: true }] },
    ...(isLeadership ? LEADERSHIP_NAV_GROUPS : teachingNavGroups(isSectionHead)),
    SYSTEM_NAV_GROUP,
  ];

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
              {navGroups.map((group, groupIndex) => (
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
