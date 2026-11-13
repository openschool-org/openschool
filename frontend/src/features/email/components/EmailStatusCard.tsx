import { Alert, Card, Descriptions, Tag } from "antd";
import { useEmailStatus } from "@/features/email/queries/useEmail";
import LoadingSpinner from "@/shared/ui/LoadingSpinner";
import ErrorMessage from "@/shared/ui/ErrorMessage";

const PROVIDER_LABELS = { resend: "Resend API", smtp: "SMTP", console: "Server log only (not sent)" } as const;

// Read-only: mail settings live in the backend .env, never in the database.
export default function EmailStatusCard() {
  const { data: status, isLoading, isError, refetch } = useEmailStatus();

  if (isLoading) return <LoadingSpinner />;
  if (isError || !status) return <ErrorMessage message="Could not load email settings." onRetry={refetch} />;

  return (
    <Card
      className="os-form-card"
      title="Email delivery"
      extra={<Tag color={status.provider === "console" ? "error" : "success"} variant="filled">{status.provider === "console" ? "Not sending" : "Active"}</Tag>}
    >
      <div className="os-stack os-gap-4">
        {status.redirect_to && (
          <Alert type="warning" showIcon title="Test mode" description={`Every email goes to ${status.redirect_to}, with a note saying who it was meant for. Remove MAIL_REDIRECT_TO before going live.`} />
        )}
        {status.provider === "console" && (
          <Alert type="error" showIcon title="Emails are not being sent" description="Reset and activation links only appear in the server log. Set RESEND_API_KEY or SMTP_HOST in the backend .env." />
        )}
        <Descriptions
          className="os-facts"
          layout="vertical"
          column={1}
          items={[
            { key: "provider", label: "Provider", children: PROVIDER_LABELS[status.provider] },
            { key: "from", label: "Sender", children: status.from },
            { key: "reply", label: "Replies go to", children: status.reply_to || "The school email in General settings" },
          ]}
        />
        <p className="os-text-xs os-c-tertiary os-m-0">Set in the backend .env file; changes need a server restart.</p>
      </div>
    </Card>
  );
}
