import { useState } from "react";
import { Button, Card } from "antd";
import { KeyOutlined } from "@ant-design/icons";
import SelectField from "@/shared/ui/SelectField";
import { useActivationSettings, useGenerateCodes } from "@/features/activation/queries/useActivation";
import type { ActivationRole, GeneratedBatch } from "@/features/activation/api/activation";
import { useCurrentClasses } from "@/features/academics/queries/useClasses";
import IssuedBatchPanel from "@/features/activation/components/IssuedBatchPanel";
import ConfirmActionModal from "@/shared/ui/ConfirmActionModal";
import MutationErrorNotification from "@/shared/ui/MutationErrorNotification";
import { ROLE_LABELS } from "@/features/activation/lib/roles";


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
    <Card className="os-form-card" title="Activation codes">
      {!role ? (
        <p className="os-text-sm os-c-secondary os-m-0">Turn on self-activation for students or guardians above to generate codes.</p>
      ) : (
        <>
          <p className="os-text-sm os-c-secondary os-mt-0 os-mb-4">
            Each person without a login gets one code. Generating again for the same people cancels their earlier codes.
          </p>
          <div className="os-settings-grid os-mb-5">
            <SelectField id="codes-role" label="Account type" value={role} onChange={(v) => setChosenRole(v as ActivationRole)} options={enabled.map((r) => ({ value: r, label: ROLE_LABELS[r].many }))} />
            <SelectField
              id="codes-class"
              label="Class (current year)"
              helperText="For guardians, the class of their child."
              showSearch
              value={classId}
              onChange={setClassId}
              options={[{ value: "", label: "Everyone without a login" }, ...(classes ?? []).map((c) => ({ value: c.id, label: c.name }))]}
            />
          </div>
          <Button type="primary" icon={<KeyOutlined />} onClick={() => setConfirming(true)} loading={generate.isPending}>
            {generate.isPending ? "Generating…" : "Generate codes"}
          </Button>
        </>
      )}
      <MutationErrorNotification isError={generate.isError} error={generate.error} title="Could not generate codes" className="os-mt-4" />

      {batch && (
        <div className="os-mt-5">
          <IssuedBatchPanel batch={batch} onDone={() => setBatch(null)} />
        </div>
      )}

      <ConfirmActionModal
        open={confirming}
        title="Generate activation codes?"
        description={`New codes will be issued to ${role ? ROLE_LABELS[role].many.toLowerCase() : ""} without a login${classId ? " in the chosen class" : ""}. Any codes they already have stop working.`}
        confirmLabel="Generate"
        onClose={() => setConfirming(false)}
        onConfirm={run}
      />
    </Card>
  );
}
