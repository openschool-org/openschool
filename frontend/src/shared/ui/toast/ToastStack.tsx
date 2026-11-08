import { Alert, Button } from "antd";
import { useToast } from "@/shared/ui/toast/useToast";

export default function ToastStack() {
  const { toasts, dismissToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="os-toast-stack" role="status" aria-live="polite">
      {toasts.map((t) => (
        <Alert
          key={t.id}
          type={t.kind}
          showIcon
          title={t.title}
          description={t.subtitle}
          closable={{ onClose: () => dismissToast(t.id), "aria-label": "Dismiss" }}
          className="os-toast-stack__item"
          action={
            t.action && (
              <Button
                size="small"
                onClick={() => {
                  t.action?.onClick();
                  dismissToast(t.id);
                }}
              >
                {t.action.label}
              </Button>
            )
          }
        />
      ))}
    </div>
  );
}
