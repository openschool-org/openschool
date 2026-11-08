import { Alert, Button, Modal } from "antd";
import { getErrorMessage as apiError } from "@/shared/api/errors";
import { MODAL_WIDTH } from "@/shared/ui/modalWidth";
import type { ModalSize } from "@/shared/ui/modalWidth";

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
  size?: ModalSize;
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
    <Modal
      open={open}
      title={title}
      width={MODAL_WIDTH[size]}
      onCancel={onClose}
      destroyOnHidden
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="primary" onClick={onSubmit} disabled={submitDisabled} loading={isPending}>
            {isPending ? pendingLabel : submitLabel}
          </Button>
        </>
      }
    >
      {isError && (
        <Alert type="error" showIcon title={errorTitle} description={apiError(error, errorFallback)} className="os-mb-4" />
      )}
      {children}
    </Modal>
  );
}
