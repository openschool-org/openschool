import { Outlet, Link, useLocation } from "react-router";
import {
  Header,
  HeaderName,
  HeaderGlobalBar,
  HeaderGlobalAction,
  SideNav,
  SideNavItems,
  SideNavLink,
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
} from "@carbon/icons-react";
import { UserDropdown, useAsgardeo } from "@asgardeo/react";

const NAV_ITEMS = [
  { path: "/", label: "Dashboard", Icon: Dashboard },
  { path: "/students", label: "Students", Icon: UserMultiple },
  { path: "/teachers", label: "Teachers", Icon: Education },
  { path: "/classes", label: "Classes", Icon: Building },
  { path: "/grades", label: "Grades", Icon: Grid },
  { path: "/subjects", label: "Subjects", Icon: Book },
  { path: "/curriculum", label: "Curriculum", Icon: Layers },
  { path: "/mediums", label: "Mediums", Icon: Language },
  { path: "/attendance", label: "Attendance", Icon: EventSchedule },
  { path: "/academic-years", label: "Academic Years", Icon: Calendar },
  { path: "/notifications", label: "Notifications", Icon: Notification },
  { path: "/settings", label: "Settings", Icon: Settings },
];

export default function RootLayout() {
  const { getAccessToken } = useAsgardeo();
  const location = useLocation();

  const copyToken = async () => {
    const token = await getAccessToken();
    if (token) navigator.clipboard.writeText(token);
  };

  return (
    <>
      <Header aria-label="OpenSchool">
        <HeaderName as={Link} to="/" prefix="" style={{ fontSize: "1.25rem", fontWeight: 500, letterSpacing: "0.01em" }}>
          OpenSchool
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
              {NAV_ITEMS.map(({ path, label, Icon }) => {
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
