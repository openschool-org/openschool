import { Button, Tag } from "antd";
import { LockOutlined, UserAddOutlined } from "@ant-design/icons";
import { relationshipLabel } from "@/features/guardians/constants";
import type { GuardianWithPrimary } from "@/features/guardians/api/guardian";
import { displayName } from "@/shared/lib/name";

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
            {displayName(g)}
          </p>
          <Tag variant="filled">
            {relationshipLabel(g.relationship)}
          </Tag>
          {g.is_primary_contact && (
            <Tag color="cyan" variant="filled">
              Primary contact
            </Tag>
          )}
          {g.user_id && (
            <Tag color="success" variant="filled">
              <LockOutlined className="os-mr-1" />
              Portal access
            </Tag>
          )}
        </div>
        <p className="os-m-0 os-text-sm os-c-secondary">
          {g.phone}
          {g.email ? ` · ${g.email}` : ""}
          {g.nic_number ? ` · NIC ${g.nic_number}` : ""}
        </p>
      </div>
      <div className="os-flex os-gap-2 os-shrink-0">
        {!g.is_primary_contact && (
          <Button type="text" onClick={onSetPrimary} disabled={isSettingPrimary}>
            Set primary
          </Button>
        )}
        {!g.user_id && (
          <Button icon={<UserAddOutlined />} type="text" onClick={onSetUpLogin}>
            Set up login
          </Button>
        )}
        <Button type="text" danger onClick={onRemove}>
          Remove
        </Button>
      </div>
    </div>
  );
}
