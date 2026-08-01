import { Link } from "react-router";
import { HeaderName, HeaderGlobalBar, HeaderGlobalAction } from "@carbon/react";
import { Search } from "@carbon/icons-react";
import { UserDropdown, useThunderID } from "@thunderid/react";

export function AppHeaderBrand() {
  return (
    <HeaderName as={Link} to="/" prefix="" className="os-header-brand">
      <span className="os-header-brand__inner">
        <span className="os-header-brand__logo">
          <img src="/favicon.webp" alt="" width={20} height={20} />
        </span>
        <span>OpenSchool</span>
      </span>
    </HeaderName>
  );
}

export function AppHeaderActions() {
  const { getAccessToken } = useThunderID();

  const copyToken = async () => {
    const token = await getAccessToken();
    if (token) navigator.clipboard.writeText(token);
  };

  return (
    <HeaderGlobalBar>
      <HeaderGlobalAction aria-label="Search">
        <Search size={20} className="os-header-icon" />
      </HeaderGlobalAction>
      {import.meta.env.DEV && (
        <HeaderGlobalAction
          aria-label="Copy access token (dev)"
          onClick={copyToken}
        >
          <span className="os-header-copy-token">Copy Token</span>
        </HeaderGlobalAction>
      )}
      <UserDropdown />
    </HeaderGlobalBar>
  );
}
