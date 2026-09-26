import { Button, ComposedModal, ModalBody, ModalFooter, ModalHeader } from "@carbon/react";

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
    <ComposedModal open={open} onClose={onCancel} size="sm" aria-label={title} danger={danger}>
      <ModalHeader title={title} />
      <ModalBody>
        <p>{body}</p>
      </ModalBody>
      <ModalFooter>
        <Button kind="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button kind={danger ? "danger" : "primary"} onClick={onConfirm} disabled={busy}>
          {busy ? "Working…" : confirmLabel}
        </Button>
      </ModalFooter>
    </ComposedModal>
  );
}
