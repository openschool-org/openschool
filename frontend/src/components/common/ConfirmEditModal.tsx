import {
  Button,
  ComposedModal,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@carbon/react";

interface Props {
  open: boolean;
  title: string;
  description: React.ReactNode;
  isPending?: boolean;
  confirmLabel?: string;
  onClose: () => void;
  onConfirm: () => void;
}

export default function ConfirmEditModal({
  open,
  title,
  description,
  isPending,
  confirmLabel = "Save Changes",
  onClose,
  onConfirm,
}: Props) {
  return (
    <ComposedModal open={open} size="sm" onClose={onClose}>
      <ModalHeader title={title} />
      <ModalBody>
        <p style={{ fontSize: "0.875rem" }}>{description}</p>
      </ModalBody>
      <ModalFooter>
        <Button kind="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button kind="primary" onClick={onConfirm} disabled={isPending}>
          {isPending ? "Saving…" : confirmLabel}
        </Button>
      </ModalFooter>
    </ComposedModal>
  );
}
