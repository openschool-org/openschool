import {
  Button,
  ComposedModal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  InlineNotification,
} from "@carbon/react";
import { getErrorMessage as apiError } from "../../lib/errorMessage";

interface Props {
  open: boolean;
  title: string;
  onClose: () => void;
  onSubmit: () => void;
  isPending?: boolean;
  submitDisabled?: boolean;
  submitLabel?: string;
  pendingLabel?: string;
  isError?: boolean;
  error?: unknown;
  errorTitle?: string;
  errorFallback?: string;
  size?: "xs" | "sm" | "md" | "lg";
  children: React.ReactNode;
}

export default function FormModal({
  open,
  title,
  onClose,
  onSubmit,
  isPending,
  submitDisabled,
  submitLabel = "Save",
  pendingLabel = "Saving…",
  isError,
  error,
  errorTitle = "Error",
  errorFallback = "Something went wrong. Please try again.",
  size = "sm",
  children,
}: Props) {
  return (
    <ComposedModal open={open} size={size} onClose={onClose}>
      <ModalHeader title={title} />
      <ModalBody>
        {isError && (
          <InlineNotification
            kind="error"
            title={errorTitle}
            subtitle={apiError(error, errorFallback)}
            lowContrast
            hideCloseButton
            style={{ marginBottom: "1rem", maxWidth: "100%" }}
          />
        )}
        {children}
      </ModalBody>
      <ModalFooter>
        <Button kind="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button kind="primary" onClick={onSubmit} disabled={submitDisabled || isPending}>
          {isPending ? pendingLabel : submitLabel}
        </Button>
      </ModalFooter>
    </ComposedModal>
  );
}
