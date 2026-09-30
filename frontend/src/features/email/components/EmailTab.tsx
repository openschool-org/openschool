import EmailStatusCard from "@/features/email/components/EmailStatusCard";
import EmailPreviewCard from "@/features/email/components/EmailPreviewCard";

// Settings > Email: where mail goes, and what each email looks like.
export default function EmailTab() {
  return (
    <div className="os-flex os-col os-gap-5 os-mt-4">
      <EmailStatusCard />
      <EmailPreviewCard />
    </div>
  );
}
