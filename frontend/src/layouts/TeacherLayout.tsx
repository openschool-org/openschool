import { Outlet, Link, useLocation } from "react-router";
import {
  Header,
  HeaderName,
  HeaderNavigation,
  HeaderMenuItem,
  HeaderGlobalBar,
  HeaderGlobalAction,
} from "@carbon/react";
import { Search } from "@carbon/icons-react";
import { UserDropdown, useThunderID } from "@thunderid/react";

const NAV = [
  { path: "/",           label: "Home",       exact: true  },
  { path: "/t/classes",  label: "My Classes", exact: false },
  { path: "/t/attendance", label: "Attendance", exact: false },
  { path: "/t/profile",  label: "My Profile", exact: false },
];

export default function TeacherLayout() {
  const { getAccessToken } = useThunderID();
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

        <HeaderNavigation aria-label="Teacher navigation">
          {NAV.map(({ path, label, exact }) => {
            const isActive = exact
              ? location.pathname === path
              : location.pathname.startsWith(path);
            return (
              <HeaderMenuItem
                key={path}
                as={Link}
                to={path}
                className={isActive ? "os-header-nav--active" : ""}
              >
                {label}
              </HeaderMenuItem>
            );
          })}
        </HeaderNavigation>

        <HeaderGlobalBar>
          <HeaderGlobalAction aria-label="Search">
            <Search size={20} style={{ fill: "#ffffff" }} />
          </HeaderGlobalAction>
          {import.meta.env.DEV && (
            <HeaderGlobalAction aria-label="Copy access token (dev)" onClick={copyToken}>
              <span style={{ fontSize: "0.75rem", fontWeight: 600, padding: "0 6px", color: "#ffffff", whiteSpace: "nowrap" }}>
                Copy Token
              </span>
            </HeaderGlobalAction>
          )}
          <UserDropdown />
        </HeaderGlobalBar>
      </Header>

      <main className="os-teacher-content">
        <Outlet />
      </main>
    </>
  );
}
