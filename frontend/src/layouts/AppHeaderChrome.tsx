import { useEffect, useState } from "react";
import { Link } from "react-router";
import { Avatar, Button, Dropdown, Tooltip } from "antd";
import { LockOutlined, LogoutOutlined, SearchOutlined, UserOutlined } from "@ant-design/icons";
import { useThunderID } from "@thunderid/react";
import NotificationsBell from "@/features/notifications/components/NotificationsBell";
import ChangePasswordModal from "@/features/auth/components/ChangePasswordModal";
import ProfileModal from "@/features/auth/components/ProfileModal";
import GlobalSearch from "@/features/system/components/GlobalSearch";
import LanguageSwitcher from "@/shared/i18n/LanguageSwitcher";
import { useT } from "@/shared/i18n/useT";
import { useProvisionUser } from "@/shared/auth/useProvisionUser";
import { clearOffline } from "@/shared/lib/offlineCache";

export function AppHeaderBrand() {
  return (
    <Link to="/" className="os-topbar__brand">
      <img src="/b-favicon.webp" alt="" width={24} height={24} />
      <span className="os-topbar__brand-name">OpenSchool</span>
    </Link>
  );
}

const ROLE_KEYS = { admin: "shell.role.admin", teacher: "shell.role.teacher", student: "shell.role.student", parent: "shell.role.parent" } as const;

export function AppHeaderActions({ showSearch = false, showLanguage = false }: { showSearch?: boolean; showLanguage?: boolean }) {
  const { t } = useT();
  const { data: me } = useProvisionUser();
  const { signOut } = useThunderID();
  const [changingPassword, setChangingPassword] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [searchExpanded, setSearchExpanded] = useState(false);

  // The only Ctrl/Cmd+K listener: opens the search box, which focuses itself.
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

  // Shared staff-room computers: always show who is signed in and as what.
  const name = [me?.given_name, me?.family_name].filter(Boolean).join(" ") || me?.username || "";
  const roleKey = ROLE_KEYS[(me?.roles ?? []).find((r): r is keyof typeof ROLE_KEYS => r in ROLE_KEYS) ?? "teacher"];
  const roleLabel = me ? t(roleKey) : "";

  return (
    <div className="os-topbar__actions">
      {showSearch &&
        (searchExpanded ? (
          <GlobalSearch autoFocus onClose={() => setSearchExpanded(false)} />
        ) : (
          <Tooltip title={t("shell.search")}>
            <Button type="text" shape="circle" aria-label={t("shell.search")} icon={<SearchOutlined />} onClick={() => setSearchExpanded(true)} />
          </Tooltip>
        ))}
      {showLanguage && <LanguageSwitcher />}
      <NotificationsBell />
      <Dropdown
        trigger={["click"]}
        placement="bottomRight"
        menu={{
          items: [
            {
              key: "who",
              disabled: true,
              className: "os-topbar__who",
              label: (
                <span className="os-topbar__who-body">
                  <span className="os-topbar__who-hint">{t("shell.signedInAs")}</span>
                  <span className="os-topbar__who-name">{name}</span>
                  <span className="os-topbar__who-role">{roleLabel}</span>
                </span>
              ),
            },
            { type: "divider", className: "os-topbar__who-divider" },
            { key: "profile", icon: <UserOutlined />, label: t("shell.manageProfile"), onClick: () => setProfileOpen(true) },
            { key: "password", icon: <LockOutlined />, label: t("shell.changePassword"), onClick: () => setChangingPassword(true) },
            { type: "divider" },
            { key: "signout", icon: <LogoutOutlined />, label: t("shell.signOut"), danger: true, onClick: () => { clearOffline(); signOut(); } },
          ],
        }}
      >
        <Button type="text" className="os-topbar__user" aria-label={t("shell.profileMenu")}>
          <Avatar size={32} icon={<UserOutlined />} className="os-topbar__avatar" />
          {name && (
            <span className="os-topbar__user-text">
              <span className="os-topbar__user-name">{name}</span>
              <span className="os-topbar__user-role">{roleLabel}</span>
            </span>
          )}
        </Button>
      </Dropdown>
      {profileOpen && <ProfileModal onClose={() => setProfileOpen(false)} />}
      {changingPassword && <ChangePasswordModal onClose={() => setChangingPassword(false)} />}
    </div>
  );
}
