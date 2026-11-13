import { Button, Modal } from "antd";
import { MODAL_WIDTH } from "@/shared/ui/modalWidth";

interface Props {
  open: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  busy: boolean;
  danger?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export default function ConfirmActionModal({ open, title, body, confirmLabel, busy, danger = false, onCancel, onConfirm }: Props) {
  return (
    <Modal
      open={open}
      title={title}
      width={MODAL_WIDTH.sm}
      onCancel={onCancel}
      footer={
        <>
          <Button onClick={onCancel}>Cancel</Button>
          <Button type="primary" danger={danger} onClick={onConfirm} loading={busy}>
            {busy ? "Working…" : confirmLabel}
          </Button>
        </>
      }
    >
      <p className="os-text-md">{body}</p>
    </Modal>
  );
}
