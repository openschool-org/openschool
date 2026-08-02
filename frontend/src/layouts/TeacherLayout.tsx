import { Link, Outlet, useLocation } from "react-router";
import { Header, HeaderNavigation, HeaderMenuItem } from "@carbon/react";
import { AppHeaderBrand, AppHeaderActions } from "../components/AppHeaderChrome";

const NAV = [
  { path: "/",           label: "Home",       exact: true  },
  { path: "/t/classes",  label: "My Classes", exact: false },
  { path: "/t/attendance", label: "Attendance", exact: false },
  { path: "/t/timetable", label: "My Timetable", exact: true },
  { path: "/t/timetable/review", label: "Review Timetables", exact: true },
  { path: "/t/profile",  label: "My Profile", exact: false },
];

export default function TeacherLayout() {
  const location = useLocation();

  return (
    <>
      <Header aria-label="OpenSchool">
        <AppHeaderBrand />

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

        <AppHeaderActions />
      </Header>

      <main className="os-teacher-content">
        <Outlet />
      </main>
    </>
  );
}
