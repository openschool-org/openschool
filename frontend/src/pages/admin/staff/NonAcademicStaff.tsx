import { useMemo, useState } from "react";
import { Search, Add } from "@carbon/icons-react";
import { SkeletonText, Button, Select, SelectItem, Pagination } from "@carbon/react";
import { useNonAcademicStaffList } from "../../../queries/useNonAcademicStaff";
import { NON_ACADEMIC_DESIGNATIONS } from "../../../services/nonAcademicStaff";
import { usePagination } from "../../../hooks/usePagination";
import EmptyState from "../../../components/common/EmptyState";
import ErrorMessage from "../../../components/common/ErrorMessage";
import Avatar from "../../../components/common/Avatar";
import { designationLabel } from "./constants";
import StaffFormModal from "./components/StaffFormModal";
import StaffDetail from "./components/StaffDetail";

export default function NonAcademicStaff() {
  const [search, setSearch] = useState("");
  const [designation, setDesignation] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const { data: staff, isLoading, isError, refetch } = useNonAcademicStaffList(search, designation);

  const ordered = useMemo(() => {
    if (!staff) return [];
    return [...staff].sort((a, b) => a.full_name.localeCompare(b.full_name));
  }, [staff]);

  const selected = ordered.find((s) => s.id === selectedId) ?? null;

  const { page, pageSize, pageItems, totalItems, onChange } = usePagination(ordered, 10);

  return (
    <div className="os-page">
      <div className="os-page__header">
        <div className="os-page__header-left">
          <h1 className="os-page__title">Non-Academic Staff</h1>
          <p className="os-page__subtitle">
            Lab assistants, librarians, office staff, and other staff without
            a portal login.
          </p>
        </div>
        <Button renderIcon={Add} kind="primary" size="md" onClick={() => setCreating(true)}>
          Add Staff
        </Button>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "1.5rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
        <div className="os-search" style={{ maxWidth: "24rem" }}>
          <Search size={16} className="os-search__icon" />
          <input
            className="os-search__input"
            placeholder="Search staff…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select
          id="staff-designation-filter"
          labelText="Designation"
          hideLabel
          value={designation}
          onChange={(e) => setDesignation(e.target.value)}
          style={{ maxWidth: "16rem" }}
        >
          <SelectItem value="" text="All designations" />
          {NON_ACADEMIC_DESIGNATIONS.map((d) => (
            <SelectItem key={d.value} value={d.value} text={d.label} />
          ))}
        </Select>
      </div>

      {isError && <ErrorMessage message="Could not load staff." onRetry={refetch} />}

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
              title="No staff yet"
              description="Add lab assistants, librarians, office staff, and other non-academic staff."
            />
          )}

          {!isLoading &&
            pageItems.map((s, i) => (
              <button
                key={s.id}
                onClick={() => setSelectedId(s.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  width: "100%",
                  textAlign: "left",
                  padding: "0.75rem 1.5rem",
                  border: "none",
                  borderBottom: i < pageItems.length - 1 ? "1px solid #e0e0e0" : "none",
                  background: selected?.id === s.id ? "#edf5ff" : "transparent",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  transition: "background 70ms ease",
                }}
                onMouseEnter={(e) => {
                  if (selected?.id !== s.id) e.currentTarget.style.background = "#f4f4f4";
                }}
                onMouseLeave={(e) => {
                  if (selected?.id !== s.id) e.currentTarget.style.background = "transparent";
                }}
              >
                <Avatar name={s.full_name} size="sm" />
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
                    {s.full_name}
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "#8d8d8d" }}>
                    {designationLabel(s.designation)} · {s.employee_number}
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
          <StaffDetail staff={selected} onDeleted={() => setSelectedId(null)} />
        ) : (
          <div className="os-section" style={{ marginTop: 0 }}>
            <EmptyState title="Select a staff member" description="Pick a staff member from the list to see their details." />
          </div>
        )}
      </div>

      {creating && <StaffFormModal staff={null} onClose={() => setCreating(false)} />}
    </div>
  );
}
