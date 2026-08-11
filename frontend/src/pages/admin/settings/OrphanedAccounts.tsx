import { useState } from "react";
import { Button, SkeletonText, InlineNotification } from "@carbon/react";
import { TrashCan } from "@carbon/icons-react";
import { useOrphanedAccounts, useDeleteOrphanedAccount } from "../../../queries/useIdentityReconciliation";
import ErrorMessage from "../../../components/common/ErrorMessage";
import EmptyState from "../../../components/common/EmptyState";
import ConfirmDeleteModal from "../../../components/common/ConfirmDeleteModal";
import { getErrorMessage } from "../../../lib/errorMessage";

// docs/plan.md §0 — admin-triggered reconciliation, not automatic: deleting
// a live identity account isn't something to do unattended, so this is a
// "load the list, review, delete one at a time" panel, not a background job.
export default function OrphanedAccounts() {
  const [loaded, setLoaded] = useState(false);
  const { data: orphaned, isLoading, isError, refetch, isFetching } = useOrphanedAccounts(loaded);
  const deleteOrphan = useDeleteOrphanedAccount();
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  return (
    <div>
      <div className="os-page__header">
        <div>
          <h2 className="os-section__title" style={{ margin: 0 }}>
            Orphaned Accounts
          </h2>
          <p className="os-page__subtitle" style={{ marginTop: "0.25rem" }}>
            ThunderID accounts with no matching local user record — left behind when a signup failed partway
            through. Safe to review and delete.
          </p>
        </div>
        <Button kind={loaded ? "secondary" : "primary"} onClick={() => (loaded ? refetch() : setLoaded(true))} disabled={isFetching}>
          {isFetching ? "Checking…" : loaded ? "Re-check" : "Check for orphaned accounts"}
        </Button>
      </div>

      {deleteOrphan.isError && (
        <InlineNotification
          kind="error"
          lowContrast
          hideCloseButton
          title="Could not delete account"
          subtitle={getErrorMessage(deleteOrphan.error)}
          style={{ marginBottom: "1rem", maxWidth: "100%" }}
        />
      )}

      {isError && <ErrorMessage message="Could not check for orphaned accounts." onRetry={refetch} />}

      {loaded && (
        <div className="os-section">
          {isLoading && (
            <div>
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} style={{ display: "flex", gap: "1rem", padding: "0.875rem 1.5rem", borderBottom: "1px solid #e0e0e0" }}>
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
                  key={account.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "0.875rem 1.5rem",
                    borderBottom: i < orphaned.length - 1 ? "1px solid #e0e0e0" : "none",
                  }}
                >
                  <div>
                    <p style={{ margin: 0, fontWeight: 600, fontSize: "0.875rem" }}>
                      {account.username || account.email || "(no username/email on file)"}
                    </p>
                    <p style={{ margin: "0.15rem 0 0", fontSize: "0.75rem", color: "#8d8d8d" }}>ID: {account.id}</p>
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
        isPending={deleteOrphan.isPending}
        onClose={() => setPendingDeleteId(null)}
        onConfirm={() => {
          if (!pendingDeleteId) return;
          deleteOrphan.mutate(pendingDeleteId, { onSuccess: () => setPendingDeleteId(null) });
        }}
      />
    </div>
  );
}
