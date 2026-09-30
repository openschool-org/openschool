import { useState } from "react";
import { Button, InlineNotification, Select, SelectItem } from "@carbon/react";
import { Download, Printer } from "@carbon/icons-react";
import { useActivationSettings, useGenerateCodes } from "@/features/activation/queries/useActivation";
import type { ActivationRole, GeneratedBatch } from "@/features/activation/api/activation";
import { downloadBatchCsv } from "@/features/activation/lib/codeSheet";
import CodeSlips from "@/features/activation/components/CodeSlips";
import { printSlips } from "@/features/activation/lib/print";
import { useCurrentClasses } from "@/features/academics/queries/useClasses";
import SectionCard from "@/shared/ui/SectionCard";
import ConfirmActionModal from "@/shared/ui/ConfirmActionModal";
import MutationErrorNotification from "@/shared/ui/MutationErrorNotification";
import { formatDate } from "@/shared/lib/date";

const ROLE_LABELS: Record<ActivationRole, string> = { student: "Students", parent: "Parents and guardians" };

// Issues codes and shows them once; after leaving this card they can only be reissued, not viewed.
export default function GenerateCodesCard() {
  const { data: settings } = useActivationSettings();
  const { data: classes } = useCurrentClasses();
  const generate = useGenerateCodes();
  const [chosenRole, setChosenRole] = useState<ActivationRole | null>(null);
  const [classId, setClassId] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [batch, setBatch] = useState<GeneratedBatch | null>(null);

  const enabled = (["student", "parent"] as const).filter((r) => (r === "student" ? settings?.student_enabled : settings?.parent_enabled));
  const role = enabled.find((r) => r === chosenRole) ?? enabled[0];

  const run = () => {
    setConfirming(false);
    if (!role) return;
    generate.mutate({ role, class_id: classId || undefined }, { onSuccess: setBatch });
  };

  return (
    <SectionCard title="Activation codes">
      {!role ? (
        <p className="os-text-sm os-c-secondary os-m-0">Turn on self-activation for students or parents above to generate codes.</p>
      ) : (
        <>
          <p className="os-text-sm os-c-secondary os-mt-0 os-mb-4">
            Each person without a login gets one code. Generating again for the same people cancels their earlier codes.
          </p>
          <div className="os-grid os-grid-cols-2 os-gap-5 os-mb-5">
            <Select id="codes-role" labelText="Account type" value={role} onChange={(e) => setChosenRole(e.target.value as ActivationRole)}>
              {enabled.map((r) => <SelectItem key={r} value={r} text={ROLE_LABELS[r]} />)}
            </Select>
            <Select id="codes-class" labelText="Class (current year)" helperText="For parents, the class of their child." value={classId} onChange={(e) => setClassId(e.target.value)}>
              <SelectItem value="" text="Everyone without a login" />
              {classes?.map((c) => <SelectItem key={c.id} value={c.id} text={c.name} />)}
            </Select>
          </div>
          <Button kind="primary" size="md" onClick={() => setConfirming(true)} disabled={generate.isPending}>
            {generate.isPending ? "Generating…" : "Generate codes"}
          </Button>
        </>
      )}
      <MutationErrorNotification isError={generate.isError} error={generate.error} title="Could not generate codes" className="os-mt-4" />

      {batch && (
        <div className="os-mt-5">
          {batch.codes.length === 0 ? (
            <InlineNotification kind="info" lowContrast hideCloseButton title="Nobody to issue" subtitle="Everyone in this selection already has a login." />
          ) : (
            <>
              <InlineNotification
                kind="warning"
                lowContrast
                hideCloseButton
                title={`${batch.codes.length} codes ready, valid until ${formatDate(batch.expires_at)}`}
                subtitle="Download or print them now. For security, they cannot be shown again."
              />
              <div className="os-flex os-gap-2 os-my-4">
                <Button kind="secondary" size="sm" renderIcon={Download} onClick={() => downloadBatchCsv(batch)}>Download CSV</Button>
                <Button kind="secondary" size="sm" renderIcon={Printer} onClick={printSlips}>Print slips</Button>
                <Button kind="ghost" size="sm" onClick={() => setBatch(null)}>Done</Button>
              </div>
              <CodeSlips batch={batch} />
            </>
          )}
        </div>
      )}

      <ConfirmActionModal
        open={confirming}
        title="Generate activation codes?"
        description={`New codes will be issued to ${role ? ROLE_LABELS[role].toLowerCase() : ""} without a login${classId ? " in the chosen class" : ""}. Any codes they already have stop working.`}
        confirmLabel="Generate"
        onClose={() => setConfirming(false)}
        onConfirm={run}
      />
    </SectionCard>
  );
}
