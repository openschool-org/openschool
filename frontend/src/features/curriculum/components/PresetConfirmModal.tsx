import type { useRunCurriculumPreset } from "@/features/curriculum/queries/useCurriculumPreset";
import FormModal from "@/shared/ui/FormModal";

interface Props {
  open: boolean;
  runPreset: ReturnType<typeof useRunCurriculumPreset>;
  onClose: () => void;
  onLoad: () => void;
}

export default function PresetConfirmModal({ open, runPreset, onClose, onLoad }: Props) {
  return (
    <FormModal
      open={open}
      title="Load Sri Lanka curriculum preset"
      onClose={onClose}
      onSubmit={onLoad}
      isPending={runPreset.isPending}
      submitLabel="Load preset"
      pendingLabel="Loading…"
      isError={runPreset.isError}
      error={runPreset.error}
      errorFallback="Failed to load the curriculum preset"
    >
      <p className="os-text-md os-c-secondary os-mb-3">
        This creates the standard Grade 1-13 curriculum - compulsory subjects for primary and junior secondary,
        O/L baskets, and A/L streams - as subjects, levels, and selection groups.
      </p>
      <p className="os-text-md os-c-secondary">
        It only fills in what's missing for the grades your school actually has - safe to run more than once, and
        it won't touch anything you've already set up by hand.
      </p>
    </FormModal>
  );
}
