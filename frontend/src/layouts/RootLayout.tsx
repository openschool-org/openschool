import { Outlet, Link } from "react-router";
import {
  Header,
  HeaderName,
  HeaderNavigation,
  HeaderMenuItem,
  HeaderGlobalBar,
  Button,
} from "@carbon/react";
import { UserDropdown, useThunderID } from "@thunderid/react";

export default function RootLayout() {
  const { getAccessToken } = useThunderID();

  const copyToken = async () => {
    const token = await getAccessToken();
    if (token) {
      navigator.clipboard.writeText(token);
    }
  };

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
          {import.meta.env.DEV && (
            <Button
              kind="primary"
              size="sm"
              onClick={copyToken}
              style={{ marginRight: "0.5rem" }}
            >
              Copy Token
            </Button>
          )}
          <UserDropdown />
        </HeaderGlobalBar>
      </Header>
      <main style={{ marginTop: "3rem" }}>
        <Outlet />
      </main>
    </>
  );
}
