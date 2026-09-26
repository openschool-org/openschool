import { useState } from "react";
import { Button, SkeletonText } from "@carbon/react";
import { TrashCan } from "@carbon/icons-react";
import { useOrphanedAccounts, useDeleteOrphanedAccount } from "@/features/system/queries/useIdentityReconciliation";
import ErrorMessage from "@/shared/ui/ErrorMessage";
import EmptyState from "@/shared/ui/EmptyState";
import ConfirmDeleteModal from "@/shared/ui/ConfirmDeleteModal";

import MutationErrorNotification from "@/shared/ui/MutationErrorNotification";

// Admin-triggered reconciliation: identity accounts are reviewed and deleted one at a time, never in a background job.
export default function OrphanedAccounts() {
  const [loaded, setLoaded] = useState(false);
  const { data: orphaned, isLoading, isError, refetch, isFetching } = useOrphanedAccounts(loaded);
  const deleteOrphan = useDeleteOrphanedAccount();
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  return (
    <div>
      <div className="os-page__header">
        <div>
          <h2 className="os-section__title os-m-0">
            Orphaned accounts
          </h2>
          <p className="os-page__subtitle os-mt-1">
            ThunderID accounts with no matching local user record - left behind when a signup failed partway
            through. Safe to review and delete.
          </p>
        </div>
        <Button kind={loaded ? "secondary" : "primary"} onClick={() => (loaded ? refetch() : setLoaded(true))} disabled={isFetching}>
          {isFetching ? "Checking…" : loaded ? "Re-check" : "Check for orphaned accounts"}
        </Button>
      </div>

      <MutationErrorNotification
        isError={deleteOrphan.isError}
        error={deleteOrphan.error}
        title="Could not delete account" className="os-mb-4"
      />

      {isError && <ErrorMessage message="Could not check for orphaned accounts." onRetry={refetch} />}

      {loaded && (
        <div className="os-section">
          {isLoading && (
            <div>
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="os-flex os-gap-4 os-py-3h os-px-6 os-border-b">
                  <SkeletonText width="15rem" />
                </div>
              ))}
            </div>
          )}

          {!isLoading && !isError && (orphaned?.length ?? 0) === 0 && (
            <EmptyState title="No orphaned accounts found" description="Every ThunderID account has a matching local user record." />
          )}

          {!isLoading && orphaned && orphaned.length > 0 && (
            <div>
              {orphaned.map((account, i) => (
                <div
                  key={account.id} className={`os-flex os-items-center os-justify-between os-py-3h os-px-6 ${i < orphaned.length - 1 ? "os-border-b" : ""}`}
                >
                  <div>
                    <p className="os-m-0 os-fw-600 os-text-md">
                      {account.username || account.email || "(no username/email on file)"}
                    </p>
                    <p className="os-mt-h os-mx-0 os-mb-0 os-text-xs os-c-tertiary">ID: {account.id}</p>
                  </div>
                  <Button
                    kind="danger--tertiary"
                    size="sm"
                    renderIcon={TrashCan}
                    onClick={() => setPendingDeleteId(account.id)}
                  >
                    Delete
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <ConfirmDeleteModal
        open={!!pendingDeleteId}
        title="Delete orphaned account"
        description="This permanently deletes the ThunderID account. This can't be undone. Only do this if you're sure no signup for this account is still in progress."
        subject="Account"
        mutation={deleteOrphan}
        onClose={() => setPendingDeleteId(null)}
        onConfirm={() => {
          if (!pendingDeleteId) return;
          deleteOrphan.mutate(pendingDeleteId);
        }}
      />
    </div>
  );
}
