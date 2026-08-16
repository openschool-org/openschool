import { Button, InlineNotification } from "@carbon/react";
import { Send, TrashCan } from "@carbon/icons-react";
import { useSendNotificationDraft, useDeleteNotificationDraft } from "../../../queries/notifications/useNotifications";
import type { Notification } from "../../../services/notifications/notification";
import { getErrorMessage } from "../../../lib/errorMessage";

export default function DraftRow({ draft }: { draft: Notification }) {
  const send = useSendNotificationDraft();
  const remove = useDeleteNotificationDraft();
  // Neither action should be clickable while the other is in flight — a
  // send racing a delete on the same draft is not a state worth allowing.
  const busy = send.isPending || remove.isPending;

  return (
    <div style={{ padding: "0.875rem 1.5rem", borderBottom: "1px solid #f4f4f4" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: "0 0 0.125rem", fontWeight: 500, fontSize: "0.8125rem" }}>{draft.title}</p>
          <p style={{ margin: 0, fontSize: "0.75rem", color: "#8d8d8d" }}>{draft.recipient_rules.length} recipient rule(s)</p>
        </div>
        <Button kind="ghost" size="sm" renderIcon={Send} onClick={() => send.mutate(draft.id)} disabled={busy}>
          Send
        </Button>
        <Button kind="danger--ghost" size="sm" renderIcon={TrashCan} onClick={() => remove.mutate(draft.id)} disabled={busy}>
          Delete
        </Button>
      </div>
      {send.isError && (
        <InlineNotification
          kind="error"
          title="Could not send draft"
          subtitle={getErrorMessage(send.error)}
          lowContrast
          onClose={() => send.reset()}
          style={{ marginTop: "0.5rem", maxWidth: "100%" }}
        />
      )}
      {remove.isError && (
        <InlineNotification
          kind="error"
          title="Could not delete draft"
          subtitle={getErrorMessage(remove.error)}
          lowContrast
          onClose={() => remove.reset()}
          style={{ marginTop: "0.5rem", maxWidth: "100%" }}
        />
      )}
    </div>
  );
}
