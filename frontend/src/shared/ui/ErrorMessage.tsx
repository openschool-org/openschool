import { Alert, Button } from "antd";
import { useT } from "@/shared/i18n/useT";

interface ErrorMessageProps {
  message: string;
  onRetry?: () => void;
}

export default function ErrorMessage({ message, onRetry }: ErrorMessageProps) {
  const { t } = useT();
  return (
    <Alert
      type="error"
      showIcon
      title={t("common.error")}
      description={message}
      action={onRetry && <Button size="small" onClick={onRetry}>{t("common.retry")}</Button>}
    />
  );
}
