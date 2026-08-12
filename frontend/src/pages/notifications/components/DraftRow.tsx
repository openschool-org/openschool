import { Button } from "@carbon/react";
import { Send, TrashCan } from "@carbon/icons-react";
import { useSendNotificationDraft, useDeleteNotificationDraft } from "../../../queries/notifications/useNotifications";
import type { Notification } from "../../../services/notifications/notification";

export default function DraftRow({ draft }: { draft: Notification }) {
  const send = useSendNotificationDraft();
  const remove = useDeleteNotificationDraft();

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.875rem 1.5rem", borderBottom: "1px solid #f4f4f4" }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: "0 0 0.125rem", fontWeight: 500, fontSize: "0.8125rem" }}>{draft.title}</p>
        <p style={{ margin: 0, fontSize: "0.75rem", color: "#8d8d8d" }}>{draft.recipient_rules.length} recipient rule(s)</p>
      </div>
      <Button kind="ghost" size="sm" renderIcon={Send} onClick={() => send.mutate(draft.id)} disabled={send.isPending}>
        Send
      </Button>
      <Button kind="danger--ghost" size="sm" renderIcon={TrashCan} onClick={() => remove.mutate(draft.id)} disabled={remove.isPending}>
        Delete
      </Button>
    </div>
  );
}
