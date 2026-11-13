import { useState } from "react";
import { Alert, Button } from "antd";
import { DeleteOutlined, SendOutlined } from "@ant-design/icons";
import { useSendNotificationDraft, useDeleteNotificationDraft } from "@/features/notifications/queries/useNotifications";
import type { Notification } from "@/features/notifications/api/notification";
import { getErrorMessage } from "@/shared/api/errors";
import ConfirmDeleteModal from "@/shared/ui/ConfirmDeleteModal";

export default function DraftRow({ draft }: { draft: Notification }) {
  const send = useSendNotificationDraft();
  const remove = useDeleteNotificationDraft();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  // Neither action should be clickable while the other is in flight, a
  // send racing a delete on the same draft is not a state worth allowing.
  const busy = send.isPending || remove.isPending;

  return (
    <div className="os-list-row os-col os-items-stretch os-py-3h os-px-6">
      <div className="os-flex os-items-center os-gap-3">
        <div className="os-flex-1 os-min-w-0">
          <p className="os-mt-0 os-mx-0 os-mb-h os-fw-500 os-text-sm">{draft.title}</p>
          <p className="os-m-0 os-text-xs os-c-tertiary">{draft.recipient_rules.length} recipient rule(s)</p>
        </div>
        <Button type="text" size="small" icon={<SendOutlined />} onClick={() => send.mutate(draft.id)} disabled={busy} loading={send.isPending}>
          Send
        </Button>
        <Button type="text" danger size="small" icon={<DeleteOutlined />} onClick={() => setConfirmingDelete(true)} disabled={busy}>
          Delete
        </Button>
      </div>
      {send.isError && (
        <Alert type="error" showIcon closable onClose={() => send.reset()} className="os-mt-2" title="Could not send draft" description={getErrorMessage(send.error)} />
      )}
      {remove.isError && (
        <Alert type="error" showIcon closable onClose={() => remove.reset()} className="os-mt-2" title="Could not delete draft" description={getErrorMessage(remove.error)} />
      )}
      <ConfirmDeleteModal
        open={confirmingDelete}
        title="Delete draft"
        description="This will permanently delete this notification draft. This action cannot be undone."
        subject="Draft"
        mutation={remove}
        onClose={() => setConfirmingDelete(false)}
        onConfirm={() => remove.mutate(draft.id)}
      />
    </div>
  );
}
