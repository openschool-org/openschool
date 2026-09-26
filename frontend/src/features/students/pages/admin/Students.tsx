import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import { Add, Edit, TrashCan } from "@carbon/icons-react";
import { Button, IconButton, Select, SelectItem, Tag } from "@carbon/react";
import EntityCombobox from "@/shared/ui/EntityCombobox";
import DataGrid, { type GridColumn } from "@/shared/ui/DataGrid";
import FilterBar from "@/shared/ui/FilterBar";
import ActiveFilterTags from "@/shared/ui/ActiveFilterTags";
import ListState from "@/shared/ui/ListState";
import TableSkeleton from "@/shared/ui/TableSkeleton";
import ConfirmDeleteModal from "@/shared/ui/ConfirmDeleteModal";
import AgentFindingsBanner from "@/features/notifications/components/AgentFindingsBanner";
import MutationErrorNotification from "@/shared/ui/MutationErrorNotification";
import { useListFilters } from "@/shared/hooks/useListFilters";
import { usePersistedPageSize } from "@/shared/hooks/usePersistedPageSize";
import { useStudents, useDeleteStudent } from "@/features/students/queries/useStudents";
import { useGrades } from "@/features/academics/queries/useGrades";
import { useHouses } from "@/features/school/queries/useHouses";
import { useCurrentClasses } from "@/features/academics/queries/useClasses";
import type { Student } from "@/features/students/api/student";

const FILTER_LABELS: Record<string, string> = {
  query: "Search",
  grade: "Grade",
  cls: "Class",
  gender: "Gender",
  house: "House",
};


