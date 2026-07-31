import { Link, Outlet, useLocation } from "react-router";
import { Header, HeaderNavigation, HeaderMenuItem } from "@carbon/react";
import { AppHeaderBrand, AppHeaderActions } from "../components/AppHeaderChrome";

const NAV = [{ path: "/", label: "My Children", exact: true }];

export default function ParentLayout() {
  const location = useLocation();

  return (
    <>
      <Header aria-label="OpenSchool">
        <AppHeaderBrand />

        <HeaderNavigation aria-label="Parent navigation">
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
