import { useState } from "react";
import { Button, InlineNotification, Select, SelectItem } from "@carbon/react";
import { Send } from "@carbon/icons-react";
import { useEmailPreview, useEmailTemplates, useSendTestEmail } from "@/features/email/queries/useEmail";
import SectionCard from "@/shared/ui/SectionCard";
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
    <SectionCard title="Email templates">
      <div className="os-flex os-gap-4 os-items-end os-wrap os-mb-4">
        <Select id="email-template" labelText="Template" value={key} onChange={(e) => choose(e.target.value)}>
          {templates?.map((t) => <SelectItem key={t.key} value={t.key} text={t.name} />)}
        </Select>
        <Button kind="secondary" size="md" renderIcon={Send} disabled={!key || sendTest.isPending} onClick={() => sendTest.mutate(key)}>
          {sendTest.isPending ? "Sending…" : "Send test to me"}
        </Button>
      </div>
      {sendTest.isSuccess && (
        <InlineNotification kind="success" lowContrast title="Test email sent" subtitle={`Check the inbox of ${sendTest.data.sent_to}.`} onClose={() => sendTest.reset()} className="os-mb-4 os-max-w-full" />
      )}
      <MutationErrorNotification isError={sendTest.isError} error={sendTest.error} title="Could not send the test email" className="os-mb-4" />

      {isLoading && <LoadingSpinner />}
      {isError && <ErrorMessage message="Could not load the preview." onRetry={refetch} />}
      {preview && (
        <>
          <p className="os-text-sm os-c-secondary os-mt-0 os-mb-2">Subject: <strong className="os-c-primary">{preview.subject}</strong></p>
          {/* sandbox with no permissions: the preview can't run scripts or reach the app. */}
          <iframe title="Email preview" sandbox="" srcDoc={preview.html} className="os-email-preview" />
        </>
      )}
    </SectionCard>
  );
}
