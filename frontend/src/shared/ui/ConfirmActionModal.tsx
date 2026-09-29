import type { ReactNode } from "react";
import { Button, ComposedModal, ModalBody, ModalFooter, ModalHeader } from "@carbon/react";

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
    <ComposedModal open={open} size="sm" onClose={onClose} aria-label={title} danger={danger}>
      <ModalHeader title={title} />
      <ModalBody><p className="os-text-md">{description}</p></ModalBody>
      <ModalFooter>
        <Button kind="secondary" onClick={onClose}>Cancel</Button>
        <Button kind={danger ? "danger" : "primary"} onClick={onConfirm} disabled={pending}>
          {pending ? "Working…" : confirmLabel}
        </Button>
      </ModalFooter>
    </ComposedModal>
  );
}
