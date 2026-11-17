import { useState } from "react";
import { PlusOutlined } from "@ant-design/icons";
import { Button, Drawer } from "antd";
import DataGrid, { type GridColumn } from "@/shared/ui/DataGrid";
import FilterBar from "@/shared/ui/FilterBar";
import ActiveFilterTags from "@/shared/ui/ActiveFilterTags";
import ListState from "@/shared/ui/ListState";
import TableSkeleton from "@/shared/ui/TableSkeleton";
import SelectField from "@/shared/ui/SelectField";
import { useNonAcademicStaffList } from "@/features/staff/queries/useNonAcademicStaff";
import { NON_ACADEMIC_DESIGNATIONS, type NonAcademicDesignation, type NonAcademicStaff as StaffRow } from "@/features/staff/api/nonAcademicStaff";
import { designationLabel } from "@/features/staff/constants";
import StaffFormModal from "@/features/staff/components/StaffFormModal";
import StaffDetail from "@/features/staff/components/StaffDetail";
import { useListFilters } from "@/shared/hooks/useListFilters";
import { useOpenParam } from "@/shared/hooks/useOpenParam";
import { usePersistedPageSize } from "@/shared/hooks/usePersistedPageSize";

const FILTER_LABELS: Record<string, string> = { query: "Search", designation: "Role" };

const columns: GridColumn<StaffRow>[] = [
  {
    key: "name",
    header: "Name",
    render: (st) => (
      <div className="os-flex os-items-center os-gap-2">
        <span className="os-table__link">{st.full_name}</span>
      </div>
    ),
  },
  { key: "designation", header: "Designation", render: (st) => <span className="os-table__muted">{designationLabel(st.designation)}</span> },
  { key: "employee", header: "Employee no.", render: (st) => <span className="os-table__mono">{st.employee_number}</span> },
  { key: "phone", header: "Phone", render: (st) => <span className="os-table__muted">{st.phone ?? "-"}</span> },
];

export default function NonAcademicStaff() {
  const { filters, set, clear, activeKeys, debouncedSearch } = useListFilters({ query: "", designation: "" });
  const { selectedId, select, close } = useOpenParam();
  const [creating, setCreating] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = usePersistedPageSize("non-academic-staff");

  const { data, isLoading, isError, refetch } = useNonAcademicStaffList({
    limit: pageSize,
    offset: (page - 1) * pageSize,
    search: debouncedSearch,
    designation: filters.designation as NonAcademicDesignation | "",
  });
  const staff = data?.items ?? [];
  const selected = staff.find((s) => s.id === selectedId) ?? null;

  const setFilter = (key: keyof typeof filters, value: string) => {
    setPage(1);
    set(key, value);
  };

  return (
    <div className="os-page">
      <div className="os-page__header">
        <div className="os-page__header-left">
          <h1 className="os-page__title">Non-academic staff</h1>
          <p className="os-page__subtitle">Lab assistants, librarians, office and other staff without a login.</p>
        </div>
        <Button icon={<PlusOutlined />} type="primary" onClick={() => setCreating(true)}>
          Add staff
        </Button>
      </div>

      <div className="os-section">
        <FilterBar
          search={{ value: filters.query, onChange: (v) => setFilter("query", v), placeholder: "Search staff by name or employee number…" }}
          controls={[
            {
              label: "Designation",
              node: (
                <SelectField
                  id="staff-designation-filter"
                  label="Designation"
                  hideLabel
                  value={filters.designation}
                  onChange={(v) => setFilter("designation", v)}
                  options={[{ value: "", label: "All designations" }, ...NON_ACADEMIC_DESIGNATIONS.map((d) => ({ value: d.value, label: d.label }))]}
                />
              ),
            },
          ]}
        />

        <ActiveFilterTags
          filters={activeKeys.map((k) => ({
            key: k,
            label: FILTER_LABELS[k],
            value: k === "designation" ? designationLabel(filters.designation as NonAcademicDesignation) : `"${filters[k]}"`,
          }))}
          onClear={(k) => { clear(k as keyof typeof filters); setPage(1); }}
          onClearAll={() => { clear(); setPage(1); }}
        />

        <ListState
          isLoading={isLoading}
          isError={isError}
          isEmpty={staff.length === 0}
          errorMessage="Could not load staff members."
          onRetry={refetch}
          skeleton={<TableSkeleton headers={columns.map((c) => c.header)} />}
          empty={{ title: "No staff found", description: "Add lab assistants, librarians, office staff, or adjust your filter." }}
        >
          <DataGrid
            rows={staff}
            columns={columns}
            getRowId={(st) => st.id}
            onRowClick={(st) => select(st.id)}
            countLabel={(shown, total) => `Showing ${shown} of ${total} staff`}
            pageSizes={[10, 25, 50, 100]}
            server={{ page, pageSize, totalItems: data?.total ?? 0, onChange: ({ page: p, pageSize: ps }) => { setPage(p); setPageSize(ps); } }}
          />
        </ListState>
      </div>

      <Drawer open={!!selected} onClose={close} size={640} title="Staff member" className="os-detail-drawer" destroyOnHidden>
        {selected && <StaffDetail staff={selected} onDeleted={close} />}
      </Drawer>

      {creating && <StaffFormModal staff={null} onClose={() => setCreating(false)} />}
    </div>
  );
}
