import { useEffect, useState } from "react";
import { Link } from "react-router";
import { HeaderName, HeaderGlobalBar, HeaderGlobalAction, OverflowMenu, OverflowMenuItem } from "@carbon/react";
import { Password, User, Search } from "@carbon/icons-react";
import { UserDropdown } from "@thunderid/react";
import NotificationsBell from "@/features/notifications/components/NotificationsBell";
import ChangePasswordModal from "@/features/auth/components/ChangePasswordModal";
import GlobalSearch from "@/features/system/components/GlobalSearch";
import LanguageSwitcher from "@/shared/i18n/LanguageSwitcher";
import { useT } from "@/shared/i18n/useT";

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

export function AppHeaderActions({ showSearch = false, showLanguage = false }: { showSearch?: boolean; showLanguage?: boolean }) {
  const { t } = useT();
  const [changingPassword, setChangingPassword] = useState(false);
  const [searchExpanded, setSearchExpanded] = useState(false);

  useEffect(() => {
    if (!showSearch) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchExpanded(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showSearch]);

  return (
    <HeaderGlobalBar className="os-flex os-items-center">
      {showSearch &&
        (searchExpanded ? (
          <GlobalSearch autoFocus onClose={() => setSearchExpanded(false)} />
        ) : (
          <HeaderGlobalAction
            aria-label="Search"
            onClick={() => setSearchExpanded(true)}
          >
            <Search size={20} className="os-header-icon" />
          </HeaderGlobalAction>
        ))}
      {showLanguage && <LanguageSwitcher />}
      <HeaderGlobalAction aria-label={t("shell.changePassword")} onClick={() => setChangingPassword(true)}>
        <Password size={20} className="os-header-icon" />
      </HeaderGlobalAction>
      <NotificationsBell />
      <UserDropdown>
        {({ openProfile, signOut }) => (
          <OverflowMenu
            renderIcon={User}
            aria-label={t("shell.profileMenu")}
            flipped
            className="os-header-user-menu"
          >
            <OverflowMenuItem
              itemText={t("shell.manageProfile")}
              onClick={openProfile}
            />
            <OverflowMenuItem
              itemText={t("shell.signOut")}
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
