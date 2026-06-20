import { Outlet, Link } from "react-router";
import {
  Header,
  HeaderName,
  HeaderGlobalBar,
  HeaderGlobalAction,
} from "@carbon/react";
import { Notification, UserAvatar, Settings } from "@carbon/icons-react";

export default function RootLayout() {
  return (
    <>
      <Header aria-label="OpenSchool">
        <HeaderName as={Link} to="/" prefix="">
          OpenSchool
        </HeaderName>
        <HeaderGlobalBar>
          <HeaderGlobalAction aria-label="Notifications">
            <Notification size={20} />
          </HeaderGlobalAction>
          <HeaderGlobalAction aria-label="Settings">
            <Settings size={20} />
          </HeaderGlobalAction>
          <HeaderGlobalAction aria-label="User">
            <UserAvatar size={20} />
          </HeaderGlobalAction>
        </HeaderGlobalBar>
      </Header>
      <main style={{ marginTop: "3rem" }}>
        <Outlet />
      </main>
    </>
  );
}
