import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { Add, Edit, TrashCan } from "@carbon/icons-react";
import { Button, IconButton, Select, SelectItem, Tag } from "@carbon/react";
import { useTeachers, useDeleteTeacher } from "@/features/teachers/queries/useTeachers";
import type { Teacher, TeacherEmploymentStatus } from "@/features/teachers/api/teacher";
import { EMPLOYMENT_STATUSES } from "@/shared/lib/constants/people";
import DataGrid, { type GridColumn } from "@/shared/ui/DataGrid";
import FilterBar from "@/shared/ui/FilterBar";
import ActiveFilterTags from "@/shared/ui/ActiveFilterTags";
import ListState from "@/shared/ui/ListState";
import TableSkeleton from "@/shared/ui/TableSkeleton";
import ConfirmDeleteModal from "@/shared/ui/ConfirmDeleteModal";
import MutationErrorNotification from "@/shared/ui/MutationErrorNotification";
import AgentFindingsBanner from "@/features/notifications/components/AgentFindingsBanner";
import { useListFilters } from "@/shared/hooks/useListFilters";
import { usePersistedPageSize } from "@/shared/hooks/usePersistedPageSize";

const STATUS_TAG: Record<string, "green" | "red" | "magenta"> = { active: "green", resigned: "red", transferred: "magenta" };
const FILTER_LABELS: Record<string, string> = { query: "Search", status: "Status" };

export default function Teachers() {
  const navigate = useNavigate();
  const deleteTeacher = useDeleteTeacher();
  const [toDelete, setToDelete] = useState<Teacher | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = usePersistedPageSize("teachers");
  const { filters, set, clear, activeKeys, debouncedSearch } = useListFilters({ query: "", status: "" });

  const setFilter = <K extends keyof typeof filters>(key: K, value: (typeof filters)[K]) => {
    setPage(1);
    set(key, value);
  };

  const { data, isLoading, isError, refetch } = useTeachers({
    limit: pageSize,
    offset: (page - 1) * pageSize,
    search: debouncedSearch,
    status: filters.status as TeacherEmploymentStatus | "",
  });
  const teachers = data?.items ?? [];

  const columns: GridColumn<Teacher>[] = [
    { key: "employee_number", header: "Employee no.", render: (t) => <span className="os-table__mono">{t.employee_number}</span> },
    { key: "full_name", header: "Full name", render: (t) => <Link to={`/teachers/${t.id}`} className="os-table__link">{t.full_name}</Link> },
    { key: "phone", header: "Phone", render: (t) => <span className="os-table__muted">{t.phone ?? "-"}</span> },
    { key: "joined_date", header: "Joined date", render: (t) => <span className="os-table__muted">{t.joined_date ?? "-"}</span> },
    {
      key: "status",
      header: "Status",
      render: (t) => <Tag type={STATUS_TAG[t.employment_status] ?? "gray"} size="sm">{EMPLOYMENT_STATUSES.find((s) => s.value === t.employment_status)?.label ?? t.employment_status}</Tag>,
    },
    {
      key: "actions",
      header: "Actions",
      align: "end",
      render: (t) => (
        <div className="os-grid__actions">
          <IconButton label="Edit" kind="ghost" size="sm" onClick={() => navigate(`/teachers/${t.id}`, { state: { edit: true } })}><Edit /></IconButton>
          <IconButton label="Delete" kind="ghost" size="sm" onClick={() => { deleteTeacher.reset(); setToDelete(t); }}><TrashCan /></IconButton>
        </div>
      ),
    },
  ];

  return (
    <div className="os-page">
      <div className="os-page__header">
        <div className="os-page__header-left">
          <h1 className="os-page__title">Teachers</h1>
          <p className="os-page__subtitle">Manage teacher profiles</p>
        </div>
        <Button renderIcon={Add} kind="primary" size="md" as={Link} to="/teachers/new">Add teacher</Button>
      </div>

      <AgentFindingsBanner />

      <div className="os-section">
        <FilterBar
          search={{ value: filters.query, onChange: (v) => setFilter("query", v), placeholder: "Search by name or employee number…" }}
          controls={[
            {
              label: "Status",
              node: (
                <Select id="filter-teacher-status" labelText="Status" hideLabel size="md" value={filters.status} onChange={(e) => setFilter("status", e.target.value)}>
                  <SelectItem value="" text="All statuses" />
                  {EMPLOYMENT_STATUSES.map((s) => <SelectItem key={s.value} value={s.value} text={s.label} />)}
                </Select>
              ),
            },
          ]}
        />
        <ActiveFilterTags filters={activeKeys.map((k) => ({ key: k, label: FILTER_LABELS[k], value: filters[k] }))} onClear={(k) => { clear(k as keyof typeof filters); setPage(1); }} onClearAll={() => { clear(); setPage(1); }} />
        <MutationErrorNotification isError={deleteTeacher.isError} error={deleteTeacher.error} title="Could not delete teacher" fallback="The teacher may be assigned to a class or have attendance records." onClose={() => deleteTeacher.reset()} className="os-section__notice" />
        <ListState
          isLoading={isLoading}
          isError={isError}
          isEmpty={teachers.length === 0}
          errorMessage="Failed to load teachers"
          onRetry={refetch}
          skeleton={<TableSkeleton headers={columns.map((c) => c.header)} />}
          empty={{ title: "No teachers found", description: "Add your first teacher or adjust your search filter to get started." }}
        >
          <DataGrid
            rows={teachers}
            columns={columns}
            getRowId={(t) => t.id}
            countLabel={(shown, total) => `Showing ${shown} of ${total} teachers`}
            server={{ page, pageSize, totalItems: data?.total ?? 0, onChange: ({ page: p, pageSize: ps }) => { setPage(p); setPageSize(ps); } }}
          />
        </ListState>
      </div>

      <ConfirmDeleteModal
        open={!!toDelete}
        title="Delete teacher"
        description={<>Delete <strong>{toDelete?.full_name}</strong>? This removes their account and cannot be undone.</>}
        subject="Teacher"
        mutation={deleteTeacher}
        onClose={() => setToDelete(null)}
        onConfirm={() => toDelete && deleteTeacher.mutate(toDelete.id)}
      />
    </div>
  );
}
