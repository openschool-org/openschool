import { useState } from "react";
import { Alert, Button, Card } from "antd";
import { SendOutlined } from "@ant-design/icons";
import SelectField from "@/shared/ui/SelectField";
import { useEmailPreview, useEmailTemplates, useSendTestEmail } from "@/features/email/queries/useEmail";
import LoadingSpinner from "@/shared/ui/LoadingSpinner";
import ErrorMessage from "@/shared/ui/ErrorMessage";
import MutationErrorNotification from "@/shared/ui/MutationErrorNotification";

// Shows each email exactly as sent, with sample data, and can mail a copy to the signed-in admin.
export default function EmailPreviewCard() {
  const { data: templates } = useEmailTemplates();
  const [chosen, setChosen] = useState("");
  const key = chosen || templates?.[0]?.key || "";
  const { data: preview, isLoading, isError, refetch } = useEmailPreview(key);
  const sendTest = useSendTestEmail();

  const choose = (next: string) => {
    setChosen(next);
    sendTest.reset();
  };

  return (
    <Card
      className="os-form-card"
      title="Email templates"
      extra={<Button icon={<SendOutlined />} disabled={!key} loading={sendTest.isPending} onClick={() => sendTest.mutate(key)}>{sendTest.isPending ? "Sending…" : "Send test to me"}</Button>}
    >
      <div className="os-stack os-gap-4">
        <div className="os-email-picker">
          <SelectField id="email-template" label="Template" value={key} onChange={choose} options={(templates ?? []).map((t) => ({ value: t.key, label: t.name }))} />
        </div>
        {sendTest.isSuccess && <Alert type="success" showIcon closable title="Test email sent" description={`Check the inbox of ${sendTest.data.sent_to}.`} onClose={() => sendTest.reset()} />}
        <MutationErrorNotification isError={sendTest.isError} error={sendTest.error} title="Could not send the test email" />

        {isLoading && <LoadingSpinner />}
        {isError && <ErrorMessage message="Could not load the preview." onRetry={refetch} />}
        {preview && (
          <div className="os-email-frame">
            <p className="os-email-frame__subject"><span>Subject</span>{preview.subject}</p>
            {/* sandbox with no permissions: the preview can't run scripts or reach the app. */}
            <iframe title="Email preview" sandbox="" srcDoc={preview.html} className="os-email-preview" />
          </div>
        )}
      </div>
    </Card>
  );
}
