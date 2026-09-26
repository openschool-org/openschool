import { InlineNotification, Button } from "@carbon/react";
import { useT } from "@/shared/i18n/useT";

interface ErrorMessageProps {
  message: string;
  onRetry?: () => void;
}

export default function ErrorMessage({ message, onRetry }: ErrorMessageProps) {
  const { t } = useT();
  return (
    <div>
      <InlineNotification
        kind="error"
        title={t("common.error")}
        subtitle={message}
        lowContrast
        hideCloseButton
      />
      {onRetry && (
        <Button kind="ghost" size="sm" onClick={onRetry} className="os-mt-2">
          {t("common.retry")}
        </Button>
      )}
    </div>
  );
}
