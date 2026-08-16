import { useMemo, useState } from "react";
import { Search } from "@carbon/icons-react";
import { SkeletonText, Checkbox, Pagination } from "@carbon/react";
import { useGuardians, useSearchGuardians } from "../../../queries/useGuardians";
import { usePagination } from "../../../hooks/usePagination";
import EmptyState from "../../../components/common/EmptyState";
import ErrorMessage from "../../../components/common/ErrorMessage";
import Avatar from "../../../components/common/Avatar";
import { relationshipLabel } from "./constants";
import GuardianDetail from "./components/GuardianDetail";

export default function GuardiansDirectory() {
  const [search, setSearch] = useState("");
  const [orphansOnly, setOrphansOnly] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const allGuardians = useGuardians(orphansOnly);
  const searchResults = useSearchGuardians(search, orphansOnly);
  const isSearching = search.trim().length > 0;

  const { data: guardians, isLoading, isError, refetch } = isSearching ? searchResults : allGuardians;

  const ordered = useMemo(() => {
    if (!guardians) return [];
    return [...guardians].sort((a, b) => a.full_name.localeCompare(b.full_name));
  }, [guardians]);

  const selected = ordered.find((g) => g.id === selectedId) ?? null;

  const { page, pageSize, pageItems, totalItems, onChange } = usePagination(ordered, 10);

  return (
    <div className="os-page">
      <div className="os-page__header">
        <div className="os-page__header-left">
          <h1 className="os-page__title">Guardians</h1>
          <p className="os-page__subtitle">
            Every guardian on file — search by name, phone, or email. One
            guardian can be linked to multiple students (siblings share a
            record instead of duplicating it).
          </p>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "1.5rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
        <div className="os-search" style={{ maxWidth: "24rem" }}>
          <Search size={16} className="os-search__icon" />
          <input
            className="os-search__input"
            placeholder="Search guardians…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Checkbox
          id="orphans-only"
          labelText="Orphans only — linked to no student"
          checked={orphansOnly}
          onChange={(_e, { checked }) => setOrphansOnly(checked)}
        />
      </div>

      {isError && <ErrorMessage message="Could not load guardians." onRetry={refetch} />}

      <div style={{ display: "grid", gridTemplateColumns: "20rem 1fr", gap: "1.5rem", alignItems: "start" }}>
        <div className="os-section" style={{ marginTop: 0 }}>
          {isLoading && (
            <div>
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} style={{ padding: "0.875rem 1.5rem", borderBottom: "1px solid #e0e0e0" }}>
                  <SkeletonText width="70%" />
                </div>
              ))}
            </div>
          )}

          {!isLoading && !isError && ordered.length === 0 && (
            <EmptyState
              title={isSearching ? "No matches" : "No guardians yet"}
              description={
                isSearching
                  ? "Try a different name, phone number, or email."
                  : "Guardians are added from a student's profile."
              }
            />
          )}

          {!isLoading &&
            pageItems.map((g, i) => (
              <button
                key={g.id}
                onClick={() => setSelectedId(g.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  width: "100%",
                  textAlign: "left",
                  padding: "0.75rem 1.5rem",
                  border: "none",
                  borderBottom: i < pageItems.length - 1 ? "1px solid #e0e0e0" : "none",
                  background: selected?.id === g.id ? "#edf5ff" : "transparent",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  transition: "background 70ms ease",
                }}
                onMouseEnter={(e) => {
                  if (selected?.id !== g.id) e.currentTarget.style.background = "#f4f4f4";
                }}
                onMouseLeave={(e) => {
                  if (selected?.id !== g.id) e.currentTarget.style.background = "transparent";
                }}
              >
                <Avatar name={g.full_name} size="sm" />
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontWeight: 600,
                      fontSize: "0.875rem",
                      color: "#161616",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {g.full_name}
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "#8d8d8d" }}>
                    {relationshipLabel(g.relationship)} · {g.phone}
                  </div>
                </div>
              </button>
            ))}

          {!isLoading && ordered.length > 0 && (
            <Pagination
              totalItems={totalItems}
              page={page}
              pageSize={pageSize}
              pageSizes={[10, 20, 50]}
              onChange={onChange}
              size="sm"
            />
          )}
        </div>

        {selected ? (
          <GuardianDetail guardian={selected} onDeleted={() => setSelectedId(null)} />
        ) : (
          <div className="os-section" style={{ marginTop: 0 }}>
            <EmptyState title="Select a guardian" description="Pick a guardian from the list to see their details." />
          </div>
        )}
      </div>
    </div>
  );
}
