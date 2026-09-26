import { Button, Tag } from "@carbon/react";
import { UserFollow, Locked } from "@carbon/icons-react";
import { GUARDIAN_RELATIONSHIPS } from "@/features/guardians/constants";
import type { GuardianWithPrimary } from "@/features/guardians/api/guardian";

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
    <div className="os-flex os-items-center os-gap-4 os-py-3h os-px-4 os-border"
    >
      <div className="os-flex-1 os-min-w-0">
        <div className="os-flex os-items-center os-gap-2 os-mb-1">
          <p className="os-m-0 os-fw-600 os-text-md os-c-primary">
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
              <Locked size={12} className="os-mr-1" />
              Portal access
            </Tag>
          )}
        </div>
        <p className="os-m-0 os-text-sm os-c-secondary">
          {g.phone}
          {g.email ? ` · ${g.email}` : ""}
        </p>
      </div>
      <div className="os-flex os-gap-2 os-shrink-0">
        {!g.is_primary_contact && (
          <Button kind="ghost" size="sm" onClick={onSetPrimary} disabled={isSettingPrimary}>
            Set primary
          </Button>
        )}
        {!g.user_id && (
          <Button renderIcon={UserFollow} kind="ghost" size="sm" onClick={onSetUpLogin}>
            Set up login
          </Button>
        )}
        <Button kind="danger--ghost" size="sm" onClick={onRemove}>
          Remove
        </Button>
      </div>
    </div>
  );
}
