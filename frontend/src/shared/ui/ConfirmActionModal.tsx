import type { ReactNode } from "react";
import { Button, Modal } from "antd";

interface Props {
  open: boolean;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  pending?: boolean;
  danger?: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export default function ConfirmActionModal({ open, title, description, confirmLabel, pending = false, danger = false, onClose, onConfirm }: Props) {
  return (
    <Modal
      open={open}
      title={title}
      width={520}
      onCancel={onClose}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="primary" danger={danger} onClick={onConfirm} loading={pending}>
            {pending ? "Working…" : confirmLabel}
          </Button>
        </>
      }
    >
      <p className="os-text-md">{description}</p>
    </Modal>
  );
}
