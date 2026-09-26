import { useState } from "react";
import { Link } from "react-router";
import { UserRole, Add } from "@carbon/icons-react";
import { Button, Tag, SkeletonText } from "@carbon/react";
import { usePositions, useRemovePosition } from "@/features/positions/queries/usePositions";
import { AssignPrincipalModal, AddVicePrincipalModal } from "@/features/positions/components/PositionModals";
import type { TeacherPosition } from "@/features/positions/api/position";
import EmptyState from "@/shared/ui/EmptyState";
import ErrorMessage from "@/shared/ui/ErrorMessage";
import ConfirmDeleteModal from "@/shared/ui/ConfirmDeleteModal";
import MutationErrorNotification from "@/shared/ui/MutationErrorNotification";
import RemoveIconButton from "@/shared/ui/RemoveIconButton";
import SectionHeader from "@/shared/ui/SectionHeader";

const Title = ({ text }: { text: string }) => (
  <span className="os-flex os-items-center os-gap-2">
    <UserRole size={16} className="os-fill-accent" /> {text}
  </span>
);

export default function Positions() {
  const { data: positions, isLoading, isError, refetch } = usePositions();
  const removePosition = useRemovePosition();
  const [principalOpen, setPrincipalOpen] = useState(false);
  const [vpOpen, setVpOpen] = useState(false);
  const [vpToRemove, setVpToRemove] = useState<TeacherPosition | null>(null);

  const principal = positions?.find((p) => p.position === "principal");
  const vicePrincipals = positions?.filter((p) => p.position === "vice_principal") ?? [];
  const skeleton = <div className="os-py-5 os-px-6"><SkeletonText width="40%" /></div>;

  return (
    <div className="os-page">
      <div className="os-page__header">
        <div className="os-page__header-left">
          <h1 className="os-page__title">Principal and VPs</h1>
          <p className="os-page__subtitle">Principal and vice principals. They decide who can send school-wide notices.</p>
        </div>
        <Button renderIcon={Add} kind="primary" size="md" onClick={() => setVpOpen(true)}>Add vice principal</Button>
      </div>

      {isError && <div className="os-mb-6"><ErrorMessage message="Could not load positions." onRetry={refetch} /></div>}
      <MutationErrorNotification isError={removePosition.isError} error={removePosition.error} title="Could not remove position" fallback="Please try again." onClose={() => removePosition.reset()} />

      <div className="os-section">
        <SectionHeader title={<Title text="Principal" />} />
        {isLoading ? (
          skeleton
        ) : !principal ? (
          <>
            <EmptyState title="No principal assigned" description="Assign the school's Principal." />
            <div className="os-px-6 os-pb-5">
              <Button kind="tertiary" size="sm" onClick={() => setPrincipalOpen(true)}>Assign principal</Button>
            </div>
          </>
        ) : (
          <div className="os-flex os-items-center os-gap-4 os-py-3 os-px-6">
            <div className="os-flex-1 os-min-w-0">
              <Link to={`/teachers/${principal.teacher_id}`} className="os-table__link os-text-md os-fw-500">{principal.teacher_name}</Link>
              <p className="os-mt-h os-mx-0 os-mb-0 os-text-xs os-c-secondary">Notifies the whole school</p>
            </div>
            <Button kind="ghost" size="sm" onClick={() => setPrincipalOpen(true)}>Change</Button>
          </div>
        )}
      </div>

      <div className="os-section">
        <SectionHeader title={<Title text="Vice principals" />} meta={<span className="os-section__meta">{vicePrincipals.length}</span>} />
        {isLoading ? (
          skeleton
        ) : vicePrincipals.length === 0 ? (
          <EmptyState title="No vice principals yet" description="Add a Vice Principal and set their notification reach." />
        ) : (
          vicePrincipals.map((vp) => (
            <div key={vp.id} className="os-list-row os-py-3 os-px-6">
              <div className="os-flex-1 os-min-w-0">
                <Link to={`/teachers/${vp.teacher_id}`} className="os-table__link os-text-md os-fw-500">{vp.teacher_name}</Link>
              </div>
              <Tag type={vp.notify_whole_school ? "blue" : "gray"} size="sm">{vp.notify_whole_school ? "Whole school" : "Scoped to assigned grades"}</Tag>
              <RemoveIconButton disabled={removePosition.isPending} onClick={() => setVpToRemove(vp)} />
            </div>
          ))
        )}
      </div>

      {principalOpen && <AssignPrincipalModal currentTeacherId={principal?.teacher_id ?? ""} onClose={() => setPrincipalOpen(false)} />}
      {vpOpen && <AddVicePrincipalModal onClose={() => setVpOpen(false)} />}

      <ConfirmDeleteModal
        open={!!vpToRemove}
        title="Remove vice principal"
        description={<>Remove <strong>{vpToRemove?.teacher_name}</strong> as Vice Principal? They will stop receiving notifications for their assigned scope.</>}
        confirmLabel="Remove"
        pendingLabel="Removing…"
        subject="Vice Principal"
        successVerb="removed"
        mutation={removePosition}
        onClose={() => setVpToRemove(null)}
        onConfirm={() => vpToRemove && removePosition.mutate(vpToRemove.id)}
      />
    </div>
  );
}
