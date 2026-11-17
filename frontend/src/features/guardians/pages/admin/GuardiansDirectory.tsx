import { useState } from "react";
import { Checkbox, Drawer } from "antd";
import DataGrid, { type GridColumn } from "@/shared/ui/DataGrid";
import FilterBar from "@/shared/ui/FilterBar";
import ActiveFilterTags from "@/shared/ui/ActiveFilterTags";
import ListState from "@/shared/ui/ListState";
import TableSkeleton from "@/shared/ui/TableSkeleton";
import type { Guardian } from "@/features/guardians/api/guardian";
import { useGuardians } from "@/features/guardians/queries/useGuardians";
import { relationshipLabel } from "@/features/guardians/constants";
import GuardianDetail from "@/features/guardians/components/GuardianDetail";
import { useListFilters } from "@/shared/hooks/useListFilters";
import { useOpenParam } from "@/shared/hooks/useOpenParam";
import { usePersistedPageSize } from "@/shared/hooks/usePersistedPageSize";
import { displayName } from "@/shared/lib/name";
import PageHeader from "@/shared/ui/PageHeader";

const FILTER_LABELS: Record<string, string> = { query: "Search", orphans: "Filter" };

const columns: GridColumn<Guardian>[] = [
  {
    key: "name",
    header: "Name",
    render: (g) => (
      <div className="os-flex os-items-center os-gap-2">
        <span className="os-table__link" title={g.full_name}>{displayName(g)}</span>
      </div>
    ),
  },
  { key: "relationship", header: "Relationship", render: (g) => <span className="os-table__muted">{relationshipLabel(g.relationship)}</span> },
  { key: "phone", header: "Phone", render: (g) => <span className="os-table__muted">{g.phone || "-"}</span> },
  { key: "nic", header: "NIC number", render: (g) => <span className="os-table__mono">{g.nic_number || "-"}</span> },
  { key: "email", header: "Email", render: (g) => <span className="os-table__muted">{g.email ?? "-"}</span> },
];

// Server-paginated: search, orphans filter, page and page size all live in the query key.
export default function GuardiansDirectory() {
  const { filters, set, clear, activeKeys, debouncedSearch } = useListFilters({ query: "", orphans: "" });
  const { selectedId, select, close } = useOpenParam();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = usePersistedPageSize("guardians");

  const { data, isLoading, isError, refetch } = useGuardians({
    limit: pageSize,
    offset: (page - 1) * pageSize,
    search: debouncedSearch,
    orphansOnly: filters.orphans === "1",
  });
  const guardians = data?.items ?? [];
  const selected = guardians.find((g) => g.id === selectedId) ?? null;

  const setFilter = (key: keyof typeof filters, value: string) => {
    setPage(1);
    set(key, value);
  };

  return (
    <div className="os-page">
      <PageHeader title="Guardians" subtitle="Directory of parents and guardians linked to student profiles." />

      <div className="os-section">
        <FilterBar
          search={{ value: filters.query, onChange: (v) => setFilter("query", v), placeholder: "Search guardians by name, phone, email or NIC…" }}
          controls={[
            {
              label: "Unlinked guardians",
              node: (
                <Checkbox id="orphans-only" checked={filters.orphans === "1"} onChange={(e) => setFilter("orphans", e.target.checked ? "1" : "")}>
                  Unlinked guardians only (orphans)
                </Checkbox>
              ),
            },
          ]}
        />

        <ActiveFilterTags
          filters={activeKeys.map((k) => ({ key: k, label: FILTER_LABELS[k], value: k === "orphans" ? "Unlinked only" : `"${filters[k]}"` }))}
          onClear={(k) => { clear(k as keyof typeof filters); setPage(1); }}
          onClearAll={() => { clear(); setPage(1); }}
        />

        <ListState
          isLoading={isLoading}
          isError={isError}
          isEmpty={guardians.length === 0}
          errorMessage="Could not load guardian records."
          onRetry={refetch}
          skeleton={<TableSkeleton headers={columns.map((c) => c.header)} />}
          empty={
            filters.query.trim()
              ? { title: "No matching guardians", description: "Try a different name, phone number, email address or NIC number." }
              : { title: "No guardians found", description: "Guardians are automatically linked when adding or editing student profiles." }
          }
        >
          <DataGrid
            rows={guardians}
            columns={columns}
            getRowId={(g) => g.id}
            onRowClick={(g) => select(g.id)}
            countLabel={(shown, total) => `Showing ${shown} of ${total} guardians`}
            pageSizes={[10, 25, 50, 100]}
            server={{ page, pageSize, totalItems: data?.total ?? 0, onChange: ({ page: p, pageSize: ps }) => { setPage(p); setPageSize(ps); } }}
          />
        </ListState>
      </div>

      <Drawer open={!!selected} onClose={close} size={640} title="Guardian" className="os-detail-drawer" destroyOnHidden>
        {selected && <GuardianDetail key={selected.id} guardian={selected} onDeleted={close} />}
      </Drawer>
    </div>
  );
}
