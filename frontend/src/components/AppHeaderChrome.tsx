import { useState } from "react";
import { Link } from "react-router";
import { HeaderName, HeaderGlobalBar, HeaderGlobalAction } from "@carbon/react";
import { Password } from "@carbon/icons-react";
import { UserDropdown, useThunderID } from "@thunderid/react";
import NotificationsBell from "./common/NotificationsBell";
import ChangePasswordModal from "./common/ChangePasswordModal";

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
  const { getAccessToken } = useThunderID();
  const [changingPassword, setChangingPassword] = useState(false);

  const copyToken = async () => {
    const token = await getAccessToken();
    if (token) navigator.clipboard.writeText(token);
  };

  return (
    <HeaderGlobalBar>
      {import.meta.env.DEV && (
        <HeaderGlobalAction
          aria-label="Copy access token (dev)"
          onClick={copyToken}
        >
          <span className="os-header-copy-token">Copy Token</span>
        </HeaderGlobalAction>
      )}
      <HeaderGlobalAction aria-label="Change password" onClick={() => setChangingPassword(true)}>
        <Password size={20} />
      </HeaderGlobalAction>
      <NotificationsBell />
      <UserDropdown />
      {changingPassword && (
        <ChangePasswordModal onClose={() => setChangingPassword(false)} />
      )}
    </HeaderGlobalBar>
  );
}
