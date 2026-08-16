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
  // Blocks confirming without implying a delete is in flight (unlike
  // isPending, which also swaps the button label to "Deleting…") — for
  // callers that need to disable confirmation for a reason unrelated to
  // the mutation itself (e.g. a dependent check still loading).
  disabled?: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export default function ConfirmDeleteModal({
  open,
  title,
  description,
  isPending,
  disabled,
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
        <Button kind="danger" onClick={onConfirm} disabled={isPending || disabled}>
          {isPending ? "Deleting…" : "Delete"}
        </Button>
      </ModalFooter>
    </ComposedModal>
  );
}
