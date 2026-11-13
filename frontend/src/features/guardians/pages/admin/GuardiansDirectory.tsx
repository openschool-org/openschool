import { useState } from "react";
import { CloseOutlined, SearchOutlined } from "@ant-design/icons";
import { Button, Checkbox, Drawer, Input, Tag } from "antd";
import DataGrid, { type GridColumn } from "@/shared/ui/DataGrid";
import ListState from "@/shared/ui/ListState";
import TableSkeleton from "@/shared/ui/TableSkeleton";
import type { Guardian } from "@/features/guardians/api/guardian";
import { useGuardians } from "@/features/guardians/queries/useGuardians";
import { useDebounced } from "@/shared/hooks/useDebounced";
import ErrorMessage from "@/shared/ui/ErrorMessage";
import Avatar from "@/shared/ui/Avatar";
import { relationshipLabel } from "@/features/guardians/constants";
import GuardianDetail from "@/features/guardians/components/GuardianDetail";
import { usePersistedPageSize } from "@/shared/hooks/usePersistedPageSize";
import { displayName } from "@/shared/lib/name";

// Server-paginated: search/orphansOnly/page/pageSize all live in the query
// key, so the server does the filtering and sorting instead of downloading
// every guardian.
export default function GuardiansDirectory() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounced(search, 300);
  const [orphansOnly, setOrphansOnly] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = usePersistedPageSize("guardians");
  const isSearching = search.trim().length > 0;

  const { data, isLoading, isError, refetch } = useGuardians({
    limit: pageSize,
    offset: (page - 1) * pageSize,
    search: debouncedSearch,
    orphansOnly,
  });
  const ordered = data?.items ?? [];
  const totalItems = data?.total ?? 0;

  const selected = ordered.find((g) => g.id === selectedId) ?? null;

  const columns: GridColumn<Guardian>[] = [
    {
      key: "name",
      header: "Name",
      render: (g) => (
        <div className="os-flex os-items-center os-gap-2">
          <Avatar name={g.full_name} size="sm" />
          <span className="os-table__link" title={g.full_name}>{displayName(g)}</span>
        </div>
      ),
    },
    { key: "relationship", header: "Relationship", render: (g) => <span className="os-table__muted">{relationshipLabel(g.relationship)}</span> },
    { key: "phone", header: "Phone", render: (g) => <span className="os-table__muted">{g.phone || "-"}</span> },
    { key: "nic", header: "NIC number", render: (g) => <span className="os-table__mono">{g.nic_number || "-"}</span> },
    { key: "email", header: "Email", render: (g) => <span className="os-table__muted">{g.email ?? "-"}</span> },
  ];

  const onChange = ({ page: p, pageSize: ps }: { page: number; pageSize: number }) => {
    setPage(p);
    setPageSize(ps);
  };

  return (
    <div className="os-page">
      <div className="os-page__header">
        <div className="os-page__header-left">
          <h1 className="os-page__title">Guardians</h1>
          <p className="os-page__subtitle">
            Directory of parents and guardians linked to student profiles.
          </p>
        </div>
      </div>

      <div className="os-section os-bg-layer os-mb-6 os-py-4 os-px-6">
        <div className="os-flex os-items-center os-gap-6 os-wrap">
          <div className="os-flex-basis-18 os-min-w-14">
            <Input
              allowClear
              type="search"
              prefix={<SearchOutlined />}
              aria-label="Search guardians"
              placeholder="Search guardians by name, phone, email or NIC…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <Checkbox
            id="orphans-only"
            checked={orphansOnly}
            onChange={(e) => { setOrphansOnly(e.target.checked); setPage(1); }}
          >Unlinked guardians only (orphans)</Checkbox>
        </div>

        {(search || orphansOnly) && (
          <div className="os-flex os-items-center os-gap-2 os-wrap os-mt-3">
            <span className="os-text-xs os-fw-600 os-c-tertiary">Active filters:</span>
            {orphansOnly && <Tag color="processing" closable onClose={(e) => { e.preventDefault(); setOrphansOnly(false); setPage(1); }}>Filter: Unlinked only</Tag>}
            {search && <Tag color="processing" closable onClose={(e) => { e.preventDefault(); setSearch(""); setPage(1); }}>Search: "{search}"</Tag>}
            <Button type="text" icon={<CloseOutlined />} onClick={() => { setSearch(""); setOrphansOnly(false); setPage(1); }}>
              Clear all
            </Button>
          </div>
        )}
      </div>

      {isError && <ErrorMessage message="Could not load guardian records." onRetry={refetch} />}

      {/* Full-width list; a row opens the guardian's details in a side drawer. */}
      <div className="os-section">
        <ListState
          isLoading={isLoading}
          isError={false}
          isEmpty={ordered.length === 0}
          errorMessage="Could not load guardian records."
          onRetry={refetch}
          skeleton={<TableSkeleton headers={columns.map((c) => c.header)} />}
          empty={
            isSearching
              ? { title: "No matching guardians", description: "Try a different name, phone number, email address or NIC number." }
              : { title: "No guardians found", description: "Guardians are automatically linked when adding or editing student profiles." }
          }
        >
          <DataGrid
            rows={ordered}
            columns={columns}
            getRowId={(g) => g.id}
            onRowClick={(g) => setSelectedId(g.id)}
            countLabel={(shown, total) => `Showing ${shown} of ${total} guardians`}
            pageSizes={[10, 25, 50, 100]}
            server={{ page, pageSize, totalItems, onChange }}
          />
        </ListState>
      </div>

      <Drawer open={!!selected} onClose={() => setSelectedId(null)} size={640} title="Guardian" className="os-detail-drawer" destroyOnHidden>
        {selected && <GuardianDetail key={selected.id} guardian={selected} onDeleted={() => setSelectedId(null)} />}
      </Drawer>
    </div>
  );
}

