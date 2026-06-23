import { Outlet, Link } from "react-router";
import {
  Header,
  HeaderName,
  HeaderNavigation,
  HeaderMenuItem,
  HeaderGlobalBar,
} from "@carbon/react";

import { UserDropdown } from "@thunderid/react";

export default function RootLayout() {
  return (
    <>
      <Header aria-label="OpenSchool">
        <HeaderName as={Link} to="/" prefix="">
          OpenSchool
        </HeaderName>
        <HeaderNavigation aria-label="OpenSchool">
          <HeaderMenuItem as={Link} to="/showcase">
            Showcase
          </HeaderMenuItem>
        </HeaderNavigation>
        <HeaderGlobalBar>
          <UserDropdown />
        </HeaderGlobalBar>
      </Header>
      <main style={{ marginTop: "3rem" }}>
        <Outlet />
      </main>
    </>
  );
}
