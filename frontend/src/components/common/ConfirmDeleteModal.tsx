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
  onClose: () => void;
  onConfirm: () => void;
}

export default function ConfirmDeleteModal({
  open,
  title,
  description,
  isPending,
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
        <Button kind="danger" onClick={onConfirm} disabled={isPending}>
          {isPending ? "Deleting…" : "Delete"}
        </Button>
      </ModalFooter>
    </ComposedModal>
  );
}
