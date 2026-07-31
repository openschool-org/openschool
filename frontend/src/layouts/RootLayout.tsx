import { Outlet, Link, useLocation, Navigate } from "react-router";
import {
  Header,
  HeaderName,
  HeaderGlobalBar,
  HeaderGlobalAction,
  SideNav,
  SideNavItems,
  SideNavLink,
  SideNavDivider,
} from "@carbon/react";
import { Search } from "@carbon/icons-react";
import {
  Dashboard,
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
  Trophy,
} from "@carbon/icons-react";
import { UserDropdown, useThunderID } from "@thunderid/react";
import { AxiosError } from "axios";
import { useSchool } from "../queries/useSchool";

// Grouped so the sidebar reads as "who, what, when" instead of one flat
// alphabet-soup list — each group gets a small uppercase label + divider.
const NAV_GROUPS: { label: string; items: { path: string; label: string; Icon: typeof Dashboard }[] }[] = [
  {
    label: "Overview",
    items: [{ path: "/", label: "Dashboard", Icon: Dashboard }],
  },
  {
    label: "People",
    items: [
      { path: "/students", label: "Students", Icon: UserMultiple },
      { path: "/teachers", label: "Teachers", Icon: Education },
      { path: "/prefects", label: "School Prefects", Icon: Trophy },
    ],
  },
  {
    label: "Academics",
    items: [
      { path: "/classes", label: "Classes", Icon: Building },
      { path: "/streams", label: "Streams & Section Heads", Icon: UserFollow },
      { path: "/grades", label: "Grades", Icon: Grid },
      { path: "/subjects", label: "Subjects", Icon: Book },
      { path: "/curriculum", label: "Curriculum", Icon: Layers },
      { path: "/mediums", label: "Mediums", Icon: Language },
    ],
  },
  {
    label: "Operations",
    items: [
      { path: "/attendance", label: "Attendance", Icon: EventSchedule },
      { path: "/academic-years", label: "Academic Years", Icon: Calendar },
      { path: "/notifications", label: "Notifications", Icon: Notification },
    ],
  },
  {
    label: "System",
    items: [{ path: "/settings", label: "Settings", Icon: Settings }],
  },
];

export default function RootLayout() {
  const { getAccessToken } = useThunderID();
  const location = useLocation();

  const { isLoading: schoolLoading, error: schoolError } = useSchool();
  const noSchoolYet = schoolError instanceof AxiosError && schoolError.response?.status === 404;

  const copyToken = async () => {
    const token = await getAccessToken();
    if (token) navigator.clipboard.writeText(token);
  };

  if (!schoolLoading && noSchoolYet && location.pathname !== "/school-setup") {
    return <Navigate to="/school-setup" replace />;
  }

  return (
    <>
      <Header aria-label="OpenSchool">
        <HeaderName
          as={Link}
          to="/"
          prefix=""
          style={{ fontSize: "1.25rem", fontWeight: 500, letterSpacing: "0.01em" }}
        >
          <span style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                background: "#f4f4f4",
                borderRadius: "6px",
                padding: "3px",
                flexShrink: 0,
              }}
            >
              <img src="/favicon.webp" alt="" width={20} height={20} style={{ display: "block" }} />
            </span>
            <span>
              Open<span style={{ color: "#FF6F1B" }}>School</span>
            </span>
          </span>
        </HeaderName>
        <HeaderGlobalBar>
          <HeaderGlobalAction aria-label="Search">
            <Search size={20} style={{ fill: "#ffffff" }} />
          </HeaderGlobalAction>
          {import.meta.env.DEV && (
            <HeaderGlobalAction
              aria-label="Copy access token (dev)"
              onClick={copyToken}
            >
              <span style={{ fontSize: "0.75rem", fontWeight: 600, padding: "0 6px", color: "#ffffff", whiteSpace: "nowrap" }}>
                Copy Token
              </span>
            </HeaderGlobalAction>
          )}
          <UserDropdown />
        </HeaderGlobalBar>
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
