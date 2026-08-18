// This file renders the header brand and actions toolbar components (AppHeaderBrand and AppHeaderActions) used in the application's global layout.

import { useState } from "react";
import { Link } from "react-router";
import { HeaderName, HeaderGlobalBar, HeaderGlobalAction, OverflowMenu, OverflowMenuItem } from "@carbon/react";
import { Password, User, Search } from "@carbon/icons-react";
import { UserDropdown } from "@thunderid/react";
import NotificationsBell from "./common/NotificationsBell";
import ChangePasswordModal from "./common/ChangePasswordModal";
import GlobalSearch from "./common/GlobalSearch";

export function AppHeaderBrand() {
  return (
    <HeaderName as={Link} to="/" prefix="" className="os-header-brand">
      <span className="os-header-brand__inner">
        <span className="os-header-brand__logo">
          <img src="/w-favicon.webp" alt="" width={20} height={20} />
        </span>
        <span>OpenSchool</span>
      </span>
    </HeaderName>
  );
}

export function AppHeaderActions() {
  const [changingPassword, setChangingPassword] = useState(false);
  const [searchExpanded, setSearchExpanded] = useState(false);

  return (
    <HeaderGlobalBar style={{ display: "flex", alignItems: "center" }}>
      {searchExpanded ? (
        <GlobalSearch autoFocus onClose={() => setSearchExpanded(false)} />
      ) : (
        <HeaderGlobalAction
          aria-label="Search"
          onClick={() => setSearchExpanded(true)}
        >
          <Search size={20} className="os-header-icon" />
        </HeaderGlobalAction>
      )}
      <HeaderGlobalAction aria-label="Change password" onClick={() => setChangingPassword(true)}>
        <Password size={20} className="os-header-icon" />
      </HeaderGlobalAction>
      <NotificationsBell />
      <UserDropdown>
        {({ openProfile, signOut }) => (
          <OverflowMenu
            renderIcon={User}
            aria-label="User profile menu"
            flipped
            className="os-header-user-menu"
          >
            <OverflowMenuItem
              itemText="Manage Profile"
              onClick={openProfile}
            />
            <OverflowMenuItem
              itemText="Sign Out"
              onClick={signOut}
              isDelete
            />
          </OverflowMenu>
        )}
      </UserDropdown>
      {changingPassword && (
        <ChangePasswordModal onClose={() => setChangingPassword(false)} />
      )}
    </HeaderGlobalBar>
  );
}
