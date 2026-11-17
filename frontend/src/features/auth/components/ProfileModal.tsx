import { Modal } from "antd";
import { UserProfile } from "@thunderid/react";
import { useT } from "@/shared/i18n/useT";

// Internal identity-provider attributes: meaningless to users, and roles/type
// must never look self-editable.
const HIDDEN_FIELDS = ["id", "ouId", "type", "roles"];

// ThunderID's own popup has a fixed 600px min-width, so it overflows on
// phones. We host its inline profile in an antd Modal instead.
export default function ProfileModal({ onClose }: { onClose: () => void }) {
  const { t } = useT();
  return (
    <Modal open title={t("shell.manageProfile")} width={640} className="os-profile-modal" footer={null} onCancel={onClose} destroyOnHidden>
      <UserProfile mode="inline" cardLayout={false} hideFields={HIDDEN_FIELDS} className="os-idp-profile" />
    </Modal>
  );
}
