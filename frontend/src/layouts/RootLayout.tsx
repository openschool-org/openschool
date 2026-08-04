import { Outlet, Link, useLocation, Navigate } from "react-router";
import {
  Header,
  SideNav,
  SideNavItems,
  SideNavLink,
  SideNavDivider,
} from "@carbon/react";
import {
  Dashboard,
  Home,
  UserMultiple,
  Education,
  Building,
  Book,
  Grid,
  Layers,
  Language,
  EventSchedule,
  Settings,
  Calendar,
  Notification,
  UserFollow,
  UserAdmin,
  UserRole,
  Trophy,
  Renew,
  Table,
  Category,
  Location,
  Rule,
  SettingsAdjust,
} from "@carbon/icons-react";
import { AxiosError } from "axios";
import { useSchool } from "../queries/useSchool";
import {
  AppHeaderBrand,
  AppHeaderActions,
} from "../components/AppHeaderChrome";

// Grouped so the sidebar reads as "who, what, when" instead of one flat
// alphabet-soup list — each group gets a small uppercase label + divider.
const NAV_GROUPS: {
  label: string;
  items: { path: string; label: string; Icon: typeof Dashboard }[];
}[] = [
  {
    label: "Overview",
    items: [{ path: "/", label: "Overview", Icon: Home }],
  },
  {
    label: "People",
    items: [
      { path: "/students", label: "Students", Icon: UserMultiple },
      { path: "/guardians", label: "Guardians", Icon: UserAdmin },
      { path: "/teachers", label: "Teachers", Icon: Education },
      { path: "/prefects", label: "School Prefects", Icon: Trophy },
      { path: "/positions", label: "Leadership Positions", Icon: UserRole },
    ],
  },
  {
    label: "Academics",
    items: [
      { path: "/classes", label: "Classes", Icon: Building },
      { path: "/streams", label: "Streams", Icon: UserFollow },
      { path: "/grades", label: "Grades", Icon: Grid },
      { path: "/subjects", label: "Subjects", Icon: Book },
      { path: "/curriculum", label: "Curriculum", Icon: Layers },
      { path: "/mediums", label: "Mediums", Icon: Language },
    ],
  },
  {
    label: "Scheduling",
    items: [
      { path: "/timetables", label: "Timetables", Icon: Table },
      { path: "/grade-sections", label: "Grade Sections", Icon: Category },
      { path: "/classrooms", label: "Classrooms", Icon: Location },
      { path: "/subject-requirements", label: "Subject Requirements", Icon: Rule },
      { path: "/timetable-settings", label: "Timetable Settings", Icon: SettingsAdjust },
    ],
  },
  {
    label: "Operations",
    items: [
      { path: "/attendance", label: "Attendance", Icon: EventSchedule },
      { path: "/academic-years", label: "Academic Years", Icon: Calendar },
      { path: "/promotion", label: "Promotion", Icon: Renew },
      { path: "/notifications", label: "Notifications", Icon: Notification },
    ],
  },
  {
    label: "System",
    items: [{ path: "/settings", label: "Settings", Icon: Settings }],
  },
];

export default function RootLayout() {
  const location = useLocation();

  const { isLoading: schoolLoading, error: schoolError } = useSchool();
  const noSchoolYet =
    schoolError instanceof AxiosError && schoolError.response?.status === 404;

  if (!schoolLoading && noSchoolYet && location.pathname !== "/school-setup") {
    return <Navigate to="/school-setup" replace />;
  }

  return (
    <>
      <Header aria-label="OpenSchool">
        <AppHeaderBrand />
        <AppHeaderActions />
      </Header>

      <div className="os-layout">
        <aside className="os-layout__sidebar">
          <SideNav
            aria-label="Side navigation"
            isFixedNav
            expanded
            isPersistent
          >
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
                  {group.items.map(({ path, label, Icon }) => {
                    const isActive =
                      path === "/"
                        ? location.pathname === "/"
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
