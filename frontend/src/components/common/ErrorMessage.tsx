import { InlineNotification, Button } from "@carbon/react";

interface ErrorMessageProps {
  message: string;
  onRetry?: () => void;
}

export default function ErrorMessage({ message, onRetry }: ErrorMessageProps) {
  return (
    <div>
      <InlineNotification
        kind="error"
        title="Error"
        subtitle={message}
        lowContrast
        hideCloseButton
      />
      {onRetry && (
        <Button kind="ghost" size="sm" onClick={onRetry} style={{ marginTop: "0.5rem" }}>
          Retry
        </Button>
      )}
    </div>
  );
}
