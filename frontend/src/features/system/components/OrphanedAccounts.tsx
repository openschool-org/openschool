import { useMemo, useState } from "react";
import { Button } from "antd";
import { DeleteOutlined, SyncOutlined } from "@ant-design/icons";
import DataGrid from "@/shared/ui/DataGrid";
import TableSkeleton from "@/shared/ui/TableSkeleton";
import { useOrphanedAccounts, useDeleteOrphanedAccount } from "@/features/system/queries/useIdentityReconciliation";
import ErrorMessage from "@/shared/ui/ErrorMessage";
import EmptyState from "@/shared/ui/EmptyState";
import ConfirmDeleteModal from "@/shared/ui/ConfirmDeleteModal";

import MutationErrorNotification from "@/shared/ui/MutationErrorNotification";
import FilterBar from "@/shared/ui/FilterBar";

// Admin-triggered reconciliation: identity accounts are reviewed and deleted one at a time, never in a background job.
export default function OrphanedAccounts() {
  const [loaded, setLoaded] = useState(false);
  const { data: orphaned, isLoading, isError, refetch, isFetching } = useOrphanedAccounts(loaded);
  const deleteOrphan = useDeleteOrphanedAccount();
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  // The list comes from ThunderID in one call and stays small, so filtering here is enough.
  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return orphaned ?? [];
    return (orphaned ?? []).filter((a) => [a.username, a.email, a.id].some((v) => v?.toLowerCase().includes(q)));
  }, [orphaned, search]);

  return (
    <div className="os-stack os-gap-4">
      <MutationErrorNotification isError={deleteOrphan.isError} error={deleteOrphan.error} title="Could not delete account" />
      <div className="os-section">
        <div className="os-section__header os-tt-head">
          <div>
            <h2 className="os-section__title">Orphaned accounts</h2>
            <p className="os-text-sm os-c-secondary os-m-0">Sign-in accounts with no matching user here, left behind when a signup failed partway. Safe to review and delete.</p>
          </div>
          <Button type={loaded ? "default" : "primary"} icon={<SyncOutlined />} loading={isFetching} onClick={() => (loaded ? refetch() : setLoaded(true))}>
            {isFetching ? "Checking…" : loaded ? "Check again" : "Check now"}
          </Button>
        </div>

        {!loaded ? (
          <p className="os-m-0 os-px-6 os-py-5 os-text-sm os-c-tertiary">Nothing checked yet. The check asks the sign-in service for every account, so it only runs when you ask.</p>
        ) : isError ? (
          <ErrorMessage message="Could not check for orphaned accounts." onRetry={refetch} />
        ) : isLoading ? (
          <TableSkeleton headers={["Account", "ID", ""]} />
        ) : !orphaned?.length ? (
          <EmptyState title="No orphaned accounts" description="Every sign-in account has a matching user." />
        ) : (
          <>
            <div className="os-card-search">
              <FilterBar search={{ value: search, onChange: setSearch, placeholder: "Search by username, email or ID" }} />
            </div>
            {shown.length === 0 ? (
              <EmptyState title="No accounts match your search" description="Try another username, email or ID." />
            ) : (
              <DataGrid
                rows={shown}
                getRowId={(a) => a.id}
                noHover
                pagination={false}
                columns={[
                  { key: "account", header: "Account", render: (a) => <span className="os-fw-500">{a.username || a.email || "(no username or email)"}</span> },
                  { key: "id", header: "ID", render: (a) => <span className="os-table__mono">{a.id}</span> },
                  { key: "actions", header: "", align: "end", render: (a) => <Button type="text" danger size="small" icon={<DeleteOutlined />} onClick={() => setPendingDeleteId(a.id)}>Delete</Button> },
                ]}
              />
            )}
          </>
        )}
      </div>

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
