import { useEffect, useState } from "react";
import { Link } from "react-router";
import { Avatar, Button, Dropdown } from "antd";
import { LockOutlined, LogoutOutlined, SearchOutlined, UserOutlined } from "@ant-design/icons";
import { UserDropdown } from "@thunderid/react";
import NotificationsBell from "@/features/notifications/components/NotificationsBell";
import ChangePasswordModal from "@/features/auth/components/ChangePasswordModal";
import GlobalSearch from "@/features/system/components/GlobalSearch";
import LanguageSwitcher from "@/shared/i18n/LanguageSwitcher";
import { useT } from "@/shared/i18n/useT";

export function AppHeaderBrand() {
  return (
    <Link to="/" className="os-topbar__brand">
      <img src="/w-favicon.webp" alt="" width={24} height={24} />
      <span className="os-topbar__brand-name">OpenSchool</span>
    </Link>
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
    <div className="os-topbar__actions">
      {showSearch &&
        (searchExpanded ? (
          <GlobalSearch autoFocus onClose={() => setSearchExpanded(false)} />
        ) : (
          <Button type="text" shape="circle" aria-label="Search" icon={<SearchOutlined />} onClick={() => setSearchExpanded(true)} />
        ))}
      {showLanguage && <LanguageSwitcher />}
      <Button type="text" shape="circle" aria-label={t("shell.changePassword")} icon={<LockOutlined />} onClick={() => setChangingPassword(true)} />
      <NotificationsBell />
      <UserDropdown>
        {({ openProfile, signOut }) => (
          <Dropdown
            trigger={["click"]}
            placement="bottomRight"
            menu={{
              items: [
                { key: "profile", icon: <UserOutlined />, label: t("shell.manageProfile"), onClick: openProfile },
                { key: "signout", icon: <LogoutOutlined />, label: t("shell.signOut"), danger: true, onClick: signOut },
              ],
            }}
          >
            <Button type="text" shape="circle" aria-label={t("shell.profileMenu")} icon={<Avatar size={32} icon={<UserOutlined />} className="os-topbar__avatar" />} />
          </Dropdown>
        )}
      </UserDropdown>
      {changingPassword && <ChangePasswordModal onClose={() => setChangingPassword(false)} />}
    </div>
  );
}
