import { useState } from "react";
import { Close } from "@carbon/icons-react";
import { Checkbox, Pagination, Tile, Tag, TableToolbarSearch, ClickableTile, Button } from "@carbon/react";
import { useGuardians } from "@/features/guardians/queries/useGuardians";
import { useDebounced } from "@/shared/hooks/useDebounced";
import EmptyState from "@/shared/ui/EmptyState";
import ErrorMessage from "@/shared/ui/ErrorMessage";
import Avatar from "@/shared/ui/Avatar";
import ListRowSkeleton from "@/shared/ui/ListRowSkeleton";
import { relationshipLabel } from "@/features/guardians/constants";
import GuardianDetail from "@/features/guardians/components/GuardianDetail";
import { usePersistedPageSize } from "@/shared/hooks/usePersistedPageSize";

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
            <TableToolbarSearch
              persistent
              placeholder="Search guardians by name, phone, or email…"
              value={search}
              onChange={(e) => { setSearch(typeof e === "string" ? e : e.target.value); setPage(1); }}
            />
          </div>
          <Checkbox
            id="orphans-only"
            labelText="Unlinked guardians only (orphans)"
            checked={orphansOnly}
            onChange={(_e, { checked }) => { setOrphansOnly(checked); setPage(1); }}
          />
        </div>

        {(search || orphansOnly) && (
          <div className="os-flex os-items-center os-gap-2 os-wrap os-mt-3">
            <span className="os-text-xs os-fw-600 os-c-tertiary">Active filters:</span>
            {orphansOnly && <Tag type="magenta" filter onClose={() => { setOrphansOnly(false); setPage(1); }}>Filter: Unlinked Only</Tag>}
            {search && <Tag type="blue" filter onClose={() => { setSearch(""); setPage(1); }}>Search: "{search}"</Tag>}
            <Button kind="ghost" size="sm" renderIcon={Close} onClick={() => { setSearch(""); setOrphansOnly(false); setPage(1); }}>
              Clear all
            </Button>
          </div>
        )}
      </div>

      {isError && <ErrorMessage message="Could not load guardian records." onRetry={refetch} />}

      <div className="os-grid os-grid-cols-side os-gap-6 os-items-grid-start">
        <div className="os-section os-bg-layer os-mt-0 os-p-0 os-overflow-hidden">
          {isLoading && (
            <div className="os-p-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <ListRowSkeleton key={i} leadingWidth="2.25rem" titleWidth="70%" subtitleWidth={null} trailingWidth={null} />
              ))}
            </div>
          )}

          {!isLoading && !isError && ordered.length === 0 && (
            <div className="os-p-6">
              <EmptyState
                title={isSearching ? "No matching guardians" : "No guardians found"}
                description={
                  isSearching
                    ? "Try searching by a different name, phone number, or email address."
                    : "Guardians are automatically linked when adding or editing student profiles."
                }
              />
            </div>
          )}

          {!isLoading &&
            ordered.map((g) => {
              const isSelected = selected?.id === g.id;
              return (
                <ClickableTile
                  key={g.id}
                  onClick={() => setSelectedId(g.id)}
                  className={`${`os-list-row${isSelected ? " is-selected" : ""}`} os-flex os-items-center os-gap-3 os-py-3h os-px-5 os-rounded-0 os-border-b ${isSelected ? "os-bg-accent-light" : "os-bg-layer"}`}
                >
                  <Avatar name={g.full_name} size="sm" />
                  <div className="os-min-w-0 os-flex-1">
                    <div className="os-fw-600 os-text-md os-c-primary os-overflow-hidden os-truncate os-nowrap"
                    >
                      {g.full_name}
                    </div>
                    <div className="os-text-xs os-c-tertiary">
                      {relationshipLabel(g.relationship)} · {g.phone}
                    </div>
                  </div>
                </ClickableTile>
              );
            })}

          {!isLoading && ordered.length > 0 && (
            <Pagination
              totalItems={totalItems}
              page={page}
              pageSize={pageSize}
              pageSizes={[10, 25, 50, 100]}
              onChange={onChange}
              size="sm"
            />
          )}
        </div>

        {selected ? (
          <GuardianDetail guardian={selected} onDeleted={() => setSelectedId(null)} />
        ) : (
          <Tile className="os-section os-bg-layer os-mt-0 os-text-center os-py-12 os-px-6">
            <EmptyState title="Select a guardian" description="Choose a guardian from the directory list to view contact info and linked students." />
          </Tile>
        )}
      </div>
    </div>
  );
}


