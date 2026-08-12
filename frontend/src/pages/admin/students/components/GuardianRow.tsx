import { Button, Tag } from "@carbon/react";
import { UserFollow, Locked } from "@carbon/icons-react";
import { GUARDIAN_RELATIONSHIPS } from "../../../../services/guardian";
import type { GuardianWithPrimary } from "../../../../services/guardian";

export default function GuardianRow({
  guardian,
  onSetPrimary,
  isSettingPrimary,
  onSetUpLogin,
  onRemove,
}: {
  guardian: GuardianWithPrimary;
  onSetPrimary: () => void;
  isSettingPrimary: boolean;
  onSetUpLogin: () => void;
  onRemove: () => void;
}) {
  const g = guardian;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "1rem",
        padding: "0.875rem 1rem",
        border: "1px solid #e0e0e0",
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
          <p style={{ margin: 0, fontWeight: 600, fontSize: "0.875rem", color: "#161616" }}>
            {g.full_name}
          </p>
          <Tag size="sm" type="gray">
            {GUARDIAN_RELATIONSHIPS.find((r) => r.value === g.relationship)?.label ?? g.relationship}
          </Tag>
          {g.is_primary_contact && (
            <Tag size="sm" type="teal">
              Primary contact
            </Tag>
          )}
          {g.user_id && (
            <Tag size="sm" type="green">
              <Locked size={12} style={{ marginRight: "4px" }} />
              Portal access
            </Tag>
          )}
        </div>
        <p style={{ margin: 0, fontSize: "0.8125rem", color: "#525252" }}>
          {g.phone}
          {g.email ? ` · ${g.email}` : ""}
        </p>
      </div>
      <div style={{ display: "flex", gap: "0.5rem", flexShrink: 0 }}>
        {!g.is_primary_contact && (
          <Button kind="ghost" size="sm" onClick={onSetPrimary} disabled={isSettingPrimary}>
            Set Primary
          </Button>
        )}
        {!g.user_id && (
          <Button renderIcon={UserFollow} kind="ghost" size="sm" onClick={onSetUpLogin}>
            Set Up Login
          </Button>
        )}
        <Button kind="danger--ghost" size="sm" onClick={onRemove}>
          Remove
        </Button>
      </div>
    </div>
  );
}
