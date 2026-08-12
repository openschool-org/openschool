import { useState } from "react";
import { Button } from "@carbon/react";
import { Add } from "@carbon/icons-react";
import {
  useGuardiansByStudent,
  useUnlinkGuardian,
  useSetPrimaryGuardian,
} from "../../../queries/useGuardians";
import type { GuardianWithPrimary } from "../../../services/guardian";
import EmptyState from "../../../components/common/EmptyState";
import ConfirmDeleteModal from "../../../components/common/ConfirmDeleteModal";
import AddGuardianModal from "./components/AddGuardianModal";
import ProvisionLoginModal from "./components/ProvisionLoginModal";
import GuardianRow from "./components/GuardianRow";

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
          Add Guardian
        </Button>
      </div>
      <div className="os-section__body">
        {atMax && (
          <p style={{ margin: "0 0 1rem", fontSize: "0.75rem", color: "#8d8d8d" }}>
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
          <div style={{ display: "grid", gap: "0.75rem" }}>
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
            record isn't deleted — this only unlinks them from this student.
          </>
        }
        isPending={unlinkGuardian.isPending}
        onClose={() => setToUnlink(null)}
        onConfirm={() => {
          if (toUnlink) unlinkGuardian.mutate(toUnlink.id, { onSettled: () => setToUnlink(null) });
        }}
      />
    </div>
  );
}
