import ActivationSettingsCard from "@/features/activation/components/ActivationSettingsCard";
import GenerateCodesCard from "@/features/activation/components/GenerateCodesCard";
import ActivationBatches from "@/features/activation/components/ActivationBatches";

// Settings > Account activation: the switches, code generation and issued batches.
export default function ActivationTab() {
  return (
    <div className="os-flex os-col os-gap-5 os-mt-4">
      <ActivationSettingsCard />
      <GenerateCodesCard />
      <ActivationBatches />
    </div>
  );
}
