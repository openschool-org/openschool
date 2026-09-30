import { InlineNotification, Tag } from "@carbon/react";
import { useEmailStatus } from "@/features/email/queries/useEmail";
import SectionCard from "@/shared/ui/SectionCard";
import InfoRow from "@/shared/ui/InfoRow";
import LoadingSpinner from "@/shared/ui/LoadingSpinner";
import ErrorMessage from "@/shared/ui/ErrorMessage";

const PROVIDER_LABELS = { resend: "Resend API", smtp: "SMTP", console: "Server log only (not sent)" } as const;

// Read-only: mail settings live in the backend .env, never in the database.
export default function EmailStatusCard() {
  const { data: status, isLoading, isError, refetch } = useEmailStatus();

  if (isLoading) return <LoadingSpinner />;
  if (isError || !status) return <ErrorMessage message="Could not load email settings." onRetry={refetch} />;

  return (
    <SectionCard title="Email delivery" meta={<Tag type={status.provider === "console" ? "red" : "green"} size="sm">{status.provider === "console" ? "Not sending" : "Active"}</Tag>}>
      {status.redirect_to && (
        <InlineNotification
          kind="warning"
          lowContrast
          hideCloseButton
          title="Test mode"
          subtitle={`Every email goes to ${status.redirect_to}, with a note saying who it was meant for. Remove MAIL_REDIRECT_TO before going live.`}
          className="os-mb-4 os-max-w-full"
        />
      )}
      {status.provider === "console" && (
        <InlineNotification
          kind="error"
          lowContrast
          hideCloseButton
          title="Emails are not being sent"
          subtitle="Reset and activation links only appear in the server log. Set RESEND_API_KEY or SMTP_HOST in the backend .env."
          className="os-mb-4 os-max-w-full"
        />
      )}
      <InfoRow label="Provider" value={PROVIDER_LABELS[status.provider]} />
      <InfoRow label="Sender" value={status.from} />
      <InfoRow label="Replies go to" value={status.reply_to || "The school email in General settings"} />
      <p className="os-text-sm os-c-secondary os-mt-4 os-mb-0">These settings come from the backend .env file and need a server restart to change.</p>
    </SectionCard>
  );
}
