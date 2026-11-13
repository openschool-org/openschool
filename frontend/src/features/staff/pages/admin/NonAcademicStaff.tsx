import { useState } from "react";
import { CloseOutlined, PlusOutlined, SearchOutlined } from "@ant-design/icons";
import { Button, Drawer, Input, Tag } from "antd";
import DataGrid, { type GridColumn } from "@/shared/ui/DataGrid";
import ListState from "@/shared/ui/ListState";
import TableSkeleton from "@/shared/ui/TableSkeleton";
import SelectField from "@/shared/ui/SelectField";
import { useNonAcademicStaffList } from "@/features/staff/queries/useNonAcademicStaff";
import { NON_ACADEMIC_DESIGNATIONS, type NonAcademicDesignation, type NonAcademicStaff as StaffRow } from "@/features/staff/api/nonAcademicStaff";
import { useDebounced } from "@/shared/hooks/useDebounced";
import ErrorMessage from "@/shared/ui/ErrorMessage";
import Avatar from "@/shared/ui/Avatar";
import { designationLabel } from "@/features/staff/constants";
import StaffFormModal from "@/features/staff/components/StaffFormModal";
import StaffDetail from "@/features/staff/components/StaffDetail";
import { usePersistedPageSize } from "@/shared/hooks/usePersistedPageSize";

export default function NonAcademicStaff() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounced(search, 300);
  const [designation, setDesignation] = useState<NonAcademicDesignation | "">("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = usePersistedPageSize("non-academic-staff");

  const { data, isLoading, isError, refetch } = useNonAcademicStaffList({
    limit: pageSize,
    offset: (page - 1) * pageSize,
    search: debouncedSearch,
    designation,
  });
  const ordered = data?.items ?? [];
  const totalItems = data?.total ?? 0;

  const selected = ordered.find((s) => s.id === selectedId) ?? null;

  const columns: GridColumn<StaffRow>[] = [
    {
      key: "name",
      header: "Name",
      render: (st) => (
        <div className="os-flex os-items-center os-gap-2">
          <Avatar name={st.full_name} size="sm" />
          <span className="os-table__link">{st.full_name}</span>
        </div>
      ),
    },
    { key: "designation", header: "Designation", render: (st) => <span className="os-table__muted">{designationLabel(st.designation)}</span> },
    { key: "employee", header: "Employee no.", render: (st) => <span className="os-table__mono">{st.employee_number}</span> },
    { key: "phone", header: "Phone", render: (st) => <span className="os-table__muted">{st.phone ?? "-"}</span> },
  ];

  const onChange = ({ page: p, pageSize: ps }: { page: number; pageSize: number }) => {
    setPage(p);
    setPageSize(ps);
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

      <div className="os-section os-bg-layer os-mb-6 os-py-4 os-px-6">
        <div className="os-flex os-items-center os-gap-4 os-wrap">
          <div className="os-flex-basis-16 os-min-w-12">
            <Input
              allowClear
              type="search"
              prefix={<SearchOutlined />}
              aria-label="Search staff"
              placeholder="Search staff by name or employee number…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <div className="os-min-w-14">
            <SelectField
              id="staff-designation-filter"
              label="Designation"
              hideLabel
              value={designation}
              onChange={(v) => { setDesignation(v as NonAcademicDesignation | ""); setPage(1); }}
              options={[{ value: "", label: "All designations" }, ...NON_ACADEMIC_DESIGNATIONS.map((d) => ({ value: d.value, label: d.label }))]}
            />
          </div>
        </div>

        {(search || designation) && (
          <div className="os-flex os-items-center os-gap-2 os-wrap os-mt-3">
            <span className="os-text-xs os-fw-600 os-c-tertiary">Active filters:</span>
            {designation && (
              <Tag color="processing" closable onClose={(e) => { e.preventDefault(); setDesignation(""); setPage(1); }}>
                Role: {designationLabel(designation)}
              </Tag>
            )}
            {search && <Tag color="processing" closable onClose={(e) => { e.preventDefault(); setSearch(""); setPage(1); }}>Search: "{search}"</Tag>}
            <Button type="text" icon={<CloseOutlined />} onClick={() => { setSearch(""); setDesignation(""); setPage(1); }}>
              Clear all
            </Button>
          </div>
        )}
      </div>

      {isError && <ErrorMessage message="Could not load staff members." onRetry={refetch} />}

      {/* Full-width list; a row opens the staff member's details in a side drawer. */}
      <div className="os-section">
        <ListState
          isLoading={isLoading}
          isError={false}
          isEmpty={ordered.length === 0}
          errorMessage="Could not load staff members."
          onRetry={refetch}
          skeleton={<TableSkeleton headers={columns.map((c) => c.header)} />}
          empty={{ title: "No staff found", description: "Add lab assistants, librarians, office staff, or adjust your filter." }}
        >
          <DataGrid
            rows={ordered}
            columns={columns}
            getRowId={(st) => st.id}
            onRowClick={(st) => setSelectedId(st.id)}
            countLabel={(shown, total) => `Showing ${shown} of ${total} staff`}
            pageSizes={[10, 25, 50, 100]}
            server={{ page, pageSize, totalItems, onChange }}
          />
        </ListState>
      </div>

      <Drawer open={!!selected} onClose={() => setSelectedId(null)} size={640} title="Staff member" className="os-detail-drawer" destroyOnHidden>
        {selected && <StaffDetail staff={selected} onDeleted={() => setSelectedId(null)} />}
      </Drawer>

      {creating && <StaffFormModal staff={null} onClose={() => setCreating(false)} />}
    </div>
  );
}


