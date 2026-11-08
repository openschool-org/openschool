import { Alert } from "antd";
import { getErrorMessage } from "@/shared/api/errors";

interface Props {
  isError: boolean | undefined;
  error?: unknown;
  title?: string;
  fallback?: string;
  onClose?: () => void;
  className?: string;
  style?: React.CSSProperties;
}

// Standardizes the mutation-error banner repeated across nearly every admin page/modal.
export default function MutationErrorNotification({
  isError,
  error,
  title = "Error",
  fallback,
  onClose,
  className,
  style,
}: Props) {
  if (!isError) return null;
  return (
    <Alert
      type="error"
      showIcon
      title={title}
      description={getErrorMessage(error, fallback)}
      closable={onClose ? { onClose } : false}
      className={`os-mb-4${className ? ` ${className}` : ""}`}
      style={style}
    />
  );
}
