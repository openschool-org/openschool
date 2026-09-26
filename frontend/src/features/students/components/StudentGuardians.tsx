import { useState } from "react";
import { Button } from "@carbon/react";
import { Add } from "@carbon/icons-react";
import {
  useGuardiansByStudent,
  useUnlinkGuardian,
  useSetPrimaryGuardian,
} from "@/features/guardians/queries/useGuardians";
import type { GuardianWithPrimary } from "@/features/guardians/api/guardian";
import EmptyState from "@/shared/ui/EmptyState";
import ConfirmDeleteModal from "@/shared/ui/ConfirmDeleteModal";
import AddGuardianModal from "@/features/students/components/AddGuardianModal";
import ProvisionLoginModal from "@/features/students/components/ProvisionLoginModal";
import GuardianRow from "@/features/students/components/GuardianRow";
import MutationErrorNotification from "@/shared/ui/MutationErrorNotification";

// A student can have at most 2 guardians on file.
const MAX_GUARDIANS = 2;

export default function StudentGuardians({ studentId }: { studentId: string }) {
  const { data: guardians, isLoading } = useGuardiansByStudent(studentId);
  const unlinkGuardian = useUnlinkGuardian(studentId);
  const setPrimary = useSetPrimaryGuardian(studentId);

  const [addOpen, setAddOpen] = useState(false);
  const [loginFor, setLoginFor] = useState<GuardianWithPrimary | null>(null);
  const [toUnlink, setToUnlink] = useState<GuardianWithPrimary | null>(null);

  const atMax = (guardians?.length ?? 0) >= MAX_GUARDIANS;

  return (
    <div className="os-section">
      <div className="os-section__header">
        <h2 className="os-section__title">Guardians</h2>
        <Button
          renderIcon={Add}
          kind="ghost"
          size="sm"
          onClick={() => setAddOpen(true)}
          disabled={atMax}
        >
          Add guardian
        </Button>
      </div>
      <div className="os-section__body">
        <MutationErrorNotification
          isError={setPrimary.isError}
          error={setPrimary.error}
          title="Could not set primary contact"
          fallback="Please try again."
          onClose={() => setPrimary.reset()} className="os-mb-4"
        />
        <MutationErrorNotification
          isError={unlinkGuardian.isError}
          error={unlinkGuardian.error}
          title="Could not remove guardian"
          fallback="Please try again."
          onClose={() => unlinkGuardian.reset()} className="os-mb-4"
        />
        {atMax && (
          <p className="os-mt-0 os-mx-0 os-mb-4 os-text-xs os-c-tertiary">
            A student can have at most {MAX_GUARDIANS} guardians on file. Remove one to add another.
          </p>
        )}

        {!isLoading && guardians?.length === 0 && (
          <EmptyState
            title="No guardians yet"
            description="Every student needs at least one guardian on file."
          />
        )}

        {!isLoading && guardians && guardians.length > 0 && (
          <div className="os-grid os-gap-3">
            {guardians.map((g) => (
              <GuardianRow
                key={g.id}
                guardian={g}
                onSetPrimary={() => setPrimary.mutate(g.id)}
                isSettingPrimary={setPrimary.isPending}
                onSetUpLogin={() => setLoginFor(g)}
                onRemove={() => setToUnlink(g)}
              />
            ))}
          </div>
        )}
      </div>

      {addOpen && (
        <AddGuardianModal
          studentId={studentId}
          existingGuardianIds={(guardians ?? []).map((g) => g.id)}
          onClose={() => setAddOpen(false)}
        />
      )}
      {loginFor && (
        <ProvisionLoginModal
          studentId={studentId}
          guardian={loginFor}
          onClose={() => setLoginFor(null)}
        />
      )}

      <ConfirmDeleteModal
        open={!!toUnlink}
        title="Remove guardian"
        description={
          <>
            Remove <strong>{toUnlink?.full_name}</strong> from this student? Their guardian
            record isn't deleted - this only unlinks them from this student.
          </>
        }
        subject="Guardian"
        successVerb="removed"
        mutation={unlinkGuardian}
        onClose={() => setToUnlink(null)}
        onConfirm={() => {
          if (toUnlink) unlinkGuardian.mutate(toUnlink.id);
        }}
      />
    </div>
  );
}
