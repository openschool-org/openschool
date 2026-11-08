import { useState } from "react";
import { CloseOutlined, PlusOutlined, SearchOutlined } from "@ant-design/icons";
import { Button, Input, Pagination, Tag } from "antd";
import SelectField from "@/shared/ui/SelectField";
import { useNonAcademicStaffList } from "@/features/staff/queries/useNonAcademicStaff";
import { NON_ACADEMIC_DESIGNATIONS, type NonAcademicDesignation } from "@/features/staff/api/nonAcademicStaff";
import { useDebounced } from "@/shared/hooks/useDebounced";
import EmptyState from "@/shared/ui/EmptyState";
import ErrorMessage from "@/shared/ui/ErrorMessage";
import Avatar from "@/shared/ui/Avatar";
import ListRowSkeleton from "@/shared/ui/ListRowSkeleton";
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

      <div className="os-grid os-grid-cols-side os-gap-6 os-items-grid-start">
        <div className="os-section os-bg-layer os-mt-0 os-p-0 os-overflow-hidden">
          {isLoading && (
            <div className="os-p-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <ListRowSkeleton key={i} leadingWidth="1.5rem" titleWidth="70%" subtitleWidth="40%" trailingWidth={null} />
              ))}
            </div>
          )}

          {!isLoading && !isError && ordered.length === 0 && (
            <div className="os-p-6">
              <EmptyState
                title="No staff found"
                description="Add lab assistants, librarians, office staff, or adjust your filter."
              />
            </div>
          )}

          {!isLoading &&
            ordered.map((s) => {
              const isSelected = selected?.id === s.id;
              return (
                <button
                  type="button"
                  key={s.id}
                  onClick={() => setSelectedId(s.id)}
                  aria-pressed={isSelected}
                  className={`os-list-row os-list-row--button${isSelected ? " is-selected" : ""} os-flex os-items-center os-gap-3 os-py-3h os-px-5 os-rounded-0 os-border-b ${isSelected ? "os-bg-accent-light" : "os-bg-layer"}`}
                >
                  <Avatar name={s.full_name} size="sm" />
                  <div className="os-min-w-0 os-flex-1">
                    <div className="os-fw-600 os-text-md os-c-primary os-overflow-hidden os-truncate os-nowrap"
                    >
                      {s.full_name}
                    </div>
                    <div className="os-text-xs os-c-tertiary">
                      {designationLabel(s.designation)} · {s.employee_number}
                    </div>
                  </div>
                </button>
              );
            })}

          {!isLoading && ordered.length > 0 && (
            <Pagination
              total={totalItems}
              current={page}
              pageSize={pageSize}
              pageSizeOptions={[10, 25, 50, 100]}
              showSizeChanger
              className="os-grid__pager"
              onChange={(current, size) => onChange({ page: current, pageSize: size })}
            />
          )}
        </div>

        {selected ? (
          <StaffDetail staff={selected} onDeleted={() => setSelectedId(null)} />
        ) : (
          <div className="os-section os-bg-layer os-mt-0 os-text-center os-py-12 os-px-6">
            <EmptyState title="Select a staff member" description="Choose a staff member from the left directory to view full profile details." />
          </div>
        )}
      </div>

      {creating && <StaffFormModal staff={null} onClose={() => setCreating(false)} />}
    </div>
  );
}