export default function Students() {
  const navigate = useNavigate();
  const { data: grades } = useGrades();
  const { data: houses } = useHouses();
  const { data: classes } = useCurrentClasses();
  const deleteStudent = useDeleteStudent();
  const [toDelete, setToDelete] = useState<Student | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = usePersistedPageSize("students");

  const { filters, set, clear, activeKeys, debouncedSearch } = useListFilters({
    query: "",
    grade: "",
    cls: "",
    gender: "",
    house: "",
  });

  const classOptions = useMemo(
    () => (classes ?? []).filter((c) => !filters.grade || c.grade_name === filters.grade),
    [classes, filters.grade],
  );

  // The server does the filtering now; search/filters/page/size all live in
  // the query key so a different combination is a different cache entry,
  // and keepPreviousData (in useStudents) keeps the old page on screen
  // while the next one loads instead of flashing a skeleton.
  const params = {
    limit: pageSize,
    offset: (page - 1) * pageSize,
    search: debouncedSearch,
    grade: filters.grade,
    class: filters.cls,
    gender: filters.gender,
    house: filters.house,
  };
  const { data, isLoading, isError, refetch } = useStudents(params);
  const students = data?.items ?? [];

  // A filter/search change makes the current page number meaningless against the new result set.
  const setFilter = <K extends keyof typeof filters>(key: K, value: (typeof filters)[K]) => {
    setPage(1);
    set(key, value);
  };

  const columns: GridColumn<Student>[] = [
    { key: "index_number", header: "Index no.", render: (s) => <span className="os-table__mono">{s.index_number}</span> },
    {
      key: "full_name",
      header: "Full name",
      render: (s) => <Link to={`/students/${s.id}`} className="os-table__link">{s.full_name}</Link>,
    },
    { key: "class_name", header: "Class", render: (s) => <span className="os-table__muted">{s.class_name ?? "-"}</span> },
    { key: "house_name", header: "House", render: (s) => <span className="os-table__muted">{s.house_name ?? "-"}</span> },
    { key: "phone", header: "Phone", render: (s) => <span className="os-table__muted">{s.phone ?? "-"}</span> },
    { key: "whatsapp", header: "WhatsApp", render: (s) => <span className="os-table__muted">{s.whatsapp ?? "-"}</span> },
    {
      key: "enrollment_status",
      header: "Status",
      render: (s) =>
        s.enrollment_status === "active" ? <Tag type="green" size="sm">Active</Tag> : <Tag type="red" size="sm">Left</Tag>,
    },
    {
      key: "actions",
      header: "Actions",
      align: "end",
      render: (s) => (
        <div className="os-grid__actions">
          <IconButton label="Edit profile" kind="ghost" size="sm" onClick={() => navigate(`/students/${s.id}`, { state: { edit: true } })}>
            <Edit />
          </IconButton>
          <IconButton label="Delete student" kind="ghost" size="sm" onClick={() => setToDelete(s)}>
            <TrashCan />
          </IconButton>
        </div>
      ),
    },
  ];

  return (
    <div className="os-page">
      <div className="os-page__header">
        <div className="os-page__header-left">
          <h1 className="os-page__title">Students</h1>
          <p className="os-page__subtitle">Manage student enrolment and profiles</p>
        </div>
        <Button renderIcon={Add} kind="primary" size="md" as={Link} to="/students/new">
          Enrol student
        </Button>
      </div>

      <AgentFindingsBanner />

      <div className="os-section">
        <FilterBar
          search={{ value: filters.query, onChange: (v) => setFilter("query", v), placeholder: "Search by name or index number…" }}
          controls={[
            {
              label: "Grade",
              node: (
                <EntityCombobox
                  id="filter-grade"
                  items={grades ?? []}
                  selectedId={filters.grade}
                  onSelect={(v) => { setFilter("grade", v); setFilter("cls", ""); }}
                  getId={(g) => g.name}
                  itemToString={(g) => g.name}
                  ariaLabel="Grade"
                  placeholder="All grades"
                />
              ),
            },
            {
              label: "Class",
              node: (
                <EntityCombobox
                  id="filter-class"
                  items={classOptions}
                  selectedId={filters.cls}
                  onSelect={(v) => setFilter("cls", v)}
                  getId={(c) => c.name}
                  itemToString={(c) => c.name}
                  ariaLabel="Class"
                  placeholder="All classes"
                />
              ),
            },
            {
              label: "Gender",
              node: (
                <Select id="filter-gender" labelText="Gender" hideLabel size="md" value={filters.gender} onChange={(e) => setFilter("gender", e.target.value)}>
                  <SelectItem value="" text="Any gender" />
                  <SelectItem value="male" text="Male" />
                  <SelectItem value="female" text="Female" />
                </Select>
              ),
            },
            {
              label: "House",
              node: (
                <Select id="filter-house" labelText="House" hideLabel size="md" value={filters.house} onChange={(e) => setFilter("house", e.target.value)}>
                  <SelectItem value="" text="All houses" />
                  {houses?.map((h) => <SelectItem key={h.id} value={h.name} text={h.name} />)}
                </Select>
              ),
            },
          ]}
        />

        <ActiveFilterTags
          filters={activeKeys.map((k) => ({ key: k, label: FILTER_LABELS[k], value: filters[k] }))}
          onClear={(k) => { clear(k as keyof typeof filters); setPage(1); }}
          onClearAll={() => { clear(); setPage(1); }}
        />

        <MutationErrorNotification
          isError={deleteStudent.isError}
          error={deleteStudent.error}
          title="Could not delete student"
          fallback="Please try again."
          onClose={() => deleteStudent.reset()}
          className="os-section__notice"
        />

        <ListState
          isLoading={isLoading}
          isError={isError}
          isEmpty={students.length === 0}
          errorMessage="Failed to load students"
          onRetry={refetch}
          skeleton={<TableSkeleton headers={columns.map((c) => c.header)} />}
          empty={{ title: "No students found", description: "Enrol your first student or adjust your search filters to get started." }}
        >
          <DataGrid
            rows={students}
            columns={columns}
            getRowId={(s) => s.id}
            countLabel={(shown, total) => `Showing ${shown} of ${total} students`}
            server={{ page, pageSize, totalItems: data?.total ?? 0, onChange: ({ page: p, pageSize: ps }) => { setPage(p); setPageSize(ps); } }}
          />
        </ListState>
      </div>

      <ConfirmDeleteModal
        open={!!toDelete}
        title="Delete student"
        description={<>Delete <strong>{toDelete?.full_name}</strong>? This removes their account and cannot be undone.</>}
        subject="Student"
        mutation={deleteStudent}
        onClose={() => setToDelete(null)}
        onConfirm={() => toDelete && deleteStudent.mutate(toDelete.id)}
      />
    </div>
  );
}
